# DatabaseService

Manages connection to the Flashpoint game metadata database (flashpoint.sqlite)
with automatic hot-reload when the database file changes.

## Overview

Implements singleton pattern for database access with file watching and
hot-reload.

## Key Features

- **Singleton pattern**: Single database connection per process
- **File watching**: Detects when Flashpoint Launcher updates the database
- **Hot-reload**: Automatically reconnects when database changes
- **Read-only access**: Flashpoint database is read-only (use UserDatabaseService
  for writes)
- **Local copy support**: Optional local database copy for network storage
  performance
- **Synchronous API**: Uses better-sqlite3 for better performance than async
  wrappers
- **Cache invalidation**: Clears GameSearchCache and filter caches on database
  reload

## Public API

### `initialize(): Promise<void>`

Initialize database connection and start file watching.

```typescript
await DatabaseService.initialize();
```

**Called by**: `server.ts` on startup

---

### `getDatabase(): BetterSqlite3.Database`

Get the database instance for direct queries.

```typescript
const db = DatabaseService.getDatabase();
const result = db.prepare('SELECT * FROM game WHERE id = ?').get(gameId);
```

---

### `get<T>(sql: string, params: unknown[]): T | undefined`

Execute a query and return the first result row.

```typescript
const game = DatabaseService.get<GameRow>(
  'SELECT * FROM game WHERE id = ?',
  [gameId]
);
```

**Returns**: First result row or undefined if no results

---

### `all<T>(sql: string, params: unknown[]): T[]`

Execute a query and return all result rows.

```typescript
const games = DatabaseService.all<GameRow>(
  'SELECT * FROM game WHERE platformName = ? LIMIT ?',
  ['Flash', 100]
);
```

**Returns**: Array of result rows (empty array if no results)

---

### `exec<T>(sql: string, params: unknown[]): T[]`

Execute a query and return results as objects. Same as `all()` but with
different naming convention.

```typescript
const results = DatabaseService.exec<{ id: number; name: string }>(
  'SELECT id, name FROM game',
  []
);
```

---

### `getTableColumns(tableName: string): Set<string>`

Get column names for a table using PRAGMA table_info. Used for runtime schema
introspection.

```typescript
const columns = DatabaseService.getTableColumns('game');
// Returns Set {'id', 'title', 'developer', ...}
```

---

### `getStatus(): DatabaseStatus`

Get current database connection status.

```typescript
const status = DatabaseService.getStatus();
// { connected: true, sourcePath: '...', activePath: '...', usingLocalCopy: false, lastModified: Date }

---

### `isConnected(): boolean`

Check if database is connected.

```typescript
if (DatabaseService.isConnected()) {
  // Safe to query
}
```

---

### `close(): void`

Close database connection and stop file watching.

```typescript
DatabaseService.close();
```

**Called by**:

- Graceful shutdown handler in `server.ts` (SIGTERM/SIGINT)
- Ensures all database connections properly closed before process exit

**Important**: Database connections are closed during graceful shutdown to
prevent resource leaks and ensure in-flight queries complete.

## Usage Examples

### Game Queries

```typescript
// Get game by ID
const game = DatabaseService.get(
  'SELECT g.id, g.title, g.developer, g.platform FROM game g WHERE g.id = ?',
  [gameId]
);

// Search games by title
const games = DatabaseService.all(
  'SELECT id, title, developer, platform FROM game WHERE title LIKE ? LIMIT 50',
  [`%${searchTerm}%`]
);

