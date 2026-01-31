import { useCallback, useState } from 'react';
import { useSharedAccessStore } from '@/store/sharedAccess';
import { sharedPlaylistsApi } from '@/lib/api/sharedPlaylists';

interface UseSharedAccessTokenResult {
  /** Whether a valid shared access token exists */
  hasValidToken: boolean;
  /** Generate a new shared access token */
  generateToken: (shareToken: string) => Promise<void>;
  /** Clear the current token */
  clearToken: () => void;
  /** The current share token (if any) */
  currentShareToken: string | null;
  /** Whether token generation is in progress */
  isGenerating: boolean;
  /** Error from token generation */
  error: Error | null;
}

export function useSharedAccessToken(): UseSharedAccessTokenResult {
  const {
    shareToken: currentShareToken,
    isValid,
    setToken,
    clearToken
  } = useSharedAccessStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generateToken = useCallback(async (shareToken: string) => {
    // Don't regenerate if we already have a valid token for this shareToken
    if (isValid() && currentShareToken === shareToken) {
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await sharedPlaylistsApi.generateAccessToken(shareToken);
      setToken(
        response.accessToken,
        shareToken,
        response.playlistId,
        response.expiresIn
      );
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to generate access token'));
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [currentShareToken, isValid, setToken]);

  return {
    hasValidToken: isValid(),
    generateToken,
    clearToken,
    currentShareToken,
    isGenerating,
    error
  };
}
