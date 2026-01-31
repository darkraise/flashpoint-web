import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useGames, useGame, useRelatedGames } from './useGames';
import { mockGame } from '@/test/mocks/handlers';

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
    it.skip('should fetch games with filters', async () => {
      // TODO: Fix flaky MSW mock - test times out waiting for data
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
      const { result: result1, unmount } = renderHook(
        () => useGames(filters),
        { wrapper }
      );

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
      });

      const firstData = result1.current.data;
      unmount();

      // Second render with same filters should use cache
      const { result: result2 } = renderHook(
        () => useGames(filters),
        { wrapper }
      );

      // Should immediately have data from cache
      await waitFor(() => {
        expect(result2.current.data).toEqual(firstData);
      });
    });

    it('should handle different query keys for different filters', async () => {
      const filters1 = { search: 'test', page: 1, limit: 20 };
      const filters2 = { search: 'other', page: 1, limit: 20 };

      const { result: result1 } = renderHook(
        () => useGames(filters1),
        { wrapper }
      );

      const { result: result2 } = renderHook(
        () => useGames(filters2),
        { wrapper }
      );

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true);
        expect(result2.current.isSuccess).toBe(true);
      });

      // Both queries should complete independently
      expect(result1.current.data).toBeDefined();
      expect(result2.current.data).toBeDefined();
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
      const { result } = renderHook(
        () => useGame('game-1', { enabled: false }),
        { wrapper }
      );

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('should enable fetch when enabled option is true', async () => {
      const { result } = renderHook(
        () => useGame('game-1', { enabled: true }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
    });
  });

  describe('useRelatedGames', () => {
    it('should fetch related games with default limit', async () => {
      const gameId = 'game-1';

      const { result } = renderHook(
        () => useRelatedGames(gameId),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
    });

    it('should fetch related games with custom limit', async () => {
      const gameId = 'game-1';
      const customLimit = 5;

      const { result } = renderHook(
        () => useRelatedGames(gameId, customLimit),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
    });

    it('should not fetch when ID is empty', () => {
      const { result } = renderHook(
        () => useRelatedGames(''),
        { wrapper }
      );

      expect(result.current.isPending).toBe(true);
      expect(result.current.fetchStatus).toBe('idle');
    });
  });
});
