# Production Dockerfile for Flashpoint Game Service

# =============================================================================
# Stage 1: Builder - Production build
# =============================================================================
FROM node:20.18.2-alpine AS builder

WORKDIR /app

# Copy workspace root package files
COPY package.json package-lock.json ./

# Copy game-service package files
COPY game-service/package.json ./game-service/

# Install all dependencies for game-service workspace
# Use npm ci with frozen lockfile for faster, reproducible builds
# No native modules in game-service, so no build tools needed
RUN npm ci --workspace=game-service --include-workspace-root --prefer-offline --no-audit

# Copy game-service source code
COPY game-service ./game-service/

# Build TypeScript (run from game-service directory)
WORKDIR /app/game-service
RUN npm run build

# =============================================================================
# Stage 2: Production - Optimized runtime
# =============================================================================
FROM node:20.18.2-alpine

# Metadata labels
LABEL org.opencontainers.image.title="Flashpoint Game Service"
LABEL org.opencontainers.image.description="Game content proxy and ZIP server for Flashpoint Archive"
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
COPY --from=builder /app/package.json /app/package-lock.json ./

# Copy game-service package files
COPY --from=builder /app/game-service/package.json ./game-service/

# Install production dependencies only and clean npm cache to reduce image size
RUN npm ci --workspace=game-service --include-workspace-root --omit=dev --prefer-offline --no-audit && \
    npm cache clean --force

# Copy built application
COPY --from=builder /app/game-service/dist ./game-service/dist

# Copy entrypoint script
COPY --from=builder /app/game-service/docker-entrypoint.sh ./game-service/docker-entrypoint.sh

# Create logs directory and make entrypoint executable
# Use existing 'node' user (UID 1000) from base image
RUN mkdir -p /app/logs && \
    chmod +x /app/game-service/docker-entrypoint.sh && \
    chown -R node:node /app

# Set working directory to game-service
WORKDIR /app/game-service

# Expose ports
EXPOSE 22500 22501

# Health check (check proxy server port)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl --fail http://localhost:22500/health || exit 1

# Environment variables
ENV NODE_ENV=production
ENV PUID=1000
ENV PGID=1000

# Start as root, entrypoint will drop privileges after setting up user
USER root

# Production command using entrypoint script
ENTRYPOINT ["./docker-entrypoint.sh"]
