# CLAUDE.md

## Project Overview

Flashpoint Web: self-hosted web app for browsing/playing Flashpoint Archive
games.

- **Backend** (Express/TypeScript, port 3100): REST API + game content via
  `/game-proxy/*`, `/game-zip/*`
- **Frontend** (Vite/React/TypeScript, port 5173): TanStack Query, Zustand,
  Tailwind, Ruffle
- **Databases**: `flashpoint.sqlite` (read-only, never write) + `user.db` (app
  data)

## Commands

```bash
npm run install:all        # Install all
npm run dev                # Start all services
npm run typecheck          # Type check all
npm run build              # Build all
npm test                   # Run backend tests
```

## Documentation

Docs in `docs/` (100+ files). **Reference docs instead of repeating**:

| Topic            | Path                                                |
| ---------------- | --------------------------------------------------- |
| Architecture     | `docs/02-architecture/system-architecture.md`       |
| API Reference    | `docs/06-api-reference/README.md`                   |
| Common Pitfalls  | `docs/08-development/common-pitfalls.md`            |
| Setup Guide      | `docs/08-development/setup-guide.md`                |
| Environment Vars | `docs/09-deployment/environment-variables.md`       |
| Database Schema  | `docs/12-reference/database-schema-reference.md`    |
| Game Service     | `docs/05-game-service/architecture.md`              |
| Components       | `docs/04-frontend/components/component-overview.md` |

---

## Coding Standards (MANDATORY)

**Follow these rules strictly. Violations will be caught in code review.**

### TypeScript & Types

- **No `any` types** — use `unknown`, generics, or proper interfaces
- **No non-null assertions (`!`)** — use `?? defaultValue` or proper null checks
- **Use `??` not `||`** for defaults — `||` treats `0`, `""`, `false` as falsy
- **Validate `parseInt()`** — always check `isNaN()`, NaN silently passes to SQL
- **Throw `AppError`** not plain `Error` — ensures proper HTTP status codes
- **Define return types** for exported functions — improves type inference
- **Use `readonly` arrays** when mutation isn't needed — `readonly string[]`
- **Prefer `unknown` over `any`** for caught errors — `catch (error: unknown)`

```typescript
// WRONG
const limit = parseInt(req.query.limit) || 10; // NaN becomes 10, but "0" also becomes 10
const user = users.find((u) => u.id === id)!; // Crashes if not found

// CORRECT
const parsed = parseInt(req.query.limit as string, 10);
const limit = isNaN(parsed) ? 10 : parsed;
const user = users.find((u) => u.id === id) ?? null;
```

### Express Backend

- **`asyncHandler()` on ALL async route handlers** — prevents unhandled promise
  rejections
- **Static routes BEFORE parameterized** — `/random` must come before `/:id`
- **Check `res.headersSent`** before error responses — required for
  SSE/streaming
- **Cap query limits** — `Math.min(parsedLimit, 100)` prevents data dumps
- **Add lower bounds too** — `Math.max(1, Math.min(parsedLimit, 100))`
- **Validate query params** — use Zod schemas, check bounds (min/max)
- **Wrap check-then-insert in `db.transaction()`** — prevents TOCTOU race
  conditions
- **Strip port from hostname** — `req.headers.host?.split(':')[0]`
- **Return early on validation failure** — don't continue processing bad input
- **Use `requirePermission()` middleware** — for protected endpoints

```typescript
// WRONG - async handler without wrapper
router.get('/games', async (req, res) => { ... });

// WRONG - parameterized route shadows static
router.get('/:id', ...);
router.get('/random', ...);  // Never reached!

// CORRECT
router.get('/random', asyncHandler(async (req, res) => { ... }));
router.get('/:id', asyncHandler(async (req, res) => { ... }));
```

### Database

- **Never write to `flashpoint.sqlite`** — it's read-only, managed by Flashpoint
  Launcher
