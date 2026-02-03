# Database Schema Reference

Reference for Flashpoint Web database schemas: flashpoint.sqlite (read-only) and user.db (read-write).

## Flashpoint Database (flashpoint.sqlite)

**Location:** D:/Flashpoint/Data/flashpoint.sqlite
**Access:** Read-only (managed by Flashpoint Launcher)
**Hot-Reload:** Yes (DatabaseService watches for changes)

### game

Main game metadata table.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | TEXT | No | Primary key, game UUID |
| title | TEXT | No | Game title |
| developer | TEXT | Yes | Developer name |
| publisher | TEXT | Yes | Publisher name |
| platformName | TEXT | Yes | Platform (e.g., Flash, HTML5) |
| platformId | INTEGER | Yes | Foreign key to platform.id |
| library | TEXT | No | arcade or theatre |
| orderTitle | TEXT | No | Normalized title for sorting |
| broken | BOOLEAN | Yes | Marked as broken |
| extreme | BOOLEAN | Yes | Contains extreme content |
| tagsStr | TEXT | Yes | Semicolon-separated tags |
| releaseDate | TEXT | Yes | YYYY-MM-DD format |
| launchCommand | TEXT | Yes | Launch URL/command |
| dateAdded | TEXT | Yes | ISO 8601 |
| dateModified | TEXT | Yes | ISO 8601 |
| archiveState | INTEGER | Yes | Archive status |

### game_data

Game file/launch data (multiple entries per game possible).

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | INTEGER | No | Primary key, auto-increment |
| gameId | TEXT | No | Foreign key to game.id |
| presentOnDisk | INTEGER | Yes | NULL=none, 0=download, 1=downloaded |
| sha256 | TEXT | Yes | SHA-256 hash |
| path | TEXT | Yes | File path or URL |
| launchCommand | TEXT | Yes | Full launch command |

### platform

Gaming platforms.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | INTEGER | No | Primary key |
| name | TEXT | No | Platform name (unique) |
| description | TEXT | Yes | Platform description |

### tag

Tag definitions.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | INTEGER | No | Primary key |
| name | TEXT | No | Tag name (unique) |
| category | TEXT | Yes | Tag category |

### game_tags_tag

Many-to-many: games to tags.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | INTEGER | No | Primary key |
| gameId | TEXT | No | Foreign key to game.id |
| tagId | INTEGER | No | Foreign key to tag.id |

### playlist

User/curated playlists.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | TEXT | No | Primary key, UUID |
| title | TEXT | No | Playlist title |
| author | TEXT | Yes | Playlist author |
| library | TEXT | Yes | Library classification |

### playlist_game

Many-to-many: playlists to games.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | INTEGER | No | Primary key |
| playlistId | TEXT | No | Foreign key to playlist.id |
| gameId | TEXT | No | Foreign key to game.id |
| order | INTEGER | Yes | Display order |

---

## User Database (user.db)

**Location:** backend/user.db
**Access:** Read-write (managed by UserDatabaseService)
**Migrations:** backend/src/migrations/001_complete_schema.sql (idempotent)

### users

User accounts.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | INTEGER | AUTO | Primary key |
| username | TEXT | - | Unique (case-insensitive) |
| email | TEXT | - | Unique (case-insensitive) |
| password_hash | TEXT | - | bcrypt hash |
| role_id | INTEGER | - | Foreign key to roles.id |
| is_active | BOOLEAN | 1 | Account active |
| created_at | TEXT | now() | ISO 8601 |
| updated_at | TEXT | now() | ISO 8601 |
| last_login_at | TEXT | NULL | ISO 8601 |

**Indexes:** id (primary), username, email, role_id, is_active

### roles

RBAC role definitions.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | INTEGER | AUTO | Primary key |
| name | TEXT | - | Unique (case-insensitive) |
| description | TEXT | NULL | Role description |
| priority | INTEGER | 0 | Higher = more privileged |
| created_at | TEXT | now() | ISO 8601 |
| updated_at | TEXT | now() | ISO 8601 |

**Default Roles:** admin (id:1, priority:100), user (id:2, priority:50), guest (id:3, priority:0)

### permissions

