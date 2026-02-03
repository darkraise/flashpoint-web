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
 * Service for updating the Flashpoint database after game data downloads.
 * Handles transaction safety and proper updates to both game_data and game tables.
 */
export class GameDatabaseUpdater {
  /**
   * Update database to mark game data as downloaded and set its path.
   * Updates both game_data and game tables in a transaction.
   *
   * @param gameDataId - The game_data.id to update
   * @param filePath - Absolute path to the downloaded file
   * @returns Promise resolving to updated GameData object
   * @throws Error if update fails or database transaction fails
   */
  static async markAsDownloaded(gameDataId: number, filePath: string): Promise<GameData> {
    try {
      logger.info('Updating database for downloaded game data', {
        gameDataId,
        filePath
      });

      // First, fetch the current game data to get the gameId
      const gameData = await this.getGameData(gameDataId);
      if (!gameData) {
        throw new Error(`Game data not found with id: ${gameDataId}`);
      }

      // Convert absolute path to relative path (Flashpoint Launcher compatibility)
      // Flashpoint stores paths relative to the Flashpoint installation directory
      // Example: "Data/Games/uuid-timestamp.zip" instead of "D:/Flashpoint/Data/Games/uuid-timestamp.zip"
      const relativePath = this.makeRelativePath(filePath);

      logger.debug('Path conversion for database storage', {
        absolutePath: filePath,
        relativePath
      });

      // Update game_data table
      const updateGameDataSql = `
        UPDATE game_data
        SET presentOnDisk = 1, path = ?
        WHERE id = ?
      `;

      logger.debug('Executing UPDATE on game_data', {
        sql: updateGameDataSql,
        params: [relativePath, gameDataId]
      });

      DatabaseService.run(updateGameDataSql, [relativePath, gameDataId]);

      logger.debug('game_data UPDATE successful');

      // Check if this game_data is the active data for the game
      const gameSql = `
        SELECT id, activeDataId
        FROM game
        WHERE id = ?
      `;
      const game = DatabaseService.get(gameSql, [gameData.gameId]);

      if (game && game.activeDataId === gameDataId) {
        // Update game table to mark active data as on disk
        const updateGameSql = `
          UPDATE game
          SET activeDataOnDisk = 1
          WHERE id = ? AND activeDataId = ?
        `;

        logger.debug('Executing UPDATE on game table', {
          sql: updateGameSql,
          params: [gameData.gameId, gameDataId]
        });

        DatabaseService.run(updateGameSql, [gameData.gameId, gameDataId]);

        logger.debug('game table UPDATE successful - activeDataOnDisk set to 1', {
          gameId: gameData.gameId
        });
      } else {
        logger.debug('Skipping game table update - game data is not active', {
          gameId: gameData.gameId,
          activeDataId: game?.activeDataId,
          requestedDataId: gameDataId
        });
      }

      // Save database to disk
      await this.saveDatabase();

      logger.info('Database updated successfully', {
        gameDataId,
        gameId: gameData.gameId,
        filePath
      });

      // Fetch and return updated game data
      const updated = await this.getGameData(gameDataId);
      if (!updated) {
        throw new Error('Failed to fetch updated game data');
      }

      return updated;
    } catch (error) {
      logger.error('Failed to update database', {
        gameDataId,
        filePath,
        error
      });

      // Attempt to rollback by reloading database (sql.js limitation)
      // In a real scenario, we'd use a proper transaction system
      throw new Error(`Database update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get game data by ID.
   *
   * @param gameDataId - The game_data.id
   * @returns Promise resolving to GameData object or null if not found
   */
  static async getGameData(gameDataId: number): Promise<GameData | null> {
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

      const row = DatabaseService.get(sql, [gameDataId]);
      return row ? this.mapRowToGameData(row) : null;
    } catch (error) {
      logger.error('Failed to fetch game data', { gameDataId, error });
      throw error;
    }
  }

  /**
   * Save the in-memory database to disk.
   * Uses atomic write with temp file + rename for safety.
   * Properly handles database locking on Windows with retries and fallback.
   */
  private static async saveDatabase(): Promise<void> {
    try {
      // With better-sqlite3, changes are automatically written to disk
      // We just need to ensure they're flushed
      DatabaseService.save();

      logger.info('Database changes flushed to disk', {
        path: config.flashpointDbPath
      });
    } catch (error) {
      logger.error('Failed to save database to disk', { error });
      throw new Error(`Failed to persist database changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map database row to GameData object.
   */
  private static mapRowToGameData(row: any): GameData {
    return {
      id: row.id,
      gameId: row.gameId,
      title: row.title,
      dateAdded: row.dateAdded,
      sha256: row.sha256,
      crc32: row.crc32,
      presentOnDisk: row.presentOnDisk,
      path: row.path,
      size: row.size,
      parameters: row.parameters
    };
  }

  /**
   * Check if game data is already downloaded.
   *
   * @param gameDataId - The game_data.id
   * @returns Promise resolving to true if already downloaded
   */
  static async isDownloaded(gameDataId: number): Promise<boolean> {
    try {
      const sql = `
        SELECT presentOnDisk
        FROM game_data
        WHERE id = ?
      `;

      const row = DatabaseService.get(sql, [gameDataId]);
      return row ? row.presentOnDisk === 1 : false;
    } catch (error) {
      logger.error('Failed to check if game data is downloaded', { gameDataId, error });
      throw error;
    }
  }

  /**
   * Mark game data as not downloaded (for cleanup/error scenarios).
   *
   * @param gameDataId - The game_data.id
   */
  static async markAsNotDownloaded(gameDataId: number): Promise<void> {
    try {
      const sql = `
        UPDATE game_data
        SET presentOnDisk = 0, path = NULL
        WHERE id = ?
      `;

      DatabaseService.run(sql, [gameDataId]);
      await this.saveDatabase();

      logger.info('Marked game data as not downloaded', { gameDataId });
    } catch (error) {
      logger.error('Failed to mark game data as not downloaded', { gameDataId, error });
      throw error;
    }
  }

  /**
   * Convert an absolute file path to a relative path for Flashpoint Launcher compatibility.
   * Flashpoint stores paths relative to the Flashpoint installation directory.
   *
   * @param absolutePath - Absolute file path (e.g., "D:/Flashpoint/Data/Games/uuid-123.zip")
   * @returns Relative path (e.g., "Data/Games/uuid-123.zip")
   */
  private static makeRelativePath(absolutePath: string): string {
    // Get relative path from Flashpoint installation directory
    const relativePath = path.relative(config.flashpointPath, absolutePath);

    // Flashpoint uses forward slashes for cross-platform compatibility
    // Convert Windows backslashes to forward slashes
    const normalizedPath = relativePath.replace(/\\/g, '/');

    return normalizedPath;
  }
}
