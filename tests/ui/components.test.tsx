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
import { DesktopUpdates, DesktopVersion } from '../../src/ui/DesktopUpdates';
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

test('ready updates require a choice, Later can reopen, and late snapshots cannot hide them', async () => {
    const initial = deferred<any>();
    const updates = stateSource(initial.promise);
    const connection = stateSource({ connected: true, message: '' });
    setApi({
        getVersion: async () => '1.12.0-beta1',
        getUpdateState: updates.get,
        onUpdateState: updates.subscribe,
        getConnectionState: connection.get,
        onConnectionState: connection.subscribe,
    });
    render(<StrictMode><DesktopStatus /><DesktopVersion /><DesktopUpdates /></StrictMode>);
    await waitFor(() => assert.ok(screen.getByText('v1.12.0-beta1')));
    assert.equal(screen.queryByRole('button'), null);

    connection.emit({ connected: false, message: 'Connection lost' });
    assert.ok(screen.getByRole('button', { name: 'Reload page' }));
    updates.emit({ status: 'ready', version: '1.12.0-beta2', message: 'Update ready.' });
    const dialog = screen.getByRole('alertdialog') as HTMLDialogElement;
    assert.equal(dialog.open, true);
    assert.equal(document.activeElement, screen.getByRole('button', { name: 'Restart later' }));
    assert.equal(fireEvent.keyDown(document.activeElement!, { key: 'Escape' }), false);
    assert.equal(fireEvent(dialog, new window.Event('cancel', { cancelable: true })), false);
    fireEvent.click(dialog);
    assert.equal(dialog.open, true);
    assert.equal(screen.queryByRole('button', { name: 'Close' }), null);
    await act(async () => initial.resolve({ status: 'disabled', message: '' }));
    assert.ok(screen.getByRole('button', { name: 'Restart now' }));

    fireEvent.click(screen.getByRole('button', { name: 'Restart later' }));
    assert.equal(sessionStorage.getItem('deferred-update'), '1.12.0-beta2');
    assert.equal(screen.queryByRole('alertdialog'), null);
    fireEvent.click(screen.getByRole('button', { name: 'Update ready' }));
    assert.ok(screen.getByRole('alertdialog'));
    fireEvent.click(screen.getByRole('button', { name: 'Restart later' }));

    // The same ready event stays dismissed; a different version asks again.
    updates.emit({ status: 'ready', version: '1.12.0-beta2', message: 'Update ready.' });
    assert.equal(screen.queryByRole('alertdialog'), null);
    updates.emit({ status: 'ready', version: '1.12.0-beta3', message: 'Update ready.' });
    assert.ok(screen.getByRole('alertdialog'));
});

test('header shows download progress and deferred updates while automatic checks stay quiet', async () => {
    const updates = stateSource<any>({ status: 'idle', message: 'Up to date.' });
    setApi({
        getVersion: async () => '1.12.0-beta2',
        getBetaNotice: async () => null,
        getUpdateState: updates.get,
        onUpdateState: updates.subscribe,
    });
    render(
        <MemoryRouter>
            <AppHeader><DesktopUpdates /></AppHeader>
            <Footer><DesktopVersion /></Footer>
        </MemoryRouter>,
    );
    await waitFor(() => assert.ok(screen.getByText('v1.12.0-beta2').closest('footer')));

    for (const status of ['checking', 'error', 'idle', 'disabled']) {
        updates.emit({ status, message: 'Background updater status' });
        assert.equal(screen.queryByRole('button'), null);
        assert.equal(screen.queryByRole('alertdialog'), null);
        assert.equal(screen.queryByText('Background updater status'), null);
    }

    // Show progress inside navigation without prompting or exposing a manual check.
    updates.emit({ status: 'downloading', percent: 49.7 });
    assert.ok(screen.getByRole('status').closest('nav'));
    assert.equal(screen.getByRole('status').textContent, 'Downloading 50%');
    assert.equal(screen.queryByRole('button'), null);
    assert.equal(screen.queryByRole('alertdialog'), null);

    updates.emit({ status: 'downloading' });
    assert.equal(screen.getByRole('status').textContent, 'Downloading…');

    updates.emit({ status: 'ready', version: '1.12.0-beta3', message: 'Update ready.' });
    fireEvent.click(screen.getByRole('button', { name: 'Restart later' }));
    const ready = screen.getByRole('button', { name: 'Update ready' });
    assert.ok(ready.closest('nav'));
    assert.equal(screen.queryByRole('status'), null);
    fireEvent.click(ready);
    assert.ok(screen.getByRole('alertdialog'));
});

test('header navigates inside React and updates the active link', async () => {
    setApi({ getBetaNotice: async () => 'Rock Buddy Beta: test changes will be discarded.' });
    render(
        <MemoryRouter initialEntries={['/search']}>
            <AppHeader />
        </MemoryRouter>,
    );
    await waitFor(() => assert.ok(screen.getByText('Beta')));
    assert.equal(screen.getByText('Beta').closest('nav')?.getAttribute('aria-label'), 'Main navigation');
    assert.equal(screen.getByText('Beta').getAttribute('aria-describedby'), 'beta-details');
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

test('restart stays guarded while pending and can recover from blocked or failed installation', async () => {
    const updates = stateSource<any>({ status: 'ready', version: '1.12.0-beta2', message: 'Update ready.' });
    const response = deferred<any>();
    let installs = 0;
    setApi({
        getVersion: async () => '1.12.0-beta1',
        getUpdateState: updates.get,
        onUpdateState: updates.subscribe,
        installDesktopUpdate: async () => { installs++; return response.promise; },
    });
    render(<DesktopUpdates />);
    await waitFor(() => assert.ok(screen.getByRole('alertdialog')));
    fireEvent.click(screen.getByRole('button', { name: 'Restart now' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restart now' }));
    assert.equal(installs, 1);
    assert.equal((screen.getByRole('button', { name: 'Restart later' }) as HTMLButtonElement).disabled, true);

    updates.emit({ status: 'ready', version: '1.12.0-beta2', message: 'Finish playing and wait for score uploads before restarting.' });
    await act(async () => response.resolve(updates.get()));
    assert.match(screen.getByRole('status').textContent || '', /Finish playing/);
    assert.equal((screen.getByRole('button', { name: 'Restart later' }) as HTMLButtonElement).disabled, false);

    window.api.installDesktopUpdate = async () => { throw new Error('IPC failed'); };
    fireEvent.click(screen.getByRole('button', { name: 'Restart now' }));
    await waitFor(() => assert.match(screen.getByRole('status').textContent || '', /Could not restart/));
    assert.ok(screen.getByRole('alertdialog'));
    fireEvent.click(screen.getByRole('button', { name: 'Restart later' }));
    assert.equal(screen.queryByRole('alertdialog'), null);
});
