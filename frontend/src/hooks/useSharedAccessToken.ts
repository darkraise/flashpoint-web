import { useCallback, useState } from 'react';
import { useSharedAccessStore } from '@/store/sharedAccess';
import { sharedPlaylistsApi } from '@/lib/api/sharedPlaylists';

interface UseSharedAccessTokenResult {
  hasValidToken: boolean;
  generateToken: (shareToken: string) => Promise<void>;
  clearToken: () => void;
  currentShareToken: string | null;
  isGenerating: boolean;
  error: Error | null;
}

export function useSharedAccessToken(): UseSharedAccessTokenResult {
  const { shareToken: currentShareToken, isValid, setToken, clearToken } = useSharedAccessStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generateToken = useCallback(
    async (shareToken: string) => {
      if (isValid() && currentShareToken === shareToken) {
        return;
      }

      setIsGenerating(true);
      setError(null);

      try {
        const response = await sharedPlaylistsApi.generateAccessToken(shareToken);
        setToken(response.accessToken, shareToken, response.playlistId, response.expiresIn);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to generate access token'));
        throw err;
      } finally {
        setIsGenerating(false);
      }
    },
    [currentShareToken, isValid, setToken]
  );

  return {
    hasValidToken: isValid(),
    generateToken,
    clearToken,
    currentShareToken,
    isGenerating,
    error,
  };
}
