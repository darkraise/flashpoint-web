import { UserDatabaseService } from './UserDatabaseService';
import { GameService, Game } from './GameService';
import { logger } from '../utils/logger';

export interface Favorite {
  id: number;
  userId: number;
  gameId: string;
  addedAt: string;
}

export interface FavoriteGame extends Game {
  addedAt: string;
}

export class FavoritesService {
  private userDb: typeof UserDatabaseService;
  private gameService: GameService;

  constructor() {
    this.userDb = UserDatabaseService;
    this.gameService = new GameService();
  }

  /**
   * Check if game is favorited by user
   */
  isFavorited(userId: number, gameId: string): boolean {
    const db = this.userDb.getDatabase();

    const stmt = db.prepare(`
      SELECT 1
      FROM user_favorites
      WHERE user_id = ? AND game_id = ?
    `);

    return stmt.get(userId, gameId) !== undefined;
  }

  /**
   * Toggle favorite status for a game
   */
  toggleFavorite(userId: number, gameId: string): { isFavorited: boolean } {
    const db = this.userDb.getDatabase();

    if (this.isFavorited(userId, gameId)) {
      // Remove from favorites
      const stmt = db.prepare(`
        DELETE FROM user_favorites
        WHERE user_id = ? AND game_id = ?
      `);

      stmt.run(userId, gameId);
      logger.info(`Removed game ${gameId} from favorites for user ${userId}`);

      return { isFavorited: false };
    } else {
      // Add to favorites
      const stmt = db.prepare(`
        INSERT INTO user_favorites (user_id, game_id)
        VALUES (?, ?)
      `);

      stmt.run(userId, gameId);
      logger.info(`Added game ${gameId} to favorites for user ${userId}`);

      return { isFavorited: true };
    }
  }

