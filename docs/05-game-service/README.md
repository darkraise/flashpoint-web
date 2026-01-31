# Game Service

The Game Service is an independent Node.js service that replaces the original Go-based Flashpoint Game Server. It provides game content delivery, HTTP proxying, and ZIP archive serving without extraction.

## Overview

The game-service runs two concurrent HTTP servers:

1. **HTTP Proxy Server** (Port 22500) - Legacy web content serving with fallback chain
2. **GameZip Server** (Port 22501) - ZIP archive mounting and streaming

This separation of concerns allows the backend to focus on game metadata while the game-service handles all file serving operations.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Game Service                          │
├──────────────────────┬──────────────────────────────────┤
│  HTTP Proxy Server   │      GameZip Server              │
│     Port 22500       │        Port 22501                │
├──────────────────────┼──────────────────────────────────┤
│ - Legacy htdocs      │ - ZIP mounting (no extraction)   │
│ - Game data files    │ - Streaming file access          │
│ - External CDN       │ - Multi-ZIP search               │
│ - Local cache        │ - node-stream-zip                │
│ - CORS headers       │ - CORS headers                   │
└──────────────────────┴──────────────────────────────────┘
```

## Key Features

### Content Serving
- **Multi-source fallback chain**: Local htdocs → Game data → ZIP archives → External CDN
- **Zero-extraction ZIP serving**: Files served directly from ZIP archives using streaming
- **MIME type detection**: 199+ file types including legacy formats (Flash, Director, Unity)
- **HTML polyfill injection**: Automatic compatibility fixes for Unity WebGL and other game engines

### Performance
- **Streaming**: Large files streamed in 64KB chunks
- **Keep-alive connections**: Connection pooling for improved performance
- **Local caching**: External files cached locally after first download
- **Concurrent downloads**: Up to 10 simultaneous external requests

### Compatibility
- **CORS enabled**: Cross-domain requests for game content
- **Proxy-style requests**: Supports `GET http://domain.com/path` format
- **Path-based requests**: Supports `/http://domain.com/path` format
- **Standard requests**: Regular path requests with Host header

## Technology Stack

- **Runtime**: Node.js 20+
- **Framework**: Express 4.18+
- **ZIP handling**: node-stream-zip 1.15+
- **HTTP client**: Axios 1.6+
- **Logging**: Winston 3.11+
- **Language**: TypeScript 5.3+

## Quick Start

### Installation

```bash
cd game-service
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```bash
FLASHPOINT_PATH=D:/Flashpoint
PROXY_PORT=22500
GAMEZIPSERVER_PORT=22501
```

See [configuration.md](./configuration.md) for all options.

### Development

```bash
npm run dev     # Start with hot reload
npm run build   # Build TypeScript
npm start       # Run production build
```

### Testing

```bash
# Test HTTP proxy
curl http://localhost:22500/test.html

# Test GameZip server
curl http://localhost:22501/mounts

# Mount a ZIP
curl -X POST http://localhost:22501/mount/game-123 \
  -H "Content-Type: application/json" \
  -d '{"zipPath": "D:/Flashpoint/Data/Games/game.zip"}'

# Access file from mounted ZIP
curl http://localhost:22501/http://domain.com/file.swf
```

## Documentation

- [architecture.md](./architecture.md) - Detailed architecture and design patterns
- [proxy-server.md](./proxy-server.md) - HTTP Proxy Server (port 22500)
- [gamezip-server.md](./gamezip-server.md) - GameZip Server (port 22501)
- [legacy-server.md](./legacy-server.md) - Legacy content serving and fallback chain
- [zip-manager.md](./zip-manager.md) - ZIP mounting and file access
- [mime-types.md](./mime-types.md) - MIME type handling for 199 file types
- [html-polyfills.md](./html-polyfills.md) - Unity and game compatibility polyfills
- [configuration.md](./configuration.md) - Environment variables and settings

## Integration with Backend

The game-service operates independently but integrates with the backend:

1. **Backend delegates file serving**: Backend returns launch URLs pointing to game-service
2. **No direct database access**: Game-service only serves files, no metadata queries
3. **Frontend requests**: Frontend player loads game content from game-service URLs
4. **Separate lifecycle**: Can be restarted independently without affecting backend

```
Frontend → Backend (metadata) → Database
   ↓
