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

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 10,
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

const EXTERNAL_REQUEST_TIMEOUT_MS = 15000;
const EXTERNAL_REQUEST_MAX_REDIRECTS = 5;

const MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 1000;

const brotliDecompress = promisify(zlib.brotliDecompress);

const SCRIPT_EXTENSIONS = ['php', 'php5', 'phtml', 'pl'];

// 'swf' is included because many Flash game directories have index.swf as the entry point
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
  statusCode?: number;
  headers?: Record<string, string>;
}

export interface HttpRequestContext {
  method: string;
  headers: Record<string, string>;
  body?: Buffer;
}

export class LegacyServer {
  private cgiExecutor: CgiExecutor | null = null;
  private cgiValidated = false;

  private static readonly negativeLookupCache = new Map<string, number>();
  private static readonly NEGATIVE_CACHE_TTL_MS = 30000;
  private static readonly MAX_NEGATIVE_CACHE_SIZE = 5000;

  static clearCache(): void {
    LegacyServer.negativeLookupCache.clear();
    logger.info('[LegacyServer] Negative lookup cache cleared');
  }

  private isNegativelyCached(fullPath: string): boolean {
    const cachedAt = LegacyServer.negativeLookupCache.get(fullPath);
    if (cachedAt === undefined) return false;
    if (Date.now() - cachedAt > LegacyServer.NEGATIVE_CACHE_TTL_MS) {
      LegacyServer.negativeLookupCache.delete(fullPath);
      return false;
    }
    return true;
  }

  private cacheNegativeLookup(fullPath: string): void {
    if (LegacyServer.negativeLookupCache.size >= LegacyServer.MAX_NEGATIVE_CACHE_SIZE) {
      const firstKey = LegacyServer.negativeLookupCache.keys().next().value;
      if (firstKey) LegacyServer.negativeLookupCache.delete(firstKey);
    }
    LegacyServer.negativeLookupCache.set(fullPath, Date.now());
  }

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

