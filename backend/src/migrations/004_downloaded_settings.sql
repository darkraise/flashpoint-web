-- ===================================
-- Migration 004: Downloaded games page and filter settings
-- ===================================

INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value, validation_schema)
VALUES
  ('features.enable_downloaded_page', '1', 'boolean', 'features', 'Show the Downloaded games page', 1, '1', '{"type":"boolean"}'),
  ('features.enable_downloaded_page_for_guests', '0', 'boolean', 'features', 'Allow guests to see the Downloaded games page', 1, '0', '{"type":"boolean"}'),
  ('features.enable_downloaded_filter_default', '0', 'boolean', 'features', 'Turn the downloaded filter on by default when browsing', 1, '0', '{"type":"boolean"}');
