# Environment Variables

Configuration reference for all Flashpoint Web services.

## Backend Variables

Location: `backend/.env`

**Server:**

| Variable   | Default     | Description                                     |
| ---------- | ----------- | ----------------------------------------------- |
| `NODE_ENV` | development | Environment: development, production, test      |
| `PORT`     | 3100        | HTTP server port                                |
| `HOST`     | 0.0.0.0     | Bind address (use 127.0.0.1 for localhost only) |

**Paths (only set FLASHPOINT_PATH):**

| Variable          | Description                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `FLASHPOINT_PATH` | Root Flashpoint directory. All other paths auto-derived. Edition (Infinity/Ultimate) auto-detected from `version.txt`. |

**Game Service Host:**

| Variable            | Default   | Description                    |
| ------------------- | --------- | ------------------------------ |
| `GAME_SERVICE_HOST` | localhost | Hostname for game-service URLs |

**Authentication & Security:**

| Variable             | Default               | Description                                          |
| -------------------- | --------------------- | ---------------------------------------------------- |
| `JWT_SECRET`         | INSECURE-...          | Secret for JWT signing (CHANGE IN PRODUCTION!)       |
| `JWT_EXPIRES_IN`     | 1h                    | Access token expiration (15m, 1h, 7d, etc.)          |
| `BCRYPT_SALT_ROUNDS` | 10                    | Password hash cost (higher = more secure but slower) |
| `DOMAIN`             | http://localhost:5173 | CORS origin (use specific domain in production)      |

Generate secure JWT secret:

```bash
openssl rand -hex 64
```

**Rate Limiting:**

| Variable                  | Default | Description             |
| ------------------------- | ------- | ----------------------- |
| `RATE_LIMIT_WINDOW_MS`    | 60000   | Time window (ms)        |
| `RATE_LIMIT_MAX_REQUESTS` | 100     | Max requests per window |

**Logging:**

| Variable    | Default | Description                     |
| ----------- | ------- | ------------------------------- |
| `LOG_LEVEL` | info    | Level: error, warn, info, debug |
| `LOG_FILE`  | -       | Optional log file path          |

## Game Service Variables

Location: `game-service/.env`

**Ports:**

| Variable             | Default | Description            |
| -------------------- | ------- | ---------------------- |
| `PROXY_PORT`         | 22500   | HTTP proxy server port |
| `GAMEZIPSERVER_PORT` | 22501   | GameZip server port    |

**Paths:**

| Variable          | Description                                                     |
| ----------------- | --------------------------------------------------------------- |
| `FLASHPOINT_PATH` | Root Flashpoint directory (auto-derives htdocs and games paths) |

**Proxy:**

| Variable                 | Default   | Description                       |
| ------------------------ | --------- | --------------------------------- |
| `PROXY_CHUNK_SIZE`       | 8192      | File streaming chunk size (bytes) |
| `EXTERNAL_FALLBACK_URLS` | See below | Comma-separated CDN fallback URLs |

Default fallback URLs:

```
http://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs,http://infinity.unstable.life/Flashpoint/Legacy/htdocs/
```

## Frontend Variables

The frontend has no environment variables in development or production. API
calls are proxied through the backend.

- **Development**: Via Vite proxy to `http://localhost:3100`
- **Production**: Via Nginx or reverse proxy

## Docker Environment Variables

Location: `.env` in project root

**Core Configuration:**

| Variable               | Default       | Description                          |
| ---------------------- | ------------- | ------------------------------------ |
| `FLASHPOINT_HOST_PATH` | D:/Flashpoint | Host path to Flashpoint installation |
| `NODE_ENV`             | production    | Environment for all services         |
| `JWT_SECRET`           | -             | Secret for JWT signing (required)    |

**Port Mapping:**

| Variable       | Default | Description             |
| -------------- | ------- | ----------------------- |
| `WEB_PORT`     | 80      | Frontend exposed port   |
| `API_PORT`     | 3100    | Backend exposed port    |
| `PROXY_PORT`   | 22500   | Game proxy exposed port |
| `GAMEZIP_PORT` | 22501   | GameZip exposed port    |

**Other:**

| Variable    | Default          | Description   |
| ----------- | ---------------- | ------------- |
| `DOMAIN`    | http://localhost | CORS origin   |
| `LOG_LEVEL` | info             | Logging level |

## Docker Compose Setup

**Create .env file:**

```bash
cat > .env << EOF
FLASHPOINT_HOST_PATH=/path/to/flashpoint
NODE_ENV=production
JWT_SECRET=$(openssl rand -hex 64)
DOMAIN=https://flashpoint.example.com
WEB_PORT=80
API_PORT=3100
LOG_LEVEL=warn
EOF
```

**Start services:**

```bash
docker-compose --env-file .env up -d
```

## Environment Templates

**Development (.env.development):**

```bash
NODE_ENV=development
PORT=3100
HOST=0.0.0.0
FLASHPOINT_PATH=D:/Flashpoint
GAME_SERVICE_HOST=localhost
JWT_SECRET=development-secret-change-in-production
DOMAIN=http://localhost:5173
RATE_LIMIT_MAX_REQUESTS=1000
LOG_LEVEL=debug
```

**Production (.env.production):**

```bash
NODE_ENV=production
PORT=3100
HOST=127.0.0.1
FLASHPOINT_PATH=/data/flashpoint
GAME_SERVICE_HOST=game-service
JWT_SECRET=CHANGE-THIS-TO-A-RANDOM-64-CHARACTER-STRING
DOMAIN=https://flashpoint.example.com
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=warn
LOG_FILE=/var/log/flashpoint-backend.log
```

## Validation and Defaults

**Required Variables:**

**Backend:**

- `FLASHPOINT_PATH` (only this is required; others auto-derive)

**Docker Production:**

- `JWT_SECRET` (must be changed from default)
- `DOMAIN` (must match frontend URL)

**Verify configuration:**

```bash
cd backend
node -e "require('dotenv').config(); console.log(process.env.FLASHPOINT_PATH)"
```

## Security Best Practices

1. Never commit .env files to version control
2. Use strong JWT secrets (64+ characters) in production
3. Restrict CORS origins to your domain only (no wildcards)
4. Use HTTPS in production (update DOMAIN to https://)
5. Limit exposed ports (don't expose all services)
6. Rotate secrets periodically
7. Use environment-specific files (.env.production, .env.development)
8. Store secrets in secure management system (AWS Secrets Manager, HashiCorp
   Vault)
9. Use read-only mounts for Flashpoint data in Docker

## Next Steps

- [Docker Deployment](./docker-deployment.md)
- [Security Considerations](./security-considerations.md)
