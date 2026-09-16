// Test the unmodified public desktop through its CSP-approved development origin.
// Run using the installed app's ELECTRON_RUN_AS_NODE mode; no extra runtime needed.
const http = require('node:http');
const https = require('node:https');
const { spawn } = require('node:child_process');
const path = require('node:path');

const STAGING = 'https://rock-buddy-site-staging.rock-buddy.workers.dev';
const LOCAL = 'http://raspberrypi:8080';
const MAX_BODY = 262144;

function forward(requestPath, headers, body, response) {
    const upstream = https.request(STAGING + requestPath, {
        method: body.method,
        headers,
        timeout: 30000,
    }, incoming => {
        if (incoming.statusCode >= 300 && incoming.statusCode < 400) {
            incoming.resume();
            response.writeHead(502).end('Unexpected staging redirect.');
            return;
        }
        const outgoing = {};
        for (const key of ['content-type', 'content-length', 'content-encoding', 'cache-control',
            'access-control-allow-origin', 'access-control-allow-methods',
            'access-control-allow-headers', 'access-control-max-age']) {
            if (incoming.headers[key] !== undefined) outgoing[key] = incoming.headers[key];
        }
        response.writeHead(incoming.statusCode, outgoing);
        incoming.on('error', () => response.destroy());
        incoming.pipe(response);
    });
    upstream.on('timeout', () => upstream.destroy());
    upstream.on('error', () => {
        if (!response.headersSent) response.writeHead(502).end('Staging connection failed.');
        else response.destroy();
    });
    response.on('close', () => upstream.destroy());
    // Never retry a score/account mutation or log its body/credentials.
    upstream.end(body.bytes);
}

function createRelay(send = forward) {
    return http.createServer(async (request, response) => {
        if (request.headers.host !== 'raspberrypi:8080' ||
            (request.headers.origin && request.headers.origin !== 'null')) {
            request.resume();
            response.writeHead(403).end('Local desktop requests only.');
            return;
        }
        if (!/^\/api\/(auth|account|data)\/[a-z_]+\.php$/.test(request.url) ||
            !['POST', 'OPTIONS'].includes(request.method)) {
            request.resume();
            response.writeHead(404).end('API route required.');
            return;
        }
        const chunks = [];
        let size = 0;
        try {
            for await (const chunk of request.iterator({ destroyOnReturn: false })) {
                size += chunk.length;
                if (size > MAX_BODY) {
                    request.resume();
                    response.writeHead(413).end('Request too large.');
                    return;
                }
                chunks.push(chunk);
            }
            const headers = {};
            for (const key of ['content-type', 'origin', 'access-control-request-method',
                'access-control-request-headers']) {
                if (request.headers[key] !== undefined) headers[key] = request.headers[key];
            }
            const bytes = Buffer.concat(chunks);
            headers['content-length'] = bytes.length;
            send(request.url, headers, { method: request.method, bytes }, response);
        } catch {
            if (!response.headersSent) response.writeHead(502).end('Relay request failed.');
            else response.destroy();
        }
    });
}

function launchArgs() {
    return ['staging', LOCAL, '--host-resolver-rules=MAP raspberrypi 127.0.0.1', '--no-proxy-server'];
}

async function main() {
    if (process.platform !== 'win32' || !process.versions.electron ||
        path.basename(process.execPath).toLowerCase() !== 'rock-buddy.exe') {
        throw new Error('Launch with public-staging.cmd using the installed public Rock Buddy executable.');
    }
    const relay = createRelay();
    relay.requestTimeout = 15000;
    relay.headersTimeout = 10000;
    await new Promise((resolve, reject) => {
        relay.once('error', reject);
        relay.listen(8080, '127.0.0.1', resolve);
    });
    console.log(`Public desktop test: ${LOCAL} -> ${STAGING}`);
    console.log('Keep this window open. Close Rock Buddy to stop the relay.');
    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;
    const child = spawn(process.execPath, launchArgs(), {
        env, cwd: path.dirname(process.execPath), stdio: 'ignore',
    });
    const stop = () => { relay.closeAllConnections(); relay.close(); };
    child.once('exit', stop);
    child.once('error', () => { console.error('Could not launch Rock Buddy.'); stop(); });
    process.once('SIGINT', () => { child.kill(); stop(); });
    process.once('SIGTERM', () => { child.kill(); stop(); });
}

module.exports = { createRelay, launchArgs, STAGING, LOCAL };
if (require.main === module) main().catch(error => {
    console.error(error.code === 'EADDRINUSE' ? 'Port 8080 is already in use. Close the other listener first.' : error.message);
    process.exitCode = 1;
});
