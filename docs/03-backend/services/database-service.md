# DatabaseService

`DatabaseService` manages the connection to the Flashpoint game metadata database (flashpoint.sqlite). It provides a singleton interface for database access with automatic hot-reload when the database file changes.

## Location

`backend/src/services/DatabaseService.ts`

## Overview

The DatabaseService connects to the official Flashpoint Archive database managed by the Flashpoint Launcher. It implements:

- **Singleton pattern**: Single database connection per process
- **File watching**: Detects when Flashpoint Launcher updates the database
- **Hot-reload**: Automatically reconnects when database changes
- **Read/Write access**: Allows play statistics updates while maintaining data integrity

## Key Features

### 1. Database Connection

Uses `better-sqlite3` for synchronous SQLite access:

```typescript
this.db = new BetterSqlite3(config.flashpointDbPath, {
  fileMustExist: true,
});
```

**Why synchronous?**
- SQLite is single-threaded; async provides no performance benefit
- Simpler code without promises/callbacks
- Better performance for SQLite workloads

### 2. File Watching

Monitors the database file for changes from Flashpoint Launcher:

```typescript
this.watcher = fs.watch(config.flashpointDbPath, (eventType) => {
  if (eventType === 'change') {
    // Debounce: wait 500ms after last change
    if (this.reloadTimeout) {
      clearTimeout(this.reloadTimeout);
    }

    this.reloadTimeout = setTimeout(() => {
      this.reloadFromDisk();
    }, 500);
  }
});
```

**Debouncing**: Waits 500ms after last change to prevent excessive reloads during Launcher operations.

### 3. Hot-Reload

Automatically reopens database connection when file changes:

```typescript
private static async reloadFromDisk(): Promise<void> {
  // Check file modification time
  const stats = fs.statSync(config.flashpointDbPath);
  if (stats.mtimeMs <= this.lastModifiedTime) {
    return; // File hasn't actually changed
  }

  logger.info('Database file changed on disk, reopening connection...');

  // Close existing connection
  if (this.db) {
    this.db.close();
    this.db = null;
  }

  // Reopen database
  this.db = new BetterSqlite3(config.flashpointDbPath, {
    fileMustExist: true,
  });

  this.lastModifiedTime = stats.mtimeMs;
  logger.info('Database connection reopened successfully');
}
```

## Public API

### Static Methods

#### `initialize(): Promise<void>`

Initialize database connection and start file watching.

```typescript
await DatabaseService.initialize();
```

**Throws**:
- `Error` if database file not found
- `Error` if database cannot be opened

**Called by**: `server.ts` on startup

---

#### `getDatabase(): BetterSqlite3.Database`

Get the database instance for direct queries.

```typescript
const db = DatabaseService.getDatabase();
const result = db.prepare('SELECT * FROM game WHERE id = ?').get(gameId);
```

**Returns**: BetterSqlite3.Database instance

**Throws**: `Error` if database not initialized

**Usage**: Preferred for complex queries or when you need the raw database connection.

---

#### `get(sql: string, params: any[]): any | null`

Execute a query and return the first result row.

```typescript
const game = DatabaseService.get(
  'SELECT * FROM game WHERE id = ?',
  [gameId]
);
```

**Parameters**:
- `sql`: SQL query string
- `params`: Array of parameter values

**Returns**: First result row or null if no results

**Example**:
```typescript
const game = DatabaseService.get(
  'SELECT id, title, platform FROM game WHERE id = ?',
  ['12345-abcd-6789']
);
// Returns: { id: '12345-abcd-6789', title: 'Game Name', platform: 'Flash' }
```

---

#### `all(sql: string, params: any[]): any[]`

Execute a query and return all result rows.

```typescript
const games = DatabaseService.all(
  'SELECT * FROM game WHERE platformName = ? LIMIT ?',
  ['Flash', 100]
);
```

**Parameters**:
- `sql`: SQL query string
- `params`: Array of parameter values

**Returns**: Array of result rows (empty array if no results)

**Example**:
```typescript
const platforms = DatabaseService.all(
  'SELECT DISTINCT platformName FROM game ORDER BY platformName',
  []
);
// Returns: [{ platformName: 'Flash' }, { platformName: 'HTML5' }, ...]
```

---

#### `run(sql: string, params: any[]): void`

Execute an INSERT, UPDATE, or DELETE query.

```typescript
DatabaseService.run(
  'UPDATE game SET playtime = ?, playCounter = ? WHERE id = ?',
  [3600, 5, gameId]
);
```

**Parameters**:
- `sql`: SQL query string
- `params`: Array of parameter values

**Returns**: void

