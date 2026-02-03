import { useQuery } from '@tanstack/react-query';
import { statisticsApi } from '@/lib/api';

export interface Statistics {
  totalGames: number;
  totalAnimations: number;
  totalPlatforms: number;
  webPlayableGames: number;
  totalPlaylists: number;
  totalTags: number;
}

export function useStatistics() {
  return useQuery({
    queryKey: ['statistics'],
    queryFn: statisticsApi.getStatistics,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 1,
  });
}
