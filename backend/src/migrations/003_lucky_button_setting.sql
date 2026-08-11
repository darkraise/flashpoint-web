-- ===================================
-- Migration 003: "I'm Feeling Lucky" button visibility
-- ===================================

-- Feature flag controlling the floating random-game button in the app shell
INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value, validation_schema)
VALUES ('features.enable_lucky_button', '1', 'boolean', 'features', 'Show the "I''m Feeling Lucky" random game button', 1, '1', '{"type":"boolean"}');
