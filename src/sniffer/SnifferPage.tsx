import { useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { durationString } from '../common/functions';
import { Sniffer, VerificationState } from './sniffer';
import { useGameplay } from './Gameplay';
import { AsyncState } from '../ui/AsyncState';
import { ScoreFilters, ScoresTable } from '../ui/Leaderboard';
import { Modal } from '../ui/Modal';
import { useAuth } from '../ui/Session';
import { ColumnPicker, useSnifferColumns } from '../ui/ScoreColumns';

function SnifferView({ engine }: { engine: Sniffer }) {
    const auth = useAuth();
    const columns = useSnifferColumns(auth.user_id);
    const state = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
    const [popup, setPopup] = useState<'verification' | 'version'>();
    const song = state.song;
    const live = state.live;
    const notes = live?.noteData;
    const badge =
        state.verification === VerificationState.Verified
            ? 'verified'
            : state.verification === VerificationState.MaybeVerified
              ? 'maybe-verified'
              : 'unverified';

    return (
        <main>
            <div className="page-heading">
                <h1>Sniffer</h1>
                <span role="status">{state.status}</span>
            </div>
            {state.lurkMode && <p>Lurk mode is enabled. Scores will not be recorded.</p>}
            {state.error && <p role="status">{state.error}</p>}
            {song && (
                <>
                    <div className="song-info">
                        <img
                            className="coveralbum"
                            src={`data:image/jpeg;base64,${song.albumArt}`}
                            alt={`${song.albumName} cover`}
                        />
                        <div>
                            <h2>
                                {song.artistName} - {song.songName}
                            </h2>
                            <p>
                                {song.albumName} ({song.albumYear})
                            </p>
                            <p>
                                Version {song.toolkit.version} - {song.toolkit.author}
                            </p>
                        </div>
                        {state.newVersion && (
                            <button onClick={() => setPopup('version')}>New chart version</button>
                        )}
                    </div>
                    <div className="live-data">
                        <div className="live-heading">
                            <span
                                className="circle"
                                style={{ backgroundColor: live?.active ? 'green' : 'red' }}
                            />
                            <strong>Live Feed</strong>
                            {state.verification !== VerificationState.None && (
                                <button
                                    className="text-button"
                                    onClick={() => setPopup('verification')}
                                >
                                    <img
                                        className="verification-badge"
                                        src={`../images/verification-icons/${badge}.png`}
                                        alt={VerificationState[state.verification]}
                                    />
                                </button>
                            )}
                        </div>
                        {notes && (
                            <div className="live-values">
                                <span>
                                    Notes: {notes.TotalNotesHit} / {notes.TotalNotes}
                                </span>
                                <span>Accuracy: {Number(notes.Accuracy).toFixed(2)}%</span>
                                <span>Streak: {notes.CurrentHitStreak}</span>
                                <span>Highest Streak: {notes.HighestHitStreak}</span>
                                <span>
                                    {durationString(live.songTimer)} /{' '}
                                    {durationString(live.songLength)}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="score-toolbar">
                        <ScoreFilters
                            paths={state.paths}
                            path={state.path}
                            mode={state.mode}
                            difficulty={state.difficulty}
                            onChange={(field, value) => engine.select(field, value)}
                        />
                        <ColumnPicker
                            mode={state.mode}
                            hidden={columns.hidden}
                            onChange={columns.change}
                            error={columns.error}
                        />
                        <button
                            id="snort"
                            disabled={!state.canSnort}
                            onClick={() => engine.queueSnort()}
                        >
                            Snort
                        </button>
                    </div>
                    <div id="leaderboard_data">
                        {state.leaderboard.message && (
                            <p role="status">{state.leaderboard.message}</p>
                        )}
                        {state.leaderboard.scores && (
                            <ScoresTable
                                scores={state.leaderboard.scores}
                                mode={state.leaderboard.mode}
                                hiddenColumns={columns.hidden}
                            />
                        )}
                    </div>
                </>
            )}
            {popup && (
                <Modal
                    title={
                        popup === 'version'
                            ? 'New chart version'
                            : VerificationState[state.verification]
                    }
                    onClose={() => setPopup(undefined)}
                >
                    <p>
                        {popup === 'version'
                            ? 'A newer version of this chart has been played by another user.'
                            : state.verificationMessage}
                    </p>
                </Modal>
            )}
        </main>
    );
}

export function SnifferPage() {
    const auth = useAuth();
    const { engine, error, retry } = useGameplay();

    if (engine) return <SnifferView key={auth.user_id} engine={engine} />;

    return (
        <main>
            <h1>Sniffer</h1>
            <AsyncState loading={!error} error={error} retry={retry} />
            {error && (
                <p>
                    <Link to="/config">Config</Link>
                </p>
            )}
        </main>
    );
}
