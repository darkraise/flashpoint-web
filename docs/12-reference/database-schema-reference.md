# Database Schema Reference

This document provides a complete reference for all database schemas used in the Flashpoint Web application, including both the read-only Flashpoint database and the application-managed user database.

## Overview

Flashpoint Web uses two separate SQLite databases:

1. **Flashpoint Database** (`flashpoint.sqlite`) - Read-only game metadata from Flashpoint Archive
2. **User Database** (`user.db`) - Application-managed data for users, authentication, and play tracking

---

## Flashpoint Database (flashpoint.sqlite)

**Location:** `D:/Flashpoint/Data/flashpoint.sqlite`
**Access Mode:** Read-only
**Managed By:** Flashpoint Launcher
**Hot-Reload:** Yes (DatabaseService watches for file changes)

### Important Notes

- This database is managed externally by the Flashpoint Launcher
- The backend has read-only access
- Never perform write operations on this database
- DatabaseService automatically reloads connections when the Flashpoint Launcher updates the file

### Tables

#### game

Primary table containing all game metadata.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | TEXT | No | Primary key, unique game identifier (UUID) |
| parentGameId | TEXT | Yes | Reference to parent game ID for extras/mods |
| title | TEXT | No | Game title |
| alternateTitles | TEXT | Yes | Alternative titles, semicolon-separated |
| series | TEXT | Yes | Game series name |
| developer | TEXT | Yes | Developer name |
| publisher | TEXT | Yes | Publisher name |
| platformName | TEXT | Yes | Platform name (e.g., "Flash", "HTML5") |
| platformsStr | TEXT | Yes | Multiple platforms, semicolon-separated |
| platformId | INTEGER | Yes | Foreign key to platform table |
| playMode | TEXT | Yes | Play mode (e.g., "Single Player", "Multiplayer") |
| status | TEXT | Yes | Status (e.g., "Playable", "Broken") |
| broken | BOOLEAN | Yes | Whether game is marked as broken |
| extreme | BOOLEAN | Yes | Whether game contains extreme content |
| notes | TEXT | Yes | Notes about the game |
| tagsStr | TEXT | Yes | Tags, semicolon-separated |
| source | TEXT | Yes | Source/origin information |
| applicationPath | TEXT | Yes | Application path for native games |
| launchCommand | TEXT | Yes | Launch command/URL |
| releaseDate | TEXT | Yes | Release date (YYYY-MM-DD format) |
| version | TEXT | Yes | Game version |
| originalDescription | TEXT | Yes | Original game description |
| language | TEXT | Yes | Language(s) of the game |
| library | TEXT | No | Library classification (e.g., "arcade", "theatre") |
| orderTitle | TEXT | No | Normalized title for sorting |
| dateAdded | TEXT | Yes | Date added to Flashpoint (ISO 8601) |
| dateModified | TEXT | Yes | Last modification date (ISO 8601) |
| archiveState | INTEGER | Yes | Archive state indicator |
| logoPath | TEXT | Yes | Relative path to logo image |
| screenshotPath | TEXT | Yes | Relative path to screenshot image |

**Indexes:**
- Primary key on `id`
- Index on `platformName`
- Index on `library`
- Index on `title`
- Index on `orderTitle`
- Index on `developer`
- Index on `publisher`

**Key Relationships:**
- `platformId` → `platform.id`
- `parentGameId` → `game.id` (self-reference)

#### game_data

Contains game file and launch data. Multiple entries per game are possible.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | INTEGER | No | Primary key, auto-increment |
| gameId | TEXT | No | Foreign key to game.id |
| title | TEXT | Yes | Data entry title |
| dateAdded | TEXT | Yes | Date added (ISO 8601) |
| sha256 | TEXT | Yes | SHA-256 hash of game files |
| crc32 | TEXT | Yes | CRC32 checksum |
| presentOnDisk | INTEGER | Yes | Download status: NULL = no data needed, 0 = needs download, 1 = downloaded |
| path | TEXT | Yes | File path or URL |
| size | INTEGER | Yes | File size in bytes |
| parameters | TEXT | Yes | URL parameters or command-line args |
| launchCommand | TEXT | Yes | Full launch command |

