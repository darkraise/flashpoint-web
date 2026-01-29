-- Consolidated Seed Data
-- Created: 2026-01-28
-- Purpose: Insert all default data (roles, permissions, settings)
-- This consolidates seed data from migrations 001, 003, 004, 006, 008, 010, 013, 016
-- Note: User-specific settings (002, 014) are handled in application code for new users

-- ===================================
-- SEED DEFAULT ROLES
-- ===================================
INSERT OR IGNORE INTO roles (id, name, description, priority) VALUES
  (1, 'admin', 'Administrator with full access to all features', 100),
  (2, 'user', 'Regular user with standard access', 50),
  (3, 'guest', 'Guest user with read-only access', 0);

-- ===================================
-- SEED DEFAULT PERMISSIONS
-- ===================================
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
-- SEED ROLE-PERMISSION MAPPINGS
-- ===================================
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

-- ===================================
-- SEED SYSTEM SETTINGS: AUTH
-- ===================================
INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value, validation_schema)
VALUES
  ('auth.guest_access_enabled', '1', 'boolean', 'auth', 'Allow guest access to browse games', 1, '1', '{"type":"boolean"}'),
  ('auth.user_registration_enabled', '1', 'boolean', 'auth', 'Allow anonymous users to register accounts', 1, '1', '{"type":"boolean"}'),
  ('auth.require_email_verification', '0', 'boolean', 'auth', 'Require email verification for new accounts', 0, '0', '{"type":"boolean"}'),
  ('auth.session_timeout_minutes', '60', 'integer', 'auth', 'Session timeout in minutes', 0, '60', '{"type":"integer","minimum":5,"maximum":1440}'),
  ('auth.max_login_attempts', '5', 'integer', 'auth', 'Maximum failed login attempts before lockout', 0, '5', '{"type":"integer","minimum":1,"maximum":100}'),
  ('auth.lockout_duration_minutes', '15', 'integer', 'auth', 'Account lockout duration in minutes', 0, '15', '{"type":"integer","minimum":1,"maximum":1440}');

-- ===================================
-- SEED SYSTEM SETTINGS: APP
-- ===================================
INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value, validation_schema)
VALUES
  ('app.site_name', 'Flashpoint Web', 'string', 'app', 'Application name displayed in UI', 1, 'Flashpoint Web', '{"type":"string","minLength":1,"maxLength":100}'),
  ('app.maintenance_mode', '0', 'boolean', 'app', 'Enable maintenance mode', 1, '0', '{"type":"boolean"}'),
  ('app.default_theme', 'dark', 'string', 'app', 'Default theme mode (light, dark, system)', 1, 'dark', '{"type":"string","enum":["light","dark","system"]}'),
  ('app.default_primary_color', 'blue', 'string', 'app', 'Default primary color', 1, 'blue', '{"type":"string","enum":["slate","gray","zinc","neutral","stone","red","orange","amber","yellow","lime","green","emerald","teal","cyan","sky","blue","indigo","violet","purple","fuchsia","pink","rose"]}'),
  ('app.date_format', 'MM/dd/yyyy', 'string', 'app', 'Date format for displaying dates throughout the application', 1, 'MM/dd/yyyy', '{"type":"string","enum":["MM/dd/yyyy","dd/MM/yyyy","yyyy-MM-dd","MMM dd, yyyy","MMMM dd, yyyy","dd MMM yyyy","dd MMMM yyyy"]}'),
  ('app.time_format', 'hh:mm a', 'string', 'app', 'Time format for displaying times throughout the application', 1, 'hh:mm a', '{"type":"string","enum":["hh:mm a","HH:mm","hh:mm:ss a","HH:mm:ss"]}');

-- ===================================
-- SEED SYSTEM SETTINGS: METADATA
-- ===================================
INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value, validation_schema)
VALUES
  ('metadata.auto_sync_enabled', '0', 'boolean', 'metadata', 'Automatically sync metadata on startup', 0, '0', '{"type":"boolean"}'),
  ('metadata.sync_interval_minutes', '60', 'integer', 'metadata', 'Metadata sync interval in minutes', 0, '60', '{"type":"integer","minimum":1,"maximum":1440}'),
  ('metadata.sync_tags', '1', 'boolean', 'metadata', 'Include tags in metadata sync', 0, '1', '{"type":"boolean"}'),
  ('metadata.sync_platforms', '1', 'boolean', 'metadata', 'Include platforms in metadata sync', 0, '1', '{"type":"boolean"}');

-- ===================================
-- SEED SYSTEM SETTINGS: FEATURES
-- ===================================
-- From Migration 010: Made public and removed non-existent features
INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value, validation_schema)
VALUES
  ('features.enable_playlists', '1', 'boolean', 'features', 'Enable playlists feature', 1, '1', '{"type":"boolean"}'),
  ('features.enable_favorites', '1', 'boolean', 'features', 'Enable favorites feature', 1, '1', '{"type":"boolean"}'),
  ('features.enable_statistics', '1', 'boolean', 'features', 'Enable play statistics tracking', 1, '1', '{"type":"boolean"}');

-- ===================================
-- SEED SYSTEM SETTINGS: STORAGE
-- ===================================
INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value, validation_schema)
VALUES
  ('storage.cache_size_mb', '500', 'integer', 'storage', 'Maximum cache size in MB', 0, '500', '{"type":"integer","minimum":100,"maximum":10000}'),
  ('storage.log_retention_days', '30', 'integer', 'storage', 'Log file retention in days', 0, '30', '{"type":"integer","minimum":1,"maximum":365}'),
  ('storage.temp_file_retention_days', '7', 'integer', 'storage', 'Temporary file retention in days', 0, '7', '{"type":"integer","minimum":1,"maximum":30}');

-- ===================================
-- SEED SYSTEM SETTINGS: RATE LIMITING
-- ===================================
INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value, validation_schema)
VALUES
  ('rate_limit.api_requests_per_minute', '100', 'integer', 'rate_limit', 'API requests per minute per user', 0, '100', '{"type":"integer","minimum":10,"maximum":10000}'),
  ('rate_limit.enable_rate_limiting', '1', 'boolean', 'rate_limit', 'Enable rate limiting', 0, '1', '{"type":"boolean"}');

-- ===================================
-- SEED SYSTEM SETTINGS: JOBS
-- ===================================
-- From Migrations 006, 008, 016: Jobs settings with cron expressions
INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value)
VALUES
  ('jobs.metadata_sync_enabled', '0', 'boolean', 'jobs', 'Enable automatic metadata sync job', 0, '0'),
  ('jobs.metadata_sync_schedule', '0 * * * *', 'string', 'jobs', 'Cron schedule for metadata sync job (e.g., "0 * * * *" for hourly)', 0, '0 * * * *'),
  ('jobs.ruffle_update_enabled', '0', 'boolean', 'jobs', 'Enable automatic Ruffle update job', 0, '0'),
  ('jobs.ruffle_update_schedule', '0 0 * * *', 'string', 'jobs', 'Cron schedule for Ruffle update job (default: daily at midnight)', 0, '0 0 * * *');
