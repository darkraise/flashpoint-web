import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import { Readable } from 'stream';
import { logger } from './utils/logger';
import { ConfigManager } from './config';
import { getMimeType } from './mimeTypes';
import {
  sanitizeAndValidatePath,
  sanitizeUrlPath,
  sanitizeErrorMessage,
} from './utils/pathSecurity';
import axios, { AxiosError } from 'axios';
import zlib from 'zlib';
import { promisify } from 'util';

// HTTP request timeout constants (G-H2)
const EXTERNAL_REQUEST_TIMEOUT_MS = 45000; // 45 seconds for external sources
const EXTERNAL_REQUEST_MAX_REDIRECTS = 5;

// Retry configuration for external requests
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000; // 1 second base delay

const brotliDecompress = promisify(zlib.brotliDecompress);

// Script file extensions
const SCRIPT_EXTENSIONS = ['php', 'php5', 'phtml', 'pl'];

// Index file extensions (in priority order)
const INDEX_EXTENSIONS = ['html', 'htm', 'php', 'swf'];

// Common subdomain prefixes used in Flashpoint content
const COMMON_SUBDOMAINS = [
  'www',
  'core',
  'api',
  'cdn',
  'static',
  'assets',
  'media',
  'content',
  'data',
  'files',
  'secure',
  'download',
];

export interface LegacyFileResponse {
  data?: Buffer;
  stream?: Readable;
  size?: number;
  contentType: string;
  source: string;
}

export class LegacyServer {
  private settings = ConfigManager.getSettings();

  /**
   * Main file serving method - replicates ServeLegacy() from Go implementation
   * @param hostname The hostname from the request (e.g., "www.example.com")
   * @param urlPath The path from the request (e.g., "/path/file.swf")
   */
  async serveLegacy(hostname: string, urlPath: string): Promise<LegacyFileResponse> {
    // Sanitize URL path to prevent null bytes and dangerous patterns
    try {
      urlPath = sanitizeUrlPath(urlPath);
    } catch (error) {
      logger.error(`[LegacyServer] Invalid URL path: ${urlPath}`);
      throw new Error('Invalid URL path');
    }

    // Strip port from hostname
    const host = hostname.split(':')[0];

    // Build relative path: {host}/{path}
    const relPath = path.posix.join(host, urlPath);

    logger.info(`[LegacyServer] Serving: ${host}${urlPath}`);
    logger.info(`[LegacyServer] Relative path: ${relPath}`);

    // Step 1: Build all path candidates
    const pathCandidates = this.buildPathCandidates(relPath, urlPath);

    // Step 2: Try each candidate in order
    for (const candidate of pathCandidates) {
      logger.debug(`[LegacyServer] Trying: ${candidate.path} (${candidate.type})`);

      try {
        // Validate path is within allowed base directory before accessing
        this.validateCandidatePath(candidate.path, candidate.type);

        const stats = await fs.stat(candidate.path);

        if (stats.isFile()) {
          logger.info(`[LegacyServer] ✓ Found file: ${candidate.path}`);
          return await this.serveFile(candidate.path, candidate.type === 'cgi-bin');
        }
      } catch (error) {
        // File doesn't exist or path validation failed, continue to next candidate
        continue;
      }
    }

    // Step 3: No local file found, try external sources
    logger.info(`[LegacyServer] File not found locally, trying external sources...`);
    return await this.tryExternalSources(relPath);
  }

