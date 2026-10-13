const { contextBridge, ipcRenderer } = require('electron');

declare type windowResizeCallback = (width: number, height: number) => void;

export const API = {
    requestBackend: async (url: string, data: any) => ipcRenderer.invoke('backend-post', url, data),
    setGameplayActive: (active: boolean) => ipcRenderer.send('gameplay-state', active),
    getRocksnifferPath: () => ipcRenderer.invoke('get-rocksniffer-path'),
    launchRocksniffer: () => ipcRenderer.send('launch-rocksniffer'),
    clearRocksnifferCache: () => ipcRenderer.send('clear-rocksniffer-cache'),
    onLatestBetaVersion: async () => ipcRenderer.invoke('on-latest-beta-version'),
    getSrcDir: async () => ipcRenderer.invoke('get-src-dir'),
    logMessage: async (message: string) => ipcRenderer.send('log-message', message),
    info: (message: string) => ipcRenderer.send('info', message),
    warning: (message: string) => ipcRenderer.send('warning', message),
    error: (message: string) => ipcRenderer.send('error', message),
    getWindowSize: async () => ipcRenderer.invoke('get-window-size'),
    setWindowSize: async (width: number, height: number) => ipcRenderer.send('set-window-size', width, height),
    loadURL: async(url: string) => ipcRenderer.send('load-url', url),
    openExternalLink: (url: string) => ipcRenderer.send('open-external-link', url),
    getVersion: async () => ipcRenderer.invoke('get-version'),
    getHost: async () => ipcRenderer.invoke('get-host'),
    storeGet: async (key: string) => ipcRenderer.invoke('store-get', key),
    storeSet: async (key: string, value: any) => ipcRenderer.invoke('store-set', key, value),
    storeDelete: async (key: string) => ipcRenderer.invoke('store-delete', key),
    getPath: async (defaultPath: string) => ipcRenderer.invoke('get-path', defaultPath),
    getSFXFilePath: async (defaultPath: string) => ipcRenderer.invoke('get-sfx-file-path', defaultPath),
    directoryExists: async (path: string) => ipcRenderer.invoke('directory-exists', path),
    pathJoin: async (...args: string[]) => ipcRenderer.invoke('path-join', ...args),
    getFileTimestamp: async (path: string) => ipcRenderer.invoke('get-file-timestamp', path),
    readDir: async (dir: string) => ipcRenderer.invoke('read-dir', dir),
    readFile: async (file: string) => ipcRenderer.invoke('read-file', file),
    writeFile: async (file: string, contents: string) => ipcRenderer.invoke('write-file', file, contents),
    appendFile: async (file: string, contents: string) => ipcRenderer.invoke('append-file', file, contents),
    fileExists: async(file: string) => ipcRenderer.invoke('file-exists', file),
    waitForFile: async (file: string, timeout: number) => ipcRenderer.invoke('wait-for-file', file, timeout),
    semverValid: async (version: string) => ipcRenderer.invoke('semver-valid', version),
    semverGte: async (version1: string, version2: string) => ipcRenderer.invoke('semver-gte', version1, version2),
    semverMaxSatisfying: async (versions: string[], range: string) => ipcRenderer.invoke('semver-max-satisfying', versions, range),
    readRocksmithData: async (dataFile: string) => ipcRenderer.invoke('read-rocksmith-data', dataFile),
    getSteamProfiles: async (steamUserDataPath: string) => ipcRenderer.invoke('get-steam-profiles', steamUserDataPath),
    resolveRocksmithConfig: async () => ipcRenderer.invoke('resolve-rocksmith-config'),
    prepareRocksmithImport: async () => ipcRenderer.invoke('prepare-rocksmith-import'),
    getRocksmithProfiles: async (steamUserDataPath: string, steamProfile: string) => ipcRenderer.invoke('get-rocksmith-profiles', steamUserDataPath, steamProfile),
    openAddonsFolder: async () => ipcRenderer.send('open-addons-folder'),
    enableAddons: async (host: string, port: number) => ipcRenderer.send('enable-addons', host, port),
    disableAddons: async () => ipcRenderer.send('disable-addons'),
    windowResized: (callback: windowResizeCallback) => ipcRenderer.on('window-resized', (callback))
};

contextBridge.exposeInMainWorld('api', API);

// Keep the test-data warning visible on every beta page without changing normal installs.
window.addEventListener('DOMContentLoaded', async () => {
    const message = await ipcRenderer.invoke('get-beta-notice');
    if (!message) return;

    const notice = document.createElement('div');
    notice.id = 'beta-notice';
    notice.setAttribute('role', 'note');
    notice.textContent = message;
    notice.style.cssText = 'padding: 8px 12px; background: #422b12; color: #fff3d6; font: 14px/1.4 sans-serif;';
    document.body.prepend(notice);
});

// Keep connection status and update controls available on every page.
window.addEventListener('DOMContentLoaded', async () => {
    const bar = document.createElement('div');
    bar.id = 'desktop-tools';
    bar.style.cssText = 'display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:6px 12px;font:13px sans-serif;';
    const updateLabel = document.createElement('span');
    updateLabel.setAttribute('role', 'status');
    const check = document.createElement('button');
    check.textContent = 'Check for updates';
    check.onclick = () => ipcRenderer.invoke('check-desktop-update');
    const restart = document.createElement('button');
    restart.textContent = 'Install and restart';
    restart.onclick = () => ipcRenderer.invoke('install-desktop-update');
    const later = document.createElement('button');
    later.textContent = 'Later';
    const support = document.createElement('button');
    support.textContent = 'Support Rock Buddy';
    support.onclick = () => ipcRenderer.invoke('open-support');
    bar.append(support, check, updateLabel, restart, later);
    document.body.prepend(bar);

    let currentUpdate: any = null;
    function showUpdate(state: any) {
        if (!state) return;
        currentUpdate = state;
        const deferred = sessionStorage.getItem('deferred-update') === state.version;
        const ready = state.status === 'ready' && !deferred;
        restart.hidden = !ready;
        later.hidden = !ready;
        check.hidden = state.status === 'disabled';
        check.disabled = ['checking', 'downloading'].includes(state.status);
        updateLabel.textContent = state.status === 'disabled' || (state.status === 'ready' && deferred) ? '' : state.message;
        if (state.status === 'downloading') updateLabel.textContent += ` ${Math.round(state.percent)}%`;
    }
    later.onclick = () => {
        sessionStorage.setItem('deferred-update', currentUpdate.version);
        showUpdate(currentUpdate);
    };
    check.onclick = async () => {
        sessionStorage.removeItem('deferred-update');
        showUpdate(await ipcRenderer.invoke('check-desktop-update'));
    };
    ipcRenderer.on('update-state', (_event: any, state: any) => showUpdate(state));
    showUpdate(await ipcRenderer.invoke('get-update-state'));

    const connection = document.createElement('div');
    connection.id = 'connection-notice';
    connection.setAttribute('role', 'status');
    connection.style.cssText = 'padding:8px 12px;background:#422b12;color:#fff3d6;font:14px sans-serif;';
    const connectionLabel = document.createElement('span');
    const retry = document.createElement('button');
    retry.textContent = 'Reload page';
    retry.onclick = () => window.location.reload();
    connection.append(connectionLabel, document.createTextNode(' '), retry);
    bar.after(connection);

    function showConnection(state: any) {
        connection.hidden = state.connected;
        connectionLabel.textContent = state.message;
    }
    ipcRenderer.on('connection-state', (_event: any, state: any) => showConnection(state));
    showConnection(await ipcRenderer.invoke('get-connection-state'));
});
