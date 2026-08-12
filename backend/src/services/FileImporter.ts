import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { PreferencesService } from './PreferencesService';

export class FileImporter {
  /**
   * @param filename Launcher-convention name (`{gameId}-{dateAdded timestamp}.zip`).
   *   Deriving a different name here would hide the pack from the direct-path
   *   lookup and leave one copy per download attempt on disk.
   */
  static async import(gameId: string, tempFilePath: string, filename: string): Promise<string> {
    // Landing spot in the destination directory, so the final rename is
    // same-filesystem. Copying straight to finalPath would leave a truncated
    // pack behind on failure, which later mounts pick up and treat as a
    // complete download.
    let partialPath: string | null = null;

    try {
      if (!fs.existsSync(tempFilePath)) {
        throw new Error(`Temporary file not found: ${tempFilePath}`);
      }

      const stats = await fs.promises.stat(tempFilePath);
      logger.info('Starting file import', {
        gameId,
        tempFile: tempFilePath,
        size: stats.size,
      });

      const dataPacksPath = await PreferencesService.getDataPacksPath();
      const finalPath = path.join(dataPacksPath, filename);
      partialPath = `${finalPath}.part`;

      await fs.promises.mkdir(dataPacksPath, { recursive: true });

      if (fs.existsSync(finalPath)) {
        logger.warn('Destination file already exists, overwriting', { finalPath });
      }

      await fs.promises.copyFile(tempFilePath, partialPath);

      const partialStats = await fs.promises.stat(partialPath);
      if (partialStats.size !== stats.size) {
        throw new Error(
          `File copy verification failed: size mismatch (expected ${stats.size}, got ${partialStats.size})`
        );
      }

      await fs.promises.rename(partialPath, finalPath);

      await this.cleanupTempFile(tempFilePath);

      logger.info('File import completed successfully', {
        gameId,
        finalPath,
        size: stats.size,
      });

      return finalPath;
    } catch (error) {
      if (partialPath !== null) {
        await this.cleanupTempFile(partialPath);
      }

      logger.error('File import failed', {
        gameId,
        tempFilePath,
        error,
      });

      if (error instanceof Error) {
        if (error.message.includes('ENOSPC')) {
          throw new Error(`Insufficient disk space to import file for game ${gameId}`);
        }
        if (error.message.includes('EACCES') || error.message.includes('EPERM')) {
          throw new Error(`Permission denied when importing file for game ${gameId}`);
        }
        throw new Error(`Failed to import file for game ${gameId}: ${error.message}`);
      }
      throw error;
    }
  }

  /** Logs errors but doesn't throw (cleanup is best-effort) */
  static async cleanupTempFile(tempFilePath: string): Promise<void> {
    try {
      if (fs.existsSync(tempFilePath)) {
        await fs.promises.unlink(tempFilePath);
        logger.debug('Temporary file deleted', { tempFilePath });
      }
    } catch (error) {
      logger.warn('Failed to delete temporary file', {
        tempFilePath,
        error,
      });
      // Don't throw - cleanup is best-effort
    }
  }

  /** Approximation - fs doesn't provide disk space API on all platforms */
  static async checkDiskSpace(_size: number): Promise<boolean> {
    try {
      const dataPacksPath = await PreferencesService.getDataPacksPath();
      await fs.promises.mkdir(dataPacksPath, { recursive: true });

      // On Windows, no easy disk space check without native modules - just verify write access
      const testPath = path.join(dataPacksPath, '.diskspace-test');
      await fs.promises.writeFile(testPath, 'test');
      await fs.promises.unlink(testPath);

      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOSPC')) {
        return false;
      }
      // Other errors are likely permissions, treat as space available
      return true;
    }
  }

  static async getFileSize(filePath: string): Promise<number> {
    const stats = await fs.promises.stat(filePath);
    return stats.size;
  }
}
