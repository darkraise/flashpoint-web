-- Migration: Add surface_color to users table
-- This allows users to customize their surface/background color preference

ALTER TABLE users ADD COLUMN surface_color TEXT DEFAULT 'slate-700';
