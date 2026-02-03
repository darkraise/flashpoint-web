/**
 * System Settings Types
 *
 * Type definitions for all system settings categories.
 * These types match the backend settings structure.
 */

import { AuthSettings } from './auth';

/**
 * Application settings (general app configuration)
 */
export interface AppSettings {
  siteName: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  defaultTheme?: string;
  defaultPrimaryColor?: string;
  homeRecentHours?: number;
}

/**
 * Feature flags/toggles
 */
export interface FeatureSettings {
  enableDownloads: boolean;
  enablePlayTracking: boolean;
  enablePlaylists: boolean;
  enableFavorites: boolean;
  enableSearch: boolean;
  enableStatistics: boolean;
}

/**
 * Game-related settings
 */
export interface GameSettings {
  defaultScaleMode: 'exactfit' | 'noborder' | 'showall' | 'noscale';
  enableFlashPlayer: boolean;
  enableHTML5Player: boolean;
}

/**
 * Metadata and content sync settings
 */
export interface MetadataSettings {
  enableExtendedMetadata: boolean;
  cacheImages: boolean;
  imageCacheExpiryDays: number;
}

/**
 * Storage and cleanup settings
 */
export interface StorageSettings {
  maxStorageGB: number;
  autoCleanup: boolean;
  cleanupThresholdGB: number;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitSettings {
  enableRateLimiting: boolean;
  requestsPerMinute: number;
  burstLimit: number;
}

/**
 * Complete system settings (all categories)
 */
export interface SystemSettings {
  app: AppSettings;
  auth: AuthSettings;
  features: FeatureSettings;
  game: GameSettings;
  metadata: MetadataSettings;
  storage: StorageSettings;
  rateLimit: RateLimitSettings;
}

/**
 * Public settings available without authentication
 */
export interface PublicSettings {
  app: Pick<AppSettings, 'siteName' | 'maintenanceMode' | 'maintenanceMessage' | 'homeRecentHours'>;
  auth: Pick<AuthSettings, 'guestAccessEnabled' | 'userRegistrationEnabled'>;
  features?: Partial<FeatureSettings>;
  metadata?: { flashpointEdition?: string; flashpointVersion?: string };
}

/**
 * Settings category names
 */
export type SettingsCategory = keyof SystemSettings;

/**
 * Generic setting value type
 */
export type SettingValue = string | number | boolean | Record<string, unknown> | unknown[];
