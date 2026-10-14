import './dom';
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import {
    act,
    cleanup,
    fireEvent,
    render,
    renderHook,
    screen,
    waitFor,
} from '@testing-library/react';
import { App } from '../../src/ui/App';
import { useResource } from '../../src/ui/useResource';
import { PageDataProvider } from '../../src/ui/PageData';
import { usernameWaitMessage } from '../../src/ui/validation';
import { rankedScores, type Score } from '../../src/ui/Leaderboard';

Object.assign(globalThis, {
    localStorage: window.localStorage,
    HTMLInputElement: window.HTMLInputElement,
    HTMLTextAreaElement: window.HTMLTextAreaElement,
});

function mockApi() {
    const stored = new Map<string, any>([['auth_data', { user_id: 1, api_key: 'synthetic' }]]);
    const calls: string[] = [];
    const stats = { overall: 1, lead: 1, rhythm: 0, bass: 0 };
    window.api = {
        getBetaNotice: async () => null,
        getUpdateState: async () => ({ status: 'disabled', message: '' }),
        onUpdateState: () => () => {},
        getConnectionState: async () => ({ connected: true, message: '' }),
        onConnectionState: () => () => {},
        getVersion: async () => '1.12.0-beta1',
        getHost: async () => 'https://example.invalid',
        storeGet: async (key: string) => stored.get(key) ?? null,
        storeSet: async (key: string, value: unknown) => {
            stored.set(key, value);
        },
        storeDelete: async (key: string) => {
            stored.delete(key);
        },
        launchRocksniffer: () => {},
        prepareRocksmithImport: async () => {
            calls.push('prepare');
            return null;
        },
        logMessage: () => {},
        setGameplayActive: () => {},
        supportInfo: async () => ({ sandbox: true }),
        requestBackend: async (url: string) => {
            const endpoint = url.split('/').pop()!;
            calls.push(endpoint);
            if (endpoint === 'authenticate.php') return { success: true };
            if (endpoint === 'check_account_activation.php') return { activated: true };
            if (endpoint === 'get_account_info.php')
                return {
                    username: 'Fixture',
                    email: 'fixture@example.invalid',
                    username_change_wait_seconds: 60,
                };
            if (endpoint === 'get_user_profile_data.php')
                return { username: 'Fixture', twitch_username: null };
            if (endpoint === 'get_user_stats.php')
                return { verified_scores: stats, accuracy: stats, verified_perfect_scores: stats };
            return [];
        },
    } as unknown as typeof window.api;
    return { stored, calls };
}

afterEach(() => {
    cleanup();
    sessionStorage.clear();
    localStorage.clear();
});

test('one authenticated app survives navigation and logout without reinitializing gameplay', async () => {
    const { calls, stored } = mockApi();
    render(
        <StrictMode>
            <MemoryRouter initialEntries={['/sniffer']}>
                <App />
            </MemoryRouter>
        </StrictMode>,
    );
    await screen.findByText(/Choose your Steam folder/);
    assert.equal(calls.filter((call) => call === 'prepare').length, 1);
    assert.equal(calls.filter((call) => call === 'authenticate.php').length, 1);

    fireEvent.click(screen.getByRole('link', { name: 'Search' }));
    await screen.findByRole('textbox', { name: 'Search songs' });
    fireEvent.click(screen.getByRole('link', { name: 'Support' }));
    await screen.findByRole('button', { name: 'Continue to PayPal' });
    fireEvent.click(screen.getByRole('link', { name: 'Profile' }));
    await screen.findByRole('heading', { name: 'Verified 100% scores' });
    assert.equal(calls.filter((call) => call === 'prepare').length, 1);
    assert.equal(document.querySelectorAll('nav').length, 1);

    fireEvent.click(screen.getByRole('link', { name: 'Account' }));
    await screen.findByText('fixture@example.invalid');
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    await screen.findByRole('button', { name: 'Log In' });
    assert.equal(sessionStorage.getItem('auth_data'), null);
    assert.equal(stored.has('auth_data'), false);
});

