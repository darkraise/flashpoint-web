import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3100';

export interface Statistics {
  totalGames: number;
  totalAnimations: number;
  totalPlatforms: number;
  webPlayableGames: number;
  totalPlaylists: number;
  totalTags: number;
}

const statisticsApi = {
  getStatistics: async (): Promise<Statistics> => {
    const response = await axios.get(`${API_BASE_URL}/api/statistics`);
    return response.data;
  }
};

export function useStatistics() {
  return useQuery({
    queryKey: ['statistics'],
    queryFn: statisticsApi.getStatistics,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1
  });
}
