import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';
import { gamesApi } from '@/lib/api';

export interface DownloadProgress {
  percent: number;
  status: 'waiting' | 'downloading' | 'validating' | 'importing' | 'complete' | 'error';
  details: string;
  error?: string;
}

/**
 * React hook for managing game downloads.
 * Provides functions to start, cancel downloads and tracks progress via SSE.
 */
export function useDownload(gameId: string) {
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  /**
   * Start downloading a game.
   */
  const startDownload = useCallback(async (gameDataId?: number) => {
    try {
      setIsDownloading(true);
      setProgress({
        percent: 0,
        status: 'waiting',
        details: 'Starting download...'
      });

      // Start download on backend
      const result = await gamesApi.downloadGame(gameId, gameDataId);

      // Connect to SSE endpoint for progress updates
      const eventSource = new EventSource(`/api/games/${gameId}/download/progress`);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as DownloadProgress;
          setProgress(data);

          // If complete or error, close connection
          if (data.status === 'complete' || data.status === 'error') {
            eventSource.close();
            setIsDownloading(false);
          }
        } catch (error) {
          logger.error('Error parsing SSE data:', error);
        }
      };

      eventSource.onerror = (error) => {
        logger.error('SSE connection error:', error);
        setProgress({
          percent: 0,
          status: 'error',
          details: 'Connection to server lost',
          error: 'Connection error'
        });
        eventSource.close();
        setIsDownloading(false);
      };

      return result;
    } catch (error) {
      setIsDownloading(false);
      setProgress({
        percent: 0,
        status: 'error',
        details: 'Failed to start download',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }, [gameId]);

  /**
   * Cancel an active download.
   */
  const cancelDownload = useCallback(async () => {
    try {
      // Close SSE connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // Cancel on backend
      await gamesApi.cancelDownload(gameId);

      setIsDownloading(false);
      setProgress({
        percent: 0,
        status: 'error',
        details: 'Download cancelled',
        error: 'Cancelled by user'
      });
    } catch (error) {
      logger.error('Error cancelling download:', error);
      throw error;
    }
  }, [gameId]);

  /**
   * Reset progress state.
   */
  const resetProgress = useCallback(() => {
    setProgress(null);
    setIsDownloading(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    progress,
    isDownloading,
    startDownload,
    cancelDownload,
    resetProgress
  };
}
