import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { sharedPlaylistsApi } from '@/lib/api/sharedPlaylists';

interface SharedPlaylistAccessResult {
  hasAccess: boolean;
  shareToken: string | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Reads shareToken from URL query params, validates against backend,
 * and returns whether the game is accessible via the shared playlist.
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
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });

  return {
    hasAccess: isValid === true,
    shareToken,
    isLoading: !!shareToken && !!gameId && isLoading,
    error: error as Error | null,
  };
}

/** Maps regular game routes to shared layout routes when shareToken is present. */
export function buildSharedGameUrl(basePath: string, shareToken: string | null): string {
  if (!shareToken) return basePath;

  if (basePath.match(/^\/games\/[^/]+\/play$/)) {
    return (
      basePath.replace('/play', '/play-shared') + `?shareToken=${encodeURIComponent(shareToken)}`
    );
  }

  if (basePath.match(/^\/games\/[^/]+$/)) {
    return basePath + `/shared?shareToken=${encodeURIComponent(shareToken)}`;
  }

  const url = new URL(basePath, window.location.origin);
  url.searchParams.set('shareToken', shareToken);
  return url.pathname + url.search;
}
