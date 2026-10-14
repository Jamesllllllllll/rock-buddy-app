import { useState } from 'react';
import { useDesktopState } from './useDesktopState';
import type { DesktopUpdateState } from './desktop-state';

const noticeStyle = {
    padding: '8px 12px',
    background: '#422b12',
    color: '#fff3d6',
    font: '14px/1.4 sans-serif',
};

// Normal navigation stays quiet; Config keeps the manual update check available.
function UpdateNotice({ allowManualCheck }: { allowManualCheck: boolean }) {
    const state = useDesktopState(window.api.getUpdateState, window.api.onUpdateState);
    const [deferredVersion, setDeferredVersion] = useState(() =>
        sessionStorage.getItem('deferred-update'),
    );
    const [actionError, setActionError] = useState<{
        state: DesktopUpdateState;
        message: string;
    } | null>(null);
    const [manualCheck, setManualCheck] = useState(false);

    if (!state || state.status === 'disabled') return null;

    const ready = state.status === 'ready' && state.version !== deferredVersion;
    const downloading = state.status === 'downloading';
    // A later main-process update supersedes an earlier button-action failure.
    const errorMessage = actionError?.state === state ? actionError.message : '';
    const visible =
        allowManualCheck ||
        ready ||
        downloading ||
        state.status === 'error' ||
        manualCheck ||
        !!errorMessage;
    if (!visible) return null;

    // Let the main process publish progress; a click does not imply the check succeeded.
    async function check() {
        sessionStorage.removeItem('deferred-update');
        setDeferredVersion(null);
        setManualCheck(true);
        setActionError(null);

        try {
            await window.api.checkDesktopUpdate();
        } catch {
            setActionError({
                state: state!,
                message: 'Could not check for updates. Please try again.',
            });
        }
    }

    // Installation still goes through the main process's gameplay and upload checks.
    async function install() {
        setActionError(null);

        try {
            await window.api.installDesktopUpdate();
        } catch {
            setActionError({
                state: state!,
                message: 'Could not install the update. Please try again.',
            });
        }
    }

    function deferUpdate() {
        if (!state?.version) return;
        sessionStorage.setItem('deferred-update', state.version);
        setDeferredVersion(state.version);
        setManualCheck(false);
    }

    const message = state.status === 'ready' && !ready ? '' : state.message;

    return (
        <div
            id="desktop-tools"
            style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                flexWrap: 'wrap',
                padding: '6px 12px',
                font: '13px sans-serif',
            }}
        >
            <button onClick={check} disabled={state.status === 'checking' || downloading}>
                Check for updates
            </button>
            <span role="status">
                {errorMessage || message}
                {downloading ? ` ${Math.round(state.percent || 0)}%` : ''}
            </span>
            {ready && (
                <>
                    <button onClick={install}>Install and restart</button>
                    <button onClick={deferUpdate}>Later</button>
                </>
            )}
        </div>
    );
}

// An unknown connection state is not an error; render only a reported failure.
function ConnectionNotice() {
    const state = useDesktopState(window.api.getConnectionState, window.api.onConnectionState);
    if (!state || state.connected) return null;

    return (
        <div id="connection-notice" role="status" style={noticeStyle}>
            {state.message} <button onClick={() => window.location.reload()}>Reload page</button>
        </div>
    );
}

// These components can stay mounted in the shared shell as pages move to React.
export function DesktopStatus({ allowManualCheck = false }: { allowManualCheck?: boolean }) {
    return (
        <>
            <UpdateNotice allowManualCheck={allowManualCheck} />
            <ConnectionNotice />
        </>
    );
}
