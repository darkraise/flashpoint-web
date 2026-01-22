import { UserDatabaseService } from './UserDatabaseService';
import { GameService, Game } from './GameService';
import { logger } from '../utils/logger';

export interface UserPlaylist {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  gameCount: number;
}

export interface PlaylistGame {
  id: number;
  playlistId: number;
  gameId: string;
  orderIndex: number;
  notes: string | null;
  addedAt: string;
}

export interface CreatePlaylistData {
  title: string;
  description?: string;
  icon?: string;
}

export interface UpdatePlaylistData {
  title?: string;
  description?: string;
  icon?: string;
}

export class UserPlaylistService {
  private userDb: typeof UserDatabaseService;
  private gameService: GameService;

  constructor() {
    this.userDb = UserDatabaseService;
    this.gameService = new GameService();
  }

  /**
   * Get all playlists for a user
   */
  getUserPlaylists(userId: number): UserPlaylist[] {
    const db = this.userDb.getDatabase();

    const stmt = db.prepare(`
      SELECT *
      FROM user_playlists
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `);

    return stmt.all(userId) as UserPlaylist[];
  }

  /**
   * Get a specific playlist by ID
   */
  getPlaylistById(playlistId: number, userId: number): UserPlaylist | null {
    const db = this.userDb.getDatabase();

    const stmt = db.prepare(`
      SELECT *
      FROM user_playlists
      WHERE id = ? AND user_id = ?
    `);

    return (stmt.get(playlistId, userId) as UserPlaylist) || null;
  }

  /**
   * Get games in a playlist
   */
  getPlaylistGames(playlistId: number, userId: number): PlaylistGame[] {
    const db = this.userDb.getDatabase();

    // Verify ownership
    const playlist = this.getPlaylistById(playlistId, userId);
    if (!playlist) {
      return [];
    }

    const stmt = db.prepare(`
      SELECT *
      FROM user_playlist_games
      WHERE playlist_id = ?
      ORDER BY order_index ASC
    `);

    return stmt.all(playlistId) as PlaylistGame[];
  }

  /**
   * Get games in a playlist with full game data
   */
  async getPlaylistGamesWithData(playlistId: number, userId: number): Promise<Game[]> {
    const db = this.userDb.getDatabase();

    // Verify ownership
    const playlist = this.getPlaylistById(playlistId, userId);
    if (!playlist) {
      return [];
    }

    const stmt = db.prepare(`
      SELECT game_id
      FROM user_playlist_games
      WHERE playlist_id = ?
      ORDER BY order_index ASC
    `);

    const playlistGames = stmt.all(playlistId) as { game_id: string }[];

    if (playlistGames.length === 0) {
      return [];
    }

    // Get full game data for these IDs
    const gameIds = playlistGames.map((pg) => pg.game_id);
    const games = await this.gameService.getGamesByIds(gameIds);

    return games;
  }

  /**
   * Create a new playlist
   */
  createPlaylist(userId: number, data: CreatePlaylistData): UserPlaylist {
    const db = this.userDb.getDatabase();

    const stmt = db.prepare(`
      INSERT INTO user_playlists (user_id, title, description, icon)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      data.title,
      data.description || null,
      data.icon || null
    );

    logger.info(`Created playlist "${data.title}" for user ${userId}`);

    return this.getPlaylistById(result.lastInsertRowid as number, userId)!;
  }

  /**
   * Update a playlist
   */
  updatePlaylist(
    playlistId: number,
    userId: number,
    data: UpdatePlaylistData
  ): UserPlaylist | null {
    const db = this.userDb.getDatabase();

    // Verify ownership
    const playlist = this.getPlaylistById(playlistId, userId);
    if (!playlist) {
      return null;
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.icon !== undefined) {
      updates.push('icon = ?');
      values.push(data.icon);
    }

    if (updates.length === 0) {
      return playlist;
    }

    updates.push('updated_at = datetime(\'now\')');
    values.push(playlistId, userId);

    const stmt = db.prepare(`
      UPDATE user_playlists
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `);

    stmt.run(...values);

    logger.info(`Updated playlist ${playlistId}`);

    return this.getPlaylistById(playlistId, userId);
  }

  /**
   * Delete a playlist
   */
  deletePlaylist(playlistId: number, userId: number): boolean {
    const db = this.userDb.getDatabase();

    // Verify ownership
    const playlist = this.getPlaylistById(playlistId, userId);
    if (!playlist) {
      return false;
    }

    const stmt = db.prepare(`
      DELETE FROM user_playlists
      WHERE id = ? AND user_id = ?
    `);

    stmt.run(playlistId, userId);

    logger.info(`Deleted playlist ${playlistId}`);

    return true;
  }

  /**
   * Add games to a playlist
   */
  addGamesToPlaylist(playlistId: number, userId: number, gameIds: string[]): boolean {
    const db = this.userDb.getDatabase();

    // Verify ownership
    const playlist = this.getPlaylistById(playlistId, userId);
    if (!playlist) {
      return false;
    }

    // Get current max order index
    const maxOrderStmt = db.prepare(`
      SELECT COALESCE(MAX(order_index), -1) as maxOrder
      FROM user_playlist_games
      WHERE playlist_id = ?
    `);

    let orderIndex = (maxOrderStmt.get(playlistId) as any).maxOrder + 1;

    // Insert games (ignore duplicates)
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO user_playlist_games (playlist_id, game_id, order_index)
      VALUES (?, ?, ?)
    `);

    const transaction = db.transaction((gameIds: string[]) => {
      for (const gameId of gameIds) {
        insertStmt.run(playlistId, gameId, orderIndex++);
      }
    });

    transaction(gameIds);

    logger.info(`Added ${gameIds.length} games to playlist ${playlistId}`);

    return true;
  }

