import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  useFavorites,
  useFavoriteGameIds,
  useFavoriteGames,
  useFavoritesStats,
  useToggleFavorite,
  useAddFavorite,
  useRemoveFavorite,
  useBatchAddFavorites,
  useBatchRemoveFavorites,
  useClearAllFavorites,
} from './useFavorites';

// Create hoisted mocks that can be referenced in vi.mock
const { mockShowToast, mockFavoritesApi, mockUseFeatureFlags } = vi.hoisted(() => ({
  mockShowToast: vi.fn(),
  mockFavoritesApi: {
    getAll: vi.fn(),
    getGameIds: vi.fn(),
    getGames: vi.fn(),
    getStats: vi.fn(),
    toggle: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    batchAdd: vi.fn(),
    batchRemove: vi.fn(),
    clearAll: vi.fn(),
  },
  mockUseFeatureFlags: vi.fn().mockReturnValue({
    enableFavorites: true,
  }),
}));

// Mock the API
vi.mock('@/lib/api', () => ({
  favoritesApi: mockFavoritesApi,
}));

// Mock useFeatureFlags
vi.mock('./useFeatureFlags', () => ({
  useFeatureFlags: mockUseFeatureFlags,
}));

// Mock DialogContext
vi.mock('@/contexts/DialogContext', () => ({
  useDialog: vi.fn().mockReturnValue({
    showToast: mockShowToast,
    showConfirm: vi.fn(),
  }),
}));