**Note**: Used for updating play statistics. Handle with care as database is shared with Flashpoint Launcher.

**Example**:
```typescript
// Update play statistics
DatabaseService.run(
  `UPDATE game
   SET lastPlayed = ?,
       playtime = playtime + ?,
       playCounter = playCounter + 1
   WHERE id = ?`,
  [new Date().toISOString(), sessionDuration, gameId]
);
```

---

#### `exec(sql: string, params: any[]): any[]`

Alias for `all()`. Execute query and return all results.

```typescript
const results = DatabaseService.exec('SELECT * FROM tag', []);
```

---

#### `save(): void`

Force database changes to disk (checkpoint in WAL mode).

```typescript
DatabaseService.save();
```

**Note**: Changes are automatically written to disk with better-sqlite3. This method exists for compatibility but performs a WAL checkpoint to ensure all changes are flushed.

---

#### `reload(): Promise<void>`

Manually reload database from disk.

```typescript
await DatabaseService.reload();
```

**Use case**: Call when you know database has changed externally.

---

#### `isConnected(): boolean`

Check if database is connected.

```typescript
if (DatabaseService.isConnected()) {
  // Safe to query
}
```

**Returns**: true if database connection exists

---

#### `close(): void`

Close database connection and stop file watching.

```typescript
DatabaseService.close();
```

**Called by**: Process shutdown handlers

## Usage Examples

### Game Queries

```typescript
// Get game by ID
const game = DatabaseService.get(
  `SELECT g.id, g.title, g.developer, g.publisher, g.platformName,
          g.launchCommand, g.releaseDate, g.notes, g.tagsStr
   FROM game g
   WHERE g.id = ?`,
  [gameId]
);

// Search games by title
const games = DatabaseService.all(
  `SELECT id, title, developer, platformName
   FROM game
   WHERE title LIKE ?
   ORDER BY title
   LIMIT 50`,
  [`%${searchTerm}%`]
);

// Get game count by platform
const platformCounts = DatabaseService.all(
  `SELECT platformName, COUNT(*) as count
   FROM game
   GROUP BY platformName
   ORDER BY count DESC`,
  []
);
```

### Platform Queries

```typescript
// Get all platforms
const platforms = DatabaseService.all(
  'SELECT DISTINCT platformName FROM game ORDER BY platformName',
  []
);

// Get games for platform
const flashGames = DatabaseService.all(
  'SELECT * FROM game WHERE platformName = ? LIMIT ?',
  ['Flash', 100]
);
```

### Tag Queries

```typescript
// Get distinct tags (parsed from tagsStr)
const gamesWithTags = DatabaseService.all(
  'SELECT DISTINCT tagsStr FROM game WHERE tagsStr IS NOT NULL',
  []
);

// Parse tags from delimited string
const tags = new Set();
gamesWithTags.forEach(row => {
  row.tagsStr.split(';').forEach(tag => tags.add(tag.trim()));
});
```

### Update Statistics

```typescript
// Update play statistics (called by PlayTrackingService)
DatabaseService.run(
  `UPDATE game
   SET lastPlayed = ?,
       playtime = ?,
       playCounter = ?
   WHERE id = ?`,
  [lastPlayed, totalPlaytime, totalPlays, gameId]
);
```

## Database Schema

The Flashpoint database contains these main tables:

### game
Main game metadata table:
- `id` (TEXT PRIMARY KEY) - UUID
- `title` (TEXT) - Game title
- `series` (TEXT) - Game series
- `developer` (TEXT) - Developer name
- `publisher` (TEXT) - Publisher name
- `platformName` (TEXT) - Platform (Flash, HTML5, etc.)
- `platformId` (INTEGER) - Platform ID FK
- `playMode` (TEXT) - Single Player, Multiplayer, etc.
- `status` (TEXT) - Status
- `broken` (BOOLEAN) - Is broken?
- `extreme` (BOOLEAN) - Adult content?
- `library` (TEXT) - arcade, theatre, etc.
- `tagsStr` (TEXT) - Semicolon-delimited tags
- `notes` (TEXT) - Notes
- `source` (TEXT) - Source URL
- `applicationPath` (TEXT) - Launch application
- `launchCommand` (TEXT) - Launch command
- `releaseDate` (TEXT) - YYYY-MM-DD format
- `version` (TEXT) - Version
- `originalDescription` (TEXT) - Description
- `language` (TEXT) - Language
- `orderTitle` (TEXT) - Normalized title for sorting
- `dateAdded` (TEXT) - When added to Flashpoint
- `dateModified` (TEXT) - Last modified
- `playtime` (INTEGER) - Total playtime in seconds
- `playCounter` (INTEGER) - Number of times played
- `lastPlayed` (TEXT) - Last played timestamp
- `logoPath` (TEXT) - Logo image path
- `screenshotPath` (TEXT) - Screenshot image path

