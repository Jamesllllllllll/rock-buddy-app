const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the actual sniffer loop with an unresolved server sync and a working local reader.
function loadSniffer() {
    const exports = {};
    const source = ts.transpileModule(fs.readFileSync('src/sniffer/sniffer.ts','utf8'), {
        compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
    }).outputText;
    vm.runInNewContext(source, {exports,Date,clearInterval,
        window:{sessionStorage:{getItem:()=>'{"user_id":1}'},api:{setGameplayActive(){}}},
        require:()=>({logMessage(){},showExclusive(){},showError:error=>assert.fail(String(error))}),
    });
    return exports.Sniffer;
}

test('slow backend sync does not block local gameplay updates or launch overlapping syncs', async () => {
    const Sniffer=loadSniffer();
    const sniffer=new Sniffer({}, {}, {enabled:()=>false,disable(){}}, {user_id:1});
    const data={songDetails:{songID:'one'},memoryReadout:{songTimer:30}};
    let syncs=0, live=0, progress=0, finish;
    sniffer.sniff=async()=>data;
    sniffer.updatePath=()=>{};
    sniffer.updateSongInfo=()=>{};
    sniffer.updateLiveFeed=()=>{live++;};
    sniffer.monitorProgress=async()=>{progress++;};
    sniffer.checkSnort=()=>{syncs++;return new Promise(resolve=>{finish=resolve;});};
    await sniffer.refresh();
    await sniffer.refresh();
    assert.equal(syncs,1);
    assert.equal(live,2);
    assert.equal(progress,2);
    finish();
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(sniffer._syncActive,false);
});

test('unexpected sync failures wait before retrying and leave the local loop usable', async () => {
    const Sniffer=loadSniffer();
    const sniffer=new Sniffer({}, {}, {enabled:()=>false,disable(){}}, {user_id:1});
    sniffer.sniff=async()=>({songDetails:{songID:'one'},memoryReadout:{songTimer:0}});
    sniffer.updatePath=()=>{};
    sniffer.updateSongInfo=()=>{};
    sniffer.updateLiveFeed=()=>{};
    sniffer.monitorProgress=async()=>{};
    let syncs=0;
    sniffer.checkSnort=async()=>{syncs++;throw new Error('temporary failure');};
    await sniffer.refresh();
    await new Promise(resolve=>setImmediate(resolve));
    for(let i=0;i<20;i++) await sniffer.refresh();
    assert.equal(syncs,1);
    assert.ok(sniffer._retrySyncAt>Date.now());
    assert.equal(sniffer._refreshActive,false);
});

test('stopping the engine ignores a pending local read and prevents further polls', async () => {
    const Sniffer = loadSniffer();
    const sniffer = new Sniffer({}, {}, { enabled: () => false, disable() {} }, { user_id: 1 });
    let finish;
    let polls = 0;
    sniffer.sniff = () => { polls++; return new Promise(resolve => { finish = resolve; }); };
    sniffer.updatePath = () => assert.fail('A disposed engine must not process another frame');
    const pending = sniffer.refresh();
    sniffer.stop();
    finish({ songDetails: { songID: 'one' }, memoryReadout: { songTimer: 10 } });
    await pending;
    await sniffer.refresh();
    assert.equal(polls, 1);
});

test('an ended session cannot submit another score', async () => {
    const Sniffer = loadSniffer();
    const sniffer = new Sniffer({}, {}, { disable() {} }, { user_id: 1 });
    sniffer.stop();
    await assert.rejects(sniffer.send('https://example.invalid/api/data/sniffer_sync.php', {}), /session has ended/);
});

test('normal reader waiting states remain distinct from failures', async () => {
    const Sniffer = loadSniffer();
    let data = null;
    const reader = { sniff: async () => data };
    const sniffer = new Sniffer({}, reader, { enabled: () => false }, { user_id: 1 });
    for (const snapshot of [null, { RocksmithFound: false }, { RocksmithFound: true, psarcProcessingCount: 2 }, { RocksmithFound: true, success: false }]) {
        data = snapshot;
        await sniffer.refresh();
        assert.equal(sniffer.getSnapshot().activity, 'waiting');
    }
    reader.sniff = async () => { throw new Error('Reader disconnected'); };
    await sniffer.refresh();
    assert.equal(sniffer.getSnapshot().activity, 'error');
});

test('reader activity follows gameplay pauses and recovers after an error', async () => {
    const Sniffer = loadSniffer();
    const sniffer = new Sniffer({}, {}, { enabled: () => false }, { user_id: 1 });
    sniffer.sniff = async () => ({ memoryReadout: { songTimer: 30 } });
    sniffer.updatePath = sniffer.updateSongInfo = sniffer.updateLiveFeed = () => {};
    sniffer.monitorProgress = sniffer.checkSnort = async () => {};
    sniffer.publish({ error: 'Previous error', activity: 'error', live: { active: true } });
    await sniffer.refresh();
    assert.equal(sniffer.getSnapshot().activity, 'sniffing');
    assert.equal(sniffer.getSnapshot().error, null);
    sniffer._isPaused = true;
    await sniffer.refresh();
    assert.equal(sniffer.getSnapshot().activity, 'paused');
    sniffer._isPaused = false;
    sniffer.publish({ live: { active: false } });
    await sniffer.refresh();
    assert.equal(sniffer.getSnapshot().activity, 'waiting');
});
