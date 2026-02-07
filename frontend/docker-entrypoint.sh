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

# Set defaults for environment variables (envsubst doesn't support :-default syntax)
export BACKEND_HOST="${BACKEND_HOST:-backend}"
export BACKEND_PORT="${BACKEND_PORT:-3100}"

echo "Processing nginx configuration..."
envsubst '${BACKEND_HOST} ${BACKEND_PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Display configuration summary
echo ""
echo "Configuration Summary:"
echo "  Backend: ${BACKEND_HOST}:${BACKEND_PORT}"
echo ""

# Start nginx
echo "Starting Nginx..."
exec nginx -g "daemon off;"
