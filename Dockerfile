# Multi-stage Dockerfile for Flashpoint Web Application
# This creates a standalone container with all services (frontend, backend, proxy)

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# Stage 2: Build backend
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy backend source
COPY backend/ ./

# Build backend
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine

WORKDIR /app

# Install nginx for serving frontend
RUN apk add --no-cache nginx

# Create necessary directories
RUN mkdir -p /app/backend \
    /app/frontend \
    /var/lib/nginx/logs \
    /run/nginx \
    /data/flashpoint/Data \
    /data/flashpoint/Legacy

# Copy built backend
COPY --from=backend-builder /app/backend/dist /app/backend/dist
COPY --from=backend-builder /app/backend/package*.json /app/backend/
COPY --from=backend-builder /app/backend/node_modules /app/backend/node_modules

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Copy startup script
COPY docker/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Environment variables
ENV NODE_ENV=production \
    PORT=3001 \
    HOST=0.0.0.0 \
    FLASHPOINT_PATH=/data/flashpoint \
    FLASHPOINT_DB_PATH=/data/flashpoint/Data/flashpoint.sqlite \
    FLASHPOINT_HTDOCS_PATH=/data/flashpoint/Legacy/htdocs \
    FLASHPOINT_IMAGES_PATH=/data/flashpoint/Data/Images \
    FLASHPOINT_LOGOS_PATH=/data/flashpoint/Data/Logos \
    FLASHPOINT_PLAYLISTS_PATH=/data/flashpoint/Data/Playlists \
    FLASHPOINT_GAMES_PATH=/data/flashpoint/Data/Games \
    PROXY_ENABLED=true \
    PROXY_PORT=22500

# Expose ports
# 80: Nginx (frontend)
# 3001: Backend API
# 22500: Game proxy server
EXPOSE 80 3001 22500

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Start script
CMD ["/app/start.sh"]

# Volumes for Flashpoint data
VOLUME ["/data/flashpoint"]

# Labels
LABEL maintainer="Flashpoint Web App" \
      description="Standalone Flashpoint Archive web application with built-in game proxy" \
      version="1.0.0"
