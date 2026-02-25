import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';
import { config } from '../config';

export interface GameSearchQuery {
  search?: string;
  platforms?: string[]; // Array of platforms for OR condition
  series?: string[]; // Array of series for OR condition
  developers?: string[]; // Array of developers for OR condition
  publishers?: string[]; // Array of publishers for OR condition
  playModes?: string[]; // Array of play modes for OR condition
  languages?: string[]; // Array of languages for OR condition
  library?: string;
  tags?: string[];
  yearFrom?: number;
  yearTo?: number;
  dateAddedSince?: string; // ISO 8601 timestamp - filter games added after this date
  dateModifiedSince?: string; // ISO 8601 timestamp - filter games modified after this date
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
  showBroken: boolean;
  showExtreme: boolean;
  fields?: 'list' | 'detail'; // Column selection: 'list' for minimal columns, 'detail' for all columns
}

export interface Game {
  id: string;
  parentGameId?: string;
  title: string;
  alternateTitles?: string;
  series?: string;
  developer: string;
  publisher: string;
  platformName?: string;
  platformsStr?: string;
  platformId?: number;
  playMode?: string;
  status?: string;
  broken?: boolean;
  extreme?: boolean;
  notes?: string;
  tagsStr?: string;
  source?: string;
  applicationPath?: string;
  launchCommand?: string;
  releaseDate?: string;
  version?: string;
  originalDescription?: string;
  language?: string;
  library: string;
  orderTitle: string;
  dateAdded?: string;
  dateModified?: string;
  presentOnDisk?: number | null; // From game_data table: NULL = no data needed, 0 = needs download, 1 = downloaded
  lastPlayed?: string;
  playtime?: number;
  playCounter?: number;
  archiveState?: number;
  activeDataId?: number; // ID of the active game_data entry (null/0 = no game data)
  activeDataOnDisk?: number; // Whether the active data is downloaded (0 = no, 1 = yes)
  logoPath?: string; // Infinity edition only
  screenshotPath?: string; // Infinity edition only
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface FilterOptionsResult {
  series: string[];
  developers: string[];
  publishers: string[];
  playModes: string[];
  languages: string[];
  tags: string[];
  platforms: string[];
  yearRange: { min: number; max: number };
}

export interface FilterOptionsParams {
  platform?: string;
  library?: string;
  // Additional filters for context-aware options
  series?: string[];
  developers?: string[];
  publishers?: string[];
  playModes?: string[];
  languages?: string[];
  tags?: string[];
  yearFrom?: number;
  yearTo?: number;
}

export class GameService {
  /**
   * Cached set of Flash game IDs that have .swf launch commands in game_data.
   * Pre-computed once and cached with TTL to avoid per-row EXISTS subqueries
   * which would be O(N*M) on every search (N=games, M=game_data rows).
   *
   * Since flashpoint.sqlite is read-only, this cache only needs to refresh
   * when the database file is reloaded (detected via DatabaseService file watcher).
   */
  private static flashSwfGameIds: Set<string> | null = null;
  private static flashSwfCacheExpiry = 0;
  private static readonly FLASH_SWF_CACHE_TTL = 3600000; // 1 hour


  /**
   * Cached filter options results keyed by platform+library combination.
   * The 8 GROUP BY queries (~1.8s total) only change when flashpoint.sqlite reloads,
   * so we cache indefinitely and clear on DB reload.
   */
  private static filterOptionsCache: Map<string, FilterOptionsResult> = new Map();

  /**
   * Short-TTL cache for dynamic filter combinations.
   * Stores { result, expiry } for context-aware filter options.
   * TTL: 30 seconds - balances freshness with performance during filter exploration.
   */
  private static dynamicFilterCache: Map<string, { result: FilterOptionsResult; expiry: number }> =
    new Map();
  private static readonly DYNAMIC_FILTER_CACHE_TTL = 30000; // 30 seconds
  private static readonly DYNAMIC_FILTER_CACHE_MAX_SIZE = 100; // Max entries to prevent memory bloat

  /**
   * Generate cache key from filter params
   * Returns { key, isDynamic } to determine which cache to use
   */
  private static getFilterOptionsCacheKey(params?: FilterOptionsParams): {
    key: string;
    isDynamic: boolean;
  } {
    const hasDynamicFilters =
      (params?.series?.length ?? 0) > 0 ||
      (params?.developers?.length ?? 0) > 0 ||
      (params?.publishers?.length ?? 0) > 0 ||
      (params?.playModes?.length ?? 0) > 0 ||
      (params?.languages?.length ?? 0) > 0 ||
      (params?.tags?.length ?? 0) > 0 ||
      params?.yearFrom !== undefined ||
      params?.yearTo !== undefined;

    if (hasDynamicFilters) {
      // Build full cache key for dynamic filters
      const key = JSON.stringify({
        platform: params?.platform ?? '',
        library: params?.library ?? '',
        series: params?.series ? [...params.series].sort() : [],
        developers: params?.developers ? [...params.developers].sort() : [],
        publishers: params?.publishers ? [...params.publishers].sort() : [],
        playModes: params?.playModes ? [...params.playModes].sort() : [],
        languages: params?.languages ? [...params.languages].sort() : [],
        tags: params?.tags ? [...params.tags].sort() : [],
        yearFrom: params?.yearFrom,
        yearTo: params?.yearTo,
      });
      return { key, isDynamic: true };
    }

    // Base page combination (no dynamic filters)
    return { key: `${params?.platform ?? ''}_${params?.library ?? ''}`, isDynamic: false };
  }

