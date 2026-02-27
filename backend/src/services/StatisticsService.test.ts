import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StatisticsService } from './StatisticsService';

// Mock dependencies
vi.mock('./DatabaseService', () => ({
  DatabaseService: {
    get: vi.fn(),
    all: vi.fn(),
  },
}));

vi.mock('./PlaylistService', () => ({
  PlaylistService: vi.fn().mockImplementation(() => ({
    getAllPlaylists: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { DatabaseService } from './DatabaseService';
import { PlaylistService } from './PlaylistService';

describe('StatisticsService', () => {
  let statisticsService: StatisticsService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock responses
    vi.mocked(DatabaseService.get).mockImplementation((_query: string) => {
      return { count: 0 };
    });

    vi.mocked(DatabaseService.all).mockReturnValue([]);

    statisticsService = new StatisticsService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getStatistics', () => {
    it('should return statistics object', async () => {
      const stats = await statisticsService.getStatistics();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalGames');
      expect(stats).toHaveProperty('totalAnimations');
      expect(stats).toHaveProperty('totalPlatforms');
      expect(stats).toHaveProperty('webPlayableGames');
      expect(stats).toHaveProperty('totalPlaylists');
      expect(stats).toHaveProperty('totalTags');
    });

    it('should query game counts', async () => {
      vi.mocked(DatabaseService.get)
        .mockReturnValueOnce({ count: 100 }) // totalGames
        .mockReturnValueOnce({ count: 50 }) // totalAnimations
        .mockReturnValueOnce({ count: 10 }) // totalPlatforms
        .mockReturnValueOnce({ count: 75 }); // webPlayableGames

      const stats = await statisticsService.getStatistics();

      expect(stats.totalGames).toBe(100);
      expect(stats.totalAnimations).toBe(50);
      expect(stats.totalPlatforms).toBe(10);
      expect(stats.webPlayableGames).toBe(75);
    });

    it('should count distinct tags from tagsStr', async () => {
      vi.mocked(DatabaseService.get)
        .mockReturnValue({ count: 0 });

      vi.mocked(DatabaseService.all).mockReturnValue([
        { tagsStr: 'Action; Adventure; RPG' },
        { tagsStr: 'Action; Puzzle' },
        { tagsStr: 'Adventure; Strategy' },
      ]);

      const stats = await statisticsService.getStatistics();

      // Unique tags: Action, Adventure, RPG, Puzzle, Strategy = 5
      expect(stats.totalTags).toBe(5);
    });

    it('should get playlist count from PlaylistService', async () => {
      const mockPlaylistService = {
        getAllPlaylists: vi.fn().mockResolvedValue([
          { id: '1', title: 'Playlist 1' },
          { id: '2', title: 'Playlist 2' },
          { id: '3', title: 'Playlist 3' },
        ]),
      };

      vi.mocked(PlaylistService).mockImplementation(() => mockPlaylistService as unknown as PlaylistService);

      statisticsService = new StatisticsService();
      const stats = await statisticsService.getStatistics();

      expect(stats.totalPlaylists).toBe(3);
    });

    it('should cache statistics for 5 minutes', async () => {
      vi.mocked(DatabaseService.get)
        .mockReturnValueOnce({ count: 100 })
        .mockReturnValueOnce({ count: 50 })
        .mockReturnValueOnce({ count: 10 })
        .mockReturnValueOnce({ count: 75 });

      // First call
      const stats1 = await statisticsService.getStatistics();

      // Reset mocks
      vi.mocked(DatabaseService.get).mockClear();

      // Second call should use cache
      const stats2 = await statisticsService.getStatistics();

      expect(stats1).toEqual(stats2);
      // DatabaseService.get should not be called again due to caching
      expect(vi.mocked(DatabaseService.get)).not.toHaveBeenCalled();
    });

    it('should handle null count results', async () => {
      vi.mocked(DatabaseService.get).mockReturnValue(null);

      const stats = await statisticsService.getStatistics();

      expect(stats.totalGames).toBe(0);
      expect(stats.totalAnimations).toBe(0);
      expect(stats.totalPlatforms).toBe(0);
      expect(stats.webPlayableGames).toBe(0);
    });

    it('should handle errors gracefully for tags', async () => {
      vi.mocked(DatabaseService.get).mockReturnValue({ count: 10 });

      // Make tags query throw
      vi.mocked(DatabaseService.all).mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const stats = await statisticsService.getStatistics();

      expect(stats.totalTags).toBe(0);
    });

    it('should handle errors gracefully for playlists', async () => {
      const mockPlaylistService = {
        getAllPlaylists: vi.fn().mockRejectedValue(new Error('Failed to load')),
      };

      vi.mocked(PlaylistService).mockImplementation(() => mockPlaylistService as unknown as PlaylistService);

      statisticsService = new StatisticsService();
      const stats = await statisticsService.getStatistics();

      expect(stats.totalPlaylists).toBe(0);
    });
  });
});
