import StreamZip from 'node-stream-zip';
import path from 'path';
import fs from 'fs/promises';
import { logger } from './utils/logger';

interface MountedZip {
  id: string;
  zipPath: string;
  zip: StreamZip.StreamZipAsync;
  mountTime: Date;
}

export class ZipManager {
  private mountedZips: Map<string, MountedZip> = new Map();

  /**
   * Mount a ZIP file for serving
   * @param id Unique identifier for this mount (e.g., game data ID)
   * @param zipPath Absolute path to the ZIP file
   */
  async mount(id: string, zipPath: string): Promise<void> {
    // Check if already mounted
    if (this.mountedZips.has(id)) {
      logger.debug(`[ZipManager] ZIP already mounted: ${id}`);
      return;
    }

    // Verify ZIP file exists
    try {
      await fs.access(zipPath);
    } catch (error) {
      throw new Error(`ZIP file not found: ${zipPath}`);
    }

    logger.info(`[ZipManager] Mounting ZIP: ${id} -> ${zipPath}`);

    // Create ZIP reader
    const zip = new StreamZip.async({ file: zipPath });

    // Store mounted ZIP
    this.mountedZips.set(id, {
      id,
      zipPath,
      zip,
      mountTime: new Date(),
    });

    logger.info(`[ZipManager] ✓ Mounted ZIP: ${id} (${await this.getFileCount(id)} files)`);
  }

  /**
   * Unmount a ZIP file
   * @param id Unique identifier of the mounted ZIP
   */
  async unmount(id: string): Promise<boolean> {
    const mounted = this.mountedZips.get(id);
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
      `content/${relPath}`,       // Most common: content/domain/path
      `htdocs/${relPath}`,        // Standard: htdocs/domain/path
      relPath,                     // No prefix: domain/path
      `Legacy/htdocs/${relPath}`, // Full path: Legacy/htdocs/domain/path
    ];

    // Search all mounted ZIPs
    for (const [id, mounted] of this.mountedZips) {
      for (const pathVariant of pathsToTry) {
        const data = await this.getFile(id, pathVariant);
        if (data) {
          logger.info(`[ZipManager] ✓ Found in ${id}: ${pathVariant}`);
          return { data, mountId: id };
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

    for (const [id, mounted] of this.mountedZips) {
      result.push({
        id,
        zipPath: mounted.zipPath,
        mountTime: mounted.mountTime,
        fileCount: 0, // Will be populated async
      });
    }

    return result;
  }

  /**
   * Get number of files in a mounted ZIP
   */
  private async getFileCount(id: string): Promise<number> {
    const mounted = this.mountedZips.get(id);
    if (!mounted) return 0;

    try {
      const entries = await mounted.zip.entries();
      return Object.keys(entries).length;
    } catch (error) {
      return 0;
    }
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
        const regex = new RegExp(pattern, 'i');
        files = files.filter(f => regex.test(f));
      }

      return files;
    } catch (error) {
      logger.error(`[ZipManager] Error listing files in ${id}:`, error);
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
    logger.info(`[ZipManager] Unmounting all ZIPs (${this.mountedZips.size})...`);

    const promises = Array.from(this.mountedZips.keys()).map(id => this.unmount(id));
    await Promise.all(promises);

    logger.info(`[ZipManager] ✓ All ZIPs unmounted`);
  }
}

// Singleton instance
export const zipManager = new ZipManager();
