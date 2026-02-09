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
  name: string;
  description: string | null;
  category: string | null;
  date_modified: string;
  aliases?: string; // semicolon-separated
  user_id?: number;
  Deleted?: boolean;
}

interface ApiPlatform {
  id: number;
  name: string;
  description: string | null;
  date_modified: string;
  aliases?: string; // semicolon-separated
  user_id?: number;
  Deleted?: boolean;
}

interface MetadataSourceTimestamp {
  actualUpdateTime?: string;
  latestUpdateTime?: string;
}

interface MetadataSource {
  name: string;
  games: MetadataSourceTimestamp;
  tags: MetadataSourceTimestamp;
  platforms?: MetadataSourceTimestamp;
}

interface FlashpointPreferences {
  gameMetadataSources: MetadataSource[];
  [key: string]: unknown; // Allow other properties from preferences.json
}

/**
 * Service for synchronizing game metadata from FPFSS
 * Matches the Flashpoint Launcher's sync implementation
 * See: https://github.com/FlashpointProject/launcher/blob/master/src/back/sync.ts
 */
export class MetadataSyncService {
  private static readonly ALLOWED_HOSTS = ['fpfss.unstable.life', 'fpfss.flashpointarchive.org'];
  private preferencesPath: string;
  private syncStatusService: SyncStatusService;

  constructor() {
    this.preferencesPath = path.join(config.flashpointPath, 'preferences.json');
    this.syncStatusService = SyncStatusService.getInstance();
  }

  private getEdition(): string {
    return config.flashpointEdition;
  }

  private validateBaseUrl(baseUrl: string): void {
    try {
      const url = new URL(baseUrl);
      if (!MetadataSyncService.ALLOWED_HOSTS.includes(url.hostname)) {
        throw new Error(`Untrusted metadata source host: ${url.hostname}`);
      }
    } catch (e) {
      if (e instanceof TypeError) {
        throw new Error(`Invalid metadata source URL: ${baseUrl}`);
      }
      throw e;
    }
  }

  async syncMetadata(alreadyStarted = false): Promise<SyncResult> {
    // Ultimate edition does not support metadata sync
    if (this.getEdition() === 'ultimate') {
      logger.warn('[MetadataSync] Metadata sync is not available for Ultimate edition');
      return {
        success: false,
        gamesUpdated: 0,
        gamesDeleted: 0,
        tagsUpdated: 0,
        platformsUpdated: 0,
        error: 'Metadata sync is not available for Flashpoint Ultimate edition',
        timestamp: new Date().toISOString(),
      };
    }
    const startTime = new Date();
    let gamesUpdated = 0;
    let gamesDeleted = 0;
    let tagsUpdated = 0;
    let platformsUpdated = 0;
    let latestGameDate: string | null = null;
    let latestTagDate: string | null = null;
    let latestPlatformDate: string | null = null;

    try {
      // Mark sync as started (skip if already started atomically)
      if (!alreadyStarted) {
        this.syncStatusService.startSync();
      }

      // Read preferences file
      this.syncStatusService.updateProgress('reading-config', 5, 'Reading preferences...');
      const preferencesContent = await fs.readFile(this.preferencesPath, 'utf-8');
      const preferences = JSON.parse(preferencesContent);
      const sources: GameMetadataSource[] = preferences.gameMetadataSources || [];

      if (sources.length === 0) {
        throw new Error('No game metadata sources found in preferences');
      }

      const source = sources[0];
      // Validate baseUrl before making any HTTP requests
      this.validateBaseUrl(source.baseUrl);
      logger.info(`[MetadataSync] Starting metadata sync from: ${source.baseUrl}`);

      // Sync platforms first (data embedded in game records)
      this.syncStatusService.updateProgress('syncing-platforms', 10, 'Syncing platforms...');
      const platformResult = await this.syncPlatforms(source);
      platformsUpdated = platformResult.count;
      latestPlatformDate = platformResult.latestDate;
      logger.info(`[MetadataSync] Platforms synced: ${platformsUpdated} updated`);

      // Sync tags (data embedded in game records)
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
        platformsLatestDate: latestPlatformDate,
      });

