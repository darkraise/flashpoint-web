# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flashpoint Web is a self-hosted web application for browsing and playing games from the Flashpoint Archive. The project is a monorepo containing three independent services:

- **backend**: REST API server (Express/TypeScript, port 3001)
- **frontend**: React web UI (Vite/React/TypeScript, port 5173)
- **game-service**: Game content proxy and ZIP server (Express/TypeScript, ports 22500/22501)

The architecture separates concerns: the backend handles game metadata and user management via SQLite databases, the game-service serves actual game files and handles proxying, and the frontend provides the user interface.

## Development Commands

### Monorepo (Root Level)

```bash
# Install all dependencies for all services
npm run install:all

# Start all services in development mode (concurrent)
npm run dev

# Start individual services
npm run dev:backend
npm run dev:frontend
npm run dev:game-service

# Build all services
npm run build

# TypeScript type checking across all services
npm run typecheck

# Clean all build artifacts and dependencies
npm run clean
```

### Backend

```bash
cd backend

# Development server with hot reload (tsx)
npm run dev

# Build TypeScript to dist/
npm run build

# Run production build
npm start

# TypeScript type checking only
npm run typecheck

# Lint code
npm run lint

# Run tests (vitest)
npm test
```

### Frontend

```bash
cd frontend

# Development server with HMR (Vite)
npm run dev

# Build for production (outputs to dist/)
npm run build

# Preview production build locally
npm run preview

# TypeScript type checking only
npm run typecheck

# Lint code
npm run lint

# Copy Ruffle emulator files to public/ (runs automatically on postinstall)
npm run copy-ruffle
```

### Game Service

```bash
cd game-service

# Development server with hot reload
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start

# TypeScript type checking
npm run typecheck
```

### Docker

```bash
# Build all services
docker-compose build

# Start all services in background
docker-compose up -d

# View logs
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f game-service
docker-compose logs -f frontend

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

Set `FLASHPOINT_HOST_PATH` environment variable to point to your Flashpoint installation before running Docker commands.

## Architecture

### Backend Service (Port 3001)

The backend is a REST API built with Express and TypeScript. It manages two separate SQLite databases:

1. **Flashpoint Database** (`flashpoint.sqlite`): Read-only access to the official Flashpoint game metadata database. The DatabaseService watches this file for changes and hot-reloads when the Flashpoint Launcher updates it.

2. **User Database** (`user.db`): Application-specific database for user accounts, roles, permissions, playlists, favorites, play tracking, and authentication.

**Key architectural patterns:**

- Service layer pattern: Business logic in `src/services/`, routes in `src/routes/`
- JWT-based authentication with role-based access control (RBAC)
- File watching: Automatically detects changes to flashpoint.sqlite from the Flashpoint Launcher
- Proxy delegation: Backend proxies game file requests to game-service instead of serving them directly

**Important services:**

- `DatabaseService`: Manages connection to flashpoint.sqlite with hot-reload support
- `UserDatabaseService`: Manages user.db with schema migrations
- `GameService`: Game metadata queries from flashpoint.sqlite
- `AuthService`: User authentication and JWT token management
- `PlayTrackingService`: Tracks user play sessions with cleanup of abandoned sessions

### Frontend Service (Port 5173)

React 18 single-page application using modern patterns:

**Tech stack:**

- Vite for build tooling and dev server
- React Router for routing
- TanStack Query (React Query) for server state management
- Zustand for client-side UI state
- Tailwind CSS for styling
- Ruffle emulator for Flash content

**State management approach:**

- Server state (games, playlists, user data): TanStack Query with caching
- UI state (sidebar visibility, view modes): Zustand stores
- URL state (filters, search, pagination): React Router search params
- Auth state: Zustand store (`store/auth.ts`) with localStorage persistence

**Component organization:**

- `components/`: Reusable components organized by domain (auth, library, player, playlist, etc.)
- `views/`: Top-level page components
- `lib/api.ts`: Centralized API client with typed endpoints

**Player implementation:**

- Flash games: Ruffle WebAssembly emulator embedded in iframe
- HTML5 games: Served directly via game-service proxy
- Animations: Separate view with same player infrastructure

### Game Service (Ports 22500, 22501)

Independent Node.js service that replaces the original Go-based Flashpoint Game Server. Runs two HTTP servers:

1. **HTTP Proxy Server (22500)**: Serves legacy web content with fallback chain:

   - Local htdocs (`D:/Flashpoint/Legacy/htdocs`)
   - Game data directory
   - ZIP archives (via zip-manager)
   - External CDN fallback (infinity.flashpointarchive.org)
   - Local file cache for downloaded content

2. **GameZip Server (22501)**: Mounts and serves files from ZIP archives in `Data/Games/` without extraction using node-stream-zip

**Key features:**

- MIME type detection for 199+ file types
- CORS headers for cross-domain game content
- Streaming for large files
- External CDN fallback with caching
- File path normalization and URL decoding

## Environment Configuration

### Backend (.env)

Required variables:

```bash
FLASHPOINT_PATH=D:/Flashpoint
FLASHPOINT_DB_PATH=D:/Flashpoint/Data/flashpoint.sqlite
FLASHPOINT_HTDOCS_PATH=D:/Flashpoint/Legacy/htdocs
FLASHPOINT_IMAGES_PATH=D:/Flashpoint/Data/Images
FLASHPOINT_LOGOS_PATH=D:/Flashpoint/Data/Logos
FLASHPOINT_PLAYLISTS_PATH=D:/Flashpoint/Data/Playlists
FLASHPOINT_GAMES_PATH=D:/Flashpoint/Data/Games

