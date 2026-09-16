// Exercise the packaged public executable on a disposable Windows CI runner.
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { extractFile } = require('@electron/asar');
const STAGING = 'https://rock-buddy-site-staging.rock-buddy.workers.dev';

(async () => {
    assert.equal(process.platform, 'win32');
    const root = path.resolve('release/public-staging');
    const html = extractFile(path.join(root, 'resources/app.asar'), 'src/index.html').toString();
    const csp = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/)[1];
    const child = spawn(path.join(root, 'rock-buddy.exe'),
        ['staging', STAGING, '--remote-debugging-port=9333'], { cwd: root, stdio: 'ignore' });
    let socket;
    try {
        let target;
        for (let i = 0; i < 60; i++) {
            if (child.exitCode !== null) throw new Error(`Public app exited: ${child.exitCode}`);
            try {
                const targets = await (await fetch('http://127.0.0.1:9333/json/list', {
                    signal: AbortSignal.timeout(1000),
                })).json();
                target = targets.find(page => page.type === 'page' && page.url.endsWith('/auth/login.html'));
                if (target) break;
            } catch {}
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        assert.ok(target, 'Public app must reach its login page');
        socket = new WebSocket(target.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
            socket.addEventListener('open', resolve, { once: true });
            socket.addEventListener('error', reject, { once: true });
        });
        const response = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Renderer check timed out')), 20000);
            socket.addEventListener('message', event => {
                const data = JSON.parse(event.data);
                if (data.id === 1) { clearTimeout(timer); resolve(data); }
            });
            socket.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: {
                expression: `(async () => {
                    // Apply the actual startup policy to this login-page probe.
                    const policy = document.createElement('meta');
                    policy.httpEquiv = 'Content-Security-Policy';
                    policy.content = ${JSON.stringify(csp)};
                    document.head.appendChild(policy);
                    const host = await window.api.getHost();
                    const version = await window.api.getVersion();
                    const response = await fetch(host + '/api/auth/authenticate.php', {
                        method: 'POST', headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({version, user_id: 101, api_key: 'synthetic-invalid-key'}),
                    });
                    return {host, version, status: response.status, body: await response.json()};
                })()`, awaitPromise: true, returnByValue: true,
            } }));
        });
        assert.ok(!response.error && !response.result?.exceptionDetails,
            'Renderer request failed: ' + JSON.stringify(response.error || response.result?.exceptionDetails));
        const result = response.result.result.value;
        assert.equal(result.host, STAGING);
        assert.equal(result.version, '1.11.0');
        assert.equal(result.status, 401);
        assert.deepEqual(result.body, { error: 'Invalid API key.' });
        console.log('Public Windows startup, version, staging selection and CSP-protected API request passed.');
    } finally {
        socket?.close();
        if (child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
