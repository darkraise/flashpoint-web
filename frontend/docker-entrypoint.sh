#!/bin/sh
set -e

# =============================================================================
# Docker Entrypoint for Flashpoint Web Frontend
# =============================================================================
# This script handles:
# 1. Nginx configuration templating
# 2. Application startup
# =============================================================================

echo "Flashpoint Web Frontend - Starting..."

# =============================================================================
# Nginx Configuration Templating
# =============================================================================
# Process nginx config template with environment variables

echo "Processing nginx configuration..."
envsubst '${BACKEND_HOST} ${BACKEND_PORT} ${GAME_SERVICE_HOST}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Display configuration summary
echo ""
echo "Configuration Summary:"
echo "  Backend: ${BACKEND_HOST}:${BACKEND_PORT}"
echo "  Game Service: ${GAME_SERVICE_HOST}"
echo ""

# Start nginx
echo "Starting Nginx..."
exec nginx -g "daemon off;"
