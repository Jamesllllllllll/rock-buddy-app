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
    const elements = new Map();
    const document = {getElementById: id => {
        if (!elements.has(id)) elements.set(id,{style:{},appendChild(){}});
        return elements.get(id);
    }};
    vm.runInNewContext(source, {exports,Date,document,
        window:{sessionStorage:{getItem:()=>'{"user_id":1}'},api:{setGameplayActive(){}}},
        require:()=>({logMessage(){},showExclusive(){},showError:error=>assert.fail(String(error))}),
    });
    return exports.Sniffer;
}

test('slow backend sync does not block local gameplay updates or launch overlapping syncs', async () => {
    const Sniffer=loadSniffer();
    const sniffer=new Sniffer({}, {}, {enabled:()=>false});
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
    const sniffer=new Sniffer({}, {}, {enabled:()=>false});
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