  /**
   * Clean up expired entries from dynamic filter cache
   */
  private static cleanupDynamicFilterCache(): void {
    const now = Date.now();
    for (const [key, entry] of GameService.dynamicFilterCache) {
      if (now > entry.expiry) {
        GameService.dynamicFilterCache.delete(key);
      }
    }

    // If still over max size, remove oldest entries
    if (GameService.dynamicFilterCache.size > GameService.DYNAMIC_FILTER_CACHE_MAX_SIZE) {
      const entries = [...GameService.dynamicFilterCache.entries()].sort(
        (a, b) => a[1].expiry - b[1].expiry
      );
      const toRemove = entries.slice(
        0,
        GameService.dynamicFilterCache.size - GameService.DYNAMIC_FILTER_CACHE_MAX_SIZE
      );
      for (const [key] of toRemove) {
        GameService.dynamicFilterCache.delete(key);
      }
    }
  }

  /**
   * Get the set of Flash game IDs with .swf launch commands.
   * Checks both game_data.launchCommand and game.launchCommand as fallback.
   * Results are cached in memory for 1 hour (read-only DB changes rarely).
   */
  private getFlashSwfGameIds(): Set<string> {
    const now = Date.now();
    if (GameService.flashSwfGameIds && now < GameService.flashSwfCacheExpiry) {
      return GameService.flashSwfGameIds;
    }

    const startTime = performance.now();

    // Query 1: Games with .swf in game_data.launchCommand
    const sqlGameData = `
      SELECT DISTINCT gd.gameId
      FROM game_data gd
      JOIN game g ON g.id = gd.gameId
      WHERE g.platformName = 'Flash'
        AND (LOWER(gd.launchCommand) LIKE '%.swf' OR LOWER(gd.launchCommand) LIKE '%.swf?%')
    `;

    // Query 2: Games with .swf in game.launchCommand (fallback)
    const sqlGameTable = `
      SELECT DISTINCT g.id as gameId
      FROM game g
      WHERE g.platformName = 'Flash'
        AND (LOWER(g.launchCommand) LIKE '%.swf' OR LOWER(g.launchCommand) LIKE '%.swf?%')
    `;

    const rowsGameData = DatabaseService.all(sqlGameData, []) as Array<{ gameId: string }>;
    const rowsGameTable = DatabaseService.all(sqlGameTable, []) as Array<{ gameId: string }>;

    // Combine both sets
    GameService.flashSwfGameIds = new Set([
      ...rowsGameData.map((r) => r.gameId),
      ...rowsGameTable.map((r) => r.gameId),
    ]);
    GameService.flashSwfCacheExpiry = now + GameService.FLASH_SWF_CACHE_TTL;

    const duration = Math.round(performance.now() - startTime);
    logger.info(
      `[GameService] Cached ${GameService.flashSwfGameIds.size} Flash SWF game IDs in ${duration}ms`
    );
    return GameService.flashSwfGameIds;
  }


  /**
   * Clear the Flash SWF game IDs cache.
   * Call when the flashpoint.sqlite database is reloaded.
   */
  static clearFlashSwfCache(): void {
    GameService.flashSwfGameIds = null;
    GameService.flashSwfCacheExpiry = 0;
    logger.debug('[GameService] Flash SWF game IDs cache cleared');
  }

  /**
   * Clear the filter options cache.
   * Called when flashpoint.sqlite is reloaded (data may have changed).
   */
  static clearFilterOptionsCache(): void {
    GameService.filterOptionsCache.clear();
    GameService.dynamicFilterCache.clear();
    logger.debug('[GameService] Filter options cache cleared (base + dynamic)');
  }

  /**
   * Pre-warm the filter options cache at startup for all common page combinations.
   * Runs the GROUP BY queries once so the first request to each page is instant.
   *
   * Pages pre-warmed:
   * - Browse: { library: 'arcade' }
   * - Flash Games: { library: 'arcade', platform: 'Flash' }
   * - HTML5 Games: { library: 'arcade', platform: 'HTML5' }
   * - Animations: { library: 'theatre' }
   */
  static async prewarmFilterOptions(): Promise<void> {
    const startTime = performance.now();
    const service = new GameService();

    // Clear caches to force fresh computation
    GameService.filterOptionsCache.clear();
    GameService.dynamicFilterCache.clear();

    // Define all page combinations to pre-warm
    const pageCombinations: Array<FilterOptionsParams | undefined> = [
      undefined, // Global (no filters)
      { library: 'arcade' }, // Browse page
      { library: 'arcade', platform: 'Flash' }, // Flash Games page
      { library: 'arcade', platform: 'HTML5' }, // HTML5 Games page
      { library: 'theatre' }, // Animations page
    ];

    // Pre-warm each combination
    for (const params of pageCombinations) {
      await service.getFilterOptions(params);
    }

    const duration = Math.round(performance.now() - startTime);
    logger.info(
      `[GameService] Filter options pre-warmed for ${pageCombinations.length} page combinations in ${duration}ms`
    );
  }

  /**
   * SQL condition to exclude Flash games without SWF launch commands.
   * Checks both game_data.launchCommand and game.launchCommand as fallback.
   *
   * Performance: ~150ms overhead per query. Acceptable for searchGames() since results
   * are cached by GameSearchCache (5-min TTL). For aggregate queries like
   * getPlatformOptions(), use getFlashSwfGameIds() cache instead.
   */
  private getFlashSwfCondition(tableAlias: string = 'g'): string {
    return `(
      ${tableAlias}.platformName != 'Flash'
      OR EXISTS (
        SELECT 1 FROM game_data gd
        WHERE gd.gameId = ${tableAlias}.id
        AND (LOWER(gd.launchCommand) LIKE '%.swf' OR LOWER(gd.launchCommand) LIKE '%.swf?%')
      )
      OR (LOWER(${tableAlias}.launchCommand) LIKE '%.swf' OR LOWER(${tableAlias}.launchCommand) LIKE '%.swf?%')
    )`;
  }

  /**
   * Check if running Infinity edition (has logoPath/screenshotPath columns)
   */
  private isInfinityEdition(): boolean {
    return config.flashpointEdition !== 'ultimate';
  }

