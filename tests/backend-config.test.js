const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const test = require('node:test');
const { HOSTS, resolveBackend } = require('../src/backend-config');

test('existing production installs keep the default store and session', () => {
    const expected = { host: HOSTS.production, storeOptions: {}, webPreferences: {} };
    assert.deepEqual(resolveBackend(), expected);
    assert.deepEqual(resolveBackend(['--backend=production']), expected);
    assert.deepEqual(resolveBackend(['https://rock-buddy.com/']), expected);
});
test('staging and local never select the production credential store or browser session', () => {
    const staging = resolveBackend(['--backend=staging']);
    const local = resolveBackend(['--backend=local']);
    assert.equal(staging.host, HOSTS.staging);
    assert.equal(staging.storeOptions.name, 'config-staging');
    assert.equal(staging.webPreferences.partition, 'persist:rock-buddy-staging');
    assert.notEqual(staging.storeOptions.name, local.storeOptions.name);
    assert.notEqual(staging.webPreferences.partition, local.webPreferences.partition);
    assert.deepEqual(resolveBackend([HOSTS.staging]), staging);
});
test('legacy development URLs remain usable with origin-specific isolated storage', () => {
    const first = resolveBackend(['http://raspberrypi:8080']);
    assert.equal(first.host, 'http://raspberrypi:8080');
    assert.ok(first.storeOptions.name.startsWith('config-'));
    assert.notEqual(first.storeOptions.name, resolveBackend(['http://127.0.0.1:8787']).storeOptions.name);
});
test('ambiguous and unsafe selectors fail before storage is opened', () => {
    for (const args of [['--backend'], ['--backend=typo'], ['--backend=staging', HOSTS.production],
        ['file:///tmp/x'], ['https://user:secret@example.invalid'], ['https://example.invalid/api'],
        ['https://example.invalid?token=secret']]) assert.throws(() => resolveBackend(args));
});
test('CSP permits the named backends without allowing every HTTPS origin', () => {
    const html = readFileSync('src/index.html', 'utf8');
    const connect = html.match(/connect-src ([^;]+);/)[1].split(' ');
    for (const host of Object.values(HOSTS)) assert.ok(connect.includes(host));
    assert.ok(!connect.includes('*') && !connect.includes('https:'));
});
