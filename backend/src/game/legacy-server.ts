import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import { Readable } from 'stream';
import { logger } from '../utils/logger';
import { ConfigManager, MAX_BUFFERED_FILE_SIZE } from './config';
import { getMimeType } from './mimeTypes';
import {
  sanitizeAndValidatePath,
  sanitizeUrlPath,
  sanitizeErrorMessage,
} from './utils/pathSecurity';
import { CgiExecutor, CgiRequest } from './cgi';
import axios from 'axios';
import zlib from 'zlib';
import { promisify } from 'util';
import http from 'http';
import https from 'https';

// Shared HTTP agents with connection pool limits to prevent exhaustion
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 10, // Max 10 concurrent connections per host
  maxFreeSockets: 2,
  timeout: 30000,
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 10,
  maxFreeSockets: 2,
  timeout: 30000,
});

const axiosInstance = axios.create({
  httpAgent,
  httpsAgent,
});

// HTTP request timeout constants (G-H2)
const EXTERNAL_REQUEST_TIMEOUT_MS = 15000; // 15 seconds for external sources
const EXTERNAL_REQUEST_MAX_REDIRECTS = 5;

// Retry configuration for external requests
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1000; // 1 second base delay

const brotliDecompress = promisify(zlib.brotliDecompress);

// Script file extensions
const SCRIPT_EXTENSIONS = ['php', 'php5', 'phtml', 'pl'];

// Index files that legacy Flashpoint games commonly use as entry points.
// These are checked when a directory is requested without a specific file.
// Note: 'swf' is included because many Flash game directories have index.swf as the entry point.
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
  /** HTTP status code (default: 200) */
  statusCode?: number;
  /** Additional response headers from CGI */
  headers?: Record<string, string>;
}

/**
 * HTTP request context for CGI execution
 */
export interface HttpRequestContext {
  method: string;
  headers: Record<string, string>;
  body?: Buffer;
}

export class LegacyServer {
  private cgiExecutor: CgiExecutor | null = null;
  private cgiValidated = false;

  // Negative lookup cache to avoid repeated fs.stat() calls for missing files
  private static readonly negativeLookupCache = new Map<string, number>();
  private static readonly NEGATIVE_CACHE_TTL_MS = 30000; // 30 seconds
  private static readonly MAX_NEGATIVE_CACHE_SIZE = 5000;

  /**
   * Clear the negative lookup cache (called during shutdown)
   */
  static clearCache(): void {
    LegacyServer.negativeLookupCache.clear();
    logger.info('[LegacyServer] Negative lookup cache cleared');
  }

  /**
   * Check if a path is in the negative lookup cache
   */
  private isNegativelyCached(fullPath: string): boolean {
    const cachedAt = LegacyServer.negativeLookupCache.get(fullPath);
    if (cachedAt === undefined) return false;
    if (Date.now() - cachedAt > LegacyServer.NEGATIVE_CACHE_TTL_MS) {
      LegacyServer.negativeLookupCache.delete(fullPath);
      return false;
    }
    return true;
  }

  /**
   * Cache a negative lookup (file not found) with TTL and size limit
   */
  private cacheNegativeLookup(fullPath: string): void {
    // Evict oldest entries if cache is full
    if (LegacyServer.negativeLookupCache.size >= LegacyServer.MAX_NEGATIVE_CACHE_SIZE) {
      const firstKey = LegacyServer.negativeLookupCache.keys().next().value;
      if (firstKey) LegacyServer.negativeLookupCache.delete(firstKey);
    }
    LegacyServer.negativeLookupCache.set(fullPath, Date.now());
  }

