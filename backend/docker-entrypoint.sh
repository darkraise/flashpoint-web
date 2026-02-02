#!/bin/sh
set -e

# =============================================================================
# Docker Entrypoint for Flashpoint Web Backend
# =============================================================================
# This script handles:
# 1. Initial database copy from network storage to local (if enabled)
# 2. Database sync check on startup
# 3. Application startup
# =============================================================================

echo "🚀 Flashpoint Web Backend - Starting..."

# Configuration
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
if [ "$ENABLE_LOCAL_DB_COPY" = "true" ]; then
    echo "   Local DB path: ${LOCAL_DB_PATH}"
fi
echo ""

# Start the application
echo "🎮 Starting Flashpoint Web Backend..."
exec node dist/server.js
