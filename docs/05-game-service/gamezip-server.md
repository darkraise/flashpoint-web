# GameZip Server

The GameZip Server is integrated into the backend as a singleton that mounts ZIP
archives in-memory and serves files directly using streaming, eliminating disk
extraction needs.

## Overview

Mounts ZIP archives and serves files using `node-stream-zip` for streaming
without extraction. This saves disk space and improves performance. No longer
runs as a separate HTTP server - now accessed via direct method calls from
within the backend.

## Architecture

```
┌──────────────────────────────────────────────┐
│           GameZip Server (Singleton)         │
├──────────────────────────────────────────────┤
│  GameZipServer Class (Direct Method API)    │
│       ↓                                      │
│  ZipManager (singleton)                      │
│       ↓                                      │
│  node-stream-zip (streaming)                 │
└──────────────────────────────────────────────┘
```

Called directly from:
- Backend GameService on startup
- Proxy router when serving game content
- Backend routes when managing mounts

## Direct API Methods

Instead of HTTP endpoints, GameZip Server provides direct method calls:

### Mount ZIP Archive

```typescript
// Called from backend
const result = await gameZipServer.mountZip(params: MountParams)
```

Parameters:

```typescript
interface MountParams {
  id: string;                // Required: Mount ID (typically game UUID)
  zipPath: string;           // Required: Absolute path to ZIP file
  gameId?: string;           // Optional: Game UUID (enables auto-download)
  dateAdded?: string;        // Optional: ISO date (used for filename)
  sha256?: string;           // Optional: Expected SHA256 hash
}
```

**Response:**

```typescript
interface MountResult {
  success: boolean;        // True if mounted or download started
  downloading?: boolean;   // True if download in progress (HTTP 202)
  statusCode: number;      // HTTP status code (200, 202, 400, 403, 404, 500, 503)
}
```

```typescript
// Example usage
const result = await gameZipServer.mountZip({
  id: 'game-abc123',
  zipPath: 'D:/Flashpoint/Data/Games/Flash/G/game.zip',
  gameId: 'game-abc123',
  dateAdded: '2024-01-15T10:30:00.000Z',
  sha256: 'ABC123...'
});

if (result.success) {
  if (result.downloading) {
    console.log('Download in progress, poll for completion');
  } else {
    console.log('ZIP mounted successfully');
  }
} else {
  console.error(`Mount failed with status ${result.statusCode}`);
}
```

**Mount Process:**

On mount, the ZipManager builds an entry index for O(1) file lookups:

```
1. Check if already mounted (prevent duplicates)
2. Verify ZIP file exists on disk
3. Create StreamZip.async instance
4. Build Set<string> of all entry names
5. Store in LRU cache with metadata and entryIndex
6. Log file count for debugging
```

**Errors:**

- `ZIP file not found`: Invalid zipPath, ZIP doesn't exist
- `ZIP path outside allowed directory`: Security violation
- `Auto-download failed`: All sources failed to download, 503 if too many downloads
- `Corrupted ZIP`: File read error

### Auto-Download Feature

When a ZIP file doesn't exist locally but `gameId` and `dateAdded` are provided,
the GameZip server automatically downloads it from configured `gameDataSources`
in `preferences.json`.

**Download flow:**

```
1. Check if ZIP exists locally
   ↓ Not found
2. Read gameDataSources from preferences.json
3. Construct filename: {gameId}-{timestamp}.zip
4. Try each source sequentially:
   ├─ Download to temp file
   ├─ Verify SHA256 (if provided)
   ├─ Move to Data/Games/
   └─ If failed, try next source
5. Mount the downloaded ZIP
6. Return success with downloaded: true
```

**Download Reliability Improvements:**

- `findActiveDownload()` now correlates downloads with hostname from the request
  path instead of returning the first arbitrary download (ensures correct
  download status on concurrent requests)
- Stale download cleanup extracted to shared `cleanupStaleDownloads()` method
  (DRY principle, shared between functions)
- `new URL()` calls wrapped in try-catch for proper 400 error handling on
  malformed URLs (prevents 500 errors)

**Configuration** (`preferences.json`):

