import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import {
  usePlaylists,
  usePlaylist,
  useCreatePlaylist,
  useAddGamesToPlaylist,
  useRemoveGamesFromPlaylist,
  useDeletePlaylist,
  useFavoritesPlaylist,
  useAddToFavorites,
  useRemoveFromFavorites,
  FAVORITES_PLAYLIST_ID,
} from './usePlaylists';

// Create hoisted mocks
const { mockPlaylistsApi } = vi.hoisted(() => ({
  mockPlaylistsApi: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    addGames: vi.fn(),
    removeGames: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock the playlists API
vi.mock('@/lib/api', () => ({
  playlistsApi: mockPlaylistsApi,
}));

describe('usePlaylists hooks', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    return function Wrapper({ children }: { children: React.ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    };
  };

  const mockPlaylist = {
    id: 'playlist-1',
    title: 'Test Playlist',
    description: 'A test playlist',
    author: 'Test Author',
    library: 'arcade',
    games: [],
    gameCount: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockPlaylistsResponse = {
    data: [mockPlaylist],
    pagination: {
      page: 1,
      limit: 12,
      total: 1,
      totalPages: 1,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
        mutations: {
          retry: false,
        },
      },
    });
  });

  describe('usePlaylists', () => {
    it('should fetch playlists with default pagination', async () => {
      mockPlaylistsApi.getAll.mockResolvedValueOnce(mockPlaylistsResponse);

      const { result } = renderHook(() => usePlaylists(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockPlaylistsApi.getAll).toHaveBeenCalledWith(1, 12);
      expect(result.current.data).toEqual(mockPlaylistsResponse);
    });

    it('should fetch playlists with custom pagination', async () => {
      mockPlaylistsApi.getAll.mockResolvedValueOnce(mockPlaylistsResponse);

      const { result } = renderHook(() => usePlaylists(2, 24), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockPlaylistsApi.getAll).toHaveBeenCalledWith(2, 24);
    });

    it('should use correct query key with pagination', async () => {
      mockPlaylistsApi.getAll.mockResolvedValueOnce(mockPlaylistsResponse);

      renderHook(() => usePlaylists(3, 10), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(queryClient.getQueryData(['playlists', { page: 3, limit: 10 }])).toEqual(
          mockPlaylistsResponse
        );
      });
    });

    it('should return loading state initially', () => {
      mockPlaylistsApi.getAll.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => usePlaylists(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should return error state on failure', async () => {
      const error = new Error('Failed to fetch playlists');
      mockPlaylistsApi.getAll.mockRejectedValueOnce(error);

      const { result } = renderHook(() => usePlaylists(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe('usePlaylist', () => {
    it('should fetch a single playlist by ID', async () => {
      mockPlaylistsApi.getById.mockResolvedValueOnce(mockPlaylist);

      const { result } = renderHook(() => usePlaylist('playlist-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockPlaylistsApi.getById).toHaveBeenCalledWith('playlist-1');
      expect(result.current.data).toEqual(mockPlaylist);
    });

    it('should not fetch when ID is empty', async () => {
      const { result } = renderHook(() => usePlaylist(''), {
        wrapper: createWrapper(),
      });

      // Wait a tick to ensure no fetch was triggered
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockPlaylistsApi.getById).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('should use correct query key', async () => {
      mockPlaylistsApi.getById.mockResolvedValueOnce(mockPlaylist);

      renderHook(() => usePlaylist('playlist-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(queryClient.getQueryData(['playlist', 'playlist-1'])).toEqual(mockPlaylist);
      });
    });

    it('should return error state on failure', async () => {
      const error = new Error('Playlist not found');
      mockPlaylistsApi.getById.mockRejectedValueOnce(error);

      const { result } = renderHook(() => usePlaylist('invalid-id'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(error);
    });
  });

  describe('useCreatePlaylist', () => {
    it('should create a playlist', async () => {
      const newPlaylist = { ...mockPlaylist, id: 'new-playlist' };
      mockPlaylistsApi.create.mockResolvedValueOnce(newPlaylist);

      const { result } = renderHook(() => useCreatePlaylist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          title: 'New Playlist',
          description: 'A new playlist',
        });
      });

      expect(mockPlaylistsApi.create).toHaveBeenCalledWith({
        title: 'New Playlist',
        description: 'A new playlist',
      });
    });

    it('should create a playlist with all optional fields', async () => {
      mockPlaylistsApi.create.mockResolvedValueOnce(mockPlaylist);

      const { result } = renderHook(() => useCreatePlaylist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          title: 'New Playlist',
          description: 'Description',
          author: 'Author',
          library: 'arcade',
        });
      });

      expect(mockPlaylistsApi.create).toHaveBeenCalledWith({
        title: 'New Playlist',
        description: 'Description',
        author: 'Author',
        library: 'arcade',
      });
    });

    it('should invalidate playlists queries on success', async () => {
      mockPlaylistsApi.create.mockResolvedValueOnce(mockPlaylist);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreatePlaylist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({ title: 'New Playlist' });
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['playlists'] });
    });

    it('should invalidate statistics queries on success', async () => {
      mockPlaylistsApi.create.mockResolvedValueOnce(mockPlaylist);
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useCreatePlaylist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({ title: 'New Playlist' });
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['statistics'] });
    });

    it('should return error state on failure', async () => {
      const error = new Error('Failed to create playlist');
      mockPlaylistsApi.create.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useCreatePlaylist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({ title: 'New Playlist' });
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(result.current.error).toBe(error);
    });
  });

  describe('useAddGamesToPlaylist', () => {
    it('should add games to a playlist', async () => {
      mockPlaylistsApi.addGames.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useAddGamesToPlaylist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          playlistId: 'playlist-1',
          gameIds: ['game-1', 'game-2'],
        });
      });

      expect(mockPlaylistsApi.addGames).toHaveBeenCalledWith('playlist-1', ['game-1', 'game-2']);
    });

    it('should invalidate playlists queries on success', async () => {
      mockPlaylistsApi.addGames.mockResolvedValueOnce({ success: true });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useAddGamesToPlaylist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          playlistId: 'playlist-1',
          gameIds: ['game-1'],
        });
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['playlists'] });
    });

    it('should invalidate specific playlist query on success', async () => {
      mockPlaylistsApi.addGames.mockResolvedValueOnce({ success: true });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useAddGamesToPlaylist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          playlistId: 'playlist-1',
          gameIds: ['game-1'],
        });
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['playlist', 'playlist-1'] });
    });

    it('should invalidate statistics queries on success', async () => {
      mockPlaylistsApi.addGames.mockResolvedValueOnce({ success: true });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useAddGamesToPlaylist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          playlistId: 'playlist-1',
          gameIds: ['game-1'],
        });
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['statistics'] });
    });

    it('should return error state on failure', async () => {
      const error = new Error('Failed to add games');
      mockPlaylistsApi.addGames.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAddGamesToPlaylist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            playlistId: 'playlist-1',
            gameIds: ['game-1'],
          });
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useRemoveGamesFromPlaylist', () => {
    it('should remove games from a playlist', async () => {
      mockPlaylistsApi.removeGames.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useRemoveGamesFromPlaylist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          playlistId: 'playlist-1',
          gameIds: ['game-1', 'game-2'],
        });
      });

      expect(mockPlaylistsApi.removeGames).toHaveBeenCalledWith('playlist-1', [
        'game-1',
        'game-2',
      ]);
    });

    it('should invalidate playlists queries on success', async () => {
      mockPlaylistsApi.removeGames.mockResolvedValueOnce({ success: true });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useRemoveGamesFromPlaylist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          playlistId: 'playlist-1',
          gameIds: ['game-1'],
        });
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['playlists'] });
    });

    it('should invalidate specific playlist query on success', async () => {
      mockPlaylistsApi.removeGames.mockResolvedValueOnce({ success: true });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useRemoveGamesFromPlaylist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          playlistId: 'playlist-1',
          gameIds: ['game-1'],
        });
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['playlist', 'playlist-1'] });
    });

    it('should invalidate statistics queries on success', async () => {
      mockPlaylistsApi.removeGames.mockResolvedValueOnce({ success: true });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useRemoveGamesFromPlaylist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync({
          playlistId: 'playlist-1',
          gameIds: ['game-1'],
        });
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['statistics'] });
    });

    it('should return error state on failure', async () => {
      const error = new Error('Failed to remove games');
      mockPlaylistsApi.removeGames.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useRemoveGamesFromPlaylist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            playlistId: 'playlist-1',
            gameIds: ['game-1'],
          });
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useDeletePlaylist', () => {
    it('should delete a playlist', async () => {
      mockPlaylistsApi.delete.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useDeletePlaylist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('playlist-1');
      });

      expect(mockPlaylistsApi.delete).toHaveBeenCalledWith('playlist-1');
    });

    it('should invalidate playlists queries on success', async () => {
      mockPlaylistsApi.delete.mockResolvedValueOnce({ success: true });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useDeletePlaylist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('playlist-1');
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['playlists'] });
    });

    it('should invalidate statistics queries on success', async () => {
      mockPlaylistsApi.delete.mockResolvedValueOnce({ success: true });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useDeletePlaylist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('playlist-1');
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['statistics'] });
    });

    it('should return error state on failure', async () => {
      const error = new Error('Failed to delete playlist');
      mockPlaylistsApi.delete.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useDeletePlaylist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync('playlist-1');
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(result.current.error).toBe(error);
    });
  });

  describe('FAVORITES_PLAYLIST_ID', () => {
    it('should be the correct well-known ID', () => {
      expect(FAVORITES_PLAYLIST_ID).toBe('c8f81d60-b134-4309-8985-fd184ec96dfe');
    });
  });

  describe('useFavoritesPlaylist', () => {
    it('should fetch the favorites playlist by well-known ID', async () => {
      const favoritesPlaylist = { ...mockPlaylist, id: FAVORITES_PLAYLIST_ID };
      mockPlaylistsApi.getById.mockResolvedValueOnce(favoritesPlaylist);

      const { result } = renderHook(() => useFavoritesPlaylist(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockPlaylistsApi.getById).toHaveBeenCalledWith(FAVORITES_PLAYLIST_ID);
      expect(result.current.data).toEqual(favoritesPlaylist);
    });

    it('should use correct query key', async () => {
      const favoritesPlaylist = { ...mockPlaylist, id: FAVORITES_PLAYLIST_ID };
      mockPlaylistsApi.getById.mockResolvedValueOnce(favoritesPlaylist);

      renderHook(() => useFavoritesPlaylist(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(queryClient.getQueryData(['playlist', FAVORITES_PLAYLIST_ID])).toEqual(
          favoritesPlaylist
        );
      });
    });
  });

  describe('useAddToFavorites', () => {
    it('should add a game to favorites playlist', async () => {
      mockPlaylistsApi.addGames.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useAddToFavorites(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('game-123');
      });

      expect(mockPlaylistsApi.addGames).toHaveBeenCalledWith(FAVORITES_PLAYLIST_ID, ['game-123']);
    });

    it('should invalidate playlists queries on success', async () => {
      mockPlaylistsApi.addGames.mockResolvedValueOnce({ success: true });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useAddToFavorites(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('game-123');
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['playlists'] });
    });

    it('should invalidate favorites playlist query on success', async () => {
      mockPlaylistsApi.addGames.mockResolvedValueOnce({ success: true });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useAddToFavorites(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('game-123');
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['playlist', FAVORITES_PLAYLIST_ID],
      });
    });

    it('should invalidate statistics queries on success', async () => {
      mockPlaylistsApi.addGames.mockResolvedValueOnce({ success: true });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useAddToFavorites(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('game-123');
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['statistics'] });
    });

    it('should invalidate favorites queries on success', async () => {
      mockPlaylistsApi.addGames.mockResolvedValueOnce({ success: true });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useAddToFavorites(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('game-123');
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['favorites'] });
    });

    it('should return error state on failure', async () => {
      const error = new Error('Failed to add to favorites');
      mockPlaylistsApi.addGames.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAddToFavorites(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync('game-123');
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useRemoveFromFavorites', () => {
    it('should remove a game from favorites playlist', async () => {
      mockPlaylistsApi.removeGames.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useRemoveFromFavorites(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('game-123');
      });

      expect(mockPlaylistsApi.removeGames).toHaveBeenCalledWith(FAVORITES_PLAYLIST_ID, [
        'game-123',
      ]);
    });

    it('should invalidate playlists queries on success', async () => {
      mockPlaylistsApi.removeGames.mockResolvedValueOnce({ success: true });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useRemoveFromFavorites(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('game-123');
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['playlists'] });
    });

    it('should invalidate favorites playlist query on success', async () => {
      mockPlaylistsApi.removeGames.mockResolvedValueOnce({ success: true });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useRemoveFromFavorites(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('game-123');
      });

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ['playlist', FAVORITES_PLAYLIST_ID],
      });
    });

    it('should invalidate statistics queries on success', async () => {
      mockPlaylistsApi.removeGames.mockResolvedValueOnce({ success: true });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useRemoveFromFavorites(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('game-123');
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['statistics'] });
    });

    it('should invalidate favorites queries on success', async () => {
      mockPlaylistsApi.removeGames.mockResolvedValueOnce({ success: true });
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useRemoveFromFavorites(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('game-123');
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['favorites'] });
    });

    it('should return error state on failure', async () => {
      const error = new Error('Failed to remove from favorites');
      mockPlaylistsApi.removeGames.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useRemoveFromFavorites(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        try {
          await result.current.mutateAsync('game-123');
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('mutation states', () => {
    it('should track loading state during createPlaylist mutation', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockPlaylistsApi.create.mockReturnValueOnce(promise);

      const { result } = renderHook(() => useCreatePlaylist(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.mutate({ title: 'New Playlist' });
      });

      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      await act(async () => {
        resolvePromise!(mockPlaylist);
        await promise;
      });

      await waitFor(() => {
        expect(result.current.isPending).toBe(false);
      });
    });

    it('should track success state after deletePlaylist mutation', async () => {
      mockPlaylistsApi.delete.mockResolvedValueOnce({ success: true });

      const { result } = renderHook(() => useDeletePlaylist(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.mutateAsync('playlist-1');
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
    });
  });
});
