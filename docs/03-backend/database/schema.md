# Database Schema

Complete database schema reference for both Flashpoint and user databases.

## Overview

The backend uses two separate SQLite databases:

1. **Flashpoint Database** (`flashpoint.sqlite`) - Read-only game metadata
2. **User Database** (`user.db`) - Application-specific data

---

## Flashpoint Database (flashpoint.sqlite)

### Purpose

Contains the official Flashpoint Archive game metadata. This database is managed by the Flashpoint Launcher and should be treated as read-only (except for play statistics).

### Main Tables

#### game

Primary game metadata table.

```sql
CREATE TABLE game (
  id TEXT PRIMARY KEY,              -- UUID (e.g., "12345-abcd-6789")
  parentGameId TEXT,                -- Parent game UUID (for add-ons/DLC)
  title TEXT NOT NULL,              -- Game title
  alternateTitles TEXT,             -- Alternate names
  series TEXT,                      -- Game series name
  developer TEXT,                   -- Developer name
  publisher TEXT,                   -- Publisher name
  platformName TEXT,                -- Platform (Flash, HTML5, etc.)
  platformsStr TEXT,                -- Comma-separated platforms
  platformId INTEGER,               -- FK to platform table
  playMode TEXT,                    -- Single Player, Multiplayer, etc.
  status TEXT,                      -- Status
  broken BOOLEAN DEFAULT 0,         -- Is game broken?
  extreme BOOLEAN DEFAULT 0,        -- Adult content flag
  notes TEXT,                       -- Notes about game
  tagsStr TEXT,                     -- Semicolon-delimited tags
  source TEXT,                      -- Source URL
  applicationPath TEXT,             -- Launch application
  launchCommand TEXT,               -- Launch command/URL
  releaseDate TEXT,                 -- YYYY-MM-DD format
  version TEXT,                     -- Game version
  originalDescription TEXT,         -- Description
  language TEXT,                    -- Language
  library TEXT,                     -- arcade, theatre, etc.
  orderTitle TEXT,                  -- Normalized title for sorting
  dateAdded TEXT,                   -- When added to Flashpoint
  dateModified TEXT,                -- Last modified
  playtime INTEGER DEFAULT 0,       -- Total playtime (seconds)
  playCounter INTEGER DEFAULT 0,    -- Number of plays
  lastPlayed TEXT,                  -- Last played timestamp
  archiveState INTEGER,             -- Archive status
  logoPath TEXT,                    -- Logo image path
  screenshotPath TEXT               -- Screenshot image path
);

CREATE INDEX idx_game_title ON game(title);
CREATE INDEX idx_game_platform ON game(platformName);
CREATE INDEX idx_game_developer ON game(developer);
CREATE INDEX idx_game_library ON game(library);
```

**Key Fields**:
- `id`: Unique game identifier (UUID)
- `platformName`: Platform name (Flash, HTML5, Shockwave, etc.)
- `library`: Game library (arcade, theatre)
- `tagsStr`: Semicolon-delimited tags (e.g., "Action;Adventure;Platformer")
- `broken`: Games that don't work properly
- `extreme`: Adult content requiring age verification
- `playtime`: Total playtime in seconds (updated by backend)
- `playCounter`: Number of times played (updated by backend)
- `lastPlayed`: ISO timestamp of last play (updated by backend)

---

#### platform

Platform definitions.

```sql
CREATE TABLE platform (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE         -- Platform name
);
```

---

#### tag

Tag definitions.

```sql
CREATE TABLE tag (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,               -- Tag name
  category TEXT                     -- Tag category
);
```

---

#### game_tags_tag

Many-to-many relationship between games and tags.

```sql
CREATE TABLE game_tags_tag (
  gameId TEXT NOT NULL,             -- FK to game.id
  tagId INTEGER NOT NULL,           -- FK to tag.id
  FOREIGN KEY (gameId) REFERENCES game(id),
  FOREIGN KEY (tagId) REFERENCES tag(id)
);
```

---

#### game_data

Game file data and launch configurations.

```sql
CREATE TABLE game_data (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gameId TEXT NOT NULL,             -- FK to game.id
  title TEXT,                       -- Data entry title
  dateAdded TEXT,                   -- When added
  sha256 TEXT,                      -- File hash
  crc32 INTEGER,                    -- CRC32 checksum
  presentOnDisk INTEGER,            -- NULL=no data, 0=needs download, 1=downloaded
  path TEXT,                        -- File path
  size INTEGER,                     -- File size in bytes
  parameters TEXT,                  -- URL parameters
  applicationPath TEXT,             -- Launch application
  launchCommand TEXT,               -- Launch command
  FOREIGN KEY (gameId) REFERENCES game(id)
);

CREATE INDEX idx_game_data_gameId ON game_data(gameId);
```

