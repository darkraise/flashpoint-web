#!/bin/sh
set -e

# =============================================================================
# Docker Entrypoint for Flashpoint Web Frontend
# =============================================================================
# This script handles:
# 1. Dynamic UID/GID setup (via PUID/PGID environment variables)
# 2. Nginx configuration templating
# 3. Application startup with dropped privileges
# =============================================================================

echo "🌐 Flashpoint Web Frontend - Starting..."

# =============================================================================
# Dynamic UID/GID Setup
# =============================================================================
# Supports PUID/PGID environment variables to match host user permissions

PUID=${PUID:-1000}
PGID=${PGID:-1000}
APP_USER="appuser"
APP_GROUP="appuser"

setup_user() {
    local current_uid
    local current_gid

    current_uid=$(id -u $APP_USER 2>/dev/null || echo "")
    current_gid=$(id -g $APP_USER 2>/dev/null || echo "")

    # Check if we need to modify UID/GID
    if [ "$current_uid" != "$PUID" ] || [ "$current_gid" != "$PGID" ]; then
        echo "🔧 Adjusting user permissions..."
        echo "   PUID: $PUID (was: $current_uid)"
        echo "   PGID: $PGID (was: $current_gid)"

        # Modify group GID if different
        if [ "$current_gid" != "$PGID" ]; then
            # Check if target GID is already in use by another group
            existing_group=$(getent group "$PGID" 2>/dev/null | cut -d: -f1 || true)
            if [ -n "$existing_group" ] && [ "$existing_group" != "$APP_GROUP" ]; then
                delgroup "$existing_group" 2>/dev/null || true
            fi
            # Alpine uses different syntax
            sed -i "s/^${APP_GROUP}:x:[0-9]*:/${APP_GROUP}:x:${PGID}:/" /etc/group 2>/dev/null || true
        fi

        # Modify user UID if different
        if [ "$current_uid" != "$PUID" ]; then
            # Check if target UID is already in use by another user
            existing_user=$(getent passwd "$PUID" 2>/dev/null | cut -d: -f1 || true)
            if [ -n "$existing_user" ] && [ "$existing_user" != "$APP_USER" ]; then
                deluser "$existing_user" 2>/dev/null || true
            fi
            # Alpine uses different syntax
            sed -i "s/^${APP_USER}:x:[0-9]*:[0-9]*:/${APP_USER}:x:${PUID}:${PGID}:/" /etc/passwd 2>/dev/null || true
        fi

        # Fix ownership of nginx directories
        echo "   Fixing ownership of nginx directories..."
        chown -R $APP_USER:$APP_GROUP /usr/share/nginx/html 2>/dev/null || true
        chown -R $APP_USER:$APP_GROUP /var/cache/nginx 2>/dev/null || true
        chown -R $APP_USER:$APP_GROUP /var/log/nginx 2>/dev/null || true
        chown -R $APP_USER:$APP_GROUP /etc/nginx/conf.d 2>/dev/null || true
        chown $APP_USER:$APP_GROUP /var/run/nginx.pid 2>/dev/null || true
    else
        echo "✅ User permissions OK (UID=$PUID, GID=$PGID)"
    fi
}

# Only setup user if running as root
if [ "$(id -u)" = "0" ]; then
    setup_user
fi

# =============================================================================
# Nginx Configuration Templating
# =============================================================================
# Process nginx config template with environment variables

echo "📝 Processing nginx configuration..."
envsubst '${BACKEND_HOST} ${BACKEND_PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Display configuration summary
echo ""
echo "📋 Configuration Summary:"
echo "   Backend: ${BACKEND_HOST}:${BACKEND_PORT}"
echo "   Running as UID: ${PUID}, GID: ${PGID}"
echo ""

# Start the application
echo "🚀 Starting Nginx..."

# If running as root, drop privileges using su-exec
if [ "$(id -u)" = "0" ]; then
    exec su-exec $APP_USER nginx -g "daemon off;"
else
    exec nginx -g "daemon off;"
fi
