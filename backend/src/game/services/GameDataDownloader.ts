import fs from 'fs/promises';
import { createWriteStream, createReadStream } from 'fs';
import path from 'path';
import crypto from 'crypto';
import https from 'https';
import http from 'http';
import net from 'net';
import dns from 'dns';
import { promisify } from 'util';
import { logger } from '../../utils/logger';
import { PreferencesService, GameDataSource } from './PreferencesService';

const dnsLookup = promisify(dns.lookup);

/**
 * Parameters for downloading a game data ZIP
 */
export interface GameDataDownloadParams {
  gameId: string;
  dateAdded: string; // ISO date string from game_data table
  sha256?: string; // Expected SHA256 hash for verification
  targetPath?: string; // Override target path (default: Data/Games/)
}

/**
 * Result of a download attempt
 */
export interface DownloadResult {
  success: boolean;
  filePath?: string;
  error?: string;
  sourceUsed?: string;
}

/**
 * Progress callback for download tracking
 */
export type DownloadProgressCallback = (
  downloadedBytes: number,
  totalBytes: number | null,
  sourceName: string
) => void;

/**
 * Service for downloading game data ZIPs from configured sources
 * Implements the same logic as Flashpoint Launcher's download.ts
 */
export class GameDataDownloader {
  private static instance: GameDataDownloader;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;
  private readonly DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB max

  /**
   * Private/reserved IPv4 and IPv6 CIDR ranges that must be blocked
   * to prevent SSRF attacks targeting internal services.
   */
  private static readonly PRIVATE_IP_RANGES: Array<{
    subnet: string;
    prefix: number;
    family: 4 | 6;
  }> = [
    // IPv4 private/reserved ranges
    { subnet: '127.0.0.0', prefix: 8, family: 4 }, // Loopback
    { subnet: '10.0.0.0', prefix: 8, family: 4 }, // Private Class A
    { subnet: '172.16.0.0', prefix: 12, family: 4 }, // Private Class B
    { subnet: '192.168.0.0', prefix: 16, family: 4 }, // Private Class C
    { subnet: '169.254.0.0', prefix: 16, family: 4 }, // Link-local / cloud metadata
    { subnet: '0.0.0.0', prefix: 8, family: 4 }, // Current network
    // IPv6 private/reserved ranges
    { subnet: '::1', prefix: 128, family: 6 }, // Loopback
    { subnet: 'fc00::', prefix: 7, family: 6 }, // Unique local (fc00::/7)
    { subnet: 'fe80::', prefix: 10, family: 6 }, // Link-local
  ];

  private constructor() {}

  static getInstance(): GameDataDownloader {
    if (!GameDataDownloader.instance) {
      GameDataDownloader.instance = new GameDataDownloader();
    }
    return GameDataDownloader.instance;
  }

  /**
   * Generate the filename for a game data ZIP
   * Matches Flashpoint Launcher's getGameDataFilename() logic
   */
  static getFilename(gameId: string, dateAdded: string): string {
    // Handle different date formats (with or without 'T')
    let cleanDate: string;
    if (dateAdded.includes('T')) {
      cleanDate = dateAdded;
    } else {
      // Insert 'T' between date and time at position 10
      cleanDate = dateAdded.slice(0, 10) + 'T' + dateAdded.slice(11);
    }

    const timestamp = new Date(cleanDate).getTime();

    // Validate timestamp with fallback
    if (isNaN(timestamp)) {
      // Try fallback: append UTC suffix
      const fallbackDate = `${dateAdded} +0000 UTC`;
      const fallbackTimestamp = new Date(fallbackDate).getTime();
      if (!isNaN(fallbackTimestamp)) {
        return `${gameId}-${fallbackTimestamp}.zip`;
      }
      throw new Error(`Invalid dateAdded value: ${dateAdded}`);
    }

    return `${gameId}-${timestamp}.zip`;
  }

  /**
   * Download a game data ZIP from configured sources
   * Tries each source sequentially until one succeeds
   */
  async download(
    params: GameDataDownloadParams,
    onProgress?: DownloadProgressCallback
  ): Promise<DownloadResult> {
    const { gameId, dateAdded, sha256 } = params;
    const filename = GameDataDownloader.getFilename(gameId, dateAdded);

    logger.info(`[GameDataDownloader] Starting download for ${filename}`);

    // Get configured sources
    const prefsService = PreferencesService.getInstance();
    const sources = await prefsService.getGameDataSources();

    if (sources.length === 0) {
      logger.error('[GameDataDownloader] No game data sources configured in preferences.json');
      return {
        success: false,
        error: 'No game data sources configured. Add gameDataSources to preferences.json.',
      };
    }

    // Determine target path
    const targetDir = params.targetPath || (await prefsService.getDataPacksFolderPath());
    const targetPath = path.join(targetDir, filename);
    const tempPath = `${targetPath}.temp`;

    // Ensure target directory exists
    try {
      await fs.mkdir(targetDir, { recursive: true });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: `Failed to create directory: ${errorMsg}` };
    }