Permission definitions.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | INTEGER | AUTO | Primary key |
| name | TEXT | - | Unique (e.g., games.play) |
| description | TEXT | NULL | Permission description |
| resource | TEXT | - | Resource type (games, users, etc) |
| action | TEXT | - | Action type (read, create, update, delete) |
| created_at | TEXT | now() | ISO 8601 |

**Core Permissions:** games.read, games.play, playlists.*, users.*, roles.*, settings.*, activities.read

### role_permissions

Many-to-many: roles to permissions.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | INTEGER | AUTO | Primary key |
| role_id | INTEGER | - | Foreign key to roles.id |
| permission_id | INTEGER | - | Foreign key to permissions.id |
| created_at | TEXT | now() | ISO 8601 |

### refresh_tokens

JWT refresh token storage.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | INTEGER | AUTO | Primary key |
| user_id | INTEGER | - | Foreign key to users.id |
| token | TEXT | - | Unique 64-byte hex string |
| expires_at | TEXT | - | Expiration timestamp |
| created_at | TEXT | now() | ISO 8601 |
| revoked_at | TEXT | NULL | Revocation timestamp |

**Notes:** Single-use tokens; revoked after generating new access token.

### activity_logs

Audit trail for user actions.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | INTEGER | AUTO | Primary key |
| user_id | INTEGER | NULL | Foreign key to users.id |
| username | TEXT | NULL | Username snapshot |
| action | TEXT | - | Action performed (login, game.play, etc) |
| resource | TEXT | NULL | Resource type |
| resource_id | TEXT | NULL | Resource ID |
| ip_address | TEXT | NULL | Client IP |
| user_agent | TEXT | NULL | Client user agent |
| created_at | TEXT | now() | ISO 8601 |

**Indexes:** user_id, action, resource, created_at

### system_settings

Global key-value settings.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | INTEGER | AUTO | Primary key |
| key | TEXT | - | Unique dot-notation (e.g., auth.guest_access) |
| value | TEXT | - | Setting value |
| data_type | TEXT | - | boolean, integer, string, json, float |
| category | TEXT | - | auth, app, metadata, features, storage, etc |
| description | TEXT | NULL | Human-readable description |
| is_public | BOOLEAN | 0 | Publicly readable |
| default_value | TEXT | NULL | Default value |
| updated_at | TEXT | now() | ISO 8601 |
| updated_by | INTEGER | NULL | User ID who updated |

**Categories:** auth, app, metadata, features, storage, rate_limit, jobs

### login_attempts

Login attempt tracking for security.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | INTEGER | AUTO | Primary key |
| username | TEXT | - | Username attempted |
| ip_address | TEXT | - | Client IP |
| success | BOOLEAN | 0 | Successful attempt |
| attempted_at | TEXT | now() | ISO 8601 |

**Indexes:** username, ip_address, attempted_at

### user_game_plays

Individual game play sessions.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | INTEGER | AUTO | Primary key |
| user_id | INTEGER | - | Foreign key to users.id |
| game_id | TEXT | - | Game UUID |
| game_title | TEXT | NULL | Game title snapshot |
| started_at | TEXT | now() | ISO 8601 |
| ended_at | TEXT | NULL | ISO 8601 or NULL (active/abandoned) |
| duration_seconds | INTEGER | NULL | Session duration |
| session_id | TEXT | - | Unique UUID |

**Indexes:** user_id, game_id, started_at, session_id
**Session States:** Active (ended_at NULL, <24h), Completed (ended_at set), Abandoned (ended_at NULL, >=24h)

### user_game_stats

Aggregated play statistics per user per game.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | INTEGER | AUTO | Primary key |
| user_id | INTEGER | - | Foreign key to users.id |
| game_id | TEXT | - | Game UUID |
| game_title | TEXT | NULL | Game title snapshot |
| total_plays | INTEGER | 0 | Total play sessions |
| total_playtime_seconds | INTEGER | 0 | Total playtime |
| first_played_at | TEXT | NULL | First play timestamp |
| last_played_at | TEXT | NULL | Most recent play timestamp |

**Indexes:** user_id, game_id, total_plays, total_playtime_seconds

### user_settings

