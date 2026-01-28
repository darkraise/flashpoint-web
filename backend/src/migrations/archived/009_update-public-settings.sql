-- Migration 009: Update is_public flag for settings that need to be accessible without authentication
-- Created: 2026-01-20
-- Purpose: Make game player settings and site name public so they work for all users (including guests)

-- Update game settings to be public (needed for game player)
UPDATE system_settings
SET is_public = 1
WHERE key IN (
  'game.default_scale_mode',
  'game.default_volume'
);

-- Note: Site name (app.site_name) and maintenance mode (app.maintenance_mode)
-- are already public from the initial migration
