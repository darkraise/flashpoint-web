#!/bin/sh

# Flashpoint Web App Startup Script
# Starts Nginx and Node.js backend server

set -e

echo "========================================="
echo "Flashpoint Web Application"
echo "========================================="
echo ""

# Check if Flashpoint data directory is mounted
if [ ! -d "/data/flashpoint/Data" ]; then
    echo "WARNING: Flashpoint data directory not found at /data/flashpoint/Data"
    echo "Please mount your Flashpoint installation to /data/flashpoint volume"
    echo ""
fi

# Check if database exists
if [ ! -f "/data/flashpoint/Data/flashpoint.sqlite" ]; then
    echo "ERROR: Flashpoint database not found at /data/flashpoint/Data/flashpoint.sqlite"
    echo "Please ensure your Flashpoint installation is properly mounted"
    exit 1
fi

echo "✓ Flashpoint database found"

# Start Nginx in background
echo "Starting Nginx..."
nginx -g 'daemon off;' &
NGINX_PID=$!
echo "✓ Nginx started (PID: $NGINX_PID)"

# Give Nginx a moment to start
sleep 2

# Start Node.js backend server
echo "Starting Backend API server..."
cd /app/backend
node dist/server.js &
BACKEND_PID=$!
echo "✓ Backend API started (PID: $BACKEND_PID)"

echo ""
echo "========================================="
echo "Flashpoint Web App is ready!"
echo "========================================="
echo "Frontend:      http://localhost"
echo "Backend API:   http://localhost:3001"
echo "Game Proxy:    http://localhost:22500"
echo "Health Check:  http://localhost:3001/health"
echo "========================================="
echo ""

# Function to handle shutdown
shutdown() {
    echo ""
    echo "Shutting down..."
    kill $NGINX_PID $BACKEND_PID 2>/dev/null || true
    wait $NGINX_PID $BACKEND_PID 2>/dev/null || true
    echo "✓ Shutdown complete"
    exit 0
}

# Trap signals for graceful shutdown
trap shutdown SIGTERM SIGINT

# Wait for processes
wait
