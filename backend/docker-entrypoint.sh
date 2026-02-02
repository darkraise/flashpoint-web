#!/bin/sh
set -e

# =============================================================================
# Docker Entrypoint for Flashpoint Web Backend
# =============================================================================
# This script handles:
# 1. Dynamic UID/GID setup (via PUID/PGID environment variables)
# 2. Initial database copy from network storage to local (if enabled)
# 3. Database sync check on startup
# 4. Application startup with dropped privileges
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

# Function to copy database from source to local storage
copy_database() {
    local source="$1"
    local dest="$2"
    local dest_dir
    dest_dir=$(dirname "$dest")

    echo "📦 Copying database from source to local storage..."
    echo "   Source: $source"
    echo "   Destination: $dest"

    # Create destination directory if it doesn't exist
    if [ ! -d "$dest_dir" ]; then
        mkdir -p "$dest_dir"
        echo "   Created directory: $dest_dir"
    fi

    # Copy to temp file first for atomic operation
    local temp_file="${dest}.tmp"

    # Measure copy time
    local start_time
    start_time=$(date +%s)

    cp "$source" "$temp_file"
    mv "$temp_file" "$dest"

    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))

    # Get file size in MB
    local size_bytes
    local size_mb
    size_bytes=$(stat -c%s "$dest" 2>/dev/null || stat -f%z "$dest" 2>/dev/null || echo "0")
    size_mb=$((size_bytes / 1024 / 1024))

    echo "✅ Database copied successfully (${size_mb}MB in ${duration}s)"
}

# Function to check if local copy needs update
needs_update() {
    local source="$1"
    local dest="$2"

    # If destination doesn't exist, needs update
    if [ ! -f "$dest" ]; then
        echo "   Local copy does not exist"
        return 0
    fi

    # Get modification times (portable between Linux and Alpine)
    local source_mtime
    local dest_mtime
    source_mtime=$(stat -c%Y "$source" 2>/dev/null || stat -f%m "$source" 2>/dev/null || echo "0")
    dest_mtime=$(stat -c%Y "$dest" 2>/dev/null || stat -f%m "$dest" 2>/dev/null || echo "0")

    # If source is newer, needs update
    if [ "$source_mtime" -gt "$dest_mtime" ]; then
        echo "   Source is newer than local copy"
        echo "   Source mtime: $source_mtime"
        echo "   Local mtime: $dest_mtime"
        return 0
    fi

    # Get file sizes
    local source_size
    local dest_size
    source_size=$(stat -c%s "$source" 2>/dev/null || stat -f%z "$source" 2>/dev/null || echo "0")
    dest_size=$(stat -c%s "$dest" 2>/dev/null || stat -f%z "$dest" 2>/dev/null || echo "0")

    # If sizes differ, needs update
    if [ "$source_size" != "$dest_size" ]; then
        echo "   File sizes differ (source: ${source_size}, local: ${dest_size})"
        return 0
    fi

    # No update needed
    return 1
}

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

# Handle local database copy if enabled
if [ "$ENABLE_LOCAL_DB_COPY" = "true" ]; then
    echo "🔄 Local database copy is ENABLED"
    echo "   Checking if local copy needs update..."

    if needs_update "$SOURCE_DB_PATH" "$LOCAL_DB_PATH"; then
        copy_database "$SOURCE_DB_PATH" "$LOCAL_DB_PATH"
    else
        echo "✅ Local database copy is up to date"
    fi
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
