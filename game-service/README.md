# Flashpoint Game Service

Independent service for serving Flashpoint game content and handling proxy requests. This service replaces the original Flashpoint Game Server (written in Go) with a Node.js implementation.

## Purpose

The Game Service provides:
- **HTTP Proxy Server** (port 22500): Serves legacy web content from htdocs and ZIP archives
- **GameZip Server** (port 22501): Serves files from mounted ZIP archives in Data/Games
- **External CDN Fallback**: Downloads missing files from Flashpoint CDN
- **File Caching**: Caches downloaded files locally for future use

This service is completely independent from the backend API and can be started/stopped separately.

## Architecture

```
┌─────────────────────────────────────────────────┐
│           Flashpoint Game Service               │
│                                                 │
│  ┌─────────────────┐  ┌───────────────────┐   │
│  │ HTTP Proxy      │  │ GameZip Server    │   │
│  │ Port: 22500     │  │ Port: 22501       │   │
│  │                 │  │                   │   │
│  │ - Legacy htdocs │  │ - ZIP archives    │   │
│  │ - CDN fallback  │  │ - Mount/unmount   │   │
│  │ - File caching  │  │ - File serving    │   │
│  └─────────────────┘  └───────────────────┘   │
└─────────────────────────────────────────────────┘
           │                      │
           └──────────────────────┘
                     │
              Backend proxies
              requests here
```

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and configure:

```env
# Server Ports
PROXY_PORT=22500
GAMEZIPSERVER_PORT=22501

# Flashpoint Installation Paths
FLASHPOINT_PATH=D:/Flashpoint
FLASHPOINT_HTDOCS_PATH=D:/Flashpoint/Legacy/htdocs
FLASHPOINT_GAMES_PATH=D:/Flashpoint/Data/Games

# External Fallback URLs
EXTERNAL_FALLBACK_URLS=http://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs,http://infinity.unstable.life/Flashpoint/Legacy/htdocs/

# Logging
LOG_LEVEL=info
NODE_ENV=development
```

## Development

Run the service in development mode with hot reload:

```bash
npm run dev
```

## Production

Build and run in production:

```bash
npm run build
npm start
```

## Integration with Backend

The backend API proxies game content requests to this service:

- **Backend** (port 3100): REST API for game metadata, downloads
- **game-service** (ports 22500, 22501): Proxy and ZIP file server

Backend routes like `/game-files/*` and `/proxy/*` forward requests to this service.

## File Resolution Order

When a file is requested, the proxy server tries:

1. **Local htdocs**: `D:/Flashpoint/Legacy/htdocs/`
2. **Game data**: `D:/Flashpoint/Data/Games/`
3. **ZIP archives**: Mounted ZIPs in `Data/Games/`
4. **External CDN**: Falls back to Flashpoint CDN servers
5. **Local cache**: Caches downloaded files for future use

## Features

### HTTP Proxy Server (Port 22500)

- Serves legacy web content (Flash, Shockwave, etc.)
- Handles URL-encoded paths
- Cross-domain CORS support
- Streaming for large files
- MIME type detection (199 types supported)

### GameZip Server (Port 22501)

- Mounts ZIP archives from `Data/Games/`
- Serves files directly from ZIPs without extraction
- Auto-discovery of all ZIPs on startup
- Supports multiple path variants (content/, htdocs/, etc.)

### External CDN Fallback

- Downloads missing files from Flashpoint CDN
- Caches downloaded files locally
- Handles redirects and retries
- Empty file detection (Archive.org quirk)

## Logging

The service uses Winston for logging. Log levels:
- `error`: Critical errors
- `warn`: Warnings and non-critical issues
- `info`: General information (default)
- `debug`: Detailed debugging information

Set log level via `LOG_LEVEL` environment variable.

## Port Configuration

Default ports:
- **22500**: HTTP Proxy Server (matches original Flashpoint Game Server)
- **22501**: GameZip Server (matches original ZipServer)

These ports are standard in Flashpoint and should not be changed unless necessary.

## Dependencies

- **express**: Web server framework
- **node-stream-zip**: ZIP archive reading
- **winston**: Logging
- **axios**: HTTP client for CDN downloads
- **cors**: CORS support

## Development Notes

- The service reads from Flashpoint installation but never modifies game files
- ZIP files are read-only mounted
- Downloaded files are cached to reduce CDN load
- Service can run independently without the backend
- Backend proxies requests to avoid CORS issues in the browser

## Testing

Test the proxy server:
```bash
curl http://localhost:22500/
```

Test the GameZip server:
```bash
curl http://localhost:22501/
```

## Troubleshooting

**Port already in use:**
- Check if another instance is running
- On Windows: `netstat -ano | findstr :22500`
- Kill the process or change the port in `.env`

**Files not found:**
- Verify `FLASHPOINT_PATH` is correct
- Check that `Legacy/htdocs` and `Data/Games` exist
- Review logs for file resolution attempts

**ZIP files not loading:**
- Ensure ZIPs are in `Data/Games/`
- Check logs for mount errors
- Verify ZIP files are valid

## License

MIT