- **Use transactions for multi-step operations** — atomic success or rollback
- **Batch large operations** — wrap all batches in single outer transaction
- **Use scalar subqueries or window functions** — avoid separate COUNT queries
- **Build Maps for O(1) lookups** — never use `.find()` in loops over large
  datasets
- **Always use parameterized queries** — never string interpolation for SQL

```typescript
// WRONG - O(N²) complexity
const results = games.map((game) => {
  const favorite = favorites.find((f) => f.gameId === game.id); // Scans entire array
  return { ...game, isFavorite: !!favorite };
});

// CORRECT - O(N) with Map
const favoriteSet = new Set(favorites.map((f) => f.gameId));
const results = games.map((game) => ({
  ...game,
  isFavorite: favoriteSet.has(game.id),
}));

// WRONG - separate COUNT query
const games = db.all('SELECT * FROM game LIMIT ?', [limit]);
const total = db.get('SELECT COUNT(*) as count FROM game').count;

// CORRECT - window function
const games = db.all(
  `
  SELECT *, COUNT(*) OVER() as total_count
  FROM game LIMIT ?
`,
  [limit]
);
```

### React Frontend

- **All API calls through `@/lib/api.ts`** — never raw `fetch()`, bypasses
  auth/refresh
- **Use `@/` imports** — not relative `../` paths
- **Use theme tokens** — `text-muted-foreground` not `text-gray-400`
- **Store callbacks in `useRef`** when used in `useEffect` — prevents infinite
  loops
- **Store timeouts/intervals in `useRef`** — not `let` variables, prevents stale
  closures
- **Content-based keys** — never array indices for dynamic/removable items
- **Use `logger`** — not `console.log/error/debug`
- **Return cleanup from `useEffect`** — especially for Image preloads, timers,
  subscriptions
- **Guard StrictMode double-mount** — use `isMountedRef` + delay for session
  tracking
- **Complete `memo` comparators** — include ALL props that affect rendering
- **Use `useCallback` for event handlers** passed to memoized children

```typescript
// WRONG - callback in useEffect deps causes infinite loop
useEffect(() => {
  fetchData().then(onSuccess);
}, [onSuccess]);  // onSuccess is new function each render!

// CORRECT - store callback in ref
const onSuccessRef = useRef(onSuccess);
useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);
useEffect(() => {
  fetchData().then(data => onSuccessRef.current?.(data));
}, []);

// WRONG - index as key
{items.map((item, i) => <Item key={i} {...item} />)}

// CORRECT - content-based key
{items.map(item => <Item key={item.id} {...item} />)}

// WRONG - hardcoded colors
<p className="text-gray-400">Muted text</p>

// CORRECT - theme tokens
<p className="text-muted-foreground">Muted text</p>
```

### Resource Management

- **Add `.catch()` to fire-and-forget promises** — prevents unhandled rejections
- **Add `.unref()` to cleanup intervals** — allows graceful Node.js shutdown
- **Handle `res.on('close')`** — destroy streams on client disconnect
- **Close resources in catch blocks** — ZIP handles, file descriptors, DB
  connections
- **Track `closed` state for SSE** — check before every `res.write()` and after
  awaits
- **Cancel pending timers on cleanup** — track timer IDs, clear in
  `finally`/cleanup
- **Use `shuttingDown` flag** — prevent new resource acquisition during shutdown
- **Await mount operations** — never fire-and-forget ZIP mounts

```typescript
// WRONG - unhandled rejection
downloadInBackground(gameId);

// CORRECT
downloadInBackground(gameId).catch((err) =>
  logger.error('Download failed:', err)
);

// WRONG - interval keeps process alive
this.cleanupInterval = setInterval(() => this.cleanup(), 60000);

// CORRECT
this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
this.cleanupInterval.unref();

// WRONG - write after client disconnect
res.write(`data: ${JSON.stringify(update)}\n\n`);

// CORRECT
let closed = false;
req.on('close', () => {
  closed = true;
});
if (!closed) {
  res.write(`data: ${JSON.stringify(update)}\n\n`);
}
```

