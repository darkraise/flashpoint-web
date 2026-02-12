-- ============================================================================
-- FLASHPOINT WEB - COMPLETE DATABASE SCHEMA
-- ============================================================================
-- Version: 1.1.0
-- Created: 2026-01-30
-- Updated: 2026-02-05
-- Purpose: Single comprehensive migration containing all schema, seed data, and indexes
-- Includes: Users, Roles, Permissions, Playlists, Favorites, Play Tracking, Settings, Domains
--
-- This migration is idempotent - safe to run multiple times
-- Uses IF NOT EXISTS and INSERT OR IGNORE for all operations
-- ============================================================================

-- ============================================================================
-- PART 1: TABLE DEFINITIONS
-- ============================================================================

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
CREATE INDEX IF NOT EXISTS idx_system_settings_is_public ON system_settings(is_public);

-- ===================================
-- USER PLAYLISTS TABLE
-- ===================================
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
  share_token TEXT,
  share_expires_at TEXT,
  show_owner BOOLEAN NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (length(title) > 0 AND length(title) <= 255)
);

CREATE INDEX IF NOT EXISTS idx_user_playlists_user_id ON user_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_playlists_created_at ON user_playlists(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_playlists_title ON user_playlists(title);
CREATE INDEX IF NOT EXISTS idx_user_playlists_updated_at ON user_playlists(updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_playlists_share_token ON user_playlists(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_playlists_public ON user_playlists(is_public) WHERE is_public = 1;
CREATE INDEX IF NOT EXISTS idx_user_playlists_share_expires ON user_playlists(share_expires_at) WHERE share_expires_at IS NOT NULL;

-- ===================================
-- USER PLAYLIST GAMES TABLE
-- ===================================
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
-- DOMAINS TABLE
-- ===================================
-- Configurable domains for playlist sharing URLs and CORS management.
-- Admins can add multiple domains, set a default for share links.
CREATE TABLE IF NOT EXISTS domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hostname TEXT NOT NULL UNIQUE COLLATE NOCASE,
  is_default BOOLEAN NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_by INTEGER,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Enforce at most one default domain at the database level
CREATE UNIQUE INDEX IF NOT EXISTS idx_domains_single_default ON domains(is_default) WHERE is_default = 1;

-- ============================================================================
-- PART 2: TRIGGERS
-- ============================================================================

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

-- ============================================================================
-- PART 3: SEED DATA - ROLES
-- ============================================================================

INSERT OR IGNORE INTO roles (id, name, description) VALUES
  (1, 'admin', 'Administrator with full access to all features'),
  (2, 'user', 'Regular user with standard access'),
  (3, 'guest', 'Guest user with read-only access');

-- ============================================================================
-- PART 4: SEED DATA - PERMISSIONS
-- ============================================================================

INSERT OR IGNORE INTO permissions (name, description, resource, action) VALUES
  -- Game permissions
  ('games.read', 'View and browse games', 'games', 'read'),
  ('games.play', 'Play games in browser', 'games', 'play'),
  ('games.download', 'Download game files', 'games', 'download'),

  -- Playlist permissions
  ('playlists.read', 'View playlists', 'playlists', 'read'),
  ('playlists.create', 'Create new playlists', 'playlists', 'create'),
  ('playlists.update', 'Update existing playlists', 'playlists', 'update'),
  ('playlists.delete', 'Delete playlists', 'playlists', 'delete'),

  -- User management permissions
  ('users.read', 'View user accounts', 'users', 'read'),
  ('users.create', 'Create new user accounts', 'users', 'create'),
  ('users.update', 'Update user accounts', 'users', 'update'),
  ('users.delete', 'Delete user accounts', 'users', 'delete'),

  -- Role management permissions
  ('roles.read', 'View roles and permissions', 'roles', 'read'),
  ('roles.create', 'Create new roles', 'roles', 'create'),
  ('roles.update', 'Update roles and permissions', 'roles', 'update'),
  ('roles.delete', 'Delete roles', 'roles', 'delete'),

  -- Settings permissions
  ('settings.read', 'View system settings', 'settings', 'read'),
  ('settings.update', 'Update system settings', 'settings', 'update'),

  -- Activity logs permissions
  ('activities.read', 'View activity logs', 'activities', 'read');

-- ============================================================================
-- PART 5: SEED DATA - ROLE-PERMISSION MAPPINGS
-- ============================================================================

-- Assign all permissions to admin role
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- Assign permissions to user role (all except user/role/settings/activities management)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions
WHERE resource NOT IN ('users', 'roles', 'settings', 'activities');

-- Assign permissions to guest role (read-only for games and playlists, plus games.play)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions
WHERE (action = 'read' AND resource IN ('games', 'playlists'))
   OR name = 'games.play';

-- ============================================================================
-- PART 6: SEED DATA - SYSTEM SETTINGS
-- ============================================================================

-- Auth Settings
INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value, validation_schema)
VALUES
  ('auth.guest_access_enabled', '1', 'boolean', 'auth', 'Allow guest access to browse games', 1, '1', '{"type":"boolean"}'),
  ('auth.user_registration_enabled', '1', 'boolean', 'auth', 'Allow anonymous users to register accounts', 1, '1', '{"type":"boolean"}'),
  ('auth.require_email_verification', '0', 'boolean', 'auth', 'Require email verification for new accounts', 0, '0', '{"type":"boolean"}'),
  ('auth.session_timeout_minutes', '60', 'integer', 'auth', 'Session timeout in minutes', 0, '60', '{"type":"integer","minimum":5,"maximum":1440}'),
  ('auth.max_login_attempts', '5', 'integer', 'auth', 'Maximum failed login attempts before lockout', 0, '5', '{"type":"integer","minimum":1,"maximum":100}'),
  ('auth.lockout_duration_minutes', '15', 'integer', 'auth', 'Account lockout duration in minutes', 0, '15', '{"type":"integer","minimum":1,"maximum":1440}');

-- App Settings
INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value, validation_schema)
VALUES
  ('app.site_name', 'Flashpoint Web', 'string', 'app', 'Application name displayed in UI', 1, 'Flashpoint Web', '{"type":"string","minLength":1,"maxLength":100}'),
  ('app.maintenance_mode', '0', 'boolean', 'app', 'Enable maintenance mode', 1, '0', '{"type":"boolean"}'),
  ('app.default_theme', 'dark', 'string', 'app', 'Default theme mode (light, dark, system)', 1, 'dark', '{"type":"string","enum":["light","dark","system"]}'),
  ('app.default_primary_color', 'blue', 'string', 'app', 'Default primary color', 1, 'blue', '{"type":"string","enum":["slate","gray","zinc","neutral","stone","red","orange","amber","yellow","lime","green","emerald","teal","cyan","sky","blue","indigo","violet","purple","fuchsia","pink","rose"]}'),
  ('app.date_format', 'MM/dd/yyyy', 'string', 'app', 'Date format for displaying dates throughout the application', 1, 'MM/dd/yyyy', '{"type":"string","enum":["MM/dd/yyyy","dd/MM/yyyy","yyyy-MM-dd","MMM dd, yyyy","MMMM dd, yyyy","dd MMM yyyy","dd MMMM yyyy"]}'),
  ('app.time_format', 'hh:mm a', 'string', 'app', 'Time format for displaying times throughout the application', 1, 'hh:mm a', '{"type":"string","enum":["hh:mm a","HH:mm","hh:mm:ss a","HH:mm:ss"]}');

-- Metadata Settings
INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value, validation_schema)
VALUES
  ('metadata.auto_sync_enabled', '0', 'boolean', 'metadata', 'Automatically sync metadata on startup', 0, '0', '{"type":"boolean"}'),
  ('metadata.sync_interval_minutes', '60', 'integer', 'metadata', 'Metadata sync interval in minutes', 0, '60', '{"type":"integer","minimum":1,"maximum":1440}'),
  ('metadata.sync_tags', '1', 'boolean', 'metadata', 'Include tags in metadata sync', 0, '1', '{"type":"boolean"}'),
  ('metadata.sync_platforms', '1', 'boolean', 'metadata', 'Include platforms in metadata sync', 0, '1', '{"type":"boolean"}');

