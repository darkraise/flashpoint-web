#!/bin/sh
set -e

# =============================================================================
# Docker Entrypoint for Flashpoint Web Backend
# =============================================================================
# This script handles:
# 1. Dynamic UID/GID setup (via PUID/PGID environment variables)
# 2. Ownership of the mounted data and log directories
# 3. Application startup with dropped privileges
#
# The local database copy is deliberately NOT done here: it runs inside the
# application so the HTTP port is already open while it happens, which on a
# network share is the difference between a "server is starting" page and a
# connection error.
# =============================================================================

echo "🚀 Flashpoint Web Backend - Starting..."

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

        # Image-layer files stay owned by the build UID, which the app user no
        # longer is. Ruffle installs and updates write here, so without this
        # they fail with EACCES on any non-default PUID. Skipped when the UID
        # is unchanged: chown -R copies every file up out of the image layer.
        echo "🔧 Ensuring correct ownership of served frontend files..."
        chown -R $APP_USER:$APP_GROUP /app/frontend/dist 2>/dev/null || true
    else
        echo "✅ User UID/GID OK (UID=$PUID, GID=$PGID)"
    fi

    # Always fix ownership of mounted directories (volumes override container permissions)
    echo "🔧 Ensuring correct ownership of data directories..."
    chown -R $APP_USER:$APP_GROUP /app/data /app/logs 2>/dev/null || true
}

# Only setup user if running as root
if [ "$(id -u)" = "0" ]; then
    setup_user
fi

# =============================================================================
# Database Copy Configuration
# =============================================================================

ENABLE_LOCAL_DB_COPY="${ENABLE_LOCAL_DB_COPY:-false}"
FLASHPOINT_PATH="/data/flashpoint"
SOURCE_DB_PATH="${FLASHPOINT_PATH}/Data/flashpoint.sqlite"
LOCAL_DB_PATH="/app/data/flashpoint.sqlite"

# =============================================================================
# Main Entrypoint Logic
# =============================================================================

# Check if source database exists
if [ ! -f "$SOURCE_DB_PATH" ]; then
    echo "❌ ERROR: Source database not found at: $SOURCE_DB_PATH"
    echo "   Make sure the Flashpoint data volume is mounted correctly"
    exit 1
fi

echo "✅ Source database found: $SOURCE_DB_PATH"

# The copy itself is left to the application: it performs the same freshness
# check, and doing it here keeps the port closed for the whole copy, which is
# minutes on a network share — exactly when a user is most likely to open the
# page and get a connection error instead of the "server is starting" screen.
if [ "$ENABLE_LOCAL_DB_COPY" = "true" ]; then
    echo "🔄 Local database copy is ENABLED (performed by the application at startup)"
else
    echo "ℹ️  Local database copy is DISABLED"
    echo "   Database will be accessed directly from: $SOURCE_DB_PATH"
fi

# Display configuration summary
echo ""
echo "📋 Configuration Summary:"
echo "   Flashpoint data: ${FLASHPOINT_PATH}"
echo "   Local DB copy: ${ENABLE_LOCAL_DB_COPY}"
echo "   Running as UID: ${PUID}, GID: ${PGID}"
if [ "$ENABLE_LOCAL_DB_COPY" = "true" ]; then
    echo "   Local DB path: ${LOCAL_DB_PATH}"
fi
echo ""

# Start the application
echo "🎮 Starting Flashpoint Web Backend..."

# If running as root, drop privileges using su-exec
if [ "$(id -u)" = "0" ]; then
    exec su-exec $APP_USER node dist/server.js
else
    exec node dist/server.js
fi
