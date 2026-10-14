import './dom';
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SessionProvider, useSession } from '../../src/ui/Session';
import { ScoresTable, type Score } from '../../src/ui/Leaderboard';
import { ColumnPicker, useSnifferColumns } from '../../src/ui/ScoreColumns';

window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
window.HTMLDialogElement.prototype.close = function () { this.open = false; };

const scores: Score[] = [{
    user_id: 1, username: 'Player', king: true, verified: true,
    last_played: '2026-10-14', play_count: 12, streak: 100, mastery: 0.95,
    score: 123456, badges: 3,
}];

function Preferences({ userId, mode }: { userId: number; mode: string }) {
    const columns = useSnifferColumns(userId);
    return (
        <>
            <ColumnPicker mode={mode} hidden={columns.hidden} onChange={columns.change} error={columns.error} />
            <ScoresTable scores={scores} mode={mode} hiddenColumns={columns.hidden} />
        </>
    );
}

function SignedIn({ mode, customizable }: { mode: string; customizable: boolean }) {
    const { state } = useSession();
    if (!state.auth) {
        return null;
    }
    return customizable
        ? <Preferences key={state.auth.user_id} userId={state.auth.user_id} mode={mode} />
        : <ScoresTable scores={scores} mode={mode} />;
}

// Use the real table and session provider while keeping every request synthetic.
function preview(userId = 1, mode = 'las', customizable = true) {
    window.api = {
        storeGet: async () => ({ user_id: userId, api_key: 'synthetic' }),
        getHost: async () => 'https://example.invalid',
        getVersion: async () => '1.12.0-beta1',
        requestBackend: async (url: string) => url.endsWith('authenticate.php')
            ? { success: true } : { activated: true },
    } as unknown as typeof window.api;
    return render(
        <SessionProvider><SignedIn mode={mode} customizable={customizable} /></SessionProvider>,
    );
}

afterEach(() => {
    cleanup();
    window.localStorage.clear();
    sessionStorage.clear();
});

test('hiding a column removes its header and cells, persists after remount, and can be reset', async () => {
    const view = preview();
    await screen.findByRole('columnheader', { name: 'Play Count' });
    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Play Count' }));
    assert.equal(screen.queryByRole('columnheader', { name: 'Play Count' }), null);
    assert.equal(screen.queryByRole('cell', { name: '12' }), null);
    assert.equal(screen.getAllByRole('columnheader').length, screen.getAllByRole('cell').length);
    assert.equal((screen.getByRole('checkbox', { name: 'Username' }) as HTMLInputElement).disabled, true);
    view.unmount();

    preview();
    await screen.findByRole('table');
    assert.equal(screen.queryByRole('columnheader', { name: 'Play Count' }), null);
    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show all' }));
    assert.ok(screen.getByRole('columnheader', { name: 'Play Count' }));
    assert.ok(screen.getByRole('cell', { name: '12' }));
});

test('preferences are account-specific and other leaderboard views keep all columns', async () => {
    window.localStorage.setItem('sniffer-hidden-columns:1', '["rank","lastPlayed","mastery"]');
    const first = preview();
    await screen.findByRole('table');
    assert.equal(screen.queryByRole('columnheader', { name: 'Mastery' }), null);
    first.unmount();

    const other = preview(2);
    await screen.findByRole('columnheader', { name: 'Mastery' });
    assert.equal(screen.getAllByRole('columnheader').length, 6);
    other.unmount();

    preview(1, 'las', false);
    await screen.findByRole('columnheader', { name: 'Mastery' });
    assert.equal(screen.getAllByRole('columnheader').length, 6);
});

test('Score Attack offers its own score column and preserves hidden Learn a Song choices', async () => {
    window.localStorage.setItem('sniffer-hidden-columns:1', '["mastery","streak"]');
    preview(1, 'sa');
    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('button', { name: 'Columns' }));
    assert.equal(screen.queryByRole('checkbox', { name: 'Mastery' }), null);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Score' }));
    assert.equal(screen.queryByRole('columnheader', { name: 'Score' }), null);
    assert.equal(screen.queryByRole('cell', { name: /123,456/ }), null);
    assert.deepEqual(JSON.parse(window.localStorage.getItem('sniffer-hidden-columns:1')!), ['streak', 'mastery', 'score']);
});

test('invalid saved preferences fall back safely and cannot hide usernames', async () => {
    window.localStorage.setItem('sniffer-hidden-columns:1', 'broken json');
    const first = preview();
    await screen.findByRole('table');
    assert.equal(screen.getAllByRole('columnheader').length, 6);
    first.unmount();

    window.localStorage.setItem('sniffer-hidden-columns:1', '["username","unknown","rank"]');
    preview();
    await waitFor(() => assert.ok(screen.getByRole('columnheader', { name: 'Username' })));
    assert.equal(screen.queryByRole('columnheader', { name: 'Rank' }), null);
    assert.equal(screen.getAllByRole('columnheader').length, 5);
});