**Indexes:**
- Primary key on `id`
- Index on `gameId`
- Index on `presentOnDisk`

**Key Relationships:**
- `gameId` → `game.id`

**Notes:**
- When a game has multiple `game_data` entries, the backend prioritizes entries where `presentOnDisk = 1`
- The `launchCommand` takes precedence over constructed `path` + `parameters`

#### platform

Gaming platforms.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | INTEGER | No | Primary key, auto-increment |
| name | TEXT | No | Platform name (e.g., "Flash", "HTML5", "Shockwave") |
| description | TEXT | Yes | Platform description |
| dateModified | TEXT | Yes | Last modification date |

**Indexes:**
- Primary key on `id`
- Unique index on `name`

#### tag

Tags for categorizing games.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | INTEGER | No | Primary key, auto-increment |
| name | TEXT | No | Tag name |
| category | TEXT | Yes | Tag category for grouping |
| description | TEXT | Yes | Tag description |
| dateModified | TEXT | Yes | Last modification date |

**Indexes:**
- Primary key on `id`
- Unique index on `name`
- Index on `category`

#### game_tags_tag

Many-to-many relationship between games and tags.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | INTEGER | No | Primary key, auto-increment |
| gameId | TEXT | No | Foreign key to game.id |
| tagId | INTEGER | No | Foreign key to tag.id |

**Indexes:**
- Primary key on `id`
- Index on `gameId`
- Index on `tagId`
- Unique composite index on `(gameId, tagId)`

**Key Relationships:**
- `gameId` → `game.id`
- `tagId` → `tag.id`

#### playlist

User-created or curated playlists.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | TEXT | No | Primary key, unique identifier (UUID) |
| title | TEXT | No | Playlist title |
| description | TEXT | Yes | Playlist description |
| author | TEXT | Yes | Playlist author |
| library | TEXT | Yes | Library classification |
| icon | TEXT | Yes | Icon identifier |
| dateModified | TEXT | Yes | Last modification date |

**Indexes:**
- Primary key on `id`
- Index on `title`
- Index on `library`

#### playlist_game

Many-to-many relationship between playlists and games.

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| id | INTEGER | No | Primary key, auto-increment |
| playlistId | TEXT | No | Foreign key to playlist.id |
| gameId | TEXT | No | Foreign key to game.id |
| order | INTEGER | Yes | Display order within playlist |
| notes | TEXT | Yes | Notes for this playlist entry |

**Indexes:**
- Primary key on `id`
- Index on `playlistId`
- Index on `gameId`
- Index on `order`

**Key Relationships:**
- `playlistId` → `playlist.id`
- `gameId` → `game.id`

---

## User Database (user.db)

**Location:** `backend/user.db`
**Access Mode:** Read-write
**Managed By:** UserDatabaseService
**Migrations:** `backend/src/migrations/*.sql`

### Migration Management

Migrations are SQL files that run sequentially on application startup:

1. `001_user-schema.sql` - Initial user and auth schema (without auth_settings table)
2. `002_create-user-settings.sql` - User settings and theme preferences
3. `003_create-system-settings.sql` - Create system_settings table with seeded defaults
4. `004_add-validation-schemas.sql` - Add JSON Schema validation to system settings

### Tables

#### users

User accounts table.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | INTEGER | No | AUTO | Primary key, auto-increment |
| username | TEXT | No | - | Unique username (case-insensitive) |
| email | TEXT | No | - | Unique email (case-insensitive) |
| password_hash | TEXT | No | - | bcrypt hashed password |
| role_id | INTEGER | No | - | Foreign key to roles table |
| is_active | BOOLEAN | Yes | 1 | Account active status |
| created_at | TEXT | Yes | now() | Account creation timestamp (ISO 8601) |
| updated_at | TEXT | Yes | now() | Last update timestamp (ISO 8601) |
| last_login_at | TEXT | Yes | NULL | Last successful login timestamp |

**Indexes:**
- Primary key on `id`
- Unique index on `username` (case-insensitive collation)
- Unique index on `email` (case-insensitive collation)
- Index on `role_id`
- Index on `is_active`

