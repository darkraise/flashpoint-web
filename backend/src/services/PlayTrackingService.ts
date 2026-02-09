import { UserDatabaseService } from './UserDatabaseService';
import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';
import { AppError } from '../middleware/errorHandler';
import {
  PlaySessionRow,
  GameStatsRow,
  PlaytimeActivityRow,
  DistributionRow,
} from '../types/database-rows';

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

export class PlayTrackingService {
  async startPlaySession(userId: number, gameId: string, gameTitle: string): Promise<string> {
    try {
      const sessionId = randomUUID();

      UserDatabaseService.run(
        `INSERT INTO user_game_plays (user_id, game_id, game_title, session_id, started_at)
         VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`,
        [userId, gameId, gameTitle, sessionId]
      );

      logger.info(
        `Play session started: userId=${userId}, gameId=${gameId}, sessionId=${sessionId}`
      );
      return sessionId;
    } catch (error) {
      logger.error('Failed to start play session:', error);
      throw error;
    }
  }

  /**
   * End a play session
   * OPTIMIZED: Single query to get session data and calculate duration, then single UPDATE
   */
  async endPlaySession(sessionId: string, userId?: number): Promise<void> {
    try {
      // OPTIMIZATION: Get session and calculate duration in single query
      const session = UserDatabaseService.get(
        `SELECT
           user_id,
           game_id,
           game_title,
           CAST((julianday('now') - julianday(started_at)) * 86400 AS INTEGER) as duration_seconds
         FROM user_game_plays
         WHERE session_id = ? AND ended_at IS NULL`,
        [sessionId]
      );

      if (!session) {
        logger.warn(`Play session not found or already ended: ${sessionId}`);
        return;
      }

      // Verify session ownership if userId provided
      if (userId !== undefined && session.user_id !== userId) {
        throw new AppError(403, "Cannot end another user's play session");
      }

      const durationSeconds = session.duration_seconds || 0;

      // Use the duration value from the SELECT query to avoid race condition
      // (time passes between SELECT and UPDATE, causing inconsistent values)
      UserDatabaseService.run(
        `UPDATE user_game_plays
         SET ended_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
             duration_seconds = ?
         WHERE session_id = ?`,
        [durationSeconds, sessionId]
      );

      // Update aggregated stats
      await this.updateGameStats(
        session.user_id,
        session.game_id,
        session.game_title,
        durationSeconds
      );
      await this.updateUserStats(session.user_id, durationSeconds);

      // Update aggregate stats in Flashpoint database for compatibility with Launcher
      await this.updateFlashpointGameStats(session.game_id, durationSeconds);

      logger.info(`Play session ended: sessionId=${sessionId}, duration=${durationSeconds}s`);
    } catch (error) {
      logger.error('Failed to end play session:', error);
      throw error;
    }
  }

