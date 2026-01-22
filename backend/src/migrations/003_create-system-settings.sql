-- Migration 003: Create system_settings table for flexible key-value settings
-- Created: 2026-01-18
-- Purpose: Unified settings storage for all system-wide configuration
-- Rollback: DROP TABLE IF EXISTS system_settings;

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
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by INTEGER,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- ===================================
-- SEED AUTH SETTINGS
-- ===================================
-- Insert default auth settings (no migration from auth_settings table needed)
INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value)
VALUES
  ('auth.guest_access_enabled', '1', 'boolean', 'auth', 'Allow guest access to browse games', 1, '1'),
  ('auth.user_registration_enabled', '1', 'boolean', 'auth', 'Allow anonymous users to register accounts', 1, '1'),
  ('auth.require_email_verification', '0', 'boolean', 'auth', 'Require email verification for new accounts', 0, '0'),
  ('auth.session_timeout_minutes', '60', 'integer', 'auth', 'Session timeout in minutes', 0, '60'),
  ('auth.max_login_attempts', '5', 'integer', 'auth', 'Maximum failed login attempts before lockout', 0, '5'),
  ('auth.lockout_duration_minutes', '15', 'integer', 'auth', 'Account lockout duration in minutes', 0, '15');

-- ===================================
-- SEED ADDITIONAL SETTINGS
-- ===================================

-- Application Settings
INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value)
VALUES
  ('app.site_name', 'Flashpoint Web', 'string', 'app', 'Application name displayed in UI', 1, 'Flashpoint Web'),
  ('app.maintenance_mode', '0', 'boolean', 'app', 'Enable maintenance mode', 1, '0'),
  ('app.default_theme', 'dark', 'string', 'app', 'Default theme mode (light, dark, system)', 1, 'dark'),
  ('app.default_primary_color', 'blue', 'string', 'app', 'Default primary color', 1, 'blue');

-- Metadata Settings
INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value)
VALUES
  ('metadata.auto_sync_enabled', '0', 'boolean', 'metadata', 'Automatically sync metadata on startup', 0, '0'),
  ('metadata.sync_interval_minutes', '60', 'integer', 'metadata', 'Metadata sync interval in minutes', 0, '60'),
  ('metadata.sync_tags', '1', 'boolean', 'metadata', 'Include tags in metadata sync', 0, '1'),
  ('metadata.sync_platforms', '1', 'boolean', 'metadata', 'Include platforms in metadata sync', 0, '1');

-- Feature Flags
INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value)
VALUES
  ('features.enable_playlists', '1', 'boolean', 'features', 'Enable playlists feature', 0, '1'),
  ('features.enable_favorites', '1', 'boolean', 'features', 'Enable favorites feature', 0, '1'),
  ('features.enable_statistics', '1', 'boolean', 'features', 'Enable play statistics tracking', 0, '1'),
  ('features.enable_activity_log', '1', 'boolean', 'features', 'Enable activity logging', 0, '1'),
  ('features.enable_user_profiles', '1', 'boolean', 'features', 'Enable user profiles', 0, '1');

-- Game Player Settings
INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value)
VALUES
  ('game.default_scale_mode', 'showall', 'string', 'game', 'Default Ruffle scale mode', 1, 'showall'),
  ('game.default_volume', '0.7', 'float', 'game', 'Default volume level (0.0 - 1.0)', 1, '0.7'),
  ('game.enable_flash', '1', 'boolean', 'game', 'Enable Flash game playback', 1, '1'),
  ('game.enable_html5', '1', 'boolean', 'game', 'Enable HTML5 game playback', 1, '1');

-- Storage & Performance Settings
INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value)
VALUES
  ('storage.cache_size_mb', '500', 'integer', 'storage', 'Maximum cache size in MB', 0, '500'),
  ('storage.log_retention_days', '30', 'integer', 'storage', 'Log file retention in days', 0, '30'),
  ('storage.temp_file_retention_days', '7', 'integer', 'storage', 'Temporary file retention in days', 0, '7');

-- Rate Limiting Settings
INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value)
VALUES
  ('rate_limit.api_requests_per_minute', '100', 'integer', 'rate_limit', 'API requests per minute per user', 0, '100'),
  ('rate_limit.enable_rate_limiting', '1', 'boolean', 'rate_limit', 'Enable rate limiting', 0, '1');
