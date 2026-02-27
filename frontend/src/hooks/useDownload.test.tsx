import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

import { useDownload, DownloadProgress } from './useDownload';

// Create hoisted mocks
const { mockGamesApi, mockLogger } = vi.hoisted(() => ({
  mockGamesApi: {
    downloadGame: vi.fn(),
    cancelDownload: vi.fn(),
  },
  mockLogger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock dependencies
vi.mock('@/lib/api', () => ({
  gamesApi: mockGamesApi,
}));

vi.mock('@/lib/logger', () => ({
  logger: mockLogger,
}));

describe('useDownload', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockAbort: ReturnType<typeof vi.fn>;

  // Helper to create a mock SSE stream
  const createMockSSEStream = (events: DownloadProgress[]) => {
    let eventIndex = 0;

    const mockReader = {
      read: vi.fn().mockImplementation(async () => {
        if (eventIndex < events.length) {
          const event = events[eventIndex++];
          const data = `data: ${JSON.stringify(event)}\n\n`;
          return {
            done: false,
            value: new TextEncoder().encode(data),
          };
        }
        return { done: true, value: undefined };
      }),
      cancel: vi.fn(),
    };

    return {
      ok: true,
      body: {
        getReader: () => mockReader,
      },
      mockReader,
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockAbort = vi.fn();

    // Create a proper mock class for AbortController
    class MockAbortController {
      signal = { aborted: false };
      abort = mockAbort;
    }

    vi.stubGlobal('AbortController', MockAbortController);

    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('initial state', () => {
    it('should have null progress initially', () => {
      const { result } = renderHook(() => useDownload('game-123'));

      expect(result.current.progress).toBeNull();
    });

    it('should not be downloading initially', () => {
      const { result } = renderHook(() => useDownload('game-123'));

      expect(result.current.isDownloading).toBe(false);
    });

    it('should provide startDownload function', () => {
      const { result } = renderHook(() => useDownload('game-123'));

      expect(typeof result.current.startDownload).toBe('function');
    });

    it('should provide cancelDownload function', () => {
      const { result } = renderHook(() => useDownload('game-123'));

      expect(typeof result.current.cancelDownload).toBe('function');
    });

    it('should provide resetProgress function', () => {
      const { result } = renderHook(() => useDownload('game-123'));

      expect(typeof result.current.resetProgress).toBe('function');
    });
  });

  describe('startDownload', () => {
    it('should set isDownloading to true when starting', async () => {
      const mockStream = createMockSSEStream([]);
      mockGamesApi.downloadGame.mockResolvedValueOnce({ success: true });
      mockFetch.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useDownload('game-123'));

      act(() => {
        result.current.startDownload();
      });

      expect(result.current.isDownloading).toBe(true);
    });

    it('should set initial progress state', async () => {
      const mockStream = createMockSSEStream([]);
      mockGamesApi.downloadGame.mockResolvedValueOnce({ success: true });
      mockFetch.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useDownload('game-123'));

      act(() => {
        result.current.startDownload();
      });

      expect(result.current.progress).toEqual({
        percent: 0,
        status: 'waiting',
        details: 'Starting download...',
      });
    });

    it('should call gamesApi.downloadGame with gameId', async () => {
      const mockStream = createMockSSEStream([]);
      mockGamesApi.downloadGame.mockResolvedValueOnce({ success: true });
      mockFetch.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useDownload('game-123'));

      await act(async () => {
        await result.current.startDownload();
      });

      expect(mockGamesApi.downloadGame).toHaveBeenCalledWith('game-123', undefined);
    });

    it('should call gamesApi.downloadGame with gameDataId when provided', async () => {
      const mockStream = createMockSSEStream([]);
      mockGamesApi.downloadGame.mockResolvedValueOnce({ success: true });
      mockFetch.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useDownload('game-123'));

      await act(async () => {
        await result.current.startDownload(456);
      });

      expect(mockGamesApi.downloadGame).toHaveBeenCalledWith('game-123', 456);
    });

    it('should connect to progress SSE endpoint', async () => {
      const mockStream = createMockSSEStream([]);
      mockGamesApi.downloadGame.mockResolvedValueOnce({ success: true });
      mockFetch.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useDownload('game-123'));

      await act(async () => {
        await result.current.startDownload();
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/games/game-123/download/progress', {
        credentials: 'include',
        signal: expect.any(Object),
      });
    });

    it('should return result from downloadGame API', async () => {
      const mockStream = createMockSSEStream([]);
      const mockResult = { success: true, data: { downloadId: 'dl-123' } };
      mockGamesApi.downloadGame.mockResolvedValueOnce(mockResult);
      mockFetch.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useDownload('game-123'));

      let downloadResult: unknown;
      await act(async () => {
        downloadResult = await result.current.startDownload();
      });

      expect(downloadResult).toEqual(mockResult);
    });

    it('should set error state when downloadGame fails', async () => {
      const error = new Error('Download failed');
      mockGamesApi.downloadGame.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useDownload('game-123'));

      await act(async () => {
        try {
          await result.current.startDownload();
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.progress).toEqual({
        percent: 0,
        status: 'error',
        details: 'Failed to start download',
        error: 'Download failed',
      });
      expect(result.current.isDownloading).toBe(false);
    });

    it('should throw error when downloadGame fails', async () => {
      const error = new Error('Download failed');
      mockGamesApi.downloadGame.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useDownload('game-123'));

      await expect(
        act(async () => {
          await result.current.startDownload();
        })
      ).rejects.toThrow('Download failed');
    });

    it('should set error state when SSE connection fails', async () => {
      mockGamesApi.downloadGame.mockResolvedValueOnce({ success: true });
      mockFetch.mockResolvedValueOnce({ ok: false, body: null });

      const { result } = renderHook(() => useDownload('game-123'));

      await act(async () => {
        try {
          await result.current.startDownload();
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.progress).toEqual({
        percent: 0,
        status: 'error',
        details: 'Failed to start download',
        error: 'Failed to connect to download progress stream',
      });
    });
  });

  describe('SSE progress updates', () => {
    it('should update progress from SSE events', async () => {
      const events: DownloadProgress[] = [
        { percent: 25, status: 'downloading', details: '25% complete' },
        { percent: 50, status: 'downloading', details: '50% complete' },
        { percent: 100, status: 'complete', details: 'Download complete' },
      ];
      const mockStream = createMockSSEStream(events);
      mockGamesApi.downloadGame.mockResolvedValueOnce({ success: true });
      mockFetch.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useDownload('game-123'));

      await act(async () => {
        await result.current.startDownload();
      });

      // Wait for SSE events to be processed
      await waitFor(() => {
        expect(result.current.progress?.status).toBe('complete');
      });

      expect(result.current.progress).toEqual({
        percent: 100,
        status: 'complete',
        details: 'Download complete',
      });
    });

    it('should stop downloading when status is complete', async () => {
      const events: DownloadProgress[] = [
        { percent: 100, status: 'complete', details: 'Done' },
      ];
      const mockStream = createMockSSEStream(events);
      mockGamesApi.downloadGame.mockResolvedValueOnce({ success: true });
      mockFetch.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useDownload('game-123'));

      await act(async () => {
        await result.current.startDownload();
      });

      await waitFor(() => {
        expect(result.current.isDownloading).toBe(false);
      });
    });

    it('should stop downloading when status is error', async () => {
      const events: DownloadProgress[] = [
        { percent: 0, status: 'error', details: 'Failed', error: 'Network error' },
      ];
      const mockStream = createMockSSEStream(events);
      mockGamesApi.downloadGame.mockResolvedValueOnce({ success: true });
      mockFetch.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useDownload('game-123'));

      await act(async () => {
        await result.current.startDownload();
      });

      await waitFor(() => {
        expect(result.current.isDownloading).toBe(false);
      });

      expect(result.current.progress?.status).toBe('error');
      expect(result.current.progress?.error).toBe('Network error');
    });

    it('should handle validating status', async () => {
      const events: DownloadProgress[] = [
        { percent: 100, status: 'validating', details: 'Validating checksum...' },
        { percent: 100, status: 'complete', details: 'Done' },
      ];
      const mockStream = createMockSSEStream(events);
      mockGamesApi.downloadGame.mockResolvedValueOnce({ success: true });
      mockFetch.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useDownload('game-123'));

      await act(async () => {
        await result.current.startDownload();
      });

      await waitFor(() => {
        expect(result.current.progress?.status).toBe('complete');
      });
    });

    it('should handle importing status', async () => {
      const events: DownloadProgress[] = [
        { percent: 100, status: 'importing', details: 'Importing game...' },
        { percent: 100, status: 'complete', details: 'Done' },
      ];
      const mockStream = createMockSSEStream(events);
      mockGamesApi.downloadGame.mockResolvedValueOnce({ success: true });
      mockFetch.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useDownload('game-123'));

      await act(async () => {
        await result.current.startDownload();
      });

      await waitFor(() => {
        expect(result.current.progress?.status).toBe('complete');
      });
    });

    it('should cancel reader when download completes', async () => {
      const events: DownloadProgress[] = [
        { percent: 100, status: 'complete', details: 'Done' },
      ];
      const mockStream = createMockSSEStream(events);
      mockGamesApi.downloadGame.mockResolvedValueOnce({ success: true });
      mockFetch.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useDownload('game-123'));

      await act(async () => {
        await result.current.startDownload();
      });

      await waitFor(() => {
        expect(mockStream.mockReader.cancel).toHaveBeenCalled();
      });
    });

    it('should log error for invalid SSE data', async () => {
      // Create a mock stream with invalid JSON
      const mockReader = {
        read: vi
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode('data: invalid-json\n\n'),
          })
          .mockResolvedValueOnce({
            done: false,
            value: new TextEncoder().encode(
              `data: ${JSON.stringify({ percent: 100, status: 'complete', details: 'Done' })}\n\n`
            ),
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
        cancel: vi.fn(),
      };

      const mockStream = {
        ok: true,
        body: { getReader: () => mockReader },
      };

      mockGamesApi.downloadGame.mockResolvedValueOnce({ success: true });
      mockFetch.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useDownload('game-123'));

      await act(async () => {
        await result.current.startDownload();
      });

      await waitFor(() => {
        expect(result.current.progress?.status).toBe('complete');
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Error parsing SSE data:', expect.any(Error));
    });

    it('should handle stream connection error', async () => {
      const mockReader = {
        read: vi.fn().mockRejectedValueOnce(new Error('Connection lost')),
        cancel: vi.fn(),
      };

      const mockStream = {
        ok: true,
        body: { getReader: () => mockReader },
      };

      mockGamesApi.downloadGame.mockResolvedValueOnce({ success: true });
      mockFetch.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useDownload('game-123'));

      await act(async () => {
        await result.current.startDownload();
      });

      await waitFor(() => {
        expect(result.current.progress?.status).toBe('error');
      });

      expect(result.current.progress).toEqual({
        percent: 0,
        status: 'error',
        details: 'Connection to server lost',
        error: 'Connection error',
      });
      expect(result.current.isDownloading).toBe(false);
    });

    it('should not set error state for AbortError', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      const mockReader = {
        read: vi.fn().mockRejectedValueOnce(abortError),
        cancel: vi.fn(),
      };

      const mockStream = {
        ok: true,
        body: { getReader: () => mockReader },
      };

      mockGamesApi.downloadGame.mockResolvedValueOnce({ success: true });
      mockFetch.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useDownload('game-123'));

      await act(async () => {
        await result.current.startDownload();
      });

      await waitFor(() => {
        expect(result.current.isDownloading).toBe(false);
      });

      // Progress should remain as waiting, not error
      expect(result.current.progress?.status).toBe('waiting');
    });
  });

  describe('cancelDownload', () => {
    it('should abort the fetch request', async () => {
      const events: DownloadProgress[] = [
        { percent: 25, status: 'downloading', details: 'Downloading...' },
      ];
      const mockStream = createMockSSEStream(events);
      mockGamesApi.downloadGame.mockResolvedValueOnce({ success: true });
      mockGamesApi.cancelDownload.mockResolvedValueOnce({ success: true });
      mockFetch.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useDownload('game-123'));

      await act(async () => {
        await result.current.startDownload();
      });

      await act(async () => {
        await result.current.cancelDownload();
      });

      expect(mockAbort).toHaveBeenCalled();
    });

    it('should call gamesApi.cancelDownload', async () => {
      const events: DownloadProgress[] = [
        { percent: 25, status: 'downloading', details: 'Downloading...' },
      ];
      const mockStream = createMockSSEStream(events);
      mockGamesApi.downloadGame.mockResolvedValueOnce({ success: true });
      mockGamesApi.cancelDownload.mockResolvedValueOnce({ success: true });
      mockFetch.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useDownload('game-123'));

      await act(async () => {
        await result.current.startDownload();
      });

      await act(async () => {
        await result.current.cancelDownload();
      });

      expect(mockGamesApi.cancelDownload).toHaveBeenCalledWith('game-123');
    });

    it('should set cancelled progress state', async () => {
      const events: DownloadProgress[] = [
        { percent: 25, status: 'downloading', details: 'Downloading...' },
      ];
      const mockStream = createMockSSEStream(events);
      mockGamesApi.downloadGame.mockResolvedValueOnce({ success: true });
      mockGamesApi.cancelDownload.mockResolvedValueOnce({ success: true });
      mockFetch.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useDownload('game-123'));

      await act(async () => {
        await result.current.startDownload();
      });

      await act(async () => {
        await result.current.cancelDownload();
      });

      expect(result.current.progress).toEqual({
        percent: 0,
        status: 'error',
        details: 'Download cancelled',
        error: 'Cancelled by user',
      });
    });

    it('should set isDownloading to false', async () => {
      const events: DownloadProgress[] = [
        { percent: 25, status: 'downloading', details: 'Downloading...' },
      ];
      const mockStream = createMockSSEStream(events);
      mockGamesApi.downloadGame.mockResolvedValueOnce({ success: true });
      mockGamesApi.cancelDownload.mockResolvedValueOnce({ success: true });
      mockFetch.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useDownload('game-123'));

      await act(async () => {
        await result.current.startDownload();
      });

      await act(async () => {
        await result.current.cancelDownload();
      });

      expect(result.current.isDownloading).toBe(false);
    });

    it('should log error when cancelDownload API fails', async () => {
      const error = new Error('Cancel failed');
      mockGamesApi.cancelDownload.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useDownload('game-123'));

      await expect(
        act(async () => {
          await result.current.cancelDownload();
        })
      ).rejects.toThrow('Cancel failed');

      expect(mockLogger.error).toHaveBeenCalledWith('Error cancelling download:', error);
    });

    it('should throw error when cancelDownload API fails', async () => {
      const error = new Error('Cancel failed');
      mockGamesApi.cancelDownload.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useDownload('game-123'));

      await expect(
        act(async () => {
          await result.current.cancelDownload();
        })
      ).rejects.toThrow('Cancel failed');
    });
  });

  describe('resetProgress', () => {
    it('should reset progress to null', async () => {
      const events: DownloadProgress[] = [
        { percent: 100, status: 'complete', details: 'Done' },
      ];
      const mockStream = createMockSSEStream(events);
      mockGamesApi.downloadGame.mockResolvedValueOnce({ success: true });
      mockFetch.mockResolvedValueOnce(mockStream);

      const { result } = renderHook(() => useDownload('game-123'));

      await act(async () => {
        await result.current.startDownload();
      });

      await waitFor(() => {
        expect(result.current.progress?.status).toBe('complete');
      });

      act(() => {
        result.current.resetProgress();
      });

      expect(result.current.progress).toBeNull();
    });

    it('should set isDownloading to false', async () => {
      const { result } = renderHook(() => useDownload('game-123'));

      // Manually set state for this test
      act(() => {
        result.current.resetProgress();
      });

      expect(result.current.isDownloading).toBe(false);
    });
  });

  describe('cleanup on unmount', () => {
    it('should abort fetch on unmount', async () => {
      const events: DownloadProgress[] = [
        { percent: 25, status: 'downloading', details: 'Downloading...' },
      ];
      const mockStream = createMockSSEStream(events);
      mockGamesApi.downloadGame.mockResolvedValueOnce({ success: true });
      mockFetch.mockResolvedValueOnce(mockStream);

      const { result, unmount } = renderHook(() => useDownload('game-123'));

      await act(async () => {
        await result.current.startDownload();
      });

      unmount();

      expect(mockAbort).toHaveBeenCalled();
    });

    it('should not throw when unmounting without active download', () => {
      const { unmount } = renderHook(() => useDownload('game-123'));

      // Should not throw
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('gameId dependency', () => {
    it('should use correct gameId in API calls', async () => {
      const mockStream = createMockSSEStream([]);
      mockGamesApi.downloadGame.mockResolvedValue({ success: true });
      mockFetch.mockResolvedValue(mockStream);

      const { result, rerender } = renderHook(({ gameId }) => useDownload(gameId), {
        initialProps: { gameId: 'game-1' },
      });

      await act(async () => {
        await result.current.startDownload();
      });

      expect(mockGamesApi.downloadGame).toHaveBeenCalledWith('game-1', undefined);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/games/game-1/download/progress',
        expect.any(Object)
      );

      // Change gameId
      rerender({ gameId: 'game-2' });

      await act(async () => {
        await result.current.startDownload();
      });

      expect(mockGamesApi.downloadGame).toHaveBeenCalledWith('game-2', undefined);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/games/game-2/download/progress',
        expect.any(Object)
      );
    });

    it('should use correct gameId in cancelDownload', async () => {
      mockGamesApi.cancelDownload.mockResolvedValue({ success: true });

      const { result, rerender } = renderHook(({ gameId }) => useDownload(gameId), {
        initialProps: { gameId: 'game-1' },
      });

      await act(async () => {
        await result.current.cancelDownload();
      });

      expect(mockGamesApi.cancelDownload).toHaveBeenCalledWith('game-1');

      rerender({ gameId: 'game-2' });

      await act(async () => {
        await result.current.cancelDownload();
      });

      expect(mockGamesApi.cancelDownload).toHaveBeenCalledWith('game-2');
    });
  });
});
