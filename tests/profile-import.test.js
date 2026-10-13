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
