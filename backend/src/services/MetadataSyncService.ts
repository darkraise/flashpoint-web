import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import { DatabaseService } from './DatabaseService';
import { GameMetadataSource } from './MetadataUpdateService';
import { SyncStatusService } from './SyncStatusService';

interface SyncResult {
  success: boolean;
  gamesUpdated: number;
  gamesDeleted: number;
  tagsUpdated: number;
  platformsUpdated: number;
  error?: string;
  timestamp: string;
}

interface ApiGame {
  id: string;
  parent_game_id?: string;
  title: string;
  alternate_titles?: string;
  series?: string;
  developer?: string;
  publisher?: string;
  platform?: string;
  platform_name?: string;
  play_mode?: string;
  status?: string;
  broken?: boolean;
  extreme?: boolean;
  notes?: string;
  source?: string;
  application_path?: string;
  launch_command?: string;
  release_date?: string;
  version?: string;
  original_description?: string;
  language?: string;
  order_title?: string;
  library?: string;
  tags_str?: string;
  date_added?: string;
  date_modified?: string; // Used to track latest update time
  active_data_id?: number;
  active_data_on_disk?: boolean;
  archive_state?: number;
  ruffle_support?: string;
}

interface ApiTag {
  id: number;
  primaryAliasId: number;
  dateModified: string;
}

interface ApiPlatform {
  id: number;
  primaryAliasId: number;
  dateModified: string;
}

/**
 * Service for synchronizing game metadata from FPFSS
 * Matches the Flashpoint Launcher's sync implementation
 * See: https://github.com/FlashpointProject/launcher/blob/master/src/back/sync.ts
 */
export class MetadataSyncService {
  private preferencesPath: string;
  private syncStatusService: SyncStatusService;

  constructor() {
    this.preferencesPath = path.join(config.flashpointPath, 'preferences.json');
    this.syncStatusService = SyncStatusService.getInstance();
  }

  /**
   * Main sync function - syncs all metadata (games, tags, platforms)
   */
  async syncMetadata(): Promise<SyncResult> {
    const startTime = new Date();
    let gamesUpdated = 0;
    let gamesDeleted = 0;
    let tagsUpdated = 0;
    let platformsUpdated = 0;
    let latestGameDate: string | null = null;
    let latestTagDate: string | null = null;
    let latestPlatformDate: string | null = null;

    try {
      // Mark sync as started
      this.syncStatusService.startSync();

      // Read preferences file
      this.syncStatusService.updateProgress('reading-config', 5, 'Reading preferences...');
      const preferencesContent = await fs.readFile(this.preferencesPath, 'utf-8');
      const preferences = JSON.parse(preferencesContent);
      const sources: GameMetadataSource[] = preferences.gameMetadataSources || [];

      if (sources.length === 0) {
        throw new Error('No game metadata sources found in preferences');
      }

      const source = sources[0];
      logger.info(`[MetadataSync] Starting metadata sync from: ${source.baseUrl}`);

      // Sync platforms first (games reference platforms)
      this.syncStatusService.updateProgress('syncing-platforms', 10, 'Syncing platforms...');
      const platformResult = await this.syncPlatforms(source);
      platformsUpdated = platformResult.count;
      latestPlatformDate = platformResult.latestDate;
      logger.info(`[MetadataSync] Platforms synced: ${platformsUpdated} updated`);

      // Sync tags
      this.syncStatusService.updateProgress('syncing-tags', 25, 'Syncing tags...');
      const tagResult = await this.syncTags(source);
      tagsUpdated = tagResult.count;
      latestTagDate = tagResult.latestDate;
      logger.info(`[MetadataSync] Tags synced: ${tagsUpdated} updated`);

      // Sync games (this is the big one)
      this.syncStatusService.updateProgress('syncing-games', 40, 'Syncing games...');
      const gameResult = await this.syncGames(source);
      gamesUpdated = gameResult.updated;
      gamesDeleted = gameResult.deleted;
      latestGameDate = gameResult.latestDate;
      logger.info(`[MetadataSync] Games synced: ${gamesUpdated} updated, ${gamesDeleted} deleted`);

      // Save database changes to disk
      this.syncStatusService.updateProgress('saving-database', 85, 'Saving database...');
      DatabaseService.save();
      logger.info('[MetadataSync] Database saved to disk');

      // Update preferences.json with new timestamps
      this.syncStatusService.updateProgress('updating-preferences', 95, 'Updating preferences...');
      await this.updatePreferencesTimestamps(source, preferences, {
        gamesLatestDate: latestGameDate,
        tagsLatestDate: latestTagDate,
        platformsLatestDate: latestPlatformDate
      });

      const result: SyncResult = {
        success: true,
        gamesUpdated,
        gamesDeleted,
        tagsUpdated,
        platformsUpdated,
        timestamp: startTime.toISOString()
      };

      // Mark sync as completed
      this.syncStatusService.completeSync(result);

      logger.info(`[MetadataSync] Sync completed successfully:`, result);
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Mark sync as failed
      this.syncStatusService.failSync(errorMessage);

      logger.error('[MetadataSync] Sync failed:', error);
      return {
        success: false,
        gamesUpdated,
        gamesDeleted,
        tagsUpdated,
        platformsUpdated,
        error: errorMessage,
        timestamp: startTime.toISOString()
      };
    }
  }

