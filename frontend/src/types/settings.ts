import { AuthSettings } from './auth';

export interface AppSettings {
  siteName: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  defaultTheme?: string;
  defaultPrimaryColor?: string;
  homeRecentHours?: number;
}

export interface FeatureSettings {
  enableDownloads: boolean;
  enablePlayTracking: boolean;
  enablePlaylists: boolean;
  enableFavorites: boolean;
  enableSearch: boolean;
  enableStatistics: boolean;
}

export interface GameSettings {
  defaultScaleMode: 'exactfit' | 'noborder' | 'showall' | 'noscale';
  enableFlashPlayer: boolean;
  enableHTML5Player: boolean;
}

export interface MetadataSettings {
  enableExtendedMetadata: boolean;
  cacheImages: boolean;
  imageCacheExpiryDays: number;
}

export interface StorageSettings {
  maxStorageGB: number;
  autoCleanup: boolean;
  cleanupThresholdGB: number;
}

export interface RateLimitSettings {
  enableRateLimiting: boolean;
  requestsPerMinute: number;
  burstLimit: number;
}

export interface SystemSettings {
  app: AppSettings;
  auth: AuthSettings;
  features: FeatureSettings;
  game: GameSettings;
  metadata: MetadataSettings;
  storage: StorageSettings;
  rateLimit: RateLimitSettings;
}

export interface Domain {
  id: number;
  hostname: string;
  isDefault: boolean;
  createdAt: string;
}

export interface PublicSettings {
  app: Pick<AppSettings, 'siteName' | 'maintenanceMode' | 'maintenanceMessage' | 'homeRecentHours'>;
  auth: Pick<AuthSettings, 'guestAccessEnabled' | 'userRegistrationEnabled'>;
  features?: Partial<FeatureSettings>;
  metadata?: { flashpointEdition?: string; flashpointVersion?: string };
  domains?: { defaultDomain?: string | null };
}

export type SettingsCategory = keyof SystemSettings;

export type SettingValue = string | number | boolean | Record<string, unknown> | unknown[];
