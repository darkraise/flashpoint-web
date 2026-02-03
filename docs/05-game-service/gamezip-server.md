# GameZip Server (Port 22501)

The GameZip Server mounts ZIP archives in-memory and serves files directly using streaming, eliminating disk extraction needs.

## Overview

Mounts ZIP archives and serves files using `node-stream-zip` for streaming without extraction. This saves disk space and improves performance.

## Architecture

```
┌──────────────────────────────────────────────┐
│           GameZip Server (22501)             │
├──────────────────────────────────────────────┤
│  HTTP Server (Express)                       │
│       ↓                                      │
│  GameZipServer Class                         │
│       ↓                                      │
│  ZipManager (singleton)                      │
│       ↓                                      │
│  node-stream-zip (streaming)                 │
└──────────────────────────────────────────────┘
```

## API Endpoints

### Mount ZIP Archive

```http
POST /mount/:id HTTP/1.1
Content-Type: application/json

{"zipPath": "D:/Flashpoint/Data/Games/Flash/G/game.zip"}
```

**Response:**
```json
{"success": true, "id": "game-123", "zipPath": "..."}
```

**Errors:**
- `400`: Missing mount ID or zipPath
- `500`: ZIP file not found or mount failed

### Unmount ZIP Archive

```http
DELETE /mount/:id HTTP/1.1
```

**Response:**
```json
{"success": true, "id": "game-123"}
```

### List Mounted ZIPs

```http
GET /mounts HTTP/1.1
```

**Response:**
```json
{
  "mounts": [
    {
      "id": "game-123",
      "zipPath": "D:/Flashpoint/Data/Games/Flash/G/game.zip",
      "mountTime": "2025-01-18T10:30:00.000Z",
      "fileCount": 0
    }
  ]
}
```

### Serve File from ZIP

```http
GET http://www.example.com/path/file.swf HTTP/1.1
```

or

```http
GET /http://www.example.com/path/file.swf HTTP/1.1
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/x-shockwave-flash
Content-Length: 123456
Cache-Control: public, max-age=86400
X-Source: gamezipserver:game-123
Access-Control-Allow-Origin: *
```

## Request Processing

### URL Format Support

GameZip supports three URL formats:
1. **Proxy-style**: `GET http://domain.com/path`
2. **Path-based**: `GET /http://domain.com/path`
3. **Standard**: `GET /path` with Host header

### Path Search Strategy

For request `www.example.com/path/file.swf`, tries:
1. `content/www.example.com/path/file.swf` (most common)
2. `htdocs/www.example.com/path/file.swf` (standard)
3. `www.example.com/path/file.swf` (no prefix)
4. `Legacy/htdocs/www.example.com/path/file.swf` (full path)

First match wins and returns immediately.

## File Serving

### Streaming Access

Files read directly from ZIP archives without extraction:

```typescript
async getFile(id: string, filePath: string): Promise<Buffer | null> {
  const mounted = this.mountedZips.get(id);
  if (!mounted) return null;
  try {
    const data = await mounted.zip.entryData(filePath);
    return data;
  } catch (error) {
    return null;
  }
}
```

**Benefits:**
- No disk extraction required
- No temporary files created
- Direct memory buffer access
- Fast random access

### MIME Type Detection

Detected from file extensions with 199+ supported types.

## Response Headers

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
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: *
```

## HTML Polyfill Injection

HTML files are automatically processed to inject compatibility polyfills:
- Unity WebGL support
- General browser compatibility shims

## Integration with Backend

**Workflow:**
1. Backend mounts ZIP: `POST /mount/{game.id}`
2. Backend returns launch config with gameZip URLs
3. Frontend loads game from proxy server
4. Proxy checks GameZip first for fastest access
5. GameZip serves file from mounted ZIP

## Error Handling

**Mount Errors:**
- `ZIP file not found` - Invalid zip path
- `ZIP already mounted` - Silent success (returns immediately)
- `Corrupted ZIP` - File read error

**File Access Errors:**
- `File not in ZIP` - Returns 404
- `No ZIPs mounted` - Returns 404

**Graceful Degradation:**
If GameZip fails, proxy server continues without it.

## Testing

```bash
# Mount ZIP
curl -X POST http://localhost:22501/mount/test-game \
  -H "Content-Type: application/json" \
  -d '{"zipPath": "D:/Flashpoint/Data/Games/test.zip"}'

# List mounts
curl http://localhost:22501/mounts

# Request file
curl http://localhost:22501/http://www.example.com/test.swf

# Check headers
curl -I http://localhost:22501/http://www.example.com/test.swf

# Unmount
curl -X DELETE http://localhost:22501/mount/test-game
```

## Troubleshooting

### Port Already in Use
```bash
GAMEZIPSERVER_PORT=22502
```

### ZIP Mount Fails
1. Verify path is absolute
2. Check file permissions
3. Ensure ZIP file exists

### File Not Found in ZIP
1. List mounted ZIPs: `curl http://localhost:22501/mounts`
2. Check if correct ZIP is mounted
3. Verify file exists in ZIP (extract and check)
4. Check ZIP structure (content/, htdocs/, or root?)

### Memory Issues
1. Limit number of mounted ZIPs
2. Implement auto-unmount for inactive ZIPs
3. Add file size limits
4. Use streaming for large files

## Security

### Path Traversal Prevention
File paths are normalized and validated to prevent directory traversal.

### Mount Access Control
Only explicitly mounted ZIPs are accessible. No arbitrary ZIP path access.

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
[GameZipServer] POST /mount/game-123
[ZipManager] Mounting ZIP: game-123 → D:/Flashpoint/Data/Games/game.zip
[ZipManager] ✓ Mounted ZIP: game-123 (1234 files)
```

## Related Documentation

- [proxy-server.md](./proxy-server.md) - HTTP Proxy Server
- [legacy-server.md](./legacy-server.md) - Legacy content serving
