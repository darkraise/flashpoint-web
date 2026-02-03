# Health Checks Configuration

Docker container health checks for Flashpoint Web services.

## Health Check Configuration

All services include wget-based health checks in docker-compose files.

**Backend Service:**

```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3100/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

Response:
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

**Frontend Service (Nginx):**

```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/"]
  interval: 30s
  timeout: 3s
  retries: 3
  start_period: 10s
```

**Game Service:**

```yaml
healthcheck:
  test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:22500/"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 30s
```

## Check Health Status

```bash
# View health status
docker-compose ps

# Detailed health check logs
docker inspect flashpoint-backend --format='{{json .State.Health}}' | jq

# Manual test (from host)
curl http://localhost:3100/api/health

# Manual test (from inside container)
docker-compose exec backend wget --quiet --tries=1 --spider http://localhost:3100/api/health
echo $?  # 0 = success, non-zero = failure
```

## Monitoring Health in Real-Time

```bash
# Watch health status updates
watch -n 2 'docker-compose ps'

# Docker stats with status
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.Status}}"
```

## Service Dependencies

Startup order controlled by health checks:

```yaml
frontend:
  depends_on:
    backend:
      condition: service_healthy

backend:
  depends_on:
    game-service:
      condition: service_healthy
```

**Sequence:**
1. Game Service → health check → healthy (30s)
2. Backend → health check → healthy (40s)
3. Frontend → health check → healthy (10s)

## Troubleshooting

**Container Marked Unhealthy:**

```bash
# Check logs
docker-compose logs backend

# View health history
docker inspect flashpoint-backend --format='{{range .State.Health.Log}}{{.ExitCode}} {{.Output}}{{end}}'
```

**Health Check Keeps Failing:**

1. **Service not fully started**: Increase `start_period`
   ```yaml
   healthcheck:
     start_period: 60s
   ```

2. **Database issues**: Verify flashpoint.sqlite exists and is readable
   ```bash
   docker-compose exec backend ls -la /data/flashpoint/Data/flashpoint.sqlite
   ```

3. **Port conflicts**: Ensure ports are available
   ```bash
   netstat -tulpn | grep -E '(3100|80|22500|22501)'
   ```

4. **Resource constraints**: Check memory usage
   ```bash
   docker stats
   ```

**Adjust timing for slow systems:**

```yaml
healthcheck:
  interval: 60s      # Check less frequently
  timeout: 30s       # Allow more time
  retries: 5         # More retries
  start_period: 90s  # Longer grace period
```

## Integration with Orchestrators

**Docker Swarm:**

```bash
docker service create \
  --health-cmd "wget --quiet --tries=1 --spider http://localhost/" \
  --health-interval 30s \
  flashpoint-frontend:latest
```

**Kubernetes (convert to liveness/readiness probes):**

```yaml
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

## Best Practices

1. Use appropriate timeouts (Frontend: 3s, Backend/Game: 10s)
2. Set realistic start periods (account for initialization time)
3. Don't over-check (30s interval is sufficient)
4. Keep health checks in docker-compose files (not Dockerfiles)
5. Monitor for persistent failures with alerts

## References

- [Docker Health Check Documentation](https://docs.docker.com/engine/reference/builder/#healthcheck)
- Backend health endpoint: `backend/src/routes/health.ts`