  /**
   * Sync platforms from FPFSS API
   */
  private async syncPlatforms(source: GameMetadataSource): Promise<{ count: number; latestDate: string | null }> {
    try {
      const after = source.platforms?.latestUpdateTime || '1970-01-01';
      const url = `${source.baseUrl}/api/platforms?after=${after}`;

      logger.debug(`[MetadataSync] Fetching platforms from: ${url}`);

      const response = await axios.get(url, { timeout: 30000 });
      const platforms: ApiPlatform[] = response.data.platforms || response.data || [];

      if (platforms.length === 0) {
        return { count: 0, latestDate: null };
      }

      // Find latest dateModified
      const latestDate = platforms.reduce((latest, platform) => {
        if (!latest || new Date(platform.dateModified) > new Date(latest)) {
          return platform.dateModified;
        }
        return latest;
      }, after);

      // Update platforms in database
      await this.applyPlatforms(platforms);

      return { count: platforms.length, latestDate };
    } catch (error) {
      logger.error('[MetadataSync] Error syncing platforms:', error);
      throw error;
    }
  }

  /**
   * Sync tags from FPFSS API
   */
  private async syncTags(source: GameMetadataSource): Promise<{ count: number; latestDate: string | null }> {
    try {
      const after = source.tags?.latestUpdateTime || '1970-01-01';
      const url = `${source.baseUrl}/api/tags?after=${after}`;

      logger.debug(`[MetadataSync] Fetching tags from: ${url}`);

      const response = await axios.get(url, { timeout: 30000 });
      const tags: ApiTag[] = response.data.tags || response.data || [];

      if (tags.length === 0) {
        return { count: 0, latestDate: null };
      }

      // Find latest dateModified
      const latestDate = tags.reduce((latest, tag) => {
        if (!latest || new Date(tag.dateModified) > new Date(latest)) {
          return tag.dateModified;
        }
        return latest;
      }, after);

      // Update tags in database
      await this.applyTags(tags);

      return { count: tags.length, latestDate };
    } catch (error) {
      logger.error('[MetadataSync] Error syncing tags:', error);
      throw error;
    }
  }

  /**
   * Sync games from FPFSS API (with pagination)
   */
  private async syncGames(source: GameMetadataSource): Promise<{ updated: number; deleted: number; latestDate: string | null }> {
    try {
      const after = source.games?.latestUpdateTime || '1970-01-01';
      let totalUpdated = 0;
      let afterId: string | null = null;
      let batchCount = 0;
      let latestDate: string = after;

      // Paginate through all games
      // Fetch games in batches
      let hasMore = true;
      while (hasMore) {
        batchCount++;
        let url = `${source.baseUrl}/api/games?after=${after}&broad=true`;
        if (afterId) {
          url += `&afterId=${afterId}`;
        }

        logger.debug(`[MetadataSync] Fetching games batch ${batchCount} from: ${url}`);
        const progress = Math.min(80, 40 + (batchCount * 5)); // Cap at 80% during game sync
        this.syncStatusService.updateProgress('syncing-games', progress, `Syncing games (batch ${batchCount})...`);

        const response = await axios.get(url, { timeout: 60000 });
        // FPFSS API returns {"games": [...]} not just an array
        const games: ApiGame[] = response.data.games || response.data || [];

        if (games.length === 0) {
          hasMore = false;
          break; // No more games
        }

        // Track latest dateModified across all games
        for (const game of games) {
          if (game.date_modified && new Date(game.date_modified) > new Date(latestDate)) {
            latestDate = game.date_modified;
          }
        }

        // Apply games to database
        await this.applyGames(games);
        totalUpdated += games.length;

        // Get last game ID for pagination
        afterId = games[games.length - 1].id;

        logger.info(`[MetadataSync] Batch ${batchCount}: ${games.length} games processed (total: ${totalUpdated})`);
      }

      // Sync deleted games
      const deleted = await this.syncDeletedGames(source);

      return { updated: totalUpdated, deleted, latestDate: latestDate !== after ? latestDate : null };

    } catch (error) {
      logger.error('[MetadataSync] Error syncing games:', error);
      throw error;
    }
  }

