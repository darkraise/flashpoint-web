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
    isFeatureEnabled: (featureName: string) => {
      return isAdmin || ((features as Record<string, unknown>)[featureName] ?? true) !== false;
    },
    isAdmin,
    isLoading,
    features,
  };
}
