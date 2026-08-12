import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/logger';
import { config } from '../config';
import { DatabaseService } from './DatabaseService';
import { gameZipServer } from '../game/gamezipserver';
import { GameDataDownloader } from '../game/services/GameDataDownloader';
import { HashValidator } from './HashValidator';

interface GameDataEntry {
  id: number;
  gameId: string;
  dateAdded: string;
  sha256: string;
  path: string | null;
  presentOnDisk: number;
}

export class GameDataService {
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
   * Calls gameZipServer directly (in-process, no HTTP).
   * If ZIP doesn't exist locally, triggers background download from gameDataSources.
   *
   * @returns { mounted: true } if ready, { downloading: true } if download started,
   *          { mounted: false, downloading: false } if no ZIP could be found
   *
   * @param options.allowRecovery Quarantine and re-download a ZIP that fails to
   *   mount and does not match its recorded hash. Only for user-triggered
   *   launches: on the bulk startup mount it would turn a transient storage
   *   fault into a re-download of the entire library.
   */
  async mountGameZip(
    gameId: string,
    options: { allowRecovery?: boolean } = {}
  ): Promise<{ mounted: boolean; downloading: boolean }> {
    try {
      const mountId = gameId;
      const gamesPath = config.flashpointGamesPath;

      const gameDataEntry = this.getGameDataEntry(gameId);
      let zipPath: string | null = null;

      // Try direct path first to avoid expensive readdir
      if (gameDataEntry?.dateAdded) {
        try {
          const expectedFilename = GameDataDownloader.getFilename(gameId, gameDataEntry.dateAdded);
          const expectedPath = path.join(gamesPath, expectedFilename);
          await fs.access(expectedPath);
          zipPath = expectedPath;
          logger.debug(`[GameDataService] Found ZIP at expected path: ${expectedFilename}`);
        } catch {
          logger.debug(`[GameDataService] Expected ZIP not found, trying readdir fallback`);
        }
      }

      if (!zipPath) {
        let files: string[];
        try {
          files = await fs.readdir(gamesPath);
        } catch (err) {
          logger.warn(`[GameDataService] Cannot read games directory: ${gamesPath}`, err);
          files = [];
        }
        const zipPattern = `${gameId}-`;
        const zipFile = files.find((f) => f.startsWith(zipPattern) && f.endsWith('.zip'));

        if (zipFile) {
          zipPath = path.join(gamesPath, zipFile);
        } else if (gameDataEntry?.dateAdded) {
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

      const result = await gameZipServer.mountZip({
        id: mountId,
        zipPath,
        gameId: gameDataEntry?.gameId ?? gameId,
        dateAdded: gameDataEntry?.dateAdded,
        sha256: gameDataEntry?.sha256,
        gameDataId: gameDataEntry?.id,
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

        if (options.allowRecovery && gameDataEntry?.sha256) {
          const quarantined = await this.quarantineCorruptZip(
            gameId,
            zipPath,
            gameDataEntry.sha256
          );
          if (quarantined) {
            // The bad pack is gone, so this pass reaches the download branch.
            // Recovery is off to bound it to a single attempt.
            return this.mountGameZip(gameId, { allowRecovery: false });
          }
        }

        return { mounted: false, downloading: false };
      }
    } catch (error) {
      logger.error(`[GameDataService] Error mounting ZIP for game ${gameId}:`, error);
      return { mounted: false, downloading: false };
    }
  }

  /**
   * Move a ZIP aside when it fails to mount AND its content does not match the
   * recorded hash. A hash match means the mount failed for some other reason,
   * and the Launcher writes this directory too, so anything unverified is left
   * untouched rather than deleted.
   */
  private async quarantineCorruptZip(
    gameId: string,
    zipPath: string,
    expectedSha256: string
  ): Promise<boolean> {
    try {
      if (await HashValidator.validate(zipPath, expectedSha256)) {
        logger.warn(
          `[GameDataService] ZIP for ${gameId} matches its hash; leaving it in place despite the mount failure`
        );
        return false;
      }
    } catch (error) {
      logger.warn(`[GameDataService] Could not hash ${zipPath}, leaving it in place:`, error);
      return false;
    }

    // Windows refuses the rename while the ZIP handle is still open.
    await gameZipServer.unmountZip(gameId);

    const quarantinePath = `${zipPath}.corrupt`;
    try {
      await fs.rm(quarantinePath, { force: true });
      await fs.rename(zipPath, quarantinePath);
      logger.warn(`[GameDataService] Quarantined corrupt game data: ${zipPath}`);
      return true;
    } catch (error) {
      logger.error(`[GameDataService] Failed to quarantine ${zipPath}:`, error);
      return false;
    }
  }

  async mountMultipleGameZips(activeDataIds: number[]): Promise<void> {
    logger.info(`[GameDataService] Mounting ${activeDataIds.length} game ZIPs...`);

    if (activeDataIds.length === 0) return;

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

  async listAvailableGameDataZips(): Promise<
    Array<{ activeDataId: number; filename: string; size: number }>
  > {
    try {
      const gamesPath = config.flashpointGamesPath;
      const files = await fs.readdir(gamesPath);

      const zipFiles = [];

      for (const file of files) {
        if (file.endsWith('.zip')) {
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

export const gameDataService = new GameDataService();
