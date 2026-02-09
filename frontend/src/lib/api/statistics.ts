import { apiClient } from './client';

export interface Statistics {
  totalGames: number;
  totalAnimations: number;
  totalPlatforms: number;
  webPlayableGames: number;
  totalPlaylists: number;
  totalTags: number;
}

export const statisticsApi = {
  getStatistics: async (): Promise<Statistics> => {
    const { data } = await apiClient.get<Statistics>('/statistics');
    return data;
  },
};
