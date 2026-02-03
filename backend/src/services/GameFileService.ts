import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import http from 'http';
import { logger } from '../utils/logger';
import { config } from '../config';

interface ProxySettings {
  infinityServerURL?: string;
  externalFilePaths?: string[];
}

/**
 * Service to handle game file requests with automatic fallback to external archives
 * This makes the web app independent of the Game Server's useInfinityServer setting
 */
export class GameFileService {
  private infinityServerURL: string | null = null;
  private externalFilePaths: string[] = [];
  private gameServerUrl = 'http://localhost:22500';

  constructor() {
    this.loadProxySettings();
  }

  /**
   * Load external fallback URLs from proxySettings.json
   */
  private async loadProxySettings() {
    try {
      const proxySettingsPath = path.join(config.flashpointPath, 'Server', 'proxySettings.json');
      const data = await fs.readFile(proxySettingsPath, 'utf-8');
      const settings: ProxySettings = JSON.parse(data);

      // Use externalFilePaths directly - these have the correct HTTP URLs
      this.externalFilePaths = settings.externalFilePaths || [];

      // Fix infinityServerURL if it uses HTTPS (should be HTTP)
      if (settings.infinityServerURL) {
        this.infinityServerURL = settings.infinityServerURL.replace(/^https:\/\//, 'http://');
      }

      logger.info(`[GameFileService] Loaded proxy settings`);
      logger.info(`[GameFileService] Infinity Server: ${this.infinityServerURL}`);
      logger.info(`[GameFileService] External paths: ${this.externalFilePaths.length} sources`);

      // Log all sources for debugging
      this.externalFilePaths.forEach((path, i) => {
        logger.info(`[GameFileService]   [${i + 1}] ${path}`);
      });
    } catch (error) {
      logger.warn('[GameFileService] Could not load proxySettings.json, using defaults');
      // Use HTTP (not HTTPS) as per Flashpoint documentation
      this.infinityServerURL = 'http://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs/';
      this.externalFilePaths = [
        'http://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs',
        'http://infinity.unstable.life/Flashpoint/Legacy/htdocs/',
      ];
    }
  }

  /**
   * Get a game file, with automatic fallback to external sources
   * @param urlPath The path like "www.example.com/path/file.swf"
   * @returns File buffer and content type
   */
  async getGameFile(
    urlPath: string
  ): Promise<{ data: Buffer; contentType: string; source: string }> {
    logger.info(`[GameFileService] ========================================`);
    logger.info(`[GameFileService] Requested: ${urlPath}`);

    // First, try the local Game Server
    logger.info(`[GameFileService] [1/4] Trying local Game Server (localhost:22500)...`);
    try {
      const result = await this.tryGameServer(urlPath);
      if (result) {
        logger.info(`[GameFileService] ✓ Found in Game Server!`);
        return { ...result, source: 'game-server' };
      }
    } catch (error) {
      logger.warn(`[GameFileService] ✗ Game Server error: ${error}`);
    }

    // If Game Server returns 404, try external sources
    logger.info(`[GameFileService] File not found locally, trying external archives...`);

    // Try Infinity Server first
    if (this.infinityServerURL) {
      logger.info(`[GameFileService] [2/4] Trying Infinity Server...`);
      const result = await this.tryExternalSource(this.infinityServerURL, urlPath);
      if (result) {
        logger.info(`[GameFileService] ✓ Found in Infinity Server!`);
        return { ...result, source: 'infinity-server' };
      }
    }

    // Try other external paths
    let attemptNum = 3;
    for (const externalPath of this.externalFilePaths) {
      logger.info(
        `[GameFileService] [${attemptNum}/${3 + this.externalFilePaths.length}] Trying: ${externalPath}`
      );
      const result = await this.tryExternalSource(externalPath, urlPath);
      if (result) {
        logger.info(`[GameFileService] ✓ Found in external source!`);
        return { ...result, source: externalPath };
      }
      attemptNum++;
    }

    logger.error(
      `[GameFileService] ✗ File not found in any source (tried ${2 + this.externalFilePaths.length} sources)`
    );
    throw new Error('File not found in Game Server or any external source');
  }

  /**
   * Try to get file from the local Game Server
   */
  private async tryGameServer(
    urlPath: string
  ): Promise<{ data: Buffer; contentType: string } | null> {
    return new Promise((resolve, reject) => {
      // Make proxy-style HTTP request
      const fullUrl = `http://${urlPath}`;
      const parsedUrl = new URL(fullUrl);

      const options: http.RequestOptions = {
        hostname: 'localhost',
        port: 22500,
        path: fullUrl,
        method: 'GET',
        headers: {
          Host: parsedUrl.hostname,
          'User-Agent': 'Flashpoint-WebApp/1.0',
        },
        timeout: 10000,
      };

      const req = http.request(options, (res) => {
        if (res.statusCode === 404) {
          resolve(null); // Not found, will try external sources
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const data = Buffer.concat(chunks);
          const contentType = res.headers['content-type'] || 'application/octet-stream';
          resolve({ data, contentType });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout'));
      });

      req.end();
    });
  }

  /**
   * Try to download file from an external source
   */
  private async tryExternalSource(
    baseUrl: string,
    urlPath: string
  ): Promise<{ data: Buffer; contentType: string } | null> {
    // Construct full URL
    // baseUrl might be: http://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs/
    // urlPath is: www.example.com/path/file.swf
    // Result: http://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs/www.example.com/path/file.swf
    //
    // Special case for archive.org ZIP files:
    // baseUrl: http://archive.org/download/FP90Data/FP90Data.zip/htdocs
    // Result: http://archive.org/download/FP90Data/FP90Data.zip/htdocs/www.example.com/path/file.swf

    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const fullUrl = `${normalizedBase}${urlPath}`;

    logger.info(`[GameFileService] Downloading: ${fullUrl}`);

    try {
      const response = await axios.get(fullUrl, {
        responseType: 'arraybuffer',
        timeout: 45000, // Increased timeout for slow external servers
        maxRedirects: 5,
        validateStatus: (status) => status === 200,
        headers: {
          'User-Agent': 'Flashpoint-WebApp/1.0',
        },
      });

      const data = Buffer.from(response.data);
      const contentType = response.headers['content-type'] || 'application/octet-stream';

      logger.info(`[GameFileService] ✓ Success: ${data.length} bytes (${contentType})`);

      // TODO: Optionally cache the file locally for future requests

      return { data, contentType };
    } catch (error) {
      // Log detailed error but return null to try next source
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          logger.warn(`[GameFileService] ✗ Not found (404)`);
        } else if (error.response?.status === 403) {
          logger.warn(`[GameFileService] ✗ Forbidden (403) - access denied`);
        } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          logger.warn(`[GameFileService] ✗ Timeout after 45s`);
        } else if (error.code === 'ENOTFOUND') {
          logger.warn(`[GameFileService] ✗ DNS resolution failed`);
        } else if (error.response) {
          logger.warn(
            `[GameFileService] ✗ HTTP ${error.response.status}: ${error.response.statusText}`
          );
        } else if (error.request) {
          logger.warn(`[GameFileService] ✗ No response received: ${error.message}`);
        } else {
          logger.warn(`[GameFileService] ✗ Network error: ${error.message}`);
        }
      } else {
        logger.warn(`[GameFileService] ✗ Unexpected error: ${error}`);
      }

      // Always return null instead of throwing, so we can try the next source
      return null;
    }
  }
}
