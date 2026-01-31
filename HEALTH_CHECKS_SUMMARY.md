# Health Checks Summary

**Date:** 2026-01-31
**Status:** ✅ All services now have simplified health checks

## Overview

All three services in the Flashpoint Web application now have comprehensive health checks configured in both `docker-compose.yml` and `docker-compose.prod.yml` using simple `wget` commands.

**Architecture:**
- Health checks defined **only in docker-compose files** (not in Dockerfiles)
- All services use `wget` for lightweight, portable health checking
- Alpine Linux base images include `wget` by default

## Health Check Configuration

| Service | Endpoint | Interval | Timeout | Retries | Start Period | Method |
|---------|----------|----------|---------|---------|--------------|--------|
| **Backend** | `/api/health` | 30s | 10s | 3 | 40s | wget spider |
| **Frontend** | `/` | 30s | 3s | 3 | 10s | wget spider |
| **Game Service** | `/` | 30s | 10s | 3 | 30s | wget spider |

## Implementation Details

### Backend Service
```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3100/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

**What it checks:**
- API server is responding on port 3100
- Health endpoint returns successfully
- Database connections (flashpoint.sqlite and user.db) are working
- Game service connectivity is verified
- Returns exit code 0 for success (HTTP 200), non-zero for failure

### Frontend Service
```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/"]
  interval: 30s
  timeout: 3s
  retries: 3
  start_period: 10s
```

**What it checks:**
- Nginx is running and responding on port 80
- Static files are accessible
- Returns exit code 0 for success, non-zero for failure

### Game Service
```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:22500/"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 30s
```

**What it checks:**
- Proxy server is responding on port 22500
- Service can handle HTTP requests
- Returns exit code 0 for success, non-zero for failure

## Service Dependencies

Health checks enable proper startup ordering:

```
Game Service (starts first)
    ↓ (waits for healthy)
Backend (starts second)
    ↓ (waits for healthy)
Frontend (starts last)
```

**Configuration:**
```yaml
backend:
  depends_on:
    game-service:
      condition: service_healthy  # ✅ Waits for game-service to be healthy

frontend:
  depends_on:
    backend:
      condition: service_healthy  # ✅ Waits for backend to be healthy
```

## Benefits

### 1. Reliable Startup
- Services start in correct order
- Frontend only starts after backend is ready
- Backend only starts after game-service is ready

### 2. Automatic Recovery
- Docker automatically restarts unhealthy containers
- Failed services are detected and restarted

### 3. Load Balancer Integration
- Health checks inform load balancers which containers are ready
- Unhealthy containers are removed from rotation

### 4. Monitoring
- Easy to monitor service health with `docker-compose ps`
- Integration with monitoring tools (Prometheus, Grafana)

## Monitoring Commands

### Check Health Status
```bash
# View status of all services
docker-compose ps

# Output:
NAME                    STATUS
flashpoint-backend      Up (healthy)
flashpoint-frontend     Up (healthy)
flashpoint-game-service Up (healthy)
```

### Detailed Health Information
```bash
# Backend health details
docker inspect flashpoint-backend --format='{{json .State.Health}}' | jq

# Frontend health details
docker inspect flashpoint-frontend --format='{{json .State.Health}}' | jq

# Game service health details
docker inspect flashpoint-game-service --format='{{json .State.Health}}' | jq
```

### Watch Health Status
```bash
# Real-time monitoring
watch -n 2 'docker-compose ps'

# Or
docker stats --format "table {{.Name}}\t{{.Status}}\t{{.MemUsage}}"
```

## Troubleshooting

### Container Shows "unhealthy"

**1. Check logs:**
```bash
docker-compose logs <service-name>
```

**2. Manual health check:**
```bash
# Backend
curl http://localhost:3100/api/health

# Frontend
curl http://localhost/

# Game Service
curl http://localhost:22500/
```

**3. Check health history:**
```bash
docker inspect <container-name> --format='{{range .State.Health.Log}}{{.ExitCode}} {{.Output}}{{end}}'
```

### Slow Health Checks

If services take longer to start on your system:

```yaml
healthcheck:
  interval: 60s      # Check less frequently
  timeout: 30s       # More time to respond
  start_period: 90s  # Longer grace period
```

## Verification

### Test Health Checks

```bash
# 1. Start services
docker-compose up -d

# 2. Wait for services to become healthy (max 40s for backend)
sleep 45

# 3. Check all are healthy
docker-compose ps

# 4. Verify health endpoints
curl http://localhost:3100/api/health  # Should return JSON
curl -I http://localhost/               # Should return 200
curl -I http://localhost:22500/         # Should return response
```

### Expected Output
```bash
$ docker-compose ps
NAME                    COMMAND                  SERVICE         STATUS              PORTS
flashpoint-backend      "docker-entrypoint.s…"   backend         Up (healthy)        0.0.0.0:3100->3100/tcp
flashpoint-frontend     "/docker-entrypoint.…"   frontend        Up (healthy)        0.0.0.0:80->80/tcp
flashpoint-game-service "docker-entrypoint.s…"   game-service    Up (healthy)        0.0.0.0:22500-22501->22500-22501/tcp
```

## Production Considerations

### 1. Health Check Frequency
- Development: 30s interval (default)
- Production: 30s-60s interval (balanced)
- High-traffic: 15s-30s interval (faster detection)

### 2. Timeout Settings
- Fast services (frontend): 3s
- Database services (backend): 10s
- File I/O services (game-service): 10s

### 3. Start Period
- Simple services: 10s
- Complex initialization: 40s+
- Database migrations: 60s+

### 4. Integration with Orchestrators

**Docker Swarm:**
```bash
docker service create \
  --replicas 3 \
  --health-cmd "wget --spider http://localhost/" \
  --health-interval 30s \
  flashpoint-frontend:latest
```

**Kubernetes:**
```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 3100
  initialDelaySeconds: 40
  periodSeconds: 30
```

## Changes Made

### docker-compose.yml
- ✅ All services now use simplified wget health checks
- ✅ Backend: Uses wget spider mode
- ✅ Frontend: Uses wget spider mode
- ✅ Game service: Uses wget spider mode

### docker-compose.prod.yml
- ✅ All services now use simplified wget health checks
- ✅ Backend: Uses wget spider mode
- ✅ Frontend: Uses wget spider mode
- ✅ Game service: Uses wget spider mode

### All Dockerfiles
- ✅ Removed HEALTHCHECK instructions from all Dockerfiles
- ✅ Health checks now defined only in docker-compose files
- ✅ Centralizes health check configuration
- ✅ Easier to adjust without rebuilding images

## Documentation

Complete health check documentation available at:
- `docs/09-deployment/health-checks.md`

## Next Steps

1. **Monitor in Production**
   - Set up alerts for unhealthy containers
   - Track health check metrics
   - Monitor restart frequency

2. **Fine-tune Timings**
   - Adjust based on actual startup times
   - Optimize for your infrastructure

3. **Add Custom Checks**
   - Extend `/api/health` endpoint with more checks
   - Add database query tests
   - Check external dependencies

4. **Implement Circuit Breakers**
   - Prevent cascading failures
   - Graceful degradation

## Summary

✅ **All services now have health checks configured**
- Backend: Checks API health endpoint
- Frontend: Checks Nginx availability
- Game Service: Checks proxy server

✅ **Proper service dependencies**
- Frontend waits for healthy backend
- Backend waits for healthy game-service

✅ **Production-ready configuration**
- Appropriate timeouts for each service
- Sensible retry policies
- Sufficient grace periods

Health checks ensure reliable container orchestration and make the deployment production-ready! 🎉
