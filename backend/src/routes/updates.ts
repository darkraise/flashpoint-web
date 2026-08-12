import { Router } from 'express';
import { updateService } from '../services/UpdateService';
import { MetadataUpdateService } from '../services/MetadataUpdateService';
import { MetadataSyncService } from '../services/MetadataSyncService';
import { AssetDownloadService } from '../services/AssetDownloadService';
import { SyncStatusService } from '../services/SyncStatusService';
import { AppUpdateService } from '../services/AppUpdateService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { logActivity } from '../middleware/activityLogger';
import { asyncHandler } from '../middleware/asyncHandler';
import { rateLimitStandard } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';

const router = Router();
router.use(rateLimitStandard);
const metadataUpdateService = new MetadataUpdateService();
const metadataSyncService = new MetadataSyncService();

router.get(
  '/app',
  authenticate,
  requirePermission('settings.update'),
  asyncHandler(async (req, res) => {
    // Any value other than the exact string is falsy here, so no schema is
    // warranted; the service's own 60s floor is what guards the GitHub quota.
    const info = await AppUpdateService.getUpdateInfo(req.query.refresh === 'true');
    res.json(info);
  })
);

router.get(
  '/check',
  authenticate,
  requirePermission('settings.update'),
  asyncHandler(async (req, res) => {
    logger.debug('[Updates API] Checking for updates...');
    const updateInfo = await updateService.checkForUpdates();
    res.json(updateInfo);
  })
);

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

// Includes hasMetadataSource so frontend knows whether sync is available
router.get(
  '/metadata',
  authenticate,
  requirePermission('settings.update'),
  asyncHandler(async (req, res) => {
    const hasMetadataSource = await metadataUpdateService.hasMetadataSource();
    logger.debug(
      `[Updates API] Checking for metadata updates... (hasMetadataSource: ${hasMetadataSource})`
    );
    const metadataInfo = await metadataUpdateService.getMetadataUpdateInfo();
    res.json({ ...metadataInfo, hasMetadataSource });
  })
);

// Non-blocking: returns immediately. Frontend polls /api/updates/metadata/sync/status for progress.
router.post(
  '/metadata/sync',
  authenticate,
  requirePermission('settings.update'),
  logActivity('updates.metadata_sync', 'system'),
  asyncHandler(async (req, res) => {
    const syncStatus = SyncStatusService.getInstance();

    if (!syncStatus.tryStartSync()) {
      return res.status(409).json({
        success: false,
        error: 'Sync already in progress',
        status: syncStatus.getStatus(),
      });
    }

    logger.info(
      `[Updates API] Starting metadata sync in background (requested by ${req.user?.username})...`
    );

    metadataSyncService.syncMetadata(true).catch((error) => {
      logger.error('[Updates API] Background sync error:', error);
    });

    res.json({
      success: true,
      message: 'Sync started',
      status: syncStatus.getStatus(),
    });
  })
);

router.get(
  '/metadata/sync/status',
  authenticate,
  requirePermission('settings.read'),
  asyncHandler(async (req, res) => {
    const syncStatus = SyncStatusService.getInstance();
    const status = syncStatus.getStatus();
    res.json(status);
  })
);

router.get(
  '/metadata/assets/status',
  authenticate,
  requirePermission('settings.read'),
  asyncHandler(async (req, res) => {
    res.json(AssetDownloadService.getProgress());
  })
);

router.post(
  '/metadata/assets/cancel',
  authenticate,
  requirePermission('settings.update'),
  logActivity('metadata.assets_cancel', 'system'),
  asyncHandler(async (req, res) => {
    AssetDownloadService.cancel();
    res.json({ success: true, status: AssetDownloadService.getProgress() });
  })
);

export default router;
