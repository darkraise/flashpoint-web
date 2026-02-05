import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { logActivity } from '../middleware/activityLogger';
import { JobScheduler } from '../services/JobScheduler';
import { JobExecutionService } from '../services/JobExecutionService';
import { CachedSystemSettingsService } from '../services/CachedSystemSettingsService';
import { logger } from '../utils/logger';

const router = Router();
const executionService = new JobExecutionService();
const systemSettings = CachedSystemSettingsService.getInstance();

// ===================================
// GET ALL JOBS WITH STATUS
// ===================================
router.get(
  '/',
  authenticate,
  requirePermission('settings.update'),
  async (req: Request, res: Response) => {
    try {
      const jobs = JobScheduler.getAllJobsEnriched();
      res.json(jobs);
    } catch (error) {
      logger.error('Failed to get jobs:', error);
      res.status(500).json({ error: { message: 'Failed to retrieve jobs' } });
    }
  }
);

// ===================================
// GET SPECIFIC JOB STATUS
// ===================================
router.get(
  '/:jobId',
  authenticate,
  requirePermission('settings.update'),
  async (req: Request, res: Response) => {
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
  }
);

// ===================================
// UPDATE JOB SETTINGS (ENABLE/DISABLE)
// ===================================
router.patch(
  '/:jobId',
  authenticate,
  requirePermission('settings.update'),
  logActivity('jobs.update', 'job'),
  async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const { enabled } = req.body;

      // Validate request body
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({
          error: { message: 'Invalid request: enabled must be a boolean' },
        });
      }

      // Verify job exists
      const job = JobScheduler.getJobStatusEnriched(jobId);
      if (!job) {
        return res.status(404).json({ error: { message: 'Job not found' } });
      }

      // Update the job's enabled state in system_settings
      const settingKey = `jobs.${jobId.replace('-', '_')}_enabled`;
      const userId = req.user!.id;
      systemSettings.set(settingKey, enabled ? '1' : '0', userId);

      // Update the job in JobScheduler
      JobScheduler.updateJobEnabled(jobId, enabled);

      // Start or stop the job based on enabled state
      if (enabled) {
        JobScheduler.startJob(jobId);
      } else {
        JobScheduler.stopJob(jobId);
      }

      // Return updated job status
      const updatedJob = JobScheduler.getJobStatusEnriched(jobId);
      res.json(updatedJob);
    } catch (error) {
      logger.error(`Failed to update job ${req.params.jobId}:`, error);
      res.status(500).json({
        error: { message: error instanceof Error ? error.message : 'Failed to update job' },
      });
    }
  }
);

// ===================================
// START A JOB
// ===================================
router.post(
  '/:jobId/start',
  authenticate,
  requirePermission('settings.update'),
  logActivity('jobs.start', 'job'),
  async (req: Request, res: Response) => {
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
  }
);

// ===================================
// STOP A JOB
// ===================================
router.post(
  '/:jobId/stop',
  authenticate,
  requirePermission('settings.update'),
  logActivity('jobs.stop', 'job'),
  async (req: Request, res: Response) => {
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
  }
);

// ===================================
// TRIGGER MANUAL JOB EXECUTION
// ===================================
router.post(
  '/:jobId/trigger',
  authenticate,
  requirePermission('settings.update'),
  logActivity('jobs.trigger', 'job'),
  async (req: Request, res: Response) => {
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
  }
);

// ===================================
// GET EXECUTION LOGS FOR SPECIFIC JOB
// ===================================
router.get(
  '/:jobId/logs',
  authenticate,
  requirePermission('settings.update'),
  async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const result = executionService.getJobLogs(jobId, limit, offset);
      res.json({ ...result, limit, offset });
    } catch (error) {
      logger.error(`Failed to get logs for job ${req.params.jobId}:`, error);
      res.status(500).json({ error: { message: 'Failed to retrieve job logs' } });
    }
  }
);

// ===================================
// GET ALL EXECUTION LOGS
// ===================================
router.get(
  '/logs/all',
  authenticate,
  requirePermission('settings.update'),
  async (req: Request, res: Response) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 200);
      const offset = parseInt(req.query.offset as string) || 0;

      const result = executionService.getAllLogs(limit, offset);
      res.json({ ...result, limit, offset });
    } catch (error) {
      logger.error('Failed to get all logs:', error);
      res.status(500).json({ error: { message: 'Failed to retrieve logs' } });
    }
  }
);

export default router;
