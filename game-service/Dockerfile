# Production Dockerfile for Flashpoint Game Service

# =============================================================================
# Stage 1: Builder - Production build
# =============================================================================
FROM node:20.18.2-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

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
LABEL org.opencontainers.image.title="Flashpoint Game Service"
LABEL org.opencontainers.image.description="Game content proxy and ZIP server for Flashpoint Archive"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/darkraise/flashpoint-web"

WORKDIR /app

# Install runtime dependencies (curl for health checks, tzdata for timezone)
RUN apk add --no-cache curl tzdata

# Copy package files
COPY --from=builder /app/package*.json ./

# Install production dependencies only (no build tools needed)
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S flashpoint && \
    adduser -S flashpoint -u 1001

# Change ownership
RUN chown -R flashpoint:flashpoint /app

# Switch to non-root user
USER flashpoint

# Expose ports
EXPOSE 22500 22501

# Health check (check proxy server port)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl --fail http://localhost:22500/ || exit 1

# Production command
CMD ["node", "dist/index.js"]
