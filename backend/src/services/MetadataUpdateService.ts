import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

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

export interface MetadataUpdateInfo {
  hasUpdates: boolean;
  gamesUpdateAvailable: boolean;
  tagsUpdateAvailable: boolean;
  gamesUpdateCount?: number;
  tagsUpdateCount?: number;
  lastCheckedTime?: string;
  lastUpdateTime?: string;
  source?: GameMetadataSource;
}

export class MetadataUpdateService {
  private preferencesPath: string;

  constructor() {
    // Preferences file is in the Flashpoint root directory
    this.preferencesPath = path.join(config.flashpointPath, 'preferences.json');
  }

  /**
   * Get the current Flashpoint edition from config (auto-detected from version.txt)
   */
  getEdition(): string {
    return config.flashpointEdition;
  }

  /**
   * Get game metadata update information by querying FPFSS API
   * This matches exactly how the Flashpoint Launcher checks for game info updates
   * See: https://github.com/FlashpointProject/launcher/blob/master/src/back/sync.ts
   */
  async getMetadataUpdateInfo(): Promise<MetadataUpdateInfo> {
    try {
      // Ultimate edition does not support metadata sync
      if (this.getEdition() === 'ultimate') {
        return {
          hasUpdates: false,
          gamesUpdateAvailable: false,
          tagsUpdateAvailable: false,
        };
      }
      // Read preferences file
      const preferencesContent = await fs.readFile(this.preferencesPath, 'utf-8');
      const preferences = JSON.parse(preferencesContent);

      // Get game metadata sources (usually Flashpoint Archive FPFSS)
      const sources: GameMetadataSource[] = preferences.gameMetadataSources || [];

      if (sources.length === 0) {
        logger.warn('[MetadataUpdate] No game metadata sources found in preferences');
        return {
          hasUpdates: false,
          gamesUpdateAvailable: false,
          tagsUpdateAvailable: false,
        };
      }

      // Use the first source (usually Flashpoint Archive)
      const source = sources[0];

      // Get ACTUAL update counts from FPFSS API (like the Launcher does)
      const gamesUpdateCount = await this.getUpdateCount(source, 'games');

      // Note: Tags are embedded in game records (game.tagsStr), not separate entities
      // The tags/updates endpoint may not exist or may not be reliable
      // For now, we skip tag update checks as they're synced via game data
      const tagsUpdateCount = 0;

      const gamesUpdateAvailable = gamesUpdateCount > 0;
      const tagsUpdateAvailable = tagsUpdateCount > 0;
      const hasUpdates = gamesUpdateAvailable || tagsUpdateAvailable;

      logger.info(`[MetadataUpdate] Games: ${gamesUpdateCount} updates available`);
      logger.info(
        `[MetadataUpdate] Tags: ${tagsUpdateCount} updates available (synced via game records)`
      );

      return {
        hasUpdates,
        gamesUpdateAvailable,
        tagsUpdateAvailable,
        gamesUpdateCount,
        tagsUpdateCount,
        lastCheckedTime: source.games.actualUpdateTime,
        lastUpdateTime: source.games.latestUpdateTime,
        source,
      };
    } catch (error) {
      logger.error('[MetadataUpdate] Failed to read metadata update info:', error);

      // If preferences file doesn't exist or can't be read, return no updates
      return {
        hasUpdates: false,
        gamesUpdateAvailable: false,
        tagsUpdateAvailable: false,
      };
    }
  }

  /**
   * Get update count from FPFSS API (matches Launcher's getMetaUpdateInfo function)
   * Queries: ${baseUrl}/api/games/updates?after=${timestamp}
   * Returns the actual count of updates from the server
   */
  private async getUpdateCount(
    source: GameMetadataSource,
    type: 'games' | 'tags'
  ): Promise<number> {
    try {
      // Add 2 seconds to update time to prevent rounding down errors (like Launcher does)
      const d = new Date(source[type].latestUpdateTime);
      d.setSeconds(d.getSeconds() + 2);

      const countUrl = `${source.baseUrl}/api/${type}/updates?after=${d.toISOString()}`;

      logger.debug(`[MetadataUpdate] Querying ${type} updates: ${countUrl}`);

      const response = await axios.get(countUrl, {
        timeout: 10000,
      });

      if (response.data && typeof response.data.total === 'number') {
        return response.data.total;
      }

      logger.warn(`[MetadataUpdate] Invalid response from ${countUrl}`);
      return 0;
    } catch (error) {
      logger.error(
        `[MetadataUpdate] Error fetching ${type} update count:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      return -1; // Return -1 on error (like Launcher does)
    }
  }

  /**
   * Check the remote FPFSS service for the latest update timestamp
   * This queries the actual metadata service to get real-time update info
   */
  async checkRemoteUpdates(): Promise<{ latestUpdateTime: string } | null> {
    try {
      // Read current metadata source from preferences
      const preferencesContent = await fs.readFile(this.preferencesPath, 'utf-8');
      const preferences = JSON.parse(preferencesContent);
      const sources: GameMetadataSource[] = preferences.gameMetadataSources || [];

      if (sources.length === 0) {
        return null;
      }

      const source = sources[0];
      const fpfssUrl = `${source.baseUrl}/api/info`;

      logger.info(`[MetadataUpdate] Checking remote updates from: ${fpfssUrl}`);

      // Query FPFSS API for latest metadata info
      const response = await axios.get(fpfssUrl, {
        timeout: 10000,
        validateStatus: (status) => status === 200,
      });

      if (response.data && response.data.games && response.data.games.latestUpdateTime) {
        return {
          latestUpdateTime: response.data.games.latestUpdateTime,
        };
      }

      return null;
    } catch (error) {
      logger.warn(
        '[MetadataUpdate] Failed to check remote updates:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return null;
    }
  }

  /**
   * Format the last update time in a human-readable format
   */
  formatLastUpdateTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

    // Format as date
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
