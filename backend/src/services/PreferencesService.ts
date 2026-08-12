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
    return this.loadPreferences();
  }

  /**
   * Load preferences from the Flashpoint installation directory.
   * Falls back to defaults on failure (graceful degradation).
   */
  private static async loadPreferences(): Promise<FlashpointPreferences> {
    try {
      const preferencesPath = path.join(config.flashpointPath, 'preferences.json');

      if (!fs.existsSync(preferencesPath)) {
        throw new Error(`Preferences file not found at: ${preferencesPath}`);
      }

      const content = await fs.promises.readFile(preferencesPath, 'utf-8');
      const parsed = JSON.parse(content);

      const preferences = this.normalizePreferences(parsed);

      // Cache preferences
      this.preferences = preferences;
      this.lastLoadTime = Date.now();
      this.lastLoadFailed = false;

      logger.info('Preferences loaded successfully', {
        sourceCount: preferences.gameDataSources.length,
        dataPacksPath: preferences.dataPacksFolderPath,
        imageFolderPath: preferences.imageFolderPath,
        onDemandBaseUrl: preferences.onDemandBaseUrl,
      });

      return preferences;
    } catch (error) {
      logger.error('Failed to load preferences, using defaults:', error);

      // Graceful degradation: provide defaults
      const defaults: FlashpointPreferences = {
        gameDataSources: [],
        dataPacksFolderPath: 'Data/Games',
      };

      this.preferences = defaults;
      this.lastLoadTime = Date.now();
      this.lastLoadFailed = true;

      return defaults;
    }
  }

  private static isGameDataSource(source: unknown): source is GameDataSource {
    if (!source || typeof source !== 'object') return false;

    const candidate = source as Partial<GameDataSource>;
    return (
      typeof candidate.type === 'string' &&
      candidate.type.length > 0 &&
      typeof candidate.name === 'string' &&
      candidate.name.length > 0 &&
      Array.isArray(candidate.arguments) &&
      candidate.arguments.length > 0
    );
  }

  /**
   * Fills in the two fields the rest of the app relies on and leaves everything
   * else as written.
   *
   * Only a file that is not an object at all is rejected. Ultimate ships
   * preferences.json without gameDataSources, so treating a missing key as fatal
   * threw away that edition's entire configuration — image paths and all — and
   * silently replaced it with Infinity-shaped defaults.
   */
  private static normalizePreferences(prefs: unknown): FlashpointPreferences {
    if (!prefs || typeof prefs !== 'object' || Array.isArray(prefs)) {
      throw new Error('Preferences must be an object');
    }

    const parsed = prefs as Record<string, unknown>;

    const declaredSources = parsed.gameDataSources;
    let gameDataSources: GameDataSource[] = [];

    if (Array.isArray(declaredSources)) {
      gameDataSources = declaredSources.filter((source) => this.isGameDataSource(source));

      if (gameDataSources.length !== declaredSources.length) {
        logger.warn(
          `Ignoring ${declaredSources.length - gameDataSources.length} malformed entries in preferences.gameDataSources`
        );
      }
    } else if (declaredSources !== undefined) {
      logger.warn('Ignoring preferences.gameDataSources: expected an array');
    }

    const declaredPacksPath = parsed.dataPacksFolderPath;
    const hasPacksPath = typeof declaredPacksPath === 'string' && declaredPacksPath.length > 0;

    if (!hasPacksPath && declaredPacksPath !== undefined) {
      logger.warn('Ignoring preferences.dataPacksFolderPath: expected a non-empty string');
    }

    return {
      ...parsed,
      gameDataSources,
      dataPacksFolderPath: hasPacksPath ? declaredPacksPath : 'Data/Games',
    };
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

  /**
   * When the local metadata was last synced, or null when it never was.
   * Flashpoint seeds the timestamps of an unsynced source with the Unix epoch,
   * which is not a date worth showing anyone.
   */
  static async getLastMetadataUpdate(): Promise<string | null> {
    const sources = await this.getGameMetadataSources();

    const syncTimes = sources
      .map((source) => Date.parse(source.games?.actualUpdateTime ?? ''))
      .filter((time) => !isNaN(time) && time > 0);

    if (syncTimes.length === 0) {
      return null;
    }

    return new Date(Math.max(...syncTimes)).toISOString();
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
