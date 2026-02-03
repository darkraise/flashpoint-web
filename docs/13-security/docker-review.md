# Docker Configuration Review

**Review Date:** 2026-01-30
**Reviewer:** Claude Code (Sonnet 4.5)

## Executive Summary

The Docker configuration for Flashpoint Web provides two deployment approaches:
1. **Multi-service compose** (recommended): Separate containers for backend, frontend, and game-service
2. **Monolithic image**: Single container with all services (appears unmaintained)

**Overall Assessment:** 🟡 Good foundation with several areas for improvement

### Critical Issues Found
- ❌ Backend/Frontend Dockerfiles run in development mode (not production-ready)
- ❌ Nginx config has a circular proxy issue (port 22500 → localhost:22500)
- ⚠️ Security: Services run as root (except game-service)
- ⚠️ Missing multi-stage builds for backend/frontend
- ⚠️ Hardcoded Windows path as default

---

## 1. docker-compose.yml Review

### ✅ Strengths

1. **Well-structured service separation**
   - Clear separation of concerns (backend, game-service, frontend)
   - Proper dependency ordering (`frontend → backend → game-service`)

2. **Good health checks**
   ```yaml
   healthcheck:
     test: ["CMD", "node", "-e", "..."]
     interval: 30s
     timeout: 10s
     retries: 3
     start_period: 40s
   ```

3. **Read-only volume mounts**
   ```yaml
   volumes:
     - ${FLASHPOINT_HOST_PATH}:/data/flashpoint:ro
   ```
   Prevents containers from modifying Flashpoint data

4. **Comprehensive documentation**
   - Excellent inline comments explaining usage
   - Clear environment variable documentation

5. **Configurable via environment variables**
   - All ports externally configurable
   - Sensible defaults provided

### ⚠️ Issues & Recommendations

#### Issue 1: Incorrect DOMAIN Default
**Current:**
```yaml
DOMAIN=${DOMAIN:-http://localhost}
```

**Problem:** Frontend runs on port 80, but CORS points to `http://localhost` (no port = port 80), while the backend runs on 3100.

**Fix:**
```yaml
DOMAIN=${DOMAIN:-http://localhost:${WEB_PORT:-80}}
```

#### Issue 2: Frontend Environment Variable Timing
**Current:**
```yaml
environment:
  - VITE_API_URL=http://localhost:${API_PORT:-3100}
```

**Problem:** Vite env vars are injected at **build time**, not runtime. Setting them in docker-compose has no effect.

**Fix:** Frontend needs runtime config via `window.env` or build-time injection:
```yaml
frontend:
  build:
    context: ./frontend
    args:
      - VITE_API_URL=http://localhost:${API_PORT:-3100}
```

#### Issue 3: No Resource Limits
**Current:** No CPU/memory limits defined

**Recommendation:** Add resource constraints:
```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 512M
      reservations:
        cpus: '0.25'
        memory: 256M
```

#### Issue 4: No Logging Configuration
**Recommendation:** Add centralized logging:
```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

#### Issue 5: Hardcoded Windows Path Default
**Current:**
```yaml
volumes:
  - ${FLASHPOINT_HOST_PATH:-D:/Flashpoint}:/data/flashpoint:ro
```

**Problem:** Fails on Linux/macOS

**Fix:**
```yaml
volumes:
  - ${FLASHPOINT_HOST_PATH:?FLASHPOINT_HOST_PATH must be set}:/data/flashpoint:ro
```

---

## 2. Service Dockerfiles Review

### Backend Dockerfile ❌ Critical Issues

**Current (`backend/Dockerfile`):**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]  # ❌ DEVELOPMENT MODE!
```

**Problems:**
1. ❌ Runs `npm run dev` (tsx watch mode) - NOT production-ready
2. ❌ Includes dev dependencies and source files in final image
3. ❌ No build step
4. ❌ Runs as root user
5. ❌ No multi-stage build (bloated image)
6. ❌ Port mismatch: Dockerfile exposes 3001, but docker-compose uses 3100

**Recommended Fix:**
```dockerfile
# Multi-stage production build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build && \
    npm prune --production

# Production image
FROM node:20-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S flashpoint && \
    adduser -S flashpoint -u 1001

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Change ownership
RUN chown -R flashpoint:flashpoint /app

# Switch to non-root user
USER flashpoint

# Expose correct port
EXPOSE 3100

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3100/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1));"

# Production command
CMD ["node", "dist/server.js"]
```

---

### Frontend Dockerfile ❌ Critical Issues

**Current (`frontend/Dockerfile`):**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]  # ❌ DEV MODE!
```

**Problems:**
1. ❌ Runs Vite dev server - NOT production-ready
2. ❌ No build step
3. ❌ Includes entire node_modules and source
4. ❌ Serves on port 5173, but docker-compose expects port 80
5. ❌ No Nginx for static file serving

**Recommended Fix (Multi-stage with Nginx):**
```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .

# Build args for runtime config
ARG VITE_API_URL=http://localhost:3100
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Production stage with Nginx
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create non-root user
RUN addgroup -g 1001 -S flashpoint && \
    adduser -S flashpoint -u 1001 && \
    chown -R flashpoint:flashpoint /usr/share/nginx/html /var/cache/nginx /var/run

