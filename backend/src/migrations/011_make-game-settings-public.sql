-- Migration 011: Make game settings publicly accessible
-- Created: 2026-01-21
-- Purpose: Allow frontend to access game settings (scale mode, volume, platform enablement)
-- Rollback: UPDATE system_settings SET is_public = 0 WHERE category = 'game';

-- Make all game settings public so frontend can access them
UPDATE system_settings
SET is_public = 1
WHERE category = 'game';
