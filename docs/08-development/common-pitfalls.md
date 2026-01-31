# Common Pitfalls

Known issues, gotchas, and solutions for Flashpoint Web development.

## Table of Contents

- [Environment Setup Issues](#environment-setup-issues)
- [Database Issues](#database-issues)
- [Port Conflicts](#port-conflicts)
- [Authentication Issues](#authentication-issues)
- [Game Service Issues](#game-service-issues)
- [Frontend Build Issues](#frontend-build-issues)
- [Performance Issues](#performance-issues)
- [Development Workflow Issues](#development-workflow-issues)

---

## Environment Setup Issues

### Issue: Flashpoint Path Not Found

**Symptom:**
```
Error: ENOENT: no such file or directory, open 'D:/Flashpoint/Data/flashpoint.sqlite'
```

**Causes:**
- `.env` file not configured
- Incorrect path in `.env`
- Missing Flashpoint installation

**Solution:**

```bash
# 1. Verify Flashpoint installation exists
ls D:/Flashpoint/Data/flashpoint.sqlite  # Linux/Mac
dir D:\Flashpoint\Data\flashpoint.sqlite  # Windows

# 2. Create .env file from example
cd backend
cp .env.example .env

# 3. Edit .env with correct paths
# Windows paths use forward slashes or escaped backslashes
FLASHPOINT_PATH=D:/Flashpoint
FLASHPOINT_DB_PATH=D:/Flashpoint/Data/flashpoint.sqlite

# Alternative Windows format
FLASHPOINT_PATH=D:\\Flashpoint
FLASHPOINT_DB_PATH=D:\\Flashpoint\\Data\\flashpoint.sqlite

# 4. Verify paths in .env match actual installation
```

**Prevention:**
- Always copy `.env.example` to `.env` during setup
- Validate paths before starting development
- Use absolute paths, not relative paths

---

### Issue: Node Version Mismatch

**Symptom:**
```
Error: The engine "node" is incompatible with this module
Expected version ">=20.0.0". Got "18.12.0"
```

**Solution:**

```bash
# Check current Node version
node --version

# Install Node 20+ using nvm (recommended)
# Linux/Mac:
nvm install 20
nvm use 20

# Windows (nvm-windows):
nvm install 20.0.0
nvm use 20.0.0

# Or download from nodejs.org
# https://nodejs.org/

# Verify version
node --version  # Should be 20.x.x or higher
```

**Prevention:**
- Use nvm for Node version management
- Document required Node version in README
- Add `.nvmrc` file to repository

---

### Issue: Dependencies Not Installing

**Symptom:**
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solution:**

```bash
# 1. Clear npm cache
npm cache clean --force

# 2. Delete all node_modules and lock files
rm -rf node_modules package-lock.json
rm -rf backend/node_modules backend/package-lock.json
rm -rf frontend/node_modules frontend/package-lock.json
rm -rf game-service/node_modules game-service/package-lock.json

# Windows:
del /s /q node_modules package-lock.json
del /s /q backend\node_modules backend\package-lock.json
del /s /q frontend\node_modules frontend\package-lock.json
del /s /q game-service\node_modules game-service\package-lock.json

# 3. Reinstall
npm run install:all

# 4. If still fails, try legacy peer deps
npm run install:all -- --legacy-peer-deps
```

**Prevention:**
- Keep dependencies up to date
- Test dependency updates in separate branch
- Use `package-lock.json` for reproducible builds

---

## Database Issues

### Issue: Database Locked Error

**Symptom:**
```
SqliteError: database is locked
```

**Causes:**
- Flashpoint Launcher has database open
- Multiple processes accessing database
- Previous process didn't close connection
- Transaction not committed

**Solution:**

```bash
# 1. Close Flashpoint Launcher
# Make sure no Flashpoint processes are running

# 2. Check for processes with database open
# Linux/Mac:
lsof backend/user.db

# Windows:
# Use Process Explorer or Resource Monitor

# 3. Kill processes holding database lock
kill -9 <PID>

# 4. If persistent, restart development server
npm run dev

# 5. In extreme cases, copy database
cp backend/user.db backend/user.db.backup
# Delete original and rename backup
```

**Prevention:**

```typescript
// Always close database connections properly
const db = new Database('user.db');

// Use try-finally to ensure cleanup
try {
  // Database operations
} finally {
  db.close();
}

// Or use connection pooling
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

### Issue: Migration Fails

**Symptom:**
```
Error: Migration failed: table users already exists
```

**Solution:**

```bash
# 1. Check current schema
sqlite3 backend/user.db ".schema"

# 2. If development database, delete and recreate
rm backend/user.db
npm run dev  # Migrations run automatically

# 3. For production, rollback manually
sqlite3 backend/user.db
> DROP TABLE IF EXISTS users;
> .quit

# 4. Re-run migrations
npm run dev
```

**Prevention:**
- Use migration versioning system
- Add migration status tracking
- Test migrations in development first
- Backup database before migrations

---

### Issue: Read-Only Database Error

**Symptom:**
```
Error: attempt to write a readonly database
```

**Causes:**
- Writing to flashpoint.sqlite (read-only)
- Incorrect permissions on user.db
- Database file on read-only filesystem

**Solution:**

```bash
# 1. NEVER write to flashpoint.sqlite
# It's managed by Flashpoint Launcher

# 2. Check file permissions
ls -l backend/user.db

# 3. Fix permissions if needed
chmod 644 backend/user.db

# 4. Ensure correct database in code
// BAD - writing to flashpoint.sqlite
const db = new Database(FLASHPOINT_DB_PATH);
db.prepare('INSERT INTO ...').run();

// GOOD - use UserDatabaseService for writes
const userDb = UserDatabaseService.getInstance();
userDb.createUser(...);
```

**Prevention:**
- Use DatabaseService only for reads from flashpoint.sqlite
- Use UserDatabaseService for all writes
- Add code comments warning about read-only databases
- Implement database access layer

---

## Port Conflicts

### Issue: Port Already in Use

**Symptom:**
```
Error: listen EADDRINUSE: address already in use :::3100
```

**Causes:**
- Previous server instance still running
- Another application using the port
- Port not released after crash

**Solution:**

```bash
# Find process using port
# Linux/Mac:
lsof -i :3100
netstat -vanp tcp | grep 3100

# Windows:
netstat -ano | findstr :3100

# Kill process
# Linux/Mac:
kill -9 <PID>

# Windows:
taskkill /PID <PID> /F

# Or use backend utility
cd backend
npm run kill-port
```

**Alternative Ports:**

```bash
# Change port in .env
# Backend
PORT=3002

# Frontend (vite.config.ts)
server: {
  port: 5174
}

# Game Service
PROXY_PORT=22502
GAMEZIPSERVER_PORT=22503
```

**Prevention:**
- Use process manager (PM2) to handle crashes
- Implement graceful shutdown
- Clean up ports on server restart

```typescript
// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
```

---

## Authentication Issues

### Issue: JWT Token Expired

**Symptom:**
```
401 Unauthorized: Token expired
```

**Solution:**

```typescript
// Frontend: Implement token refresh
import { api } from '@/lib/api';

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Refresh token
        const { data } = await api.post('/api/auth/refresh', {
          refreshToken: localStorage.getItem('refreshToken')
        });

        // Update token
        localStorage.setItem('accessToken', data.accessToken);

        // Retry original request
        originalRequest.headers['Authorization'] = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

**Prevention:**
- Implement refresh token mechanism
- Set appropriate token expiration times
- Handle token expiration gracefully

---

### Issue: CORS Errors on Authentication

**Symptom:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:**

```typescript
// Backend: Ensure CORS configured correctly
import cors from 'cors';

app.use(cors({
  origin: process.env.DOMAIN || 'http://localhost:5173',
  credentials: true,  // Important for cookies
  exposedHeaders: ['X-Total-Count'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Frontend: Include credentials
axios.create({
  baseURL: 'http://localhost:3100',
  withCredentials: true  // Send cookies
});
```

**Prevention:**
- Configure CORS before other middleware
- Match frontend origin exactly in CORS config
- Test authentication in production-like environment

---

## Game Service Issues

### Issue: Game Files Not Loading

**Symptom:**
- Blank game screen
- 404 errors in Network tab
- "Failed to load resource" errors

**Solution:**

```bash
# 1. Verify game-service is running
curl http://localhost:22500/health

# 2. Check game-service logs
cd game-service
npm run dev

# 3. Verify Flashpoint paths in .env
echo $FLASHPOINT_PATH
ls $FLASHPOINT_PATH/Legacy/htdocs

# 4. Test file access directly
curl http://localhost:22500/file.swf

# 5. Check file permissions
ls -l D:/Flashpoint/Legacy/htdocs/

# 6. Verify backend proxy configuration
# backend/.env
GAME_SERVICE_PROXY_URL=http://localhost:22500
GAME_SERVICE_GAMEZIP_URL=http://localhost:22501
```

**Prevention:**
- Start game-service before backend
- Verify paths on first run
- Add health check endpoints
- Log file access attempts

---

### Issue: Ruffle Not Loading

**Symptom:**
```
Error: Ruffle is not defined
```

**Solution:**

```bash
# 1. Verify Ruffle files exist
ls frontend/public/ruffle/

# 2. If missing, copy Ruffle files
cd frontend
npm run copy-ruffle

# 3. Check package.json for postinstall hook
"postinstall": "npm run copy-ruffle"

# 4. Verify Ruffle version
cat package.json | grep ruffle

# 5. Update Ruffle if needed
npm install @ruffle-rs/ruffle@latest
npm run copy-ruffle

# 6. Clear browser cache
# Chrome: Ctrl+Shift+Delete > Cached images and files
```

**Prevention:**
- Run `npm run copy-ruffle` after npm install
- Add Ruffle check on player load
- Document Ruffle setup in README

---

## Frontend Build Issues

### Issue: Build Fails with Type Errors

**Symptom:**
```
ERROR: Type error: Property 'xyz' does not exist on type 'ABC'
```

**Solution:**

```bash
# 1. Type check without building
cd frontend
npm run typecheck

# 2. Fix type errors in reported files

# 3. If using path aliases, verify tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"]
    }
  }
}

# 4. Ensure Vite resolves aliases (vite.config.ts)
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});

# 5. Restart TypeScript server in VS Code
# Ctrl+Shift+P > "Restart TypeScript Server"
```

---

### Issue: Vite HMR Not Working

**Symptom:**
- Changes not reflecting in browser
- Have to manually refresh
- HMR connection lost

**Solution:**

```bash
# 1. Check Vite dev server is running
curl http://localhost:5173

# 2. Check browser console for HMR errors

# 3. Verify vite.config.ts
export default defineConfig({
  server: {
    hmr: {
      overlay: true
    }
  }
});

# 4. Clear Vite cache
rm -rf frontend/node_modules/.vite

# 5. Restart dev server
cd frontend
npm run dev

# 6. Check for file watcher limits (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

### Issue: Tailwind Styles Not Applied

**Symptom:**
- Tailwind classes not working
- Styles not updating

**Solution:**

```bash
# 1. Verify Tailwind in tailwind.config.js
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'  // Include all source files
  ],
  // ...
};

# 2. Ensure Tailwind directives in CSS
// src/index.css
@tailwind base;
@tailwind components;
@tailwind utilities;

# 3. Import CSS in main.tsx
import './index.css';

# 4. Clear build cache
rm -rf frontend/dist
rm -rf frontend/node_modules/.vite

# 5. Rebuild
cd frontend
npm run dev
```

---

## Performance Issues

### Issue: Slow Database Queries

**Symptom:**
- API responses taking >1 second
- Database CPU usage high

**Solution:**

```sql
-- 1. Add indexes to frequently queried columns
CREATE INDEX idx_game_platform ON game(platform);
CREATE INDEX idx_game_library ON game(library);
CREATE INDEX idx_game_title ON game(title);

-- 2. Use EXPLAIN QUERY PLAN to analyze
EXPLAIN QUERY PLAN
SELECT * FROM game WHERE platform = 'Flash';

-- 3. Optimize search queries
-- BAD - full table scan
SELECT * FROM game WHERE title LIKE '%mario%';

-- BETTER - prefix search uses index
SELECT * FROM game WHERE title LIKE 'mario%';

-- BEST - full-text search
CREATE VIRTUAL TABLE game_fts USING fts5(title, content);
SELECT * FROM game_fts WHERE game_fts MATCH 'mario';
```

**Prevention:**
- Add indexes during migrations
- Profile queries during development
- Use pagination for large result sets
- Implement caching for frequent queries

---

### Issue: Frontend Performance Issues

**Symptom:**
- Slow page loads
- Laggy interactions
- High memory usage

**Solution:**

```tsx
// 1. Implement virtualization for long lists
import { useVirtualizer } from '@tanstack/react-virtual';

function GameList({ games }: { games: Game[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: games.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      {virtualizer.getVirtualItems().map((virtualItem) => (
        <GameCard key={virtualItem.key} game={games[virtualItem.index]} />
      ))}
    </div>
  );
}

// 2. Memoize expensive components
import { memo } from 'react';

export const GameCard = memo(({ game }: GameCardProps) => {
  return <div>...</div>;
});

// 3. Use React Query pagination
const { data, fetchNextPage } = useInfiniteQuery({
  queryKey: ['games'],
  queryFn: ({ pageParam = 1 }) => fetchGames({ page: pageParam }),
  getNextPageParam: (lastPage) => lastPage.nextPage,
});

// 4. Lazy load images
<img
  src={game.thumbnail}
  loading="lazy"
  alt={game.title}
/>

// 5. Code splitting
import { lazy, Suspense } from 'react';

const GamePlayer = lazy(() => import('./components/player/GamePlayer'));

function GameView() {
  return (
    <Suspense fallback={<Loading />}>
      <GamePlayer />
    </Suspense>
  );
}
```

---

## Development Workflow Issues

### Issue: Git Merge Conflicts

**Solution:**

```bash
# 1. Check conflict status
git status

# 2. Open conflicted files and resolve
# Look for markers:
<<<<<<< HEAD
Your changes
=======
Incoming changes
>>>>>>> branch-name

# 3. After resolving, mark as resolved
git add <file>

# 4. Continue merge/rebase
git merge --continue
# or
git rebase --continue

# 5. If too complex, abort and retry
git merge --abort
git rebase --abort
```

**Prevention:**
- Pull frequently from main branch
- Keep branches short-lived
- Communicate with team about file changes
- Use feature flags for concurrent work

---

### Issue: Changes Not Showing After Pull

**Solution:**

```bash
# 1. Pull latest changes
git pull origin master

# 2. Reinstall dependencies (may have changed)
npm run install:all

# 3. Rebuild
npm run build

# 4. Restart dev servers
npm run dev

# 5. Clear browser cache
# Hard refresh: Ctrl+Shift+R (Chrome)
```

---

## Quick Reference: Error Messages

| Error | Service | Likely Cause | Quick Fix |
|-------|---------|--------------|-----------|
| `ENOENT: no such file` | Backend | Missing .env or wrong paths | Check FLASHPOINT_PATH in .env |
| `EADDRINUSE` | Any | Port already in use | Kill process or change port |
| `database is locked` | Backend | Multiple DB connections | Close Flashpoint Launcher |
| `Token expired` | Backend | JWT expired | Implement token refresh |
| `CORS policy` | Frontend | CORS misconfigured | Check DOMAIN in backend .env |
| `Ruffle is not defined` | Frontend | Ruffle files missing | Run `npm run copy-ruffle` |
| `Module not found` | Any | Missing dependency | Run `npm install` |
| `Type error` | Frontend/Backend | TypeScript issue | Run `npm run typecheck` |

---

## Additional Resources

- [Setup Guide](./setup-guide.md)
- [Commands Reference](./commands.md)
- [Debugging Guide](./debugging.md)
- [Project Documentation](../../CLAUDE.md)