```json
{
  "gameDataSources": [
    {
      "type": "raw",
      "name": "Flashpoint Project",
      "arguments": ["https://download.flashpointarchive.org/gib-roms/Games/"]
    }
  ]
}
```

This matches the Flashpoint Launcher's configuration format, so existing
installations should work automatically.

### Unmount ZIP Archive

```typescript
// Called from backend
const success = await gameZipServer.unmountZip(id: string): Promise<boolean>
```

**Returns:**

- `true` if unmounted successfully
- `false` if ZIP not mounted or error occurred

**Example:**

```typescript
const success = await gameZipServer.unmountZip('game-123');
if (success) {
  console.log('ZIP unmounted');
} else {
  console.log('ZIP not mounted or error');
}
```

### List Mounted ZIPs

```typescript
// Called from backend or admin API
const mounts = gameZipServer.listMounts(): Array<MountInfo>
```

**Returns:**

```typescript
interface MountInfo {
  id: string;          // Mount ID
  zipPath: string;     // Absolute path to ZIP
  mountTime: Date;     // When ZIP was mounted
  fileCount: number;   // Number of files in ZIP
}
```

**Example:**

```typescript
const mounts = gameZipServer.listMounts();
mounts.forEach(mount => {
  console.log(`${mount.id}: ${mount.zipPath} (${mount.fileCount} files)`);
});
```

### Find File in Mounted ZIPs

```typescript
// Called from proxy router
const result = await gameZipServer.findFile(relPath: string): Promise<FileData | null>
```

**Returns:**

```typescript
interface FileData {
  data: Buffer;          // File contents
  mountId: string;       // Which ZIP it came from
}
```

Returns `null` if file not found in any mounted ZIP.

**Example:**

```typescript
const result = await gameZipServer.findFile('www.example.com/game.swf');
if (result) {
  console.log(`Found in ${result.mountId}, ${result.data.length} bytes`);
}
```

## File Access Process

### Path Search Strategy

When finding a file, GameZip searches for multiple path variations:

For relative path `www.example.com/path/file.swf`, tries:

1. `content/www.example.com/path/file.swf` (most common)
2. `htdocs/www.example.com/path/file.swf` (standard)
3. `www.example.com/path/file.swf` (no prefix)
4. `Legacy/htdocs/www.example.com/path/file.swf` (full path)

First match wins and returns immediately.

### Multi-ZIP Searching with Entry Index Optimization

If multiple ZIPs are mounted, GameZip searches all of them efficiently:

```
For each path variation:
  For each mounted ZIP:
    Check entryIndex.has(variation) - O(1) lookup
    If found:
      Call zip.entryData(variation) to read file
      Return immediately
Return null if not found in any ZIP
```

**Performance Benefits:**

- Entry index is a `Set<string>` built at mount time
- O(1) existence checks eliminate sequential I/O
- Failures return quickly (404 responses are fast)
- Failed lookups don't trigger unnecessary ZIP reads

This allows multiple game ZIPs to be mounted simultaneously with efficient searching.

## Response Processing

When files are found and served from GameZip:

### MIME Type Detection

Detected from file extensions with 199+ supported types. See
[mime-types.md](./mime-types.md) for complete list.

### HTML Polyfill Injection

HTML files are automatically processed to inject compatibility polyfills:

- Unity WebGL support (polyfills for older game loaders)
- General browser compatibility shims
- See [html-polyfills.md](./html-polyfills.md) for details

## Response Headers

When serving through the proxy router, responses include:

### Standard Headers

```http
Content-Type: application/x-shockwave-flash
Content-Length: 123456
Cache-Control: public, max-age=86400
X-Source: gamezipserver:game-123
Connection: keep-alive
```

