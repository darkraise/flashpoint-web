import fs from 'fs/promises';
import path from 'path';
import { logger } from '../../utils/logger';

export interface GameDataSource {
  type: string;
  name: string;
  arguments: string[]; // First element is the base URL
}

export interface FlashpointPreferences {
  gameDataSources: GameDataSource[];
  dataPacksFolderPath: string;
  onDemandBaseUrl?: string;
}

export class PreferencesService {
  private static instance: PreferencesService;
  private preferences: FlashpointPreferences | null = null;
  private flashpointPath: string;
  private preferencesPath: string;
  private lastLoadTime: number = 0;
  private lastLoadFailed: boolean = false;
  private readonly CACHE_TTL = 60 * 1000;
  private readonly ERROR_CACHE_TTL = 5000;

  private constructor(flashpointPath: string) {
    this.flashpointPath = flashpointPath;
    this.preferencesPath = path.join(flashpointPath, 'preferences.json');
  }

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

  static getInstance(): PreferencesService {
    if (!PreferencesService.instance) {
      throw new Error('PreferencesService not initialized. Call initialize() first.');
    }
    return PreferencesService.instance;
  }

  async loadPreferences(): Promise<FlashpointPreferences> {
    const now = Date.now();

    const cacheTTL = this.lastLoadFailed ? this.ERROR_CACHE_TTL : this.CACHE_TTL;

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

      this.preferences = {
        gameDataSources: [],
        dataPacksFolderPath: 'Data/Games',
      };

      this.lastLoadTime = now;
      this.lastLoadFailed = true;

      return this.preferences;
    }
  }

  async getGameDataSources(): Promise<GameDataSource[]> {
    const prefs = await this.loadPreferences();
    return prefs.gameDataSources;
  }

  async getDataPacksFolderPath(): Promise<string> {
    const prefs = await this.loadPreferences();
    return path.join(this.flashpointPath, prefs.dataPacksFolderPath);
  }

  invalidateCache(): void {
    this.lastLoadTime = 0;
    logger.info('[PreferencesService] Cache invalidated');
  }
}