### Security

- **Allowlists over denylists** — for domains, CGI env vars, file extensions
- **Validate resolved paths** — `path.resolve()` + `startsWith(baseDir)`
  prevents traversal
- **Resolve symlinks first** — `fs.realpath()` before path validation
- **Use `URL` constructor** — not string concatenation for URL building
- **`encodeURIComponent()`** for URL params — handles special characters
- **Pre-check DNS resolution** — prevents SSRF via DNS rebinding
- **Verify checksums** — for downloaded files, throw on verification failure
- **Re-validate after async operations** — file paths after download, tokens
  after refresh
- **Guest users (id=0) have restricted permissions** — read-only, no
  `games.play`

```typescript
// WRONG - path traversal vulnerability
const filePath = path.join(baseDir, req.params.filename);
return fs.readFile(filePath);

// CORRECT
const filePath = path.resolve(baseDir, req.params.filename);
const realPath = await fs.realpath(filePath);
if (!realPath.startsWith(baseDir)) {
  throw new AppError(403, 'Access denied');
}
return fs.readFile(realPath);

// WRONG - string concatenation for URLs
const url = baseUrl + '/' + filename;

// CORRECT
const url = new URL(filename, baseUrl).href;
```

### Error Handling

- **Only cache ENOENT** — never cache transient errors (negative cache
  poisoning)
- **Prevent double Promise settlement** — use `settled` flag in event handlers
- **Differentiate error types** — JSON parse errors vs ENOENT in config loading
- **Log errors with context** — include IDs, paths, operation names
- **Use `AppError` with appropriate status codes** — 400 for validation, 404 for
  not found, 500 for internal

```typescript
// WRONG - caches all errors
try {
  return await fs.readFile(path);
} catch {
  this.notFoundCache.set(path, true); // Caches permission errors too!
}

// CORRECT - only cache definitive "not found"
try {
  return await fs.readFile(path);
} catch (error: unknown) {
  if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
    this.notFoundCache.set(path, true);
  }
  throw error;
}

// WRONG - double settlement possible
return new Promise((resolve, reject) => {
  req.on('end', () => resolve(body));
  req.on('error', reject);
});

// CORRECT
return new Promise((resolve, reject) => {
  let settled = false;
  req.on('end', () => {
    if (!settled) {
      settled = true;
      resolve(body);
    }
  });
  req.on('error', (err) => {
    if (!settled) {
      settled = true;
      reject(err);
    }
  });
});
```

### Code Quality

- **Don't export internal constants** — reduces public API surface
- **Don't duplicate utilities** — consolidate to single source of truth
- **`[...arr].sort()`** — not `arr.sort()`, avoid mutation
- **Use `switch` for mutually exclusive conditions** — not overlapping `if`
  blocks
- **Remove unused imports/variables** — keep code clean
- **Consistent naming** — camelCase for variables, PascalCase for
  components/types
- **Add `displayName` to HOC-wrapped components** — improves debugging
- **Prefer early returns** — reduces nesting, improves readability

```typescript
// WRONG - overlapping if blocks
if (!cacheType || cacheType === 'games') clearGamesCache();
if (!cacheType || cacheType === 'users') clearUsersCache();

// CORRECT - mutually exclusive
switch (cacheType) {
  case 'games':
    clearGamesCache();
    break;
  case 'users':
    clearUsersCache();
    break;
  default:
    clearGamesCache();
    clearUsersCache();
}

// WRONG - mutates original array
const sorted = tags.sort();

// CORRECT - creates new array
const sorted = [...tags].sort();
```

### Zod Validation

- **Align frontend/backend schemas** — same limits, same required fields
- **Use `.min()` and `.max()`** — validate string lengths, number ranges
- **Use `.url()` for URLs** — validates format
- **Use enums for known values** — `z.enum(['option1', 'option2'])`
- **Validate optional fields properly** — `z.string().optional()` not
  `z.string()`

