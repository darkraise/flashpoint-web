-- Migration: 016_add-ruffle-update-job-settings.sql
-- Description: Add Ruffle update job settings to system settings
-- Date: 2026-01-25

-- Insert default Ruffle update job settings
INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value)
VALUES
  ('jobs.ruffle_update_enabled', '0', 'boolean', 'jobs', 'Enable automatic Ruffle update job', 0, '0'),
  ('jobs.ruffle_update_schedule', '0 0 * * *', 'string', 'jobs', 'Cron schedule for Ruffle update job (default: daily at midnight)', 0, '0 0 * * *');
