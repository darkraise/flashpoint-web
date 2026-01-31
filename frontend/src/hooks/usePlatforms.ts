import { useQuery } from '@tanstack/react-query';
import { platformsApi } from '@/lib/api';

export function usePlatforms() {
  return useQuery({
    queryKey: ['platforms'],
    queryFn: () => platformsApi.getAll(),
    staleTime: 1000 * 60 * 30, // 30 minutes - platforms don't change often
  });
}