```typescript
// Backend schema
const createPlaylistSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  gameIds: z.array(z.string().uuid()).max(100),
});

// Frontend schema should match
const playlistSchema = z.object({
  title: z.string().min(1, 'Title required').max(100, 'Title too long'),
  description: z.string().max(500).optional(),
  gameIds: z.array(z.string()).max(100),
});
```

---

## Project-Specific Patterns

### API Layer Pattern

All frontend API calls must go through `frontend/src/lib/api.ts`:

```typescript
// In api.ts - add new endpoint
export const playlistsApi = {
  getAll: async (params?: PaginationParams) => {
    const { data } = await api.get<ApiResponse<Playlist[]>>('/playlists', {
      params,
    });
    return data;
  },
  create: async (data: CreatePlaylistData) => {
    const { data: response } = await api.post<ApiResponse<Playlist>>(
      '/playlists',
      data
    );
    return response.data;
  },
};

// In component - use the API
const { data, isLoading } = useQuery({
  queryKey: ['playlists'],
  queryFn: () => playlistsApi.getAll(),
});
```

### Route Handler Pattern

```typescript
// backend/src/routes/example.ts
import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate, requirePermission } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { z } from 'zod';

const router = Router();

const createSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    value: z.number().int().min(0).max(1000),
  }),
});

// Static routes first
router.get(
  '/stats',
  authenticate,
  requirePermission('example.read'),
  asyncHandler(async (req, res) => {
    const stats = await ExampleService.getStats();
    res.json({ success: true, data: stats });
  })
);

// Parameterized routes after
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      throw new AppError(400, 'Invalid ID');
    }
    const item = await ExampleService.getById(id);
    if (!item) {
      throw new AppError(404, 'Item not found');
    }
    res.json({ success: true, data: item });
  })
);

router.post(
  '/',
  authenticate,
  requirePermission('example.create'),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const item = await ExampleService.create(req.body, req.user!.id);
    res.status(201).json({ success: true, data: item });
  })
);

export default router;
```

### Service Pattern

```typescript
// backend/src/services/ExampleService.ts
import { UserDatabaseService } from './UserDatabaseService';
import { AppError } from '../middleware/errorHandler';

export class ExampleService {
  static getById(id: number): Example | null {
    return (
      UserDatabaseService.get<Example>('SELECT * FROM examples WHERE id = ?', [
        id,
      ]) ?? null
    );
  }

  static create(data: CreateExampleData, userId: number): Example {
    const db = UserDatabaseService.getDatabase();

    // Use transaction for check-then-insert
    return db.transaction(() => {
      const existing = UserDatabaseService.get<{ id: number }>(
        'SELECT id FROM examples WHERE name = ?',
        [data.name]
      );

      if (existing) {
        throw new AppError(409, 'Name already exists');
      }

      const result = UserDatabaseService.run(
        'INSERT INTO examples (name, value, created_by) VALUES (?, ?, ?)',
        [data.name, data.value, userId]
      );

      return this.getById(result.lastInsertRowid as number)!;
    })();
  }
}
```

### React Query Hook Pattern

```typescript
// frontend/src/hooks/useExample.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { exampleApi } from '@/lib/api';
import { toast } from 'sonner';

export function useExamples(params?: PaginationParams) {
  return useQuery({
    queryKey: ['examples', params],
    queryFn: () => exampleApi.getAll(params),
  });
}

export function useExample(id: string | undefined) {
  return useQuery({
    queryKey: ['examples', id],
    queryFn: () => exampleApi.getById(id!),
    enabled: !!id,
  });
}

export function useCreateExample() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: exampleApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examples'] });
      toast.success('Example created');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
```

### Component Pattern

