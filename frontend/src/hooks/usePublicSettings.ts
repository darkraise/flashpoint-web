import { useQuery } from '@tanstack/react-query';
import { logger } from '@/lib/logger';
import { systemSettingsApi } from '@/lib/api';

/**
 * Hook to fetch public system settings (app name, features, etc.)
 *
 * These settings change rarely (only when admin updates them), so we use
 * aggressive caching to prevent duplicate API calls:
 * - Multiple components use this hook (App, Header, Sidebar, ProtectedRoute, etc.)
 * - React.StrictMode in dev can cause double-mounting
 * - Settings are prefetched in main.tsx before app renders
 * - We want ONE request per page session, not per component mount
 *
 * To refresh: User can reload the page, or admin can programmatically
 * invalidate the query after updating settings.
 */
export function usePublicSettings() {
  const query = useQuery({
    queryKey: ['system-settings', 'public'],
    queryFn: async () => {
      logger.debug('[usePublicSettings] queryFn called - fetching from API');
      const result = await systemSettingsApi.getPublic();
      logger.debug('[usePublicSettings] Fetch complete:', result);
      return result;
    },
    staleTime: Infinity, // Data never goes stale (only refetch manually)
    gcTime: Infinity, // Keep in cache forever during session
    refetchOnMount: false, // Don't refetch when component mounts
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    refetchOnReconnect: false, // Don't refetch on network reconnect
    retry: false, // Don't retry if already cached
  });

  return query;
}
