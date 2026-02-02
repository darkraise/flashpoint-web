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
# - curl: health checks
# - tzdata: timezone support
# - su-exec: lightweight tool to drop privileges (like gosu)
# - shadow: provides usermod/groupmod for dynamic UID/GID
# - gettext: provides envsubst for nginx config templating
RUN apk add --no-cache curl tzdata su-exec shadow gettext

# Copy built files from builder
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/templates/default.conf.template

# Copy entrypoint script
COPY frontend/docker-entrypoint.sh /docker-entrypoint.sh

# Default backend host/port (can be overridden at runtime)
ENV BACKEND_HOST=backend \
    BACKEND_PORT=3100

# Create non-root user with default UID/GID 1000 (nginx:alpine doesn't have one)
# These can be overridden at runtime via PUID/PGID environment variables
RUN addgroup -g 1000 -S appuser && \
    adduser -S appuser -u 1000 -G appuser && \
    chown -R appuser:appuser /usr/share/nginx/html && \
    chown -R appuser:appuser /var/cache/nginx && \
    chown -R appuser:appuser /var/log/nginx && \
    chown -R appuser:appuser /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R appuser:appuser /var/run/nginx.pid && \
    chmod +x /docker-entrypoint.sh

# Create necessary directories
RUN mkdir -p /var/cache/nginx/client_temp \
    /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp \
    /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp && \
    chown -R appuser:appuser /var/cache/nginx

# Expose port (8080 for non-root user)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl --fail http://localhost:8080/ || exit 1

# Environment variables for dynamic UID/GID (optional)
# Set these to match your host user's UID/GID
ENV PUID=1000
ENV PGID=1000

# Start as root, entrypoint will drop privileges after setting up user
USER root

# Production command using entrypoint script
ENTRYPOINT ["/docker-entrypoint.sh"]
