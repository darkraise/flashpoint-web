# Game Content Module

The Game Content Module is integrated into the backend and provides game
content delivery with intelligent fallback mechanisms for legacy web content
and ZIP archive serving.

## Overview

The game content module is now part of the backend Express application. Instead
of running separate HTTP servers on ports 22500/22501, it provides:

1. **Express Route** `/game-proxy/*` - Legacy web content serving with fallback
   chain
2. **GameZip Server** - ZIP mounting and serving via direct API calls (no HTTP)

Both integrate into the backend's main port (3100).

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│              Backend (Port 3100)                         │
├──────────────────────┬──────────────────────────────────┤
│  Game Proxy Router   │      GameZip Server              │
│   /game-proxy/*      │   (Singleton, Direct-Call API)  │
├──────────────────────┼──────────────────────────────────┤
│ - Legacy htdocs      │ - ZIP mounting (no extraction)   │
│ - Game data files    │ - Streaming file access          │
│ - External CDN       │ - Multi-ZIP search               │
│ - Local cache        │ - CORS headers                   │
└──────────────────────┴──────────────────────────────────┘
```

## Key Features

- **Multi-source fallback**: Local htdocs → Game data → ZIP archives → External
  CDN
- **Zero-extraction ZIP serving**: Files streamed directly from archives
- **MIME type detection**: 199+ file types including legacy formats
- **HTML polyfill injection**: Automatic compatibility fixes
- **CORS enabled**: Cross-domain requests for game content
- **Streaming**: Large files chunked (64KB default)

## Quick Start

The game content module is automatically part of the backend. No separate
setup needed:

```bash
# Backend starts all services including game content module
cd backend
npm install
npm run dev      # Starts on port 3100
```

Game content is served at:

- Proxy routes: `http://localhost:3100/game-proxy/*`
- Zip mounting API: Handled internally by backend

## Configuration

Game content module configuration is in `backend/.env`:

```bash
FLASHPOINT_PATH=D:/Flashpoint
LOG_LEVEL=info
```

See [configuration.md](./configuration.md) for complete options.

## Testing

```bash
# Test proxy via backend
curl http://localhost:3100/game-proxy/http://www.example.com/test.html

# GameZip server is not exposed on HTTP - it's used internally by the proxy
```

## Request Endpoints

The game content module is accessed through the backend:

| Route               | Purpose                          |
| ------------------- | -------------------------------- |
| `/game-proxy/*`     | Legacy web content and fallbacks |
| `/game-zip/*`       | ZIP archive file serving         |

Both run on the backend's main port (3100).

## Request Flow

### Game Proxy Router (/game-proxy/*)

1. Try GameZip server (if ZIP mounted)
2. Try local htdocs
3. Try external CDN fallback
4. Return 404 if not found

### GameZip Server (Direct API)

1. Backend calls GameZip methods: `mountZip()`, `unmountZip()`, etc.
2. Request via proxy router: `/game-proxy/http://domain.com/path/file.swf`
3. GameZip searches mounted ZIPs for content
4. Stream file directly (no extraction)

## Documentation

- [architecture.md](./architecture.md) - Architecture and design patterns
- [proxy-server.md](./proxy-server.md) - Proxy Router (`/game-proxy/*`)
- [gamezip-server.md](./gamezip-server.md) - GameZip Server (Direct API)
- [legacy-server.md](./legacy-server.md) - Legacy content serving
- [configuration.md](./configuration.md) - Configuration reference

## Integration with Backend

The game content module is fully integrated into the backend:

- Backend loads game content configuration on startup
- Backend mounts ZIPs via direct API calls
- Frontend requests game URLs from backend
- Proxy router serves content on `/game-proxy/*` endpoints

## Security

- Path traversal prevention through validated path normalization
- CORS configurable (enabled by default for local networks)
- HTTPS enforced for external CDN requests
- Only mounted ZIPs accessible; no arbitrary file access

## Troubleshooting

### File Not Found

1. Verify Flashpoint path is correct in backend `.env`
2. Check if file exists in htdocs directory
3. Verify external fallback URLs are accessible
4. Ensure ZIP is mounted via GameZip API
5. Check backend logs for game content module errors

### CORS Errors

- Verify `ALLOW_CROSS_DOMAIN=true` in backend `.env`
- Check response headers: `curl -I <url>`
- Ensure error responses include CORS headers

## Deployment

The game content module deploys as part of the backend:

```bash
# Development
cd backend && npm run dev

# Production
cd backend && npm run build && NODE_ENV=production npm start
```

Game content is served from the backend on port 3100.

For Docker deployment, see the main backend documentation in
`docs/09-deployment/`.
