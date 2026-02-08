import { apiClient } from './client';

/**
 * GitHub API
 *
 * Provides GitHub integration features like star count
 */
export const githubApi = {
  /**
   * Get repository star count from GitHub
   * Uses server-side caching to avoid rate limits
   */
  getStarCount: async (): Promise<{ stars: number }> => {
    const { data } = await apiClient.get<{ success: boolean; data: { stars: number } }>(
      '/github/stars'
    );
    return data.data;
  },
};
