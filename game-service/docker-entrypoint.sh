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
                # Remove the conflicting group
                local conflicting_group
                conflicting_group=$(getent group "$PGID" | cut -d: -f1)
                if [ "$conflicting_group" != "flashpoint" ]; then
                    groupdel "$conflicting_group" 2>/dev/null || true
                fi
            fi
            groupmod -g "$PGID" flashpoint 2>/dev/null || true
        fi

        # Modify user UID if different
        if [ "$current_uid" != "$PUID" ]; then
            # Check if target UID is already in use
            if getent passwd "$PUID" >/dev/null 2>&1; then
                # Remove the conflicting user
                local conflicting_user
                conflicting_user=$(getent passwd "$PUID" | cut -d: -f1)
                if [ "$conflicting_user" != "flashpoint" ]; then
                    userdel "$conflicting_user" 2>/dev/null || true
                fi
            fi
            usermod -u "$PUID" flashpoint 2>/dev/null || true
        fi

        # Fix ownership of app directories
        echo "   Fixing ownership of /app directories..."
        chown -R flashpoint:flashpoint /app/logs 2>/dev/null || true
    else
        echo "✅ User permissions OK (UID=$PUID, GID=$PGID)"
    fi
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
    exec su-exec flashpoint node dist/index.js
else
    exec node dist/index.js
fi
