-- ===================================
-- Migration 005: Admin metadata source override
-- ===================================
-- The Ultimate edition ships preferences.json without gameMetadataSources, so
-- metadata sync is unavailable there. These settings let an admin opt in to a
-- source explicitly. Not public: only admins read or change them.

INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value, validation_schema)
VALUES
  ('metadata.custom_source_enabled', '0', 'boolean', 'metadata', 'Use an admin-configured metadata source instead of Flashpoint preferences', 0, '0', '{"type":"boolean"}'),
  ('metadata.custom_source_url', '', 'string', 'metadata', 'Metadata source base URL used when the override is enabled', 0, '', '{"type":"string","maxLength":200}');
