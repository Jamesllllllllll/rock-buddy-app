const assert = require('node:assert/strict');
const test = require('node:test');
const http = require('node:http');
const { once } = require('node:events');
const { createRelay, launchArgs } = require('../tooling/public-staging.cjs');

async function request(server, { url = '/api/auth/authenticate.php', host = 'raspberrypi:8080',
    method = 'POST', origin = 'null', body = '{}' } = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request({ hostname: '127.0.0.1', port: server.address().port,
            path: url, method, headers: { host, origin, 'content-type': 'application/json',
                'content-length': Buffer.byteLength(body) } }, res => {
            let content = '';
            res.on('data', data => { content += data; });
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: content }));
        });
        req.on('error', reject);
        req.end(body);
    });
}

test('public client relay preserves API payloads and preflight without retries', async t => {
    const sent = [];
    const relay = createRelay((url, headers, body, res) => {
        sent.push({ url, headers, method: body.method, body: body.bytes.toString() });
        res.writeHead(body.method === 'OPTIONS' ? 204 : 401, { 'access-control-allow-origin': '*' });
        res.end(body.method === 'OPTIONS' ? '' : '{"error":"Invalid API key."}');
    }).listen(0, '127.0.0.1');
    await once(relay, 'listening');
    t.after(() => { relay.closeAllConnections(); relay.close(); });
    const body = JSON.stringify({ version: '1.11.0', user_id: 101, api_key: 'synthetic-only', song: 'Björk' });
    const response = await request(relay, { body });
    assert.equal(response.status, 401);
    assert.equal(response.headers['access-control-allow-origin'], '*');
    assert.equal(sent.length, 1);
    assert.equal(sent[0].body, body);
    assert.equal(sent[0].headers['content-length'], Buffer.byteLength(body));
    assert.equal((await request(relay, { method: 'OPTIONS', body: '' })).status, 204);
    assert.equal(sent.length, 2);
});

test('relay rejects other hosts, web origins, arbitrary targets and oversized payloads', async t => {
    const relay = createRelay(() => assert.fail('rejected request must not reach staging')).listen(0, '127.0.0.1');
    await once(relay, 'listening');
    t.after(() => { relay.closeAllConnections(); relay.close(); });
    assert.equal((await request(relay, { host: 'rock-buddy.com' })).status, 403);
    assert.equal((await request(relay, { origin: 'https://example.com' })).status, 403);
    for (const url of ['https://example.com/api/auth/login.php', '//example.com/api/auth/login.php', '/api/../account/login.php', '/account/reset_password.php']) {
        assert.equal((await request(relay, { url })).status, 404);
    }
    assert.equal((await request(relay, { method: 'GET' })).status, 404);
    assert.equal((await request(relay, { body: 'x'.repeat(262145) })).status, 413);
});

test('launch maps only the CSP-approved local host and preserves packaged argv ordering', () => {
    const argv = ['rock-buddy.exe', ...launchArgs()];
    assert.equal(argv.slice(2)[0], 'http://raspberrypi:8080');
    assert.ok(argv.includes('--host-resolver-rules=MAP raspberrypi 127.0.0.1'));
    assert.ok(!argv.some(value => /disable-web-security|ignore-certificate/.test(value)));
});
