import { apiClient } from './client';

/**
 * Platforms API
 *
 * Retrieves gaming platform information and statistics
 */
export const platformsApi = {
  /**
   * Get all platforms with game counts
   */
  getAll: async (): Promise<Array<{ platform: string; count: number }>> => {
    const { data } = await apiClient.get('/platforms');
    return data;
  },
};
