#!/bin/sh
set -e

# =============================================================================
# Docker Entrypoint for Flashpoint Game Service
# =============================================================================
# This script handles:
# 1. Dynamic UID/GID setup (via PUID/PGID environment variables)
# 2. Application startup with dropped privileges
# =============================================================================

echo "🎮 Flashpoint Game Service - Starting..."

# =============================================================================
# Dynamic UID/GID Setup
# =============================================================================
# Supports PUID/PGID environment variables to match host user permissions
# This allows bind-mounted volumes to have correct ownership

PUID=${PUID:-1000}
PGID=${PGID:-1000}
APP_USER="node"
APP_GROUP="node"

setup_user() {
    local current_uid
    local current_gid

    current_uid=$(id -u $APP_USER 2>/dev/null || echo "")
    current_gid=$(id -g $APP_USER 2>/dev/null || echo "")

    # Check if we need to modify UID/GID
    if [ "$current_uid" != "$PUID" ] || [ "$current_gid" != "$PGID" ]; then
        echo "🔧 Adjusting user UID/GID..."
        echo "   PUID: $PUID (was: $current_uid)"
        echo "   PGID: $PGID (was: $current_gid)"

        # Modify group GID if different
        if [ "$current_gid" != "$PGID" ]; then
            # Check if target GID is already in use by another group
            existing_group=$(getent group "$PGID" 2>/dev/null | cut -d: -f1 || true)
            if [ -n "$existing_group" ] && [ "$existing_group" != "$APP_GROUP" ]; then
                groupdel "$existing_group" 2>/dev/null || true
            fi
            groupmod -g "$PGID" $APP_GROUP 2>/dev/null || true
        fi

        # Modify user UID if different
        if [ "$current_uid" != "$PUID" ]; then
            # Check if target UID is already in use by another user
            existing_user=$(getent passwd "$PUID" 2>/dev/null | cut -d: -f1 || true)
            if [ -n "$existing_user" ] && [ "$existing_user" != "$APP_USER" ]; then
                userdel "$existing_user" 2>/dev/null || true
            fi
            usermod -u "$PUID" $APP_USER 2>/dev/null || true
        fi
    else
        echo "✅ User UID/GID OK (UID=$PUID, GID=$PGID)"
    fi

    # Always fix ownership of mounted directories (volumes override container permissions)
    echo "🔧 Ensuring correct ownership of data directories..."
    chown -R $APP_USER:$APP_GROUP /app/logs 2>/dev/null || true
}

# Only setup user if running as root
if [ "$(id -u)" = "0" ]; then
    setup_user
fi

# =============================================================================
# Main Entrypoint Logic
# =============================================================================

# Display configuration summary
echo ""
echo "📋 Configuration Summary:"
echo "   Running as UID: ${PUID}, GID: ${PGID}"
echo ""

# Start the application
echo "🚀 Starting Game Service..."

# If running as root, drop privileges using su-exec
if [ "$(id -u)" = "0" ]; then
    exec su-exec $APP_USER node dist/index.js
else
    exec node dist/index.js
fi
