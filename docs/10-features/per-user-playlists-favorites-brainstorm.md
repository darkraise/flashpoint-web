# Per-User Playlists and Favorites - Implementation Plan

**Team Members:**
- Product Manager: Requirements and User Stories
- Backend Developer: Database and API Design
- Frontend Developer: UI/UX and State Management
- Business Analyst: Migration Strategy
- Architecture Reviewer: Overall System Design

**Date:** 2026-01-19
**Status:** Brainstorming Phase

---

## 1. Product Manager - Requirements & User Stories

### Executive Summary

This feature transforms the Flashpoint Web application from a shared playlist system to a personalized experience where each user can create and manage their own playlists and favorites while preserving existing Flashpoint community playlists.

### User Stories

#### Epic 1: Per-User Playlists

**US-1.1: Create Personal Playlist**
```
As a logged-in user
I want to create my own playlists
So that I can organize games according to my preferences
```
- **Acceptance Criteria:**
  - User can create playlist with title, description, and optional icon
  - Playlist is private to the user by default
  - Playlist appears in user's playlist list immediately
  - System validates title is not empty (max 255 chars)
  - User must have `playlists.create` permission

**US-1.2: View My Playlists**
```
As a logged-in user
I want to see all my playlists separate from Flashpoint playlists
So that I can distinguish between my personal collections and curated content
```
- **Acceptance Criteria:**
  - User sees two sections: "My Playlists" and "Flashpoint Playlists"
  - My Playlists shows only user-created playlists
  - Flashpoint Playlists shows system/community playlists
  - Each section is collapsible/expandable
  - Playlists show game count

**US-1.3: Add Games to My Playlist**
```
As a logged-in user
I want to add games to my playlists from game details or browse view
So that I can quickly organize games I'm interested in
```
- **Acceptance Criteria:**
  - "Add to Playlist" button on game card/details
  - Modal shows list of user's playlists with checkboxes
  - Can create new playlist from modal
  - Duplicate prevention (no game added twice to same playlist)
  - Success notification shown

**US-1.4: Remove Games from My Playlist**
```
As a logged-in user
I want to remove games from my playlists
So that I can keep my playlists up to date
```
- **Acceptance Criteria:**
  - "Remove from Playlist" button in playlist view
  - Confirmation dialog for removal
  - Game removed immediately from view
  - Success notification shown

**US-1.5: Edit My Playlist**
```
As a logged-in user
I want to edit my playlist title, description, and icon
So that I can update it as my collection evolves
```
- **Acceptance Criteria:**
  - Edit button on playlist view (owner only)
  - Modal with form fields
  - Validation on title field
  - Changes reflected immediately
  - User must have `playlists.update` permission

**US-1.6: Delete My Playlist**
```
As a logged-in user
I want to delete my playlists
So that I can remove collections I no longer need
```
- **Acceptance Criteria:**
  - Delete button on playlist view (owner only)
  - Confirmation dialog with playlist name
  - Playlist removed from user's list
  - User must have `playlists.delete` permission

**US-1.7: Reorder Games in Playlist**
```
As a logged-in user
I want to reorder games in my playlist
So that I can organize them by preference or playthrough order
```
- **Acceptance Criteria:**
  - Drag-and-drop support in playlist view
  - Arrow buttons for keyboard/mobile support
  - Order persisted immediately
  - Visual feedback during drag

#### Epic 2: Favorites System

**US-2.1: Mark Game as Favorite**
```
As a logged-in user
I want to mark games as favorites
So that I can quickly access my most-loved games
```
- **Acceptance Criteria:**
  - Heart icon button on game card and details page
  - Icon toggles between filled (favorited) and outline (not favorited)
  - State persists across sessions
  - User must be authenticated

**US-2.2: View My Favorites**
```
As a logged-in user
I want to see all my favorite games in one place
So that I can easily browse and play them
```
- **Acceptance Criteria:**
  - "Favorites" section in sidebar navigation
  - Shows all favorited games in grid/list view
  - Supports same filters as Browse view
  - Shows favorite count in sidebar badge
  - Empty state message when no favorites

**US-2.3: Remove from Favorites**
```
As a logged-in user
I want to unfavorite games
So that I can manage my favorites list
```
- **Acceptance Criteria:**
  - Click heart icon again to unfavorite
  - Game removed from Favorites view
  - Confirmation not required (easy toggle)
  - Visual feedback on toggle

**US-2.4: Quick Add Favorites to Playlist**
```
As a logged-in user
I want to add all my favorites to a playlist
So that I can create organized collections from my favorites
```
- **Acceptance Criteria:**
  - "Add All to Playlist" button in Favorites view
  - Select destination playlist or create new
  - Duplicates automatically skipped
  - Success notification with count

#### Epic 3: Flashpoint Playlist Preservation

**US-3.1: View Flashpoint Playlists**
```
As any user (authenticated or guest)
I want to browse curated Flashpoint playlists
So that I can discover games organized by the community
```
- **Acceptance Criteria:**
  - "Flashpoint Playlists" section always visible
  - Shows all playlists from Flashpoint directory
  - Each playlist shows "Flashpoint Playlist" badge
  - Read-only view (no edit/delete for users)
  - Same game grid/list view as user playlists

**US-3.2: Import Flashpoint Playlist to My Playlists**
```
As a logged-in user
I want to copy a Flashpoint playlist to my playlists
So that I can customize curated collections
```
- **Acceptance Criteria:**
  - "Copy to My Playlists" button on Flashpoint playlists
  - Creates new user playlist with same games
  - User can rename during copy
  - Original Flashpoint playlist unchanged
  - Success notification shown

**US-3.3: Download Community Playlists**
```
As a logged-in user
I want to download community playlists from Flashpoint Archive
So that I can access additional curated collections
```
- **Acceptance Criteria:**
  - Existing CommunityPlaylistService preserved
  - Downloaded playlists appear as Flashpoint Playlists
  - Badge shows "Community" source
  - Same read-only behavior
  - User must have `playlists.create` permission

#### Epic 4: Admin Management

**US-4.1: View All User Playlists**
```
As an admin
I want to view all user playlists
So that I can monitor content and manage the system
```
- **Acceptance Criteria:**
  - Admin panel shows all playlists with owner info
  - Filterable by user, title, creation date
  - Shows game count and last modified date
  - User must have `admin` role

**US-4.2: Delete User Playlists**
```
As an admin
I want to delete inappropriate user playlists
So that I can moderate content
```
- **Acceptance Criteria:**
  - Delete button in admin panel
  - Confirmation dialog required
  - Activity log entry created
  - User notified via system message (future feature)

### Success Metrics

1. **User Engagement**
   - 70% of active users create at least 1 playlist within 30 days
   - 85% of active users use favorites feature
   - Average 5+ games per user playlist

2. **System Performance**
   - Playlist operations complete in <200ms
   - Favorites toggle completes in <100ms
   - No impact on browse/search performance

3. **User Satisfaction**
   - Positive feedback on personalization features
   - No complaints about Flashpoint playlist preservation
   - Intuitive UI requires no documentation

### Feature Flags

Implement system settings for gradual rollout:
- `features.enableUserPlaylists` (boolean): Enable/disable user playlists
- `features.enableFavorites` (boolean): Enable/disable favorites feature
- `features.enablePlaylistSharing` (boolean): Future feature flag for sharing

---

## 2. Backend Developer - Database & API Design

### Database Schema Design

#### New Tables in user.db

**Table: user_playlists**
```sql
CREATE TABLE IF NOT EXISTS user_playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_public BOOLEAN NOT NULL DEFAULT 0, -- Future feature: public sharing
  game_count INTEGER NOT NULL DEFAULT 0, -- Denormalized for performance

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  -- Constraints
  CHECK (length(title) > 0 AND length(title) <= 255)
);

CREATE INDEX IF NOT EXISTS idx_user_playlists_user_id ON user_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_playlists_created_at ON user_playlists(created_at);
CREATE INDEX IF NOT EXISTS idx_user_playlists_title ON user_playlists(title);
```

**Table: user_playlist_games**
```sql
CREATE TABLE IF NOT EXISTS user_playlist_games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id INTEGER NOT NULL,
  game_id TEXT NOT NULL, -- References game.id from flashpoint.sqlite
  order_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT, -- User notes for this game in playlist
  added_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (playlist_id) REFERENCES user_playlists(id) ON DELETE CASCADE,

  -- Prevent duplicate games in same playlist
  UNIQUE(playlist_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_user_playlist_games_playlist_id ON user_playlist_games(playlist_id);
CREATE INDEX IF NOT EXISTS idx_user_playlist_games_game_id ON user_playlist_games(game_id);
CREATE INDEX IF NOT EXISTS idx_user_playlist_games_order ON user_playlist_games(playlist_id, order_index);
```

**Table: user_favorites**
```sql
CREATE TABLE IF NOT EXISTS user_favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game_id TEXT NOT NULL, -- References game.id from flashpoint.sqlite
  added_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

  -- Prevent duplicate favorites
  UNIQUE(user_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_game_id ON user_favorites(game_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_added_at ON user_favorites(added_at);
```

