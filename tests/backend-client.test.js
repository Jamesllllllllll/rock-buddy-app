const assert = require('node:assert/strict');
const test = require('node:test');
const { createBackendClient } = require('../src/backend-client');
const host = 'https://example.invalid';
const url = host + '/api/data/sniffer_sync.php';

test('connection failures are bounded across pages and recover without replaying writes', async () => {
    let time = 0;
    let calls = 0;
    const states = [];
    const client = createBackendClient(host, {
        now: () => time,
        onState: state => states.push(state),
        fetchImpl: async () => {
            if (++calls === 1) throw new Error('offline');
            return Response.json({ success: true });
        },
    });
    assert.equal((await client.post(url, {})).connectionError, true);
    for (let i = 0; i < 100; i++) await client.post(url, {});
    assert.equal(calls, 1);
    time = 30001;
    assert.deepEqual(await client.post(url, {}), { success: true });
    assert.equal(calls, 2);
    assert.deepEqual(states.map(state => state.connected), [false, true]);
    assert.equal(client.isBusy(), false);
});

test('empty, HTML, JSON-null, and gateway responses produce a connection warning, not parse errors', async () => {
    for (const response of [new Response(''), new Response('<html>Bad gateway</html>'), Response.json(null), Response.json({error:'internal'}, {status:503})]) {
        const client = createBackendClient(host, { fetchImpl: async () => response });
        assert.equal((await client.post(url, {})).connectionError, true);
    }
});

test('handled 400s and invalid login tokens preserve their existing API messages', async () => {
    for (const error of ['Invalid JSON data.', 'Invalid API key.']) {
        const client = createBackendClient(host, { fetchImpl: async () => Response.json({error}, {status:400}) });
        assert.deepEqual(await client.post(url, {}), {error});
        assert.equal(client.getState().connected, true);
    }
});

test('credentials cannot be forwarded to a different host and redirects are disabled', async () => {
    let called = false;
    const client = createBackendClient(host, {fetchImpl: async (_url, options) => {
        called = true;
        assert.equal(options.redirect, 'error');
        assert.ok(options.signal);
        return Response.json({success:true});
    }});
    assert.ok((await client.post('https://wrong.invalid/api/auth/login.php', {})).error);
    assert.equal(called, false);
    await client.post(url, {});
    assert.equal(called, true);
});
