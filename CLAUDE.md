# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Documentation-First Approach

**IMPORTANT:** This project has comprehensive documentation in the `docs/`
directory (100+ files). When handling requests:

1. **Use Documentation Instead of Context**: Always reference the relevant
   documentation files instead of repeating information in responses. This
   prevents filling up context windows with redundant information.

2. **Point to Documentation**: When answering questions, provide the path to the
   relevant documentation file (e.g., "See `docs/04-frontend/architecture.md`
   for details on frontend architecture").

3. **Read Documentation When Needed**: Use the Read tool to check documentation
   files when you need specific information about:
   - Architecture: `docs/02-architecture/`
   - Backend: `docs/03-backend/`
   - Frontend: `docs/04-frontend/`
   - Game Service: `docs/05-game-service/`
   - API Reference: `docs/06-api-reference/`
   - Design System: `docs/07-design-system/`
   - Development: `docs/08-development/`
   - Deployment: `docs/09-deployment/`
   - Features: `docs/10-features/`
   - Diagrams: `docs/11-diagrams/`
   - Reference: `docs/12-reference/`

4. **Update Documentation After Changes**: After completing any feature,
   enhancement, bug fix, or significant code change, **ALWAYS ask the user**:

   > "I've completed the changes. Should I update the relevant documentation in
   > the `docs/` folder to reflect these changes?"

   Then update the appropriate documentation files to keep them in sync with the
   codebase.

### Quick Documentation Reference

**For Common Questions, Point Users/Read From:**

| Question                        | Documentation File                                                                  |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| How do I set up the project?    | `docs/08-development/setup-guide.md`                                                |
| What commands are available?    | `docs/08-development/commands.md`                                                   |
| How does authentication work?   | `docs/10-features/01-authentication-authorization.md`                               |
| What are all the API endpoints? | `docs/06-api-reference/README.md`                                                   |
| What's the database schema?     | `docs/12-reference/database-schema-reference.md`                                    |
| How do components work?         | `docs/04-frontend/components/component-overview.md`                                 |
| How do I deploy?                | `docs/09-deployment/README.md`                                                      |
| What's the architecture?        | `docs/02-architecture/system-architecture.md`                                       |
| Design system/theming?          | `docs/07-design-system/theme-system.md`                                             |
| Common errors/pitfalls?         | `docs/08-development/common-pitfalls.md` and "Common Pitfalls" section in CLAUDE.md |
| TypeScript types?               | `docs/12-reference/type-definitions.md`                                             |
| Environment variables?          | `docs/09-deployment/environment-variables.md`                                       |
| How to add new API endpoints?   | "Frontend API Guidelines" section in CLAUDE.md                                      |

## Project Overview

Flashpoint Web is a self-hosted web application for browsing and playing games
from the Flashpoint Archive. The project is a monorepo containing three
independent services:

- **backend**: REST API server (Express/TypeScript, port 3100)
- **frontend**: React web UI (Vite/React/TypeScript, port 5173)
- **game-service**: Game content proxy and ZIP server (Express/TypeScript, ports
  22500/22501)

The architecture separates concerns: the backend handles game metadata and user
management via SQLite databases, the game-service serves actual game files and
handles proxying, and the frontend provides the user interface.

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

# Verify build (typecheck + build) - use this before committing
npm run typecheck && npm run build

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
# Production: Uses pre-built images from registry (docker-compose.yml)
docker-compose up -d

# Development: Build images locally (docker-compose.dev.yml)
docker-compose -f docker-compose.dev.yml build
docker-compose -f docker-compose.dev.yml up -d

# Verify Docker build (builds all images locally)
JWT_SECRET=test FLASHPOINT_HOST_PATH=/tmp docker-compose -f docker-compose.dev.yml build

# View logs
docker-compose logs -f
docker-compose logs -f backend

# Stop all services
docker-compose down
```

Set `FLASHPOINT_HOST_PATH` environment variable to point to your Flashpoint
installation before running Docker commands.

## Architecture

### Backend Service (Port 3100)

The backend is a REST API built with Express and TypeScript. It manages two
separate SQLite databases:

1. **Flashpoint Database** (`flashpoint.sqlite`): Read-only access to the
   official Flashpoint game metadata database. The DatabaseService watches this
   file for changes and hot-reloads when the Flashpoint Launcher updates it.

2. **User Database** (`user.db`): Application-specific database for user
   accounts, roles, permissions, playlists, favorites, play tracking, and
   authentication.

**Key architectural patterns:**

- Service layer pattern: Business logic in `src/services/`, routes in
  `src/routes/`
- JWT-based authentication with role-based access control (RBAC)
- File watching: Automatically detects changes to flashpoint.sqlite from the
  Flashpoint Launcher
- Proxy delegation: Backend proxies game file requests to game-service instead
  of serving them directly

**Important services:**

- `DatabaseService`: Manages connection to flashpoint.sqlite with hot-reload
  support
- `UserDatabaseService`: Manages user.db with schema migrations
- `GameService`: Game metadata queries from flashpoint.sqlite
- `AuthService`: User authentication and JWT token management
- `PlayTrackingService`: Tracks user play sessions with cleanup of abandoned
  sessions

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

- `components/`: Reusable components organized by domain (auth, library, player,
  playlist, etc.)
- `views/`: Top-level page components
- `lib/api.ts`: Centralized API client with typed endpoints

**Player implementation:**

- Flash games: Ruffle WebAssembly emulator embedded in iframe
- HTML5 games: Served directly via game-service proxy
- Animations: Separate view with same player infrastructure

**Frontend API Guidelines:**

**CRITICAL:** Always use the authenticated axios instance for backend API calls.

- **Centralized API client**: All backend API calls MUST go through
  `frontend/src/lib/api.ts`
- **Never use raw `fetch()`** for backend endpoints - it bypasses authentication
- **Axios interceptors**: The `api` instance automatically adds
  `Authorization: Bearer <token>` headers
- **Pattern to follow**: Create typed API methods in appropriate objects (e.g.,
  `gamesApi`, `authApi`, `githubApi`)

**Example (CORRECT):**

```typescript
// In frontend/src/lib/api.ts
export const githubApi = {
  getStarCount: async (): Promise<{ stars: number }> => {
    const { data } = await api.get<{
      success: boolean;
      data: { stars: number };
    }>('/github/stars');
    return data.data;
  },
};

// In component
import { githubApi } from '@/lib/api';
const result = await githubApi.getStarCount(); // ✅ Authenticated
```

**Example (WRONG):**

```typescript
// In component - DO NOT DO THIS
const response = await fetch('/api/github/stars'); // ❌ No authentication!
```

**Why this matters:**

- Maintenance mode blocks unauthenticated requests with 503
- Protected endpoints require JWT tokens
- Axios interceptors handle token refresh automatically
- Consistent error handling across all API calls

**When adding new backend endpoints:**

1. Create the backend route in `backend/src/routes/`
2. Add the typed API method to `frontend/src/lib/api.ts`
3. Use the API method in components (never raw `fetch()`)
4. Test with maintenance mode enabled to ensure authentication works

### Game Service (Ports 22500, 22501)

Independent Node.js service that replaces the original Go-based Flashpoint Game
Server. Runs two HTTP servers:

1. **HTTP Proxy Server (22500)**: Serves legacy web content with fallback chain:
   - Local htdocs (`D:/Flashpoint/Legacy/htdocs`)
   - Game data directory
   - ZIP archives (via zip-manager)
   - External CDN fallback (infinity.flashpointarchive.org)
   - Local file cache for downloaded content

2. **GameZip Server (22501)**: Mounts and serves files from ZIP archives in
   `Data/Games/` without extraction using node-stream-zip

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
# Required
FLASHPOINT_PATH=D:/Flashpoint
JWT_SECRET=your-secure-random-string

# Optional
DOMAIN=http://localhost:5173
GAME_SERVICE_HOST=localhost
LOG_LEVEL=info
```

> **Note:** All paths (database, images, logos, htdocs, games) are automatically
> derived from `FLASHPOINT_PATH`. You only need to set the base Flashpoint
> installation path.

> **Edition auto-detection:** The Flashpoint edition (Infinity or Ultimate) is
> automatically detected from `{FLASHPOINT_PATH}/version.txt` on startup. No
> environment variable is needed. The detected edition and version string are
> stored in the backend `config` object (not in the database). The frontend
> receives edition/version via `/api/settings/public` (injected from `config`).

See `backend/.env.example` for complete configuration options including rate
limiting, SQLite optimization, and OpenTelemetry settings.

### Game Service (.env)

```bash
# Required
FLASHPOINT_PATH=D:/Flashpoint

# Optional
LOG_LEVEL=info
```

> **Note:** All paths (htdocs, games) are automatically derived from
> `FLASHPOINT_PATH`.

### Frontend

The frontend does not require environment variables for local development. API
calls are proxied through Vite to the backend.

```bash
VITE_APP_VERSION=1.0.0  # Optional: displayed in settings
```

Vite proxy configuration in `vite.config.ts` handles `/api/*` routing to
backend. In production, Nginx proxies API requests to the backend container.

## Database Schema

### Flashpoint Database (flashpoint.sqlite)

Read-only database from Flashpoint project. Key tables:

- `game`: Main game metadata (id, title, platform, library, developer,
  publisher, etc.)
- `platform`: Gaming platforms
- `tag`: Tags and categories
- `game_tags_tag`: Many-to-many relationship between games and tags
- `playlist`: User playlists
- `playlist_game`: Playlist entries

**Important:** This database is managed by the Flashpoint Launcher. The backend
watches for file changes and automatically reloads connections when updates
occur.

### User Database (user.db)

Application-specific SQLite database. Schema managed via migrations in
`backend/src/migrations/`. Tables include:

- `users`: User accounts with hashed passwords (bcrypt)
- `roles`: RBAC roles (admin, moderator, user, guest)
- `role_permissions`: Permissions assigned to roles
- `user_roles`: User role assignments
- `user_playlists`: User-created playlists
- `user_favorites`: Favorited games per user
- `play_sessions`: Game play tracking with duration, completion status
- `system_settings`: Global system-wide configuration (auth, app, metadata,
  features, game, storage, rate limiting)

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

**Maintenance mode:**

- Controlled via `app.maintenance_mode` setting in `system_settings` table
- When enabled, blocks all non-admin users from accessing endpoints
  (returns 503)
- Admin users identified by `settings.update` permission bypass maintenance mode
- Minimal public paths always accessible: `/health`, `/api/auth/login`,
  `/api/auth/refresh`, `/api/settings/public`, `/proxy/*`
- Implemented in `backend/src/middleware/maintenanceMode.ts`
- Depends on `softAuth` middleware to populate `req.user` before checking
  permissions

**Permission caching:**

- User permissions cached for 5 minutes via `PermissionCache` (in-memory)
- Cache automatically invalidated when user roles or role permissions change
- Cache cleared on server restart
- Debug issues by checking backend logs for `[Maintenance]` entries

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
- User database writes use prepared statements with transactions for data
  consistency
- DatabaseService includes file watcher to detect external changes from
  Flashpoint Launcher
- Use BetterSqlite3 synchronous API (not async wrapper) for better performance

### Game File Serving

Game files are **not** served by the backend. The flow is:

1. Frontend requests game launch data from backend
2. Backend returns launch configuration pointing to game-service URLs
3. Frontend creates player iframe pointing to game-service (port 22500)
4. Game-service handles all file serving, proxying, and ZIP mounting

This separation prevents backend from blocking on large file transfers and
allows independent scaling.

### Ruffle Integration

Ruffle emulator files are copied from npm package to `frontend/public/ruffle/`
during `npm install` (postinstall hook). The player component loads Ruffle from
`/ruffle/ruffle.js` and creates instances for Flash content.

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

1. **Flashpoint path not found**: Verify `FLASHPOINT_PATH` in .env points to
   valid Flashpoint installation
2. **Database locked errors**: Flashpoint Launcher may lock flashpoint.sqlite -
   close it before migrations
3. **Port conflicts**: Ports 3100, 5173, 22500, 22501 must be available
4. **Game files not loading**: Ensure game-service is running before backend
5. **JWT secret in production**: Change default JWT_SECRET in production
   environments
6. **Ruffle files missing**: Run `npm run copy-ruffle` in frontend if Ruffle
   doesn't load
7. **503 errors in maintenance mode**: If admin users get 503 errors, check if
   components are using raw `fetch()` instead of the authenticated `api`
   instance from `lib/api.ts`. The axios interceptors automatically add
   authentication headers.
8. **Unauthenticated API calls**: Never use raw `fetch()` for backend API
   endpoints. Always add new endpoints to `frontend/src/lib/api.ts` and use the
   typed API methods. See "Frontend API Guidelines" section above.

## Recent Changes & Lessons Learned

### 2026-01-28: Maintenance Mode Admin Bypass Fix

**Issue:** Admin users were getting 503 errors when accessing
`/api/github/stars` while maintenance mode was enabled.

**Root Cause:** The `GitHubButton` component was using raw `fetch()` instead of
the authenticated axios instance, so requests had no `Authorization` header. The
maintenance mode middleware blocked these unauthenticated requests.

**Fix:**

1. Added `githubApi.getStarCount()` method to `frontend/src/lib/api.ts`
2. Updated `GitHubButton.tsx` to use the authenticated API method
3. The axios instance automatically adds JWT token via request interceptor

**Key Lesson:** **NEVER use raw `fetch()` for backend API calls.** Always use
the centralized `api` instance from `lib/api.ts` which handles authentication,
token refresh, and error handling automatically.

**Verification Steps Taken:**

1. Checked database - confirmed admin role has `settings.update` permission ✅
2. Tested backend directly - confirmed maintenance mode allows admin access ✅
3. Identified frontend was making unauthenticated requests ❌
4. Fixed component to use authenticated axios instance ✅

**Prevention:** See "Frontend API Guidelines" section for the correct pattern.
When adding new API endpoints, always:

1. Add typed method to appropriate API object in `lib/api.ts`
2. Import and use the API method in components
3. Test with maintenance mode enabled

---

### 2026-01-29: Game Service Directory Traversal Protection

**Issue:** Game service lacked comprehensive path validation, potentially
allowing directory traversal attacks through crafted URLs.

**Implementation:** Created centralized security utilities in
`game-service/src/utils/pathSecurity.ts`:

1. **Path Sanitization & Validation**:
   - `sanitizeAndValidatePath()` - Ensures paths stay within allowed directories
   - Platform-aware (Windows case-insensitive, Unix case-sensitive)
   - Validates resolved paths against base directories

2. **URL Path Sanitization**:
   - `sanitizeUrlPath()` - Detects null bytes, URL-encoded traversal, backslash
     attacks
   - Runs before path resolution for early detection

3. **Applied to both servers**:
   - **Legacy Server**: URL sanitization + path validation before all file
     access
   - **GameZip Server**: URL sanitization in file requests

**Test Coverage**: 17 comprehensive test cases (all passing)

**Security Guarantees**:

- ✅ Blocks `../../../etc/passwd` attempts
- ✅ Blocks absolute path escapes (`/etc/passwd`)
- ✅ Blocks URL-encoded traversal (`..%2F`, `..%5C`)
- ✅ Blocks null byte injection (`file.swf\0.txt`)
- ✅ Blocks backslash traversal (`..\..\..\`)
- ✅ All blocked attempts logged with full details

**Key Lesson:** Always validate that resolved file paths stay within allowed
base directories. Use `path.resolve()` and check the resolved path starts with
the base directory. Never trust user input, even after URL decoding.

**Documentation**:

- Detailed guide: `docs/13-security/directory-traversal-protection.md`
- Updated: `docs/12-reference/security-measures.md`

**Phase**: Phase 1 (Security) - Critical priority fix from comprehensive project
review

---

### 2026-02-04: Domain Settings for Playlist Sharing & Dynamic CORS

**Change:** Added admin-configurable domains for playlist sharing URLs and
dynamic CORS. Admins can add multiple domains, set a default, and choose which
domain to use when sharing playlists. Regular users automatically use the
default domain. Falls back to `window.location.origin` when no domains are
configured.

**How it works:**

- New `domains` table in user.db stores hostname, is_default, created_by
- `DomainService` provides CRUD operations with 60s in-memory cache
- Backend CORS is now dynamic: checks configured domains + env var fallback
- Default domain injected into `/api/settings/public` response (same pattern as
  `homeRecentHours` and `flashpointEdition`)
- `shareUrl` removed from backend `ShareLinkData` — frontend constructs URLs
  locally using `buildShareUrl()` from `useDomains` hook
- Admin users see a domain selector dropdown in the Share Playlist dialog
- Non-admin users use the default domain from `usePublicSettings()`

**New files:**

- `backend/src/migrations/002_domains.sql` — Domains table schema
- `backend/src/services/DomainService.ts` — Domain CRUD + CORS cache
- `backend/src/routes/domains.ts` — REST API for domains
- `frontend/src/lib/api/domains.ts` — Frontend API client
- `frontend/src/hooks/useDomains.ts` — React Query hooks + `buildShareUrl()`

**Modified files:**

- `backend/src/routes/index.ts` — Register domains router
- `backend/src/server.ts` — Dynamic CORS origin function
- `backend/src/services/UserPlaylistService.ts` — Removed `shareUrl` from
  `ShareLinkData`, removed unused `config` import
- `backend/src/routes/system-settings.ts` — Inject `defaultDomain` into
  `/public` response
- `frontend/src/types/settings.ts` — Added `Domain` interface, updated
  `PublicSettings`
- `frontend/src/types/playlist.ts` — Removed `shareUrl` from `ShareLinkData`
- `frontend/src/lib/api/index.ts` — Exported `domainsApi`
- `frontend/src/components/settings/AppSettingsTab.tsx` — Domain Settings card
- `frontend/src/components/playlist/SharePlaylistDialog.tsx` — Domain selector +
  local URL construction

**Key Lesson:** Moving URL construction to the frontend (with `buildShareUrl()`)
eliminates the need for the backend to know the frontend's domain for share
links. The admin-configurable domains table plus the `usePublicSettings()` hook
provide a clean way for both admin and regular users to get the right domain
without extra API calls.

**Documentation:**

- API reference: `docs/06-api-reference/domains-api.md`
- Feature guide: `docs/10-features/09-system-settings.md` (Domain Settings
  section)
- Database schema: `docs/12-reference/database-schema-reference.md` (domains
  table)
- CORS decision: `docs/12-reference/cors-security-decision.md` (dynamic CORS
  section)

---

### 2026-02-03: Auto-detect Flashpoint Edition from version.txt

**Change:** Replaced the `FLASHPOINT_EDITION` environment variable with
automatic detection from `{FLASHPOINT_PATH}/version.txt`. Edition and version
are held in the backend `config` object — **not** stored in the
`system_settings` database table. Backend services read `config` directly. The
frontend receives edition/version via `/api/settings/public` (injected from
`config`).

**How it works:**

- On startup, `backend/src/config.ts` reads `version.txt` and parses the edition
  (Infinity/Ultimate) and full version string
- Values stored in `config.flashpointEdition` and
  `config.flashpointVersionString` (not in the database)
- Backend services (GameService, MetadataSyncService, MetadataUpdateService)
  import and read `config` directly
- The `/api/settings/public` endpoint injects edition/version from `config` into
  the response (same pattern as `homeRecentHours`)
- Frontend uses the `usePublicSettings()` hook (already cached, no extra
  request)
- Falls back to `'infinity'` if `version.txt` is missing or unparseable

**Files changed:**

- `backend/src/config.ts` - Added `parseVersionFile()`, replaced env var
- `backend/src/routes/system-settings.ts` - Injects edition/version into
  `/public` response from config
- `backend/src/server.ts` - Removed DB upserts, kept log lines only
- `backend/src/migrations/001_complete_schema.sql` - Removed
  `metadata.flashpoint_edition` and `metadata.flashpoint_version` seed rows
- `backend/src/services/GameService.ts` - Uses `config` directly, removed
  `CachedSystemSettingsService` dependency
- `backend/src/services/MetadataUpdateService.ts` - Uses `config` directly,
  removed `CachedSystemSettingsService` dependency
- `backend/src/services/MetadataSyncService.ts` - Uses `config` directly,
  removed `CachedSystemSettingsService` dependency
- `frontend/src/components/settings/GeneralSettingsTab.tsx` - Uses
  `usePublicSettings()` instead of `systemSettingsApi.getCategory("metadata")`
- `frontend/src/views/SettingsView.tsx` - Uses `usePublicSettings()` instead of
  `systemSettingsApi.getCategory("metadata")`
- `frontend/src/types/settings.ts` - Added `metadata` to `PublicSettings`,
  removed `flashpointEdition` from `MetadataSettings`
- `backend/.env.example` - Removed `FLASHPOINT_EDITION`
- `docker-compose.yml` - Removed `FLASHPOINT_EDITION`
- `docker-compose.dev.yml` - Removed `FLASHPOINT_EDITION`

**Key Lesson:** Auto-detection from the Flashpoint installation itself is more
reliable than manual configuration. Keeping runtime-detected values in `config`
(not in the database) avoids unnecessary DB writes on every startup and
simplifies the service layer by removing `CachedSystemSettingsService`
dependencies from services that only need the edition.

---

### 2026-01-28: Database Migration Consolidation

**Change:** Consolidated 16 separate migration files into 2 files:

- `001_initialize_schema.sql`: All table definitions
- `002_seed_default_data.sql`: All seed data (roles, permissions, settings)

**Added:** Migration registry system in `bootstrap.sql` to track applied
migrations with checksums and execution times.

**Benefits:**

- Cleaner migration directory
- Industry-standard migration tracking (similar to Flyway, Knex)
- Backward compatibility with existing databases
- All archived migrations saved in `migrations/archived/` for reference

---

## Source Code References

- Flashpoint Launcher source code: D:\Repositories\Community\launcher
- Flashpoint Game Server: D:\Repositories\Community\FlashpointGameServer

## Flashpoint App Reference:

- Flashpoint Infinity Edition: "D:\Flashpoint Infinity 14.0.3"
- Flashpoint Ultimate Edition: "E:\Flashpoint Ultimate"

## Documentation Maintenance

**After ANY code change, always:**

1. **Run Prettier** on all new and modified files:
   `npx prettier --write <file1> <file2> ...` When using sub-agents (Task tool),
   instruct each agent to run Prettier on every file it creates or modifies
   before finishing.
2. Verify no build errors: `npm run typecheck` and `npm run build`
3. Check if documentation needs updates
4. Ask the user if relevant documentation should be updated
5. Update the following docs as needed:
   - Architecture changes → `docs/02-architecture/`
   - New/modified API endpoints → `docs/06-api-reference/`
   - Database schema changes → `docs/12-reference/database-schema-reference.md`
   - New features → `docs/10-features/`
   - Component changes → `docs/04-frontend/components/`
   - Configuration changes → `docs/03-backend/configuration.md` or
     `docs/09-deployment/environment-variables.md`

**Documentation is a first-class concern** - keeping it current ensures the
project remains maintainable.
