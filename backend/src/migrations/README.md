# Database Migrations

This directory contains SQL migration scripts for the user database (`user.db`).

## Migration Naming Convention

All migration files follow this naming pattern:

```
XXX_description.sql
```

Where:
- `XXX` = Three-digit version number (001, 002, 003, etc.)
- `description` = Descriptive name in kebab-case

**Examples:**
- `001_user-schema.sql` - Initial schema
- `002_create-user-settings.sql` - Create user_settings table
- `003_drop-legacy-theme-columns.sql` - Drop legacy theme columns

## Migration Order

Migrations are executed in numerical order based on the version prefix:

| Version | File | Description | Status |
|---------|------|-------------|--------|
| 001 | `001_user-schema.sql` | Base database schema with users, roles, permissions, and core tables (without auth_settings) | ✅ Active |
| 002 | `002_create-user-settings.sql` | Creates extensible `user_settings` key-value table for theme and future preferences | ✅ Active |
| 003 | `003_create-system-settings.sql` | Creates `system_settings` key-value table for flexible system-wide configuration and seeds all default settings | ✅ Active |
| 004 | `004_add-validation-schemas.sql` | Adds JSON Schema validation rules to all system settings for runtime validation | ✅ Active |

**Historical (Removed):**
- ~~002_add-theme-color.sql~~ - Removed (replaced by user_settings table)
- ~~003_add-surface-color.sql~~ - Removed (replaced by user_settings table)
- ~~003_drop-legacy-theme-columns.sql~~ - Never created (theme columns removed directly in migration 001)
- ~~004_drop-auth-settings-table.sql~~ - Removed (auth_settings table never created in migration 001)
- ~~auth_settings table~~ - Never created (replaced by system_settings key-value store from the start)

## How Migrations Work

Migrations are automatically executed on server startup by `UserDatabaseService.ts`:

1. **Schema Creation** (`createTables()`):
   - Runs `001_user-schema.sql` if database doesn't exist
   - Creates all base tables

