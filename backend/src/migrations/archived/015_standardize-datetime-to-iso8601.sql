-- Migration 015: Standardize DateTime Storage to ISO 8601 UTC
-- Created: 2026-01-25
-- Purpose: Convert all datetime columns from SQLite format to ISO 8601 UTC format
--          From: '2026-01-24 17:52:03' (SQLite datetime)
--          To:   '2026-01-24T17:52:03.000Z' (ISO 8601 UTC)
-- Note: This migration converts format only. Historical records inserted via SQLite
--       defaults may represent local time, but will be marked as UTC going forward.
-- Rollback: Manually restore datetime formats using REPLACE(column, 'T', ' ')

-- ===================================
-- CONVERT USERS TABLE
-- ===================================
UPDATE users
SET
  created_at = CASE
    WHEN created_at LIKE '%T%' THEN created_at  -- Already ISO format
    ELSE REPLACE(created_at, ' ', 'T') || '.000Z'
  END,
  updated_at = CASE
    WHEN updated_at LIKE '%T%' THEN updated_at
    ELSE REPLACE(updated_at, ' ', 'T') || '.000Z'
  END,
  last_login_at = CASE
    WHEN last_login_at IS NULL THEN NULL
    WHEN last_login_at LIKE '%T%' THEN last_login_at
    ELSE REPLACE(last_login_at, ' ', 'T') || '.000Z'
  END
WHERE created_at NOT LIKE '%T%'
   OR updated_at NOT LIKE '%T%'
   OR (last_login_at IS NOT NULL AND last_login_at NOT LIKE '%T%');

-- ===================================
-- CONVERT ROLES TABLE
-- ===================================
UPDATE roles
SET
  created_at = CASE
    WHEN created_at LIKE '%T%' THEN created_at
    ELSE REPLACE(created_at, ' ', 'T') || '.000Z'
  END,
  updated_at = CASE
    WHEN updated_at LIKE '%T%' THEN updated_at
    ELSE REPLACE(updated_at, ' ', 'T') || '.000Z'
  END
WHERE created_at NOT LIKE '%T%'
   OR updated_at NOT LIKE '%T%';

-- ===================================
-- CONVERT PERMISSIONS TABLE
-- ===================================
UPDATE permissions
SET
  created_at = CASE
    WHEN created_at LIKE '%T%' THEN created_at
    ELSE REPLACE(created_at, ' ', 'T') || '.000Z'
  END
WHERE created_at NOT LIKE '%T%';

-- ===================================
-- CONVERT ROLE_PERMISSIONS TABLE
-- ===================================
UPDATE role_permissions
SET
  created_at = CASE
    WHEN created_at LIKE '%T%' THEN created_at
    ELSE REPLACE(created_at, ' ', 'T') || '.000Z'
  END
WHERE created_at NOT LIKE '%T%';

-- ===================================
-- CONVERT REFRESH_TOKENS TABLE
-- ===================================
UPDATE refresh_tokens
SET
  expires_at = CASE
    WHEN expires_at LIKE '%T%' THEN expires_at
    ELSE REPLACE(expires_at, ' ', 'T') || '.000Z'
  END,
  created_at = CASE
    WHEN created_at LIKE '%T%' THEN created_at
    ELSE REPLACE(created_at, ' ', 'T') || '.000Z'
  END,
  revoked_at = CASE
    WHEN revoked_at IS NULL THEN NULL
    WHEN revoked_at LIKE '%T%' THEN revoked_at
    ELSE REPLACE(revoked_at, ' ', 'T') || '.000Z'
  END
WHERE expires_at NOT LIKE '%T%'
   OR created_at NOT LIKE '%T%'
   OR (revoked_at IS NOT NULL AND revoked_at NOT LIKE '%T%');

-- ===================================
-- CONVERT ACTIVITY_LOGS TABLE
-- ===================================
UPDATE activity_logs
SET
  created_at = CASE
    WHEN created_at LIKE '%T%' THEN created_at
    ELSE REPLACE(created_at, ' ', 'T') || '.000Z'
  END
WHERE created_at NOT LIKE '%T%';

-- ===================================
-- CONVERT LOGIN_ATTEMPTS TABLE
-- ===================================
UPDATE login_attempts
SET
  attempted_at = CASE
    WHEN attempted_at LIKE '%T%' THEN attempted_at
    ELSE REPLACE(attempted_at, ' ', 'T') || '.000Z'
  END
WHERE attempted_at NOT LIKE '%T%';

-- ===================================
-- CONVERT USER_GAME_PLAYS TABLE
-- ===================================
-- Note: This table likely already uses ISO format from backend
UPDATE user_game_plays
SET
  started_at = CASE
    WHEN started_at LIKE '%T%' THEN started_at
    ELSE REPLACE(started_at, ' ', 'T') || '.000Z'
  END,
  ended_at = CASE
    WHEN ended_at IS NULL THEN NULL
    WHEN ended_at LIKE '%T%' THEN ended_at
    ELSE REPLACE(ended_at, ' ', 'T') || '.000Z'
  END
WHERE started_at NOT LIKE '%T%'
   OR (ended_at IS NOT NULL AND ended_at NOT LIKE '%T%');

-- ===================================
-- CONVERT USER_GAME_STATS TABLE
-- ===================================
UPDATE user_game_stats
SET
  first_played_at = CASE
    WHEN first_played_at IS NULL THEN NULL
    WHEN first_played_at LIKE '%T%' THEN first_played_at
    ELSE REPLACE(first_played_at, ' ', 'T') || '.000Z'
  END,
  last_played_at = CASE
    WHEN last_played_at IS NULL THEN NULL
    WHEN last_played_at LIKE '%T%' THEN last_played_at
    ELSE REPLACE(last_played_at, ' ', 'T') || '.000Z'
  END
