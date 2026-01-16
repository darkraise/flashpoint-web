import path from 'path';
import fs from 'fs/promises';
import { logger } from './utils/logger';
import { ConfigManager } from './config';
import { getMimeType } from './mimeTypes';
import axios from 'axios';
import zlib from 'zlib';
import { promisify } from 'util';

const brotliDecompress = promisify(zlib.brotliDecompress);

// Script file extensions
const SCRIPT_EXTENSIONS = ['php', 'php5', 'phtml', 'pl'];

// Index file extensions (in priority order)
const INDEX_EXTENSIONS = ['html', 'htm', 'php', 'swf'];

export interface LegacyFileResponse {
  data: Buffer;
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
        const stats = await fs.stat(candidate.path);

        if (stats.isFile()) {
          logger.info(`[LegacyServer] ✓ Found file: ${candidate.path}`);
          return await this.serveFile(candidate.path, candidate.type === 'cgi-bin');
        }
      } catch (error) {
        // File doesn't exist, continue to next candidate
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
  private buildPathCandidates(relPath: string, urlPath: string): Array<{ path: string; type: string }> {
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
      addCandidate(
        path.join(this.settings.legacyCGIBINPath, relPath),
        'cgi-bin'
      );

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
    // Read file
    let data = await fs.readFile(filePath);

    // Handle Brotli compression
    if (this.settings.enableBrotli && filePath.endsWith('.br')) {
      logger.debug(`[LegacyServer] Decompressing Brotli file: ${filePath}`);
      data = await brotliDecompress(data);
      filePath = filePath.substring(0, filePath.length - 3); // Remove .br extension
    }

    // Determine content type
    const ext = path.extname(filePath).substring(1).toLowerCase();
    const contentType = getMimeType(ext);

    // TODO: Execute CGI scripts if enabled
    if (isCGI && this.settings.enableCGI) {
      logger.warn('[LegacyServer] CGI execution not yet implemented');
    }

    return {
      data,
      contentType,
      source: 'local-htdocs'
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
   * Download from external source
   */
  private async tryExternalSource(
    baseUrl: string,
    relPath: string
  ): Promise<{ data: Buffer; contentType: string } | null> {
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const fullUrl = `${normalizedBase}${relPath}`;

    logger.info(`[LegacyServer] Downloading: ${fullUrl}`);

    try {
      const response = await axios.get(fullUrl, {
        responseType: 'arraybuffer',
        timeout: 45000,
        maxRedirects: 5,
        validateStatus: (status) => status === 200,
        headers: {
          'User-Agent': 'Flashpoint-Proxy/1.0',
        },
      });

      const data = Buffer.from(response.data);
      const contentType = response.headers['content-type'] || 'application/octet-stream';

      logger.info(`[LegacyServer] ✓ Downloaded: ${data.length} bytes (${contentType})`);

      return { data, contentType };
    } catch (error) {
      // Log but don't throw - allow trying next source
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          logger.debug(`[LegacyServer] ✗ Not found (404)`);
        } else if (error.response?.status === 403) {
          logger.warn(`[LegacyServer] ✗ Forbidden (403)`);
        } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          logger.warn(`[LegacyServer] ✗ Timeout`);
        } else {
          logger.warn(`[LegacyServer] ✗ Error: ${error.message}`);
        }
      }

      return null;
    }
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

    // Common subdomain prefixes used in Flashpoint content
    const subdomains = [
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
      'download'
    ];

    // Add subdomain variations
    for (const subdomain of subdomains) {
      variations.push(`${subdomain}.${hostname}`);
    }

    return variations;
  }
}
