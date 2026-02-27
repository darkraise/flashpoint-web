import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';
import { createTestDatabase, createTestUser } from '../test/helpers';
import { FavoritesService } from './FavoritesService';

// Mock dependencies
vi.mock('./UserDatabaseService', () => ({
  UserDatabaseService: {
    getDatabase: vi.fn(),
    get: vi.fn(),
    all: vi.fn(),
    run: vi.fn(),
  },
}));

vi.mock('./GameService', () => ({
  GameService: vi.fn().mockImplementation(() => ({
    getGamesByIds: vi.fn().mockResolvedValue([
      { id: 'game1', title: 'Test Game 1' },
      { id: 'game2', title: 'Test Game 2' },
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

describe('FavoritesService', () => {
  let db: BetterSqlite3.Database;
  let favoritesService: FavoritesService;
  let testUserId: number;

  beforeEach(() => {
    db = createTestDatabase();
    const testUser = createTestUser(db);
    testUserId = testUser.id;

    // Configure mock to use the test database
    vi.mocked(UserDatabaseService.getDatabase).mockReturnValue(db);

    favoritesService = new FavoritesService();
  });

  afterEach(() => {
    if (db.open) {
      db.close();
    }
    vi.clearAllMocks();
  });

  describe('isFavorited', () => {
    it('should return false when game is not favorited', () => {
      const result = favoritesService.isFavorited(testUserId, 'game-123');
      expect(result).toBe(false);
    });

    it('should return true when game is favorited', () => {
      db.prepare('INSERT INTO user_favorites (user_id, game_id) VALUES (?, ?)').run(
        testUserId,
        'game-123'
      );

      const result = favoritesService.isFavorited(testUserId, 'game-123');
      expect(result).toBe(true);
    });

    it('should return false for different user', () => {
      const otherUser = createTestUser(db, { username: 'other', email: 'other@test.com' });

      db.prepare('INSERT INTO user_favorites (user_id, game_id) VALUES (?, ?)').run(
        testUserId,
        'game-123'
      );

      const result = favoritesService.isFavorited(otherUser.id, 'game-123');
      expect(result).toBe(false);
    });
  });

  describe('toggleFavorite', () => {
    it('should add favorite when not favorited', () => {
      const result = favoritesService.toggleFavorite(testUserId, 'game-123');

      expect(result.isFavorited).toBe(true);
      expect(favoritesService.isFavorited(testUserId, 'game-123')).toBe(true);
    });

    it('should remove favorite when already favorited', () => {
      db.prepare('INSERT INTO user_favorites (user_id, game_id) VALUES (?, ?)').run(
        testUserId,
        'game-123'
      );

      const result = favoritesService.toggleFavorite(testUserId, 'game-123');

      expect(result.isFavorited).toBe(false);
      expect(favoritesService.isFavorited(testUserId, 'game-123')).toBe(false);
    });

    it('should toggle correctly multiple times', () => {
      expect(favoritesService.toggleFavorite(testUserId, 'game-123').isFavorited).toBe(true);
      expect(favoritesService.toggleFavorite(testUserId, 'game-123').isFavorited).toBe(false);
      expect(favoritesService.toggleFavorite(testUserId, 'game-123').isFavorited).toBe(true);
    });
  });

  describe('addFavorite', () => {
    it('should add a new favorite', () => {
      const result = favoritesService.addFavorite(testUserId, 'game-123');

      expect(result).toBe(true);
      expect(favoritesService.isFavorited(testUserId, 'game-123')).toBe(true);
    });

    it('should return false when already favorited', () => {
      favoritesService.addFavorite(testUserId, 'game-123');
      const result = favoritesService.addFavorite(testUserId, 'game-123');

      expect(result).toBe(false);
    });
  });

  describe('removeFavorite', () => {
    it('should remove an existing favorite', () => {
      favoritesService.addFavorite(testUserId, 'game-123');

      const result = favoritesService.removeFavorite(testUserId, 'game-123');

      expect(result).toBe(true);
      expect(favoritesService.isFavorited(testUserId, 'game-123')).toBe(false);
    });

    it('should return false when favorite does not exist', () => {
      const result = favoritesService.removeFavorite(testUserId, 'game-123');

      expect(result).toBe(false);
    });
  });

  describe('addFavoritesBatch', () => {
    it('should add multiple favorites', () => {
      const gameIds = ['game-1', 'game-2', 'game-3'];

      const result = favoritesService.addFavoritesBatch(testUserId, gameIds);

      expect(result.added).toBe(3);
      gameIds.forEach((id) => {
        expect(favoritesService.isFavorited(testUserId, id)).toBe(true);
      });
    });

    it('should ignore already favorited games', () => {
      favoritesService.addFavorite(testUserId, 'game-1');

      const gameIds = ['game-1', 'game-2', 'game-3'];
      const result = favoritesService.addFavoritesBatch(testUserId, gameIds);

      expect(result.added).toBe(2);
    });

    it('should throw error for more than 100 items', () => {
      const gameIds = Array.from({ length: 101 }, (_, i) => `game-${i}`);

      expect(() => favoritesService.addFavoritesBatch(testUserId, gameIds)).toThrow(
        'Maximum of 100 items per batch operation'
      );
    });

    it('should handle empty array', () => {
      const result = favoritesService.addFavoritesBatch(testUserId, []);

      expect(result.added).toBe(0);
    });
  });

  describe('removeFavoritesBatch', () => {
    it('should remove multiple favorites', () => {
      const gameIds = ['game-1', 'game-2', 'game-3'];
      favoritesService.addFavoritesBatch(testUserId, gameIds);

      const result = favoritesService.removeFavoritesBatch(testUserId, gameIds);

      expect(result.removed).toBe(3);
      gameIds.forEach((id) => {
        expect(favoritesService.isFavorited(testUserId, id)).toBe(false);
      });
    });

    it('should only count actually removed favorites', () => {
      favoritesService.addFavorite(testUserId, 'game-1');

      const gameIds = ['game-1', 'game-2', 'game-3'];
      const result = favoritesService.removeFavoritesBatch(testUserId, gameIds);

      expect(result.removed).toBe(1);
    });

    it('should throw error for more than 100 items', () => {
      const gameIds = Array.from({ length: 101 }, (_, i) => `game-${i}`);

      expect(() => favoritesService.removeFavoritesBatch(testUserId, gameIds)).toThrow(
        'Maximum of 100 items per batch operation'
      );
    });
  });

  describe('getUserFavorites', () => {
    it('should return user favorites ordered by date', () => {
      favoritesService.addFavorite(testUserId, 'game-1');
      favoritesService.addFavorite(testUserId, 'game-2');
      favoritesService.addFavorite(testUserId, 'game-3');

      const result = favoritesService.getUserFavorites(testUserId);

      expect(result).toHaveLength(3);
    });

    it('should respect limit parameter', () => {
      favoritesService.addFavoritesBatch(testUserId, ['game-1', 'game-2', 'game-3', 'game-4']);

      const result = favoritesService.getUserFavorites(testUserId, 2);

      expect(result).toHaveLength(2);
    });

    it('should respect offset parameter', () => {
      favoritesService.addFavoritesBatch(testUserId, ['game-1', 'game-2', 'game-3', 'game-4']);

      const result = favoritesService.getUserFavorites(testUserId, 2, 2);

      expect(result).toHaveLength(2);
    });

    it('should return empty array for user with no favorites', () => {
      const result = favoritesService.getUserFavorites(testUserId);

      expect(result).toEqual([]);
    });
  });

  describe('getFavoritesCount', () => {
    it('should return 0 for user with no favorites', () => {
      const result = favoritesService.getFavoritesCount(testUserId);

      expect(result).toBe(0);
    });

    it('should return correct count', () => {
      favoritesService.addFavoritesBatch(testUserId, ['game-1', 'game-2', 'game-3']);

      const result = favoritesService.getFavoritesCount(testUserId);

      expect(result).toBe(3);
    });
  });

  describe('clearAllFavorites', () => {
    it('should remove all favorites for user', () => {
      favoritesService.addFavoritesBatch(testUserId, ['game-1', 'game-2', 'game-3']);

      const result = favoritesService.clearAllFavorites(testUserId);

      expect(result).toBe(3);
      expect(favoritesService.getFavoritesCount(testUserId)).toBe(0);
    });

    it('should not affect other users favorites', () => {
      const otherUser = createTestUser(db, { username: 'other', email: 'other@test.com' });

      favoritesService.addFavoritesBatch(testUserId, ['game-1', 'game-2']);
      favoritesService.addFavorite(otherUser.id, 'game-1');

      favoritesService.clearAllFavorites(testUserId);

      expect(favoritesService.getFavoritesCount(testUserId)).toBe(0);
      expect(favoritesService.getFavoritesCount(otherUser.id)).toBe(1);
    });

    it('should return 0 when no favorites to clear', () => {
      const result = favoritesService.clearAllFavorites(testUserId);

      expect(result).toBe(0);
    });
  });

  describe('getUserFavoriteGameIds', () => {
    it('should return list of game IDs', () => {
      favoritesService.addFavoritesBatch(testUserId, ['game-1', 'game-2', 'game-3']);

      const result = favoritesService.getUserFavoriteGameIds(testUserId);

      expect(result).toHaveLength(3);
      expect(result).toContain('game-1');
      expect(result).toContain('game-2');
      expect(result).toContain('game-3');
    });

    it('should return empty array for no favorites', () => {
      const result = favoritesService.getUserFavoriteGameIds(testUserId);

      expect(result).toEqual([]);
    });
  });

  describe('getFavoritesStats', () => {
    it('should return stats for user with favorites', () => {
      favoritesService.addFavoritesBatch(testUserId, ['game-1', 'game-2', 'game-3']);

      const result = favoritesService.getFavoritesStats(testUserId);

      expect(result.totalFavorites).toBe(3);
      expect(result.oldestFavoriteDate).toBeDefined();
      expect(result.newestFavoriteDate).toBeDefined();
    });

    it('should return nulls for user with no favorites', () => {
      const result = favoritesService.getFavoritesStats(testUserId);

      expect(result.totalFavorites).toBe(0);
      expect(result.oldestFavoriteDate).toBeNull();
      expect(result.newestFavoriteDate).toBeNull();
    });
  });

  describe('getUserFavoriteGames', () => {
    it('should return favorite games with total count', async () => {
      favoritesService.addFavoritesBatch(testUserId, ['game1', 'game2']);

      const result = await favoritesService.getUserFavoriteGames(testUserId);

      expect(result.total).toBe(2);
      expect(result.data).toBeDefined();
    });

    it('should return empty data for user with no favorites', async () => {
      const result = await favoritesService.getUserFavoriteGames(testUserId);

      expect(result.total).toBe(0);
      expect(result.data).toEqual([]);
    });
  });
});
