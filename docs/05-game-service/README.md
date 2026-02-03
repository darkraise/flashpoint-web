# Game Service

The Game Service is an independent Node.js service that provides game content
delivery with intelligent fallback mechanisms for legacy web content and ZIP
archive serving.

## Overview

The game-service runs two HTTP servers:

1. **HTTP Proxy Server** (Port 22500) - Legacy web content serving with fallback
   chain
2. **GameZip Server** (Port 22501) - ZIP archive streaming

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

### Installation & Configuration

```bash
cd game-service
npm install
cp .env.example .env
# Edit .env with your Flashpoint path
FLASHPOINT_PATH=D:/Flashpoint
PROXY_PORT=22500
GAMEZIPSERVER_PORT=22501
```

### Development

```bash
npm run dev     # Start with hot reload
npm run build   # Build TypeScript
npm start       # Run production build
```

## Testing

```bash
# Test HTTP proxy
curl http://localhost:22500/http://www.example.com/test.html

# Test GameZip server
curl http://localhost:22501/mounts

# Mount a ZIP
curl -X POST http://localhost:22501/mount/game-123 \
  -H "Content-Type: application/json" \
  -d '{"zipPath": "D:/Flashpoint/Data/Games/game.zip"}'
```

## Service Ports

| Port  | Service        | Purpose                          |
| ----- | -------------- | -------------------------------- |
| 22500 | HTTP Proxy     | Legacy web content and fallbacks |
| 22501 | GameZip Server | ZIP archive file serving         |

## Environment Variables

| Variable               | Default                    | Description                |
| ---------------------- | -------------------------- | -------------------------- |
| PROXY_PORT             | 22500                      | HTTP proxy server port     |
| GAMEZIPSERVER_PORT     | 22501                      | GameZip server port        |
| FLASHPOINT_PATH        | D:/Flashpoint              | Flashpoint installation    |
| EXTERNAL_FALLBACK_URLS | infinity.flashpointarchive | CDN URLs (comma-separated) |
| LOG_LEVEL              | info                       | Logging verbosity          |

## Request Flow

### HTTP Proxy (Port 22500)

1. Try GameZip server (if ZIP mounted)
2. Try local htdocs
3. Try external CDN fallback
4. Return 404 if not found

### GameZip Server (Port 22501)

1. Mount ZIP via POST /mount/game-id
2. Request file: GET /http://domain.com/path/file.swf
3. Search mounted ZIPs for content
4. Stream file directly (no extraction)

## Documentation

- [architecture.md](./architecture.md) - Architecture and design patterns
- [proxy-server.md](./proxy-server.md) - HTTP Proxy Server (port 22500)
- [gamezip-server.md](./gamezip-server.md) - GameZip Server (port 22501)
- [legacy-server.md](./legacy-server.md) - Legacy content serving
- [configuration.md](./configuration.md) - Configuration reference

## Integration with Backend

The backend delegates file serving to game-service:

- Backend returns launch URLs pointing to proxy server
- Frontend loads game content from game-service URLs
- Game-service operates independently without backend communication

## Security

- Path traversal prevention through validated path normalization
- CORS configurable (enabled by default for local networks)
- HTTPS enforced for external CDN requests
- Only mounted ZIPs accessible; no arbitrary file access

## Troubleshooting

### Port Already in Use

```bash
# Find process using port (Windows)
netstat -ano | findstr :22500

# Kill process or change port in .env
PROXY_PORT=22510
```

### File Not Found

1. Verify Flashpoint path is correct
2. Check if file exists in htdocs directory
3. Verify external fallback URLs are accessible
4. Ensure ZIP is mounted via GameZip API

### CORS Errors

- Verify `ALLOW_CROSS_DOMAIN=true` in `.env`
- Check response headers: `curl -I <url>`
- Ensure error responses include CORS headers

## Docker

```bash
# Build
docker-compose build game-service

# Run
docker-compose up -d game-service

# Logs
docker-compose logs -f game-service
```

Set `FLASHPOINT_HOST_PATH` environment variable to point to your Flashpoint
installation.

## Production Deployment

```bash
npm run build
NODE_ENV=production npm start
```

Monitor logs and set up process manager (PM2, systemd).
