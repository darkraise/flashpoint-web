import path from 'path';
import fs from 'fs/promises';
import { logger } from '../utils/logger';
import { z } from 'zod';

/**
 * Maximum file size for buffering in memory (50MB)
 * Used consistently across gamezipserver, zip-manager, and legacy-server
 */
export const MAX_BUFFERED_FILE_SIZE = 50 * 1024 * 1024;

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

  // Feature flags
  allowCrossDomain: boolean;
  enableBrotli: boolean;
  enableCGI: boolean;

  // CGI settings
  phpCgiPath: string;
  cgiTimeout: number;
  cgiMaxBodySize: number;
  cgiMaxResponseSize: number;
}

// Zod schema for proxySettings.json validation
const proxySettingsSchema = z
  .object({
    legacyOverridePaths: z.array(z.string()).default([]),
    externalFilePaths: z.array(z.string()).default([]),
    legacyHTDOCSPath: z.string().optional(),
    infinityServerURL: z.string().optional(),
    mad4fpEnabled: z.boolean().optional(),
    mad4fpPaths: z.array(z.string()).optional(),
    enableCGI: z.boolean().default(false),
    phpCgiPath: z.string().optional(),
    cgiTimeout: z.number().default(30000),
    cgiMaxBodySize: z.number().optional(),
    cgiMaxResponseSize: z.number().optional(),
  })
  .passthrough();

export class ConfigManager {
  private static settings: ServerSettings | null = null;

  /**
   * Load configuration from proxySettings.json and environment
   */
  static async loadConfig(flashpointPath: string): Promise<ServerSettings> {
    if (ConfigManager.settings) {
      logger.warn('[ConfigManager] Re-initializing configuration - this may indicate a bug');
    }

    try {
      const proxySettingsPath = path.join(flashpointPath, 'Server', 'proxySettings.json');
      const data = await fs.readFile(proxySettingsPath, 'utf-8');
      const parsed = JSON.parse(data);

      // Validate with Zod schema
      let proxySettings;
      try {
        proxySettings = proxySettingsSchema.parse(parsed);
        logger.info('[ConfigManager] Configuration validated successfully');
      } catch (error) {
        if (error instanceof z.ZodError) {
          logger.error('[ConfigManager] Schema validation failed:', error.errors);
          throw new Error('Invalid proxySettings.json structure');
        }
        throw error;
      }

      // Build settings from proxySettings.json and defaults
      // Ports hardcoded - use docker-compose port mapping to expose on different ports
      this.settings = {
        proxyPort: 22500,
        gameZipPort: 22501,

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

        allowCrossDomain: true,
        enableBrotli: true,
        enableCGI: process.env.ENABLE_CGI === 'true',

        // CGI settings
        phpCgiPath:
          proxySettings.phpCgiPath ||
          path.join(
            flashpointPath,
            'Legacy',
            process.platform === 'win32' ? 'php-cgi.exe' : 'php-cgi'
          ),
        cgiTimeout: proxySettings.cgiTimeout ?? 30000, // 30 seconds
        cgiMaxBodySize: proxySettings.cgiMaxBodySize || 10 * 1024 * 1024, // 10MB
        cgiMaxResponseSize: proxySettings.cgiMaxResponseSize || 50 * 1024 * 1024, // 50MB
      };

      logger.info('[ConfigManager] Configuration loaded successfully');
      logger.info(`[ConfigManager] Proxy port: ${this.settings.proxyPort}`);
      logger.info(`[ConfigManager] GameZip port: ${this.settings.gameZipPort}`);
      logger.info(`[ConfigManager] HTDOCS path: ${this.settings.legacyHTDOCSPath}`);
      logger.info(`[ConfigManager] Override paths: ${this.settings.legacyOverridePaths.length}`);
      logger.info(`[ConfigManager] External sources: ${this.settings.externalFilePaths.length}`);

      return this.settings;
    } catch (error: unknown) {
      // Differentiate between file not found and JSON parse errors
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        logger.warn('[ConfigManager] proxySettings.json not found, using defaults');
      } else {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[ConfigManager] Failed to parse proxySettings.json:', errorMsg);
      }

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
        allowCrossDomain: true,
        enableBrotli: true,
        enableCGI: false,

        // CGI settings (defaults when proxySettings.json not available)
        phpCgiPath: path.join(
          flashpointPath,
          'Legacy',
          process.platform === 'win32' ? 'php-cgi.exe' : 'php-cgi'
        ),
        cgiTimeout: 30000,
        cgiMaxBodySize: 10 * 1024 * 1024,
        cgiMaxResponseSize: 50 * 1024 * 1024,
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
