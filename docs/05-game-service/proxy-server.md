# Game Proxy Router

The Game Proxy Router is integrated into the backend Express application and
handles all game content requests, implementing a multi-level fallback chain to
ensure content availability.

## Overview

The proxy router is now part of the backend on port 3100. It provides legacy web
content serving with intelligent fallback mechanisms, replacing the original
standalone FlashpointGameServer.

## Integration

The proxy router is registered in `backend/src/server.ts`:

```typescript
import { createGameProxyRouter } from '@/game';

// Mount proxy router
app.use('/game-proxy', await createGameProxyRouter(config));
```

This makes game content accessible at `http://localhost:3100/game-proxy/*`

## Request Handling

### URL Format Support

The proxy supports three URL formats:

**1. Proxy-Style Requests (via /game-proxy)**

```http
GET /game-proxy/http://www.example.com/path/file.swf HTTP/1.1
Host: localhost:3100
```

**2. Path-Based Requests (via /game-proxy)**

```http
GET /game-proxy//http://www.example.com/path/file.swf HTTP/1.1
Host: localhost:3100
```

**3. Standard Requests (via /game-proxy)**

```http
GET /game-proxy/path/file.swf HTTP/1.1
Host: localhost:3100
```

Note: All requests must go through `/game-proxy/` prefix as they're routed by
Express.

### URL Parsing Logic

```typescript
router.get('/*', async (req: Request, res: Response) => {
  // req.url contains the path after /game-proxy/
  const url = req.params[0]; // Everything after /game-proxy/

  let hostname: string;
  let urlPath: string;

  if (url.startsWith('http://') || url.startsWith('https://')) {
    const targetUrl = new URL(url);
    hostname = targetUrl.hostname;
    urlPath = targetUrl.pathname + targetUrl.search;
  }
  else {
    hostname = req.headers.host || 'localhost';
    urlPath = '/' + url;
  }
  // ... process request
});
```

## Request Routing

**Routing Chain:**

1. Try GameZip Server (direct method call) - fast path
2. Try Legacy Server (local + external)
3. Send response or error

## CORS Handling

### Preflight Requests

```typescript
handleOptionsRequest(req, res) {
  if (settings.allowCrossDomain) {
    setCorsHeaders(res, settings);
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  res.writeHead(204);
  res.end();
}
```

### Response Headers

