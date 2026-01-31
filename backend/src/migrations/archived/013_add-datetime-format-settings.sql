-- Migration 013: Add date and time format settings
-- Created: 2026-01-24
-- Purpose: Add date_format and time_format settings for customizable datetime display
-- Rollback: DELETE FROM system_settings WHERE key IN ('app.date_format', 'app.time_format');

-- Add date format setting
INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value, validation_schema)
VALUES (
  'app.date_format',
  'MM/dd/yyyy',
  'string',
  'app',
  'Date format for displaying dates throughout the application',
  1,
  'MM/dd/yyyy',
  '{"type":"string","enum":["MM/dd/yyyy","dd/MM/yyyy","yyyy-MM-dd","MMM dd, yyyy","MMMM dd, yyyy","dd MMM yyyy","dd MMMM yyyy"]}'
);

-- Add time format setting
INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value, validation_schema)
VALUES (
  'app.time_format',
  'hh:mm a',
  'string',
  'app',
  'Time format for displaying times throughout the application',
  1,
  'hh:mm a',
  '{"type":"string","enum":["hh:mm a","HH:mm","hh:mm:ss a","HH:mm:ss"]}'
);
