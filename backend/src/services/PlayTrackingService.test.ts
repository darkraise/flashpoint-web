import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';
import { createTestDatabase, createTestUser } from '../test/helpers';
import { PlayTrackingService } from './PlayTrackingService';

// Mock dependencies
vi.mock('./UserDatabaseService', () => ({
  UserDatabaseService: {
    getDatabase: vi.fn(),
    get: vi.fn(),
    all: vi.fn(),
    run: vi.fn(),
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { UserDatabaseService } from './UserDatabaseService';

describe('PlayTrackingService', () => {
  let db: BetterSqlite3.Database;
  let playTrackingService: PlayTrackingService;
  let testUserId: number;

  beforeEach(() => {
    db = createTestDatabase();
    const testUser = createTestUser(db);
    testUserId = testUser.id;

    vi.mocked(UserDatabaseService.getDatabase).mockReturnValue(db);

    // Mock static methods to use test database
    vi.mocked(UserDatabaseService.all).mockImplementation((query, params) => {
      return db.prepare(query).all(...(params ?? []));
    });
    vi.mocked(UserDatabaseService.get).mockImplementation((query, params) => {
      return db.prepare(query).get(...(params ?? []));
    });
    vi.mocked(UserDatabaseService.run).mockImplementation((query, params) => {
      return db.prepare(query).run(...(params ?? []));
    });

    playTrackingService = new PlayTrackingService();
  });

  afterEach(() => {
    if (db.open) {
      db.close();
    }
    vi.clearAllMocks();
  });

  describe('startPlaySession', () => {
    it('should create a new play session', async () => {
      const sessionId = await playTrackingService.startPlaySession(testUserId, 'game-123', 'Test Game');

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
    });

    it('should generate unique session IDs', async () => {
      const sessionId1 = await playTrackingService.startPlaySession(testUserId, 'game-1', 'Game 1');
      const sessionId2 = await playTrackingService.startPlaySession(testUserId, 'game-2', 'Game 2');

      expect(sessionId1).not.toBe(sessionId2);
    });

    it('should store session in database', async () => {
      const sessionId = await playTrackingService.startPlaySession(testUserId, 'game-123', 'Test Game');

      const session = db
        .prepare('SELECT * FROM user_game_plays WHERE session_id = ?')
        .get(sessionId) as { user_id: number; game_id: string };

      expect(session).toBeDefined();
      expect(session.user_id).toBe(testUserId);
      expect(session.game_id).toBe('game-123');
    });
  });

  describe('endPlaySession', () => {
    it('should end an active session', async () => {
      const sessionId = await playTrackingService.startPlaySession(testUserId, 'game-123', 'Test Game');

      await playTrackingService.endPlaySession(sessionId);

      const session = db
        .prepare('SELECT ended_at FROM user_game_plays WHERE session_id = ?')
        .get(sessionId) as { ended_at: string | null };

      expect(session.ended_at).toBeDefined();
      expect(session.ended_at).not.toBeNull();
    });

    it('should calculate duration', async () => {
      const sessionId = await playTrackingService.startPlaySession(testUserId, 'game-123', 'Test Game');

      // Wait a small amount to ensure duration > 0
      await new Promise((resolve) => setTimeout(resolve, 50));

      await playTrackingService.endPlaySession(sessionId);

      const session = db
        .prepare('SELECT duration_seconds FROM user_game_plays WHERE session_id = ?')
        .get(sessionId) as { duration_seconds: number };

      expect(session.duration_seconds).toBeDefined();
      expect(session.duration_seconds).toBeGreaterThanOrEqual(0);
    });

    it('should not throw for non-existent session', async () => {
      await expect(playTrackingService.endPlaySession('non-existent')).resolves.not.toThrow();
    });

    it('should throw for other users session', async () => {
      const sessionId = await playTrackingService.startPlaySession(testUserId, 'game-123', 'Test Game');

      const otherUser = createTestUser(db, { username: 'other', email: 'other@test.com' });

      await expect(playTrackingService.endPlaySession(sessionId, otherUser.id)).rejects.toThrow(
        "Cannot end another user's play session"
      );
    });
  });

  describe('getUserStats', () => {
    it('should return default stats for user with no plays', async () => {
      const stats = await playTrackingService.getUserStats(testUserId);

      expect(stats).toBeDefined();
      expect(stats?.totalGamesPlayed).toBe(0);
      expect(stats?.totalPlaytimeSeconds).toBe(0);
      expect(stats?.totalSessions).toBe(0);
    });

    it('should return stats after play sessions', async () => {
      const sessionId = await playTrackingService.startPlaySession(testUserId, 'game-123', 'Test Game');
      await playTrackingService.endPlaySession(sessionId);

      const stats = await playTrackingService.getUserStats(testUserId);

      expect(stats?.totalSessions).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getUserGameStats', () => {
    it('should return empty array for user with no plays', async () => {
      const stats = await playTrackingService.getUserGameStats(testUserId);

      expect(stats).toEqual([]);
    });

    it('should return game stats after play', async () => {
      const sessionId = await playTrackingService.startPlaySession(testUserId, 'game-123', 'Test Game');
      await playTrackingService.endPlaySession(sessionId);

      const stats = await playTrackingService.getUserGameStats(testUserId);

      expect(stats.length).toBeGreaterThanOrEqual(1);
      expect(stats[0].gameId).toBe('game-123');
      expect(stats[0].gameTitle).toBe('Test Game');
    });

    it('should respect limit parameter', async () => {
      // Create multiple game sessions
      for (let i = 1; i <= 5; i++) {
        const sessionId = await playTrackingService.startPlaySession(testUserId, `game-${i}`, `Game ${i}`);
        await playTrackingService.endPlaySession(sessionId);
      }

      const stats = await playTrackingService.getUserGameStats(testUserId, 3);

      expect(stats.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getUserPlayHistory', () => {
    it('should return empty array for user with no plays', async () => {
      const history = await playTrackingService.getUserPlayHistory(testUserId);

      expect(history).toEqual([]);
    });

    it('should return completed sessions only', async () => {
      // Create one completed and one ongoing session
      const completedSessionId = await playTrackingService.startPlaySession(
        testUserId,
        'game-1',
        'Game 1'
      );
      await playTrackingService.endPlaySession(completedSessionId);

      await playTrackingService.startPlaySession(testUserId, 'game-2', 'Game 2');
      // Not ending this session

      const history = await playTrackingService.getUserPlayHistory(testUserId);

      expect(history.length).toBe(1);
      expect(history[0].gameId).toBe('game-1');
    });
  });

  describe('getTopGames', () => {
    it('should return empty array for user with no plays', async () => {
      const topGames = await playTrackingService.getTopGames(testUserId);

      expect(topGames).toEqual([]);
    });

    it('should return games ordered by playtime', async () => {
      // Play game 1 once
      const session1 = await playTrackingService.startPlaySession(testUserId, 'game-1', 'Game 1');
      await playTrackingService.endPlaySession(session1);

      // Play game 2 twice to accumulate more time
      const session2a = await playTrackingService.startPlaySession(testUserId, 'game-2', 'Game 2');
      await playTrackingService.endPlaySession(session2a);
      const session2b = await playTrackingService.startPlaySession(testUserId, 'game-2', 'Game 2');
      await playTrackingService.endPlaySession(session2b);

      const topGames = await playTrackingService.getTopGames(testUserId, 10);

      expect(topGames.length).toBe(2);
      // Game 2 should have more plays
      const game2 = topGames.find((g) => g.gameId === 'game-2');
      expect(game2?.totalPlays).toBe(2);
    });

    it('should respect limit parameter', async () => {
      for (let i = 1; i <= 5; i++) {
        const sessionId = await playTrackingService.startPlaySession(testUserId, `game-${i}`, `Game ${i}`);
        await playTrackingService.endPlaySession(sessionId);
      }

      const topGames = await playTrackingService.getTopGames(testUserId, 2);

      expect(topGames.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getPlayActivityOverTime', () => {
    it('should return empty array for user with no plays', async () => {
      const activity = await playTrackingService.getPlayActivityOverTime(testUserId);

      expect(activity).toEqual([]);
    });

    it('should return activity data with date, playtime, and sessions', async () => {
      const sessionId = await playTrackingService.startPlaySession(testUserId, 'game-123', 'Test Game');
      await playTrackingService.endPlaySession(sessionId);

      const activity = await playTrackingService.getPlayActivityOverTime(testUserId, 7);

      expect(activity.length).toBeGreaterThanOrEqual(1);
      expect(activity[0]).toHaveProperty('date');
      expect(activity[0]).toHaveProperty('playtime');
      expect(activity[0]).toHaveProperty('sessions');
    });
  });

  describe('getGamesDistribution', () => {
    it('should return empty array for user with no plays', async () => {
      const distribution = await playTrackingService.getGamesDistribution(testUserId);

      expect(distribution).toEqual([]);
    });

    it('should return distribution with name and value', async () => {
      const sessionId = await playTrackingService.startPlaySession(testUserId, 'game-123', 'Test Game');
      await playTrackingService.endPlaySession(sessionId);

      const distribution = await playTrackingService.getGamesDistribution(testUserId);

      expect(distribution.length).toBeGreaterThanOrEqual(1);
      expect(distribution[0]).toHaveProperty('name');
      expect(distribution[0]).toHaveProperty('value');
      expect(distribution[0].name).toBe('Test Game');
    });
  });

  describe('cleanupAbandonedSessions', () => {
    it('should not throw', async () => {
      await expect(playTrackingService.cleanupAbandonedSessions()).resolves.not.toThrow();
    });
  });
});
