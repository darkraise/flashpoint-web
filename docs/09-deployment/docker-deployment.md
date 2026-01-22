# Docker Deployment

This guide covers deploying Flashpoint Web using Docker Compose, including container configuration, volume management, and networking.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Container Architecture](#container-architecture)
- [Volume Configuration](#volume-configuration)
- [Network Configuration](#network-configuration)
- [Health Checks](#health-checks)
- [Docker Compose Configuration](#docker-compose-configuration)
- [Build Process](#build-process)
- [Running Containers](#running-containers)
- [Monitoring and Logs](#monitoring-and-logs)
- [Troubleshooting](#troubleshooting)

## Overview

Flashpoint Web uses a three-container architecture:

1. **flashpoint-backend**: REST API server (Node.js/Express)
2. **flashpoint-game-service**: Proxy and ZIP server (Node.js)
3. **flashpoint-frontend**: Web UI (Nginx serving static files)

All services communicate over an internal Docker bridge network and share access to the Flashpoint data directory via read-only volume mounts.

## Prerequisites

### Required Software

- Docker Engine 20.10 or later
- Docker Compose 2.0 or later
- 4GB+ RAM available for containers
- 10GB+ disk space for images

### Required Data

- Flashpoint Archive installation (full or partial)
- Minimum required directories:
  - `Data/flashpoint.sqlite` - Game metadata database
  - `Data/Games/` - Game ZIP archives
  - `Data/Images/` - Screenshots and thumbnails
  - `Data/Logos/` - Game logos
  - `Legacy/htdocs/` - Legacy web content

### System Requirements

**Minimum:**
- 2 CPU cores
- 4GB RAM
- 50GB storage (for Flashpoint data)

**Recommended:**
- 4+ CPU cores
- 8GB+ RAM
- SSD storage for better performance

## Quick Start

1. **Clone the repository:**

```bash
git clone <repository-url>
cd flashpoint-web
```

2. **Set Flashpoint path (required):**

```bash
# Linux/Mac
export FLASHPOINT_HOST_PATH=/path/to/flashpoint

# Windows (PowerShell)
$env:FLASHPOINT_HOST_PATH="D:\Flashpoint"

# Windows (CMD)
set FLASHPOINT_HOST_PATH=D:\Flashpoint
```

3. **Build and start all services:**

```bash
docker-compose up -d --build
```

4. **Access the application:**

- Frontend: http://localhost
- Backend API: http://localhost:3100
- Game Proxy: http://localhost:22500
- GameZip Server: http://localhost:22501

## Container Architecture

### Backend Container

**Image:** `flashpoint-backend:latest`

**Purpose:** Provides REST API for game metadata, user management, playlists, and authentication.

**Dockerfile Features:**
- Multi-stage build for production
- Node.js 20 Alpine base image
- Non-root user execution
- Health check endpoint

**Resource Limits (Recommended):**
```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1G
    reservations:
      memory: 512M
```

### Game Service Container

**Image:** `flashpoint-game-service:latest`

**Purpose:** Serves game files via HTTP proxy and ZIP mounting.

**Dockerfile Features:**
- Native module compilation (node-stream-zip)
- Dual-port exposure (22500, 22501)
- Health check on proxy port
- Production build optimization

**Resource Limits (Recommended):**
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 2G
    reservations:
      memory: 1G
```

### Frontend Container

**Image:** `flashpoint-frontend:latest`

**Purpose:** Serves pre-built React application via Nginx.

**Dockerfile Features:**
- Two-stage build (Node build + Nginx serve)
- Nginx optimized configuration
- Gzip compression enabled
- SPA routing support

**Resource Limits (Recommended):**
```yaml
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 256M
    reservations:
      memory: 128M
```

## Volume Configuration

### Flashpoint Data Volume

All three containers mount the Flashpoint installation directory as read-only:

```yaml
volumes:
  - ${FLASHPOINT_HOST_PATH}:/data/flashpoint:ro
```

**Important Notes:**

- **Read-only mount (`:ro`)**: Prevents containers from modifying Flashpoint data
- **Path must be absolute**: Relative paths will fail
- **Windows paths**: Use forward slashes or escape backslashes
  - Correct: `D:/Flashpoint`
  - Also correct: `D:\\Flashpoint`
  - Incorrect: `D:\Flashpoint` (may cause issues)

### User Database Persistence

The backend requires a persistent volume for the user database:

```yaml
volumes:
  - user-db:/app/data
```

**Create named volume:**

```bash
docker volume create flashpoint-user-db
```

**Update docker-compose.yml:**

```yaml
services:
  backend:
    volumes:
      - ${FLASHPOINT_HOST_PATH}:/data/flashpoint:ro
      - user-db:/app/data

volumes:
  user-db:
    name: flashpoint-user-db
```

### Cache Volumes (Optional)

For improved performance, add cache volumes:

```yaml
volumes:
  game-service-cache:/app/cache
  backend-cache:/app/cache
```

## Network Configuration

### Internal Bridge Network

Services communicate via a custom bridge network:

```yaml
networks:
  flashpoint-network:
    driver: bridge
```

**Service Discovery:**

- Services reference each other by container name
- Backend connects to `http://game-service:22500`
- Frontend proxies to `http://backend:3100`

**Network Isolation:**

- Containers only expose specified ports to host
- Internal communication uses service names
- External access controlled via port mapping

### Port Mappings

**Default Ports:**

| Service | Internal Port | Host Port | Description |
|---------|---------------|-----------|-------------|
| Frontend | 80 | 80 | Web UI |
| Backend | 3100 | 3100 | REST API |
| Game Service (Proxy) | 22500 | 22500 | HTTP Proxy |
| Game Service (ZIP) | 22501 | 22501 | GameZip Server |

**Custom Port Configuration:**

Use environment variables to change host ports:

```bash
export WEB_PORT=8080
export API_PORT=8001
export PROXY_PORT=8500
export GAMEZIP_PORT=8501

docker-compose up -d
```

## Health Checks

Each service includes health checks for container orchestration:

### Backend Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3100/health', (res) => { \
    process.exit(res.statusCode === 200 ? 0 : 1); \
  }).on('error', () => process.exit(1));"
```

**Endpoint:** `GET /health`
**Expected Response:** `200 OK`

### Game Service Health Check

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=30s \
  CMD node -e "require('http').get('http://localhost:22500/', (res) => { \
    process.exit(res.statusCode < 500 ? 0 : 1); \
  }).on('error', () => process.exit(1));"
```

**Endpoint:** `GET /`
**Expected Response:** Any non-5xx status

### Frontend Health Check

Nginx automatically serves 200 OK on root path.

### Check Health Status

```bash
# View health status
docker-compose ps

# Detailed health check logs
docker inspect --format='{{json .State.Health}}' flashpoint-backend | jq
```

## Docker Compose Configuration

### Complete Production Configuration

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    image: flashpoint-backend:latest
    container_name: flashpoint-backend
    restart: unless-stopped
    ports:
      - "${API_PORT:-3100}:3100"
    volumes:
      - ${FLASHPOINT_HOST_PATH}:/data/flashpoint:ro
      - user-db:/app/data
      - backend-logs:/app/logs
    environment:
      - NODE_ENV=production
      - PORT=3100
      - HOST=0.0.0.0
      - FLASHPOINT_PATH=/data/flashpoint
      - FLASHPOINT_DB_PATH=/data/flashpoint/Data/flashpoint.sqlite
      - FLASHPOINT_HTDOCS_PATH=/data/flashpoint/Legacy/htdocs
      - FLASHPOINT_IMAGES_PATH=/data/flashpoint/Data/Images
      - FLASHPOINT_LOGOS_PATH=/data/flashpoint/Data/Logos
      - FLASHPOINT_PLAYLISTS_PATH=/data/flashpoint/Data/Playlists
      - FLASHPOINT_GAMES_PATH=/data/flashpoint/Data/Games
      - GAME_SERVICE_PROXY_URL=http://game-service:22500
      - GAME_SERVICE_GAMEZIP_URL=http://game-service:22501
      - JWT_SECRET=${JWT_SECRET}
      - CORS_ORIGIN=${CORS_ORIGIN:-http://localhost}
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - RATE_LIMIT_WINDOW_MS=${RATE_LIMIT_WINDOW_MS:-60000}
      - RATE_LIMIT_MAX_REQUESTS=${RATE_LIMIT_MAX_REQUESTS:-100}
    depends_on:
      game-service:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3100/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - flashpoint-network
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          memory: 512M

  game-service:
    build:
      context: ./game-service
      dockerfile: Dockerfile
    image: flashpoint-game-service:latest
    container_name: flashpoint-game-service
    restart: unless-stopped
    ports:
      - "${PROXY_PORT:-22500}:22500"
      - "${GAMEZIP_PORT:-22501}:22501"
    volumes:
      - ${FLASHPOINT_HOST_PATH}:/data/flashpoint:ro
      - game-service-cache:/app/cache
      - game-service-logs:/app/logs
    environment:
      - NODE_ENV=production
      - PROXY_PORT=22500
      - GAMEZIPSERVER_PORT=22501
      - FLASHPOINT_PATH=/data/flashpoint
      - FLASHPOINT_HTDOCS_PATH=/data/flashpoint/Legacy/htdocs
      - FLASHPOINT_GAMES_PATH=/data/flashpoint/Data/Games
      - EXTERNAL_FALLBACK_URLS=${EXTERNAL_FALLBACK_URLS}
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - ALLOW_CROSS_DOMAIN=true
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:22500/', (res) => { process.exit(res.statusCode < 500 ? 0 : 1); }).on('error', () => process.exit(1));"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks:
      - flashpoint-network
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          memory: 1G

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
      args:
        - VITE_API_URL=${VITE_API_URL:-http://localhost:3100}
    image: flashpoint-frontend:latest
    container_name: flashpoint-frontend
    restart: unless-stopped
    ports:
      - "${WEB_PORT:-80}:80"
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - flashpoint-network
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          memory: 128M

networks:
  flashpoint-network:
    driver: bridge

volumes:
  user-db:
    name: flashpoint-user-db
  backend-logs:
    name: flashpoint-backend-logs
  game-service-cache:
    name: flashpoint-game-service-cache
  game-service-logs:
    name: flashpoint-game-service-logs
```

## Build Process

### Building All Services

```bash
# Build all services
docker-compose build

# Build with no cache
docker-compose build --no-cache

# Build specific service
docker-compose build backend

# Parallel build
docker-compose build --parallel
```

### Production Dockerfile (Backend)

Create `backend/Dockerfile.prod`:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create directories for data and logs
RUN mkdir -p data logs

# Create non-root user
RUN addgroup -g 1001 -S flashpoint && \
    adduser -S flashpoint -u 1001

# Change ownership
RUN chown -R flashpoint:flashpoint /app

# Switch to non-root user
USER flashpoint

# Expose port
EXPOSE 3100

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD node -e "require('http').get('http://localhost:3100/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Start server
CMD ["node", "dist/server.js"]
```

### Production Dockerfile (Frontend)

Create `frontend/Dockerfile.prod`:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build production bundle
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### Nginx Configuration

Create `frontend/nginx.conf`:

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Disable cache for HTML files
    location ~* \.html$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

## Running Containers

### Start All Services

```bash
# Start in background (detached mode)
docker-compose up -d

# Start with build
docker-compose up -d --build

# Start specific services
docker-compose up -d backend game-service

# Start with log output
docker-compose up
```

### Stop Services

```bash
# Stop all services
docker-compose stop

# Stop specific service
docker-compose stop backend

# Stop and remove containers
docker-compose down

# Stop, remove containers, and remove volumes
docker-compose down -v
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend

# Restart with rebuild
docker-compose up -d --build --force-recreate
```

## Monitoring and Logs

### View Logs

```bash
# All services
docker-compose logs

# Follow logs
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last N lines
docker-compose logs --tail=100 backend

# Logs with timestamps
docker-compose logs -t backend
```

### Container Stats

```bash
# Real-time stats
docker stats

# Specific container
docker stats flashpoint-backend

# No streaming (single output)
docker stats --no-stream
```

### Inspect Containers

```bash
# View container details
docker inspect flashpoint-backend

# View specific field
docker inspect --format='{{.State.Status}}' flashpoint-backend

# View environment variables
docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' flashpoint-backend
```

### Execute Commands in Containers

```bash
# Open shell
docker-compose exec backend sh

# Run command
docker-compose exec backend node -v

# Run as root
docker-compose exec --user root backend sh
```

## Troubleshooting

### Container Won't Start

**Check logs:**
```bash
docker-compose logs backend
```

**Common issues:**

1. **Port already in use:**
   ```bash
   # Find process using port
   lsof -i :3100  # Linux/Mac
   netstat -ano | findstr :3100  # Windows
   ```

2. **Volume mount failed:**
   - Verify `FLASHPOINT_HOST_PATH` is set
   - Check path exists and is accessible
   - On Windows, ensure Docker has access to drive

3. **Permission denied:**
   ```bash
   # Fix ownership
   sudo chown -R $(id -u):$(id -g) ./backend/data
   ```

### Health Check Failing

**Check health status:**
```bash
docker inspect --format='{{json .State.Health}}' flashpoint-backend | jq
```

**Test endpoint manually:**
```bash
# From host
curl http://localhost:3100/health

# From inside container
docker-compose exec backend curl http://localhost:3100/health
```

### Database Connection Issues

**Verify Flashpoint database exists:**
```bash
docker-compose exec backend ls -la /data/flashpoint/Data/flashpoint.sqlite
```

**Check database permissions:**
```bash
docker-compose exec backend sqlite3 /data/flashpoint/Data/flashpoint.sqlite "SELECT COUNT(*) FROM game;"
```

### Network Issues

**Inspect network:**
```bash
docker network inspect flashpoint-web_flashpoint-network
```

**Test connectivity:**
```bash
# Backend to game-service
docker-compose exec backend curl http://game-service:22500/

# Frontend to backend
docker-compose exec frontend curl http://backend:3100/health
```

### Performance Issues

**Increase resource limits:**
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 2G
```

**Check disk I/O:**
```bash
docker stats --format "table {{.Container}}\t{{.BlockIO}}"
```

**Use SSD for volumes:**
- Mount Flashpoint data from SSD
- Place user database on SSD

### Clean Up

**Remove stopped containers:**
```bash
docker-compose down
```

**Remove all images:**
```bash
docker-compose down --rmi all
```

**Remove volumes:**
```bash
docker-compose down -v
```

**Prune system:**
```bash
# Remove unused data
docker system prune

# Remove everything
docker system prune -a --volumes
```

## Best Practices

1. **Use named volumes** for persistent data
2. **Set resource limits** to prevent resource exhaustion
3. **Enable health checks** for automatic recovery
4. **Use read-only mounts** for Flashpoint data
5. **Run as non-root user** in production
6. **Keep images updated** with security patches
7. **Monitor logs** regularly
8. **Backup user database** before updates
9. **Use .env file** for environment configuration
10. **Tag images** with version numbers in production

## Next Steps

- [Production Setup](./production-setup.md) - Nginx reverse proxy, SSL, process management
- [Environment Variables](./environment-variables.md) - Complete environment reference
- [Security Considerations](./security-considerations.md) - Production security hardening
