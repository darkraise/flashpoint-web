# Legacy Server and Fallback Chain

The Legacy Server implements a comprehensive fallback chain for serving legacy web content from multiple sources, ensuring maximum content availability.

## Overview

The Legacy Server is responsible for locating and serving files through an intelligent multi-level fallback system that checks local directories, external CDNs, and special override paths.

## Fallback Chain

### Complete Fallback Sequence

```
Request: www.example.com/path/file.swf
  ↓
1. Exact hostname match
   D:/Flashpoint/Legacy/htdocs/www.example.com/path/file.swf
  ↓ Not found
2. Hostname without query string
   D:/Flashpoint/Legacy/htdocs/www.example.com/path/file.swf (no ?params)
  ↓ Not found
3. Subdomain variations
   - example.com/path/file.swf
   - core.www.example.com/path/file.swf
   - cdn.www.example.com/path/file.swf
   (12 subdomain prefixes tried)
  ↓ Not found
4. Override paths
   D:/Flashpoint/Legacy/htdocs/{override}/www.example.com/path/file.swf
  ↓ Not found
5. CGI-BIN (if script file)
   D:/Flashpoint/Legacy/cgi-bin/www.example.com/path/file.swf
  ↓ Not found
6. Index files (if directory)
   - D:/Flashpoint/Legacy/htdocs/www.example.com/path/file.swf/index.html
   - D:/Flashpoint/Legacy/htdocs/www.example.com/path/file.swf/index.htm
   - D:/Flashpoint/Legacy/htdocs/www.example.com/path/file.swf/index.php
   - D:/Flashpoint/Legacy/htdocs/www.example.com/path/file.swf/index.swf
  ↓ Not found
7. Infinity Server (primary CDN)
   https://infinity.flashpointarchive.org/.../www.example.com/path/file.swf
  ↓ Not found
8. External fallback URLs
   https://infinity.unstable.life/.../www.example.com/path/file.swf
  ↓ Not found
9. MAD4FP paths (if enabled)
   {mad4fpPath}/www.example.com/path/file.swf
  ↓ Not found
10. Return 404
```

## Path Resolution Algorithm

### Building Path Candidates

```typescript
private buildPathCandidates(relPath: string, urlPath: string): Array<{path, type}> {
  const candidates: Array<{path, type}> = [];
  const seenPaths = new Set<string>();

  // Helper to avoid duplicates
  const addCandidate = (candidatePath: string, type: string) => {
    const normalized = path.normalize(candidatePath).toLowerCase();
    if (!seenPaths.has(normalized)) {
      seenPaths.add(normalized);
      candidates.push({ path: candidatePath, type });
    }
  };

  // Parse relPath to extract hostname and path
  const parts = relPath.split('/');
  const hostname = parts[0];
  const pathAfterHost = parts.slice(1).join('/');

  // Generate hostname variations
  const hostnameVariations = getHostnameVariations(hostname);

  // 1. Exact paths for each hostname variation
  for (const hostVariation of hostnameVariations) {
    const variantRelPath = path.posix.join(hostVariation, pathAfterHost);
    addCandidate(
      path.join(settings.legacyHTDOCSPath, variantRelPath),
      `subdomain:${hostVariation}`
    );

    // Without query string
    const pathWithoutQuery = variantRelPath.split('?')[0];
    if (pathWithoutQuery !== variantRelPath) {
      addCandidate(
        path.join(settings.legacyHTDOCSPath, pathWithoutQuery),
        `subdomain:${hostVariation}-no-query`
      );
    }
  }

  // 2. Override paths
  for (const override of settings.legacyOverridePaths) {
    addCandidate(
      path.join(settings.legacyHTDOCSPath, override, relPath),
      `override:${override}`
    );
  }

  // 3. CGI-BIN paths (for scripts)
  if (isScriptUrl(urlPath)) {
    addCandidate(
      path.join(settings.legacyCGIBINPath, relPath),
      'cgi-bin'
    );
  }

  // 4. Index files
  for (const ext of ['html', 'htm', 'php', 'swf']) {
    addCandidate(
      path.join(settings.legacyHTDOCSPath, relPath, `index.${ext}`),
      `index:${ext}`
    );
  }

  return candidates;
}
```

