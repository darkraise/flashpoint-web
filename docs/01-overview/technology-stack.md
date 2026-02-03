# Technology Stack

## Introduction

Flashpoint Web is built with modern, production-ready technologies chosen for their performance, developer experience, and ecosystem maturity. This document provides a comprehensive overview of all technologies used across the three services, including rationale for each choice.

## Stack Overview

### Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20+ | JavaScript runtime environment |
| Express | 4.18 | Web application framework |
| TypeScript | 5.4 | Type-safe JavaScript |
| BetterSqlite3 | 12.6 | SQLite database driver |
| JWT | 9.0 | Authentication tokens |
| bcrypt | 6.0 | Password hashing |
| Winston | 3.11 | Logging framework |
| Zod | 3.22 | Schema validation |

### Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3 | UI library |
| TypeScript | 5.4 | Type-safe JavaScript |
| Vite | 5.2 | Build tool and dev server |
| React Router | 6.22 | Client-side routing |
| TanStack Query | 5.28 | Server state management |
| Zustand | 4.5 | Client state management |
| Tailwind CSS | 3.4 | Utility-first CSS framework |
| Shadcn UI | Latest | Component library |
| Ruffle | 0.2.0-nightly | Flash emulator |

### Game Service Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20+ | JavaScript runtime |
| Express | 4.18 | HTTP server framework |
| TypeScript | 5.3 | Type safety |
| node-stream-zip | 1.15 | ZIP archive streaming |
| Axios | 1.6 | HTTP client for CDN |
| Winston | 3.11 | Logging |
| Zod | 4.3 | Schema validation |

> **Note:** Game Service uses TypeScript 5.3 while Backend/Frontend use 5.4. This is intentional and both versions are compatible.

### Development Tools

| Tool | Purpose |
|------|---------|
| ESLint | Code linting and style enforcement |
| TypeScript Compiler | Type checking and compilation |
| Vitest | Unit testing framework |
| tsx | TypeScript execution and hot reload |
| Concurrently | Run multiple dev servers |
| Docker | Containerization |

---

## Backend Stack Deep Dive

### Node.js (v20+)

**What it is**: JavaScript runtime built on Chrome's V8 engine

**Why we chose it**:
- **Ecosystem Alignment**: Same language as frontend (JavaScript/TypeScript)
- **Async I/O**: Excellent for handling concurrent API requests
- **Package Ecosystem**: npm has packages for everything we need
- **Performance**: V8 engine provides great JavaScript execution speed
- **Community**: Large community with extensive resources

**Use cases in our project**:
- REST API server
- Database operations
- File watching (flashpoint.sqlite hot-reload)
- Background jobs (abandoned session cleanup)

**Configuration**:
```json
{
  "engines": {
    "node": ">=20.0.0"
  }
}
```

### Express (v4.18)

**What it is**: Minimal and flexible Node.js web application framework

**Why we chose it**:
- **Maturity**: Battle-tested in production for 10+ years
- **Middleware Pattern**: Perfect for auth, logging, CORS
- **Ecosystem**: Huge collection of compatible middleware
- **Simplicity**: Easy to understand and maintain
- **Performance**: Fast routing with minimal overhead

**Use cases in our project**:
- Route handling (`/api/games`, `/api/auth/login`)
- Middleware stack (auth, RBAC, rate limiting)
- Request parsing (JSON, URL-encoded)
- Error handling

**Key middleware used**:
```typescript
// CORS for frontend origin
app.use(cors({ origin: process.env.DOMAIN }));

// Security headers
app.use(helmet());

// Request compression
app.use(compression());

// Rate limiting on auth endpoints
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // 5 attempts
}));
```

### TypeScript (v5.4)

**What it is**: Typed superset of JavaScript

**Why we chose it**:
- **Type Safety**: Catch errors at compile time, not runtime
- **IDE Support**: Excellent autocomplete and refactoring
- **Code Quality**: Enforces better code structure
- **Documentation**: Types serve as inline documentation
- **Maintainability**: Easier to refactor large codebases

