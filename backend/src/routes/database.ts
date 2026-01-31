import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { logActivity } from '../middleware/activityLogger';
import { logger } from '../utils/logger';

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
  async (req: Request, res: Response) => {
  try {
    logger.info('Manual database reload requested');

    await DatabaseService.reload();

    res.json({
      success: true,
      message: 'Database reloaded successfully from disk'
    });
  } catch (error) {
    logger.error('Manual database reload failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  }
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
  async (req: Request, res: Response) => {
  try {
    const fs = require('fs');
    const { config } = require('../config');

    const isConnected = DatabaseService.isConnected();
    const stats = fs.statSync(config.flashpointDbPath);

    res.json({
      success: true,
      connected: isConnected,
      dbPath: config.flashpointDbPath,
      fileSizeBytes: stats.size,
      fileSizeMB: (stats.size / (1024 * 1024)).toFixed(2),
      lastModified: stats.mtime.toISOString()
    });
  } catch (error) {
    logger.error('Error getting database status:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  }
);

export default router;
