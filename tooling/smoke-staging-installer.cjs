// Runs on a disposable Windows CI runner, against the actual NSIS installation.
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createCipheriv } = require('node:crypto');
const { deflateSync } = require('node:zlib');
const { extractFile, listPackage } = require('@electron/asar');
const { HOSTS } = require('../src/backend-config');

(async () => {
    assert.equal(process.platform, 'win32');
    const out = path.resolve('release/staging');
    const installers = fs.readdirSync(out).filter(name => name.endsWith('-Setup.exe'));
    assert.equal(installers.length, 1, 'Exactly one installer expected');
    const install = path.join(os.tmpdir(), 'rock-buddy-staging-smoke');
    const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
        '$p = Start-Process -FilePath $env:SMOKE_INSTALLER -ArgumentList @("/S", "/D=$env:SMOKE_INSTALL_DIR") -Wait -PassThru; exit $p.ExitCode',
    ], { timeout: 120000, stdio: 'inherit', env: { ...process.env, SMOKE_INSTALLER: path.join(out, installers[0]), SMOKE_INSTALL_DIR: install } });
    if (result.status !== 0) {
        spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
            'Get-WinEvent -FilterHashtable @{LogName="Application"; StartTime=(Get-Date).AddMinutes(-3)} -ErrorAction SilentlyContinue | Where-Object {$_.Message -like "*Rock-Buddy-Staging*"} | Select-Object -First 3 -ExpandProperty Message',
        ], { stdio: 'inherit', timeout: 15000 });
    }
    assert.equal(result.status, 0, 'NSIS install must succeed');
    const asar = path.join(install, 'resources/app.asar');
    const metadata = JSON.parse(extractFile(asar, 'package.json'));
    assert.equal(metadata.name, 'rock-buddy-staging');
    assert.equal(metadata.rockBuddyBackend, 'staging');
    assert.ok(!listPackage(asar).some(file => /(?:\.private|\.env|rock_buddy_log|node_modules\/\.cache)/.test(file)));
    for (const file of ['RockSniffer.exe', 'coreclr.dll', 'hostfxr.dll']) {
        assert.ok(fs.existsSync(path.join(install, 'RockSniffer', file)), `Bundled runtime: ${file}`);
    }
    const productionConfig = path.join(process.env.APPDATA, 'rock-buddy/config.json');
    fs.mkdirSync(path.dirname(productionConfig), { recursive: true });
    const sentinel = JSON.stringify({ stagingSmokeSentinel: true });
    fs.writeFileSync(productionConfig, sentinel);
    // Synthetic Steam/Rocksmith files exercise discovery through the installed preload/main IPC.
    const steamRoot = path.join(os.tmpdir(), 'rock-buddy-smoke-steam');
    const remote = path.join(steamRoot, '100', '221680', 'remote');
    fs.mkdirSync(remote, { recursive: true });
    fs.mkdirSync(path.join(steamRoot, '100', 'config'), { recursive: true });
    fs.writeFileSync(path.join(steamRoot, '100', 'config', 'localconfig.vdf'), '"PersonaName" "CI Player"');
    const compressed = deflateSync(JSON.stringify({ Profiles: [{ PlayerName: 'CI Profile', UniqueID: 'ci-profile' }] }) + '\0');
    const padded = Buffer.alloc(Math.ceil(compressed.length / 16) * 16);
    compressed.copy(padded);
    // Public Rocksmith save-format key, already used by the original desktop reader.
    const cipher = createCipheriv('aes-256-ecb', Buffer.from('728b369e24ed0134768511021812afc0a3c25d02065f166b4bcc58cd2644f29e', 'hex'), null);
    cipher.setAutoPadding(false);
    fs.writeFileSync(path.join(remote, 'LocalProfiles.json'), Buffer.concat([Buffer.alloc(20), cipher.update(padded), cipher.final()]));
    fs.writeFileSync(path.join(remote, 'ci-profile_PRFLDB'), 'synthetic profile placeholder');
    const child = spawn(path.join(install, 'RockBuddyStaging.exe'), ['--remote-debugging-port=9333'], {
        cwd: os.tmpdir(), stdio: 'ignore',
    });
    let socket;
    try {
        let target;
        for (let i = 0; i < 60; i++) {
            if (child.exitCode !== null) throw new Error(`Installed app exited: ${child.exitCode}`);
            try {
                const targets = await (await fetch('http://127.0.0.1:9333/json/list', { signal: AbortSignal.timeout(1000) })).json();
                // Wait for startup's auth redirect before changing synthetic local settings.
                target = targets.find(page => page.type === 'page' && page.url.startsWith('file:') && page.url.endsWith('/auth/login.html'));
                if (target) break;
            } catch {}
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        assert.ok(target, 'Installed app must reach its login page');
        socket = new WebSocket(target.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
        const response = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Renderer check timed out')), 15000);
            socket.addEventListener('message', event => {
                const data = JSON.parse(event.data);
                if (data.id === 1) { clearTimeout(timer); resolve(data); }
            });
            socket.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: {
                expression: `(async () => {
                    await window.api.storeSet('default_steam_user_data_path', ${JSON.stringify(steamRoot)});
                    const detected = [];
                    for (const user_id of [999001, 999002]) {
                        await window.api.storeSet('auth_data', { user_id });
                        detected.push(await window.api.resolveRocksmithConfig());
                    }
                    await window.api.storeDelete('auth_data');
                    return {host: await window.api.getHost(), version: await window.api.getVersion(),
                        sentinel: await window.api.storeGet('stagingSmokeSentinel'), detected};
                })()`,
                awaitPromise: true, returnByValue: true,
            } }));
        });
        assert.ok(!response.error && !response.result?.exceptionDetails,
            'Preload/renderer check failed: ' + JSON.stringify(response.error || response.result?.exceptionDetails));
        assert.equal(response.result.result.value.host, HOSTS.staging);
        assert.equal(response.result.result.value.sentinel, null);
        for (const config of response.result.result.value.detected) {
            assert.equal(config?.profilePath, path.join(remote, 'ci-profile_PRFLDB'), 'Fresh accounts discover the profile without Config');
        }
        const versionCheck = await fetch(HOSTS.staging + '/api/auth/login.php', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ version: response.result.result.value.version }),
            signal: AbortSignal.timeout(10000),
        });
        assert.equal(versionCheck.status, 400, 'Packaged version must pass the live API version gate');
        assert.deepEqual(await versionCheck.json(), { error: 'Invalid JSON data.' });
        assert.equal(fs.readFileSync(productionConfig, 'utf8'), sentinel);
        assert.ok(fs.existsSync(path.join(process.env.APPDATA, 'rock-buddy-staging/config-staging.json')));
        console.log('NSIS install, packaged startup, staging routing, runtime bundling, production settings isolation, and fresh-account profile discovery passed.');
    } finally {
        socket?.close();
        if (child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
