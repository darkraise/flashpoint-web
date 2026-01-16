import { Router } from 'express';
import { updateService } from '../services/UpdateService';
import { MetadataUpdateService } from '../services/MetadataUpdateService';
import { MetadataSyncService } from '../services/MetadataSyncService';
import { SyncStatusService } from '../services/SyncStatusService';
import { logger } from '../utils/logger';

const router = Router();
const metadataUpdateService = new MetadataUpdateService();
const metadataSyncService = new MetadataSyncService();

/**
 * GET /api/updates/check
 * Check for available updates
 */
router.get('/check', async (req, res, next) => {
  try {
    logger.info('[Updates API] Checking for updates...');
    const updateInfo = await updateService.checkForUpdates();
    res.json(updateInfo);
  } catch (error) {
    logger.error('[Updates API] Error checking for updates:', error);
    next(error);
  }
});

/**
 * POST /api/updates/install
 * Install available updates
 */
router.post('/install', async (req, res, next) => {
  try {
    logger.info('[Updates API] Installing updates...');
    const result = await updateService.installUpdates();
    res.json(result);
  } catch (error) {
    logger.error('[Updates API] Error installing updates:', error);
    next(error);
  }
});

/**
 * GET /api/updates/system-info
 * Get system information for debugging
 */
router.get('/system-info', async (req, res, next) => {
  try {
    const systemInfo = await updateService.getSystemInfo();
    res.json(systemInfo);
  } catch (error) {
    logger.error('[Updates API] Error getting system info:', error);
    next(error);
  }
});

/**
 * GET /api/updates/metadata
 * Check for game metadata updates (like Flashpoint Launcher)
 * Returns info about game database updates from FPFSS
 */
router.get('/metadata', async (req, res, next) => {
  try {
    logger.info('[Updates API] Checking for metadata updates...');
    const metadataInfo = await metadataUpdateService.getMetadataUpdateInfo();
    res.json(metadataInfo);
  } catch (error) {
    logger.error('[Updates API] Error checking for metadata updates:', error);
    next(error);
  }
});

/**
 * POST /api/updates/metadata/sync
 * Start metadata sync in background (non-blocking)
 * Returns immediately with sync started status
 * Frontend should poll /api/updates/metadata/sync/status for progress
 */
router.post('/metadata/sync', async (req, res, next) => {
  try {
    const syncStatus = SyncStatusService.getInstance();

    // Check if sync is already running
    if (syncStatus.isRunning()) {
      return res.status(409).json({
        success: false,
        error: 'Sync already in progress',
        status: syncStatus.getStatus()
      });
    }

    logger.info('[Updates API] Starting metadata sync in background...');

    // Start sync in background (don't await - let it run async)
    metadataSyncService.syncMetadata()
      .catch((error) => {
        logger.error('[Updates API] Background sync error:', error);
      });

    // Return immediately
    res.json({
      success: true,
      message: 'Sync started',
      status: syncStatus.getStatus()
    });
  } catch (error) {
    logger.error('[Updates API] Error starting metadata sync:', error);
    next(error);
  }
});

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
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
