import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { GameDataSource } from './PreferencesService';
import { HashValidator } from './HashValidator';
import { FileImporter } from './FileImporter';
import { GameDatabaseUpdater, GameData } from './GameDatabaseUpdater';

export interface DownloadProgress {
  percent: number;
  status: 'waiting' | 'downloading' | 'validating' | 'importing' | 'complete' | 'error';
  details: string;
  error?: string;
}

export interface DownloadDetails {
  gameId: string;
  gameDataId: number;
  filename: string;
  source: string;
  bytesDownloaded: number;
  totalBytes: number;
}

type ProgressCallback = (percent: number) => void;
type DetailsCallback = (details: DownloadDetails) => void;

/**
 * Main download orchestration service.
 * Handles downloading game data from configured sources with fallback,
 * progress tracking, hash validation, and database updates.
 */
export class DownloadManager {
  private static readonly TEMP_DIR = path.join(process.cwd(), 'backend', 'temp-downloads');
  private static readonly DOWNLOAD_TIMEOUT_MS = 300000; // 5 minutes per source
  private static readonly MAX_RETRIES = 3;

  // Track active downloads to prevent duplicates
  private static activeDownloads: Map<number, AbortController> = new Map();

  /**
   * Download game data from configured sources.
   * Tries each source sequentially until success.
   *
   * @param gameDataId - The game_data.id to download
   * @param sources - Array of game data sources to try
   * @param onProgress - Optional callback for progress updates (0-100)
   * @param onDetails - Optional callback for detailed progress info
   * @param abortSignal - Optional AbortSignal for cancellation
   * @returns Promise resolving to final file path
   * @throws Error with collected errors from all sources if all fail
   */
  static async downloadGameData(
    gameDataId: number,
    sources: GameDataSource[],
    onProgress?: ProgressCallback,
    onDetails?: DetailsCallback,
    abortSignal?: AbortSignal
  ): Promise<string> {
    // Check if already downloading
    if (this.activeDownloads.has(gameDataId)) {
      throw new Error(`Game data ${gameDataId} is already being downloaded`);
    }

    // Check if already downloaded
    const isDownloaded = await GameDatabaseUpdater.isDownloaded(gameDataId);
    if (isDownloaded) {
      logger.info('Game data already downloaded', { gameDataId });
      throw new Error(`Game data ${gameDataId} is already downloaded`);
    }

    // Create abort controller for this download
    const controller = new AbortController();
    this.activeDownloads.set(gameDataId, controller);

    // Chain external abort signal if provided
    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        controller.abort();
      });
    }

    try {
      // Ensure temp directory exists
      await this.ensureTempDir();

      // Get game data info from database
      const gameData = await GameDatabaseUpdater.getGameData(gameDataId);
      if (!gameData) {
        throw new Error(`Game data not found: ${gameDataId}`);
      }

      // Generate filename
      const filename = this.getGameDataFilename(gameData);
      const tempFilePath = path.join(this.TEMP_DIR, `${gameData.gameId}.zip.temp`);

      logger.info('Starting download workflow', {
        gameDataId,
        gameId: gameData.gameId,
        filename,
        sourceCount: sources.length,
      });

      // Collect errors from failed sources
      const errors: Array<{ source: string; error: string }> = [];

      // Try each source sequentially
      for (let i = 0; i < sources.length; i++) {
        const source = sources[i];

        try {
          logger.info(`Attempting download from source ${i + 1}/${sources.length}`, {
            source: source.name,
            gameDataId,
          });

          // Update progress
          onProgress?.(0);
          onDetails?.({
            gameId: gameData.gameId,
            gameDataId,
            filename,
            source: source.name,
            bytesDownloaded: 0,
            totalBytes: 0,
          });

          // Construct URL
          const url = new URL(filename, source.arguments[0]).href;
          logger.debug('Download URL constructed', { url, source: source.name });

          // Download to temp file
          await this.downloadFile(url, tempFilePath, controller.signal, (downloaded, total) => {
            const percent = total > 0 ? Math.floor((downloaded / total) * 100) : 0;
            onProgress?.(percent);
            onDetails?.({
              gameId: gameData.gameId,
              gameDataId,
              filename,
              source: source.name,
              bytesDownloaded: downloaded,
              totalBytes: total,
            });
          });

          logger.info('Download completed, validating hash', {
            gameDataId,
            source: source.name,
          });

          // Update status to validating
          onDetails?.({
            gameId: gameData.gameId,
            gameDataId,
            filename,
            source: source.name,
            bytesDownloaded: 0,
            totalBytes: 0,
          });

          // Validate hash
          await HashValidator.validateOrThrow(tempFilePath, gameData.sha256, source.name);

          logger.info('Hash validation successful, importing file', {
            gameDataId,
            source: source.name,
          });

          // Import to final location
          const finalPath = await FileImporter.import(gameData.gameId, tempFilePath);

          // Update database
          await GameDatabaseUpdater.markAsDownloaded(gameDataId, finalPath);

          logger.info('Download workflow completed successfully', {
            gameDataId,
            finalPath,
            source: source.name,
          });

          // Success! Return final path
          return finalPath;
        } catch (error) {
          // Collect error and try next source
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger.warn(`Download failed from source: ${source.name}`, {
            gameDataId,
            error: errorMessage,
          });

          errors.push({
            source: source.name,
            error: errorMessage,
          });

          // Clean up temp file for next attempt
          await FileImporter.cleanupTempFile(tempFilePath);

          // If this was an abort, don't try other sources
          if (controller.signal.aborted) {
            throw new Error('Download cancelled');
          }

          // Continue to next source
          continue;
        }
      }

      // All sources failed
      const errorSummary = errors.map((e) => `${e.source}: ${e.error}`).join('\n');

      throw new Error(
        `Failed to download game data from all ${sources.length} sources:\n${errorSummary}`
      );
    } finally {
      // Clean up
      this.activeDownloads.delete(gameDataId);
    }
  }

  /**
   * Download a file from URL to local path with progress tracking.
   *
   * @param url - URL to download from
   * @param destPath - Destination file path
   * @param abortSignal - AbortSignal for cancellation
   * @param onProgress - Progress callback (bytesDownloaded, totalBytes)
   */
  private static async downloadFile(
    url: string,
    destPath: string,
    abortSignal: AbortSignal,
    onProgress?: (downloaded: number, total: number) => void
  ): Promise<void> {
    const response = await axios.get(url, {
      responseType: 'stream',
      timeout: this.DOWNLOAD_TIMEOUT_MS,
      signal: abortSignal as any,
      headers: {
        'User-Agent': 'Flashpoint-WebApp/1.0',
      },
    });

    const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
    let downloadedBytes = 0;

    const writer = fs.createWriteStream(destPath);

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk: Buffer) => {
        downloadedBytes += chunk.length;
        onProgress?.(downloadedBytes, totalBytes);
      });

      response.data.on('end', () => {
        writer.end();
      });

      writer.on('finish', () => {
        resolve();
      });

      writer.on('error', (error) => {
        reject(new Error(`Failed to write file: ${error.message}`));
      });

      response.data.on('error', (error: Error) => {
        writer.destroy();
        reject(new Error(`Download stream error: ${error.message}`));
      });

      abortSignal.addEventListener('abort', () => {
        response.data.destroy();
        writer.destroy();
        reject(new Error('Download cancelled'));
      });

      response.data.pipe(writer);
    });
  }

  /**
   * Cancel an active download.
   *
   * @param gameDataId - The game_data.id of the download to cancel
   * @returns True if download was cancelled, false if not found
   */
  static cancelDownload(gameDataId: number): boolean {
    const controller = this.activeDownloads.get(gameDataId);
    if (controller) {
      controller.abort();
      this.activeDownloads.delete(gameDataId);
      logger.info('Download cancelled', { gameDataId });
      return true;
    }
    return false;
  }

  /**
   * Check if a download is currently active.
   *
   * @param gameDataId - The game_data.id to check
   * @returns True if download is active
   */
  static isDownloadActive(gameDataId: number): boolean {
    return this.activeDownloads.has(gameDataId);
  }

  /**
   * Get count of active downloads.
   */
  static getActiveDownloadCount(): number {
    return this.activeDownloads.size;
  }

  /**
   * Ensure temp directory exists.
   */
  private static async ensureTempDir(): Promise<void> {
    try {
      await fs.promises.mkdir(this.TEMP_DIR, { recursive: true });
    } catch (error) {
      logger.error('Failed to create temp directory', { error });
      throw new Error('Failed to create temporary download directory');
    }
  }

  /**
   * Generate filename for game data file.
   * Matches Flashpoint Launcher's getGameDataFilename function.
   * Formula: {gameId}-{timestamp from dateAdded}.zip
   */
  private static getGameDataFilename(gameData: GameData): string {
    // If file already exists on disk, use its filename
    if (gameData.path) {
      return path.basename(gameData.path);
    }

    // Generate filename using dateAdded timestamp (matches launcher logic)
    // The launcher uses: `${data.gameId}-${(new Date(cleanDate)).getTime()}.zip`
    const cleanDate = gameData.dateAdded.includes('T')
      ? gameData.dateAdded
      : `${gameData.dateAdded} +0000 UTC`;
    const timestamp = new Date(cleanDate).getTime();

    return `${gameData.gameId}-${timestamp}.zip`;
  }
}
