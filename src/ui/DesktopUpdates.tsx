import { useEffect, useRef, useState } from 'react';
import { useDesktopState } from './useDesktopState';
import type { DesktopUpdateState } from './desktop-state';

// A browser dialog traps focus without blocking timers, gameplay or uploads.
function UpdateDialog({ state, onLater }: { state: DesktopUpdateState; onLater: () => void }) {
    const dialog = useRef<HTMLDialogElement>(null);
    const laterButton = useRef<HTMLButtonElement>(null);
    const busy = useRef(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');
    const installing = pending || state.status === 'installing';

    useEffect(() => {
        const element = dialog.current!;
        element.showModal();
        laterButton.current?.focus();
        return () => element.close();
    }, []);

    // The main process checks gameplay and uploads again before closing the app.
    async function restart() {
        if (busy.current) return;
        busy.current = true;
        setPending(true);
        setError('');

        try {
            const result = await window.api.installDesktopUpdate();
            if (!result) setError('Could not restart Rock Buddy. Please try again.');
        } catch {
            setError('Could not restart Rock Buddy. Please try again.');
        } finally {
            busy.current = false;
            setPending(false);
        }
    }

    const message = error || (state.message === 'Update ready.' ? '' : state.message);

    return (
        <dialog
            ref={dialog}
            className="app-dialog update-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="update-title"
            aria-describedby="update-description"
            onCancel={(event) => event.preventDefault()}
            onKeyDown={(event) => {
                if (event.key === 'Escape') event.preventDefault();
            }}
        >
            <h2 id="update-title">Rock Buddy {state.version} is ready</h2>
            <p id="update-description">Restart to install the update.</p>
            {message && <p role="status">{message}</p>}
            <div className="update-actions">
                <button onClick={() => void restart()} disabled={installing}>Restart now</button>
                <button ref={laterButton} onClick={onLater} disabled={installing}>Restart later</button>
            </div>
        </dialog>
    );
}

// Stay quiet until a download is ready; Later keeps a small way to reopen it.
export function DesktopUpdates() {
    const state = useDesktopState(window.api.getUpdateState, window.api.onUpdateState);
    const [version, setVersion] = useState('');
    const [deferredVersion, setDeferredVersion] = useState(() => sessionStorage.getItem('deferred-update'));

    useEffect(() => {
        let mounted = true;
        window.api.getVersion()
            .then((value) => { if (mounted) setVersion(value); })
            .catch(() => console.warn('Could not read the app version.'));
        return () => { mounted = false; };
    }, []);

    const ready = state?.status === 'ready';
    const showDialog = state?.status === 'installing' || (ready && state.version !== deferredVersion);

    function later() {
        if (!state?.version) return;
        sessionStorage.setItem('deferred-update', state.version);
        setDeferredVersion(state.version);
    }

    function reopen() {
        sessionStorage.removeItem('deferred-update');
        setDeferredVersion(null);
    }

    return (
        <div className="desktop-version">
            {version && <span>v{version}</span>}
            {ready && !showDialog && <button className="text-button" onClick={reopen}>Update ready</button>}
            {showDialog && state && <UpdateDialog key={state.version} state={state} onLater={later} />}
        </div>
    );
}
