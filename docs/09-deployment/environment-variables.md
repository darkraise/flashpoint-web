# Environment Variables

Complete reference for all environment variables used across all Flashpoint Web services.

## Table of Contents

- [Overview](#overview)
- [Backend Environment Variables](#backend-environment-variables)
- [Game Service Environment Variables](#game-service-environment-variables)
- [Frontend Environment Variables](#frontend-environment-variables)
- [Docker Environment Variables](#docker-environment-variables)
- [Environment Templates](#environment-templates)
- [Validation and Defaults](#validation-and-defaults)

## Overview

Flashpoint Web uses environment variables for configuration across three services:

- **Backend**: API server configuration, database paths, authentication
- **Game Service**: Proxy settings, ZIP server, game file serving
- **Frontend**: Build-time API URL configuration

Environment variables are loaded from `.env` files in each service directory or passed directly via Docker Compose.

## Backend Environment Variables

Location: `backend/.env`

### Server Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NODE_ENV` | string | `development` | Environment mode: `development`, `production`, `test` |
| `PORT` | number | `3100` | HTTP server port |
| `HOST` | string | `0.0.0.0` | Server bind address. Use `127.0.0.1` for localhost only |

**Examples:**

```bash
# Development (all interfaces)
NODE_ENV=development
PORT=3100
HOST=0.0.0.0

# Production (behind reverse proxy)
NODE_ENV=production
PORT=3100
HOST=127.0.0.1
```

### Flashpoint Paths

All paths must point to your Flashpoint installation directory.

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `FLASHPOINT_PATH` | string | Yes | Root directory of Flashpoint installation |
| `FLASHPOINT_DB_PATH` | string | Yes | Path to flashpoint.sqlite database |
| `FLASHPOINT_HTDOCS_PATH` | string | Yes | Path to Legacy/htdocs directory |
| `FLASHPOINT_IMAGES_PATH` | string | Yes | Path to Data/Images directory |
| `FLASHPOINT_LOGOS_PATH` | string | Yes | Path to Data/Logos directory |
| `FLASHPOINT_PLAYLISTS_PATH` | string | Yes | Path to Data/Playlists directory |
| `FLASHPOINT_GAMES_PATH` | string | Yes | Path to Data/Games directory |

**Example (Windows):**

```bash
FLASHPOINT_PATH=D:/Flashpoint
FLASHPOINT_DB_PATH=D:/Flashpoint/Data/flashpoint.sqlite
FLASHPOINT_HTDOCS_PATH=D:/Flashpoint/Legacy/htdocs
FLASHPOINT_IMAGES_PATH=D:/Flashpoint/Data/Images
FLASHPOINT_LOGOS_PATH=D:/Flashpoint/Data/Logos
FLASHPOINT_PLAYLISTS_PATH=D:/Flashpoint/Data/Playlists
FLASHPOINT_GAMES_PATH=D:/Flashpoint/Data/Games
```

**Example (Linux):**

```bash
FLASHPOINT_PATH=/data/flashpoint
FLASHPOINT_DB_PATH=/data/flashpoint/Data/flashpoint.sqlite
FLASHPOINT_HTDOCS_PATH=/data/flashpoint/Legacy/htdocs
FLASHPOINT_IMAGES_PATH=/data/flashpoint/Data/Images
FLASHPOINT_LOGOS_PATH=/data/flashpoint/Data/Logos
FLASHPOINT_PLAYLISTS_PATH=/data/flashpoint/Data/Playlists
FLASHPOINT_GAMES_PATH=/data/flashpoint/Data/Games
```

**Example (Docker):**

```bash
# Inside container (mounted from host)
FLASHPOINT_PATH=/data/flashpoint
FLASHPOINT_DB_PATH=/data/flashpoint/Data/flashpoint.sqlite
FLASHPOINT_HTDOCS_PATH=/data/flashpoint/Legacy/htdocs
FLASHPOINT_IMAGES_PATH=/data/flashpoint/Data/Images
FLASHPOINT_LOGOS_PATH=/data/flashpoint/Data/Logos
FLASHPOINT_PLAYLISTS_PATH=/data/flashpoint/Data/Playlists
FLASHPOINT_GAMES_PATH=/data/flashpoint/Data/Games
```

### Game Service URLs

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `GAME_SERVICE_PROXY_URL` | string | `http://localhost:22500` | URL to game-service HTTP proxy |
| `GAME_SERVICE_GAMEZIP_URL` | string | `http://localhost:22501` | URL to game-service GameZip server |
| `GAME_SERVER_URL` | string | - | Legacy alias for `GAME_SERVICE_PROXY_URL` |
| `GAME_SERVER_HTTP_PORT` | number | - | Legacy alias for GameZip port |

**Examples:**

```bash
# Local development
GAME_SERVICE_PROXY_URL=http://localhost:22500
GAME_SERVICE_GAMEZIP_URL=http://localhost:22501

# Docker (internal network)
GAME_SERVICE_PROXY_URL=http://game-service:22500
GAME_SERVICE_GAMEZIP_URL=http://game-service:22501

# Remote game service
GAME_SERVICE_PROXY_URL=http://192.168.1.100:22500
GAME_SERVICE_GAMEZIP_URL=http://192.168.1.100:22501
```

### Image CDN URLs

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `EXTERNAL_IMAGE_URLS` | string | See below | Comma-separated CDN URLs for image fallback |

**Default:**

```bash
EXTERNAL_IMAGE_URLS=https://infinity.flashpointarchive.org/Flashpoint/Data/Images,https://infinity.unstable.life/Flashpoint/Data/Images
```

**Usage:**

When images are not found locally, the backend will try fetching from these URLs in order.

### Authentication and Security

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `JWT_SECRET` | string | `change-in-production-use-long-random-string` | Secret key for JWT signing (min 32 chars) |
| `JWT_EXPIRATION` | string | `1h` | Access token expiration time |
| `JWT_REFRESH_EXPIRATION` | string | `7d` | Refresh token expiration time |

**CRITICAL: Change JWT_SECRET in production!**

Generate a secure secret:

```bash
# Linux/Mac
openssl rand -hex 64

# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})
```

**Example:**

```bash
JWT_SECRET=a1b2c3d4e5f6789012345678901234567890abcdefghijklmnopqrstuvwxyz0123
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d
```

### CORS Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `CORS_ORIGIN` | string | `http://localhost:5173` | Allowed CORS origin (frontend URL) |

**Examples:**

```bash
# Development
CORS_ORIGIN=http://localhost:5173

# Production (single domain)
CORS_ORIGIN=https://flashpoint.example.com

# Production (multiple domains - comma-separated)
CORS_ORIGIN=https://flashpoint.example.com,https://www.flashpoint.example.com

# Allow all origins (NOT RECOMMENDED)
CORS_ORIGIN=*
```

### Rate Limiting

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `RATE_LIMIT_WINDOW_MS` | number | `60000` | Time window in milliseconds (default: 1 minute) |
| `RATE_LIMIT_MAX_REQUESTS` | number | `100` | Maximum requests per window |

**Examples:**

```bash
# Strict (1 request per second)
RATE_LIMIT_WINDOW_MS=1000
RATE_LIMIT_MAX_REQUESTS=1

# Default (100 requests per minute)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Lenient (1000 requests per 5 minutes)
RATE_LIMIT_WINDOW_MS=300000
RATE_LIMIT_MAX_REQUESTS=1000

# Disable rate limiting
RATE_LIMIT_MAX_REQUESTS=0
```

### Redis Cache (Optional)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `REDIS_ENABLED` | boolean | `false` | Enable Redis caching |
| `REDIS_HOST` | string | `localhost` | Redis server hostname |
| `REDIS_PORT` | number | `6379` | Redis server port |
| `REDIS_PASSWORD` | string | - | Redis password (if required) |
| `REDIS_DB` | number | `0` | Redis database number |
| `REDIS_TTL` | number | `3600` | Default cache TTL in seconds |

**Examples:**

```bash
# Disabled (default)
REDIS_ENABLED=false

# Local Redis
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379

# Remote Redis with auth
REDIS_ENABLED=true
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=secretpassword
REDIS_DB=0
REDIS_TTL=3600
```

### Logging

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `LOG_LEVEL` | string | `info` | Logging level: `error`, `warn`, `info`, `debug` |
| `LOG_FILE` | string | - | Path to log file (optional) |
| `LOG_MAX_SIZE` | string | `10m` | Maximum log file size |
| `LOG_MAX_FILES` | number | `10` | Maximum number of log files to keep |

**Examples:**

```bash
# Development (verbose)
LOG_LEVEL=debug

# Production (minimal)
LOG_LEVEL=warn
LOG_FILE=/var/log/flashpoint-backend.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=30
```

### Database Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `USER_DB_PATH` | string | `./data/user.db` | Path to user database |
| `DB_POOL_SIZE` | number | `10` | Database connection pool size |
| `DB_BUSY_TIMEOUT` | number | `5000` | SQLite busy timeout in milliseconds |

**Examples:**

```bash
# Development
USER_DB_PATH=./data/user.db
DB_POOL_SIZE=5
DB_BUSY_TIMEOUT=5000

# Production
USER_DB_PATH=/opt/flashpoint-web/backend/data/user.db
DB_POOL_SIZE=20
DB_BUSY_TIMEOUT=10000
```

## Game Service Environment Variables

Location: `game-service/.env`

### Server Ports

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `PROXY_PORT` | number | `22500` | HTTP proxy server port |
| `GAMEZIPSERVER_PORT` | number | `22501` | GameZip server port |
| `NODE_ENV` | string | `development` | Environment mode |

**Examples:**

```bash
# Default ports
PROXY_PORT=22500
GAMEZIPSERVER_PORT=22501

# Custom ports
PROXY_PORT=8500
GAMEZIPSERVER_PORT=8501
```

### Flashpoint Paths

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `FLASHPOINT_PATH` | string | Yes | Root Flashpoint directory |
| `FLASHPOINT_HTDOCS_PATH` | string | Yes | Legacy htdocs directory |
| `FLASHPOINT_GAMES_PATH` | string | Yes | Games directory (ZIP files) |

**Examples:**

```bash
# Windows
FLASHPOINT_PATH=D:/Flashpoint
FLASHPOINT_HTDOCS_PATH=D:/Flashpoint/Legacy/htdocs
FLASHPOINT_GAMES_PATH=D:/Flashpoint/Data/Games

# Linux
FLASHPOINT_PATH=/data/flashpoint
FLASHPOINT_HTDOCS_PATH=/data/flashpoint/Legacy/htdocs
FLASHPOINT_GAMES_PATH=/data/flashpoint/Data/Games
```

### Proxy Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `PROXY_CHUNK_SIZE` | number | `8192` | Chunk size for streaming files (bytes) |
| `ALLOW_CROSS_DOMAIN` | boolean | `true` | Enable CORS headers |
| `EXTERNAL_FALLBACK_URLS` | string | See below | CDN URLs for external fallback |

**Default Fallback URLs:**

```bash
EXTERNAL_FALLBACK_URLS=http://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs,http://infinity.unstable.life/Flashpoint/Legacy/htdocs/
```

**Examples:**

```bash
# Default settings
PROXY_CHUNK_SIZE=8192
ALLOW_CROSS_DOMAIN=true

# Large files optimization
PROXY_CHUNK_SIZE=65536
ALLOW_CROSS_DOMAIN=true

# Single fallback URL
EXTERNAL_FALLBACK_URLS=http://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs
```

### Advanced Features

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ENABLE_CGI` | boolean | `false` | Enable CGI script execution |
| `ENABLE_HTACCESS` | boolean | `false` | Enable .htaccess processing |
| `CACHE_DIR` | string | - | Directory for cached files |
| `CACHE_MAX_SIZE` | string | `1G` | Maximum cache size |

**Examples:**

```bash
# Advanced features enabled
ENABLE_CGI=true
ENABLE_HTACCESS=true
CACHE_DIR=/var/cache/flashpoint-game-service
CACHE_MAX_SIZE=5G
```

### Logging

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `LOG_LEVEL` | string | `info` | Logging level |
| `LOG_REQUESTS` | boolean | `true` | Log HTTP requests |
| `LOG_ERRORS` | boolean | `true` | Log errors |

**Examples:**

```bash
# Verbose logging
LOG_LEVEL=debug
LOG_REQUESTS=true
LOG_ERRORS=true

# Minimal logging
LOG_LEVEL=warn
LOG_REQUESTS=false
LOG_ERRORS=true
```

## Frontend Environment Variables

Location: `frontend/.env` (build time only)

### Build Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `VITE_API_URL` | string | `http://localhost:3100` | Backend API URL |

**IMPORTANT:** Frontend environment variables are embedded at build time. Changes require rebuild.

**Examples:**

```bash
# Development
VITE_API_URL=http://localhost:3100

# Production (same domain)
VITE_API_URL=https://flashpoint.example.com

# Production (API subdomain)
VITE_API_URL=https://api.flashpoint.example.com

# Production (different port)
VITE_API_URL=https://flashpoint.example.com:8443
```

### Build with Custom API URL

```bash
# Option 1: Set in .env file
echo "VITE_API_URL=https://api.example.com" > frontend/.env
npm run build

# Option 2: Inline environment variable
VITE_API_URL=https://api.example.com npm run build

# Option 3: Docker build arg
docker build --build-arg VITE_API_URL=https://api.example.com -t frontend .
```

## Docker Environment Variables

Location: Docker Compose `.env` or `docker-compose.yml`

### Docker Compose Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `FLASHPOINT_HOST_PATH` | string | `D:/Flashpoint` | Host path to Flashpoint installation |
| `NODE_ENV` | string | `production` | Environment for all services |
| `WEB_PORT` | number | `80` | Frontend exposed port |
| `API_PORT` | number | `3100` | Backend exposed port |
| `PROXY_PORT` | number | `22500` | Game proxy exposed port |
| `GAMEZIP_PORT` | number | `22501` | GameZip exposed port |
| `LOG_LEVEL` | string | `info` | Logging level for all services |
| `CORS_ORIGIN` | string | `http://localhost` | CORS origin |

**Docker Compose .env file:**

```bash
# .env in project root
FLASHPOINT_HOST_PATH=D:/Flashpoint
NODE_ENV=production
WEB_PORT=80
API_PORT=3100
PROXY_PORT=22500
GAMEZIP_PORT=22501
LOG_LEVEL=info
CORS_ORIGIN=http://localhost
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### Using Docker Environment Files

**Option 1: .env file (recommended)**

```bash
# Create .env in project root
cat > .env << EOF
FLASHPOINT_HOST_PATH=/data/flashpoint
JWT_SECRET=$(openssl rand -hex 64)
CORS_ORIGIN=https://flashpoint.example.com
EOF

# Start with .env
docker-compose up -d
```

**Option 2: Custom env file**

```bash
# Create custom file
cat > production.env << EOF
FLASHPOINT_HOST_PATH=/data/flashpoint
NODE_ENV=production
EOF

# Use with docker-compose
docker-compose --env-file production.env up -d
```

**Option 3: Inline variables**

```bash
FLASHPOINT_HOST_PATH=/data/flashpoint \
JWT_SECRET=my-secret \
docker-compose up -d
```

## Environment Templates

### Development Template

Create `backend/.env.development`:

```bash
# Server
NODE_ENV=development
PORT=3100
HOST=0.0.0.0

# Flashpoint paths
FLASHPOINT_PATH=D:/Flashpoint
FLASHPOINT_DB_PATH=D:/Flashpoint/Data/flashpoint.sqlite
FLASHPOINT_HTDOCS_PATH=D:/Flashpoint/Legacy/htdocs
FLASHPOINT_IMAGES_PATH=D:/Flashpoint/Data/Images
FLASHPOINT_LOGOS_PATH=D:/Flashpoint/Data/Logos
FLASHPOINT_PLAYLISTS_PATH=D:/Flashpoint/Data/Playlists
FLASHPOINT_GAMES_PATH=D:/Flashpoint/Data/Games

# Game service
GAME_SERVICE_PROXY_URL=http://localhost:22500
GAME_SERVICE_GAMEZIP_URL=http://localhost:22501

# Security (weak for dev only)
JWT_SECRET=development-secret-change-in-production
CORS_ORIGIN=http://localhost:5173

# Rate limiting (lenient)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=1000

# Logging (verbose)
LOG_LEVEL=debug

# Redis (disabled)
REDIS_ENABLED=false
```

### Production Template

Create `backend/.env.production`:

```bash
# Server
NODE_ENV=production
PORT=3100
HOST=127.0.0.1

# Flashpoint paths
FLASHPOINT_PATH=/data/flashpoint
FLASHPOINT_DB_PATH=/data/flashpoint/Data/flashpoint.sqlite
FLASHPOINT_HTDOCS_PATH=/data/flashpoint/Legacy/htdocs
FLASHPOINT_IMAGES_PATH=/data/flashpoint/Data/Images
FLASHPOINT_LOGOS_PATH=/data/flashpoint/Data/Logos
FLASHPOINT_PLAYLISTS_PATH=/data/flashpoint/Data/Playlists
FLASHPOINT_GAMES_PATH=/data/flashpoint/Data/Games

# Game service
GAME_SERVICE_PROXY_URL=http://localhost:22500
GAME_SERVICE_GAMEZIP_URL=http://localhost:22501

# Security (CHANGE THESE!)
JWT_SECRET=CHANGE-THIS-TO-A-RANDOM-64-CHARACTER-STRING
CORS_ORIGIN=https://flashpoint.example.com

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=warn
LOG_FILE=/var/log/flashpoint-backend.log

# Redis (enabled)
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_TTL=3600

# Database
USER_DB_PATH=/opt/flashpoint-web/backend/data/user.db
DB_POOL_SIZE=20
```

### Docker Production Template

Create `.env` in project root:

```bash
# Host configuration
FLASHPOINT_HOST_PATH=/data/flashpoint

# Environment
NODE_ENV=production

# Ports
WEB_PORT=80
API_PORT=3100
PROXY_PORT=22500
GAMEZIP_PORT=22501

# Security
JWT_SECRET=CHANGE-THIS-TO-A-RANDOM-64-CHARACTER-STRING
CORS_ORIGIN=https://flashpoint.example.com

# Logging
LOG_LEVEL=warn

# External URLs
EXTERNAL_IMAGE_URLS=https://infinity.flashpointarchive.org/Flashpoint/Data/Images,https://infinity.unstable.life/Flashpoint/Data/Images
EXTERNAL_FALLBACK_URLS=http://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs,http://infinity.unstable.life/Flashpoint/Legacy/htdocs/

# API URL (for frontend build)
VITE_API_URL=https://flashpoint.example.com
```

## Validation and Defaults

### Environment Validation

The backend validates environment variables on startup:

```typescript
// backend/src/config.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().min(1).max(65535).default(3100),
  HOST: z.string().default('0.0.0.0'),
  FLASHPOINT_PATH: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  // ... more validations
});

export const config = envSchema.parse(process.env);
```

### Required Variables

These variables MUST be set or the application will fail to start:

**Backend:**
- `FLASHPOINT_PATH`
- `FLASHPOINT_DB_PATH`
- `FLASHPOINT_HTDOCS_PATH`
- `FLASHPOINT_IMAGES_PATH`
- `FLASHPOINT_LOGOS_PATH`
- `FLASHPOINT_PLAYLISTS_PATH`
- `FLASHPOINT_GAMES_PATH`

**Game Service:**
- `FLASHPOINT_PATH`
- `FLASHPOINT_HTDOCS_PATH`
- `FLASHPOINT_GAMES_PATH`

**Production (Backend):**
- `JWT_SECRET` (must be changed from default)
- `CORS_ORIGIN` (must match frontend URL)

### Checking Configuration

Test configuration without starting services:

```bash
# Backend
cd backend
node -e "require('dotenv').config(); console.log(process.env)"

# Validate Flashpoint paths exist
node -e "require('dotenv').config(); const fs=require('fs'); console.log(fs.existsSync(process.env.FLASHPOINT_DB_PATH) ? 'OK' : 'NOT FOUND')"
```

## Security Best Practices

1. **Never commit .env files** to version control
2. **Use strong JWT secrets** in production (64+ characters)
3. **Restrict CORS origins** to your domain only
4. **Use HTTPS** in production (update CORS_ORIGIN)
5. **Limit exposed ports** in Docker (don't expose all services)
6. **Rotate secrets** periodically
7. **Use environment-specific files** (.env.production, .env.development)
8. **Validate all inputs** before use
9. **Keep secrets in secure storage** (AWS Secrets Manager, HashiCorp Vault)
10. **Use read-only mounts** for Flashpoint data in Docker

## Next Steps

- [Docker Deployment](./docker-deployment.md) - Container configuration
- [Production Setup](./production-setup.md) - Production environment setup
- [Security Considerations](./security-considerations.md) - Security hardening guide
