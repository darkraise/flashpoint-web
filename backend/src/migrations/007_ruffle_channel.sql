-- ===================================
-- Migration 007: Ruffle release channel
-- ===================================
-- Ruffle publishes stable releases (vX.Y.Z) and nightlies (nightly-YYYY-MM-DD)
-- into one feed. Before this setting the updater took whichever came first,
-- so a stable release could land on a host tracking nightlies. Stable is the
-- default: nightly regressions only surface once a game refuses to run.

INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value, validation_schema)
VALUES
  ('ruffle.channel', 'stable', 'string', 'ruffle', 'Ruffle release channel to install and track', 0, 'stable', '{"type":"string","enum":["stable","nightly"]}');