### Deduplication

The `seenPaths` Set ensures no path is tried twice:

```typescript
const normalized = path.normalize(candidatePath).toLowerCase();
if (!seenPaths.has(normalized)) {
  seenPaths.add(normalized);
  candidates.push(candidate);
}
```

**Benefits**:
- Avoid redundant disk I/O
- Prevent infinite loops
- Reduce log noise

## Hostname Variations

### Common Subdomain Prefixes

For hostname `mochibot.com`, the following variations are tried:

```typescript
private getHostnameVariations(hostname: string): string[] {
  const variations = [hostname]; // Original first

  const subdomains = [
    'www',      // Most common
    'core',     // API/core services
    'api',      // API endpoints
    'cdn',      // CDN content
    'static',   // Static assets
    'assets',   // Asset servers
    'media',    // Media files
    'content',  // Content servers
    'data',     // Data endpoints
    'files',    // File servers
    'secure',   // Secure content
    'download'  // Download servers
  ];

  for (const subdomain of subdomains) {
    variations.push(`${subdomain}.${hostname}`);
  }

  return variations;
}
```

**Result for `mochibot.com`**:
1. `mochibot.com` (original)
2. `www.mochibot.com`
3. `core.mochibot.com`
4. `api.mochibot.com`
5. `cdn.mochibot.com`
6. ... (12 more)

### Why Hostname Variations?

**Problem**: Games may request `mochibot.com/file.swf` but Flashpoint stores it as `core.mochibot.com/file.swf`

**Solution**: Try common subdomain prefixes to locate the file

**Real-world example**:
- Game requests: `mochi.jp/file.swf`
- Stored as: `www.mochi.jp/file.swf`
- Variation matching finds it automatically

## Query String Handling

### Stripping Query Parameters

```typescript
const pathWithoutQuery = relPath.split('?')[0];
if (pathWithoutQuery !== relPath) {
  addCandidate(pathWithoutQuery, 'exact-no-query');
}
```

**Example**:
- Request: `file.swf?v=123&cache=false`
- Try with query: `file.swf?v=123&cache=false` (exact match)
- Try without: `file.swf` (common case)

**Rationale**:
- Query strings often used for cache busting
- Files stored without query strings
- Trying both ensures maximum compatibility

## Override Paths

### What Are Override Paths?

Override paths are special directories in htdocs that take precedence over normal paths.

**Configuration** (proxySettings.json):
```json
{
  "legacyOverridePaths": [
    "custom",
    "fixes",
    "overrides"
  ]
}
```

**Example**:
- Request: `www.example.com/game.swf`
- Normal path: `D:/Flashpoint/Legacy/htdocs/www.example.com/game.swf`
- Override path: `D:/Flashpoint/Legacy/htdocs/custom/www.example.com/game.swf`

**Use cases**:
- Patched game files
- Fixed versions of broken content
- Custom modifications
- Testing new content

### Override Priority

Overrides are checked AFTER exact matches but BEFORE external sources:

```
1. Exact hostname matches (all variations)
2. Override paths (all variations)  ← Overrides here
3. CGI-BIN paths
4. Index files
5. External sources
```

This ensures:
- Exact matches take priority
- Overrides don't affect unrelated files
- External downloads can't override local patches

## CGI-BIN Support

### Script File Detection

```typescript
const SCRIPT_EXTENSIONS = ['php', 'php5', 'phtml', 'pl'];

private isScriptUrl(urlPath: string): boolean {
  const ext = path.extname(urlPath).toLowerCase().substring(1);
  return SCRIPT_EXTENSIONS.includes(ext);
}
```

### CGI Path Resolution

If script detected:
```typescript
addCandidate(
  path.join(settings.legacyCGIBINPath, relPath),
  'cgi-bin'
);
```