**Constraints:**
- Foreign key: `role_id` → `roles.id` (ON DELETE RESTRICT)

**Notes:**
- Passwords are hashed using bcrypt with cost factor 10
- Username and email uniqueness is case-insensitive

#### roles

Role definitions for RBAC.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | INTEGER | No | AUTO | Primary key, auto-increment |
| name | TEXT | No | - | Unique role name (case-insensitive) |
| description | TEXT | Yes | NULL | Role description |
| priority | INTEGER | Yes | 0 | Role priority (higher = more privileged) |
| created_at | TEXT | Yes | now() | Creation timestamp |
| updated_at | TEXT | Yes | now() | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Unique index on `name` (case-insensitive)

**Default Roles:**
1. `admin` (id: 1, priority: 100) - Full system access
2. `user` (id: 2, priority: 50) - Standard user access
3. `guest` (id: 3, priority: 0) - Read-only access

#### permissions

Permission definitions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | INTEGER | No | AUTO | Primary key, auto-increment |
| name | TEXT | No | - | Unique permission name (e.g., "games.read") |
| description | TEXT | Yes | NULL | Permission description |
| resource | TEXT | No | - | Resource type (e.g., "games", "users") |
| action | TEXT | No | - | Action type (e.g., "read", "create", "update", "delete") |
| created_at | TEXT | Yes | now() | Creation timestamp |

**Indexes:**
- Primary key on `id`
- Unique index on `name`
- Composite index on `(resource, action)`

**Default Permissions:**

| Name | Resource | Action | Description |
|------|----------|--------|-------------|
| games.read | games | read | View and browse games |
| games.play | games | play | Play games in browser |
| games.download | games | download | Download game files |
| playlists.read | playlists | read | View playlists |
| playlists.create | playlists | create | Create new playlists |
| playlists.update | playlists | update | Update existing playlists |
| playlists.delete | playlists | delete | Delete playlists |
| users.read | users | read | View user accounts |
| users.create | users | create | Create new user accounts |
| users.update | users | update | Update user accounts |
| users.delete | users | delete | Delete user accounts |
| roles.read | roles | read | View roles and permissions |
| roles.create | roles | create | Create new roles |
| roles.update | roles | update | Update roles and permissions |
| roles.delete | roles | delete | Delete roles |
| settings.read | settings | read | View system settings |
| settings.update | settings | update | Update system settings |
| activities.read | activities | read | View activity logs |

#### role_permissions

Many-to-many mapping between roles and permissions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | INTEGER | No | AUTO | Primary key, auto-increment |
| role_id | INTEGER | No | - | Foreign key to roles table |
| permission_id | INTEGER | No | - | Foreign key to permissions table |
| created_at | TEXT | Yes | now() | Assignment timestamp |

**Indexes:**
- Primary key on `id`
- Index on `role_id`
- Index on `permission_id`
- Unique composite index on `(role_id, permission_id)`

**Constraints:**
- Foreign key: `role_id` → `roles.id` (ON DELETE CASCADE)
- Foreign key: `permission_id` → `permissions.id` (ON DELETE CASCADE)

**Default Assignments:**
- Admin role: All permissions
- User role: All permissions except users.*, roles.*, settings.*, activities.read
- Guest role: games.read, playlists.read

#### refresh_tokens

JWT refresh tokens for authentication.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | INTEGER | No | AUTO | Primary key, auto-increment |
| user_id | INTEGER | No | - | Foreign key to users table |
| token | TEXT | No | - | Unique refresh token (64-byte hex string) |
| expires_at | TEXT | No | - | Token expiration timestamp (ISO 8601) |
| created_at | TEXT | Yes | now() | Token creation timestamp |
| revoked_at | TEXT | Yes | NULL | Token revocation timestamp (if revoked) |

**Indexes:**
- Primary key on `id`
- Unique index on `token`
- Index on `user_id`
- Index on `expires_at`

**Constraints:**
- Foreign key: `user_id` → `users.id` (ON DELETE CASCADE)

**Notes:**
- Refresh tokens are random 64-byte hex strings
- Tokens are single-use (revoked after use)
- Expired tokens are periodically cleaned up

#### activity_logs