# Switch to non-root user
USER flashpoint

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

**Required nginx.conf for frontend:**
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

---

### Game Service Dockerfile ✅ Excellent

**Current (`game-service/Dockerfile`):**
```dockerfile
FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build && npm prune --production && rm -rf src tsconfig.json
RUN addgroup -g 1001 -S flashpoint && adduser -S flashpoint -u 1001
RUN chown -R flashpoint:flashpoint /app
USER flashpoint
EXPOSE 22500 22501
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=30s \
  CMD node -e "require('http').get('http://localhost:22500/', (res) => { process.exit(res.statusCode < 500 ? 0 : 1); }).on('error', () => process.exit(1));"
CMD ["node", "dist/index.js"]
```

**Strengths:**
- ✅ Multi-stage build process (build + cleanup)
- ✅ Non-root user (flashpoint:1001)
- ✅ Production dependencies only
- ✅ Health check included
- ✅ Proper cleanup of source files
- ✅ Native module support (python3, make, g++)

**Minor Improvement:**
Could use true multi-stage build to avoid build tools in final image:
```dockerfile
# Build stage
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
RUN addgroup -g 1001 -S flashpoint && adduser -S flashpoint -u 1001
RUN chown -R flashpoint:flashpoint /app
USER flashpoint
EXPOSE 22500 22501
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=30s \
  CMD node -e "require('http').get('http://localhost:22500/', (res) => { process.exit(res.statusCode < 500 ? 0 : 1); }).on('error', () => process.exit(1));"
CMD ["node", "dist/index.js"]
```

---

## 3. Monolithic Dockerfile Review

**File:** `./Dockerfile` (root level)

**Status:** ⚠️ Appears unmaintained, conflicts with docker-compose approach

**Issues:**
1. References missing files:
   - `docker/nginx.conf` (exists, but different from what compose needs)
   - `docker/start.sh` (exists)
2. Bundles backend + frontend but **missing game-service**
3. Port 3001 vs 3100 inconsistency
4. Not referenced in docker-compose

**Recommendation:**
- Either update to match current architecture (include game-service)
- OR remove and focus on docker-compose approach
- OR document as "single-container deployment" alternative

---

## 4. Nginx Configuration Review

**File:** `docker/nginx.conf`

### ⚠️ Critical Issue: Circular Proxy

**Lines 80-97:**
```nginx
server {
    listen 22500;
    server_name localhost;

    location / {
        proxy_pass http://localhost:22500;  # ❌ Proxies to itself!
```

**Problem:** This creates an infinite loop. Nginx listens on 22500 and proxies to localhost:22500 (itself).

**Fix:** This section should either:
1. Be removed (game-service is accessed directly on port 22500)
2. Proxy to the game-service container: `proxy_pass http://game-service:22500;`

**Recommended removal:**
```nginx
# Remove this entire server block - game-service is accessed directly
```

### ✅ Strengths

1. **Good gzip configuration**
   ```nginx
   gzip on;
   gzip_vary on;
   gzip_comp_level 6;
   ```

2. **Proper static asset caching**
   ```nginx
   location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
   }
   ```

3. **SPA routing support**
   ```nginx
   try_files $uri $uri/ /index.html;
   ```

### ⚠️ Security Improvements Needed

**Add security headers:**
```nginx
server {
    listen 80;
    server_name localhost;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # CSP header (adjust based on your needs)
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
```

---

## 5. .dockerignore Review

**File:** `.dockerignore`

### ✅ Strengths
- Excludes node_modules, dist, build artifacts
- Excludes development files (.env, .vscode)
- Excludes tests and documentation

### ⚠️ Missing Entries

**Add:**
```dockerignore
# Docker files (don't need in containers)
**/Dockerfile*
**/docker-compose*.yml
**/.dockerignore

# Database files (user.db should be in volume, not image)
**/user.db
**/user.db-journal
**/user.db-wal

# Git
**/.git
**/.github

# CI/CD
**/.gitlab-ci.yml
**/.travis.yml
**/Jenkinsfile
```

---

## 6. Security Review

### Critical Security Issues

1. **Running as root** ❌
   - Backend: Runs as root
   - Frontend: Runs as root
   - Game-service: ✅ Runs as non-root (flashpoint:1001)

2. **No network segmentation** ⚠️
   - All services on same bridge network
   - Consider separating frontend from backend/game-service

3. **Missing security headers** ⚠️
   - No CSP, X-Frame-Options, etc.

4. **Unlimited resource usage** ⚠️
   - No memory/CPU limits
   - Risk of resource exhaustion

### Security Recommendations

```yaml
# docker-compose.yml additions
services:
  backend:
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE  # Only if binding to port < 1024
    read_only: true
    tmpfs:
      - /tmp
```

---

## 7. Production Readiness Checklist

### ❌ Not Production-Ready (Current State)

