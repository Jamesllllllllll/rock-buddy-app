import { useState } from 'react';
import { Modal } from './Modal';

const columns = [
    { id: 'rank', label: 'Rank' },
    { id: 'username', label: 'Username' },
    { id: 'lastPlayed', label: 'Last Played' },
    { id: 'playCount', label: 'Play Count' },
    { id: 'streak', label: 'Streak' },
    { id: 'mastery', label: 'Mastery' },
    { id: 'score', label: 'Score' },
] as const;

export type ScoreColumn = (typeof columns)[number]['id'];

// Each game mode keeps its own score fields while sharing the player columns.
export function scoreColumns(mode: string) {
    return columns.filter(({ id }) =>
        mode === 'las' ? id !== 'score' : id !== 'streak' && id !== 'mastery',
    );
}

// Ignore outdated or invalid preferences, and always leave the username visible.
function readHiddenColumns(key: string): ScoreColumn[] {
    try {
        const saved: unknown = JSON.parse(window.localStorage.getItem(key) ?? '[]');
        if (!Array.isArray(saved)) {
            return [];
        }
        return columns
            .filter(({ id }) => id !== 'username' && saved.includes(id))
            .map(({ id }) => id);
    } catch {
        return [];
    }
}

// SnifferView is keyed by account so a login change gets its own saved preferences.
export function useSnifferColumns(userId: number) {
    const key = `sniffer-hidden-columns:${userId}`;
    const [hidden, setHidden] = useState(() => readHiddenColumns(key));
    const [error, setError] = useState('');

    function change(next: ScoreColumn[]) {
        setHidden(next);
        setError('');
        try {
            window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
            setError("Couldn't save column choices for next time.");
        }
    }

    return { hidden, change, error };
}

export function ColumnPicker({ mode, hidden, onChange, error }: {
    mode: string;
    hidden: ScoreColumn[];
    onChange: (hidden: ScoreColumn[]) => void;
    error: string;
}) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button onClick={() => setOpen(true)} aria-haspopup="dialog">Columns</button>
            {open && (
                <Modal title="Columns" onClose={() => setOpen(false)}>
                    <div className="column-options">
                        {scoreColumns(mode).map(({ id, label }) => (
                            <label key={id}>
                                <input
                                    type="checkbox"
                                    checked={!hidden.includes(id)}
                                    disabled={id === 'username'}
                                    onChange={(event) => onChange(event.target.checked
                                        ? hidden.filter(column => column !== id)
                                        : [...hidden, id])}
                                />
                                {label}
                            </label>
                        ))}
                    </div>
                    {error && <p role="alert">{error}</p>}
                    <button onClick={() => onChange([])}>Show all</button>
                </Modal>
            )}
        </>
    );
}
