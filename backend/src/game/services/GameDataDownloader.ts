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
import { PreferencesService } from '../../services/PreferencesService';

const dnsLookup = promisify(dns.lookup);

export interface GameDataDownloadParams {
  gameId: string;
  dateAdded: string; // ISO date string from game_data table
  sha256?: string; // Expected SHA256 hash for verification
  targetPath?: string; // Override target path (default: Data/Games/)
}

export interface DownloadResult {
  success: boolean;
  filePath?: string;
  error?: string;
  sourceUsed?: string;
}

export type DownloadProgressCallback = (
  downloadedBytes: number,
  totalBytes: number | null,
  sourceName: string
) => void;

/** Implements the same logic as Flashpoint Launcher's download.ts */
export class GameDataDownloader {
  private static instance: GameDataDownloader;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 1000;
  private readonly DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000;
  private readonly MAX_FILE_SIZE = 500 * 1024 * 1024;

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

  /** Matches Flashpoint Launcher's getGameDataFilename() logic */
  static getFilename(gameId: string, dateAdded: string): string {
    let cleanDate: string;
    if (dateAdded.includes('T')) {
      cleanDate = dateAdded;
    } else {
      cleanDate = dateAdded.slice(0, 10) + 'T' + dateAdded.slice(11);
    }

    const timestamp = new Date(cleanDate).getTime();

    if (isNaN(timestamp)) {
      const fallbackDate = `${dateAdded} +0000 UTC`;
      const fallbackTimestamp = new Date(fallbackDate).getTime();
      if (!isNaN(fallbackTimestamp)) {
        return `${gameId}-${fallbackTimestamp}.zip`;
      }
      throw new Error(`Invalid dateAdded value: ${dateAdded}`);
    }

    return `${gameId}-${timestamp}.zip`;
  }

  async download(
    params: GameDataDownloadParams,
    onProgress?: DownloadProgressCallback
  ): Promise<DownloadResult> {
    const { gameId, dateAdded, sha256 } = params;
    const filename = GameDataDownloader.getFilename(gameId, dateAdded);

    logger.info(`[GameDataDownloader] Starting download for ${filename}`);

    const sources = await PreferencesService.getGameDataSources();

    if (sources.length === 0) {
      logger.error('[GameDataDownloader] No game data sources configured in preferences.json');
      return {
        success: false,
        error: 'No game data sources configured. Add gameDataSources to preferences.json.',
      };
    }

    const targetDir = params.targetPath || (await PreferencesService.getDataPacksFolderPath());
    const targetPath = path.join(targetDir, filename);
    const tempPath = `${targetPath}.temp`;

    try {
      await fs.mkdir(targetDir, { recursive: true });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: `Failed to create directory: ${errorMsg}` };
    }

    const errors: string[] = [];

    for (const source of sources) {
      if (!source.arguments?.length || !source.arguments[0]) {
        logger.warn(`[GameDataDownloader] Source "${source.name}" has no arguments, skipping`);
        continue;
      }

      let baseUrl = source.arguments[0];

      if (new URL(baseUrl).protocol === 'http:') {
        const secureUrl = baseUrl.replace(/^http:/, 'https:');
        logger.warn(`[GameDataDownloader] Upgrading insecure source URL to HTTPS: ${baseUrl}`);
        baseUrl = secureUrl;
      }

      const normalizedBase = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
      const fullUrl = new URL(filename, normalizedBase).href;
      logger.info(`[GameDataDownloader] Trying source "${source.name}": ${fullUrl}`);

      try {
        await this.downloadFile(fullUrl, tempPath, source.name, onProgress);

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

        await this.safeUnlink(tempPath);
      }
    }

    const errorSummary = errors.join('\n');
    logger.error(`[GameDataDownloader] All sources failed for ${filename}:\n${errorSummary}`);

