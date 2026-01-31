-- Add date and time format settings to user_settings
-- This migration moves date/time format from system settings to per-user settings
-- allowing each user to customize their own date/time display preferences

-- Add default date format for all existing users (US format)
INSERT OR IGNORE INTO user_settings (user_id, setting_key, setting_value)
SELECT id, 'date_format', 'MM/dd/yyyy' FROM users WHERE id IS NOT NULL;

-- Add default time format for all existing users (12-hour with AM/PM)
INSERT OR IGNORE INTO user_settings (user_id, setting_key, setting_value)
SELECT id, 'time_format', 'hh:mm a' FROM users WHERE id IS NOT NULL;