**Key Fields**:
- `presentOnDisk`: Download status (NULL = no file needed, 0 = needs download, 1 = available)
- `launchCommand`: Preferred launch command
- `path`: File path for game content
- `parameters`: URL parameters to append

---

#### playlist

User playlists (shared with Flashpoint Launcher).

```sql
CREATE TABLE playlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,              -- Playlist name
  description TEXT,                 -- Playlist description
  author TEXT,                      -- Creator
  library TEXT,                     -- Library filter
  icon TEXT                         -- Icon path
);
```

---

#### playlist_game

Playlist entries.

```sql
CREATE TABLE playlist_game (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  playlistId INTEGER NOT NULL,      -- FK to playlist.id
  gameId TEXT NOT NULL,             -- FK to game.id
  order_ INTEGER,                   -- Display order
  notes TEXT,                       -- Entry notes
  FOREIGN KEY (playlistId) REFERENCES playlist(id),
  FOREIGN KEY (gameId) REFERENCES game(id)
);
```

---

## User Database (user.db)

### Purpose

Stores application-specific data: user accounts, authentication, roles, permissions, play tracking, and settings.

### Authentication Tables

#### users

User accounts.

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,      -- bcrypt hash
  role_id INTEGER NOT NULL,         -- FK to roles.id
  is_active BOOLEAN DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_login_at TEXT,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_is_active ON users(is_active);
```

**Default Users**:
- Username: `admin`, Password: `admin123` (created on first run)

---

#### roles

User roles.

```sql
CREATE TABLE roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  description TEXT,
  priority INTEGER DEFAULT 0,       -- Higher = more powerful
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

**Default Roles**:
- `admin` (id=1, priority=100): Full access
- `user` (id=2, priority=50): Standard access
- `guest` (id=3, priority=0): Read-only access

---

#### permissions

Available permissions.

```sql
CREATE TABLE permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,        -- e.g., "games.read"
  description TEXT,
  resource TEXT NOT NULL,           -- e.g., "games"
  action TEXT NOT NULL,             -- e.g., "read"
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_permissions_resource_action ON permissions(resource, action);
```

**Default Permissions**:
- `games.read`, `games.play`, `games.download`
- `playlists.read`, `playlists.create`, `playlists.update`, `playlists.delete`
- `users.read`, `users.create`, `users.update`, `users.delete`
- `roles.read`, `roles.create`, `roles.update`, `roles.delete`
- `settings.read`, `settings.update`
- `activities.read`

---

#### role_permissions

Role-permission mapping.

```sql
CREATE TABLE role_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  UNIQUE(role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);
```

---

#### refresh_tokens

JWT refresh tokens.

```sql
CREATE TABLE refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  revoked_at TEXT,                  -- When token was revoked
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
```

---

#### login_attempts

Failed login tracking for lockout.

```sql
CREATE TABLE login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  success BOOLEAN DEFAULT 0,
  attempted_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_login_attempts_username ON login_attempts(username);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_attempted_at ON login_attempts(attempted_at);
```

---

#### system_settings

Global system-wide configuration using key-value storage.

```sql
CREATE TABLE system_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,              -- e.g., 'auth.guest_access_enabled'
  value TEXT NOT NULL,                   -- Stored as string, parsed by data_type
  data_type TEXT NOT NULL CHECK (data_type IN ('boolean', 'integer', 'string', 'json', 'float')),
  category TEXT NOT NULL,                -- auth, app, metadata, features, game, storage, rate_limit
  description TEXT,                      -- Human-readable description
  is_public BOOLEAN DEFAULT 0,           -- Public settings readable without auth
  default_value TEXT,                    -- Fallback if value is NULL
  validation_schema TEXT,                -- JSON schema for runtime validation
  updated_at TEXT DEFAULT (datetime('now')),
  updated_by INTEGER,                    -- FK to users.id
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_system_settings_key ON system_settings(key);
CREATE INDEX idx_system_settings_category ON system_settings(category);
```

**Categories**: auth, app, metadata, features, game, storage, rate_limit

---

### Play Tracking Tables

#### user_game_plays

Individual play sessions.

```sql
CREATE TABLE user_game_plays (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game_id TEXT NOT NULL,            -- FK to game.id in Flashpoint DB
  game_title TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,                    -- NULL = session still active
  duration_seconds INTEGER,         -- Session duration
  session_id TEXT NOT NULL UNIQUE,  -- Random session identifier
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_game_plays_user_id ON user_game_plays(user_id);
CREATE INDEX idx_user_game_plays_game_id ON user_game_plays(game_id);
CREATE INDEX idx_user_game_plays_started_at ON user_game_plays(started_at);
CREATE INDEX idx_user_game_plays_session_id ON user_game_plays(session_id);
```

