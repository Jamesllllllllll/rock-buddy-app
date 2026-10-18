const assert = require('node:assert/strict');
const test = require('node:test');
const { approveProfileImport } = require('../src/profile-import');
const original = { steam_id: '100', profile_id: 'one', profile_name: 'Player' };
const other = { steam_id: '200', profile_id: 'two', profile_name: 'Friend' };

test('the original identity imports without prompting, even if renamed', async () => {
    assert.equal(await approveProfileImport({ ...original, profile_name: 'Renamed' },
        async action => { assert.equal(action, 'get'); return { profile: original }; },
        () => assert.fail('same profile must not prompt')), true);
});

test('another profile requires approval and never replaces the original link', async () => {
    for (const accepted of [true, false]) {
        let prompted = 0;
        assert.equal(await approveProfileImport(other,
            async action => { assert.equal(action, 'get'); return { profile: original }; },
            async (linked, candidate) => {
                assert.deepEqual(linked, original); assert.deepEqual(candidate, other);
                prompted++; return accepted;
            }), accepted);
        assert.equal(prompted, 1);
    }
});

test('Steam identity matters even when profile IDs match', async () => {
    assert.equal(await approveProfileImport({ ...original, steam_id: '200' },
        async () => ({ profile: original }), async () => false), false);
});

test('first link requires confirmation, and declining writes nothing', async () => {
    const actions = [];
    assert.equal(await approveProfileImport(original,
        async action => { actions.push(action); return { profile: null }; },
        async linked => { assert.equal(linked, null); return false; }), false);
    assert.deepEqual(actions, ['get']);
    assert.equal(await approveProfileImport(original,
        async (action, profile) => {
            if (action === 'link') assert.deepEqual(profile, original);
            return { profile: action === 'link' ? original : null };
        }, async () => true), true);
});

test('a concurrent first link on another PC still requires mismatch approval', async () => {
    const prompts = [];
    assert.equal(await approveProfileImport(other,
        async action => ({ profile: action === 'get' ? null : original }),
        async linked => { prompts.push(linked); return linked === null; }), false);
    assert.deepEqual(prompts, [null, original]);
});

test('server failures never grant import permission', async () => {
    await assert.rejects(approveProfileImport(original,
        async () => { throw new Error('offline'); }, () => assert.fail()), /offline/);
    await assert.rejects(approveProfileImport(original,
        async () => ({ profile: null }), async () => true), /could not be linked/);
});

// Exercise the real IPC handler so a direct fetch cannot bypass API version handling again.
function importHandler(fetchImpl) {
    const fs = require('node:fs');
    const vm = require('node:vm');
    const ts = require('typescript');
    const { createBackendClient } = require('../src/backend-client');
    const source = ts.createSourceFile('main.js', fs.readFileSync('src/main.js', 'utf8'), ts.ScriptTarget.Latest, true);
    let handler;
    function visit(node) {
        if (ts.isCallExpression(node) && node.arguments[0]?.text === 'prepare-rocksmith-import') {
            handler = node.arguments[1].getText(source);
        }
        ts.forEachChild(node, visit);
    }
    visit(source);
    assert.equal(typeof handler, 'string');

    const host = 'https://example.invalid';
    let prompts = 0;
    const run = vm.runInNewContext(`(${handler})`, {
        host, currentVersion: '1.12.0-beta.7',
        store: { get: () => ({ user_id: 1, api_key: 'test-token' }) },
        resolveRocksmithConfig: () => ({ steamProfile: '100', rocksmithProfile: 'one', profileName: 'Player' }),
        getSteamProfiles() {}, getRocksmithProfiles() {},
        profileImportDecisions: new Map(), approveProfileImport,
        backendClient: createBackendClient(host, { fetchImpl }),
        fetch: () => assert.fail('Profile requests must use the shared backend client'),
        win: {}, dialog: { showMessageBox: async () => { prompts++; return { response: 1 }; } },
    });
    return { run, prompts: () => prompts };
}

test('production-beta profile reads and links use the compatible version before importing', async () => {
    const requests = [];
    const f = importHandler(async (url, options) => {
        assert.equal(url, 'https://example.invalid/api/account/rocksmith_profile.php');
        assert.equal(options.redirect, 'error');
        const body = JSON.parse(options.body);
        assert.equal(body.version, '1.12.0-beta7');
        assert.deepEqual(body.auth_data, { user_id: 1, api_key: 'test-token' });
        requests.push(body);
        return Response.json({ profile: body.action === 'get' ? null : body.profile });
    });
    assert.equal((await f.run()).importHistory, true);
    assert.deepEqual(requests.map(body => body.action), ['get', 'link']);
    assert.deepEqual(requests[1].profile, original);
    assert.equal(f.prompts(), 1);

    // A remembered decision does not repeat the request or confirmation.
    assert.equal((await f.run()).importHistory, true);
    assert.equal(requests.length, 2);
});

test('profile API failures preserve the reason and never cache import approval', async () => {
    let requests = 0;
    const f = importHandler(async () => {
        requests++;
        return Response.json({ error: 'Invalid API key or inactive account.' }, { status: 401 });
    });
    await assert.rejects(f.run(), /Invalid API key or inactive account/);
    await assert.rejects(f.run(), /Invalid API key or inactive account/);
    assert.equal(requests, 2);
    assert.equal(f.prompts(), 0);
});
