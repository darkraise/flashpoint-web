import { useQuery } from '@tanstack/react-query';
import { statisticsApi, type Statistics } from '@/lib/api';

export type { Statistics };

export function useStatistics() {
  return useQuery({
    queryKey: ['statistics'],
    queryFn: statisticsApi.getStatistics,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
