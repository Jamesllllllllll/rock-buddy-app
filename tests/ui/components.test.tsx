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
import { AppHeader } from '../../src/ui/AppHeader';
import { DesktopStatus } from '../../src/ui/DesktopStatus';
import { SupportPage } from '../../src/support/SupportPage';
import { Footer } from '../../src/ui/Footer';
import { useDesktopState } from '../../src/ui/useDesktopState';

// Hold a response until the test chooses to resolve or reject it.
function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<T>((done, fail) => {
        resolve = done;
        reject = fail;
    });
    return { promise, resolve, reject };
}

// Model main-process events separately from the initial snapshot.
function stateSource<T>(initial: T | Promise<T>) {
    const listeners = new Set<(value: T) => void>();
    return {
        get: () => Promise.resolve(initial),
        subscribe: (listener: (value: T) => void) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        emit: (state: T) =>
            act(() => {
                listeners.forEach((listener) => listener(state));
            }),
        listeners,
    };
}

function setApi(api: Record<string, unknown>) {
    window.api = api as typeof window.api;
}

afterEach(() => {
    cleanup();
    sessionStorage.clear();
});

test('Strict Mode keeps one subscription and ignores late snapshots and unmounted work', async () => {
    const initial = deferred<string>();
    const source = stateSource(initial.promise);
    const view = renderHook(() => useDesktopState(source.get, source.subscribe), {
        wrapper: StrictMode,
    });
    assert.equal(view.result.current, null);
    assert.equal(source.listeners.size, 1);

    source.emit('new event');
    await act(async () => initial.resolve('old snapshot'));
    assert.equal(view.result.current, 'new event');

    view.unmount();
    assert.equal(source.listeners.size, 0);
    source.emit('after unmount');
});

test('status components render nothing while loading and recover independently', async () => {
    const initial = deferred<any>();
    const updates = stateSource(initial.promise);
    const connection = stateSource({ connected: true, message: '' });
    setApi({
        getBetaNotice: async () => null,
        getUpdateState: updates.get,
        onUpdateState: updates.subscribe,
        getConnectionState: connection.get,
        onConnectionState: connection.subscribe,
    });
    render(
        <StrictMode>
            <DesktopStatus />
        </StrictMode>,
    );
    await act(async () => {});
    assert.equal(screen.queryByRole('button'), null);

    connection.emit({ connected: false, message: 'Connection lost' });
    assert.ok(screen.getByRole('button', { name: 'Reload page' }));
    updates.emit({ status: 'ready', version: '1.12.0', message: 'Update ready.' });
    assert.ok(screen.getByRole('button', { name: 'Install and restart' }));
    await act(async () => initial.resolve({ status: 'disabled', message: '' }));
    assert.ok(screen.getByRole('button', { name: 'Install and restart' }));

    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    assert.equal(sessionStorage.getItem('deferred-update'), '1.12.0');
    connection.emit({ connected: true, message: '' });
    assert.equal(screen.queryByRole('button'), null);
});

test('background checks stay quiet while Config offers a manual check', async () => {
    const updates = stateSource<any>({ status: 'idle', message: 'Up to date.' });
    const connection = stateSource({ connected: true, message: '' });
    let checks = 0;
    setApi({
        getBetaNotice: async () => null,
        getUpdateState: updates.get,
        onUpdateState: updates.subscribe,
        getConnectionState: connection.get,
        onConnectionState: connection.subscribe,
        checkDesktopUpdate: async () => {
            checks++;
        },
    });
    const view = render(<DesktopStatus />);
    await act(async () => {});
    assert.equal(screen.queryByRole('button'), null);
    updates.emit({ status: 'checking', message: 'Checking…' });
    assert.equal(screen.queryByRole('button'), null);
    updates.emit({ status: 'idle', message: 'Up to date.' });

    view.rerender(<DesktopStatus allowManualCheck />);
    fireEvent.click(screen.getByRole('button', { name: 'Check for updates' }));
    await waitFor(() => assert.equal(checks, 1));
});

test('header navigates inside React and updates the active link', async () => {
    render(
        <MemoryRouter initialEntries={['/search']}>
            <AppHeader />
        </MemoryRouter>,
    );
    assert.equal(screen.getByRole('link', { name: 'Search' }).getAttribute('aria-current'), 'page');
    fireEvent.click(screen.getByRole('link', { name: 'Support' }));
    await waitFor(() =>
        assert.equal(
            screen.getByRole('link', { name: 'Support' }).getAttribute('aria-current'),
            'page',
        ),
    );
    assert.equal(screen.getByRole('link', { name: 'Search' }).getAttribute('aria-current'), null);
});

