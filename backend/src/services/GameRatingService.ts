import { UserDatabaseService } from './UserDatabaseService';
import { GameService, Game } from './GameService';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export interface GameRating {
  id: number;
  userId: number;
  gameId: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface RatingAggregate {
  gameId: string;
  averageRating: number;
  totalRatings: number;
  distribution: Record<string, number>;
}

export interface BatchRatingAggregate {
  averageRating: number;
  totalRatings: number;
}

// Shape returned directly from SQLite for upsertRating
interface RatingRow {
  id: number;
  user_id: number;
  game_id: string;
  rating: number;
  created_at: string;
  updated_at: string;
}

// Shape returned from getUserRatings window-function query
interface RatingRowWithCount extends RatingRow {
  total_count: number;
}

// Shape returned from getGameAggregate aggregation query
interface AggregateRow {
  average_rating: number | null;
  total_ratings: number;
  dist_1: number;
  dist_2: number;
  dist_3: number;
  dist_4: number;
  dist_5: number;
}

// Shape returned from getBatchAggregates query
interface BatchAggregateRow {
  game_id: string;
  average_rating: number;
  total_ratings: number;
}

// Shape returned from getTopRatedGameIds query
interface TopRatedRow {
  game_id: string;
}

// Allowlisted sort column mapping — never use user input directly in SQL
const SORT_COLUMN_MAP: Record<string, string> = {
  updatedAt: 'updated_at',
  rating: 'rating',
  createdAt: 'created_at',
};

function mapRowToGameRating(row: RatingRow): GameRating {
  return {
    id: row.id,
    userId: row.user_id,
    gameId: row.game_id,
    rating: row.rating,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class GameRatingService {
  private userDb: typeof UserDatabaseService;
  private gameService: GameService;

  private static readonly MAX_BATCH_SIZE = 100;
  private static readonly MIN_RATINGS_FOR_TOP = 1;

  constructor() {
    this.userDb = UserDatabaseService;
    this.gameService = new GameService();
  }

  /**
   * Insert or update a rating for the given user+game pair.
   *
   * Uses an explicit transaction with a check-then-INSERT/UPDATE pattern instead
   * of INSERT OR REPLACE, which would delete the existing row (changing its `id`)
   * before inserting a new one.
   */
  upsertRating(
    userId: number,
    gameId: string,
    rating: number
  ): { rating: GameRating; created: boolean } {
    const trimmedGameId = gameId.trim();

    if (!trimmedGameId) {
      throw new AppError(400, 'Game ID must not be empty');
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new AppError(400, 'Rating must be an integer between 1 and 5');
    }

    const db = this.userDb.getDatabase();

    const result = db.transaction((): { rating: GameRating; created: boolean } => {
      const existing = db
        .prepare<
          [number, string],
          RatingRow
        >('SELECT id, user_id, game_id, rating, created_at, updated_at FROM game_ratings WHERE user_id = ? AND game_id = ?')
        .get(userId, trimmedGameId);

      if (existing) {
        db.prepare('UPDATE game_ratings SET rating = ?, updated_at = ? WHERE id = ?').run(
          rating,
          new Date().toISOString(),
          existing.id
        );

        const updated = db
          .prepare<
            [number],
            RatingRow
          >('SELECT id, user_id, game_id, rating, created_at, updated_at FROM game_ratings WHERE id = ?')
          .get(existing.id);

        if (!updated) {
          throw new AppError(500, 'Failed to retrieve rating after update');
        }

        logger.info(
          `Updated game rating for game ${trimmedGameId} by user ${userId} (rating: ${rating})`
        );

        return { rating: mapRowToGameRating(updated), created: false };
      }

      const now = new Date().toISOString();
      const insertResult = db
        .prepare(
          'INSERT INTO game_ratings (user_id, game_id, rating, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
        )
        .run(userId, trimmedGameId, rating, now, now);

      const created = db
        .prepare<
          [number | bigint],
          RatingRow
        >('SELECT id, user_id, game_id, rating, created_at, updated_at FROM game_ratings WHERE id = ?')
        .get(insertResult.lastInsertRowid);

      if (!created) {
        throw new AppError(500, 'Failed to retrieve rating after insert');
      }

      logger.info(
        `Created game rating for game ${trimmedGameId} by user ${userId} (rating: ${rating})`
      );

      return { rating: mapRowToGameRating(created), created: true };
    })();

    return result;
  }

  /**
   * Return the rating a specific user gave to a specific game, or null if none exists.
   */
  getUserRating(userId: number, gameId: string): GameRating | null {
    const row = this.userDb.get<RatingRow>(
      'SELECT id, user_id, game_id, rating, created_at, updated_at FROM game_ratings WHERE user_id = ? AND game_id = ?',
      [userId, gameId]
    );

    return row != null ? mapRowToGameRating(row) : null;
  }

  /**
   * Return a paginated list of all ratings submitted by the given user.
   *
   * Uses a window function (COUNT(*) OVER()) to avoid a separate COUNT query.
   */
  getUserRatings(
    userId: number,
    page: number,
    limit: number,
    sortBy: string,
    sortOrder: 'asc' | 'desc'
  ): { data: GameRating[]; total: number } {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    const safeOffset = Math.max(0, (page - 1) * safeLimit);

    // Resolve column through allowlist — never interpolate user input directly
    const column = SORT_COLUMN_MAP[sortBy] ?? SORT_COLUMN_MAP['updatedAt'];
    const direction = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const rows = this.userDb.exec<RatingRowWithCount>(
      `SELECT
        id,
        user_id,
        game_id,
        rating,
        created_at,
        updated_at,
        COUNT(*) OVER() AS total_count
       FROM game_ratings
       WHERE user_id = ?
       ORDER BY ${column} ${direction}
       LIMIT ? OFFSET ?`,
      [userId, safeLimit, safeOffset]
    );

    const total = rows[0]?.total_count ?? 0;

    return {
      data: rows.map(mapRowToGameRating),
      total,
    };
  }

  /**
   * Return aggregated rating statistics for a single game.
   *
   * Computes average, total count, and a 1-5 star distribution in one query.
   * Returns zeroed values when no ratings exist for the game.
   */
  getGameAggregate(gameId: string): RatingAggregate {
    const row = this.userDb.get<AggregateRow>(
      `SELECT
        AVG(rating * 1.0)                               AS average_rating,
        COUNT(*)                                         AS total_ratings,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END)    AS dist_1,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END)    AS dist_2,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END)    AS dist_3,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END)    AS dist_4,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END)    AS dist_5
       FROM game_ratings
       WHERE game_id = ?`,
      [gameId]
    );

    const totalRatings = row?.total_ratings ?? 0;
    const rawAvg = row?.average_rating ?? null;

    return {
      gameId,
      averageRating: rawAvg != null ? Math.round(rawAvg * 10) / 10 : 0,
      totalRatings,
      distribution: {
        '1': row?.dist_1 ?? 0,
        '2': row?.dist_2 ?? 0,
        '3': row?.dist_3 ?? 0,
        '4': row?.dist_4 ?? 0,
        '5': row?.dist_5 ?? 0,
      },
    };
  }

  /**
   * Return aggregated rating statistics for a batch of game IDs.
   *
   * Games with no ratings are omitted from the result object.
   * The caller is responsible for treating omitted games as having no ratings.
   */
  getBatchAggregates(gameIds: readonly string[]): Record<string, BatchRatingAggregate> {
    if (gameIds.length === 0) {
      return {};
    }

    if (gameIds.length > GameRatingService.MAX_BATCH_SIZE) {
      throw new AppError(
        400,
        `Maximum of ${GameRatingService.MAX_BATCH_SIZE} game IDs per batch request`
      );
    }

    const placeholders = gameIds.map(() => '?').join(', ');

    const rows = this.userDb.exec<BatchAggregateRow>(
      `SELECT
        game_id,
        AVG(rating * 1.0) AS average_rating,
        COUNT(*)           AS total_ratings
       FROM game_ratings
       WHERE game_id IN (${placeholders})
       GROUP BY game_id`,
      [...gameIds]
    );

    const result: Record<string, BatchRatingAggregate> = {};

    for (const row of rows) {
      result[row.game_id] = {
        averageRating: Math.round(row.average_rating * 10) / 10,
        totalRatings: row.total_ratings,
      };
    }

    return result;
  }

  /**
   * Return the IDs of the top-rated games, ordered by average rating descending
   * then by number of ratings descending as a tiebreaker.
   *
   * Only games with at least MIN_RATINGS_FOR_TOP ratings are included.
   */
  getTopRatedGameIds(limit: number): string[] {
    const safeLimit = Math.max(1, Math.min(limit, 100));

    const rows = this.userDb.exec<TopRatedRow>(
      `SELECT game_id
       FROM game_ratings
       GROUP BY game_id
       HAVING COUNT(*) >= ?
       ORDER BY AVG(rating * 1.0) DESC, COUNT(*) DESC
       LIMIT ?`,
      [GameRatingService.MIN_RATINGS_FOR_TOP, safeLimit]
    );

    return rows.map((r) => r.game_id);
  }

  /**
   * Return the full Game objects for the top-rated games, in rating order.
   *
   * Fetches IDs first, then resolves the full game data via GameService.
   * Preserves the original rating-order using a Map for O(1) lookups.
   */
  async getTopRatedGames(limit: number): Promise<Game[]> {
    const gameIds = this.getTopRatedGameIds(limit);

    if (gameIds.length === 0) {
      return [];
    }

    const games = await this.gameService.getGamesByIds(gameIds);

    // Build a Map for O(1) lookup — avoids O(N²) .find() in loop (per CLAUDE.md)
    const gamesMap = new Map(games.map((g) => [g.id, g]));

    // Re-apply the original rating order returned from getTopRatedGameIds
    return gameIds.map((id) => gamesMap.get(id)).filter((game): game is Game => game !== undefined);
  }

  /**
   * Delete the rating a specific user gave to a specific game.
   *
   * Returns true if a row was deleted, false if no matching rating existed.
   */
  deleteRating(userId: number, gameId: string): boolean {
    const result = this.userDb.run('DELETE FROM game_ratings WHERE user_id = ? AND game_id = ?', [
      userId,
      gameId,
    ]);

    if (result.changes > 0) {
      logger.info(`Deleted game rating for game ${gameId} by user ${userId}`);
      return true;
    }

    return false;
  }
}
