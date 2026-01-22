# Architecture Overview

## Introduction

Flashpoint Web employs a modern three-tier architecture that separates concerns into independent services. This design enables scalability, maintainability, and clear separation of responsibilities between metadata management, user interface, and game content delivery.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          User's Browser                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Frontend (React SPA) - Port 5173              │ │
│  │  - React 18 + TypeScript                                   │ │
│  │  - TanStack Query (Server State)                           │ │
│  │  - Zustand (Client State)                                  │ │
│  │  - Ruffle Flash Emulator                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │ HTTP/REST API
                             │ (JWT Auth)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Backend API Server - Port 3100                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Express + TypeScript                                      │ │
│  │  - Routes Layer                                            │ │
│  │  - Service Layer (Business Logic)                          │ │
│  │  - Middleware (Auth, RBAC, Logging)                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                             │                                    │
│  ┌──────────────────────────┴──────────────────────────────┐   │
│  │                                                          │   │
│  ▼                                                          ▼   │
│ ┌─────────────────────────────┐    ┌─────────────────────────┐ │
│ │  flashpoint.sqlite          │    │  user.db                │ │
│ │  (Read-only)                │    │  (Application DB)       │ │
│ │  - Game metadata            │    │  - Users & Auth         │ │
│ │  - Platforms, Tags          │    │  - Playlists, Favorites │ │
│ │  - Flashpoint-managed       │    │  - Play Sessions        │ │
│ │  - Hot-reloadable           │    │  - RBAC Permissions     │ │
│ └─────────────────────────────┘    └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │ HTTP Proxy
                             │ (Game Launch URLs)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│            Game Service - Ports 22500/22501                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  HTTP Proxy Server (22500)                                 │ │