test('account cooldown disables the React form while older responses remain usable', async () => {
    mockApi();
    render(
        <MemoryRouter initialEntries={['/account/username']}>
            <App />
        </MemoryRouter>,
    );
    await screen.findByText('You can change your username in 0 hours 1 minute.');
    assert.ok(
        screen.getByRole('button', { name: 'Change username' }).closest('fieldset')!.disabled,
    );
    for (const [seconds, text] of [
        [86401, '2 days'],
        [86400, '1 day'],
        [3660, '1 hour 1 minute'],
        [1, '0 hours 1 minute'],
    ] as const) {
        assert.equal(usernameWaitMessage(seconds), `You can change your username in ${text}.`);
    }
});

test('a late resource response cannot overwrite a new account or song selection', async () => {
    let finish!: (value: string) => void;
    const first = new Promise<string>((resolve) => {
        finish = resolve;
    });
    const view = renderHook(
        ({ id }) => useResource(id, () => (id === 'old' ? first : Promise.resolve('new data'))),
        { initialProps: { id: 'old' }, wrapper: PageDataProvider },
    );
    view.rerender({ id: 'new' });
    await waitFor(() => assert.equal(view.result.current.data, 'new data'));
    await act(async () => finish('stale data'));
    assert.equal(view.result.current.data, 'new data');
});

test('verified score ties preserve competition ranks and do not tie unverified history', () => {
    const rows = [
        { verified: true, mastery: 1, streak: 100 },
        { verified: true, mastery: 1, streak: 100 },
        { verified: false, mastery: 1, streak: 100 },
    ] as Score[];
    assert.deepEqual(
        rankedScores(rows, 'las').map((score) => score.rank),
        [1, 1, 3],
    );
    assert.deepEqual(
        rankedScores(
            [
                { score: 1000, badges: 5 },
                { score: 1000, badges: 5 },
                { score: 900, badges: 5 },
            ] as Score[],
            'sa',
        ).map((score) => score.rank),
        [1, 1, 3],
    );
});

test('login is an explicit single action and persists only a validated session', async () => {
    const { stored } = mockApi();
    stored.delete('auth_data');
    const original = window.api.requestBackend;
    const logins: unknown[] = [];
    window.api.requestBackend = async (url, body) => {
        if (url.endsWith('/login.php')) {
            logins.push(body);
            return { user_id: 1, api_key: 'new-synthetic-session' };
        }
        return original(url, body);
    };
    render(
        <StrictMode>
            <MemoryRouter initialEntries={['/login']}>
                <App />
            </MemoryRouter>
        </StrictMode>,
    );
    const username = await screen.findByRole('textbox', { name: 'Username or email' });
    assert.equal(logins.length, 0);
    fireEvent.change(username, { target: { value: 'Fixture' } });
    fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'Synthetic password1!' },
    });
    const form = username.closest('form')!;
    act(() => {
        fireEvent.submit(form);
        fireEvent.submit(form);
    });
    await screen.findByRole('heading', { name: 'Sniffer' });
    assert.equal(logins.length, 1);
    assert.deepEqual(logins[0], {
        username_or_email: 'Fixture',
        password: 'Synthetic password1!',
        version: '1.12.0-beta1',
    });
    assert.equal(stored.get('auth_data').api_key, 'new-synthetic-session');
});

test('older statistics responses hide the new count instead of inventing a zero', async () => {
    mockApi();
    const original = window.api.requestBackend;
    window.api.requestBackend = async (url, body) => {
        const response = await original(url, body);
        if (url.endsWith('/get_user_stats.php')) delete response.verified_perfect_scores;
        return response;
    };
    render(
        <MemoryRouter initialEntries={['/profile']}>
            <App />
        </MemoryRouter>,
    );
    await screen.findByRole('heading', { name: 'Accuracy' });
    assert.equal(screen.queryByRole('heading', { name: 'Verified 100% scores' }), null);
});
