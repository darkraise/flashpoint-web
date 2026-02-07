import fs from 'fs/promises';
import path from 'path';
import { logger } from '../../utils/logger';

/**
 * Game data source configuration from preferences.json
 * Used for downloading game ZIPs when not present locally
 */
export interface GameDataSource {
  type: string; // Currently only "raw" is used
  name: string; // Display name for the source
  arguments: string[]; // Array of arguments, first is the base URL
}

/**
 * Relevant fields from Flashpoint preferences.json
 */
export interface FlashpointPreferences {
  gameDataSources: GameDataSource[];
  dataPacksFolderPath: string;
  onDemandBaseUrl?: string;
}

/**
 * Service for reading Flashpoint preferences.json
 * Provides access to gameDataSources for downloading game ZIPs
 */
export class PreferencesService {
  private static instance: PreferencesService;
  private preferences: FlashpointPreferences | null = null;
  private flashpointPath: string;
  private preferencesPath: string;
  private lastLoadTime: number = 0;
  private lastLoadFailed: boolean = false;
  private readonly CACHE_TTL = 60 * 1000; // 1 minute cache
  private readonly ERROR_CACHE_TTL = 5000; // 5 seconds cache for errors

  private constructor(flashpointPath: string) {
    this.flashpointPath = flashpointPath;
    this.preferencesPath = path.join(flashpointPath, 'preferences.json');
  }

  /**
   * Initialize the PreferencesService singleton
   */
  static initialize(flashpointPath: string): PreferencesService {
    if (PreferencesService.instance) {
      if (flashpointPath !== PreferencesService.instance.flashpointPath) {
        logger.warn(
          '[PreferencesService] Already initialized with different path, ignoring re-init'
        );
      }
      return PreferencesService.instance;
    }
    PreferencesService.instance = new PreferencesService(flashpointPath);
    return PreferencesService.instance;
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): PreferencesService {
    if (!PreferencesService.instance) {
      throw new Error('PreferencesService not initialized. Call initialize() first.');
    }
    return PreferencesService.instance;
  }

  /**
   * Load preferences from file with caching
   */
  async loadPreferences(): Promise<FlashpointPreferences> {
    const now = Date.now();

    // Use shorter TTL if last load failed
    const cacheTTL = this.lastLoadFailed ? this.ERROR_CACHE_TTL : this.CACHE_TTL;

    // Return cached preferences if still valid
    if (this.preferences && now - this.lastLoadTime < cacheTTL) {
      return this.preferences;
    }

    try {
      const data = await fs.readFile(this.preferencesPath, 'utf-8');
      const parsed = JSON.parse(data);

      this.preferences = {
        gameDataSources: parsed.gameDataSources || [],
        dataPacksFolderPath: parsed.dataPacksFolderPath || 'Data/Games',
        onDemandBaseUrl: parsed.onDemandBaseUrl,
      };

      this.lastLoadTime = now;
      this.lastLoadFailed = false;

      logger.info(
        `[PreferencesService] Loaded preferences: ${this.preferences.gameDataSources.length} game data sources`
      );

      return this.preferences;
    } catch (error) {
      logger.error('[PreferencesService] Failed to load preferences.json:', error);

      // Return defaults if file doesn't exist or is invalid
      this.preferences = {
        gameDataSources: [],
        dataPacksFolderPath: 'Data/Games',
      };

      this.lastLoadTime = now;
      this.lastLoadFailed = true;

      return this.preferences;
    }
  }

  /**
   * Get game data sources for downloading ZIPs
   */
  async getGameDataSources(): Promise<GameDataSource[]> {
    const prefs = await this.loadPreferences();
    return prefs.gameDataSources;
  }

  /**
   * Get the data packs folder path (relative to FLASHPOINT_PATH)
   */
  async getDataPacksFolderPath(): Promise<string> {
    const prefs = await this.loadPreferences();
    return path.join(this.flashpointPath, prefs.dataPacksFolderPath);
  }

  /**
   * Invalidate the cache to force reload on next access
   */
  invalidateCache(): void {
    this.lastLoadTime = 0;
    logger.info('[PreferencesService] Cache invalidated');
  }
}
