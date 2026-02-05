import { Router } from 'express';
import { updateService } from '../services/UpdateService';
import { MetadataUpdateService } from '../services/MetadataUpdateService';
import { MetadataSyncService } from '../services/MetadataSyncService';
import { SyncStatusService } from '../services/SyncStatusService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { logActivity } from '../middleware/activityLogger';
import { asyncHandler } from '../middleware/asyncHandler';
import { logger } from '../utils/logger';

const router = Router();
const metadataUpdateService = new MetadataUpdateService();
const metadataSyncService = new MetadataSyncService();

/**
 * GET /api/updates/check
 * Check for available updates
 */
router.get(
  '/check',
  asyncHandler(async (req, res) => {
    logger.info('[Updates API] Checking for updates...');
    const updateInfo = await updateService.checkForUpdates();
    res.json(updateInfo);
  })
);

/**
 * POST /api/updates/install
 * Install available updates
 *
 * Requires: Admin permission (settings.update)
 */
router.post(
  '/install',
  authenticate,
  requirePermission('settings.update'),
  logActivity('updates.install', 'system'),
  asyncHandler(async (req, res) => {
    logger.info(`[Updates API] Installing updates (requested by ${req.user?.username})...`);
    const result = await updateService.installUpdates();
    res.json(result);
  })
);

/**
 * GET /api/updates/system-info
 * Get system information for debugging
 *
 * Requires: Admin permission (settings.update)
 */
router.get(
  '/system-info',
  authenticate,
  requirePermission('settings.update'),
  logActivity('updates.system_info', 'system'),
  asyncHandler(async (req, res) => {
    const systemInfo = await updateService.getSystemInfo();
    res.json(systemInfo);
  })
);

/**
 * GET /api/updates/metadata
 * Check for game metadata updates (like Flashpoint Launcher)
 * Returns info about game database updates from FPFSS
 * Includes edition info so frontend knows whether sync is available
 */
router.get(
  '/metadata',
  asyncHandler(async (req, res) => {
    const edition = metadataUpdateService.getEdition();
    logger.info(`[Updates API] Checking for metadata updates... (edition: ${edition})`);
    const metadataInfo = await metadataUpdateService.getMetadataUpdateInfo();
    res.json({ ...metadataInfo, edition });
  })
);

/**
 * POST /api/updates/metadata/sync
 * Start metadata sync in background (non-blocking)
 * Returns immediately with sync started status
 * Frontend should poll /api/updates/metadata/sync/status for progress
 *
 * Requires: Admin permission (settings.update)
 */
router.post(
  '/metadata/sync',
  authenticate,
  requirePermission('settings.update'),
  logActivity('updates.metadata_sync', 'system'),
  asyncHandler(async (req, res) => {
    const syncStatus = SyncStatusService.getInstance();

    // Check if sync is already running
    if (syncStatus.isRunning()) {
      return res.status(409).json({
        success: false,
        error: 'Sync already in progress',
        status: syncStatus.getStatus(),
      });
    }

    logger.info(
      `[Updates API] Starting metadata sync in background (requested by ${req.user?.username})...`
    );

    // Start sync in background (don't await - let it run async)
    metadataSyncService.syncMetadata().catch((error) => {
      logger.error('[Updates API] Background sync error:', error);
    });

    // Return immediately
    res.json({
      success: true,
      message: 'Sync started',
      status: syncStatus.getStatus(),
    });
  })
);

/**
 * GET /api/updates/metadata/sync/status
 * Get current metadata sync status and progress
 * Frontend polls this endpoint to get real-time updates
 */
router.get('/metadata/sync/status', (req, res) => {
  try {
    const syncStatus = SyncStatusService.getInstance();
    res.json(syncStatus.getStatus());
  } catch (error) {
    logger.error('[Updates API] Error getting sync status:', error);
    res.status(500).json({
      isRunning: false,
      stage: 'error',
      progress: 0,
      message: 'Error getting sync status',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