// Get game count by platform
const platformCounts = DatabaseService.all(
  'SELECT platformName, COUNT(*) as count FROM game GROUP BY platformName',
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
```

### Update Statistics

```typescript
// Update play statistics (called by PlayTrackingService)
DatabaseService.run(
  `UPDATE game
   SET lastPlayed = ?, playtime = ?, playCounter = ?
   WHERE id = ?`,
  [lastPlayed, totalPlaytime, totalPlays, gameId]
);
```

## Database Schema

Main tables in Flashpoint database:

### game

Main game metadata table:

- `id` (TEXT PRIMARY KEY) - UUID
- `title` (TEXT) - Game title
- `developer` (TEXT) - Developer name
- `publisher` (TEXT) - Publisher name
- `platformName` (TEXT) - Platform (Flash, HTML5, etc.)
- `launchCommand` (TEXT) - Launch command
- `releaseDate` (TEXT) - YYYY-MM-DD format
- `library` (TEXT) - arcade, theatre, etc.
- `tagsStr` (TEXT) - Semicolon-delimited tags
- `playtime` (INTEGER) - Total playtime in seconds
- `playCounter` (INTEGER) - Number of times played
- `lastPlayed` (TEXT) - Last played timestamp

### platform

Platform definitions with id and name.

### tag

Tag definitions with id, name, and category.

### game_tags_tag

Many-to-many relationship between games and tags.

## Error Handling

```typescript
try {
  const game = DatabaseService.get('SELECT * FROM game WHERE id = ?', [id]);
} catch (error) {
  logger.error('Database query error:', error);
  throw error;
}
```

All database methods log errors with query context before rethrowing.

## File Watching

### Hot-Reload Mechanism

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

**Debouncing**: Waits 500ms after last change to prevent excessive reloads
during Launcher operations.

### Atomic Database Swap Pattern

**Critical for Thread Safety**: The `syncAndReload()` and `forceSync()` methods
use an atomic swap pattern to prevent race conditions during hot-reload:

```typescript
// CORRECT: Atomic swap pattern
const newDb = new BetterSqlite3(config.flashpointDbPath);
const oldDb = this.db;
this.db = newDb; // Atomic reference swap
oldDb.close(); // Close old connection
```

**Why this matters:**

- Opens the new database connection FIRST
- Atomically swaps the reference (single operation)
- Then closes the old connection
- Prevents a window where `this.db = null` could cause 500 errors for
  concurrent requests

**What was wrong (before fix):**

```typescript
// WRONG: Race condition window
this.db.close(); // Closes connection
this.db = null; // Window here where concurrent requests fail!
this.db = new BetterSqlite3(config.flashpointDbPath); // Then reconnects
```

**Impact:**

- Concurrent requests during reload could get `Cannot read property 'prepare'
  of null` errors
- Users could see 500 errors briefly during Flashpoint Launcher updates
- With atomic swap, there's no window where `this.db` is null

### Edge Cases

**Launcher Lock**: When Flashpoint Launcher is updating, reload waits 500ms then
retries if lock still present.

**Rapid Changes**: Multiple rapid changes debounce to single reload.

**File Deletion**: If database is deleted, error logged and service remains in
error state until file restored.

## Performance

### Query Performance

- Use indexed columns in WHERE clauses
- Limit result sets with LIMIT
- Avoid SELECT \* for large tables
- Use prepared statements (cached by better-sqlite3)

### Connection Reuse

- Single connection shared across all requests
- No connection pooling needed (SQLite single-threaded)
- Thread-safe for single-process use

### File Watching

- Minimal overhead (native fs.watch)
- Debouncing prevents excessive reloads
- Modification time check prevents unnecessary work

### Journal Mode and Checkpointing

**Implementation**: `backend/src/services/DatabaseService.ts`

The `save()` method no longer runs WAL checkpoint operations because the database
is configured with `journal_mode = DELETE` (not WAL):

```typescript
// Journal mode: DELETE (not WAL)
// No need for checkpoint operations
this.db.pragma('journal_mode = delete');
```

**Why**:

- WAL (Write-Ahead Logging) not required for single-process SQLite
- DELETE mode simpler for read-mostly workloads
- Checkpoint operations (sync) would block readers
- No performance benefit in our single-process architecture

## Troubleshooting

### Database Locked

**Symptom**: `SQLITE_BUSY: database is locked`

**Solutions**:

- Close Flashpoint Launcher
- Wait for operations to complete
- Use shorter transactions

### File Not Found

**Symptom**: `Flashpoint database not found at: <path>`

**Solutions**:

- Verify path in .env
- Check Flashpoint installation
- Verify file permissions

### Hot-Reload Failure

**Symptom**: Database changes not reflected

**Solutions**:

- Check logs for watcher start message
- Wait 500ms+ after change
- Manually call `reload()`

## Integration

### GameService

Uses DatabaseService for all game queries.

### PlayTrackingService

Updates play statistics in Flashpoint database.

## Best Practices

1. Always use parameterized queries to prevent SQL injection
2. Keep queries focused - select only needed columns
3. Use LIMIT for potentially large result sets
4. Check connection before critical operations
5. Handle errors gracefully - database might reload during query
6. Monitor file changes in logs

## Related Documentation

- [UserDatabaseService](./user-database-service.md) - User database connection
- [GameService](./game-service.md) - Game query service
