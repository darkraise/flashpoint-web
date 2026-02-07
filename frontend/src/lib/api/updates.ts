import { apiClient } from './client';

/**
 * Metadata sync status returned during sync operations
 */
export interface MetadataSyncStatus {
  isRunning: boolean;
  stage: string;
  progress: number;
  message: string;
  error?: string;
  result?: {
    gamesUpdated: number;
    gamesDeleted: number;
    tagsUpdated: number;
    platformsUpdated: number;
  };
}

/**
 * Metadata update information
 */
export interface MetadataUpdateInfo {
  hasUpdates: boolean;
  gamesUpdateAvailable: boolean;
  tagsUpdateAvailable: boolean;
  gamesUpdateCount?: number;
  tagsUpdateCount?: number;
  lastCheckedTime?: string;
  lastUpdateTime?: string;
  edition?: string;
}

/**
 * Updates/Metadata API
 *
 * Manages Flashpoint metadata updates and synchronization
 */
export const updatesApi = {
  /**
   * Get metadata update info
   * Returns info about available updates for games and tags
   */
  getMetadataInfo: async (): Promise<MetadataUpdateInfo> => {
    const { data } = await apiClient.get<MetadataUpdateInfo>('/updates/metadata');
    return data;
  },

  /**
   * Start metadata sync in background
   * Returns immediately with sync started status
   */
  startMetadataSync: async (): Promise<{
    success: boolean;
    message: string;
    status: MetadataSyncStatus;
  }> => {
    const { data } = await apiClient.post('/updates/metadata/sync');
    return data;
  },

  /**
   * Get current metadata sync status
   * Used for polling during sync process
   */
  getMetadataSyncStatus: async (): Promise<MetadataSyncStatus> => {
    const { data } = await apiClient.get<MetadataSyncStatus>('/updates/metadata/sync/status');
    return data;
  },
};