```typescript
// frontend/src/components/example/ExampleCard.tsx
import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ExampleCardProps {
  example: Example;
  isSelected?: boolean;
  onClick?: (example: Example) => void;
  className?: string;
}

export const ExampleCard = memo(function ExampleCard({
  example,
  isSelected,
  onClick,
  className,
}: ExampleCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-colors hover:bg-muted/50',
        isSelected && 'border-primary',
        className
      )}
      onClick={() => onClick?.(example)}
    >
      <CardHeader>
        <CardTitle className="text-foreground">{example.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{example.description}</p>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparator - include ALL props that affect rendering
  return (
    prevProps.example.id === nextProps.example.id &&
    prevProps.example.name === nextProps.example.name &&
    prevProps.example.description === nextProps.example.description &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.className === nextProps.className
    // Note: onClick is stable if parent uses useCallback
  );
});

ExampleCard.displayName = 'ExampleCard';
```

### Game Service Patterns

```typescript
// Mounting a game ZIP - always await
const result = await gameZipServer.mountGameZip(
  gameId,
  zipPath,
  dateAdded,
  sha256
);
if (!result.success) {
  throw new AppError(500, `Failed to mount: ${result.error}`);
}

// Checking download status
const isDownloading = DownloadRegistry.isDownloading(gameId);
const activeCount = DownloadRegistry.getActiveCount();

// Capacity check - include both download systems
const totalActive = localDownloads.size + DownloadRegistry.getActiveCount();
if (totalActive >= MAX_CONCURRENT_DOWNLOADS) {
  throw new AppError(503, 'Download capacity reached');
}

// File serving from ZIP - check entry exists first
const entries = zipManager.getEntries();
if (!entries.has(requestedFile)) {
  return res.status(404).send('File not found');
}
// Only then read the file
const data = await zipManager.readFile(requestedFile);
```

### SSE (Server-Sent Events) Pattern

```typescript
router.get(
  '/stream',
  authenticate,
  asyncHandler(async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let closed = false;

    req.on('close', () => {
      closed = true;
      // Clean up subscriptions, intervals, etc.
    });

    const sendEvent = (data: unknown) => {
      if (closed || res.headersSent === false) return;
      try {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch {
        closed = true;
      }
    };

    // Send initial data
    sendEvent({ type: 'connected' });

    // Set up interval (with cleanup)
    const interval = setInterval(() => {
      if (closed) {
        clearInterval(interval);
        return;
      }
      sendEvent({ type: 'heartbeat', timestamp: Date.now() });
    }, 30000);

    // Clean up on close
    req.on('close', () => clearInterval(interval));
  })
);
```

### Download Polling Pattern (Frontend)

```typescript
const { data: launchData, isLoading } = useQuery({
  queryKey: ['game', gameId, 'launch'],
  queryFn: () => gamesApi.getLaunchData(gameId),
  // Conditional polling - only when downloading
  refetchInterval: (query) => {
    return query.state.data?.downloading ? 2000 : false;
  },
});

// Render based on state
if (isLoading) return <LoadingSpinner />;
if (launchData?.downloading) return <DownloadProgress gameId={gameId} />;
if (launchData?.mounted) return <GamePlayer gameId={gameId} />;
```

---

## Architecture Quick Reference

### Request Flow

```
Frontend Request
    ↓
Vite Dev Proxy (dev) / Nginx (prod)
    ↓
Express Server (port 3100)
    ↓
Middleware Chain:
  1. CORS
  2. Helmet (security headers)
  3. Rate limiting
  4. Body parsing
  5. Authentication (JWT)
  6. Permission check (RBAC)
    ↓
Route Handler
    ↓
Service Layer
    ↓
Database (SQLite)
```

### Game Play Flow

```
1. User clicks "Play"
    ↓
2. Frontend: GET /api/games/:id/launch
    ↓
3. Backend: Check if ZIP mounted
    ↓
4a. If mounted → return { mounted: true, launchCommand }
4b. If not mounted → start download, return { downloading: true }
    ↓
5. Frontend polls every 2s while downloading
    ↓
6. When ready → render GamePlayer component
    ↓
7. GamePlayer loads game via /game-proxy/* or /game-zip/*
```

### Key Architecture Points