  /**
   * Build all path candidates in priority order
   * Replicates the path resolution algorithm from Go's ServeLegacy()
   */
  private buildPathCandidates(
    relPath: string,
    urlPath: string
  ): Array<{ path: string; type: string }> {
    const candidates: Array<{ path: string; type: string }> = [];
    const seenPaths = new Set<string>();

    // Helper to add candidate only if not seen before
    const addCandidate = (candidatePath: string, type: string) => {
      const normalizedPath = path.normalize(candidatePath).toLowerCase();
      if (!seenPaths.has(normalizedPath)) {
        seenPaths.add(normalizedPath);
        candidates.push({ path: candidatePath, type });
      }
    };

    // Extract hostname and path from relPath
    const parts = relPath.split('/');
    const hostname = parts[0];
    const pathAfterHost = parts.slice(1).join('/');

    // Generate subdomain variations
    // For mochibot.com, try: mochibot.com, www.mochibot.com, core.mochibot.com, etc.
    const hostnameVariations = this.getHostnameVariations(hostname);

    // For each hostname variation, try exact paths
    for (const hostVariation of hostnameVariations) {
      const variantRelPath = path.posix.join(hostVariation, pathAfterHost);

      // 1. Exact file paths (with and without query string)
      addCandidate(
        path.join(this.settings.legacyHTDOCSPath, variantRelPath),
        hostVariation === hostname ? 'exact' : `subdomain:${hostVariation}`
      );

      // If URL has query string, try without it
      const pathWithoutQuery = variantRelPath.split('?')[0];
      if (pathWithoutQuery !== variantRelPath) {
        addCandidate(
          path.join(this.settings.legacyHTDOCSPath, pathWithoutQuery),
          hostVariation === hostname ? 'exact-no-query' : `subdomain:${hostVariation}-no-query`
        );
      }
    }

    // Use the original relPath for the rest of the logic
    const pathWithoutQuery = relPath.split('?')[0];

    // 2. Override paths (exact files in override directories)
    for (const override of this.settings.legacyOverridePaths) {
      addCandidate(
        path.join(this.settings.legacyHTDOCSPath, override, relPath),
        `override:${override}`
      );

      if (pathWithoutQuery !== relPath) {
        addCandidate(
          path.join(this.settings.legacyHTDOCSPath, override, pathWithoutQuery),
          `override:${override}-no-query`
        );
      }
    }

    // 3. CGI-BIN paths (for script files)
    if (this.isScriptUrl(urlPath)) {
      addCandidate(path.join(this.settings.legacyCGIBINPath, relPath), 'cgi-bin');

      if (pathWithoutQuery !== relPath) {
        addCandidate(
          path.join(this.settings.legacyCGIBINPath, pathWithoutQuery),
          'cgi-bin-no-query'
        );
      }
    }

    // 4. Index files (for directory requests)
    for (const ext of INDEX_EXTENSIONS) {
      addCandidate(
        path.join(this.settings.legacyHTDOCSPath, relPath, `index.${ext}`),
        `index:${ext}`
      );

      // Index files in override paths
      for (const override of this.settings.legacyOverridePaths) {
        addCandidate(
          path.join(this.settings.legacyHTDOCSPath, override, relPath, `index.${ext}`),
          `index-override:${override}:${ext}`
        );
      }
    }

    return candidates;
  }

  /**
   * Validate that a candidate path is within its allowed base directory
   * @param candidatePath The full path to validate
   * @param candidateType The type of candidate (e.g., 'exact', 'cgi-bin', 'override:*')
   * @throws Error if the path escapes its allowed base directory
   */
  private validateCandidatePath(candidatePath: string, candidateType: string): void {
    // Determine the allowed base directory based on candidate type
    let allowedBase: string;

    if (candidateType === 'cgi-bin' || candidateType === 'cgi-bin-no-query') {
      allowedBase = this.settings.legacyCGIBINPath;
    } else {
      // All other types use htdocs path
      allowedBase = this.settings.legacyHTDOCSPath;
    }

    // Validate that the candidate path is within the allowed base
    // This will throw an error if directory traversal is detected
    try {
      sanitizeAndValidatePath(allowedBase, candidatePath);
    } catch (error) {
      logger.warn(`[Security] Path validation failed for ${candidateType}: ${candidatePath}`);
      throw error;
    }
  }

  /**
   * Check if URL is a script file
   */
  private isScriptUrl(urlPath: string): boolean {
    const ext = path.extname(urlPath).toLowerCase().substring(1);
    return SCRIPT_EXTENSIONS.includes(ext);
  }

