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

setup_user() {
    local current_uid
    local current_gid

    current_uid=$(id -u flashpoint 2>/dev/null || echo "")
    current_gid=$(id -g flashpoint 2>/dev/null || echo "")

    # Check if we need to modify UID/GID
    if [ "$current_uid" != "$PUID" ] || [ "$current_gid" != "$PGID" ]; then
        echo "🔧 Adjusting user permissions..."
        echo "   PUID: $PUID (was: $current_uid)"
        echo "   PGID: $PGID (was: $current_gid)"

        # Modify group GID if different
        if [ "$current_gid" != "$PGID" ]; then
            # Check if target GID is already in use
            if getent group "$PGID" >/dev/null 2>&1; then
                local conflicting_group
                conflicting_group=$(getent group "$PGID" | cut -d: -f1)
                if [ "$conflicting_group" != "flashpoint" ]; then
                    delgroup "$conflicting_group" 2>/dev/null || true
                fi
            fi
            # Alpine uses different syntax for groupmod
            sed -i "s/^flashpoint:x:[0-9]*:/flashpoint:x:${PGID}:/" /etc/group 2>/dev/null || true
        fi

        # Modify user UID if different
        if [ "$current_uid" != "$PUID" ]; then
            # Check if target UID is already in use
            if getent passwd "$PUID" >/dev/null 2>&1; then
                local conflicting_user
                conflicting_user=$(getent passwd "$PUID" | cut -d: -f1)
                if [ "$conflicting_user" != "flashpoint" ]; then
                    deluser "$conflicting_user" 2>/dev/null || true
                fi
            fi
            # Alpine uses different syntax for usermod
            sed -i "s/^flashpoint:x:[0-9]*:[0-9]*:/flashpoint:x:${PUID}:${PGID}:/" /etc/passwd 2>/dev/null || true
        fi

        # Fix ownership of nginx directories
        echo "   Fixing ownership of nginx directories..."
        chown -R flashpoint:flashpoint /usr/share/nginx/html 2>/dev/null || true
        chown -R flashpoint:flashpoint /var/cache/nginx 2>/dev/null || true
        chown -R flashpoint:flashpoint /var/log/nginx 2>/dev/null || true
        chown -R flashpoint:flashpoint /etc/nginx/conf.d 2>/dev/null || true
        chown flashpoint:flashpoint /var/run/nginx.pid 2>/dev/null || true
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
    exec su-exec flashpoint nginx -g "daemon off;"
else
    exec nginx -g "daemon off;"
fi