- **Game routes registered BEFORE auth middleware** — `/game-proxy/*`,
  `/game-zip/*` need cross-origin access
- **JWT in memory, refresh token in HTTP-only cookie** — `fp_refresh`, path
  `/api/auth`
- **Permissions cached 5min** via `PermissionCache` — maintenance mode blocks
  non-admins (503)
- **Database hot-reload** — `DatabaseService` watches flashpoint.sqlite for
  Launcher changes
- **Two download systems** — `DownloadManager` for metadata, `GameZipServer` for
  game files
- **LRU cache for ZIP handles** — prevents file descriptor exhaustion

### File Structure

```
backend/
├── src/
│   ├── routes/          # Express route handlers
│   ├── services/        # Business logic
│   ├── middleware/      # Express middleware
│   ├── game/            # Game content serving
│   │   ├── gamezipserver.ts
│   │   ├── zip-manager.ts
│   │   ├── legacy-server.ts
│   │   └── proxy-request-handler.ts
│   ├── types/           # TypeScript types
│   └── utils/           # Utility functions

frontend/
├── src/
│   ├── components/
│   │   ├── ui/          # shadcn/ui components
│   │   ├── common/      # Shared components
│   │   ├── layout/      # Layout components
│   │   └── [feature]/   # Feature-specific
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities, API client
│   ├── store/           # Zustand stores
│   ├── types/           # TypeScript types
│   └── views/           # Page components
```

---

## Common Theme Tokens

| Instead of                           | Use                     |
| ------------------------------------ | ----------------------- |
| `text-gray-900`, `text-white`        | `text-foreground`       |
| `text-gray-400`, `text-gray-500`     | `text-muted-foreground` |
| `bg-white`, `bg-gray-900`            | `bg-background`         |
| `bg-gray-100`, `bg-gray-800`         | `bg-muted`              |
| `bg-gray-50`, `bg-gray-850`          | `bg-muted/50`           |
| `border-gray-200`, `border-gray-700` | `border-border`         |
| `text-blue-600`                      | `text-primary`          |
| `bg-blue-600`                        | `bg-primary`            |
| `text-red-600`                       | `text-destructive`      |
| `bg-red-600`                         | `bg-destructive`        |
| `ring-blue-500`                      | `ring-ring`             |

---

## Permission System

### Permission Format

`resource.action` — e.g., `games.read`, `users.create`, `settings.update`

### Common Permissions

| Permission         | Description                 |
| ------------------ | --------------------------- |
| `games.read`       | View game list and details  |
| `games.play`       | Play games (not for guests) |
| `playlists.create` | Create playlists            |
| `playlists.delete` | Delete own playlists        |
| `users.read`       | View user list              |
| `users.create`     | Create new users            |
| `roles.read`       | View roles                  |
| `roles.update`     | Modify roles                |
| `settings.read`    | View settings               |
| `settings.update`  | Modify settings             |
| `activities.read`  | View activity logs          |

### Frontend Permission Check

```typescript
// Using RoleGuard component
<RoleGuard permission="users.create">
  <CreateUserButton />
</RoleGuard>

// Using hook
const { hasPermission } = useAuth();
if (hasPermission('settings.update')) {
  // Show settings form
}
```

### Backend Permission Check

```typescript
router.post(
  '/users',
  authenticate,
  requirePermission('users.create'),
  asyncHandler(async (req, res) => { ... })
);
```

---

## Error Response Format

All API errors should follow this format:

```typescript
// Success response
{
  "success": true,
  "data": { ... }
}

// Error response
{
  "success": false,
  "error": "Human-readable error message"
}

// Paginated response
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## Testing Patterns

### Backend Unit Test

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExampleService } from './ExampleService';

describe('ExampleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getById', () => {
    it('should return null for non-existent id', () => {
      const result = ExampleService.getById(999);
      expect(result).toBeNull();
    });

    it('should return example for valid id', () => {
      const result = ExampleService.getById(1);
      expect(result).toMatchObject({ id: 1 });
    });
  });
});
```