WHERE (first_played_at IS NOT NULL AND first_played_at NOT LIKE '%T%')
   OR (last_played_at IS NOT NULL AND last_played_at NOT LIKE '%T%');

-- ===================================
-- CONVERT USER_STATS TABLE
-- ===================================
UPDATE user_stats
SET
  first_play_at = CASE
    WHEN first_play_at IS NULL THEN NULL
    WHEN first_play_at LIKE '%T%' THEN first_play_at
    ELSE REPLACE(first_play_at, ' ', 'T') || '.000Z'
  END,
  last_play_at = CASE
    WHEN last_play_at IS NULL THEN NULL
    WHEN last_play_at LIKE '%T%' THEN last_play_at
    ELSE REPLACE(last_play_at, ' ', 'T') || '.000Z'
  END,
  updated_at = CASE
    WHEN updated_at LIKE '%T%' THEN updated_at
    ELSE REPLACE(updated_at, ' ', 'T') || '.000Z'
  END
WHERE (first_play_at IS NOT NULL AND first_play_at NOT LIKE '%T%')
   OR (last_play_at IS NOT NULL AND last_play_at NOT LIKE '%T%')
   OR updated_at NOT LIKE '%T%';

-- ===================================
-- CONVERT USER_SETTINGS TABLE
-- ===================================
UPDATE user_settings
SET
  created_at = CASE
    WHEN created_at LIKE '%T%' THEN created_at
    ELSE REPLACE(created_at, ' ', 'T') || '.000Z'
  END,
  updated_at = CASE
    WHEN updated_at LIKE '%T%' THEN updated_at
    ELSE REPLACE(updated_at, ' ', 'T') || '.000Z'
  END
WHERE created_at NOT LIKE '%T%'
   OR updated_at NOT LIKE '%T%';

-- ===================================
-- CONVERT SYSTEM_SETTINGS TABLE
-- ===================================
UPDATE system_settings
SET
  updated_at = CASE
    WHEN updated_at LIKE '%T%' THEN updated_at
    ELSE REPLACE(updated_at, ' ', 'T') || '.000Z'
  END
WHERE updated_at NOT LIKE '%T%';

-- ===================================
-- CONVERT USER_PLAYLISTS TABLE
-- ===================================
UPDATE user_playlists
SET
  created_at = CASE
    WHEN created_at LIKE '%T%' THEN created_at
    ELSE REPLACE(created_at, ' ', 'T') || '.000Z'
  END,
  updated_at = CASE
    WHEN updated_at LIKE '%T%' THEN updated_at
    ELSE REPLACE(updated_at, ' ', 'T') || '.000Z'
  END
WHERE created_at NOT LIKE '%T%'
   OR updated_at NOT LIKE '%T%';

-- ===================================
-- CONVERT USER_PLAYLIST_GAMES TABLE
-- ===================================
UPDATE user_playlist_games
SET
  added_at = CASE
    WHEN added_at LIKE '%T%' THEN added_at
    ELSE REPLACE(added_at, ' ', 'T') || '.000Z'
  END
WHERE added_at NOT LIKE '%T%';

-- ===================================
-- CONVERT USER_FAVORITES TABLE
-- ===================================
UPDATE user_favorites
SET
  added_at = CASE
    WHEN added_at LIKE '%T%' THEN added_at
    ELSE REPLACE(added_at, ' ', 'T') || '.000Z'
  END
WHERE added_at NOT LIKE '%T%';

-- ===================================
-- CONVERT JOB_EXECUTION_LOGS TABLE
-- ===================================
-- Note: This table likely already uses ISO format from backend
UPDATE job_execution_logs
SET
  started_at = CASE
    WHEN started_at LIKE '%T%' THEN started_at
    ELSE REPLACE(started_at, ' ', 'T') || '.000Z'
  END,
  completed_at = CASE
    WHEN completed_at IS NULL THEN NULL
    WHEN completed_at LIKE '%T%' THEN completed_at
    ELSE REPLACE(completed_at, ' ', 'T') || '.000Z'
  END
WHERE started_at NOT LIKE '%T%'
   OR (completed_at IS NOT NULL AND completed_at NOT LIKE '%T%');

-- ===================================
-- UPDATE TRIGGERS TO USE ISO FORMAT
-- ===================================
-- Drop old triggers
DROP TRIGGER IF EXISTS trg_playlist_games_insert;
DROP TRIGGER IF EXISTS trg_playlist_games_delete;
DROP TRIGGER IF EXISTS trg_playlist_games_update;

-- Recreate triggers with ISO 8601 format
-- Note: We can't use datetime('now') anymore as it produces SQLite format
-- The backend should handle updated_at in application code instead
-- For now, we'll remove the updated_at updates from triggers

-- Increment game_count when game added to playlist
CREATE TRIGGER trg_playlist_games_insert
AFTER INSERT ON user_playlist_games
BEGIN
  UPDATE user_playlists
  SET game_count = game_count + 1
  WHERE id = NEW.playlist_id;
END;

-- Decrement game_count when game removed from playlist
CREATE TRIGGER trg_playlist_games_delete
AFTER DELETE ON user_playlist_games
BEGIN
  UPDATE user_playlists
  SET game_count = game_count - 1
  WHERE id = OLD.playlist_id;
END;

-- Note: Removed updated_at auto-update from triggers
-- Backend services will handle updated_at using new Date().toISOString()
