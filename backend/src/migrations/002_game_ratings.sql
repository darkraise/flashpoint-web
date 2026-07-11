-- ===================================
-- Migration 002: Game Ratings
-- ===================================

-- Game ratings table: one rating per user per game
CREATE TABLE IF NOT EXISTS game_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_game_ratings_user_id ON game_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_game_ratings_game_id ON game_ratings(game_id);
CREATE INDEX IF NOT EXISTS idx_game_ratings_game_rating ON game_ratings(game_id, rating);
CREATE INDEX IF NOT EXISTS idx_game_ratings_updated_at ON game_ratings(updated_at DESC);

-- Permission for rating games
INSERT OR IGNORE INTO permissions (name, description, resource, action)
VALUES ('games.rate', 'Rate games', 'games', 'rate');

-- Grant games.rate to admin role (role_id=1)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE name = 'games.rate';

-- Grant games.rate to user role (role_id=2)
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE name = 'games.rate';

-- Feature flag for ratings
INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description, is_public, default_value, validation_schema)
VALUES ('features.enable_ratings', '1', 'boolean', 'features', 'Enable game ratings feature', 1, '1', '{"type":"boolean"}');