**Use cases in our project**:
- Type definitions for database models
- API request/response types
- Service layer interfaces
- Utility type safety

**Example type definitions**:
```typescript
// Game type from database
interface Game {
  id: string;
  title: string;
  platform: string;
  developer?: string;
  publisher?: string;
  releaseDate?: string;
  library: string;
}

// API response type
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

**Configuration highlights** (`tsconfig.json`):
- Strict mode enabled
- ES2022 target
- Node.js module resolution
- Source maps for debugging

### BetterSqlite3 (v12.6)

**What it is**: Fastest and simplest SQLite3 library for Node.js

**Why we chose it over alternatives**:
- **Synchronous API**: Simpler code than async wrappers
- **Performance**: 2-3x faster than async alternatives
- **Reliability**: Fewer race conditions with sync operations
- **Prepared Statements**: Compiled once, executed many times
- **Transaction Support**: ACID guarantees

**Alternatives considered**:
- `sqlite3` (async): More complex error handling
- `sql.js` (WebAssembly): Slower, no native performance
- PostgreSQL: Overkill for self-hosted app

**Use cases in our project**:
```typescript
// Read-only connection to flashpoint.sqlite
const fpDb = new Database(FLASHPOINT_DB_PATH, { readonly: true });

// Read-write connection to user.db
const userDb = new Database(USER_DB_PATH);

// Prepared statement for game search
const stmt = fpDb.prepare(`
  SELECT * FROM game
  WHERE title LIKE ?
  AND platform = ?
`);

const games = stmt.all(`%${search}%`, platform);
```

**Benefits**:
- No separate database server required
- Perfect for self-hosted applications
- Flashpoint compatibility (uses same format)
- Fast read-heavy workloads

**Limitations**:
- Single writer at a time
- Not ideal for high-concurrency writes
- File-based (no network clustering)

### JWT (jsonwebtoken v9.0)

**What it is**: JSON Web Token implementation for authentication

**Why we chose it**:
- **Stateless**: No server-side session storage required
- **Scalable**: Works across multiple backend instances
- **Standard**: RFC 7519 industry standard
- **Flexible**: Embed user data and permissions in token
- **Secure**: Signed with secret, optionally encrypted

**Use cases in our project**:
```typescript
// Generate access token (1 hour expiry)
const accessToken = jwt.sign(
  {
    userId: user.id,
    username: user.username,
    permissions: user.permissions
  },
  JWT_SECRET,
  { expiresIn: '1h' }
);

// Generate refresh token (7 days expiry)
const refreshToken = jwt.sign(
  { userId: user.id },
  JWT_REFRESH_SECRET,
  { expiresIn: '7d' }
);
```

**Security considerations**:
- Secret stored in environment variable
- Short-lived access tokens (1 hour)
- Long-lived refresh tokens (7 days)
- Refresh token rotation on use

### bcrypt (v6.0)

**What it is**: Password hashing library based on Blowfish cipher

**Why we chose it**:
- **Security**: Designed specifically for passwords
- **Slow by Design**: Resistant to brute-force attacks
- **Salt Included**: Automatic salt generation and storage
- **Adaptive**: Cost factor increases as hardware improves

**Alternatives considered**:
- `scrypt`: More complex configuration
- `argon2`: Newer but more dependencies
- `pbkdf2`: Lower security margins

**Use cases in our project**:
```typescript
// Hash password on registration
const hashedPassword = await bcrypt.hash(password, 10);