**Triggers for game_count maintenance**
```sql
-- Increment game_count when game added
CREATE TRIGGER IF NOT EXISTS trg_playlist_games_insert
AFTER INSERT ON user_playlist_games
BEGIN
  UPDATE user_playlists
  SET game_count = game_count + 1,
      updated_at = datetime('now')
  WHERE id = NEW.playlist_id;
END;

-- Decrement game_count when game removed
CREATE TRIGGER IF NOT EXISTS trg_playlist_games_delete
AFTER DELETE ON user_playlist_games
BEGIN
  UPDATE user_playlists
  SET game_count = game_count - 1,
      updated_at = datetime('now')
  WHERE id = OLD.playlist_id;
END;

-- Update updated_at when game order changes
CREATE TRIGGER IF NOT EXISTS trg_playlist_games_update
AFTER UPDATE ON user_playlist_games
BEGIN
  UPDATE user_playlists
  SET updated_at = datetime('now')
  WHERE id = NEW.playlist_id;
END;
```

### Migration Strategy

**Migration File: `007_user-playlists-and-favorites.sql`**

Location: `backend/src/migrations/007_user-playlists-and-favorites.sql`

```sql
-- Migration 007: Add per-user playlists and favorites
-- Description: Implements user-owned playlists and favorites system
-- Date: 2026-01-19

-- Create user_playlists table
CREATE TABLE IF NOT EXISTS user_playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  is_public BOOLEAN NOT NULL DEFAULT 0,
  game_count INTEGER NOT NULL DEFAULT 0,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (length(title) > 0 AND length(title) <= 255)
);

CREATE INDEX IF NOT EXISTS idx_user_playlists_user_id ON user_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_playlists_created_at ON user_playlists(created_at);
CREATE INDEX IF NOT EXISTS idx_user_playlists_title ON user_playlists(title);

-- Create user_playlist_games table
CREATE TABLE IF NOT EXISTS user_playlist_games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id INTEGER NOT NULL,
  game_id TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (playlist_id) REFERENCES user_playlists(id) ON DELETE CASCADE,
  UNIQUE(playlist_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_user_playlist_games_playlist_id ON user_playlist_games(playlist_id);
CREATE INDEX IF NOT EXISTS idx_user_playlist_games_game_id ON user_playlist_games(game_id);
CREATE INDEX IF NOT EXISTS idx_user_playlist_games_order ON user_playlist_games(playlist_id, order_index);

-- Create user_favorites table
CREATE TABLE IF NOT EXISTS user_favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game_id TEXT NOT NULL,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_game_id ON user_favorites(game_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_added_at ON user_favorites(added_at);

-- Triggers for maintaining game_count
CREATE TRIGGER IF NOT EXISTS trg_playlist_games_insert
AFTER INSERT ON user_playlist_games
BEGIN
  UPDATE user_playlists
  SET game_count = game_count + 1,
      updated_at = datetime('now')
  WHERE id = NEW.playlist_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_playlist_games_delete
AFTER DELETE ON user_playlist_games
BEGIN
  UPDATE user_playlists
  SET game_count = game_count - 1,
      updated_at = datetime('now')
  WHERE id = OLD.playlist_id;
END;

CREATE TRIGGER IF NOT EXISTS trg_playlist_games_update
AFTER UPDATE ON user_playlist_games
BEGIN
  UPDATE user_playlists
  SET updated_at = datetime('now')
  WHERE id = NEW.playlist_id;
END;

-- Add permissions for playlist and favorites management
INSERT OR IGNORE INTO permissions (name, description, resource, action)
VALUES
  ('favorites.manage', 'Manage personal favorites', 'favorites', 'manage');

-- Grant favorites permission to user and admin roles
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name IN ('user', 'admin')
  AND p.name = 'favorites.manage';
```

### Service Layer Design

**New Service: UserPlaylistService**

Location: `backend/src/services/UserPlaylistService.ts`

```typescript
import { UserDatabaseService } from './UserDatabaseService';
import { GameService, Game } from './GameService';
import { logger } from '../utils/logger';

export interface UserPlaylist {
  id: number;
  userId: number;
  title: string;
  description?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  gameCount: number;
  games?: Game[]; // Populated when requested
}

export interface CreateUserPlaylistDto {
  title: string;
  description?: string;
  icon?: string;
}

export interface UpdateUserPlaylistDto {
  title?: string;
  description?: string;
  icon?: string;
}

export interface PlaylistGame {
  playlistId: number;
  gameId: string;
  orderIndex: number;
  notes?: string;
  addedAt: string;
}

export class UserPlaylistService {
  private userDb = UserDatabaseService.getInstance();
  private gameService = new GameService();

  /**
   * Get all playlists for a user
   */
  getUserPlaylists(userId: number): UserPlaylist[] {
    const db = this.userDb.getDatabase();

    const stmt = db.prepare(`
      SELECT id, user_id as userId, title, description, icon,
             created_at as createdAt, updated_at as updatedAt,
             is_public as isPublic, game_count as gameCount
      FROM user_playlists
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `);

    return stmt.all(userId) as UserPlaylist[];
  }

  /**
   * Get single playlist by ID (with ownership check)
   */
  getPlaylistById(playlistId: number, userId: number): UserPlaylist | null {
    const db = this.userDb.getDatabase();

    const stmt = db.prepare(`
      SELECT id, user_id as userId, title, description, icon,
             created_at as createdAt, updated_at as updatedAt,
             is_public as isPublic, game_count as gameCount
      FROM user_playlists
      WHERE id = ? AND user_id = ?
    `);

    return stmt.get(playlistId, userId) as UserPlaylist | null;
  }

  /**
   * Get playlist with full game data
   */
  async getPlaylistWithGames(playlistId: number, userId: number): Promise<UserPlaylist | null> {
    const playlist = this.getPlaylistById(playlistId, userId);

    if (!playlist) {
      return null;
    }

    // Get game IDs in order
    const db = this.userDb.getDatabase();
    const gameStmt = db.prepare(`
      SELECT game_id as gameId, order_index as orderIndex, notes, added_at as addedAt
      FROM user_playlist_games
      WHERE playlist_id = ?
      ORDER BY order_index ASC
    `);

    const playlistGames = gameStmt.all(playlistId) as PlaylistGame[];

    // Fetch game details from flashpoint.sqlite
    const games: Game[] = [];
    for (const pg of playlistGames) {
      const game = await this.gameService.getGameById(pg.gameId);
      if (game) {
        games.push(game);
      }
    }

    return {
      ...playlist,
      games
    };
  }

  /**
   * Create new playlist
   */
  createPlaylist(userId: number, data: CreateUserPlaylistDto): UserPlaylist {
    const db = this.userDb.getDatabase();

    const stmt = db.prepare(`
      INSERT INTO user_playlists (user_id, title, description, icon)
      VALUES (?, ?, ?, ?)
    `);

    const result = stmt.run(
      userId,
      data.title.trim(),
      data.description?.trim() || null,
      data.icon || null
    );

    logger.info(`Created playlist: "${data.title}" for user ${userId}`);

    // Return the created playlist
    const playlist = this.getPlaylistById(result.lastInsertRowid as number, userId);
    if (!playlist) {
      throw new Error('Failed to retrieve created playlist');
    }

    return playlist;
  }

  /**
   * Update playlist metadata
   */
  updatePlaylist(playlistId: number, userId: number, data: UpdateUserPlaylistDto): UserPlaylist | null {
    const db = this.userDb.getDatabase();

    // Verify ownership
    const playlist = this.getPlaylistById(playlistId, userId);
    if (!playlist) {
      return null;
    }

    // Build dynamic update query
    const updates: string[] = [];
    const params: any[] = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title.trim());
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description?.trim() || null);
    }
    if (data.icon !== undefined) {
      updates.push('icon = ?');
      params.push(data.icon || null);
    }

    if (updates.length === 0) {
      return playlist; // No changes
    }

    updates.push('updated_at = datetime(\'now\')');
    params.push(playlistId, userId);

    const stmt = db.prepare(`
      UPDATE user_playlists
      SET ${updates.join(', ')}
      WHERE id = ? AND user_id = ?
    `);

    stmt.run(...params);

    logger.info(`Updated playlist ${playlistId} for user ${userId}`);

    return this.getPlaylistById(playlistId, userId);
  }

  /**
   * Delete playlist
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

    const result = stmt.run(playlistId, userId);

    if (result.changes > 0) {
      logger.info(`Deleted playlist ${playlistId} for user ${userId}`);
      return true;
    }

    return false;
  }

  /**
   * Add games to playlist
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
    const playlistService = new (await import('./PlaylistService')).PlaylistService();
    const flashpointPlaylist = await playlistService.getPlaylistById(flashpointPlaylistId);

    if (!flashpointPlaylist || !flashpointPlaylist.gameIds) {
      return null;
    }

    // Create new user playlist
    const userPlaylist = this.createPlaylist(userId, {
      title: newTitle || `${flashpointPlaylist.title} (Copy)`,
      description: flashpointPlaylist.description
    });

    // Add all games
    this.addGamesToPlaylist(userPlaylist.id, userId, flashpointPlaylist.gameIds);

    logger.info(`Copied Flashpoint playlist "${flashpointPlaylist.title}" to user ${userId}`);

    return this.getPlaylistById(userPlaylist.id, userId);
  }
}
```

**New Service: FavoritesService**

