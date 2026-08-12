import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { config, getExternalImageUrls } from '../config';
import { logger } from '../utils/logger';
import { writeFileAtomic } from '../utils/atomicFile';

export interface AssetDownloadProgress {
  isRunning: boolean;
  total: number;
  processed: number;
  downloaded: number;
  skipped: number;
  failed: number;
  startedAt: string | null;
  finishedAt: string | null;
  cancelled: boolean;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONCURRENCY = 4;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * Downloads game images ahead of time instead of on first view.
 *
 * Images normally arrive lazily: the proxy fetches one from the CDN when a
 * browser asks for a game the local mount lacks. That is wrong for an offline
 * host, where a metadata sync can add thousands of games whose images would
 * otherwise only appear for whoever browses to them while online.
 *
 * Runs as its own job so a slow or failing CDN never blocks a sync.
 */
export class AssetDownloadService {
  private static progress: AssetDownloadProgress = AssetDownloadService.idleProgress();
  private static cancelRequested = false;

  private static idleProgress(): AssetDownloadProgress {
    return {
      isRunning: false,
      total: 0,
      processed: 0,
      downloaded: 0,
      skipped: 0,
      failed: 0,
      startedAt: null,
      finishedAt: null,
      cancelled: false,
    };
  }

  static getProgress(): AssetDownloadProgress {
    return { ...this.progress };
  }

  static cancel(): void {
    if (this.progress.isRunning) {
      this.cancelRequested = true;
      logger.info('[AssetDownload] Cancellation requested');
    }
  }

  /**
   * Images live at Data/Images/{Logos,Screenshots}/ab/cd/{id}.png.
   *
   * Game IDs arrive from a remote API and are sliced straight into filesystem
   * paths, so anything that is not a UUID is rejected rather than joined — an id
   * containing path separators would otherwise escape the images directory.
   */
  static relativePathsFor(gameId: string): string[] {
    if (!UUID_PATTERN.test(gameId)) {
      logger.warn(`[AssetDownload] Ignoring malformed game id: ${gameId}`);
      return [];
    }

    const shard = `${gameId.substring(0, 2)}/${gameId.substring(2, 4)}`;
    return [`Logos/${shard}/${gameId}.png`, `Screenshots/${shard}/${gameId}.png`];
  }

  /**
   * Fetch any missing images for the given games.
   * Returns without starting a second run if one is already in progress.
   */
  static async downloadForGames(gameIds: readonly string[]): Promise<AssetDownloadProgress> {
    if (this.progress.isRunning) {
      logger.warn('[AssetDownload] Already running, ignoring new request');
      return this.getProgress();
    }

    const targets = gameIds.flatMap((id) => this.relativePathsFor(id));

    this.cancelRequested = false;
    this.progress = {
      ...this.idleProgress(),
      isRunning: true,
      total: targets.length,
      startedAt: new Date().toISOString(),
    };

    logger.info(
      `[AssetDownload] Starting: ${gameIds.length} game(s), ${targets.length} image(s) to check`
    );

    try {
      const baseUrls = await getExternalImageUrls();

      for (let i = 0; i < targets.length; i += CONCURRENCY) {
        if (this.cancelRequested) {
          this.progress.cancelled = true;
          break;
        }

        const batch = targets.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map((relativePath) => this.fetchOne(relativePath, baseUrls)));
      }
    } catch (error: unknown) {
      logger.error('[AssetDownload] Run failed:', error);
    } finally {
      this.progress.isRunning = false;
      this.progress.finishedAt = new Date().toISOString();
      logger.info(
        `[AssetDownload] Finished: ${this.progress.downloaded} downloaded, ` +
          `${this.progress.skipped} already present, ${this.progress.failed} failed` +
          (this.progress.cancelled ? ' (cancelled)' : '')
      );
    }

    return this.getProgress();
  }

  private static async fetchOne(relativePath: string, baseUrls: readonly string[]): Promise<void> {
    const localPath = path.join(config.flashpointImagesPath, relativePath);

    try {
      const stats = await fs.stat(localPath).catch(() => null);
      if (stats?.isFile()) {
        this.progress.skipped += 1;
        return;
      }

      for (const baseUrl of baseUrls) {
        try {
          const response = await axios.get(`${baseUrl.replace(/\/$/, '')}/${relativePath}`, {
            responseType: 'arraybuffer',
            timeout: REQUEST_TIMEOUT_MS,
            maxContentLength: MAX_IMAGE_BYTES,
            maxBodyLength: MAX_IMAGE_BYTES,
            validateStatus: (status) => status === 200,
          });

          // Write then rename so a cancelled or crashed run cannot leave a
          // half-written file that later looks present and valid.
          await writeFileAtomic(localPath, Buffer.from(response.data));

          this.progress.downloaded += 1;
          return;
        } catch {
          // Try the next mirror.
        }
      }

      // Not an error worth logging per image: most games have no screenshot.
      this.progress.failed += 1;
    } finally {
      this.progress.processed += 1;
    }
  }
}
