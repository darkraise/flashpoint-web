# Common Pitfalls

Known issues and solutions for Flashpoint Web development.

## Environment Setup Issues

### Flashpoint Path Not Found

**Symptom:**

```
Error: ENOENT: no such file or directory, open 'D:/Flashpoint/Data/flashpoint.sqlite'
```

**Solution:**

```bash
# Verify installation exists
ls D:/Flashpoint/Data/flashpoint.sqlite    # Linux/Mac
dir D:\Flashpoint\Data\flashpoint.sqlite   # Windows

# Create .env from example
cd backend && cp .env.example .env

# Edit .env with correct path
FLASHPOINT_PATH=D:/Flashpoint              # Windows forward slashes
JWT_SECRET=your-secure-secret

# Verify
ls $FLASHPOINT_PATH/Data/flashpoint.sqlite
```

---

### Node Version Mismatch

**Symptom:**

```
Error: The engine "node" is incompatible with this module
Expected version ">=20.0.0". Got "18.12.0"
```

**Solution:**

```bash
node --version  # Check current version

# Install Node 20+ with nvm
nvm install 20
nvm use 20

# Or download from nodejs.org
```

---

### Dependencies Won't Install

**Symptom:**

```
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solution:**

```bash
npm cache clean --force
npm run clean                    # Remove all node_modules
npm run install:all
npm run install:all -- --legacy-peer-deps  # If still fails
```

---

## Database Issues

### Database Locked Error

**Symptom:**

```
SqliteError: database is locked
```

**Solution:**

```bash
# Close Flashpoint Launcher (it locks flashpoint.sqlite)
# Check for open processes
lsof backend/user.db            # Linux/Mac
# Use Process Explorer on Windows

# Kill processes
kill -9 <PID>

# If persistent, restart development server
npm run dev
```

**Prevention:**

```typescript
class DatabaseService {
  private static instance: DatabaseService;
  private db: Database;

  private constructor() {
    this.db = new Database('user.db');
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public close(): void {
    this.db.close();
  }
}
```

---

### Migration Fails

**Symptom:**

```
Error: Migration failed: table users already exists
```

**Solution:**

```bash
# Check current schema
sqlite3 backend/user.db ".schema"

# Development: Delete and recreate
rm backend/user.db
npm run dev  # Migrations run automatically

# Production: Rollback manually
sqlite3 backend/user.db "DROP TABLE IF EXISTS users;"
npm run dev
```

---

### Read-Only Database Error

**Symptom:**

```
Error: attempt to write a readonly database
```

**Causes:**

- Writing to flashpoint.sqlite (read-only, managed by Flashpoint Launcher)
- Incorrect permissions on user.db

**Solution:**

```bash
# NEVER write to flashpoint.sqlite

# Check permissions
ls -l backend/user.db

# Fix if needed
chmod 644 backend/user.db

# In code: Use correct database
const userDb = UserDatabaseService.getInstance();
userDb.createUser(...);  # ✓ Correct
```

---

## Port Conflicts

### Port Already in Use

**Symptom:**

```
Error: listen EADDRINUSE: address already in use :::3100
```

**Solution:**

```bash
# Find process using port
lsof -i :3100              # Linux/Mac
netstat -ano | findstr 3100 # Windows

# Kill process
kill -9 <PID>              # Linux/Mac
taskkill /PID <PID> /F     # Windows

# Or use backend utility
cd backend && npm run kill-port

# Change port in .env if needed
PORT=3002
```

---

## Authentication Issues

### JWT Token Expired

**Symptom:**

```
401 Unauthorized: Token expired
```

**Solution:**

```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;

