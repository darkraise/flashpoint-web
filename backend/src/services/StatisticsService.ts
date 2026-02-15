import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';
import { PlaylistService } from './PlaylistService';

export interface Statistics {
  totalGames: number;
  totalAnimations: number;
  totalPlatforms: number;
  webPlayableGames: number;
  totalPlaylists: number;
  totalTags: number;
}

export class StatisticsService {
  private playlistService = new PlaylistService();
  private cache: { data: Statistics | null; timestamp: number } = {
    data: null,
    timestamp: 0,
  };
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async getStatistics(): Promise<Statistics> {
    // Check if cache is valid
    const now = Date.now();
    const cacheAge = now - this.cache.timestamp;

    if (this.cache.data && cacheAge < this.CACHE_TTL) {
      logger.debug(`Returning cached statistics (age: ${Math.round(cacheAge / 1000)}s)`);
      return this.cache.data;
    }
    try {
      // Get total games count
      const totalGamesResult = DatabaseService.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM game WHERE library = ?',
        ['arcade']
      );
      const totalGames = totalGamesResult?.count || 0;

      // Get total animations count
      const totalAnimationsResult = DatabaseService.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM game WHERE library = ?',
        ['theatre']
      );
      const totalAnimations = totalAnimationsResult?.count || 0;

      // Get total platforms count
      const totalPlatformsResult = DatabaseService.get<{ count: number }>(
        'SELECT COUNT(DISTINCT platformName) as count FROM game'
      );
      const totalPlatforms = totalPlatformsResult?.count || 0;

      // Get web playable games count (Flash and HTML5 games only, excluding animations)
      const webPlatforms = ['Flash', 'HTML5'];
      const placeholders = webPlatforms.map(() => '?').join(',');
      const webPlayableResult = DatabaseService.get<{ count: number }>(
        `SELECT COUNT(*) as count FROM game WHERE platformName IN (${placeholders}) AND library = ?`,
        [...webPlatforms, 'arcade']
      );
      const webPlayableGames = webPlayableResult?.count || 0;

      // Get active tags count (tags actually used by games)
      let totalTags = 0;
      try {
        const sql = `
          SELECT DISTINCT tagsStr
          FROM game
          WHERE tagsStr IS NOT NULL AND tagsStr != ''
        `;

        const results = DatabaseService.all(sql, []) as Array<{ tagsStr: string }>;

        // Parse semicolon-separated tags and count distinct tags
        const uniqueTags = new Set<string>();

        for (const row of results) {
          const tags = row.tagsStr
            .split(';')
            .map((tag) => tag.trim())
            .filter((tag) => tag);
          for (const tag of tags) {
            uniqueTags.add(tag);
          }
        }

        totalTags = uniqueTags.size;
      } catch (error) {
        logger.warn('Failed to count active tags:', error);
        totalTags = 0;
      }

      // Get playlists count from filesystem
      let totalPlaylists = 0;

      try {
        const playlists = await this.playlistService.getAllPlaylists();
        totalPlaylists = playlists.length;
      } catch (error) {
        logger.warn('Failed to get playlist statistics:', error);
        // Continue with 0 count
      }

      const statistics: Statistics = {
        totalGames,
        totalAnimations,
        totalPlatforms,
        webPlayableGames,
        totalPlaylists,
        totalTags,
      };

      logger.debug('Statistics calculated:', statistics);

      // Update cache
      this.cache = {
        data: statistics,
        timestamp: Date.now(),
      };

      return statistics;
    } catch (error) {
      logger.error('Error calculating statistics:', error);
      throw error;
    }
  }
}