Location: `backend/src/services/FavoritesService.ts`

```typescript
import { UserDatabaseService } from './UserDatabaseService';
import { GameService, Game } from './GameService';
import { logger } from '../utils/logger';

export interface Favorite {
  id: number;
  userId: number;
  gameId: string;
  addedAt: string;
}

export class FavoritesService {
  private userDb = UserDatabaseService.getInstance();
  private gameService = new GameService();

  /**
   * Check if game is favorited by user
   */
  isFavorited(userId: number, gameId: string): boolean {
    const db = this.userDb.getDatabase();

    const stmt = db.prepare(`
      SELECT 1
      FROM user_favorites
      WHERE user_id = ? AND game_id = ?
    `);

    return stmt.get(userId, gameId) !== undefined;
  }

  /**
   * Get all favorite game IDs for user
   */
  getFavoriteGameIds(userId: number): string[] {
    const db = this.userDb.getDatabase();

    const stmt = db.prepare(`
      SELECT game_id as gameId
      FROM user_favorites
      WHERE user_id = ?
      ORDER BY added_at DESC
    `);

    const rows = stmt.all(userId) as { gameId: string }[];
    return rows.map(row => row.gameId);
  }

  /**
   * Get all favorites with full game data
   */
  async getFavorites(userId: number): Promise<Game[]> {
    const gameIds = this.getFavoriteGameIds(userId);

    const games: Game[] = [];
    for (const gameId of gameIds) {
      const game = await this.gameService.getGameById(gameId);
      if (game) {
        games.push(game);
      }
    }

    return games;
  }

  /**
   * Get favorite count for user
   */
  getFavoriteCount(userId: number): number {
    const db = this.userDb.getDatabase();

    const stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM user_favorites
      WHERE user_id = ?
    `);

    return (stmt.get(userId) as { count: number }).count;
  }

  /**
   * Add game to favorites
   */
  addFavorite(userId: number, gameId: string): boolean {
    const db = this.userDb.getDatabase();

    try {
      const stmt = db.prepare(`
        INSERT INTO user_favorites (user_id, game_id)
        VALUES (?, ?)
      `);

      stmt.run(userId, gameId);

      logger.info(`User ${userId} favorited game ${gameId}`);
      return true;
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        // Already favorited - not an error
        return false;
      }
      throw error;
    }
  }

  /**
   * Remove game from favorites
   */
  removeFavorite(userId: number, gameId: string): boolean {
    const db = this.userDb.getDatabase();

    const stmt = db.prepare(`
      DELETE FROM user_favorites
      WHERE user_id = ? AND game_id = ?
    `);

    const result = stmt.run(userId, gameId);

    if (result.changes > 0) {
      logger.info(`User ${userId} unfavorited game ${gameId}`);
      return true;
    }

    return false;
  }

  /**
   * Toggle favorite status
   */
  toggleFavorite(userId: number, gameId: string): boolean {
    if (this.isFavorited(userId, gameId)) {
      this.removeFavorite(userId, gameId);
      return false; // Now not favorited
    } else {
      this.addFavorite(userId, gameId);
      return true; // Now favorited
    }
  }

  /**
   * Get favorites for multiple users (admin function)
   */
  getFavoritesByUsers(userIds: number[]): Map<number, string[]> {
    const db = this.userDb.getDatabase();

    const placeholders = userIds.map(() => '?').join(',');
    const stmt = db.prepare(`
      SELECT user_id as userId, game_id as gameId
      FROM user_favorites
      WHERE user_id IN (${placeholders})
      ORDER BY user_id, added_at DESC
    `);

    const rows = stmt.all(...userIds) as { userId: number; gameId: string }[];

    const result = new Map<number, string[]>();
    for (const row of rows) {
      if (!result.has(row.userId)) {
        result.set(row.userId, []);
      }
      result.get(row.userId)!.push(row.gameId);
    }

    return result;
  }
}
```

### API Endpoints

#### User Playlists API

**Route: `/api/user/playlists`**

Location: `backend/src/routes/user-playlists.ts`

```typescript
import { Router } from 'express';
import { UserPlaylistService, CreateUserPlaylistDto, UpdateUserPlaylistDto } from '../services/UserPlaylistService';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requirePermission } from '../middleware/auth';

const router = Router();
const playlistService = new UserPlaylistService();

// All routes require authentication
router.use(authenticate);

// GET /api/user/playlists - Get all user's playlists
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const playlists = playlistService.getUserPlaylists(userId);
    res.json(playlists);
  } catch (error) {
    next(error);
  }
});

// GET /api/user/playlists/:id - Get single playlist with games
router.get('/:id', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const playlistId = parseInt(req.params.id, 10);

    if (isNaN(playlistId)) {
      throw new AppError(400, 'Invalid playlist ID');
    }

    const playlist = await playlistService.getPlaylistWithGames(playlistId, userId);

    if (!playlist) {
      throw new AppError(404, 'Playlist not found');
    }

    res.json(playlist);
  } catch (error) {
    next(error);
  }
});

// POST /api/user/playlists - Create new playlist
router.post('/', requirePermission('playlists.create'), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const data: CreateUserPlaylistDto = req.body;

    if (!data.title || data.title.trim().length === 0) {
      throw new AppError(400, 'Playlist title is required');
    }

    if (data.title.length > 255) {
      throw new AppError(400, 'Playlist title must be 255 characters or less');
    }

    const playlist = playlistService.createPlaylist(userId, data);
    res.status(201).json(playlist);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/user/playlists/:id - Update playlist
router.patch('/:id', requirePermission('playlists.update'), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const playlistId = parseInt(req.params.id, 10);
    const data: UpdateUserPlaylistDto = req.body;

    if (isNaN(playlistId)) {
      throw new AppError(400, 'Invalid playlist ID');
    }

    if (data.title !== undefined && data.title.trim().length === 0) {
      throw new AppError(400, 'Playlist title cannot be empty');
    }

    if (data.title && data.title.length > 255) {
      throw new AppError(400, 'Playlist title must be 255 characters or less');
    }

    const playlist = playlistService.updatePlaylist(playlistId, userId, data);

    if (!playlist) {
      throw new AppError(404, 'Playlist not found');
    }

    res.json(playlist);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/user/playlists/:id - Delete playlist
router.delete('/:id', requirePermission('playlists.delete'), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const playlistId = parseInt(req.params.id, 10);

    if (isNaN(playlistId)) {
      throw new AppError(400, 'Invalid playlist ID');
    }

    const success = playlistService.deletePlaylist(playlistId, userId);

    if (!success) {
      throw new AppError(404, 'Playlist not found');
    }

    res.json({ success: true, message: 'Playlist deleted' });
  } catch (error) {
    next(error);
  }
});

// POST /api/user/playlists/:id/games - Add games to playlist
router.post('/:id/games', requirePermission('playlists.update'), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const playlistId = parseInt(req.params.id, 10);
    const { gameIds } = req.body;

    if (isNaN(playlistId)) {
      throw new AppError(400, 'Invalid playlist ID');
    }

    if (!Array.isArray(gameIds) || gameIds.length === 0) {
      throw new AppError(400, 'gameIds array is required');
    }

    const success = playlistService.addGamesToPlaylist(playlistId, userId, gameIds);

    if (!success) {
      throw new AppError(404, 'Playlist not found');
    }

    // Return updated playlist
    const playlist = await playlistService.getPlaylistWithGames(playlistId, userId);
    res.json(playlist);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/user/playlists/:id/games - Remove games from playlist
router.delete('/:id/games', requirePermission('playlists.update'), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const playlistId = parseInt(req.params.id, 10);
    const { gameIds } = req.body;

    if (isNaN(playlistId)) {
      throw new AppError(400, 'Invalid playlist ID');
    }

    if (!Array.isArray(gameIds) || gameIds.length === 0) {
      throw new AppError(400, 'gameIds array is required');
    }

    const success = playlistService.removeGamesFromPlaylist(playlistId, userId, gameIds);

    if (!success) {
      throw new AppError(404, 'Playlist not found');
    }

    // Return updated playlist
    const playlist = await playlistService.getPlaylistWithGames(playlistId, userId);
    res.json(playlist);
  } catch (error) {
    next(error);
  }
});

// PUT /api/user/playlists/:id/order - Reorder games
router.put('/:id/order', requirePermission('playlists.update'), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const playlistId = parseInt(req.params.id, 10);
    const { gameIds } = req.body;

    if (isNaN(playlistId)) {
      throw new AppError(400, 'Invalid playlist ID');
    }

    if (!Array.isArray(gameIds)) {
      throw new AppError(400, 'gameIds array is required');
    }

    const success = playlistService.reorderGames(playlistId, userId, gameIds);

    if (!success) {
      throw new AppError(404, 'Playlist not found');
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// POST /api/user/playlists/copy/:flashpointId - Copy Flashpoint playlist
router.post('/copy/:flashpointId', requirePermission('playlists.create'), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const flashpointPlaylistId = req.params.flashpointId;
    const { title } = req.body;

    const playlist = await playlistService.copyFlashpointPlaylist(
      userId,
      flashpointPlaylistId,
      title
    );

    if (!playlist) {
      throw new AppError(404, 'Flashpoint playlist not found');
    }

    res.status(201).json(playlist);
  } catch (error) {
    next(error);
  }
});

