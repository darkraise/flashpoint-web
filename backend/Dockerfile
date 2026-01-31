# Production Dockerfile for Flashpoint Web Backend

# =============================================================================
# Stage 1: Builder - Build TypeScript
# =============================================================================
FROM node:20.18.2-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies for build
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
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

# Copy package files
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy migration files (needed at runtime)
COPY --from=builder /app/src/migrations ./src/migrations

# Create non-root user
RUN addgroup -g 1001 -S flashpoint && \
    adduser -S flashpoint -u 1001

# Create data directory for user.db
RUN mkdir -p /app/data && \
    chown -R flashpoint:flashpoint /app

# Switch to non-root user
USER flashpoint

# Expose port
EXPOSE 3100

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl --fail http://localhost:3100/api/health || exit 1

# Production command
CMD ["node", "dist/server.js"]
