import { Router, Request, Response } from 'express';
import fs from 'fs';
import { DatabaseService } from '../services/DatabaseService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { logActivity } from '../middleware/activityLogger';
import { asyncHandler } from '../middleware/asyncHandler';
import { logger } from '../utils/logger';
import { config } from '../config';

const router = Router();

/**
 * POST /api/database/reload
 * Manually reload database from disk
 *
 * Useful when Flashpoint Launcher has updated the database
 * and you want to see changes immediately without waiting
 * for the automatic file watcher.
 *
 * Requires: Admin permission (settings.update)
 *
 * Responses:
 * - 200: Database reloaded successfully
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 500: Failed to reload database
 */
router.post(
  '/reload',
  authenticate,
  requirePermission('settings.update'),
  logActivity('database.reload', 'database'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      logger.info('Manual database reload requested');

      await DatabaseService.reload();

      res.json({
        success: true,
        message: 'Database reloaded successfully from disk',
      });
    } catch (error) {
      logger.error('Manual database reload failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reload database',
      });
    }
  })
);

/**
 * GET /api/database/status
 * Get database connection status and file info
 *
 * Returns information about the database connection,
 * file size, and last modification time.
 *
 * Requires: Admin permission (settings.update)
 *
 * Responses:
 * - 200: Status information
 * - 401: Not authenticated
 * - 403: Insufficient permissions
 * - 500: Error getting status
 */
router.get(
  '/status',
  authenticate,
  requirePermission('settings.update'),
  logActivity('database.status', 'database'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const isConnected = DatabaseService.isConnected();
      const stats = fs.statSync(config.flashpointDbPath);

      res.json({
        success: true,
        connected: isConnected,
        fileSizeBytes: stats.size,
        fileSizeMB: (stats.size / (1024 * 1024)).toFixed(2),
        lastModified: stats.mtime.toISOString(),
      });
    } catch (error) {
      logger.error('Error getting database status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get database status',
      });
    }
  })
);

export default router;
