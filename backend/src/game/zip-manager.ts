import StreamZip from 'node-stream-zip';
import path from 'path';
import fs from 'fs/promises';
import { LRUCache } from 'lru-cache';
import { logger } from '../utils/logger';
import { sanitizeErrorMessage } from './utils/pathSecurity';
import { MAX_BUFFERED_FILE_SIZE } from './config';

interface MountedZip {
  id: string;
  zipPath: string;
  zip: StreamZip.StreamZipAsync;
  mountTime: Date;
  entryIndex: Set<string>; // Set of all entry names for O(1) lookup
}

export class ZipManager {
  // Use LRU cache to prevent memory leaks from unlimited ZIP mounts
  // Max 100 concurrent mounts, 30-minute TTL, auto-close on eviction
  private mountedZips: LRUCache<string, MountedZip>;
  private mountingInProgress = new Set<string>();
  private pendingCloses: Set<Promise<void>> = new Set();
  private shuttingDown = false;

  constructor() {
    this.mountedZips = new LRUCache<string, MountedZip>({
      max: 100, // Maximum 100 ZIPs mounted simultaneously
      ttl: 30 * 60 * 1000, // 30-minute TTL
      dispose: async (value, key) => {
        // Automatically close ZIP when evicted from cache
        // Track the close operation to ensure cleanup completes
        const closePromise = (async () => {
          try {
            logger.info(`[ZipManager] Auto-closing evicted ZIP: ${key}`);
            await value.zip.close();
          } catch (error) {
            logger.error(`[ZipManager] Error closing evicted ZIP ${key}:`, error);
          }
        })();

        this.pendingCloses.add(closePromise);
        closePromise.finally(() => {
          this.pendingCloses.delete(closePromise);
        });
      },
      // Update access time on get
      updateAgeOnGet: true,
      // Don't update on has() check
      updateAgeOnHas: false,
    });
  }

  /**
   * Mount a ZIP file for serving
   * @param id Unique identifier for this mount (e.g., game data ID)
   * @param zipPath Absolute path to the ZIP file
   */
  async mount(id: string, zipPath: string): Promise<void> {
    // Check if shutting down
    if (this.shuttingDown) {
      throw new Error('ZipManager is shutting down');
    }

    // Check if already mounted
    if (this.mountedZips.has(id)) {
      logger.debug(`[ZipManager] ZIP already mounted: ${id}`);
      return;
    }

    // Check if currently mounting
    if (this.mountingInProgress.has(id)) {
      logger.debug(`[ZipManager] ZIP mount already in progress: ${id}`);
      return;
    }

    this.mountingInProgress.add(id);

    try {
      // Verify ZIP file exists
      try {
        await fs.access(zipPath);
      } catch (error) {
        // Don't expose full path in error message (G-H4)
        logger.error(`[ZipManager] ZIP file not found: ${zipPath}`);
        throw new Error('ZIP file not found');
      }

      logger.info(`[ZipManager] Mounting ZIP: ${id} -> ${zipPath}`);

      // Create ZIP reader
      const zip = new StreamZip.async({ file: zipPath });

      try {
        // Build entry index for O(1) lookup
        const entries = await zip.entries();
        const entryIndex = new Set(Object.keys(entries));

        // Store mounted ZIP
        this.mountedZips.set(id, {
          id,
          zipPath,
          zip,
          mountTime: new Date(),
          entryIndex,
        });

        logger.info(`[ZipManager] ✓ Mounted ZIP: ${id} (${entryIndex.size} files)`);
      } catch (innerError) {
        // Close the ZIP handle if mounting fails
        await zip.close().catch(() => {});
        throw innerError;
      }
    } finally {
      this.mountingInProgress.delete(id);
    }
  }

  /**
   * Unmount a ZIP file
   * @param id Unique identifier of the mounted ZIP
   */
  async unmount(id: string): Promise<boolean> {
    const mounted = this.mountedZips.peek(id);
    if (!mounted) {
      logger.warn(`[ZipManager] ZIP not mounted: ${id}`);
      return false;
    }

    logger.info(`[ZipManager] Unmounting ZIP: ${id}`);

    try {
      await mounted.zip.close();
      this.mountedZips.delete(id);
      logger.info(`[ZipManager] ✓ Unmounted ZIP: ${id}`);
      return true;
    } catch (error) {
      logger.error(`[ZipManager] Error unmounting ZIP: ${id}`, error);
      return false;
    }
  }

  /**
   * Get a file from a mounted ZIP
   * @param id ZIP mount ID
   * @param filePath Path within the ZIP (e.g., "htdocs/www.example.com/file.swf")
   */
  async getFile(id: string, filePath: string): Promise<Buffer | null> {
    const mounted = this.mountedZips.get(id);
    if (!mounted) {
      logger.debug(`[ZipManager] ZIP not mounted: ${id}`);
      return null;
    }

    try {
      // Normalize path (remove leading slash)
      const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;

      // Check index before reading file (O(1) vs reading entire file)
      if (!mounted.entryIndex.has(normalizedPath)) {
        logger.debug(`[ZipManager] File not in index ${id}: ${normalizedPath}`);
        return null;
      }

      // Check file size before buffering
      const entries = await mounted.zip.entries();
      const entry = entries[normalizedPath];
      if (entry && entry.size > MAX_BUFFERED_FILE_SIZE) {
        logger.warn(
          `[ZipManager] File too large to buffer: ${normalizedPath} (${entry.size} bytes)`
        );
        return null;
      }

      logger.debug(`[ZipManager] Reading from ZIP ${id}: ${normalizedPath}`);

      // Get file from ZIP
      const data = await mounted.zip.entryData(normalizedPath);

      logger.debug(`[ZipManager] ✓ Read ${data.length} bytes from ${id}:${normalizedPath}`);

      return data;
    } catch (error) {
      // File not found in ZIP
      logger.debug(`[ZipManager] File not found in ${id}: ${filePath}`);
      return null;
    }
  }

