# Debugging Guide

Comprehensive guide to debugging Flashpoint Web application across all services.

## Table of Contents

- [Development Tools](#development-tools)
- [Backend Debugging](#backend-debugging)
- [Frontend Debugging](#frontend-debugging)
- [Game Service Debugging](#game-service-debugging)
- [Database Debugging](#database-debugging)
- [Network Debugging](#network-debugging)
- [Performance Debugging](#performance-debugging)
- [Common Issues](#common-issues)

---

## Development Tools

### VS Code Configuration

**Recommended Extensions:**
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Debugger for Chrome
- REST Client
- SQLite Viewer
- GitLens

**VS Code Debug Configuration** (`.vscode/launch.json`):

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Backend: Debug",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Frontend: Debug Chrome",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/frontend/src",
      "sourceMapPathOverrides": {
        "webpack:///src/*": "${webRoot}/*"
      }
    },
    {
      "name": "Game Service: Debug",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/game-service",
      "console": "integratedTerminal"
    },
    {
      "name": "Backend: Attach",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "restart": true,
      "skipFiles": ["<node_internals>/**"]
    }
  ],
  "compounds": [
    {
      "name": "Full Stack: Debug",
      "configurations": [
        "Backend: Debug",
        "Frontend: Debug Chrome",
        "Game Service: Debug"
      ]
    }
  ]
}
```

### Browser DevTools

**Chrome DevTools Features:**
- Elements tab: Inspect React components
- Console: View logs and errors
- Network tab: Monitor API requests
- Application tab: Check localStorage, cookies
- Performance tab: Profile rendering
- React DevTools: Component tree and state

**Useful Console Commands:**

```javascript
// Clear console
clear()

// Copy object to clipboard
copy(object)

// Get DOM element
$('#element-id')
$$('.class-name')

// Monitor function calls
monitor(functionName)
unmonitor(functionName)

// View localStorage
localStorage

// Clear all storage
localStorage.clear()
sessionStorage.clear()
```

---

## Backend Debugging

### Starting Backend with Debugger

**Method 1: VS Code Debugger**

1. Set breakpoints in TypeScript files
2. Press F5 or select "Backend: Debug" from Run panel
3. Server starts with debugger attached

**Method 2: Node Inspector**

```bash
cd backend

# Start with inspector
node --inspect-brk -r tsx/cjs src/server.ts

# In Chrome, navigate to:
chrome://inspect
```

**Method 3: tsx with inspect flag**

```bash
cd backend
npm run dev -- --inspect

# Or with break on start
npm run dev -- --inspect-brk
```

### Logging

**Winston Logger Configuration:**

```typescript
// src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

**Logging Best Practices:**

```typescript
// Include context in logs
logger.info('User login attempt', { username, ip: req.ip });

// Log errors with stack traces
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', { error, context: additionalData });
  throw error;
}

// Use appropriate log levels
logger.debug('Detailed debug info');  // Development only
logger.info('Normal operations');     // General info
logger.warn('Warning condition');     // Potential issues
logger.error('Error occurred');       // Errors that need attention
```

**Adjust Log Level:**

```bash
# In .env
LOG_LEVEL=debug

# Or at runtime
export LOG_LEVEL=debug
npm run dev
```

### Request/Response Debugging

**Log all requests:**

```typescript
// Middleware to log requests
app.use((req, res, next) => {
  logger.debug('Incoming request', {
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
    headers: req.headers
  });
  next();
});
```

**Log responses:**

```typescript
app.use((req, res, next) => {
  const originalSend = res.send;

  res.send = function (data) {
    logger.debug('Response', {
      path: req.path,
      statusCode: res.statusCode,
      data: data
    });
    return originalSend.call(this, data);
  };

  next();
});
```

### Debugging Database Queries

**Enable SQL logging:**

```typescript
// DatabaseService.ts
const db = new Database(dbPath, {
  verbose: console.log  // Log all SQL queries
});

// Or with custom logger
const db = new Database(dbPath, {
  verbose: (sql: string) => {
    logger.debug('SQL Query', { sql });
  }
});
```

**Inspect query results:**

```typescript
const stmt = db.prepare('SELECT * FROM game WHERE id = ?');
const result = stmt.get(gameId);

logger.debug('Query result', {
  sql: stmt.source,
  params: [gameId],
  result: result
});
```

### Debugging Authentication

**Log JWT operations:**

```typescript
// utils/jwt.ts
export function verifyToken(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    logger.debug('Token verified', { userId: decoded.userId });
    return decoded;
  } catch (error) {
    logger.warn('Token verification failed', { error, token });
    throw error;
  }
}
```

**Debug middleware:**

```typescript
// middleware/auth.ts
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  logger.debug('Auth middleware', {
    path: req.path,
    hasAuthHeader: !!authHeader,
    authHeader: authHeader?.substring(0, 20) + '...'
  });

  // Rest of middleware
}
```

### Debugging Services

**Add debug points in services:**

```typescript
export class GameService {
  public getGameById(id: string): Game | null {
    logger.debug('GameService.getGameById called', { id });

    const game = this.db.prepare('SELECT * FROM game WHERE id = ?').get(id);

    logger.debug('GameService.getGameById result', {
      id,
      found: !!game,
      game: game
    });

    return game ?? null;
  }
}
```

---

## Frontend Debugging

### React DevTools

**Installation:**
- Chrome: Install "React Developer Tools" extension
- Firefox: Install "React Developer Tools" add-on

**Usage:**
1. Open browser DevTools
2. Select "Components" or "Profiler" tab
3. Inspect component tree, props, state, hooks

**Debug Component State:**

```tsx
// Add debug logging to components
export function GameCard({ game }: GameCardProps) {
  console.log('GameCard render', { game });

  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    console.log('GameCard mounted', { gameId: game.id });

    return () => {
      console.log('GameCard unmounted', { gameId: game.id });
    };
  }, [game.id]);

  return <div>...</div>;
}
```

### React Query DevTools

**Enable React Query DevTools:**

```tsx
// App.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        {/* App content */}
      </Router>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

**Features:**
- View all queries and their states
- Manually refetch queries
- Clear cache
- Inspect query data
- Track loading states

### Debugging API Calls

**Log API requests:**

```typescript
// lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log('API Request', {
      method: config.method,
      url: config.url,
      params: config.params,
      data: config.data
    });
    return config;
  },
  (error) => {
    console.error('API Request Error', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log('API Response', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('API Response Error', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data
    });
    return Promise.reject(error);
  }
);
```

### Debugging State Management

**Zustand DevTools:**

```typescript
// store/auth.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }, false, 'setUser')
    }),
    { name: 'AuthStore' }
  )
);
```

**Manual state logging:**

```typescript
export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  setUser: (user) => {
    console.log('Auth state update', { user });
    set({ user });
  }
}));
```

### Debugging Hooks

**Add debug logging to custom hooks:**

```typescript
export function useGameSelection(initialGameId?: string) {
  const [selectedGameId, setSelectedGameId] = useState(initialGameId);

  console.log('useGameSelection', {
    selectedGameId,
    initialGameId
  });

  const { data: game, isLoading, error } = useQuery({
    queryKey: ['game', selectedGameId],
    queryFn: () => fetchGame(selectedGameId!),
    enabled: !!selectedGameId
  });

  useEffect(() => {
    console.log('useGameSelection: game data updated', {
      gameId: selectedGameId,
      game,
      isLoading,
      error
    });
  }, [selectedGameId, game, isLoading, error]);

  return { selectedGameId, setSelectedGameId, game, isLoading, error };
}
```

### Debugging Renders

**React.StrictMode helps catch issues:**

```tsx
// main.tsx
import { StrictMode } from 'react';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