Game Service (files) → Flashpoint files / ZIPs
```

## Service Ports

| Port  | Service           | Purpose                          |
|-------|-------------------|----------------------------------|
| 22500 | HTTP Proxy        | Legacy web content and fallbacks |
| 22501 | GameZip Server    | ZIP archive file serving         |

## Environment Variables

| Variable                  | Default                        | Description                   |
|---------------------------|--------------------------------|-------------------------------|
| PROXY_PORT                | 22500                          | HTTP proxy server port        |
| GAMEZIPSERVER_PORT        | 22501                          | GameZip server port           |
| FLASHPOINT_PATH           | D:/Flashpoint                  | Flashpoint installation root  |
| FLASHPOINT_HTDOCS_PATH    | D:/Flashpoint/Legacy/htdocs    | Legacy web content directory  |
| FLASHPOINT_GAMES_PATH     | D:/Flashpoint/Data/Games       | ZIP archives directory        |
| EXTERNAL_FALLBACK_URLS    | infinity.flashpointarchive.org | Comma-separated CDN URLs      |
| PROXY_CHUNK_SIZE          | 8192                           | Streaming chunk size (bytes)  |
| LOG_LEVEL                 | info                           | Logging verbosity             |

## Request Flow

### HTTP Proxy (Port 22500)

```
1. Request: GET http://domain.com/path/file.swf
2. Try GameZip server (if ZIP mounted for this domain)
3. Try local htdocs: D:/Flashpoint/Legacy/htdocs/domain.com/path/file.swf
4. Try external CDN: https://infinity.flashpointarchive.org/.../domain.com/path/file.swf
5. Cache external file locally for future requests
6. Return file with appropriate MIME type and CORS headers
```

### GameZip Server (Port 22501)

```
1. Mount ZIP: POST /mount/game-123 {"zipPath": "..."}
2. Request: GET http://domain.com/path/file.swf
3. Search mounted ZIPs for: content/domain.com/path/file.swf
4. Stream file directly from ZIP (no extraction)
5. Return file with MIME type and CORS headers
```

## Common Issues

### Port Already in Use

```
Error: Port 22500 is already in use
```

**Solution**: Check for other instances or change ports in `.env`

```bash
# Find process using port
netstat -ano | findstr :22500  # Windows
lsof -i :22500                 # macOS/Linux

# Kill process or change port in .env
PROXY_PORT=22510
GAMEZIPSERVER_PORT=22511
```

### File Not Found

```
404: File not found in any source
```

**Solutions**:
1. Verify Flashpoint path is correct
2. Check if file exists in htdocs directory
3. Verify external fallback URLs are accessible
4. For ZIP files, ensure ZIP is mounted via GameZip API

### CORS Errors

```
Access to fetch at 'http://localhost:22500/...' has been blocked by CORS policy
```

**Solution**: CORS is enabled by default. Verify `ALLOW_CROSS_DOMAIN=true` in `.env`

### ZIP Mount Failures

```
500: ZIP file not found
```

**Solutions**:
1. Verify ZIP path is absolute and correct
2. Check file permissions
3. Ensure ZIP file is not corrupted
4. Check available disk space for ZIP index

## Performance Optimization

### Streaming Configuration

Adjust chunk size for optimal performance:

```bash
# Smaller chunks = lower memory, higher CPU
PROXY_CHUNK_SIZE=4096

# Larger chunks = higher memory, lower CPU
PROXY_CHUNK_SIZE=65536
```

### Connection Pooling

Configure server timeouts:

```javascript
server.timeout = 120000;        // 2 minutes
server.keepAliveTimeout = 65000; // 65 seconds
```

### External Download Limits

Configure concurrent downloads in `config.ts`:

```javascript
maxConcurrentDownloads: 10
```

## Security Considerations

1. **Path Traversal Prevention**: All file paths are normalized and validated
2. **CORS Restrictions**: Can be disabled for internal networks
3. **External CDN**: HTTPS enforced for all external sources
4. **ZIP Access**: Only mounted ZIPs are accessible, no arbitrary file access
5. **No Script Execution**: CGI disabled by default (configurable)

## Logging

Logs are written to console using Winston:

```
[HTTPProxyServer] GET http://domain.com/file.swf
[LegacyServer] Trying: D:/Flashpoint/Legacy/htdocs/domain.com/file.swf
[LegacyServer] ✓ Found file: local-htdocs
[ProxyHandler] ✓ Served from local-htdocs
```

Configure log level:

```bash
LOG_LEVEL=debug  # Verbose logging
LOG_LEVEL=info   # Standard logging (default)
LOG_LEVEL=warn   # Warnings and errors only
LOG_LEVEL=error  # Errors only
```

## Production Deployment

### Build

```bash
npm run build
```

### Start

```bash
NODE_ENV=production npm start
```

### Docker

See root `docker-compose.yml`:

```yaml
game-service:
  build: ./game-service
  ports:
    - "22500:22500"
    - "22501:22501"
  environment:
    - FLASHPOINT_PATH=/flashpoint
  volumes:
    - ${FLASHPOINT_HOST_PATH}:/flashpoint:ro
```

## Development

### Project Structure

```
game-service/
├── src/
│   ├── index.ts                 # Entry point
│   ├── config.ts                # Configuration manager
│   ├── http-proxy-server.ts     # HTTP proxy server setup
│   ├── gamezipserver.ts         # GameZip server implementation
│   ├── proxy-request-handler.ts # Proxy request routing
│   ├── legacy-server.ts         # Legacy content fallback chain
│   ├── zip-manager.ts           # ZIP mounting and access
│   ├── mimeTypes.ts             # MIME type mappings
│   └── utils/
│       ├── logger.ts            # Winston logger
│       └── htmlInjector.ts      # HTML polyfill injection
├── dist/                        # Compiled JavaScript
├── package.json
├── tsconfig.json
└── .env.example
```

### Adding New Features

1. **New MIME type**: Add to `src/mimeTypes.ts`
2. **New polyfill**: Add to `src/utils/htmlInjector.ts`
3. **New fallback source**: Add to `EXTERNAL_FALLBACK_URLS` in `.env`
4. **New server**: Follow pattern in `http-proxy-server.ts`

## References

- Original Go implementation: `D:\Repositories\Community\FlashpointGameServer`
- Flashpoint Launcher: `D:\Repositories\Community\launcher`
- node-stream-zip: https://github.com/antelle/node-stream-zip

## License

MIT
