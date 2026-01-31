import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { logger } from '../utils/logger';
import { config } from '../config';
import { DatabaseService } from './DatabaseService';

/**
 * Service for managing game data ZIP files
 * Handles auto-mounting of ZIP files for games with game data
 */
export class GameDataService {
  /**
   * Mount the ZIP file for a game if it has game data
   * @param gameId The game's UUID
   * @returns true if ZIP was mounted or already mounted, false if no ZIP found
   */
  async mountGameZip(gameId: string): Promise<boolean> {
    try {
      const mountId = gameId;

      // Find ZIP file in Data/Games/ directory
      // ZIP files are named: {gameId}-{timestamp}.zip
      const gamesPath = config.flashpointGamesPath;
      const files = await fs.readdir(gamesPath);

      // Look for ZIP file starting with gameId
      const zipPattern = `${gameId}-`;
      const zipFile = files.find(f =>
        f.startsWith(zipPattern) && f.endsWith('.zip')
      );

      if (!zipFile) {
        logger.warn(`[GameDataService] No ZIP file found for game ${gameId}`);
        return false;
      }

      const zipPath = path.join(gamesPath, zipFile);

      logger.info(`[GameDataService] Requesting game-service to mount ZIP for game ${gameId}: ${zipFile}`);

      // Call game-service API to mount the ZIP
      const gameZipServerUrl = config.gameServiceGameZipUrl || 'http://localhost:22501';
      try {
        const response = await axios.post(`${gameZipServerUrl}/mount/${mountId}`, {
          zipPath: zipPath
        }, {
          timeout: 5000,
          validateStatus: (status) => status === 200 || status === 409 // 409 = already mounted
        });

        if (response.status === 409) {
          logger.debug(`[GameDataService] ZIP already mounted for game ${gameId}`);
        }

        logger.info(`[GameDataService] ✓ ZIP mounted successfully for game ${gameId}`);
        return true;
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 409) {
          // Already mounted
          logger.debug(`[GameDataService] ZIP already mounted for game ${gameId}`);
          return true;
        }
        logger.error(`[GameDataService] Failed to mount ZIP via game-service:`, error);
        return false;
      }

    } catch (error) {
      logger.error(`[GameDataService] Error mounting ZIP for game ${gameId}:`, error);
      return false;
    }
  }

  /**
   * Mount ZIP files for multiple games
   * @param activeDataIds Array of activeDataId values
   */
  async mountMultipleGameZips(activeDataIds: number[]): Promise<void> {
    logger.info(`[GameDataService] Mounting ${activeDataIds.length} game ZIPs...`);

    // Fetch game data for each activeDataId to get gameId
    const gameDataPromises = activeDataIds.map(async (activeDataId) => {
      const sql = 'SELECT gameId FROM game_data WHERE id = ?';
      const result = DatabaseService.get(sql, [activeDataId]);
      return result ? { gameId: result.gameId, activeDataId } : null;
    });

    const gameDataResults = await Promise.allSettled(gameDataPromises);
    const validGameData = gameDataResults
      .filter((r): r is PromiseFulfilledResult<{ gameId: string; activeDataId: number } | null> => r.status === 'fulfilled' && r.value !== null)
      .map(r => r.value!);

    const results = await Promise.allSettled(
      validGameData.map(({ gameId }) => this.mountGameZip(gameId))
    );

    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failed = results.length - succeeded;

    logger.info(`[GameDataService] Mounted ${succeeded}/${results.length} game ZIPs (${failed} failed)`);
  }

  /**
   * Get list of all available game data ZIP files
   */
  async listAvailableGameDataZips(): Promise<Array<{ activeDataId: number; filename: string; size: number }>> {
    try {
      const gamesPath = config.flashpointGamesPath;
      const files = await fs.readdir(gamesPath);

      const zipFiles = [];

      for (const file of files) {
        if (file.endsWith('.zip')) {
          // Extract activeDataId from filename (format: {id}-{timestamp}.zip)
          const match = file.match(/^(\d+)-\d+\.zip$/);
          if (match) {
            const activeDataId = parseInt(match[1], 10);
            const filePath = path.join(gamesPath, file);
            const stats = await fs.stat(filePath);

            zipFiles.push({
              activeDataId,
              filename: file,
              size: stats.size
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
