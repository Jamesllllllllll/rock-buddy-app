import { Component, useEffect, type ReactNode } from 'react';
import { Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { SessionProvider, useSession, useAuth } from './Session';
import { ThemeProvider } from './Theme';
import { AppHeader } from './AppHeader';
import { DesktopStatus } from './DesktopStatus';
import { DesktopUpdates } from './DesktopUpdates';
import { Footer } from './Footer';
import { PageLoadingIndicator } from './PageData';
import { BoulderBro } from './BoulderBro';
import { AuthPage } from '../auth/AuthPage';
import { AccountPage, ActivationPage } from '../account/AccountPage';
import { ChangeAccountPage } from '../account/ChangeAccountPage';
import { ConfigPage } from '../config/ConfigPage';
import { ProfilePage } from '../profile/ProfilePage';
import { RankPage } from '../rank/RankPage';
import { SearchPage } from '../search/SearchPage';
import { SnifferPage } from '../sniffer/SnifferPage';
import { GameplayProvider } from '../sniffer/Gameplay';
import { SupportPage } from '../support/SupportPage';
import { TeamPage } from '../team/TeamPage';

class ScreenBoundary extends Component<
    { children: ReactNode; route: string },
    { failed: boolean }
> {
    state = { failed: false };
    static getDerivedStateFromError() {
        return { failed: true };
    }
    componentDidUpdate(previous: { route: string }) {
        if (previous.route !== this.props.route && this.state.failed)
            this.setState({ failed: false });
    }
    componentDidCatch() {
        window.api.logMessage('A React screen failed to render.');
    }
    render() {
        if (this.state.failed)
            return (
                <main role="alert">
                    <p>This page could not be displayed.</p>
                    <button onClick={() => this.setState({ failed: false })}>Try again</button>
                </main>
            );
        return this.props.children;
    }
}

// Retain Always Sniff without polling for focus or reloading the document.
function AlwaysSniff() {
    const auth = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    useEffect(() => {
        if (!['/search', '/rank', '/profile'].includes(pathname)) return;
        let mounted = true;
        const onBlur = async () => {
            const enabled = await window.api.storeGet(`user_data.${auth.user_id}.always_sniff`);
            if (mounted && enabled) navigate('/sniffer');
        };
        window.addEventListener('blur', onBlur);
        return () => {
            mounted = false;
            window.removeEventListener('blur', onBlur);
        };
    }, [auth.user_id, navigate, pathname]);
    return null;
}

function ProtectedScreens() {
    const { state } = useSession();
    if (!state.auth) return <Navigate to="/login" replace />;
    if (state.status === 'activation') return <Navigate to="/activation" replace />;
    return <Outlet />;
}

function AccountAccess() {
    const { state } = useSession();
    return state.auth ? <Outlet /> : <Navigate to="/login" replace />;
}

function SessionRuntime({ children }: { children: ReactNode }) {
    const { state } = useSession();
    if (state.status !== 'ready' || !state.auth) return <>{children}</>;
    return (
        <GameplayProvider key={state.auth.user_id}>
            <AlwaysSniff />
            {children}
        </GameplayProvider>
    );
}

function SupportRoute() {
    const navigate = useNavigate();
    return <SupportPage onBack={() => navigate(-1)} />;
}

function Shell() {
    const { state, refresh, logout } = useSession();
    const location = useLocation();
    useEffect(() => {
        let mounted = true;
        void window.api.getVersion().then((version) => {
            if (mounted) document.title = `Rock Buddy v${version}`;
        });
        return () => {
            mounted = false;
        };
    }, []);

    const initial = state.status === 'loading' || state.status === 'error';
    return (
        <ThemeProvider>
            <PageLoadingIndicator />
            <DesktopStatus />
            <AppHeader compact={state.status !== 'ready'} />
            {initial ? (
                <main>
                    <p role={state.error ? 'alert' : 'status'}>{state.error || 'Loading...'}</p>
                    {state.error && (
                        <>
                            <button onClick={() => void refresh()}>Retry</button>
                            <button onClick={() => void logout()}>Log in again</button>
                        </>
                    )}
                </main>
            ) : (
                <SessionRuntime>
                    <ScreenBoundary route={location.pathname}>
                        <Routes>
                            <Route path="/login" element={<AuthPage key="login" />} />
                            <Route path="/signup" element={<AuthPage key="signup" signup />} />
                            <Route path="/support" element={<SupportRoute />} />
                            <Route path="/team" element={<TeamPage />} />
                            <Route element={<AccountAccess />}>
                                <Route
                                    path="/activation"
                                    element={
                                        state.status === 'ready' ? (
                                            <Navigate to="/sniffer" replace />
                                        ) : (
                                            <ActivationPage />
                                        )
                                    }
                                />
                                <Route
                                    path="/account/email"
                                    element={<ChangeAccountPage key="email" field="email" />}
                                />
                            </Route>
                            <Route element={<ProtectedScreens />}>
                                <Route path="/sniffer" element={<SnifferPage />} />
                                <Route path="/search" element={<SearchPage />} />
                                <Route path="/rank" element={<RankPage />} />
                                <Route path="/profile" element={<ProfilePage />} />
                                <Route path="/config" element={<ConfigPage />} />
                                <Route path="/account" element={<AccountPage />} />
                                <Route
                                    path="/account/username"
                                    element={<ChangeAccountPage key="username" field="username" />}
                                />
                                <Route
                                    path="/account/password"
                                    element={<ChangeAccountPage key="password" field="password" />}
                                />
                            </Route>
                            <Route
                                path="*"
                                element={
                                    <Navigate
                                        to={
                                            state.status === 'ready'
                                                ? '/sniffer'
                                                : state.status === 'activation'
                                                  ? '/activation'
                                                  : '/login'
                                        }
                                        replace
                                    />
                                }
                            />
                        </Routes>
                    </ScreenBoundary>
                </SessionRuntime>
            )}
            <Footer><DesktopUpdates /></Footer>
            <div className="team-link">
                <Link to="/team">Team</Link>
            </div>
            <BoulderBro />
        </ThemeProvider>
    );
}

export function App() {
    return (
        <SessionProvider>
            <Shell />
        </SessionProvider>
    );
}
