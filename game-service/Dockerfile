# Production Dockerfile for Flashpoint Game Service

# =============================================================================
# Stage 1: Builder - Production build
# =============================================================================
FROM node:20.18.2-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy workspace root package files
COPY package.json package-lock.json ./

# Copy game-service package files
COPY game-service/package.json ./game-service/

# Install all dependencies for game-service workspace
# Use npm ci with frozen lockfile for faster, reproducible builds
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

# Install production dependencies only for game-service workspace
RUN npm ci --workspace=game-service --include-workspace-root --omit=dev --prefer-offline --no-audit

# Copy built application
COPY --from=builder /app/game-service/dist ./game-service/dist

# Copy entrypoint script
COPY --from=builder /app/game-service/docker-entrypoint.sh ./game-service/docker-entrypoint.sh

# Create non-root user with default UID/GID 1000
# These can be overridden at runtime via PUID/PGID environment variables
RUN addgroup -g 1000 -S flashpoint && \
    adduser -S flashpoint -u 1000 -G flashpoint

# Create logs directory and make entrypoint executable
# Note: Ownership will be fixed at runtime if PUID/PGID are set
RUN mkdir -p /app/logs && \
    chmod +x /app/game-service/docker-entrypoint.sh && \
    chown -R flashpoint:flashpoint /app

# Set working directory to game-service
WORKDIR /app/game-service

# Expose ports
EXPOSE 22500 22501

# Health check (check proxy server port)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl --fail http://localhost:22500/health || exit 1

# Environment variables for dynamic UID/GID (optional)
# Set these to match your host user's UID/GID
ENV PUID=1000
ENV PGID=1000

# Start as root, entrypoint will drop privileges after setting up user
USER root

# Production command using entrypoint script
ENTRYPOINT ["./docker-entrypoint.sh"]
