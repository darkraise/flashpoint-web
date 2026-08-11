import { usePublicSettings } from './usePublicSettings';
import { useAuthStore } from '@/store/auth';

/**
 * Admins (users with 'settings.update' permission) bypass all feature flags
 * so they can manage the system even when features are disabled for normal users.
 */
export function useFeatureFlags() {
  const { data: publicSettings, isLoading } = usePublicSettings();
  const { user } = useAuthStore();

  const features = publicSettings?.features ?? {};

  const isAdmin = user?.permissions?.includes('settings.update') ?? false;

  return {
    enablePlaylists: isAdmin || (features.enablePlaylists ?? true),
    enableFavorites: isAdmin || (features.enableFavorites ?? true),
    enableStatistics: isAdmin || (features.enableStatistics ?? true),
    enableRatings: isAdmin || (features.enableRatings ?? true),
    // Cosmetic chrome rather than a capability: no admin bypass, otherwise an
    // admin could never hide the button in their own session.
    enableLuckyButton: (features.enableLuckyButton ?? true) !== false,
    enableDownloadedPage: isAdmin || (features.enableDownloadedPage ?? true),
    // Default-off flags are read strictly: the `?? true` fallback used above would
    // invert them while public settings are still loading or if the key is missing.
    enableDownloadedPageForGuests: features.enableDownloadedPageForGuests === true,
    enableDownloadedFilterDefault: features.enableDownloadedFilterDefault === true,
    isFeatureEnabled: (featureName: string) => {
      return isAdmin || ((features as Record<string, unknown>)[featureName] ?? true) !== false;
    },
    isAdmin,
    isLoading,
    features,
  };
}
