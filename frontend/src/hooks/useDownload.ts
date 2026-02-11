import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';
import { gamesApi } from '@/lib/api';

export interface DownloadProgress {
  percent: number;
  status: 'waiting' | 'downloading' | 'validating' | 'importing' | 'complete' | 'error';
  details: string;
  error?: string;
}

export function useDownload(gameId: string) {
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startDownload = useCallback(
    async (gameDataId?: number) => {
      try {
        setIsDownloading(true);
        setProgress({
          percent: 0,
          status: 'waiting',
          details: 'Starting download...',
        });

        const result = await gamesApi.downloadGame(gameId, gameDataId);

        // Raw fetch() — axios doesn't support SSE/ReadableStream.
        // Auth via HTTP-only cookies (credentials: 'include').
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        const response = await fetch(`/api/games/${gameId}/download/progress`, {
          credentials: 'include',
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error('Failed to connect to download progress stream');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const processStream = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6)) as DownloadProgress;
                    setProgress(data);
                    if (data.status === 'complete' || data.status === 'error') {
                      reader.cancel();
                      setIsDownloading(false);
                      return;
                    }
                  } catch (parseError) {
                    logger.error('Error parsing SSE data:', parseError);
                  }
                }
              }
            }
          } catch (error) {
            if ((error as Error).name !== 'AbortError') {
              logger.error('SSE stream error:', error);
              setProgress({
                percent: 0,
                status: 'error',
                details: 'Connection to server lost',
                error: 'Connection error',
              });
            }
            setIsDownloading(false);
          }
        };

        // Fire-and-forget: updates state as SSE events arrive
        processStream().catch((err) => {
          logger.error('Unhandled stream error:', err);
          setIsDownloading(false);
        });

        return result;
      } catch (error) {
        setIsDownloading(false);
        setProgress({
          percent: 0,
          status: 'error',
          details: 'Failed to start download',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
      }
    },
    [gameId]
  );

  const cancelDownload = useCallback(async () => {
    try {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      await gamesApi.cancelDownload(gameId);

      setIsDownloading(false);
      setProgress({
        percent: 0,
        status: 'error',
        details: 'Download cancelled',
        error: 'Cancelled by user',
      });
    } catch (error) {
      logger.error('Error cancelling download:', error);
      throw error;
    }
  }, [gameId]);

  const resetProgress = useCallback(() => {
    setProgress(null);
    setIsDownloading(false);
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    progress,
    isDownloading,
    startDownload,
    cancelDownload,
    resetProgress,
  };
}
