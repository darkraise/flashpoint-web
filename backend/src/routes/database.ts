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

// Manually trigger reload when changes need to be visible before the file watcher fires
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
