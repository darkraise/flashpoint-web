import { CachedSystemSettingsService } from './CachedSystemSettingsService';
import { PreferencesService, GameMetadataSource } from './PreferencesService';
import { isAllowedMetadataSourceUrl } from '../utils/metadataSources';
import { logger } from '../utils/logger';

const EPOCH = '1970-01-01';

export interface MetadataSourceOverride {
  enabled: boolean;
  url: string;
}

/**
 * Resolves which metadata source to use.
 *
 * The Flashpoint Ultimate build ships preferences.json without
 * `gameMetadataSources`, so reading preferences alone leaves that edition with no
 * way to update metadata. An admin can opt in to a source explicitly; when they
 * have not, preferences remain the only source and the feature stays unavailable.
 */
export class MetadataSourceService {
  static getOverride(): MetadataSourceOverride {
    try {
      const settings = CachedSystemSettingsService.getInstance().getCategory('metadata');
      const url = typeof settings.customSourceUrl === 'string' ? settings.customSourceUrl : '';
      return { enabled: settings.customSourceEnabled === true, url };
    } catch (error: unknown) {
      logger.warn('[MetadataSource] Could not read override settings:', error);
      return { enabled: false, url: '' };
    }
  }

  /**
   * Sources to use, override first. An override with an untrusted or malformed
   * URL is ignored rather than trusted, so a bad value cannot redirect a sync.
   */
  static async getEffectiveSources(): Promise<GameMetadataSource[]> {
    const override = this.getOverride();

    if (override.enabled && override.url) {
      if (!isAllowedMetadataSourceUrl(override.url)) {
        logger.warn(`[MetadataSource] Ignoring override with untrusted URL: ${override.url}`);
        return PreferencesService.getGameMetadataSources();
      }

      const timestamps = {
        actualUpdateTime: EPOCH,
        latestDeleteTime: EPOCH,
        latestUpdateTime: EPOCH,
      };

      return [
        {
          name: 'Admin configured',
          baseUrl: override.url,
          games: { ...timestamps },
          tags: { ...timestamps },
        },
      ];
    }

    return PreferencesService.getGameMetadataSources();
  }

  static async hasSource(): Promise<boolean> {
    const sources = await this.getEffectiveSources();
    return sources.length > 0 && !!sources[0]?.baseUrl;
  }

  /** True when the active source came from the admin override, not preferences. */
  static isUsingOverride(): boolean {
    const override = this.getOverride();
    return override.enabled && !!override.url && isAllowedMetadataSourceUrl(override.url);
  }
}
