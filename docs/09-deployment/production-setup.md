# Production Setup

This guide covers deploying Flashpoint Web in a production environment with Nginx reverse proxy, SSL/TLS, process management, and monitoring.

## Table of Contents

- [Overview](#overview)
- [System Requirements](#system-requirements)
- [Production Build](#production-build)
- [Nginx Reverse Proxy](#nginx-reverse-proxy)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Process Management](#process-management)
- [Load Balancing](#load-balancing)
- [Caching Strategy](#caching-strategy)
- [Logging and Monitoring](#logging-and-monitoring)
- [Backup Strategy](#backup-strategy)
- [Maintenance](#maintenance)

## Overview

Production deployment architecture:

```
Internet
   |
   v
[Nginx Reverse Proxy + SSL]
   |
   +-- /api/*     --> Backend (3100)
   +-- /proxy/*   --> Game Service (22500)
   +-- /gamezip/* --> Game Service (22501)
   +-- /*         --> Frontend (80)
```

**Key Features:**

- SSL/TLS termination at Nginx
- Load balancing across multiple backend instances
- Static file caching and compression
- Rate limiting and DDoS protection
- Centralized logging
- Zero-downtime deployments

## System Requirements

### Hardware Requirements

**Minimum (up to 100 concurrent users):**
- 4 CPU cores
- 8GB RAM
- 100GB SSD storage
- 100Mbps network

**Recommended (100-500 concurrent users):**
- 8 CPU cores
- 16GB RAM
- 500GB SSD storage
- 1Gbps network

**High Traffic (500+ concurrent users):**
- 16+ CPU cores
- 32GB+ RAM
- 1TB+ SSD storage
- 10Gbps network

### Software Requirements

- **OS:** Ubuntu 22.04 LTS or later (recommended)
- **Node.js:** 20.x LTS
- **Nginx:** 1.24+
- **Docker:** 24.0+ (if using containers)
- **PM2:** Latest (for process management)
- **Certbot:** Latest (for SSL certificates)

## Production Build

### Build Without Docker

#### 1. Install Dependencies

```bash
# Clone repository
git clone <repository-url> /opt/flashpoint-web
cd /opt/flashpoint-web

# Install all dependencies
npm run install:all
```

#### 2. Build All Services

```bash
# Set production environment
export NODE_ENV=production

# Build all services
npm run build

# Verify builds
ls -la backend/dist/
ls -la frontend/dist/
ls -la game-service/dist/
```

#### 3. Configure Environment

```bash
# Backend configuration
cp backend/.env.example backend/.env
nano backend/.env

# Game service configuration
cp game-service/.env.example game-service/.env
nano game-service/.env
```

**Production .env (backend):**

```bash
NODE_ENV=production
PORT=3100
HOST=127.0.0.1  # Only bind to localhost (Nginx will proxy)

# Flashpoint paths
FLASHPOINT_PATH=/data/flashpoint
FLASHPOINT_DB_PATH=/data/flashpoint/Data/flashpoint.sqlite
FLASHPOINT_HTDOCS_PATH=/data/flashpoint/Legacy/htdocs
FLASHPOINT_IMAGES_PATH=/data/flashpoint/Data/Images
FLASHPOINT_LOGOS_PATH=/data/flashpoint/Data/Logos
FLASHPOINT_PLAYLISTS_PATH=/data/flashpoint/Data/Playlists
FLASHPOINT_GAMES_PATH=/data/flashpoint/Data/Games

# Game service (localhost)
GAME_SERVICE_PROXY_URL=http://localhost:22500
GAME_SERVICE_GAMEZIP_URL=http://localhost:22501

# Security (CHANGE THESE!)
JWT_SECRET=<generate-strong-random-secret-64-chars>
DOMAIN=https://yourdomain.com

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=warn
```

**Generate JWT Secret:**

```bash
openssl rand -hex 64
```

#### 4. Set Up Directories

```bash
# Create directories
sudo mkdir -p /opt/flashpoint-web/backend/data
sudo mkdir -p /opt/flashpoint-web/backend/logs
sudo mkdir -p /opt/flashpoint-web/game-service/logs

# Set permissions
sudo chown -R www-data:www-data /opt/flashpoint-web
```

## Nginx Reverse Proxy

### Installation

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# Start and enable
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Configuration

Create `/etc/nginx/sites-available/flashpoint-web`:

```nginx
# Upstream servers
upstream backend_servers {
    least_conn;  # Load balancing method
    server 127.0.0.1:3100 max_fails=3 fail_timeout=30s;
    # Add more backend instances for load balancing:
    # server 127.0.0.1:3002 max_fails=3 fail_timeout=30s;
    # server 127.0.0.1:3003 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

upstream game_service_proxy {
    server 127.0.0.1:22500 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

upstream game_service_gamezip {
    server 127.0.0.1:22501 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;

# Connection limiting
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

# HTTP server (redirect to HTTPS)
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Logging
    access_log /var/log/nginx/flashpoint-access.log;
    error_log /var/log/nginx/flashpoint-error.log warn;

    # Request size limits
    client_max_body_size 100M;
    client_body_buffer_size 128k;

    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 300s;

    # Connection limiting
    limit_conn conn_limit 10;

    # Backend API
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://backend_servers;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;

        # WebSocket support (if needed)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }

    # Game proxy (22500)
    location /proxy/ {
        limit_req zone=general_limit burst=50 nodelay;

        proxy_pass http://game_service_proxy/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Large file support
        proxy_buffering off;
        proxy_request_buffering off;
        tcp_nopush on;
        tcp_nodelay on;

        # Longer timeout for game loading
        proxy_read_timeout 600s;
    }

    # GameZip server (22501)
    location /gamezip/ {
        limit_req zone=general_limit burst=50 nodelay;

        proxy_pass http://game_service_gamezip/;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Large file support
        proxy_buffering off;
        proxy_request_buffering off;
        tcp_nopush on;
        tcp_nodelay on;

        # Longer timeout for ZIP streaming
        proxy_read_timeout 600s;
    }

    # Frontend static files
    location / {
        root /opt/flashpoint-web/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;

        # Compression
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_comp_level 6;
        gzip_types text/plain text/css text/xml text/javascript
                   application/x-javascript application/xml+rss
                   application/javascript application/json
                   image/svg+xml;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }

        # Disable cache for HTML
        location ~* \.html$ {
            expires -1;
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

### Enable Configuration

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/flashpoint-web /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## SSL/TLS Configuration

### Option 1: Let's Encrypt (Free, Automated)

#### Install Certbot

```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx
```

#### Obtain Certificate

```bash
# Automatic configuration
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Manual configuration (more control)
sudo certbot certonly --webroot -w /var/www/certbot \
  -d yourdomain.com -d www.yourdomain.com
```

#### Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot installs a cron job automatically
# Manually add if needed:
sudo crontab -e

# Add line:
0 3 * * * certbot renew --post-hook "systemctl reload nginx"
```

### Option 2: Custom SSL Certificate

```bash
# Create directories
sudo mkdir -p /etc/nginx/ssl

# Copy certificate files
sudo cp yourdomain.com.crt /etc/nginx/ssl/
sudo cp yourdomain.com.key /etc/nginx/ssl/

# Set permissions
sudo chmod 600 /etc/nginx/ssl/yourdomain.com.key
sudo chmod 644 /etc/nginx/ssl/yourdomain.com.crt
```

**Update Nginx config:**

```nginx
ssl_certificate /etc/nginx/ssl/yourdomain.com.crt;
ssl_certificate_key /etc/nginx/ssl/yourdomain.com.key;
```

### SSL Best Practices

Create `/etc/nginx/snippets/ssl-params.conf`:

```nginx
# SSL protocols
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;

# SSL ciphers
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';

# SSL session cache
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_session_tickets off;

# OCSP stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

# Diffie-Hellman parameters
ssl_dhparam /etc/nginx/dhparam.pem;
```

**Generate DH parameters:**

```bash
sudo openssl dhparam -out /etc/nginx/dhparam.pem 4096
```

**Include in server block:**

```nginx
include /etc/nginx/snippets/ssl-params.conf;
```

## Process Management

### PM2 (Recommended)

PM2 provides process management, clustering, and automatic restarts.

#### Installation

```bash
# Install PM2 globally
sudo npm install -g pm2

# Set up PM2 startup script
sudo pm2 startup systemd -u www-data --hp /var/www
```

#### Configuration

Create `ecosystem.config.js` in project root:

```javascript
module.exports = {
  apps: [
    {
      name: 'flashpoint-backend',
      cwd: '/opt/flashpoint-web/backend',
      script: 'dist/server.js',
      instances: 2,  // or 'max' for all CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3100
      },
      error_file: '/opt/flashpoint-web/backend/logs/error.log',
      out_file: '/opt/flashpoint-web/backend/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'flashpoint-game-service',
      cwd: '/opt/flashpoint-web/game-service',
      script: 'dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PROXY_PORT: 22500,
        GAMEZIPSERVER_PORT: 22501
      },
      error_file: '/opt/flashpoint-web/game-service/logs/error.log',
      out_file: '/opt/flashpoint-web/game-service/logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '2G',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
```

#### Start Services

```bash
# Start all apps
sudo pm2 start ecosystem.config.js

# Save PM2 process list
sudo pm2 save

# View status
sudo pm2 status

# View logs
sudo pm2 logs

# Monitor resources
sudo pm2 monit
```

#### PM2 Commands

```bash
# Restart all apps
sudo pm2 restart all

# Reload with zero downtime
sudo pm2 reload all

# Stop all apps
sudo pm2 stop all

# Delete all apps
sudo pm2 delete all

# Show detailed info
sudo pm2 show flashpoint-backend
```

### Systemd Services (Alternative)

#### Backend Service

Create `/etc/systemd/system/flashpoint-backend.service`:

```ini
[Unit]
Description=Flashpoint Web Backend
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/flashpoint-web/backend
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=flashpoint-backend

# Resource limits
LimitNOFILE=65536
MemoryLimit=1G

[Install]
WantedBy=multi-user.target
```

#### Game Service

Create `/etc/systemd/system/flashpoint-game-service.service`:

```ini
[Unit]
Description=Flashpoint Game Service
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/flashpoint-web/game-service
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=flashpoint-game-service

# Resource limits
LimitNOFILE=65536
MemoryLimit=2G

[Install]
WantedBy=multi-user.target
```

#### Enable and Start

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable services
sudo systemctl enable flashpoint-backend
sudo systemctl enable flashpoint-game-service

# Start services
sudo systemctl start flashpoint-backend
sudo systemctl start flashpoint-game-service

# Check status
sudo systemctl status flashpoint-backend
sudo systemctl status flashpoint-game-service

# View logs
sudo journalctl -u flashpoint-backend -f
```

## Load Balancing

### Multiple Backend Instances

**With PM2:**

```javascript
// ecosystem.config.js
instances: 4,  // Run 4 instances
exec_mode: 'cluster'
```

**With systemd:**

Create multiple services on different ports:

```bash
# backend-1 on 3100
# backend-2 on 3002
# backend-3 on 3003
# backend-4 on 3004
```

**Update Nginx upstream:**

```nginx
upstream backend_servers {
    least_conn;
    server 127.0.0.1:3100 weight=1;
    server 127.0.0.1:3002 weight=1;
    server 127.0.0.1:3003 weight=1;
    server 127.0.0.1:3004 weight=1;
    keepalive 64;
}
```

### Session Affinity

For sticky sessions (if needed):

```nginx
upstream backend_servers {
    ip_hash;  # Same client goes to same backend
    server 127.0.0.1:3100;
    server 127.0.0.1:3002;
}
```

### Health Checks

Nginx Plus (commercial) provides active health checks. For Nginx open source, use passive checks:

```nginx
upstream backend_servers {
    server 127.0.0.1:3100 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:3002 max_fails=3 fail_timeout=30s;
}
```

## Caching Strategy

### Nginx Caching

Create `/etc/nginx/conf.d/caching.conf`:

```nginx
# Cache paths
proxy_cache_path /var/cache/nginx/api levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m use_temp_path=off;
proxy_cache_path /var/cache/nginx/images levels=1:2 keys_zone=image_cache:100m max_size=10g inactive=30d use_temp_path=off;

# Cache key
proxy_cache_key "$scheme$request_method$host$request_uri";

# Cache status header
add_header X-Cache-Status $upstream_cache_status;
```

**Use in location blocks:**

```nginx
# Cache API responses
location /api/games {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    proxy_pass http://backend_servers;
}

# Cache images
location /api/images/ {
    proxy_cache image_cache;
    proxy_cache_valid 200 30d;
    proxy_cache_valid 404 1h;
    proxy_pass http://backend_servers;
}
```

### Redis Caching (Backend)

Enable Redis in backend `.env`:

```bash
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Install Redis:**

```bash
# Ubuntu/Debian
sudo apt install redis-server

# Start and enable
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Configure
sudo nano /etc/redis/redis.conf
```

**Redis configuration:**

```conf
# Bind to localhost only
bind 127.0.0.1

# Set max memory
maxmemory 512mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000
```

## Logging and Monitoring

### Application Logging

**Winston configuration (backend):**

```javascript
// backend/src/config/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'flashpoint-backend' },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 10
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760,
      maxFiles: 30
    })
  ]
});
```

### Nginx Logging

**Access log format:**

```nginx
log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                '$status $body_bytes_sent "$http_referer" '
                '"$http_user_agent" "$http_x_forwarded_for" '
                'rt=$request_time uct="$upstream_connect_time" '
                'uht="$upstream_header_time" urt="$upstream_response_time"';

access_log /var/log/nginx/access.log main;
```

### Log Rotation

**Nginx logs (automatic with logrotate):**

```bash
# /etc/logrotate.d/nginx
/var/log/nginx/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
```

**Application logs:**

```bash
# /etc/logrotate.d/flashpoint-web
/opt/flashpoint-web/*/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Monitoring Tools

#### 1. PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Web dashboard
pm2 install pm2-server-monit
```

#### 2. Prometheus + Grafana

**Install Node Exporter:**

```bash
# Download
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz

# Extract and install
tar xvf node_exporter-1.7.0.linux-amd64.tar.gz
sudo cp node_exporter-1.7.0.linux-amd64/node_exporter /usr/local/bin/

# Create systemd service
sudo nano /etc/systemd/system/node_exporter.service
```

**Node Exporter service:**

```ini
[Unit]
Description=Node Exporter
After=network.target

[Service]
Type=simple
User=prometheus
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
```

#### 3. Application Metrics

Add metrics endpoint to backend:

```bash
npm install prom-client
```

```typescript
// backend/src/routes/metrics.ts
import express from 'express';
import { register, collectDefaultMetrics } from 'prom-client';

collectDefaultMetrics();

export const metricsRouter = express.Router();

metricsRouter.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

## Backup Strategy

### Database Backups

**Automated backup script:**

Create `/opt/flashpoint-web/scripts/backup-db.sh`:

```bash
#!/bin/bash
set -e

# Configuration
BACKUP_DIR="/opt/flashpoint-web/backups"
DB_PATH="/opt/flashpoint-web/backend/data/user.db"
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup filename with timestamp
BACKUP_FILE="$BACKUP_DIR/user-db-$(date +%Y%m%d-%H%M%S).db"

# Create backup
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

# Compress backup
gzip "$BACKUP_FILE"

# Remove old backups
find "$BACKUP_DIR" -name "user-db-*.db.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

**Make executable:**

```bash
sudo chmod +x /opt/flashpoint-web/scripts/backup-db.sh
```

**Add to crontab:**

```bash
sudo crontab -e

# Daily backup at 2 AM
0 2 * * * /opt/flashpoint-web/scripts/backup-db.sh
```

### Application Backups

```bash
#!/bin/bash
# Full application backup

BACKUP_DIR="/backups/flashpoint-web"
DATE=$(date +%Y%m%d)

# Create backup
tar -czf "$BACKUP_DIR/flashpoint-web-$DATE.tar.gz" \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='logs' \
  /opt/flashpoint-web

# Keep last 7 backups
find "$BACKUP_DIR" -name "flashpoint-web-*.tar.gz" -mtime +7 -delete
```

### Restore Procedures

**Database restore:**

```bash
# Stop services
sudo pm2 stop all

# Restore from backup
gunzip -c /opt/flashpoint-web/backups/user-db-YYYYMMDD-HHMMSS.db.gz > \
  /opt/flashpoint-web/backend/data/user.db

# Start services
sudo pm2 start all
```

## Maintenance

### Zero-Downtime Deployment

**With PM2:**

```bash
# Deploy new version
cd /opt/flashpoint-web
git pull origin main

# Build
npm run build

# Reload with zero downtime
sudo pm2 reload ecosystem.config.js
```

### Update Dependencies

```bash
# Check outdated packages
npm outdated

# Update all services
cd /opt/flashpoint-web
npm run install:all

# Rebuild
npm run build

# Reload
sudo pm2 reload all
```

### Health Checks

Create monitoring script `/opt/flashpoint-web/scripts/health-check.sh`:

```bash
#!/bin/bash

# Check backend
if ! curl -f http://localhost:3100/health > /dev/null 2>&1; then
  echo "Backend health check failed"
  # Alert or restart
fi

# Check game service
if ! curl -f http://localhost:22500/ > /dev/null 2>&1; then
  echo "Game service health check failed"
fi

# Check Nginx
if ! systemctl is-active --quiet nginx; then
  echo "Nginx is not running"
fi
```

**Add to crontab:**

```bash
*/5 * * * * /opt/flashpoint-web/scripts/health-check.sh
```

### Performance Tuning

**System limits:**

```bash
# /etc/security/limits.conf
www-data soft nofile 65536
www-data hard nofile 65536
```

**Kernel parameters:**

```bash
# /etc/sysctl.conf
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
```

**Apply:**

```bash
sudo sysctl -p
```

## Next Steps

- [Environment Variables](./environment-variables.md) - Complete configuration reference
- [Security Considerations](./security-considerations.md) - Security hardening guide
- [Docker Deployment](./docker-deployment.md) - Container-based deployment
