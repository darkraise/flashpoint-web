import StreamZip from 'node-stream-zip';
import path from 'path';
import fs from 'fs/promises';
import { LRUCache } from 'lru-cache';
import { logger } from '../utils/logger';
import { sanitizeErrorMessage } from './utils/pathSecurity';
import { MAX_BUFFERED_FILE_SIZE } from './config';

interface EntryMeta {
  isDirectory: boolean;
  size: number;
}

interface MountedZip {
  id: string;
  zipPath: string;
  zip: StreamZip.StreamZipAsync;
  mountTime: Date;
  entryIndex: Set<string>; // Set of all entry names for O(1) lookup
  entryMeta: Map<string, EntryMeta>; // Cached entry metadata for directory/size checks
  _manuallyClosed?: boolean; // Flag to prevent double-close from unmount + LRU dispose
}

export class ZipManager {
  // Use LRU cache to prevent memory leaks from unlimited ZIP mounts
  // Max 100 concurrent mounts, 30-minute TTL, auto-close on eviction
  private mountedZips: LRUCache<string, MountedZip>;
  private mountingInProgress = new Map<string, Promise<void>>();
  private pendingCloses: Set<Promise<void>> = new Set();
  private shuttingDown = false;

  constructor() {
    this.mountedZips = new LRUCache<string, MountedZip>({
      max: 100,
      ttl: 30 * 60 * 1000,
      dispose: async (value, key) => {
        // Skip if already manually closed (prevents double-close from unmount + dispose)
        if (value._manuallyClosed) return;

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
      updateAgeOnGet: true,
      updateAgeOnHas: false,
    });
  }

  async mount(id: string, zipPath: string): Promise<void> {
    if (this.shuttingDown) {
      throw new Error('ZipManager is shutting down');
    }

    if (this.mountedZips.has(id)) {
      logger.debug(`[ZipManager] ZIP already mounted: ${id}`);
      return;
    }

    const existingMount = this.mountingInProgress.get(id);
    if (existingMount) {
      logger.debug(`[ZipManager] ZIP mount already in progress, awaiting: ${id}`);
      await existingMount;
      return;
    }

    let resolveMounting!: () => void;
    let rejectMounting!: (err: Error) => void;
    const mountPromise = new Promise<void>((resolve, reject) => {
      resolveMounting = resolve;
      rejectMounting = reject;
    });
    this.mountingInProgress.set(id, mountPromise);

    try {
      try {
        await fs.access(zipPath);
      } catch (error) {
        // Don't expose full path in error message (G-H4)
        logger.error(`[ZipManager] ZIP file not found: ${zipPath}`);
        throw new Error('ZIP file not found');
      }

      logger.info(`[ZipManager] Mounting ZIP: ${id} -> ${zipPath}`);

      const zip = new StreamZip.async({ file: zipPath });

      try {
        const entries = await zip.entries();
        const entryIndex = new Set<string>();
        const entryMeta = new Map<string, EntryMeta>();
        for (const [name, entry] of Object.entries(entries)) {
          entryIndex.add(name);
          entryMeta.set(name, {
            isDirectory: entry.isDirectory,
            size: entry.size,
          });
        }

        this.mountedZips.set(id, {
          id,
          zipPath,
          zip,
          mountTime: new Date(),
          entryIndex,
          entryMeta,
        });

        logger.info(`[ZipManager] ✓ Mounted ZIP: ${id} (${entryIndex.size} files)`);
      } catch (innerError) {
        // Close the ZIP handle if mounting fails
        await zip.close().catch(() => {});
        throw innerError;
      }
      resolveMounting();
    } catch (error) {
      rejectMounting(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      this.mountingInProgress.delete(id);
    }
  }

  async unmount(id: string): Promise<boolean> {
    const mounted = this.mountedZips.peek(id);
    if (!mounted) {
      logger.warn(`[ZipManager] ZIP not mounted: ${id}`);
      return false;
    }

    logger.info(`[ZipManager] Unmounting ZIP: ${id}`);

    try {
      await mounted.zip.close();
      // Mark as manually closed AFTER successful close so LRU dispose callback skips the double-close
      mounted._manuallyClosed = true;
      this.mountedZips.delete(id);
      logger.info(`[ZipManager] ✓ Unmounted ZIP: ${id}`);
      return true;
    } catch (error) {
      logger.error(`[ZipManager] Error unmounting ZIP: ${id}`, error);
      return false;
    }
  }

  async getFile(id: string, filePath: string): Promise<Buffer | null> {
    const mounted = this.mountedZips.get(id);
    if (!mounted) {
      logger.debug(`[ZipManager] ZIP not mounted: ${id}`);
      return null;
    }

    try {
      const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;

      if (!mounted.entryIndex.has(normalizedPath)) {
        logger.debug(`[ZipManager] File not in index ${id}: ${normalizedPath}`);
        return null;
      }

      const meta = mounted.entryMeta.get(normalizedPath);
      if (meta && meta.size > MAX_BUFFERED_FILE_SIZE) {
        logger.warn(
          `[ZipManager] File too large to buffer: ${normalizedPath} (${meta.size} bytes)`
        );
        return null;
      }

      logger.debug(`[ZipManager] Reading from ZIP ${id}: ${normalizedPath}`);

      const data = await mounted.zip.entryData(normalizedPath);

      logger.debug(`[ZipManager] ✓ Read ${data.length} bytes from ${id}:${normalizedPath}`);

      return data;
    } catch (error) {
      // File not found in ZIP
      logger.debug(`[ZipManager] File not found in ${id}: ${filePath}`);
      return null;
    }
  }

  async findFile(relPath: string): Promise<{ data: Buffer; mountId: string } | null> {
    const pathsToTry = [
      `content/${relPath}`, // Most common: content/domain/path
      `htdocs/${relPath}`, // Standard: htdocs/domain/path
      relPath, // No prefix: domain/path
      `Legacy/htdocs/${relPath}`, // Full path: Legacy/htdocs/domain/path
    ];

    // Collect IDs first to avoid issues with LRU iterator during async operations
    const mountIds = Array.from(this.mountedZips.keys());

    for (const id of mountIds) {
      // Use .get() to refresh access time and pin the reference (prevents eviction during read)
      const mounted = this.mountedZips.get(id);
      if (!mounted) continue; // Evicted between keys() and get()

      for (const pathVariant of pathsToTry) {
        const normalizedPath = pathVariant.startsWith('/') ? pathVariant.substring(1) : pathVariant;

        if (!mounted.entryIndex.has(normalizedPath)) {
          continue;
        }

        const meta = mounted.entryMeta.get(normalizedPath);
        if (!meta || meta.isDirectory) {
          continue;
        }

        if (meta.size > MAX_BUFFERED_FILE_SIZE) {
          logger.warn(
            `[ZipManager] File too large to buffer: ${normalizedPath} (${meta.size} bytes)`
          );
          continue;
        }

        try {
          const data = await mounted.zip.entryData(normalizedPath);
          logger.info(`[ZipManager] ✓ Found in ${id}: ${pathVariant}`);
          return { data, mountId: id };
        } catch (error) {
          // Entry read failed (possibly evicted during async read), continue
          logger.debug(`[ZipManager] Failed to read entry ${normalizedPath}: ${error}`);
          continue;
        }
      }
    }

    return null;
  }

  getMountedZips(): Array<{ id: string; zipPath: string; mountTime: Date; fileCount: number }> {
    const result: Array<{ id: string; zipPath: string; mountTime: Date; fileCount: number }> = [];

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

  isMounted(id: string): boolean {
    return this.mountedZips.has(id);
  }

  async unmountAll(): Promise<void> {
    this.shuttingDown = true;

    if (this.mountingInProgress.size > 0) {
      logger.info(`[ZipManager] Waiting for ${this.mountingInProgress.size} in-progress mounts...`);
      await Promise.allSettled(Array.from(this.mountingInProgress.values()));
    }

    logger.info(`[ZipManager] Unmounting all ZIPs (${this.mountedZips.size})...`);

    const promises = Array.from(this.mountedZips.keys()).map((id) => this.unmount(id));
    await Promise.all(promises);

    if (this.pendingCloses.size > 0) {
      logger.info(
        `[ZipManager] Waiting for ${this.pendingCloses.size} pending close operations...`
      );
      await Promise.all(Array.from(this.pendingCloses));
    }

    logger.info(`[ZipManager] ✓ All ZIPs unmounted`);
  }
}

export const zipManager = new ZipManager();