### CORS Headers

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS
Access-Control-Allow-Headers: *
```

## Integration with Backend

**Workflow:**

1. Backend calls: `gameZipServer.mountZip('game-id', params)`
2. Backend returns launch config pointing to `/game-proxy/` URLs
3. Frontend loads game from proxy endpoint
4. Proxy calls: `gameZipServer.findFile(relPath)`
5. GameZip serves file from mounted ZIP

## Error Handling

**Mount Errors:**

- `ZIP file not found` - Invalid zip path
- `ZIP already mounted` - Silent success (returns immediately)
- `Corrupted ZIP` - File read error

**File Access Errors:**

- `File not in ZIP` - Returns 404
- `No ZIPs mounted` - Returns 404

**Graceful Degradation:** If GameZip fails, proxy server continues without it.

## Testing

GameZip Server is not directly accessible via HTTP. Test through the backend:

```bash
# Request file through backend proxy
curl http://localhost:3100/game-proxy/http://www.example.com/test.swf

# Check response headers
curl -I http://localhost:3100/game-proxy/http://www.example.com/test.swf
```

For unit testing, you can test GameZip methods directly in backend tests:

```typescript
import { gameZipServer } from '@/game';

// Mount a ZIP
await gameZipServer.mountZip('test-game', {
  zipPath: 'D:/Flashpoint/Data/Games/test.zip'
});

// Find a file
const result = await gameZipServer.findFile('www.example.com/test.swf');

// List mounts
const mounts = gameZipServer.listMounts();

// Unmount
await gameZipServer.unmountZip('test-game');
```

## Troubleshooting

### ZIP Mount Fails

1. Verify path is absolute
2. Check file permissions
3. Ensure ZIP file exists
4. Check backend logs for mount errors

### File Not Found in ZIP

1. Check backend logs to see which ZIP is mounted
2. Verify file exists in ZIP (extract and check)
3. Check ZIP structure (content/, htdocs/, or root?)
4. Verify correct path variations are tried

### Memory Issues

1. Limit number of mounted ZIPs (max 100 default)
2. Implement auto-unmount for inactive ZIPs (feature)
3. Monitor backend memory usage
4. Unmount ZIPs when not needed

## Security

### Path Traversal Prevention

File paths are normalized and validated to prevent directory traversal.

### Mount Access Control

Only explicitly mounted ZIPs are accessible. No arbitrary ZIP path access.

### ZIP Entry Size Limits

Files larger than 50MB are rejected to prevent memory exhaustion attacks:

```typescript
const entry = entries[normalizedPath];
if (entry && entry.size > 50 * 1024 * 1024) {
  logger.warn(`[ZipManager] File too large to buffer: ${entry.size} bytes`);
  return null;
}
```

**Protection**: Prevents DoS attacks that attempt to load massive files into
memory.

### Mount Endpoint Authentication

POST `/api/game-zip/mount/:id`, DELETE `/api/game-zip/mount/:id`, and
GET `/api/game-zip/mounts` endpoints require:

- Valid JWT authentication (Bearer token)
- `settings.update` permission
- Valid mount ID (validated via Zod schema)

**Implementation**: Mount IDs must not contain path traversal sequences (`../`,
`..\\`, or null bytes).

### XSS Prevention in Download Loading Page

All values interpolated into the download loading page HTML are sanitized via
`escapeHtml()`:

```typescript
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
```

**Protected values**:

- Progress values: `0-100`
- Source names: From `gameDataSources` configuration
- Elapsed time: `{hours}h {minutes}m {seconds}s`
- File size: Human-readable format

All values are escaped before rendering in the HTML template to prevent
injection attacks.

## Performance

### Memory Usage

- Small ZIP (~100 files): ~1MB RAM
- Medium ZIP (~1,000 files): ~5MB RAM
- Large ZIP (~10,000 files): ~50MB RAM
- Each request loads file into memory

### Access Speed

- Index lookup: O(1) hash table
- File read: Random access, depends on position
- Typical: Small files 2-5ms, medium 10-50ms, large 50-500ms

## Logging

```
[ZipManager] Mounting ZIP: game-123 → D:/Flashpoint/Data/Games/game.zip
[ZipManager] ✓ Mounted ZIP: game-123 (1234 files)
[ZipManager] ✓ Found in game-123: content/www.example.com/game.swf
```

## Related Documentation

- [proxy-server.md](./proxy-server.md) - HTTP Proxy Server
- [legacy-server.md](./legacy-server.md) - Legacy content serving