Audit log for user actions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | INTEGER | No | AUTO | Primary key, auto-increment |
| user_id | INTEGER | Yes | NULL | Foreign key to users table (nullable for unauthenticated actions) |
| username | TEXT | Yes | NULL | Username snapshot (preserved if user deleted) |
| action | TEXT | No | - | Action performed (e.g., "login", "game.play") |
| resource | TEXT | Yes | NULL | Resource type affected |
| resource_id | TEXT | Yes | NULL | Resource ID affected |
| details | TEXT | Yes | NULL | Additional details (JSON or text) |
| ip_address | TEXT | Yes | NULL | Client IP address |
| user_agent | TEXT | Yes | NULL | Client user agent |
| created_at | TEXT | Yes | now() | Action timestamp |

**Indexes:**
- Primary key on `id`
- Index on `user_id`
- Index on `action`
- Index on `resource`
- Index on `created_at`

**Constraints:**
- Foreign key: `user_id` → `users.id` (ON DELETE SET NULL)

**Common Actions:**
- `login` - User logged in
- `logout` - User logged out
- `game.play` - Game launched
- `game.view` - Game details viewed
- `user.create` - User account created
- `user.update` - User account updated
- `role.update` - Role permissions updated

#### system_settings

Global system settings stored as key-value pairs.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | INTEGER | No | AUTO | Primary key, auto-increment |
| category | TEXT | No | - | Setting category (e.g., "auth", "app", "metadata", "features", "game") |
| key | TEXT | No | - | Setting key within category |
| value | TEXT | Yes | NULL | Setting value (JSON or plain text) |
| value_type | TEXT | Yes | 'string' | Data type: "string", "number", "boolean", "json" |
| description | TEXT | Yes | NULL | Human-readable description |
| validation_schema | TEXT | Yes | NULL | JSON Schema for value validation |
| is_public | BOOLEAN | Yes | 0 | Whether setting is publicly readable |
| updated_at | TEXT | Yes | now() | Last update timestamp |
| updated_by | INTEGER | Yes | NULL | User ID who last updated settings |

**Indexes:**
- Primary key on `id`
- Unique composite index on `(category, key)`
- Index on `category`
- Index on `is_public`

**Constraints:**
- Foreign key: `updated_by` → `users.id` (ON DELETE SET NULL)

**Common Categories:**

1. **auth** - Authentication settings
   - `guestAccessEnabled` (boolean): Allow guest browsing
   - `userRegistrationEnabled` (boolean): Allow new user registration
   - `maxLoginAttempts` (number): Max failed login attempts
   - `lockoutDurationMinutes` (number): Account lockout duration

2. **app** - Application settings
   - `siteName` (string): Site name displayed in UI
   - `maintenanceMode` (boolean): Enable maintenance mode
   - `defaultTheme` (string): Default theme mode
   - `defaultPrimaryColor` (string): Default primary color

3. **metadata** - Metadata sync settings
   - `autoSyncEnabled` (boolean): Auto sync on startup
   - `syncIntervalMinutes` (number): Sync check interval
   - `syncTags` (boolean): Include tags in sync
   - `syncPlatforms` (boolean): Include platforms in sync

4. **features** - Feature flags
   - `enablePlaylists` (boolean): Enable playlists feature
   - `enableFavorites` (boolean): Enable favorites feature
   - `enableStatistics` (boolean): Enable statistics tracking
   - `enableActivityLog` (boolean): Enable activity logging
   - `enableUserProfiles` (boolean): Enable user profiles

5. **game** - Game player settings
   - `defaultScaleMode` (string): Default Ruffle scale mode
   - `defaultVolume` (number): Default audio volume (0-1)
   - `enableFlash` (boolean): Enable Flash games
   - `enableHtml5` (boolean): Enable HTML5 games

**Notes:**
- Settings are accessed via `SystemSettingsService` with caching
- Validation schemas enforce type safety and constraints
- Created in migration 003 with seeded defaults (no migration from auth_settings needed)
- Cached with 60-second TTL for performance

#### login_attempts

