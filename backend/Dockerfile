# Production Dockerfile for Flashpoint Web Backend

# =============================================================================
# Stage 1: Builder - Build TypeScript
# =============================================================================
FROM node:20.18.2-alpine AS builder

WORKDIR /app

# Copy workspace root package files
COPY package.json package-lock.json ./

# Copy backend package files
COPY backend/package.json ./backend/

# Install all dependencies for the backend workspace
# Use npm ci with frozen lockfile for faster, reproducible builds
RUN npm ci --workspace=backend --include-workspace-root --prefer-offline --no-audit

# Copy backend source code
COPY backend ./backend/

# Build TypeScript (run from backend directory)
WORKDIR /app/backend
RUN npm run build

# =============================================================================
# Stage 2: Production - Optimized runtime
# =============================================================================
FROM node:20.18.2-alpine

# Metadata labels
LABEL org.opencontainers.image.title="Flashpoint Web Backend"
LABEL org.opencontainers.image.description="REST API for Flashpoint Archive"
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

# Copy backend package files
COPY --from=builder /app/backend/package.json ./backend/

# Install production dependencies only for backend workspace
RUN npm ci --workspace=backend --include-workspace-root --omit=dev --prefer-offline --no-audit

# Copy built application
COPY --from=builder /app/backend/dist ./backend/dist

# Copy migration files to dist directory (needed at runtime)
COPY --from=builder /app/backend/src/migrations ./backend/dist/migrations

# Copy entrypoint script
COPY --from=builder /app/backend/docker-entrypoint.sh ./backend/docker-entrypoint.sh

# Create non-root user with default UID/GID 1000
# These can be overridden at runtime via PUID/PGID environment variables
RUN addgroup -g 1000 -S flashpoint && \
    adduser -S flashpoint -u 1000 -G flashpoint

# Create data and logs directories
# Make entrypoint script executable
# Note: Ownership will be fixed at runtime if PUID/PGID are set
RUN mkdir -p /app/data /app/logs && \
    chmod +x /app/backend/docker-entrypoint.sh && \
    chown -R flashpoint:flashpoint /app

# Set working directory to backend
WORKDIR /app/backend

# Expose port
EXPOSE 3100

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl --fail http://localhost:3100/api/health || exit 1

# Environment variables for dynamic UID/GID (optional)
# Set these to match your host user's UID/GID
ENV PUID=1000
ENV PGID=1000

# Start as root, entrypoint will drop privileges after setting up user
USER root

# Production command using entrypoint script
# The entrypoint handles:
# 1. Dynamic UID/GID setup (if PUID/PGID differ from defaults)
# 2. Database copy (if enabled)
# 3. Privilege drop and application startup
ENTRYPOINT ["./docker-entrypoint.sh"]
