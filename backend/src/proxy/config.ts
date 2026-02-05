import path from 'path';
import fs from 'fs/promises';
import { logger } from '../utils/logger';

export interface ServerSettings {
  // Proxy server port (default: 22500)
  proxyPort: number;

  // GameZip server port (default: 22501)
  gameZipPort: number;

  // Legacy paths
  legacyHTDOCSPath: string;
  legacyCGIBINPath: string;

  // Override paths for file resolution
  legacyOverridePaths: string[];

  // External fallback URLs
  infinityServerURL?: string;
  externalFilePaths: string[];

  // MAD4FP mode settings
  mad4fpEnabled: boolean;
  mad4fpPaths: string[];

  // Performance settings
  chunkSize: number;
  maxConcurrentDownloads: number;

  // Feature flags
  allowCrossDomain: boolean;
  enableBrotli: boolean;
  enableCGI: boolean;
  enableHtaccess: boolean;
}

export class ConfigManager {
  private static settings: ServerSettings | null = null;

  /**
   * Load configuration from proxySettings.json and environment
   */
  static async loadConfig(flashpointPath: string): Promise<ServerSettings> {
    try {
      const proxySettingsPath = path.join(flashpointPath, 'Server', 'proxySettings.json');
      const data = await fs.readFile(proxySettingsPath, 'utf-8');
      const proxySettings = JSON.parse(data);

      // Build settings from proxySettings.json and defaults
      this.settings = {
        proxyPort: parseInt(process.env.PROXY_PORT || '22500'),
        gameZipPort: parseInt(process.env.GAMEZIPSERVER_PORT || '22501'),

        legacyHTDOCSPath: path.join(flashpointPath, 'Legacy', 'htdocs'),
        legacyCGIBINPath: path.join(flashpointPath, 'Legacy', 'cgi-bin'),

        legacyOverridePaths: proxySettings.legacyOverridePaths || [],

        // Use HTTPS for external sources (servers redirect HTTP to HTTPS anyway)
        infinityServerURL: proxySettings.infinityServerURL
          ? proxySettings.infinityServerURL.replace(/^http:\/\//, 'https://')
          : 'https://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs/',

        externalFilePaths: (proxySettings.externalFilePaths || []).map((url: string) =>
          url.replace(/^http:\/\//, 'https://')
        ),

        mad4fpEnabled: proxySettings.mad4fpEnabled || false,
        mad4fpPaths: proxySettings.mad4fpPaths || [],

        chunkSize: 64 * 1024, // 64KB chunks for streaming
        maxConcurrentDownloads: 10,

        allowCrossDomain: true,
        enableBrotli: true,
        enableCGI: process.env.ENABLE_CGI === 'true',
        enableHtaccess: process.env.ENABLE_HTACCESS === 'true',
      };

      logger.info('[ProxyConfig] Configuration loaded successfully');
      logger.info(`[ProxyConfig] Proxy port: ${this.settings.proxyPort}`);
      logger.info(`[ProxyConfig] GameZip port: ${this.settings.gameZipPort}`);
      logger.info(`[ProxyConfig] HTDOCS path: ${this.settings.legacyHTDOCSPath}`);
      logger.info(`[ProxyConfig] Override paths: ${this.settings.legacyOverridePaths.length}`);
      logger.info(`[ProxyConfig] External sources: ${this.settings.externalFilePaths.length}`);

      return this.settings;
    } catch (error) {
      logger.error('[ProxyConfig] Failed to load proxySettings.json, using defaults', error);

      // Fallback to defaults
      this.settings = {
        proxyPort: 22500,
        gameZipPort: 22501,
        legacyHTDOCSPath: path.join(flashpointPath, 'Legacy', 'htdocs'),
        legacyCGIBINPath: path.join(flashpointPath, 'Legacy', 'cgi-bin'),
        legacyOverridePaths: [],
        infinityServerURL: 'https://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs/',
        externalFilePaths: [
          'https://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs',
          'https://infinity.unstable.life/Flashpoint/Legacy/htdocs/',
        ],
        mad4fpEnabled: false,
        mad4fpPaths: [],
        chunkSize: 64 * 1024,
        maxConcurrentDownloads: 10,
        allowCrossDomain: true,
        enableBrotli: true,
        enableCGI: false,
        enableHtaccess: false,
      };

      return this.settings;
    }
  }

  static getSettings(): ServerSettings {
    if (!this.settings) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.settings;
  }
}
