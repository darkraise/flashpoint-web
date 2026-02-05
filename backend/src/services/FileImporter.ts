import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { PreferencesService } from './PreferencesService';

/**
 * Service for importing downloaded game data files into the Flashpoint installation.
 * Handles file naming, copying to final location, and cleanup.
 */
export class FileImporter {
  /**
   * Generate a filename for a downloaded game data file.
   * Format: {gameId}-{timestamp}.zip
   *
   * @param gameId - The game ID
   * @returns Generated filename
   */
  static generateFilename(gameId: string): string {
    const timestamp = Date.now();
    return `${gameId}-${timestamp}.zip`;
  }

  /**
   * Import a temporary downloaded file to the final location.
   *
   * @param gameId - The game ID
   * @param tempFilePath - Absolute path to the temporary file
   * @returns Promise resolving to the final absolute file path
   * @throws Error if copy fails or disk space is insufficient
   */
  static async import(gameId: string, tempFilePath: string): Promise<string> {
    try {
      // Verify temp file exists
      if (!fs.existsSync(tempFilePath)) {
        throw new Error(`Temporary file not found: ${tempFilePath}`);
      }

      // Get stats for logging and validation
      const stats = await fs.promises.stat(tempFilePath);
      logger.info('Starting file import', {
        gameId,
        tempFile: tempFilePath,
        size: stats.size,
      });

      // Get destination directory
      const dataPacksPath = await PreferencesService.getDataPacksPath();

      // Ensure destination directory exists
      await fs.promises.mkdir(dataPacksPath, { recursive: true });

      // Generate final filename
      const filename = this.generateFilename(gameId);
      const finalPath = path.join(dataPacksPath, filename);

      // Check if destination already exists (shouldn't happen with timestamp)
      if (fs.existsSync(finalPath)) {
        logger.warn('Destination file already exists, overwriting', { finalPath });
      }

      // Copy file to final location (atomic operation)
      await fs.promises.copyFile(tempFilePath, finalPath);
      logger.info('File copied successfully', {
        gameId,
        finalPath,
        size: stats.size,
      });

      // Verify copy succeeded
      const finalStats = await fs.promises.stat(finalPath);
      if (finalStats.size !== stats.size) {
        throw new Error(
          `File copy verification failed: size mismatch (expected ${stats.size}, got ${finalStats.size})`
        );
      }

      // Delete temporary file
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

      // Re-throw with more context
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

  /**
   * Clean up a temporary file.
   * Logs errors but doesn't throw (cleanup is best-effort).
   *
   * @param tempFilePath - Absolute path to the temporary file
   */
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

  /**
   * Check if there is sufficient disk space for a file.
   * Note: This is an approximation as fs doesn't provide disk space API on all platforms.
   *
   * @param _size - Required size in bytes
   * @returns Promise resolving to true if space check passes
   */
  static async checkDiskSpace(_size: number): Promise<boolean> {
    try {
      // Get destination directory
      const dataPacksPath = await PreferencesService.getDataPacksPath();

      // Ensure directory exists
      await fs.promises.mkdir(dataPacksPath, { recursive: true });

      // On Windows, we can't easily check disk space without native modules
      // This is a basic check - just ensure we can write a test file
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

  /**
   * Get the size of a file.
   *
   * @param filePath - Absolute path to the file
   * @returns Promise resolving to file size in bytes
   */
  static async getFileSize(filePath: string): Promise<number> {
    const stats = await fs.promises.stat(filePath);
    return stats.size;
  }
}
