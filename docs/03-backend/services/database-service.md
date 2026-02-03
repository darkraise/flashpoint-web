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
- **Read/Write access**: Allows play statistics updates
- **Synchronous API**: Uses better-sqlite3 for better performance than async
  wrappers

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

### `get(sql: string, params: any[]): any | null`

Execute a query and return the first result row.

```typescript
const game = DatabaseService.get('SELECT * FROM game WHERE id = ?', [gameId]);
```

**Returns**: First result row or null if no results

---

### `all(sql: string, params: any[]): any[]`

Execute a query and return all result rows.

```typescript
const games = DatabaseService.all(
  'SELECT * FROM game WHERE platformName = ? LIMIT ?',
  ['Flash', 100]
);
```

**Returns**: Array of result rows (empty array if no results)

---

### `run(sql: string, params: any[]): void`

Execute an INSERT, UPDATE, or DELETE query.

```typescript
DatabaseService.run(
  'UPDATE game SET playtime = ?, playCounter = ? WHERE id = ?',
  [3600, 5, gameId]
);
```

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
