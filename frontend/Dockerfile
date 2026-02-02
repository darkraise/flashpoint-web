# Production Dockerfile for Flashpoint Web Frontend

# =============================================================================
# Stage 1: Builder - Build for production
# =============================================================================
FROM node:20.18.2-alpine AS builder

WORKDIR /app

# Copy workspace root package files
COPY package.json package-lock.json ./

# Copy frontend package files
COPY frontend/package.json ./frontend/

# Install dependencies for frontend workspace
# Use npm ci with frozen lockfile for faster, reproducible builds
RUN npm ci --workspace=frontend --include-workspace-root --prefer-offline --no-audit

# Copy frontend source code
COPY frontend ./frontend/

# Build argument for API URL (injected at build time)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build application (run from frontend directory)
WORKDIR /app/frontend
RUN npm run build

# =============================================================================
# Stage 2: Production - Nginx serving static files
# =============================================================================
FROM nginx:alpine

# Metadata labels
LABEL org.opencontainers.image.title="Flashpoint Web Frontend"
LABEL org.opencontainers.image.description="React web UI for Flashpoint Archive"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/darkraise/flashpoint-web"

# Install runtime dependencies
# - gettext: provides envsubst for nginx config templating
RUN apk add --no-cache gettext

# Copy built files from builder
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration from .nginx/ folder
# Main config: logs to stdout/stderr, uses /tmp for temp files (no permission issues)
COPY frontend/.nginx/nginx.conf /etc/nginx/nginx.conf
COPY frontend/.nginx/default.conf.template /etc/nginx/templates/default.conf.template

# Copy entrypoint script
COPY frontend/docker-entrypoint.sh /docker-entrypoint.sh

# Default backend host/port (can be overridden at runtime)
ENV BACKEND_HOST=backend \
    BACKEND_PORT=3100

# Set up permissions for nginx user (already exists in nginx:alpine)
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    chmod +x /docker-entrypoint.sh

# Expose port (8080 for non-root user)
EXPOSE 8080

# Health check (using wget which is built into Alpine)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --spider http://localhost:8080/ || exit 1

# Run as non-root user (nginx user from base image)
USER nginx

# Production command using entrypoint script
ENTRYPOINT ["/docker-entrypoint.sh"]
