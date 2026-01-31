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
RUN npm ci --workspace=game-service --include-workspace-root

# Copy game-service source code
COPY game-service ./game-service/

# Build TypeScript
RUN npm run build --workspace=game-service

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

# Install runtime dependencies (curl for health checks, tzdata for timezone)
RUN apk add --no-cache curl tzdata

# Copy workspace root package files
COPY --from=builder /app/package.json /app/package-lock.json ./

# Copy game-service package files
COPY --from=builder /app/game-service/package.json ./game-service/

# Install production dependencies only for game-service workspace
RUN npm ci --workspace=game-service --include-workspace-root --omit=dev

# Copy built application
COPY --from=builder /app/game-service/dist ./game-service/dist

# Create non-root user
RUN addgroup -g 1001 -S flashpoint && \
    adduser -S flashpoint -u 1001

# Change ownership
RUN chown -R flashpoint:flashpoint /app

# Switch to non-root user
USER flashpoint

# Set working directory to game-service
WORKDIR /app/game-service

# Expose ports
EXPOSE 22500 22501

# Health check (check proxy server port)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl --fail http://localhost:22500/ || exit 1

# Production command
CMD ["node", "dist/index.js"]
