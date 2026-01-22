import { useQuery, useMutation } from '@tanstack/react-query';
import { playTrackingApi } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { useEffect, useRef } from 'react';

/**
 * Hook for tracking play sessions
 */
export function usePlaySession(gameId: string | null, gameTitle: string | null) {
  const sessionIdRef = useRef<string | null>(null);
  const previousGameIdRef = useRef<string | null>(null);
  const hasStartedSessionRef = useRef(false);
  const { isAuthenticated, isGuest } = useAuthStore();

  const startMutation = useMutation({
    mutationFn: ({ gameId, gameTitle }: { gameId: string; gameTitle: string }) =>
      playTrackingApi.startSession(gameId, gameTitle),
    onSuccess: (data) => {
      sessionIdRef.current = data.sessionId;
      console.log('[PlaySession] Started session:', data.sessionId, 'for game:', gameId);
    },
    onError: (error) => {
      console.error('[PlaySession] Failed to start play session:', error);
      hasStartedSessionRef.current = false;
    }
  });

  const endMutation = useMutation({
    mutationFn: (sessionId: string) => playTrackingApi.endSession(sessionId),
    onSuccess: () => {
      console.log('[PlaySession] Ended session:', sessionIdRef.current);
      sessionIdRef.current = null;
    },
    onError: (error) => {
      console.error('[PlaySession] Failed to end play session:', error);
    }
  });

  // Handle session lifecycle (start on mount, end on game change)
  useEffect(() => {
    console.log('[PlaySession] Effect triggered', {
      isAuthenticated,
      isGuest,
      gameId,
      gameTitle,
      hasStartedSession: hasStartedSessionRef.current,
      previousGameId: previousGameIdRef.current,
      isPending: startMutation.isPending
    });

    // Skip if not authenticated, is guest, or no game data
    if (!isAuthenticated || isGuest || !gameId || !gameTitle) {
      return;
    }

    // Skip if we're already starting a session (prevents duplicate calls in React StrictMode)
    if (startMutation.isPending) {
      console.log('[PlaySession] Mutation already pending, skipping');
      return;
    }

    // If we haven't started a session yet for this game, start one
    if (!hasStartedSessionRef.current || previousGameIdRef.current !== gameId) {
      const previousSessionId = sessionIdRef.current;

      // If there's a previous session for a different game, end it first
      if (previousSessionId && previousGameIdRef.current !== gameId) {
        console.log('[PlaySession] Ending previous session before starting new one');
        sessionIdRef.current = null;

        playTrackingApi.endSession(previousSessionId).then(() => {
          previousGameIdRef.current = gameId;
          hasStartedSessionRef.current = true;
          startMutation.mutate({ gameId, gameTitle });
        }).catch(error => {
          console.error('[PlaySession] Failed to end previous session:', error);
          // Start new session anyway
          previousGameIdRef.current = gameId;
          hasStartedSessionRef.current = true;
          startMutation.mutate({ gameId, gameTitle });
        });
      } else {
        // No previous session or same game, just start
        console.log('[PlaySession] Starting new session');
        previousGameIdRef.current = gameId;
        hasStartedSessionRef.current = true;
        startMutation.mutate({ gameId, gameTitle });
      }
    }
  }, [isAuthenticated, isGuest, gameId, gameTitle, startMutation.isPending]);

  // End session on unmount
  useEffect(() => {
    return () => {
      if (sessionIdRef.current) {
        console.log('[PlaySession] Component unmounting, ending session:', sessionIdRef.current);
        playTrackingApi.endSession(sessionIdRef.current).catch(error => {
          console.error('[PlaySession] Failed to end play session on cleanup:', error);
        });
        // Reset refs on unmount
        hasStartedSessionRef.current = false;
        previousGameIdRef.current = null;
      }
    };
  }, []);

  return {
    sessionId: sessionIdRef.current,
    isTracking: !!sessionIdRef.current,
    endSession: () => {
      if (sessionIdRef.current) {
        endMutation.mutate(sessionIdRef.current);
      }
    }
  };
}

/**
 * Hook to get user stats
 */
export function useUserStats() {
  const { isAuthenticated, isGuest } = useAuthStore();

  return useQuery({
    queryKey: ['playStats'],
    queryFn: () => playTrackingApi.getStats(),
    enabled: isAuthenticated && !isGuest,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get user's game stats
 */
export function useGameStats(limit = 50, offset = 0) {
  const { isAuthenticated, isGuest } = useAuthStore();

  return useQuery({
    queryKey: ['gameStats', limit, offset],
    queryFn: () => playTrackingApi.getGameStats(limit, offset),
    enabled: isAuthenticated && !isGuest,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to get user's play history
 */
export function usePlayHistory(limit = 50, offset = 0) {
  const { isAuthenticated, isGuest } = useAuthStore();

  return useQuery({
    queryKey: ['playHistory', limit, offset],
    queryFn: () => playTrackingApi.getHistory(limit, offset),
    enabled: isAuthenticated && !isGuest,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to get user's top played games
 */
export function useTopGames(limit = 10) {
  const { isAuthenticated, isGuest } = useAuthStore();

  return useQuery({
    queryKey: ['topGames', limit],
    queryFn: () => playTrackingApi.getTopGames(limit),
    enabled: isAuthenticated && !isGuest,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get play activity over time
 */
export function usePlayActivityOverTime(days = 30) {
  const { isAuthenticated, isGuest } = useAuthStore();

  return useQuery({
    queryKey: ['playActivity', days],
    queryFn: () => playTrackingApi.getActivityOverTime(days),
    enabled: isAuthenticated && !isGuest,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get games distribution by playtime
 */
export function useGamesDistribution(limit = 10) {
  const { isAuthenticated, isGuest } = useAuthStore();

  return useQuery({
    queryKey: ['gamesDistribution', limit],
    queryFn: () => playTrackingApi.getGamesDistribution(limit),
    enabled: isAuthenticated && !isGuest,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
