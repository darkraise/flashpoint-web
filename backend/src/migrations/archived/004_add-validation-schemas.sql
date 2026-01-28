-- Migration 004: Add validation schemas to system settings
-- Created: 2026-01-18
-- Purpose: Add JSON schema validation for runtime validation of setting values

-- ===================================
-- UPDATE VALIDATION SCHEMAS
-- ===================================

-- Auth Settings Validation
UPDATE system_settings SET validation_schema = '{"type":"boolean"}' WHERE key = 'auth.guest_access_enabled';
UPDATE system_settings SET validation_schema = '{"type":"boolean"}' WHERE key = 'auth.user_registration_enabled';
UPDATE system_settings SET validation_schema = '{"type":"boolean"}' WHERE key = 'auth.require_email_verification';
UPDATE system_settings SET validation_schema = '{"type":"integer","minimum":5,"maximum":1440}' WHERE key = 'auth.session_timeout_minutes';
UPDATE system_settings SET validation_schema = '{"type":"integer","minimum":1,"maximum":100}' WHERE key = 'auth.max_login_attempts';
UPDATE system_settings SET validation_schema = '{"type":"integer","minimum":1,"maximum":1440}' WHERE key = 'auth.lockout_duration_minutes';

-- App Settings Validation
UPDATE system_settings SET validation_schema = '{"type":"string","minLength":1,"maxLength":100}' WHERE key = 'app.site_name';
UPDATE system_settings SET validation_schema = '{"type":"boolean"}' WHERE key = 'app.maintenance_mode';
UPDATE system_settings SET validation_schema = '{"type":"string","enum":["light","dark","system"]}' WHERE key = 'app.default_theme';
UPDATE system_settings SET validation_schema = '{"type":"string","enum":["slate","gray","zinc","neutral","stone","red","orange","amber","yellow","lime","green","emerald","teal","cyan","sky","blue","indigo","violet","purple","fuchsia","pink","rose"]}' WHERE key = 'app.default_primary_color';

-- Metadata Settings Validation
UPDATE system_settings SET validation_schema = '{"type":"boolean"}' WHERE key = 'metadata.auto_sync_enabled';
UPDATE system_settings SET validation_schema = '{"type":"integer","minimum":1,"maximum":1440}' WHERE key = 'metadata.sync_interval_minutes';
UPDATE system_settings SET validation_schema = '{"type":"boolean"}' WHERE key = 'metadata.sync_tags';
UPDATE system_settings SET validation_schema = '{"type":"boolean"}' WHERE key = 'metadata.sync_platforms';

-- Feature Flags Validation
UPDATE system_settings SET validation_schema = '{"type":"boolean"}' WHERE key = 'features.enable_playlists';
UPDATE system_settings SET validation_schema = '{"type":"boolean"}' WHERE key = 'features.enable_favorites';
UPDATE system_settings SET validation_schema = '{"type":"boolean"}' WHERE key = 'features.enable_statistics';
UPDATE system_settings SET validation_schema = '{"type":"boolean"}' WHERE key = 'features.enable_activity_log';
UPDATE system_settings SET validation_schema = '{"type":"boolean"}' WHERE key = 'features.enable_user_profiles';

-- Game Settings Validation
UPDATE system_settings SET validation_schema = '{"type":"string","enum":["exactfit","noborder","showall","noscale"]}' WHERE key = 'game.default_scale_mode';
UPDATE system_settings SET validation_schema = '{"type":"number","minimum":0,"maximum":1}' WHERE key = 'game.default_volume';
UPDATE system_settings SET validation_schema = '{"type":"boolean"}' WHERE key = 'game.enable_flash';
UPDATE system_settings SET validation_schema = '{"type":"boolean"}' WHERE key = 'game.enable_html5';

-- Storage Settings Validation
UPDATE system_settings SET validation_schema = '{"type":"integer","minimum":100,"maximum":10000}' WHERE key = 'storage.cache_size_mb';
UPDATE system_settings SET validation_schema = '{"type":"integer","minimum":1,"maximum":365}' WHERE key = 'storage.log_retention_days';
UPDATE system_settings SET validation_schema = '{"type":"integer","minimum":1,"maximum":30}' WHERE key = 'storage.temp_file_retention_days';

-- Rate Limit Settings Validation
UPDATE system_settings SET validation_schema = '{"type":"integer","minimum":10,"maximum":10000}' WHERE key = 'rate_limit.api_requests_per_minute';
UPDATE system_settings SET validation_schema = '{"type":"boolean"}' WHERE key = 'rate_limit.enable_rate_limiting';