test('support derives validation from the amount and does not create checkout in an effect', async () => {
    let checkouts = 0;
    setApi({
        supportInfo: async () => ({ sandbox: true }),
        startSupportCheckout: async () => {
            checkouts++;
        },
    });
    render(
        <StrictMode>
            <SupportPage onBack={() => {}} />
        </StrictMode>,
    );
    const button = screen.getByRole('button', { name: 'Continue to PayPal' }) as HTMLButtonElement;
    assert.equal(button.disabled, true);
    await waitFor(() => assert.equal(button.disabled, false));
    assert.equal(checkouts, 0);

    const amount = screen.getByRole('spinbutton', { name: 'Amount (USD)' });
    for (const invalid of ['4.99', '', '-5', '5.001', '1000000', '1e2']) {
        fireEvent.change(amount, { target: { value: invalid } });
        assert.equal(button.disabled, true, invalid);
    }
    fireEvent.change(amount, { target: { value: '5.00' } });
    assert.equal(button.disabled, false);
});

test('checkout prevents duplicate submissions and requires explicit approval-open confirmation', async () => {
    const response = deferred<any>();
    const inputs: unknown[] = [];
    setApi({
        supportInfo: async () => ({ sandbox: true }),
        startSupportCheckout: async (input: unknown) => {
            inputs.push(input);
            return response.promise;
        },
    });
    render(<SupportPage onBack={() => {}} />);
    const button = screen.getByRole('button', { name: 'Continue to PayPal' }) as HTMLButtonElement;
    await waitFor(() => assert.equal(button.disabled, false));
    fireEvent.click(screen.getByRole('radio', { name: 'Monthly' }));
    const form = button.closest('form')!;
    act(() => {
        fireEvent.submit(form);
        fireEvent.submit(form);
    });
    assert.deepEqual(inputs, [{ amount: '5', kind: 'monthly' }]);
    assert.equal(button.disabled, true);

    await act(async () => response.resolve({}));
    assert.match(screen.getByRole('status').textContent || '', /Could not open PayPal/);
    assert.doesNotMatch(screen.getByRole('status').textContent || '', /Finish reviewing/);
    assert.equal(button.disabled, false);
});

test('successful browser opening asks for approval without claiming a completed payment', async () => {
    setApi({
        supportInfo: async () => ({ sandbox: false }),
        startSupportCheckout: async () => ({ opened: true }),
    });
    render(<SupportPage onBack={() => {}} />);
    const button = screen.getByRole('button', { name: 'Continue to PayPal' }) as HTMLButtonElement;
    await waitFor(() => assert.equal(button.disabled, false));
    assert.equal(screen.queryByText(/PayPal sandbox/), null);
    fireEvent.click(button);
    await waitFor(() =>
        assert.equal(
            screen.getByRole('status').textContent,
            'Finish reviewing your payment in PayPal.',
        ),
    );
});

test('unavailable support stays disabled and reports the error', async () => {
    setApi({
        supportInfo: async () => {
            throw new Error('Unavailable');
        },
    });
    render(<SupportPage onBack={() => {}} />);
    await waitFor(() =>
        assert.match(screen.getByRole('status').textContent || '', /Support is unavailable/),
    );
    assert.equal(
        (screen.getByRole('button', { name: 'Continue to PayPal' }) as HTMLButtonElement).disabled,
        true,
    );
});

test('the footer shows the current year and cleans up its refresh timer in Strict Mode', () => {
    const originalSet = window.setInterval;
    const originalClear = window.clearInterval;
    const timers = new Set<number>();
    let next = 0;
    window.setInterval = (() => {
        timers.add(++next);
        return next;
    }) as unknown as typeof window.setInterval;
    window.clearInterval = (id) => {
        if (typeof id === 'number') timers.delete(id);
    };
    try {
        const view = render(
            <StrictMode>
                <Footer />
            </StrictMode>,
        );
        assert.ok(screen.getByText(`Copyright © ${new Date().getFullYear()} TNTMusicStudios`));
        assert.equal(timers.size, 1);
        view.unmount();
        assert.equal(timers.size, 0);
    } finally {
        window.setInterval = originalSet;
        window.clearInterval = originalClear;
    }
});

test('a recovered updater replaces an earlier manual-action error', async () => {
    const updates = stateSource<any>({ status: 'idle', message: '' });
    const connection = stateSource({ connected: true, message: '' });
    setApi({
        getBetaNotice: async () => null,
        getUpdateState: updates.get,
        onUpdateState: updates.subscribe,
        getConnectionState: connection.get,
        onConnectionState: connection.subscribe,
        checkDesktopUpdate: async () => {
            throw new Error('IPC failed');
        },
    });
    render(<DesktopStatus allowManualCheck />);
    await waitFor(() => assert.ok(screen.getByRole('button', { name: 'Check for updates' })));
    fireEvent.click(screen.getByRole('button', { name: 'Check for updates' }));
    await waitFor(() =>
        assert.match(screen.getByRole('status').textContent || '', /Could not check/),
    );
    updates.emit({ status: 'downloading', message: 'Downloading update…', percent: 50 });
    assert.equal(screen.getByRole('status').textContent, 'Downloading update… 50%');
});
