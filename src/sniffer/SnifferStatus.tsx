import { useSyncExternalStore } from 'react';
import { useGameplay } from './Gameplay';
import type { SnifferState } from './sniffer';

const noSubscription = () => () => {};
const noSnapshot = () => null;

// Explain the existing engine state without starting another reader or timer.
export function snifferStatus(paused: boolean, error?: string, state?: SnifferState | null) {
    if (paused) return { color: 'orange', message: 'Paused while Config is open.' };
    if (error) return { color: 'red', message: error };
    if (!state) return { color: 'orange', message: 'Starting RockSniffer…' };
    if (state.activity === 'error') return { color: 'red', message: state.error || 'RockSniffer is not responding.' };
    if (state.lurkMode) return { color: 'orange', message: 'Lurk mode is on. Scores are not recorded.' };
    if (state.activity === 'paused') return { color: 'orange', message: 'The song is paused.' };
    if (state.activity === 'sniffing') return { color: 'green', message: 'Sniffing — tracking the current song.' };
    return { color: 'orange', message: state.error || 'Waiting for a song to start.' };
}

export function SnifferStatus() {
    const { engine, error, paused } = useGameplay();
    const state = useSyncExternalStore(engine?.subscribe || noSubscription, engine?.getSnapshot || noSnapshot);
    const status = snifferStatus(paused, error, state);

    return (
        <>
            <span className="sniffer-status-dot" data-color={status.color} aria-hidden="true" />
            <span id="sniffer-status-tooltip" className="sniffer-status-tooltip" role="tooltip">{status.message}</span>
        </>
    );
}
