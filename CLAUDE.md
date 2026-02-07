# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Documentation-First Approach

**IMPORTANT:** This project has comprehensive documentation in the `docs/`
directory (100+ files). When handling requests:

1. **Reference docs instead of repeating information** — prevents filling
   context windows with redundant content.
2. **Point to docs** when answering questions (e.g., "See
   `docs/04-frontend/architecture.md`").
3. **Read docs when needed** using the Read tool:
   - Architecture: `docs/02-architecture/`
   - Backend: `docs/03-backend/`
   - Frontend: `docs/04-frontend/`
   - API Reference: `docs/06-api-reference/`
   - Design System: `docs/07-design-system/`
   - Development: `docs/08-development/`
   - Deployment: `docs/09-deployment/`
   - Features: `docs/10-features/`
   - Diagrams: `docs/11-diagrams/`
   - Reference: `docs/12-reference/`
4. **Update docs after changes** — always ask the user if relevant documentation
   should be updated.

### Quick Documentation Reference

| Question                        | Documentation File                                    |
| ------------------------------- | ----------------------------------------------------- |
| How do I set up the project?    | `docs/08-development/setup-guide.md`                  |
| What commands are available?    | `docs/08-development/commands.md`                     |
| How does authentication work?   | `docs/10-features/01-authentication-authorization.md` |
| What are all the API endpoints? | `docs/06-api-reference/README.md`                     |
| What's the database schema?     | `docs/12-reference/database-schema-reference.md`      |
| How do components work?         | `docs/04-frontend/components/component-overview.md`   |
| How do I deploy?                | `docs/09-deployment/README.md`                        |
| What's the architecture?        | `docs/02-architecture/system-architecture.md`         |
| Design system/theming?          | `docs/07-design-system/theme-system.md`               |
| Common errors/pitfalls?         | `docs/08-development/common-pitfalls.md`              |
| TypeScript types?               | `docs/12-reference/type-definitions.md`               |
| Environment variables?          | `docs/09-deployment/environment-variables.md`         |
| Game content serving?           | `docs/05-game-service/architecture.md`                |
| Security measures?              | `docs/12-reference/security-measures.md`              |

## Project Overview

Flashpoint Web is a self-hosted web application for browsing and playing games
from the Flashpoint Archive. Monorepo with two services:

- **backend** (Express/TypeScript, port 3100): REST API + integrated game
  content serving via `/game-proxy/*` and `/game-zip/*` routes
- **frontend** (Vite/React/TypeScript, port 5173): SPA with TanStack Query,
  Zustand, Tailwind CSS, Ruffle emulator

Two SQLite databases: `flashpoint.sqlite` (read-only, game metadata) and
`user.db` (app data — users, roles, playlists, play sessions). See
`docs/02-architecture/system-architecture.md` for full architecture details.

## Development Commands

```bash
# Root level
npm run install:all          # Install all dependencies
npm run dev                  # Start all services (concurrent)
npm run dev:backend          # Backend only
npm run dev:frontend         # Frontend only
npm run build                # Build all
npm run typecheck            # Type check all
npm run typecheck && npm run build  # Verify before committing

# Backend (cd backend)
npm run dev                  # Dev server with hot reload (tsx)
npm run build                # Build to dist/
npm test                     # Run tests (vitest)
npm run typecheck            # Type check only

# Frontend (cd frontend)
npm run dev                  # Dev server with HMR (Vite)
npm run build                # Build to dist/
npm run typecheck            # Type check only
npm run copy-ruffle          # Copy Ruffle emulator files (auto on postinstall)

# Docker
docker-compose up -d                                    # Production
docker-compose -f docker-compose.dev.yml up -d          # Development
```

## Frontend API Guidelines

**CRITICAL:** All backend API calls MUST go through `frontend/src/lib/api.ts`.
Never use raw `fetch()` — it bypasses authentication (JWT headers, token
refresh, maintenance mode bypass for admins).

```typescript
// CORRECT — in frontend/src/lib/api.ts
export const exampleApi = {
  getData: async () => {
    const { data } = await api.get<{ success: boolean; data: Result }>(
      '/example'
    );
    return data.data;
  },
};

// WRONG — bypasses auth
const response = await fetch('/api/example'); // Never do this
```

**When adding new endpoints:**

1. Create backend route in `backend/src/routes/`
2. Add typed API method to `frontend/src/lib/api.ts`
3. Use the API method in components
4. Test with maintenance mode enabled

## Common Pitfalls

1. **Route ordering**: Static routes (`/random`) MUST come before parameterized
   routes (`/:id`) in Express routers
2. **`||` vs `??`**: Use `??` for config defaults — `||` treats `""`, `0`,
   `false` as falsy
3. **`Array.sort()` mutates**: Use `[...arr].sort()` when original must be
   preserved
4. **`parseInt()` validation**: Always check `isNaN()` — NaN silently passes to
   SQL
5. **Limit caps**: Cap `limit` query params with `Math.min()` to prevent data
   dumps
6. **`asyncHandler`**: Required on ALL async Express handlers
7. **`res.headersSent`**: Check before error responses in SSE endpoints
8. **Raw `fetch()`**: Never use for backend calls — see Frontend API Guidelines
9. **flashpoint.sqlite is read-only**: Never write to it
10. **Stream cleanup**: Handle `res.on('close')` to destroy streams on client
    disconnect
11. **Atomic swap for hot-reload**: Open new resource, swap reference, close old
12. **Security allowlists > denylists**: For CGI env vars, download domains,
    etc.
13. **Path security**: Always validate resolved paths stay within base
    directories using `path.resolve()` + startsWith check
14. **Ruffle files missing**: Run `npm run copy-ruffle` in frontend

See `docs/08-development/common-pitfalls.md` for the full list with details.

## Key Architecture Notes

- **Game play flow**: Frontend calls `GET /api/games/:id/launch` → backend
  mounts ZIP → if downloading, frontend polls every 2s → when ready, renders
  player
- **Game content routes** (`/game-proxy/*`, `/game-zip/*`) are registered BEFORE
  auth middleware for cross-origin access
- **Edition auto-detection**: Read from `{FLASHPOINT_PATH}/version.txt`, stored
  in `config` object (not DB). Frontend gets it via `/api/settings/public`
- **JWT auth with RBAC**: Permissions cached 5min via `PermissionCache`.
  Maintenance mode blocks non-admins (503)
- **Token storage**: Refresh tokens in HTTP-only cookies (`fp_refresh`, path
  `/api/auth`, 30-day expiry, secure flag in prod, SameSite=lax). Access tokens
  in memory only. Session recovery on page reload via `/api/auth/refresh`
  (cookie sent automatically)
- **CSRF protection**: Axios client uses `withCredentials: true` to enable
  cookie transmission with requests
- **Database hot-reload**: `DatabaseService` watches flashpoint.sqlite and
  reloads on changes from Flashpoint Launcher
- **Resource limits**: Server has `keepAliveTimeout`, `headersTimeout`,
  `maxConnections`; external requests use dedicated axios with `maxSockets: 10`;
  concurrent downloads capped at 3

## Environment Configuration

```bash
# Required
FLASHPOINT_PATH=D:/Flashpoint
JWT_SECRET=your-secure-random-string

# Optional
DOMAIN=http://localhost:5173
LOG_LEVEL=info
```

All paths derived from `FLASHPOINT_PATH`. See `backend/.env.example` for all
options and `docs/09-deployment/environment-variables.md` for details.

## Source Code References

- Flashpoint Launcher source: D:\Repositories\Community\launcher
- Flashpoint Game Server: D:\Repositories\Community\FlashpointGameServer
- Flashpoint Infinity Edition: "D:\Flashpoint Infinity 14.0.3"
- Flashpoint Ultimate Edition: "E:\Flashpoint Ultimate"

## Recent Changes & Lessons Learned

### 2026-02-07: Navigation Revamp - Breadcrumb Bar with Back Button

**Change:** Redesigned the Breadcrumbs component as a navigation bar with an
integrated back button. Added breadcrumbs to GamePlayerView (previously had
none). Removed standalone "Back" text links from GameDetailView, GamePlayerView,
and SharedPlaylistView.

**What changed:**

- `Breadcrumbs.tsx`: Restyled as nav bar (`bg-muted/50 rounded-lg`) with
  ArrowLeft back button, vertical divider, and pill-style breadcrumb items. New
  `showBackButton` prop (default: true). Added `BreadcrumbContext` (moved from
  GameCard.tsx) and `PlayerBreadcrumbContext` types.
- `GameDetailView.tsx`: Removed standalone back button. Play button and
  auto-play now pass `PlayerBreadcrumbContext` via React Router navigation
  state.
- `GamePlayerView.tsx`: Added breadcrumbs showing
  `Home > [Context] > Game Title > Play`. Reads context from navigation state,
  falls back to `Browse > Game > Play` for direct URL access. Hidden in
  fullscreen.
- `SharedPlaylistView.tsx`: Removed standalone "Back to my playlists" link.
- 5 library components: Updated `BreadcrumbContext` import source from
  `GameCard.tsx` to `Breadcrumbs.tsx`.

**Files modified (9):**

- `frontend/src/components/common/Breadcrumbs.tsx`
- `frontend/src/views/GameDetailView.tsx`
- `frontend/src/views/GamePlayerView.tsx`
- `frontend/src/views/SharedPlaylistView.tsx`
- `frontend/src/components/library/GameCard.tsx`
- `frontend/src/components/library/GameBrowseLayout.tsx`
- `frontend/src/components/library/GameGrid.tsx`
- `frontend/src/components/library/GameList.tsx`
- `frontend/src/components/library/GameListItem.tsx`

**Key Lesson:** Breadcrumb context must flow through navigation state
(`location.state`) since React Router doesn't preserve component state across
page transitions. Use a typed context interface (`PlayerBreadcrumbContext`) and
always provide sensible fallbacks for direct URL access.

### 2026-02-07: Low-Priority Code Quality Fixes (~48 issues)

**Change:** Final round of code quality improvements from the comprehensive code
review. Focused on type safety, dead code removal, DRY violations, import
consistency, and theme token standardization.

**Backend fixes (14 files):**

- Replaced `any` types with proper types across 6 services (MetadataSyncService,
  PlaylistService, UserPlaylistService, JobExecutionService,
  CommunityPlaylistService, RuffleService)
- Removed `.js` extension from import, simplified redundant
  `parseInt(String(...))` calls
- Added `.catch()` on fire-and-forget promises, `.unref()` on cleanup intervals
- Demoted noisy `logger.info` to `logger.debug`, removed duplicate default
  export

**Game service fixes (9 files):**

- Added `headersSent` guard to `sendError()` in proxy-request-handler to prevent
  write-after-headers errors
- Made `findActiveDownload` private and `PRIVATE_IP_RANGES` static readonly
- Removed unused imports (`AxiosError`), aliases (`realpath`), and convenience
  re-exports
- Removed `export` from internal-only `CUSTOM_MIME_TYPES` constant

**Frontend DRY + types fixes (12 files):**

- Deleted duplicate `errorUtils.ts` - consolidated to `types/api-error.ts`
- Replaced duplicate `formatDuration`/`formatPlaytime` functions with shared
  import from `cron-utils.ts`
- Fixed `any` types in `logger.ts` (`any[]` → `unknown[]`) and
  `createQueryHook.ts`
- Removed dead `Window.opera` type declaration, redundant variable aliases,
  duplicate conditional rendering
- Fixed `LazyBackgroundImage` callback refs to prevent effect dependency issues

**Frontend imports + theming fixes (15 files):**

- Standardized 10 files from relative `../` imports to `@/` alias imports
- Replaced hardcoded Tailwind colors with theme tokens across 4 components
  (e.g., `text-gray-400` → `text-muted-foreground`, `border-primary-500` →
  `border-primary`)
- Fixed index-based list keys → content-based keys in GameListItem

**Key Lessons:**

- Duplicate utility functions (`errorUtils.ts` vs `api-error.ts`) cause
  confusion - consolidate early
- Callback props in `useEffect` dependencies cause re-render loops - use
  `useRef` pattern
- Fire-and-forget promises need `.catch()` to prevent unhandled rejections
- `setInterval` without `.unref()` prevents Node.js graceful shutdown
- Internal-only constants should not be exported - reduces public API surface
- Theme tokens (`text-muted-foreground`) adapt to dark/light mode; hardcoded
  colors don't

### 2026-02-07: ~78 Medium-Priority Code Quality Fixes

**Change:** Applied ~78 medium-priority fixes across backend routes, backend
services, game service, and frontend from comprehensive code review.

**Backend Routes (27 fixes):**

- `asyncHandler` added to: `game-zip.ts`, `github.ts`, `game-proxy.ts`,
  `authenticate`/`optionalAuth` middleware
- Zod validation: `community-playlists.ts` (downloadUrl), `shared-playlists.ts`
  (newTitle), `cache.ts` (cacheType), `activities.ts` (timeRange)
- `parseInt` NaN fallback: `favorites.ts`, `jobs.ts` offset; `config.ts` 6 env
  vars
- Bug fix: `cache.ts` overlapping `if` → `switch` (was clearing wrong caches)
- `.catch()` on fire-and-forget cache write in `proxy.ts`
- `.unref()` on 3 cleanup intervals in `server.ts`

**Backend Services (12 fixes):**

- Removed `any` types: `shared-playlists.ts`, `activities.ts`,
  `CommunityPlaylistService.ts`
- Consolidated `ALLOWED_DOWNLOAD_DOMAINS` as single exported constant
- Fixed timeout leak in `UpdateService.ts`
- Simplified duplicate validation in `DomainService.ts`
- Removed redundant `ensureLogDir` in `errors.ts`

**Game Service (19 fixes):**

- `.catch()` on `downloadAndMountInBackground`; `.unref()` on cleanup interval
- Shared `MAX_BUFFERED_FILE_SIZE` constant replaces 50MB magic number in 3 files
- Hostname port stripping: `host.split(':')[0]`
- JSON parse vs ENOENT differentiation in config loading
- 5 defensive checks in `GameDataDownloader.ts`
- Removed unused `hasActiveDownloads()`; added `LegacyServer.clearCache()`
- Fixed hostname variation skip for already-prefixed hostnames
- Per-request logging downgraded info→debug

**Frontend (20 fixes):**

- `id!` → `id ?? ''` in `PlaylistDetailView.tsx`; NaN guard in
  `UserPlaylistDetailView.tsx`
- `|| 24` → `?? 24` in `HomeView.tsx`
- `LazyImage.tsx`: cancellation flag + ref-stored callbacks
- `NetworkStatusIndicator.tsx`: timeout moved to useRef
- Tag keys index→`tag.trim()` in 2 views
- `console.error`/`console.debug` → `logger` in 3 files
- Removed `window.opera` dead code; added `GameCard.displayName`
- Removed `isInView` from `useLazyLoad` deps

**Key Lessons:**

- Use `switch` for mutually exclusive branching, not overlapping `if` blocks
- Add `.catch()` to all fire-and-forget promises
- Call `.unref()` on non-critical intervals to allow graceful shutdown
- Strip port from `req.headers.host` before hostname validation
- Store setTimeout/setInterval IDs in `useRef`, not `let` variables
- Return cleanup functions from `useEffect` for `new Image()` preloads
- Export shared constants to eliminate magic number duplication

### 2026-02-07: 22 High-Priority Security & Data Integrity Fixes

**Change:** Applied 22 high-priority fixes across backend, game service, and
frontend from targeted code review.

**Backend Auth & Data Integrity (7 fixes):**

- `middleware/auth.ts`: Guest users (id=0) excluded from shared access bypass
- `AuthService.ts`: Registration uniqueness checks moved inside transaction
  (TOCTOU fix)
- `UserService.ts`: `createUser()` wrapped in transaction (TOCTOU fix)
- `SystemSettingsService.ts`: `updateCategory()` wrapped in transaction
- `user-playlists.ts`: Zod schema limits aligned (500→100)
- `UserPlaylistService.ts`: `cloneSharedPlaylist()` wrapped in transaction
- `downloads.ts`: SSE write-after-close prevention with `closed` flag

**DownloadManager (1 fix):**

- `DownloadManager.ts`: AbortSignal listener cleanup in finally blocks (memory
  leak fix)

**Game Service (8 fixes):**

- `zip-manager.ts`: ZIP handle closed on mount failure + `shuttingDown` flag for
  graceful shutdown
- `proxy-request-handler.ts`: `collectRequestBody` double-settlement prevented
  with `settled` flag
- `legacy-server.ts`: Only cache ENOENT (not validation errors) + URL
  constructor for path safety
- `GameDataDownloader.ts`: DNS rebinding SSRF prevention via `dns.lookup()`
  pre-check
- `cgi-executor.ts`: Symlink bypass prevention via `fs.realpath()` before path
  validation
- `gamezipserver.ts`: Downloaded file path re-validated after download

**Frontend (6 fixes):**

- `store/auth.ts`: Guest permissions restricted to read-only (removed
  `games.play`)
- `store/theme.ts`: Server data validated before applying (mode + primaryColor)
- `AuthContext.tsx`: Maintenance mode check uses authenticated `apiClient`;
  permissions refreshed from server after token refresh
- `useSharedPlaylistAccess.ts`: `encodeURIComponent(shareToken)` for URL safety
- `usePlayTracking.ts`: `isMountedRef` guard prevents StrictMode double session
  start

**Key Lessons:**

- Wrap all uniqueness-check-then-insert patterns in `db.transaction()` to
  prevent TOCTOU races
- Track `closed` state for SSE connections and check before every `res.write()`
- Close ZIP handles in catch blocks when mount operations fail after open
- Use `shuttingDown` flag to prevent new resource acquisition during shutdown
- Only cache definitive ENOENT errors, never transient failures (negative cache
  poisoning)
- Use `URL` constructor for safe URL resolution, not string concatenation
- Pre-check DNS resolution to block private addresses (DNS rebinding SSRF)
- Resolve symlinks with `fs.realpath()` before path security validation
- Validate server data (theme settings) before applying to prevent crashes
- Use `isMountedRef` + timeout to survive React StrictMode unmount/remount
  cycles

**Files Modified (19 files):**

- Backend: `auth.ts` (middleware), `AuthService.ts`, `UserService.ts`,
  `SystemSettingsService.ts`, `user-playlists.ts`, `UserPlaylistService.ts`,
  `downloads.ts`, `DownloadManager.ts`
- Game service: `zip-manager.ts`, `proxy-request-handler.ts`,
  `legacy-server.ts`, `GameDataDownloader.ts`, `cgi-executor.ts`,
  `gamezipserver.ts`
- Frontend: `store/auth.ts`, `store/theme.ts`, `AuthContext.tsx`,
  `useSharedPlaylistAccess.ts`, `usePlayTracking.ts`

## Documentation Maintenance

**After ANY code change, always:**

1. **Run Prettier** on all new and modified files:
   `npx prettier --write <file1> <file2> ...` — also instruct sub-agents to do
   this.
2. Verify no build errors: `npm run typecheck` and `npm run build`
3. Ask the user if relevant documentation should be updated
4. Update docs as needed:
   - Architecture → `docs/02-architecture/`
   - API endpoints → `docs/06-api-reference/`
   - DB schema → `docs/12-reference/database-schema-reference.md`
   - Features → `docs/10-features/`
   - Components → `docs/04-frontend/components/`
   - Config → `docs/03-backend/configuration.md` or
     `docs/09-deployment/environment-variables.md`