    // Try each source sequentially
    const errors: string[] = [];

    for (const source of sources) {
      // Check if source has arguments and at least one URL
      if (!source.arguments?.length || !source.arguments[0]) {
        logger.warn(`[GameDataDownloader] Source "${source.name}" has no arguments, skipping`);
        continue;
      }

      let baseUrl = source.arguments[0];

      // Enforce HTTPS for download sources
      if (new URL(baseUrl).protocol === 'http:') {
        const secureUrl = baseUrl.replace(/^http:/, 'https:');
        logger.warn(`[GameDataDownloader] Upgrading insecure source URL to HTTPS: ${baseUrl}`);
        baseUrl = secureUrl;
      }

      // Normalize baseUrl trailing slash before URL construction
      const normalizedBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
      const fullUrl = new URL(filename, normalizedBase).href;
      logger.info(`[GameDataDownloader] Trying source "${source.name}": ${fullUrl}`);

      try {
        // Download to temp file
        await this.downloadFile(fullUrl, tempPath, source.name, onProgress);

        // Verify SHA256 if provided
        if (sha256) {
          const fileHash = await this.calculateSha256(tempPath);
          if (fileHash.toLowerCase() !== sha256.toLowerCase()) {
            logger.error(
              `[GameDataDownloader] SHA256 mismatch! Expected: ${sha256}, Got: ${fileHash}`
            );
            await this.safeUnlink(tempPath);
            errors.push(
              `Source "${source.name}": SHA256 mismatch (expected ${sha256.substring(0, 8)}..., got ${fileHash.substring(0, 8)}...)`
            );
            continue;
          }
          logger.info(`[GameDataDownloader] SHA256 verified: ${fileHash.substring(0, 16)}...`);
        }

        // Move temp file to final location
        await fs.rename(tempPath, targetPath);

        logger.info(
          `[GameDataDownloader] Successfully downloaded ${filename} from "${source.name}"`
        );

        return {
          success: true,
          filePath: targetPath,
          sourceUsed: source.name,
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`[GameDataDownloader] Source "${source.name}" failed: ${errorMsg}`);
        errors.push(`Source "${source.name}": ${errorMsg}`);

        // Clean up temp file if exists
        await this.safeUnlink(tempPath);
      }
    }

    // All sources failed
    const errorSummary = errors.join('\n');
    logger.error(`[GameDataDownloader] All sources failed for ${filename}:\n${errorSummary}`);