      const result: SyncResult = {
        success: true,
        gamesUpdated,
        gamesDeleted,
        tagsUpdated,
        platformsUpdated,
        timestamp: startTime.toISOString(),
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
        timestamp: startTime.toISOString(),
      };
    }
  }

  private async syncPlatforms(
    source: GameMetadataSource
  ): Promise<{ count: number; latestDate: string | null }> {
    try {
      const after = source.platforms?.latestUpdateTime || '1970-01-01';
      const url = `${source.baseUrl}/api/platforms?after=${after}`;

      logger.debug(`[MetadataSync] Fetching platforms from: ${url}`);

      const response = await axios.get(url, { timeout: 30000 });
      // Response is directly an array of platforms
      const platforms: ApiPlatform[] = response.data || [];

      if (platforms.length === 0) {
        return { count: 0, latestDate: null };
      }

      // Find latest date_modified (snake_case from API)
      const latestDate = platforms.reduce((latest, platform) => {
        if (!latest || new Date(platform.date_modified) > new Date(latest)) {
          return platform.date_modified;
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

  private async syncTags(
    source: GameMetadataSource
  ): Promise<{ count: number; latestDate: string | null }> {
    try {
      const after = source.tags?.latestUpdateTime || '1970-01-01';
      const url = `${source.baseUrl}/api/tags?after=${after}`;

      logger.debug(`[MetadataSync] Fetching tags from: ${url}`);

      const response = await axios.get(url, { timeout: 30000 });
      // Response has tags wrapped in { tags: [...] }
      const tags: ApiTag[] = response.data.tags || [];

      if (tags.length === 0) {
        return { count: 0, latestDate: null };
      }

      // Find latest date_modified (snake_case from API)
      const latestDate = tags.reduce((latest, tag) => {
        if (!latest || new Date(tag.date_modified) > new Date(latest)) {
          return tag.date_modified;
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

  private async syncGames(
    source: GameMetadataSource
  ): Promise<{ updated: number; deleted: number; latestDate: string | null }> {
    try {
      const after = source.games?.latestUpdateTime || '1970-01-01';
      let totalUpdated = 0;
      let afterId: string | null = null;
      let batchCount = 0;
      let latestDate: string = after;

      // Paginate through all games
      // Fetch games in batches
      const MAX_BATCHES = 10000; // Safety guard against infinite pagination loops
      let hasMore = true;
      while (hasMore) {
        batchCount++;
        if (batchCount > MAX_BATCHES) {
          logger.warn(
            `[MetadataSync] Exceeded max batch count (${MAX_BATCHES}), stopping pagination`
          );
          break;
        }
        let url = `${source.baseUrl}/api/games?after=${after}&broad=true`;
        if (afterId) {
          url += `&afterId=${afterId}`;
        }

        logger.debug(`[MetadataSync] Fetching games batch ${batchCount} from: ${url}`);
        const progress = Math.min(80, 40 + batchCount * 5); // Cap at 80% during game sync
        this.syncStatusService.updateProgress(
          'syncing-games',
          progress,
          `Syncing games (batch ${batchCount})...`
        );

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

        logger.info(
          `[MetadataSync] Batch ${batchCount}: ${games.length} games processed (total: ${totalUpdated})`
        );
      }

      // Sync deleted games
      const deleted = await this.syncDeletedGames(source);

      return {
        updated: totalUpdated,
        deleted,
        latestDate: latestDate !== after ? latestDate : null,
      };
    } catch (error) {
      logger.error('[MetadataSync] Error syncing games:', error);
      throw error;
    }
  }

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
        deletedIds = response.data.games.map((g: unknown) =>
          typeof g === 'string' ? g : (g as { id: string }).id
        );
      } else {
        logger.warn('[MetadataSync] Unexpected deleted games API response format:', response.data);
      }

      if (deletedIds.length === 0) {
        return 0;
      }

      // Delete games from database
      this.deleteGames(deletedIds);

      logger.info(`[MetadataSync] Deleted ${deletedIds.length} games`);
      return deletedIds.length;
    } catch (error) {
      logger.error('[MetadataSync] Error syncing deleted games:', error);
      throw error;
    }
  }

  /**
   * Apply platform updates to database
   *
   * NOTE: In the actual flashpoint.sqlite schema, there is no separate platform table.
   * Platform data is stored as strings in the game.platformName column.
   * Platform information is already synced as part of the game records.
   * This method exists for API compatibility but performs no database operations.
   */
  private async applyPlatforms(platforms: ApiPlatform[]): Promise<void> {
    if (platforms.length === 0) {
      logger.debug('[MetadataSync] No platforms to apply');
      return;
    }

    // Platform data is embedded in game records (game.platformName column)
    // No separate platform table exists in flashpoint.sqlite
    // The settings toggle works, but the actual data is synced via game records
    logger.debug(
      `[MetadataSync] Received ${platforms.length} platform updates (data synced via game records)`
    );
  }

  /**
   * Apply tag updates to database
   *
   * NOTE: In the actual flashpoint.sqlite schema, there is no separate tag table.
   * Tag data is stored as semicolon-separated strings in the game.tagsStr column.
   * Tag information is already synced as part of the game records.
   * This method exists for API compatibility but performs no database operations.
   */
  private async applyTags(tags: ApiTag[]): Promise<void> {
    if (tags.length === 0) {
      logger.debug('[MetadataSync] No tags to apply');
      return;
    }

    // Tag data is embedded in game records (game.tagsStr column as semicolon-separated strings)
    // No separate tag table exists in flashpoint.sqlite
    // The settings toggle works, but the actual data is synced via game records
    logger.debug(
      `[MetadataSync] Received ${tags.length} tag updates (data synced via game records)`
    );
  }

  /**
   * Apply game updates to database (upsert)
   * Chunks batches to stay under SQLite's SQLITE_MAX_VARIABLE_NUMBER (default 999).
   * With 29 columns per game, max ~30 games per chunk (30 * 29 = 870 < 999).
   */
  private static readonly COLUMNS_PER_GAME = 29;
  private static readonly MAX_GAMES_PER_CHUNK = 30; // 30 * 29 = 870 params, under 999 limit

  private async applyGames(games: ApiGame[]): Promise<void> {
    if (games.length === 0) return;

    // Sort games to ensure parents are inserted before children
    // This prevents FOREIGN KEY constraint errors on parentGameId
    const sortedGames = this.sortGamesByParentDependency(games);

    const db = DatabaseService.getDatabase();

    // Process in chunks to stay under SQLite variable limit
    for (let i = 0; i < sortedGames.length; i += MetadataSyncService.MAX_GAMES_PER_CHUNK) {
      const chunk = sortedGames.slice(i, i + MetadataSyncService.MAX_GAMES_PER_CHUNK);
      this.applyGamesChunk(db, chunk);
    }

    logger.debug(`[MetadataSync] Upserted ${sortedGames.length} games`);
  }

  /**
   * Apply a single chunk of games to the database
   */
  private applyGamesChunk(
    db: ReturnType<typeof DatabaseService.getDatabase>,
    chunk: ApiGame[]
  ): void {
    const placeholders = chunk
      .map(
        () =>
          '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      .join(', ');

    const values: (string | number | null)[] = [];
    chunk.forEach((game) => {
      values.push(
        game.id,
        game.parent_game_id ?? null,
        game.title ?? '',
        game.alternate_titles ?? '',
        game.series ?? '',
        game.developer ?? '',
        game.publisher ?? '',
        game.platform ?? game.platform_name ?? '',
        game.play_mode ?? '',
        game.status ?? '',
        game.broken ? 1 : 0,
        game.extreme ? 1 : 0,
        game.notes ?? '',
        game.source ?? '',
        game.application_path ?? '',
        game.launch_command ?? '',
        game.release_date ?? '',
        game.version ?? '',
        game.original_description ?? '',
        game.language ?? '',
        game.order_title ?? game.title ?? '',
        game.library ?? 'arcade',
        game.tags_str ?? '',
        game.date_added ?? new Date().toISOString(),
        game.date_modified ?? new Date().toISOString(),
        game.active_data_id ?? null,
        game.active_data_on_disk ? 1 : 0,
        game.archive_state ?? 0,
        game.ruffle_support ?? ''
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

    // Wrap in a transaction for atomicity
    db.transaction(() => {
      const stmt = db.prepare(sql);
      stmt.run(values);
    })();
  }

  /**
   * Sort games by parent dependency - parents before children
   * This ensures foreign key constraints are satisfied during insert
   */
  private sortGamesByParentDependency(games: ApiGame[]): ApiGame[] {
    const gameMap = new Map<string, ApiGame>();
    const sorted: ApiGame[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>(); // Track games currently being visited to detect cycles

    // Build game map
    games.forEach((game) => gameMap.set(game.id, game));

    // Recursive function to add game and its parents first
    const addGame = (game: ApiGame): void => {
      // Already processed
      if (visited.has(game.id)) return;

      // Circular dependency detected - break the cycle by skipping parent
      if (visiting.has(game.id)) {
        logger.warn(
          `[MetadataSync] Circular parent dependency detected for game: ${game.id} (${game.title})`
        );
        visited.add(game.id);
        sorted.push(game);
        return;
      }

      // Mark as currently visiting
      visiting.add(game.id);

      // If game has a parent, add parent first (if it exists in this batch)
      if (game.parent_game_id && gameMap.has(game.parent_game_id)) {
        const parent = gameMap.get(game.parent_game_id)!;
        addGame(parent);
      }

      // Mark as visited and remove from visiting
      visiting.delete(game.id);
      visited.add(game.id);
      sorted.push(game);
    };

    // Process all games
    games.forEach((game) => addGame(game));

    return sorted;
  }

  /**
   * Delete games from database
   * Handles parent-child relationships to avoid FOREIGN KEY constraint errors
   */
  private deleteGames(gameIds: string[]): void {
    if (!Array.isArray(gameIds) || gameIds.length === 0) return;
    const db = DatabaseService.getDatabase();

    // Process in batches to avoid SQL variable limits
    const BATCH_SIZE = 500;
    for (let i = 0; i < gameIds.length; i += BATCH_SIZE) {
      const batch = gameIds.slice(i, i + BATCH_SIZE);
      const placeholders = batch.map(() => '?').join(', ');

      db.transaction(() => {
        // Orphan children first (prevents FK violation)
        db.prepare(
          `UPDATE game SET parentGameId = NULL WHERE parentGameId IN (${placeholders})`
        ).run(batch);
        // Then delete
        db.prepare(`DELETE FROM game WHERE id IN (${placeholders})`).run(batch);
      })();
    }
  }

  private async updatePreferencesTimestamps(
    source: GameMetadataSource,
    preferences: FlashpointPreferences,
    latestDates: {
      gamesLatestDate: string | null;
      tagsLatestDate: string | null;
      platformsLatestDate: string | null;
    }
  ): Promise<void> {
    try {
      const now = new Date().toISOString();

      // Update the source timestamps
      const sourceIndex = preferences.gameMetadataSources.findIndex((s) => s.name === source.name);
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
          preferences.gameMetadataSources[sourceIndex].games.latestUpdateTime =
            latestDates.gamesLatestDate;
          logger.info(
            `[MetadataSync] Updated games latestUpdateTime to: ${latestDates.gamesLatestDate}`
          );
        }
        if (latestDates.tagsLatestDate) {
          preferences.gameMetadataSources[sourceIndex].tags.latestUpdateTime =
            latestDates.tagsLatestDate;
          logger.info(
            `[MetadataSync] Updated tags latestUpdateTime to: ${latestDates.tagsLatestDate}`
          );
        }
        if (
          latestDates.platformsLatestDate &&
          preferences.gameMetadataSources[sourceIndex].platforms
        ) {
          preferences.gameMetadataSources[sourceIndex].platforms.latestUpdateTime =
            latestDates.platformsLatestDate;
          logger.info(
            `[MetadataSync] Updated platforms latestUpdateTime to: ${latestDates.platformsLatestDate}`
          );
        }
      }

      // Write back to preferences.json
      await fs.writeFile(this.preferencesPath, JSON.stringify(preferences, null, 2), 'utf-8');

      logger.info(`[MetadataSync] Updated preferences.json timestamps. actualUpdateTime: ${now}`);
    } catch (error) {
      logger.error('[MetadataSync] Error updating preferences:', error);
      throw error;
    }
  }
}
