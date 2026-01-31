-- Migration: 006_create-jobs-settings.sql
-- Description: Add jobs category to system settings for background job configuration
-- Date: 2026-01-19

-- Insert default jobs settings for metadata sync job
INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value)
VALUES
  ('jobs.metadata_sync_enabled', '0', 'boolean', 'jobs', 'Enable automatic metadata sync job', 0, '0'),
  ('jobs.metadata_sync_interval_minutes', '60', 'integer', 'jobs', 'Interval in minutes for metadata sync job (minimum: 15)', 0, '60');
