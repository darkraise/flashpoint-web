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
  private static pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

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
    // Cancel any pending cleanup timer from a previous download of the same game
    this.cancelTimer(gameId);
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
      this.scheduleRemoval(gameId, entry.startedAt);
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
      this.scheduleRemoval(gameId, entry.startedAt);
    }
  }

  /**
   * Schedule removal of an entry after a delay, verifying entry identity
   * to prevent deleting a newer entry for the same gameId.
   */
  private static scheduleRemoval(gameId: string, startedAt: number): void {
    this.cancelTimer(gameId);
    const timer = setTimeout(() => {
      this.pendingTimers.delete(gameId);
      const current = this.activeDownloads.get(gameId);
      // Only delete if the entry is the same one we marked (not a newer download)
      if (current && current.startedAt === startedAt) {
        this.activeDownloads.delete(gameId);
      }
    }, 5000);
    timer.unref();
    this.pendingTimers.set(gameId, timer);
  }

  /**
   * Cancel a pending cleanup timer for a gameId.
   */
  private static cancelTimer(gameId: string): void {
    const existing = this.pendingTimers.get(gameId);
    if (existing) {
      clearTimeout(existing);
      this.pendingTimers.delete(gameId);
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
   * Clear all entries and cancel pending timers (for testing/cleanup).
   */
  static clear(): void {
    for (const timer of this.pendingTimers.values()) {
      clearTimeout(timer);
    }
    this.pendingTimers.clear();
    this.activeDownloads.clear();
    logger.debug('[DownloadRegistry] Cleared all entries');
  }
}