Flexible user preference storage (key-value).

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | INTEGER | AUTO | Primary key |
| user_id | INTEGER | - | Foreign key to users.id |
| setting_key | TEXT | - | Setting key (theme_mode, primary_color, etc) |
| setting_value | TEXT | - | Setting value |
| created_at | TEXT | now() | ISO 8601 |
| updated_at | TEXT | now() | ISO 8601 |

**Common Settings:** theme_mode (light/dark/system), primary_color, card_size, view_mode, sidebar_collapsed

### user_playlists

User-created playlists with sharing.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | INTEGER | AUTO | Primary key |
| user_id | INTEGER | - | Foreign key to users.id |
| title | TEXT | - | Playlist title (1-255 chars) |
| description | TEXT | NULL | Playlist description |
| icon | TEXT | NULL | Icon identifier |
| created_at | TEXT | now() | ISO 8601 |
| updated_at | TEXT | now() | ISO 8601 |
| is_public | BOOLEAN | 0 | Publicly visible |
| game_count | INTEGER | 0 | Game count (auto-updated by trigger) |
| share_token | TEXT | NULL | Unique share token |
| share_expires_at | TEXT | NULL | Share link expiration |
| show_owner | BOOLEAN | 0 | Show owner name when shared |

**Indexes:** user_id, created_at, title, share_token
**Triggers:** trg_playlist_games_insert, trg_playlist_games_delete (maintain game_count)

### user_playlist_games

Games within user playlists (many-to-many).

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | INTEGER | AUTO | Primary key |
| playlist_id | INTEGER | - | Foreign key to user_playlists.id |
| game_id | TEXT | - | Game UUID |
| order_index | INTEGER | 0 | Display order |
| notes | TEXT | NULL | User notes |
| added_at | TEXT | now() | ISO 8601 |

**Indexes:** playlist_id, game_id, (playlist_id, order_index)

### user_favorites

User favorite games.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | INTEGER | AUTO | Primary key |
| user_id | INTEGER | - | Foreign key to users.id |
| game_id | TEXT | - | Game UUID |
| added_at | TEXT | now() | ISO 8601 |

**Indexes:** user_id, game_id, added_at
**Constraint:** Unique (user_id, game_id)

### job_execution_logs

Background job execution tracking.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| id | INTEGER | AUTO | Primary key |
| job_id | TEXT | - | Unique execution ID |
| job_name | TEXT | - | Job name (metadata_sync, ruffle_update, etc) |
| status | TEXT | - | running, success, failed |
| started_at | TEXT | now() | ISO 8601 |
| completed_at | TEXT | NULL | ISO 8601 |
| duration_seconds | INTEGER | NULL | Execution duration |
| message | TEXT | NULL | Status message |
| error_details | TEXT | NULL | Error details if failed |
| triggered_by | TEXT | NULL | scheduler, manual, etc |

---

## Triggers

**trg_playlist_games_insert** - Increments user_playlists.game_count when game added
**trg_playlist_games_delete** - Decrements user_playlists.game_count when game removed

## Performance Indexes

Composite and partial indexes optimized for common queries:

| Index | Table | Purpose |
|-------|-------|---------|
| idx_login_attempts_success_time | login_attempts | Failed attempt lookups |
| idx_user_game_plays_active | user_game_plays | Active sessions (WHERE ended_at IS NULL) |
| idx_user_game_plays_user_time | user_game_plays | User play history by time |
| idx_activity_logs_user_time | activity_logs | User activity by time |
| idx_refresh_tokens_cleanup | refresh_tokens | Expired token cleanup |
| idx_user_game_stats_plays | user_game_stats | Most played games |
| idx_user_game_stats_playtime | user_game_stats | Most playtime |
| idx_user_game_stats_recent | user_game_stats | Recently played games |

## Access Patterns

**Flashpoint Database:**
- Never write; use prepared statements for reads
- Leverage indexes for efficient queries
- DatabaseService maintains single read-only connection

**User Database:**
- Use transactions for multi-table operations
- Always use prepared statements to prevent SQL injection
- UserDatabaseService maintains single read-write connection
- Migrations are idempotent (safe to run multiple times)

## Related Documentation

- [Backend Services](../03-backend/services/database-service.md)
- [Type Definitions](./type-definitions.md)
- [API Reference](../06-api-reference/README.md)