-- Feature Settings
INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value, validation_schema)
VALUES
  ('features.enable_playlists', '1', 'boolean', 'features', 'Enable playlists feature', 1, '1', '{"type":"boolean"}'),
  ('features.enable_favorites', '1', 'boolean', 'features', 'Enable favorites feature', 1, '1', '{"type":"boolean"}'),
  ('features.enable_statistics', '1', 'boolean', 'features', 'Enable play statistics tracking', 1, '1', '{"type":"boolean"}');

-- Storage Settings
INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value, validation_schema)
VALUES
  ('storage.cache_size_mb', '500', 'integer', 'storage', 'Maximum cache size in MB', 0, '500', '{"type":"integer","minimum":100,"maximum":10000}'),
  ('storage.log_retention_days', '30', 'integer', 'storage', 'Log file retention in days', 0, '30', '{"type":"integer","minimum":1,"maximum":365}'),
  ('storage.temp_file_retention_days', '7', 'integer', 'storage', 'Temporary file retention in days', 0, '7', '{"type":"integer","minimum":1,"maximum":30}');

-- Rate Limiting Settings
INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value, validation_schema)
VALUES
  ('rate_limit.api_requests_per_minute', '100', 'integer', 'rate_limit', 'API requests per minute per user', 0, '100', '{"type":"integer","minimum":10,"maximum":10000}'),
  ('rate_limit.enable_rate_limiting', '1', 'boolean', 'rate_limit', 'Enable rate limiting', 0, '1', '{"type":"boolean"}');

