# Deployment Documentation

Complete deployment guides for Flashpoint Web in development, staging, and production environments.

## Overview

This section provides comprehensive documentation for deploying Flashpoint Web using Docker containers or traditional server deployment methods. It covers production best practices, security hardening, monitoring, and maintenance.

## Quick Links

### Core Deployment Guides

- **[Docker Deployment](./docker-deployment.md)** - Container-based deployment with Docker Compose
- **[Production Setup](./production-setup.md)** - Traditional server deployment with Nginx, PM2, and SSL
- **[Environment Variables](./environment-variables.md)** - Complete environment configuration reference
- **[Security Considerations](./security-considerations.md)** - Production security hardening and best practices

## Deployment Options

### Option 1: Docker Deployment (Recommended)

Best for:
- Quick deployment and updates
- Consistent environments across dev/staging/prod
- Easy scaling and load balancing
- Isolated service containers

**Quick Start:**

```bash
# Set Flashpoint path
export FLASHPOINT_HOST_PATH=/data/flashpoint

# Build and start all services
docker-compose up -d --build

# Access application
open http://localhost
```

See [Docker Deployment](./docker-deployment.md) for complete guide.

### Option 2: Traditional Server Deployment

Best for:
- Existing server infrastructure
- Direct access to Node.js processes
- Custom process management requirements
- Bare metal performance optimization

**Quick Start:**

```bash
# Build all services
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Configure Nginx reverse proxy
sudo cp nginx.conf /etc/nginx/sites-available/flashpoint-web
sudo nginx -t && sudo systemctl reload nginx
```

See [Production Setup](./production-setup.md) for complete guide.

## Documentation Structure

### 1. Docker Deployment

**Topics Covered:**
- Container architecture and service overview
- Volume configuration and persistence
- Network setup and service discovery
- Health checks and monitoring
- Docker Compose configuration
- Multi-stage builds and optimization
- Resource limits and scaling
- Troubleshooting common issues

**Prerequisites:**
- Docker Engine 20.10+
- Docker Compose 2.0+
- Flashpoint Archive installation

### 2. Production Setup

**Topics Covered:**
- System requirements and planning
- Production build process
- Nginx reverse proxy configuration
- SSL/TLS setup with Let's Encrypt
- Process management with PM2 or systemd
- Load balancing strategies
- Caching with Nginx and Redis
- Logging and monitoring setup
- Backup and restore procedures
- Zero-downtime deployment
- Performance tuning

**Prerequisites:**
- Ubuntu 22.04 LTS or similar
- Node.js 20.x LTS
- Nginx 1.24+
- 8GB+ RAM recommended

### 3. Environment Variables

**Topics Covered:**
- Backend environment variables
- Game service configuration
- Frontend build-time variables
- Docker environment setup
- Environment templates for dev/staging/prod
- Validation and defaults
- Security best practices for secrets

**Key Variables:**
- `FLASHPOINT_PATH` - Path to Flashpoint installation
- `JWT_SECRET` - Authentication secret key
- `DOMAIN` - Allowed frontend origins
- Rate limiting configuration
- Redis cache settings
- Logging levels

### 4. Security Considerations

**Topics Covered:**
- Authentication and authorization
- JWT security and secret management
- CORS configuration
- Rate limiting and DDoS protection
- Input validation and sanitization
- SQL injection prevention
- File access security
- HTTP security headers
- SSL/TLS best practices
- Container security hardening
- Network isolation
- Security monitoring and logging
- Data protection and encryption
- Security checklist

**Critical Security Requirements:**
- Strong JWT secret (64+ characters)
- HTTPS in production
- Strict CORS origins
- Rate limiting enabled
- Non-root container execution
- Encrypted backups
- Regular security updates

## Deployment Workflows

### Development Environment

```bash
# Local development (no Docker)
npm run install:all
npm run dev

# Or with Docker
docker-compose -f docker-compose.dev.yml up
```

**Configuration:**
- Hot reload enabled
- Debug logging
- Lenient rate limits
- Local Flashpoint path

### Staging Environment

```bash
# Build for staging
NODE_ENV=staging npm run build

# Deploy with Docker
docker-compose -f docker-compose.staging.yml up -d

# Or with PM2
pm2 start ecosystem.config.js --env staging
```

**Configuration:**
- Production builds
- Moderate rate limits
- SSL certificate (staging)
- Monitoring enabled

### Production Environment

```bash
# Build for production
NODE_ENV=production npm run build

# Deploy with Docker
docker-compose -f docker-compose.prod.yml up -d

# Or with PM2 + Nginx
pm2 start ecosystem.config.js --env production
sudo systemctl reload nginx
```

**Configuration:**
- Optimized builds
- Strict rate limits
- Valid SSL certificate
- Full monitoring and alerting
- Automated backups
- Log rotation

## Infrastructure Requirements

### Minimum Requirements

**Small Deployment (< 100 users):**
- 2 CPU cores
- 4GB RAM
- 50GB storage (SSD recommended)
- 100Mbps network

**Ports Required:**
- 80 (HTTP)
- 443 (HTTPS)
- 3100 (Backend - internal)
- 22500 (Game Proxy - internal)
- 22501 (GameZip - internal)

### Recommended Requirements

**Medium Deployment (100-500 users):**
- 4-8 CPU cores
- 8-16GB RAM
- 500GB SSD storage
- 1Gbps network
- Load balancer (optional)

**Large Deployment (500+ users):**
- 8+ CPU cores
- 16-32GB RAM
- 1TB+ SSD storage
- 10Gbps network
- Load balancer (required)
- Redis cache cluster
- CDN for static assets

### Storage Planning

