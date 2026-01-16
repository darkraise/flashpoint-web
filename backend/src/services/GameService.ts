import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';

export interface GameSearchQuery {
  search?: string;
  platform?: string;
  library?: string;
  tags?: string[];
  yearFrom?: number;
  yearTo?: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
  showBroken: boolean;
  showExtreme: boolean;
  webPlayableOnly: boolean; // Only show HTML5 and Flash games (web-playable with Ruffle)
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
  logoPath?: string;
  screenshotPath?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class GameService {
  async searchGames(query: GameSearchQuery): Promise<PaginatedResult<Game>> {
    try {
      const offset = (query.page - 1) * query.limit;

      let sql = `
        SELECT
          g.id, g.parentGameId, g.title, g.alternateTitles, g.series,
          g.developer, g.publisher, g.platformName, g.platformsStr, g.platformId,
          g.playMode, g.status, g.broken, g.extreme, g.notes, g.tagsStr,
          g.source, g.applicationPath, g.launchCommand, g.releaseDate,
          g.version, g.originalDescription, g.language,
          g.library, g.orderTitle, g.dateAdded, g.dateModified,
          g.lastPlayed, g.playtime, g.playCounter, g.archiveState,
          g.logoPath, g.screenshotPath,
          MAX(gd.presentOnDisk) as presentOnDisk
        FROM game g
        LEFT JOIN game_data gd ON gd.gameId = g.id
        WHERE 1=1
      `;

      const params: any[] = [];

      // Apply filters
      if (query.platform) {
        sql += ` AND g.platformName = ?`;
        params.push(query.platform);
      }

      if (query.library) {
        sql += ` AND g.library = ?`;
        params.push(query.library);
      }

      if (query.tags && query.tags.length > 0) {
        // Check if tags are in tagsStr field
        const tagConditions = query.tags.map(() => `g.tagsStr LIKE ?`).join(' AND ');
        sql += ` AND (${tagConditions})`;
        query.tags.forEach(tag => params.push(`%${tag}%`));
      }

      if (query.yearFrom !== undefined) {
        // Extract year from releaseDate (format: YYYY-MM-DD)
        sql += ` AND CAST(SUBSTR(g.releaseDate, 1, 4) AS INTEGER) >= ?`;
        params.push(query.yearFrom);
      }

      if (query.yearTo !== undefined) {
        sql += ` AND CAST(SUBSTR(g.releaseDate, 1, 4) AS INTEGER) <= ?`;
        params.push(query.yearTo);
      }

      if (!query.showBroken) {
        sql += ` AND (g.broken = 0 OR g.broken IS NULL)`;
      }

      if (!query.showExtreme) {
        sql += ` AND (g.extreme = 0 OR g.extreme IS NULL)`;
      }

      if (query.webPlayableOnly) {
        // Only show HTML5 and Flash games (web-playable with Ruffle)
        sql += ` AND g.platformName IN (?, ?)`;
        params.push('HTML5', 'Flash');
      }

      if (query.search) {
        sql += ` AND (
          g.title LIKE ? OR
          g.alternateTitles LIKE ? OR
          g.developer LIKE ? OR
          g.publisher LIKE ?
        )`;
        const searchTerm = `%${query.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      // Count total (need to count distinct games since we're joining game_data)
      const countSql = sql.replace(
        /SELECT[\s\S]+?FROM game g/,
        'SELECT COUNT(DISTINCT g.id) as count FROM game g'
      );
      const countResult = DatabaseService.get(countSql, params) as { count: number };
      const total = countResult.count;

      // Group by game ID since we're joining game_data (a game can have multiple data entries)
      sql += ` GROUP BY g.id`;

      // Apply sorting
      const sortColumn = this.getSortColumn(query.sortBy);
      sql += ` ORDER BY ${sortColumn} ${query.sortOrder.toUpperCase()}`;

      // Apply pagination
      sql += ` LIMIT ? OFFSET ?`;
      params.push(query.limit, offset);

      const games = DatabaseService.all(sql, params) as Game[];

      return {
        data: games,
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit)
      };
    } catch (error) {
      logger.error('Error searching games:', error);
      throw error;
    }
  }

  async getGameById(id: string): Promise<Game | null> {
    try {
      const sql = `
        SELECT
          g.id, g.parentGameId, g.title, g.alternateTitles, g.series,
          g.developer, g.publisher, g.platformName, g.platformsStr, g.platformId,
          g.playMode, g.status, g.broken, g.extreme, g.notes, g.tagsStr,
          g.source, g.applicationPath, g.launchCommand, g.releaseDate,
          g.version, g.originalDescription, g.language,
          g.library, g.orderTitle, g.dateAdded, g.dateModified,
          g.lastPlayed, g.playtime, g.playCounter, g.archiveState,
          g.logoPath, g.screenshotPath,
          MAX(gd.presentOnDisk) as presentOnDisk
        FROM game g
        LEFT JOIN game_data gd ON gd.gameId = g.id
        WHERE g.id = ?
        GROUP BY g.id
      `;

      const game = DatabaseService.get(sql, [id]) as Game | null;
      return game;
    } catch (error) {
      logger.error('Error getting game by ID:', error);
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
        ORDER BY presentOnDisk DESC, id DESC
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
        ORDER BY presentOnDisk DESC, id DESC
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
          g.orderTitle, g.logoPath, g.screenshotPath
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
        limit
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
          g.tagsStr, g.orderTitle, g.logoPath, g.screenshotPath
        FROM game g
        WHERE (g.broken = 0 OR g.broken IS NULL)
      `;

      const params: any[] = [];

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
      developer: 'g.developer'
    };
    return columnMap[sortBy] || 'g.orderTitle';
  }
}
