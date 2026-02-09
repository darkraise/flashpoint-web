import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { PreferencesService } from './PreferencesService';

export class FileImporter {
  /** Format: {gameId}-{timestamp}.zip */
  static generateFilename(gameId: string): string {
    const timestamp = Date.now();
    return `${gameId}-${timestamp}.zip`;
  }

  static async import(gameId: string, tempFilePath: string): Promise<string> {
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
      await fs.promises.mkdir(dataPacksPath, { recursive: true });

      const filename = this.generateFilename(gameId);
      const finalPath = path.join(dataPacksPath, filename);

      if (fs.existsSync(finalPath)) {
        logger.warn('Destination file already exists, overwriting', { finalPath });
      }

      await fs.promises.copyFile(tempFilePath, finalPath);
      logger.info('File copied successfully', {
        gameId,
        finalPath,
        size: stats.size,
      });

      const finalStats = await fs.promises.stat(finalPath);
      if (finalStats.size !== stats.size) {
        throw new Error(
          `File copy verification failed: size mismatch (expected ${stats.size}, got ${finalStats.size})`
        );
      }

      await this.cleanupTempFile(tempFilePath);

      logger.info('File import completed successfully', {
        gameId,
        finalPath,
      });

      return finalPath;
    } catch (error) {
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
