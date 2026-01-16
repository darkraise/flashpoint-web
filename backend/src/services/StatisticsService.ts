import { DatabaseService } from './DatabaseService';
import { logger } from '../utils/logger';
import { PlaylistService } from './PlaylistService';

export interface Statistics {
  totalGames: number;
  totalAnimations: number;
  totalPlatforms: number;
  webPlayableGames: number;
  totalPlaylists: number;
  favoritesCount: number;
}

export class StatisticsService {
  private playlistService = new PlaylistService();

  async getStatistics(): Promise<Statistics> {
    try {
      // Get total games count
      const totalGamesResult = DatabaseService.get(
        'SELECT COUNT(*) as count FROM game WHERE library = ?',
        ['arcade']
      );
      const totalGames = totalGamesResult?.count || 0;

      // Get total animations count
      const totalAnimationsResult = DatabaseService.get(
        'SELECT COUNT(*) as count FROM game WHERE library = ?',
        ['theatre']
      );
      const totalAnimations = totalAnimationsResult?.count || 0;

      // Get total platforms count
      const totalPlatformsResult = DatabaseService.get(
        'SELECT COUNT(DISTINCT platformName) as count FROM game'
      );
      const totalPlatforms = totalPlatformsResult?.count || 0;

      // Get web playable games count (Flash and HTML5 games only, excluding animations)
      const webPlatforms = ['Flash', 'HTML5'];
      const placeholders = webPlatforms.map(() => '?').join(',');
      const webPlayableResult = DatabaseService.get(
        `SELECT COUNT(*) as count FROM game WHERE platformName IN (${placeholders}) AND library = ?`,
        [...webPlatforms, 'arcade']
      );
      const webPlayableGames = webPlayableResult?.count || 0;

      // Get playlists count from filesystem
      let totalPlaylists = 0;
      let favoritesCount = 0;

      try {
        const playlists = await this.playlistService.getAllPlaylists();
        totalPlaylists = playlists.length;

        // Get favorites count (special playlist ID)
        const FAVORITES_PLAYLIST_ID = 'c8f81d60-b134-4309-8985-fd184ec96dfe';
        const favoritesPlaylist = await this.playlistService.getPlaylistById(FAVORITES_PLAYLIST_ID);
        favoritesCount = favoritesPlaylist?.games?.length || 0;
      } catch (error) {
        logger.warn('Failed to get playlist statistics:', error);
        // Continue with 0 counts
      }

      // Statistics will be returned
      const statistics: Statistics = {
        totalGames,
        totalAnimations,
        totalPlatforms,
        webPlayableGames,
        totalPlaylists,
        favoritesCount
      };

      logger.debug('Statistics calculated:', statistics);

      return statistics;
    } catch (error) {
      logger.error('Error calculating statistics:', error);
      throw error;
    }
  }
}