    return {
      success: false,
      error: `Failed to download from all ${sources.length} sources:\n${errorSummary}`,
    };
  }

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
   * Single download attempt with SSRF protection and double-settlement guard.
   * Async validation (DNS lookup) runs before the Promise; the Promise executor
   * is synchronous to avoid the `new Promise(async ...)` anti-pattern that
   * silently swallows rejections.
   */
  private async downloadFileOnce(
    url: string,
    destPath: string,
    sourceName: string,
    onProgress?: DownloadProgressCallback,
    maxRedirects: number = 5
  ): Promise<void> {
    if (maxRedirects <= 0) {
      throw new Error('Too many redirects');
    }

    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      throw new Error(
        `Unsupported protocol: ${parsedUrl.protocol} - only http: and https: are allowed`
      );
    }

    if (this.isPrivateHost(parsedUrl.hostname)) {
      logger.warn(
        `[GameDataDownloader] Blocked download to private/reserved address: ${parsedUrl.hostname}`
      );
      throw new Error(
        `Download blocked: ${parsedUrl.hostname} resolves to a private/reserved address`
      );
    }

    // DNS rebinding protection: resolve hostname and pin the IP for the connection
    const hostname = parsedUrl.hostname;
    let resolvedAddress: string | undefined;
    let resolvedFamily: number | undefined;
    if (!net.isIPv4(hostname) && !net.isIPv6(hostname)) {
      try {
        const { address, family } = await dnsLookup(hostname);
        if (this.isPrivateIPv4(address) || this.isPrivateIPv6(address)) {
          logger.warn(
            `[GameDataDownloader] Blocked: ${hostname} resolves to private address ${address}`
          );
          throw new Error(`Blocked: ${hostname} resolves to private address ${address}`);
        }
        resolvedAddress = address;
        resolvedFamily = family;
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('Blocked:')) {
          throw error;
        }
        // DNS lookup failed - reject to prevent unpinned connection (SSRF protection)
        logger.warn(`[GameDataDownloader] DNS lookup failed for ${hostname}, rejecting request`);
        throw new Error(`DNS lookup failed for ${hostname}`);
      }
    }

    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    // Pin the validated DNS resolution to prevent DNS rebinding between check and connect
    const requestOptions: Record<string, unknown> = { timeout: this.DOWNLOAD_TIMEOUT_MS };
    if (resolvedAddress) {
      requestOptions.lookup = (
        _hostname: string,
        options: { all?: boolean },
        callback: (...args: unknown[]) => void
      ) => {
        if (options && options.all) {
          callback(null, [{ address: resolvedAddress, family: resolvedFamily }]);
        } else {
          callback(null, resolvedAddress, resolvedFamily);
        }
      };
    }

    // Synchronous Promise executor — redirect is signalled via resolve value
    // instead of recursing inside the executor
    const result = await new Promise<{ redirect?: string }>((resolve, reject) => {
      // Guard against double-settlement: the 'data' handler can reject on size
      // limit while the piped writeStream 'finish' event can still fire afterward.
      let settled = false;
      const safeResolve = (val: { redirect?: string } = {}) => {
        if (!settled) {
          settled = true;
          resolve(val);
        }
      };
      const safeReject = (error: Error) => {
        if (!settled) {
          settled = true;
          reject(error);
        }
      };

      let writeStream: ReturnType<typeof createWriteStream> | null = null;

      const request = protocol.get(url, requestOptions, (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            response.resume();

            try {
              this.validateRedirectUrl(redirectUrl);
            } catch (err) {
              safeReject(err instanceof Error ? err : new Error(String(err)));
              return;
            }

            safeResolve({ redirect: redirectUrl });
            return;
          }
        }

        if (response.statusCode !== 200) {
          response.resume();
          safeReject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        const contentLength = response.headers['content-length'];
        const totalBytes = contentLength ? parseInt(contentLength, 10) : null;

        if (totalBytes && totalBytes > this.MAX_FILE_SIZE) {
          response.resume();
          safeReject(new Error(`File too large: ${totalBytes} bytes (max: ${this.MAX_FILE_SIZE})`));
          return;
        }

        writeStream = createWriteStream(destPath);
        let downloadedBytes = 0;

        response.on('data', (chunk: Buffer) => {
          downloadedBytes += chunk.length;

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
          writeStream.destroy();
        }
        request.destroy();
        safeReject(new Error(`Download timed out after ${this.DOWNLOAD_TIMEOUT_MS}ms`));
      });
    });

    if (result.redirect) {
      logger.info(`[GameDataDownloader] Following redirect to: ${result.redirect}`);
      return this.downloadFileOnce(
        result.redirect,
        destPath,
        sourceName,
        onProgress,
        maxRedirects - 1
      );
    }
  }

  /** Rejects non-HTTP(S) protocols and private/reserved IP addresses */
  private validateRedirectUrl(redirectUrl: string): void {
    let parsed: URL;
    try {
      parsed = new URL(redirectUrl);
    } catch {
      throw new Error(`Invalid redirect URL: ${redirectUrl}`);
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      logger.warn(
        `[GameDataDownloader] Blocked redirect to disallowed protocol: ${parsed.protocol} (${redirectUrl})`
      );
      throw new Error(
        `Redirect blocked: unsupported protocol ${parsed.protocol} - only http: and https: are allowed`
      );
    }

    if (this.isPrivateHost(parsed.hostname)) {
      logger.warn(
        `[GameDataDownloader] Blocked redirect to private/reserved address: ${parsed.hostname} (${redirectUrl})`
      );
      throw new Error(
        `Redirect blocked: ${parsed.hostname} resolves to a private/reserved address`
      );
    }
  }

  /** Handles both IPv4 and IPv6, including bracketed IPv6 notation */
  private isPrivateHost(hostname: string): boolean {
    const cleanHostname = hostname.replace(/^\[|\]$/g, '');

    if (cleanHostname.toLowerCase() === 'localhost') {
      return true;
    }

    if (net.isIPv4(cleanHostname)) {
      return this.isPrivateIPv4(cleanHostname);
    }

    if (net.isIPv6(cleanHostname)) {
      return this.isPrivateIPv6(cleanHostname);
    }

    // Not an IP literal - it is a hostname.
    // DNS resolution could map to a private IP, but performing async DNS
    // lookup here is impractical in a synchronous validation path.
    // The redirect-hop limit (5) plus the protocol check provides defense-in-depth.
    return false;
  }

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

  private isPrivateIPv6(ip: string): boolean {
    const normalized = ip.toLowerCase();

    if (normalized === '::1') return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    if (normalized.startsWith('fe80')) return true;

    const v4mappedMatch = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (v4mappedMatch) {
      return this.isPrivateIPv4(v4mappedMatch[1]);
    }

    return false;
  }

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

  private calculateSha256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = createReadStream(filePath);

      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex').toUpperCase()));
      stream.on('error', reject);
    });
  }

  private async safeUnlink(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch {
      // Ignore errors (file may not exist)
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async exists(gameId: string, dateAdded: string, targetDir?: string): Promise<boolean> {
    try {
      const filename = GameDataDownloader.getFilename(gameId, dateAdded);
      const dir = targetDir || (await PreferencesService.getDataPacksFolderPath());
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

  async getFilePath(gameId: string, dateAdded: string, targetDir?: string): Promise<string> {
    try {
      const filename = GameDataDownloader.getFilename(gameId, dateAdded);
      const dir = targetDir || (await PreferencesService.getDataPacksFolderPath());
      return path.join(dir, filename);
    } catch (error) {
      // getFilename() can throw on invalid dateAdded
      throw new Error(
        `Invalid dateAdded value: ${dateAdded} - ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

export const gameDataDownloader = GameDataDownloader.getInstance();