  /**
   * Sync deleted games from FPFSS API
   */
  private async syncDeletedGames(source: GameMetadataSource): Promise<number> {
    try {
      const after = source.games?.latestDeleteTime || '1970-01-01';
      const url = `${source.baseUrl}/api/games/deleted?after=${after}`;

      logger.debug(`[MetadataSync] Fetching deleted games from: ${url}`);

      const response = await axios.get(url, { timeout: 30000 });

      // Handle various API response formats
      let deletedIds: string[] = [];

      if (Array.isArray(response.data)) {
        // Direct array of IDs
        deletedIds = response.data;
      } else if (response.data.deleted_games && Array.isArray(response.data.deleted_games)) {
        // Wrapped in deleted_games property
        deletedIds = response.data.deleted_games;
      } else if (response.data.deletedGames && Array.isArray(response.data.deletedGames)) {
        // Camelized version
        deletedIds = response.data.deletedGames;
      } else if (response.data.games && Array.isArray(response.data.games)) {
        // Wrapped in games property
        deletedIds = response.data.games.map((g: any) => typeof g === 'string' ? g : g.id);
      } else {
        logger.warn('[MetadataSync] Unexpected deleted games API response format:', response.data);
      }

      if (deletedIds.length === 0) {
        return 0;
      }

      // Delete games from database
      await this.deleteGames(deletedIds);

      logger.info(`[MetadataSync] Deleted ${deletedIds.length} games`);
      return deletedIds.length;

    } catch (error) {
      logger.error('[MetadataSync] Error syncing deleted games:', error);
      throw error;
    }
  }

  /**
   * Apply platform updates to database
   */
  private async applyPlatforms(platforms: ApiPlatform[]): Promise<void> {
    // TODO: Implement platform upsert
    // For now, we'll skip platforms as they're rarely updated
    logger.debug(`[MetadataSync] Skipping platform updates (${platforms.length} platforms)`);
  }

  /**
   * Apply tag updates to database
   */
  private async applyTags(tags: ApiTag[]): Promise<void> {
    // TODO: Implement tag upsert
    // For now, we'll skip tags as they're less critical
    logger.debug(`[MetadataSync] Skipping tag updates (${tags.length} tags)`);
  }

