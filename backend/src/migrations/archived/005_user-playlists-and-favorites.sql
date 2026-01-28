-- Migration 005: User Playlists and Favorites
-- Created: 2026-01-19
-- Purpose: Add per-user playlists and favorites functionality
-- Rollback: DROP TABLE user_favorites; DROP TABLE user_playlist_games; DROP TABLE user_playlists;

-- ===================================
-- TABLE: user_playlists
-- ===================================
-- Stores user-created playlists
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
CREATE INDEX IF NOT EXISTS idx_user_playlists_created_at ON user_playlists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_playlists_title ON user_playlists(title);
CREATE INDEX IF NOT EXISTS idx_user_playlists_updated_at ON user_playlists(updated_at DESC);

-- ===================================
-- TABLE: user_playlist_games
-- ===================================
-- Many-to-many relationship between user playlists and games
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
CREATE INDEX IF NOT EXISTS idx_user_playlist_games_added_at ON user_playlist_games(added_at DESC);

-- ===================================
-- TABLE: user_favorites
-- ===================================
-- User favorite games (quick access bookmark)
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
CREATE INDEX IF NOT EXISTS idx_user_favorites_added_at ON user_favorites(added_at DESC);

-- ===================================
-- TRIGGERS: Auto-update game_count
-- ===================================
-- Increment game_count when game added to playlist
CREATE TRIGGER IF NOT EXISTS trg_playlist_games_insert
AFTER INSERT ON user_playlist_games
BEGIN
  UPDATE user_playlists
  SET game_count = game_count + 1,
      updated_at = datetime('now')
  WHERE id = NEW.playlist_id;
END;

-- Decrement game_count when game removed from playlist
CREATE TRIGGER IF NOT EXISTS trg_playlist_games_delete
AFTER DELETE ON user_playlist_games
BEGIN
  UPDATE user_playlists
  SET game_count = game_count - 1,
      updated_at = datetime('now')
  WHERE id = OLD.playlist_id;
END;

-- Update updated_at when game order or notes change
CREATE TRIGGER IF NOT EXISTS trg_playlist_games_update
AFTER UPDATE ON user_playlist_games
BEGIN
  UPDATE user_playlists
  SET updated_at = datetime('now')
  WHERE id = NEW.playlist_id;
END;
