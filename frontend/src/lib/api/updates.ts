import { apiClient } from './client';

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

export const updatesApi = {
  getMetadataInfo: async (): Promise<MetadataUpdateInfo> => {
    const { data } = await apiClient.get<MetadataUpdateInfo>('/updates/metadata');
    return data;
  },

  startMetadataSync: async (): Promise<{
    success: boolean;
    message: string;
    status: MetadataSyncStatus;
  }> => {
    const { data } = await apiClient.post('/updates/metadata/sync');
    return data;
  },

  getMetadataSyncStatus: async (): Promise<MetadataSyncStatus> => {
    const { data } = await apiClient.get<MetadataSyncStatus>('/updates/metadata/sync/status');
    return data;
  },
};
