# Game Content Module Architecture

This document describes the architectural design and implementation patterns of
the integrated Game Content Module.

## System Overview

The game content module is integrated into the backend Express application,
replacing the original standalone game-service with TypeScript/Node.js
implementations of game content delivery components.

### Design Principles

1. **Separation of Concerns**: Game content serving separated from metadata
   management
2. **Zero Extraction**: ZIP files served via streaming, no disk extraction
   required
3. **Fallback Chain**: Multi-level fallback ensures content availability
4. **Performance**: Streaming, connection pooling, and caching for optimal speed
5. **Compatibility**: 199+ MIME types and HTML polyfills for legacy content

## Integrated Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│              Backend Application (Port 3100)                     │
│                                                                  │
│  ┌────────────────────────┐  ┌────────────────────────────┐    │
│  │   Game Proxy Router    │  │    GameZip Server          │    │
│  │   /game-proxy/*        │  │    (Singleton, Direct API) │    │
│  ├────────────────────────┤  ├────────────────────────────┤    │
│  │ ProxyRequestHandler    │  │ GameZipServer              │    │
│  │      ↓                 │  │      ↓                     │    │
│  │ LegacyServer           │  │ ZipManager                 │    │
│  │      ↓                 │  │      ↓                     │    │
│  │ - Local htdocs         │  │ - node-stream-zip          │    │
│  │ - Override paths       │  │ - In-memory ZIP index      │    │
│  │ - External CDN         │  │ - Streaming access         │    │
│  │ - Local cache          │  │                            │    │
│  └────────────────────────┘  └────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              Shared Components                         │    │
│  ├────────────────────────────────────────────────────────┤    │
│  │ ConfigManager | MimeTypes | Logger | HTMLInjector     │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              Services                                  │    │
│  ├────────────────────────────────────────────────────────┤    │
│  │ PreferencesService | GameDataDownloader               │    │
│  └────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

### Architecture Changes from Standalone Service

1. **No Separate HTTP Servers**:
   - Proxy runs as Express router, not standalone HTTP server
   - GameZip uses direct method calls instead of HTTP endpoints
   - Both use backend's port 3100

2. **Single-Process Design**:
   - Simplifies deployment (one Docker container)
   - Shared memory for configuration and caching
   - Unified logging and error handling

3. **Direct API Integration**:
   - ProxyRequestHandler calls ZipManager directly
   - Backend calls GameZip methods: `mountZip()`, `unmountZip()`, etc.
   - No network latency between components

## Component Architecture

### 1. Game Proxy Router (/game-proxy/*)

**Purpose**: Serve legacy web content with intelligent fallback chain (Express
router)

**Location**: `backend/src/game/`

**Components**:

- `proxy-router.ts`: Express route handler
- `proxy-request-handler.ts`: Request routing and response handling
- `legacy-server.ts`: Fallback chain implementation

**Request Flow**:

```
Request: /game-proxy/http://domain.com/file.swf
  ↓
Parse URL (proxy-style or standard)
  ↓
Try GameZip Server (direct call)
  ↓
Try LegacyServer fallback chain
  ↓
Inject HTML polyfills (if HTML)
  ↓
Return response with CORS headers
```

**Key Features**:

- Supports three URL formats: proxy-style, path-based, standard
- Automatic subdomain variation matching (www, core, cdn, etc.)
- External CDN fallback with local caching
- HTML polyfill injection for game compatibility
- Integrated with backend's middleware and logging

### 2. GameZip Server (Singleton, Direct API)

**Purpose**: Mount and serve files from ZIP archives without extraction

**Location**: `backend/src/game/`

**Components**:

- `gamezipserver.ts`: GameZip server implementation (singleton)
- `zip-manager.ts`: ZIP mounting, indexing, and file access

**Direct API Methods**:

```typescript
// Called directly by backend, not via HTTP
mountZip(id: string, params: MountParams): Promise<void>
unmountZip(id: string): Promise<boolean>
listMounts(): Array<MountInfo>
findFile(relPath: string): Promise<FileData | null>
```

**Request Flow** (Backend calling GameZip):

```
Backend calls: gameZipServer.mountZip('game-123', {...})
  ↓
Verify ZIP exists
  ↓
Create node-stream-zip instance
  ↓
Store in ZipManager map
  ↓
Return success

Proxy requesting file:
  ↓
Call: gameZipServer.findFile(relPath)
  ↓
Search all mounted ZIPs
  ↓
Try multiple path prefixes (content/, htdocs/, etc.)
  ↓
Stream file directly from ZIP
  ↓
Return with MIME type + CORS
```

**Key Features**:

- Zero-extraction ZIP access using node-stream-zip
- Multi-ZIP search with path variation handling
- Streaming for large files
- Automatic unmount on shutdown
- Single-process memory sharing (no network overhead)

### 3. Configuration Manager

**Purpose**: Centralized configuration from environment and proxySettings.json

**Location**: `backend/src/game/config.ts`

**Sources** (in priority order):

1. Environment variables (.env)
2. proxySettings.json (Flashpoint standard config)
3. Hardcoded defaults

**Configuration Loading**:

```typescript
class ConfigManager {
  static async loadConfig(flashpointPath: string): Promise<ServerSettings>;
  static getSettings(): ServerSettings;
}
```

**Settings Managed**:

- File paths (htdocs, games, CGI)
- External fallback URLs
- Performance tuning (chunk size, timeouts)
- Feature flags (CORS, Brotli, CGI)

**Shared Constants**:

The configuration module exports shared constants used across the game service:

```typescript
// config.ts
export const MAX_BUFFERED_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Used in gamezipserver.ts, zip-manager.ts, legacy-server.ts
```

This eliminates magic number duplication and ensures consistent size limits across
all components.

**Error Differentiation**: Config loading now distinguishes between missing files
(ENOENT, logged as warning) and corrupted JSON (SyntaxError, logged as error).
Both fall back to defaults but with appropriate severity levels for debugging
configuration issues.

**Initialization**: Called by backend on startup via `backend/src/server.ts`

### 4. Legacy Server (Fallback Chain)

**Purpose**: Implement multi-level fallback for legacy content serving

**Fallback Chain**:

```
1. Local htdocs (exact hostname + path)
   ↓ Not found
2. Subdomain variations (www.domain, core.domain, etc.)
   ↓ Not found
3. Override paths (special directories in htdocs)
   ↓ Not found
4. CGI-BIN paths (for script files)
   ↓ Not found
5. Index files (index.html, index.php, index.swf)
   ↓ Not found
6. Infinity Server (primary external CDN)
   ↓ Not found
7. External fallback URLs (secondary CDNs)
   ↓ Not found
8. MAD4FP paths (if enabled)
   ↓ Not found
9. 404 Error
```

**Path Resolution Algorithm**:

```typescript
buildPathCandidates(relPath, urlPath):
  // 1. Exact paths
  for hostname in getHostnameVariations(hostname):
    candidates.push(htdocs/hostname/path)
    candidates.push(htdocs/hostname/pathWithoutQuery)

  // 2. Override paths
  for override in overridePaths:
    candidates.push(htdocs/override/relPath)

  // 3. CGI paths
  if isScriptUrl(urlPath):
    candidates.push(cgi-bin/relPath)

  // 4. Index files
  for ext in ['html', 'htm', 'php', 'swf']:
    candidates.push(htdocs/relPath/index.{ext})

  return candidates
```

**Hostname Variation Matching**:

For a request to `mochibot.com/file.swf`, try:

1. `mochibot.com/file.swf`
2. `www.mochibot.com/file.swf`
3. `core.mochibot.com/file.swf`
4. `cdn.mochibot.com/file.swf`
5. ... (12 common subdomain prefixes)

This handles cases where Flashpoint stores files with subdomain prefixes but
games request without them.

**Hostname Variation Optimization** (2026-02-07):

Subdomain variations now skip prefixes that already exist on the hostname to prevent
redundant candidates. For example, `www.example.com` won't generate
`www.www.example.com` as a variation candidate. This reduces the number of path
candidates checked and improves lookup performance.

**Negative Lookup Cache Management** (2026-02-07):

The `LegacyServer` includes a static `clearCache()` method for clearing the
negative lookup cache during shutdown or database reloads. The cache uses FIFO
eviction at 5000 entries to bound memory usage while still providing performance
benefits for repeated requests to missing files.

**External Source URL Safety**

**Status**: ✅ **Implemented** (2026-02-07)

**Implementation**: `backend/src/game/legacy-server.ts`

External source URL resolution now uses the `URL` constructor to prevent path traversal:

```typescript
// SAFE: URL constructor handles path resolution correctly
const resolved = new URL(relPath, normalizedBase);
if (!resolved.href.startsWith(normalizedBase)) {
  throw new Error('URL escapes base');
}
```

**Negative Cache Fix**: Only ENOENT errors are cached in the not-found cache. Validation failures and transient errors are not cached, preventing permanent 404s for valid files.

### 5. ZIP Manager

**Purpose**: Manage ZIP mounting and provide file access without extraction

**Architecture**:

```typescript
class ZipManager {
  private mountedZips: LRUCache<string, MountedZip>;

  async mount(id: string, zipPath: string): void;
  async unmount(id: string): Promise<boolean>;
  async getFile(id: string, filePath: string): Promise<Buffer | null>;
  async findFile(relPath: string): Promise<{ data; mountId } | null>;
}
```

**Performance Optimization - LRU Cache**:

The ZIP manager uses an LRU (Least Recently Used) cache to prevent memory leaks
and manage resources:

```typescript
constructor() {
  this.mountedZips = new LRUCache<string, MountedZip>({
    max: 100,                  // Maximum 100 mounted ZIPs
    ttl: 30 * 60 * 1000,      // 30-minute TTL
    dispose: async (value, key) => {
      // Auto-cleanup on eviction
      logger.info(`[ZipManager] Auto-closing evicted ZIP: ${key}`);
      await value.zip.close();
    },
    updateAgeOnGet: true,      // Refresh TTL on access
    updateAgeOnHas: false
  });
}
```

**Benefits**:

- Prevents unlimited ZIP mounts (bounded at 100)
- Automatic cleanup of old mounts after 30 minutes
- Resource leak prevention via disposal callback
- TTL refresh on access keeps active ZIPs in memory
- Graceful eviction when limit reached

**Mounting Process**:

```
1. Check if already mounted (prevent duplicates)
2. Verify ZIP file exists on disk
3. Create StreamZip.async instance
4. Build entry index: Set<string> of all entry names
5. Store in Map with metadata (id, path, mount time, entryIndex)
6. Log file count for debugging
```

**Entry Index Optimization**:

At mount time, ZipManager builds a `Set<string>` of all entry names in the ZIP
for O(1) lookup performance:

```typescript
// Build index at mount time
const entryIndex = new Set<string>();
const entries = await zip.entries();
for (const [name] of entries) {
  entryIndex.add(name.toLowerCase());
}

// Store with the mounted ZIP
mountedZips.set(id, { zip, entryIndex, ... });
```

**Benefits**:

- O(1) entry existence checks (vs sequential `entryData()` calls)
- Eliminates unnecessary ZIP I/O for non-existent files
- Faster failure paths (404 responses)
- Minimal memory overhead (one string set per ZIP)

**File Access**:

```
1. Normalize file path (remove leading slash, lowercase)
2. Look up mounted ZIP by ID
3. Check entryIndex.has(normalizedPath) - O(1) lookup
4. If found: Call zip.entryData(path) - streams from ZIP
5. Return Buffer directly (no temp files)
```

**Multi-ZIP Search**:

```
Try path variations in order:
  - content/{relPath}       (most common)
  - htdocs/{relPath}        (standard)
  - {relPath}               (no prefix)
  - Legacy/htdocs/{relPath} (full path)

For each variation:
  Search all mounted ZIPs:
    Check entryIndex.has() - O(1) lookup
    If found: Load and return immediately
Return null if not found in any ZIP
```

### 6. PreferencesService

**Purpose**: Read Flashpoint preferences.json and expose gameDataSources for
auto-downloading game ZIPs.

**Location**: `backend/src/game/services/PreferencesService.ts`

**Architecture**:

```typescript
class PreferencesService {
  private preferences: FlashpointPreferences | null = null;
  private lastLoadTime: number = 0;
  private readonly CACHE_TTL = 60 * 1000; // 1 minute

  static initialize(flashpointPath: string): PreferencesService;
  static getInstance(): PreferencesService;
  async loadPreferences(): Promise<FlashpointPreferences>;
  async getGameDataSources(): Promise<GameDataSource[]>;
  async getDataPacksFolderPath(): Promise<string>;
  invalidateCache(): void;
}
```

**Configuration Format** (`preferences.json`):

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

**Key Features**:

- 60-second cache with automatic reload
- Singleton pattern for consistent state
- Matches Flashpoint Launcher's preferences format
- Falls back to empty sources if file missing

### 7. GameDataDownloader

**Purpose**: Download game data ZIPs from configured sources when not present
locally.

**Location**: `backend/src/game/services/GameDataDownloader.ts`

**Architecture**:

```typescript
class GameDataDownloader {
  static getInstance(): GameDataDownloader;
  getFilename(gameId: string, dateAdded: string): string;
  async download(params: GameDataDownloadParams, onProgress?: DownloadProgressCallback): Promise<DownloadResult>;
  async exists(gameId: string, dateAdded: string, targetDir?: string): Promise<boolean>;
  async getFilePath(gameId: string, dateAdded: string, targetDir?: string): Promise<string>;
}
```

**Download Process**:

```
1. Generate filename: {gameId}-{timestamp}.zip
2. Get sources from PreferencesService
3. For each source:
   ├─ Build URL: baseUrl + filename
   ├─ Download to temp file ({filename}.temp)
   ├─ Retry up to 3 times with exponential backoff
   ├─ Verify SHA256 hash (if provided)
   ├─ Move temp to final location
   └─ Return success
4. If all sources fail, return error summary
```

**Key Features**:

- Sequential source fallback (like Flashpoint Launcher)
- SHA256 verification for integrity
- Retry logic with exponential backoff (1s, 2s, 4s)
- Temp file handling (atomic writes)
- Progress callbacks for UI updates
- 5-minute timeout, 500MB max file size

**DNS Rebinding SSRF Prevention**

**Status**: ✅ **Implemented** (2026-02-07)

**Implementation**: `backend/src/game/services/GameDataDownloader.ts`

Before connecting to download sources, DNS resolution is checked to block private addresses:

```typescript
const addr = await dns.lookup(hostname);
if (isPrivateAddress(addr.address)) {
  throw new Error('Blocked: resolves to private address');
}
```

Blocks 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, and ::1.

**Filename Generation**:

Matches Flashpoint Launcher's `getGameDataFilename()`:

```typescript
getFilename(gameId: string, dateAdded: string): string {
  const cleanDate = dateAdded.includes('T')
    ? dateAdded
    : `${dateAdded} +0000 UTC`;
  const timestamp = new Date(cleanDate).getTime();
  return `${gameId}-${timestamp}.zip`;
}
```

### 8. MIME Type System

**Purpose**: Provide accurate content-type headers for 199+ file types

**Architecture**:

```typescript
CUSTOM_MIME_TYPES: 199 legacy formats
STANDARD_MIME_TYPES: Common web formats

getMimeType(ext: string): string {
  return CUSTOM_MIME_TYPES[ext] ||
         STANDARD_MIME_TYPES[ext] ||
         'application/octet-stream'
}
```

**Priority**:

1. Custom MIME types (Flashpoint legacy formats)
2. Standard MIME types (web formats)
3. Default: application/octet-stream

**Special Cases**:

- Director files (.dcr, .dir, .dxr) → application/x-director
- Shockwave Flash (.swf) → application/x-shockwave-flash
- Unity3D (.unity3d) → application/vnd.unity
- VRML (.wrl) → model/vrml
- Chemical formats (.pdb, .mol) → chemical/x-\*

### 9. CORS Utilities

**Purpose**: Centralized CORS header management

**Location**: `backend/src/game/utils/cors.ts`

**Benefits**:

- Eliminates 6+ instances of duplicate CORS header setting
- Consistent CORS configuration across both servers
- Reusable functions for standard and preflight requests

**API**:

```typescript
interface CorsSettings {
  allowCrossDomain: boolean;
}

// Standard CORS headers
function setCorsHeaders(res: ServerResponse, settings: CorsSettings): void;

// CORS headers with max-age (for OPTIONS preflight)
function setCorsHeadersWithMaxAge(
  res: ServerResponse,
  settings: CorsSettings,
  maxAge: number = 86400
): void;
```

**Usage**:

```typescript
import { setCorsHeaders, setCorsHeadersWithMaxAge } from '../utils/cors';

// Standard request
const settings = { allowCrossDomain: true };
setCorsHeaders(res, settings);
// Sets: Access-Control-Allow-Origin: *
//       Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS
//       Access-Control-Allow-Headers: *

// OPTIONS preflight request
if (req.method === 'OPTIONS') {
  setCorsHeadersWithMaxAge(res, settings, 86400);
  res.writeHead(204);
  res.end();
  return;
}
```

**Security Justification**:

The game-service uses wildcard CORS (`Access-Control-Allow-Origin: *`) which is
justified because:

- Serves public, read-only game content only
- No sensitive data exposure
- No authentication required
- Supports game embedding across different domains
- Backend service maintains restrictive CORS for sensitive operations

See `docs/12-reference/cors-security-decision.md` for detailed security
rationale.

### 10. HTML Polyfill Injector

**Purpose**: Inject compatibility polyfills into HTML files for game engines

**Polyfills Provided**:

1. **Unity WebGL**:
   - `window.UnityProgress()` - Progress callback stub
   - `window.createUnityInstance()` - Unity 2020+ loader
   - `window.UnityLoader2020` - Error handler

2. **General Compatibility**:
   - `window.external` - Legacy ActiveX shim
   - `AudioContext` polyfill - WebKit prefix handling

**Injection Algorithm**:

```
1. Detect if HTML file (check for <html> or <head>)
2. Analyze content for Unity indicators
3. Build polyfill script block
4. Find <head> tag
5. Inject immediately after <head> opening
6. If no <head>, create one
7. Return modified HTML as Buffer
```

**Detection Patterns**:

```typescript
needsUnityPolyfills(html: string): boolean {
  const indicators = [
    /UnityProgress/i,
    /UnityLoader/i,
    /createUnityInstance/i,
    /unityFramework\.js/i,
    /Build\/.*\.loader\.js/i
  ]
  return indicators.some(p => p.test(html))
}
```

## Data Flow

### Complete Request Flow (Proxy Router)

```
1. Frontend requests game content
   GET http://localhost:3100/game-proxy/http://www.example.com/game.swf

2. Backend proxy router receives request
   - Method: GET
   - URL path: /game-proxy/http://www.example.com/game.swf

3. ProxyRequestHandler.handleRequest()
   - Parse URL: hostname=www.example.com, path=/game.swf

4. Try GameZip server (direct method call)
   - Call: gameZipServer.findFile('www.example.com/game.swf')
   - If found: Return file immediately
   - If not found: Continue to legacy server

5. LegacyServer.serveLegacy()
   - Build path candidates (exact, variations, overrides, index files)
   - Try each candidate:
     a. D:/Flashpoint/Legacy/htdocs/www.example.com/game.swf
     b. D:/Flashpoint/Legacy/htdocs/example.com/game.swf
     c. ... (subdomain variations)
   - If found: Read file, detect MIME type, return

6. External fallback (if local not found)
   - Try: https://infinity.flashpointarchive.org/.../www.example.com/game.swf
   - If 200: Download, cache locally, return
   - If not found: Try next external source

7. Process response
   - Detect MIME type: application/x-shockwave-flash
   - If HTML: Inject polyfills
   - Add CORS headers
   - Add X-Source header (debug)

8. Send to client
   - Status: 200
   - Content-Type: application/x-shockwave-flash
   - Content-Length: file.length
   - X-Source: local-htdocs
   - Body: file buffer
```

### Complete Request Flow (GameZip Server)

```
1. Backend mounts ZIP for game
   Call: gameZipServer.mountZip('game-123', {
     zipPath: 'D:/Flashpoint/Data/Games/Flash/G/game.zip',
     gameId: 'game-123',
     dateAdded: '2024-01-15T10:30:00.000Z',
     sha256: 'ABC123...'
   })

2. GameZipServer.mountZip()
   - Extract mount ID: game-123
   - Call zipManager.mount(id, zipPath, params)

3. ZipManager.mount()
   - Check if already mounted
   - If not: trigger auto-download if ZIP not found locally
   - Verify ZIP exists
   - Create StreamZip instance
   - Store in Map: mountedZips.set('game-123', {...})
   - Return success

4. Proxy requests file from mounted ZIP
   Call: gameZipServer.findFile('www.example.com/game.swf')

5. ZipManager.findFile()
   - Try path variations:
     a. content/www.example.com/game.swf
     b. htdocs/www.example.com/game.swf
     c. www.example.com/game.swf
   - For each variation, search all mounted ZIPs:
     - Check entryIndex.has() - O(1) lookup
     - If found: Load file
   - Found in 'game-123': content/www.example.com/game.swf

6. ZipManager.getFile()
   - Access mounted ZIP
   - Call zip.entryData('content/www.example.com/game.swf')
   - Stream file data into Buffer
   - Return {data: Buffer, mountId: 'game-123'}

7. Process response
   - Detect MIME type from extension: .swf
   - If HTML: Inject polyfills
   - Add CORS headers
   - Add X-Source: gamezipserver:game-123

8. Send to client
   - Status: 200
   - Content-Type: application/x-shockwave-flash
   - X-Source: gamezipserver:game-123
   - Body: file buffer
```

## Scaling Considerations

### Horizontal Scaling

Current limitations:

- ZIP mounts are in-memory per process
- No shared state between instances

Future improvements:

- Redis for mount registry
- Consistent hashing for ZIP distribution
- Load balancer for multiple instances

### Performance Tuning

**Memory**:

- ZIP entry indexes: ~100KB per 10,000 files
- Large ZIPs (>1GB) take ~5-50MB RAM for index
- Solution: Lazy loading, LRU cache for ZIP handles, bounded at 100 ZIPs

**CPU**:

- MIME type lookup: O(1) hash map
- Path candidates: O(n) where n = variations
- ZIP search: O(m) × O(1) = O(m) where m = mounted ZIPs (via entry index)
- Solution: Entry index optimizations eliminate sequential I/O

**Network**:

- External downloads: 15s timeout (reduced from 45s)
- Download concurrency: Limited to 3 simultaneous downloads
- Keep-alive: 65s TCP timeout, 66s header timeout, 120s total timeout
- Connection pool: 500 max connections, 10 per host with axios
- Solution: Adaptive timeouts, connection pooling

**Disk I/O**:

- ZIP reads: Random access via node-stream-zip
- Stream cleanup: Destroyed on client disconnect (`res.on('close')`)
- Local cache: Sequential writes
- Solution: SSD recommended, RAM disk for cache, bounded resource cleanup

## Code Quality & Security Improvements (Second Pass Review)

The following medium and low severity fixes were implemented to improve code
quality and maintainability:

### HTML Injection & Logging
- `htmlInjector.ts` now uses project logger instead of `console.log`
- Dead code branch removed from polyfill injection logic
- Improves consistency with logging across the module

### PreferencesService Initialization
- Logs warning on re-initialization with different path
- Prevents silent configuration changes that could affect game downloads
- Helps identify configuration issues during development

### Schema Validation
- Hostname schema minimum length corrected to 2 (matches regex requirement)
- Enforces consistency between validation rules and runtime expectations

### Regex Pattern Fixes
- `pathSecurity.ts` regex patterns no longer use `/g` flag with `test()`
- Prevents stateful matching bugs that could skip validation on consecutive calls
- Single-flag patterns are checked per call, not maintained across calls

### Code Cleanup
- Unused exports removed from:
  - `mimeTypes.ts` - Cleaning up unused MIME type exports
  - `validation/schemas.ts` - Removing unused Zod schema exports
  - `utils/cors.ts` - Removing unused utility functions
  - `utils/pathSecurity.ts` - Removing unused security utilities
- Reduces module surface area and maintenance burden

### Download Validation
- `GameDataDownloader.getFilename()` now validates timestamps
- Rejects NaN timestamps to prevent corrupted filenames
- Ensures valid download filename format

### Resource Leak Prevention
- `GameDataDownloader` destroys response stream on size limit
- Prevents resource leaks when downloads exceed maximum size
- Proper cleanup when download constraints are violated

### DRY Principle
- `GameDataService` uses `GameDataDownloader.getFilename()` instead of duplicating logic
- Centralizes filename generation, preventing consistency issues

### Additional Low-Priority Improvements (2026-02-07)

**Error Handling & Streaming Safety**:
- `proxy-request-handler` `sendError()` now guards against `headersSent` to prevent write-after-headers errors in streaming scenarios
- `collectRequestBody` now uses `settled` flag to prevent double resolve/reject when both `end` and `error` events fire

**Visibility & Encapsulation**:
- `findActiveDownload` in `gamezipserver.ts` is now private (was publicly accessible but only used internally)
- `PRIVATE_IP_RANGES` in `GameDataDownloader.ts` is now `static readonly`

**Module Boundaries**:
- Removed unused imports and convenience re-exports from service index files for cleaner module boundaries
- Internal-only constants like `CUSTOM_MIME_TYPES` no longer exported, reducing public API surface

## Security Hardening

The game content module implements multiple defense-in-depth security measures:

### Authentication & Authorization

- Game-zip management endpoints require JWT authentication
- `settings.update` permission required for mount/unmount operations
- Mount IDs validated via Zod schema (no path traversal characters)

### XSS Prevention

- HTML polyfills injected only in final `sendResponse()` (prevents double
  injection)
- Download loading page values escaped via `escapeHtml()` function:
  - Progress percentages
  - Source names from gameDataSources
  - Elapsed time values
  - File size displays

### File Size & Memory Protection

- ZIP entry size limits: Files exceeding 50MB rejected to prevent memory
  exhaustion
- Request body size limits: Maximum 1MB for ZIP mount requests
- Response size limits: Maximum 100MB for external CDN downloads

### Race Condition Prevention

- `mountingInProgress` Set prevents concurrent mount race conditions
- Duplicate mount requests return immediately instead of creating redundant
  file handles

### ZIP Handle Leak Prevention

**Status**: ✅ **Implemented** (2026-02-07)

**Implementation**: `backend/src/game/zip-manager.ts`

ZIP file handles are now properly closed when mount operations fail after opening:

```typescript
const zip = new StreamZip.async({ file: zipPath });
try {
  const entries = await zip.entries();
  // Build entry index...
  mountedZips.set(id, { zip, entryIndex, ... });
} catch (error) {
  await zip.close(); // Prevent file handle leak
  throw error;
}
```

### Graceful Shutdown Safety

**Status**: ✅ **Implemented** (2026-02-07)

**Implementation**: `backend/src/game/zip-manager.ts`

A `shuttingDown` flag prevents new mounts during shutdown and `unmountAll()` waits for in-progress mounts:

```typescript
private shuttingDown = false;

async mount(id, zipPath) {
  if (this.shuttingDown) throw new Error('Server shutting down');
  // ... mount logic
}

async unmountAll() {
  this.shuttingDown = true;
  // Wait up to 10s for in-progress mounts to complete
  await waitForInProgressMounts(10000);
  // Close all mounted ZIPs
}
```

### Download & Redirect Security

- Maximum 5 redirects allowed for external downloads (prevents SSRF chains)
- Response bodies properly drained before following redirects
- Timeout enforcement: 15 seconds for external downloads
- User-Agent header added to external requests for tracking

### Downloaded File Path Re-validation

**Status**: ✅ **Implemented** (2026-02-07)

**Implementation**: `backend/src/game/gamezipserver.ts`

After downloading a game ZIP, the file path is re-validated to ensure it stays within the target directory:

```typescript
const resolvedPath = path.resolve(result.filePath);
if (!resolvedPath.startsWith(path.resolve(targetPath))) {
  throw new Error('Downloaded file outside target directory');
}
```

### CGI Symlink Bypass Prevention

**Status**: ✅ **Implemented** (2026-02-07)

**Implementation**: `backend/src/game/cgi/cgi-executor.ts`

CGI script paths are resolved via `fs.realpath()` before security validation, preventing symlink-based directory escapes:

```typescript
const realPath = await fs.realpath(scriptPath);
const validPath = sanitizeAndValidatePath(cgiBaseDir, realPath);
```

### Path Validation

- ZIP mount paths validated to stay within `Data/Games/` directory
- No absolute path escapes or directory traversal sequences allowed
- Path normalization prevents Unicode/encoding attacks

### Error Message Sanitization

- Internal error details removed from responses (prevents path/version leakage)
- Sanitized via `sanitizeErrorMessage()` in logs and responses
- External CDN responses validated: 200-only accepted

## Error Handling

### Error Categories

1. **Network Errors**:
   - ECONNREFUSED: GameZip server not available
   - ETIMEDOUT: External CDN timeout
   - ECONNABORTED: Request aborted

2. **File Errors**:
   - ENOENT: File not found
   - EACCES: Permission denied
   - EISDIR: Path is a directory

3. **ZIP Errors**:
   - File not in ZIP index
   - ZIP corrupted
   - Extraction failed

### Error Handling Strategy

```typescript
try {
  // Try operation
} catch (error) {
  if (isRecoverable(error)) {
    logger.warn('Recoverable error, trying next source', error);
    continue; // Try next fallback
  } else {
    logger.error('Fatal error', error);
    throw error; // Return 500
  }
}
```

### CORS Error Handling

**Critical**: CORS headers MUST be set even for error responses, otherwise
browsers show CORS error instead of actual error.

```typescript
import { setCorsHeaders } from '../utils/cors';

private sendError(res: Response, status: number, message: string) {
  // Set CORS headers BEFORE sending error (using utility)
  setCorsHeaders(res, { allowCrossDomain: true });
  res.writeHead(status);
  res.end(message);
}
```

## Security Architecture

### Request Body Size Limits

**DoS Protection**: The GameZip server limits request body sizes to prevent
memory exhaustion attacks:

```typescript
// gamezipserver.ts
private readBody(req: http.IncomingMessage, maxSize: number = 1024 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > maxSize) {
        req.destroy();  // Immediately terminate connection
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}
```

**Protection**:

- 1MB maximum request size by default
- Connection destroyed immediately on overflow
- Prevents memory exhaustion attacks
- Configurable per endpoint if needed

### Path Traversal Prevention

All file paths are normalized:

```typescript
path.normalize(filePath).toLowerCase();
```

**ZIP Mount ID Validation**:

```typescript
// Reject IDs with path traversal sequences
if (
  id.includes('/') ||
  id.includes('\\') ||
  id.includes('..') ||
  id.includes('\0')
) {
  this.sendError(res, 400, 'Invalid mount ID');
  return;
}
```

**ZIP Path Validation**:

```typescript
// Ensure ZIP files are within allowed directory
const resolvedZipPath = path.resolve(normalizedZipPath);
const resolvedGamesPath = path.resolve(allowedGamesPath);

if (!resolvedZipPath.startsWith(resolvedGamesPath)) {
  this.sendError(
    res,
    403,
    'Forbidden: ZIP file must be within games directory'
  );
  return;
}
```

Prevents attacks like:

- `../../../etc/passwd`
- `..\\..\\windows\\system32`
- Null byte injection (`file.txt\0.jpg`)
- Directory escape via mount IDs

### ZIP Access Control

- Only explicitly mounted ZIPs are accessible
- Mount IDs are controlled by backend
- No arbitrary ZIP path access from frontend

### External CDN Security

- HTTPS enforced (HTTP auto-upgraded)
- Timeout limits (45s)
- User-Agent header added
- Response validation (200 only)

### CORS Configuration

- Enabled for game content (cross-domain required)
- Can be disabled for internal networks
- Preflight requests handled (OPTIONS)
- Max-Age: 86400 (24 hours)

### collectRequestBody Double-Settlement Fix

**Status**: ✅ **Implemented** (2026-02-07)

**Implementation**: `backend/src/game/proxy-request-handler.ts`

The `collectRequestBody` function now uses a `settled` flag to prevent double resolve/reject of its Promise, which could occur when both `end` and `error` events fire:

```typescript
private async collectRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      if (!settled) {
        settled = true;
        resolve(body);
      }
    });

    req.on('error', (error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    });
  });
}
```

This prevents unhandled promise rejections when both events fire in rapid succession.

## Monitoring and Observability

### Logging Strategy

**Levels**:

- DEBUG: Path candidates, ZIP searches, file access, **per-request file lookups**
  (downgraded from INFO in 2026-02-07)
- INFO: Requests, mounts, file serves, sources
- WARN: Fallback attempts, missing files
- ERROR: Server errors, mount failures, fatal errors

**Per-Request Logging** (2026-02-07):

Granular per-file file lookups are now logged at DEBUG level instead of INFO
to reduce log noise on high-traffic servers while still providing detailed
information when debugging specific issues.

**Log Format**:

```
[Component] Message
[HTTPProxyServer] GET http://domain.com/file.swf
[LegacyServer] Trying: D:/Flashpoint/.../file.swf
[LegacyServer] ✓ Found file: local-htdocs
[ProxyHandler] ✓ Served from local-htdocs
```

### Metrics (Future)

Potential metrics to track:

- Requests per second
- Response time percentiles (p50, p95, p99)
- Cache hit rate
- External CDN usage
- ZIP mount count
- Error rate by type

### Health Checks

Endpoint suggestions:

```
GET /health        Basic health check
GET /metrics       Prometheus metrics
GET /debug/mounts  List mounted ZIPs
GET /debug/config  Show configuration
```

## Future Enhancements

### Planned Features

1. **Caching Layer**:
   - In-memory LRU cache for frequently accessed files
   - Configurable cache size and TTL
   - Cache invalidation API

2. **ZIP Management**:
   - Auto-mount based on backend hints
   - Auto-unmount after inactivity timeout
   - ZIP pre-warming (mount on startup)

3. **Performance**:
   - Response compression (Brotli, gzip)
   - HTTP/2 support
   - Range request support for large files

4. **Monitoring**:
   - Prometheus metrics endpoint
   - Request tracing with correlation IDs
   - Performance profiling endpoint

5. **Features**:
   - CGI script execution
   - .htaccess parsing and support
   - MAD4FP integration
   - WebSocket support for real-time games

## References

- Original Go implementation analysis
- Flashpoint proxySettings.json format
- node-stream-zip documentation
- Express.js best practices
- HTTP proxy server design patterns