Login attempt tracking for security.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | INTEGER | No | AUTO | Primary key, auto-increment |
| username | TEXT | No | - | Username attempted |
| ip_address | TEXT | No | - | Client IP address |
| success | BOOLEAN | Yes | 0 | Whether attempt was successful |
| attempted_at | TEXT | Yes | now() | Attempt timestamp |

**Indexes:**
- Primary key on `id`
- Index on `username`
- Index on `ip_address`
- Index on `attempted_at`

**Notes:**
- Used for rate limiting and account lockout
- Old records are periodically cleaned up

#### user_game_plays

Individual play sessions for tracking gameplay.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | INTEGER | No | AUTO | Primary key, auto-increment |
| user_id | INTEGER | No | - | Foreign key to users table |
| game_id | TEXT | No | - | Game ID from flashpoint.sqlite |
| game_title | TEXT | Yes | NULL | Game title snapshot |
| started_at | TEXT | No | now() | Session start timestamp |
| ended_at | TEXT | Yes | NULL | Session end timestamp (NULL = active/abandoned) |
| duration_seconds | INTEGER | Yes | NULL | Session duration in seconds |
| session_id | TEXT | No | - | Unique session identifier (UUID) |

**Indexes:**
- Primary key on `id`
- Unique index on `session_id`
- Index on `user_id`
- Index on `game_id`
- Index on `started_at`

**Constraints:**
- Foreign key: `user_id` → `users.id` (ON DELETE CASCADE)

**Session States:**
1. **Active:** `ended_at` IS NULL, `started_at` < 24 hours ago
2. **Completed:** `ended_at` IS NOT NULL, `duration_seconds` calculated
3. **Abandoned:** `ended_at` IS NULL, `started_at` >= 24 hours ago

**Notes:**
- Background job runs every 6 hours to clean up abandoned sessions
- Sessions older than 24 hours without `ended_at` are marked as abandoned

#### user_game_stats

Aggregated play statistics per user per game.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | INTEGER | No | AUTO | Primary key, auto-increment |
| user_id | INTEGER | No | - | Foreign key to users table |
| game_id | TEXT | No | - | Game ID from flashpoint.sqlite |
| game_title | TEXT | Yes | NULL | Game title snapshot |
| total_plays | INTEGER | Yes | 0 | Total number of play sessions |
| total_playtime_seconds | INTEGER | Yes | 0 | Total playtime in seconds |
| first_played_at | TEXT | Yes | NULL | First play timestamp |
| last_played_at | TEXT | Yes | NULL | Most recent play timestamp |

**Indexes:**
- Primary key on `id`
- Index on `user_id`
- Index on `game_id`
- Index on `total_plays`
- Index on `total_playtime_seconds`
- Unique composite index on `(user_id, game_id)`

**Constraints:**
- Foreign key: `user_id` → `users.id` (ON DELETE CASCADE)

**Notes:**
- Updated automatically when play sessions end
- Used for "Most Played" and "Recently Played" features

#### user_stats

Overall user statistics.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| user_id | INTEGER | No | - | Primary key, foreign key to users table |
| total_games_played | INTEGER | Yes | 0 | Total unique games played |
| total_playtime_seconds | INTEGER | Yes | 0 | Total playtime across all games |
| total_sessions | INTEGER | Yes | 0 | Total play sessions |
| first_play_at | TEXT | Yes | NULL | First play session timestamp |
| last_play_at | TEXT | Yes | NULL | Most recent play session timestamp |
| updated_at | TEXT | Yes | now() | Last update timestamp |

**Indexes:**
- Primary key on `user_id`
- Index on `total_playtime_seconds`

**Constraints:**
- Foreign key: `user_id` → `users.id` (ON DELETE CASCADE)

**Notes:**
- Updated automatically when play sessions end
- Provides aggregated statistics for user dashboard

#### user_settings

Flexible key-value storage for user preferences.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | INTEGER | No | AUTO | Primary key, auto-increment |
| user_id | INTEGER | No | - | Foreign key to users table |
| setting_key | TEXT | No | - | Setting key (e.g., "theme_mode", "primary_color") |
| setting_value | TEXT | No | - | Setting value (JSON or plain text) |
| created_at | TEXT | Yes | now() | Creation timestamp |
| updated_at | TEXT | Yes | now() | Last update timestamp |