  /**
   * Serve a file from disk
   * @param filePath Absolute path to file
   * @param isCGI Whether to execute as CGI script
   */
  private async serveFile(filePath: string, isCGI: boolean = false): Promise<LegacyFileResponse> {
    // Determine content type first
    const ext = path.extname(filePath).substring(1).toLowerCase();
    const contentType = getMimeType(ext);

    // HTML files need polyfill injection, so buffer them
    // Brotli-compressed files also need buffering for decompression
    const needsBuffering =
      contentType.includes('text/html') ||
      (this.settings.enableBrotli && filePath.endsWith('.br')) ||
      isCGI;

    if (needsBuffering) {
      // Read entire file into memory
      let data = await fs.readFile(filePath);

      // Handle Brotli compression
      if (this.settings.enableBrotli && filePath.endsWith('.br')) {
        logger.debug(`[LegacyServer] Decompressing Brotli file: ${filePath}`);
        data = await brotliDecompress(data);
        filePath = filePath.substring(0, filePath.length - 3); // Remove .br extension
      }

      // TODO: Execute CGI scripts if enabled
      if (isCGI && this.settings.enableCGI) {
        logger.warn('[LegacyServer] CGI execution not yet implemented');
      }

      return {
        data,
        contentType,
        source: 'local-htdocs',
      };
    }

    // Non-HTML, non-compressed files: stream for memory efficiency
    const stat = await fs.stat(filePath);
    const stream = createReadStream(filePath);

    logger.debug(
      `[LegacyServer] Streaming file: ${filePath} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`
    );

    return {
      stream,
      size: stat.size,
      contentType,
      source: 'local-htdocs',
    };
  }

  /**
   * Try external sources (Infinity Server, MAD4FP, etc.)
   */
  private async tryExternalSources(relPath: string): Promise<LegacyFileResponse> {
    // Try Infinity Server first
    if (this.settings.infinityServerURL) {
      logger.info(`[LegacyServer] Trying Infinity Server...`);
      const result = await this.tryExternalSource(this.settings.infinityServerURL, relPath);
      if (result) {
        return { ...result, source: 'infinity-server' };
      }
    }

    // Try other external paths
    for (const externalPath of this.settings.externalFilePaths) {
      logger.info(`[LegacyServer] Trying: ${externalPath}`);
      const result = await this.tryExternalSource(externalPath, relPath);
      if (result) {
        return { ...result, source: externalPath };
      }
    }

    // Try MAD4FP if enabled
    if (this.settings.mad4fpEnabled) {
      for (const mad4fpPath of this.settings.mad4fpPaths) {
        logger.info(`[LegacyServer] Trying MAD4FP: ${mad4fpPath}`);
        const result = await this.tryExternalSource(mad4fpPath, relPath);
        if (result) {
          return { ...result, source: `mad4fp:${mad4fpPath}` };
        }
      }
    }

    throw new Error('File not found in any source');
  }

