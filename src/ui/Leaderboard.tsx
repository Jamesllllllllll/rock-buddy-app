import { useState } from 'react';
import { approxEqual } from '../common/functions';
import { request } from './api';
import { useAuth } from './Session';
import { useResource } from './useResource';
import { AsyncState } from './AsyncState';
import { ProfileDialog } from '../profile/ProfilePage';
import { scoreColumns, type ScoreColumn } from './ScoreColumns';

import type { Score } from '../common/types';
export type { Score } from '../common/types';

// Preserve ties and the backend's verified-first ordering.
export function rankedScores(scores: Score[], mode: string) {
    let rank = 0;
    return scores.map((score, index) => {
        const previous = scores[index - 1];
        const tied =
            previous &&
            (mode === 'las'
                ? score.verified === previous.verified &&
                  approxEqual(score.mastery, previous.mastery) &&
                  approxEqual(score.streak, previous.streak)
                : approxEqual(score.badges, previous.badges) &&
                  approxEqual(score.score, previous.score));
        if (!tied) rank = index + 1;
        return { ...score, rank };
    });
}

export function ScoresTable({ scores, mode, hiddenColumns = [] }: {
    scores: Score[];
    mode: string;
    hiddenColumns?: ScoreColumn[];
}) {
    const auth = useAuth();
    const [player, setPlayer] = useState<string>();
    if (!scores.length)
        return (
            <p>
                And this is where I would put my scores... <em>IF I HAD ONE!</em>
            </p>
        );

    return (
        <>
            <table className="leaderboard-data">
                <thead>
                    <tr>
                        {scoreColumns(mode)
                            .filter(({ id }) => id === 'username' || !hiddenColumns.includes(id))
                            .map(({ id, label }) => <th key={id}>{label}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {rankedScores(scores, mode).map((score) => (
                        <tr
                            key={score.user_id}
                            className={score.user_id === auth.user_id ? 'current-user' : undefined}
                        >
                            {!hiddenColumns.includes('rank') && <td>{score.rank}</td>}
                            <td>
                                {Boolean(score.king) && (
                                    <img
                                        className="score-badge"
                                        src="../images/crown.png"
                                        alt="King"
                                    />
                                )}
                                <button
                                    className="text-button"
                                    onClick={() => setPlayer(score.username)}
                                >
                                    {score.username}
                                </button>
                            </td>
                            {!hiddenColumns.includes('lastPlayed') && (
                                <td>{score.last_played ?? 'Unknown'}</td>
                            )}
                            {!hiddenColumns.includes('playCount') && (
                                <td>{score.play_count ?? 'Unknown'}</td>
                            )}
                            {mode === 'las' ? (
                                <>
                                    {!hiddenColumns.includes('streak') && <td>{score.streak}</td>}
                                    {!hiddenColumns.includes('mastery') && (
                                        <td>
                                            {Boolean(score.verified) && (
                                                <img
                                                    className="score-badge"
                                                    src="../images/verification-icons/verified-badge.png"
                                                    alt="Verified"
                                                />
                                            )}
                                            {(score.mastery * 100).toFixed(2)}%
                                        </td>
                                    )}
                                </>
                            ) : (
                                !hiddenColumns.includes('score') && (
                                    <td>
                                        <img
                                            className="score-badge"
                                            src={`../images/badge-icons/badge-${score.badges}.png`}
                                            alt={`Badge ${score.badges}`}
                                        />
                                        {score.score.toLocaleString('en-US')}
                                    </td>
                                )
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
            {player && <ProfileDialog username={player} onClose={() => setPlayer(undefined)} />}
        </>
    );
}

export function Leaderboard({
    song,
    hash,
    path,
    mode,
    difficulty,
}: {
    song: string;
    hash: string;
    path: string;
    mode: string;
    difficulty: string;
}) {
    const auth = useAuth();
    const scores = useResource(
        `scores:${JSON.stringify([auth.user_id, song, hash, path, mode, difficulty])}`,
        () =>
            request<Score[]>(`data/get_scores_${mode}`, {
                auth_data: auth,
                song_key: song,
                psarc_hash: hash,
                arrangement: path,
                ...(mode === 'sa' ? { difficulty } : {}),
            }),
    );
    return (
        <>
            <AsyncState {...scores} retry={scores.reload} />
            {scores.data && <ScoresTable scores={scores.data} mode={mode} />}
        </>
    );
}

export function ScoreFilters({
    paths,
    path,
    mode,
    difficulty,
    onChange,
}: {
    paths: string[];
    path: string;
    mode: string;
    difficulty: string;
    onChange: (field: 'path' | 'mode' | 'difficulty', value: string) => void;
}) {
    return (
        <div className="score-filters">
            <select
                aria-label="Game mode"
                value={mode}
                onChange={(event) => onChange('mode', event.target.value)}
            >
                <option value="las">Learn a Song</option>
                <option value="sa">Score Attack</option>
            </select>
            <select
                aria-label="Arrangement"
                value={path}
                onChange={(event) => onChange('path', event.target.value)}
            >
                {paths.map((name) => (
                    <option value={name.toLowerCase()} key={name}>
                        {name}
                    </option>
                ))}
            </select>
            {mode === 'sa' && (
                <select
                    aria-label="Difficulty"
                    value={difficulty}
                    onChange={(event) => onChange('difficulty', event.target.value)}
                >
                    <option value="hard">Hard</option>
                    <option value="master">Master</option>
                </select>
            )}
        </div>
    );
}
