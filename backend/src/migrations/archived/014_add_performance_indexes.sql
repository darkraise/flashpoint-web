-- Migration 014: Add Performance Indexes
-- Purpose: Add composite indexes to improve query performance for frequently-accessed patterns
-- Date: 2026-01-30

-- ============================================================================
-- Login Attempts Performance Index
-- ============================================================================

-- Composite index for the checkLoginAttempts query:
-- WHERE success = 0 AND attempted_at > datetime(...)
-- This speeds up lockout checks by allowing index-only scans
CREATE INDEX IF NOT EXISTS idx_login_attempts_success_time
  ON login_attempts(success, attempted_at);

-- ============================================================================
-- Play Session Performance Indexes
-- ============================================================================

-- Composite index for finding active sessions:
-- WHERE ended_at IS NULL
-- Used by endPlaySession and cleanup jobs
CREATE INDEX IF NOT EXISTS idx_user_game_plays_active
  ON user_game_plays(ended_at, started_at)
  WHERE ended_at IS NULL;

-- Composite index for user play history queries:
-- WHERE user_id = ? ORDER BY started_at DESC
-- Used by play statistics and history features
CREATE INDEX IF NOT EXISTS idx_user_game_plays_user_time
  ON user_game_plays(user_id, started_at DESC);

-- ============================================================================
-- Activity Logs Performance Index
-- ============================================================================

-- Composite index for user activity queries:
-- WHERE user_id = ? ORDER BY created_at DESC
-- Used by activity log views and audit trails
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_time
  ON activity_logs(user_id, created_at DESC);

-- ============================================================================
-- Refresh Tokens Performance Index
-- ============================================================================

-- Composite index for token cleanup:
-- WHERE expires_at < datetime('now') AND revoked_at IS NULL
-- Used by periodic cleanup jobs
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_cleanup
  ON refresh_tokens(expires_at, revoked_at)
  WHERE revoked_at IS NULL;

-- ============================================================================
-- User Game Stats Performance Indexes
-- ============================================================================

-- Composite index for "most played" queries:
-- WHERE user_id = ? ORDER BY total_plays DESC
CREATE INDEX IF NOT EXISTS idx_user_game_stats_plays
  ON user_game_stats(user_id, total_plays DESC);

-- Composite index for "most playtime" queries:
-- WHERE user_id = ? ORDER BY total_playtime_seconds DESC
CREATE INDEX IF NOT EXISTS idx_user_game_stats_playtime
  ON user_game_stats(user_id, total_playtime_seconds DESC);

-- Composite index for "recently played" queries:
-- WHERE user_id = ? ORDER BY last_played_at DESC
CREATE INDEX IF NOT EXISTS idx_user_game_stats_recent
  ON user_game_stats(user_id, last_played_at DESC);

-- ============================================================================
-- Notes
-- ============================================================================

-- All indexes use IF NOT EXISTS to ensure idempotency
-- Partial indexes (with WHERE clauses) reduce index size and improve performance
-- DESC ordering in indexes allows for efficient ORDER BY DESC queries without sorting
-- Composite indexes follow the principle: equality conditions first, then range/sort columns