**Flashpoint Data:**
- Full Archive: ~600GB (as of 2024)
- Partial Collections: 50-200GB
- Growing ~50GB per year

**Application Data:**
- User database: < 100MB
- Logs: ~1GB/month (with rotation)
- Caches: ~1-10GB (configurable)

## Monitoring and Observability

### Essential Metrics

**Application Metrics:**
- Request rate and response times
- Error rates by endpoint
- Authentication success/failure rate
- Active user sessions
- Database query performance

**System Metrics:**
- CPU and memory usage
- Disk I/O and space
- Network bandwidth
- Container health status

**Business Metrics:**
- Active users (DAU/MAU)
- Games played
- Popular platforms
- User engagement

### Monitoring Tools

**Recommended Stack:**
- Prometheus - Metrics collection
- Grafana - Visualization and dashboards
- Loki - Log aggregation
- AlertManager - Alerting
- PM2 Monitor - Process monitoring

**Alternative Options:**
- DataDog
- New Relic
- Sentry (error tracking)
- LogRocket (session replay)

## Scaling Strategies

### Vertical Scaling

**When to scale up:**
- CPU usage consistently > 70%
- Memory usage consistently > 80%
- Disk I/O bottlenecks

**How to scale up:**
```yaml
# Increase container resources
deploy:
  resources:
    limits:
      cpus: '4.0'
      memory: 4G
```

### Horizontal Scaling

**When to scale out:**
- Single instance at capacity
- Need high availability
- Geographic distribution required

**How to scale out:**

```yaml
# Docker Swarm
docker service scale flashpoint-backend=4

# PM2 cluster mode
instances: 4  # or 'max' for all cores
exec_mode: 'cluster'

# Nginx load balancing
upstream backend_servers {
    server backend-1:3100;
    server backend-2:3100;
    server backend-3:3100;
    server backend-4:3100;
}
```

### Caching Strategy

**Multi-Level Caching:**

1. **Browser Cache** - Static assets (1 year)
2. **CDN Cache** - Images, JS, CSS (30 days)
3. **Nginx Cache** - API responses (5 minutes)
4. **Redis Cache** - Database queries (1 hour)
5. **Application Cache** - Computed results (in-memory)

## Maintenance and Updates

### Regular Maintenance Tasks

**Daily:**
- Monitor error logs
- Check disk space
- Verify backups completed

**Weekly:**
- Review security logs
- Check for dependency updates
- Monitor performance trends

**Monthly:**
- Update dependencies (`npm update`)
- Review and rotate logs
- Test disaster recovery
- Security audit

**Quarterly:**
- Rotate JWT secrets
- Update SSL certificates (if not auto-renewed)
- Performance optimization review
- Capacity planning

### Update Procedures

**Zero-Downtime Update (Docker):**

```bash
# Build new images
docker-compose build

# Rolling update
docker-compose up -d --no-deps --build backend

# Verify health
docker-compose ps
```

**Zero-Downtime Update (PM2):**

```bash
# Pull latest code
git pull origin main

# Build
npm run build

# Reload without downtime
pm2 reload ecosystem.config.js
```

## Disaster Recovery

### Backup Strategy

**What to Backup:**
- User database (`user.db`)
- Application configuration files
- SSL certificates and keys
- User-uploaded content (if any)

**Backup Schedule:**
- Database: Daily (automated)
- Configuration: On change
- Full system: Weekly

**Backup Storage:**
- Local: Last 7 days
- Off-site: Last 30 days
- Archive: Yearly snapshots

### Recovery Procedures

**Database Restore:**

```bash
# Stop services
pm2 stop all

# Restore database
gunzip -c backup.db.gz > /opt/flashpoint-web/backend/data/user.db

# Start services
pm2 start all
```

**Full System Restore:**

```bash
# Restore from backup
tar -xzf flashpoint-web-backup.tar.gz -C /opt/

# Restore database
gunzip -c user-db-backup.db.gz > /opt/flashpoint-web/backend/data/user.db

# Rebuild and start
cd /opt/flashpoint-web
npm run build
pm2 start ecosystem.config.js
```

## Troubleshooting

### Common Issues

**Issue: Services won't start**
- Check Flashpoint path is correct and accessible
- Verify environment variables are set
- Check port availability
- Review error logs

**Issue: Games won't load**
- Verify game-service is running
- Check game file paths in database
- Test proxy endpoints directly
- Review CORS configuration

**Issue: High CPU usage**
- Check for database query performance issues
- Review rate limiting settings
- Consider caching optimization
- Scale horizontally if needed

**Issue: Database locked errors**
- Close Flashpoint Launcher (locks flashpoint.sqlite)
- Check for long-running queries
- Increase busy timeout setting

### Getting Help

**Resources:**
- [Project Documentation](../README.md)
- [Architecture Overview](../02-architecture/system-architecture.md)
- [API Reference](../03-backend/api-routes.md)
- [GitHub Issues](https://github.com/your-repo/issues)

**Support Channels:**
- GitHub Discussions
- Discord Server
- Email Support

## Next Steps

After completing deployment:

1. **Configure monitoring** - Set up Prometheus/Grafana
2. **Enable backups** - Automated daily backups
3. **Security hardening** - Follow [Security Considerations](./security-considerations.md)
4. **Performance tuning** - Optimize based on load
5. **Set up CI/CD** - Automated testing and deployment
6. **Create runbooks** - Document incident response procedures
7. **User training** - Admin and user documentation

## Feedback and Contributions

Found an issue or have suggestions for improving these deployment guides?

- Submit an issue on GitHub
- Create a pull request with improvements
- Share your deployment experience
- Contribute production tips and tricks

---

**Last Updated:** 2026-01-18
**Version:** 1.0.0
**Maintainer:** Flashpoint Web Team
