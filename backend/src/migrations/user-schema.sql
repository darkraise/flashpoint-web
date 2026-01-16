-- User Management Database Schema
-- This schema is for the separate user.db database

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
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
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
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Insert default roles
INSERT OR IGNORE INTO roles (id, name, description, priority) VALUES
  (1, 'admin', 'Administrator with full access to all features', 100),
  (2, 'user', 'Regular user with standard access', 50),
  (3, 'guest', 'Guest user with read-only access', 0);

-- ===================================
-- PERMISSIONS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);

-- Insert default permissions
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

-- ===================================
-- ROLE-PERMISSION MAPPING TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- Assign permissions to admin role (all permissions)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- Assign permissions to user role (all except user/role/settings management)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions
WHERE resource NOT IN ('users', 'roles', 'settings', 'activities');

-- Assign permissions to guest role (read-only for games and playlists)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions
WHERE action = 'read' AND resource IN ('games', 'playlists');

-- ===================================
-- REFRESH TOKENS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
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
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource ON activity_logs(resource);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- ===================================
-- AUTH SETTINGS TABLE (Singleton)
-- ===================================
CREATE TABLE IF NOT EXISTS auth_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  guest_access_enabled BOOLEAN DEFAULT 1,
  user_registration_enabled BOOLEAN DEFAULT 1,
  require_email_verification BOOLEAN DEFAULT 0,
  session_timeout_minutes INTEGER DEFAULT 60,
  max_login_attempts INTEGER DEFAULT 5,
  lockout_duration_minutes INTEGER DEFAULT 15,
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by INTEGER,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default auth settings
INSERT OR IGNORE INTO auth_settings (id) VALUES (1);

-- ===================================
-- LOGIN ATTEMPTS TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  success BOOLEAN DEFAULT 0,
  attempted_at TEXT DEFAULT (datetime('now'))
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
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
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
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_stats_total_playtime ON user_stats(total_playtime_seconds);
