# Database Migrations

This directory contains SQL migration scripts for the user database (`user.db`).

## Current Migration Strategy (Simplified)

**Date:** 2026-01-30
**Status:** Consolidated into single migration file

All previous migrations have been consolidated into a single comprehensive migration file:

- **`001_complete_schema.sql`** - Complete database schema with all tables, indexes, triggers, seed data

This migration is **idempotent** and safe to run multiple times.

### What's Included:

✅ **All Tables** (15 total):
- Users & Authentication (users, roles, permissions, role_permissions, refresh_tokens)
- Activity Tracking (activity_logs, login_attempts)
- Game Play Tracking (user_game_plays, user_game_stats, user_stats)
- User Data (user_settings, user_playlists, user_playlist_games, user_favorites)
- System (system_settings, job_execution_logs)

✅ **All Indexes** (50+ optimized indexes):
- Basic indexes for foreign keys and lookups
- Composite indexes for complex queries
- Partial indexes for conditional queries
- Performance indexes for frequently-accessed patterns

✅ **All Triggers**:
- Auto-update playlist game_count

✅ **All Seed Data**:
- Default roles (admin, user, guest)
- Default permissions (18 permissions)
- Role-permission mappings
- System settings (35+ default settings)

✅ **Playlist Sharing Features**:
- share_token, share_expires_at, show_owner columns
- Unique indexes for secure sharing

## Migration Execution

Migrations are automatically executed on server startup by `UserDatabaseService.ts`:

1. **Bootstrap** - Creates migration registry table (`migrations_applied`)
2. **Schema Creation** - Runs `001_complete_schema.sql` if database doesn't exist
3. **Idempotent** - Safe to run multiple times (uses `IF NOT EXISTS` everywhere)

### Migration Registry (`bootstrap.sql`)

The migration system tracks applied migrations in the `migrations_applied` table:

```sql
CREATE TABLE IF NOT EXISTS migrations_applied (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  executed_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  execution_time_ms INTEGER
);
```

This allows:
- Detecting which migrations have been applied
- Preventing duplicate execution
- Verifying migration integrity with checksums
- Tracking execution performance

## Archived Migrations

Previous migration files (001-014) have been moved to `archived/` directory for reference:

- `001_initialize_schema_OLD.sql` - Original schema definition
- `002_seed_default_data.sql` - Original seed data
- `003_add_playlist_share_tokens.sql` - Playlist sharing feature
- `004_grant_play_permission_to_guests.sql` - Guest permissions
- `014_add_performance_indexes.sql` - Performance optimization indexes

These are kept for historical reference but are no longer executed.

## Adding New Migrations (Future)

When you need to modify the database schema after deployment:

### Option 1: Simple Changes (Recommended)

For new columns, indexes, or seed data:

1. **Create a new migration file** with the next version number:
   ```bash
   cd backend/src/migrations
   touch 002_your_migration_name.sql
   ```

   Current version: **001** (next available: **002**)

2. **Write idempotent SQL** using defensive checks:
   ```sql
   -- Migration 002: Description of changes
   -- Created: 2026-MM-DD

   -- Add new column (defensive)
   ALTER TABLE users ADD COLUMN IF NOT EXISTS new_column TEXT;

   -- Create new index (defensive)
   CREATE INDEX IF NOT EXISTS idx_name ON table(column);

   -- Insert new seed data (defensive)
   INSERT OR IGNORE INTO system_settings (key, value, ...) VALUES (...);
   ```

3. **Update `UserDatabaseService.ts`** to run the new migration:
   ```typescript
   // In runMigrations() method, after the 001 migration:

   // Migration 002: Your description
   await this.executeMigration('002_your_migration_name.sql');
   ```

4. **Test the migration**:
   - Backup `backend/user.db`
   - Restart backend server
   - Check console logs for migration execution
   - Verify changes with SQLite browser

### Option 2: Major Schema Changes

For breaking changes or complete restructuring:

1. Create a new comprehensive migration (e.g., `002_schema_v2.sql`)
2. Archive the old migration (`001_complete_schema.sql` → `archived/`)
3. Update documentation

## Migration Best Practices

### ✅ DO:

- Use version prefixes (001, 002, etc.)
- Write idempotent SQL with `IF NOT EXISTS` checks
- Add comments explaining changes
- Test on fresh database AND existing database
- Include rollback instructions if complex
- Create indexes for new columns that will be queried
- Use `INSERT OR IGNORE` for seed data
- Check migration into version control

### ❌ DON'T:

- Skip version numbers
- Modify existing migration files after deployment
- Assume data exists without checking
- Use `DROP TABLE` without backup strategy
- Forget to test on both fresh and existing databases
- Deploy without testing migrations locally first