│  │  - Serves legacy web content                              │ │
│  │  - Fallback chain (htdocs → ZIP → CDN)                    │ │
│  │  - CORS-enabled for game content                          │ │
│  │  - External CDN caching                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  GameZip Server (22501)                                    │ │
│  │  - Mounts ZIP archives                                     │ │
│  │  - Streams files without extraction                        │ │
│  │  - Serves from Data/Games/*.zip                            │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
               ┌────────────────────────────┐
               │  Flashpoint Installation   │
               │  - Legacy/htdocs/          │
               │  - Data/Games/*.zip        │
               │  - Data/Images/            │
               │  - Data/Logos/             │
               └────────────────────────────┘
```

## Three-Service Architecture

### 1. Frontend Service (Port 5173)

**Purpose**: User interface and client-side application logic

The frontend is a React 18 single-page application (SPA) built with modern tooling and state management patterns. It runs entirely in the user's browser and communicates with backend APIs.

**Responsibilities**:
- Render game library browsing interface
- Handle user authentication flows
- Manage client-side UI state (sidebar visibility, view modes)
- Cache and synchronize server state (games, playlists)
- Embed game player (Ruffle for Flash, iframe for HTML5)
- Implement responsive layouts and theme customization
- Route client-side navigation

**Key Characteristics**:
- Stateless between page loads (state in URL params and localStorage)
- No direct file system access
- All data fetched via REST APIs
- Built with Vite for fast HMR (Hot Module Replacement)
- Production build generates static assets served by any web server

### 2. Backend Service (Port 3100)

**Purpose**: Business logic, authentication, and metadata management

The backend is an Express-based REST API server that manages two SQLite databases and provides authentication, authorization, and game metadata operations.

**Responsibilities**:
- Authenticate users and issue JWT tokens
- Enforce role-based access control (RBAC)
- Query game metadata from flashpoint.sqlite
- Manage user accounts, playlists, favorites in user.db
- Track play sessions and statistics
- Log user activity for audit trails
- Proxy game launch requests to game-service
- Hot-reload flashpoint.sqlite when Flashpoint Launcher updates it
- Run database migrations for schema updates

**Key Characteristics**:
- Service layer pattern separating routes from business logic
- File watcher for flashpoint.sqlite changes
- JWT-based stateless authentication
- Prepared statements and transactions for database operations
- CORS configured for frontend origin only
- Rate limiting on authentication endpoints

**Database Architecture**:

The backend manages two separate databases with distinct purposes:

1. **flashpoint.sqlite** (Read-only):
   - Official Flashpoint Archive metadata database
   - Managed by Flashpoint Launcher
   - Contains 70,000+ game records
   - Watched for file changes (hot-reload)
   - Never written to by backend

2. **user.db** (Application database):
   - User accounts with bcrypt-hashed passwords
   - RBAC roles and permissions
   - User-created playlists and favorites
   - Play session tracking
   - Authentication settings
   - Schema versioned with migrations

### 3. Game Service (Ports 22500, 22501)

**Purpose**: Serve game files, handle proxying, and mount ZIP archives

The game service is an independent Node.js application that replaces the original Go-based Flashpoint Game Server. It runs two HTTP servers for different file serving strategies.

**Responsibilities**:
- Serve legacy web content from htdocs directory
- Stream files from ZIP archives without extraction
- Proxy external CDN requests with local caching
- Handle MIME type detection for 199+ file types
- Provide CORS headers for cross-domain content
- Normalize file paths and decode URLs

**Key Characteristics**:
- No authentication required (public file server)
- CORS enabled for all origins (game content)
- Efficient streaming for large files
- ZIP archive mounting with node-stream-zip
- Fallback chain for content resolution
- CDN caching for external resources

**Two-Server Design**:

1. **HTTP Proxy Server (Port 22500)**:
   - Serves legacy web content
   - Fallback chain:
     1. Local htdocs directory
     2. Game data directory
     3. ZIP archives (via zip-manager)
     4. External CDN (infinity.flashpointarchive.org)
     5. Local file cache for downloaded content

2. **GameZip Server (Port 22501)**:
   - Mounts ZIP files from Data/Games/
   - Serves files directly from archives
   - No extraction required
   - URL format: `http://localhost:22501/<game-id>/<file-path>`

## Service Communication Patterns

### Frontend → Backend

**Protocol**: HTTP/REST with JSON payloads

**Authentication**: JWT Bearer token in Authorization header

**Request Flow**:
```
User Action (UI)
  → React Component
    → TanStack Query Hook
      → API Client (lib/api.ts)
        → HTTP Request to Backend
          → Backend Route Handler
            → Service Layer
              → Database Query
                → JSON Response
                  → TanStack Query Cache
                    → React Component Re-render
```

**Example API Endpoints**:
- `GET /api/games` - List games with filtering/pagination
- `GET /api/games/:id` - Get game details
- `POST /api/auth/login` - User authentication
- `GET /api/playlists` - User playlists
- `POST /api/play-sessions` - Start play session

### Frontend → Game Service

**Protocol**: Direct HTTP requests (no authentication)

**Use Cases**:
- Load game content in iframe
- Fetch game assets (images, scripts, SWF files)
- Stream media content

**Request Flow**:
```
Game Player Component
  → Create <iframe> with game URL
    → Browser requests game content
      → Game Service resolves file
        → Serves from htdocs/ZIP/CDN
          → Browser renders game
```

**Example URLs**:
- `http://localhost:22500/path/to/game.swf` - Flash game file
- `http://localhost:22501/game-id/index.html` - Game from ZIP

### Backend → Game Service

**Protocol**: HTTP proxy delegation

**Purpose**: Backend proxies game file requests instead of serving them directly

**Request Flow**:
```
Frontend requests game launch
  → Backend /api/games/:id/launch
    → Returns launch configuration with game-service URLs
      → Frontend creates player iframe
        → Game service handles all file serving
```

**Why Proxy Delegation?**
- Prevents backend from blocking on large file transfers
- Allows game service to cache and optimize delivery
- Enables independent scaling of file serving
- Separates concerns (metadata vs. content)

## Data Flow Examples

### Game Browsing Flow

```
1. User navigates to /browse
   └─> Frontend renders BrowseView component

2. Component mounts, triggers useQuery hook
   └─> API call: GET /api/games?page=1&limit=50&platform=Flash

3. Backend receives request
   ├─> Validates JWT token
   ├─> Checks permissions (games.browse)
   └─> GameService.searchGames(filters)
       └─> Query flashpoint.sqlite
           └─> Returns game array + total count

4. Backend responds with JSON
   └─> TanStack Query caches result

5. Frontend renders GameCard components
   └─> Displays game grid/list

6. User clicks filter
   ├─> URL params updated
   └─> Triggers new query (automatic via React Query)
```

### Game Playing Flow

```
1. User clicks "Play" on game card
   └─> Frontend navigates to /play/:gameId

2. GamePlayerView component loads
   ├─> Fetches game details: GET /api/games/:id
   ├─> Creates play session: POST /api/play-sessions
   └─> Backend returns session ID

3. Frontend constructs game URL
   └─> Flash: http://localhost:22500/Flashpoint/htdocs/...
   └─> HTML5: http://localhost:22500/Flashpoint/games/...

4. GamePlayer component renders
   ├─> Flash: Loads Ruffle emulator
   │   └─> Creates iframe with game URL
   │       └─> Ruffle fetches SWF from game-service
   │           └─> Game service serves from htdocs or ZIP
   └─> HTML5: Creates iframe with game URL
       └─> Browser loads HTML5 game
           └─> Game service serves all assets

5. User plays game
   └─> Play session tracked in backend

6. User closes player
   └─> Frontend: PUT /api/play-sessions/:id (mark complete)
   └─> Backend updates session duration and status
```

### User Authentication Flow

```
1. User submits login form
   └─> POST /api/auth/login
       {username: "user", password: "pass"}

2. Backend AuthService validates
   ├─> Query user from user.db
   ├─> Compare bcrypt hash
   ├─> Load user roles and permissions
   └─> Generate JWT access + refresh tokens

3. Backend responds
   └─> {accessToken: "jwt...", refreshToken: "jwt...", user: {...}}

4. Frontend stores tokens
   ├─> localStorage for persistence
   ├─> Zustand auth store for reactive state
   └─> API client automatically includes in headers

5. Subsequent requests include JWT
   └─> Authorization: Bearer <token>

6. Backend RBAC middleware validates
   ├─> Verify JWT signature
   ├─> Check token expiration
   ├─> Load user permissions
   └─> Authorize endpoint access
```

## Separation of Concerns

### Why Three Services?

**Backend**: Manages state and business logic
- User accounts and authentication
- Game metadata queries
- Play tracking and statistics
- Role-based permissions

**Frontend**: Handles presentation and user interaction
- Responsive UI rendering
- Client-side routing
- Form validation
- Theme customization

**Game Service**: Optimizes content delivery
- File streaming and caching
- ZIP archive mounting
- CDN fallback handling
- CORS for game content

**Benefits**:
- **Scalability**: Each service scales independently
- **Performance**: Backend doesn't block on file transfers
- **Security**: Authentication isolated from public file serving
- **Maintainability**: Clear responsibilities reduce complexity
- **Deployment**: Services can be deployed separately
- **Technology Choice**: Each service uses optimal tech stack

## Database Hot-Reloading

### Why Hot-Reload?

The Flashpoint Launcher updates flashpoint.sqlite when:
- User installs new game updates
- Metadata corrections are published
- Tags or playlists are modified

Without hot-reloading, users would need to restart the backend after every Flashpoint Launcher update.

### Implementation

```typescript
// DatabaseService watches flashpoint.sqlite
const watcher = fs.watch(dbPath, (eventType) => {
  if (eventType === 'change') {
    // Close existing connection
    db.close();

    // Reopen with new data
    db = new Database(dbPath, { readonly: true });

    logger.info('Database hot-reloaded');
  }
});
```

**Characteristics**:
- File watcher detects changes
- Gracefully closes old connection
- Opens new connection with updated data
- Ongoing requests complete with old connection
- New requests use updated connection
- Zero downtime for users

## Technology Choices and Rationale

### Backend: Node.js + Express + TypeScript

**Why Node.js?**
- JavaScript ecosystem alignment with frontend
- Excellent async I/O for concurrent requests
- Rich package ecosystem (BetterSqlite3, JWT)

**Why Express?**
- Mature, well-documented web framework
- Middleware pattern for auth/logging/CORS
- Large ecosystem of compatible packages

**Why TypeScript?**
- Type safety reduces runtime errors
- Better IDE support and autocomplete
- Easier refactoring and maintenance

### Frontend: React 18 + Vite + TanStack Query

**Why React 18?**
- Component-based architecture
- Rich ecosystem (Shadcn UI, Radix)
- Concurrent rendering for better UX

**Why Vite?**
- Instant HMR during development
- Optimized production builds
- Better DX than Webpack/CRA

**Why TanStack Query?**
- Automatic caching and refetching
- Reduces boilerplate for API calls
- Built-in loading/error states

**Why Zustand?**
- Lightweight state management
- Simpler than Redux
- TypeScript-first design

### Game Service: Node.js + node-stream-zip

**Why Node.js?**
- Consistent with backend technology
- Excellent streaming capabilities
- Easy deployment

**Why node-stream-zip?**
- Streams files without extraction
- Low memory footprint
- Fast random access to ZIP contents

### Database: SQLite (BetterSqlite3)

**Why SQLite?**
- Flashpoint uses SQLite (compatibility)
- No separate database server required
- Perfect for self-hosted applications
- Fast for read-heavy workloads

**Why BetterSqlite3?**
- Synchronous API (simpler code)
- Better performance than async wrappers
- Prepared statements and transactions

## Security Architecture

### Authentication Flow

1. User submits credentials
2. Backend validates and issues JWT
3. Frontend stores JWT in localStorage
4. All API requests include JWT in header
5. Backend middleware verifies JWT
6. RBAC checks permissions for endpoint

### Authorization Layers

**Permission Checks**:
```typescript
// Backend RBAC middleware
rbac('games.play')  // Requires specific permission
rbac('admin.*')     // Requires any admin permission
```

**Frontend Route Guards**:
```typescript
// ProtectedRoute component
<ProtectedRoute permission="playlists.create">
  <PlaylistForm />
</ProtectedRoute>
```

### Security Best Practices

- JWT secrets in environment variables
- Bcrypt password hashing (cost factor 10)
- Rate limiting on auth endpoints
- CORS restricted to frontend origin
- SQL injection prevention via prepared statements
- XSS protection via React's escaping
- Helmet.js security headers

## Performance Optimizations

### Frontend

- **Code Splitting**: Route-based chunks
- **TanStack Query Caching**: Reduces API calls
- **Virtual Scrolling**: For large game lists
- **Image Lazy Loading**: Loads images on demand
- **Memoization**: React.memo for expensive renders

### Backend

- **Database Indexes**: On game.title, game.platform
- **Prepared Statements**: Compiled once, reused
- **Connection Pooling**: BetterSqlite3 single connection (SQLite limitation)
- **Response Compression**: Gzip middleware

### Game Service

- **Streaming**: Large files served in chunks
- **CDN Caching**: External content cached locally
- **MIME Type Mapping**: Precomputed lookup table
- **ZIP Mounting**: No extraction overhead

## Deployment Considerations

### Development

```bash
# Start all services concurrently
npm run dev
```

### Production

**Option 1: Separate Processes**
```bash
cd backend && npm start &
cd game-service && npm start &
cd frontend && npm run build && serve dist
```

**Option 2: Docker Compose**
```bash
docker-compose up -d
```

### Environment Variables

- Backend: 15+ configuration options
- Game Service: 6 configuration options
- Frontend: Build-time injection via Vite

### Scaling Strategies

- **Horizontal**: Run multiple game-service instances with load balancer
- **Vertical**: Increase Node.js memory limit for large ZIP files
- **Database**: SQLite limits concurrent writes (use read replicas)
- **CDN**: Cache static assets from frontend build

## Error Handling

### Frontend

- TanStack Query error boundaries
- Toast notifications for user feedback
- Retry logic with exponential backoff
- Fallback UI for failed loads

### Backend

- Express error middleware
- Winston logging to file and console
- Structured error responses
- Database transaction rollbacks

### Game Service

- Fallback chain for missing content
- CDN retry with timeout
- Graceful degradation (404 instead of crash)

## Monitoring and Logging

### Activity Logging

Backend logs all user actions:
- User authentication
- Game launches
- Playlist modifications
- Admin actions

### Winston Logger

- Structured JSON logs
- Log levels: error, warn, info, debug
- File rotation (daily)
- Console output in development

### Metrics (Future)

- API response times
- Database query performance
- Game load success rates
- User engagement analytics

## Future Architecture Enhancements

### Potential Improvements

1. **Redis Caching**: Cache hot game queries
2. **PostgreSQL Migration**: For better concurrent writes
3. **WebSocket Support**: Real-time play session updates
4. **Microservices**: Split backend into auth/games/playlists services
5. **CDN Integration**: Serve frontend from CDN
6. **Container Orchestration**: Kubernetes for large deployments

## Related Documentation

- [Technology Stack Details](technology-stack.md) - In-depth technology choices
- [Getting Started Guide](getting-started.md) - Quick setup instructions
- [Backend Architecture](../02-backend/architecture.md) - Deep dive into backend
- [Frontend Architecture](../03-frontend/architecture.md) - Deep dive into frontend
- [Database Schema](../04-database/schema.md) - Database table structures
- [API Reference](../05-api/overview.md) - REST API documentation

## Summary

Flashpoint Web's three-service architecture provides a robust, scalable, and maintainable solution for browsing and playing Flashpoint Archive games. The separation of concerns between backend (business logic), frontend (UI), and game service (content delivery) enables independent development, deployment, and scaling while maintaining clear communication patterns and security boundaries.
