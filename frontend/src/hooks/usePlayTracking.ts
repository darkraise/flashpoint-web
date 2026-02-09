import { useQuery, useMutation } from '@tanstack/react-query';
import { playTrackingApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useFeatureFlags } from './useFeatureFlags';
import { useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';

export function usePlaySession(gameId: string | null, gameTitle: string | null) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const previousGameIdRef = useRef<string | null>(null);
  const hasStartedSessionRef = useRef(false);
  const isMountedRef = useRef(false);
  const { isAuthenticated, isGuest } = useAuthStore();
  const { enableStatistics } = useFeatureFlags();

  const startMutation = useMutation({
    mutationFn: ({ gameId, gameTitle }: { gameId: string; gameTitle: string }) =>
      playTrackingApi.startSession(gameId, gameTitle),
    onSuccess: (data) => {
      sessionIdRef.current = data.sessionId;
      setSessionId(data.sessionId);
      logger.debug('[PlaySession] Started session:', data.sessionId, 'for game:', gameId);
    },
    onError: (error) => {
      logger.error('[PlaySession] Failed to start play session:', error);
      hasStartedSessionRef.current = false;
    },
  });

  const startMutationRef = useRef(startMutation.mutate);
  useEffect(() => {
    startMutationRef.current = startMutation.mutate;
  }, [startMutation.mutate]);

  const endMutation = useMutation({
    mutationFn: (sessionId: string) => playTrackingApi.endSession(sessionId),
    onSuccess: () => {
      logger.debug('[PlaySession] Ended session:', sessionIdRef.current);
      sessionIdRef.current = null;
      setSessionId(null);
    },
    onError: (error) => {
      logger.error('[PlaySession] Failed to end play session:', error);
    },
  });

  useEffect(() => {
    logger.debug('[PlaySession] Effect triggered', {
      isAuthenticated,
      isGuest,
      enableStatistics,
      gameId,
      gameTitle,
      hasStartedSession: hasStartedSessionRef.current,
      previousGameId: previousGameIdRef.current,
      isPending: startMutation.isPending,
    });

    if (!enableStatistics || !isAuthenticated || isGuest || !gameId || !gameTitle) {
      return;
    }

    // Skip if we're already starting a session (prevents duplicate calls in React StrictMode)
    if (startMutation.isPending) {
      logger.debug('[PlaySession] Mutation already pending, skipping');
      return;
    }

    if (!hasStartedSessionRef.current || previousGameIdRef.current !== gameId) {
      const previousSessionId = sessionIdRef.current;

      if (previousSessionId && previousGameIdRef.current !== gameId) {
        logger.debug('[PlaySession] Ending previous session before starting new one');
        sessionIdRef.current = null;

        playTrackingApi
          .endSession(previousSessionId)
          .then(() => {
            previousGameIdRef.current = gameId;
            hasStartedSessionRef.current = true;
            startMutationRef.current({ gameId, gameTitle });
          })
          .catch((error) => {
            logger.error('[PlaySession] Failed to end previous session:', error);
            // Start new session anyway
            previousGameIdRef.current = gameId;
            hasStartedSessionRef.current = true;
            startMutationRef.current({ gameId, gameTitle });
          });
      } else {
        logger.debug('[PlaySession] Starting new session');
        previousGameIdRef.current = gameId;
        hasStartedSessionRef.current = true;
        startMutationRef.current({ gameId, gameTitle });
      }
    }
  }, [enableStatistics, isAuthenticated, isGuest, gameId, gameTitle, startMutation.isPending]);

  // End session on unmount - with StrictMode guard
  useEffect(() => {
    isMountedRef.current = true;
    let cleanupTimeoutId: ReturnType<typeof setTimeout> | null = null;

    return () => {
      isMountedRef.current = false;
      const currentSessionId = sessionIdRef.current;
      if (!currentSessionId) return;

      // Use a small timeout to allow StrictMode remount to cancel the cleanup
      cleanupTimeoutId = setTimeout(() => {
        if (!isMountedRef.current) {
          logger.debug('[PlaySession] Component unmounting, ending session:', currentSessionId);
          playTrackingApi.endSession(currentSessionId).catch((error) => {
            logger.error('[PlaySession] Failed to end play session on cleanup:', error);
          });
          hasStartedSessionRef.current = false;
          previousGameIdRef.current = null;
        }
      }, 100);

      // Ensure timeout is cleared if component remounts quickly (StrictMode)
      if (cleanupTimeoutId) {
        const timeoutToCleanup = cleanupTimeoutId;
        queueMicrotask(() => {
          if (isMountedRef.current) {
            clearTimeout(timeoutToCleanup);
          }
        });
      }
    };
  }, []);

  return {
    sessionId,
    isTracking: !!sessionId,
    endSession: () => {
      if (sessionIdRef.current) {
        endMutation.mutate(sessionIdRef.current);
      }
    },
  };
}

export function useUserStats() {
  const { isAuthenticated, isGuest } = useAuthStore();
  const { enableStatistics } = useFeatureFlags();

  return useQuery({
    queryKey: ['playStats'],
    queryFn: () => playTrackingApi.getStats(),
    enabled: enableStatistics && isAuthenticated && !isGuest,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGameStats(limit = 50, offset = 0) {
  const { isAuthenticated, isGuest } = useAuthStore();
  const { enableStatistics } = useFeatureFlags();

  return useQuery({
    queryKey: ['gameStats', limit, offset],
    queryFn: () => playTrackingApi.getGameStats(limit, offset),
    enabled: enableStatistics && isAuthenticated && !isGuest,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePlayHistory(limit = 50, offset = 0) {
  const { isAuthenticated, isGuest } = useAuthStore();
  const { enableStatistics } = useFeatureFlags();

  return useQuery({
    queryKey: ['playHistory', limit, offset],
    queryFn: () => playTrackingApi.getHistory(limit, offset),
    enabled: enableStatistics && isAuthenticated && !isGuest,
    staleTime: 2 * 60 * 1000,
  });
}

export function useTopGames(limit = 10) {
  const { isAuthenticated, isGuest } = useAuthStore();
  const { enableStatistics } = useFeatureFlags();

  return useQuery({
    queryKey: ['topGames', limit],
    queryFn: () => playTrackingApi.getTopGames(limit),
    enabled: enableStatistics && isAuthenticated && !isGuest,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlayActivityOverTime(days = 30) {
  const { isAuthenticated, isGuest } = useAuthStore();
  const { enableStatistics } = useFeatureFlags();

  return useQuery({
    queryKey: ['playActivity', days],
    queryFn: () => playTrackingApi.getActivityOverTime(days),
    enabled: enableStatistics && isAuthenticated && !isGuest,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGamesDistribution(limit = 10) {
  const { isAuthenticated, isGuest } = useAuthStore();
  const { enableStatistics } = useFeatureFlags();

  return useQuery({
    queryKey: ['gamesDistribution', limit],
    queryFn: () => playTrackingApi.getGamesDistribution(limit),
    enabled: enableStatistics && isAuthenticated && !isGuest,
    staleTime: 5 * 60 * 1000,
  });
}
