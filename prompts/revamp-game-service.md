# Game Service Revamp: Backend Monolith Integration

**Document Version**: 1.0
**Created**: 2026-02-06
**Target**: Claude Code (claude.ai/code)

---

## Executive Summary

This prompt guides the implementation of merging the standalone `game-service` into the `backend` service, consolidating three services (backend, frontend, game-service) into two (backend, frontend). The revamp simplifies deployment, eliminates complex inter-service communication, and provides a unified game content delivery system that follows the FlashpointGameServer reference implementation.

---

## Table of Contents

1. [Project Context](#project-context)
2. [Current Architecture](#current-architecture)
3. [Goals & Requirements](#goals--requirements)
4. [Reference Implementation](#reference-implementation)
5. [Implementation Strategy](#implementation-strategy)
6. [Technical Specifications](#technical-specifications)
7. [Migration Plan](#migration-plan)
8. [Testing & Validation](#testing--validation)
9. [Documentation Updates](#documentation-updates)
10. [Acceptance Criteria](#acceptance-criteria)

---

## Project Context

### System Overview

Flashpoint Web is a self-hosted web application for browsing and playing games from the Flashpoint Archive. It's currently a monorepo with three independent services:

- **backend** (Express/TypeScript, port 3100): REST API, game metadata, user management, SQLite databases
- **frontend** (React/Vite, port 5173): Web UI, TanStack Query, Zustand state management
- **game-service** (Express/TypeScript, ports 22500 + 22501): Game content proxy and ZIP server

### Problem Statement

The current three-service architecture introduces unnecessary complexity:

1. **Deployment overhead**: Three separate processes to manage, configure, and monitor
2. **Complex communication**: Backend makes fire-and-forget POST to game-service, frontend polls contentUrl for download completion
3. **Resource inefficiency**: Two separate Node.js processes for what should be one service
4. **Error handling complexity**: Cross-service failures require coordinated error handling

### Solution

Merge game-service functionality INTO the backend service, creating a unified backend monolith that handles:
- REST API endpoints (existing)
- Game metadata and user management (existing)
- Game file serving and proxying (from game-service)
- ZIP mounting and streaming (from game-service)

---

## Current Architecture

### Backend Service (Port 3100)

**Entry Point**: `backend/src/server.ts`

**Key Services**:
- `DatabaseService.ts`: Manages flashpoint.sqlite with hot-reload on file changes
- `UserDatabaseService.ts`: Manages user.db with migrations
- `GameService.ts`: Game metadata queries
- `GameDataService.ts`: Game ZIP mounting via game-service API calls
- `AuthService.ts`: JWT authentication
- `PlayTrackingService.ts`: Play session tracking

**Routes**: `backend/src/routes/`
- `games.ts`: Game listing, search, launch data (`GET /api/games/:id/launch`)
- `auth.ts`: Login, logout, token refresh
- `playlists.ts`: User playlists
- Plus routes for favorites, settings, etc.

**Config**: `backend/src/config.ts`
- Loads `FLASHPOINT_PATH` from env
- Auto-detects edition from `version.txt`
- Derives all paths from base Flashpoint path

### Game Service (Ports 22500, 22501)

**Entry Point**: `game-service/src/index.ts`

**Server 1: HTTP Proxy Server (Port 22500)**
- `http-proxy-server.ts`: Server setup
- `proxy-request-handler.ts`: Routes proxy requests to GameZip or legacy server
- `legacy-server.ts`: Fallback chain (htdocs → overrides → CGI → CDN → cache)
- `cgi-executor.ts`: PHP-CGI execution for legacy games

**Server 2: GameZip Server (Port 22501)**
- `gamezipserver.ts`: ZIP mount API, file serving from ZIPs
- `zip-manager.ts`: LRU cache for mounted ZIPs (max 100, 30min TTL)
- `services/GameDataDownloader.ts`: Downloads ZIPs from gameDataSources
- `services/PreferencesService.ts`: Reads preferences.json (1min cache)

**Utilities** (to be moved):
- `config.ts`: ConfigManager for proxySettings.json
- `mimeTypes.ts`: 199+ MIME type mappings
- `utils/htmlInjector.ts`: Unity WebGL polyfills
- `utils/pathSecurity.ts`: Directory traversal protection
- `utils/cors.ts`: CORS header utilities
- `validation/schemas.ts`: Zod schemas for game IDs, hostnames, paths

### Frontend (Port 5173)

**Game Player Flow**:
1. User clicks "Play" on game
2. `GamePlayerView.tsx` calls `useGameLaunchData(id)` hook
3. Hook fetches `GET /api/games/:id/launch` from backend
4. Backend returns `LaunchData` with `contentUrl` (pointing to port 22500)
5. `GamePlayer.tsx` renders iframe/Ruffle pointing to `contentUrl`
6. If `needsDownload: true`, polls `contentUrl` every 3s until 200 OK

**Current Complexity**:
- Frontend polls contentUrl until game-service returns 200 (vs 503)
- Backend makes fire-and-forget POST to game-service `/mount/:id`
- No coordination between backend mount request and frontend polling

---

## Goals & Requirements

### Primary Goals

1. **Simplify Deployment**
   - Reduce from 3 services to 2 services (backend + frontend)
   - Single Node.js process for all backend functionality
   - Single set of environment variables for backend

2. **Simplify Play Game Flow**
   - Eliminate fire-and-forget POST to game-service
   - Eliminate frontend download polling
   - Backend handles everything: file serving, downloading, proxying

3. **Maintain Compatibility**
   - Support both Infinity Edition (download-on-demand) and Ultimate Edition (pre-downloaded)
   - Follow FlashpointGameServer implementation patterns
   - Preserve all existing game content serving capabilities

4. **Improve Performance**
   - Reduce inter-service network overhead
   - Unified logging and monitoring
   - Shared connection pools and caches

### Functional Requirements

#### FR-1: Unified Content Serving

Backend must serve game files directly via two routes:

1. **Proxy route** (`/game-proxy/*`): Handles proxy-style URLs, routes to GameZip or legacy fallback
2. **GameZip API** (`/game-zip/*`): Mount/unmount operations, direct ZIP file access

#### FR-2: Download-on-Demand

When a game's ZIP file doesn't exist locally:

1. Check `game_data` table for `dateAdded` and `sha256`
2. Download from `gameDataSources` in `preferences.json` (sequential fallback)
3. Verify SHA256 hash if provided
4. Save to `{FLASHPOINT_PATH}/Data/Games/{gameId}-{timestamp}.zip`
5. Mount ZIP and serve file

**Filename Pattern**: `{gameId}-{timestamp}.zip` where `timestamp = new Date(dateAdded).getTime()`

#### FR-3: Serve Files from ZIP Without Extraction

Use `node-stream-zip` to serve files from ZIP archives:

1. Mount ZIP via `/game-zip/mount/:id` endpoint
2. Stream files directly from ZIP
3. Search with path variants: `content/{path}`, `htdocs/{path}`, `{path}`, `Legacy/htdocs/{path}`
4. Case-insensitive matching on Windows

#### FR-4: Legacy Content Fallback Chain

When file not found in ZIPs, try:

1. Local files with query string (URL-encoded filenames)
2. Local exact files in `Legacy/htdocs/{host}/{path}`
3. Override paths: `Legacy/middleware_overrides/{host}/{path}`
4. CGI-BIN: `Legacy/cgi-bin/{host}/{path}` (PHP/Perl execution)
5. Directory index files (html, htm, php, asp, aspx, jsp, jspx)
6. Online server (`infinityServerURL` from proxySettings.json) - download and cache locally
7. MAD4FP mode (download from live internet, cache locally)

#### FR-5: Security Preservation

Maintain all existing security measures:

- Path sanitization (prevent directory traversal)
- Hostname validation (prevent SSRF)
- Request body size limits (prevent DoS)
- Timeout enforcement (prevent hung connections)
- Error message sanitization (prevent path leakage)

---

## Reference Implementation

### FlashpointGameServer (Go)

**Location**: `D:\Repositories\Community\FlashpointGameServer`

This is the authoritative reference implementation. Key aspects to replicate:

#### Proxy Server Logic

- Intercepts HTTP requests with proxy-style URLs: `GET http://domain.com/path HTTP/1.1`
- Routes to GameZip first (via internal request), then legacy server fallback
- Sets Content-Type based on file extension (not server response)
- Handles CORS, brotli decompression, MIME types (199+ types)

#### GameZip Server

- Mounts ZIP archives via API: `POST /fpProxy/api/mount`
- Serves files from ZIP without extraction
- Path search variants: `content/{path}`, `htdocs/{path}`, `{path}`, `Legacy/htdocs/{path}`
- Case-insensitive matching on Windows
- PHP/CGI execution for extracted scripts (if enabled)
- .htaccess rewrite rule support (basic)

#### Legacy Server Fallback

Implements the 7-step fallback chain listed in FR-4.

**IMPORTANT FINDING**: `externalFilePaths` in `proxySettings.json` is NOT used in the Go implementation for serving main game files. The actual configuration used:

- `infinityServerURL`: CDN fallback for htdocs content (web assets, NOT game ZIPs)
- `gameDataSources` in preferences.json: For downloading game ZIP packages
- `useMad4FP` + live web URLs: For downloading missing assets from the real internet

**Do NOT implement `externalFilePaths` support** - it appears to be vestigial/legacy configuration.

### Flashpoint Launcher (Electron/TypeScript)

**Location**: `D:\Repositories\Community\launcher`

Reference for download mechanism:

**Configuration** (`preferences.json`):
```json
{
  "gameDataSources": [
    {
      "type": "raw",
      "name": "Flashpoint Project",
      "arguments": ["https://download.flashpointarchive.org/gib-roms/Games/"]
    }
  ],
  "dataPacksFolderPath": "Data/Games"
}
```

**Download Process**:
1. Construct filename: `{gameId}-{timestamp}.zip` where `timestamp = new Date(dateAdded).getTime()`
2. Build URL: `baseUrl + filename` (e.g., `https://download.flashpointarchive.org/gib-roms/Games/abc123-1234567890.zip`)
3. Download to `.temp` file first
4. Verify SHA256 hash if provided
5. Rename to final path: `{FLASHPOINT_PATH}/Data/Games/{filename}`
6. Sequential fallback through multiple sources on failure

---

## Implementation Strategy

### Phase 1: Backend Integration (Core Functionality)

**Goal**: Move game-service components into backend, minimal disruption

#### Step 1.1: Move Utilities (Low Risk)

Copy utilities from `game-service/src/` to `backend/src/`:

```
game-service/src/mimeTypes.ts              → backend/src/utils/mimeTypes.ts
game-service/src/utils/htmlInjector.ts     → backend/src/utils/htmlInjector.ts
game-service/src/utils/pathSecurity.ts     → backend/src/utils/pathSecurity.ts  (already exists, merge)
game-service/src/utils/cors.ts             → backend/src/utils/cors.ts
game-service/src/utils/logger.ts           → backend/src/utils/logger.ts        (merge with existing)
game-service/src/validation/schemas.ts     → backend/src/validation/gameSchemas.ts
```

**Rationale**: Pure utility functions, no side effects, easy to test in isolation.

#### Step 1.2: Move Configuration (Medium Risk)

Integrate configuration management:

```
game-service/src/config.ts                 → backend/src/config/gameServiceConfig.ts
game-service/src/services/PreferencesService.ts → backend/src/services/PreferencesService.ts
```

Update `backend/src/config.ts` to:
- Include game service configuration (proxy port, gamezip port)
- Initialize PreferencesService on startup
- Expose game service settings to routes

#### Step 1.3: Move ZIP Management (High Value)

```
game-service/src/zip-manager.ts            → backend/src/services/ZipManager.ts
game-service/src/services/GameDataDownloader.ts → backend/src/services/GameDataDownloader.ts
```

**Changes Needed**:
- ZipManager: Change from singleton to service class
- GameDataDownloader: Update to use backend logger and config

#### Step 1.4: Create Backend Routes (Critical Path)

Create new route files:

**File**: `backend/src/routes/game-proxy.ts`
- Handles proxy-style requests: `GET /game-proxy/*`
- Implements ProxyRequestHandler logic
- Routes to GameZip or legacy fallback
- Returns game content with CORS headers

**File**: `backend/src/routes/game-zip.ts`
- `POST /game-zip/mount/:id`: Mount ZIP
- `DELETE /game-zip/mount/:id`: Unmount ZIP
- `GET /game-zip/mounts`: List mounted ZIPs
- `GET /game-zip/*`: Serve file from mounted ZIP

**File**: `backend/src/services/LegacyContentService.ts`
- Implements legacy server fallback chain
- Replaces `game-service/src/legacy-server.ts`
- Handles htdocs, overrides, CGI, CDN, caching

**File**: `backend/src/services/CgiExecutor.ts` (if needed)
- PHP-CGI execution
- Copy from `game-service/src/cgi-executor.ts`

#### Step 1.5: Update Existing Routes

**File**: `backend/src/routes/games.ts`

**Current**:
```typescript
// GET /api/games/:id/launch
// 1. Fire-and-forget POST to game-service /mount/:id
gameDataService.mountGameZip(game.id).catch(...);

// 2. Return launch data with contentUrl pointing to port 22500
contentUrl = `${config.gameServiceExternalUrl}/${fullUrl}`;
```

**New**:
```typescript
// GET /api/games/:id/launch
// 1. Check if ZIP exists locally (quick filesystem check)
const zipExists = await gameDataService.checkZipExists(game.id);

// 2. Return launch data with contentUrl pointing to backend /game-proxy
contentUrl = `/game-proxy/${fullUrl}`;

// 3. Include needsDownload flag (for frontend UI only, not used in revamped flow)
needsDownload: !zipExists
```

**Rationale**:
- No more fire-and-forget POST
- Backend /game-proxy route handles everything (mount, download, serve)
- Frontend just loads iframe, no polling

### Phase 2: Frontend Simplification

**Goal**: Remove download polling, trust backend to handle everything

#### Step 2.1: Update GamePlayer Component

**File**: `frontend/src/components/player/GamePlayer.tsx`

**Remove**:
- Download polling logic (`useEffect` with `setInterval`)
- `isWaitingForDownload` state management
- 503 retry logic

**Simplify**:
```typescript
// Before: Complex polling with 503 handling
useEffect(() => {
  if (!isWaitingForDownload || !contentUrl) return;

  const poll = async () => {
    const response = await fetch(contentUrl, { method: 'HEAD', mode: 'cors' });
    if (response.ok) {
      setIsWaitingForDownload(false);
    }
  };

  poll();
  pollTimerRef.current = setInterval(poll, 3000);

  return () => clearInterval(pollTimerRef.current!);
}, [isWaitingForDownload, contentUrl]);

// After: Just load the iframe
// Backend handles download transparently via /game-proxy route
// If download needed, backend serves a loading page that auto-refreshes
<iframe src={contentUrl} ... />
```

**Rationale**:
- Backend `/game-proxy` route serves loading page with meta refresh if download in progress
- Iframe automatically refreshes until game is ready
- No frontend JavaScript polling needed

#### Step 2.2: Update GamePlayerView

**File**: `frontend/src/views/GamePlayerView.tsx`

**Changes**:
- Remove `needsDownload` handling (backend returns loading page instead)
- Simplify player props (no download state)

#### Step 2.3: Update API Types

**File**: `frontend/src/types/game.ts`

**Keep `needsDownload` for informational purposes**:
```typescript
export interface LaunchData {
  gameId: string;
  title: string;
  platform: string;
  launchCommand: string;
  contentUrl: string;
  applicationPath: string;
  playMode: string;
  canPlayInBrowser: boolean;
  needsDownload: boolean; // Informational only - backend handles it
}
```

### Phase 3: Backend Server Integration

**Goal**: Start both REST API and game proxy servers in same process

#### Step 3.1: Update Server Startup

**File**: `backend/src/server.ts`

**Add after Express app setup**:
```typescript
import { createGameProxyServer } from './services/gameProxy';
import { createGameZipServer } from './services/gameZip';

// ... existing Express app setup ...

// Start main REST API server
const apiServer = app.listen(config.port, () => {
  logger.info(`Backend API server started on port ${config.port}`);
});

// Start game proxy server (handles game content requests)
const proxyServer = await createGameProxyServer({
  port: config.gameProxyPort || 22500,
  legacyHTDOCSPath: config.flashpointHtdocsPath,
  gameDataPath: config.flashpointGamesPath,
  allowCrossDomain: true,
});
logger.info(`Game Proxy server started on port ${config.gameProxyPort || 22500}`);

// Start GameZip server (handles ZIP mount API)
const zipServer = await createGameZipServer({
  port: config.gameZipPort || 22501,
});
logger.info(`GameZip server started on port ${config.gameZipPort || 22501}`);

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await Promise.all([
    new Promise(resolve => apiServer.close(resolve)),
    new Promise(resolve => proxyServer.close(resolve)),
    new Promise(resolve => zipServer.close(resolve)),
  ]);
  process.exit(0);
});
```

**Alternative Approach (Simpler)**: Mount proxy routes on Express app instead of separate servers

```typescript
// Add to existing Express app
app.use('/game-proxy', gameProxyRouter);
app.use('/game-zip', gameZipRouter);

// Single server on port 3100 handles everything
```

**Recommendation**: Use alternative approach (single Express app) for simplicity.

#### Step 3.2: Update Configuration

**File**: `backend/src/config.ts`

Add game service configuration:
```typescript
export const config = {
  // ... existing config ...

  // Game service (merged into backend)
  gameProxyEnabled: process.env.GAME_PROXY_ENABLED !== 'false', // Default: true
  gameProxyUrl: process.env.GAME_PROXY_URL || 'http://localhost:3100/game-proxy',
  gameZipUrl: process.env.GAME_ZIP_URL || 'http://localhost:3100/game-zip',

  // Legacy configuration (remove gameServiceExternalUrl)
  // gameServiceExternalUrl: ..., // DELETE THIS
};
```

**Update `.env`**:
```bash
# Remove game-service specific vars
# GAME_SERVICE_HOST=localhost  # DELETE
# GAME_SERVICE_PROXY_PORT=22500  # DELETE
# GAME_SERVICE_GAMEZIP_PORT=22501  # DELETE

# No new vars needed - uses main backend port
```

### Phase 4: Docker & Deployment Updates

#### Step 4.1: Update Docker Compose

**File**: `docker-compose.yml`

**Remove game-service**:
```yaml
services:
  backend:
    # ... existing config ...
    # Remove game-service environment vars

  frontend:
    # ... existing config ...

  # DELETE entire game-service section:
  # game-service:
  #   image: ...
  #   ...
```

**Update Nginx config** (if separate file):
```nginx
# Route /game-proxy to backend (was to game-service port 22500)
location /game-proxy/ {
    proxy_pass http://backend:3100;
    # ... CORS headers, timeouts, etc.
}

# Route /game-zip to backend (was to game-service port 22501)
location /game-zip/ {
    proxy_pass http://backend:3100;
    # ... CORS headers, timeouts, etc.
}
```

#### Step 4.2: Update Dockerfile

**File**: `backend/Dockerfile`

No changes needed - already builds TypeScript to `dist/`.

#### Step 4.3: Update Package Scripts

**File**: `package.json` (root)

**Remove**:
```json
{
  "scripts": {
    "dev:game-service": "...",  // DELETE
  }
}
```

**Update**:
```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",  // Remove game-service
  }
}
```

### Phase 5: Cleanup

#### Step 5.1: Remove game-service Directory

```bash
# After successful testing
rm -rf game-service/
```

#### Step 5.2: Update Documentation

See [Documentation Updates](#documentation-updates) section.

#### Step 5.3: Update Tests

Update backend tests to cover new routes:
- `/game-proxy/*` route tests
- `/game-zip/*` route tests
- ZIP mounting tests
- Download tests
- Legacy fallback tests

---

## Technical Specifications

### Backend Routes

#### Game Proxy Route: `/game-proxy/*`

**Purpose**: Serve game content files (SWF, HTML, JS, images, etc.)

**Handler**: `ProxyRequestHandler` (from game-service)

**Flow**:
1. Parse URL (proxy-style or standard)
2. Sanitize and validate path (security)
3. Try GameZip server (internal request to `/game-zip/*`)
4. If 200: Return file
5. If 202: Return loading page with meta refresh
6. If 404: Try legacy fallback chain
7. Inject HTML polyfills if needed
8. Return with CORS headers

**Example**:
```
GET /game-proxy/http://img.y8.com/games/game.swf
→ Checks ZIP for img.y8.com/games/game.swf
→ If not found, tries Legacy/htdocs/img.y8.com/games/game.swf
→ If not found, tries CDN download
→ Returns SWF with Content-Type: application/x-shockwave-flash
```

#### GameZip Route: `/game-zip/*`

**Sub-routes**:

1. **POST /game-zip/mount/:id**
   - Request body: `{ zipPath: string, gameId?: string, dateAdded?: string, sha256?: string }`
   - If ZIP doesn't exist + `gameId`/`dateAdded` provided → download from gameDataSources
   - Mount ZIP via ZipManager
   - Return: `{ success: true, id: string, downloading: boolean }`

2. **DELETE /game-zip/mount/:id**
   - Unmount ZIP
   - Return: `{ success: true, id: string }`

3. **GET /game-zip/mounts**
   - List all mounted ZIPs
   - Return: `{ mounts: Array<{ id: string, zipPath: string, fileCount: number }> }`

4. **GET /game-zip/:id/*path**
   - Serve file from mounted ZIP
   - Search with path variants
   - Return file with appropriate Content-Type

### Services

#### ZipManager

**File**: `backend/src/services/ZipManager.ts`

**Responsibilities**:
- Mount ZIP files (load into memory index)
- Unmount ZIP files (release memory)
- LRU cache (max 100 ZIPs, 30min TTL)
- File search with path variants
- Stream files from ZIP

**API**:
```typescript
class ZipManager {
  mount(id: string, zipPath: string): Promise<void>;
  unmount(id: string): Promise<boolean>;
  unmountAll(): Promise<void>;
  findFile(relPath: string): Promise<{ data: Buffer, mountId: string } | null>;
  getMountedZips(): Array<{ id: string, zipPath: string }>;
}
```

#### GameDataDownloader

**File**: `backend/src/services/GameDataDownloader.ts`

**Responsibilities**:
- Read `gameDataSources` from preferences.json
- Download ZIP from sources (sequential fallback)
- Verify SHA256 hash
- Save to `Data/Games/{gameId}-{timestamp}.zip`

**API**:
```typescript
interface DownloadParams {
  gameId: string;
  dateAdded: string;
  sha256?: string;
  targetPath: string;
}

interface DownloadResult {
  success: boolean;
  filePath?: string;
  sourceUsed?: string;
  error?: string;
}

class GameDataDownloader {
  download(
    params: DownloadParams,
    onProgress?: (downloaded: number, total: number, source: string) => void
  ): Promise<DownloadResult>;
}
```

#### LegacyContentService

**File**: `backend/src/services/LegacyContentService.ts`

**Responsibilities**:
- Implement 7-step fallback chain (see FR-4)
- Handle CGI execution (PHP, Perl)
- Download from CDN with local caching
- MAD4FP mode (download from live internet)

**API**:
```typescript
interface HttpRequestContext {
  method: string;
  headers: Record<string, string>;
  body?: Buffer;
}

interface LegacyFileResponse {
  data?: Buffer;
  stream?: Readable;
  contentType: string;
  statusCode: number;
  source: string;
  size?: number;
  headers?: Record<string, string>;
}

class LegacyContentService {
  serveLegacy(
    hostname: string,
    urlPath: string,
    requestContext: HttpRequestContext
  ): Promise<LegacyFileResponse>;
}
```

### Data Flow

#### Play Game (Simplified)

```
User clicks Play
  ↓
Frontend: GET /api/games/:id/launch
  ↓
Backend: Check if ZIP exists
  ↓
Backend: Return LaunchData { contentUrl: "/game-proxy/http://domain.com/game.swf" }
  ↓
Frontend: Load iframe with contentUrl
  ↓
Backend /game-proxy route:
  ↓
  1. Parse URL → hostname: domain.com, path: /game.swf
  ↓
  2. Try internal request to /game-zip/*/domain.com/game.swf
  ↓
  3. GameZip checks if ZIP mounted
  ↓
  4. If not mounted → check if ZIP exists locally
  ↓
  5. If not exists → download from gameDataSources
     ↓
     5a. Start download in background
     ↓
     5b. Return 202 with loading HTML page (meta refresh every 2s)
  ↓
  6. If exists or download complete → mount ZIP
  ↓
  7. Find file in ZIP → stream to response
  ↓
  8. If not in ZIP → try legacy fallback chain
  ↓
Frontend: Iframe loads game content (or loading page that auto-refreshes)
```

**Key Improvement**: No frontend polling needed. Backend serves loading page with `<meta http-equiv="refresh" content="2">` that auto-refreshes until download completes.

---

## Migration Plan

### Prerequisites

Before starting implementation:

1. **Review Documentation**:
   - `docs/05-game-service/architecture.md` - Current game-service design
   - `docs/05-game-service/gamezip-server.md` - ZIP mounting details
   - `docs/05-game-service/proxy-server.md` - Proxy request handling
   - `docs/03-backend/architecture.md` - Backend service structure

2. **Test Current System**:
   - Play a Flash game (ZIP exists locally)
   - Play an HTML5 game (ZIP exists locally)
   - Play a game that needs download (delete ZIP first)
   - Verify all cases work before migration

3. **Backup**:
   - Commit all current changes
   - Create feature branch: `feature/game-service-revamp`

### Step-by-Step Execution

#### Week 1: Backend Integration (Core)

**Day 1-2**: Move utilities and configuration
- Copy utility files (mimeTypes, htmlInjector, pathSecurity, cors)
- Copy validation schemas
- Integrate configuration (gameServiceConfig, PreferencesService)
- Run `npm run typecheck` in backend
- Fix import errors

**Day 3-4**: Move ZIP management
- Copy ZipManager to backend services
- Copy GameDataDownloader to backend services
- Update imports to use backend logger and config
- Test ZipManager in isolation (unit tests)

**Day 5**: Create backend routes (stubs)
- Create `backend/src/routes/game-proxy.ts` (stub handlers)
- Create `backend/src/routes/game-zip.ts` (stub handlers)
- Register routes in `backend/src/routes/index.ts`
- Test routes return 501 Not Implemented

#### Week 2: Route Implementation

**Day 1-2**: Implement GameZip route
- Implement POST /game-zip/mount/:id
- Implement DELETE /game-zip/mount/:id
- Implement GET /game-zip/mounts
- Implement GET /game-zip/*
- Test with curl/Postman

**Day 3-4**: Implement game-proxy route
- Copy ProxyRequestHandler logic
- Implement LegacyContentService
- Integrate with GameZip route (internal requests)
- Test with curl/Postman

**Day 5**: Update existing routes
- Update `backend/src/routes/games.ts` GET /api/games/:id/launch
- Change contentUrl to point to /game-proxy
- Remove fire-and-forget mount call
- Test via frontend

#### Week 3: Frontend & Testing

**Day 1-2**: Frontend updates
- Simplify GamePlayer.tsx (remove polling)
- Update GamePlayerView.tsx
- Test game loading with various scenarios

**Day 3-4**: Integration testing
- Test Infinity Edition (download-on-demand)
- Test Ultimate Edition (pre-downloaded)
- Test fallback chain (missing files)
- Test CGI execution (if needed)

**Day 5**: Docker & deployment
- Update docker-compose.yml
- Update Nginx config
- Test Docker build and deployment
- Verify production readiness

#### Week 4: Cleanup & Documentation

**Day 1-2**: Code cleanup
- Remove game-service directory
- Remove old environment variables
- Update package.json scripts
- Run Prettier on all files

**Day 3-4**: Documentation updates
- Update all docs/ files (see section below)
- Update README.md
- Update CLAUDE.md

**Day 5**: Final validation
- Run full test suite
- Verify all acceptance criteria
- Merge to master

---

## Testing & Validation

### Unit Tests

Create test files:

1. **backend/tests/services/ZipManager.test.ts**
   - Test mount/unmount operations
   - Test LRU cache eviction
   - Test file finding with path variants
   - Test case-insensitive matching

2. **backend/tests/services/GameDataDownloader.test.ts**
   - Test download from gameDataSources
   - Test SHA256 verification
   - Test sequential fallback
   - Test error handling

3. **backend/tests/services/LegacyContentService.test.ts**
   - Test each step in fallback chain
   - Test CGI execution
   - Test CDN download and caching

4. **backend/tests/routes/game-proxy.test.ts**
   - Test proxy-style URL parsing
   - Test routing to GameZip vs legacy
   - Test CORS headers
   - Test error handling

5. **backend/tests/routes/game-zip.test.ts**
   - Test mount endpoint
   - Test file serving
   - Test download-on-demand

### Integration Tests

Scenarios to test end-to-end:

1. **Play Flash Game (ZIP exists)**:
   - Start: User clicks Play
   - Expected: Game loads immediately in iframe
   - Verify: No download, no polling, instant play

2. **Play Flash Game (ZIP missing, needs download)**:
   - Start: User clicks Play, ZIP deleted
   - Expected: Loading page shown, auto-refreshes, then game loads
   - Verify: Download triggered, SHA256 verified, game plays

3. **Play HTML5 Game**:
   - Start: User clicks Play
   - Expected: Game loads in iframe
   - Verify: index.html served with correct CORS

4. **Legacy Fallback (htdocs file)**:
   - Start: Request file not in ZIP but in htdocs
   - Expected: File served from htdocs
   - Verify: Correct Content-Type, no errors

5. **CGI Execution (if applicable)**:
   - Start: Request PHP file
   - Expected: PHP-CGI executes, dynamic content returned
   - Verify: Headers parsed, body correct

### Performance Tests

Measure and compare:

1. **Cold Start (ZIP not mounted)**:
   - Before: Fire-and-forget POST + frontend polling (3s intervals)
   - After: Single request, backend handles mounting
   - Target: <2s for locally cached ZIP

2. **Warm Start (ZIP already mounted)**:
   - Before: ~500ms (game-service lookup)
   - After: ~200ms (in-process lookup)
   - Target: <500ms

3. **Download Time (ZIP missing)**:
   - Before: Download + frontend polling overhead
   - After: Download + auto-refresh HTML page
   - Target: Same download time, simpler frontend

4. **Memory Usage**:
   - Before: 2 Node processes (backend + game-service)
   - After: 1 Node process
   - Target: <20% increase in backend memory

### Browser Testing

Test in browsers:

- Chrome (latest)
- Firefox (latest)
- Safari (latest, if available)
- Edge (latest)

Verify:
- Flash games load via Ruffle
- HTML5 games load in iframe
- CORS headers work correctly
- Fullscreen works
- No console errors

---

## Documentation Updates

### Files to Update

#### 1. Architecture Documentation

**File**: `docs/02-architecture/system-architecture.md`

**Changes**:
- Update service count from 3 to 2
- Remove game-service from architecture diagram
- Add game proxy and GameZip functionality to backend service
- Update ports: Backend handles 3100 (API + game content)

**File**: `docs/03-backend/architecture.md`

**Changes**:
- Add section: "Game Content Serving"
- Document new routes: /game-proxy and /game-zip
- Document new services: ZipManager, GameDataDownloader, LegacyContentService
- Update data flow diagrams

#### 2. Game Service Documentation

**Delete or Archive**:
- `docs/05-game-service/` entire directory (or move to `docs/archived/`)

**Create New**:
- `docs/03-backend/game-content-serving.md` - Comprehensive guide to game content serving within backend
  - ZIP mounting and streaming
  - Download-on-demand
  - Legacy fallback chain
  - CGI execution
  - Security measures

#### 3. API Reference

**File**: `docs/06-api-reference/README.md`

**Add**:
- `/game-proxy/*` - Game content proxy route
- `/game-zip/mount/:id` - Mount ZIP
- `/game-zip/mounts` - List mounts
- `/game-zip/*` - Serve from ZIP

**Update**:
- `/api/games/:id/launch` - contentUrl now points to /game-proxy

#### 4. Frontend Documentation

**File**: `docs/04-frontend/components/component-overview.md`

**Update**:
- GamePlayer component: Remove polling logic description
- Document simplified loading flow

**File**: `docs/04-frontend/architecture.md`

**Update**:
- Remove game-service from service dependencies
- Update game loading flow diagram

#### 5. Deployment Documentation

**File**: `docs/09-deployment/docker.md`

**Changes**:
- Remove game-service from docker-compose.yml
- Update Nginx configuration
- Update environment variables

**File**: `docs/09-deployment/environment-variables.md`

**Changes**:
- Remove GAME_SERVICE_* variables
- Document FLASHPOINT_PATH as single source of truth

#### 6. Development Documentation

**File**: `docs/08-development/setup-guide.md`

**Changes**:
- Update npm run dev (no longer starts game-service)
- Update port information
- Simplify setup steps

**File**: `docs/08-development/commands.md`

**Changes**:
- Remove game-service commands
- Update monorepo commands

#### 7. Root Documentation

**File**: `CLAUDE.md`

**Changes**:
- Update project overview (2 services, not 3)
- Update architecture section
- Update development commands
- Add migration notes to "Recent Changes & Lessons Learned"
- Update environment configuration examples

**File**: `README.md` (if exists)

**Changes**:
- Update service count
- Update quick start guide
- Update architecture diagram

### Documentation Template

When updating docs, follow this pattern:

```markdown
## Game Content Serving (Backend)

> **Note**: As of 2026-02-06, the standalone game-service has been merged into the backend service.
> This simplifies deployment and eliminates inter-service communication overhead.

### Overview

The backend now handles all game content serving through two routes:
- `/game-proxy/*`: Proxies game content requests (SWF, HTML, assets)
- `/game-zip/*`: ZIP mounting and file serving

### Architecture

[Updated diagram showing backend with integrated game serving]

### Migration Notes

**Before** (3 services):
- backend (port 3100): REST API
- game-service (ports 22500, 22501): Game content
- frontend (port 5173): Web UI

**After** (2 services):
- backend (port 3100): REST API + game content
- frontend (port 5173): Web UI

### Breaking Changes

None for end users. For developers:
- Remove `GAME_SERVICE_*` environment variables
- Update contentUrl to point to `/game-proxy`
- Remove game-service from docker-compose.yml
```

---

## Acceptance Criteria

The implementation is complete and successful when ALL of the following are verified:

### Functional Acceptance

- [ ] **F1**: Flash games load and play correctly (both pre-downloaded and download-on-demand)
- [ ] **F2**: HTML5 games load and play correctly
- [ ] **F3**: Games requiring download automatically download from gameDataSources
- [ ] **F4**: Downloaded ZIPs are saved with correct filename pattern: `{gameId}-{timestamp}.zip`
- [ ] **F5**: SHA256 verification works when hash is provided
- [ ] **F6**: Legacy fallback chain works for non-ZIP content (htdocs, overrides, CDN)
- [ ] **F7**: CGI execution works for PHP-based games (if applicable)
- [ ] **F8**: Both Infinity and Ultimate editions are supported
- [ ] **F9**: CORS headers are present on all game content responses
- [ ] **F10**: HTML polyfills are injected into HTML files

### Technical Acceptance

- [ ] **T1**: Backend starts successfully with integrated game serving
- [ ] **T2**: Only 2 services running (backend + frontend, no game-service)
- [ ] **T3**: All TypeScript compiles without errors (`npm run typecheck`)
- [ ] **T4**: All tests pass (`npm test`)
- [ ] **T5**: No ESLint errors (`npm run lint`)
- [ ] **T6**: All code formatted with Prettier
- [ ] **T7**: Docker build succeeds
- [ ] **T8**: Docker containers start and communicate correctly

### Security Acceptance

- [ ] **S1**: Path traversal protection works (reject `../` attempts)
- [ ] **S2**: Hostname validation works (reject invalid hostnames)
- [ ] **S3**: Request body size limits enforced (10MB for CGI)
- [ ] **S4**: Timeout enforcement works (5s GameZip, 2min streaming)
- [ ] **S5**: Error messages sanitized (no path leakage)
- [ ] **S6**: ZIP file paths validated against allowed directory

### Performance Acceptance

- [ ] **P1**: Cold start (ZIP not mounted) < 2s for local files
- [ ] **P2**: Warm start (ZIP mounted) < 500ms
- [ ] **P3**: Memory usage of backend < 20% increase from baseline
- [ ] **P4**: No memory leaks during extended play sessions (4+ hours)

### Documentation Acceptance

- [ ] **D1**: All architecture docs updated
- [ ] **D2**: API reference includes new routes
- [ ] **D3**: Setup guide reflects 2-service architecture
- [ ] **D4**: Docker deployment docs updated
- [ ] **D5**: CLAUDE.md updated with migration notes
- [ ] **D6**: Game service docs archived or integrated into backend docs

### User Experience Acceptance

- [ ] **U1**: No visible change to end users (games play same as before)
- [ ] **U2**: Download loading page shows progress (if applicable)
- [ ] **U3**: Error messages are clear and actionable
- [ ] **U4**: Fullscreen works correctly
- [ ] **U5**: No browser console errors during normal gameplay

---

## Constraints & Considerations

### Backward Compatibility

**MUST preserve**:
- All existing game content serving capabilities
- Support for both Infinity and Ultimate editions
- Existing user playlists and favorites
- Play session tracking
- All security measures

**MAY break** (acceptable):
- Direct access to `http://localhost:22500` (now `http://localhost:3100/game-proxy`)
- Direct access to `http://localhost:22501` (now `http://localhost:3100/game-zip`)
- Environment variables `GAME_SERVICE_*` (removed)

### Security Considerations

**Critical**:
- Maintain all path sanitization (prevent directory traversal)
- Maintain all hostname validation (prevent SSRF)
- Maintain all timeout enforcement (prevent DoS)
- Maintain all error sanitization (prevent info leakage)

**Reference**: `docs/13-security/directory-traversal-protection.md`

### Performance Considerations

**Goals**:
- Reduce memory footprint (1 process vs 2)
- Reduce network overhead (in-process calls vs HTTP)
- Maintain or improve response times

**Concerns**:
- Blocking event loop during large ZIP file operations → Use streaming
- Memory usage with many mounted ZIPs → LRU cache with 100 max, 30min TTL
- CPU usage during SHA256 verification → Acceptable for download scenario

### Docker Considerations

**Production deployment**:
- Nginx must route `/game-proxy` to backend container
- Volume mounts for Flashpoint data must be accessible to backend
- Health checks must verify both API and game proxy are responding

### Development Workflow

**Local development**:
- `npm run dev` starts backend + frontend (no game-service)
- Backend runs on port 3100 (API + game proxy + GameZip)
- Vite proxy forwards `/api`, `/game-proxy`, `/game-zip` to backend

**Hot reload**:
- Backend changes trigger backend restart (tsx watch)
- Frontend changes trigger HMR (Vite)
- No need to restart game-service (doesn't exist anymore)

---

## Analysis Checklist

Before implementing, ensure you understand:

### Architecture Questions

- [ ] How does ProxyRequestHandler route requests? (Answer: GameZip first, then legacy fallback)
- [ ] What is the path search order in ZipManager? (Answer: `content/`, `htdocs/`, root, `Legacy/htdocs/`)
- [ ] Why are there two servers in game-service? (Answer: Separation of concerns - proxy vs ZIP API)
- [ ] How will this map to backend routes? (Answer: Single Express app with /game-proxy and /game-zip routes)

### Data Flow Questions

- [ ] When does a ZIP get mounted? (Answer: On first file request via /game-proxy route)
- [ ] How does download-on-demand work? (Answer: GameZip mount endpoint triggers download if ZIP missing)
- [ ] What happens during a download? (Answer: Return 202 with loading HTML page, auto-refresh until ready)
- [ ] How does the frontend know a download is needed? (Answer: It doesn't - backend handles transparently)

### Implementation Questions

- [ ] Which files can be copied as-is? (Answer: Utilities, validators, some services)
- [ ] Which files need significant changes? (Answer: Route handlers, server setup, config)
- [ ] What's the critical path? (Answer: game-proxy route → GameZip route → ZipManager → serve file)
- [ ] What's the test strategy? (Answer: Unit tests for services, integration tests for routes, e2e for gameplay)

### Migration Questions

- [ ] What's the rollback plan? (Answer: Keep game-service branch, can redeploy if needed)
- [ ] How to test before full cutover? (Answer: Feature branch, test locally first, then Docker)
- [ ] What's the deployment sequence? (Answer: 1. Deploy backend, 2. Update Nginx, 3. Deploy frontend)
- [ ] How to monitor success? (Answer: Logs, memory usage, response times, error rates)

---

## Expected Output Format

When implementing this revamp, provide updates in this structure:

### Phase 1 Report

```markdown
## Phase 1: Backend Integration - COMPLETE

### Files Created
- backend/src/utils/mimeTypes.ts (copied from game-service)
- backend/src/utils/cors.ts (copied from game-service)
- backend/src/services/ZipManager.ts (adapted from game-service)
- [... full list ...]

### Files Modified
- backend/src/config.ts (added game service config)
- backend/src/routes/index.ts (registered new routes)
- [... full list ...]

### Type Errors Resolved
- Import path updates: 12 files
- Type definition updates: 3 files
- Dependency injection: 5 files

### Tests Passing
- Unit tests: 15/15 ✓
- Type check: ✓
- Build: ✓

### Next Steps
- Phase 2: Route implementation
```

### Final Report

```markdown
## Game Service Revamp - COMPLETE

### Summary
Successfully merged game-service into backend, reducing from 3 services to 2.

### Metrics
- Files created: 12
- Files modified: 23
- Files deleted: 47 (game-service directory)
- Tests added: 25
- Tests passing: 100% (137/137)
- Type errors: 0
- Build time: -15% (parallel builds eliminated)
- Memory usage: -12% (one process vs two)

### Acceptance Criteria
- Functional: 10/10 ✓
- Technical: 8/8 ✓
- Security: 6/6 ✓
- Performance: 4/4 ✓
- Documentation: 6/6 ✓
- User Experience: 5/5 ✓

### Breaking Changes
- GAME_SERVICE_* environment variables removed (documented in migration guide)
- Direct access to ports 22500/22501 no longer works (now /game-proxy and /game-zip routes)

### Deployment Notes
- Update Nginx to route /game-proxy and /game-zip to backend
- Remove game-service from docker-compose.yml
- No database migrations needed
- Frontend changes compatible with old backend (graceful degradation)

### Documentation Updated
- 15 files updated (see docs commit)
- Migration guide added: docs/03-backend/game-service-migration.md
```

---

## Success Criteria Summary

The revamp is successful if:

1. **Deployability**: Can deploy with 2 services instead of 3
2. **Simplicity**: No fire-and-forget HTTP calls, no frontend polling
3. **Compatibility**: All games play exactly as before
4. **Performance**: Equal or better response times, lower memory usage
5. **Maintainability**: Clearer code organization, better developer experience

Remember: The goal is simplification without sacrificing functionality. If any trade-off reduces functionality or breaks compatibility, reconsider the approach.

---

## References

### External Code

- FlashpointGameServer (Go): `D:\Repositories\Community\FlashpointGameServer`
- Flashpoint Launcher (Electron): `D:\Repositories\Community\launcher`

### Internal Documentation

- Architecture: `docs/02-architecture/system-architecture.md`
- Backend: `docs/03-backend/architecture.md`
- Game Service: `docs/05-game-service/` (all files)
- API Reference: `docs/06-api-reference/README.md`
- Security: `docs/13-security/directory-traversal-protection.md`

### Configuration Files

- Preferences: `{FLASHPOINT_PATH}/preferences.json`
- Proxy Settings: `{FLASHPOINT_PATH}/proxySettings.json`
- Version: `{FLASHPOINT_PATH}/version.txt`

### Database Schema

- Flashpoint DB: `docs/12-reference/database-schema-reference.md`
- User DB: `docs/12-reference/database-schema-reference.md`

---

**End of Prompt**

This prompt is comprehensive and self-contained. Use it with Claude Code to implement the game-service revamp systematically, following the phased approach and validating against acceptance criteria at each step.
