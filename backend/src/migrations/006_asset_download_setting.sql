-- ===================================
-- Migration 006: Download images after a metadata sync
-- ===================================
-- Off by default: images normally arrive on demand, and pre-fetching costs
-- CDN traffic and disk. Useful for offline hosts where a sync can add
-- thousands of games whose images would otherwise never be fetched.

INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value, validation_schema)
VALUES
  ('metadata.download_assets_enabled', '0', 'boolean', 'metadata', 'Download game images after a metadata sync instead of on demand', 0, '0', '{"type":"boolean"}');
