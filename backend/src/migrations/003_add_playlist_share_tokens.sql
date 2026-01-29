-- Migration: Add playlist share token support
-- Description: Adds share_token, share_expires_at, and show_owner columns to user_playlists table
-- Version: 003
-- Date: 2026-01-29

-- Add share token column (UUID for secure sharing)
ALTER TABLE user_playlists
ADD COLUMN share_token TEXT;

-- Add share expiry column (ISO 8601 datetime, NULL = never expires)
ALTER TABLE user_playlists
ADD COLUMN share_expires_at TEXT;

-- Add owner visibility toggle (show/hide creator name on shared view)
ALTER TABLE user_playlists
ADD COLUMN show_owner BOOLEAN NOT NULL DEFAULT 0;

-- Create unique index for fast share token lookups (critical for anonymous access)
-- Using unique index instead of UNIQUE column constraint for SQLite ALTER TABLE compatibility
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_playlists_share_token
ON user_playlists(share_token)
WHERE share_token IS NOT NULL;

-- Create index for filtering public playlists
CREATE INDEX IF NOT EXISTS idx_user_playlists_public
ON user_playlists(is_public)
WHERE is_public = 1;

-- Create index for expiry cleanup queries (future: cron job to auto-disable expired shares)
CREATE INDEX IF NOT EXISTS idx_user_playlists_share_expires
ON user_playlists(share_expires_at)
WHERE share_expires_at IS NOT NULL;