### Frontend Component Test

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExampleCard } from './ExampleCard';

describe('ExampleCard', () => {
  const mockExample = { id: '1', name: 'Test', description: 'Desc' };

  it('renders example name', () => {
    render(<ExampleCard example={mockExample} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<ExampleCard example={mockExample} onClick={onClick} />);
    await userEvent.click(screen.getByText('Test'));
    expect(onClick).toHaveBeenCalledWith(mockExample);
  });
});
```

---

## Additional Rules & Anti-Patterns

### Form Handling

- **Reset form state on dialog close** — clear errors, reset to defaults
- **Disable submit while pending** — `disabled={mutation.isPending}`
- **Show loading state on buttons** — `{isPending ? 'Saving...' : 'Save'}`
- **Handle form submission errors** — display in Alert, not just toast
- **Validate on blur and submit** — not just submit

```typescript
// Dialog with proper form handling
function CreateDialog({ isOpen, onClose, onSuccess }) {
  const mutation = useCreateExample();
  const form = useForm({ resolver: zodResolver(schema) });

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      mutation.reset();
    }
  }, [isOpen]);

  const onSubmit = async (data) => {
    try {
      await mutation.mutateAsync(data);
      onSuccess();
      onClose();
    } catch {
      // Error displayed via mutation.error
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {mutation.isError && (
        <Alert variant="destructive">
          {getErrorMessage(mutation.error)}
        </Alert>
      )}
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* fields */}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating...' : 'Create'}
        </Button>
      </form>
    </Dialog>
  );
}
```

### State Management (Zustand)

- **Use selectors** — `useStore(state => state.value)` not `useStore()`
- **Avoid storing derived state** — compute from source data
- **Use `persist` middleware carefully** — don't persist sensitive data
- **Update state immutably** — use spread or immer

```typescript
// WRONG - subscribes to entire store, re-renders on any change
const { user, theme, sidebar } = useUIStore();

// CORRECT - only re-renders when specific value changes
const user = useAuthStore((state) => state.user);
const theme = useUIStore((state) => state.theme);
```

### TanStack Query

- **Include all dependencies in queryKey** — for proper cache invalidation
- **Use `enabled` to prevent unnecessary fetches** — `enabled: !!id`
- **Invalidate related queries on mutation** — not just the direct one
- **Use `staleTime` for rarely-changing data** — reduces refetches
- **Handle loading and error states** — don't just check `data`

```typescript
// WRONG - missing dependency in queryKey
useQuery({
  queryKey: ['games'],
  queryFn: () => getGames({ platform, library }), // platform/library not in key!
});

// CORRECT
useQuery({
  queryKey: ['games', { platform, library }],
  queryFn: () => getGames({ platform, library }),
});

// Invalidate related queries
useMutation({
  mutationFn: deletePlaylist,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['playlists'] });
    queryClient.invalidateQueries({ queryKey: ['playlist-count'] }); // Related!
  },
});
```

### Accessibility

- **Add `aria-label` to icon-only buttons** — screen reader support
- **Use semantic HTML** — `<button>` not `<div onClick>`
- **Ensure keyboard navigation** — focus management in modals
- **Provide alt text for images** — meaningful descriptions
- **Use `aria-hidden` for decorative elements**

```typescript
// WRONG - no accessible name
<Button size="icon" onClick={onDelete}>
  <Trash className="h-4 w-4" />
</Button>

// CORRECT
<Button size="icon" onClick={onDelete} aria-label="Delete item">
  <Trash className="h-4 w-4" aria-hidden="true" />
</Button>
```

### Performance

- **Virtualize long lists** — use `@tanstack/react-virtual` for 100+ items
- **Lazy load heavy components** — `React.lazy()` for routes, modals
- **Debounce search inputs** — 300ms typical, use `useDebounce` hook
- **Memoize expensive computations** — `useMemo` for filtering/sorting large
  arrays
- **Avoid inline object/array literals in props** — creates new reference each
  render

```typescript
// WRONG - new object every render, breaks memoization
<GameList filters={{ platform: 'Flash' }} />