// Verify password on login
const isValid = await bcrypt.compare(password, user.hashedPassword);
```

**Configuration**:
- Cost factor: 10 (2^10 iterations)
- Balances security with performance
- ~100ms hash time on modern hardware

### Winston (v3.11)

**What it is**: Versatile logging library for Node.js

**Why we chose it**:
- **Flexible**: Multiple transports (console, file, HTTP)
- **Structured Logging**: JSON format support
- **Log Levels**: error, warn, info, debug
- **Performance**: Async logging doesn't block
- **Ecosystem**: Integrates with monitoring tools

**Use cases in our project**:
```typescript
// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Usage
logger.info('User logged in', { userId, username });
logger.error('Database error', { error: err.message });
```

### Zod (v3.22)

**What it is**: TypeScript-first schema validation library

**Why we chose it**:
- **Type Inference**: Automatic TypeScript type generation
- **Composable**: Build complex schemas from simple ones
- **Error Messages**: Detailed validation errors
- **Runtime Safety**: Validates external input at runtime

**Use cases in our project**:
```typescript
// Define schema
const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8)
});

// Validate and infer type
const result = loginSchema.safeParse(req.body);
if (!result.success) {
  return res.status(400).json({ errors: result.error.errors });
}

// result.data is now type-safe
const { username, password } = result.data;
```

---

## Frontend Stack Deep Dive

### React (v18.3)

**What it is**: JavaScript library for building user interfaces

**Why we chose it**:
- **Component Model**: Reusable, composable UI components
- **Ecosystem**: Largest React library ecosystem
- **Performance**: Virtual DOM and reconciliation
- **Developer Experience**: Great tooling and DevTools
- **Community**: Massive community support

**React 18 features we use**:
- **Automatic Batching**: Multiple state updates batched
- **Transitions**: Smooth UI updates without blocking
- **Suspense**: Better async rendering (future)

**Use cases in our project**:
```typescript
// Component example
function GameCard({ game }: { game: Game }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{game.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{game.platform}</p>
        <p>{game.developer}</p>
      </CardContent>
    </Card>
  );
}
```

### Vite (v5.2)

**What it is**: Next-generation frontend build tool

**Why we chose it over alternatives**:
- **Dev Server Speed**: Instant HMR via native ES modules
- **Build Performance**: esbuild for fast production builds
- **Simple Config**: Less complex than Webpack
- **Modern**: Built for modern browsers
- **Plugin Ecosystem**: Growing collection of plugins

**Alternatives considered**:
- Create React App: Slower HMR, less flexible
- Webpack: More complex configuration
- Parcel: Less ecosystem support

**Features we use**:
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3100',
      '/proxy': 'http://localhost:22500'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router': ['react-router-dom'],
          'ui': ['@radix-ui/react-dialog', '@radix-ui/react-select']
        }
      }
    }
  }
});
```

### TanStack Query (v5.28)

**What it is**: Powerful data synchronization library for React

**Why we chose it**:
- **Automatic Caching**: Smart cache management
- **Background Refetching**: Keep data fresh
- **Loading States**: Built-in loading/error states
- **Devtools**: Excellent debugging experience
- **TypeScript**: First-class TypeScript support

**Alternatives considered**:
- Redux Toolkit Query: More boilerplate
- SWR: Less features, simpler
- Apollo Client: GraphQL-specific

**Use cases in our project**:
```typescript
// Fetch games with automatic caching
function useGames(filters: GameFilters) {
  return useQuery({
    queryKey: ['games', filters],
    queryFn: () => api.getGames(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Component usage
function GameList() {
  const { data, isLoading, error } = useGames({ platform: 'Flash' });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  return <GameGrid games={data.games} />;
}
```

**Benefits**:
- Eliminates 90% of data fetching boilerplate
- Automatic request deduplication
- Optimistic updates
- Infinite scroll support

### Zustand (v4.5)

**What it is**: Small, fast state management library

**Why we chose it over alternatives**:
- **Simplicity**: Minimal boilerplate
- **Performance**: Optimized re-renders
- **TypeScript**: Excellent type inference
- **DevTools**: Redux DevTools compatible
- **Size**: Only 1KB gzipped