// Use the hoisted mocks directly
const favoritesApi = mockFavoritesApi;

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useFavorites hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
    mockUseFeatureFlags.mockReturnValue({ enableFavorites: true });
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('useFavorites', () => {
    it('should fetch favorites', async () => {
      const mockFavorites = [
        { id: 1, gameId: 'game1', createdAt: '2024-01-01' },
        { id: 2, gameId: 'game2', createdAt: '2024-01-02' },
      ];
      favoritesApi.getAll.mockResolvedValue(mockFavorites);

      const { result } = renderHook(() => useFavorites(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockFavorites);
      expect(favoritesApi.getAll).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should pass limit and offset parameters', async () => {
      favoritesApi.getAll.mockResolvedValue([]);

      const { result } = renderHook(() => useFavorites(10, 5), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(favoritesApi.getAll).toHaveBeenCalledWith(10, 5);
    });

    it('should be disabled when enableFavorites is false', async () => {
      mockUseFeatureFlags.mockReturnValue({ enableFavorites: false });

      const { result } = renderHook(() => useFavorites(), {
        wrapper: createWrapper(queryClient),
      });

      // Query should not run
      expect(result.current.fetchStatus).toBe('idle');
      expect(favoritesApi.getAll).not.toHaveBeenCalled();
    });

    it('should handle fetch error', async () => {
      favoritesApi.getAll.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useFavorites(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useFavoriteGameIds', () => {
    it('should fetch game IDs', async () => {
      const mockGameIds = ['game1', 'game2', 'game3'];
      favoritesApi.getGameIds.mockResolvedValue(mockGameIds);

      const { result } = renderHook(() => useFavoriteGameIds(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockGameIds);
    });

    it('should be disabled when enableFavorites is false', async () => {
      mockUseFeatureFlags.mockReturnValue({ enableFavorites: false });

      const { result } = renderHook(() => useFavoriteGameIds(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(favoritesApi.getGameIds).not.toHaveBeenCalled();
    });
  });

  describe('useFavoriteGames', () => {
    it('should fetch favorite games with pagination', async () => {
      const mockResponse = {
        data: [{ id: 'game1', title: 'Test Game' }],
        pagination: { page: 1, limit: 24, total: 1, totalPages: 1 },
      };
      favoritesApi.getGames.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useFavoriteGames(1, 24, 'title', 'asc'), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockResponse);
      expect(favoritesApi.getGames).toHaveBeenCalledWith(1, 24, 'title', 'asc');
    });

    it('should use default parameters', async () => {
      favoritesApi.getGames.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 24, total: 0, totalPages: 0 },
      });

      const { result } = renderHook(() => useFavoriteGames(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(favoritesApi.getGames).toHaveBeenCalledWith(1, 24, undefined, undefined);
    });
  });

  describe('useFavoritesStats', () => {
    it('should fetch favorites stats', async () => {
      const mockStats = {
        totalFavorites: 10,
        oldestFavoriteDate: '2024-01-01',
        newestFavoriteDate: '2024-06-01',
      };
      favoritesApi.getStats.mockResolvedValue(mockStats);

      const { result } = renderHook(() => useFavoritesStats(), {
        wrapper: createWrapper(queryClient),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockStats);
    });
  });

  describe('useToggleFavorite', () => {
    it('should call toggle API with game ID', async () => {
      favoritesApi.toggle.mockResolvedValue(true);

      const { result } = renderHook(() => useToggleFavorite(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync('game1');
      });

      expect(favoritesApi.toggle).toHaveBeenCalledWith('game1');
    });

    it('should return true when adding favorite', async () => {
      favoritesApi.toggle.mockResolvedValue(true);

      const { result } = renderHook(() => useToggleFavorite(), {
        wrapper: createWrapper(queryClient),
      });

      let isFavorited: boolean | undefined;
      await act(async () => {
        isFavorited = await result.current.mutateAsync('game1');
      });

      expect(isFavorited).toBe(true);
    });

    it('should return false when removing favorite', async () => {
      favoritesApi.toggle.mockResolvedValue(false);

      const { result } = renderHook(() => useToggleFavorite(), {
        wrapper: createWrapper(queryClient),
      });

      let isFavorited: boolean | undefined;
      await act(async () => {
        isFavorited = await result.current.mutateAsync('game1');
      });

      expect(isFavorited).toBe(false);
    });

    it('should show toast on error', async () => {
      favoritesApi.toggle.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useToggleFavorite(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('game1');
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'error');
    });
  });

  describe('useAddFavorite', () => {
    it('should call add API with game ID', async () => {
      favoritesApi.add.mockResolvedValue(true);

      const { result } = renderHook(() => useAddFavorite(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync('game1');
      });

      expect(favoritesApi.add).toHaveBeenCalledWith('game1');
    });

    it('should return success value', async () => {
      favoritesApi.add.mockResolvedValue(true);

      const { result } = renderHook(() => useAddFavorite(), {
        wrapper: createWrapper(queryClient),
      });

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.mutateAsync('game1');
      });

      expect(success).toBe(true);
    });

    it('should show toast on error', async () => {
      favoritesApi.add.mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() => useAddFavorite(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('game1');
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'error');
    });
  });

  describe('useRemoveFavorite', () => {
    it('should call remove API with game ID', async () => {
      favoritesApi.remove.mockResolvedValue(undefined);

      const { result } = renderHook(() => useRemoveFavorite(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync('game1');
      });

      expect(favoritesApi.remove).toHaveBeenCalledWith('game1');
    });

    it('should complete successfully', async () => {
      favoritesApi.remove.mockResolvedValue(undefined);

      const { result } = renderHook(() => useRemoveFavorite(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('game1');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should show toast on error', async () => {
      favoritesApi.remove.mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() => useRemoveFavorite(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('game1');
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'error');
    });
  });

  describe('useBatchAddFavorites', () => {
    it('should call batchAdd API with game IDs', async () => {
      favoritesApi.batchAdd.mockResolvedValue(2);

      const { result } = renderHook(() => useBatchAddFavorites(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync(['game1', 'game2']);
      });

      expect(favoritesApi.batchAdd).toHaveBeenCalledWith(['game1', 'game2']);
    });

    it('should return added count', async () => {
      favoritesApi.batchAdd.mockResolvedValue(3);

      const { result } = renderHook(() => useBatchAddFavorites(), {
        wrapper: createWrapper(queryClient),
      });

      let addedCount: number | undefined;
      await act(async () => {
        addedCount = await result.current.mutateAsync(['game1', 'game2', 'game3']);
      });

      expect(addedCount).toBe(3);
    });

    it('should show toast on error', async () => {
      favoritesApi.batchAdd.mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() => useBatchAddFavorites(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate(['game1', 'game2']);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'error');
    });
  });

  describe('useBatchRemoveFavorites', () => {
    it('should call batchRemove API with game IDs', async () => {
      favoritesApi.batchRemove.mockResolvedValue(2);

      const { result } = renderHook(() => useBatchRemoveFavorites(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync(['game1', 'game2']);
      });

      expect(favoritesApi.batchRemove).toHaveBeenCalledWith(['game1', 'game2']);
    });

    it('should return removed count', async () => {
      favoritesApi.batchRemove.mockResolvedValue(2);

      const { result } = renderHook(() => useBatchRemoveFavorites(), {
        wrapper: createWrapper(queryClient),
      });

      let removedCount: number | undefined;
      await act(async () => {
        removedCount = await result.current.mutateAsync(['game1', 'game2']);
      });

      expect(removedCount).toBe(2);
    });

    it('should show toast on error', async () => {
      favoritesApi.batchRemove.mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() => useBatchRemoveFavorites(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate(['game1', 'game2']);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'error');
    });
  });

  describe('useClearAllFavorites', () => {
    it('should call clearAll API', async () => {
      favoritesApi.clearAll.mockResolvedValue(5);

      const { result } = renderHook(() => useClearAllFavorites(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        await result.current.mutateAsync();
      });

      expect(favoritesApi.clearAll).toHaveBeenCalled();
    });

    it('should return removed count', async () => {
      favoritesApi.clearAll.mockResolvedValue(10);

      const { result } = renderHook(() => useClearAllFavorites(), {
        wrapper: createWrapper(queryClient),
      });

      let removedCount: number | undefined;
      await act(async () => {
        removedCount = await result.current.mutateAsync();
      });

      expect(removedCount).toBe(10);
    });

    it('should show toast on error', async () => {
      favoritesApi.clearAll.mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() => useClearAllFavorites(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate();
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'error');
    });
  });

  describe('mutation states', () => {
    it('should track loading state during mutation', async () => {
      let resolveToggle: (value: boolean) => void;
      favoritesApi.toggle.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveToggle = resolve;
          })
      );

      const { result } = renderHook(() => useToggleFavorite(), {
        wrapper: createWrapper(queryClient),
      });

      expect(result.current.isPending).toBe(false);

      act(() => {
        result.current.mutate('game1');
      });

      await waitFor(() => expect(result.current.isPending).toBe(true));

      await act(async () => {
        resolveToggle!(true);
      });

      await waitFor(() => expect(result.current.isPending).toBe(false));
    });

    it('should track success state after mutation', async () => {
      favoritesApi.toggle.mockResolvedValue(true);

      const { result } = renderHook(() => useToggleFavorite(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('game1');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should track error state on failure', async () => {
      favoritesApi.toggle.mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() => useToggleFavorite(), {
        wrapper: createWrapper(queryClient),
      });

      await act(async () => {
        result.current.mutate('game1');
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });
  });
});
