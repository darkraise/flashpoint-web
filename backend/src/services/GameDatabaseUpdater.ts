import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';
import path from 'path';
import { config } from '../config';

export interface GameData {
  id: number;
  gameId: string;
  title: string;
  dateAdded: string;
  sha256: string;
  crc32: number;
  presentOnDisk: number;
  path: string | null;
  size: number;
  parameters: string | null;
}

/**
 * NOTE: This service intentionally writes to flashpoint.sqlite to update
 * presentOnDisk and path fields in game_data/game tables. This matches
 * the Flashpoint Launcher's behavior when downloading game data.
 * better-sqlite3 handles file locking, and the backend's DatabaseService
 * file watcher handles reloads when the Launcher makes changes.
 */
export class GameDatabaseUpdater {
  static async markAsDownloaded(gameDataId: number, filePath: string): Promise<GameData> {
    try {
      logger.info('Updating database for downloaded game data', {
        gameDataId,
        filePath,
      });

      const gameData = this.getGameData(gameDataId);
      if (!gameData) {
        throw new Error(`Game data not found with id: ${gameDataId}`);
      }

      // Flashpoint stores paths relative to installation dir (e.g. "Data/Games/uuid-timestamp.zip")
      const relativePath = this.makeRelativePath(filePath);

      logger.debug('Path conversion for database storage', {
        absolutePath: filePath,
        relativePath,
      });

      const db = DatabaseService.getDatabase();
      const updateTransaction = db.transaction(() => {
        const updateGameDataSql = `
          UPDATE game_data
          SET presentOnDisk = 1, path = ?
          WHERE id = ?
        `;

        logger.debug('Executing UPDATE on game_data', {
          sql: updateGameDataSql,
          params: [relativePath, gameDataId],
        });

        db.prepare(updateGameDataSql).run(relativePath, gameDataId);

        logger.debug('game_data UPDATE successful');

        const gameSql = `
          SELECT id, activeDataId
          FROM game
          WHERE id = ?
        `;
        const game = db.prepare(gameSql).get(gameData.gameId) as
          | { id: string; activeDataId: number }
          | undefined;

        if (game && game.activeDataId === gameDataId) {
          const updateGameSql = `
            UPDATE game
            SET activeDataOnDisk = 1
            WHERE id = ? AND activeDataId = ?
          `;

          logger.debug('Executing UPDATE on game table', {
            sql: updateGameSql,
            params: [gameData.gameId, gameDataId],
          });

          db.prepare(updateGameSql).run(gameData.gameId, gameDataId);

          logger.debug('game table UPDATE successful - activeDataOnDisk set to 1', {
            gameId: gameData.gameId,
          });
        } else {
          logger.debug('Skipping game table update - game data is not active', {
            gameId: gameData.gameId,
            activeDataId: game?.activeDataId,
            requestedDataId: gameDataId,
          });
        }
      });

      updateTransaction();
      this.saveDatabase();

      logger.info('Database updated successfully', {
        gameDataId,
        gameId: gameData.gameId,
        filePath,
      });

      const updated = this.getGameData(gameDataId);
      if (!updated) {
        throw new Error('Failed to fetch updated game data');
      }

      return updated;
    } catch (error) {
      logger.error('Failed to update database', {
        gameDataId,
        filePath,
        error,
      });

      throw new Error(
        `Database update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  static getGameData(gameDataId: number): GameData | null {
    try {
      const sql = `
        SELECT
          id,
          gameId,
          title,
          dateAdded,
          sha256,
          crc32,
          presentOnDisk,
          path,
          size,
          parameters
        FROM game_data
        WHERE id = ?
      `;

      const row = DatabaseService.get<GameData>(sql, [gameDataId]);
      return row ? this.mapRowToGameData(row) : null;
    } catch (error) {
      logger.error('Failed to fetch game data', { gameDataId, error });
      throw error;
    }
  }

  private static saveDatabase(): void {
    try {
      // better-sqlite3 writes automatically; just ensure changes are flushed
      DatabaseService.save();

      logger.info('Database changes flushed to disk', {
        path: config.flashpointDbPath,
      });
    } catch (error) {
      logger.error('Failed to save database to disk', { error });
      throw new Error(
        `Failed to persist database changes: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private static mapRowToGameData(row: GameData): GameData {
    return row;
  }

  static isDownloaded(gameDataId: number): boolean {
    try {
      const sql = `
        SELECT presentOnDisk
        FROM game_data
        WHERE id = ?
      `;

      const row = DatabaseService.get<{ presentOnDisk: number }>(sql, [gameDataId]);
      return row ? row.presentOnDisk === 1 : false;
    } catch (error) {
      logger.error('Failed to check if game data is downloaded', { gameDataId, error });
      throw error;
    }
  }

  static markAsNotDownloaded(gameDataId: number): void {
    try {
      const db = DatabaseService.getDatabase();

      const updateTransaction = db.transaction(() => {
        const sql = `
          UPDATE game_data
          SET presentOnDisk = 0, path = NULL
          WHERE id = ?
        `;

        db.prepare(sql).run(gameDataId);
      });

      updateTransaction();

      this.saveDatabase();

      logger.info('Marked game data as not downloaded', { gameDataId });
    } catch (error) {
      logger.error('Failed to mark game data as not downloaded', { gameDataId, error });
      throw error;
    }
  }

  private static makeRelativePath(absolutePath: string): string {
    const resolved = path.resolve(absolutePath);
    const base = path.resolve(config.flashpointPath);
    if (!resolved.startsWith(base + path.sep) && resolved !== base) {
      throw new Error(`Path escapes Flashpoint directory: ${absolutePath}`);
    }
    const relativePath = path.relative(base, resolved);
    return relativePath.replace(/\\/g, '/');
  }
}
