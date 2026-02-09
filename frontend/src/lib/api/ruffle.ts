import { apiClient } from './client';

export const ruffleApi = {
  getVersion: async (): Promise<{ currentVersion: string | null; isInstalled: boolean }> => {
    const { data } = await apiClient.get('/ruffle/version');
    return data;
  },

  checkUpdate: async (): Promise<{
    currentVersion: string | null;
    latestVersion: string;
    updateAvailable: boolean;
    changelog?: string;
    publishedAt?: string;
  }> => {
    const { data } = await apiClient.get('/ruffle/check-update');
    return data;
  },

  update: async (): Promise<{
    success: boolean;
    version: string;
    message: string;
  }> => {
    const { data } = await apiClient.post('/ruffle/update');
    return data;
  },
};
