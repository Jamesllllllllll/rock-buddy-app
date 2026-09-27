const base = require('./package.json').build;
const run = process.env.GITHUB_RUN_NUMBER || '0';
if (!/^\d+$/.test(run)) throw new Error('Invalid build number');
module.exports = {
    ...base,
    extends: null,
    appId: 'com.rockbuddy.beta',
    productName: 'Rock Buddy Beta',
    artifactName: 'Rock-Buddy-Beta-${version}-${arch}-Setup.${ext}',
    extraMetadata: {
        name: 'rock-buddy-beta',
        rockBuddyBackend: 'beta',
        // The legacy desktop API accepts betaN, not arbitrary semver prerelease labels.
        version: `1.11.0-beta${run}`,
    },
    buildVersion: `1.11.0.${run}`,
    directories: { output: 'release/beta' },
    // Explicit inputs keep developer logs, private files, and build tools out of releases.
    files: ['src/**/*', 'dist/**/*', 'images/**/*', 'package.json'],
    extraFiles: [
        { from: '.generated/rocksniffer-beta', to: 'RockSniffer' },
        ...base.extraFiles.slice(1),
    ],
    win: { target: [{ target: 'nsis', arch: ['x64'] }], executableName: 'RockBuddyBeta' },
    nsis: { ...base.nsis, shortcutName: 'Rock Buddy Beta', runAfterFinish: false },
    publish: null,
};
