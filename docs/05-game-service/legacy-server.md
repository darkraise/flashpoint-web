# Legacy Server and Fallback Chain

The Legacy Server implements a comprehensive fallback chain for serving legacy web content from multiple sources, ensuring maximum content availability.

## Overview

Multi-level fallback system that checks local directories, external CDNs, and override paths for game files.

## Fallback Chain

```
Request: www.example.com/path/file.swf
  ↓
1. Exact hostname match (with variations)
   D:/Flashpoint/Legacy/htdocs/www.example.com/path/file.swf
  ↓ Not found
2. Subdomain variations (www, core, api, cdn, static, etc.)
   - example.com/path/file.swf
   - core.www.example.com/path/file.swf
   - (13 variations tried)
  ↓ Not found
3. Override paths
   D:/Flashpoint/Legacy/htdocs/{override}/www.example.com/path/file.swf
  ↓ Not found
4. External CDN (Infinity Server)
   https://infinity.flashpointarchive.org/.../www.example.com/path/file.swf
  ↓ Not found
5. Return 404
```

## Path Resolution Algorithm

Builds path candidates and searches them in order:

```typescript
private buildPathCandidates(relPath: string): Array<{path, type}> {
  const candidates: Array<{path, type}> = [];
  const seenPaths = new Set<string>();

  const addCandidate = (candidatePath: string, type: string) => {
    const normalized = path.normalize(candidatePath).toLowerCase();
    if (!seenPaths.has(normalized)) {
      seenPaths.add(normalized);
      candidates.push({ path: candidatePath, type });
    }
  };

  // Generate and add candidate paths
  // ...
  return candidates;
}
```

**Deduplication**: `seenPaths` Set prevents trying the same path twice.

## Hostname Variations

For hostname `mochibot.com`, tries:
1. `mochibot.com` (original)
2. `www.mochibot.com`
3. `core.mochibot.com`
4. `api.mochibot.com`
5. `cdn.mochibot.com`
6. ... (12 more standard subdomains)

**Why?** Games may request `mochibot.com` but Flashpoint stores it as `core.mochibot.com`.

## Query String Handling

Query strings are stripped before path lookup:

```typescript
const pathWithoutQuery = relPath.split('?')[0];
```

**Example:**
- Request: `file.swf?v=123&cache=false`
- Try: `file.swf?v=123` (exact match)
- Try: `file.swf` (common case)

Files stored without query strings, so both are attempted.

## Override Paths

Override paths are special directories that take precedence over normal paths.

**Configuration** (proxySettings.json):
```json
{
  "legacyOverridePaths": ["custom", "fixes", "overrides"]
}
```

**Example:**
- Request: `www.example.com/game.swf`
- Normal: `D:/Flashpoint/Legacy/htdocs/www.example.com/game.swf`
- Override: `D:/Flashpoint/Legacy/htdocs/custom/www.example.com/game.swf`

**Use cases:**
- Patched game files
- Fixed versions of broken content
- Custom modifications

## External Sources

### Infinity Server (Primary CDN)

```typescript
infinityServerURL: 'https://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs/'
```

Official Flashpoint CDN for missing local files.

### External Fallback URLs

```typescript
externalFilePaths: [
  'https://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs',
  'https://infinity.unstable.life/Flashpoint/Legacy/htdocs/'
]
```

Backup CDNs tried in order.

### Download Implementation

```typescript
private async tryExternalSource(baseUrl: string, relPath: string) {
  const fullUrl = `${baseUrl}/${relPath}`;
  const response = await axios.get(fullUrl, {
    responseType: 'arraybuffer',
    timeout: 45000,
    maxRedirects: 5,
    headers: { 'User-Agent': 'Flashpoint-Proxy/1.0' }
  });
  return { data: Buffer.from(response.data), contentType: response.headers['content-type'] };
}
```

**Features:**
- HTTPS enforced (HTTP auto-upgraded)
- 45 second timeout
- 5 redirect limit
- User-Agent header for tracking

## Brotli Decompression

Automatically decompresses `.br` files:

```typescript
if (settings.enableBrotli && filePath.endsWith('.br')) {
  data = await brotliDecompress(data);
  filePath = filePath.substring(0, filePath.length - 3);
}
```

**Example:**
- Stored: `file.js.br` (Brotli compressed)
- Decompressed: `file.js`
- MIME: `text/javascript`

## Error Handling

**File Not Found:**
If no source has the file, returns 404 after all sources exhausted.

**Network Errors:**
External downloads may fail (404, 403, timeout). Service continues to next source without aborting.

**Disk Errors:**
Local file access failures (permissions, not found) continue to next candidate.

**Graceful Degradation:**
Failures don't abort the chain; next source is tried.

## Performance Optimization

### Early Exit
Stop as soon as file is found:
```typescript
for (const candidate of pathCandidates) {
  const stats = await fs.stat(candidate.path);
  if (stats.isFile()) {
    return await serveFile(candidate.path); // Early exit
  }
}
```

Typically only 1-3 paths checked before finding file.

## Logging

### Path Resolution
```
[LegacyServer] Trying: D:/Flashpoint/Legacy/htdocs/www.example.com/game.swf (exact)
[LegacyServer] ✓ Found file: D:/Flashpoint/Legacy/htdocs/www.example.com/game.swf
```

### External Fallback
```
[LegacyServer] File not found locally, trying external sources...
[LegacyServer] Downloading: https://infinity.flashpointarchive.org/.../game.swf
[LegacyServer] ✓ Downloaded: 123456 bytes (application/x-shockwave-flash)
```

## Configuration

### Environment Variables

```bash
FLASHPOINT_PATH=D:/Flashpoint
# Note: HTDOCS path derived as $FLASHPOINT_PATH/Legacy/htdocs
EXTERNAL_FALLBACK_URLS=https://infinity.flashpointarchive.org/...,https://backup.example.com/...
```

### proxySettings.json

```json
{
  "legacyOverridePaths": ["custom", "fixes"],
  "infinityServerURL": "https://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs/",
  "externalFilePaths": ["https://infinity.unstable.life/Flashpoint/Legacy/htdocs/"],
  "enableBrotli": true,
  "enableCGI": false
}
```

## Testing

```bash
# Create test file
mkdir -p "D:/Flashpoint/Legacy/htdocs/test.com"
echo "Hello World" > "D:/Flashpoint/Legacy/htdocs/test.com/index.html"

# Request file
curl http://localhost:22500/http://test.com/index.html

# Expected: Hello World
```

## Security

### Path Validation
All paths normalized to prevent directory traversal:
- Blocks `../../../etc/passwd`
- Blocks absolute path escapes
- Blocks URL-encoded traversal

### External CDN
- HTTPS enforced
- Timeouts prevent DoS
- User-Agent header for tracking

## Related Documentation

- [proxy-server.md](./proxy-server.md) - HTTP Proxy Server
- [gamezip-server.md](./gamezip-server.md) - GameZip Server