export default router;
```

#### Favorites API

**Route: `/api/user/favorites`**

Location: `backend/src/routes/favorites.ts`

```typescript
import { Router } from 'express';
import { FavoritesService } from '../services/FavoritesService';
import { AppError } from '../middleware/errorHandler';
import { authenticate, requirePermission } from '../middleware/auth';

const router = Router();
const favoritesService = new FavoritesService();

// All routes require authentication
router.use(authenticate);
router.use(requirePermission('favorites.manage'));

// GET /api/user/favorites - Get all favorites with game data
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const favorites = await favoritesService.getFavorites(userId);
    res.json(favorites);
  } catch (error) {
    next(error);
  }
});

// GET /api/user/favorites/ids - Get favorite game IDs only
router.get('/ids', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const gameIds = favoritesService.getFavoriteGameIds(userId);
    res.json({ gameIds });
  } catch (error) {
    next(error);
  }
});

// GET /api/user/favorites/count - Get favorite count
router.get('/count', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const count = favoritesService.getFavoriteCount(userId);
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

// POST /api/user/favorites/:gameId - Add to favorites
router.post('/:gameId', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const gameId = req.params.gameId;

    favoritesService.addFavorite(userId, gameId);

    res.json({
      success: true,
      favorited: true,
      gameId
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/user/favorites/:gameId - Remove from favorites
router.delete('/:gameId', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const gameId = req.params.gameId;

    favoritesService.removeFavorite(userId, gameId);

    res.json({
      success: true,
      favorited: false,
      gameId
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/user/favorites/:gameId/toggle - Toggle favorite
router.post('/:gameId/toggle', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const gameId = req.params.gameId;

    const favorited = favoritesService.toggleFavorite(userId, gameId);

    res.json({
      success: true,
      favorited,
      gameId
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/user/favorites/check/:gameId - Check if favorited
router.get('/check/:gameId', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const gameId = req.params.gameId;

    const favorited = favoritesService.isFavorited(userId, gameId);

    res.json({ favorited, gameId });
  } catch (error) {
    next(error);
  }
});

export default router;
```

#### Register Routes

Update `backend/src/routes/index.ts`:

```typescript
import userPlaylistsRouter from './user-playlists';
import favoritesRouter from './favorites';

// ... existing routes ...

// User-specific routes
app.use('/api/user/playlists', userPlaylistsRouter);
app.use('/api/user/favorites', favoritesRouter);
```

### Rename Flashpoint Playlists

Update `PlaylistService.ts` to add "Flashpoint Playlist" label:

```typescript
async getAllPlaylists(): Promise<Playlist[]> {
  // ... existing code ...

  playlists.push({
    id: playlist.id || path.basename(file, '.json'),
    title: `${playlist.title}`, // Keep original title
    description: playlist.description,
    author: playlist.author,
    library: playlist.library,
    icon: playlist.icon,
    gameIds,
    source: 'flashpoint' // Add source field
  });
}
```

### Performance Considerations

1. **Denormalized game_count**: Maintained via triggers for O(1) lookups
2. **Indexed foreign keys**: All FKs have indexes for join performance
3. **Batch operations**: Use transactions for multi-game operations
4. **Lazy loading**: Games fetched only when playlist details requested
5. **Cache considerations**: TanStack Query on frontend will cache results

---

## 3. Frontend Developer - UI/UX & State Management

### Component Architecture

#### Directory Structure

```
frontend/src/
├── components/
│   ├── playlist/
│   │   ├── PlaylistList.tsx           # List of user playlists
│   │   ├── PlaylistCard.tsx           # Playlist card in list
│   │   ├── CreatePlaylistDialog.tsx   # Modal for creating playlist
│   │   ├── EditPlaylistDialog.tsx     # Modal for editing playlist
│   │   ├── AddToPlaylistDialog.tsx    # Modal for adding games
│   │   ├── PlaylistGameGrid.tsx       # Games in playlist view
│   │   └── PlaylistSection.tsx        # Section with header/collapse
│   ├── favorites/
│   │   ├── FavoriteButton.tsx         # Heart icon toggle button
│   │   └── FavoritesBadge.tsx         # Badge showing count
│   └── library/
│       └── GameCard.tsx               # Updated with favorite button
├── views/
│   ├── PlaylistsView.tsx              # Main playlists page
│   ├── UserPlaylistDetailView.tsx     # Single user playlist view
│   ├── FlashpointPlaylistDetailView.tsx # Single Flashpoint playlist
│   └── FavoritesView.tsx              # Favorites collection view
├── hooks/
│   ├── useUserPlaylists.ts            # TanStack Query hook
│   ├── useFavorites.ts                # TanStack Query hook
│   └── usePlaylistMutations.ts        # Mutations for playlists
└── lib/
    └── api.ts                         # Add API client methods
```

### Type Definitions

Location: `frontend/src/types/playlist.ts`

```typescript
export interface UserPlaylist {
  id: number;
  userId: number;
  title: string;
  description?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  gameCount: number;
  games?: Game[];
}

export interface FlashpointPlaylist {
  id: string;
  title: string;
  description?: string;
  author?: string;
  library?: string;
  icon?: string;
  gameIds?: string[];
  games?: Game[];
  source: 'flashpoint' | 'community';
}

export interface CreatePlaylistDto {
  title: string;
  description?: string;
  icon?: string;
}

export interface UpdatePlaylistDto {
  title?: string;
  description?: string;
  icon?: string;
}
```

### API Client Updates

Location: `frontend/src/lib/api.ts`

```typescript
// User Playlists
export const userPlaylistsApi = {
  getAll: async (): Promise<UserPlaylist[]> => {
    const response = await api.get('/user/playlists');
    return response.data;
  },

  getById: async (id: number): Promise<UserPlaylist> => {
    const response = await api.get(`/user/playlists/${id}`);
    return response.data;
  },

  create: async (data: CreatePlaylistDto): Promise<UserPlaylist> => {
    const response = await api.post('/user/playlists', data);
    return response.data;
  },

  update: async (id: number, data: UpdatePlaylistDto): Promise<UserPlaylist> => {
    const response = await api.patch(`/user/playlists/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/user/playlists/${id}`);
  },

  addGames: async (id: number, gameIds: string[]): Promise<UserPlaylist> => {
    const response = await api.post(`/user/playlists/${id}/games`, { gameIds });
    return response.data;
  },

  removeGames: async (id: number, gameIds: string[]): Promise<UserPlaylist> => {
    const response = await api.delete(`/user/playlists/${id}/games`, {
      data: { gameIds }
    });
    return response.data;
  },

  reorderGames: async (id: number, gameIds: string[]): Promise<void> => {
    await api.put(`/user/playlists/${id}/order`, { gameIds });
  },

  copyFlashpointPlaylist: async (
    flashpointId: string,
    title?: string
  ): Promise<UserPlaylist> => {
    const response = await api.post(`/user/playlists/copy/${flashpointId}`, { title });
    return response.data;
  }
};

// Favorites
export const favoritesApi = {
  getAll: async (): Promise<Game[]> => {
    const response = await api.get('/user/favorites');
    return response.data;
  },

  getIds: async (): Promise<string[]> => {
    const response = await api.get('/user/favorites/ids');
    return response.data.gameIds;
  },

  getCount: async (): Promise<number> => {
    const response = await api.get('/user/favorites/count');
    return response.data.count;
  },

  add: async (gameId: string): Promise<void> => {
    await api.post(`/user/favorites/${gameId}`);
  },

  remove: async (gameId: string): Promise<void> => {
    await api.delete(`/user/favorites/${gameId}`);
  },

  toggle: async (gameId: string): Promise<boolean> => {
    const response = await api.post(`/user/favorites/${gameId}/toggle`);
    return response.data.favorited;
  },

  check: async (gameId: string): Promise<boolean> => {
    const response = await api.get(`/user/favorites/check/${gameId}`);
    return response.data.favorited;
  }
};
```

### TanStack Query Hooks

Location: `frontend/src/hooks/useUserPlaylists.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userPlaylistsApi } from '../lib/api';
import { UserPlaylist, CreatePlaylistDto, UpdatePlaylistDto } from '../types/playlist';
import { useAuthStore } from '../store/auth';

export const useUserPlaylists = () => {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['userPlaylists'],
    queryFn: userPlaylistsApi.getAll,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUserPlaylist = (id: number) => {
  return useQuery({
    queryKey: ['userPlaylists', id],
    queryFn: () => userPlaylistsApi.getById(id),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useCreatePlaylist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePlaylistDto) => userPlaylistsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPlaylists'] });
    },
  });
};

export const useUpdatePlaylist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePlaylistDto }) =>
      userPlaylistsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['userPlaylists'] });
      queryClient.invalidateQueries({ queryKey: ['userPlaylists', variables.id] });
    },
  });
};

export const useDeletePlaylist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => userPlaylistsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPlaylists'] });
    },
  });
};

export const useAddGamesToPlaylist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, gameIds }: { id: number; gameIds: string[] }) =>
      userPlaylistsApi.addGames(id, gameIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['userPlaylists', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['userPlaylists'] });
    },
  });
};

