// Re-export PreferencesService from consolidated location
export { PreferencesService } from '../../services/PreferencesService';
export type { GameDataSource, FlashpointPreferences } from '../../services/PreferencesService';

export { GameDataDownloader, gameDataDownloader } from './GameDataDownloader';
export type {
  GameDataDownloadParams,
  DownloadResult,
  DownloadProgressCallback,
} from './GameDataDownloader';
