# Production Dockerfile for Flashpoint Web (single image: API + UI)
#
# The backend serves both the REST API / game content and the built React UI,
# so this image runs a single Node process. Build from the repo root:
#   docker build -t flashpoint-web .

# =============================================================================
# Stage 1: Frontend builder - Build the React app
# =============================================================================
FROM node:20.18.2-alpine AS frontend-builder

WORKDIR /app

# Copy workspace root and frontend package files
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/

# Install frontend dependencies (frozen lockfile for reproducible builds)
RUN npm ci --workspace=frontend --include-workspace-root --prefer-offline --no-audit

# Copy frontend source and build static assets
COPY frontend ./frontend/
WORKDIR /app/frontend
RUN npm run build

# =============================================================================
# Stage 2: Backend builder - Compile TypeScript
# =============================================================================
FROM node:20.18.2-alpine AS backend-builder

WORKDIR /app

# Copy workspace root and backend package files
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/

# Install backend dependencies (frozen lockfile for reproducible builds)
RUN npm ci --workspace=backend --include-workspace-root --prefer-offline --no-audit

# Copy backend source and build
COPY backend ./backend/
WORKDIR /app/backend
RUN npm run build

# =============================================================================
# Stage 3: Production - Optimized runtime
# =============================================================================
FROM node:20.18.2-alpine

# Metadata labels
LABEL org.opencontainers.image.title="Flashpoint Web"
LABEL org.opencontainers.image.description="Self-hosted web app for Flashpoint Archive (API + UI)"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/darkraise/flashpoint-web"

WORKDIR /app

# Install runtime dependencies
# - curl: health checks
# - tzdata: timezone support
# - su-exec: lightweight tool to drop privileges (like gosu)
# - shadow: provides usermod/groupmod for dynamic UID/GID
RUN apk add --no-cache curl tzdata su-exec shadow

# Copy workspace root package files
COPY --from=backend-builder /app/package.json /app/package-lock.json ./

# Copy backend package files
COPY --from=backend-builder /app/backend/package.json ./backend/

# Install production dependencies only and clean npm cache to reduce image size
RUN npm ci --workspace=backend --include-workspace-root --omit=dev --prefer-offline --no-audit && \
    npm cache clean --force

# Copy built backend
COPY --from=backend-builder /app/backend/dist ./backend/dist

# Copy migration files to dist directory (needed at runtime)
COPY --from=backend-builder /app/backend/src/migrations ./backend/dist/migrations
# Plain-JS query worker: not compiled by tsc, loaded by path at runtime
COPY --from=backend-builder /app/backend/src/workers ./backend/dist/workers

# Copy entrypoint script
COPY --from=backend-builder /app/backend/docker-entrypoint.sh ./backend/docker-entrypoint.sh

# Copy built frontend — served by the backend (config.frontendDistPath resolves
# to /app/frontend/dist at runtime)
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Create data and logs directories, make entrypoint executable, fix ownership
# Uses existing 'node' user (UID 1000) from base image
RUN mkdir -p /app/data /app/logs && \
    chmod +x /app/backend/docker-entrypoint.sh && \
    chown -R node:node /app

# Set working directory to backend (entrypoint runs `node dist/server.js`)
WORKDIR /app/backend

# Expose port (serves both API and UI)
EXPOSE 3100

# Health check is configured in docker-compose.yml for flexibility

# Environment variables
ENV NODE_ENV=production
ENV PUID=1000
ENV PGID=1000
# Image and ZIP reads run on libuv's threadpool; its default of 4 throttles
# every filesystem request in the process, which shows up badly on a network mount.
ENV UV_THREADPOOL_SIZE=16

# Start as root, entrypoint will drop privileges after setting up user
USER root

# Production command using entrypoint script
# The entrypoint handles:
# 1. Dynamic UID/GID setup (if PUID/PGID differ from defaults)
# 2. Database copy (if enabled)
# 3. Privilege drop and application startup
ENTRYPOINT ["./docker-entrypoint.sh"]
