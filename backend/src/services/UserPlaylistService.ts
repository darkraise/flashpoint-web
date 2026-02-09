import { UserDatabaseService } from './UserDatabaseService';
import { GameService, Game } from './GameService';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import crypto from 'crypto';

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
  shareToken?: string | null;
  shareExpiresAt?: string | null;
  showOwner?: boolean;
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

export interface EnableSharingOptions {
  expiresAt?: string | null;
  showOwner?: boolean;
}

export interface ShareLinkData {
  shareToken: string;
  expiresAt: string | null;
  showOwner: boolean;
}

export class UserPlaylistService {
  private userDb: typeof UserDatabaseService;
  private gameService: GameService;

  // Maximum items allowed in batch operations
  private static readonly MAX_BATCH_SIZE = 100;

  // Reusable SELECT columns with aliases for type consistency
  private static readonly PLAYLIST_COLUMNS = `
    id,
    user_id AS userId,
    title,
    description,
    icon,
    created_at AS createdAt,
    updated_at AS updatedAt,
    is_public AS isPublic,
    game_count AS gameCount,
    share_token AS shareToken,
    share_expires_at AS shareExpiresAt,
    show_owner AS showOwner
  `.trim();

  constructor() {
    this.userDb = UserDatabaseService;
    this.gameService = new GameService();
  }

  getUserPlaylists(userId: number): UserPlaylist[] {
    const db = this.userDb.getDatabase();

    const stmt = db.prepare(`
      SELECT ${UserPlaylistService.PLAYLIST_COLUMNS}
      FROM user_playlists
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `);

    return stmt.all(userId) as UserPlaylist[];
  }

  getPlaylistById(playlistId: number, userId: number): UserPlaylist | null {
    const db = this.userDb.getDatabase();

    const stmt = db.prepare(`
      SELECT ${UserPlaylistService.PLAYLIST_COLUMNS}
      FROM user_playlists
      WHERE id = ? AND user_id = ?
    `);

    return (stmt.get(playlistId, userId) as UserPlaylist) || null;
  }

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

  createPlaylist(userId: number, data: CreatePlaylistData): UserPlaylist {
    const db = this.userDb.getDatabase();

    const stmt = db.prepare(`
      INSERT INTO user_playlists (user_id, title, description, icon)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(userId, data.title, data.description || null, data.icon || null);

    logger.info(`Created playlist "${data.title}" for user ${userId}`);

    return this.getPlaylistById(result.lastInsertRowid as number, userId)!;
  }

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
    const values: (string | number | null)[] = [];

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

    updates.push("updated_at = datetime('now')");
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

  addGamesToPlaylist(playlistId: number, userId: number, gameIds: string[]): boolean {
    // Validate batch size
    if (gameIds.length > UserPlaylistService.MAX_BATCH_SIZE) {
      throw new AppError(
        400,
        `Maximum of ${UserPlaylistService.MAX_BATCH_SIZE} items per batch operation`
      );
    }

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

    let orderIndex = (maxOrderStmt.get(playlistId) as { maxOrder: number }).maxOrder + 1;

    // Insert games (ignore duplicates)
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO user_playlist_games (playlist_id, game_id, order_index)
      VALUES (?, ?, ?)
    `);

    const transaction = db.transaction((gameIds: string[]) => {
      for (const gameId of gameIds) {
        insertStmt.run(playlistId, gameId, orderIndex++);
      }

      // Update game_count to reflect actual count
      const countResult = db
        .prepare('SELECT COUNT(*) as count FROM user_playlist_games WHERE playlist_id = ?')
        .get(playlistId) as { count: number };
      db.prepare('UPDATE user_playlists SET game_count = ? WHERE id = ?').run(
        countResult.count,
        playlistId
      );
    });

    transaction(gameIds);

    logger.info(`Added ${gameIds.length} games to playlist ${playlistId}`);

    return true;
  }

