# Database Update Error After Game Download - FIXED

## Issue

After downloading a game, the backend would log the following error:

```
2026-01-13 14:03:21 [error]: Database run error:
2026-01-13 14:03:21 [error]: Failed to update database
```

The game would download successfully, but the database would not be updated to reflect that the game is now available on disk.

## Root Cause

**File**: `backend/src/services/DatabaseService.ts` (line 107)

When the database file watcher detected changes to the SQLite file (which happens frequently as the Flashpoint Launcher or other processes modify the database), it would trigger a database reload. During this reload, the database was being reopened in **readonly mode**:

```typescript
// BUG: Database reopened as readonly after file change
this.db = new BetterSqlite3(config.flashpointDbPath, {
  readonly: true,  // ← THIS WAS THE BUG!
  fileMustExist: true,
});
```

### Why This Caused the Error

1. User downloads a game
2. File watcher detects change to `flashpoint.sqlite`
3. Database is reloaded in **readonly mode**
4. Game download completes
5. Backend tries to UPDATE the database to mark game as downloaded
6. **UPDATE fails** because database is readonly
7. Error logged: "Database run error"

### Timeline Example

```
14:03:15 - Game download starts
14:03:18 - File watcher detects database change (from another process)
14:03:18 - Database reloaded in READONLY mode
14:03:21 - Game download completes
14:03:21 - Attempt to UPDATE game_data table
14:03:21 - ERROR: Cannot write to readonly database
```

## The Fix

### Change 1: Remove readonly flag from reload

**File**: `backend/src/services/DatabaseService.ts` (lines 105-109)

```typescript
// BEFORE (BUG):
this.db = new BetterSqlite3(config.flashpointDbPath, {
  readonly: true,  // ← Caused write failures
  fileMustExist: true,
});

// AFTER (FIXED):
// Note: Not using readonly mode to allow write operations (e.g., game downloads)
this.db = new BetterSqlite3(config.flashpointDbPath, {
  fileMustExist: true,  // ← Removed readonly flag
});
```

### Change 2: Add better debug logging

**File**: `backend/src/services/GameDatabaseUpdater.ts`

Added detailed logging before and after database UPDATE operations to help debug future issues:

```typescript
logger.debug('Executing UPDATE on game_data', {
  sql: updateGameDataSql,
  params: [relativePath, gameDataId]
});

DatabaseService.run(updateGameDataSql, [relativePath, gameDataId]);

logger.debug('game_data UPDATE successful');
```

This helps identify exactly when and where database operations fail.

## Why Was It Readonly?

The initial database open (during startup) was correctly **NOT readonly**:

```typescript
// Correct initial open (line 22)
this.db = new BetterSqlite3(config.flashpointDbPath, {
  fileMustExist: true,  // No readonly flag
});
```

However, when the database was reloaded after detecting file changes, it was incorrectly set to readonly. This was likely a copy-paste error or a mistaken assumption that reloads should be readonly.

## Testing the Fix

After this fix, the following flow now works correctly:

1. ✅ Game downloads successfully
2. ✅ Database is updated with `presentOnDisk = 1`
3. ✅ Game path is stored in database
4. ✅ Frontend shows game as available
5. ✅ Game can be played immediately after download

## Database Concurrency

SQLite handles concurrent access through file locking. Multiple processes can read simultaneously, but writes are serialized. The `better-sqlite3` library handles this automatically.

**File watcher behavior**:
- When Flashpoint Launcher modifies the database, the file watcher detects it
- Database is reloaded to pick up external changes
- Now correctly opened with write permissions

## Related Files Modified

1. `backend/src/services/DatabaseService.ts`
   - Line 107: Removed `readonly: true` from reload
   - Added comment explaining write permissions requirement

2. `backend/src/services/GameDatabaseUpdater.ts`
   - Lines 64-71: Added debug logging for game_data UPDATE
   - Lines 89-105: Added debug logging for game table UPDATE
   - Better visibility into database operations

## Prevention

To prevent similar issues in the future:

1. ✅ Always use the same database open options for initial open and reload
2. ✅ Add debug logging for all database write operations
3. ✅ Test database operations after file watcher triggers a reload
4. ✅ Document why database is opened with write permissions

## Impact

**Before Fix**:
- ❌ Games would download but appear as "not available"
- ❌ Users had to restart the backend to see downloaded games
- ❌ Database would not sync properly with file system

**After Fix**:
- ✅ Games immediately show as available after download
- ✅ Database stays in sync with downloaded files
- ✅ No restart required
- ✅ Better error logging for debugging

## Notes

The database must remain writable because:
1. Game downloads update `game_data.presentOnDisk`
2. Game downloads update `game_data.path`
3. Game downloads update `game.activeDataOnDisk`
4. Future features may require additional write operations

SQLite is designed to handle concurrent reads and writes safely, so having the database open with write permissions is the correct approach.
