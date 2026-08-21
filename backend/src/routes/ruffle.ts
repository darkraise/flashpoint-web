import { Router } from 'express';
import { z } from 'zod';
import { RUFFLE_CHANNELS, RuffleService } from '../services/RuffleService';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { asyncHandler } from '../middleware/asyncHandler';
import { logActivity } from '../middleware/activityLogger';
import { validateRequest } from '../middleware/validation';

const router = Router();
const ruffleService = new RuffleService();

const channelSchema = z.object({
  channel: z.enum(RUFFLE_CHANNELS),
});

router.get(
  '/version',
  asyncHandler(async (req, res) => {
    const currentVersion = ruffleService.getCurrentVersion();
    const isInstalled = ruffleService.verifyInstallation();

    res.json({
      currentVersion,
      isInstalled,
      installedChannel: ruffleService.getInstalledChannel(),
      channel: ruffleService.getConfiguredChannel(),
    });
  })
);

router.get(
  '/check-update',
  authenticate,
  requirePermission('settings.update'),
  asyncHandler(async (req, res) => {
    const updateInfo = await ruffleService.checkForUpdate();
    res.json(updateInfo);
  })
);

router.put(
  '/channel',
  authenticate,
  requirePermission('settings.update'),
  validateRequest(channelSchema),
  logActivity('settings.update', 'ruffle_channel'),
  asyncHandler(async (req, res) => {
    const { channel } = req.body as z.infer<typeof channelSchema>;
    ruffleService.setConfiguredChannel(channel, req.user?.id);

    // Report against the new channel straight away: the switch itself is what
    // makes an install available, and the caller needs the target version.
    const updateInfo = await ruffleService.checkForUpdate(channel);
    res.json(updateInfo);
  })
);

router.post(
  '/update',
  authenticate,
  requirePermission('settings.update'),
  logActivity('settings.update', 'ruffle_install'),
  asyncHandler(async (req, res) => {
    const result = await ruffleService.updateRuffle();
    res.json(result);
  })
);

export default router;
