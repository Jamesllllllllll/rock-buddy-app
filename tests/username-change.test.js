const assert = require('node:assert/strict');
const test = require('node:test');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

async function page(info) {
    let now = 0;
    let tick;
    let stopped = false;
    const nodes = {
        username_wait: { textContent: 'existing warning' },
        submit_username: { disabled: false },
    };
    const context = vm.createContext({
        document: { getElementById: id => nodes[id] },
        sessionStorage: { getItem: () => '{}' },
        getVersion: async () => 'test',
        getAccountInfo: async () => info,
        performance: { now: () => now },
        setInterval: callback => { tick = callback; return 1; },
        clearInterval: () => { stopped = true; },
        window: { addEventListener() {} },
    });
    vm.runInContext(readFileSync(require.resolve('../src/account/change_username.js'), 'utf8'), context);
    await new Promise(resolve => setImmediate(resolve));
    return { context, nodes, advance(seconds) { now += seconds * 1000; tick(); }, stopped: () => stopped };
}

test('cooldown uses rounded-up days, then hours/minutes without saying zero minutes early', async () => {
    const { context } = await page({});
    for (const [seconds, expected] of [
        [30 * 86400, '30 days'], [86401, '2 days'], [86400, '1 day'],
        [86399, '24 hours 0 minutes'], [3660, '1 hour 1 minute'],
        [120, '0 hours 2 minutes'], [1, '0 hours 1 minute'],
    ]) {
        assert.equal(context.usernameWaitMessage(seconds), `You can change your username in ${expected}.`);
    }
});

test('the form counts down locally and enables submission when the wait expires', async () => {
    const view = await page({ username_change_wait_seconds: 3660 });
    assert.equal(view.nodes.submit_username.disabled, true);
    assert.equal(view.nodes.username_wait.textContent, 'You can change your username in 1 hour 1 minute.');
    view.advance(3600);
    assert.equal(view.nodes.username_wait.textContent, 'You can change your username in 0 hours 1 minute.');
    view.advance(60);
    assert.equal(view.nodes.submit_username.disabled, false);
    assert.equal(view.stopped(), true);
});

test('eligible accounts and older PHP responses keep the form usable', async () => {
    for (const info of [{ username_change_wait_seconds: 0 }, {}, null]) {
        const view = await page(info);
        assert.equal(view.nodes.submit_username.disabled, false);
        assert.equal(view.nodes.username_wait.textContent, 'existing warning');
    }
});