### platform
Platform definitions:
- `id` (INTEGER PRIMARY KEY)
- `name` (TEXT) - Platform name

### tag
Tag definitions:
- `id` (INTEGER PRIMARY KEY)
- `name` (TEXT) - Tag name
- `category` (TEXT) - Tag category

### game_tags_tag
Many-to-many relationship:
- `gameId` (TEXT) - Game ID FK
- `tagId` (INTEGER) - Tag ID FK

### game_data
Game file data:
- `id` (INTEGER PRIMARY KEY)
- `gameId` (TEXT) - Game ID FK
- `title` (TEXT) - Data entry title
- `dateAdded` (TEXT) - When added
- `applicationPath` (TEXT) - Launch application
- `launchCommand` (TEXT) - Launch command
- `path` (TEXT) - File path
- `parameters` (TEXT) - URL parameters
- `presentOnDisk` (INTEGER) - 0=needs download, 1=downloaded, NULL=no data

## Error Handling

```typescript
try {
  const game = DatabaseService.get('SELECT * FROM game WHERE id = ?', [id]);
} catch (error) {
  // Errors are logged automatically
  logger.error('Database query error:', error);
  throw error;
}
```

All database methods log errors with query context before rethrowing.

## File Watching Edge Cases

### Launcher Lock

When Flashpoint Launcher is updating the database:
1. File watcher detects change
2. Reload is debounced (waits 500ms)
3. If Launcher still has lock, reload may fail
4. Service retries initialization

### Rapid Changes

Multiple rapid changes (e.g., batch updates):
1. Each change triggers watcher
2. Debounce clears previous timeout
3. Only reloads 500ms after last change

### File Deletion

If database file is deleted:
1. Watcher detects change
2. Reload attempt fails
3. Error logged
4. Service remains in error state until file restored

## Performance Considerations

### Query Performance

- Use indexed columns in WHERE clauses
- Limit result sets with LIMIT
- Use prepared statements (cached by better-sqlite3)
- Avoid SELECT * for large tables

### Connection Reuse

- Single connection shared across all requests
- No connection pooling needed (SQLite is single-threaded)
- Thread-safe for single-process use

### File Watching

- Minimal overhead (native fs.watch)
- Debouncing prevents excessive reloads
- Modification time check prevents unnecessary work

## Troubleshooting

### Database Locked

**Symptom**: `SQLITE_BUSY: database is locked`

**Causes**:
- Flashpoint Launcher is accessing database
- Long-running query from another process
- WAL mode checkpoint conflict

**Solutions**:
- Close Flashpoint Launcher
- Wait for operations to complete
- Use shorter transactions

### File Not Found

**Symptom**: `Flashpoint database not found at: <path>`

**Causes**:
- Incorrect `FLASHPOINT_DB_PATH`
- Database not yet created
- File permissions issue

**Solutions**:
- Verify path in .env
- Check Flashpoint installation
- Verify file permissions

### Hot-Reload Failure

**Symptom**: Database changes not reflected

**Causes**:
- File watcher not started
- Debounce window too short
- Modification time unchanged

**Solutions**:
- Check logs for watcher start message
- Wait 500ms+ after change
- Manually call `reload()`

## Integration with Services

### GameService

Uses DatabaseService for all game queries:

```typescript
export class GameService {
  async searchGames(query: GameSearchQuery) {
    const games = DatabaseService.all(sql, params);
    return games;
  }
}
```

### PlayTrackingService

Updates play statistics in Flashpoint database:

```typescript
private async updateFlashpointGameStats(gameId: string, duration: number) {
  DatabaseService.run(
    `UPDATE game
     SET lastPlayed = ?, playtime = ?, playCounter = ?
     WHERE id = ?`,
    [lastPlayed, totalPlaytime, totalPlays, gameId]
  );
}
```

## Best Practices

1. **Always use parameterized queries** to prevent SQL injection
2. **Keep queries focused** - select only needed columns
3. **Use LIMIT** for potentially large result sets
4. **Check connection** before critical operations
5. **Handle errors gracefully** - database might reload during query
6. **Don't hold connections** - queries are synchronous and fast
7. **Monitor file changes** - watch logs for reload messages

## Related Documentation

- [UserDatabaseService](./user-database-service.md) - User database connection
- [GameService](./game-service.md) - Game query service
- [Database Schema](../database/schema.md) - Complete database schema
