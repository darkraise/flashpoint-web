# Debugging Guide

Debugging Flashpoint Web across all services.

## Development Tools

### VS Code Debug Configuration

Create `.vscode/launch.json`:

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
      "console": "integratedTerminal"
    },
    {
      "name": "Frontend: Debug Chrome",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/frontend/src"
    }
  ]
}
```

### Recommended VS Code Extensions

- ESLint, Prettier, TypeScript Language Features
- Debugger for Chrome, REST Client
- SQLite Viewer, GitLens

---

## Backend Debugging

### Start with Debugger

```bash
# Method 1: VS Code - F5 or select "Backend: Debug"

# Method 2: Node Inspector
cd backend
node --inspect-brk -r tsx/cjs src/server.ts
# Navigate to chrome://inspect

# Method 3: tsx with inspect
npm run dev -- --inspect
```

### Logging

```typescript
// src/utils/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' })
  ]
});

// Set log level
export LOG_LEVEL=debug npm run dev
```

**Logging best practices:**

```typescript
logger.info('User login', { username, ip: req.ip });
logger.error('Operation failed', { error, context: additionalData });
```

### Database Debugging

```typescript
// Enable SQL logging
const db = new Database(dbPath, {
  verbose: (sql: string) => logger.debug('SQL', { sql }),
});

// Inspect query results
const result = db.prepare('SELECT * FROM game WHERE id = ?').get(gameId);
logger.debug('Query result', { sql: stmt.source, result });
```

### Testing Requests

```bash
# GET request
curl http://localhost:3100/api/games

# With auth token
curl -H "Authorization: Bearer TOKEN" http://localhost:3100/api/games

# POST request
curl -X POST -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}' \
  http://localhost:3100/api/auth/login

# Verbose output
curl -v http://localhost:3100/api/games
```

---

## Frontend Debugging

### React DevTools

- Install "React Developer Tools" extension for Chrome/Firefox
- Inspect component tree, props, state, hooks in DevTools

### React Query DevTools

```tsx
// App.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>{/* App */}</Router>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### API Call Debugging

```typescript
// lib/api.ts
api.interceptors.request.use((config) => {
  console.log('API Request', { method: config.method, url: config.url });
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log('API Response', { status: response.status });
    return response;
  },
  (error) => {
    console.error('API Error', { status: error.response?.status });
    return Promise.reject(error);
  }
);
```

### Component Debugging

```tsx
export function GameCard({ game }: GameCardProps) {
  console.log('GameCard render', { game });

  useEffect(() => {
    console.log('GameCard mounted', { gameId: game.id });
    return () => console.log('GameCard unmounted', { gameId: game.id });
  }, [game.id]);

  return <div>...</div>;
}
```

### Performance Profiling

Use Chrome DevTools:

1. Open DevTools > Performance
2. Click Record
3. Interact with application
4. Click Stop
5. Analyze flame graph

---

## Database Debugging

### SQLite Browser

- DB Browser for SQLite (free): https://sqlitebrowser.org/
- SQLiteStudio or TablePlus for GUI inspection
- VS Code: SQLite Viewer extension

### Query Testing

```bash
# Open database
sqlite3 backend/user.db

# Run queries
SELECT * FROM users;
SELECT * FROM play_sessions WHERE user_id = 'abc';

# Show schema
.schema users

# Enable formatting
.headers on
.mode column
```

### Performance Analysis

```sql
EXPLAIN QUERY PLAN
SELECT * FROM game WHERE platform = 'Flash' AND library = 'arcade';
```

### Database Locks

```bash
# Check for locks
lsof backend/user.db           # Linux/Mac
netstat -ano | findstr user.db # Windows

# Handle in code
try {
  db.prepare('INSERT INTO users ...').run(data);
} catch (error) {
  if (error.code === 'SQLITE_BUSY') {
    logger.warn('Database locked, retrying...');
    // Retry logic
  }
}
```

---

## Common Issues

### Port Already in Use

```bash
# Find process
lsof -i :3100              # Linux/Mac
netstat -ano | findstr 3100 # Windows

# Kill process
kill -9 <PID>              # Linux/Mac
taskkill /PID <PID> /F     # Windows
```

### CORS Errors

```bash
# Check CORS headers in response
curl -v http://localhost:3100/api/games | grep Access-Control

# Backend CORS config
import cors from 'cors';
app.use(cors({
  origin: process.env.DOMAIN || 'http://localhost:5173',
  credentials: true
}));
```

### Build Errors

```bash
npm run typecheck           # Check types
npm run build               # Build all
npm run clean && npm run install:all  # Clean rebuild
```

---

## Additional Resources

- [VS Code Debugging](https://code.visualstudio.com/docs/editor/debugging)
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Common Pitfalls](./common-pitfalls.md)
