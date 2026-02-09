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
   * Get the set of Flash game IDs whose game_data.launchCommand points to a .swf file.
   * Results are cached in memory for 1 hour (read-only DB changes rarely).
   */
  private getFlashSwfGameIds(): Set<string> {
    const now = Date.now();
    if (GameService.flashSwfGameIds && now < GameService.flashSwfCacheExpiry) {
      return GameService.flashSwfGameIds;
    }

    const startTime = performance.now();
    const sql = `
      SELECT DISTINCT gd.gameId
      FROM game_data gd
      JOIN game g ON g.id = gd.gameId
      WHERE g.platformName = 'Flash'
        AND (LOWER(gd.launchCommand) LIKE '%.swf' OR LOWER(gd.launchCommand) LIKE '%.swf?%')
    `;

    const rows = DatabaseService.all(sql, []) as Array<{ gameId: string }>;
    GameService.flashSwfGameIds = new Set(rows.map((r) => r.gameId));
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
   * SQL condition to exclude Flash games without SWF launch commands.
   * Uses EXISTS subquery against game_data table (leverages UNIQUE(gameId, dateAdded) index).
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
        // Use OR condition for multiple developers
        const developerPlaceholders = query.developers.map(() => '?').join(', ');
        sql += ` AND g.developer IN (${developerPlaceholders})`;
        params.push(...query.developers);
      }

      if (query.publishers && query.publishers.length > 0) {
        // Use OR condition for multiple publishers
        const publisherPlaceholders = query.publishers.map(() => '?').join(', ');
        sql += ` AND g.publisher IN (${publisherPlaceholders})`;
        params.push(...query.publishers);
      }

      if (query.playModes && query.playModes.length > 0) {
        // Use OR condition for multiple play modes
        const playModePlaceholders = query.playModes.map(() => '?').join(', ');
        sql += ` AND g.playMode IN (${playModePlaceholders})`;
        params.push(...query.playModes);
      }

      if (query.languages && query.languages.length > 0) {
        // Use OR condition for multiple languages
        const languagePlaceholders = query.languages.map(() => '?').join(', ');
        sql += ` AND g.language IN (${languagePlaceholders})`;
        params.push(...query.languages);
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
      sql += ` AND ${this.getFlashSwfCondition('g')}`;

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

  async getRandomGame(library?: string): Promise<Game | null> {
    try {
      let sql = `
        SELECT
          g.id, g.title, g.alternateTitles, g.developer, g.publisher,
          g.platformName, g.platformsStr, g.library, g.launchCommand,
          g.tagsStr, g.orderTitle
        FROM game g
        WHERE (g.broken = 0 OR g.broken IS NULL)
          AND ${this.getFlashSwfCondition('g')}
      `;

      const params: unknown[] = [];

      if (library) {
        sql += ` AND g.library = ?`;
        params.push(library);
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
      title: 'g.orderTitle',
      releaseDate: 'g.releaseDate',
      dateAdded: 'g.dateAdded',
      dateModified: 'g.dateModified',
      developer: 'g.developer',
    };
    return columnMap[sortBy] || 'g.orderTitle';
  }

  /**
   * Get all filter options for dropdowns in a single call
   * Returns: series, developers, publishers, playModes, languages, tags, platforms, yearRange
   * Note: Methods are synchronous but wrapped in async for consistent API contract
   */
  async getFilterOptions(): Promise<{
    series: Array<{ name: string; count: number }>;
    developers: Array<{ name: string; count: number }>;
    publishers: Array<{ name: string; count: number }>;
    playModes: Array<{ name: string; count: number }>;
    languages: Array<{ name: string; count: number }>;
    tags: Array<{ name: string; count: number }>;
    platforms: Array<{ name: string; count: number }>;
    yearRange: { min: number; max: number };
  }> {
    try {
      // Call synchronous methods directly (no Promise.all needed)
      const series = this.getSeriesOptions();
      const developers = this.getDeveloperOptions();
      const publishers = this.getPublisherOptions();
      const playModes = this.getPlayModeOptions();
      const languages = this.getLanguageOptions();
      const tags = this.getTagOptions();
      const platforms = this.getPlatformOptions();
      const yearRange = this.getYearRange();

      return {
        series,
        developers,
        publishers,
        playModes,
        languages,
        tags,
        platforms,
        yearRange,
      };
    } catch (error) {
      logger.error('Error getting filter options:', error);
      throw error;
    }
  }

  /**
   * Get distinct series with game counts
   * Applies default filters: excludes broken/extreme games
   */
  getSeriesOptions(): Array<{ name: string; count: number }> {
    try {
      const sql = `
        SELECT series as name, COUNT(*) as count
        FROM game
        WHERE series IS NOT NULL AND series != ''
          AND (broken = 0 OR broken IS NULL)
          AND (extreme = 0 OR extreme IS NULL)
        GROUP BY series
        ORDER BY count DESC, series ASC
        LIMIT 100
      `;

      const results = DatabaseService.all(sql, []) as Array<{ name: string; count: number }>;
      return results;
    } catch (error) {
      logger.error('Error getting series options:', error);
      return [];
    }
  }

  /**
   * Get distinct developers with game counts
   * Applies default filters: excludes broken/extreme games
   */
  getDeveloperOptions(): Array<{ name: string; count: number }> {
    try {
      const sql = `
        SELECT developer as name, COUNT(*) as count
        FROM game
        WHERE developer IS NOT NULL AND developer != ''
          AND (broken = 0 OR broken IS NULL)
          AND (extreme = 0 OR extreme IS NULL)
        GROUP BY developer
        ORDER BY count DESC, developer ASC
        LIMIT 100
      `;

      const results = DatabaseService.all(sql, []) as Array<{ name: string; count: number }>;
      return results;
    } catch (error) {
      logger.error('Error getting developer options:', error);
      return [];
    }
  }

  /**
   * Get distinct publishers with game counts
   * Applies default filters: excludes broken/extreme games
   */
  getPublisherOptions(): Array<{ name: string; count: number }> {
    try {
      const sql = `
        SELECT publisher as name, COUNT(*) as count
        FROM game
        WHERE publisher IS NOT NULL AND publisher != ''
          AND (broken = 0 OR broken IS NULL)
          AND (extreme = 0 OR extreme IS NULL)
        GROUP BY publisher
        ORDER BY count DESC, publisher ASC
        LIMIT 100
      `;

      const results = DatabaseService.all(sql, []) as Array<{ name: string; count: number }>;
      return results;
    } catch (error) {
      logger.error('Error getting publisher options:', error);
      return [];
    }
  }

  /**
   * Get distinct play modes with game counts
   * Applies default filters: excludes broken/extreme games
   */
  getPlayModeOptions(): Array<{ name: string; count: number }> {
    try {
      const sql = `
        SELECT playMode as name, COUNT(*) as count
        FROM game
        WHERE playMode IS NOT NULL AND playMode != ''
          AND (broken = 0 OR broken IS NULL)
          AND (extreme = 0 OR extreme IS NULL)
        GROUP BY playMode
        ORDER BY count DESC, playMode ASC
      `;

      const results = DatabaseService.all(sql, []) as Array<{ name: string; count: number }>;
      return results;
    } catch (error) {
      logger.error('Error getting play mode options:', error);
      return [];
    }
  }

  /**
   * Get distinct languages with game counts
   * Applies default filters: excludes broken/extreme games
   */
  getLanguageOptions(): Array<{ name: string; count: number }> {
    try {
      const sql = `
        SELECT language as name, COUNT(*) as count
        FROM game
        WHERE language IS NOT NULL AND language != ''
          AND (broken = 0 OR broken IS NULL)
          AND (extreme = 0 OR extreme IS NULL)
        GROUP BY language
        ORDER BY count DESC, language ASC
        LIMIT 100
      `;

      const results = DatabaseService.all(sql, []) as Array<{ name: string; count: number }>;
      return results;
    } catch (error) {
      logger.error('Error getting language options:', error);
      return [];
    }
  }

  /**
   * Get distinct tags with game counts (reusing existing logic from tags route)
   * Applies default filters: excludes broken/extreme games
   */
  getTagOptions(): Array<{ name: string; count: number }> {
    try {
      const sql = `
        SELECT DISTINCT tagsStr
        FROM game
        WHERE tagsStr IS NOT NULL AND tagsStr != ''
          AND (broken = 0 OR broken IS NULL)
          AND (extreme = 0 OR extreme IS NULL)
      `;

      const results = DatabaseService.all(sql, []) as Array<{ tagsStr: string }>;

      // Tags are semicolon-delimited
      const tagCounts = new Map<string, number>();

      for (const row of results) {
        const tags = row.tagsStr
          .split(';')
          .map((tag) => tag.trim())
          .filter((tag) => tag);
        for (const tag of tags) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      }

      // Convert to array and sort
      const tagOptions = Array.from(tagCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
        .slice(0, 100); // Limit to top 100

      return tagOptions;
    } catch (error) {
      logger.error('Error getting tag options:', error);
      return [];
    }
  }

  /**
   * Get distinct platforms with game counts
   * Applies default filters: excludes broken/extreme games
   */
  getPlatformOptions(): Array<{ name: string; count: number }> {
    try {
      // Query all platforms without Flash SWF filter (fast, no EXISTS)
      const sql = `
        SELECT platformName as name, COUNT(*) as count
        FROM game
        WHERE platformName IS NOT NULL AND platformName != ''
          AND (broken = 0 OR broken IS NULL)
          AND (extreme = 0 OR extreme IS NULL)
        GROUP BY platformName
        ORDER BY platformName ASC
      `;

      const results = DatabaseService.all(sql, []) as Array<{ name: string; count: number }>;

      // Adjust Flash count using cached SWF game IDs (avoids slow EXISTS subquery)
      const flashSwfIds = this.getFlashSwfGameIds();
      const flashIndex = results.findIndex((r) => r.name === 'Flash');
      if (flashIndex !== -1) {
        results[flashIndex].count = flashSwfIds.size;
      }

      return results;
    } catch (error) {
      logger.error('Error getting platform options:', error);
      return [];
    }
  }

  /**
   * Get year range from release dates
   * Applies default filters: excludes broken/extreme games
   */
  getYearRange(): { min: number; max: number } {
    try {
      const sql = `
        SELECT
          MIN(CAST(SUBSTR(releaseDate, 1, 4) AS INTEGER)) as min,
          MAX(CAST(SUBSTR(releaseDate, 1, 4) AS INTEGER)) as max
        FROM game
        WHERE releaseDate IS NOT NULL
          AND releaseDate != ''
          AND LENGTH(releaseDate) >= 4
          AND (broken = 0 OR broken IS NULL)
          AND (extreme = 0 OR extreme IS NULL)
      `;

      const result = DatabaseService.get(sql, []) as { min: number; max: number } | null;
      return result || { min: 1970, max: new Date().getFullYear() };
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
