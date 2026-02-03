# HTTP Proxy Server (Port 22500)

The HTTP Proxy Server handles all HTTP requests for game content, implementing a
multi-level fallback chain to ensure content availability.

## Overview

Replicates the functionality of the original FlashpointGameServer, providing
legacy web content serving with intelligent fallback mechanisms.

## Server Configuration

```typescript
import { createHTTPProxyServer } from './http-proxy-server';

await createHTTPProxyServer({
  proxyPort: 22500,
  legacyHTDOCSPath: 'D:/Flashpoint/Legacy/htdocs',
  gameDataPath: 'D:/Flashpoint/Data/Games',
  externalFilePaths: [
    'https://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs',
  ],
  allowCrossDomain: true,
  chunkSize: 8192,
});
```

### Server Settings

```typescript
interface ProxyServerOptions {
  proxyPort?: number; // Default: 22500
  legacyHTDOCSPath: string; // Required
  gameDataPath?: string; // Optional
  externalFilePaths?: string[]; // Optional
  allowCrossDomain?: boolean; // Default: true
  chunkSize?: number; // Default: 8192 bytes
}
```

Server timeouts:

- `timeout: 120000` (2 minutes for slow downloads)
- `keepAliveTimeout: 65000` (65 seconds keep-alive)

## Request Handling

### URL Format Support

The proxy supports three URL formats:

**1. Proxy-Style Requests**

```http
GET http://www.example.com/path/file.swf HTTP/1.1
Host: localhost:22500
```

**2. Path-Based Requests**

```http
GET /http://www.example.com/path/file.swf HTTP/1.1
Host: localhost:22500
```

**3. Standard Requests**

```http
GET /path/file.swf HTTP/1.1
Host: www.example.com
```

### URL Parsing Logic

```typescript
async handleRequest(req: IncomingMessage, res: ServerResponse) {
  let hostname: string;
  let urlPath: string;

  if (req.url.startsWith('http://') || req.url.startsWith('https://')) {
    const targetUrl = new URL(req.url);
    hostname = targetUrl.hostname;
    urlPath = targetUrl.pathname + targetUrl.search;
  }
  else if (req.url.startsWith('/http://') || req.url.startsWith('/https://')) {
    const urlWithoutSlash = req.url.substring(1);
    const targetUrl = new URL(urlWithoutSlash);
    hostname = targetUrl.hostname;
    urlPath = targetUrl.pathname + targetUrl.search;
  }
  else {
    hostname = req.headers.host || 'localhost';
    urlPath = req.url;
  }
}
```

## Request Routing

**Routing Chain:**

1. Try GameZip Server (if available) - fast path
2. Try Legacy Server (local + external)
3. Send response or error

## CORS Handling

### Preflight Requests

```typescript
handleOptionsRequest(req, res) {
  if (settings.allowCrossDomain) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
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
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: *
```

**Why CORS required:** Flash games and web content make cross-domain requests
for assets and API calls.

## HTML Polyfill Injection

HTML files are automatically processed to inject compatibility polyfills:

```typescript
private sendResponse(res: ServerResponse, data: Buffer, contentType: string) {
  let fileData = data;

  if (contentType.includes('text/html')) {
    fileData = injectPolyfills(data);
    logger.info('Injected polyfills into HTML file');
  }

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', fileData.length);
  res.end(fileData);
}
```

**Polyfills Injected:**

- Unity WebGL support
- General browser compatibility shims

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

Before trying the legacy fallback chain, check if file exists in mounted ZIP:

```typescript
private async tryGameZipServer(hostname: string, urlPath: string) {
  try {
    const gameZipServerUrl = `http://localhost:${settings.gameZipPort}`;
    const targetUrl = `http://${hostname}${urlPath}`;
    const requestUrl = `${gameZipServerUrl}/${targetUrl}`;

    const response = await axios.get(requestUrl, {
      responseType: 'arraybuffer',
      timeout: 5000,
      validateStatus: (status) => status === 200,
    });

    return {
      data: Buffer.from(response.data),
      contentType: response.headers['content-type'] || 'application/octet-stream'
    };
  } catch (error) {
    return null;
  }
}
```

**Performance:**

- Local request: <5ms
- External request: 100-500ms
- Speedup: 20-100x faster for ZIP-served content

## Performance Optimization

### Keep-Alive Connections

```typescript
server.keepAliveTimeout = 65000;
res.setHeader('Connection', 'keep-alive');
```

Reuses TCP connections, reduces handshake overhead.

## Logging

```
[ProxyHandler] GET http://www.example.com/game.swf
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
   `{"launchUrl": "http://localhost:22500/http://www.example.com/game.swf"}`
3. Frontend loads game in player iframe
4. Proxy serves content with CORS headers

The proxy operates independently; backend only provides URLs.

## Testing

```bash
# Test proxy-style request
curl "http://localhost:22500/http://www.example.com/test.html"

# Test standard request
curl -H "Host: www.example.com" "http://localhost:22500/test.html"

# Test CORS preflight
curl -X OPTIONS "http://localhost:22500/test.html" -v

# Check response headers
curl -I "http://localhost:22500/http://www.example.com/test.html"
```

## Configuration Examples

### Basic

```typescript
await createHTTPProxyServer({
  proxyPort: 22500,
  legacyHTDOCSPath: 'D:/Flashpoint/Legacy/htdocs',
  allowCrossDomain: true,
});
```

### Production

```typescript
await createHTTPProxyServer({
  proxyPort: parseInt(process.env.PROXY_PORT || '22500'),
  legacyHTDOCSPath: config.htdocsPath,
  gameDataPath: config.gamesPath,
  externalFilePaths: (process.env.EXTERNAL_FALLBACK_URLS || '').split(','),
  allowCrossDomain: process.env.ALLOW_CROSS_DOMAIN !== 'false',
  chunkSize: parseInt(process.env.PROXY_CHUNK_SIZE || '8192'),
});
```

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