      try {
        // Refresh token sent automatically via HTTP-only cookie
        const { data } = await api.post('/api/auth/refresh', {});
        // Store new access token in memory (Zustand store)
        useAuthStore.getState().updateAccessToken(data.accessToken);
        error.config.headers['Authorization'] = `Bearer ${data.accessToken}`;
        return api(error.config);
      } catch {
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

---

### CORS Errors

**Symptom:**

```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:**

```typescript
// Backend
import cors from 'cors';

app.use(cors({
  origin: process.env.DOMAIN || 'http://localhost:5173',
  credentials: true,
  exposedHeaders: ['X-Total-Count'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Frontend - use authenticated api instance
import { api } from '@/lib/api';
const { data } = await api.get('/api/games');  # ✓ Has auth headers
```

---

## Game Loading Issues

### Game Files Not Loading

**Symptom:**

- Blank game screen or 404 errors

**Solution:**

```bash
# Verify backend is running
curl http://localhost:3100/api/health

# Check logs
npm run dev:backend

# Verify Flashpoint paths
ls $FLASHPOINT_PATH/Legacy/htdocs
ls $FLASHPOINT_PATH/Data/Games/

# Test game proxy access
curl http://localhost:3100/game-proxy/file.swf
```

### Game Download Polling Issues

**Symptom:**

- Download status doesn't update, stuck showing "Downloading..."
- Download completes but UI doesn't reflect it

**Root Causes:**

1. **Polling not activated:** TanStack Query's `refetchInterval` only works if condition is checked properly
2. **Wrong response checking:** Backend returns `downloading: false` but frontend still polls
3. **Query cache not updated:** Old cached value persists after download

**Solution:**

```typescript
// CORRECT: Conditional polling based on data state
const { data: launchData } = useQuery({
  queryKey: ['game', id, 'launch'],
  queryFn: () => gamesApi.getGameLaunchData(id),
  refetchInterval: (query) => {
    // Poll every 2 seconds if downloading
    return query.state.data?.downloading ? 2000 : false;
  },
});

// WRONG: Static polling
const { data: launchData } = useQuery({
  queryKey: ['game', id, 'launch'],
  queryFn: () => gamesApi.getGameLaunchData(id),
  refetchInterval: 2000, // ❌ Polls forever!
});

// WRONG: Not checking response
if (launchData?.downloading) {
  // Show downloading UI
} else if (launchData) {
  // Show player - but might have cached old response
}
```

**Prevention:**

- Always check `query.state.data?.downloading` in refetchInterval callback
- Use query cache properly - don't manually track state
- Test by monitoring network tab for polling requests
- Verify responses show `downloading: false` when complete

---

### Ruffle Not Loading

**Symptom:**

```
Error: Ruffle is not defined
```

**Solution:**

```bash
# Verify files exist
ls frontend/public/ruffle/

# Copy if missing
cd frontend && npm run copy-ruffle

# Verify version
cat package.json | grep ruffle

# Update if needed
npm install @ruffle-rs/ruffle@latest
npm run copy-ruffle

# Clear browser cache (Ctrl+Shift+Delete)
```

---

## Game Service Resource Management Issues

### Fire-and-Forget Mount Pattern

**Symptom:**

- Race conditions when game starts before ZIP is mounted
- Requests fail with "ZIP not mounted" errors
- Intermittent game loading failures

**Root Cause:**

Backend calls `mountGameZip()` but doesn't await it:

```typescript
// WRONG: Fire-and-forget
this.gameZipServer.mountGameZip(gameId, zipPath, dateAdded, sha256);

// Returns immediately, but mount hasn't completed yet!
return { mounted: true };
```

**Solution:**

Always await the mount operation:

```typescript
// CORRECT: Wait for mount to complete
const result = await this.gameZipServer.mountGameZip(
  gameId,
  zipPath,
  dateAdded,
  sha256
);

if (!result.success) {
  throw new Error(`Failed to mount ZIP: ${result.error}`);
}

return { mounted: true };
```

**Prevention:**

- Review all mount operations - ensure they're awaited
- Test game launch immediately after mount (no delays)
- Check server logs for "mount timeout" errors

---

### `node-stream-zip` Memory Usage with Large Files

**Symptom:**

- High memory consumption when accessing large files in ZIPs
- Application crashes with "out of memory" errors
- Slow performance when extracting file data

**Root Cause:**

`entryData()` reads entire file into memory Buffer:

```typescript
// WRONG: Reads entire file into memory
const data = zip.entryData(filename);
// If file is 500MB, consumes 500MB+ RAM!
```

**Solution:**

Check file size before reading and stream large files:

```typescript
// CORRECT: Check size first
const entry = zip.entries()[filename];

if (!entry) {
  throw new Error(`File not found: ${filename}`);
}

const MAX_BUFFER_SIZE = 100 * 1024 * 1024; // 100MB limit

if (entry.size > MAX_BUFFER_SIZE) {
  // Stream large files instead
  return zip.createReadStream(filename);
} else {
  // Safe to buffer small files
  return zip.entryData(filename);
}
```

**Prevention:**

- Document file size limits for ZIP access
- Monitor memory usage in production
- Set reasonable buffer limits per deployment environment
- Test with various ZIP sizes

---

### LRU Cache File Handle Accumulation

**Symptom:**

- "Too many open files" errors after many game loads
- File descriptor exhaustion
- System runs out of available file handles

**Root Cause:**

LRU cache's `dispose` callback is async but eviction is sync:

```typescript
// WRONG: Async cleanup on sync eviction
this.cache.set(cacheKey, zipManager, {
  dispose: async (zipManager) => {
    // This is async...
    await zipManager.close(); // ...but eviction won't wait!
  }
});

// zipManager.close() fires but doesn't complete
// File handle stays open
// Multiple instances accumulate
```

**Solution:**

Use synchronous cleanup or properly track promises:

```typescript
// CORRECT: Synchronous cleanup
const closePromises = new Map();

this.cache.set(cacheKey, zipManager, {
  dispose: (zipManager) => {
    // Close synchronously if possible
    if (zipManager.close) {
      zipManager.close(); // Synchronous close
    }
  }
});

// OR: Track async closures separately
async handleCacheEviction() {
  const pendingClosures = Array.from(closePromises.values());
  await Promise.all(pendingClosures);
}
```

**Prevention:**

- Implement synchronous close methods where possible
- Monitor file descriptor count: `lsof -p <PID> | wc -l`
- Set appropriate cache size limits
- Manually evict unused entries during maintenance
- Add metrics for open file handles

---

## Frontend Build Issues

### Build Fails with Type Errors

**Symptom:**

```
ERROR: Type error: Property 'xyz' does not exist on type 'ABC'
```

**Solution:**

```bash
cd frontend

# Type check first
npm run typecheck

# Fix errors in reported files

# Restart TypeScript server in VS Code
# Ctrl+Shift+P > "Restart TypeScript Server"
```

---

### Vite HMR Not Working

**Symptom:**

- Changes not reflecting in browser, manual refresh needed

**Solution:**

```bash
# Verify dev server running
curl http://localhost:5173

# Check browser console for HMR errors

# Clear Vite cache
rm -rf frontend/node_modules/.vite

# Restart dev server
cd frontend && npm run dev

# On Linux, increase file watcher limits
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

### Tailwind Styles Not Applied

**Symptom:**

- Tailwind classes not working

**Solution:**

```bash
# Verify tailwind.config.js includes all source files
# content should match './src/**/*.{js,ts,jsx,tsx}'

# Ensure Tailwind directives in src/index.css
@tailwind base;
@tailwind components;
@tailwind utilities;

# Import CSS in main.tsx
import './index.css';

# Clear build cache and rebuild
rm -rf frontend/dist frontend/node_modules/.vite
npm run dev
```

---

## Performance Issues

### Multiple COUNT Queries Instead of Scalar Subqueries

**Symptom:**

- Slow paginated responses with separate COUNT queries
- Multiple roundtrips to database for pagination results
- Example: `/api/users?page=1` makes 2 queries (SELECT + COUNT)

**Root Cause:**

Separate queries for data and total count:

```typescript
// WRONG: 2 queries (inefficient)
const users = db.all('SELECT * FROM users LIMIT 50 OFFSET 0');
const total = db.get('SELECT COUNT(*) as total FROM users');
return { users, total: total.total };
```

**CORRECT - Merge with window function or scalar subquery:**

```typescript
// CORRECT: 1 query with window function
const result = db.all(
  `SELECT u.*,
          COUNT(*) OVER() as total_count
   FROM users u
   ORDER BY u.created_at DESC
   LIMIT ? OFFSET ?`,
  [limit, offset]
);

const total = result.length > 0 ? result[0].total_count : 0;
const users = result.map(u => { delete u.total_count; return u; });

// OR: Scalar subquery
const result = db.all(
  `SELECT u.*,
          (SELECT COUNT(*) FROM users) as total_count
   FROM users u
   ORDER BY u.created_at DESC
   LIMIT ? OFFSET ?`,
  [limit, offset]
);
```

**Prevention:**

- Always fetch count in the same query as data
- Use window functions (`COUNT(*) OVER()`) for paginated queries
- Use scalar subqueries for single column aggregates
- Profile queries: `EXPLAIN QUERY PLAN` should show one main scan, not two

---

### O(N²) Data Merging with .find() in Loops

**Symptom:**

- Slow API responses when returning joined data (favorites with game details, playlists with games)
- Response time degrades proportionally with O(N²)
- Example: Getting 100 favorites with 1000 total games is 100,000 comparisons

**Root Cause:**

Using `.find()` loop to match related data:

```typescript
// WRONG: O(N²) complexity
const favoriteGames = favorites.map(fav => {
  const game = games.find(g => g.id === fav.gameId); // Searches through entire games array
  return { ...fav, game };
});
```

**CORRECT - Use Map for O(1) lookups:**

```typescript
// CORRECT: O(N) with Map
const gamesMap = new Map(games.map(g => [g.id, g])); // Build index once

const favoriteGames = favorites.map(fav => {
  const game = gamesMap.get(fav.gameId); // O(1) lookup
  return { ...fav, game };
});
```

**Prevention:**

- Build a `Map` when merging data from two lists
- Never use `.find()` inside loops over potentially large datasets
- Profile response times: should be linear O(N+M), not quadratic O(N*M)

---

### Directory Scans Instead of Direct File Access

**Symptom:**

- File operations are slow (playlists, user data files)
- Speed degrades as file count increases
- All filesystem lookups take O(N) time

**Root Cause:**

Always scanning the directory instead of trying direct path first:

```typescript
// WRONG: Always scans directory
async getPlaylist(id: string) {
  const files = await fs.readdir(playlistsPath);
  for (const file of files) {
    const content = await fs.readFile(path.join(playlistsPath, file));
    const playlist = JSON.parse(content);
    if (playlist.id === id) return playlist;
  }
}
```

**CORRECT - Try direct path first:**

```typescript
// CORRECT: O(1) fast path, O(N) fallback
async getPlaylist(id: string) {
  // Try direct path first (most common case)
  try {
    const content = await fs.readFile(
      path.join(playlistsPath, `${id}.json`)
    );
    return JSON.parse(content);
  } catch (e) {
    // Fallback: scan only if direct access fails
    const files = await fs.readdir(playlistsPath);
    for (const file of files) {
      if (file === `${id}.json`) continue; // Already tried
      const content = await fs.readFile(path.join(playlistsPath, file));
      const playlist = JSON.parse(content);
      if (playlist.id === id) return playlist;
    }
  }
  return null;
}
```

**Prevention:**

- For file-based data, assume filename matches ID
- Try direct file access before falling back to directory scan
- Use extracted helper methods (e.g., `findPlaylistFile()`) to avoid code duplication
- Use `Promise.allSettled()` for parallel file reads instead of sequential loops

---

### Slow Database Queries

**Symptom:**

- API responses taking >1s

**Solution:**

```sql
-- Add indexes
CREATE INDEX idx_game_platform ON game(platform);
CREATE INDEX idx_game_library ON game(library);

-- Analyze query performance
EXPLAIN QUERY PLAN SELECT * FROM game WHERE platform = 'Flash';

-- Prefer prefix search (uses index)
SELECT * FROM game WHERE title LIKE 'mario%';  # Better
SELECT * FROM game WHERE title LIKE '%mario%'; # Full scan
```

---

### Frontend Memory Leaks

**Symptom:**

- High memory usage, slow interactions

**Solutions:**

```tsx
// 1. Virtualize long lists
import { useVirtualizer } from '@tanstack/react-virtual';

// 2. Memoize expensive components
export const GameCard = memo(({ game }: GameCardProps) => <div>...</div>);

// 3. Use pagination instead of infinite scroll
const { data, fetchNextPage } = useInfiniteQuery({ ... });

// 4. Lazy load images
<img src={game.thumbnail} loading="lazy" alt={game.title} />

// 5. Code splitting
const GamePlayer = lazy(() => import('./GamePlayer'));
<Suspense fallback={<Loading />}><GamePlayer /></Suspense>
```

---

## Code Quality Issues

### Duplicate Utility Functions

**Symptom:**

Confusion about which utility to import. Inconsistent behavior across codebase.

**Root Cause:**

Similar utility functions exist in multiple files:

```typescript
// WRONG: Same logic in multiple files
// frontend/src/lib/utils/errorUtils.ts
export function getErrorMessage(error: unknown): string { ... }

// frontend/src/lib/api/api-error.ts
export function getErrorMessage(error: unknown): string { ... }

// Which one should components import?
```

**CORRECT - Single source of truth:**

```typescript
// CORRECT: One centralized utility
// frontend/src/lib/utils/errorUtils.ts
export function getErrorMessage(error: unknown): string { ... }

// frontend/src/lib/api/api-error.ts
import { getErrorMessage } from '../utils/errorUtils';
export { getErrorMessage }; // Re-export if needed for compatibility
```

**Prevention:**

- Search for duplicate function names before creating new utilities
- Consolidate similar functions into a single module
- Document which utilities are canonical in team conventions
- Use linters to detect duplicate code

---

### parseInt without NaN Validation

**Symptom:**

API returns 404 for numeric IDs instead of 400 Bad Request. Logs show NaN passed
to queries.

**Root Cause:**

`parseInt()` returns `NaN` for non-numeric strings, which silently passes to SQL
queries and matches no rows:

```typescript
// WRONG: No NaN check
const id = parseInt(req.params.id, 10);
const user = UserDatabaseService.get('SELECT * FROM users WHERE id = ?', [id]);
// If req.params.id is 'abc', id is NaN
// Query runs: WHERE id = NaN (matches nothing)
// User gets 404 instead of 400
```

**CORRECT - Always check isNaN():**

```typescript
// CORRECT: Validate after parsing
const id = parseInt(req.params.id, 10);
if (isNaN(id)) {
  return res.status(400).json({ error: 'Invalid ID' });
}
const user = UserDatabaseService.get('SELECT * FROM users WHERE id = ?', [id]);
```

**Why this matters:**

- NaN passes silently to SQL, creating misleading 404 responses
- Makes debugging harder - looks like data doesn't exist
- Security issue: No validation feedback helps attackers probe
- Client sees confusing "not found" instead of "invalid format"

**Prevention:**

- Always check `isNaN()` after `parseInt()`
- Unit test with non-numeric IDs
- Review logs for NaN values in queries

---

### Unbounded Query Limits

**Symptom:**

Memory spikes and database slowdowns. Clients request `limit=999999` and dump
entire tables.

**Root Cause:**

Query limits not capped:

```typescript
// WRONG: No limit cap
const limit = req.query.limit ? parseInt(req.query.limit) : 10;
const games = GameService.getGames(limit);
// Client requests: /api/games?limit=999999
// Server executes: SELECT * FROM game LIMIT 999999
// Returns entire database contents
```

**CORRECT - Cap query limits:**

```typescript
// CORRECT: Cap limit with Math.min
const limit = Math.min(
  req.query.limit ? parseInt(req.query.limit) : 10,
  100 // Maximum 100 results
);
const games = GameService.getGames(limit);
```

**Recommended Caps**:

- Games/favorites/users: 100 per request
- Playlists: 50 per request
- Logs: 50 per request

**Prevention:**

- Add `Math.min()` for all user-provided limits
- Document API limit in OpenAPI/Swagger specs
- Monitor slow queries in production logs
- Test with extreme values: `?limit=999999`

---

### Server-Sent Events (SSE) Error Handling

**Symptom:**

Backend crashes when errors occur during SSE streaming. Error: "Cannot set
headers after they are sent to the client."

**Root Cause:**

Once SSE headers are sent, `response.status().json()` fails because headers are
already in the response:

```typescript
// WRONG: Tries to set status after headers sent
const sendGameStream = (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream' }); // Headers sent
  res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    // Some operation
  } catch (error) {
    res.status(500).json({ error: 'Server error' }); // ❌ Crashes!
  }
};
```

**CORRECT - Check headersSent before responding:**

```typescript
// CORRECT: Check if headers already sent
const sendGameStream = (req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/event-stream' });
  res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    // Some operation
  } catch (error) {
    if (res.headersSent) {
      // Headers already sent, use SSE format for error
      res.write(`data: {"error": "Server error"}\n\n`);
      res.end();
    } else {
      // Headers not sent, use normal JSON response
      res.status(500).json({ error: 'Server error' });
    }
  }
};
```

**Prevention:**

- Always check `res.headersSent` before calling `res.status()`
- Wrap error handling around entire response lifecycle
- Use appropriate error format for SSE (events, not JSON)
- Test error paths during development

---

### PerformanceMetrics Path Normalization

**Symptom:**

Metrics memory grows unbounded. `/api/games/:id` with different UUIDs creates
separate entries for each unique game.

**Root Cause:**

Parametric routes create unbounded map entries if paths aren't normalized:

```typescript
// WRONG: Records raw request paths
GET /api/games/550e8400-e29b-41d4-a716-446655440000 // Separate entry
GET /api/games/6ba7b810-9dad-11d1-80b4-00c04fd430c8 // Separate entry
GET /api/games/6ba7b811-9dad-11d1-80b4-00c04fd430c8 // Separate entry
// After 10k unique games, metrics map has 10k entries!
```

**CORRECT - Normalize paths before recording:**

```typescript
// CORRECT: Replace UUIDs/numbers with :id placeholder
const normalizePath = (path: string): string => {
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id') // UUID
    .replace(/\/\d+/g, '/:id'); // Numeric ID
};

// Usage in metrics middleware
const normalizedPath = normalizePath(req.path);
recordMetric(normalizedPath, duration);
```

**Prevention:**

- Always normalize parametric segments before recording metrics
- Monitor metrics map size: `metrics.size` should equal number of unique routes
- Set `maxMapSize` with warnings if exceeded
- Use middleware to normalize paths consistently

---

### Cache Clearing Logic with Overlapping Conditions

**Symptom:**

Clearing one specific cache type also clears other caches unexpectedly.

**Root Cause:**

Overlapping `if` blocks instead of mutually exclusive branching:

```typescript
// WRONG: Overlapping if blocks
if (!cacheType || cacheType === 'gameSearch') { clearGameSearch(); }
if (!cacheType || cacheType === 'permissions') { clearPermissions(); }
// When cacheType is 'gameSearch', the first block runs but so does... nothing else.
// But when cacheType is undefined, BOTH blocks run (double clear).
// And unknown types silently do nothing.
```

**CORRECT - Use switch for mutual exclusivity:**

```typescript
switch (cacheType) {
  case 'gameSearch':
    clearGameSearch();
    break;
  case 'permissions':
    clearPermissions();
    break;
  case 'all':
  default:
    clearGameSearch();
    clearPermissions();
    break;
}
```

**Prevention:**

Use `switch` or `if/else if` chains for mutually exclusive options. Validate inputs with Zod enum schemas.

---

### Fire-and-Forget Async Operations Without Error Handling

**Symptom:**

Unhandled promise rejection warnings in logs. Background operations fail silently.

**Root Cause:**

Calling async functions without `await` or `.catch()`:

```typescript
// WRONG: No error handling
this.downloadInBackground(id, zipPath);  // Promise returned but discarded

// WRONG: IIFE without catch
(async () => {
  await fs.writeFile(cachePath, data);
})();
```

**CORRECT - Always handle the promise:**

```typescript
// Option 1: .catch() on the call
this.downloadInBackground(id, zipPath)
  .catch(err => logger.error('Background download failed:', err));

// Option 2: .catch() on IIFE
(async () => {
  await fs.writeFile(cachePath, data);
})().catch(err => logger.warn('Cache write failed:', err));
```

**Prevention:**

Always add `.catch()` to fire-and-forget promises. Linters can flag floating promises.

---

### Exporting Internal Constants

**Symptom:**

Confusion about which exports are part of the public API. Accidental coupling between modules.

**Root Cause:**

Exporting constants that are only used within the module:

```typescript
// WRONG: Unnecessary export
export const CUSTOM_MIME_TYPES = { ... }; // Only used in this file

export function getMimeType(filename: string): string {
  // Uses CUSTOM_MIME_TYPES internally
}
```

**CORRECT - Keep internals private:**

```typescript
// CORRECT: Don't export internal constants
const CUSTOM_MIME_TYPES = { ... }; // Private to this module

export function getMimeType(filename: string): string {
  // Uses CUSTOM_MIME_TYPES internally
}
```

**Why this matters:**

- Reduces public API surface
- Makes it clear what's part of the module contract
- Prevents other code from depending on implementation details
- Makes refactoring easier (no external dependencies on internal constants)

**Prevention:**

- Only export what's needed by other modules
- Review exports before committing
- Use linters to detect unused exports
- Document public API explicitly

---

### setInterval Blocking Graceful Shutdown

**Symptom:**

Process doesn't exit after SIGTERM. Node.js event loop stays alive.

**Root Cause:**

`setInterval` keeps the event loop alive by default:

```typescript
// WRONG: Interval keeps process alive
this.cleanupInterval = setInterval(() => {
  this.cleanup();
}, 60000);
// Even after http.close(), this timer prevents process.exit()
```

**CORRECT - Use .unref() on cleanup intervals:**

```typescript
this.cleanupInterval = setInterval(() => {
  this.cleanup();
}, 60000);
this.cleanupInterval.unref(); // Won't keep process alive
```

**Prevention:**

Call `.unref()` on all non-critical intervals (cleanup jobs, background tasks). Only keep critical intervals ref'd.

---

### Hostname Includes Port Number

**Symptom:**

Hostname validation fails. External lookups don't match expected patterns.

**Root Cause:**

`req.headers.host` includes the port (e.g., `localhost:3100`):

```typescript
// WRONG: Port included in hostname
const hostname = req.headers.host || 'localhost';
// hostname = 'localhost:3100' — validation regex rejects colons
```

**CORRECT - Strip port before using hostname:**

```typescript
const hostname = (req.headers.host || 'localhost').split(':')[0];
// hostname = 'localhost' — clean hostname without port
```

**Prevention:**

Always strip port from `req.headers.host` before hostname validation or filesystem lookups.

---

### Redundant Hostname Subdomain Variations

**Symptom:**

File system lookups try nonsensical hostnames like `www.www.example.com` or `cdn.cdn.example.com`.

**Root Cause:**

Generating subdomain variations without checking if hostname already has that prefix:

```typescript
// WRONG: Always prepends subdomains
for (const sub of ['www', 'cdn', 'core']) {
  variations.push(`${sub}.${hostname}`);
}
// If hostname is 'www.example.com', generates 'www.www.example.com'
```

**CORRECT - Skip existing prefixes:**

```typescript
for (const sub of ['www', 'cdn', 'core']) {
  if (!hostname.startsWith(`${sub}.`)) {
    variations.push(`${sub}.${hostname}`);
  }
}
```

**Prevention:**

Check for existing prefixes before adding subdomain variations.

---

### Flash Games Must Have .swf Launch Commands to Appear in Browse

**Symptom:**

Flash games exist in the database but don't appear in search results or browse
pages. Platform filters show zero Flash games.

**Root Cause:**

The backend filters Flash games whose `launchCommand` doesn't end in `.swf`. This
excludes Flash games with HTML wrapper pages or missing launch commands from
appearing in browse/search results.

**CORRECT - Flash games with .swf launchCommands:**

```typescript
// These appear in browse/search results
launchCommand: "http://uploads.ungrounded.net/396000/396724_DAplayer_V6.swf"
launchCommand: "Games/Flash/game.swf"
```

**WRONG - Flash games without .swf launchCommands:**

```typescript
// These are FILTERED OUT and won't appear in results
launchCommand: "Game.html" // HTML wrapper
launchCommand: "wrapper.php" // PHP wrapper
launchCommand: "https://example.com/play" // Web wrapper
```

**Prevention:**

- Check `launchCommand` ends with `.swf` for browseable Flash games
- Use detail view (`GET /api/games/:id`) for full game information
- Note: Other platforms (HTML5, Windows) are not affected by this filter

---

### Route Ordering Matters in Express

**Symptom:**

Static routes like `/api/games/random` return wrong results or 404 errors.

**Root Cause:**

Route registration order matters in Express. Parameterized routes like `/:id`
match anything and will shadow (hide) more specific static routes if registered
first.

**WRONG - Parameterized route registered first:**

```typescript
// WRONG: This route matches EVERYTHING
app.get('/api/games/:id', (req, res) => {
  // /api/games/random will match here with id='random'
  // Then database query for game.id='random' returns nothing
});

// This static route is shadowed
app.get('/api/games/random', (req, res) => {
  // This is NEVER reached!
});
```

**CORRECT - Static route registered first:**

```typescript
// CORRECT: Specific route first
app.get('/api/games/random', (req, res) => {
  // /api/games/random matches here
  // This is reached!
});

// Parameterized route after
app.get('/api/games/:id', (req, res) => {
  // Only matches if path doesn't match static routes
  // /api/games/uuid-123 matches here
});
```

**Prevention:**

- Always register static/specific routes BEFORE parameterized routes
- Test special routes explicitly:
  `curl http://localhost:3100/api/games/random`
- Review route registration order when adding new endpoints

---

### Use Nullish Coalescing (`??`) Instead of OR (`||`) for Config Defaults

**Symptom:**

Settings like `homeRecentHours = 0` or `maintenanceMode = false` fall through
to defaults when they shouldn't.

**Root Cause:**

The `||` operator treats `0`, `""`, and `false` as falsy and uses the default
even when explicitly set:

```typescript
// WRONG: Using ||
const homeRecentHours = settingsValue || 24; // If settingsValue is 0:
// Result: 24 (wrong! 0 was explicitly set)

const maintenanceMode = settingsValue || false; // If settingsValue is false:
// Result: false (happens to work, but for wrong reason)
```

**CORRECT - Using nullish coalescing (`??`):**

```typescript
// CORRECT: Using ??
const homeRecentHours = settingsValue ?? 24; // If settingsValue is 0:
// Result: 0 (correct! Only uses default if null or undefined)

const maintenanceMode = settingsValue ?? false; // If settingsValue is false:
// Result: false (correct! Only uses default if null or undefined)
```

**Key difference:**

- `||` checks truthiness: `0`, `""`, `false`, `null`, `undefined` all trigger
  default
- `??` checks nullishness: Only `null` and `undefined` trigger default

**Prevention:**

- Always use `??` for config/settings defaults
- Use `||` only when you actually want to treat falsy values as missing

---

### Array `.sort()` Mutates in Place

**Symptom:**

Building cache keys from arrays returns inconsistent results. Cache misses
increase after sorting.

**Root Cause:**

JavaScript's `.sort()` mutates the original array:

```typescript
// WRONG: Mutates the caller's array
function getCacheKey(tags: string[]): string {
  const sorted = tags.sort(); // This MUTATES tags!
  return sorted.join(':');
}

const myTags = ['z', 'a', 'b'];
const key1 = getCacheKey(myTags); // myTags is now ['a', 'b', 'z']
const key2 = getCacheKey(myTags); // myTags is still ['a', 'b', 'z']
// Cache might miss if code relies on original order
```

**CORRECT - Spread operator creates copy:**

```typescript
// CORRECT: Creates copy before sorting
function getCacheKey(tags: string[]): string {
  const sorted = [...tags].sort(); // Sorts the COPY
  return sorted.join(':');
}

const myTags = ['z', 'a', 'b'];
const key1 = getCacheKey(myTags); // myTags is still ['z', 'a', 'b']
const key2 = getCacheKey(myTags); // myTags is still ['z', 'a', 'b']
// Consistent cache key regardless of mutations
```

**Prevention:**

- Always use `[...array].sort()` or `Array.from(array).sort()`
- If mutation is intentional, explicitly assign: `array = array.sort()`
- Use linters that warn about accidental mutations

---

### Token Refresh Subscriber Queue Cleanup

**Symptom:**

Memory leaks in token refresh mechanism. Promise queues grow unbounded over
time.

**Root Cause:**

When implementing a token refresh queue, subscribers waiting for the refresh
might not be properly cleaned up on failure:

```typescript
// WRONG: Queued promises never rejected on failure
private refreshPromise: Promise<TokenResponse> | null = null;
private refreshSubscribers: ((token: string) => void)[] = [];

async refreshToken(): Promise<TokenResponse> {
  if (!this.refreshPromise) {
    this.refreshPromise = this.performRefresh();
  }

  return new Promise((resolve, reject) => {
    this.refreshSubscribers.push((token) => {
      resolve({ accessToken: token });
    });
  });
  // If refreshPromise rejects, subscribers are never notified
  // They wait forever in memory!
}
```

**CORRECT - Clean up on failure:**

```typescript
// CORRECT: Reject subscribers on refresh failure
private refreshPromise: Promise<TokenResponse> | null = null;
private refreshSubscribers: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

async refreshToken(): Promise<TokenResponse> {
  if (!this.refreshPromise) {
    this.refreshPromise = this.performRefresh().then(
      (token) => {
        // Success: resolve all subscribers
        this.refreshSubscribers.forEach((sub) =>
          sub.resolve(token.accessToken)
        );
        this.refreshSubscribers = [];
        this.refreshPromise = null;
        return token;
      },
      (error) => {
        // IMPORTANT: Reject all subscribers on failure
        this.refreshSubscribers.forEach((sub) =>
          sub.reject(error)
        );
        this.refreshSubscribers = [];
        this.refreshPromise = null;
        throw error;
      }
    );
  }

  return new Promise((resolve, reject) => {
    this.refreshSubscribers.push({
      resolve,
      reject, // Subscriber can be rejected now
    });
  });
}
```

**Prevention:**

- Always handle both success and failure in Promise chains
- Reject/cleanup pending subscribers on failure
- Monitor queue sizes in production for growth patterns

---

## Frontend-Specific Pitfalls

### Callback Props in useEffect Dependencies

**Symptom:**

Infinite re-render loops. Component re-renders constantly even when data hasn't changed.

**Root Cause:**

Passing callback props directly in `useEffect` dependency arrays. Parent re-renders create new function references, triggering the effect:

```typescript
// WRONG: Callback in dependency array
interface Props {
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

function Component({ onLoad, onError }: Props) {
  useEffect(() => {
    loadData()
      .then(() => onLoad?.())
      .catch((err) => onError?.(err));
  }, [onLoad, onError]); // Parent re-renders create new functions → effect re-runs
}
```

**CORRECT - Use useRef pattern:**

```typescript
// CORRECT: Store callbacks in refs
interface Props {
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

function Component({ onLoad, onError }: Props) {
  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);

  // Update refs when callbacks change
  useEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Main effect references .current (stable)
  useEffect(() => {
    loadData()
      .then(() => onLoadRef.current?.())
      .catch((err) => onErrorRef.current?.(err));
  }, []); // Empty deps - only runs once
}
```

**Why this pattern works:**

- Ref `.current` is stable across re-renders
- Main effect doesn't depend on callback props
- Separate effects update refs when callbacks change
- No infinite loops

**Prevention:**

- Never put callback props in `useEffect` dependencies
- Use `useRef` to store callback references
- Update refs in separate effects
- Reference `ref.current` in the main effect

---

### Hardcoded Tailwind Colors vs Theme Tokens

**Symptom:**

UI doesn't adapt to dark/light mode changes. Colors look out of place or are hard to read in certain themes.

**Root Cause:**

Using hardcoded Tailwind color classes instead of theme-aware tokens:

```typescript
// WRONG: Hardcoded colors that don't adapt to theme
<div className="text-gray-400 border-primary-500">
  <p className="text-red-600">Error message</p>
</div>
```

**CORRECT - Use theme tokens:**

```typescript
// CORRECT: Theme-aware tokens
<div className="text-muted-foreground border-primary">
  <p className="text-destructive">Error message</p>
</div>
```

**Common theme tokens:**

| Instead of | Use |
| --- | --- |
| `text-gray-900`, `text-white` | `text-foreground` |
| `text-gray-400`, `text-gray-600` | `text-muted-foreground` |
| `bg-white`, `bg-gray-900` | `bg-background` |
| `bg-gray-100`, `bg-gray-800` | `bg-muted` |
| `border-gray-200`, `border-gray-700` | `border-border` |
| `text-blue-600`, `text-blue-400` | `text-primary` |
| `bg-blue-600`, `bg-blue-500` | `bg-primary` |
| `text-red-600`, `text-red-400` | `text-destructive` |
| `bg-red-600`, `bg-red-500` | `bg-destructive` |

**Why this matters:**

- Theme tokens automatically adapt to dark/light mode
- Consistent color usage across the app
- Easier to maintain and update themes
- Better accessibility (theme-aware contrast ratios)

**Prevention:**

- Use theme tokens from the design system
- Review components in both light and dark modes
- Document theme token conventions
- Use linters to detect hardcoded color usage

---

### Image Preload Without Cleanup Causes Memory Leaks

**Symptom:**

Multiple images load simultaneously when `src` changes quickly. Stale callbacks fire with outdated URLs.

**Root Cause:**

Creating `new Image()` objects without cleanup:

```typescript
// WRONG: No cleanup on src change
useEffect(() => {
  const img = new Image();
  img.onload = () => setImageSrc(src);
  img.onerror = () => setError(true);
  img.src = src;
}, [src]);
// When src changes, old Image keeps loading and may call stale handlers
```

**CORRECT - Add cancellation and use refs for callbacks:**

```typescript
const onLoadRef = useRef(onLoad);
useEffect(() => { onLoadRef.current = onLoad; }, [onLoad]);

useEffect(() => {
  let cancelled = false;
  const img = new Image();
  img.onload = () => { if (!cancelled) setImageSrc(src); };
  img.onerror = () => { if (!cancelled) setError(true); };
  img.src = src;
  return () => { cancelled = true; img.onload = null; img.onerror = null; };
}, [src]);
```

**Prevention:**

Always return cleanup functions from useEffect. Store callbacks in refs to avoid dependency churn.

---

### setTimeout Closure Leaks in useEffect

**Symptom:**

Old timeouts fire with stale state. Multiple competing timeouts when effect re-runs.

**Root Cause:**

`setTimeout` stored in a `let` variable inside `useEffect` leaks across re-runs:

```typescript
// WRONG: Timeout in closure variable
useEffect(() => {
  let timeout: NodeJS.Timeout;
  timeout = setTimeout(() => setStatus('slow'), 10000);
  return () => clearTimeout(timeout);
}, [status]); // Re-runs on status change, old timeout may already fire
```

**CORRECT - Use useRef for timeouts:**

```typescript
const timeoutRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  timeoutRef.current = setTimeout(() => setStatus('slow'), 10000);
  return () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };
}, []); // Stable deps, ref survives re-renders
```

**Prevention:**

Store timeout/interval IDs in `useRef`, not `let` variables. Remove state values from dependency arrays when they only need to be read, not trigger re-runs.

---

### Filter Chip IDs with Comma-Separated Values

**Symptom:**

Removing a filter chip removes the wrong filter. Multiple filters with commas get deleted instead of just the selected one.

**Root Cause:**

When building filter chips from comma-separated values, using array index as the chip identifier breaks when values contain commas:

```typescript
// WRONG: Index-based chip IDs
const filterChips = values.split(',').map((value, index) => ({
  id: index, // ❌ Breaks when values contain commas
  label: value,
}));

// If tags = "action,puzzle,puzzle-adventure"
// chips[2] could match "puzzle-adventure" but index 2 is ambiguous
```

**Solution:**

Use `encodeURIComponent` as the chip identifier:

```typescript
// CORRECT: Unique identifiers for each chip
const filterChips = values.split(',').map((value) => ({
  id: encodeURIComponent(value), // ✅ Unique per value
  label: value,
}));

// When removing chip with id "puzzle-adventure"
// Only that exact value is removed
const updatedValues = filterChips
  .filter((chip) => chip.id !== chipIdToRemove)
  .map((chip) => decodeURIComponent(chip.id))
  .join(',');
```

**Prevention:**

- Always use content-based identifiers for dynamic collections
- Never rely on array indices for removable items
- Use `encodeURIComponent` when building IDs from user content

---

### Server-Sent Events (SSE) with Axios

**Symptom:**

SSE endpoints work in simple fetch examples but fail when using the axios API client.

**Root Cause:**

Axios doesn't support EventSource or streaming responses. It buffers the entire response, breaking the streaming contract of SSE.

```typescript
// WRONG: Axios doesn't work with SSE
const response = await api.get('/api/stream/events'); // ❌ Won't stream
// Axios buffers entire response instead of opening EventSource
```

**Solution:**

Use native `fetch()` for SSE endpoints and manually attach authentication:

```typescript
// CORRECT: Use fetch for SSE
export async function subscribeToEvents(
  onMessage: (data: any) => void
): Promise<EventSource> {
  const token = useAuthStore.getState().accessToken;

  return new EventSource('/api/stream/events', {
    headers: {
      Authorization: `Bearer ${token}`, // ✅ Manually attach token
    },
  });
}

// Usage in component
useEffect(() => {
  let eventSource: EventSource;

  subscribeToEvents((data) => {
    console.log('Event received:', data);
  }).then((es) => {
    eventSource = es;
    eventSource.addEventListener('message', (e) => {
      const event = JSON.parse(e.data);
      onMessage(event);
    });
  });

  return () => {
    eventSource?.close();
  };
}, []);
```

**Prevention:**

- Document SSE endpoints as exceptions to the "always use axios" rule
- Implement token refresh handling if tokens expire during long-lived SSE connections
- Include authentication token in EventSource constructor headers

---

### Ruffle Window Type Safety

**Symptom:**

TypeScript errors when accessing Ruffle methods: `Property 'RufflePlayer' does not exist on type 'Window'`

**Root Cause:**

Ruffle is loaded via `<script>` tag and globally extends the Window object. Without type augmentation, TypeScript doesn't know about it.

```typescript
// WRONG: No type augmentation
const ruffle = (window as any).RufflePlayer; // ❌ Uses any, loses type safety
```

**Solution:**

Add proper global type augmentation in a `.d.ts` file:

```typescript
// src/types/ruffle.d.ts
declare global {
  interface Window {
    RufflePlayer: {
      newest: () => {
        create: (options: {
          allowScriptAccess?: boolean;
          [key: string]: any;
        }) => RuffleInstance;
      };
    };
  }
}

interface RuffleInstance {
  play: () => void;
  pause: () => void;
  stop: () => void;
  // ... other methods
}

export {};
```

**Usage in components:**

```typescript
// CORRECT: Fully typed
const ruffle = window.RufflePlayer.newest().create({
  allowScriptAccess: true,
});

ruffle.play(); // ✅ Type-safe, autocomplete works
```

**Prevention:**

- Always declare global types for third-party scripts loaded via `<script>` tags
- Never use `(window as any).something` - it defeats type checking
- Create `.d.ts` files in `src/types/` for external libraries

---

## Data Integrity & Security Pitfalls

### TOCTOU Race Conditions in Database Operations

**Symptom:**

Duplicate users created despite uniqueness checks. Data corruption under
concurrent requests.

**Root Cause:**

Check-then-act pattern without transaction wrapping:

```typescript
// WRONG: TOCTOU race condition
const existing = db.get('SELECT id FROM users WHERE username = ?', [username]);
if (existing) throw new Error('Username taken');
// Another request can insert between check and create!
db.run('INSERT INTO users ...', [username]);
```

**CORRECT - Wrap in transaction:**

```typescript
// CORRECT: Atomic check + insert
const createUser = db.transaction(() => {
  const existing = db.get('SELECT id FROM users WHERE username = ?', [username]);
  if (existing) throw new Error('Username taken');
  db.run('INSERT INTO users ...', [username]);
});
createUser();
```

**Prevention:**

- Always wrap uniqueness checks + inserts in `db.transaction()`
- Use database UNIQUE constraints as a safety net
- Test with concurrent requests (e.g.,
  `Promise.all([register(), register()])`)

---

### SSE Write-After-Close

**Symptom:**

Server crashes with "write after end" errors. SSE connections leak resources
after client disconnects.

**Root Cause:**

Writing to a response after the client has disconnected:

```typescript
// WRONG: No check for client disconnect
req.on('close', () => { /* cleanup */ });

// Later, after an async operation:
res.write(`data: ${JSON.stringify(update)}\n\n`); // Crashes if client gone!
```

**CORRECT - Track closed state:**

```typescript
let closed = false;
req.on('close', () => { closed = true; /* cleanup */ });

// Check before every write
if (!closed) {
  res.write(`data: ${JSON.stringify(update)}\n\n`);
}
```

**Prevention:**

- Add `closed` flag set by `req.on('close')` handler
- Check flag before every `res.write()` and after every `await`
- Clean up resources (streams, intervals) in the close handler

---

### ZIP Handle Leaks on Mount Failure

**Symptom:**

File descriptor exhaustion after repeated mount failures. "Too many open files"
errors.

**Root Cause:**

ZIP opened but not closed when subsequent operations fail:

```typescript
// WRONG: ZIP handle leaks if indexing fails
const zip = new StreamZip.async({ file: zipPath });
const entries = await zip.entries(); // If this throws...
// zip.close() never called!
```

**CORRECT - Close in catch block:**

```typescript
const zip = new StreamZip.async({ file: zipPath });
try {
  const entries = await zip.entries();
  // ... build index, store in map
} catch (error) {
  await zip.close(); // Clean up on failure
  throw error;
}
```

**Prevention:**

- Always close opened resources in catch blocks
- Use try-finally for guaranteed cleanup
- Monitor open file descriptor count in production

---

### Negative Cache Poisoning

**Symptom:**

Valid files return 404 permanently. Cache stores errors instead of just "not
found" results.

**Root Cause:**

Caching all errors, not just ENOENT (file not found):

```typescript
// WRONG: Caches permission errors, timeouts, etc.
try {
  return await fs.readFile(path);
} catch (error) {
  this.notFoundCache.set(path, true); // Bad: caches ALL errors
}
```

**CORRECT - Only cache ENOENT:**

```typescript
try {
  return await fs.readFile(path);
} catch (error: any) {
  if (error.code === 'ENOENT') {
    this.notFoundCache.set(path, true); // Only cache genuine "not found"
  }
  throw error; // Re-throw other errors for retry
}
```

**Prevention:**

- Only cache definitive "not found" results (ENOENT)
- Never cache transient errors (permission, timeout, network)
- Set TTL on negative cache entries

---

### Double-Settlement of Promises

**Symptom:**

"Promise already resolved" errors. Unpredictable behavior from concurrent
resolve/reject calls.

**Root Cause:**

Multiple code paths can settle the same Promise:

```typescript
// WRONG: Both error and data handlers can settle
return new Promise((resolve, reject) => {
  req.on('data', (chunk) => { /* ... */ });
  req.on('end', () => resolve(body));
  req.on('error', reject);
  // If error fires AFTER end, double-settlement!
});
```

**CORRECT - Use settled flag:**

```typescript
return new Promise((resolve, reject) => {
  let settled = false;
  const settle = () => { if (settled) return false; settled = true; return true; };

  req.on('data', (chunk) => { /* ... */ });
  req.on('end', () => { if (settle()) resolve(body); });
  req.on('error', (err) => { if (settle()) reject(err); });
});
```

---

### React StrictMode Double Session Start

**Symptom:**

Play sessions immediately ended after starting. Session tracking unreliable in
development.

**Root Cause:**

React 18 StrictMode mounts, unmounts, then remounts components. The unmount
triggers session cleanup:

```typescript
// WRONG: StrictMode unmount ends session prematurely
useEffect(() => {
  startSession();
  return () => endSession(); // Called during StrictMode remount!
}, []);
```

**CORRECT - Guard with mounted ref and delay:**

```typescript
const isMountedRef = useRef(false);

useEffect(() => {
  const timeout = setTimeout(() => {
    isMountedRef.current = true;
    startSession();
  }, 100); // Delay past StrictMode unmount

  return () => {
    clearTimeout(timeout);
    if (isMountedRef.current) {
      isMountedRef.current = false;
      endSession();
    }
  };
}, []);
```

**Prevention:**

- Use `isMountedRef` + short timeout to survive StrictMode's unmount/remount
- Only run cleanup if the component was actually fully mounted
- Test play tracking in both dev (StrictMode) and production builds

---

## Quick Reference: Error Messages

| Error                   | Service          | Quick Fix                      |
| ----------------------- | ---------------- | ------------------------------ |
| `ENOENT: no such file`  | Backend          | Check FLASHPOINT_PATH in .env  |
| `EADDRINUSE`            | Any              | Kill process or change port    |
| `database is locked`    | Backend          | Close Flashpoint Launcher      |
| `Token expired`         | Backend          | Implement token refresh        |
| `CORS policy`           | Frontend         | Check DOMAIN in backend .env   |
| `Ruffle is not defined` | Frontend         | Run `npm run copy-ruffle`      |
| `Module not found`      | Any              | Run `npm install`              |
| `Type error`            | Frontend/Backend | Run `npm run typecheck`        |
| `Game files not loading` | Backend         | Ensure backend game routes running |

---

## Additional Resources

- [Setup Guide](./setup-guide.md)
- [Debugging Guide](./debugging.md)
- [Commands Reference](./commands.md)
