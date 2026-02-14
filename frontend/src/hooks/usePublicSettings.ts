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
    // Data rarely changes, so we use aggressive caching:
    // - staleTime: Infinity means data is never considered stale automatically
    // - But when other code calls invalidateQueries (e.g., after domain changes),
    //   data is marked stale and will refetch on next mount
    // - refetchOnMount defaults to true, so invalidated data WILL refetch
    staleTime: Infinity,
    gcTime: Infinity,
    // Keep these disabled to prevent unnecessary refetches on tab focus/reconnect
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  return query;
}