    return {
      success: false,
      error: `Failed to download from all ${sources.length} sources:\n${errorSummary}`,
    };
  }

  /**
   * Download a file from URL to local path with retry logic
   */
  private async downloadFile(
    url: string,
    destPath: string,
    sourceName: string,
    onProgress?: DownloadProgressCallback
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        await this.downloadFileOnce(url, destPath, sourceName, onProgress);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(
          `[GameDataDownloader] Attempt ${attempt}/${this.MAX_RETRIES} failed: ${lastError.message}`
        );

        if (attempt < this.MAX_RETRIES) {
          const delay = this.RETRY_DELAY_MS * attempt;
          logger.info(`[GameDataDownloader] Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Download failed after all retries');
  }

  /**
   * Single download attempt with SSRF protection and double-settlement guard
   */
  private async downloadFileOnce(
    url: string,
    destPath: string,
    sourceName: string,
    onProgress?: DownloadProgressCallback,
    maxRedirects: number = 5
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      // Guard against double-settlement: the 'data' handler can reject on size
      // limit while the piped writeStream 'finish' event can still fire afterward.
      let settled = false;
      const safeResolve = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      const safeReject = (error: Error) => {
        if (!settled) {
          settled = true;
          reject(error);
        }
      };

      if (maxRedirects <= 0) {
        safeReject(new Error('Too many redirects'));
        return;
      }

      // Validate initial URL protocol - only HTTP(S) allowed
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
        safeReject(
          new Error(
            `Unsupported protocol: ${parsedUrl.protocol} - only http: and https: are allowed`
          )
        );
        return;
      }

      // Validate initial URL is not targeting a private/reserved IP
      if (this.isPrivateHost(parsedUrl.hostname)) {
        logger.warn(
          `[GameDataDownloader] Blocked download to private/reserved address: ${parsedUrl.hostname}`
        );
        safeReject(
          new Error(
            `Download blocked: ${parsedUrl.hostname} resolves to a private/reserved address`
          )
        );
        return;
      }

      // DNS rebinding protection: resolve hostname and check for private IPs
      const hostname = parsedUrl.hostname;
      if (!net.isIPv4(hostname) && !net.isIPv6(hostname)) {
        // It's a hostname, not an IP - perform DNS lookup
        try {
          const { address } = await dnsLookup(hostname);
          if (this.isPrivateIPv4(address) || this.isPrivateIPv6(address)) {
            logger.warn(
              `[GameDataDownloader] Blocked: ${hostname} resolves to private address ${address}`
            );
            safeReject(new Error(`Blocked: ${hostname} resolves to private address ${address}`));
            return;
          }
        } catch (error) {
          if (error instanceof Error && error.message.startsWith('Blocked:')) {
            safeReject(error);
            return;
          }
          // DNS lookup failed - allow the request to proceed (it will fail on connect anyway)
        }
      }

      const protocol = parsedUrl.protocol === 'https:' ? https : http;
      let writeStream: ReturnType<typeof createWriteStream> | null = null;

      const request = protocol.get(url, { timeout: this.DOWNLOAD_TIMEOUT_MS }, (response) => {
        // Handle redirects
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            response.resume();

            // Validate redirect URL before following
            try {
              this.validateRedirectUrl(redirectUrl);
            } catch (err) {
              safeReject(err instanceof Error ? err : new Error(String(err)));
              return;
            }

            logger.info(`[GameDataDownloader] Following redirect to: ${redirectUrl}`);
            this.downloadFileOnce(redirectUrl, destPath, sourceName, onProgress, maxRedirects - 1)
              .then(safeResolve)
              .catch(safeReject);
            return;
          }
        }

        // Check for success status
        if (response.statusCode !== 200) {
          response.resume();
          safeReject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        // Check content length
        const contentLength = response.headers['content-length'];
        const totalBytes = contentLength ? parseInt(contentLength, 10) : null;

        if (totalBytes && totalBytes > this.MAX_FILE_SIZE) {
          response.resume(); // Drain the response
          safeReject(new Error(`File too large: ${totalBytes} bytes (max: ${this.MAX_FILE_SIZE})`));
          return;
        }

        // Create write stream
        writeStream = createWriteStream(destPath);
        let downloadedBytes = 0;

        response.on('data', (chunk: Buffer) => {
          downloadedBytes += chunk.length;

          // Check size limit during download
          if (downloadedBytes > this.MAX_FILE_SIZE) {
            response.destroy();
            request.destroy();
            if (writeStream) {
              writeStream.destroy();
            }
            safeReject(new Error(`Download exceeded size limit: ${this.MAX_FILE_SIZE} bytes`));
            return;
          }

          if (onProgress) {
            onProgress(downloadedBytes, totalBytes, sourceName);
          }
        });

        response.pipe(writeStream);

        writeStream.on('finish', () => {
          logger.info(
            `[GameDataDownloader] Downloaded ${downloadedBytes} bytes from "${sourceName}"`
          );
          safeResolve();
        });

        writeStream.on('error', (error) => {
          safeReject(error);
        });

        response.on('error', (error) => {
          if (writeStream) {
            writeStream.destroy();
          }
          request.destroy();
          safeReject(error);
        });
      });

      request.on('error', (error) => {
        if (writeStream) {
          writeStream.destroy();
        }
        safeReject(error);
      });

      request.on('timeout', () => {
        if (writeStream) {
          writeStream.destroy(); // Also close the file handle
        }
        request.destroy();
        safeReject(new Error(`Download timed out after ${this.DOWNLOAD_TIMEOUT_MS}ms`));
      });
    });
  }

  /**
   * Validate a redirect URL to prevent SSRF attacks.
   * Rejects non-HTTP(S) protocols and private/reserved IP addresses.
   * Throws an Error if the URL is not safe to follow.
   */
  private validateRedirectUrl(redirectUrl: string): void {
    let parsed: URL;
    try {
      parsed = new URL(redirectUrl);
    } catch {
      throw new Error(`Invalid redirect URL: ${redirectUrl}`);
    }

    // Only allow http: and https: protocols
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      logger.warn(
        `[GameDataDownloader] Blocked redirect to disallowed protocol: ${parsed.protocol} (${redirectUrl})`
      );
      throw new Error(
        `Redirect blocked: unsupported protocol ${parsed.protocol} - only http: and https: are allowed`
      );
    }

    // Block private/reserved IP addresses
    if (this.isPrivateHost(parsed.hostname)) {
      logger.warn(
        `[GameDataDownloader] Blocked redirect to private/reserved address: ${parsed.hostname} (${redirectUrl})`
      );
      throw new Error(
        `Redirect blocked: ${parsed.hostname} resolves to a private/reserved address`
      );
    }
  }

  /**
   * Check if a hostname is a private or reserved IP address.
   * Handles both IPv4 and IPv6, including bracketed IPv6 notation.
   */
  private isPrivateHost(hostname: string): boolean {
    // Strip brackets from IPv6 addresses (e.g., [::1] -> ::1)
    const cleanHostname = hostname.replace(/^\[|\]$/g, '');

    // Check for 'localhost' hostname
    if (cleanHostname.toLowerCase() === 'localhost') {
      return true;
    }

    // Try to parse as IPv4
    if (net.isIPv4(cleanHostname)) {
      return this.isPrivateIPv4(cleanHostname);
    }

    // Try to parse as IPv6
    if (net.isIPv6(cleanHostname)) {
      return this.isPrivateIPv6(cleanHostname);
    }

    // Not an IP literal - it is a hostname.
    // DNS resolution could map to a private IP, but performing async DNS
    // lookup here is impractical in a synchronous validation path.
    // The redirect-hop limit (5) plus the protocol check provides defense-in-depth.
    return false;
  }

  /**
   * Check if an IPv4 address falls within a private/reserved CIDR range
   */
  private isPrivateIPv4(ip: string): boolean {
    const ipNum = this.ipv4ToNumber(ip);
    if (ipNum === null) return false;

    for (const range of GameDataDownloader.PRIVATE_IP_RANGES) {
      if (range.family !== 4) continue;
      const subnetNum = this.ipv4ToNumber(range.subnet);
      if (subnetNum === null) continue;

      const mask = range.prefix === 0 ? 0 : (~0 << (32 - range.prefix)) >>> 0;
      if ((ipNum & mask) === (subnetNum & mask)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if an IPv6 address falls within a private/reserved range
   */
  private isPrivateIPv6(ip: string): boolean {
    const normalized = ip.toLowerCase();

    // Exact loopback check
    if (normalized === '::1') return true;

    // Unique local addresses: fc00::/7 (fc00:: - fdff::)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

    // Link-local: fe80::/10
    if (normalized.startsWith('fe80')) return true;

    // IPv4-mapped IPv6 (::ffff:x.x.x.x) - check the embedded IPv4
    const v4mappedMatch = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (v4mappedMatch) {
      return this.isPrivateIPv4(v4mappedMatch[1]);
    }

    return false;
  }

  /**
   * Convert an IPv4 address string to a 32-bit unsigned integer
   */
  private ipv4ToNumber(ip: string): number | null {
    const parts = ip.split('.');
    if (parts.length !== 4) return null;

    let num = 0;
    for (const part of parts) {
      const octet = parseInt(part, 10);
      if (isNaN(octet) || octet < 0 || octet > 255) return null;
      num = (num * 256 + octet) >>> 0;
    }
    return num;
  }

  /**
   * Calculate SHA256 hash of a file
   */
  private calculateSha256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex').toUpperCase()));
      stream.on('error', reject);
    });
  }

  /**
   * Safely delete a file (ignore errors if file doesn't exist)
   */
  private async safeUnlink(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch {
      // Ignore errors (file may not exist)
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if a game data ZIP exists locally
   */
  async exists(gameId: string, dateAdded: string, targetDir?: string): Promise<boolean> {
    try {
      const filename = GameDataDownloader.getFilename(gameId, dateAdded);
      const prefsService = PreferencesService.getInstance();
      const dir = targetDir || (await prefsService.getDataPacksFolderPath());
      const filePath = path.join(dir, filename);

      try {
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    } catch {
      // getFilename() can throw on invalid dateAdded
      return false;
    }
  }

  /**
   * Get the full path to a game data ZIP
   */
  async getFilePath(gameId: string, dateAdded: string, targetDir?: string): Promise<string> {
    try {
      const filename = GameDataDownloader.getFilename(gameId, dateAdded);
      const prefsService = PreferencesService.getInstance();
      const dir = targetDir || (await prefsService.getDataPacksFolderPath());
      return path.join(dir, filename);
    } catch (error) {
      // getFilename() can throw on invalid dateAdded
      throw new Error(
        `Invalid dateAdded value: ${dateAdded} - ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// Export singleton instance
export const gameDataDownloader = GameDataDownloader.getInstance();
