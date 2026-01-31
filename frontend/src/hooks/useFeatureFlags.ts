import { usePublicSettings } from './usePublicSettings';
import { useAuthStore } from '@/store/auth';

/**
 * Hook to check if features are enabled
 *
 * **Admin Bypass:** Admins (users with 'settings.update' permission) have access
 * to all features regardless of feature flags. This allows admins to manage and
 * monitor the system even when features are disabled for normal users.
 *
 * @returns Object with feature flag states and helper function
 */
export function useFeatureFlags() {
  const { data: publicSettings, isLoading } = usePublicSettings();
  const { user } = useAuthStore();

  const features = publicSettings?.features || {};

  // Check if user is admin (has settings.update permission)
  const isAdmin = user?.permissions?.includes('settings.update') ?? false;

  return {
    // Individual feature flags (admins bypass all restrictions)
    enablePlaylists: isAdmin || (features.enablePlaylists ?? true),
    enableFavorites: isAdmin || (features.enableFavorites ?? true),
    enableStatistics: isAdmin || (features.enableStatistics ?? true),

    // Helper function to check any feature (admins bypass all restrictions)
    isFeatureEnabled: (featureName: string) => {
      return isAdmin || ((features as Record<string, unknown>)[featureName] ?? true) !== false;
    },

    // Check if user is admin
    isAdmin,

    // Loading state
    isLoading,

    // Raw features object
    features,
  };
}
