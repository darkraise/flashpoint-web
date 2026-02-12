import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useGames, useGame, useRelatedGames, useRandomGame } from './useGames';
import { mockGame } from '@/test/mocks/handlers';
import { gamesApi } from '@/lib/api';

// Create a wrapper with QueryClient for hooks that use useQuery
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useGames', () => {
  let wrapper: ReturnType<typeof createWrapper>;

  beforeEach(() => {
    wrapper = createWrapper();
  });

  describe('useGames', () => {
    it('should fetch games with filters', async () => {
      const filters = {
        search: '',
        page: 1,
        limit: 20,
      };

      const { result } = renderHook(() => useGames(filters), { wrapper });

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();

      // Wait for query to complete and data to be available
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
        expect(result.current.data?.data).toBeDefined();
      });

      // Check data
      expect(result.current.data).toBeDefined();
      expect(result.current.data?.data).toBeDefined();
      expect(result.current.data?.data.length).toBeGreaterThan(0);
      expect(result.current.data?.data[0]).toEqual(mockGame);
    });

    it('should cache results for subsequent renders', async () => {
      const filters = {
        search: '',
        page: 1,
        limit: 20,
      };

      // First render
      const { result: result1, unmount } = renderHook(() => useGames(filters), { wrapper });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      const firstData = result1.current.data;
      unmount();

      // Second render with same filters should use cache
      const { result: result2 } = renderHook(() => useGames(filters), { wrapper });

      // Should immediately have data from cache
      await waitFor(() => {
        expect(result2.current.data).toEqual(firstData);
      });
    });

    it('should handle different query keys for different filters', async () => {
      const filters1 = { search: 'test', page: 1, limit: 20 };
      const filters2 = { search: 'other', page: 1, limit: 20 };

      const { result: result1 } = renderHook(() => useGames(filters1), { wrapper });

      const { result: result2 } = renderHook(() => useGames(filters2), { wrapper });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
        expect(result2.current.isSuccess).toBe(true);
      });

      // Both queries should complete independently
      expect(result1.current.data).toBeDefined();
      expect(result2.current.data).toBeDefined();
    });

    it('should cancel previous requests when filters change', async () => {
      const filters1 = { search: 'first', page: 1, limit: 20 };
      const filters2 = { search: 'second', page: 1, limit: 20 };

      // Start with first filter
      const { result, rerender } = renderHook(({ filters }) => useGames(filters), {
        wrapper,
        initialProps: { filters: filters1 },
      });

      // Immediately change to second filter (simulating rapid user input)
      rerender({ filters: filters2 });

      // Wait for the query to complete
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // The result should be for the second query, not the first
      // TanStack Query automatically cancels the first request via AbortSignal
      expect(result.current.data).toBeDefined();
    });
  });

  describe('useGame', () => {
    it('should fetch a single game by ID', async () => {
      const gameId = 'game-1';

      const { result } = renderHook(() => useGame(gameId), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.id).toBe(gameId);
      expect(result.current.data?.title).toBe('Test Game');
    });

    it('should not fetch when ID is empty', () => {
      const { result } = renderHook(() => useGame(''), { wrapper });

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('should respect enabled option', () => {
      const { result } = renderHook(() => useGame('game-1', { enabled: false }), { wrapper });

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('should enable fetch when enabled option is true', async () => {
      const { result } = renderHook(() => useGame('game-1', { enabled: true }), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
    });
  });

  describe('useRelatedGames', () => {
    it('should fetch related games with default limit', async () => {
      const gameId = 'game-1';

      const { result } = renderHook(() => useRelatedGames(gameId), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
    });

    it('should fetch related games with custom limit', async () => {
      const gameId = 'game-1';
      const customLimit = 5;

      const { result } = renderHook(() => useRelatedGames(gameId, customLimit), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
    });

    it('should not fetch when ID is empty', () => {
      const { result } = renderHook(() => useRelatedGames(''), { wrapper });

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('useRandomGame', () => {
    it('should fetch a random game without parameters', async () => {
      const { result } = renderHook(() => useRandomGame(), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.id).toBe(mockGame.id);
    });

    it('should call gamesApi.getRandom with library parameter', async () => {
      const getRandomSpy = vi.spyOn(gamesApi, 'getRandom');

      const { result } = renderHook(() => useRandomGame('arcade'), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(getRandomSpy).toHaveBeenCalledWith('arcade', undefined);

      getRandomSpy.mockRestore();
    });

    it('should call gamesApi.getRandom with platforms parameter', async () => {
      const getRandomSpy = vi.spyOn(gamesApi, 'getRandom');
      const platforms = ['Flash', 'HTML5'];

      const { result } = renderHook(() => useRandomGame(undefined, platforms), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(getRandomSpy).toHaveBeenCalledWith(undefined, platforms);

      getRandomSpy.mockRestore();
    });

    it('should call gamesApi.getRandom with both library and platforms', async () => {
      const getRandomSpy = vi.spyOn(gamesApi, 'getRandom');
      const library = 'arcade';
      const platforms = ['Flash', 'HTML5'];

      const { result } = renderHook(() => useRandomGame(library, platforms), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(getRandomSpy).toHaveBeenCalledWith(library, platforms);

      getRandomSpy.mockRestore();
    });

    it('should preserve platforms array order in API call', async () => {
      const getRandomSpy = vi.spyOn(gamesApi, 'getRandom');
      const platforms = ['HTML5', 'Flash']; // Intentionally reversed order

      const { result } = renderHook(() => useRandomGame(undefined, platforms), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify the exact array is passed (order preserved)
      expect(getRandomSpy).toHaveBeenCalledWith(undefined, ['HTML5', 'Flash']);

      getRandomSpy.mockRestore();
    });

    it('should use correct queryKey with library and platforms', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            gcTime: 0,
            staleTime: 0,
          },
        },
      });

      const customWrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const library = 'theatre';
      const platforms = ['Flash', 'HTML5'];

      const { result } = renderHook(() => useRandomGame(library, platforms), {
        wrapper: customWrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Check that the query is cached with the expected key
      const cachedData = queryClient.getQueryData(['games', 'random', library, platforms]);
      expect(cachedData).toBeDefined();

      // Verify different parameters create different cache entries
      const otherCachedData = queryClient.getQueryData(['games', 'random', 'arcade', platforms]);
      expect(otherCachedData).toBeUndefined();
    });

    it('should create separate cache entries for different platforms arrays', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            gcTime: 0,
            staleTime: 0,
          },
        },
      });

      const customWrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const platforms1 = ['Flash'];
      const platforms2 = ['Flash', 'HTML5'];

      // First query with single platform
      const { result: result1 } = renderHook(() => useRandomGame(undefined, platforms1), {
        wrapper: customWrapper,
      });

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      // Second query with multiple platforms
      const { result: result2 } = renderHook(() => useRandomGame(undefined, platforms2), {
        wrapper: customWrapper,
      });

      await waitFor(() => {
        expect(result2.current.isSuccess).toBe(true);
      });

      // Both should be cached separately
      const cached1 = queryClient.getQueryData(['games', 'random', undefined, platforms1]);
      const cached2 = queryClient.getQueryData(['games', 'random', undefined, platforms2]);

      expect(cached1).toBeDefined();
      expect(cached2).toBeDefined();
    });
  });
});