**Example**:
- Request: `www.example.com/script.php`
- Normal: `D:/Flashpoint/Legacy/htdocs/www.example.com/script.php`
- CGI-BIN: `D:/Flashpoint/Legacy/cgi-bin/www.example.com/script.php`

### Script Execution (Future)

Current: Scripts are served as static files

Future: Execute scripts if `ENABLE_CGI=true`

```typescript
if (isCGI && settings.enableCGI) {
  return await executeCGI(filePath, req);
}
```

**Security considerations**:
- Sandboxed execution environment
- Input validation and sanitization
- Timeout limits
- Resource limits (CPU, memory)

## Index File Fallback

### Index File Extensions

```typescript
const INDEX_EXTENSIONS = ['html', 'htm', 'php', 'swf'];
```

### Directory Request Handling

If URL ends with `/` or points to directory:

```typescript
for (const ext of INDEX_EXTENSIONS) {
  addCandidate(
    path.join(settings.legacyHTDOCSPath, relPath, `index.${ext}`),
    `index:${ext}`
  );
}
```

**Example**:
- Request: `www.example.com/games/`
- Try: `www.example.com/games/index.html`
- Try: `www.example.com/games/index.htm`
- Try: `www.example.com/games/index.php`
- Try: `www.example.com/games/index.swf`

**Special case**: Flash games may use `index.swf` as entry point

## External Sources

### Infinity Server (Primary CDN)

```typescript
infinityServerURL: 'https://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs/'
```

**Purpose**: Official Flashpoint CDN for missing local files

**Behavior**:
- HTTPS enforced (HTTP auto-upgraded)
- 45 second timeout
- Downloaded files cached locally (future)
- Retries with exponential backoff (future)

### External Fallback URLs

```typescript
externalFilePaths: [
  'https://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs',
  'https://infinity.unstable.life/Flashpoint/Legacy/htdocs/'
]
```

**Purpose**: Backup CDNs if primary fails

**Behavior**:
- Tried in order
- First successful response wins
- Failures logged but don't abort chain

### Download Implementation

```typescript
private async tryExternalSource(
  baseUrl: string,
  relPath: string
): Promise<{data: Buffer, contentType: string} | null> {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const fullUrl = `${normalizedBase}${relPath}`;

  try {
    const response = await axios.get(fullUrl, {
      responseType: 'arraybuffer',
      timeout: 45000,           // 45 seconds
      maxRedirects: 5,          // Follow redirects
      validateStatus: (status) => status === 200,
      headers: {
        'User-Agent': 'Flashpoint-Proxy/1.0'
      }
    });

    const data = Buffer.from(response.data);
    const contentType = response.headers['content-type'] || 'application/octet-stream';

    logger.info(`Downloaded: ${data.length} bytes (${contentType})`);
    return { data, contentType };
  }
  catch (error) {
    // Log but don't throw - try next source
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        logger.debug('Not found (404)');
      } else if (error.response?.status === 403) {
        logger.warn('Forbidden (403)');
      } else if (error.code === 'ETIMEDOUT') {
        logger.warn('Timeout');
      }
    }
    return null;
  }
}
```

### HTTPS Enforcement

HTTP URLs are automatically upgraded to HTTPS:

```typescript
infinityServerURL: proxySettings.infinityServerURL
  ? proxySettings.infinityServerURL.replace(/^http:\/\//, 'https://')
  : 'https://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs/'
```

**Rationale**:
- CDN servers redirect HTTP to HTTPS anyway
- HTTPS provides encryption and integrity
- Prevents downgrade attacks

### User-Agent Header

```typescript
headers: {
  'User-Agent': 'Flashpoint-Proxy/1.0'
}
```

**Purpose**:
- Identify requests as coming from Flashpoint
- Some CDNs require User-Agent header
- Helps CDN administrators track usage

## Brotli Decompression

### Compressed File Detection