  /**
   * Get column list based on field selection mode
   * OPTIMIZATION: Reduce payload size for list views by selecting only essential columns
   */
  private getColumnSelection(fields?: 'list' | 'detail'): string {
    const isInfinity = this.isInfinityEdition();

    if (fields === 'list') {
      // Minimal columns for list views (7 essential fields)
      // GameCard uses: id, title, developer, platformName
      // GameListItem uses: id, title, developer, platformName, tagsStr
      // library and orderTitle needed for filtering/sorting
      return `
        g.id, g.title, g.developer, g.platformName,
        g.tagsStr, g.library, g.orderTitle
      `;
    }

    // Default: All columns for detail views
    const baseColumns = `
      g.id, g.parentGameId, g.title, g.alternateTitles, g.series,
      g.developer, g.publisher, g.platformName, g.platformsStr, g.platformId,
      g.playMode, g.status, g.broken, g.extreme, g.notes, g.tagsStr,
      g.source, g.applicationPath, g.launchCommand, g.releaseDate,
      g.version, g.originalDescription, g.language,
      g.library, g.orderTitle, g.dateAdded, g.dateModified,
      g.lastPlayed, g.playtime, g.playCounter, g.archiveState,
      g.activeDataId, g.activeDataOnDisk`;

    // Infinity edition has logoPath and screenshotPath columns
    if (isInfinity) {
      return (
        baseColumns +
        `,
      g.logoPath, g.screenshotPath`
      );
    }

    return baseColumns;
  }

