# Deployment Documentation

Complete deployment guides for Flashpoint Web in development, staging, and production environments.

## Quick Links

- **[Docker Deployment](./docker-deployment.md)** - Container-based deployment with Docker Compose
- **[Environment Variables](./environment-variables.md)** - Complete environment configuration reference
- **[Health Checks](./health-checks.md)** - Health check setup and monitoring
- **[Security Considerations](./security-considerations.md)** - Production security hardening and best practices

## Deployment Options

### Docker Deployment (Recommended)

Best for quick deployment, consistent environments, easy scaling, and isolated service containers.

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

## Development Workflows

### Local Development

```bash
# Install and run all services
npm run install:all
npm run dev
```

Configuration: Hot reload, debug logging, lenient rate limits, local Flashpoint path.

### Staging Deployment

```bash
# Build for staging
NODE_ENV=staging npm run build

# Deploy with Docker
docker-compose -f docker-compose.staging.yml up -d
```

### Production Deployment

```bash
# Build for production
NODE_ENV=production npm run build

# Deploy with Docker
docker-compose -f docker-compose.prod.yml up -d
```

Configuration: Optimized builds, strict rate limits, valid SSL certificate, full monitoring and alerting, automated backups, log rotation.

## Infrastructure Overview

**Minimum (< 100 users):**
- 2 CPU cores, 4GB RAM, 50GB storage
- Ports: 80, 443 (public); 3100, 22500, 22501 (internal)

**Recommended (100-500 users):**
- 4-8 CPU cores, 8-16GB RAM, 500GB SSD storage

**Large (500+ users):**
- 8+ CPU cores, 16-32GB RAM, 1TB+ SSD storage, load balancer, Redis cache, CDN

**Storage Planning:**
- Full Flashpoint Archive: ~600GB
- User database: < 100MB
- Application logs: ~1GB/month

## Next Steps

After deployment:

1. Configure monitoring with [Health Checks](./health-checks.md)
2. Review [Security Considerations](./security-considerations.md)
3. Set up automated backups
4. Enable rate limiting and CORS
5. Configure log rotation
6. Implement CI/CD pipeline

## Related Documentation

- [API Reference](../06-api-reference/README.md) - Complete API endpoints
- [Architecture Overview](../02-architecture/system-architecture.md) - System design
- [Common Pitfalls](../08-development/common-pitfalls.md) - Troubleshooting