export const useRemoveGamesFromPlaylist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, gameIds }: { id: number; gameIds: string[] }) =>
      userPlaylistsApi.removeGames(id, gameIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['userPlaylists', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['userPlaylists'] });
    },
  });
};

export const useReorderPlaylistGames = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, gameIds }: { id: number; gameIds: string[] }) =>
      userPlaylistsApi.reorderGames(id, gameIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['userPlaylists', variables.id] });
    },
  });
};

export const useCopyFlashpointPlaylist = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ flashpointId, title }: { flashpointId: string; title?: string }) =>
      userPlaylistsApi.copyFlashpointPlaylist(flashpointId, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userPlaylists'] });
    },
  });
};
```

Location: `frontend/src/hooks/useFavorites.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { favoritesApi } from '../lib/api';
import { useAuthStore } from '../store/auth';

export const useFavorites = () => {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['favorites'],
    queryFn: favoritesApi.getAll,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
};

export const useFavoriteIds = () => {
  const { isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['favorites', 'ids'],
    queryFn: favoritesApi.getIds,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    initialData: [],
  });
};

export const useFavoriteCount = () => {
  return useQuery({
    queryKey: ['favorites', 'count'],
    queryFn: favoritesApi.getCount,
    staleTime: 5 * 60 * 1000,
  });
};

export const useToggleFavorite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gameId: string) => favoritesApi.toggle(gameId),
    onMutate: async (gameId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['favorites'] });

      // Snapshot previous value
      const previousIds = queryClient.getQueryData<string[]>(['favorites', 'ids']) || [];

      // Optimistically update
      const isFavorited = previousIds.includes(gameId);
      const newIds = isFavorited
        ? previousIds.filter(id => id !== gameId)
        : [...previousIds, gameId];

      queryClient.setQueryData(['favorites', 'ids'], newIds);

      return { previousIds };
    },
    onError: (err, gameId, context) => {
      // Rollback on error
      if (context?.previousIds) {
        queryClient.setQueryData(['favorites', 'ids'], context.previousIds);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
};
```

### Component Implementations

#### FavoriteButton Component

Location: `frontend/src/components/favorites/FavoriteButton.tsx`

```typescript
import React from 'react';
import { Heart } from 'lucide-react';
import { useFavoriteIds, useToggleFavorite } from '../../hooks/useFavorites';
import { useAuthStore } from '../../store/auth';
import { cn } from '../../lib/utils';

interface FavoriteButtonProps {
  gameId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  gameId,
  size = 'md',
  className
}) => {
  const { isAuthenticated } = useAuthStore();
  const { data: favoriteIds = [] } = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();

  if (!isAuthenticated) {
    return null;
  }

  const isFavorited = favoriteIds.includes(gameId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite.mutate(gameId);
  };

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'transition-all duration-200 hover:scale-110',
        'focus:outline-none focus:ring-2 focus:ring-primary',
        className
      )}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart
        className={cn(
          sizeClasses[size],
          isFavorited
            ? 'fill-red-500 text-red-500'
            : 'text-gray-400 hover:text-red-500'
        )}
      />
    </button>
  );
};
```

#### AddToPlaylistDialog Component

Location: `frontend/src/components/playlist/AddToPlaylistDialog.tsx`

```typescript
import React, { useState } from 'react';
import { useUserPlaylists, useAddGamesToPlaylist } from '../../hooks/useUserPlaylists';
import { CreatePlaylistDialog } from './CreatePlaylistDialog';