  removeGamesFromPlaylist(playlistId: number, userId: number, gameIds: string[]): boolean {
    // Validate batch size
    if (gameIds.length > UserPlaylistService.MAX_BATCH_SIZE) {
      throw new AppError(
        400,
        `Maximum of ${UserPlaylistService.MAX_BATCH_SIZE} items per batch operation`
      );
    }

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

      // Update game_count to reflect actual count
      const countResult = db
        .prepare('SELECT COUNT(*) as count FROM user_playlist_games WHERE playlist_id = ?')
        .get(playlistId) as { count: number };
      db.prepare('UPDATE user_playlists SET game_count = ? WHERE id = ?').run(
        countResult.count,
        playlistId
      );
    });

    transaction(gameIds);

    logger.info(`Removed ${gameIds.length} games from playlist ${playlistId}`);

    return true;
  }

  reorderGames(playlistId: number, userId: number, gameIdOrder: string[]): boolean {
    // Validate batch size
    if (gameIdOrder.length > UserPlaylistService.MAX_BATCH_SIZE) {
      throw new AppError(
        400,
        `Maximum of ${UserPlaylistService.MAX_BATCH_SIZE} items per batch operation`
      );
    }

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
        description: flashpointPlaylist.description || undefined,
      });

      // Extract game IDs from flashpoint playlist
      const gameIds = flashpointPlaylist.games.map((game) => game.id);

      // Add all games
      this.addGamesToPlaylist(userPlaylist.id, userId, gameIds);

      logger.info(`Copied Flashpoint playlist "${flashpointPlaylist.title}" to user ${userId}`);

      return this.getPlaylistById(userPlaylist.id, userId);
    } catch (error) {
      logger.error(`Error copying Flashpoint playlist: ${error}`);
      return null;
    }
  }

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

  /**
   * Enable sharing for a playlist
   * Generates share token if needed, sets is_public=true
   */
  enableSharing(
    playlistId: number,
    userId: number,
    options: EnableSharingOptions = {}
  ): ShareLinkData | null {
    const db = this.userDb.getDatabase();

    // Verify ownership
    const playlist = this.getPlaylistById(playlistId, userId);
    if (!playlist) {
      logger.warn(
        `Cannot enable sharing for playlist ${playlistId}: not found or not owned by user ${userId}`
      );
      return null;
    }

    // Generate token if missing, otherwise reuse existing token
    const shareToken = playlist.shareToken || crypto.randomUUID();

    // Update database
    const stmt = db.prepare(`
      UPDATE user_playlists
      SET is_public = 1,
          share_token = ?,
          share_expires_at = ?,
          show_owner = ?,
          updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `);

    stmt.run(shareToken, options.expiresAt || null, options.showOwner ? 1 : 0, playlistId, userId);

    logger.info(`Enabled sharing for playlist ${playlistId} (user ${userId})`);

    return {
      shareToken,
      expiresAt: options.expiresAt || null,
      showOwner: options.showOwner || false,
    };
  }

  /**
   * Disable sharing for a playlist (sets is_public=false)
   * Preserves token for re-enabling later
   */
  disableSharing(playlistId: number, userId: number): UserPlaylist | null {
    const db = this.userDb.getDatabase();

    // Verify ownership
    const playlist = this.getPlaylistById(playlistId, userId);
    if (!playlist) {
      logger.warn(
        `Cannot disable sharing for playlist ${playlistId}: not found or not owned by user ${userId}`
      );
      return null;
    }

    const stmt = db.prepare(`
      UPDATE user_playlists
      SET is_public = 0,
          updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `);

    stmt.run(playlistId, userId);

    logger.info(`Disabled sharing for playlist ${playlistId} (user ${userId})`);

    return this.getPlaylistById(playlistId, userId);
  }

  /**
   * Regenerate share token (invalidates old links)
   */
  regenerateShareToken(playlistId: number, userId: number): ShareLinkData | null {
    const db = this.userDb.getDatabase();

    // Verify ownership
    const playlist = this.getPlaylistById(playlistId, userId);
    if (!playlist) {
      logger.warn(
        `Cannot regenerate token for playlist ${playlistId}: not found or not owned by user ${userId}`
      );
      return null;
    }

    // Generate new token
    const newToken = crypto.randomUUID();

    const stmt = db.prepare(`
      UPDATE user_playlists
      SET share_token = ?,
          updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `);

    stmt.run(newToken, playlistId, userId);

    logger.info(`Regenerated share token for playlist ${playlistId} (user ${userId})`);

    return {
      shareToken: newToken,
      expiresAt: playlist.shareExpiresAt || null,
      showOwner: playlist.showOwner || false,
    };
  }

  /**
   * Update share settings (expiry, show_owner) without regenerating token
   */
  updateShareSettings(
    playlistId: number,
    userId: number,
    options: EnableSharingOptions
  ): ShareLinkData | null {
    const db = this.userDb.getDatabase();

    // Verify ownership
    const playlist = this.getPlaylistById(playlistId, userId);
    if (!playlist) {
      logger.warn(
        `Cannot update share settings for playlist ${playlistId}: not found or not owned by user ${userId}`
      );
      return null;
    }

    if (!playlist.shareToken) {
      logger.warn(`Cannot update share settings for playlist ${playlistId}: sharing not enabled`);
      return null;
    }

    const stmt = db.prepare(`
      UPDATE user_playlists
      SET share_expires_at = ?,
          show_owner = ?,
          updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `);

    stmt.run(
      options.expiresAt !== undefined ? options.expiresAt : playlist.shareExpiresAt,
      options.showOwner !== undefined ? (options.showOwner ? 1 : 0) : playlist.showOwner ? 1 : 0,
      playlistId,
      userId
    );

    logger.info(`Updated share settings for playlist ${playlistId} (user ${userId})`);

    return {
      shareToken: playlist.shareToken,
      expiresAt:
        options.expiresAt !== undefined ? options.expiresAt : playlist.shareExpiresAt || null,
      showOwner: options.showOwner !== undefined ? options.showOwner : playlist.showOwner || false,
    };
  }

  /**
   * Get playlist by share token (no ownership check)
   * Validates token, expiry, and is_public flag
   */
  getPlaylistByShareToken(shareToken: string): UserPlaylist | null {
    const db = this.userDb.getDatabase();

    const stmt = db.prepare(`
      SELECT ${UserPlaylistService.PLAYLIST_COLUMNS}
      FROM user_playlists
      WHERE share_token = ?
        AND is_public = 1
        AND (share_expires_at IS NULL OR share_expires_at > datetime('now'))
    `);

    const playlist = stmt.get(shareToken) as UserPlaylist | undefined;

    if (!playlist) {
      logger.debug(
        `Shared playlist not found or expired for token: ${shareToken.substring(0, 8)}...`
      );
      return null;
    }

    return playlist;
  }

  /**
   * Check if a game is in a shared playlist
   * Used for validating shared access to individual games
   */
  isGameInSharedPlaylist(shareToken: string, gameId: string): boolean {
    const db = this.userDb.getDatabase();

    // First validate the share token
    const playlist = this.getPlaylistByShareToken(shareToken);
    if (!playlist) {
      return false;
    }

    // Check if game is in the playlist
    const stmt = db.prepare(`
      SELECT 1
      FROM user_playlist_games
      WHERE playlist_id = ? AND game_id = ?
      LIMIT 1
    `);

    const result = stmt.get(playlist.id, gameId);
    return !!result;
  }

  /**
   * Get games for shared playlist (no ownership check)
   */
  async getSharedPlaylistGames(shareToken: string): Promise<Game[]> {
    const db = this.userDb.getDatabase();

    // Validate share token first
    const playlist = this.getPlaylistByShareToken(shareToken);
    if (!playlist) {
      logger.warn(`Cannot get games for shared playlist: token invalid or expired`);
      return [];
    }

    const stmt = db.prepare(`
      SELECT game_id
      FROM user_playlist_games
      WHERE playlist_id = ?
      ORDER BY order_index ASC
    `);

    const playlistGames = stmt.all(playlist.id) as { game_id: string }[];

    if (playlistGames.length === 0) {
      return [];
    }

    // Get full game data for these IDs
    const gameIds = playlistGames.map((pg) => pg.game_id);
    const games = await this.gameService.getGamesByIds(gameIds);

    return games;
  }

  /**
   * Clone shared playlist to user's account
   * Creates new playlist with same title (+ " (Copy)"), description, icon
   * Copies all games with same order
   */
  cloneSharedPlaylist(shareToken: string, userId: number, newTitle?: string): UserPlaylist | null {
    const db = this.userDb.getDatabase();

    // Get shared playlist
    const sourcePlaylist = this.getPlaylistByShareToken(shareToken);
    if (!sourcePlaylist) {
      logger.warn(`Cannot clone shared playlist: token invalid or expired`);
      return null;
    }

    // Wrap create + game inserts in transaction to ensure atomicity
    const newPlaylistId = db.transaction(() => {
      // Create new playlist
      const title = newTitle ?? `${sourcePlaylist.title} (Copy)`;
      const now = new Date().toISOString();
      const result = db
        .prepare(
          `INSERT INTO user_playlists (user_id, title, description, icon, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(
          userId,
          title,
          sourcePlaylist.description || null,
          sourcePlaylist.icon || null,
          now,
          now
        );

      const playlistId = result.lastInsertRowid as number;

      // Copy games with same order
      const gamesStmt = db.prepare(`
        SELECT game_id, order_index, notes
        FROM user_playlist_games
        WHERE playlist_id = ?
        ORDER BY order_index
      `);

      const games = gamesStmt.all(sourcePlaylist.id) as {
        game_id: string;
        order_index: number;
        notes: string | null;
      }[];

      if (games.length > 0) {
        const insertStmt = db.prepare(`
          INSERT INTO user_playlist_games (playlist_id, game_id, order_index, notes)
          VALUES (?, ?, ?, ?)
        `);

        for (const game of games) {
          insertStmt.run(playlistId, game.game_id, game.order_index, game.notes);
        }
      }

      // Set game_count on the cloned playlist
      db.prepare('UPDATE user_playlists SET game_count = ? WHERE id = ?').run(
        games.length,
        playlistId
      );

      return playlistId;
    })();

    logger.info(
      `Cloned shared playlist "${sourcePlaylist.title}" to user ${userId} as "${newTitle || `${sourcePlaylist.title} (Copy)`}"`
    );

    return this.getPlaylistById(newPlaylistId, userId);
  }
}