---

#### user_game_stats

Aggregated per-game statistics.

```sql
CREATE TABLE user_game_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game_id TEXT NOT NULL,
  game_title TEXT,
  total_plays INTEGER DEFAULT 0,
  total_playtime_seconds INTEGER DEFAULT 0,
  first_played_at TEXT,
  last_played_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, game_id)
);

CREATE INDEX idx_user_game_stats_user_id ON user_game_stats(user_id);
CREATE INDEX idx_user_game_stats_game_id ON user_game_stats(game_id);
CREATE INDEX idx_user_game_stats_total_plays ON user_game_stats(total_plays);
CREATE INDEX idx_user_game_stats_total_playtime ON user_game_stats(total_playtime_seconds);
```

---

#### user_stats

Overall user statistics.

```sql
CREATE TABLE user_stats (
  user_id INTEGER PRIMARY KEY,      -- One row per user
  total_games_played INTEGER DEFAULT 0,
  total_playtime_seconds INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  first_play_at TEXT,
  last_play_at TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_stats_total_playtime ON user_stats(total_playtime_seconds);
```

---

### Activity Logging

#### activity_logs

User activity audit trail.

```sql
CREATE TABLE activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,                  -- NULL for system actions
  username TEXT,
  action TEXT NOT NULL,             -- e.g., "login", "create", "delete"
  resource TEXT,                    -- e.g., "users", "games"
  resource_id TEXT,                 -- ID of affected resource
  details TEXT,                     -- JSON details
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_resource ON activity_logs(resource);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
```

**Retention**: Logs older than 90 days are automatically cleaned up.

---

### User Settings

#### user_settings

User preferences and settings.

```sql
CREATE TABLE user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  setting_key TEXT NOT NULL,        -- e.g., "theme_mode", "primary_color"
  setting_value TEXT,               -- Setting value (string)
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, setting_key)
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX idx_user_settings_key ON user_settings(setting_key);
```

**Common Settings**:
- `theme_mode`: "light" | "dark" | "system"
- `primary_color`: Color name (e.g., "blue", "green")
- `sidebar_collapsed`: "true" | "false"

---

## Data Relationships

### Cross-Database Relationships

The backend maintains referential integrity between databases:

```
user_game_plays.game_id -> game.id (Flashpoint DB)
user_game_stats.game_id -> game.id (Flashpoint DB)
```

These are soft foreign keys (not enforced by SQLite) and must be maintained by application logic.

### Permission Hierarchy

```
User
  └─ has Role (role_id)
       └─ has Permissions (via role_permissions)
```

### Play Tracking Hierarchy

```
User
  ├─ user_stats (overall stats)
  ├─ user_game_stats (per-game aggregated)
  └─ user_game_plays (individual sessions)
```

---

## Indexes

All foreign keys and frequently queried columns are indexed for performance:

- User lookups: `username`, `email`, `role_id`
- Play tracking: `user_id`, `game_id`, `started_at`
- Activity logs: `user_id`, `action`, `resource`, `created_at`
- Authentication: `token`, `expires_at`

---

## Data Types

SQLite TEXT fields store:
- **Dates/Times**: ISO 8601 format (`YYYY-MM-DDTHH:MM:SS.sssZ`)
- **Booleans**: 0 (false) or 1 (true)
- **JSON**: Stringified JSON objects in `details` columns

---

## Migration History

See [migrations.md](./migrations.md) for migration system documentation.

Applied migrations:
1. `001_user-schema.sql` - Initial user database schema
2. `002_create-user-settings.sql` - Add user_settings table
3. `003_drop-legacy-theme-columns.sql` - Remove old theme columns from users table

---

## Query Examples

### Get user with role and permissions

```sql
SELECT u.*, r.name as role_name,
       GROUP_CONCAT(p.name) as permissions
FROM users u
JOIN roles r ON u.role_id = r.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE u.id = ?
GROUP BY u.id;
```

### Get user play statistics

```sql
SELECT
  COUNT(DISTINCT game_id) as games_played,
  SUM(duration_seconds) as total_playtime,
  COUNT(*) as total_sessions
FROM user_game_plays
WHERE user_id = ? AND ended_at IS NOT NULL;
```

### Get top games by playtime

```sql
SELECT game_id, game_title,
       total_plays, total_playtime_seconds
FROM user_game_stats
WHERE user_id = ?
ORDER BY total_playtime_seconds DESC
LIMIT 10;
```

---

## Related Documentation

- [UserDatabaseService](../services/user-database-service.md) - Database access service
- [DatabaseService](../services/database-service.md) - Flashpoint database service
- [Migrations](./migrations.md) - Migration system
- [Data Models](./data-models.md) - TypeScript types