**Indexes:**
- Primary key on `id`
- Index on `user_id`
- Index on `setting_key`
- Unique composite index on `(user_id, setting_key)`

**Constraints:**
- Foreign key: `user_id` → `users.id` (ON DELETE CASCADE)

**Common Settings:**
- `theme_mode`: "light" | "dark" | "system"
- `primary_color`: Color name (e.g., "blue", "green", "purple")
- `card_size`: "small" | "medium" | "large"
- `view_mode`: "grid" | "list"
- `sidebar_collapsed`: "true" | "false"

**Notes:**
- Provides extensible settings storage without schema changes
- Values are stored as text; client handles type conversion
- Default values are applied in migration 002

---

## Database Access Patterns

### Best Practices

1. **Read-Only Access to Flashpoint Database**
   - Never perform INSERT, UPDATE, or DELETE operations
   - Use prepared statements for queries
   - Leverage indexes for efficient queries

2. **User Database Transactions**
   - Use transactions for multi-table operations
   - Always use prepared statements to prevent SQL injection
   - Handle foreign key constraints appropriately

3. **Connection Management**
   - DatabaseService maintains a single connection to flashpoint.sqlite
   - UserDatabaseService maintains a single connection to user.db
   - Connections are synchronous (BetterSqlite3)

4. **File Watching**
   - DatabaseService watches flashpoint.sqlite for external changes
   - Automatically reloads connection when Flashpoint Launcher updates database
   - Prevents stale data from being served

### Common Query Patterns

#### Games with Filters

```sql
SELECT g.id, g.title, g.developer, g.platformName, g.tagsStr
FROM game g
WHERE g.library = 'arcade'
  AND g.platformName = 'Flash'
  AND g.broken = 0
  AND g.extreme = 0
  AND g.title LIKE '%puzzle%'
ORDER BY g.orderTitle
LIMIT 50 OFFSET 0;
```

#### User with Permissions

```sql
SELECT u.*, r.name as role_name, GROUP_CONCAT(p.name) as permissions
FROM users u
INNER JOIN roles r ON r.id = u.role_id
LEFT JOIN role_permissions rp ON rp.role_id = r.id
LEFT JOIN permissions p ON p.id = rp.permission_id
WHERE u.id = ?
GROUP BY u.id;
```

#### Play Statistics

```sql
SELECT
  ugs.game_id,
  ugs.game_title,
  ugs.total_plays,
  ugs.total_playtime_seconds,
  ugs.last_played_at
FROM user_game_stats ugs
WHERE ugs.user_id = ?
ORDER BY ugs.last_played_at DESC
LIMIT 10;
```

---

## Schema Maintenance

### Migrations

New migrations should be added as `backend/src/migrations/00X_description.sql` with sequential numbering.

**Migration Guidelines:**
- Always use `CREATE TABLE IF NOT EXISTS`
- Always use `CREATE INDEX IF NOT EXISTS`
- Use `INSERT OR IGNORE` for default data
- Include comments explaining the purpose
- Test migrations on a copy of the database first

### Backup Recommendations

1. **User Database:** Regular backups recommended
   - Contains all user data, sessions, and play history
   - Use SQLite backup command or file copy

2. **Flashpoint Database:** Managed by Flashpoint Launcher
   - Updated by Flashpoint Launcher automatically
   - Not recommended to modify or back up separately

---

## Performance Considerations

### Indexes

All tables have appropriate indexes for common query patterns. Additional indexes may be added based on query performance analysis.

### Query Optimization

- Use `EXPLAIN QUERY PLAN` to analyze query performance
- Avoid `SELECT *` in production queries
- Use pagination for large result sets
- Leverage existing indexes in WHERE clauses

### Connection Pooling

- Both databases use single synchronous connections
- BetterSqlite3 provides better performance than async wrappers
- No connection pooling needed for SQLite

---

## Related Documentation

- [Backend Database Services](../03-backend/services/database-service.md)
- [User Database Service](../03-backend/services/user-database-service.md)
- [Type Definitions](./type-definitions.md)
- [API Reference](../06-api-reference/README.md)