```typescript
if (settings.enableBrotli && filePath.endsWith('.br')) {
  logger.debug(`Decompressing Brotli file: ${filePath}`);
  data = await brotliDecompress(data);
  filePath = filePath.substring(0, filePath.length - 3); // Remove .br
}
```

**Example**:
- Stored: `file.js.br` (Brotli compressed)
- Decompressed: `file.js` (original)
- MIME type: `text/javascript` (from decompressed filename)

**Benefits**:
- Reduce disk space (Brotli: ~80% compression for text)
- Faster disk I/O for large files
- Transparent to clients

## MAD4FP Support

### What is MAD4FP?

MAD4FP (Make a Difference 4 Flashpoint) is a community project providing additional game files.

**Configuration**:
```json
{
  "mad4fpEnabled": true,
  "mad4fpPaths": [
    "https://mad4fp.example.com/content/"
  ]
}
```

**Behavior**:
- Only tried if `mad4fpEnabled: true`
- Checked AFTER all other sources
- Same download logic as external fallbacks

## Local File Caching (Future)

### Planned Implementation

```typescript
private async cacheExternalFile(relPath: string, data: Buffer): Promise<void> {
  const cachePath = path.join(settings.cacheDirectory, relPath);
  const cacheDir = path.dirname(cachePath);

  await fs.mkdir(cacheDir, { recursive: true });
  await fs.writeFile(cachePath, data);

  logger.info(`Cached external file: ${relPath}`);
}
```

### Cache Strategy

**When to cache**:
- File successfully downloaded from external source
- File size < 100MB
- Enough disk space available

**Cache location**:
```
D:/Flashpoint/Server/cache/
  └── www.example.com/
      └── path/
          └── file.swf
```

**Cache invalidation**:
- Manual: Delete cache directory
- Automatic: LRU eviction when cache size exceeds limit
- TTL: Expire cached files after 30 days (configurable)

**Benefits**:
- Faster subsequent requests
- Reduced CDN bandwidth
- Offline capability for previously accessed files

## Error Handling

### File Not Found

If no source has the file:

```typescript
throw new Error('File not found in any source');
```

Handled by proxy server:

```typescript
if (error instanceof Error && error.message.includes('not found')) {
  sendError(res, 404, 'File not found in any source');
}
```

### Network Errors

External downloads may fail with various errors:

```typescript
catch (error) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 404) {
      logger.debug('Not found (404)');
    } else if (error.response?.status === 403) {
      logger.warn('Forbidden (403)');
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      logger.warn('Timeout');
    } else {
      logger.warn(`Error: ${error.message}`);
    }
  }
  return null; // Try next source
}
```

**Graceful degradation**: Failures don't abort the chain, next source is tried.

### Disk Errors

Local file access may fail:

```typescript
try {
  const stats = await fs.stat(candidate.path);
  if (stats.isFile()) {
    return await serveFile(candidate.path);
  }
} catch (error) {
  // File doesn't exist or permission denied
  continue; // Try next candidate
}
```

**Recovery**: Continue to next path candidate or external source.

## Performance Optimization

### Early Exit

Stop as soon as file is found:

```typescript
for (const candidate of pathCandidates) {
  try {
    const stats = await fs.stat(candidate.path);
    if (stats.isFile()) {
      return await serveFile(candidate.path); // Early exit
    }
  } catch {
    continue;
  }
}
```

**Benefit**: Typically only 1-3 paths checked before finding file.

### Stat Caching (Future)

Cache stat results to avoid repeated disk I/O:

```typescript
const statCache = new Map<string, fs.Stats>();

async function cachedStat(filePath: string): Promise<fs.Stats> {
  if (statCache.has(filePath)) {
    return statCache.get(filePath)!;
  }
  const stats = await fs.stat(filePath);
  statCache.set(filePath, stats);
  return stats;
}
```

**Benefit**: Reduce disk I/O for frequently accessed paths.

### Parallel External Requests (Future)

Try all external sources in parallel:

```typescript
const results = await Promise.allSettled([
  tryExternalSource(infinityServerURL, relPath),
  ...externalFilePaths.map(url => tryExternalSource(url, relPath))
]);

// Return first successful result
for (const result of results) {
  if (result.status === 'fulfilled' && result.value) {
    return result.value;
  }
}
```

**Benefit**: Reduce latency by racing external sources.

## Logging

### Path Resolution

```
[LegacyServer] Serving: www.example.com/game.swf
[LegacyServer] Relative path: www.example.com/game.swf
[LegacyServer] Trying: D:/Flashpoint/Legacy/htdocs/www.example.com/game.swf (exact)
[LegacyServer] ✓ Found file: D:/Flashpoint/Legacy/htdocs/www.example.com/game.swf
```

### External Fallback

```
[LegacyServer] File not found locally, trying external sources...
[LegacyServer] Trying Infinity Server...
[LegacyServer] Downloading: https://infinity.flashpointarchive.org/.../game.swf
[LegacyServer] ✓ Downloaded: 123456 bytes (application/x-shockwave-flash)
```

### Debug Logging

Enable with `LOG_LEVEL=debug`:

```
[LegacyServer] Trying: D:/Flashpoint/Legacy/htdocs/www.example.com/game.swf (exact)
[LegacyServer] Trying: D:/Flashpoint/Legacy/htdocs/example.com/game.swf (subdomain:example.com)
[LegacyServer] Trying: D:/Flashpoint/Legacy/htdocs/core.example.com/game.swf (subdomain:core.example.com)
...
```

## Testing

### Test Local Serving

```bash
# Create test file
mkdir -p "D:/Flashpoint/Legacy/htdocs/test.com"
echo "Hello World" > "D:/Flashpoint/Legacy/htdocs/test.com/index.html"

# Request file
curl http://localhost:22500/http://test.com/index.html

# Expected: Hello World
```

### Test Hostname Variations

```bash
# Create file with subdomain
mkdir -p "D:/Flashpoint/Legacy/htdocs/www.test.com"
echo "From WWW" > "D:/Flashpoint/Legacy/htdocs/www.test.com/file.txt"

# Request without subdomain
curl http://localhost:22500/http://test.com/file.txt

# Expected: Should find via hostname variation matching
```

### Test External Fallback

```bash
# Request file not in local htdocs
curl http://localhost:22500/http://uploads.ungrounded.net/alternate/77000/77434_alternate_5449.swf

# Expected: Download from Infinity Server
# Check X-Source header: should be "infinity-server"
```

### Test Query String Handling

```bash
# Request with query string
curl "http://localhost:22500/http://test.com/file.swf?v=123"

# Expected: Should strip query and find file.swf
```

## Configuration

### Environment Variables

```bash
FLASHPOINT_PATH=D:/Flashpoint
FLASHPOINT_HTDOCS_PATH=D:/Flashpoint/Legacy/htdocs
EXTERNAL_FALLBACK_URLS=https://infinity.flashpointarchive.org/...,https://backup.example.com/...
```

### proxySettings.json

```json
{
  "legacyOverridePaths": ["custom", "fixes"],
  "infinityServerURL": "https://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs/",
  "externalFilePaths": [
    "https://infinity.unstable.life/Flashpoint/Legacy/htdocs/"
  ],
  "mad4fpEnabled": false,
  "mad4fpPaths": [],
  "enableBrotli": true,
  "enableCGI": false
}
```

## Future Enhancements

1. **Local File Caching**: Cache downloaded external files
2. **Parallel External Requests**: Race external sources for faster responses
3. **Stat Caching**: Cache file stat results to reduce disk I/O
4. **CGI Execution**: Execute PHP/Perl scripts
5. **.htaccess Support**: Parse and apply .htaccess rules
6. **Content Negotiation**: Serve different versions based on Accept headers
7. **Conditional Requests**: Support If-Modified-Since, ETag
8. **Range Requests**: Support partial content (206)
9. **Metrics**: Track hit rate, source distribution, latency

## References

- FlashpointGameServer Go implementation
- Flashpoint proxySettings.json specification
- Apache htdocs structure conventions