**Alternatives considered**:
- Redux: Too much boilerplate
- MobX: Requires decorators
- Context API: Performance issues with frequent updates

**Use cases in our project**:
```typescript
// Auth store
interface AuthState {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  login: (token, user) => {
    localStorage.setItem('token', token);
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null });
  },
}));

// Component usage
function Header() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return user ? <UserMenu user={user} onLogout={logout} /> : <LoginButton />;
}
```

**State managed in Zustand**:
- Authentication state
- Theme preferences
- UI state (sidebar, view mode)
- Filter preferences

### Tailwind CSS (v3.4)

**What it is**: Utility-first CSS framework

**Why we chose it**:
- **Productivity**: Build UIs without writing custom CSS
- **Consistency**: Design system baked in
- **Performance**: Purges unused CSS
- **Responsive**: Mobile-first breakpoints
- **Customization**: Fully configurable theme

**Alternatives considered**:
- Styled Components: Runtime overhead
- CSS Modules: More boilerplate
- Bootstrap: Less customizable

**Configuration**:
```typescript
// tailwind.config.js
export default {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Shadcn UI color system
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
```

### Shadcn UI (Latest)

**What it is**: Collection of re-usable components built with Radix UI and Tailwind

**Why we chose it**:
- **Customizable**: Copy components to your project
- **Accessible**: Built on Radix UI primitives
- **Consistent**: Pre-designed component system
- **No Runtime**: Just code you own
- **TypeScript**: Fully typed components

**Alternatives considered**:
- Material UI: Less customizable
- Ant Design: Heavy bundle size
- Chakra UI: Runtime style generation

**Components we use**:
- Button, Card, Dialog, DropdownMenu
- Input, Select, Checkbox, Switch
- Toast, Tooltip, Popover
- Table, Pagination, Scroll Area

**Example**:
```typescript
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

function GameActions({ game }: { game: Game }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Details</Button>
      </DialogTrigger>
      <DialogContent>
        <GameDetails game={game} />
      </DialogContent>
    </Dialog>
  );
}
```

### Ruffle (v0.2.0-nightly)

**What it is**: Flash Player emulator written in Rust, compiled to WebAssembly

**Why we need it**:
- **Adobe Flash EOL**: Flash Player no longer supported
- **Browser Support**: Runs in modern browsers without plugin
- **Security**: Sandboxed WebAssembly execution
- **Open Source**: Community-driven preservation

**Integration in our project**:
```typescript
// Ruffle player component
function RufflePlayer({ gameUrl }: { gameUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ruffle = window.RufflePlayer.newest();
    const player = ruffle.createPlayer();

    containerRef.current.appendChild(player);

    player.load({
      url: gameUrl,
      parameters: '?scale=showall',
      allowScriptAccess: true,
    });

    return () => player.remove();
  }, [gameUrl]);

  return <div ref={containerRef} className="ruffle-container" />;
}
```

**Limitations**:
- Not 100% Flash compatible
- Some ActionScript 3 features unsupported
- Performance slower than native Flash Player

**Deployment**:
- Files copied to `public/ruffle/` via postinstall script
- Loaded from CDN in production for better caching

---

## Game Service Stack

### node-stream-zip (v1.15)

**What it is**: Zero-dependency ZIP file streaming library

**Why we chose it**:
- **Streaming**: No extraction required
- **Memory Efficient**: Random access to ZIP contents
- **Fast**: Direct file reads from archive
- **Simple API**: Easy to use

**Alternatives considered**:
- `adm-zip`: Loads entire archive to memory
- `jszip`: Async API complexity
- `yauzl`: More complex API

