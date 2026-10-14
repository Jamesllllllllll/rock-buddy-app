export interface AuthData {
    user_id: number;
    api_key: string;
    [key: string]: unknown;
}

export interface Score {
    user_id: number;
    username: string;
    king: boolean;
    verified?: boolean;
    last_played: string | null;
    play_count: number | null;
    streak: number;
    mastery: number;
    score: number;
    badges: number;
}

// Presentation fields shared by the game service and React views.
export interface SongInfo {
    songID: string;
    psarcFileHash: string;
    albumArt: string;
    artistName: string;
    songName: string;
    albumName: string;
    albumYear: number;
    songLength: number;
    toolkit: { version: string; author: string };
}

export interface LiveFeed {
    active: boolean;
    mode: number;
    songTimer: number;
    songLength: number;
    noteData: {
        TotalNotesHit: number;
        TotalNotes: number;
        Accuracy: number;
        CurrentHitStreak: number;
        HighestHitStreak: number;
    } | null;
}
