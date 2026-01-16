-- Migration: Add theme_color to users table
-- This allows users to customize their theme color preference

ALTER TABLE users ADD COLUMN theme_color TEXT DEFAULT 'blue-500';

-- Index for faster lookups (optional, but good practice)
CREATE INDEX IF NOT EXISTS idx_users_theme_color ON users(theme_color);
