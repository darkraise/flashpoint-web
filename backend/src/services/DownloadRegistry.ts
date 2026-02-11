import { logger } from '../utils/logger';

export interface DownloadEntry {
  gameId: string;
  gameDataId?: number;
  source: 'download-manager' | 'game-zip-server';
  startedAt: number;
  status: 'downloading' | 'completed' | 'failed';
}

/**
 * Shared registry for tracking downloads across different download systems.
 * Provides cross-system visibility and duplicate prevention for game data downloads.
 *
 * Two download systems register here:
 * - DownloadManager: REST API downloads (keyed by gameDataId)
 * - GameZipServer: On-demand content serving downloads (keyed by gameId)
 */
export class DownloadRegistry {
  private static activeDownloads = new Map<string, DownloadEntry>();

  /**
   * Register a download. Returns false if already downloading (duplicate prevention).
   *
   * @param gameId - The game ID (used as primary key)
   * @param entry - Download metadata (source, gameDataId if available)
   * @returns True if registered, false if duplicate
   */
  static register(gameId: string, entry: Omit<DownloadEntry, 'startedAt' | 'status'>): boolean {
    if (this.activeDownloads.has(gameId)) {
      logger.debug(`[DownloadRegistry] Download already in progress for ${gameId}`);
      return false;
    }
    this.activeDownloads.set(gameId, {
      ...entry,
      startedAt: Date.now(),
      status: 'downloading',
    });
    logger.debug(
      `[DownloadRegistry] Registered download: ${gameId} from ${entry.source} (gameDataId: ${entry.gameDataId ?? 'N/A'})`
    );
    return true;
  }

  /**
   * Mark a download as completed.
   *
   * @param gameId - The game ID
   */
  static complete(gameId: string): void {
    const entry = this.activeDownloads.get(gameId);
    if (entry) {
      entry.status = 'completed';
      logger.debug(`[DownloadRegistry] Download completed: ${gameId}`);
      // Remove after short delay to allow SSE clients to see completion status
      setTimeout(() => {
        this.activeDownloads.delete(gameId);
      }, 5000);
    }
  }

  /**
   * Mark a download as failed.
   *
   * @param gameId - The game ID
   */
  static fail(gameId: string): void {
    const entry = this.activeDownloads.get(gameId);
    if (entry) {
      entry.status = 'failed';
      logger.debug(`[DownloadRegistry] Download failed: ${gameId}`);
      // Remove after short delay to allow SSE clients to see failure status
      setTimeout(() => {
        this.activeDownloads.delete(gameId);
      }, 5000);
    }
  }

  /**
   * Check if a download is currently active by game ID.
   *
   * @param gameId - The game ID to check
   * @returns True if download is active
   */
  static isActive(gameId: string): boolean {
    const entry = this.activeDownloads.get(gameId);
    return entry !== undefined && entry.status === 'downloading';
  }

  /**
   * Check if a download is currently active by game data ID.
   * Used by SSE endpoint to check GameZipServer downloads.
   *
   * @param gameDataId - The game_data.id to check
   * @returns True if download is active
   */
  static isActiveByDataId(gameDataId: number): boolean {
    for (const entry of this.activeDownloads.values()) {
      if (entry.gameDataId === gameDataId && entry.status === 'downloading') {
        return true;
      }
    }
    return false;
  }

  /**
   * Get all active downloads.
   *
   * @returns Map of gameId to download entry
   */
  static getActive(): Map<string, DownloadEntry> {
    return new Map(this.activeDownloads);
  }

  /**
   * Get a specific download entry.
   *
   * @param gameId - The game ID
   * @returns Download entry or undefined
   */
  static getEntry(gameId: string): DownloadEntry | undefined {
    return this.activeDownloads.get(gameId);
  }

  /**
   * Get the count of active downloads.
   *
   * @returns Number of active downloads
   */
  static getActiveCount(): number {
    let count = 0;
    for (const entry of this.activeDownloads.values()) {
      if (entry.status === 'downloading') {
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all entries (for testing/cleanup).
   */
  static clear(): void {
    this.activeDownloads.clear();
    logger.debug('[DownloadRegistry] Cleared all entries');
  }
}
