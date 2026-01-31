-- Migration: Grant games.play permission to guest role
-- Created: 2026-01-29
-- Purpose: Allow anonymous users viewing shared playlists to play games
-- The game stats will be tracked under the guest user

-- Add games.play permission to guest role
-- This allows anonymous users to play games from shared playlists
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions
WHERE name = 'games.play';