  /**
   * Update game-specific stats for a user
   * Uses UPSERT to avoid race conditions in concurrent requests
   */
  private async updateGameStats(
    userId: number,
    gameId: string,
    gameTitle: string,
    durationSeconds: number
  ): Promise<void> {
    try {
      UserDatabaseService.run(
        `INSERT INTO user_game_stats (user_id, game_id, game_title, total_plays, total_playtime_seconds, first_played_at, last_played_at)
         VALUES (?, ?, ?, 1, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
         ON CONFLICT(user_id, game_id) DO UPDATE SET
           total_plays = total_plays + 1,
           total_playtime_seconds = total_playtime_seconds + excluded.total_playtime_seconds,
           last_played_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
        [userId, gameId, gameTitle, durationSeconds]
      );
    } catch (error) {
      logger.error('Failed to update game stats:', error);
    }
  }

  /**
   * Update overall user stats
   * Uses UPSERT to avoid race conditions in concurrent requests
   */
  private async updateUserStats(userId: number, durationSeconds: number): Promise<void> {
    try {
      // Single query to get both aggregates (was 2 separate queries)
      const counts = UserDatabaseService.get(
        `SELECT
          (SELECT COUNT(DISTINCT game_id) FROM user_game_stats WHERE user_id = ?) as games_played,
          (SELECT COUNT(*) FROM user_game_plays WHERE user_id = ? AND ended_at IS NOT NULL) as total_sessions`,
        [userId, userId]
      ) as { games_played: number; total_sessions: number } | undefined;

      const gamesPlayed = counts?.games_played ?? 0;
      const totalSessions = counts?.total_sessions ?? 0;

      // UPSERT user stats
      UserDatabaseService.run(
        `INSERT INTO user_stats (user_id, total_games_played, total_playtime_seconds, total_sessions, first_play_at, last_play_at)
         VALUES (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
         ON CONFLICT(user_id) DO UPDATE SET
           total_games_played = excluded.total_games_played,
           total_playtime_seconds = total_playtime_seconds + ?,
           total_sessions = excluded.total_sessions,
           last_play_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
        [userId, gamesPlayed, durationSeconds, totalSessions, durationSeconds]
      );
    } catch (error) {
      logger.error('Failed to update user stats:', error);
    }
  }

  /**
   * Update aggregate play statistics in Flashpoint database
   *
   * NOTE: This is now a no-op. Play statistics are tracked in the user database
   * (user_game_plays, user_game_stats) which is the authoritative source.
   * The flashpoint.sqlite database is read-only and managed by Flashpoint Launcher.
   * Writing to it could cause conflicts and data corruption.
   *
   * @deprecated Play stats are tracked in user database only
   */
  private async updateFlashpointGameStats(gameId: string, _sessionDuration: number): Promise<void> {
    // No-op: Flashpoint database is read-only
    // Play statistics are tracked in the user database instead
    logger.debug(`[PlayTracking] Skipping Flashpoint DB update for game ${gameId} (read-only)`);
  }

  async getUserStats(userId: number): Promise<UserStats | null> {
    try {
      const stats = UserDatabaseService.get(
        `SELECT user_id, total_games_played, total_playtime_seconds, total_sessions, first_play_at, last_play_at
         FROM user_stats WHERE user_id = ?`,
        [userId]
      );

      if (!stats) {
        return {
          userId,
          totalGamesPlayed: 0,
          totalPlaytimeSeconds: 0,
          totalSessions: 0,
          firstPlayAt: null,
          lastPlayAt: null,
        };
      }

      return {
        userId: stats.user_id,
        totalGamesPlayed: stats.total_games_played,
        totalPlaytimeSeconds: stats.total_playtime_seconds,
        totalSessions: stats.total_sessions,
        firstPlayAt: stats.first_play_at,
        lastPlayAt: stats.last_play_at,
      };
    } catch (error) {
      logger.error('Failed to get user stats:', error);
      throw error;
    }
  }

  async getUserGameStats(userId: number, limit = 50, offset = 0): Promise<GameStats[]> {
    try {
      const stats = UserDatabaseService.all(
        `SELECT game_id, game_title, total_plays, total_playtime_seconds, first_played_at, last_played_at
         FROM user_game_stats
         WHERE user_id = ?
         ORDER BY last_played_at DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );

      return stats.map((stat: GameStatsRow) => ({
        gameId: stat.game_id,
        gameTitle: stat.game_title,
        totalPlays: stat.total_plays,
        totalPlaytimeSeconds: stat.total_playtime_seconds,
        firstPlayedAt: stat.first_played_at,
        lastPlayedAt: stat.last_played_at,
      }));
    } catch (error) {
      logger.error('Failed to get user game stats:', error);
      throw error;
    }
  }

  async getUserPlayHistory(userId: number, limit = 50, offset = 0): Promise<PlaySession[]> {
    try {
      const sessions = UserDatabaseService.all(
        `SELECT id, user_id, game_id, game_title, started_at, ended_at, duration_seconds, session_id
         FROM user_game_plays
         WHERE user_id = ?
         ORDER BY started_at DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );

      return sessions.map((session: PlaySessionRow) => ({
        id: session.id,
        userId: session.user_id,
        gameId: session.game_id,
        gameTitle: session.game_title,
        startedAt: session.started_at,
        endedAt: session.ended_at,
        durationSeconds: session.duration_seconds,
        sessionId: session.session_id,
      }));
    } catch (error) {
      logger.error('Failed to get user play history:', error);
      throw error;
    }
  }

  async getTopGames(userId: number, limit = 10): Promise<GameStats[]> {
    try {
      const stats = UserDatabaseService.all(
        `SELECT game_id, game_title, total_plays, total_playtime_seconds, first_played_at, last_played_at
         FROM user_game_stats
         WHERE user_id = ?
         ORDER BY total_playtime_seconds DESC
         LIMIT ?`,
        [userId, limit]
      );

      return stats.map((stat: GameStatsRow) => ({
        gameId: stat.game_id,
        gameTitle: stat.game_title,
        totalPlays: stat.total_plays,
        totalPlaytimeSeconds: stat.total_playtime_seconds,
        firstPlayedAt: stat.first_played_at,
        lastPlayedAt: stat.last_played_at,
      }));
    } catch (error) {
      logger.error('Failed to get top games:', error);
      throw error;
    }
  }

  async getPlayActivityOverTime(
    userId: number,
    days = 30
  ): Promise<Array<{ date: string; playtime: number; sessions: number }>> {
    try {
      // Validate and sanitize days parameter to prevent SQL injection
      // Ensure it's a positive integer between 1 and 365
      const safeDays = Math.min(Math.max(parseInt(String(days), 10) || 30, 1), 365);

      const data = UserDatabaseService.all(
        `SELECT
          DATE(started_at) as date,
          SUM(duration_seconds) as total_playtime,
          COUNT(*) as session_count
         FROM user_game_plays
         WHERE user_id = ?
         AND ended_at IS NOT NULL
         AND started_at >= datetime('now', '-' || ? || ' days')
         GROUP BY DATE(started_at)
         ORDER BY date ASC`,
        [userId, safeDays]
      );

      return data.map((row: PlaytimeActivityRow) => ({
        date: row.date,
        playtime: row.total_playtime || 0,
        sessions: row.session_count || 0,
      }));
    } catch (error) {
      logger.error('Failed to get play activity over time:', error);
      throw error;
    }
  }

  async getGamesDistribution(
    userId: number,
    limit = 10
  ): Promise<Array<{ name: string; value: number }>> {
    try {
      const stats = UserDatabaseService.all(
        `SELECT game_title, total_playtime_seconds
         FROM user_game_stats
         WHERE user_id = ?
         ORDER BY total_playtime_seconds DESC
         LIMIT ?`,
        [userId, limit]
      );

      return stats.map((stat: DistributionRow) => ({
        name: stat.game_title,
        value: stat.total_playtime_seconds,
      }));
    } catch (error) {
      logger.error('Failed to get games distribution:', error);
      throw error;
    }
  }

  /**
   * Clean up abandoned sessions (older than 24 hours without end time)
   */
  async cleanupAbandonedSessions(): Promise<void> {
    try {
      const abandoned = UserDatabaseService.all(
        `SELECT session_id, user_id, game_id, game_title, started_at
         FROM user_game_plays
         WHERE ended_at IS NULL
         AND datetime(started_at) < datetime('now', '-24 hours')`
      );

      for (const session of abandoned) {
        // Calculate actual duration from session start time, capped at 4 hours
        const startTime = new Date(session.started_at).getTime();
        const actualSeconds = Math.floor((Date.now() - startTime) / 1000);
        const maxDuration = 4 * 60 * 60; // 4 hours in seconds
        const duration = Math.min(actualSeconds, maxDuration);

        // End the session
        UserDatabaseService.run(
          `UPDATE user_game_plays
           SET ended_at = strftime('%Y-%m-%dT%H:%M:%fZ', started_at, '+4 hours'),
               duration_seconds = ?
           WHERE session_id = ?`,
          [duration, session.session_id]
        );

        // Update stats
        await this.updateGameStats(session.user_id, session.game_id, session.game_title, duration);
        await this.updateUserStats(session.user_id, duration);
        await this.updateFlashpointGameStats(session.game_id, duration);
      }

      if (abandoned.length > 0) {
        logger.info(`Cleaned up ${abandoned.length} abandoned play sessions`);
      }
    } catch (error) {
      logger.error('Failed to cleanup abandoned sessions:', error);
    }
  }
}