**Use cases in our project**:
```typescript
import StreamZip from 'node-stream-zip';

// Open ZIP archive
const zip = new StreamZip.async({
  file: '/path/to/game.zip'
});

// Stream file from ZIP
app.get('/gamezip/:gameId/*', async (req, res) => {
  const filePath = req.params[0];

  const entry = await zip.entry(filePath);
  if (!entry) return res.status(404).send('Not found');

  res.setHeader('Content-Type', getMimeType(filePath));
  res.setHeader('Content-Length', entry.size);

  const stream = await zip.stream(entry.name);
  stream.pipe(res);
});
```

**Benefits**:
- Games stay compressed on disk
- Instant file serving (no extraction wait)
- Scales to thousands of ZIP files

---

## Development Tools

### ESLint (v8.57)

**Purpose**: Code linting and style enforcement

**Configuration**:
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### tsx (v4.7)

**Purpose**: TypeScript execution and hot reload in development

**Why we use it**:
- Faster than `ts-node`
- Built on esbuild
- Better watch mode

**Usage**:
```bash
tsx watch src/server.ts  # Backend dev server
```

### Vitest (v1.3)

**Purpose**: Unit testing framework

**Why we chose it**:
- Vite integration (shares config)
- Fast test execution
- Compatible with Jest API
- TypeScript support

**Example test**:
```typescript
import { describe, it, expect } from 'vitest';
import { GameService } from './GameService';

describe('GameService', () => {
  it('should search games by title', () => {
    const games = GameService.search({ title: 'Mario' });
    expect(games).toHaveLength(10);
    expect(games[0].title).toContain('Mario');
  });
});
```

---

## Technology Decision Matrix

### Decision Criteria

For each technology, we evaluated:

1. **Performance**: Runtime and build performance
2. **Developer Experience**: Ease of use, documentation
3. **Ecosystem**: Available libraries and tools
4. **Type Safety**: TypeScript support quality
5. **Community**: Community size and activity
6. **Maintenance**: Active development and updates
7. **Bundle Size**: Impact on final application size
8. **Learning Curve**: Time to productivity

### Key Technology Decisions

#### React vs Vue vs Svelte

| Criteria | React | Vue | Svelte |
|----------|-------|-----|--------|
| Ecosystem | Excellent | Good | Growing |
| TypeScript | Excellent | Good | Good |
| Community | Largest | Large | Smaller |
| Learning Curve | Moderate | Easy | Easy |
| Bundle Size | Larger | Medium | Smallest |
| **Decision** | **✓ Chosen** | ✗ | ✗ |

**Reason**: Largest ecosystem (Shadcn UI, TanStack Query)

#### TanStack Query vs Redux Toolkit Query vs SWR

| Criteria | TanStack | RTK Query | SWR |
|----------|----------|-----------|-----|
| Features | Most | Many | Fewer |
| TypeScript | Excellent | Good | Good |
| DevTools | Excellent | Excellent | Basic |
| Boilerplate | Low | Medium | Lowest |
| Caching | Advanced | Advanced | Basic |
| **Decision** | **✓ Chosen** | ✗ | ✗ |

**Reason**: Best balance of features and DX

#### SQLite vs PostgreSQL vs MongoDB

| Criteria | SQLite | PostgreSQL | MongoDB |
|----------|--------|------------|---------|
| Setup | Embedded | Server | Server |
| Scaling | Read-heavy | Excellent | Excellent |
| Flashpoint | Native | Migration | Migration |
| Complexity | Lowest | Medium | Medium |
| **Decision** | **✓ Chosen** | ✗ | ✗ |

**Reason**: Flashpoint compatibility, self-hosted simplicity

---

## Package Dependencies Summary

### Backend Production Dependencies

```json
{
  "axios": "^1.13.2",          // HTTP client
  "bcrypt": "^6.0.0",          // Password hashing
  "better-sqlite3": "^12.6.0", // SQLite driver
  "compression": "^1.7.4",     // Response compression
  "cors": "^2.8.5",            // CORS middleware
  "dotenv": "^16.4.5",         // Environment variables
  "express": "^4.18.3",        // Web framework
  "express-rate-limit": "^7.1.5", // Rate limiting
  "helmet": "^7.1.0",          // Security headers
  "jsonwebtoken": "^9.0.3",    // JWT tokens
  "winston": "^3.11.0",        // Logging
  "zod": "^3.22.4"             // Schema validation
}
```

