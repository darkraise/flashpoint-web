import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { sharedPlaylistsApi } from '@/lib/api/sharedPlaylists';

interface SharedPlaylistAccessResult {
  /** Whether access is granted via shared playlist */
  hasAccess: boolean;
  /** The share token from URL (if present) */
  shareToken: string | null;
  /** Whether the validation is still loading */
  isLoading: boolean;
  /** Any error during validation */
  error: Error | null;
}

/**
 * Hook to check if a game is accessible via shared playlist token
 *
 * Reads shareToken from URL query params and validates against backend.
 * Returns hasAccess: true if the game is part of the shared playlist.
 *
 * Usage:
 * ```tsx
 * const { hasAccess, shareToken, isLoading } = useSharedPlaylistAccess(gameId);
 *
 * if (isLoading) return <Loading />;
 * if (!isAuthenticated && !hasAccess) return <Navigate to="/login" />;
 * ```
 */
export function useSharedPlaylistAccess(gameId: string | null): SharedPlaylistAccessResult {
  const [searchParams] = useSearchParams();
  const shareToken = searchParams.get('shareToken');

  const {
    data: isValid,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['sharedPlaylistAccess', shareToken, gameId],
    queryFn: async () => {
      if (!shareToken || !gameId) return false;
      return sharedPlaylistsApi.validateGameAccess(shareToken, gameId);
    },
    enabled: !!shareToken && !!gameId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: false, // Don't retry on failure
  });

  return {
    hasAccess: isValid === true,
    shareToken,
    isLoading: !!shareToken && !!gameId && isLoading,
    error: error as Error | null,
  };
}

/**
 * Helper to build URL with shareToken preserved
 * Maps regular game routes to shared layout routes when shareToken is present
 */
export function buildSharedGameUrl(basePath: string, shareToken: string | null): string {
  if (!shareToken) return basePath;

  // Map regular routes to shared layout routes when shareToken is present
  // Game play route: /games/:id/play → /games/:id/play-shared?shareToken=...
  if (basePath.match(/^\/games\/[^/]+\/play$/)) {
    return (
      basePath.replace('/play', '/play-shared') + `?shareToken=${encodeURIComponent(shareToken)}`
    );
  }

  // Game detail route: /games/:id → /games/:id/shared?shareToken=...
  if (basePath.match(/^\/games\/[^/]+$/)) {
    return basePath + `/shared?shareToken=${encodeURIComponent(shareToken)}`;
  }

  // Fallback: add query param for other routes
  const url = new URL(basePath, window.location.origin);
  url.searchParams.set('shareToken', shareToken);
  return url.pathname + url.search;
}
