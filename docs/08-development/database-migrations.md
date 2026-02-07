# Database Migrations

This document describes the database migration system for the user database
(`user.db`).

## Overview

The migration system uses a **registry-based approach** to track which
migrations have been applied to the database. This ensures consistent schema
evolution across all installations.

## Architecture

### Migration Registry

All applied migrations are tracked in the `migrations` table:

```sql
CREATE TABLE migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL,
  checksum TEXT,
  execution_time_ms INTEGER,
  description TEXT
);
```

### Migration Files

Migration files are located in `backend/src/migrations/` and follow the naming
convention:

```
XXX_description.sql
```

- `XXX` - Three-digit version number (001, 002, 003, etc.)
- `description` - Brief kebab-case description of the migration

**Example:** `001_initialize_schema.sql`

### Current Active Migrations

| File                      | Description                                            |
| ------------------------- | ------------------------------------------------------ |
| `bootstrap.sql`           | Creates the migrations registry table                  |
| `001_complete_schema.sql` | Complete database schema with all tables and seed data |

### Archived Migrations

Historical migration files (001-016 from the old system) are archived in
`backend/src/migrations/archived/` for reference. These files are **no longer
executed** but document the evolution of the database schema.

## How It Works

### Startup Flow

When the backend starts, `UserDatabaseService.initialize()` performs these
steps:

1. **Bootstrap** - Creates the `migrations` table if it doesn't exist
2. **Detect Existing State** - For backward compatibility, detects if the
   database already has tables and marks migrations as applied
3. **Run Migrations** - Scans the migrations directory and runs any migrations
   not yet in the registry
4. **Record Execution** - Logs each migration with timestamp, checksum, and
   execution time

### Backward Compatibility

The system automatically detects existing databases (from the old migration
system) and marks the consolidated migrations as applied:

```typescript
// Checks for existing tables and seed data
if (tables.some((t) => t.name === 'users')) {
  markApplied('001_complete_schema', 'Detected existing schema and seed data');
}
```

This ensures a smooth transition from the old ad-hoc migration system to the new
registry-based system.

## Adding New Migrations

### Step 1: Create Migration File

Create a new SQL file in `backend/src/migrations/` with the next sequential
number:

```bash
# Example: Adding a new feature
touch backend/src/migrations/003_add_feature_x.sql
```

### Step 2: Write Idempotent SQL

All migrations **must** be idempotent (safe to run multiple times):

```sql
-- Good: Idempotent operations
CREATE TABLE IF NOT EXISTS my_table (...);
CREATE INDEX IF NOT EXISTS idx_name ON my_table(column);
INSERT OR IGNORE INTO settings (key, value) VALUES ('key', 'value');

-- Bad: Non-idempotent operations
CREATE TABLE my_table (...);  -- Fails if table exists
INSERT INTO settings (key, value) VALUES ('key', 'value');  -- Fails if key exists
```

### Step 3: Add Comments

Include migration metadata and rollback instructions:

```sql
-- Migration: 003_add_feature_x.sql
-- Description: Add feature X tables and settings
-- Date: 2026-XX-XX
-- Rollback: DROP TABLE feature_x; DELETE FROM settings WHERE key LIKE 'feature_x.%';

-- Your migration SQL here...
```

### Step 4: Test Migration

Test on a fresh database and an existing database:

```bash
# Fresh database test
rm backend/user.db
npm run dev:backend  # Check logs for migration execution

# Existing database test
npm run dev:backend  # Should detect migration as new and apply it
```

### Step 5: Verify Registry

After the migration runs, verify it was recorded:

```sql
SELECT * FROM migrations ORDER BY applied_at DESC LIMIT 1;
```

## Transaction Safety

**IMPORTANT: Migrations run inside transactions for atomicity.**

Each migration execution is wrapped in a better-sqlite3 `db.transaction()`:

```typescript
const transaction = this.db!.transaction(() => {
  this.db!.exec(migrationSQL); // Execute migration SQL
  this.recordMigration(name, sql); // Record in registry
});

transaction(); // Execute atomically - both succeed or both fail
```

**What this prevents:**

- ❌ SQL executes but migration not recorded (orphaned changes)
- ❌ Migration recorded but SQL never executed (wrong schema)
- ❌ Database left in inconsistent half-migrated state

**What this guarantees:**

- ✅ Either both SQL and registry insert complete
- ✅ Or both are rolled back to pre-migration state
- ✅ No intermediate states possible
- ✅ Clean recovery from migration failures



## Best Practices

### 1. Idempotency is Required

All migrations must be safe to run multiple times:

- Use `IF NOT EXISTS` for table/index creation
- Use `INSERT OR IGNORE` for seed data with unique constraints
- Use `INSERT OR REPLACE` for settings that should update
- Avoid raw `UPDATE` statements without conditions

### 2. Never Modify Applied Migrations

Once a migration has been applied to any database:

- **Never** change the SQL content
- **Never** rename the file
- **Never** delete the file

If you need to make changes, create a **new migration** that modifies the
schema.

### 3. Use Descriptive Names

Migration names should clearly indicate what they do:

✅ Good:

- `003_add_user_badges.sql`
- `004_remove_deprecated_settings.sql`
- `005_add_game_tags_index.sql`

❌ Bad:

- `003_changes.sql`
- `004_fix.sql`
- `005_update.sql`

### 4. Keep Migrations Focused

Each migration should have a single, clear purpose:

- ✅ One feature or change per migration
- ❌ Don't bundle multiple unrelated changes

### 5. Test on Fresh and Existing Databases

Always test migrations on:

1. **Fresh database** - Ensure it works from scratch
2. **Existing database** - Ensure it applies correctly to production-like state

### 6. Document Rollback Procedures

Include rollback instructions in comments:

```sql
-- Rollback: DROP TABLE new_table; DELETE FROM system_settings WHERE key = 'new_feature.enabled';
```

For complex migrations, create a separate rollback file:

```
migrations/
  003_add_feature_x.sql
  rollback/
    003_add_feature_x_rollback.sql
```

### 7. Use Transactions for Complex Changes

For migrations that modify data:

```sql
BEGIN TRANSACTION;

-- Your migration SQL here...

COMMIT;
```

SQLite supports transactions for schema changes, so use them when appropriate.

## Migration File Structure

### Schema Migrations

For creating tables, indexes, and constraints:

```sql
-- Migration: XXX_description.sql
-- Description: Brief description
-- Date: YYYY-MM-DD
-- Rollback: Instructions here

-- ===================================
-- TABLE: table_name
-- ===================================
CREATE TABLE IF NOT EXISTS table_name (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_table_name ON table_name(name);
```

### Data Migrations

For inserting or updating data:

```sql
-- Migration: XXX_seed_data.sql
-- Description: Insert default configuration
-- Date: YYYY-MM-DD

INSERT OR IGNORE INTO system_settings (key, value, data_type, category, description)
VALUES
  ('feature.enabled', '1', 'boolean', 'features', 'Enable feature X'),
  ('feature.setting', 'default', 'string', 'features', 'Feature X setting');
```

### Transformation Migrations

For modifying existing data:

```sql
-- Migration: XXX_transform_data.sql
-- Description: Convert format of existing data
-- Date: YYYY-MM-DD
-- Rollback: Manual restore required

UPDATE table_name
SET
  field = CASE
    WHEN condition1 THEN value1
    WHEN condition2 THEN value2
    ELSE default_value
  END
WHERE field NOT LIKE 'new_format%';  -- Idempotent check
```

## Troubleshooting

### Migration Fails on Existing Database

**Symptom:** Migration runs successfully on fresh database but fails on existing
database.

**Cause:** Non-idempotent SQL (e.g., `CREATE TABLE` without `IF NOT EXISTS`)

**Solution:** Add idempotency checks:

```sql
CREATE TABLE IF NOT EXISTS ...
INSERT OR IGNORE INTO ...
```

### Migration Shows as Not Applied

**Symptom:** Migration is in the file system but not in `migrations` table.

**Diagnosis:**

```sql
-- Check what migrations are registered
SELECT name, applied_at FROM migrations ORDER BY applied_at;

-- Check file system
ls backend/src/migrations/*.sql
```

**Solution:** The migration may not have run yet. Restart the backend to trigger
migration execution.

### Checksum Mismatch

**Symptom:** Migration was applied but someone modified the SQL file.

**Detection:**

```sql
SELECT name, checksum FROM migrations WHERE name = '003_my_migration';
```

Then compute the checksum of the current file and compare.

**Solution:**

1. If the change was intentional, create a new migration with the corrected SQL
2. If the change was accidental, restore the original SQL from git history
3. Never modify applied migrations

### Database Locked Error

**Symptom:** `SQLITE_BUSY` or database locked errors during migration.

**Cause:** Another process (e.g., Flashpoint Launcher) has the database locked.

**Solution:**

1. Close the Flashpoint Launcher
2. Ensure no other backend processes are running
3. Restart the backend

## Viewing Migration History

### Query Migration Registry

```sql
-- View all applied migrations
SELECT
  name,
  applied_at,
  execution_time_ms,
  description
FROM migrations
ORDER BY applied_at DESC;

-- View most recent migration
SELECT * FROM migrations ORDER BY applied_at DESC LIMIT 1;
```

### Check Migration Status

```bash
# View migration logs
grep "Migration completed" logs/app.log

# View migration execution times
sqlite3 backend/user.db "SELECT name, execution_time_ms FROM migrations ORDER BY applied_at DESC;"
```

## Recovery Procedures

### Restore from Backup

If a migration fails and corrupts the database:

1. Stop the backend
2. Restore `user.db` from backup
3. Remove the failed migration file
4. Fix the migration SQL
5. Re-add the migration file with corrected SQL
6. Restart the backend

### Manual Migration Rollback

If you need to roll back a migration:

1. Stop the backend
2. Run the rollback SQL (see migration comments)
3. Remove the migration record from the registry:
   ```sql
   DELETE FROM migrations WHERE name = 'XXX_migration_name';
   ```
4. Restart the backend

### Reset Migration Registry

**Warning:** This should only be done on development databases, never in
production.

```sql
-- Delete all migration records
DELETE FROM migrations;

-- Or drop the entire table
DROP TABLE migrations;

-- Restart backend to re-bootstrap
```

## Comparison: Old vs New System

### Old System (Before 2026-01-28)

- ❌ No migration tracking table
- ❌ Ad-hoc detection logic in TypeScript
- ❌ Difficult to determine database state
- ❌ 16 separate migration files
- ❌ Complex conditional logic for each migration

### New System (Registry-Based)

- ✅ Formal migration registry table
- ✅ Simple, consistent detection logic
- ✅ Easy to query database state
- ✅ 2 consolidated migration files (001, 002)
- ✅ Clean, maintainable code

## References

- Migration Registry Implementation:
  `backend/src/services/UserDatabaseService.ts`
- Migration Files: `backend/src/migrations/`
- Archived Migrations: `backend/src/migrations/archived/`
- Database Schema Reference: `docs/12-reference/database-schema-reference.md`
