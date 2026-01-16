import { UserDatabaseService } from './UserDatabaseService';
import { logger } from '../utils/logger';
import { randomBytes } from 'crypto';

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
  /**
   * Start a new play session
   */
  async startPlaySession(userId: number, gameId: string, gameTitle: string): Promise<string> {
    try {
      // Generate unique session ID
      const sessionId = randomBytes(16).toString('hex');

      // Insert play session
      UserDatabaseService.run(
        `INSERT INTO user_game_plays (user_id, game_id, game_title, session_id, started_at)
         VALUES (?, ?, ?, ?, datetime('now'))`,
        [userId, gameId, gameTitle, sessionId]
      );

      logger.info(`Play session started: userId=${userId}, gameId=${gameId}, sessionId=${sessionId}`);
      return sessionId;
    } catch (error) {
      logger.error('Failed to start play session:', error);
      throw error;
    }
  }

  /**
   * End a play session
   */
  async endPlaySession(sessionId: string): Promise<void> {
    try {
      // Get the session
      const session = UserDatabaseService.get(
        `SELECT * FROM user_game_plays WHERE session_id = ? AND ended_at IS NULL`,
        [sessionId]
      );

      if (!session) {
        logger.warn(`Play session not found or already ended: ${sessionId}`);
        return;
      }

      // Calculate duration
      const duration = UserDatabaseService.get(
        `SELECT CAST((julianday('now') - julianday(started_at)) * 86400 AS INTEGER) as duration
         FROM user_game_plays WHERE session_id = ?`,
        [sessionId]
      );

      const durationSeconds = duration?.duration || 0;

      // Update session
      UserDatabaseService.run(
        `UPDATE user_game_plays
         SET ended_at = datetime('now'), duration_seconds = ?
         WHERE session_id = ?`,
        [durationSeconds, sessionId]
      );

      // Update aggregated stats
      await this.updateGameStats(session.user_id, session.game_id, session.game_title, durationSeconds);
      await this.updateUserStats(session.user_id, durationSeconds);

      logger.info(`Play session ended: sessionId=${sessionId}, duration=${durationSeconds}s`);
    } catch (error) {
      logger.error('Failed to end play session:', error);
      throw error;
    }
  }

  /**
   * Update game-specific stats for a user
   */
  private async updateGameStats(
    userId: number,
    gameId: string,
    gameTitle: string,
    durationSeconds: number
  ): Promise<void> {
    try {
      // Check if stats exist
      const existing = UserDatabaseService.get(
        'SELECT * FROM user_game_stats WHERE user_id = ? AND game_id = ?',
        [userId, gameId]
      );

      if (existing) {
        // Update existing stats
        UserDatabaseService.run(
          `UPDATE user_game_stats
           SET total_plays = total_plays + 1,
               total_playtime_seconds = total_playtime_seconds + ?,
               last_played_at = datetime('now')
           WHERE user_id = ? AND game_id = ?`,
          [durationSeconds, userId, gameId]
        );
      } else {
        // Insert new stats
        UserDatabaseService.run(
          `INSERT INTO user_game_stats (user_id, game_id, game_title, total_plays, total_playtime_seconds, first_played_at, last_played_at)
           VALUES (?, ?, ?, 1, ?, datetime('now'), datetime('now'))`,
          [userId, gameId, gameTitle, durationSeconds]
        );
      }
    } catch (error) {
      logger.error('Failed to update game stats:', error);
    }
  }

  /**
   * Update overall user stats
   */
  private async updateUserStats(userId: number, durationSeconds: number): Promise<void> {
    try {
      // Check if stats exist
      const existing = UserDatabaseService.get(
        'SELECT * FROM user_stats WHERE user_id = ?',
        [userId]
      );

      // Count unique games played
      const gamesPlayed = UserDatabaseService.get(
        'SELECT COUNT(DISTINCT game_id) as count FROM user_game_stats WHERE user_id = ?',
        [userId]
      );

      // Count total sessions
      const totalSessions = UserDatabaseService.get(
        'SELECT COUNT(*) as count FROM user_game_plays WHERE user_id = ? AND ended_at IS NOT NULL',
        [userId]
      );

      if (existing) {
        // Update existing stats
        UserDatabaseService.run(
          `UPDATE user_stats
           SET total_games_played = ?,
               total_playtime_seconds = total_playtime_seconds + ?,
               total_sessions = ?,
               last_play_at = datetime('now'),
               updated_at = datetime('now')
           WHERE user_id = ?`,
          [gamesPlayed?.count || 0, durationSeconds, totalSessions?.count || 0, userId]
        );
      } else {
        // Insert new stats
        UserDatabaseService.run(
          `INSERT INTO user_stats (user_id, total_games_played, total_playtime_seconds, total_sessions, first_play_at, last_play_at)
           VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [userId, gamesPlayed?.count || 0, durationSeconds, totalSessions?.count || 0]
        );
      }
    } catch (error) {
      logger.error('Failed to update user stats:', error);
    }
  }

  /**
   * Get user's overall stats
   */
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
          lastPlayAt: null
        };
      }

      return {
        userId: stats.user_id,
        totalGamesPlayed: stats.total_games_played,
        totalPlaytimeSeconds: stats.total_playtime_seconds,
        totalSessions: stats.total_sessions,
        firstPlayAt: stats.first_play_at,
        lastPlayAt: stats.last_play_at
      };
    } catch (error) {
      logger.error('Failed to get user stats:', error);
      throw error;
    }
  }

  /**
   * Get user's game-specific stats
   */
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

      return stats.map((stat: any) => ({
        gameId: stat.game_id,
        gameTitle: stat.game_title,
        totalPlays: stat.total_plays,
        totalPlaytimeSeconds: stat.total_playtime_seconds,
        firstPlayedAt: stat.first_played_at,
        lastPlayedAt: stat.last_played_at
      }));
    } catch (error) {
      logger.error('Failed to get user game stats:', error);
      throw error;
    }
  }

  /**
   * Get user's recent play sessions
   */
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

      return sessions.map((session: any) => ({
        id: session.id,
        userId: session.user_id,
        gameId: session.game_id,
        gameTitle: session.game_title,
        startedAt: session.started_at,
        endedAt: session.ended_at,
        durationSeconds: session.duration_seconds,
        sessionId: session.session_id
      }));
    } catch (error) {
      logger.error('Failed to get user play history:', error);
      throw error;
    }
  }

  /**
   * Get top played games for a user
   */
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

      return stats.map((stat: any) => ({
        gameId: stat.game_id,
        gameTitle: stat.game_title,
        totalPlays: stat.total_plays,
        totalPlaytimeSeconds: stat.total_playtime_seconds,
        firstPlayedAt: stat.first_played_at,
        lastPlayedAt: stat.last_played_at
      }));
    } catch (error) {
      logger.error('Failed to get top games:', error);
      throw error;
    }
  }

  /**
   * Get play activity over time (daily aggregation)
   */
  async getPlayActivityOverTime(userId: number, days = 30): Promise<Array<{ date: string; playtime: number; sessions: number }>> {
    try {
      const data = UserDatabaseService.all(
        `SELECT
          DATE(started_at) as date,
          SUM(duration_seconds) as total_playtime,
          COUNT(*) as session_count
         FROM user_game_plays
         WHERE user_id = ?
         AND ended_at IS NOT NULL
         AND started_at >= datetime('now', '-${days} days')
         GROUP BY DATE(started_at)
         ORDER BY date ASC`,
        [userId]
      );

      return data.map((row: any) => ({
        date: row.date,
        playtime: row.total_playtime || 0,
        sessions: row.session_count || 0
      }));
    } catch (error) {
      logger.error('Failed to get play activity over time:', error);
      throw error;
    }
  }

  /**
   * Get games distribution by playtime
   */
  async getGamesDistribution(userId: number, limit = 10): Promise<Array<{ name: string; value: number }>> {
    try {
      const stats = UserDatabaseService.all(
        `SELECT game_title, total_playtime_seconds
         FROM user_game_stats
         WHERE user_id = ?
         ORDER BY total_playtime_seconds DESC
         LIMIT ?`,
        [userId, limit]
      );

      return stats.map((stat: any) => ({
        name: stat.game_title,
        value: stat.total_playtime_seconds
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
        // Calculate estimated duration (capped at 4 hours)
        const maxDuration = 4 * 60 * 60; // 4 hours in seconds
        const duration = Math.min(maxDuration, 86400); // 24 hours max

        // End the session
        UserDatabaseService.run(
          `UPDATE user_game_plays
           SET ended_at = datetime(started_at, '+4 hours'),
               duration_seconds = ?
           WHERE session_id = ?`,
          [duration, session.session_id]
        );

        // Update stats
        await this.updateGameStats(session.user_id, session.game_id, session.game_title, duration);
        await this.updateUserStats(session.user_id, duration);
      }

      if (abandoned.length > 0) {
        logger.info(`Cleaned up ${abandoned.length} abandoned play sessions`);
      }
    } catch (error) {
      logger.error('Failed to cleanup abandoned sessions:', error);
    }
  }
}
