const semver = require('semver');

// Only installed Windows apps using their intended server may install updates.
function updatesEnabled(packaged, platform, host, packagedBackend, hosts) {
    const channel = packagedBackend || 'production';
    return packaged && platform === 'win32' && ['production', 'beta'].includes(channel) && host === hosts[channel];
}

// Download in the background, but install only after an explicit click outside gameplay.
function createDesktopUpdates(updater, { version, allowBeta, canInstall, onState, onLatest = () => {} }) {
    let state = { status: 'idle', message: '', version: null, percent: 0 };
    let checking = false;
    let installing = false;

    function publish(patch) {
        state = { ...state, ...patch };
        onState(state);
    }

    function failed() {
        publish({ status: 'error', message: 'Could not update Rock Buddy. Try again later.' });
    }

    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = false;
    updater.allowDowngrade = false;
    updater.logger = null;

    updater.on('checking-for-update', () => publish({ status: 'checking', message: 'Checking for updates…' }));
    updater.on('update-not-available', () => {
        onLatest(true);
        publish({ status: 'idle', message: 'Rock Buddy is up to date.', version: null, percent: 0 });
    });

    updater.on('update-available', info => {
        // Never install a downgrade or an opted-out prerelease, even if feed metadata is wrong.
        const valid = semver.valid(info.version) && semver.gt(info.version, version);
        if (!valid || (semver.prerelease(info.version) && !allowBeta())) {
            publish({ status: 'idle', message: 'No newer update is available.' });
            return;
        }

        onLatest(false);
        publish({ status: 'downloading', message: 'Downloading update…', version: info.version, percent: 0 });
        updater.downloadUpdate().catch(failed);
    });

    updater.on('download-progress', progress => {
        publish({ status: 'downloading', percent: Math.max(0, Math.min(100, progress.percent || 0)) });
    });
    updater.on('update-downloaded', info => {
        publish({ status: 'ready', message: 'Update ready.', version: info.version, percent: 100 });
    });
    updater.on('error', failed);

    // Manual and scheduled checks share a lock so they cannot start duplicate downloads.
    async function check() {
        if (checking || installing || ['downloading', 'ready'].includes(state.status)) return state;
        checking = true;
        updater.allowPrerelease = allowBeta();
        updater.allowDowngrade = false;
        try { await updater.checkForUpdates(); } catch { failed(); }
        finally { checking = false; }
        return state;
    }

    async function install() {
        if (installing || state.status !== 'ready') return state;
        installing = true;
        try {
            if (!await canInstall()) {
                publish({ message: 'Finish playing and wait for score uploads before restarting.' });
                return state;
            }
            updater.quitAndInstall(false, true);
        } catch { failed(); }
        finally { installing = false; }
        return state;
    }

    return { check, install, getState: () => state };
}

module.exports = { createDesktopUpdates, updatesEnabled };
