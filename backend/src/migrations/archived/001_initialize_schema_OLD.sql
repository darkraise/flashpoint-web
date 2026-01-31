-- Consolidated Database Schema Initialization
-- Created: 2026-01-28
-- Purpose: Complete database schema with all tables in their final state
-- This consolidates migrations 001, 002, 003, 005, and 007
-- Rollback: DROP all tables in reverse dependency order

-- ===================================
-- USERS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role_id INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_login_at TEXT,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- ===================================
-- ROLES TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  description TEXT,
  priority INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ===================================
-- PERMISSIONS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);

-- ===================================
-- ROLE-PERMISSION MAPPING TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- ===================================
-- REFRESH TOKENS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  revoked_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- ===================================
-- ACTIVITY LOGS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username TEXT,
  action TEXT NOT NULL,
  resource TEXT,
  resource_id TEXT,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs(resource);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- ===================================
-- LOGIN ATTEMPTS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  success BOOLEAN DEFAULT 0,
  attempted_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_attempted_at ON login_attempts(attempted_at);

-- ===================================
-- USER GAME PLAYS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS user_game_plays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game_id TEXT NOT NULL,
  game_title TEXT,
  started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ended_at TEXT,
  duration_seconds INTEGER,
  session_id TEXT NOT NULL UNIQUE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_game_plays_user_id ON user_game_plays(user_id);
CREATE INDEX IF NOT EXISTS idx_user_game_plays_game_id ON user_game_plays(game_id);
CREATE INDEX IF NOT EXISTS idx_user_game_plays_started_at ON user_game_plays(started_at);
CREATE INDEX IF NOT EXISTS idx_user_game_plays_session_id ON user_game_plays(session_id);

-- ===================================
-- USER GAME STATS TABLE (Aggregated)
-- ===================================
CREATE TABLE IF NOT EXISTS user_game_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game_id TEXT NOT NULL,
  game_title TEXT,
  total_plays INTEGER DEFAULT 0,
  total_playtime_seconds INTEGER DEFAULT 0,
  first_played_at TEXT,
  last_played_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_user_game_stats_user_id ON user_game_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_game_stats_game_id ON user_game_stats(game_id);
CREATE INDEX IF NOT EXISTS idx_user_game_stats_total_plays ON user_game_stats(total_plays);
CREATE INDEX IF NOT EXISTS idx_user_game_stats_total_playtime ON user_game_stats(total_playtime_seconds);

-- ===================================
-- USER STATS TABLE (Overall User Stats)
-- ===================================
CREATE TABLE IF NOT EXISTS user_stats (
  user_id INTEGER PRIMARY KEY,
  total_games_played INTEGER DEFAULT 0,
  total_playtime_seconds INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  first_play_at TEXT,
  last_play_at TEXT,
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_stats_total_playtime ON user_stats(total_playtime_seconds);

-- ===================================
-- USER SETTINGS TABLE (Key-Value Store)
-- ===================================
-- From Migration 002: Extensible user preferences storage
CREATE TABLE IF NOT EXISTS user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value TEXT NOT NULL,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, setting_key)
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_key ON user_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_key ON user_settings(user_id, setting_key);

-- ===================================
-- SYSTEM SETTINGS TABLE (Key-Value Store)
-- ===================================
-- From Migration 003: Global configuration storage
CREATE TABLE IF NOT EXISTS system_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  data_type TEXT NOT NULL CHECK (data_type IN ('boolean', 'integer', 'string', 'json', 'float')),
  category TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT 0,
  default_value TEXT,
  validation_schema TEXT,
  updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_by INTEGER,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- ===================================
-- USER PLAYLISTS TABLE
-- ===================================
-- From Migration 005: User-created playlists
CREATE TABLE IF NOT EXISTS user_playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  is_public BOOLEAN NOT NULL DEFAULT 0,
  game_count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (length(title) > 0 AND length(title) <= 255)
);

CREATE INDEX IF NOT EXISTS idx_user_playlists_user_id ON user_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_playlists_created_at ON user_playlists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_playlists_title ON user_playlists(title);
CREATE INDEX IF NOT EXISTS idx_user_playlists_updated_at ON user_playlists(updated_at DESC);

-- ===================================
-- USER PLAYLIST GAMES TABLE
-- ===================================
-- From Migration 005: Many-to-many relationship between playlists and games
CREATE TABLE IF NOT EXISTS user_playlist_games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id INTEGER NOT NULL,
  game_id TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  added_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (playlist_id) REFERENCES user_playlists(id) ON DELETE CASCADE,
  UNIQUE(playlist_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_user_playlist_games_playlist_id ON user_playlist_games(playlist_id);
CREATE INDEX IF NOT EXISTS idx_user_playlist_games_game_id ON user_playlist_games(game_id);
CREATE INDEX IF NOT EXISTS idx_user_playlist_games_order ON user_playlist_games(playlist_id, order_index);
CREATE INDEX IF NOT EXISTS idx_user_playlist_games_added_at ON user_playlist_games(added_at DESC);

-- ===================================
-- USER FAVORITES TABLE
-- ===================================
-- From Migration 005: User favorite games
CREATE TABLE IF NOT EXISTS user_favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game_id TEXT NOT NULL,
  added_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_game_id ON user_favorites(game_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_added_at ON user_favorites(added_at DESC);

-- ===================================
-- JOB EXECUTION LOGS TABLE
-- ===================================
-- From Migration 007: Background job tracking
CREATE TABLE IF NOT EXISTS job_execution_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  completed_at TEXT,
  duration_seconds INTEGER,
  message TEXT,
  error_details TEXT,
  triggered_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_job_logs_job_id ON job_execution_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_logs_status ON job_execution_logs(status);
CREATE INDEX IF NOT EXISTS idx_job_logs_started_at ON job_execution_logs(started_at);

-- ===================================
-- TRIGGERS: Auto-update playlist game_count
-- ===================================
-- From Migration 005/015: Updated to not use datetime('now')
-- Note: updated_at is now handled in application code

-- Increment game_count when game added to playlist
CREATE TRIGGER IF NOT EXISTS trg_playlist_games_insert
AFTER INSERT ON user_playlist_games
BEGIN
  UPDATE user_playlists
  SET game_count = game_count + 1
  WHERE id = NEW.playlist_id;
END;

-- Decrement game_count when game removed from playlist
CREATE TRIGGER IF NOT EXISTS trg_playlist_games_delete
AFTER DELETE ON user_playlist_games
BEGIN
  UPDATE user_playlists
  SET game_count = game_count - 1
  WHERE id = OLD.playlist_id;
END;