// CORRECT - stable reference
const filters = useMemo(() => ({ platform: 'Flash' }), []);
<GameList filters={filters} />

// Debounced search
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);
const { data } = useQuery({
  queryKey: ['games', debouncedSearch],
  queryFn: () => searchGames(debouncedSearch),
});
```

### Date/Time Handling

- **Store dates as ISO strings** — `new Date().toISOString()`
- **Use `date-fns` for formatting** — not manual string manipulation
- **Handle timezones explicitly** — store UTC, display local
- **Validate date inputs** — check for Invalid Date

```typescript
// WRONG - locale-dependent, ambiguous
const dateStr = new Date().toLocaleDateString();

// CORRECT - ISO format for storage/API
const isoStr = new Date().toISOString();

// CORRECT - date-fns for display
import { format, formatDistanceToNow } from 'date-fns';
const display = format(new Date(isoStr), 'PPp'); // "Apr 29, 2024, 12:00 PM"
const relative = formatDistanceToNow(new Date(isoStr), { addSuffix: true });
```

### Logging Best Practices

- **Use appropriate log levels** — debug for verbose, info for key events, warn
  for recoverable issues, error for failures
- **Include context in logs** — IDs, operation names, relevant data
- **Don't log sensitive data** — passwords, tokens, PII
- **Use structured logging** — objects not string concatenation

```typescript
// WRONG - no context, string concat
logger.info('User logged in');
logger.error('Failed: ' + error.message);

// CORRECT - structured with context
logger.info({ userId: user.id, method: 'local' }, 'User logged in');
logger.error(
  { error, gameId, operation: 'mountZip' },
  'Failed to mount game ZIP'
);

// WRONG - logs sensitive data
logger.debug({ password, token }, 'Auth attempt');

// CORRECT - omit sensitive fields
logger.debug({ username, method }, 'Auth attempt');
```

### Import Organization

Organize imports in this order (enforced by Prettier):

1. React/external libraries
2. Internal aliases (`@/`)
3. Relative imports
4. Types (with `type` keyword)

```typescript
// Correct import order
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { gamesApi } from '@/lib/api';

import { GameCard } from './GameCard';

import type { Game } from '@/types/game';
```

### Code Review Checklist

Before submitting code, verify:

- [ ] No `any` types
- [ ] No `!` non-null assertions
- [ ] All async handlers wrapped with `asyncHandler()`
- [ ] All `parseInt()` validated with `isNaN()`
- [ ] Query limits capped with `Math.min()`
- [ ] Fire-and-forget promises have `.catch()`
- [ ] Cleanup intervals have `.unref()`
- [ ] useEffect returns cleanup function where needed
- [ ] Keys are content-based, not indices
- [ ] Theme tokens used instead of hardcoded colors
- [ ] `@/` imports used instead of relative paths
- [ ] No `console.log` — use `logger`
- [ ] Forms reset on dialog close
- [ ] Loading and error states handled
- [ ] Prettier and typecheck pass

---

## Before Committing

1. **Run Prettier**: `npx prettier --write <files>`
2. **Run typecheck**: `npm run typecheck`
3. **Run build**: `npm run build`
4. **Run tests**: `npm test` (if applicable)
5. Ask user if docs need updating

---

## Environment

```bash
FLASHPOINT_PATH=D:/Flashpoint   # Required - path to Flashpoint installation
JWT_SECRET=your-secret          # Required - random string for JWT signing
DOMAIN=http://localhost:5173    # Optional - frontend URL for CORS
LOG_LEVEL=info                  # Optional - debug, info, warn, error
```

## Source References

- Flashpoint Launcher: `D:\Repositories\Community\launcher`
- Flashpoint Game Server: `D:\Repositories\Community\FlashpointGameServer`
