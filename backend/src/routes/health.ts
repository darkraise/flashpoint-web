import { Router } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { UserDatabaseService } from '../services/UserDatabaseService';
import { GameSearchCache } from '../services/GameSearchCache';
import { config } from '../config';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

/**
 * GET /api/health
 * Basic health check - publicly accessible
 * Returns minimal status information
 */
router.get('/', (req, res) => {
  const isHealthy = DatabaseService.isConnected() && UserDatabaseService.isConnected();

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/health/detailed
 * Detailed health check - requires authentication and admin permissions
 * Returns comprehensive system status including database connections, cache stats, and uptime
 */
router.get(
  '/detailed',
  authenticate,
  requirePermission('settings.view'),
  asyncHandler(async (req, res) => {
    const startTime = performance.now();

    // Check Flashpoint database connection
    let flashpointDbStatus: 'connected' | 'error' = 'error';
    let flashpointDbError: string | null = null;
    let flashpointDbRecordCount = 0;

    try {
      if (DatabaseService.isConnected()) {
        // Test query to verify database is accessible
        const result = DatabaseService.get('SELECT COUNT(*) as count FROM game', []) as { count: number } | null;
        flashpointDbRecordCount = result?.count || 0;
        flashpointDbStatus = 'connected';
      }
    } catch (error) {
      flashpointDbStatus = 'error';
      flashpointDbError = error instanceof Error ? error.message : String(error);
    }

    // Check User database connection
    let userDbStatus: 'connected' | 'error' = 'error';
    let userDbError: string | null = null;
    let userCount = 0;

    try {
      if (UserDatabaseService.isConnected()) {
        // Test query to verify database is accessible
        const result = UserDatabaseService.get('SELECT COUNT(*) as count FROM users', []) as { count: number } | null;
        userCount = result?.count || 0;
        userDbStatus = 'connected';
      }
    } catch (error) {
      userDbStatus = 'error';
      userDbError = error instanceof Error ? error.message : String(error);
    }

    // Get cache statistics
    const permissionCacheStats = {
      enabled: true,
      ttl: '5 minutes',
      // Note: PermissionCache doesn't expose size, just that it's active
    };

    const gameSearchCacheStats = GameSearchCache.getStats();

    // Calculate uptime
    const uptimeSeconds = Math.floor(process.uptime());
    const uptimeFormatted = formatUptime(uptimeSeconds);

    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const memoryFormatted = {
      rss: formatBytes(memoryUsage.rss),
      heapUsed: formatBytes(memoryUsage.heapUsed),
      heapTotal: formatBytes(memoryUsage.heapTotal),
      external: formatBytes(memoryUsage.external)
    };

    const healthCheckTime = Math.round(performance.now() - startTime);

    // Determine overall health status
    const isHealthy = flashpointDbStatus === 'connected' && userDbStatus === 'connected';

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: uptimeSeconds,
        formatted: uptimeFormatted
      },
      databases: {
        flashpoint: {
          status: flashpointDbStatus,
          path: config.flashpointDbPath,
          gameCount: flashpointDbRecordCount,
          error: flashpointDbError
        },
        user: {
          status: userDbStatus,
          userCount,
          error: userDbError
        }
      },
      caches: {
        permissions: permissionCacheStats,
        gameSearch: {
          size: gameSearchCacheStats.primary.size,
          max: gameSearchCacheStats.primary.max,
          ttl: '5 minutes',
          hitRate: gameSearchCacheStats.primary.size > 0 ? 'active' : 'idle'
        }
      },
      memory: memoryFormatted,
      environment: {
        nodeEnv: config.nodeEnv,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      },
      services: {
        gameService: {
          proxyUrl: config.gameServerUrl || 'http://localhost:22500',
          gameZipPort: config.gameServerHttpPort || 22501
        }
      },
      healthCheckDuration: `${healthCheckTime}ms`
    });
  })
);

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

/**
 * Format bytes in human-readable format
 */
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

export default router;
