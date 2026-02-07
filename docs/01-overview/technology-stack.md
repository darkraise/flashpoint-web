# Technology Stack

Modern, production-ready technologies chosen for performance, developer
experience, and ecosystem maturity.

## Stack Overview

### Backend Technologies

| Technology    | Version | Purpose                |
| ------------- | ------- | ---------------------- |
| Node.js       | 20+     | JavaScript runtime     |
| Express       | 4.18    | Web framework          |
| TypeScript    | 5.4     | Type-safe JavaScript   |
| BetterSqlite3 | 12.6    | SQLite database driver |
| JWT           | 9.0     | Authentication tokens  |
| bcrypt        | 6.0     | Password hashing       |
| Winston       | 3.11    | Logging                |

### Frontend Technologies

| Technology     | Version | Purpose                   |
| -------------- | ------- | ------------------------- |
| React          | 18.3    | UI library                |
| TypeScript     | 5.4     | Type-safe JavaScript      |
| Vite           | 5.2     | Build tool and dev server |
| React Router   | 6.22    | Client-side routing       |
| TanStack Query | 5.28    | Server state management   |
| Zustand        | 4.5     | Client state management   |
| Tailwind CSS   | 3.4     | Utility-first CSS         |
| Shadcn UI      | Latest  | Component library         |
| Ruffle         | 0.2.0   | Flash emulator            |

---

## Backend Stack

### Node.js (v20+)

JavaScript runtime built on Chrome's V8 engine.

**Why chosen:**

- Same language as frontend (JavaScript/TypeScript)
- Excellent async I/O for concurrent requests
- Large npm ecosystem
- Great performance

**Use cases:**

- REST API server
- Database operations
- File watching (hot-reload)
- Background jobs
- Game file serving and proxying
- ZIP archive mounting and streaming

### Express (v4.18)

Minimal and flexible web application framework.

**Why chosen:**

- Mature and battle-tested
- Perfect middleware pattern
- Large ecosystem
- Fast routing

**Key middleware:**

```typescript
app.use(cors({ origin: process.env.DOMAIN }));
app.use(helmet()); // Security headers
app.use(compression()); // Response compression
app.use('/api/auth', rateLimit({ max: 5 })); // Rate limiting
```

### TypeScript (v5.4)

Typed superset of JavaScript.

**Why chosen:**

- Type safety catches errors at compile time
- Excellent IDE support
- Code quality enforcement
- Self-documenting code

### BetterSqlite3 (v12.6)

Fastest SQLite3 library for Node.js.

**Why chosen over alternatives:**

- Synchronous API (simpler than async wrappers)
- 2-3x faster than async alternatives
- Fewer race conditions
- Perfect for SQLite workloads

**Use:**

```typescript
// Read-only connection to flashpoint.sqlite
const fpDb = new Database(config.flashpointDbPath, { readonly: true });

// Read-write connection to user.db
const userDb = new Database(USER_DB_PATH);

// Prepared statement
const stmt = fpDb.prepare(
  'SELECT * FROM game WHERE title LIKE ? AND platform = ?'
);
const games = stmt.all(`%${search}%`, platform);
```

### node-stream-zip (v1.15)

Zero-dependency ZIP file streaming library integrated into backend.

**Why chosen:**

- Streaming (no extraction required)
- Memory efficient random access
- Fast direct reads
- Simple API

**Use:**

```typescript
const zip = new StreamZip.async({ file: '/path/to/game.zip' });
const entry = await zip.entry(filePath);
const stream = await zip.stream(entry.name);
stream.pipe(res);
```

### JWT & bcrypt

**JWT**: Stateless authentication, works across instances, mobile-friendly.

**bcrypt**: Designed for passwords, slow by design (resistant to brute-force),
automatic salt generation.

---

## Frontend Stack

### React (v18.3)

JavaScript library for building user interfaces.

**Why chosen:**

- Component model - reusable, composable UI
- Largest React library ecosystem
- Virtual DOM for performance
- Excellent tooling

**React 18 features:**

- Automatic batching
- Concurrent rendering
- Transitions for smooth updates

### Vite (v5.2)

Next-generation frontend build tool.

**Why chosen over alternatives:**

- Instant HMR via native ES modules
- Fast production builds (esbuild)
- Simple configuration
- Modern browser focus

### TanStack Query (v5.28)

Powerful data synchronization library.

**Why chosen:**

- Smart cache management
- Background refetching
- Built-in loading/error states
- Excellent DevTools

**Usage:**

```typescript
function useGames(filters: GameFilters) {
  return useQuery({
    queryKey: ['games', filters],
    queryFn: () => api.getGames(filters),
    staleTime: 5 * 60 * 1000,
    cacheTime: 30 * 60 * 1000,
  });
}
```

