const CONNECTION_MESSAGE = 'Rock Buddy cannot reach the server. Check your connection and try again.';

// Keep network failures consistent across pages without retrying account or score writes.
function createBackendClient(host, { fetchImpl = fetch, now = Date.now, onState = () => {} } = {}) {
    let retryAt = 0;
    let state = { connected: true, message: '' };
    let pending = 0;

    // Only report a connection change once, even when several pages request data together.
    function setConnected(connected) {
        state = { connected, message: connected ? '' : CONNECTION_MESSAGE };
        onState(state);
    }

    function unavailable() {
        return { error: CONNECTION_MESSAGE, connectionError: true, retryAfterMs: Math.max(0, retryAt - now()) };
    }

    // Only the selected backend can receive desktop credentials.
    async function post(url, data) {
        const destination = new URL(url);
        if (destination.origin !== host || !destination.pathname.startsWith('/api/') || destination.username || destination.password) {
            return { error: 'This request does not belong to the selected Rock Buddy server.' };
        }

        if (now() < retryAt) return unavailable();
        pending++;

        try {
            const response = await fetchImpl(destination.href, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                signal: AbortSignal.timeout(5000),
                redirect: 'error',
            });

            // HTML gateway errors and empty bodies must never reach JSON parsing in the UI.
            const text = await response.text();
            if (response.status >= 500 || response.status === 429) throw new Error('Server unavailable');
            let result;
            try { result = JSON.parse(text); } catch { throw new Error('Invalid server response'); }
            if (!result || typeof result !== 'object') throw new Error('Invalid server response');

            retryAt = 0;
            setConnected(true);
            if (!response.ok && !result.error) return { error: `The server rejected this request (${response.status}).` };
            return result;
        } catch {
            // A shared cooldown prevents the sniffer's 100 ms loop from flooding the server.
            retryAt = now() + 30000;
            setConnected(false);
            return unavailable();
        } finally {
            pending--;
        }
    }

    return { post, getState: () => state, isBusy: () => pending > 0 };
}

module.exports = { createBackendClient, CONNECTION_MESSAGE };
