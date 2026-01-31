-- Migration Registry Bootstrap
-- Created: 2026-01-28
-- Purpose: Create migrations table to track applied migrations
-- This is a one-time bootstrap that should never be modified after creation

-- ===================================
-- MIGRATIONS REGISTRY TABLE
-- ===================================
CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  checksum TEXT,
  execution_time_ms INTEGER,
  description TEXT
);

CREATE INDEX IF NOT EXISTS idx_migrations_name ON migrations(name);
CREATE INDEX IF NOT EXISTS idx_migrations_applied_at ON migrations(applied_at);