  /** Replicates ServeLegacy() from Go implementation */
  async serveLegacy(
    hostname: string,
    urlPath: string,
    requestContext?: HttpRequestContext
  ): Promise<LegacyFileResponse> {
    const settings = ConfigManager.getSettings();

    try {
      urlPath = sanitizeUrlPath(urlPath);
    } catch (error) {
      logger.error(`[LegacyServer] Invalid URL path: ${urlPath}`);
      throw new Error('Invalid URL path');
    }

    const host = hostname.split(':')[0];
    const relPath = path.posix.join(host, urlPath);

    logger.debug(`[LegacyServer] Serving: ${host}${urlPath}`);
    logger.debug(`[LegacyServer] Relative path: ${relPath}`);

    const pathCandidates = this.buildPathCandidates(relPath, urlPath, settings);

    for (const candidate of pathCandidates) {
      logger.debug(`[LegacyServer] Trying: ${candidate.path} (${candidate.type})`);

      if (this.isNegativelyCached(candidate.path)) {
        logger.debug(`[LegacyServer] Skipping cached negative lookup: ${candidate.path}`);
        continue;
      }

      try {
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

    logger.info(`[LegacyServer] File not found locally, trying external sources...`);
    return await this.tryExternalSources(relPath, settings);
  }

  /** Build all path candidates in priority order (replicates Go's ServeLegacy() algorithm) */
  private buildPathCandidates(
    relPath: string,
    urlPath: string,
    settings: ReturnType<typeof ConfigManager.getSettings>
  ): Array<{ path: string; type: string }> {
    const candidates: Array<{ path: string; type: string }> = [];
    const seenPaths = new Set<string>();

    const addCandidate = (candidatePath: string, type: string) => {
      const normalizedPath = path.normalize(candidatePath).toLowerCase();
      if (!seenPaths.has(normalizedPath)) {
        seenPaths.add(normalizedPath);
        candidates.push({ path: candidatePath, type });
      }
    };

    const parts = relPath.split('/');
    const hostname = parts[0];
    const pathAfterHost = parts.slice(1).join('/');

    const hostnameVariations = this.getHostnameVariations(hostname);

    for (const hostVariation of hostnameVariations) {
      const variantRelPath = path.posix.join(hostVariation, pathAfterHost);

      addCandidate(
        path.join(settings.legacyHTDOCSPath, variantRelPath),
        hostVariation === hostname ? 'exact' : `subdomain:${hostVariation}`
      );

      const pathWithoutQuery = variantRelPath.split('?')[0];
      if (pathWithoutQuery !== variantRelPath) {
        addCandidate(
          path.join(settings.legacyHTDOCSPath, pathWithoutQuery),
          hostVariation === hostname ? 'exact-no-query' : `subdomain:${hostVariation}-no-query`
        );
      }
    }

    const pathWithoutQuery = relPath.split('?')[0];

    for (const override of settings.legacyOverridePaths) {
      addCandidate(path.join(settings.legacyHTDOCSPath, override, relPath), `override:${override}`);

      if (pathWithoutQuery !== relPath) {
        addCandidate(
          path.join(settings.legacyHTDOCSPath, override, pathWithoutQuery),
          `override:${override}-no-query`
        );
      }
    }

    if (this.isScriptUrl(urlPath)) {
      addCandidate(path.join(settings.legacyCGIBINPath, relPath), 'cgi-bin');

      if (pathWithoutQuery !== relPath) {
        addCandidate(path.join(settings.legacyCGIBINPath, pathWithoutQuery), 'cgi-bin-no-query');
      }
    }

    for (const ext of INDEX_EXTENSIONS) {
      addCandidate(path.join(settings.legacyHTDOCSPath, relPath, `index.${ext}`), `index:${ext}`);

      for (const override of settings.legacyOverridePaths) {
        addCandidate(
          path.join(settings.legacyHTDOCSPath, override, relPath, `index.${ext}`),
          `index-override:${override}:${ext}`
        );
      }
    }

    return candidates;
  }

  private validateCandidatePath(
    candidatePath: string,
    candidateType: string,
    settings: ReturnType<typeof ConfigManager.getSettings>
  ): void {
    let allowedBase: string;

    if (candidateType === 'cgi-bin' || candidateType === 'cgi-bin-no-query') {
      allowedBase = settings.legacyCGIBINPath;
    } else {
      allowedBase = settings.legacyHTDOCSPath;
    }

    try {
      sanitizeAndValidatePath(allowedBase, candidatePath);
    } catch (error) {
      logger.warn(`[Security] Path validation failed for ${candidateType}: ${candidatePath}`);
      throw error;
    }
  }

  private isScriptUrl(urlPath: string): boolean {
    const ext = path.extname(urlPath).toLowerCase().substring(1);
    return SCRIPT_EXTENSIONS.includes(ext);
  }

  private async serveFile(
    filePath: string,
    isCGI: boolean = false,
    requestContext?: HttpRequestContext,
    settings?: ReturnType<typeof ConfigManager.getSettings>
  ): Promise<LegacyFileResponse> {
    if (!settings) {
      settings = ConfigManager.getSettings();
    }
    const ext = path.extname(filePath).substring(1).toLowerCase();
    const contentType = getMimeType(ext);

    // HTML needs polyfill injection, Brotli needs decompression — both require buffering
    let needsBuffering =
      contentType.includes('text/html') ||
      (settings.enableBrotli && filePath.endsWith('.br')) ||
      isCGI;

    const stat = await fs.stat(filePath);

    if (needsBuffering && stat.size > MAX_BUFFERED_FILE_SIZE) {
      logger.warn(
        `[LegacyServer] File too large for buffering (${stat.size} bytes), streaming without polyfill injection: ${filePath}`
      );
      needsBuffering = false;
    }

    if (needsBuffering) {
      let data = await fs.readFile(filePath);

      if (settings.enableBrotli && filePath.endsWith('.br')) {
        logger.debug(`[LegacyServer] Decompressing Brotli file: ${filePath}`);
        data = await brotliDecompress(data);
        filePath = filePath.substring(0, filePath.length - 3);
      }

      if (isCGI && settings.enableCGI) {
        return await this.executeCgiScript(filePath, requestContext, settings);
      }

      return {
        data,
        contentType,
        source: 'local-htdocs',
      };
    }

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

  private async executeCgiScript(
    scriptPath: string,
    requestContext?: HttpRequestContext,
    settings?: ReturnType<typeof ConfigManager.getSettings>
  ): Promise<LegacyFileResponse> {
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

    let relativePath = scriptPath;
    if (scriptPath.startsWith(settings.legacyHTDOCSPath)) {
      relativePath = scriptPath.substring(settings.legacyHTDOCSPath.length);
    } else if (scriptPath.startsWith(settings.legacyCGIBINPath)) {
      relativePath = scriptPath.substring(settings.legacyCGIBINPath.length);
    }
    relativePath = relativePath.replace(/\\/g, '/');
    if (!relativePath.startsWith('/')) {
      relativePath = '/' + relativePath;
    }

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

      const errorMessage = 'CGI script execution failed';
      return {
        data: Buffer.from(errorMessage),
        contentType: 'text/plain',
        source: 'cgi-error',
        statusCode: 500,
      };
    }
  }

  private async tryExternalSources(
    relPath: string,
    settings: ReturnType<typeof ConfigManager.getSettings>
  ): Promise<LegacyFileResponse> {
    if (settings.infinityServerURL) {
      logger.info(`[LegacyServer] Trying Infinity Server...`);
      const result = await this.tryExternalSource(settings.infinityServerURL, relPath);
      if (result) {
        return { ...result, source: 'infinity-server' };
      }
    }

    for (const externalPath of settings.externalFilePaths) {
      logger.info(`[LegacyServer] Trying: ${externalPath}`);
      const result = await this.tryExternalSource(externalPath, relPath);
      if (result) {
        return { ...result, source: externalPath };
      }
    }

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

  private isRetryableError(error: unknown): boolean {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status && status >= 400 && status < 500) {
        return false;
      }

      if (status && status >= 500) {
        return true;
      }

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

  /** Download from external source with exponential backoff retry */
  private async tryExternalSource(
    baseUrl: string,
    relPath: string
  ): Promise<{ data: Buffer; contentType: string } | null> {
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    let fullUrl: string;
    try {
      const resolved = new URL(relPath, normalizedBase);
      if (!resolved.href.startsWith(normalizedBase)) {
        logger.warn(`[LegacyServer] Path traversal blocked in external URL: ${relPath}`);
        return null;
      }
      fullUrl = resolved.href;
    } catch {
      return null;
    }

    logger.info(`[LegacyServer] Downloading: ${fullUrl}`);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
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
          maxContentLength: 100 * 1024 * 1024,
          maxBodyLength: 100 * 1024 * 1024,
        });

        clearTimeout(timeoutId);
        const data = Buffer.from(response.data);

        // Derive content type from file extension, not response header, to prevent MIME spoofing
        const ext = path.extname(relPath).substring(1).toLowerCase();
        const contentType = ext ? getMimeType(ext) : 'application/octet-stream';

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

        const isLastAttempt = attempt === MAX_RETRIES;
        const shouldRetry = !isLastAttempt && this.isRetryableError(error);

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

        if (shouldRetry) {
          const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
          logger.info(`[LegacyServer] Retrying in ${delayMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        return null;
      }
    }

    return null;
  }

  /**
   * Generate hostname variations with common subdomain prefixes.
   * Handles cases where files are stored under a subdomain prefix
   * (e.g., core.mochibot.com/) but requested without one (e.g., mochibot.com/).
   */
  private getHostnameVariations(hostname: string): string[] {
    const variations: string[] = [hostname];

    for (const subdomain of COMMON_SUBDOMAINS) {
      if (!hostname.startsWith(`${subdomain}.`)) {
        variations.push(`${subdomain}.${hostname}`);
      }
    }

    return variations;
  }
}
