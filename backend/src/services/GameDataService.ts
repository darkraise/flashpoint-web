import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';
import { config } from '../config';
import { DatabaseService } from './DatabaseService';
import { gameZipServer } from '../game/gamezipserver';
import { GameDataDownloader } from '../game/services/GameDataDownloader';

/**
 * Game data entry from the Flashpoint database
 */
interface GameDataEntry {
  id: number;
  gameId: string;
  dateAdded: string;
  sha256: string;
  path: string | null;
  presentOnDisk: number;
}

/**
 * Service for managing game data ZIP files
 * Handles auto-mounting of ZIP files for games with game data
 */
export class GameDataService {
  /**
   * Get game data entry from the Flashpoint database
   */
  private getGameDataEntry(gameId: string): GameDataEntry | null {
    try {
      const sql = `
        SELECT id, gameId, dateAdded, sha256, path, presentOnDisk
        FROM game_data
        WHERE gameId = ?
        ORDER BY id DESC
        LIMIT 1
      `;

      const result = DatabaseService.get(sql, [gameId]) as GameDataEntry | null;
      return result;
    } catch (error) {
      logger.error(`[GameDataService] Error getting game data entry for ${gameId}:`, error);
      return null;
    }
  }

  /**
   * Mount the ZIP file for a game if it has game data.
   * Calls gameZipServer directly (in-process, no HTTP).
   * If the ZIP doesn't exist locally, triggers background download
   * from the configured gameDataSources in preferences.json.
   *
   * @param gameId The game's UUID
   * @returns { mounted: true } if ZIP is mounted and ready,
   *          { downloading: true } if a background download was started,
   *          { mounted: false, downloading: false } if no ZIP could be found
   */
  async mountGameZip(gameId: string): Promise<{ mounted: boolean; downloading: boolean }> {
    try {
      const mountId = gameId;
      const gamesPath = config.flashpointGamesPath;

      // Get game data entry from database to get dateAdded and sha256
      const gameDataEntry = this.getGameDataEntry(gameId);

      // Build ZIP path - try direct path first when we have dateAdded
      let zipPath: string | null = null;

      // Try direct path first when we have enough info (avoids expensive readdir)
      if (gameDataEntry?.dateAdded) {
        try {
          const expectedFilename = GameDataDownloader.getFilename(gameId, gameDataEntry.dateAdded);
          const expectedPath = path.join(gamesPath, expectedFilename);
          await fs.access(expectedPath);
          // File exists at expected path - use it directly
          zipPath = expectedPath;
          logger.debug(`[GameDataService] Found ZIP at expected path: ${expectedFilename}`);
        } catch {
          // Expected file not found, fall through to readdir
          logger.debug(`[GameDataService] Expected ZIP not found, trying readdir fallback`);
        }
      }

      // Only readdir as fallback when direct path doesn't exist
      if (!zipPath) {
        let files: string[];
        try {
          files = await fs.readdir(gamesPath);
        } catch (err) {
          logger.warn(`[GameDataService] Cannot read games directory: ${gamesPath}`, err);
          // Fall through to attempt download via gameZipServer
          files = [];
        }
        const zipPattern = `${gameId}-`;
        const zipFile = files.find((f) => f.startsWith(zipPattern) && f.endsWith('.zip'));

        if (zipFile) {
          zipPath = path.join(gamesPath, zipFile);
        } else if (gameDataEntry?.dateAdded) {
          // Use GameDataDownloader.getFilename() to construct expected filename
          const expectedFilename = GameDataDownloader.getFilename(gameId, gameDataEntry.dateAdded);
          zipPath = path.join(gamesPath, expectedFilename);
          logger.info(
            `[GameDataService] ZIP not found locally, will request download: ${expectedFilename}`
          );
        } else {
          logger.warn(`[GameDataService] No ZIP file found and no game data entry for ${gameId}`);
          return { mounted: false, downloading: false };
        }
      }

      logger.info(`[GameDataService] Mounting ZIP for game ${gameId}`);

      // Direct call to gameZipServer (in-process, no HTTP)
      const result = await gameZipServer.mountZip({
        id: mountId,
        zipPath,
        gameId: gameDataEntry?.gameId || gameId,
        dateAdded: gameDataEntry?.dateAdded,
        sha256: gameDataEntry?.sha256,
      });

      if (result.downloading) {
        logger.info(`[GameDataService] Download started in background for game ${gameId}`);
        return { mounted: false, downloading: true };
      } else if (result.success) {
        logger.info(`[GameDataService] ✓ ZIP mounted successfully for game ${gameId}`);
        return { mounted: true, downloading: false };
      } else {
        logger.warn(
          `[GameDataService] Mount failed for game ${gameId} (status: ${result.statusCode})`
        );
        return { mounted: false, downloading: false };
      }
    } catch (error) {
      logger.error(`[GameDataService] Error mounting ZIP for game ${gameId}:`, error);
      return { mounted: false, downloading: false };
    }
  }

  /**
   * Mount ZIP files for multiple games
   * @param activeDataIds Array of activeDataId values
   */
  async mountMultipleGameZips(activeDataIds: number[]): Promise<void> {
    logger.info(`[GameDataService] Mounting ${activeDataIds.length} game ZIPs...`);

    if (activeDataIds.length === 0) return;

    // Batch query: single IN clause instead of N individual queries
    const placeholders = activeDataIds.map(() => '?').join(', ');
    const rows = DatabaseService.all(
      `SELECT id, gameId FROM game_data WHERE id IN (${placeholders})`,
      activeDataIds
    ) as Array<{ id: number; gameId: string }>;

    const validGameData = rows.map((r) => ({ gameId: r.gameId, activeDataId: r.id }));

    const results = await Promise.allSettled(
      validGameData.map(({ gameId }) => this.mountGameZip(gameId))
    );

    const succeeded = results.filter(
      (r) => r.status === 'fulfilled' && (r.value.mounted || r.value.downloading)
    ).length;
    const failed = results.length - succeeded;

    logger.info(
      `[GameDataService] Mounted ${succeeded}/${results.length} game ZIPs (${failed} failed)`
    );
  }

  /**
   * Get list of all available game data ZIP files
   */
  async listAvailableGameDataZips(): Promise<
    Array<{ activeDataId: number; filename: string; size: number }>
  > {
    try {
      const gamesPath = config.flashpointGamesPath;
      const files = await fs.readdir(gamesPath);

      const zipFiles = [];

      for (const file of files) {
        if (file.endsWith('.zip')) {
          // Extract gameId from filename (format: {gameId}-{timestamp}.zip)
          // gameId is a UUID, not a numeric ID
          const match = file.match(
            /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-(\d+)\.zip$/i
          );
          if (match) {
            const gameId = match[1];
            const filePath = path.join(gamesPath, file);
            const stats = await fs.stat(filePath);

            // Note: This returns gameId instead of activeDataId
            // The return type would need to be updated if this is actually used
            zipFiles.push({
              activeDataId: 0, // Placeholder - would need to query database
              filename: file,
              size: stats.size,
            });
          }
        }
      }

      return zipFiles;
    } catch (error) {
      logger.error('[GameDataService] Error listing game data ZIPs:', error);
      return [];
    }
  }
}

// Singleton instance
export const gameDataService = new GameDataService();