  /**
   * Initialize CGI executor if enabled
   */
  private async initCgiExecutor(): Promise<CgiExecutor | null> {
    const settings = ConfigManager.getSettings();

    if (!settings.enableCGI) {
      return null;
    }

    if (this.cgiExecutor && this.cgiValidated) {
      return this.cgiExecutor;
    }

    this.cgiExecutor = new CgiExecutor({
      phpCgiPath: settings.phpCgiPath,
      documentRoot: settings.legacyHTDOCSPath,
      cgiBinPath: settings.legacyCGIBINPath,
      timeout: settings.cgiTimeout,
      maxBodySize: settings.cgiMaxBodySize,
      maxResponseSize: settings.cgiMaxResponseSize,
    });

    // Validate binary exists (only once)
    if (!this.cgiValidated) {
      const valid = await this.cgiExecutor.validateBinary();
      if (!valid) {
        logger.warn('[LegacyServer] CGI is enabled but php-cgi binary not found');
        this.cgiExecutor = null;
      }
      this.cgiValidated = true;
    }

    return this.cgiExecutor;
  }

  /**
   * Main file serving method - replicates ServeLegacy() from Go implementation
   * @param hostname The hostname from the request (e.g., "www.example.com")
   * @param urlPath The path from the request (e.g., "/path/file.swf")
   * @param requestContext Optional HTTP request context for CGI execution
   */
  async serveLegacy(
    hostname: string,
    urlPath: string,
    requestContext?: HttpRequestContext
  ): Promise<LegacyFileResponse> {
    // Get fresh settings at the start of the request
    const settings = ConfigManager.getSettings();

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

    logger.debug(`[LegacyServer] Serving: ${host}${urlPath}`);
    logger.debug(`[LegacyServer] Relative path: ${relPath}`);

    // Step 1: Build all path candidates
    const pathCandidates = this.buildPathCandidates(relPath, urlPath, settings);

    // Step 2: Try each candidate in order
    for (const candidate of pathCandidates) {
      logger.debug(`[LegacyServer] Trying: ${candidate.path} (${candidate.type})`);

      // Check negative cache to skip known-missing files
      if (this.isNegativelyCached(candidate.path)) {
        logger.debug(`[LegacyServer] Skipping cached negative lookup: ${candidate.path}`);
        continue;
      }

      try {
        // Validate path is within allowed base directory before accessing
        this.validateCandidatePath(candidate.path, candidate.type, settings);

        const stats = await fs.stat(candidate.path);

        if (stats.isFile()) {
          logger.info(`[LegacyServer] ✓ Found file: ${candidate.path}`);
          const isCgiBin = candidate.type === 'cgi-bin' || candidate.type === 'cgi-bin-no-query';
          return await this.serveFile(candidate.path, isCgiBin, requestContext, settings);
        }
      } catch (error) {
        // Only cache file-not-found errors, not security validation failures
        if (
          error instanceof Error &&
          'code' in error &&
          (error as NodeJS.ErrnoException).code === 'ENOENT'
        ) {
          this.cacheNegativeLookup(candidate.path);
        }
        continue;
      }
    }

    // Step 3: No local file found, try external sources
    logger.info(`[LegacyServer] File not found locally, trying external sources...`);
    return await this.tryExternalSources(relPath, settings);
  }

  /**
   * Build all path candidates in priority order
   * Replicates the path resolution algorithm from Go's ServeLegacy()
   */
  private buildPathCandidates(
    relPath: string,
    urlPath: string,
    settings: ReturnType<typeof ConfigManager.getSettings>
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
        path.join(settings.legacyHTDOCSPath, variantRelPath),
        hostVariation === hostname ? 'exact' : `subdomain:${hostVariation}`
      );

