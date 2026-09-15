const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('declining history imports still syncs the catalog and records a new verified run', async () => {
    const sent = [];
    const window = { sessionStorage: { getItem: () => JSON.stringify({ user_id: 101, api_key: 'test' }) },
        api: { getHost: async () => 'https://example.invalid', error: message => assert.fail(message),
            getFileTimestamp: () => assert.fail('declined save must not be inspected'),
            readRocksmithData: () => assert.fail('declined save must not be read') } };
    const element = () => ({ appendChild() {}, style: {} });
    const load = file => {
        const exports = {};
        const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
        }).outputText;
        vm.runInNewContext(source, { exports, window,
            document: { getElementById: element, createElement: element },
            require: () => ({ logMessage() {},
                getAvailablePaths: arrangements => arrangements.map(a => ({ hash: a.arrangementID, name: 'Lead' })),
                post: async (url, body) => { sent.push({ url, body }); return { success: true }; } }),
        });
        return exports;
    };
    const { Rocksmith } = load('src/sniffer/rocksmith.ts');
    const { Sniffer } = load('src/sniffer/sniffer.ts');
    const rocksmith = new Rocksmith('friend_PRFLDB', false);
    const sniffer = new Sniffer(rocksmith, {}, {});
    sniffer.showLeaderboard = async () => {};
    const data = { songDetails: { songID: 'song', psarcFileHash: 'file', songName: 'Song', artistName: 'Artist',
        albumName: 'Album', albumYear: 2026, toolkit: { author: 'Author', version: '1' },
        arrangements: [{ arrangementID: 'lead', noteDataHash: 'notes' }] },
        memoryReadout: { arrangementID: 'lead', noteData: { HighestHitStreak: 42, Accuracy: 90 } } };
    assert.equal(await rocksmith.newProfileDataAvailable(), false);
    await sniffer.snort(data);
    const sync = sent.find(r => r.url.endsWith('/sniffer_sync.php')).body;
    assert.equal(sync.lurk_mode, true);
    assert.deepEqual(Object.keys(sync.song_data.arrangements.lead).sort(), ['hash', 'name', 'note_data_hash']);
    await sniffer.recordVerifiedScore(data, 100);
    const verified = sent.find(r => r.url.endsWith('/record_verified_score.php')).body;
    assert.equal(verified.song_data.mastery, 0.9);
    assert.equal(verified.song_data.streak, 42);
});
