const base = require('./package.json').build;
const run = process.env.GITHUB_RUN_NUMBER || '0';
const attempt = process.env.GITHUB_RUN_ATTEMPT || '0';
if (!/^\d+$/.test(run) || !/^\d+$/.test(attempt)) throw new Error('Invalid build number');
module.exports = {
    ...base,
    extends: null,
    appId: 'com.rockbuddy.staging',
    productName: 'Rock Buddy Staging',
    artifactName: 'Rock-Buddy-Staging-${version}-${arch}-Setup.${ext}',
    extraMetadata: {
        name: 'rock-buddy-staging',
        rockBuddyBackend: 'staging',
        version: `1.11.0-staging.${run}.${attempt}`,
    },
    buildVersion: `1.11.0.${run}`,
    directories: { output: 'release/staging' },
    // Explicit inputs keep developer logs, private files, and build tools out of releases.
    files: ['src/**/*', 'dist/**/*', 'images/**/*', 'package.json'],
    extraFiles: [
        { from: '.generated/rocksniffer-staging', to: 'RockSniffer' },
        ...base.extraFiles.slice(1),
    ],
    win: { target: [{ target: 'nsis', arch: ['x64'] }], executableName: 'RockBuddyStaging' },
    nsis: { ...base.nsis, shortcutName: 'Rock Buddy Staging', runAfterFinish: false },
    publish: null,
};