  /**
   * Search for a file across all mounted ZIPs
   * @param relPath Relative path (e.g., "www.example.com/path/file.swf")
   * @returns Buffer and mount ID if found
   */
  async findFile(relPath: string): Promise<{ data: Buffer; mountId: string } | null> {
    // Try with different prefixes (different ZIP structures)
    const pathsToTry = [
      `content/${relPath}`, // Most common: content/domain/path
      `htdocs/${relPath}`, // Standard: htdocs/domain/path
      relPath, // No prefix: domain/path
      `Legacy/htdocs/${relPath}`, // Full path: Legacy/htdocs/domain/path
    ];

    // Search all mounted ZIPs
    for (const [id, mounted] of this.mountedZips) {
      for (const pathVariant of pathsToTry) {
        // Normalize path (remove leading slash)
        const normalizedPath = pathVariant.startsWith('/') ? pathVariant.substring(1) : pathVariant;

        // Check index first (O(1))
        if (!mounted.entryIndex.has(normalizedPath)) {
          continue;
        }

        // Get entries to check if it's a directory and check size
        const entries = await mounted.zip.entries();
        const entry = entries[normalizedPath];
        if (!entry || entry.isDirectory) {
          continue;
        }

        // Check size before reading
        if (entry.size > MAX_BUFFERED_FILE_SIZE) {
          logger.warn(
            `[ZipManager] File too large to buffer: ${normalizedPath} (${entry.size} bytes)`
          );
          continue;
        }

        // Read entry data
        try {
          const data = await mounted.zip.entryData(normalizedPath);
          logger.info(`[ZipManager] ✓ Found in ${id}: ${pathVariant}`);
          return { data, mountId: id };
        } catch (error) {
          // Entry read failed, continue to next variant
          logger.debug(`[ZipManager] Failed to read entry ${normalizedPath}: ${error}`);
          continue;
        }
      }
    }

    return null;
  }

  /**
   * Get list of mounted ZIPs
   */
  getMountedZips(): Array<{ id: string; zipPath: string; mountTime: Date; fileCount: number }> {
    const result: Array<{ id: string; zipPath: string; mountTime: Date; fileCount: number }> = [];

    // LRU cache provides entries() iterator
    for (const [id, mounted] of this.mountedZips.entries()) {
      result.push({
        id,
        zipPath: mounted.zipPath,
        mountTime: mounted.mountTime,
        fileCount: mounted.entryIndex.size, // O(1) from index
      });
    }

    return result;
  }

  /**
   * List files in a mounted ZIP (for debugging)
   */
  async listFiles(id: string, pattern?: string): Promise<string[]> {
    const mounted = this.mountedZips.get(id);
    if (!mounted) return [];

    try {
      const entries = await mounted.zip.entries();
      let files = Object.keys(entries);

      if (pattern) {
        // Use simple substring matching instead of regex to prevent ReDoS
        const lowerPattern = pattern.toLowerCase();
        files = files.filter((f) => f.toLowerCase().includes(lowerPattern));
      }

      return files;
    } catch (error) {
      // Sanitize error message to prevent path leakage (G-H4)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const safeMessage = sanitizeErrorMessage(errorMessage);
      logger.error(`[ZipManager] Error listing files in ${id}: ${safeMessage}`);
      return [];
    }
  }

  /**
   * Check if a ZIP is mounted
   */
  isMounted(id: string): boolean {
    return this.mountedZips.has(id);
  }

  /**
   * Unmount all ZIPs (cleanup on shutdown)
   */
  async unmountAll(): Promise<void> {
    this.shuttingDown = true;

    // Wait for in-progress mounts to complete (with timeout)
    const maxWait = 10000; // 10 seconds
    const start = Date.now();
    while (this.mountingInProgress.size > 0 && Date.now() - start < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    logger.info(`[ZipManager] Unmounting all ZIPs (${this.mountedZips.size})...`);

    const promises = Array.from(this.mountedZips.keys()).map((id) => this.unmount(id));
    await Promise.all(promises);

    // Wait for all pending close operations from LRU cache disposal
    if (this.pendingCloses.size > 0) {
      logger.info(
        `[ZipManager] Waiting for ${this.pendingCloses.size} pending close operations...`
      );
      await Promise.all(Array.from(this.pendingCloses));
    }

    logger.info(`[ZipManager] ✓ All ZIPs unmounted`);
  }
}

// Singleton instance
export const zipManager = new ZipManager();
