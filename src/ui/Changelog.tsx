import { Modal } from './Modal';
import { useRef, useState } from 'react';
import { useDesktopState } from './useDesktopState';

// These notes describe the code bundled with this installer, including beta builds.
const currentChanges = [
    'Automatic update downloads with a choice to restart now or later, plus a manual check in the changelog.',
    'A shared header and footer that stay visible while only the page content scrolls.',
    'Refreshed buttons, inputs and spacing across Dark, Light and Retro themes.',
    'A Custom theme dialog with background, text, accent and panel colors, plus corner styles.',
    'Sign in or sign out from the header; the Beta badge has been removed.',
    'Config saves no longer make unrelated controls flash or become disabled.',
    'Sniffing continues while browsing other pages; Config still pauses tracking.',
    'Faster page navigation, cached results, loading states and clearer connection errors.',
    'A Support page for one-time and monthly PayPal contributions.',
    'Window size and position are remembered, and Sniffer columns can be shown or hidden.',
    'Profile discovery and confirmation before importing history from a different profile.',
    'A more compact Config page and release notes available from the version number.',
];

// Summaries from the official GitHub release notes; missing versions are omitted.
// https://github.com/tnt-coders/rock-buddy-app/releases
const previousReleases = [
    {
        version: '1.12.0-beta3',
        changes: [
            'Added a sticky header with styled update progress and restart controls.',
            'Added a changelog with a manual update check and a more compact Config layout.',
        ],
    },
    {
        version: '1.11.0',
        changes: [
            'Added Rocksmith Learn & Play Edition compatibility.',
            'Added support for the Steam “Just in case we need it” beta branch.',
            'Updated application dependencies.',
        ],
    },
    {
        version: '1.10.3',
        changes: [
            'Fixed score verification with RSMods 1.2.8.0.',
            'Updated the bundled RockSniffer and moved to .NET 8.',
            'Fixed repeated warnings for test builds of songs.',
        ],
    },
    {
        version: '1.9.0',
        changes: [
            'Added Always Sniff to return to the Sniffer page when the window loses focus.',
            'Added Discord Rich Presence for the current song and progress.',
            'Improved error messages when Cloudflare returned a bad gateway response.',
        ],
    },
];

// Local text keeps the changelog available offline without remote HTML or API calls.
export function Changelog({ version, onClose }: { version: string; onClose: () => void }) {
    const releases = [{ version, changes: currentChanges }, ...previousReleases];
    const update = useDesktopState(window.api.getUpdateState, window.api.onUpdateState);
    const busy = useRef(false);
    const [checking, setChecking] = useState(false);
    const [error, setError] = useState('');
    const isChecking = checking || update?.status === 'checking';
    const canCheck = update && ['idle', 'error'].includes(update.status) && !checking;

    // Manual checks share the automatic updater; they never start a second download.
    async function checkForUpdates() {
        if (busy.current || !canCheck) return;
        busy.current = true;
        setChecking(true);
        setError('');

        try {
            await window.api.checkDesktopUpdate();
        } catch {
            setError('Could not check for updates. Please try again.');
        } finally {
            busy.current = false;
            setChecking(false);
        }
    }

    return (
        <Modal title="Changelog" onClose={onClose} className="changelog-dialog">
            <div className="changelog-controls">
                <button onClick={() => void checkForUpdates()} disabled={!canCheck}>
                    <span aria-hidden={isChecking}>Check for updates</span>
                    <span aria-hidden={!isChecking}>Checking…</span>
                </button>
                <span role="status">{error || update?.message}</span>
                <small className="changelog-update-hint">Rock Buddy automatically checks for updates</small>
            </div>
            <div className="changelog-content" tabIndex={0} aria-label="Release notes">
                {releases.map((release, index) => (
                    <section key={`${release.version}-${index}`}>
                        <h3>v{release.version}</h3>
                        <ul>
                            {release.changes.map((change) => <li key={change}>{change}</li>)}
                        </ul>
                    </section>
                ))}
            </div>
        </Modal>
    );
}