-- Job Settings
INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value)
VALUES
  ('jobs.metadata_sync_enabled', '0', 'boolean', 'jobs', 'Enable automatic metadata sync job', 0, '0'),
  ('jobs.metadata_sync_schedule', '0 * * * *', 'string', 'jobs', 'Cron schedule for metadata sync job (e.g., "0 * * * *" for hourly)', 0, '0 * * * *'),
  ('jobs.ruffle_update_enabled', '0', 'boolean', 'jobs', 'Enable automatic Ruffle update job', 0, '0'),
  ('jobs.ruffle_update_schedule', '0 0 * * *', 'string', 'jobs', 'Cron schedule for Ruffle update job (default: daily at midnight)', 0, '0 0 * * *');

-- ============================================================================
-- PART 7: PERFORMANCE INDEXES
-- ============================================================================

-- Login Attempts: Composite index for checkLoginAttempts query
CREATE INDEX IF NOT EXISTS idx_login_attempts_success_time
  ON login_attempts(success, attempted_at);

-- Play Sessions: Active sessions lookup
CREATE INDEX IF NOT EXISTS idx_user_game_plays_active
  ON user_game_plays(ended_at, started_at)
  WHERE ended_at IS NULL;

-- Play Sessions: User play history
CREATE INDEX IF NOT EXISTS idx_user_game_plays_user_time
  ON user_game_plays(user_id, started_at DESC);

-- Activity Logs: User activity queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_time
  ON activity_logs(user_id, created_at DESC);

-- Refresh Tokens: Cleanup expired tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_cleanup
  ON refresh_tokens(expires_at, revoked_at)
  WHERE revoked_at IS NULL;

-- User Game Stats: Most played games
CREATE INDEX IF NOT EXISTS idx_user_game_stats_plays
  ON user_game_stats(user_id, total_plays DESC);

-- User Game Stats: Most playtime
CREATE INDEX IF NOT EXISTS idx_user_game_stats_playtime
  ON user_game_stats(user_id, total_playtime_seconds DESC);

-- User Game Stats: Recently played
CREATE INDEX IF NOT EXISTS idx_user_game_stats_recent
  ON user_game_stats(user_id, last_played_at DESC);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
