# Game Service Architecture

This document describes the architectural design and implementation patterns of the Flashpoint Game Service.

## System Overview

The game-service is designed as a standalone microservice that handles all game content delivery, replacing the original Go-based FlashpointGameServer with a TypeScript/Node.js implementation.

### Design Principles

1. **Separation of Concerns**: Game content serving separated from metadata management
2. **Zero Extraction**: ZIP files served via streaming, no disk extraction required
3. **Fallback Chain**: Multi-level fallback ensures content availability
4. **Performance**: Streaming, connection pooling, and caching for optimal speed
5. **Compatibility**: 199+ MIME types and HTML polyfills for legacy content

## Dual-Server Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                      Game Service Process                       │
│                                                                 │
│  ┌──────────────────────────┐  ┌──────────────────────────┐   │
│  │   HTTP Proxy Server      │  │    GameZip Server        │   │
│  │      Port 22500          │  │      Port 22501          │   │
│  ├──────────────────────────┤  ├──────────────────────────┤   │
│  │ ProxyRequestHandler      │  │ GameZipServer            │   │
│  │      ↓                   │  │      ↓                   │   │
│  │ LegacyServer             │  │ ZipManager               │   │
│  │      ↓                   │  │      ↓                   │   │
│  │ - Local htdocs           │  │ - node-stream-zip        │   │
│  │ - Override paths         │  │ - In-memory ZIP index    │   │
│  │ - External CDN           │  │ - Streaming access       │   │
│  │ - Local cache            │  │                          │   │
│  └──────────────────────────┘  └──────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              Shared Components                           │ │
│  ├──────────────────────────────────────────────────────────┤ │
│  │ ConfigManager | MimeTypes | Logger | HTMLInjector       │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

### Why Two Servers?

1. **Different Request Patterns**:
   - Proxy server: High-throughput, varied content types, fallback logic
   - GameZip server: API-driven, mount/unmount operations, direct ZIP access

2. **Independent Scaling**:
   - Each server can be configured with different timeouts
   - GameZip can fail gracefully without affecting proxy server
   - Future: Can run on different hosts if needed

3. **Clear Separation**:
   - Proxy: Content delivery with external fallbacks
   - GameZip: ZIP management and streaming

## Component Architecture

### 1. HTTP Proxy Server (Port 22500)

**Purpose**: Serve legacy web content with intelligent fallback chain

**Components**:
- `http-proxy-server.ts`: Express server setup and configuration
- `proxy-request-handler.ts`: Request routing and response handling
- `legacy-server.ts`: Fallback chain implementation

