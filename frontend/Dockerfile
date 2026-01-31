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
RUN npm ci --workspace=frontend --include-workspace-root

# Copy frontend source code
COPY frontend ./frontend/

# Build argument for API URL (injected at build time)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build application
RUN npm run build --workspace=frontend

# =============================================================================
# Stage 2: Production - Nginx serving static files
# =============================================================================
FROM nginx:alpine

# Metadata labels
LABEL org.opencontainers.image.title="Flashpoint Web Frontend"
LABEL org.opencontainers.image.description="React web UI for Flashpoint Archive"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/darkraise/flashpoint-web"

# Install runtime dependencies (curl for health checks, tzdata for timezone)
RUN apk add --no-cache curl tzdata

# Copy built files from builder
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Create non-root user and set permissions
RUN addgroup -g 1001 -S flashpoint && \
    adduser -S flashpoint -u 1001 && \
    chown -R flashpoint:flashpoint /usr/share/nginx/html && \
    chown -R flashpoint:flashpoint /var/cache/nginx && \
    chown -R flashpoint:flashpoint /var/log/nginx && \
    chown -R flashpoint:flashpoint /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R flashpoint:flashpoint /var/run/nginx.pid

# Create necessary directories
RUN mkdir -p /var/cache/nginx/client_temp \
    /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp \
    /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp && \
    chown -R flashpoint:flashpoint /var/cache/nginx

# Switch to non-root user
USER flashpoint

# Expose port (8080 for non-root user)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl --fail http://localhost:8080/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
