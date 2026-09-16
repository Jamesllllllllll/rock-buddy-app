// Preserve the released executable, RockSniffer and dependencies; change only CSP.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const asar = require('@electron/asar');

(async () => {
    const root = path.resolve('release/public-staging');
    const archive = path.join(root, 'resources/app.asar');
    const original = path.resolve('release/original.asar');
    const unpacked = path.resolve('release/unpacked');
    const source = await fs.readFile('src/index.html', 'utf8');
    const before = asar.extractFile(archive, 'src/index.html');
    const allowed = before.toString().replace(
        'http://raspberrypi:8080;script-src',
        'http://raspberrypi:8080 https://rock-buddy-site-staging.rock-buddy.workers.dev;script-src');
    assert.notEqual(allowed, before.toString(), 'Expected public release CSP');
    const normalize = text => text.replace(/\r\n/g, '\n').trimEnd();
    assert.equal(normalize(source), normalize(allowed), 'Only the staging CSP origin may change');
    const replacement = Buffer.from(allowed); // Preserve the release's exact line endings.
    assert.equal(JSON.parse(asar.extractFile(archive, 'package.json')).version, '1.11.0');
    await fs.copyFile(archive, original);
    asar.extractAll(original, unpacked);
    await fs.writeFile(path.join(unpacked, 'src/index.html'), replacement);
    asar.uncache(archive);
    await asar.createPackage(unpacked, archive);
    asar.uncache(archive);
    const paths = asar.listPackage(original).sort();
    assert.deepEqual(asar.listPackage(archive).sort(), paths, 'No archive entries added or removed');
    let checked = 0;
    for (const entry of paths) {
        const name = entry.replaceAll('\\', '/').replace(/^\//, '');
        const metadata = asar.statFile(original, name);
        if (metadata.files) continue;
        assert.ok(!metadata.unpacked && !metadata.link, 'Unexpected public archive entry');
        const expected = name === 'src/index.html' ? replacement : asar.extractFile(original, name);
        assert.ok(asar.extractFile(archive, name).equals(expected), `Unexpected change: ${name}`);
        checked++;
    }
    await fs.copyFile('tooling/Start-Staging.cmd', path.join(root, 'Start-Staging.cmd'));
    await fs.copyFile('PUBLIC-STAGING.md', path.join(root, 'READ-ME.md'));
    const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
    await fs.writeFile(path.join(root, 'provenance.json'), JSON.stringify({
        release: 'https://github.com/tnt-coders/rock-buddy-app/releases/tag/v1.11.0',
        installerSha256: 'd4d44c84b086627e07920648800d553d168d9176bc0400740158b5d932149263',
        appArchiveSha256: sha256(await fs.readFile(archive)),
        changedAppFiles: ['src/index.html'],
        verifiedArchiveFiles: checked,
    }, null, 2) + '\n');
    console.log(`Verified ${checked} archive files: only src/index.html changed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
