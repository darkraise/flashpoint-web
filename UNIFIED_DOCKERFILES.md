# Production-Only Dockerfiles Summary

**Date:** 2026-01-31
**Status:** ✅ Completed

## Overview

All Dockerfiles have been simplified to production-only builds. Development mode has been removed from Dockerfiles - for development, run services locally with `npm run dev` instead.

---

## Changes Made

### 1. Simplified Dockerfiles

**Files Updated:**
- ✅ `backend/Dockerfile` - Production-only multi-stage build
- ✅ `frontend/Dockerfile` - Production-only multi-stage build with Nginx
- ✅ `game-service/Dockerfile` - Production-only multi-stage build

**Removed:**
- ❌ Development stages from all Dockerfiles
- ❌ `NODE_ENV` build argument
- ❌ Stage selection logic (`FROM ${NODE_ENV} AS final`)

### 2. Docker Compose Files Updated

**Updated References:**
- ✅ `docker-compose.yml` - Removed `NODE_ENV` build arguments
- ✅ `docker-compose.prod.yml` - Removed `NODE_ENV` build arguments
- ✅ Frontend still uses `VITE_API_URL` build argument for API configuration

---

## Architecture

### Multi-Stage Build Pattern

Each Dockerfile uses a two-stage build:

1. **Builder Stage** - Compiles TypeScript, installs all dependencies
2. **Production Stage** - Contains only runtime dependencies and compiled code

**Benefits:**
- Smaller final images (no build tools in production)
- Security: Non-root user (flashpoint:1001)
- Alpine Linux base images for minimal size
- Faster deployment with optimized images

### Backend Dockerfile

```dockerfile
# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/migrations ./src/migrations
# Create non-root user and set ownership
USER flashpoint
CMD ["node", "dist/server.js"]
```

### Frontend Dockerfile

```dockerfile
# Stage 1: Builder
FROM node:20-alpine AS builder
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm ci
RUN npm run build

# Stage 2: Production (Nginx)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Create non-root user and set permissions
USER flashpoint
CMD ["nginx", "-g", "daemon off;"]
```

### Game Service Dockerfile

```dockerfile
# Stage 1: Builder
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++  # For native modules
RUN npm ci
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
# Create non-root user
USER flashpoint
CMD ["node", "dist/index.js"]
```

---

## Usage

### Production Builds (Docker)

**Using Docker Compose (Recommended):**
```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d
```

**Manual builds:**
```bash
# Backend
docker build -t flashpoint-backend:latest backend/

# Frontend (with API URL)
docker build --build-arg VITE_API_URL=http://localhost:3100 -t flashpoint-frontend:latest frontend/

# Game Service
docker build -t flashpoint-game-service:latest game-service/
```

### Development (Local)

**For development, run locally without Docker:**

```bash
# Backend
cd backend
npm install
npm run dev  # Hot reload with tsx

# Frontend
cd frontend
npm install
npm run dev  # Vite dev server on port 5173

# Game Service
cd game-service
npm install
npm run dev  # Hot reload
```

**Why develop locally?**
- ✅ Faster iteration (no Docker build overhead)
- ✅ Native hot reload
- ✅ Easier debugging
- ✅ Direct file system access
- ✅ Better IDE integration

---

## Build Arguments

| Service | Build Args | Default | Purpose |
|---------|-----------|---------|---------|
| Backend | None | - | No configuration needed |
| Frontend | `VITE_API_URL` | `http://localhost:3100` | Backend API endpoint URL |
| Game Service | None | - | No configuration needed |

---

## Security Features

All production images include:

1. **Non-root user** (flashpoint:1001)
   - All services run as non-root for security
   - UID 1001 consistently across all services

2. **Alpine Linux base**
   - Minimal attack surface
   - Smaller images (~100MB vs 1GB+)
   - Regular security updates

3. **Production dependencies only**
   - No build tools in final images
   - Reduced attack surface
   - Smaller image size

4. **Multi-stage builds**
   - Builder artifacts not in production
   - Optimized layer caching
   - Faster deployments

---

## Comparison: Before vs After

### Before (Unified with NODE_ENV)

❌ **Dockerfile complexity:**
- 5 stages per Dockerfile (base, development, builder, production, final)
- Stage selection via `FROM ${NODE_ENV} AS final`
- Development mode in Dockerfiles

❌ **Build complexity:**
- `docker build --build-arg NODE_ENV=development` for dev
- `docker build --build-arg NODE_ENV=production` for prod
- Different build args for different modes

### After (Production-Only)

✅ **Dockerfile simplicity:**
- 2 stages per Dockerfile (builder, production)
- Always builds production-ready images
- No mode selection logic

✅ **Build simplicity:**
- `docker build` always produces production images
- No NODE_ENV arguments needed
- Single build command for consistency

✅ **Development workflow:**
- Run `npm run dev` locally (faster, simpler)
- Docker only for production deployments
- Clear separation of concerns

---

## Migration Notes

If you were using development mode in Docker:

**Old approach:**
```bash
docker-compose -f docker-compose.dev.yml up
```

**New approach:**
```bash
# Install dependencies locally once
cd backend && npm install
cd ../frontend && npm install
cd ../game-service && npm install

# Start all services with one command (from root)
npm run dev
```

The `npm run dev` command in the root package.json starts all services concurrently with hot reload.

---

## Benefits Summary

1. **Simpler Dockerfiles** - Less complexity, easier to maintain
2. **Faster development** - Local npm run dev is faster than Docker
3. **Production-focused** - Docker images are optimized for deployment
4. **Clear separation** - Development = local, Production = Docker
5. **Security** - All production images run as non-root
6. **Size** - Smaller images with only production dependencies

---

## Documentation

- **Dockerfile details**: See individual Dockerfiles in `backend/`, `frontend/`, `game-service/`
- **Deployment guide**: `docs/09-deployment/docker-deployment-guide.md`
- **Health checks**: `docs/09-deployment/health-checks.md`
- **Security**: `docs/13-security/docker-review.md`
