import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface GameDataSource {
  type: string;
  name: string;
  arguments: string[];
}

export interface GameMetadataSource {
  name: string;
  baseUrl: string;
  games: {
    actualUpdateTime: string;
    latestDeleteTime: string;
    latestUpdateTime: string;
  };
  tags: {
    actualUpdateTime: string;
    latestDeleteTime: string;
    latestUpdateTime: string;
  };
  platforms?: {
    actualUpdateTime: string;
    latestDeleteTime: string;
    latestUpdateTime: string;
  };
}

export interface FlashpointPreferences {
  gameDataSources: GameDataSource[];
  dataPacksFolderPath: string;

  // Image-related preferences
  imageFolderPath?: string;
  logoFolderPath?: string;
  playlistFolderPath?: string;
  onDemandImages?: boolean;
  onDemandBaseUrl?: string;
  onDemandImagesCompressed?: boolean;

  // Metadata sync preferences
  gameMetadataSources?: GameMetadataSource[];

  [key: string]: unknown;
}

/**
 * Service for reading and caching Flashpoint preferences.
 * Reads from the main Flashpoint installation preferences.json file.
 */
export class PreferencesService {
  private static preferences: FlashpointPreferences | null = null;
  private static lastLoadTime: number = 0;
  private static lastLoadFailed: boolean = false;
  private static readonly CACHE_TTL = 60000; // 1 minute cache
  private static readonly ERROR_CACHE_TTL = 5000; // 5 second cache for errors

  /**
   * Get Flashpoint preferences, loading from disk if necessary.
   * Results are cached for performance.
   * Returns defaults on load failure (graceful degradation).
   */
  static async getPreferences(): Promise<FlashpointPreferences> {
    const now = Date.now();
    const cacheTTL = this.lastLoadFailed ? this.ERROR_CACHE_TTL : this.CACHE_TTL;

    // Return cached preferences if still valid
    if (this.preferences && now - this.lastLoadTime < cacheTTL) {
      return this.preferences;
    }

    // Load preferences from disk
    await this.loadPreferences();
    return this.preferences!;
  }

  /**
   * Load preferences from the Flashpoint installation directory.
   * Falls back to defaults on failure (graceful degradation).
   */
  private static async loadPreferences(): Promise<void> {
    try {
      const preferencesPath = path.join(config.flashpointPath, 'preferences.json');

      if (!fs.existsSync(preferencesPath)) {
        throw new Error(`Preferences file not found at: ${preferencesPath}`);
      }

      const content = await fs.promises.readFile(preferencesPath, 'utf-8');
      const parsed = JSON.parse(content);

      // Validate structure
      this.validatePreferences(parsed);

      // Cache preferences
      this.preferences = parsed;
      this.lastLoadTime = Date.now();
      this.lastLoadFailed = false;

      logger.info('Preferences loaded successfully', {
        sourceCount: parsed.gameDataSources?.length || 0,
        dataPacksPath: parsed.dataPacksFolderPath,
        imageFolderPath: parsed.imageFolderPath,
        onDemandBaseUrl: parsed.onDemandBaseUrl,
      });
    } catch (error) {
      logger.error('Failed to load preferences, using defaults:', error);

      // Graceful degradation: provide defaults
      this.preferences = {
        gameDataSources: [],
        dataPacksFolderPath: 'Data/Games',
      };
      this.lastLoadTime = Date.now();
      this.lastLoadFailed = true;
    }
  }

  private static validatePreferences(prefs: Record<string, unknown>): void {
    if (!prefs || typeof prefs !== 'object') {
      throw new Error('Preferences must be an object');
    }

    if (!Array.isArray(prefs.gameDataSources)) {
      throw new Error('preferences.gameDataSources must be an array');
    }

    if (typeof prefs.dataPacksFolderPath !== 'string') {
      throw new Error('preferences.dataPacksFolderPath must be a string');
    }

    // Validate each data source
    for (const source of prefs.gameDataSources) {
      if (!source.type || typeof source.type !== 'string') {
        throw new Error('Each gameDataSource must have a type string');
      }
      if (!source.name || typeof source.name !== 'string') {
        throw new Error('Each gameDataSource must have a name string');
      }
      if (!Array.isArray(source.arguments) || source.arguments.length === 0) {
        throw new Error('Each gameDataSource must have a non-empty arguments array');
      }
    }
  }

  static async getGameDataSources(): Promise<GameDataSource[]> {
    const prefs = await this.getPreferences();
    return prefs.gameDataSources || [];
  }

  static async getGameMetadataSources(): Promise<GameMetadataSource[]> {
    const prefs = await this.getPreferences();
    return prefs.gameMetadataSources || [];
  }

  /**
   * Check if a valid metadata source is configured.
   * Returns true if gameMetadataSources has at least one entry with a baseUrl.
   */
  static async hasMetadataSource(): Promise<boolean> {
    const sources = await this.getGameMetadataSources();
    return sources.length > 0 && !!sources[0]?.baseUrl;
  }

  static async getDataPacksPath(): Promise<string> {
    const prefs = await this.getPreferences();
    const dataPacksPath = prefs.dataPacksFolderPath || 'Data/Games';

    // Resolve relative to Flashpoint root
    return path.resolve(config.flashpointPath, dataPacksPath);
  }

  /**
   * Alias for getDataPacksPath() for compatibility.
   */
  static async getDataPacksFolderPath(): Promise<string> {
    return this.getDataPacksPath();
  }

  static async reload(): Promise<void> {
    this.preferences = null;
    this.lastLoadTime = 0;
    this.lastLoadFailed = false;
    await this.loadPreferences();
  }

  /**
   * Clear cached preferences (for testing).
   */
  static clearCache(): void {
    this.preferences = null;
    this.lastLoadTime = 0;
    this.lastLoadFailed = false;
  }

  /**
   * Alias for clearCache() for compatibility.
   */
  static invalidateCache(): void {
    this.clearCache();
  }
}