interface AddToPlaylistDialogProps {
  gameIds: string[];
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddToPlaylistDialog: React.FC<AddToPlaylistDialogProps> = ({
  gameIds,
  onClose,
  onSuccess
}) => {
  const { data: playlists = [] } = useUserPlaylists();
  const addGames = useAddGamesToPlaylist();
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<number[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleTogglePlaylist = (playlistId: number) => {
    setSelectedPlaylistIds(prev =>
      prev.includes(playlistId)
        ? prev.filter(id => id !== playlistId)
        : [...prev, playlistId]
    );
  };

  const handleSubmit = async () => {
    for (const playlistId of selectedPlaylistIds) {
      await addGames.mutateAsync({ id: playlistId, gameIds });
    }
    onSuccess?.();
    onClose();
  };

  if (showCreateDialog) {
    return (
      <CreatePlaylistDialog
        onClose={() => setShowCreateDialog(false)}
        onSuccess={(playlist) => {
          // Add games to newly created playlist
          addGames.mutate({ id: playlist.id, gameIds });
          setShowCreateDialog(false);
          onSuccess?.();
          onClose();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">
          Add {gameIds.length} {gameIds.length === 1 ? 'game' : 'games'} to playlist
        </h2>

        {playlists.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">You don't have any playlists yet</p>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="btn-primary"
            >
              Create First Playlist
            </button>
          </div>
        ) : (
          <>
            <div className="max-h-96 overflow-y-auto space-y-2 mb-4">
              {playlists.map(playlist => (
                <label
                  key={playlist.id}
                  className="flex items-center gap-3 p-3 rounded hover:bg-surface-hover cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedPlaylistIds.includes(playlist.id)}
                    onChange={() => handleTogglePlaylist(playlist.id)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{playlist.title}</div>
                    <div className="text-sm text-gray-400">
                      {playlist.gameCount} {playlist.gameCount === 1 ? 'game' : 'games'}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <button
              onClick={() => setShowCreateDialog(true)}
              className="btn-secondary w-full mb-4"
            >
              Create New Playlist
            </button>

            <div className="flex gap-2">
              <button onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={selectedPlaylistIds.length === 0 || addGames.isPending}
                className="btn-primary flex-1"
              >
                {addGames.isPending ? 'Adding...' : 'Add to Playlists'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
```

### UI/UX Design Patterns

#### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Header (with Favorites badge)                              │
├─────────────────────────────────────────────────────────────┤
│ Sidebar      │ Main Content                                 │
│              │                                               │
│ Browse       │ ┌───────────────────────────────────────────┐│
│ Favorites ●3 │ │ My Playlists (Collapsible)               ││
│ Animations   │ │ ├─ [+] Create Playlist                   ││
│              │ │ ├─ 🎮 Action Games (12 games)            ││
│ Playlists ▼  │ │ ├─ 🎯 Puzzle Favorites (8 games)         ││
│  My Playlists│ │ └─ 📚 To Play Later (25 games)           ││
│  Flashpoint  │ │                                           ││
│              │ │ Flashpoint Playlists (Collapsible)       ││
│              │ │ 🏷️ Badge: "Flashpoint Playlist"          ││
│              │ │ ├─ 🎨 Art Games (45 games)               ││
│              │ │ ├─ 🕹️ Classic Flash (120 games)          ││
│              │ │ └─ 🌟 Editor's Picks (30 games)          ││
│              │ └───────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

#### Color & Visual Design

1. **Favorite Button**
   - Unfavorited: Gray outline heart, hover → red outline
   - Favorited: Solid red heart with slight animation
   - Size variants: sm (16px), md (20px), lg (24px)

2. **Playlist Badges**
   - User Playlists: Primary color badge
   - Flashpoint Playlists: Distinctive blue badge
   - Community Playlists: Green badge

3. **Interactive States**
   - Hover: Slight elevation and color shift
   - Active: Scale down slightly (0.98)
   - Loading: Spinner with opacity

#### Responsive Design

- **Desktop (>1024px)**: Sidebar + content layout, grid view default
- **Tablet (768-1024px)**: Collapsible sidebar, grid view
- **Mobile (<768px)**: Bottom nav, list view default, swipe actions

#### Accessibility

- **Keyboard Navigation**: All actions accessible via keyboard
- **Screen Readers**: ARIA labels on all interactive elements
- **Focus States**: Clear focus indicators on all buttons
- **Color Contrast**: WCAG AA compliant (4.5:1 minimum)

---

## 4. Business Analyst - Migration Strategy

### Current State Analysis

#### Existing System

1. **Playlist Storage**
   - Format: JSON files in `D:/Flashpoint/Data/Playlists/`
   - Structure: Each file = one playlist
   - Content: Playlist metadata + array of game objects
   - Ownership: Shared/global (no user association)

2. **Favorites System**
   - Status: Non-existent
   - Current workaround: Users may use playlists for favorites

3. **User Data**
   - Stored in: `backend/user.db`
   - Current tables: users, roles, permissions, play tracking
   - No playlist or favorites data

### Migration Scenarios

#### Scenario 1: Fresh Installation (No Existing User Data)

**Impact:** None
**Action Required:**
- Run migration 007 to create tables
- No data migration needed
- Feature available immediately

**Timeline:** Immediate (part of deployment)

#### Scenario 2: Existing Users, No Custom Playlists

**Impact:** Low
**Existing State:**
- Users have only viewed Flashpoint playlists
- No custom playlists created

**Action Required:**
1. Run migration 007
2. Update frontend to show new UI sections
3. Flashpoint playlists continue to work as before

**Timeline:** 1 deployment cycle

#### Scenario 3: Existing Custom Playlists (Created via PlaylistService)

**Impact:** Medium-High
**Existing State:**
- Custom playlists exist in `D:/Flashpoint/Data/Playlists/`
- Created by users via current `/api/playlists` endpoints
- No user ownership tracking

**Challenges:**
1. Cannot determine which user created which playlist
2. Playlists may have been collaborative/shared
3. No concept of "owner" in current system

**Migration Strategy Options:**

**Option A: Convert All to Flashpoint Playlists (Recommended)**
- Treat all existing custom playlists as "Flashpoint Playlists"
- Show with "Community" or "Legacy" badge
- Users can copy them to personal playlists
- Preserves all content, no data loss
- Clear separation between old and new system

**Option B: Assign to Admin User**
- Create special "Legacy Playlists" user or assign to first admin
- Migrate all existing playlists to this user's account
- Users can request transfer or copy
- Requires admin management

**Option C: Manual Migration Tool**
- Provide admin interface to assign playlists to users
- Show list of unassigned playlists
- Admin manually assigns ownership
- Time-consuming but most accurate

**Recommendation:** Option A - Convert to Flashpoint Playlists
- Least disruptive
- No data loss
- Clear user communication
- Users empowered to create their own new playlists

### Data Migration Plan

#### Phase 1: Pre-Migration (Week -1)

**Tasks:**
1. **Backup existing data**
   ```bash
   # Backup user database
   cp backend/user.db backend/user.db.backup.$(date +%Y%m%d)

   # Backup playlists directory
   cp -r D:/Flashpoint/Data/Playlists D:/Flashpoint/Data/Playlists.backup.$(date +%Y%m%d)
   ```

2. **Analyze existing playlists**
   - Count total playlists
   - Identify custom vs. downloaded playlists
   - Document playlist structure variations

3. **User communication**
   - Announce new features coming
   - Explain existing playlists will become "Flashpoint Playlists"
   - Instruct users they can copy playlists to personalize

#### Phase 2: Migration Execution (Deployment Day)

**Step 1: Database Migration**
```bash
# Migration runs automatically on backend startup
npm run start # or docker-compose up
```

**Step 2: Verify Tables Created**
```sql
-- Check table existence
SELECT name FROM sqlite_master WHERE type='table'
AND name IN ('user_playlists', 'user_playlist_games', 'user_favorites');

-- Check triggers
SELECT name FROM sqlite_master WHERE type='trigger'
AND name LIKE 'trg_playlist%';
```

**Step 3: Update Frontend**
- Deploy new frontend build with playlist UI
- Enable feature flags if using gradual rollout

#### Phase 3: Post-Migration (Week +1)

**Monitoring:**
1. Database performance metrics
2. User adoption rate (% creating playlists)
3. API error rates
4. User feedback/support requests

**Validation:**
1. All Flashpoint playlists still load correctly
2. New user playlists create successfully
3. Favorites toggle works smoothly
4. No data corruption

### Risk Assessment & Mitigation

#### Risk 1: Data Loss During Migration

**Probability:** Low
**Impact:** High

**Mitigation:**
- Automated backups before migration
- Migration uses `CREATE TABLE IF NOT EXISTS`
- No modifications to existing files
- Rollback plan available

#### Risk 2: User Confusion About Playlists

**Probability:** Medium
**Impact:** Medium

**Mitigation:**
- Clear visual distinction (badges)
- In-app help text
- Migration announcement
- FAQ documentation

#### Risk 3: Performance Degradation

**Probability:** Low
**Impact:** Medium

**Mitigation:**
- Indexed foreign keys
- Denormalized game_count
- Query optimization
- Performance testing pre-deployment

#### Risk 4: Permission Issues

**Probability:** Low
**Impact:** Medium

**Mitigation:**
- Default permissions granted to user role
- Migration adds permissions automatically
- Admin can adjust permissions
- Fallback to read-only mode

### Rollback Strategy

If critical issues occur post-migration:

**Step 1: Immediate Action**
```bash
# Stop services
docker-compose down

# Restore database backup
cp backend/user.db.backup.YYYYMMDD backend/user.db

# Deploy previous frontend version
git checkout <previous-release-tag>
npm run build
```

**Step 2: Assess Impact**
- Check if user data was created in new tables
- Determine if rollback loses user data

**Step 3: Communicate**
- Notify users of rollback
- Explain issue and timeline for fix
- Preserve any user-created data if possible

**Step 4: Fix & Re-deploy**
- Fix identified issues
- Test in staging environment
- Schedule new deployment

### Success Criteria

Migration considered successful when:

1. ✅ All 3 new tables created with correct schema
2. ✅ All indexes and triggers functional
3. ✅ Existing Flashpoint playlists load without errors
4. ✅ Users can create/edit/delete personal playlists
5. ✅ Favorites system functional
6. ✅ No database errors in logs for 24 hours
7. ✅ 80%+ users create at least 1 playlist in first week
8. ✅ Performance metrics within acceptable ranges

---

## 5. Architecture Reviewer - System Design & Recommendations

### Architecture Assessment

#### Overall Design: ★★★★☆ (4/5 - Strong)

**Strengths:**
1. ✅ Clean separation of concerns (user playlists vs. Flashpoint playlists)
2. ✅ Proper use of foreign keys and cascading deletes
3. ✅ Denormalized game_count for performance
4. ✅ RESTful API design with proper HTTP methods
5. ✅ Optimistic UI updates with TanStack Query
6. ✅ Backward compatibility preserved

**Areas for Improvement:**
1. ⚠️ Consider pagination for large playlists
2. ⚠️ Add bulk operations API for efficiency
3. ⚠️ Plan for future playlist sharing feature
4. ⚠️ Consider caching strategy for frequently accessed playlists

### Security Review

#### Authentication & Authorization

**Current Design:**
- JWT-based authentication required
- Permission checks via middleware
- Ownership verification in service layer

**Recommendations:**

1. **Row-Level Security via Service Layer** ✅
   ```typescript
   // Current approach is correct - ownership check in service
   getPlaylistById(playlistId: number, userId: number)
   ```

2. **Add Rate Limiting**
   ```typescript
   // Prevent abuse of playlist creation
   import rateLimit from 'express-rate-limit';

   const createPlaylistLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 10, // 10 playlists per 15 min
     message: 'Too many playlists created, please try again later'
   });

   router.post('/', createPlaylistLimiter, requirePermission('playlists.create'), ...);
   ```

3. **Input Validation**
   ```typescript
   // Add validation middleware with Zod or Joi
   import { z } from 'zod';

   const createPlaylistSchema = z.object({
     title: z.string().min(1).max(255),
     description: z.string().max(5000).optional(),
     icon: z.string().max(50).optional()
   });
   ```

4. **SQL Injection Protection** ✅
   - Already using prepared statements throughout
   - BetterSqlite3 provides automatic protection

### Performance Optimization

#### Database Performance

**Current Design:**
- Indexes on foreign keys ✅
- Triggers for maintaining game_count ✅
- Single synchronous connection ✅

**Recommendations:**

1. **Add Composite Indexes**
   ```sql
   -- For common query patterns
   CREATE INDEX IF NOT EXISTS idx_user_playlists_user_updated
   ON user_playlists(user_id, updated_at DESC);

   CREATE INDEX IF NOT EXISTS idx_favorites_user_added
   ON user_favorites(user_id, added_at DESC);
   ```

2. **Consider VACUUM Strategy**
   ```typescript
   // Periodic database maintenance
   // Add to scheduled jobs
   db.prepare('VACUUM').run(); // Reclaim space and optimize
   ```

3. **Query Optimization**
   ```typescript
   // For large playlists, implement pagination
   getPlaylistGames(
     playlistId: number,
     userId: number,
     limit: number = 50,
     offset: number = 0
   ) {
     const stmt = db.prepare(`
       SELECT game_id, order_index, notes
       FROM user_playlist_games
       WHERE playlist_id = ?
       ORDER BY order_index
       LIMIT ? OFFSET ?
     `);
     return stmt.all(playlistId, limit, offset);
   }
   ```

#### API Performance

**Current Design:**
- Lazy loading of games ✅
- Separate endpoints for different operations ✅

**Recommendations:**

1. **Add Bulk Operations**
   ```typescript
   // Add endpoint for bulk playlist operations
   POST /api/user/playlists/bulk-create
   POST /api/user/playlists/bulk-add-games

   // Reduces round trips for batch operations
   ```

2. **Implement Response Caching**
   ```typescript
   // Add Cache-Control headers
   router.get('/', async (req, res) => {
     const playlists = playlistService.getUserPlaylists(userId);
     res.set('Cache-Control', 'private, max-age=300'); // 5 min
     res.json(playlists);
   });
   ```

3. **Add Etag Support**
   ```typescript
   // Enable conditional requests
   import etag from 'etag';

   const playlistEtag = etag(JSON.stringify(playlist));
   if (req.headers['if-none-match'] === playlistEtag) {
     return res.status(304).end();
   }
   ```

#### Frontend Performance

**Current Design:**
- TanStack Query with 5-minute stale time ✅
- Optimistic updates for favorites ✅

**Recommendations:**

1. **Add Prefetching**
   ```typescript
   // Prefetch playlist details on hover
   const handleMouseEnter = (playlistId: number) => {
     queryClient.prefetchQuery({
       queryKey: ['userPlaylists', playlistId],
       queryFn: () => userPlaylistsApi.getById(playlistId)
     });
   };
   ```

2. **Implement Virtual Scrolling**
   ```typescript
   // For large playlists, use react-window
   import { FixedSizeList } from 'react-window';

   <FixedSizeList
     height={600}
     itemCount={playlist.games.length}
     itemSize={120}
   >
     {({ index, style }) => (
       <GameCard game={playlist.games[index]} style={style} />
     )}
   </FixedSizeList>
   ```

3. **Optimize Bundle Size**
   ```typescript
   // Lazy load dialogs
   const AddToPlaylistDialog = lazy(() =>
     import('./components/playlist/AddToPlaylistDialog')
   );
   ```

### Scalability Considerations

#### Current Scale: Small to Medium (< 10,000 users)

**Projected Growth:**
- 1,000 users × 10 playlists avg = 10,000 playlists
- 1,000 users × 50 favorites avg = 50,000 favorites
- Total: ~100,000 rows across all tables

**Assessment:** Current architecture handles this well ✅

#### Future Scale: Large (> 100,000 users)

**Potential Bottlenecks:**

1. **SQLite Concurrency**
   - Issue: Single-writer limitation
   - Solution: Consider PostgreSQL migration
   - Threshold: ~50,000 concurrent users

2. **Game Data Fetching**
   - Issue: N+1 query problem for playlists
   - Solution: Batch game fetching
   ```typescript
   // Fetch all games in single query
   async getGamesById(gameIds: string[]): Promise<Game[]> {
     const placeholders = gameIds.map(() => '?').join(',');
     return db.prepare(`
       SELECT * FROM game WHERE id IN (${placeholders})
     `).all(...gameIds);
   }
   ```

3. **Storage Growth**
   - Issue: Database size growth
   - Solution: Implement data retention policies
   ```typescript
   // Archive old playlists, cleanup abandoned favorites
   async cleanupAbandonedFavorites() {
     // Remove favorites for users inactive > 1 year
   }
   ```

### Extensibility & Future Features

#### Planned Extensions

1. **Playlist Sharing** (Future)
   - Current: `is_public` field already in schema ✅
   - Implementation: Add share URL generation, permissions check
   ```typescript
   // Future endpoint
   POST /api/user/playlists/:id/share
   GET /api/shared/playlists/:shareId
   ```

2. **Collaborative Playlists** (Future)
   - Add table: `playlist_collaborators`
   ```sql
   CREATE TABLE playlist_collaborators (
     id INTEGER PRIMARY KEY,
     playlist_id INTEGER NOT NULL,
     user_id INTEGER NOT NULL,
     permission_level TEXT NOT NULL, -- 'view', 'edit', 'admin'
     FOREIGN KEY (playlist_id) REFERENCES user_playlists(id),
     FOREIGN KEY (user_id) REFERENCES users(id),
     UNIQUE(playlist_id, user_id)
   );
   ```

3. **Playlist Export/Import** (Future)
   - Export to JSON
   - Import from Flashpoint Launcher format
   - Bulk import from file

4. **Smart Playlists** (Future)
   - Dynamic playlists based on filters
   - Add table: `smart_playlist_rules`
   ```sql
   CREATE TABLE smart_playlist_rules (
     id INTEGER PRIMARY KEY,
     playlist_id INTEGER NOT NULL,
     rule_type TEXT NOT NULL, -- 'platform', 'tag', 'developer', etc.
     rule_value TEXT NOT NULL,
     FOREIGN KEY (playlist_id) REFERENCES user_playlists(id)
   );
   ```

### Code Quality Recommendations

#### Testing Strategy

**Current State:** No tests mentioned
**Required Coverage:**

1. **Backend Unit Tests**
   ```typescript
   // UserPlaylistService.test.ts
   describe('UserPlaylistService', () => {
     it('creates playlist with valid data', () => {
       const playlist = service.createPlaylist(userId, {
         title: 'Test Playlist'
       });
       expect(playlist.title).toBe('Test Playlist');
       expect(playlist.userId).toBe(userId);
     });

     it('prevents creating playlist without title', () => {
       expect(() => {
         service.createPlaylist(userId, { title: '' });
       }).toThrow();
     });
   });
   ```

2. **Integration Tests**
   ```typescript
   // playlists.integration.test.ts
   describe('POST /api/user/playlists', () => {
     it('creates playlist and returns 201', async () => {
       const response = await request(app)
         .post('/api/user/playlists')
         .set('Authorization', `Bearer ${token}`)
         .send({ title: 'Test' });

       expect(response.status).toBe(201);
       expect(response.body.title).toBe('Test');
     });
   });
   ```

3. **Frontend Component Tests**
   ```typescript
   // FavoriteButton.test.tsx
   describe('FavoriteButton', () => {
     it('toggles favorite on click', async () => {
       render(<FavoriteButton gameId="game-123" />);
       const button = screen.getByRole('button');

       await userEvent.click(button);

       expect(mockToggleFavorite).toHaveBeenCalledWith('game-123');
     });
   });
   ```

#### Documentation Requirements

1. **API Documentation**
   - Use OpenAPI/Swagger spec
   - Document all endpoints
   - Include request/response examples

2. **Database Documentation**
   - ER diagram for new tables ✅ (in this doc)
   - Migration guide
   - Query optimization tips

3. **User Documentation**
   - Feature guide for playlists
   - Feature guide for favorites
   - FAQ for migration

### Final Architecture Recommendations

#### Priority 1: Must-Have Before Launch

1. ✅ Implement all core tables and migrations
2. ✅ Add ownership checks in service layer
3. ⚠️ Add input validation middleware (Zod/Joi)
4. ⚠️ Add rate limiting on create endpoints
5. ⚠️ Write integration tests for critical paths
6. ⚠️ Document API endpoints

#### Priority 2: Should-Have Shortly After Launch

1. Add composite indexes for common queries
2. Implement pagination for large playlists
3. Add bulk operations endpoints
4. Add caching headers
5. Write comprehensive unit tests
6. Performance monitoring/metrics

#### Priority 3: Nice-to-Have Future Enhancements

1. Playlist sharing functionality
2. Collaborative playlists
3. Smart/dynamic playlists
4. Import/export functionality
5. Advanced search within playlists
6. Playlist recommendations

### Architecture Decision Records (ADRs)

#### ADR-001: Use SQLite for User Playlists

**Decision:** Store user playlists in existing user.db SQLite database

**Rationale:**
- Consistency with existing architecture
- Simple deployment (no additional database)
- Adequate performance for expected scale
- Easy backups and replication

**Alternatives Considered:**
- PostgreSQL: Over-engineered for current scale
- Separate SQLite file: Unnecessary complexity
- JSON files: Poor query performance, no ACID

#### ADR-002: Denormalize game_count

**Decision:** Store game count in user_playlists table, maintain via triggers

**Rationale:**
- Avoids COUNT(*) queries on every playlist list
- Minimal storage overhead
- Triggers ensure consistency
- Significant performance gain for list views

**Alternatives Considered:**
- Calculated on-the-fly: Poor performance
- Cache in application: Consistency issues
- Update via service: Race conditions

#### ADR-003: Separate User Playlists from Flashpoint Playlists

**Decision:** Keep Flashpoint playlists as JSON files, user playlists in database

**Rationale:**
- Backward compatibility with Flashpoint Launcher
- Clear ownership model
- No risk to community content
- Allows independent evolution

**Alternatives Considered:**
- Migrate all to database: Breaks Flashpoint Launcher compatibility
- Keep all as files: No ownership tracking
- Hybrid with symlinks: Overly complex

#### ADR-004: Optimistic UI for Favorites

**Decision:** Use optimistic updates with TanStack Query for favorites toggle

**Rationale:**
- Instant user feedback
- Better perceived performance
- Low risk (easy to rollback)
- Standard pattern for toggles

**Alternatives Considered:**
- Wait for server response: Feels sluggish
- No rollback on error: Poor UX
- Local-only state: Data loss risk

---

## 6. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Backend:**
- [ ] Create migration 007 file
- [ ] Implement UserPlaylistService
- [ ] Implement FavoritesService
- [ ] Create user-playlists routes
- [ ] Create favorites routes
- [ ] Add input validation
- [ ] Add rate limiting
- [ ] Write unit tests

**Frontend:**
- [ ] Update API client with new endpoints
- [ ] Create TanStack Query hooks
- [ ] Implement FavoriteButton component
- [ ] Implement AddToPlaylistDialog
- [ ] Update GameCard with favorite button
- [ ] Add type definitions

**Testing:**
- [ ] Backend integration tests
- [ ] Frontend component tests
- [ ] E2E smoke tests

**Timeline:** 2 weeks

### Phase 2: Core Features (Week 3-4)

**Backend:**
- [ ] Add copy Flashpoint playlist endpoint
- [ ] Add reorder games endpoint
- [ ] Optimize queries with indexes
- [ ] Add caching headers

**Frontend:**
- [ ] Create PlaylistsView
- [ ] Create PlaylistList component
- [ ] Create CreatePlaylistDialog
- [ ] Create EditPlaylistDialog
- [ ] Create UserPlaylistDetailView
- [ ] Create FavoritesView
- [ ] Update sidebar navigation
- [ ] Implement responsive design

**Testing:**
- [ ] Full test coverage for services
- [ ] Component integration tests
- [ ] Accessibility testing

**Timeline:** 2 weeks

### Phase 3: Polish & Launch Prep (Week 5-6)

**Backend:**
- [ ] Performance optimization
- [ ] Error handling improvements
- [ ] Logging and monitoring
- [ ] API documentation (OpenAPI)

**Frontend:**
- [ ] Loading states and skeletons
- [ ] Error boundaries
- [ ] Empty states
- [ ] Success notifications
- [ ] Keyboard navigation
- [ ] Mobile optimizations

**Documentation:**
- [ ] User guide
- [ ] Migration guide
- [ ] API documentation
- [ ] Admin documentation

**Testing:**
- [ ] Load testing
- [ ] Security testing
- [ ] Browser compatibility testing
- [ ] Performance testing

**Timeline:** 2 weeks

### Phase 4: Deployment & Monitoring (Week 7)

**Pre-Deployment:**
- [ ] Backup production database
- [ ] Backup playlist files
- [ ] Create rollback plan
- [ ] User communication (email/announcement)

**Deployment:**
- [ ] Deploy backend with migration
- [ ] Verify migration success
- [ ] Deploy frontend
- [ ] Smoke test production

**Post-Deployment:**
- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] Collect user feedback
- [ ] Address urgent issues

**Timeline:** 1 week

### Total Timeline: 7 weeks

---

## 7. Risk Analysis & Mitigation

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Migration failure | Low | High | Automated backups, rollback plan, migration testing |
| Performance degradation | Low | Medium | Load testing, indexes, query optimization |
| Data corruption | Very Low | High | Transactions, constraints, validation |
| Security vulnerabilities | Low | High | Input validation, rate limiting, RBAC |
| Frontend bugs | Medium | Medium | Comprehensive testing, error boundaries |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| User confusion | Medium | Medium | Clear UI, badges, help text, documentation |
| Low adoption | Medium | High | Intuitive design, user communication, examples |
| Existing playlists lost | Very Low | High | No modification to files, read-only approach |
| Support burden | Medium | Low | Good documentation, FAQ, in-app help |

### Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Deployment issues | Low | Medium | Staging environment, deployment checklist |
| Downtime during migration | Low | Low | Migration is fast (<1s), no data modification |
| Rollback complexity | Low | Medium | Documented rollback procedure, backups |

---

## 8. Success Metrics & KPIs

### Adoption Metrics

**Week 1:**
- 50% of active users create at least 1 playlist
- 70% of active users use favorites feature
- Average 3 games per playlist

**Month 1:**
- 70% of active users have created playlists
- Average 5 playlists per user
- Average 20 favorites per user
- 30% of users copy Flashpoint playlists

**Month 3:**
- 80% adoption rate for playlists
- 85% adoption rate for favorites
- Average 8 playlists per user
- Average 30 favorites per user

### Performance Metrics

**Response Times:**
- Get playlists: <100ms (p95)
- Create playlist: <200ms (p95)
- Toggle favorite: <50ms (p95)
- Add game to playlist: <150ms (p95)

**System Health:**
- API error rate: <0.1%
- Database query time: <50ms (p95)
- Frontend page load: <2s (p95)

### User Satisfaction

**Feedback:**
- Positive feedback: >80%
- Feature requests: Monitored and prioritized
- Bug reports: <5 per week after stabilization

**Support:**
- Support tickets: <10% of users
- Documentation sufficiency: >90% users don't need help

---

## 9. Open Questions & Decisions Needed

### Product Decisions

1. **Q:** Should playlists have maximum game count?
   **Recommendation:** Yes, 500 games max to prevent abuse

2. **Q:** Allow users to favorite playlists (in addition to games)?
   **Recommendation:** Phase 2 feature - focus on games first

3. **Q:** Enable playlist descriptions with markdown/rich text?
   **Recommendation:** Phase 1: Plain text, Phase 2: Markdown

### Technical Decisions

1. **Q:** Implement soft delete for playlists?
   **Recommendation:** No, hard delete is fine. Add confirmation dialog.

2. **Q:** Add full-text search for playlist titles?
   **Recommendation:** Phase 2 - use SQLite FTS5 extension

3. **Q:** Store playlist thumbnails?
   **Recommendation:** Phase 2 - auto-generate from first 4 games

### UX Decisions

1. **Q:** Default view mode (grid vs list) for playlists?
   **Recommendation:** Grid for playlists, list for games within playlist

2. **Q:** Show game count badge on playlist cards?
   **Recommendation:** Yes, always visible

3. **Q:** Allow drag-and-drop reordering in list view?
   **Recommendation:** Yes, with fallback arrow buttons

---

## 10. Next Steps

### Immediate Actions (This Week)

1. **User Approval**
   - Review this document with stakeholders
   - Get approval on approach and timeline
   - Confirm migration strategy (Option A)

2. **Team Assignment**
   - Assign backend developer to services/routes
   - Assign frontend developer to components/views
   - Assign QA resources for testing

3. **Environment Setup**
   - Create feature branch: `feature/user-playlists-favorites`
   - Setup staging environment
   - Prepare test data

### Week 1 Kickoff

1. Backend developer starts on migration + services
2. Frontend developer starts on API client + hooks
3. Designer creates mockups for all views
4. QA creates test plan

### Communication Plan

1. **Internal:**
   - Daily standups during development
   - Weekly progress updates
   - Demo at end of each phase

2. **Users:**
   - Announcement 1 week before launch
   - In-app changelog on launch
   - Follow-up survey after 2 weeks

---

## Appendix A: Database ER Diagram

```
┌──────────────┐         ┌─────────────────────┐         ┌────────────────────┐
│    users     │         │  user_playlists     │         │ user_playlist_games│
├──────────────┤         ├─────────────────────┤         ├────────────────────┤
│ id (PK)      │─────────│ id (PK)             │─────────│ id (PK)            │
│ username     │    1    │ user_id (FK)        │    1    │ playlist_id (FK)   │
│ email        │         │ title               │         │ game_id            │
│ password_hash│         │ description         │         │ order_index        │
│ role_id      │         │ icon                │         │ notes              │
│ created_at   │         │ created_at          │         │ added_at           │
└──────────────┘         │ updated_at          │         └────────────────────┘
                         │ is_public           │                  │
                         │ game_count          │                  │
                         └─────────────────────┘                  │
                                                                   │
                                                                   │
                         ┌──────────────────┐                     │
                         │ user_favorites   │                     │
                         ├──────────────────┤                     │
                         │ id (PK)          │                     │
┌──────────────┐    ───────────│ user_id (FK)    │                     │
│    users     │    1    │ game_id          │─────────────────────┘
│ id (PK)      │─────────│ added_at         │      Referenced but
└──────────────┘         └──────────────────┘      not FK to allow
                                                    game deletion
                                                    from flashpoint.db
```

## Appendix B: API Endpoint Summary

### User Playlists

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/api/user/playlists` | List user's playlists | Required | None |
| GET | `/api/user/playlists/:id` | Get playlist with games | Required | Owner |
| POST | `/api/user/playlists` | Create playlist | Required | playlists.create |
| PATCH | `/api/user/playlists/:id` | Update playlist | Required | playlists.update + Owner |
| DELETE | `/api/user/playlists/:id` | Delete playlist | Required | playlists.delete + Owner |
| POST | `/api/user/playlists/:id/games` | Add games | Required | playlists.update + Owner |
| DELETE | `/api/user/playlists/:id/games` | Remove games | Required | playlists.update + Owner |
| PUT | `/api/user/playlists/:id/order` | Reorder games | Required | playlists.update + Owner |
| POST | `/api/user/playlists/copy/:flashpointId` | Copy Flashpoint playlist | Required | playlists.create |

### Favorites

| Method | Endpoint | Description | Auth | Permission |
|--------|----------|-------------|------|------------|
| GET | `/api/user/favorites` | Get favorites with game data | Required | favorites.manage |
| GET | `/api/user/favorites/ids` | Get favorite IDs only | Required | favorites.manage |
| GET | `/api/user/favorites/count` | Get favorite count | Required | favorites.manage |
| GET | `/api/user/favorites/check/:gameId` | Check if favorited | Required | favorites.manage |
| POST | `/api/user/favorites/:gameId` | Add to favorites | Required | favorites.manage |
| DELETE | `/api/user/favorites/:gameId` | Remove from favorites | Required | favorites.manage |
| POST | `/api/user/favorites/:gameId/toggle` | Toggle favorite | Required | favorites.manage |

---

## Conclusion

This comprehensive implementation plan covers all aspects of adding per-user playlists and favorites to the Flashpoint Web application. The design:

- ✅ Maintains backward compatibility with existing Flashpoint playlists
- ✅ Provides clear user ownership and permissions
- ✅ Scales to handle thousands of users and playlists
- ✅ Implements modern best practices (TanStack Query, optimistic updates)
- ✅ Includes comprehensive testing and documentation
- ✅ Provides clear migration path with minimal risk
- ✅ Delivers excellent user experience

**Estimated Total Effort:** 7 weeks (1 backend dev + 1 frontend dev)

**Recommendation:** Proceed with implementation using Option A migration strategy (treat existing custom playlists as Flashpoint Playlists).

---

**Document Version:** 1.0
**Last Updated:** 2026-01-19
**Next Review:** After stakeholder approval
