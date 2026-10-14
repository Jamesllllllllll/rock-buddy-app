import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { request, errorMessage, type AuthData } from './api';
import { PageDataProvider } from './PageData';
import { SearchStateProvider } from './SearchState';

type SessionState =
    | { status: 'loading' | 'signed-out'; auth: null; error?: string }
    | { status: 'ready' | 'activation'; auth: AuthData; error?: string }
    | { status: 'error'; auth: null; error: string };

const signedOut: SessionState = { status: 'signed-out', auth: null };
const SessionContext = createContext<{
    state: SessionState;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
} | null>(null);

// Keep the bridge's per-user configuration in sync with the authenticated account.
function remember(auth: AuthData | null) {
    if (auth) {
        sessionStorage.setItem('auth_data', JSON.stringify(auth));
        sessionStorage.setItem('user_id', String(auth.user_id));
    } else {
        sessionStorage.removeItem('auth_data');
        sessionStorage.removeItem('user_id');
    }
}

async function validate(auth: AuthData): Promise<SessionState> {
    const result = await request('auth/authenticate', auth);
    if (!result.success) return signedOut;
    if (result.updated) await window.api.clearRocksnifferCache();

    const activation = await request('account/check_account_activation', auth);
    return { status: activation.activated ? 'ready' : 'activation', auth };
}

export function SessionProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<SessionState>({ status: 'loading', auth: null });

    async function refresh() {
        setState({ status: 'loading', auth: null });
        try {
            const auth = await window.api.storeGet('auth_data');
            const next = auth ? await validate(auth) : signedOut;
            remember(next.auth);
            setState(next);
        } catch (error) {
            setState({ status: 'error', auth: null, error: errorMessage(error) });
        }
    }

    // Defer startup so Strict Mode's discarded effect cannot start a second login.
    useEffect(() => {
        let active = true;
        void Promise.resolve().then(async () => {
            if (!active) return;
            try {
                const auth = await window.api.storeGet('auth_data');
                if (!active) return;
                const next = auth ? await validate(auth) : signedOut;
                if (active) {
                    remember(next.auth);
                    setState(next);
                }
            } catch (error) {
                if (active) setState({ status: 'error', auth: null, error: errorMessage(error) });
            }
        });

        const expire = () => {
            remember(null);
            setState({ ...signedOut, error: 'Please log back in to verify your identity.' });
        };
        window.addEventListener('session-expired', expire);
        return () => {
            active = false;
            window.removeEventListener('session-expired', expire);
        };
    }, []);

    async function login(username: string, password: string) {
        const auth = await request<AuthData>('auth/login', {
            username_or_email: username,
            password,
        });
        const next = await validate(auth);
        if (!next.auth) throw new Error('Unable to sign in. Please try again.');
        await window.api.storeSet('auth_data', auth);
        remember(auth);
        setState(next);
    }

    async function logout() {
        // Clear the renderer session first so an old gameplay request cannot keep submitting.
        remember(null);
        setState(signedOut);
        await window.api.storeDelete('auth_data');
    }

    return (
        <SessionContext value={{ state, login, logout, refresh }}>
            <PageDataProvider key={state.auth?.user_id ?? 'signed-out'}>
                <SearchStateProvider>{children}</SearchStateProvider>
            </PageDataProvider>
        </SessionContext>
    );
}

export function useSession() {
    const session = useContext(SessionContext);
    if (!session) throw new Error('SessionProvider is missing.');
    return session;
}

export function useAuth() {
    const { state } = useSession();
    if (!state.auth) throw new Error('This page requires a signed-in account.');
    return state.auth;
}