  /**
   * Remove games from playlist
   */
  removeGamesFromPlaylist(playlistId: number, userId: number, gameIds: string[]): boolean {
    const db = this.userDb.getDatabase();

    // Verify ownership
    const playlist = this.getPlaylistById(playlistId, userId);
    if (!playlist) {
      return false;
    }

    const stmt = db.prepare(`
      DELETE FROM user_playlist_games
      WHERE playlist_id = ? AND game_id = ?
    `);

    const transaction = db.transaction((gameIds: string[]) => {
      for (const gameId of gameIds) {
        stmt.run(playlistId, gameId);
      }
    });

    transaction(gameIds);

    logger.info(`Removed ${gameIds.length} games from playlist ${playlistId}`);

    return true;
  }

  /**
   * Reorder games in playlist
   */
  reorderGames(playlistId: number, userId: number, gameIdOrder: string[]): boolean {
    const db = this.userDb.getDatabase();

    // Verify ownership
    const playlist = this.getPlaylistById(playlistId, userId);
    if (!playlist) {
      return false;
    }

    const stmt = db.prepare(`
      UPDATE user_playlist_games
      SET order_index = ?
      WHERE playlist_id = ? AND game_id = ?
    `);

    const transaction = db.transaction((gameIdOrder: string[]) => {
      gameIdOrder.forEach((gameId, index) => {
        stmt.run(index, playlistId, gameId);
      });
    });

    transaction(gameIdOrder);

    logger.info(`Reordered games in playlist ${playlistId}`);

    return true;
  }

  /**
   * Copy Flashpoint playlist to user playlist
   */
  async copyFlashpointPlaylist(
    userId: number,
    flashpointPlaylistId: string,
    newTitle?: string
  ): Promise<UserPlaylist | null> {
    try {
      const { PlaylistService } = await import('./PlaylistService');
      const playlistService = new PlaylistService();
      const flashpointPlaylist = await playlistService.getPlaylistById(flashpointPlaylistId);

      if (!flashpointPlaylist || !flashpointPlaylist.games) {
        logger.warn(`Flashpoint playlist ${flashpointPlaylistId} not found`);
        return null;
      }

      // Create new user playlist
      const userPlaylist = this.createPlaylist(userId, {
        title: newTitle || `${flashpointPlaylist.title} (Copy)`,
        description: flashpointPlaylist.description || undefined
      });

      // Extract game IDs from flashpoint playlist
      const gameIds = flashpointPlaylist.games.map((game: any) => game.id);

      // Add all games
      this.addGamesToPlaylist(userPlaylist.id, userId, gameIds);

      logger.info(`Copied Flashpoint playlist "${flashpointPlaylist.title}" to user ${userId}`);

      return this.getPlaylistById(userPlaylist.id, userId);
    } catch (error) {
      logger.error(`Error copying Flashpoint playlist: ${error}`);
      return null;
    }
  }

  /**
   * Get playlist statistics for a user
   */
  getUserPlaylistStats(userId: number): { totalPlaylists: number; totalGames: number } {
    const db = this.userDb.getDatabase();

    const stmt = db.prepare(`
      SELECT
        COUNT(*) as totalPlaylists,
        COALESCE(SUM(game_count), 0) as totalGames
      FROM user_playlists
      WHERE user_id = ?
    `);

    return stmt.get(userId) as { totalPlaylists: number; totalGames: number };
  }
}
