const fs = require('node:fs');
const semver = require('semver');
const version = process.env.INSTALLER_VERSION;
const target = process.env.ROCK_BUDDY_PACKAGE_TARGET;

// The backend accepts betaN versions; keep Windows and desktop API versions compatible.
if (!['production', 'beta'].includes(target)) throw new Error('Choose an installer target.');
if (!semver.valid(version) || !/^\d+\.\d+\.\d+(?:-beta\d+)?$/.test(version)) throw new Error('Use X.Y.Z or X.Y.Z-betaN.');
if (target === 'beta' && !semver.prerelease(version)) throw new Error('Test installers need a betaN version.');
if (target === 'production' && semver.prerelease(version)) throw new Error('Production installers need a stable version.');
const metadata = JSON.parse(fs.readFileSync('package.json', 'utf8'));
metadata.version = version;
fs.writeFileSync('package.json', JSON.stringify(metadata, null, 4) + '\n');
