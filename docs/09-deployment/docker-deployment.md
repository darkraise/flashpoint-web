# Docker Deployment

Deploy Flashpoint Web using Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB+ RAM, 50GB+ disk space
- Flashpoint installation with:
  - `Data/flashpoint.sqlite`
  - `Data/Games/`
  - `Data/Images/`
  - `Legacy/htdocs/`

## Quick Start

1. Set Flashpoint path:

```bash
# Linux/Mac
export FLASHPOINT_HOST_PATH=/path/to/flashpoint

# Windows PowerShell
$env:FLASHPOINT_HOST_PATH="D:\Flashpoint"
```

2. Start services:

```bash
docker-compose up -d --build
```

3. Access:

- Frontend: http://localhost
- Backend API: http://localhost:3100

## Container Architecture

| Service  | Image                      | Port | Purpose                           |
| -------- | -------------------------- | ---- | --------------------------------- |
| backend  | flashpoint-backend:latest  | 3100 | REST API (includes game service)  |
| frontend | flashpoint-frontend:latest | 80   | Web UI (Nginx)                    |

**Resource Recommendations:**

- Backend: 2 CPUs, 2GB RAM (includes game service)
- Frontend: 0.5 CPU, 256MB RAM

## Volume Configuration

**Flashpoint Data (read-only):**

```yaml
volumes:
  - ${FLASHPOINT_HOST_PATH}:/data/flashpoint:ro
```

**User Database (persistent):**

```yaml
volumes:
  - user-db:/app/data
```

## Network Configuration

**Port Mappings:**

| Service  | Internal | Host | Notes |
| -------- | -------- | ---- | ----- |
| Frontend | 8080     | 80   | Nginx |
| Backend  | 3100     | 3100 | API   |

**Custom ports** via environment variables:

```bash
export WEB_PORT=8080
export API_PORT=8001
export FLASHPOINT_HOST_PATH=/path/to/flashpoint
docker-compose up -d
```

## Health Checks

All services include health checks:

```yaml
healthcheck:
  test:
    [
      'CMD',
      'wget',
      '--quiet',
      '--tries=1',
      '--spider',
      'http://localhost:3100/api/health',
    ]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

Check status:

```bash
docker-compose ps
```

## Nginx Configuration

The frontend uses a template-based configuration with environment variable
substitution.

**Key files:**

- `frontend/.nginx/nginx.conf` - Global settings (worker processes, logging)
- `frontend/.nginx/default.conf.template` - Server block with `${BACKEND_HOST}`,
  `${BACKEND_PORT}` variables

**At runtime:**

1. Docker entrypoint runs `envsubst` to substitute variables
2. Processed config written to `/etc/nginx/conf.d/default.conf`
3. Nginx starts with final configuration

**Features:**

- SPA routing (serves index.html for non-static routes)
- Gzip compression
- Security headers (HSTS, CSP, X-Frame-Options)
- Static asset caching (1 year for versioned assets, no-cache for HTML)

## Running Containers

Start all services:

```bash
docker-compose up -d
```

Stop services:

```bash
docker-compose down
```

Restart with rebuild:

```bash
docker-compose up -d --build --force-recreate
```

## Monitoring and Logs

View logs:

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

Container stats:

```bash
docker stats
```

Execute command in container:

```bash
docker-compose exec backend node -v
docker-compose exec backend sh  # Open shell
```

## Troubleshooting

**Port already in use:**

```bash
# Linux/Mac
lsof -i :3100

# Windows
netstat -ano | findstr :3100
```

**Volume mount failed:**

- Verify `FLASHPOINT_HOST_PATH` is set
- Check path exists and is readable
- On Windows, ensure Docker has drive access

**Health check failing:**

```bash
# Check directly
curl http://localhost:3100/api/health

# From container
docker-compose exec backend curl http://localhost:3100/api/health

# View health details
docker inspect flashpoint-backend --format='{{json .State.Health}}' | jq
```

**Database connection issues:**

```bash
# Verify database exists
docker-compose exec backend ls -la /data/flashpoint/Data/flashpoint.sqlite

# Test connection
docker-compose exec backend sqlite3 /data/flashpoint/Data/flashpoint.sqlite "SELECT COUNT(*) FROM game;"
```

**Service communication:**

```bash
# Test backend health
docker-compose exec backend curl http://localhost:3100/api/health
```

## Best Practices

1. Use named volumes for persistent data
2. Set resource limits to prevent resource exhaustion
3. Enable health checks for automatic recovery
4. Use read-only mounts for Flashpoint data
5. Run as non-root user
6. Keep images updated with security patches
7. Monitor logs regularly
8. Backup user database before updates
9. Use .env file for configuration
10. Tag images with version numbers in production

## Next Steps

- [Environment Variables](./environment-variables.md)
- [Security Considerations](./security-considerations.md)
