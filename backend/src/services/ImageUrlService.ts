import { PreferencesService } from './PreferencesService';
import { logger } from '../utils/logger';

/**
 * Service for constructing image URLs from Flashpoint preferences.
 * Handles external CDN URLs for image fallback when local files are unavailable.
 */
export class ImageUrlService {
  /**
   * Get external image URLs for fallback
   * Priority: Flashpoint preferences > Hardcoded defaults
   */
  static async getExternalImageUrls(): Promise<string[]> {
    // Try to read from Flashpoint preferences
    try {
      const preferences = await PreferencesService.getPreferences();
      if (preferences.onDemandImages && preferences.onDemandBaseUrl) {
        const baseUrl = preferences.onDemandBaseUrl.replace(/\/$/, ''); // Remove trailing slash

        // Construct full image URL from Flashpoint CDN base URL
        const urls = [
          `${baseUrl}/Flashpoint/Data/Images`,
          'https://infinity.unstable.life/Flashpoint/Data/Images', // Secondary fallback
        ];

        logger.debug('Using external image URLs from Flashpoint preferences', {
          baseUrl: preferences.onDemandBaseUrl,
          constructedUrls: urls,
        });

        return urls;
      }
    } catch (error) {
      logger.warn('Failed to read image URLs from Flashpoint preferences, using defaults', {
        error,
      });
    }

    // Fallback to hardcoded defaults
    const defaultUrls = [
      'https://infinity.flashpointarchive.org/Flashpoint/Data/Images',
      'https://infinity.unstable.life/Flashpoint/Data/Images',
    ];

    logger.debug('Using default image URLs', { urls: defaultUrls });
    return defaultUrls;
  }

  /**
   * Get local image folder paths from preferences
   */
  static async getImageFolderPaths(): Promise<{
    images: string;
    logos: string;
    playlists: string;
  }> {
    try {
      const preferences = await PreferencesService.getPreferences();
      return {
        images: preferences.imageFolderPath || 'Data/Images',
        logos: preferences.logoFolderPath || 'Data/Logos',
        playlists: preferences.playlistFolderPath || 'Data/Playlists',
      };
    } catch (error) {
      // Return defaults if preferences unavailable
      logger.warn('Failed to read folder paths from preferences, using defaults', { error });
      return {
        images: 'Data/Images',
        logos: 'Data/Logos',
        playlists: 'Data/Playlists',
      };
    }
  }
}