  /**
   * Check if an error is retryable (network/server errors, not client errors)
   */
  private isRetryableError(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      // Don't retry client errors (4xx)
      if (status && status >= 400 && status < 500) {
        return false;
      }

      // Retry server errors (5xx)
      if (status && status >= 500) {
        return true;
      }

      // Retry on network errors
      const retryableCodes = [
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        'ECONNREFUSED',
        'ENETUNREACH',
      ];
      if (error.code && retryableCodes.includes(error.code)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Download from external source with exponential backoff retry
   * Implements timeout enforcement (G-H2) and safe error handling (G-H4)
   */
  private async tryExternalSource(
    baseUrl: string,
    relPath: string
  ): Promise<{ data: Buffer; contentType: string } | null> {
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const fullUrl = `${normalizedBase}${relPath}`;

    logger.info(`[LegacyServer] Downloading: ${fullUrl}`);

    // Retry loop with exponential backoff
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      // Create abort controller for request timeout (G-H2)
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, EXTERNAL_REQUEST_TIMEOUT_MS);

      try {
        const response = await axios.get(fullUrl, {
          responseType: 'arraybuffer',
          timeout: EXTERNAL_REQUEST_TIMEOUT_MS,
          maxRedirects: EXTERNAL_REQUEST_MAX_REDIRECTS,
          signal: abortController.signal,
          validateStatus: (status) => status === 200,
          headers: {
            'User-Agent': 'Flashpoint-Proxy/1.0',
          },
          // Limit response size to prevent memory exhaustion (100MB max)
          maxContentLength: 100 * 1024 * 1024,
          maxBodyLength: 100 * 1024 * 1024,
        });

        const data = Buffer.from(response.data);

        // Determine content type from file extension, not from response header (G-H5)
        // This prevents MIME type spoofing from malicious external sources
        const ext = path.extname(relPath).substring(1).toLowerCase();
        const contentType = ext ? getMimeType(ext) : 'application/octet-stream';

        // Log if server-provided content type differs (for debugging)
        const serverContentType = response.headers['content-type'];
        if (serverContentType && !serverContentType.includes(contentType.split('/')[1])) {
          logger.debug(
            `[LegacyServer] Content-Type override: server=${serverContentType}, using=${contentType}`
          );
        }

        logger.info(`[LegacyServer] ✓ Downloaded: ${data.length} bytes (${contentType})`);

        return { data, contentType };
      } catch (error) {
        clearTimeout(timeoutId);

        // Determine if we should retry
        const isLastAttempt = attempt === MAX_RETRIES;
        const shouldRetry = !isLastAttempt && this.isRetryableError(error);

        // Log the error appropriately
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          if (axiosError.response?.status === 404) {
            logger.debug(`[LegacyServer] ✗ Not found (404)`);
          } else if (axiosError.response?.status === 403) {
            logger.warn(`[LegacyServer] ✗ Forbidden (403)`);
          } else if (
            axiosError.code === 'ECONNABORTED' ||
            axiosError.code === 'ETIMEDOUT' ||
            axiosError.code === 'ERR_CANCELED'
          ) {
            if (shouldRetry) {
              logger.warn(
                `[LegacyServer] ✗ Request timeout after ${EXTERNAL_REQUEST_TIMEOUT_MS}ms (attempt ${attempt}/${MAX_RETRIES})`
              );
            } else {
              logger.warn(
                `[LegacyServer] ✗ Request timeout after ${EXTERNAL_REQUEST_TIMEOUT_MS}ms (final attempt)`
              );
            }
          } else {
            // Sanitize error message to prevent internal details leakage
            const safeMessage = sanitizeErrorMessage(axiosError.message || 'Unknown error');
            if (shouldRetry) {
              logger.warn(
                `[LegacyServer] ✗ Error: ${safeMessage} (attempt ${attempt}/${MAX_RETRIES})`
              );
            } else {
              logger.warn(`[LegacyServer] ✗ Error: ${safeMessage} (final attempt)`);
            }
          }
        } else if (error instanceof Error) {
          const safeMessage = sanitizeErrorMessage(error.message);
          if (shouldRetry) {
            logger.warn(
              `[LegacyServer] ✗ Error: ${safeMessage} (attempt ${attempt}/${MAX_RETRIES})`
            );
          } else {
            logger.warn(`[LegacyServer] ✗ Error: ${safeMessage} (final attempt)`);
          }
        }

        // Retry if applicable, otherwise return null
        if (shouldRetry) {
          // Exponential backoff: 1s, 2s, 4s
          const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
          logger.info(`[LegacyServer] Retrying in ${delayMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        // No retry, return null to try next source
        return null;
      }
    }

    // Should never reach here, but TypeScript needs it
    return null;
  }

  /**
   * Generate hostname variations with common subdomain prefixes
   * For example, "mochibot.com" returns:
   * ["mochibot.com", "www.mochibot.com", "core.mochibot.com", ...]
   *
   * This handles cases where files are stored with subdomain prefixes
   * (e.g., core.mochibot.com/my/core.swf) but requested without them
   * (e.g., mochibot.com/my/core.swf)
   */
  private getHostnameVariations(hostname: string): string[] {
    const variations: string[] = [hostname];

    // Add subdomain variations
    for (const subdomain of COMMON_SUBDOMAINS) {
      variations.push(`${subdomain}.${hostname}`);
    }

    return variations;
  }
}