## Example Migration Template

```sql
-- ============================================================================
-- Migration 002: Add User Notification Preferences
-- ============================================================================
-- Created: 2026-MM-DD
-- Purpose: Add email notification settings for users
-- Rollback: ALTER TABLE users DROP COLUMN IF EXISTS email_notifications_enabled;
-- ============================================================================

-- Add new column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT 1;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_users_email_notif
ON users(email_notifications_enabled)
WHERE email_notifications_enabled = 1;

-- Add system setting
INSERT OR IGNORE INTO system_settings
(key, value, data_type, category, description, is_public, default_value)
VALUES
('notifications.email_enabled', '1', 'boolean', 'notifications',
 'Enable email notifications', 0, '1');

-- ============================================================================
```

## Special Cases

### Dropping Columns in SQLite

SQLite doesn't support `DROP COLUMN` easily. To drop a column:

```sql
-- 1. Create new table without unwanted column
CREATE TABLE users_new (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL,
  -- ... other columns (excluding the one to drop)
);

-- 2. Copy data
INSERT INTO users_new
SELECT id, username, ... FROM users;

-- 3. Drop old table
DROP TABLE users;

-- 4. Rename new table
ALTER TABLE users_new RENAME TO users;

-- 5. Recreate indexes and triggers
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
```

### Complex Data Migrations

For complex data transformations, use transactions:

```sql
BEGIN TRANSACTION;

-- Perform migrations
UPDATE users SET role_id = 2 WHERE role_id IS NULL;
INSERT INTO user_stats SELECT user_id, ... FROM user_game_plays GROUP BY user_id;

-- Verify data integrity
-- Add CHECK constraints or validation queries here

COMMIT;
```

## Troubleshooting

### Migration not running

- Check console logs for error messages
- Verify migration file exists in `backend/src/migrations/`
- Ensure correct naming convention (XXX_description.sql)
- Check `UserDatabaseService.ts` includes migration execution

### Database locked error

- Close Flashpoint Launcher if running
- Close any SQLite browser tools
- Restart backend server
- Check no other process has `user.db` open

### Migration fails midway

- Check SQL syntax errors in logs
- Review migration logic
- Restore from backup if needed
- Fix migration SQL and restart

### Migration checksum mismatch

If you see checksum warnings:
- Migration file was modified after being applied
- This is usually safe if changes are additive
- Check `migrations_applied` table for recorded checksum

## Database Schema Overview

After running `001_complete_schema.sql`, the database contains:

```
user.db
├── users                    - User accounts
├── roles                    - RBAC roles (admin, user, guest)
├── permissions              - Available permissions
├── role_permissions         - Role-permission mappings
├── refresh_tokens           - JWT refresh tokens
├── activity_logs            - User activity audit trail
├── login_attempts           - Login attempt tracking for lockout
├── user_game_plays          - Individual play sessions
├── user_game_stats          - Aggregated per-game stats
├── user_stats               - Overall user statistics
├── user_settings            - Per-user key-value settings
├── system_settings          - Global key-value configuration
├── user_playlists           - User-created playlists
├── user_playlist_games      - Playlist-game relationships
├── user_favorites           - Favorited games
├── job_execution_logs       - Background job tracking
└── migrations_applied       - Migration tracking (bootstrap.sql)
```

**Total:** 16 tables, 50+ indexes, 2 triggers, 35+ default settings

## System Settings Categories

The `system_settings` table contains configuration organized by category:

- **auth** - Authentication and security settings
- **app** - Application-wide settings (site name, theme, date format)
- **metadata** - Metadata sync configuration
- **features** - Feature flags (playlists, favorites, statistics)
- **storage** - Storage and retention settings
- **rate_limit** - API rate limiting
- **jobs** - Background job scheduling

Add new settings without migrations:

```sql
INSERT OR IGNORE INTO system_settings
(key, value, data_type, category, description, is_public, default_value)
VALUES
('category.new_setting', 'value', 'boolean', 'category', 'Description', 0, 'value');
```

## Historical Notes

### Consolidation (2026-01-30)

Previous migration strategy used 14+ separate files:
- `001_initialize_schema.sql` - Base tables
- `002_seed_default_data.sql` - Seed data
- `003-013` - Incremental changes
- `014_add_performance_indexes.sql` - Performance optimization

**Consolidated into:** Single `001_complete_schema.sql` file

**Benefits:**
- ✅ Simpler deployment (one file vs many)
- ✅ Guaranteed consistency (all-or-nothing)
- ✅ Easier testing (single execution)
- ✅ Clearer dependencies (everything in order)
- ✅ Better documentation (complete picture in one place)

**Archived migrations** preserved in `archived/` for reference.