### Frontend Production Dependencies

```json
{
  "@ruffle-rs/ruffle": "^0.2.0-nightly",
  "@tanstack/react-query": "^5.28.9",
  "@tanstack/react-table": "^8.21.3",
  "@tanstack/react-virtual": "^3.2.0",
  "axios": "^1.6.8",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.22.3",
  "zustand": "^4.5.2",
  "lucide-react": "^0.358.0",
  "tailwindcss": "^3.4.1"
}
```

### Game Service Production Dependencies

```json
{
  "express": "^4.18.3",
  "node-stream-zip": "^1.15.0",
  "winston": "^3.11.0",
  "cors": "^2.8.5",
  "axios": "^1.6.8",
  "dotenv": "^16.4.5"
}
```

---

## Performance Characteristics

### Bundle Sizes

**Frontend (Production Build)**:
- Main bundle: ~150 KB (gzipped)
- React vendor: ~130 KB (gzipped)
- Shadcn UI: ~50 KB (gzipped)
- Ruffle: ~2.5 MB (loaded separately)
- **Total first load**: ~330 KB + Ruffle

**Backend**:
- Docker image: ~200 MB
- Runtime memory: ~50-100 MB
- Database: 100 MB (user.db), 4 GB (flashpoint.sqlite)

**Game Service**:
- Docker image: ~150 MB
- Runtime memory: ~30-50 MB per instance

### Runtime Performance

**Backend API**:
- Average response time: <50ms
- Game search: <100ms (with filters)
- Database queries: <10ms (indexed)

**Frontend**:
- First contentful paint: <1s
- Time to interactive: <2s
- Game grid render: <100ms (virtualized)

**Game Service**:
- File streaming: Wire speed
- ZIP file access: <50ms
- CDN fallback: 200-500ms (network dependent)

---

## Version Compatibility

### Node.js Versions

- **Required**: Node.js 20+
- **Recommended**: Node.js 20 LTS
- **Tested**: Node.js 20.11.0

### Browser Support

**Frontend**:
- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions
- Opera: Last 2 versions

**Required features**:
- ES2020 support
- WebAssembly (for Ruffle)
- CSS Grid and Flexbox
- localStorage

---

## Future Technology Considerations

### Potential Upgrades

1. **React 19**: Automatic memoization, Server Components
2. **Vite 6**: Improved cold start times
3. **TanStack Query v6**: Enhanced cache management
4. **PostgreSQL**: Better concurrent write performance
5. **Redis**: Distributed caching layer

### Experimental Features

1. **WebSocket**: Real-time play session updates
2. **PWA**: Offline game browsing
3. **WebRTC**: Peer-to-peer game sharing
4. **WASM**: Port critical backend logic to Rust

---

## Related Documentation

- [Architecture Overview](architecture-overview.md) - System design and service communication
- [Getting Started](getting-started.md) - Quick setup guide
- [Backend Guide](../02-backend/overview.md) - Backend development details
- [Frontend Guide](../03-frontend/overview.md) - Frontend development details
- [Deployment Guide](../07-deployment/overview.md) - Production deployment

---

## Summary

Flashpoint Web's technology stack is carefully chosen for:

- **Developer Experience**: TypeScript, Vite, TanStack Query reduce boilerplate
- **Performance**: Vite HMR, BetterSqlite3, TanStack Query caching
- **Type Safety**: TypeScript across all services prevents runtime errors
- **Maintainability**: Well-established technologies with active communities
- **Self-Hosting**: SQLite, Node.js enable simple deployment

The stack balances modern best practices with pragmatic choices for a self-hosted game archive application.
