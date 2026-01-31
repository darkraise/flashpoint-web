# Docker Deployment Guide

Complete guide for deploying Flashpoint Web using Docker with production-ready configurations.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Configuration](#configuration)
4. [Deployment Options](#deployment-options)
5. [Security Considerations](#security-considerations)
6. [Troubleshooting](#troubleshooting)
7. [Maintenance](#maintenance)

---

## Prerequisites

### Required Software

- **Docker Engine** 20.10+
- **Docker Compose** 2.0+
- **Flashpoint Archive** installation (any version)

### System Requirements

- **CPU**: 2+ cores recommended
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 50GB+ for Flashpoint data
- **Network**: Internet access for CDN fallback (optional)

### Verify Installation

```bash
docker --version
# Docker version 20.10.0 or higher

docker-compose --version
# Docker Compose version 2.0.0 or higher
```

---

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-org/flashpoint-web.git
cd flashpoint-web
```

### 2. Configure Environment

```bash
# Copy example environment file
cp .env.docker.example .env

# Edit with your settings
nano .env
```

**Minimum required configuration:**

```bash
# REQUIRED: Path to Flashpoint installation
FLASHPOINT_HOST_PATH=/path/to/flashpoint

# REQUIRED: JWT secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-here
```

### 3. Build and Start

```bash
# Build all services
docker-compose build

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f
```

### 4. Access Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3100
- **Health Check**: http://localhost:3100/api/health

### 5. Create Admin User

```bash
# Access backend container
docker-compose exec backend sh

# Inside container, use backend CLI to create user
# (Replace with your actual user creation command)
node dist/scripts/create-admin.js --username admin --password secure-password

# Exit container
exit
```

---

## Configuration

### Environment Variables

All configuration is done via `.env` file. See [.env.docker.example](.env.docker.example) for all options.

#### Core Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FLASHPOINT_HOST_PATH` | ✅ Yes | - | Absolute path to Flashpoint installation |
| `JWT_SECRET` | ✅ Yes | - | Secret key for JWT tokens |
| `NODE_ENV` | No | `production` | Environment mode |
| `LOG_LEVEL` | No | `info` | Logging verbosity (error/warn/info/debug) |

#### Port Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WEB_PORT` | No | `80` | Frontend web interface port |
| `API_PORT` | No | `3100` | Backend API port |
| `PROXY_PORT` | No | `22500` | Game proxy server port |
| `GAMEZIP_PORT` | No | `22501` | GameZip server port |

#### External CDN Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EXTERNAL_FALLBACK_URLS` | No | infinity.flashpointarchive.org | Comma-separated fallback URLs |
| `EXTERNAL_IMAGE_URLS` | No | infinity.flashpointarchive.org | Comma-separated image CDN URLs |

### Volume Mounts

The deployment creates two types of volumes:

1. **Flashpoint Data** (read-only)
   - Source: `$FLASHPOINT_HOST_PATH`
   - Target: `/data/flashpoint`
   - Purpose: Access to game database and content

2. **User Database** (persistent)
   - Name: `backend-db`
   - Target: `/app/data`
   - Purpose: Store user accounts, playlists, favorites

---

## Deployment Options

### Standard Deployment (docker-compose.yml)

Uses production-ready Dockerfiles with basic configuration.

```bash
docker-compose up -d
```

**Features:**
- Production builds (multi-stage)
- Non-root users
- Health checks
- Single network (all services)

### Production Deployment (docker-compose.prod.yml)

Enhanced security with additional hardening.

```bash
docker-compose -f docker-compose.prod.yml up -d
```

**Additional Features:**
- Resource limits (CPU/memory)
- Security options (no-new-privileges, dropped capabilities)
- Network segmentation (frontend/backend isolation)
- Logging configuration (10MB rotation)

**Resource Allocation:**

| Service | CPU Limit | Memory Limit | CPU Reserve | Memory Reserve |
|---------|-----------|--------------|-------------|----------------|
| Backend | 1.0 | 512MB | 0.25 | 256MB |
| Frontend | 0.25 | 128MB | 0.1 | 64MB |
| Game Service | 0.5 | 256MB | 0.1 | 128MB |

### Custom Deployment

Override specific services:

```bash
# Custom docker-compose.override.yml
version: '3.8'
services:
  backend:
    environment:
      - LOG_LEVEL=debug
    ports:
      - "8080:3100"
```

```bash
# Will merge with docker-compose.yml
docker-compose up -d
```

---

## Dockerfile Architecture

### Production-Only Multi-Stage Dockerfiles

Each service uses a production-optimized Dockerfile with multi-stage builds for minimal image size and maximum security.

**Key Features:**
- **Production-only builds** (no development mode in Dockerfiles)
- **Multi-stage builds** for optimization
- **Builder stage** compiles TypeScript and installs all dependencies
- **Final stage** contains only runtime dependencies and compiled code
- **Non-root user** (flashpoint:1001) for security
- **Alpine Linux** base images for minimal size

### Build Arguments

| Service | Build Args | Default |
|---------|-----------|---------|
| Backend | None | - |
| Frontend | `VITE_API_URL` | `http://localhost:3100` |
| Game Service | None | - |

**Note:** For development, use `npm run dev` locally outside of Docker for faster iteration.

### Manual Builds

**Production builds:**
```bash
# Backend
docker build -t flashpoint-backend:latest backend/

# Frontend (with API URL)
docker build --build-arg VITE_API_URL=http://localhost:3100 -t flashpoint-frontend:latest frontend/

# Game Service
docker build -t flashpoint-game-service:latest game-service/
```

### Development Workflow

For development, run services locally without Docker:

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev

# Game Service
cd game-service
npm install
npm run dev
```

**Benefits of local development:**
- Faster build times (no Docker overhead)
- Hot reload works seamlessly
- Easier debugging and logging
- Native file system access

### Docker Compose (Recommended)

Docker Compose automatically handles builds:

```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
```

**No need to manually build** - `docker-compose up` handles everything.

---

## Security Considerations

### Production Checklist

- [ ] **Change JWT_SECRET** - Use cryptographically secure random string
- [ ] **Use HTTPS** - Deploy behind reverse proxy (Nginx/Traefik) with SSL
- [ ] **Firewall rules** - Only expose necessary ports
- [ ] **Regular updates** - Keep Docker images and base OS updated
- [ ] **Backup user database** - Regular backups of `backend-db` volume
- [ ] **Monitor logs** - Set up log aggregation and alerting
- [ ] **Resource limits** - Use production compose with resource constraints

### Reverse Proxy (Recommended)

Deploy behind Nginx or Traefik for SSL termination:

**Example Nginx config:**

```nginx
server {
    listen 443 ssl http2;
    server_name flashpoint.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### User Permissions

All containers run as non-root user (UID 1001, GID 1001):

```bash
# Verify user in containers
docker-compose exec backend id
# uid=1001(flashpoint) gid=1001(flashpoint)
```

### Secrets Management

**Don't commit secrets to Git!**

```bash
# Add .env to .gitignore
echo ".env" >> .gitignore

# Use Docker secrets for sensitive data (Swarm mode)
echo "your-jwt-secret" | docker secret create jwt_secret -
```

---

## Troubleshooting

### Common Issues

#### 1. "FLASHPOINT_HOST_PATH must be set"

**Problem:** Environment variable not configured

**Solution:**
```bash
export FLASHPOINT_HOST_PATH=/path/to/flashpoint
# OR add to .env file
echo "FLASHPOINT_HOST_PATH=/path/to/flashpoint" >> .env
```

#### 2. "Database not found"

**Problem:** Flashpoint path incorrect or database missing

**Solution:**
```bash
# Verify path contains database
ls -la $FLASHPOINT_HOST_PATH/Data/flashpoint.sqlite

# Check mount inside container
docker-compose exec backend ls -la /data/flashpoint/Data/
```

#### 3. "Permission denied"

**Problem:** Docker can't read Flashpoint directory

**Solution:**
```bash
# Fix permissions (Linux/macOS)
chmod -R 755 /path/to/flashpoint

# Windows: Ensure Docker Desktop has access to drive
```

#### 4. "Port already in use"

**Problem:** Another service using the same port

**Solution:**
```bash
# Check what's using port 80
netstat -tulpn | grep :80

# Change port in .env
echo "WEB_PORT=8080" >> .env

# Restart with new port
docker-compose up -d
```

#### 5. "Container keeps restarting"

**Problem:** Health check failing or startup error

**Solution:**
```bash
# View container logs
docker-compose logs backend

# Check health status
docker-compose ps

# Inspect specific container
docker inspect flashpoint-backend
```

### Debug Mode

Enable verbose logging:

```bash
# In .env
LOG_LEVEL=debug
NODE_ENV=development

# Restart services
docker-compose restart
```

### Access Container Shell

```bash
# Backend
docker-compose exec backend sh

# Frontend (Nginx)
docker-compose exec frontend sh

# Game Service
docker-compose exec game-service sh
```

---

## Maintenance

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend

# Since timestamp
docker-compose logs --since="2024-01-01T00:00:00" backend
```

### Updating Application

```bash
# Pull latest changes
git pull origin main

# Rebuild images
docker-compose build

# Restart with new images
docker-compose up -d

# Clean old images
docker image prune
```

### Backup User Database

```bash
# Create backup
docker run --rm \
  -v flashpoint-web_backend-db:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/user-db-$(date +%Y%m%d).tar.gz -C /data .

# Restore backup
docker run --rm \
  -v flashpoint-web_backend-db:/data \
  -v $(pwd)/backups:/backup \
  alpine sh -c "cd /data && tar xzf /backup/user-db-20240101.tar.gz"
```

### Resource Monitoring

```bash
# Container stats (live)
docker stats

# Disk usage
docker system df

# Volume usage
docker volume ls
du -sh $(docker volume inspect flashpoint-web_backend-db --format '{{ .Mountpoint }}')
```

### Cleanup

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: deletes user database!)
docker-compose down -v

# Remove unused images
docker image prune -a

# Full cleanup (WARNING: removes everything not in use)
docker system prune -a --volumes
```

---

## Advanced Configuration

### Custom Build Args

Modify Dockerfiles with build arguments:

```yaml
# docker-compose.override.yml
services:
  frontend:
    build:
      args:
        - VITE_API_URL=https://api.example.com
```

### Multi-Host Deployment

Deploy services on different hosts:

```yaml
# docker-compose.prod.yml
services:
  backend:
    deploy:
      placement:
        constraints:
          - node.labels.type==backend

  frontend:
    deploy:
      placement:
        constraints:
          - node.labels.type==frontend
```

### Scaling Services

```bash
# Scale game-service (if needed for load balancing)
docker-compose up -d --scale game-service=3

# Note: Backend can't be scaled without shared session store (Redis)
```

---

## Production Deployment Example

Complete production setup with reverse proxy:

```bash
# 1. Set environment variables
export FLASHPOINT_HOST_PATH=/mnt/flashpoint
export JWT_SECRET=$(openssl rand -base64 32)
export WEB_PORT=8080  # Behind reverse proxy

# 2. Create .env file
cat > .env <<EOF
FLASHPOINT_HOST_PATH=$FLASHPOINT_HOST_PATH
JWT_SECRET=$JWT_SECRET
NODE_ENV=production
LOG_LEVEL=warn
WEB_PORT=$WEB_PORT
EOF

# 3. Deploy with production config
docker-compose -f docker-compose.prod.yml up -d

# 4. Configure reverse proxy (Nginx)
sudo nano /etc/nginx/sites-available/flashpoint

# 5. Enable site
sudo ln -s /etc/nginx/sites-available/flashpoint /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 6. Set up SSL (Let's Encrypt)
sudo certbot --nginx -d flashpoint.example.com

# 7. Configure firewall
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Support

For issues and questions:

- **Documentation**: See `/docs` directory
- **GitHub Issues**: https://github.com/your-org/flashpoint-web/issues
- **Health Check**: http://localhost:3100/api/health

---

## Changelog

### 2026-01-30 - Production Ready Release

- ✅ Multi-stage production Dockerfiles
- ✅ Non-root users in all containers
- ✅ Security hardening (capabilities, privileges)
- ✅ Resource limits and logging
- ✅ Fixed nginx circular proxy issue
- ✅ Fixed CORS configuration
- ✅ Added persistent volume for user database
- ✅ Network segmentation option
- ✅ Comprehensive documentation

### Previous Versions

- Development-only Dockerfiles (not production-ready)
