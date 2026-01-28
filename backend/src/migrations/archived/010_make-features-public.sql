-- Make feature flags publicly accessible (for frontend to check)
-- Frontend needs to know which features are enabled to hide/show UI elements

UPDATE system_settings
SET is_public = 1
WHERE key IN (
  'features.enable_playlists',
  'features.enable_favorites',
  'features.enable_statistics'
);

-- Remove non-existent features from database
DELETE FROM system_settings
WHERE key IN (
  'features.enable_activity_log',
  'features.enable_user_profiles'
);
