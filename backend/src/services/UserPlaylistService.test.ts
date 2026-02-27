import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';
import { createTestDatabase, createTestUser } from '../test/helpers';
import { UserPlaylistService } from './UserPlaylistService';

// Mock dependencies
vi.mock('./UserDatabaseService', () => ({
  UserDatabaseService: {
    getDatabase: vi.fn(),
    get: vi.fn(),
    all: vi.fn(),
    run: vi.fn(),
  },
}));

vi.mock('./GameService', () => ({
  GameService: vi.fn().mockImplementation(() => ({
    getGamesByIds: vi.fn().mockResolvedValue([
      { id: 'game1', title: 'Test Game 1' },
      { id: 'game2', title: 'Test Game 2' },
    ]),
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

import { UserDatabaseService } from './UserDatabaseService';

describe('UserPlaylistService', () => {
  let db: BetterSqlite3.Database;
  let playlistService: UserPlaylistService;
  let testUserId: number;

  beforeEach(() => {
    db = createTestDatabase();
    const testUser = createTestUser(db);
    testUserId = testUser.id;

    vi.mocked(UserDatabaseService.getDatabase).mockReturnValue(db);

    playlistService = new UserPlaylistService();
  });

  afterEach(() => {
    if (db.open) {
      db.close();
    }
    vi.clearAllMocks();
  });

  describe('getUserPlaylists', () => {
    it('should return empty array for user with no playlists', () => {
      const result = playlistService.getUserPlaylists(testUserId);
      expect(result).toEqual([]);
    });

    it('should return user playlists', () => {
      playlistService.createPlaylist(testUserId, { title: 'Playlist 1' });
      playlistService.createPlaylist(testUserId, { title: 'Playlist 2' });

      const result = playlistService.getUserPlaylists(testUserId);

      expect(result).toHaveLength(2);
    });

    it('should not return other users playlists', () => {
      const otherUser = createTestUser(db, { username: 'other', email: 'other@test.com' });

      playlistService.createPlaylist(testUserId, { title: 'My Playlist' });
      playlistService.createPlaylist(otherUser.id, { title: 'Other Playlist' });

      const result = playlistService.getUserPlaylists(testUserId);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('My Playlist');
    });
  });

  describe('createPlaylist', () => {
    it('should create a new playlist', () => {
      const result = playlistService.createPlaylist(testUserId, {
        title: 'Test Playlist',
        description: 'A test description',
      });

      expect(result).toBeDefined();
      expect(result.title).toBe('Test Playlist');
      expect(result.description).toBe('A test description');
      expect(result.userId).toBe(testUserId);
    });

    it('should create playlist with optional icon', () => {
      const result = playlistService.createPlaylist(testUserId, {
        title: 'With Icon',
        icon: 'star',
      });

      expect(result.icon).toBe('star');
    });

    it('should initialize game count to 0', () => {
      const result = playlistService.createPlaylist(testUserId, { title: 'Empty' });

      expect(result.gameCount).toBe(0);
    });
  });

  describe('getPlaylistById', () => {
    it('should return playlist by id', () => {
      const created = playlistService.createPlaylist(testUserId, { title: 'Test' });

      const result = playlistService.getPlaylistById(created.id, testUserId);

      expect(result).toBeDefined();
      expect(result?.title).toBe('Test');
    });

    it('should return null for non-existent playlist', () => {
      const result = playlistService.getPlaylistById(999, testUserId);

      expect(result).toBeNull();
    });

    it('should return null for other users playlist', () => {
      const otherUser = createTestUser(db, { username: 'other', email: 'other@test.com' });
      const created = playlistService.createPlaylist(otherUser.id, { title: 'Other' });

      const result = playlistService.getPlaylistById(created.id, testUserId);

      expect(result).toBeNull();
    });
  });

  describe('updatePlaylist', () => {
    it('should update playlist title', () => {
      const created = playlistService.createPlaylist(testUserId, { title: 'Original' });

      const result = playlistService.updatePlaylist(created.id, testUserId, { title: 'Updated' });

      expect(result?.title).toBe('Updated');
    });

    it('should update playlist description', () => {
      const created = playlistService.createPlaylist(testUserId, { title: 'Test' });

      const result = playlistService.updatePlaylist(created.id, testUserId, {
        description: 'New description',
      });

      expect(result?.description).toBe('New description');
    });

    it('should return null for non-existent playlist', () => {
      const result = playlistService.updatePlaylist(999, testUserId, { title: 'Test' });

      expect(result).toBeNull();
    });

    it('should return unchanged playlist when no updates provided', () => {
      const created = playlistService.createPlaylist(testUserId, { title: 'Test' });

      const result = playlistService.updatePlaylist(created.id, testUserId, {});

      expect(result?.title).toBe('Test');
    });
  });

  describe('deletePlaylist', () => {
    it('should delete a playlist', () => {
      const created = playlistService.createPlaylist(testUserId, { title: 'To Delete' });

      const result = playlistService.deletePlaylist(created.id, testUserId);

      expect(result).toBe(true);
      expect(playlistService.getPlaylistById(created.id, testUserId)).toBeNull();
    });

    it('should return false for non-existent playlist', () => {
      const result = playlistService.deletePlaylist(999, testUserId);

      expect(result).toBe(false);
    });

    it('should return false for other users playlist', () => {
      const otherUser = createTestUser(db, { username: 'other', email: 'other@test.com' });
      const created = playlistService.createPlaylist(otherUser.id, { title: 'Other' });

      const result = playlistService.deletePlaylist(created.id, testUserId);

      expect(result).toBe(false);
    });
  });

  describe('addGamesToPlaylist', () => {
    it('should add games to playlist', () => {
      const playlist = playlistService.createPlaylist(testUserId, { title: 'Test' });

      const result = playlistService.addGamesToPlaylist(playlist.id, testUserId, ['game1', 'game2']);

      expect(result).toBe(true);

      const games = playlistService.getPlaylistGames(playlist.id, testUserId);
      expect(games).toHaveLength(2);
    });

    it('should ignore duplicate games', () => {
      const playlist = playlistService.createPlaylist(testUserId, { title: 'Test' });

      playlistService.addGamesToPlaylist(playlist.id, testUserId, ['game1']);
      playlistService.addGamesToPlaylist(playlist.id, testUserId, ['game1', 'game2']);

      const games = playlistService.getPlaylistGames(playlist.id, testUserId);
      expect(games).toHaveLength(2);
    });

    it('should throw error for more than 100 items', () => {
      const playlist = playlistService.createPlaylist(testUserId, { title: 'Test' });
      const gameIds = Array.from({ length: 101 }, (_, i) => `game-${i}`);

      expect(() => playlistService.addGamesToPlaylist(playlist.id, testUserId, gameIds)).toThrow(
        'Maximum of 100 items per batch operation'
      );
    });

    it('should return false for non-existent playlist', () => {
      const result = playlistService.addGamesToPlaylist(999, testUserId, ['game1']);

      expect(result).toBe(false);
    });
  });

  describe('removeGamesFromPlaylist', () => {
    it('should remove games from playlist', () => {
      const playlist = playlistService.createPlaylist(testUserId, { title: 'Test' });
      playlistService.addGamesToPlaylist(playlist.id, testUserId, ['game1', 'game2', 'game3']);

      playlistService.removeGamesFromPlaylist(playlist.id, testUserId, ['game2']);

      const games = playlistService.getPlaylistGames(playlist.id, testUserId);
      expect(games).toHaveLength(2);
    });

    it('should throw error for more than 100 items', () => {
      const playlist = playlistService.createPlaylist(testUserId, { title: 'Test' });
      const gameIds = Array.from({ length: 101 }, (_, i) => `game-${i}`);

      expect(() => playlistService.removeGamesFromPlaylist(playlist.id, testUserId, gameIds)).toThrow(
        'Maximum of 100 items per batch operation'
      );
    });
  });

  describe('reorderGames', () => {
    it('should reorder games', () => {
      const playlist = playlistService.createPlaylist(testUserId, { title: 'Test' });
      playlistService.addGamesToPlaylist(playlist.id, testUserId, ['game1', 'game2', 'game3']);

      playlistService.reorderGames(playlist.id, testUserId, ['game3', 'game1', 'game2']);

      const games = playlistService.getPlaylistGames(playlist.id, testUserId);
      // SQLite returns snake_case column names
      const gameIds = games.map((g) => (g as unknown as { game_id: string }).game_id);
      expect(gameIds[0]).toBe('game3');
      expect(gameIds[1]).toBe('game1');
      expect(gameIds[2]).toBe('game2');
    });

    it('should throw error for more than 100 items', () => {
      const playlist = playlistService.createPlaylist(testUserId, { title: 'Test' });
      const gameIds = Array.from({ length: 101 }, (_, i) => `game-${i}`);

      expect(() => playlistService.reorderGames(playlist.id, testUserId, gameIds)).toThrow(
        'Maximum of 100 items per batch operation'
      );
    });
  });

  describe('getUserPlaylistStats', () => {
    it('should return stats for user', () => {
      playlistService.createPlaylist(testUserId, { title: 'Playlist 1' });
      const playlist2 = playlistService.createPlaylist(testUserId, { title: 'Playlist 2' });
      playlistService.addGamesToPlaylist(playlist2.id, testUserId, ['game1', 'game2']);

      const stats = playlistService.getUserPlaylistStats(testUserId);

      expect(stats.totalPlaylists).toBe(2);
      expect(stats.totalGames).toBe(2);
    });

    it('should return zeros for user with no playlists', () => {
      const stats = playlistService.getUserPlaylistStats(testUserId);

      expect(stats.totalPlaylists).toBe(0);
      expect(stats.totalGames).toBe(0);
    });
  });

  describe('enableSharing', () => {
    it('should enable sharing and generate token', () => {
      const playlist = playlistService.createPlaylist(testUserId, { title: 'Test' });

      const result = playlistService.enableSharing(playlist.id, testUserId);

      expect(result).toBeDefined();
      expect(result?.shareToken).toBeDefined();
      expect(result?.shareToken.length).toBeGreaterThan(0);
    });

    it('should preserve existing token when re-enabling', () => {
      const playlist = playlistService.createPlaylist(testUserId, { title: 'Test' });
      const firstResult = playlistService.enableSharing(playlist.id, testUserId);
      playlistService.disableSharing(playlist.id, testUserId);

      const secondResult = playlistService.enableSharing(playlist.id, testUserId);

      expect(secondResult?.shareToken).toBe(firstResult?.shareToken);
    });

    it('should return null for non-existent playlist', () => {
      const result = playlistService.enableSharing(999, testUserId);

      expect(result).toBeNull();
    });

    it('should set expiry if provided', () => {
      const playlist = playlistService.createPlaylist(testUserId, { title: 'Test' });
      const expiresAt = '2099-12-31T23:59:59Z';

      const result = playlistService.enableSharing(playlist.id, testUserId, { expiresAt });

      expect(result?.expiresAt).toBe(expiresAt);
    });
  });

  describe('disableSharing', () => {
    it('should disable sharing', () => {
      const playlist = playlistService.createPlaylist(testUserId, { title: 'Test' });
      playlistService.enableSharing(playlist.id, testUserId);

      const result = playlistService.disableSharing(playlist.id, testUserId);

      expect(result).toBeDefined();
      expect(result?.isPublic).toBe(0); // SQLite returns 0/1
    });

    it('should return null for non-existent playlist', () => {
      const result = playlistService.disableSharing(999, testUserId);

      expect(result).toBeNull();
    });
  });

  describe('getPlaylistByShareToken', () => {
    it('should return playlist by valid share token', () => {
      const playlist = playlistService.createPlaylist(testUserId, { title: 'Shared' });
      const shareData = playlistService.enableSharing(playlist.id, testUserId);

      const result = playlistService.getPlaylistByShareToken(shareData!.shareToken);

      expect(result).toBeDefined();
      expect(result?.title).toBe('Shared');
    });

    it('should return null for invalid token', () => {
      const result = playlistService.getPlaylistByShareToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null for disabled sharing', () => {
      const playlist = playlistService.createPlaylist(testUserId, { title: 'Test' });
      const shareData = playlistService.enableSharing(playlist.id, testUserId);
      playlistService.disableSharing(playlist.id, testUserId);

      const result = playlistService.getPlaylistByShareToken(shareData!.shareToken);

      expect(result).toBeNull();
    });
  });

  describe('regenerateShareToken', () => {
    it('should generate a new token', () => {
      const playlist = playlistService.createPlaylist(testUserId, { title: 'Test' });
      const firstResult = playlistService.enableSharing(playlist.id, testUserId);

      const secondResult = playlistService.regenerateShareToken(playlist.id, testUserId);

      expect(secondResult?.shareToken).not.toBe(firstResult?.shareToken);
    });

    it('should invalidate old token', () => {
      const playlist = playlistService.createPlaylist(testUserId, { title: 'Test' });
      const firstResult = playlistService.enableSharing(playlist.id, testUserId);
      playlistService.regenerateShareToken(playlist.id, testUserId);

      const result = playlistService.getPlaylistByShareToken(firstResult!.shareToken);

      expect(result).toBeNull();
    });
  });

  describe('cloneSharedPlaylist', () => {
    it('should clone shared playlist', () => {
      const playlist = playlistService.createPlaylist(testUserId, { title: 'Original' });
      playlistService.addGamesToPlaylist(playlist.id, testUserId, ['game1', 'game2']);
      const shareData = playlistService.enableSharing(playlist.id, testUserId);

      const otherUser = createTestUser(db, { username: 'other', email: 'other@test.com' });

      const result = playlistService.cloneSharedPlaylist(shareData!.shareToken, otherUser.id);

      expect(result).toBeDefined();
      expect(result?.title).toBe('Original (Copy)');
      expect(result?.userId).toBe(otherUser.id);
    });

    it('should clone with custom title', () => {
      const playlist = playlistService.createPlaylist(testUserId, { title: 'Original' });
      const shareData = playlistService.enableSharing(playlist.id, testUserId);

      const otherUser = createTestUser(db, { username: 'other', email: 'other@test.com' });

      const result = playlistService.cloneSharedPlaylist(shareData!.shareToken, otherUser.id, 'My Copy');

      expect(result?.title).toBe('My Copy');
    });

    it('should return null for invalid token', () => {
      const result = playlistService.cloneSharedPlaylist('invalid-token', testUserId);

      expect(result).toBeNull();
    });
  });

  describe('isGameInSharedPlaylist', () => {
    it('should return true for game in shared playlist', () => {
      const playlist = playlistService.createPlaylist(testUserId, { title: 'Test' });
      playlistService.addGamesToPlaylist(playlist.id, testUserId, ['game1', 'game2']);
      const shareData = playlistService.enableSharing(playlist.id, testUserId);

      const result = playlistService.isGameInSharedPlaylist(shareData!.shareToken, 'game1');

      expect(result).toBe(true);
    });

    it('should return false for game not in playlist', () => {
      const playlist = playlistService.createPlaylist(testUserId, { title: 'Test' });
      playlistService.addGamesToPlaylist(playlist.id, testUserId, ['game1']);
      const shareData = playlistService.enableSharing(playlist.id, testUserId);

      const result = playlistService.isGameInSharedPlaylist(shareData!.shareToken, 'game2');

      expect(result).toBe(false);
    });

    it('should return false for invalid token', () => {
      const result = playlistService.isGameInSharedPlaylist('invalid-token', 'game1');

      expect(result).toBe(false);
    });
  });

  describe('getUserPlaylistsPaginated', () => {
    it('should return paginated playlists', () => {
      for (let i = 0; i < 5; i++) {
        playlistService.createPlaylist(testUserId, { title: `Playlist ${i}` });
      }

      const result = playlistService.getUserPlaylistsPaginated(testUserId, 1, 2);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(5);
    });

    it('should return empty for user with no playlists', () => {
      const result = playlistService.getUserPlaylistsPaginated(testUserId);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });
});