| Component | Status | Issue |
|-----------|--------|-------|
| Backend Dockerfile | ❌ | Runs in dev mode |
| Frontend Dockerfile | ❌ | Runs Vite dev server |
| Game Service | ✅ | Production-ready |
| docker-compose | ⚠️ | Needs fixes |
| Nginx config | ⚠️ | Circular proxy issue |
| Security | ❌ | Root users, no limits |

### ✅ Production-Ready (After Fixes)

Required changes:
1. Rebuild backend/frontend Dockerfiles with multi-stage builds
2. Fix nginx circular proxy
3. Add non-root users to all services
4. Add resource limits
5. Fix DOMAIN environment variable
6. Add security headers
7. Implement proper logging configuration

---

## 8. Image Size Optimization

### Current Estimated Sizes
- Backend: ~400MB (includes all source + node_modules)
- Frontend: ~400MB (includes Vite dev server)
- Game Service: ~200MB (optimized)

### After Multi-Stage Builds
- Backend: ~150MB (built dist + production deps only)
- Frontend: ~50MB (static files + nginx)
- Game Service: ~150MB (already optimized)

**Total savings: ~650MB → ~350MB (46% reduction)**

---

## 9. Recommendations Summary

### Immediate Priority (Breaking Issues)

1. **Fix Backend Dockerfile** - Switch to production build
2. **Fix Frontend Dockerfile** - Use Nginx instead of Vite dev server
3. **Fix Nginx circular proxy** - Remove or fix port 22500 server block
4. **Fix DOMAIN** - Use correct frontend URL

### High Priority (Security)

5. **Add non-root users** to backend and frontend
6. **Add resource limits** to all services
7. **Add security headers** to Nginx config
8. **Add logging configuration**

### Medium Priority (Optimization)

9. **True multi-stage builds** for all services
10. **Fix hardcoded Windows path** - require env var
11. **Add health checks** to all services
12. **Update .dockerignore** with additional exclusions

### Low Priority (Nice to Have)

13. **Network segmentation** - separate frontend from backend
14. **Decide on monolithic Dockerfile** - update or remove
15. **Add docker-compose.prod.yml** variant
16. **Consider docker secrets** for JWT_SECRET

---

## 10. Example Production-Ready docker-compose.yml

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
      - ${FLASHPOINT_HOST_PATH:?FLASHPOINT_HOST_PATH must be set}:/data/flashpoint:ro
      - backend-db:/app/data  # For user.db
    environment:
      - NODE_ENV=production
      - PORT=3100
      - HOST=0.0.0.0
      - FLASHPOINT_PATH=/data/flashpoint
      # Note: FLASHPOINT_DB_PATH, FLASHPOINT_HTDOCS_PATH, IMAGES_PATH, LOGOS_PATH, PLAYLISTS_PATH, GAMES_PATH
      # are all derived automatically from FLASHPOINT_PATH
      - GAME_SERVICE_HOST=game-service
      # Note: Proxy and GameZip URLs are derived automatically from GAME_SERVICE_HOST
      - DOMAIN=http://localhost:${WEB_PORT:-80}
      - LOG_LEVEL=${LOG_LEVEL:-info}
    depends_on:
      game-service:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3100/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - backend-network
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

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
      - ${FLASHPOINT_HOST_PATH:?FLASHPOINT_HOST_PATH must be set}:/data/flashpoint:ro
    environment:
      - NODE_ENV=production
      - PROXY_PORT=22500
      - GAMEZIPSERVER_PORT=22501
      - FLASHPOINT_PATH=/data/flashpoint
      - FLASHPOINT_HTDOCS_PATH=/data/flashpoint/Legacy/htdocs
      - FLASHPOINT_GAMES_PATH=/data/flashpoint/Data/Games
      - EXTERNAL_FALLBACK_URLS=${EXTERNAL_FALLBACK_URLS:-http://infinity.flashpointarchive.org/Flashpoint/Legacy/htdocs}
      - LOG_LEVEL=${LOG_LEVEL:-info}
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:22500/', (res) => { process.exit(res.statusCode < 500 ? 0 : 1); }).on('error', () => process.exit(1));"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks:
      - backend-network
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.1'
          memory: 128M
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
      args:
        - VITE_API_URL=http://localhost:${API_PORT:-3100}
    image: flashpoint-frontend:latest
    container_name: flashpoint-frontend
    restart: unless-stopped
    ports:
      - "${WEB_PORT:-80}:80"
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - frontend-network
      - backend-network
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    deploy:
      resources:
        limits:
          cpus: '0.25'
          memory: 128M
        reservations:
          cpus: '0.1'
          memory: 64M
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  frontend-network:
    driver: bridge
  backend-network:
    driver: bridge

volumes:
  backend-db:
    driver: local
```

---

## Conclusion

The Docker configuration has a solid foundation but requires significant updates to be production-ready. The game-service Dockerfile is excellent and should serve as a template for the other services.

**Priority Actions:**
1. Rebuild backend/frontend Dockerfiles with production builds
2. Fix nginx circular proxy issue
3. Add security hardening (non-root users, resource limits)
4. Update environment variable handling

After implementing these fixes, the Docker deployment will be production-ready and follow industry best practices.
