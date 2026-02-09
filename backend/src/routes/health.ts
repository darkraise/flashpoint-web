import { Router } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { UserDatabaseService } from '../services/UserDatabaseService';
import { GameSearchCache } from '../services/GameSearchCache';
import { config } from '../config';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

// A simpler /health endpoint also exists for load balancer checks (registered before middleware)
router.get('/', (req, res) => {
  const isHealthy = DatabaseService.isConnected() && UserDatabaseService.isConnected();

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
  });
});

router.get(
  '/detailed',
  authenticate,
  requirePermission('settings.view'),
  asyncHandler(async (req, res) => {
    const startTime = performance.now();

    let flashpointDbStatus: 'connected' | 'error' = 'error';
    let flashpointDbError: string | null = null;
    let flashpointDbRecordCount = 0;

    try {
      if (DatabaseService.isConnected()) {
        const result = DatabaseService.get('SELECT COUNT(*) as count FROM game', []) as {
          count: number;
        } | null;
        flashpointDbRecordCount = result?.count || 0;
        flashpointDbStatus = 'connected';
      }
    } catch (error) {
      flashpointDbStatus = 'error';
      flashpointDbError = error instanceof Error ? error.message : String(error);
    }

    let userDbStatus: 'connected' | 'error' = 'error';
    let userDbError: string | null = null;
    let userCount = 0;

    try {
      if (UserDatabaseService.isConnected()) {
        const result = UserDatabaseService.get('SELECT COUNT(*) as count FROM users', []) as {
          count: number;
        } | null;
        userCount = result?.count || 0;
        userDbStatus = 'connected';
      }
    } catch (error) {
      userDbStatus = 'error';
      userDbError = error instanceof Error ? error.message : String(error);
    }

    const permissionCacheStats = {
      enabled: true,
      ttl: '5 minutes',
    };

    const gameSearchCacheStats = GameSearchCache.getStats();

    const uptimeSeconds = Math.floor(process.uptime());
    const uptimeFormatted = formatUptime(uptimeSeconds);

    const memoryUsage = process.memoryUsage();
    const memoryFormatted = {
      rss: formatBytes(memoryUsage.rss),
      heapUsed: formatBytes(memoryUsage.heapUsed),
      heapTotal: formatBytes(memoryUsage.heapTotal),
      external: formatBytes(memoryUsage.external),
    };

    const healthCheckTime = Math.round(performance.now() - startTime);

    const isHealthy = flashpointDbStatus === 'connected' && userDbStatus === 'connected';

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: uptimeSeconds,
        formatted: uptimeFormatted,
      },
      databases: {
        flashpoint: {
          status: flashpointDbStatus,
          path: config.flashpointDbPath,
          gameCount: flashpointDbRecordCount,
          error: flashpointDbError,
        },
        user: {
          status: userDbStatus,
          userCount,
          error: userDbError,
        },
      },
      caches: {
        permissions: permissionCacheStats,
        gameSearch: {
          size: gameSearchCacheStats.primary.size,
          max: gameSearchCacheStats.primary.max,
          ttl: '5 minutes',
          hitRate: gameSearchCacheStats.primary.size > 0 ? 'active' : 'idle',
        },
      },
      memory: memoryFormatted,
      environment: {
        nodeEnv: config.nodeEnv,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      services: {
        gameService: {
          status: 'integrated',
          routes: ['/game-proxy/*', '/game-zip/*'],
        },
      },
      healthCheckDuration: `${healthCheckTime}ms`,
    });
  })
);

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
