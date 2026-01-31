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

# Install runtime dependencies (curl for health checks, tzdata for timezone)
RUN apk add --no-cache curl tzdata

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

# Create non-root user
RUN addgroup -g 1001 -S flashpoint && \
    adduser -S flashpoint -u 1001

# Create data directory for user.db
RUN mkdir -p /app/data && \
    chown -R flashpoint:flashpoint /app

# Switch to non-root user
USER flashpoint

# Set working directory to backend
WORKDIR /app/backend

# Expose port
EXPOSE 3100

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl --fail http://localhost:3100/api/health || exit 1

# Production command
CMD ["node", "dist/server.js"]