**Request Flow**:
```
Request
  ↓
Parse URL (proxy-style or standard)
  ↓
Try GameZip Server (if available)
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

### 2. GameZip Server (Port 22501)

**Purpose**: Mount and serve files from ZIP archives without extraction

**Components**:
- `gamezipserver.ts`: GameZip server implementation
- `zip-manager.ts`: ZIP mounting, indexing, and file access

**API Endpoints**:
```
POST   /mount/:id        Mount a ZIP file
DELETE /mount/:id        Unmount a ZIP file
GET    /mounts           List all mounted ZIPs
GET    /*                Serve file from mounted ZIP
```

**Request Flow**:
```
Mount Request
  ↓
Verify ZIP exists
  ↓
Create node-stream-zip instance
  ↓
Store in ZipManager map
  ↓
Return success

File Request
  ↓
Parse URL for hostname + path
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

### 3. Configuration Manager

**Purpose**: Centralized configuration from environment and proxySettings.json

**Sources** (in priority order):
1. Environment variables (.env)
2. proxySettings.json (Flashpoint standard config)
3. Hardcoded defaults

**Configuration Loading**:
```typescript
class ConfigManager {
  static async loadConfig(flashpointPath: string): Promise<ServerSettings>
  static getSettings(): ServerSettings
}
```

**Settings Managed**:
- Server ports
- File paths (htdocs, games, CGI)
- External fallback URLs
- Performance tuning (chunk size, timeouts)
- Feature flags (CORS, Brotli, CGI)

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

This handles cases where Flashpoint stores files with subdomain prefixes but games request without them.

### 5. ZIP Manager

**Purpose**: Manage ZIP mounting and provide file access without extraction

**Architecture**:
```typescript
class ZipManager {
  private mountedZips: Map<string, MountedZip>

  async mount(id: string, zipPath: string): void
  async unmount(id: string): Promise<boolean>
  async getFile(id: string, filePath: string): Promise<Buffer | null>
  async findFile(relPath: string): Promise<{data, mountId} | null>
}
```

**Mounting Process**:
```
1. Check if already mounted (prevent duplicates)
2. Verify ZIP file exists on disk
3. Create StreamZip.async instance
4. Store in Map with metadata (id, path, mount time)
5. Log file count for debugging
```

**File Access**:
```
1. Normalize file path (remove leading slash)
2. Look up mounted ZIP by ID
3. Call zip.entryData(path) - streams from ZIP
4. Return Buffer directly (no temp files)
```

**Multi-ZIP Search**:
```
Try path variations in order:
  - content/{relPath}       (most common)
  - htdocs/{relPath}        (standard)
  - {relPath}               (no prefix)
  - Legacy/htdocs/{relPath} (full path)

For each variation:
  Search all mounted ZIPs
  Return first match
```

### 6. MIME Type System

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
- Chemical formats (.pdb, .mol) → chemical/x-*

### 7. HTML Polyfill Injector

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

### Complete Request Flow (Proxy Server)

```
1. Frontend requests game content
   GET http://localhost:22500/http://www.example.com/game.swf

2. Proxy server receives request
   - Method: GET
   - URL: http://www.example.com/game.swf

3. ProxyRequestHandler.handleRequest()
   - Parse URL: hostname=www.example.com, path=/game.swf

4. Try GameZip server (port 22501)
   - Make internal request: http://localhost:22501/http://www.example.com/game.swf
   - If 200: Return file immediately
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
   POST http://localhost:22501/mount/game-123
   Body: {"zipPath": "D:/Flashpoint/Data/Games/Flash/G/game.zip"}

2. GameZipServer.handleMount()
   - Extract mount ID: game-123
   - Parse body: zipPath
   - Call zipManager.mount(id, zipPath)

3. ZipManager.mount()
   - Verify ZIP exists
   - Create StreamZip instance
   - Store in Map: mountedZips.set('game-123', {...})
   - Return success

4. Frontend requests file from mounted ZIP
   GET http://localhost:22501/http://www.example.com/game.swf

5. GameZipServer.handleFileRequest()
   - Parse URL: hostname=www.example.com, path=/game.swf
   - Build relPath: www.example.com/game.swf
   - Call zipManager.findFile(relPath)

6. ZipManager.findFile()
   - Try path variations:
     a. content/www.example.com/game.swf
     b. htdocs/www.example.com/game.swf
     c. www.example.com/game.swf
   - For each variation, search all mounted ZIPs
   - Found in 'game-123': content/www.example.com/game.swf

7. ZipManager.getFile()
   - Access mounted ZIP
   - Call zip.entryData('content/www.example.com/game.swf')
   - Stream file data into Buffer
   - Return {data: Buffer, mountId: 'game-123'}

8. Process response
   - Detect MIME type from extension: .swf
   - If HTML: Inject polyfills
   - Add CORS headers
   - Add X-Source: gamezipserver:game-123

9. Send to client
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
- ZIP indexes are loaded into memory
- Large ZIPs (>1GB) take ~500MB RAM for index
- Solution: Lazy loading, LRU cache for ZIP handles

**CPU**:
- MIME type lookup: O(1) hash map
- Path candidates: O(n) where n = variations
- ZIP search: O(m × p) where m = mounted ZIPs, p = path variations
- Solution: Cache results, reduce variations

**Network**:
- External downloads: 45s timeout
- Concurrent limit: 10 requests
- Keep-alive: 65s
- Solution: Increase timeouts for slow connections

**Disk I/O**:
- ZIP reads: Random access via node-stream-zip
- Local cache: Sequential writes
- Solution: SSD recommended, RAM disk for cache

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
    logger.warn('Recoverable error, trying next source', error)
    continue // Try next fallback
  } else {
    logger.error('Fatal error', error)
    throw error // Return 500
  }
}
```

### CORS Error Handling

**Critical**: CORS headers MUST be set even for error responses, otherwise browsers show CORS error instead of actual error.

```typescript
private sendError(res: Response, status: number, message: string) {
  // Set CORS headers BEFORE sending error
  if (settings.allowCrossDomain) {
    res.setHeader('Access-Control-Allow-Origin', '*')
  }
  res.writeHead(status)
  res.end(message)
}
```

## Security Architecture

### Path Traversal Prevention

All file paths are normalized:
```typescript
path.normalize(filePath).toLowerCase()
```

Prevents attacks like:
- `../../../etc/passwd`
- `..\\..\\windows\\system32`

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

## Monitoring and Observability

### Logging Strategy

**Levels**:
- DEBUG: Path candidates, ZIP searches, file access
- INFO: Requests, mounts, file serves, sources
- WARN: Fallback attempts, missing files
- ERROR: Server errors, mount failures, fatal errors

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
