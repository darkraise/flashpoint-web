import { apiClient } from './client';

/**
 * Ruffle Management API
 *
 * Manages Ruffle Flash emulator updates and versions
 */
export const ruffleApi = {
  /**
   * Get current Ruffle version
   */
  getVersion: async (): Promise<{ currentVersion: string | null; isInstalled: boolean }> => {
    const { data } = await apiClient.get('/ruffle/version');
    return data;
  },

  /**
   * Check for Ruffle updates
   */
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

  /**
   * Update Ruffle to latest version
   */
  update: async (): Promise<{
    success: boolean;
    version: string;
    message: string;
  }> => {
    const { data } = await apiClient.post('/ruffle/update');
    return data;
  },
};