  /**
   * Add game to favorites
   */
  addFavorite(userId: number, gameId: string): boolean {
    const db = this.userDb.getDatabase();

    try {
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO user_favorites (user_id, game_id)
        VALUES (?, ?)
      `);

      const result = stmt.run(userId, gameId);

      if (result.changes > 0) {
        logger.info(`Added game ${gameId} to favorites for user ${userId}`);
        return true;
      }

      return false; // Already favorited
    } catch (error) {
      logger.error(`Error adding favorite: ${error}`);
      return false;
    }
  }

  /**
   * Remove game from favorites
   */
  removeFavorite(userId: number, gameId: string): boolean {
    const db = this.userDb.getDatabase();

    const stmt = db.prepare(`
      DELETE FROM user_favorites
      WHERE user_id = ? AND game_id = ?
    `);

    const result = stmt.run(userId, gameId);

    if (result.changes > 0) {
      logger.info(`Removed game ${gameId} from favorites for user ${userId}`);
      return true;
    }

    return false;
  }

  /**
   * Get all favorites for a user
   */
  getUserFavorites(userId: number, limit?: number, offset?: number): Favorite[] {
    const db = this.userDb.getDatabase();

    let query = `
      SELECT *
      FROM user_favorites
      WHERE user_id = ?
      ORDER BY added_at DESC
    `;

    if (limit !== undefined) {
      query += ` LIMIT ${limit}`;
      if (offset !== undefined) {
        query += ` OFFSET ${offset}`;
      }
    }

    const stmt = db.prepare(query);

    return stmt.all(userId) as Favorite[];
  }

  /**
   * Get favorite game IDs for a user
   */
  getUserFavoriteGameIds(userId: number): string[] {
    const db = this.userDb.getDatabase();

    const stmt = db.prepare(`
      SELECT game_id
      FROM user_favorites
      WHERE user_id = ?
      ORDER BY added_at DESC
    `);

    const results = stmt.all(userId) as { game_id: string }[];
    return results.map((r) => r.game_id);
  }

  /**
   * Get favorite games with full game data for a user
   */
  async getUserFavoriteGames(
    userId: number,
    limit?: number,
    offset?: number,
    sortBy?: 'title' | 'dateAdded',
    sortOrder?: 'asc' | 'desc'
  ): Promise<FavoriteGame[]> {
    const db = this.userDb.getDatabase();

    // Default values
    const effectiveSortBy = sortBy || 'dateAdded';
    const effectiveSortOrder = sortOrder || 'desc';

    // Get favorites with addedAt
    let query = `
      SELECT game_id, added_at
      FROM user_favorites
      WHERE user_id = ?
    `;

    // Sort by date added at SQL level (efficient)
    if (effectiveSortBy === 'dateAdded') {
      query += ` ORDER BY added_at ${effectiveSortOrder.toUpperCase()}`;
    }

    if (limit !== undefined) {
      query += ` LIMIT ${limit}`;
      if (offset !== undefined) {
        query += ` OFFSET ${offset}`;
      }
    }

    const stmt = db.prepare(query);
    const favorites = stmt.all(userId) as Array<{ game_id: string; added_at: string }>;

    if (favorites.length === 0) {
      return [];
    }

    // Get full game data for these IDs
    const gameIds = favorites.map((f) => f.game_id);
    const games = await this.gameService.getGamesByIds(gameIds);

    // Merge game data with addedAt timestamps
    const favoriteGames: FavoriteGame[] = favorites
      .map((fav) => {
        const game = games.find((g) => g.id === fav.game_id);
        if (game) {
          return {
            ...game,
            addedAt: fav.added_at
          };
        }
        return null;
      })
      .filter((game): game is FavoriteGame => game !== null);

    // Sort by title if requested (after fetching game data)
    if (effectiveSortBy === 'title') {
      favoriteGames.sort((a, b) => {
        const comparison = a.title.localeCompare(b.title);
        return effectiveSortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return favoriteGames;
  }

  /**
   * Batch add favorites
   */
  addFavoritesBatch(userId: number, gameIds: string[]): { added: number } {
    const db = this.userDb.getDatabase();

    const stmt = db.prepare(`
      INSERT OR IGNORE INTO user_favorites (user_id, game_id)
      VALUES (?, ?)
    `);

    const transaction = db.transaction((gameIds: string[]) => {
      let added = 0;
      for (const gameId of gameIds) {
        const result = stmt.run(userId, gameId);
        if (result.changes > 0) {
          added++;
        }
      }
      return added;
    });

    const added = transaction(gameIds);

    logger.info(`Batch added ${added} favorites for user ${userId}`);

    return { added };
  }

  /**
   * Batch remove favorites
   */
  removeFavoritesBatch(userId: number, gameIds: string[]): { removed: number } {
    const db = this.userDb.getDatabase();

    const stmt = db.prepare(`
      DELETE FROM user_favorites
      WHERE user_id = ? AND game_id = ?
    `);

    const transaction = db.transaction((gameIds: string[]) => {
      let removed = 0;
      for (const gameId of gameIds) {
        const result = stmt.run(userId, gameId);
        if (result.changes > 0) {
          removed++;
        }
      }
      return removed;
    });

    const removed = transaction(gameIds);

    logger.info(`Batch removed ${removed} favorites for user ${userId}`);

    return { removed };
  }

  /**
   * Get favorites count for a user
   */
  getFavoritesCount(userId: number): number {
    const db = this.userDb.getDatabase();

    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM user_favorites
      WHERE user_id = ?
    `);

    const result = stmt.get(userId) as { count: number };
    return result.count;
  }

  /**
   * Clear all favorites for a user
   */
  clearAllFavorites(userId: number): number {
    const db = this.userDb.getDatabase();

    const stmt = db.prepare(`
      DELETE FROM user_favorites
      WHERE user_id = ?
    `);

    const result = stmt.run(userId);

    logger.info(`Cleared all favorites for user ${userId} (${result.changes} removed)`);

    return result.changes;
  }

  /**
   * Get favorites statistics
   */
  getFavoritesStats(userId: number): {
    totalFavorites: number;
    oldestFavoriteDate: string | null;
    newestFavoriteDate: string | null;
  } {
    const db = this.userDb.getDatabase();

    const stmt = db.prepare(`
      SELECT
        COUNT(*) as totalFavorites,
        MIN(added_at) as oldestFavoriteDate,
        MAX(added_at) as newestFavoriteDate
      FROM user_favorites
      WHERE user_id = ?
    `);

    return stmt.get(userId) as {
      totalFavorites: number;
      oldestFavoriteDate: string | null;
      newestFavoriteDate: string | null;
    };
  }
}
