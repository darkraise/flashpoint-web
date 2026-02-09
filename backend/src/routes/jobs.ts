import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { logActivity } from '../middleware/activityLogger';
import { asyncHandler } from '../middleware/asyncHandler';
import { JobScheduler } from '../services/JobScheduler';
import { JobExecutionService } from '../services/JobExecutionService';
import { CachedSystemSettingsService } from '../services/CachedSystemSettingsService';
import { logger } from '../utils/logger';

const router = Router();
const executionService = new JobExecutionService();
const systemSettings = CachedSystemSettingsService.getInstance();

router.get(
  '/',
  authenticate,
  requirePermission('settings.update'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const jobs = JobScheduler.getAllJobsEnriched();
      res.json(jobs);
    } catch (error) {
      logger.error('Failed to get jobs:', error);
      res.status(500).json({ error: { message: 'Failed to retrieve jobs' } });
    }
  })
);

router.get(
  '/logs/all',
  authenticate,
  requirePermission('settings.update'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 200);
      const offset = Math.max(0, parseInt(req.query.offset as string, 10) || 0);

      const result = executionService.getAllLogs(limit, offset);
      res.json({ ...result, limit, offset });
    } catch (error) {
      logger.error('Failed to get all logs:', error);
      res.status(500).json({ error: { message: 'Failed to retrieve logs' } });
    }
  })
);

router.get(
  '/:jobId',
  authenticate,
  requirePermission('settings.update'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const job = JobScheduler.getJobStatusEnriched(jobId);

      if (!job) {
        return res.status(404).json({ error: { message: 'Job not found' } });
      }

      res.json(job);
    } catch (error) {
      logger.error(`Failed to get job ${req.params.jobId}:`, error);
      res.status(500).json({ error: { message: 'Failed to retrieve job' } });
    }
  })
);

router.patch(
  '/:jobId',
  authenticate,
  requirePermission('settings.update'),
  logActivity('jobs.update', 'job'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const { enabled } = req.body;

      if (typeof enabled !== 'boolean') {
        return res.status(400).json({
          error: { message: 'Invalid request: enabled must be a boolean' },
        });
      }

      const job = JobScheduler.getJobStatusEnriched(jobId);
      if (!job) {
        return res.status(404).json({ error: { message: 'Job not found' } });
      }

      const settingKey = `jobs.${jobId.replaceAll('-', '_')}_enabled`;
      const userId = req.user!.id;
      systemSettings.set(settingKey, enabled ? '1' : '0', userId);

      JobScheduler.updateJobEnabled(jobId, enabled);

      if (enabled) {
        JobScheduler.startJob(jobId);
      } else {
        JobScheduler.stopJob(jobId);
      }

      const updatedJob = JobScheduler.getJobStatusEnriched(jobId);
      res.json(updatedJob);
    } catch (error) {
      logger.error(`Failed to update job ${req.params.jobId}:`, error);
      res.status(500).json({
        error: { message: 'Failed to update job' },
      });
    }
  })
);

router.post(
  '/:jobId/start',
  authenticate,
  requirePermission('settings.update'),
  logActivity('jobs.start', 'job'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      JobScheduler.startJob(jobId);
      res.json({ success: true, message: 'Job started successfully' });
    } catch (error) {
      logger.error(`Failed to start job ${req.params.jobId}:`, error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to start job',
      });
    }
  })
);

router.post(
  '/:jobId/stop',
  authenticate,
  requirePermission('settings.update'),
  logActivity('jobs.stop', 'job'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      JobScheduler.stopJob(jobId);
      res.json({ success: true, message: 'Job stopped successfully' });
    } catch (error) {
      logger.error(`Failed to stop job ${req.params.jobId}:`, error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to stop job',
      });
    }
  })
);

router.post(
  '/:jobId/trigger',
  authenticate,
  requirePermission('settings.update'),
  logActivity('jobs.trigger', 'job'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const userId = req.user!.id.toString();

      await JobScheduler.triggerJob(jobId, userId);
      res.json({
        success: true,
        message: 'Job triggered successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to trigger job';

      if (message.includes('already running')) {
        return res.status(409).json({ success: false, message });
      }

      logger.error(`Failed to trigger job ${req.params.jobId}:`, error);
      res.status(500).json({ success: false, message });
    }
  })
);

router.get(
  '/:jobId/logs',
  authenticate,
  requirePermission('settings.update'),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = Math.max(0, parseInt(req.query.offset as string, 10) || 0);

      const result = executionService.getJobLogs(jobId, limit, offset);
      res.json({ ...result, limit, offset });
    } catch (error) {
      logger.error(`Failed to get logs for job ${req.params.jobId}:`, error);
      res.status(500).json({ error: { message: 'Failed to retrieve job logs' } });
    }
  })
);

export default router;