**Track render count:**

```tsx
import { useRef } from 'react';

export function GameCard({ game }: GameCardProps) {
  const renderCount = useRef(0);
  renderCount.current++;

  console.log(`GameCard rendered ${renderCount.current} times`, { game });

  return <div>...</div>;
}
```

**Use React Profiler:**

```tsx
import { Profiler, ProfilerOnRenderCallback } from 'react';

const onRenderCallback: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  console.log('Profiler', {
    id,
    phase,
    actualDuration,
    baseDuration
  });
};

export function GameList() {
  return (
    <Profiler id="GameList" onRender={onRenderCallback}>
      {/* Component tree */}
    </Profiler>
  );
}
```

---

## Game Service Debugging

### Enabling Debug Logging

```bash
# In game-service/.env
LOG_LEVEL=debug

# Restart service
cd game-service
npm run dev
```

### Debugging Proxy Requests

**Log proxy requests:**

```typescript
// servers/proxy-server.ts
app.use((req, res, next) => {
  logger.debug('Proxy request', {
    url: req.url,
    method: req.method,
    headers: req.headers,
    ip: req.ip
  });
  next();
});
```

**Debug file resolution:**

```typescript
// handlers/file-handler.ts
export function resolveFile(requestPath: string): string | null {
  const paths = [
    join(HTDOCS_PATH, requestPath),
    join(GAMES_PATH, requestPath),
    // ... other paths
  ];

  logger.debug('Resolving file', { requestPath, searchPaths: paths });

  for (const path of paths) {
    if (existsSync(path)) {
      logger.debug('File found', { requestPath, resolvedPath: path });
      return path;
    }
  }

  logger.debug('File not found', { requestPath });
  return null;
}
```

### Debugging ZIP File Access

**Log ZIP operations:**

