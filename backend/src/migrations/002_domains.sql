-- ============================================================================
-- Migration 002: Domain Settings
-- ============================================================================
-- Adds configurable domains for playlist sharing URLs and CORS management.
-- Admins can add multiple domains, set a default for share links.
-- ============================================================================

CREATE TABLE IF NOT EXISTS domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hostname TEXT NOT NULL UNIQUE COLLATE NOCASE,
  is_default BOOLEAN NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_by INTEGER,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Enforce at most one default domain at the database level
CREATE UNIQUE INDEX IF NOT EXISTS idx_domains_single_default ON domains(is_default) WHERE is_default = 1;
