# Health Checks Configuration

Complete reference for Docker container health checks in Flashpoint Web.

## Overview

All three services (backend, frontend, game-service) implement health checks to ensure containers are running correctly and ready to serve traffic.

**Architecture:**
- Health checks are defined **only in docker-compose files** (not in Dockerfiles)
- All services use simple `wget` commands for lightweight, portable health checking
- Alpine Linux base images include `wget` by default

## Health Check Configuration

### Backend Service

**Endpoint:** `http://localhost:3100/api/health`

**Configuration:**
```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3100/api/health"]
  interval: 30s      # Check every 30 seconds
  timeout: 10s       # Wait up to 10 seconds for response
  retries: 3         # Mark unhealthy after 3 consecutive failures
  start_period: 40s  # Grace period before health checks start
```

**How it works:**
- Uses `wget` in spider mode (doesn't download content)
- Checks if backend API health endpoint responds
- Returns exit code 0 for success (HTTP 200), non-zero for failure

**Health Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-30T12:00:00.000Z",
  "uptime": 3600,
  "database": {
    "flashpoint": "connected",
    "user": "connected"
  },
  "gameService": {
    "proxy": "reachable",
    "gamezip": "reachable"
  }
}
```

### Frontend Service (Nginx)

**Endpoint:** `http://localhost/`

**Configuration:**
```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/"]
  interval: 30s      # Check every 30 seconds
  timeout: 3s        # Wait up to 3 seconds for response
  retries: 3         # Mark unhealthy after 3 consecutive failures
  start_period: 10s  # Grace period before health checks start
```

