-- Migration: Remove all game settings from system_settings
-- Description: Removes all game category settings (volume, scale mode, enable flags)
--              as game settings are no longer configurable by administrators
-- Date: 2026-01-22

-- Remove all game category settings from system_settings table
DELETE FROM system_settings WHERE category = 'game';
