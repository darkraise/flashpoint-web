-- Migration: 008_convert-interval-to-cron.sql
-- Description: Convert job interval_minutes to cron expression for better scheduling control
-- Date: 2026-01-19

-- Update metadata_sync_interval_minutes to cron expression
-- Default: Every hour at minute 0 (0 * * * *)
UPDATE system_settings
SET
  key = 'jobs.metadata_sync_schedule',
  data_type = 'string',
  description = 'Cron schedule for metadata sync job (e.g., "0 * * * *" for hourly)',
  value = CASE
    -- Convert common intervals to cron expressions
    WHEN CAST(value AS INTEGER) = 15 THEN '*/15 * * * *'  -- Every 15 minutes
    WHEN CAST(value AS INTEGER) = 30 THEN '*/30 * * * *'  -- Every 30 minutes
    WHEN CAST(value AS INTEGER) = 60 THEN '0 * * * *'     -- Every hour
    WHEN CAST(value AS INTEGER) = 120 THEN '0 */2 * * *'  -- Every 2 hours
    WHEN CAST(value AS INTEGER) = 360 THEN '0 */6 * * *'  -- Every 6 hours
    WHEN CAST(value AS INTEGER) = 720 THEN '0 */12 * * *' -- Every 12 hours
    WHEN CAST(value AS INTEGER) = 1440 THEN '0 0 * * *'   -- Daily at midnight
    ELSE '0 * * * *'  -- Default to hourly
  END,
  default_value = '0 * * * *'
WHERE key = 'jobs.metadata_sync_interval_minutes';
