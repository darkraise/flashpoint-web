# Archived Migrations

This directory contains historical migration files that have been consolidated into the current migration system.

## Migration Consolidation (2026-01-28)

The original 16 migration files (001-016) have been consolidated into:
- `001_initialize_schema.sql` - Complete database schema with all tables
- `002_seed_default_data.sql` - All default roles, permissions, and settings

These archived files are kept for reference and historical documentation purposes only. **They are no longer executed** by the migration system.

## Historical Migrations

| Migration | Description | Consolidated Into |
|-----------|-------------|-------------------|
| 001_user-schema.sql | Base schema with users, roles, permissions, etc. | 001_initialize_schema.sql |
| 002_create-user-settings.sql | User settings table (key-value) | 001_initialize_schema.sql |
| 003_create-system-settings.sql | System settings table + seed data | 001/002_initialize |
| 004_add-validation-schemas.sql | JSON schema validation for settings | 002_seed_default_data.sql |
| 005_user-playlists-and-favorites.sql | User playlists and favorites tables | 001_initialize_schema.sql |
| 006_create-jobs-settings.sql | Background job settings | 002_seed_default_data.sql |
| 007_create-job-execution-logs.sql | Job execution logs table | 001_initialize_schema.sql |
| 008_convert-interval-to-cron.sql | Convert interval to cron expressions | 002_seed_default_data.sql |
| 009_update-public-settings.sql | Update is_public flags | 002_seed_default_data.sql |
| 010_make-features-public.sql | Make feature flags public | 002_seed_default_data.sql |
| 011_make-game-settings-public.sql | Make game settings public | (Obsolete - see 012) |
| 012_remove-game-settings.sql | Remove game settings | Not included |
| 013_add-datetime-format-settings.sql | Add date/time format settings | 002_seed_default_data.sql |
| 014_add-user-datetime-format-settings.sql | User date/time format settings | (Handled in app code) |
| 015_standardize-datetime-to-iso8601.sql | Convert to ISO 8601 UTC format | 001_initialize_schema.sql |
| 016_add-ruffle-update-job-settings.sql | Ruffle update job settings | 002_seed_default_data.sql |

## New Migration System

The new system uses a **migration registry** approach:

1. **migrations table** tracks applied migrations by name with checksums
2. **Backward compatibility** - Existing databases are detected and marked as migrated
3. **Fresh installs** use consolidated schema for faster setup
4. **Future migrations** can be added as new numbered files (003, 004, etc.)

See `docs/08-development/database-migrations.md` for full documentation.
