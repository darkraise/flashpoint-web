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
        const { data } = await api.post('/api/auth/refresh', {
          refreshToken: localStorage.getItem('refreshToken'),
        });
        localStorage.setItem('accessToken', data.accessToken);
        error.config.headers['Authorization'] = `Bearer ${data.accessToken}`;
        return api(error.config);
      } catch {
        localStorage.clear();
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

## Game Service Issues

### Game Files Not Loading

**Symptom:**

- Blank game screen or 404 errors

**Solution:**

```bash
# Verify game-service is running
curl http://localhost:22500/health

# Check logs
cd game-service && npm run dev

# Verify Flashpoint paths
ls $FLASHPOINT_PATH/Legacy/htdocs
ls $FLASHPOINT_PATH/Data/Games/

# Test file access
curl http://localhost:22500/file.swf
```

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

## Quick Reference: Error Messages

| Error                   | Service          | Quick Fix                     |
| ----------------------- | ---------------- | ----------------------------- |
| `ENOENT: no such file`  | Backend          | Check FLASHPOINT_PATH in .env |
| `EADDRINUSE`            | Any              | Kill process or change port   |
| `database is locked`    | Backend          | Close Flashpoint Launcher     |
| `Token expired`         | Backend          | Implement token refresh       |
| `CORS policy`           | Frontend         | Check DOMAIN in backend .env  |
| `Ruffle is not defined` | Frontend         | Run `npm run copy-ruffle`     |
| `Module not found`      | Any              | Run `npm install`             |
| `Type error`            | Frontend/Backend | Run `npm run typecheck`       |

---

## Additional Resources

- [Setup Guide](./setup-guide.md)
- [Debugging Guide](./debugging.md)
- [Commands Reference](./commands.md)
