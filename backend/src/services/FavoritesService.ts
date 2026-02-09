import { UserDatabaseService } from './UserDatabaseService';
import { GameService, Game } from './GameService';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

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

  // Maximum items allowed in batch operations
  private static readonly MAX_BATCH_SIZE = 100;

  constructor() {
    this.userDb = UserDatabaseService;
    this.gameService = new GameService();
  }

  isFavorited(userId: number, gameId: string): boolean {
    const db = this.userDb.getDatabase();

    const stmt = db.prepare(`
      SELECT 1
      FROM user_favorites
      WHERE user_id = ? AND game_id = ?
    `);

    return stmt.get(userId, gameId) !== undefined;
  }

  toggleFavorite(userId: number, gameId: string): { isFavorited: boolean } {
    const db = this.userDb.getDatabase();

    const toggle = db.transaction(() => {
      const exists = db
        .prepare('SELECT 1 FROM user_favorites WHERE user_id = ? AND game_id = ?')
        .get(userId, gameId);

      if (exists) {
        db.prepare('DELETE FROM user_favorites WHERE user_id = ? AND game_id = ?').run(
          userId,
          gameId
        );
        logger.info(`Removed game ${gameId} from favorites for user ${userId}`);
        return { isFavorited: false };
      } else {
        db.prepare('INSERT INTO user_favorites (user_id, game_id) VALUES (?, ?)').run(
          userId,
          gameId
        );
        logger.info(`Added game ${gameId} to favorites for user ${userId}`);
        return { isFavorited: true };
      }
    });

    return toggle();
  }

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

  getUserFavorites(userId: number, limit?: number, offset?: number): Favorite[] {
    const db = this.userDb.getDatabase();

    let query = `
      SELECT *
      FROM user_favorites
      WHERE user_id = ?
      ORDER BY added_at DESC
    `;

    const params: (number | string)[] = [userId];

    if (limit !== undefined) {
      const safeLimit = Math.max(1, Math.min(limit ?? 50, 1000));
      query += ` LIMIT ?`;
      params.push(safeLimit);

      if (offset !== undefined) {
        const safeOffset = Math.max(0, offset ?? 0);
        query += ` OFFSET ?`;
        params.push(safeOffset);
      }
    }

    const stmt = db.prepare(query);

    return stmt.all(...params) as Favorite[];
  }

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

  async getUserFavoriteGames(
    userId: number,
    limit?: number,
    offset?: number,
    sortBy?: 'title' | 'dateAdded',
    sortOrder?: 'asc' | 'desc'
  ): Promise<FavoriteGame[]> {
    const db = this.userDb.getDatabase();

    const effectiveSortBy = sortBy || 'dateAdded';
    const effectiveSortOrder = sortOrder || 'desc';

    let query = `
      SELECT game_id, added_at
      FROM user_favorites
      WHERE user_id = ?
    `;

    if (effectiveSortBy === 'dateAdded') {
      query += ` ORDER BY added_at ${effectiveSortOrder.toUpperCase()}`;
    }

    const params: (number | string)[] = [userId];

    if (limit !== undefined) {
      query += ` LIMIT ?`;
      params.push(limit);
      if (offset !== undefined) {
        query += ` OFFSET ?`;
        params.push(offset);
      }
    }

    const stmt = db.prepare(query);
    const favorites = stmt.all(...params) as Array<{ game_id: string; added_at: string }>;

    if (favorites.length === 0) {
      return [];
    }

    const gameIds = favorites.map((f) => f.game_id);
    const games = await this.gameService.getGamesByIds(gameIds);

    // Map for O(1) lookup instead of O(N^2) with .find() in loop
    const gamesMap = new Map(games.map((g) => [g.id, g]));

    const favoriteGames: FavoriteGame[] = favorites
      .map((fav) => {
        const game = gamesMap.get(fav.game_id);
        if (game) {
          return {
            ...game,
            addedAt: fav.added_at,
          };
        }
        return null;
      })
      .filter((game): game is FavoriteGame => game !== null);

    if (effectiveSortBy === 'title') {
      favoriteGames.sort((a, b) => {
        const comparison = a.title.localeCompare(b.title);
        return effectiveSortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return favoriteGames;
  }

  addFavoritesBatch(userId: number, gameIds: string[]): { added: number } {
    if (gameIds.length > FavoritesService.MAX_BATCH_SIZE) {
      throw new AppError(
        400,
        `Maximum of ${FavoritesService.MAX_BATCH_SIZE} items per batch operation`
      );
    }

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

  removeFavoritesBatch(userId: number, gameIds: string[]): { removed: number } {
    if (gameIds.length > FavoritesService.MAX_BATCH_SIZE) {
      throw new AppError(
        400,
        `Maximum of ${FavoritesService.MAX_BATCH_SIZE} items per batch operation`
      );
    }

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