**How it works:**
- Uses `wget` in spider mode (doesn't download content)
- Checks if Nginx responds on port 80
- Fast and lightweight check

### Game Service

**Endpoint:** `http://localhost:22500/`

**Configuration:**
```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:22500/"]
  interval: 30s      # Check every 30 seconds
  timeout: 10s       # Wait up to 10 seconds for response
  retries: 3         # Mark unhealthy after 3 consecutive failures
  start_period: 30s  # Grace period before health checks start
```

**How it works:**
- Uses `wget` in spider mode (doesn't download content)
- Checks if game service proxy responds on port 22500
- Returns exit code 0 for success, non-zero for failure

## Monitoring Health Status

### Check Health Status

```bash
# All services
docker-compose ps

# Output shows health status:
# NAME                    STATUS
# flashpoint-backend      Up (healthy)
# flashpoint-frontend     Up (healthy)
# flashpoint-game-service Up (healthy)
```

### View Health Check Logs

```bash
# Inspect health check details
docker inspect flashpoint-backend --format='{{json .State.Health}}' | jq

# Output:
{
  "Status": "healthy",
  "FailingStreak": 0,
  "Log": [
    {
      "Start": "2026-01-30T12:00:00Z",
      "End": "2026-01-30T12:00:01Z",
      "ExitCode": 0,
      "Output": ""
    }
  ]
}
```

### Monitor Health in Real-Time

```bash
# Watch health status updates
watch -n 2 'docker-compose ps'

# Or using docker stats
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.Status}}"
```

## Service Dependencies

Health checks enable proper service startup ordering:

```yaml
# Frontend waits for healthy backend
frontend:
  depends_on:
    backend:
      condition: service_healthy

# Backend waits for healthy game-service
backend:
  depends_on:
    game-service:
      condition: service_healthy
```

**Startup order:**
1. Game Service starts → waits 30s → health check begins → becomes healthy
2. Backend starts → waits 40s → health check begins → becomes healthy
3. Frontend starts → waits 10s → health check begins → becomes healthy

## Troubleshooting

### Container Marked Unhealthy

**Symptoms:**
```bash
docker-compose ps
# NAME                    STATUS
# flashpoint-backend      Up (unhealthy)
```

**Debug Steps:**

1. **Check logs:**
   ```bash
   docker-compose logs backend
   ```

2. **Manual health check:**
   ```bash
   # Backend
   docker-compose exec backend wget --quiet --tries=1 --spider http://localhost:3100/api/health
   echo $?  # 0 = success, non-zero = failure

   # Frontend
   docker-compose exec frontend wget --quiet --tries=1 --spider http://localhost/
   echo $?

   # Game Service
   docker-compose exec game-service wget --quiet --tries=1 --spider http://localhost:22500/
   echo $?
   ```

3. **Check health endpoint directly:**
   ```bash
   # From host machine (use curl for detailed output)
   curl http://localhost:3100/api/health
   ```

4. **View health check history:**
   ```bash
   docker inspect flashpoint-backend --format='{{range .State.Health.Log}}{{.ExitCode}} {{.Output}}{{end}}'
   ```

### Health Check Keeps Failing

**Common Causes:**

1. **Service not fully started**
   - Solution: Increase `start_period`
   ```yaml
   healthcheck:
     start_period: 60s  # Give more time to start
   ```

2. **Database connection issues**
   - Check FLASHPOINT_PATH is correct
   - Verify flashpoint.sqlite exists and is readable

3. **Port conflicts**
   - Ensure ports 3100, 80, 22500, 22501 are available
   - Check with: `netstat -tulpn | grep -E '(3100|80|22500|22501)'`

4. **Resource constraints**
   - Container may be OOM killed
   - Check: `docker stats`
   - Increase memory limits if needed

### Adjust Health Check Timing

For slower systems or large databases:

```yaml
healthcheck:
  interval: 60s      # Check less frequently
  timeout: 30s       # Allow more time for response
  retries: 5         # More retries before marking unhealthy
  start_period: 90s  # Longer grace period
```

## Integration with Orchestrators

### Docker Swarm

Health checks work automatically:

```bash
docker service create \
  --replicas 3 \
  --health-cmd "wget --quiet --tries=1 --spider http://localhost/" \
  --health-interval 30s \
  flashpoint-frontend:latest
```

### Kubernetes

Convert to Kubernetes liveness/readiness probes:

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: backend
    livenessProbe:
      httpGet:
        path: /api/health
        port: 3100
      initialDelaySeconds: 40
      periodSeconds: 30
      timeoutSeconds: 10
      failureThreshold: 3
    readinessProbe:
      httpGet:
        path: /api/health
        port: 3100
      initialDelaySeconds: 10
      periodSeconds: 5
```

## Health Check Metrics

### Using Prometheus

Expose health metrics:

```yaml
# In docker-compose.yml
services:
  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  node-exporter:
    image: prom/node-exporter
    ports:
      - "9100:9100"
```

Query health status:
```promql
up{job="flashpoint-backend"} == 1
```

### Using Grafana

Visualize health status over time:

```json
{
  "panels": [
    {
      "title": "Service Health Status",
      "targets": [
        {
          "expr": "up{job=~\"flashpoint.*\"}"
        }
      ]
    }
  ]
}
```

## Best Practices

1. **Use appropriate timeouts**
   - Frontend: 3s (Nginx is fast)
   - Backend: 10s (database queries)
   - Game Service: 10s (may need to read from disk)

2. **Set realistic start periods**
   - Consider application initialization time
   - Database migrations
   - Cache warming

3. **Don't over-check**
   - 30s interval is usually sufficient
   - Too frequent checks waste resources

4. **Monitor health check failures**
   - Set up alerts for unhealthy containers
   - Log health check failures

5. **Test health checks**
   - Verify health endpoints return quickly
   - Ensure checks don't cause resource spikes

6. **Keep health checks in docker-compose only**
   - Don't use HEALTHCHECK in Dockerfiles
   - Centralize health check configuration in compose files
   - Easier to adjust without rebuilding images

## References

- [Docker Health Check Documentation](https://docs.docker.com/engine/reference/builder/#healthcheck)
- [Compose Health Check Specification](https://docs.docker.com/compose/compose-file/05-services/#healthcheck)
- Backend API: `backend/src/routes/health.ts`
