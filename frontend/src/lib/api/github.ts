import { apiClient } from './client';

export const githubApi = {
  getStarCount: async (): Promise<{ stars: number }> => {
    const { data } = await apiClient.get<{ success: boolean; data: { stars: number } }>(
      '/github/stars'
    );
    return data.data;
  },
};