      // If URL has query string, try without it
      const pathWithoutQuery = variantRelPath.split('?')[0];
      if (pathWithoutQuery !== variantRelPath) {
        addCandidate(
          path.join(settings.legacyHTDOCSPath, pathWithoutQuery),
          hostVariation === hostname ? 'exact-no-query' : `subdomain:${hostVariation}-no-query`
        );
      }
    }

    // Use the original relPath for the rest of the logic
    const pathWithoutQuery = relPath.split('?')[0];

    // 2. Override paths (exact files in override directories)
    for (const override of settings.legacyOverridePaths) {
      addCandidate(path.join(settings.legacyHTDOCSPath, override, relPath), `override:${override}`);

      if (pathWithoutQuery !== relPath) {
        addCandidate(
          path.join(settings.legacyHTDOCSPath, override, pathWithoutQuery),
          `override:${override}-no-query`
        );
      }
    }

    // 3. CGI-BIN paths (for script files)
    if (this.isScriptUrl(urlPath)) {
      addCandidate(path.join(settings.legacyCGIBINPath, relPath), 'cgi-bin');

      if (pathWithoutQuery !== relPath) {
        addCandidate(path.join(settings.legacyCGIBINPath, pathWithoutQuery), 'cgi-bin-no-query');
      }
    }

    // 4. Index files (for directory requests)
    for (const ext of INDEX_EXTENSIONS) {
      addCandidate(path.join(settings.legacyHTDOCSPath, relPath, `index.${ext}`), `index:${ext}`);

      // Index files in override paths
      for (const override of settings.legacyOverridePaths) {
        addCandidate(
          path.join(settings.legacyHTDOCSPath, override, relPath, `index.${ext}`),
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
   * @param settings Current configuration settings
   * @throws Error if the path escapes its allowed base directory
   */
  private validateCandidatePath(
    candidatePath: string,
    candidateType: string,
    settings: ReturnType<typeof ConfigManager.getSettings>
  ): void {
    // Determine the allowed base directory based on candidate type
    let allowedBase: string;

    if (candidateType === 'cgi-bin' || candidateType === 'cgi-bin-no-query') {
      allowedBase = settings.legacyCGIBINPath;
    } else {
      // All other types use htdocs path
      allowedBase = settings.legacyHTDOCSPath;
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
   * @param requestContext HTTP request context for CGI execution
   * @param settings Current configuration settings
   */
  private async serveFile(
    filePath: string,
    isCGI: boolean = false,
    requestContext?: HttpRequestContext,
    settings?: ReturnType<typeof ConfigManager.getSettings>
  ): Promise<LegacyFileResponse> {
    // Get settings if not provided
    if (!settings) {
      settings = ConfigManager.getSettings();
    }
    // Determine content type first
    const ext = path.extname(filePath).substring(1).toLowerCase();
    const contentType = getMimeType(ext);

    // HTML files need polyfill injection, so buffer them
    // Brotli-compressed files also need buffering for decompression
    let needsBuffering =
      contentType.includes('text/html') ||
      (settings.enableBrotli && filePath.endsWith('.br')) ||
      isCGI;

    // Get file stats for size check
    const stat = await fs.stat(filePath);

    // If file is too large for buffering, skip polyfill injection and stream instead
    if (needsBuffering && stat.size > MAX_BUFFERED_FILE_SIZE) {
      logger.warn(
        `[LegacyServer] File too large for buffering (${stat.size} bytes), streaming without polyfill injection: ${filePath}`
      );
      needsBuffering = false;
    }

    if (needsBuffering) {
      // Read entire file into memory
      let data = await fs.readFile(filePath);

      // Handle Brotli compression
      if (settings.enableBrotli && filePath.endsWith('.br')) {
        logger.debug(`[LegacyServer] Decompressing Brotli file: ${filePath}`);
        data = await brotliDecompress(data);
        filePath = filePath.substring(0, filePath.length - 3); // Remove .br extension
      }

      // Execute CGI scripts if enabled
      if (isCGI && settings.enableCGI) {
        return await this.executeCgiScript(filePath, requestContext, settings);
      }

      return {
        data,
        contentType,
        source: 'local-htdocs',
      };
    }

    // Non-HTML, non-compressed files: stream for memory efficiency
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
   * Execute a CGI script and return the response
   * @param scriptPath Absolute path to the script file
   * @param requestContext HTTP request context (method, headers, body)
   * @param settings Current configuration settings
   */
  private async executeCgiScript(
    scriptPath: string,
    requestContext?: HttpRequestContext,
    settings?: ReturnType<typeof ConfigManager.getSettings>
  ): Promise<LegacyFileResponse> {
    // Get settings if not provided
    if (!settings) {
      settings = ConfigManager.getSettings();
    }
    const executor = await this.initCgiExecutor();

    if (!executor) {
      logger.warn('[LegacyServer] CGI executor not available for script');
      return {
        data: Buffer.from('CGI service unavailable'),
        contentType: 'text/plain',
        statusCode: 503,
        source: 'cgi-error',
      };
    }

    // Build URL from the script path for CGI environment
    // Extract the relative path from the script path
    let relativePath = scriptPath;
    if (scriptPath.startsWith(settings.legacyHTDOCSPath)) {
      relativePath = scriptPath.substring(settings.legacyHTDOCSPath.length);
    } else if (scriptPath.startsWith(settings.legacyCGIBINPath)) {
      relativePath = scriptPath.substring(settings.legacyCGIBINPath.length);
    }
    // Normalize path separators for URL
    relativePath = relativePath.replace(/\\/g, '/');
    if (!relativePath.startsWith('/')) {
      relativePath = '/' + relativePath;
    }

    // Build CgiRequest from HTTP context
    const cgiRequest: CgiRequest = {
      method: requestContext?.method || 'GET',
      url: new URL(`http://localhost${relativePath}`),
      headers: requestContext?.headers || {},
      body: requestContext?.body,
    };

    try {
      const response = await executor.execute(scriptPath, cgiRequest);

      return {
        data: response.body,
        contentType:
          response.headers['Content-Type'] || response.headers['content-type'] || 'text/html',
        source: 'cgi-script',
        statusCode: response.statusCode,
        headers: response.headers,
      };
    } catch (error) {
      logger.error(
        `[LegacyServer] CGI execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );

      // Return error response
      const errorMessage = 'CGI script execution failed';
      return {
        data: Buffer.from(errorMessage),
        contentType: 'text/plain',
        source: 'cgi-error',
        statusCode: 500,
      };
    }
  }

  /**
   * Try external sources (Infinity Server, MAD4FP, etc.)
   */
  private async tryExternalSources(
    relPath: string,
    settings: ReturnType<typeof ConfigManager.getSettings>
  ): Promise<LegacyFileResponse> {
    // Try Infinity Server first
    if (settings.infinityServerURL) {
      logger.info(`[LegacyServer] Trying Infinity Server...`);
      const result = await this.tryExternalSource(settings.infinityServerURL, relPath);
      if (result) {
        return { ...result, source: 'infinity-server' };
      }
    }

    // Try other external paths
    for (const externalPath of settings.externalFilePaths) {
      logger.info(`[LegacyServer] Trying: ${externalPath}`);
      const result = await this.tryExternalSource(externalPath, relPath);
      if (result) {
        return { ...result, source: externalPath };
      }
    }

    // Try MAD4FP if enabled
    if (settings.mad4fpEnabled) {
      for (const mad4fpPath of settings.mad4fpPaths) {
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
    let fullUrl: string;
    try {
      const resolved = new URL(relPath, normalizedBase);
      // Verify resolved URL still starts with base
      if (!resolved.href.startsWith(normalizedBase)) {
        logger.warn(`[LegacyServer] Path traversal blocked in external URL: ${relPath}`);
        return null;
      }
      fullUrl = resolved.href;
    } catch {
      return null;
    }

    logger.info(`[LegacyServer] Downloading: ${fullUrl}`);

    // Retry loop with exponential backoff
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      // Create abort controller for request timeout (G-H2)
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, EXTERNAL_REQUEST_TIMEOUT_MS);

      try {
        const response = await axiosInstance.get(fullUrl, {
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

        clearTimeout(timeoutId);
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
          if (error.response?.status === 404) {
            logger.debug(`[LegacyServer] ✗ Not found (404)`);
          } else if (error.response?.status === 403) {
            logger.warn(`[LegacyServer] ✗ Forbidden (403)`);
          } else if (
            error.code === 'ECONNABORTED' ||
            error.code === 'ETIMEDOUT' ||
            error.code === 'ERR_CANCELED'
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
            const safeMessage = sanitizeErrorMessage(error.message || 'Unknown error');
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

    // Add subdomain variations (skip if hostname already has that prefix)
    for (const subdomain of COMMON_SUBDOMAINS) {
      // Avoid creating nonsensical prefixes like "www.www.example.com"
      if (!hostname.startsWith(`${subdomain}.`)) {
        variations.push(`${subdomain}.${hostname}`);
      }
    }

    return variations;
  }
}
