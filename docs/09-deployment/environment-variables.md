# Environment Variables

Configuration reference for all Flashpoint Web services.

## Backend Variables

Location: `backend/.env` (local development)

**Server:**

| Variable   | Default     | Description                                |
| ---------- | ----------- | ------------------------------------------ |
| `NODE_ENV` | development | Environment: development, production, test |

> **Note:** Port (3100) and bind address (0.0.0.0) are hardcoded in the backend.
> In Docker, use `API_PORT` to map a different host port to the container.

**Paths:**

| Variable               | Default                                     | Description                                                                                                            |
| ---------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `FLASHPOINT_PATH`      | `D:/Flashpoint` (dev), `/data/flashpoint` (prod) | Root Flashpoint directory. All other paths auto-derived. Edition (Infinity/Ultimate) auto-detected from `version.txt`. |
| `FLASHPOINT_GAMES_PATH`| `<FLASHPOINT_PATH>/Data/Games`              | Override game ZIP directory (rarely needed).                                                                           |

**Authentication & Security:**

| Variable             | Default               | Description                                          |
| -------------------- | --------------------- | ---------------------------------------------------- |
| `JWT_SECRET`         | auto-generated (dev)  | Secret for JWT signing (**required in production**)  |
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

| Variable    | Default                        | Description                                  |
| ----------- | ------------------------------ | -------------------------------------------- |
| `LOG_LEVEL` | info                           | Level: error, warn, info, debug              |
| `LOG_FILE`  | `/app/logs/backend.log` (prod) | Log file path (unset in dev = stdout only)   |

**Database Performance:**

| Variable              | Default     | Description                                                      |
| --------------------- | ----------- | ---------------------------------------------------------------- |
| `ENABLE_LOCAL_DB_COPY`| false       | Copy flashpoint.sqlite locally (for network storage SMB/NFS)    |
| `SQLITE_CACHE_SIZE`   | -64000      | SQLite page cache size (negative = KB, -64000 = 64MB)           |
| `SQLITE_MMAP_SIZE`    | 268435456   | Memory-mapped I/O size in bytes (256MB)                          |
| `ENABLE_CACHE_PREWARM`| true        | Pre-load common queries on startup                               |

**Game Content Serving:**

| Variable             | Default | Description                                      |
| -------------------- | ------- | ------------------------------------------------ |
| `ENABLE_CGI`         | false   | Enable PHP CGI execution for legacy game content |
| `HOME_RECENT_HOURS`  | 24      | Hours to look back for "recently added" games    |

**OpenTelemetry:**

| Variable                       | Default                    | Description                              |
| ------------------------------ | -------------------------- | ---------------------------------------- |
| `OTEL_ENABLED`                 | false                      | Enable distributed tracing and metrics   |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | http://localhost:4318      | OTLP collector endpoint                  |
| `OTEL_API_KEY`                 | -                          | API key for authentication               |
| `OTEL_SERVICE_NAME`            | flashpoint-web-backend     | Service name in traces/metrics           |
| `OTEL_TRACES_ENABLED`         | true                       | Enable trace export (when OTEL enabled)  |
| `OTEL_METRICS_ENABLED`        | true                       | Enable metrics export (when OTEL enabled)|
| `OTEL_METRICS_EXPORT_INTERVAL`| 60000                      | Metrics export interval (ms)             |
| `OTEL_LOG_LEVEL`              | info                       | OTEL SDK log level                       |

## Frontend Variables

The frontend has no environment variables in development or production. API
calls are proxied through the backend.

- **Development**: Via Vite proxy to `http://localhost:3100`
- **Production**: Via Nginx reverse proxy (configured by `BACKEND_HOST`/`BACKEND_PORT`)

## Docker Environment Variables

Location: `.env` in project root (used by docker-compose)

**Required:**

| Variable               | Description                                               |
| ---------------------- | --------------------------------------------------------- |
| `FLASHPOINT_HOST_PATH` | Host path to Flashpoint installation (bind-mounted as ro) |
| `JWT_SECRET`           | Secret for JWT signing (generate with `openssl rand -hex 64`) |

**Port Mapping:**

| Variable   | Default | Description           |
| ---------- | ------- | --------------------- |
| `WEB_PORT` | 80      | Frontend exposed port |
| `API_PORT` | 3100    | Backend exposed port  |

**Container Settings:**

| Variable    | Default | Description                                          |
| ----------- | ------- | ---------------------------------------------------- |
| `PUID`      | 1000    | Container user ID (match host user: `id -u`)         |
| `PGID`      | 1000    | Container group ID (match host user: `id -g`)        |
| `TZ`        | UTC     | Container timezone                                   |
| `IMAGE_TAG` | latest  | Docker image tag (production compose only)           |
| `DATA_PATH` | ./data  | Host path for persistent data (production compose)   |
| `LOGS_PATH` | ./logs  | Host path for log files                              |

**Frontend Nginx:**

| Variable       | Default  | Description                             |
| -------------- | -------- | --------------------------------------- |
| `BACKEND_HOST` | backend  | Backend hostname (Docker service name)  |
| `BACKEND_PORT` | 3100     | Backend port for Nginx proxy_pass       |

All backend variables listed above are also passable via docker-compose. See
`docker-compose.yml` for the full list with defaults.

## Docker Compose Setup

**Create .env file:**

```bash
cat > .env << EOF
FLASHPOINT_HOST_PATH=/path/to/flashpoint
JWT_SECRET=$(openssl rand -hex 64)
DOMAIN=https://flashpoint.example.com
WEB_PORT=80
API_PORT=3100
LOG_LEVEL=warn
EOF
```

**Start services:**

```bash
docker compose up -d
```

## Environment Templates

**Development (`backend/.env`):**

```bash
NODE_ENV=development
FLASHPOINT_PATH=D:/Flashpoint
JWT_SECRET=development-secret-change-in-production
DOMAIN=http://localhost:5173
RATE_LIMIT_MAX_REQUESTS=1000
LOG_LEVEL=debug
```

**Production (`.env` for Docker):**

```bash
FLASHPOINT_HOST_PATH=/data/flashpoint
JWT_SECRET=CHANGE-THIS-TO-A-RANDOM-64-CHARACTER-STRING
DOMAIN=https://flashpoint.example.com
WEB_PORT=80
API_PORT=3100
LOG_LEVEL=warn
```

## Validation and Defaults

**Required Variables:**

**Backend (local dev):**

- `FLASHPOINT_PATH` (only this is required; others auto-derive)

**Docker Production:**

- `FLASHPOINT_HOST_PATH` (must point to Flashpoint installation)
- `JWT_SECRET` (must be changed from default)

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