```typescript
// services/zip-manager.ts
export class ZipManager {
  public getFileFromZip(zipPath: string, filePath: string): Buffer | null {
    logger.debug('Getting file from ZIP', { zipPath, filePath });

    try {
      const zip = new StreamZip.async({ file: zipPath });
      const data = await zip.entryData(filePath);

      logger.debug('File extracted from ZIP', {
        zipPath,
        filePath,
        size: data.length
      });

      return data;
    } catch (error) {
      logger.error('Failed to extract from ZIP', {
        zipPath,
        filePath,
        error
      });
      return null;
    }
  }
}
```

---

## Database Debugging

### SQLite Browser

**Desktop Tools:**
- DB Browser for SQLite (free)
- SQLiteStudio
- TablePlus

**VS Code Extensions:**
- SQLite Viewer
- SQLite

### Query Debugging

**Test queries directly:**

```bash
# Open database in SQLite CLI
sqlite3 backend/user.db

# Run queries
SELECT * FROM users;
SELECT * FROM play_sessions WHERE user_id = 'abc';

# Show table schema
.schema users

# Enable column headers
.headers on

# Enable column mode
.mode column

# Exit
.quit
```

**Analyze query performance:**

```sql
EXPLAIN QUERY PLAN
SELECT * FROM game
WHERE platform = 'Flash'
AND library = 'arcade';
```

### Database Locks

**Check for locks:**

```bash
# Linux/Mac
lsof backend/user.db

# Windows
# Use Process Explorer to find processes with file handle
```

**Handle lock errors in code:**

```typescript
try {
  const result = db.prepare('INSERT INTO users ...').run(data);
} catch (error) {
  if (error.code === 'SQLITE_BUSY') {
    logger.warn('Database locked, retrying...', { error });
    // Retry logic
  } else {
    throw error;
  }
}
```

---

## Network Debugging

### Chrome Network Tab

**Filter requests:**
- XHR/Fetch: API calls only
- JS/CSS: Asset loading
- All: Complete picture

**Inspect request:**
- Headers: Authorization, Content-Type
- Payload: Request body
- Preview: Response data
- Timing: Performance metrics

### Debugging CORS Issues

**Check CORS headers in response:**

```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
```

**Backend CORS configuration:**

```typescript
// server.ts
import cors from 'cors';

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  exposedHeaders: ['X-Total-Count']
}));

// Debug CORS
app.use((req, res, next) => {
  console.log('CORS check', {
    origin: req.headers.origin,
    method: req.method,
    path: req.path
  });
  next();
});
```

### Using curl for API Testing

```bash
# GET request
curl http://localhost:3100/api/games

# GET with auth
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3100/api/games

# POST request
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}' \
  http://localhost:3100/api/auth/login

# Debug with verbose output
curl -v http://localhost:3100/api/games

# Save response to file
curl -o response.json http://localhost:3100/api/games
```

### Using HTTPie

```bash
# Install
npm install -g httpie

# GET request
http GET http://localhost:3100/api/games

# POST with auth
http POST http://localhost:3100/api/auth/login \
  username=test \
  password=test

# With auth token
http GET http://localhost:3100/api/games \
  Authorization:"Bearer TOKEN"
```

---

## Performance Debugging

### Backend Performance

**Measure request duration:**

```typescript
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`
    });

    if (duration > 1000) {
      logger.warn('Slow request detected', {
        path: req.path,
        duration: `${duration}ms`
      });
    }
  });

  next();
});
```

**Profile database queries:**

```typescript
function profileQuery<T>(name: string, query: () => T): T {
  const start = Date.now();
  const result = query();
  const duration = Date.now() - start;

  logger.debug('Query performance', { name, duration: `${duration}ms` });

  return result;
}

// Usage
const games = profileQuery('searchGames', () =>
  db.prepare('SELECT * FROM game WHERE title LIKE ?').all(`%${query}%`)
);
```

### Frontend Performance

**React Profiler:**

```tsx
import { Profiler } from 'react';

<Profiler id="GameList" onRender={(id, phase, actualDuration) => {
  console.log(`${id} ${phase}: ${actualDuration}ms`);
}}>
  <GameList />
</Profiler>
```

**Chrome Performance Tab:**
1. Open DevTools > Performance
2. Click Record
3. Interact with application
4. Click Stop
5. Analyze flame graph for slow operations

**Lighthouse Audit:**
1. Open DevTools > Lighthouse
2. Select categories (Performance, Accessibility, etc.)
3. Click "Generate report"
4. Review recommendations

---

## Common Issues

See [Common Pitfalls](./common-pitfalls.md) for detailed troubleshooting of frequent issues.

---

## Additional Resources

- [VS Code Debugging Docs](https://code.visualstudio.com/docs/editor/debugging)
- [Chrome DevTools Guide](https://developer.chrome.com/docs/devtools/)
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Winston Logger Docs](https://github.com/winstonjs/winston)
- [Common Pitfalls](./common-pitfalls.md)