  async searchGames(query: GameSearchQuery): Promise<PaginatedResult<Game>> {
    try {
      const offset = (query.page - 1) * query.limit;

      // Get column selection based on fields parameter
      const columns = this.getColumnSelection(query.fields);

      // OPTIMIZATION: Build query WITHOUT LEFT JOIN to avoid row explosion
      // We'll fetch presentOnDisk separately and merge results
      let sql = `
        SELECT
          ${columns},
          COUNT(*) OVER() as total_count
        FROM game g
        WHERE 1=1
      `;

      const params: unknown[] = [];

      // Apply filters
      if (query.platforms && query.platforms.length > 0) {
        // Use OR condition for multiple platforms
        const platformPlaceholders = query.platforms.map(() => '?').join(', ');
        sql += ` AND g.platformName IN (${platformPlaceholders})`;
        params.push(...query.platforms);
      }

      if (query.series && query.series.length > 0) {
        // Use OR condition for multiple series
        const seriesPlaceholders = query.series.map(() => '?').join(', ');
        sql += ` AND g.series IN (${seriesPlaceholders})`;
        params.push(...query.series);
      }

      if (query.developers && query.developers.length > 0) {
        // Developers are semicolon-delimited (e.g., "Studio A; Studio B")
        // Use INSTR for matching - game should have ANY of the selected developers
        sql += ` AND g.developer IS NOT NULL AND g.developer != ''`;
        const devConditions = query.developers.map(
          () => `INSTR(';' || g.developer || ';', ?) > 0`
        );
        sql += ` AND (${devConditions.join(' OR ')})`;
        params.push(...query.developers.map((dev) => `;${dev};`));
      }

      if (query.publishers && query.publishers.length > 0) {
        // Publishers are semicolon-delimited (e.g., "Publisher A; Publisher B")
        // Use INSTR for matching - game should have ANY of the selected publishers
        sql += ` AND g.publisher IS NOT NULL AND g.publisher != ''`;
        const pubConditions = query.publishers.map(
          () => `INSTR(';' || g.publisher || ';', ?) > 0`
        );
        sql += ` AND (${pubConditions.join(' OR ')})`;
        params.push(...query.publishers.map((pub) => `;${pub};`));
      }

      if (query.playModes && query.playModes.length > 0) {
        // Play modes are semicolon-delimited (e.g., "Single Player;Multiplayer")
        // Use INSTR for matching - game should have ANY of the selected play modes
        sql += ` AND g.playMode IS NOT NULL AND g.playMode != ''`;
        const modeConditions = query.playModes.map(
          () => `INSTR(';' || g.playMode || ';', ?) > 0`
        );
        sql += ` AND (${modeConditions.join(' OR ')})`;
        params.push(...query.playModes.map((mode) => `;${mode};`));
      }

      if (query.languages && query.languages.length > 0) {
        // Ensure language is not NULL/empty (matches filter options query)
        sql += ` AND g.language IS NOT NULL AND g.language != ''`;
        // Languages are semicolon-delimited, may have various whitespace
        // Normalize: lowercase + remove all common whitespace chars to match JS \s regex
        // Space, Tab(9), LF(10), VT(11), FF(12), CR(13)
        // Use OR logic - game should have ANY of the selected languages
        const langConditions = query.languages.map(() =>
          `INSTR(';' || LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(g.language, ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(11), ''), CHAR(12), ''), CHAR(13), '')) || ';', ?) > 0`
        );
        sql += ` AND (${langConditions.join(' OR ')})`;
        params.push(...query.languages.map((lang) => `;${lang.toLowerCase()};`));
      }

      if (query.library) {
        sql += ` AND g.library = ?`;
        params.push(query.library);
      }

      // OPTIMIZATION: Use INSTR instead of LIKE for tag matching (faster in SQLite)
      if (query.tags && query.tags.length > 0) {
        // Check if tags are in tagsStr field using INSTR with semicolon boundaries
        query.tags.forEach((tag) => {
          sql += ` AND INSTR(';' || g.tagsStr || ';', ?) > 0`;
          params.push(`;${tag};`);
        });
      }

      // OPTIMIZATION: Use full date string comparison instead of SUBSTR/CAST
      // This leverages the releaseDate index (YYYY-MM-DD format is lexicographically sortable)
      if (query.yearFrom !== undefined) {
        sql += ` AND g.releaseDate >= ?`;
        params.push(`${query.yearFrom}-01-01`);
      }

      if (query.yearTo !== undefined) {
        sql += ` AND g.releaseDate <= ?`;
        params.push(`${query.yearTo}-12-31`);
      }

      // Date filtering for Home page "Recent Games" sections
      if (query.dateAddedSince) {
        sql += ` AND g.dateAdded >= ?`;
        params.push(query.dateAddedSince);
      }

      if (query.dateModifiedSince) {
        sql += ` AND g.dateModified >= ?`;
        params.push(query.dateModifiedSince);
      }

      if (!query.showBroken) {
        sql += ` AND (g.broken = 0 OR g.broken IS NULL)`;
      }

      if (!query.showExtreme) {
        sql += ` AND (g.extreme = 0 OR g.extreme IS NULL)`;
      }

      // Exclude Flash games without SWF launch commands (not web-playable)
      // Skip this filter when explicitly filtering by Flash platform - show all Flash games
      const isFlashOnlyFilter =
        query.platforms?.length === 1 && query.platforms[0] === 'Flash';
      if (!isFlashOnlyFilter) {
        sql += ` AND ${this.getFlashSwfCondition('g')}`;
      }

      if (query.search) {
        sql += ` AND (
          g.title LIKE ? ESCAPE '\\' OR
          g.alternateTitles LIKE ? ESCAPE '\\' OR
          g.developer LIKE ? ESCAPE '\\' OR
          g.publisher LIKE ? ESCAPE '\\'
        )`;
        // Escape LIKE wildcards in the search term
        const escapedSearch = query.search
          .replace(/\\/g, '\\\\')
          .replace(/%/g, '\\%')
          .replace(/_/g, '\\_');
        const searchTerm = `%${escapedSearch}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      // Apply sorting
      const sortColumn = this.getSortColumn(query.sortBy);
      const safeOrder = query.sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      sql += ` ORDER BY ${sortColumn} ${safeOrder}`;

      // Apply pagination
      sql += ` LIMIT ? OFFSET ?`;
      params.push(query.limit, offset);

      // Log SQL query for debugging (only if date filters are used)
      if (query.dateAddedSince || query.dateModifiedSince) {
        logger.debug('[GameService] Executing query with date filters', {
          dateAddedSince: query.dateAddedSince,
          dateModifiedSince: query.dateModifiedSince,
          sortBy: query.sortBy,
          params: params,
        });
      }

      // OPTIMIZATION: Single query execution with window function for count
      const games = DatabaseService.all(sql, params) as (Game & { total_count: number })[];

      // Extract total from first row (window function provides same count for all rows)
      const total = games.length > 0 ? games[0].total_count : 0;

      // OPTIMIZATION: Fetch presentOnDisk separately for returned games (post-processing pattern)
      // This avoids the LEFT JOIN row explosion and GROUP BY aggregation
      if (games.length > 0) {
        const gameIds = games.map((g) => g.id);
        const placeholders = gameIds.map(() => '?').join(', ');

        const presentOnDiskSql = `
          SELECT gameId, MAX(presentOnDisk) as presentOnDisk
          FROM game_data
          WHERE gameId IN (${placeholders})
          GROUP BY gameId
        `;

        const presentOnDiskResults = DatabaseService.all(presentOnDiskSql, gameIds) as Array<{
          gameId: string;
          presentOnDisk: number;
        }>;

        // Create a map for O(1) lookup
        const presentOnDiskMap = new Map(
          presentOnDiskResults.map((r) => [r.gameId, r.presentOnDisk])
        );

        // Merge presentOnDisk into game objects and remove total_count
        games.forEach((game: Game & { total_count?: number }) => {
          game.presentOnDisk = presentOnDiskMap.get(game.id) ?? 0;
          delete game.total_count;
        });
      }

      return {
        data: games as Game[],
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      };
    } catch (error) {
      logger.error('Error searching games:', {
        error: error instanceof Error ? error.message : String(error),
        query: {
          dateAddedSince: query.dateAddedSince,
          dateModifiedSince: query.dateModifiedSince,
          sortBy: query.sortBy,
          library: query.library,
          page: query.page,
          limit: query.limit,
        },
      });
      throw error;
    }
  }

  async getGameById(id: string): Promise<Game | null> {
    try {
      const columns = this.getColumnSelection('detail');
      // No need for LEFT JOIN - activeDataId and activeDataOnDisk are on game table
      const sql = `
        SELECT ${columns}
        FROM game g
        WHERE g.id = ?
      `;

      const game = DatabaseService.get(sql, [id]) as Game | null;
      return game;
    } catch (error) {
      logger.error('Error getting game by ID:', error);
      throw error;
    }
  }

  /**
   * Get multiple games by their IDs
   * Returns games in the same order as the input IDs
   */
  async getGamesByIds(ids: string[]): Promise<Game[]> {
    try {
      if (ids.length === 0) {
        return [];
      }

      const columns = this.getColumnSelection('detail');
      const placeholders = ids.map(() => '?').join(', ');

      // Query WITHOUT LEFT JOIN to avoid row explosion from multiple game_data entries
      const sql = `
        SELECT ${columns}
        FROM game g
        WHERE g.id IN (${placeholders})
      `;

      const games = DatabaseService.all(sql, ids) as Game[];

      // Fetch presentOnDisk separately (same post-processing pattern as searchGames)
      if (games.length > 0) {
        const gameIds = games.map((g) => g.id);
        const pdPlaceholders = gameIds.map(() => '?').join(', ');
        const presentOnDiskResults = DatabaseService.all(
          `SELECT gameId, MAX(presentOnDisk) as presentOnDisk
           FROM game_data WHERE gameId IN (${pdPlaceholders}) GROUP BY gameId`,
          gameIds
        ) as Array<{ gameId: string; presentOnDisk: number }>;

        const presentOnDiskMap = new Map(
          presentOnDiskResults.map((r) => [r.gameId, r.presentOnDisk])
        );

        games.forEach((game) => {
          game.presentOnDisk = presentOnDiskMap.get(game.id) ?? 0;
        });
      }

      // Sort games to match the order of input IDs
      const gamesMap = new Map(games.map((g) => [g.id, g]));
      return ids.map((id) => gamesMap.get(id)).filter((g): g is Game => g !== undefined);
    } catch (error) {
      logger.error('Error getting games by IDs:', error);
      throw error;
    }
  }

  /**
   * Get the primary game_data ID for a game
   * Returns the game_data entry that should be used (prioritizes downloaded data)
   */
  async getGameDataId(gameId: string): Promise<number | null> {
    try {
      const sql = `
        SELECT id
        FROM game_data
        WHERE gameId = ?
        ORDER BY id DESC
        LIMIT 1
      `;

      const result = DatabaseService.get(sql, [gameId]) as { id: number } | null;
      return result ? result.id : null;
    } catch (error) {
      logger.error(`Error getting game data ID for gameId ${gameId}:`, error);
      return null;
    }
  }

  async getGameDataPath(gameId: string): Promise<string | null> {
    try {
      const sql = `
        SELECT launchCommand, path, parameters
        FROM game_data
        WHERE gameId = ?
        ORDER BY id DESC
        LIMIT 1
      `;

      const gameData = DatabaseService.get(sql, [gameId]) as {
        launchCommand?: string;
        path?: string;
        parameters?: string;
      } | null;

      if (!gameData) {
        return null;
      }

      // Prefer launchCommand if available
      if (gameData.launchCommand) {
        return gameData.launchCommand;
      }

      // Fall back to path + parameters
      if (gameData.path) {
        if (gameData.parameters) {
          return `${gameData.path}?${gameData.parameters}`;
        }
        return gameData.path;
      }

      return null;
    } catch (error) {
      logger.error(`Error getting game data path for gameId ${gameId}:`, error);
      return null;
    }
  }

  async getRelatedGames(gameId: string, limit: number = 10): Promise<Game[]> {
    try {
      // First get the source game
      const sourceGame = await this.getGameById(gameId);
      if (!sourceGame) {
        return [];
      }

      // Find games with same developer or platform
      const sql = `
        SELECT
          g.id, g.title, g.alternateTitles, g.developer, g.publisher,
          g.platformName, g.platformsStr, g.library, g.tagsStr,
          g.orderTitle
        FROM game g
        WHERE g.id != ?
          AND (
            g.developer = ? OR
            g.platformName = ?
          )
        ORDER BY
          CASE
            WHEN g.developer = ? THEN 1
            WHEN g.platformName = ? THEN 2
            ELSE 3
          END,
          RANDOM()
        LIMIT ?
      `;

      const games = DatabaseService.all(sql, [
        gameId,
        sourceGame.developer,
        sourceGame.platformName,
        sourceGame.developer,
        sourceGame.platformName,
        limit,
      ]) as Game[];

      return games;
    } catch (error) {
      logger.error('Error getting related games:', error);
      throw error;
    }
  }

  async getRandomGame(library?: string, platforms?: string[]): Promise<Game | null> {
    try {
      // Skip Flash SWF filter when explicitly requesting Flash platform
      const isFlashOnlyFilter = platforms?.length === 1 && platforms[0] === 'Flash';
      const flashCondition = isFlashOnlyFilter ? '' : `AND ${this.getFlashSwfCondition('g')}`;

      let sql = `
        SELECT
          g.id, g.title, g.alternateTitles, g.developer, g.publisher,
          g.platformName, g.platformsStr, g.library, g.launchCommand,
          g.tagsStr, g.orderTitle
        FROM game g
        WHERE (g.broken = 0 OR g.broken IS NULL)
          ${flashCondition}
      `;

      const params: unknown[] = [];

      if (library) {
        sql += ` AND g.library = ?`;
        params.push(library);
      }

      if (platforms && platforms.length > 0) {
        const placeholders = platforms.map(() => '?').join(', ');
        sql += ` AND g.platformName IN (${placeholders})`;
        params.push(...platforms);
      }

      sql += ` ORDER BY RANDOM() LIMIT 1`;

      const game = DatabaseService.get(sql, params) as Game | null;
      return game;
    } catch (error) {
      logger.error('Error getting random game:', error);
      throw error;
    }
  }

  private getSortColumn(sortBy: string): string {
    const columnMap: Record<string, string> = {
      // Use COALESCE with NULLIF to fall back to title when orderTitle is empty
      // Many games have empty orderTitle, causing sort to fall back to row ID order
      title: "COALESCE(NULLIF(g.orderTitle, ''), g.title)",
      releaseDate: 'g.releaseDate',
      dateAdded: 'g.dateAdded',
      dateModified: 'g.dateModified',
      developer: 'g.developer',
    };
    return columnMap[sortBy] || "COALESCE(NULLIF(g.orderTitle, ''), g.title)";
  }

  /**
   * Build common WHERE clause conditions for filter options queries
   * Returns conditions array and params array for parameterized queries
   * @param params - Filter parameters to apply
   * @param excludeFilter - Filter type to exclude (so a filter doesn't filter itself)
   *
   * Note: Flash SWF exclusion is NOT applied here for performance.
   * The slight count discrepancy (including non-playable Flash games) is acceptable.
   * getPlatformOptions() handles accurate Flash counts separately.
   */
  private buildFilterOptionsConditions(
    params?: FilterOptionsParams,
    excludeFilter?: 'series' | 'developers' | 'publishers' | 'playModes' | 'languages' | 'tags' | 'platforms' | 'yearRange'
  ): {
    conditions: string[];
    queryParams: unknown[];
  } {
    const conditions: string[] = [
      '(broken = 0 OR broken IS NULL)',
      '(extreme = 0 OR extreme IS NULL)',
    ];
    const queryParams: unknown[] = [];

    if (params?.platform && excludeFilter !== 'platforms') {
      conditions.push('platformName = ?');
      queryParams.push(params.platform);
    }

    if (params?.library) {
      conditions.push('library = ?');
      queryParams.push(params.library);
    }

    // Apply series filter (unless we're getting series options)
    if (params?.series?.length && excludeFilter !== 'series') {
      const placeholders = params.series.map(() => '?').join(', ');
      conditions.push(`series IN (${placeholders})`);
      queryParams.push(...params.series);
    }

    // Apply developers filter (using INSTR for semicolon-delimited matching)
    // Use OR logic - game should have ANY of the selected developers
    if (params?.developers?.length && excludeFilter !== 'developers') {
      conditions.push("developer IS NOT NULL AND developer != ''");
      const devConditions = params.developers.map(
        () => `INSTR(';' || developer || ';', ?) > 0`
      );
      conditions.push(`(${devConditions.join(' OR ')})`);
      queryParams.push(...params.developers.map((dev) => `;${dev};`));
    }

    // Apply publishers filter (using INSTR for semicolon-delimited matching)
    // Use OR logic - game should have ANY of the selected publishers
    if (params?.publishers?.length && excludeFilter !== 'publishers') {
      conditions.push("publisher IS NOT NULL AND publisher != ''");
      const pubConditions = params.publishers.map(
        () => `INSTR(';' || publisher || ';', ?) > 0`
      );
      conditions.push(`(${pubConditions.join(' OR ')})`);
      queryParams.push(...params.publishers.map((pub) => `;${pub};`));
    }

    // Apply playModes filter (using INSTR for semicolon-delimited matching)
    // Use OR logic - game should have ANY of the selected play modes
    if (params?.playModes?.length && excludeFilter !== 'playModes') {
      conditions.push("playMode IS NOT NULL AND playMode != ''");
      const modeConditions = params.playModes.map(
        () => `INSTR(';' || playMode || ';', ?) > 0`
      );
      conditions.push(`(${modeConditions.join(' OR ')})`);
      queryParams.push(...params.playModes.map((mode) => `;${mode};`));
    }

    // Apply languages filter (using INSTR for semicolon-delimited matching)
    // Use OR logic - game should have ANY of the selected languages
    if (params?.languages?.length && excludeFilter !== 'languages') {
      conditions.push("language IS NOT NULL AND language != ''");
      const langConditions = params.languages.map(() =>
        `INSTR(';' || LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(language, ' ', ''), CHAR(9), ''), CHAR(10), ''), CHAR(11), ''), CHAR(12), ''), CHAR(13), '')) || ';', ?) > 0`
      );
      conditions.push(`(${langConditions.join(' OR ')})`);
      queryParams.push(...params.languages.map((lang) => `;${lang.toLowerCase()};`));
    }

    // Apply tags filter (using INSTR for semicolon-delimited matching)
    if (params?.tags?.length && excludeFilter !== 'tags') {
      params.tags.forEach((tag) => {
        conditions.push(`INSTR(';' || tagsStr || ';', ?) > 0`);
        queryParams.push(`;${tag};`);
      });
    }

    // Apply year range filter
    if (params?.yearFrom !== undefined && excludeFilter !== 'yearRange') {
      conditions.push('releaseDate >= ?');
      queryParams.push(`${params.yearFrom}-01-01`);
    }

    if (params?.yearTo !== undefined && excludeFilter !== 'yearRange') {
      conditions.push('releaseDate <= ?');
      queryParams.push(`${params.yearTo}-12-31`);
    }

    return { conditions, queryParams };
  }

  /**
   * Get all filter options for dropdowns in a single call
   * Returns: series, developers, publishers, playModes, languages, tags, platforms, yearRange
   * When params are provided, filters options to only include values relevant to the current view
   *
   * @param params - Filter parameters to apply
   * @param excludeSet - Set of filter types to exclude from response (e.g., 'series', 'developers')
   *                     Used to skip re-fetching options for already-active filters
   *
   * Caching strategy:
   * - Base page combinations (platform+library only): Cached indefinitely until DB reload
   * - Dynamic filter combinations: Cached with 30s TTL for performance during filter exploration
   */
  async getFilterOptions(
    params?: FilterOptionsParams,
    excludeSet?: Set<string>
  ): Promise<Partial<FilterOptionsResult>> {
    const { key: cacheKey, isDynamic } = GameService.getFilterOptionsCacheKey(params);
    const now = Date.now();

    // Check appropriate cache based on filter type
    // Note: We still return full cached results even with excludeSet,
    // because the cache contains complete data
    if (isDynamic) {
      // Check dynamic filter cache (short TTL)
      const cached = GameService.dynamicFilterCache.get(cacheKey);
      if (cached && now < cached.expiry) {
        logger.debug('[GameService] Dynamic filter cache HIT');
        // Filter out excluded types from cached result
        if (excludeSet?.size) {
          return this.filterExcludedTypes(cached.result, excludeSet);
        }
        return cached.result;
      }
    } else {
      // Check base page cache (indefinite TTL)
      const cached = GameService.filterOptionsCache.get(cacheKey);
      if (cached) {
        if (excludeSet?.size) {
          return this.filterExcludedTypes(cached, excludeSet);
        }
        return cached;
      }
    }

    try {
      const startTime = performance.now();

      // Build result, skipping excluded types for performance
      const result: FilterOptionsResult = {
        series: excludeSet?.has('series') ? [] : this.getSeriesOptions(params),
        developers: excludeSet?.has('developers') ? [] : this.getDeveloperOptions(params),
        publishers: excludeSet?.has('publishers') ? [] : this.getPublisherOptions(params),
        playModes: excludeSet?.has('playModes') ? [] : this.getPlayModeOptions(params),
        languages: excludeSet?.has('languages') ? [] : this.getLanguageOptions(params),
        tags: excludeSet?.has('tags') ? [] : this.getTagOptions(params),
        platforms: excludeSet?.has('platforms') ? [] : this.getPlatformOptions(params),
        yearRange: excludeSet?.has('yearRange')
          ? { min: 1970, max: new Date().getFullYear() }
          : this.getYearRange(params),
      };

      const duration = Math.round(performance.now() - startTime);

      // Only cache if we fetched everything (no excludeSet)
      // Partial results shouldn't pollute the cache
      if (!excludeSet?.size) {
        if (isDynamic) {
          // Cleanup old entries periodically
          if (GameService.dynamicFilterCache.size > GameService.DYNAMIC_FILTER_CACHE_MAX_SIZE / 2) {
            GameService.cleanupDynamicFilterCache();
          }
          GameService.dynamicFilterCache.set(cacheKey, {
            result,
            expiry: now + GameService.DYNAMIC_FILTER_CACHE_TTL,
          });
          logger.debug(`[GameService] Dynamic filter options computed in ${duration}ms, cached for 30s`);
        } else {
          GameService.filterOptionsCache.set(cacheKey, result);
          logger.debug(`[GameService] Base filter options computed in ${duration}ms, cached indefinitely`);
        }
      } else {
        logger.debug(
          `[GameService] Partial filter options computed in ${duration}ms (excluded: ${[...excludeSet].join(', ')})`
        );
      }

      // Return partial result without excluded types
      return this.filterExcludedTypes(result, excludeSet);
    } catch (error) {
      logger.error('Error getting filter options:', error);
      throw error;
    }
  }

  /**
   * Filter out excluded types from result, returning undefined for excluded fields
   */
  private filterExcludedTypes(
    result: FilterOptionsResult,
    excludeSet?: Set<string>
  ): Partial<FilterOptionsResult> {
    if (!excludeSet?.size) return result;

    return {
      series: excludeSet.has('series') ? undefined : result.series,
      developers: excludeSet.has('developers') ? undefined : result.developers,
      publishers: excludeSet.has('publishers') ? undefined : result.publishers,
      playModes: excludeSet.has('playModes') ? undefined : result.playModes,
      languages: excludeSet.has('languages') ? undefined : result.languages,
      tags: excludeSet.has('tags') ? undefined : result.tags,
      platforms: excludeSet.has('platforms') ? undefined : result.platforms,
      yearRange: excludeSet.has('yearRange') ? undefined : result.yearRange,
    };
  }

  /**
   * Get distinct series names
   * Applies default filters: excludes broken/extreme games
   */
  getSeriesOptions(params?: FilterOptionsParams): string[] {
    try {
      const { conditions, queryParams } = this.buildFilterOptionsConditions(params, 'series');
      conditions.unshift("series IS NOT NULL AND series != ''");

      const sql = `
        SELECT DISTINCT series as name
        FROM game
        WHERE ${conditions.join(' AND ')}
        ORDER BY series ASC
      `;

      const results = DatabaseService.all(sql, queryParams) as Array<{ name: string }>;
      return results.map((r) => r.name);
    } catch (error) {
      logger.error('Error getting series options:', error);
      return [];
    }
  }

  /**
   * Get distinct developers
   * Applies default filters: excludes broken/extreme games
   * Developers are semicolon-delimited (e.g., "Studio A; Studio B"), so we split and deduplicate
   */
  getDeveloperOptions(params?: FilterOptionsParams): string[] {
    try {
      const { conditions, queryParams } = this.buildFilterOptionsConditions(params, 'developers');
      conditions.unshift("developer IS NOT NULL AND developer != ''");

      const sql = `
        SELECT developer
        FROM game
        WHERE ${conditions.join(' AND ')}
      `;

      const results = DatabaseService.all(sql, queryParams) as Array<{ developer: string }>;

      // Developers are semicolon-delimited
      const developerSet = new Set<string>();

      for (const row of results) {
        for (const dev of row.developer.split(';').map((d) => d.trim()).filter((d) => d)) {
          developerSet.add(dev);
        }
      }

      // Convert to sorted array
      return [...developerSet].sort((a, b) => a.localeCompare(b));
    } catch (error) {
      logger.error('Error getting developer options:', error);
      return [];
    }
  }

  /**
   * Get distinct publishers
   * Applies default filters: excludes broken/extreme games
   * Publishers are semicolon-delimited (e.g., "Publisher A; Publisher B"), so we split and deduplicate
   */
  getPublisherOptions(params?: FilterOptionsParams): string[] {
    try {
      const { conditions, queryParams } = this.buildFilterOptionsConditions(params, 'publishers');
      conditions.unshift("publisher IS NOT NULL AND publisher != ''");

      const sql = `
        SELECT publisher
        FROM game
        WHERE ${conditions.join(' AND ')}
      `;

      const results = DatabaseService.all(sql, queryParams) as Array<{ publisher: string }>;

      // Publishers are semicolon-delimited
      const publisherSet = new Set<string>();

      for (const row of results) {
        for (const pub of row.publisher.split(';').map((p) => p.trim()).filter((p) => p)) {
          publisherSet.add(pub);
        }
      }

      // Convert to sorted array
      return [...publisherSet].sort((a, b) => a.localeCompare(b));
    } catch (error) {
      logger.error('Error getting publisher options:', error);
      return [];
    }
  }

  /**
   * Get distinct play modes
   * Applies default filters: excludes broken/extreme games
   * Play modes are semicolon-delimited (e.g., "Single Player;Multiplayer"), so we split and deduplicate
   */
  getPlayModeOptions(params?: FilterOptionsParams): string[] {
    try {
      const { conditions, queryParams } = this.buildFilterOptionsConditions(params, 'playModes');
      conditions.unshift("playMode IS NOT NULL AND playMode != ''");

      const sql = `
        SELECT playMode
        FROM game
        WHERE ${conditions.join(' AND ')}
      `;

      const results = DatabaseService.all(sql, queryParams) as Array<{ playMode: string }>;

      // Play modes are semicolon-delimited (like tags/languages)
      const playModeSet = new Set<string>();

      for (const row of results) {
        // Split and add to set (auto-deduplicates)
        for (const mode of row.playMode.split(';').map((m) => m.trim()).filter((m) => m)) {
          playModeSet.add(mode);
        }
      }

      // Convert to sorted array
      return [...playModeSet].sort((a, b) => a.localeCompare(b));
    } catch (error) {
      logger.error('Error getting play mode options:', error);
      return [];
    }
  }

  /**
   * Get distinct languages
   * Applies default filters: excludes broken/extreme games
   * Languages are semicolon-delimited (e.g., "en;jp;ru"), so we split and deduplicate
   */
  getLanguageOptions(params?: FilterOptionsParams): string[] {
    try {
      const { conditions, queryParams } = this.buildFilterOptionsConditions(params, 'languages');
      conditions.unshift("language IS NOT NULL AND language != ''");

      const sql = `
        SELECT language
        FROM game
        WHERE ${conditions.join(' AND ')}
      `;

      const results = DatabaseService.all(sql, queryParams) as Array<{ language: string }>;

      // Languages are semicolon-delimited (like tags)
      // Normalize using exact same logic as searchGames SQL query:
      // Remove: space, tab(9), LF(10), VT(11), FF(12), CR(13), then lowercase
      const languageSet = new Set<string>();

      for (const row of results) {
        const normalized = row.language
          .replace(/ /g, '')      // space
          .replace(/\t/g, '')     // tab (CHAR 9)
          .replace(/\n/g, '')     // LF (CHAR 10)
          .replace(/\v/g, '')     // VT (CHAR 11)
          .replace(/\f/g, '')     // FF (CHAR 12)
          .replace(/\r/g, '')     // CR (CHAR 13)
          .toLowerCase();

        // Split and add to set (auto-deduplicates)
        for (const lang of normalized.split(';').filter((l) => l)) {
          languageSet.add(lang);
        }
      }

      // Convert to sorted array (no limit - languages are short codes)
      return [...languageSet].sort((a, b) => a.localeCompare(b));
    } catch (error) {
      logger.error('Error getting language options:', error);
      return [];
    }
  }

  /**
   * Get distinct tags
   * Applies default filters: excludes broken/extreme games
   */
  getTagOptions(params?: FilterOptionsParams): string[] {
    try {
      const { conditions, queryParams } = this.buildFilterOptionsConditions(params, 'tags');
      conditions.unshift("tagsStr IS NOT NULL AND tagsStr != ''");

      const sql = `
        SELECT tagsStr
        FROM game
        WHERE ${conditions.join(' AND ')}
      `;

      const results = DatabaseService.all(sql, queryParams) as Array<{ tagsStr: string }>;

      // Tags are semicolon-delimited
      const tagSet = new Set<string>();

      for (const row of results) {
        for (const tag of row.tagsStr.split(';').map((t) => t.trim()).filter((t) => t)) {
          tagSet.add(tag);
        }
      }

      // Convert to sorted array (no limit - frontend uses virtualization for large lists)
      return [...tagSet].sort((a, b) => a.localeCompare(b));
    } catch (error) {
      logger.error('Error getting tag options:', error);
      return [];
    }
  }

  /**
   * Get distinct platforms
   * Applies default filters and context-aware filters (except platform itself)
   */
  getPlatformOptions(params?: FilterOptionsParams): string[] {
    try {
      // Use common conditions but exclude platform filter (would defeat the purpose)
      const { conditions, queryParams } = this.buildFilterOptionsConditions(params, 'platforms');
      conditions.unshift("platformName IS NOT NULL AND platformName != ''");

      const sql = `
        SELECT DISTINCT platformName as name
        FROM game
        WHERE ${conditions.join(' AND ')}
        ORDER BY platformName ASC
      `;

      const results = DatabaseService.all(sql, queryParams) as Array<{ name: string }>;
      return results.map((r) => r.name);
    } catch (error) {
      logger.error('Error getting platform options:', error);
      return [];
    }
  }

  /**
   * Get year range from release dates
   * Applies default filters: excludes broken/extreme games
   */
  getYearRange(params?: FilterOptionsParams): { min: number; max: number } {
    try {
      const { conditions, queryParams } = this.buildFilterOptionsConditions(params, 'yearRange');
      conditions.unshift("releaseDate IS NOT NULL AND releaseDate != '' AND LENGTH(releaseDate) >= 4");

      const sql = `
        SELECT
          MIN(CAST(SUBSTR(releaseDate, 1, 4) AS INTEGER)) as min,
          MAX(CAST(SUBSTR(releaseDate, 1, 4) AS INTEGER)) as max
        FROM game
        WHERE ${conditions.join(' AND ')}
      `;

      const result = DatabaseService.get(sql, queryParams) as { min: number; max: number } | null;
      return result ?? { min: 1970, max: new Date().getFullYear() };
    } catch (error) {
      logger.error('Error getting year range:', error);
      return { min: 1970, max: new Date().getFullYear() };
    }
  }

  /**
   * Get most played games globally (across all users)
   * Returns games with highest play counts from user tracking data
   */
  async getMostPlayedGames(limit = 20): Promise<Game[]> {
    try {
      const { UserDatabaseService } = await import('./UserDatabaseService');

      // Get most played game IDs from user database with aggregated stats
      const mostPlayedStats = UserDatabaseService.all(
        `SELECT
          game_id,
          SUM(total_plays) as total_plays,
          SUM(total_playtime_seconds) as total_playtime
         FROM user_game_stats
         GROUP BY game_id
         ORDER BY total_plays DESC, total_playtime DESC
         LIMIT ?`,
        [limit]
      ) as Array<{ game_id: string; total_plays: number; total_playtime: number }>;

      if (mostPlayedStats.length === 0) {
        return [];
      }

      // Get game IDs for query
      const gameIds = mostPlayedStats.map((stat) => stat.game_id);

      // Fetch full game details from flashpoint database using list fields
      const placeholders = gameIds.map(() => '?').join(',');
      const sql = `
        SELECT ${this.getColumnSelection('list')}
        FROM game g
        WHERE g.id IN (${placeholders})
      `;

      const games = DatabaseService.all(sql, gameIds) as Game[];

      // Sort games by the original play count order
      const gameMap = new Map(games.map((game) => [game.id, game]));
      const sortedGames = gameIds
        .map((id) => gameMap.get(id))
        .filter((game): game is Game => game !== undefined);

      return sortedGames;
    } catch (error) {
      logger.error('Error getting most played games:', error);
      return [];
    }
  }
}