All responses include CORS headers when enabled:

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS
Access-Control-Allow-Headers: *
```

**CORS Headers Utility**: CORS headers now use the shared `setCorsHeaders`
utility from `utils/cors.ts` for consistency. This utility includes all required
methods (GET, POST, DELETE, OPTIONS) and is reused across both proxy servers,
eliminating duplication.

**Why CORS required:** Flash games and web content make cross-domain requests
for assets and API calls.

## HTML Polyfill Injection

HTML files are automatically processed to inject compatibility polyfills **only
in `sendResponse()`**, not during the GameZip server lookup:

```typescript
private sendResponse(res: ServerResponse, result: LegacyFileResponse, source: string): void {
  // ... other headers ...

  if (result.data) {
    // Buffered response (HTML files that need polyfill injection)
    let fileData = result.data;
    if (contentType.includes('text/html')) {
      fileData = injectPolyfills(result.data);  // Only here
      logger.info(`Injected polyfills into HTML file`);
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', fileData.length);
    res.end(fileData);
  }
}
```

**Polyfills Injected:**

- Unity WebGL support
- General browser compatibility shims

**Double Injection Prevention**: HTML files from ZIPs are never processed in
`tryGameZipServer()`. Injection happens only once in `sendResponse()`, preventing
duplicate polyfill scripts in the final response.

## Response Headers

### Standard Headers

```http
HTTP/1.1 200 OK
Content-Type: application/x-shockwave-flash
Content-Length: 1234567
Cache-Control: public, max-age=86400
Connection: keep-alive
X-Source: local-htdocs
Access-Control-Allow-Origin: *
```

### Stream Cleanup

The proxy automatically cleans up streams when clients disconnect:

```typescript
private sendResponse(res: ServerResponse, data: Buffer, contentType: string) {
  let sent = false;

  // Clean up on client disconnect
  res.on('close', () => {
    if (!sent) {
      logger.debug('Client disconnected, destroying stream');
    }
  });

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', data.length);
  res.end(data);
  sent = true;
}
```

**Benefits:**

- Prevents zombie streams on client disconnect
- Frees memory and file handles immediately
- Reduces resource leaks from abandoned connections

### Custom Headers

**X-Source** - Indicates where file was served from:

```
X-Source: local-htdocs           # Local htdocs
X-Source: gamezipserver:game-123 # GameZip server
X-Source: infinity-server        # Primary CDN
X-Source: https://example.com    # Secondary source
```

**Cache-Control** - Files cached for 24 hours:

```http
Cache-Control: public, max-age=86400
```

## Error Handling

### Error Types

1. **400 Bad Request** - No URL provided
2. **404 Not Found** - File not found in any source
3. **500 Internal Server Error** - Unexpected error

### Error Responses

```typescript
private sendError(res: ServerResponse, statusCode: number, message: string) {
  logger.warn(`Sending error ${statusCode}: ${message}`);

  // CRITICAL: Set CORS headers even for errors
  if (settings.allowCrossDomain) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
  }

  res.setHeader('Content-Type', 'text/plain');
  res.writeHead(statusCode);
  res.end(message);
}
```

**Why CORS on errors?** Missing CORS headers from error responses causes
browsers to hide the actual error message.

## GameZip Integration

Before trying the legacy fallback chain, check if file exists in mounted ZIP
via direct method call with entry index optimization:

```typescript
private async tryGameZipServer(hostname: string, urlPath: string) {
  try {
    const relPath = `${hostname}${urlPath}`;
    const result = await gameZipServer.findFile(relPath);

    if (result) {
      return {
        data: result.data,
        contentType: getMimeType(path.extname(urlPath).substring(1))
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}
```

**Performance:**

- Entry index lookups: <0.1ms (O(1) hash set operations)
- File read from ZIP: 1-10ms (streaming via node-stream-zip)
- External request: 100-500ms
- Speedup: 100-5000x faster for ZIP-served content (vs external CDN)
- Failed lookups: <0.1ms (no I/O if entry not in index)

## Performance Optimization

### Connection Management

The HTTP server is configured with strict connection limits to prevent resource exhaustion:

```typescript
server.keepAliveTimeout = 65000;          // 65 seconds
server.headersTimeout = 66000;            // 66 seconds
server.timeout = 120000;                  // 120 seconds
server.maxConnections = 500;              // Max concurrent connections
res.setHeader('Connection', 'keep-alive');
```

**Benefits:**

- Reuses TCP connections, reduces handshake overhead
- Graceful socket management prevents connection leaks
- Bounded resource usage prevents DoS
- Timeouts prevent long-running requests from blocking

### External Request Connection Pooling

For external CDN requests, a dedicated axios instance uses connection pooling:

```typescript
const externalAxios = axios.create({
  httpAgent: new http.Agent({
    maxSockets: 10,    // Max 10 sockets per host
    keepAlive: true
  }),
  httpsAgent: new https.Agent({
    maxSockets: 10,
    keepAlive: true
  })
});
```

**Benefits:**

- Reuses connections to CDNs (reduces TLS handshakes)
- Per-host limits prevent overwhelming single CDN
- Bounded by total server max connections (500)

## Logging

```
[ProxyHandler] GET /game-proxy/http://www.example.com/game.swf
[ProxyHandler] Parsed - Host: www.example.com, Path: /game.swf
[ProxyHandler] Trying GameZip server...
[ProxyHandler] ✓ Served from GameZip
```

**Log Levels:**

- DEBUG: Detailed path resolution
- INFO: Request summary
- WARN: Errors, missing files
- ERROR: Fatal errors

## Integration with Backend

**Request Flow:**

1. Frontend requests `/api/games/123/launch`
2. Backend returns:
   `{"launchUrl": "http://localhost:3100/game-proxy/http://www.example.com/game.swf"}`
3. Frontend loads game in player iframe
4. Proxy serves content with CORS headers

The proxy is fully integrated into the backend; configuration comes from backend
`.env`.

## Testing

```bash
# Test proxy-style request
curl "http://localhost:3100/game-proxy/http://www.example.com/test.html"

# Test CORS preflight
curl -X OPTIONS "http://localhost:3100/game-proxy/http://www.example.com/test.html" -v

# Check response headers
curl -I "http://localhost:3100/game-proxy/http://www.example.com/test.html"
```

## Configuration

Game proxy configuration is part of the backend configuration. See
[configuration.md](./configuration.md) for details.

## Security

### Path Traversal Prevention

All file paths are normalized and validated to prevent directory traversal
attacks.

### CORS Security

CORS enabled by default because:

- Game content requires cross-domain access
- Service runs locally, not internet-facing
- No sensitive data served

For internet-facing deployments, configure specific origins:

```typescript
res.setHeader('Access-Control-Allow-Origin', 'https://trusted-domain.com');
```

### External CDN Security

- HTTPS enforced
- Timeouts prevent DoS

## Download Redirect Limiting

External CDN requests are limited to a maximum of 5 redirects to prevent SSRF
and infinite redirect loops:

```typescript
const response = await axiosInstance.get(fullUrl, {
  responseType: 'arraybuffer',
  timeout: EXTERNAL_REQUEST_TIMEOUT_MS,
  maxRedirects: EXTERNAL_REQUEST_MAX_REDIRECTS,  // 5 max
  // ... other options
});
```

**Feature**: When a redirect is followed, the response body is properly drained:

```typescript
response.resume();  // Properly drain response before following redirect
```

**Protection**: Prevents attackers from creating chains of redirects that waste
resources or bypass security controls.

## Troubleshooting

### Port Already in Use

```bash
netstat -ano | findstr :22500
PROXY_PORT=22510  # Change in .env
```

### File Not Found

1. Verify Flashpoint path
2. Check file exists in htdocs
3. Verify external fallback URLs accessible
4. Enable DEBUG logging

### CORS Errors

- Verify `ALLOW_CROSS_DOMAIN=true`
- Check response headers: `curl -I <url>`
- Ensure error responses include CORS headers

## Related Documentation

- [legacy-server.md](./legacy-server.md) - Legacy content serving
- [gamezip-server.md](./gamezip-server.md) - GameZip Server