# Game service URLs (separate service)
GAME_SERVICE_PROXY_URL=http://localhost:22500
GAME_SERVICE_GAMEZIP_URL=http://localhost:22501

# Frontend origin for CORS
CORS_ORIGIN=http://localhost:5173
```

Optional: JWT*SECRET, REDIS_ENABLED, LOG_LEVEL, RATE_LIMIT*\*

See `backend/.env.example` for complete configuration options.

### Game Service (.env)

```bash
PROXY_PORT=22500
GAMEZIPSERVER_PORT=22501
FLASHPOINT_PATH=D:/Flashpoint
FLASHPOINT_HTDOCS_PATH=D:/Flashpoint/Legacy/htdocs
FLASHPOINT_GAMES_PATH=D:/Flashpoint/Data/Games
EXTERNAL_FALLBACK_URLS=http://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs,http://infinity.unstable.life/Flashpoint/Legacy/htdocs/
LOG_LEVEL=info
```

### Frontend

Environment variables are injected at build time via Vite:

```bash
VITE_API_URL=http://localhost:3001
```

Vite proxy configuration in `vite.config.ts` handles `/api/*` and `/proxy/*` routing to backend.

## Database Schema

### Flashpoint Database (flashpoint.sqlite)

Read-only database from Flashpoint project. Key tables:

- `game`: Main game metadata (id, title, platform, library, developer, publisher, etc.)
- `platform`: Gaming platforms
- `tag`: Tags and categories
- `game_tags_tag`: Many-to-many relationship between games and tags
- `playlist`: User playlists
- `playlist_game`: Playlist entries

**Important:** This database is managed by the Flashpoint Launcher. The backend watches for file changes and automatically reloads connections when updates occur.

### User Database (user.db)

Application-specific SQLite database. Schema managed via migrations in `backend/src/migrations/`. Tables include:

- `users`: User accounts with hashed passwords (bcrypt)
- `roles`: RBAC roles (admin, moderator, user, guest)
- `role_permissions`: Permissions assigned to roles
- `user_roles`: User role assignments
- `user_playlists`: User-created playlists
- `user_favorites`: Favorited games per user
- `play_sessions`: Game play tracking with duration, completion status
- `auth_settings`: Global authentication configuration

Migrations run automatically on server startup via UserDatabaseService.

## Authentication & Authorization

The application uses JWT-based authentication with RBAC:

**Auth flow:**

1. User logs in via `/api/auth/login` with username/password
2. Backend validates credentials, returns JWT access token + refresh token
3. Frontend stores tokens in localStorage and Zustand auth store
4. All subsequent API requests include JWT in Authorization header
5. Backend middleware validates JWT and checks permissions

**Permission system:**

- Permissions are strings like "games.play", "playlists.create", "users.manage"
- Roles bundle permissions together
- ProtectedRoute component in frontend enforces permission requirements
- Backend RBAC middleware validates permissions on protected endpoints

**Guest mode:**

- Users can browse games without authentication
- Playing games requires authentication and "games.play" permission

## Testing

Backend includes vitest configuration. Run tests with:

```bash
cd backend
npm test
```

Frontend testing setup TBD.

## Important Implementation Notes

### Database Access Patterns

- **Never** use write operations on flashpoint.sqlite - it's read-only
- User database writes use prepared statements with transactions for data consistency
- DatabaseService includes file watcher to detect external changes from Flashpoint Launcher
- Use BetterSqlite3 synchronous API (not async wrapper) for better performance

### Game File Serving

Game files are **not** served by the backend. The flow is:

1. Frontend requests game launch data from backend
2. Backend returns launch configuration pointing to game-service URLs
3. Frontend creates player iframe pointing to game-service (port 22500)
4. Game-service handles all file serving, proxying, and ZIP mounting

This separation prevents backend from blocking on large file transfers and allows independent scaling.

### Ruffle Integration

Ruffle emulator files are copied from npm package to `frontend/public/ruffle/` during `npm install` (postinstall hook). The player component loads Ruffle from `/ruffle/ruffle.js` and creates instances for Flash content.

**Scale modes supported:** exactfit, noborder, showall (default), noscale

### Play Session Tracking

Play sessions have three states:

1. Active: User is playing
2. Completed: User finished normally
3. Abandoned: Session older than 24 hours without completion

Background job runs every 6 hours to clean up abandoned sessions.

### CORS Configuration

- Backend CORS origin must match frontend URL
- Game-service enables CORS for all origins (cross-domain game content)
- Vite proxy handles development routing to avoid CORS issues

## Common Pitfalls

1. **Flashpoint path not found**: Verify `FLASHPOINT_PATH` in .env points to valid Flashpoint installation
2. **Database locked errors**: Flashpoint Launcher may lock flashpoint.sqlite - close it before migrations
3. **Port conflicts**: Ports 3001, 5173, 22500, 22501 must be available
4. **Game files not loading**: Ensure game-service is running before backend
5. **JWT secret in production**: Change default JWT_SECRET in production environments
6. **Ruffle files missing**: Run `npm run copy-ruffle` in frontend if Ruffle doesn't load

## Source Code References

- Flashpoint Launcher source code: D:\Repositories\Community\launcher
- Flashpoint Game Server: D:\Repositories\Community\FlashpointGameServer

## Flashpoint App Reference: D:\FP_Data\Flashpoint

## Make sure that there is no build error after modified