2. **Migration Execution** (`runMigrations()`):
   - Checks if each migration is needed (e.g., column/table doesn't exist)
   - Executes migration SQL if needed
   - Logs migration execution to console

3. **Idempotency**:
   - Each migration checks if changes already exist
   - Safe to run multiple times without side effects
   - Uses defensive SQL (`IF NOT EXISTS`, column checks)

## Adding New Migrations

To add a new migration:

1. **Create the migration file** with the next version number:
   ```bash
   cd backend/src/migrations
   touch 005_your-migration-name.sql
   ```

   Current version: **004** (next available: **005**)

2. **Write defensive SQL** using conditional checks:
   ```sql
   -- Add new column (defensive)
   ALTER TABLE users ADD COLUMN IF NOT EXISTS new_column TEXT;

   -- Create new table (defensive)
   CREATE TABLE IF NOT EXISTS new_table (
     id INTEGER PRIMARY KEY
   );

   -- Add index (defensive)
   CREATE INDEX IF NOT EXISTS idx_name ON table(column);
   ```

3. **Update `UserDatabaseService.ts`** in the `runMigrations()` method:
   ```typescript
   // Migration 005: Your description
   const hasNewFeature = /* check if migration needed */;
   if (!hasNewFeature) {
     logger.info('[UserDB] Running migration: 005_your-migration-name');
     const migrationPath = path.join(__dirname, '../migrations/005_your-migration-name.sql');
     if (fs.existsSync(migrationPath)) {
       const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
       this.db!.exec(migrationSQL);
       logger.info('[UserDB] Migration completed: 005_your-migration-name');
     }
   }
   ```

4. **Test the migration**:
   - Delete `backend/user.db` (backup if needed)
   - Run `npm run dev` in backend
   - Check console logs for migration execution
   - Verify database schema with SQLite browser

## Migration Best Practices

### ✅ DO:
- Use version prefixes (001, 002, etc.)
- Write defensive SQL with `IF NOT EXISTS` checks
- Add comments explaining what the migration does
- Test migrations on fresh database
- Include rollback instructions in comments if needed
- Create indexes for frequently queried columns
- Use transactions for complex migrations

### ❌ DON'T:
- Skip version numbers
- Modify existing migration files after they've been applied
- Assume data exists without checking
- Use `DROP TABLE` without backup strategy
- Forget to update UserDatabaseService.ts

## Example Migration Template

```sql
-- Migration 005: Description of what this migration does
-- Created: 2026-01-XX
-- Rollback: Instructions for manual rollback if needed

-- Add new column
ALTER TABLE users ADD COLUMN IF NOT EXISTS example_column TEXT DEFAULT 'default_value';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_example ON users(example_column);

-- Data migration (if needed)
UPDATE users SET example_column = 'value' WHERE condition;
```

## Special Case: Dropping Columns in SQLite

SQLite doesn't support `DROP COLUMN` in older versions. Migration 003 demonstrates how to drop columns by recreating the table:

```sql
-- Create new table without unwanted columns
CREATE TABLE users_new (
  id INTEGER PRIMARY KEY,
  -- ... columns you want to keep
);

-- Copy data
INSERT INTO users_new SELECT id, ... FROM users;

-- Drop old table
DROP TABLE users;

-- Rename new table
ALTER TABLE users_new RENAME TO users;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
```

## Troubleshooting

### Migration not running
- Check console logs for error messages
- Verify migration file exists in `backend/src/migrations/`
- Ensure correct naming convention
- Check UserDatabaseService.ts includes migration check

### Database locked error
- Close Flashpoint Launcher if running
- Close any SQLite browser tools
- Restart backend server

### Migration fails midway
- Check SQL syntax
- Review console error logs
- Restore from backup if needed
- Fix migration SQL and restart

## Schema Visualization

Current database structure after all migrations:

```
user.db
├── users (base schema only, theme columns removed in migration 003)
│   ├── id
│   ├── username
│   ├── email
│   ├── password_hash
│   ├── role_id
│   ├── is_active
│   ├── created_at
│   ├── updated_at
│   └── last_login_at
│
├── user_settings (002) ← Extensible key-value for per-user settings
│   ├── id
│   ├── user_id (FK → users.id)
│   ├── setting_key (e.g., 'theme_mode', 'primary_color')
│   ├── setting_value
│   ├── created_at
│   └── updated_at
│
├── system_settings (003) ← Extensible key-value for global settings
│   ├── id
│   ├── key (e.g., 'auth.user_registration_enabled', 'app.site_name')
│   ├── value
│   ├── data_type (boolean, integer, string, json, float)
│   ├── category (auth, app, metadata, features, game, etc.)
│   ├── description
│   ├── is_public
│   ├── default_value
│   ├── validation_schema
│   ├── updated_at
│   └── updated_by (FK → users.id)
│
├── roles
├── permissions
├── role_permissions
├── user_roles (if using many-to-many)
├── refresh_tokens
├── activity_logs
├── login_attempts
├── user_game_plays
├── user_game_stats
└── user_stats
```

## Future Enhancements

### Per-User Settings (`user_settings` table)
Potential future settings to add (no migrations needed!):

- Display preferences: `grid_view_mode`, `items_per_page`
- Notifications: `email_notifications`, `desktop_notifications`
- Accessibility: `reduced_motion`, `high_contrast`, `font_size`
- Gameplay: `default_ruffle_scale`, `auto_fullscreen`

### System-Wide Settings (`system_settings` table)
Already seeded with common settings (no migrations needed to add more!):

**Auth Settings:**
- `auth.guest_access_enabled`, `auth.user_registration_enabled`
- `auth.require_email_verification`, `auth.session_timeout_minutes`
- `auth.max_login_attempts`, `auth.lockout_duration_minutes`

**App Settings:**
- `app.site_name`, `app.maintenance_mode`
- `app.default_theme`, `app.default_primary_color`

**Metadata Settings:**
- `metadata.auto_sync_enabled`, `metadata.sync_interval_minutes`
- `metadata.sync_tags`, `metadata.sync_platforms`

**Feature Flags:**
- `features.enable_playlists`, `features.enable_favorites`
- `features.enable_statistics`, `features.enable_activity_log`
- `features.enable_user_profiles`


**Storage Settings:**
- `storage.cache_size_mb`, `storage.log_retention_days`
- `storage.temp_file_retention_days`

**Rate Limiting:**
- `rate_limit.api_requests_per_minute`, `rate_limit.enable_rate_limiting`

To add new settings, just insert a row into `system_settings` - no schema changes required! 🎉
