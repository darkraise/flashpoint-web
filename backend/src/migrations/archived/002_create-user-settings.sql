-- Create user_settings table for extensible key-value storage
-- This table stores user preferences and settings in a flexible format
-- allowing new settings to be added without schema changes

CREATE TABLE IF NOT EXISTS user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, setting_key)
);

-- Index for efficient lookups by user
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Index for lookups by setting key
CREATE INDEX IF NOT EXISTS idx_user_settings_key ON user_settings(setting_key);

-- Composite index for user + key lookups (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_user_settings_user_key ON user_settings(user_id, setting_key);

-- Migrate existing theme data from users table to user_settings
-- Default all users to dark mode
INSERT OR IGNORE INTO user_settings (user_id, setting_key, setting_value)
SELECT id, 'theme_mode', 'dark' FROM users WHERE id IS NOT NULL;

-- Migrate theme_color to primary_color setting
-- Extract color name from Tailwind color codes (e.g., 'blue-500' -> 'blue')
INSERT OR IGNORE INTO user_settings (user_id, setting_key, setting_value)
SELECT id, 'primary_color',
  CASE
    WHEN theme_color LIKE 'blue%' THEN 'blue'
    WHEN theme_color LIKE 'slate%' THEN 'slate'
    WHEN theme_color LIKE 'gray%' THEN 'gray'
    WHEN theme_color LIKE 'zinc%' THEN 'zinc'
    WHEN theme_color LIKE 'neutral%' THEN 'neutral'
    WHEN theme_color LIKE 'stone%' THEN 'stone'
    WHEN theme_color LIKE 'red%' THEN 'red'
    WHEN theme_color LIKE 'orange%' THEN 'orange'
    WHEN theme_color LIKE 'amber%' THEN 'amber'
    WHEN theme_color LIKE 'yellow%' THEN 'yellow'
    WHEN theme_color LIKE 'lime%' THEN 'lime'
    WHEN theme_color LIKE 'green%' THEN 'green'
    WHEN theme_color LIKE 'emerald%' THEN 'emerald'
    WHEN theme_color LIKE 'teal%' THEN 'teal'
    WHEN theme_color LIKE 'cyan%' THEN 'cyan'
    WHEN theme_color LIKE 'sky%' THEN 'sky'
    WHEN theme_color LIKE 'indigo%' THEN 'indigo'
    WHEN theme_color LIKE 'violet%' THEN 'violet'
    WHEN theme_color LIKE 'purple%' THEN 'purple'
    WHEN theme_color LIKE 'fuchsia%' THEN 'fuchsia'
    WHEN theme_color LIKE 'pink%' THEN 'pink'
    WHEN theme_color LIKE 'rose%' THEN 'rose'
    ELSE 'blue'
  END
FROM users WHERE id IS NOT NULL;
