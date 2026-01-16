export interface PlaySession {
  id: number;
  userId: number;
  gameId: string;
  gameTitle: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  sessionId: string;
}

export interface GameStats {
  gameId: string;
  gameTitle: string;
  totalPlays: number;
  totalPlaytimeSeconds: number;
  firstPlayedAt: string;
  lastPlayedAt: string;
}

export interface UserStats {
  userId: number;
  totalGamesPlayed: number;
  totalPlaytimeSeconds: number;
  totalSessions: number;
  firstPlayAt: string | null;
  lastPlayAt: string | null;
}

export interface StartSessionResponse {
  success: boolean;
  sessionId: string;
}

export interface EndSessionResponse {
  success: boolean;
  message: string;
}

export interface PlayActivityData {
  date: string;
  playtime: number;
  sessions: number;
}

export interface GameDistribution {
  name: string;
  value: number;
}