  /**
   * Apply game updates to database (upsert)
   */
  private async applyGames(games: ApiGame[]): Promise<void> {
    if (games.length === 0) return;

    // Build SQL for bulk upsert (29 columns per row)
    const placeholders = games.map(() =>
      '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).join(', ');

    const values: any[] = [];
    games.forEach(game => {
      values.push(
        game.id,
        game.parent_game_id || null,
        game.title || '',
        game.alternate_titles || '',
        game.series || '',
        game.developer || '',
        game.publisher || '',
        game.platform || game.platform_name || '',
        game.play_mode || '',
        game.status || '',
        game.broken ? 1 : 0,
        game.extreme ? 1 : 0,
        game.notes || '',
        game.source || '',
        game.application_path || '',
        game.launch_command || '',
        game.release_date || '',
        game.version || '',
        game.original_description || '',
        game.language || '',
        game.order_title || game.title || '',
        game.library || 'arcade',
        game.tags_str || '',
        game.date_added || new Date().toISOString(),
        game.date_modified || new Date().toISOString(),
        game.active_data_id || null,
        game.active_data_on_disk ? 1 : 0,
        game.archive_state || 0,
        game.ruffle_support || ''
      );
    });

    const sql = `
      INSERT INTO game (
        id, parentGameId, title, alternateTitles, series, developer, publisher,
        platformName, playMode, status, broken, extreme, notes, source,
        applicationPath, launchCommand, releaseDate, version,
        originalDescription, language, orderTitle, library, tagsStr,
        dateAdded, dateModified, activeDataId, activeDataOnDisk,
        archiveState, ruffleSupport
      ) VALUES ${placeholders}
      ON CONFLICT(id) DO UPDATE SET
        parentGameId = excluded.parentGameId,
        title = excluded.title,
        alternateTitles = excluded.alternateTitles,
        series = excluded.series,
        developer = excluded.developer,
        publisher = excluded.publisher,
        platformName = excluded.platformName,
        playMode = excluded.playMode,
        status = excluded.status,
        broken = excluded.broken,
        extreme = excluded.extreme,
        notes = excluded.notes,
        source = excluded.source,
        applicationPath = excluded.applicationPath,
        launchCommand = excluded.launchCommand,
        releaseDate = excluded.releaseDate,
        version = excluded.version,
        originalDescription = excluded.originalDescription,
        language = excluded.language,
        orderTitle = excluded.orderTitle,
        library = excluded.library,
        tagsStr = excluded.tagsStr,
        dateModified = excluded.dateModified,
        activeDataId = excluded.activeDataId,
        activeDataOnDisk = excluded.activeDataOnDisk,
        archiveState = excluded.archiveState,
        ruffleSupport = excluded.ruffleSupport
    `;

    await DatabaseService.run(sql, values);
    logger.debug(`[MetadataSync] Upserted ${games.length} games`);
  }

  /**
   * Delete games from database
   */
  private async deleteGames(gameIds: string[]): Promise<void> {
    // Safety check: ensure gameIds is an array
    if (!Array.isArray(gameIds)) {
      logger.error('[MetadataSync] deleteGames called with non-array:', typeof gameIds);
      throw new Error('deleteGames requires an array of game IDs');
    }

    if (gameIds.length === 0) return;

    const placeholders = gameIds.map(() => '?').join(', ');
    const sql = `DELETE FROM game WHERE id IN (${placeholders})`;

    await DatabaseService.run(sql, gameIds);
    logger.debug(`[MetadataSync] Deleted ${gameIds.length} games`);
  }

  /**
   * Update preferences.json with new timestamps after successful sync
   */
  private async updatePreferencesTimestamps(
    source: GameMetadataSource,
    preferences: any,
    latestDates: {
      gamesLatestDate: string | null;
      tagsLatestDate: string | null;
      platformsLatestDate: string | null;
    }
  ): Promise<void> {
    try {
      const now = new Date().toISOString();

      // Update the source timestamps
      const sourceIndex = preferences.gameMetadataSources.findIndex((s: any) => s.name === source.name);
      if (sourceIndex >= 0) {
        // Update actualUpdateTime to NOW (when we actually synced)
        preferences.gameMetadataSources[sourceIndex].games.actualUpdateTime = now;
        preferences.gameMetadataSources[sourceIndex].tags.actualUpdateTime = now;
        if (preferences.gameMetadataSources[sourceIndex].platforms) {
          preferences.gameMetadataSources[sourceIndex].platforms.actualUpdateTime = now;
        }

        // Update latestUpdateTime to the latest game/tag/platform dateModified
        // This is what the update check uses to determine what's new
        if (latestDates.gamesLatestDate) {
          preferences.gameMetadataSources[sourceIndex].games.latestUpdateTime = latestDates.gamesLatestDate;
          logger.info(`[MetadataSync] Updated games latestUpdateTime to: ${latestDates.gamesLatestDate}`);
        }
        if (latestDates.tagsLatestDate) {
          preferences.gameMetadataSources[sourceIndex].tags.latestUpdateTime = latestDates.tagsLatestDate;
          logger.info(`[MetadataSync] Updated tags latestUpdateTime to: ${latestDates.tagsLatestDate}`);
        }
        if (latestDates.platformsLatestDate && preferences.gameMetadataSources[sourceIndex].platforms) {
          preferences.gameMetadataSources[sourceIndex].platforms.latestUpdateTime = latestDates.platformsLatestDate;
          logger.info(`[MetadataSync] Updated platforms latestUpdateTime to: ${latestDates.platformsLatestDate}`);
        }
      }

      // Write back to preferences.json
      await fs.writeFile(
        this.preferencesPath,
        JSON.stringify(preferences, null, 2),
        'utf-8'
      );

      logger.info(`[MetadataSync] Updated preferences.json timestamps. actualUpdateTime: ${now}`);
    } catch (error) {
      logger.error('[MetadataSync] Error updating preferences:', error);
      throw error;
    }
  }

}