### Zustand (v4.5)

Small, fast state management library.

**Why chosen:**

- Minimal boilerplate
- Optimized re-renders
- TypeScript-first
- Redux DevTools compatible
- Only 1KB gzipped

**Usage:**

```typescript
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
```

### Tailwind CSS (v3.4)

Utility-first CSS framework.

**Why chosen:**

- Build UIs without custom CSS
- Consistent design system
- Automatic CSS purging
- Mobile-first responsive
- Fully customizable theme

### Shadcn UI

Re-usable components built with Radix UI and Tailwind.

**Why chosen:**

- Copy components to your project
- Built on accessible Radix primitives
- Pre-designed component system
- Just code you own
- Fully typed

### Ruffle (v0.2.0)

Flash Player emulator written in Rust, compiled to WebAssembly.

**Why needed:**

- Adobe Flash reached EOL
- Runs in modern browsers
- Sandboxed WebAssembly execution
- Community-driven preservation

---

---

## Development Tools

### ESLint (v8.57)

Code linting and style enforcement.

### tsx (v4.7)

TypeScript execution and hot reload (faster than ts-node).

### Vitest (v1.3)

Unit testing framework with Vite integration.

---

## Technology Decision Matrix

### Decision Criteria

For each technology, evaluated:

1. Performance
2. Developer experience
3. Ecosystem
4. Type safety
5. Community
6. Maintenance
7. Bundle size
8. Learning curve

### Key Decisions

#### React vs Vue vs Svelte

| Criteria     | React        | Vue    | Svelte   |
| ------------ | ------------ | ------ | -------- |
| Ecosystem    | Excellent    | Good   | Growing  |
| TypeScript   | Excellent    | Good   | Good     |
| Community    | Largest      | Large  | Smaller  |
| Bundle Size  | Larger       | Medium | Smallest |
| **Decision** | **✓ Chosen** | ✗      | ✗        |

**Reason**: Largest ecosystem (Shadcn UI, TanStack Query)

#### TanStack Query vs Redux Toolkit Query vs SWR

| Criteria     | TanStack     | RTK Query | SWR    |
| ------------ | ------------ | --------- | ------ |
| Features     | Most         | Many      | Fewer  |
| TypeScript   | Excellent    | Good      | Good   |
| Boilerplate  | Low          | Medium    | Lowest |
| **Decision** | **✓ Chosen** | ✗         | ✗      |

**Reason**: Best balance of features and DX

#### SQLite vs PostgreSQL vs MongoDB

| Criteria     | SQLite       | PostgreSQL | MongoDB   |
| ------------ | ------------ | ---------- | --------- |
| Setup        | Embedded     | Server     | Server    |
| Flashpoint   | Native       | Migration  | Migration |
| Complexity   | Lowest       | Medium     | Medium    |
| **Decision** | **✓ Chosen** | ✗          | ✗         |

**Reason**: Flashpoint compatibility, self-hosted simplicity

---

## Package Dependencies

### Backend Production

```json
{
  "axios": "^1.13.2",
  "bcrypt": "^6.0.0",
  "better-sqlite3": "^12.6.0",
  "express": "^4.18.3",
  "jsonwebtoken": "^9.0.3",
  "winston": "^3.11.0"
}
```

### Frontend Production

```json
{
  "@ruffle-rs/ruffle": "^0.2.0-nightly",
  "@tanstack/react-query": "^5.28.9",
  "react": "^18.3.1",
  "react-router-dom": "^6.22.3",
  "zustand": "^4.5.2",
  "tailwindcss": "^3.4.1"
}
```

---

## Performance Characteristics

### Bundle Sizes

**Frontend (Production Build):**

- Main bundle: ~150 KB (gzipped)
- React vendor: ~130 KB (gzipped)
- Shadcn UI: ~50 KB (gzipped)
- Ruffle: ~2.5 MB (loaded separately)
- Total first load: ~330 KB + Ruffle

### Runtime Performance

**Backend API:**

- Average response: <50ms
- Game search: <100ms
- Database queries: <10ms (indexed)
- File streaming: Wire speed
- ZIP file access: <50ms
- CDN fallback: 200-500ms (network dependent)

**Frontend:**

- First contentful paint: <1s
- Time to interactive: <2s
- Game grid render: <100ms (virtualized)

---

## Browser Support

**Required features:**

- ES2020 support
- WebAssembly (for Ruffle)
- CSS Grid and Flexbox
- localStorage

**Targeted browsers:**

- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions

---

## Related Documentation

- [Architecture Overview](../02-architecture/system-architecture.md) - System
  design
- [Backend Guide](../03-backend/README.md) - Backend details
- [Frontend Guide](../04-frontend/README.md) - Frontend details
- [Deployment Guide](../09-deployment/README.md) - Production deployment
