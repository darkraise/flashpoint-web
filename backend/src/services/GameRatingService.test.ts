import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { createTestDatabase, createTestUser } from '../test/helpers';
import { GameRatingService } from './GameRatingService';

// Mock dependencies
vi.mock('./UserDatabaseService', () => ({
  UserDatabaseService: {
    getDatabase: vi.fn(),
    get: vi.fn(),
    exec: vi.fn(),
    run: vi.fn(),
  },
}));

vi.mock('./GameService', () => ({
  GameService: vi.fn().mockImplementation(() => ({
    getGamesByIds: vi.fn().mockResolvedValue([
      { id: 'game-1', title: 'Test Game 1' },
      { id: 'game-2', title: 'Test Game 2' },
      { id: 'game-3', title: 'Test Game 3' },
    ]),
  })),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { UserDatabaseService } from './UserDatabaseService';

function applyRatingsMigration(db: BetterSqlite3.Database): void {
  const migrationPath = path.join(__dirname, '../migrations/002_game_ratings.sql');
  if (fs.existsSync(migrationPath)) {
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    db.exec(sql);
  }
}

/**
 * Wire up the mocked UserDatabaseService to delegate to the in-memory DB.
 */
function wireMocksToDb(db: BetterSqlite3.Database): void {
  vi.mocked(UserDatabaseService.getDatabase).mockReturnValue(db);

  vi.mocked(UserDatabaseService.get).mockImplementation(
    <T>(sql: string, params: unknown[] = []): T | undefined => {
      return db.prepare(sql).get(...params) as T | undefined;
    }
  );

  vi.mocked(UserDatabaseService.exec).mockImplementation(
    <T>(sql: string, params: unknown[] = []): T[] => {
      return db.prepare(sql).all(...params) as T[];
    }
  );

  vi.mocked(UserDatabaseService.run).mockImplementation(
    (sql: string, params: unknown[] = []): BetterSqlite3.RunResult => {
      return db.prepare(sql).run(...params);
    }
  );
}

describe('GameRatingService', () => {
  let db: BetterSqlite3.Database;
  let service: GameRatingService;
  let testUserId: number;

  beforeEach(() => {
    db = createTestDatabase();
    applyRatingsMigration(db);
    const testUser = createTestUser(db);
    testUserId = testUser.id;

    wireMocksToDb(db);
    service = new GameRatingService();
  });

  afterEach(() => {
    if (db.open) {
      db.close();
    }
    vi.clearAllMocks();
  });

  describe('upsertRating', () => {
    it('should create a new rating', () => {
      const result = service.upsertRating(testUserId, 'game-1', 4);

      expect(result.created).toBe(true);
      expect(result.rating.gameId).toBe('game-1');
      expect(result.rating.rating).toBe(4);
      expect(result.rating.userId).toBe(testUserId);
      expect(result.rating.id).toBeGreaterThan(0);
    });

    it('should update an existing rating', () => {
      service.upsertRating(testUserId, 'game-1', 3);
      const result = service.upsertRating(testUserId, 'game-1', 5);

      expect(result.created).toBe(false);
      expect(result.rating.rating).toBe(5);
      expect(result.rating.gameId).toBe('game-1');
    });

    it('should preserve id on update', () => {
      const first = service.upsertRating(testUserId, 'game-1', 3);
      const second = service.upsertRating(testUserId, 'game-1', 5);

      expect(second.rating.id).toBe(first.rating.id);
    });

    it('should trim game ID', () => {
      const result = service.upsertRating(testUserId, '  game-1  ', 4);

      expect(result.rating.gameId).toBe('game-1');
    });

    it('should throw for empty game ID', () => {
      expect(() => service.upsertRating(testUserId, '', 4)).toThrow('Game ID must not be empty');
    });

    it('should throw for whitespace-only game ID', () => {
      expect(() => service.upsertRating(testUserId, '   ', 4)).toThrow('Game ID must not be empty');
    });

    it('should throw for rating below 1', () => {
      expect(() => service.upsertRating(testUserId, 'game-1', 0)).toThrow(
        'Rating must be an integer between 1 and 5'
      );
    });

    it('should throw for rating above 5', () => {
      expect(() => service.upsertRating(testUserId, 'game-1', 6)).toThrow(
        'Rating must be an integer between 1 and 5'
      );
    });

    it('should throw for non-integer rating', () => {
      expect(() => service.upsertRating(testUserId, 'game-1', 3.5)).toThrow(
        'Rating must be an integer between 1 and 5'
      );
    });

    it('should allow different users to rate the same game', () => {
      const otherUser = createTestUser(db, { username: 'other', email: 'other@test.com' });

      const result1 = service.upsertRating(testUserId, 'game-1', 4);
      const result2 = service.upsertRating(otherUser.id, 'game-1', 2);

      expect(result1.created).toBe(true);
      expect(result2.created).toBe(true);
      expect(result1.rating.id).not.toBe(result2.rating.id);
    });
  });

  describe('getUserRating', () => {
    it('should return null for non-existent rating', () => {
      const result = service.getUserRating(testUserId, 'game-999');
      expect(result).toBeNull();
    });

    it('should return the rating for a valid user+game pair', () => {
      service.upsertRating(testUserId, 'game-1', 4);

      const result = service.getUserRating(testUserId, 'game-1');
      expect(result).not.toBeNull();
      expect(result?.rating).toBe(4);
      expect(result?.gameId).toBe('game-1');
    });

    it("should not return another user's rating", () => {
      const otherUser = createTestUser(db, { username: 'other', email: 'other@test.com' });
      service.upsertRating(otherUser.id, 'game-1', 5);

      const result = service.getUserRating(testUserId, 'game-1');
      expect(result).toBeNull();
    });
  });

  describe('getUserRatings', () => {
    it('should return empty array for user with no ratings', () => {
      const result = service.getUserRatings(testUserId, 1, 20, 'updatedAt', 'desc');

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return paginated ratings', () => {
      service.upsertRating(testUserId, 'game-1', 3);
      service.upsertRating(testUserId, 'game-2', 5);
      service.upsertRating(testUserId, 'game-3', 1);

      const result = service.getUserRatings(testUserId, 1, 2, 'updatedAt', 'desc');

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(3);
    });

    it('should respect page offset', () => {
      service.upsertRating(testUserId, 'game-1', 3);
      service.upsertRating(testUserId, 'game-2', 5);
      service.upsertRating(testUserId, 'game-3', 1);

      const result = service.getUserRatings(testUserId, 2, 2, 'updatedAt', 'desc');

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(3);
    });

    it('should sort by rating', () => {
      service.upsertRating(testUserId, 'game-1', 3);
      service.upsertRating(testUserId, 'game-2', 5);
      service.upsertRating(testUserId, 'game-3', 1);

      const result = service.getUserRatings(testUserId, 1, 10, 'rating', 'desc');

      expect(result.data[0].rating).toBe(5);
      expect(result.data[2].rating).toBe(1);
    });

    it('should cap limit at 100', () => {
      service.upsertRating(testUserId, 'game-1', 3);

      const result = service.getUserRatings(testUserId, 1, 500, 'updatedAt', 'desc');

      // Should not throw — limit is capped internally
      expect(result.data).toHaveLength(1);
    });

    it('should fall back to updatedAt for unknown sort column', () => {
      service.upsertRating(testUserId, 'game-1', 3);

      // Should not throw with an unknown sort column
      const result = service.getUserRatings(testUserId, 1, 10, 'invalid_column', 'desc');
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getGameAggregate', () => {
    it('should return zeroed aggregate for game with no ratings', () => {
      const result = service.getGameAggregate('game-no-ratings');

      expect(result.gameId).toBe('game-no-ratings');
      expect(result.averageRating).toBe(0);
      expect(result.totalRatings).toBe(0);
      expect(result.distribution).toEqual({
        '1': 0,
        '2': 0,
        '3': 0,
        '4': 0,
        '5': 0,
      });
    });

    it('should return correct aggregate for single rating', () => {
      service.upsertRating(testUserId, 'game-1', 4);

      const result = service.getGameAggregate('game-1');

      expect(result.averageRating).toBe(4);
      expect(result.totalRatings).toBe(1);
      expect(result.distribution['4']).toBe(1);
    });

    it('should calculate average correctly for multiple ratings', () => {
      const user2 = createTestUser(db, { username: 'user2', email: 'user2@test.com' });
      const user3 = createTestUser(db, { username: 'user3', email: 'user3@test.com' });

      service.upsertRating(testUserId, 'game-1', 3);
      service.upsertRating(user2.id, 'game-1', 5);
      service.upsertRating(user3.id, 'game-1', 4);

      const result = service.getGameAggregate('game-1');

      // (3 + 5 + 4) / 3 = 4.0
      expect(result.averageRating).toBe(4);
      expect(result.totalRatings).toBe(3);
      expect(result.distribution['3']).toBe(1);
      expect(result.distribution['4']).toBe(1);
      expect(result.distribution['5']).toBe(1);
    });

    it('should round average to one decimal place', () => {
      const user2 = createTestUser(db, { username: 'user2', email: 'user2@test.com' });
      const user3 = createTestUser(db, { username: 'user3', email: 'user3@test.com' });

      service.upsertRating(testUserId, 'game-1', 1);
      service.upsertRating(user2.id, 'game-1', 2);
      service.upsertRating(user3.id, 'game-1', 3);

      const result = service.getGameAggregate('game-1');

      // (1 + 2 + 3) / 3 = 2.0
      expect(result.averageRating).toBe(2);
      expect(result.totalRatings).toBe(3);
    });
  });

  describe('getBatchAggregates', () => {
    it('should return empty object for empty array', () => {
      const result = service.getBatchAggregates([]);
      expect(result).toEqual({});
    });

    it('should return aggregates for games with ratings', () => {
      const user2 = createTestUser(db, { username: 'user2', email: 'user2@test.com' });

      service.upsertRating(testUserId, 'game-1', 4);
      service.upsertRating(user2.id, 'game-1', 2);
      service.upsertRating(testUserId, 'game-2', 5);

      const result = service.getBatchAggregates(['game-1', 'game-2', 'game-3']);

      expect(result['game-1']).toBeDefined();
      expect(result['game-1'].averageRating).toBe(3);
      expect(result['game-1'].totalRatings).toBe(2);
      expect(result['game-2'].averageRating).toBe(5);
      expect(result['game-2'].totalRatings).toBe(1);
      // game-3 has no ratings — should be omitted
      expect(result['game-3']).toBeUndefined();
    });

    it('should throw for more than 100 game IDs', () => {
      const gameIds = Array.from({ length: 101 }, (_, i) => `game-${i}`);

      expect(() => service.getBatchAggregates(gameIds)).toThrow(
        'Maximum of 100 game IDs per batch request'
      );
    });
  });

  describe('getTopRatedGameIds', () => {
    it('should return empty array when no ratings exist', () => {
      const result = service.getTopRatedGameIds(10);
      expect(result).toEqual([]);
    });

    it('should return game IDs sorted by average rating descending', () => {
      const user2 = createTestUser(db, { username: 'user2', email: 'user2@test.com' });

      service.upsertRating(testUserId, 'game-1', 3);
      service.upsertRating(testUserId, 'game-2', 5);
      service.upsertRating(testUserId, 'game-3', 1);
      service.upsertRating(user2.id, 'game-1', 3);
      service.upsertRating(user2.id, 'game-2', 5);
      service.upsertRating(user2.id, 'game-3', 1);

      const result = service.getTopRatedGameIds(10);

      expect(result[0]).toBe('game-2');
      expect(result[1]).toBe('game-1');
      expect(result[2]).toBe('game-3');
    });

    it('should respect limit', () => {
      service.upsertRating(testUserId, 'game-1', 3);
      service.upsertRating(testUserId, 'game-2', 5);
      service.upsertRating(testUserId, 'game-3', 1);

      const result = service.getTopRatedGameIds(2);

      expect(result).toHaveLength(2);
    });

    it('should cap limit at 100', () => {
      service.upsertRating(testUserId, 'game-1', 5);

      // Should not throw
      const result = service.getTopRatedGameIds(500);
      expect(result).toHaveLength(1);
    });
  });

  describe('getTopRatedGames', () => {
    it('should return empty array when no ratings exist', async () => {
      const result = await service.getTopRatedGames(10);
      expect(result).toEqual([]);
    });

    it('should return games in rating order', async () => {
      service.upsertRating(testUserId, 'game-1', 3);
      service.upsertRating(testUserId, 'game-2', 5);

      const result = await service.getTopRatedGames(10);

      // Game-2 has higher rating, should be first
      expect(result[0].id).toBe('game-2');
      expect(result[1].id).toBe('game-1');
    });
  });

  describe('deleteRating', () => {
    it('should return false when no rating exists', () => {
      const result = service.deleteRating(testUserId, 'game-999');
      expect(result).toBe(false);
    });

    it('should delete an existing rating and return true', () => {
      service.upsertRating(testUserId, 'game-1', 4);

      const result = service.deleteRating(testUserId, 'game-1');

      expect(result).toBe(true);
      expect(service.getUserRating(testUserId, 'game-1')).toBeNull();
    });

    it("should not delete another user's rating", () => {
      const otherUser = createTestUser(db, { username: 'other', email: 'other@test.com' });
      service.upsertRating(otherUser.id, 'game-1', 5);

      const result = service.deleteRating(testUserId, 'game-1');

      expect(result).toBe(false);
      expect(service.getUserRating(otherUser.id, 'game-1')).not.toBeNull();
    });

    it('should update aggregate after deletion', () => {
      const user2 = createTestUser(db, { username: 'user2', email: 'user2@test.com' });

      service.upsertRating(testUserId, 'game-1', 2);
      service.upsertRating(user2.id, 'game-1', 4);

      // Aggregate should be (2+4)/2 = 3
      expect(service.getGameAggregate('game-1').averageRating).toBe(3);

      service.deleteRating(testUserId, 'game-1');

      // After deletion, only user2's rating remains: 4
      const aggregate = service.getGameAggregate('game-1');
      expect(aggregate.averageRating).toBe(4);
      expect(aggregate.totalRatings).toBe(1);
    });
  });
});
