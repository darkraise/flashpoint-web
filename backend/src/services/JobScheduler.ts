import { logger } from '../utils/logger';
import { JobExecutionService, JobExecutionLog } from './JobExecutionService';
import * as cron from 'node-cron';
import { CronExpressionParser } from 'cron-parser';

export interface Job {
  id: string;
  name: string;
  enabled: boolean;
  cronSchedule: string;
  run: () => Promise<string | void>; // Can return a completion message
}

export interface JobStatusEnriched {
  id: string;
  name: string;
  enabled: boolean;
  running: boolean;
  cronSchedule: string;
  lastExecution?: JobExecutionLog;
  nextRunEstimate?: string;
}

class JobSchedulerService {
  private jobs: Map<string, Job> = new Map();
  private cronTasks: Map<string, cron.ScheduledTask> = new Map();
  private executionService = new JobExecutionService();
  private currentExecutions: Map<string, number> = new Map(); // jobId -> logId
  private lastRunTimes: Map<string, number> = new Map(); // jobId -> timestamp

  registerJob(job: Job): void {
    this.jobs.set(job.id, job);
    logger.info(`Job registered: ${job.name} (${job.id})`);
  }

  startJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      logger.error(`Cannot start job: Job ${jobId} not found`);
      return;
    }

    if (!job.enabled) {
      logger.warn(`Cannot start job: Job ${job.name} is disabled`);
      return;
    }

    // Validate cron expression
    if (!cron.validate(job.cronSchedule)) {
      logger.error(
        `Cannot start job: Invalid cron expression '${job.cronSchedule}' for job ${job.name}`
      );
      return;
    }

    // Stop existing task if running
    this.stopJob(jobId);

    // Start new cron task
    const task = cron.schedule(job.cronSchedule, async () => {
      await this.runJobWithLogging(jobId, 'scheduler');
    });

    this.cronTasks.set(jobId, task);
    logger.info(`Job started: ${job.name} (schedule: ${job.cronSchedule})`);
  }

  async runJobWithLogging(jobId: string, triggeredBy: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    // Prevent concurrent runs
    if (this.currentExecutions.has(jobId)) {
      logger.warn(`[JobScheduler] Job ${job.name} already running, skipping`);
      return;
    }

    // Start execution log
    const logId = this.executionService.startExecution(jobId, job.name, triggeredBy);
    this.currentExecutions.set(jobId, logId);
    this.lastRunTimes.set(jobId, Date.now());

    try {
      logger.info(`[JobScheduler] Running job: ${job.name}`);
      const resultMessage = await job.run();

      // Success - use custom message if returned, otherwise default
      const completionMessage = resultMessage || 'Job completed successfully';
      this.executionService.completeExecution(logId, 'success', completionMessage);
      logger.info(`[JobScheduler] Job completed: ${job.name}`);
    } catch (error) {
      // Failure
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDetails = error instanceof Error ? error.stack : String(error);
      this.executionService.completeExecution(logId, 'failed', errorMessage, errorDetails);
      logger.error(`[JobScheduler] Job failed: ${job.name}`, error);
    } finally {
      this.currentExecutions.delete(jobId);
    }
  }

  /**
   * Manually trigger a job (async, returns immediately)
   */
  async triggerJob(jobId: string, triggeredBy: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Check if already running
    if (this.currentExecutions.has(jobId)) {
      throw new Error(`Job ${job.name} is already running`);
    }

    // Run asynchronously (don't await)
    // runJobWithLogging will handle execution logging
    this.runJobWithLogging(jobId, triggeredBy).catch((error) => {
      logger.error(`[JobScheduler] Unexpected error in triggered job ${jobId}:`, error);
    });
  }

  stopJob(jobId: string): void {
    const task = this.cronTasks.get(jobId);
    if (task) {
      task.stop();
      this.cronTasks.delete(jobId);

      const job = this.jobs.get(jobId);
      logger.info(`Job stopped: ${job?.name || jobId}`);
    }
  }

  updateJob(jobId: string, updates: Partial<Job>): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      logger.error(`Cannot update job: Job ${jobId} not found`);
      return;
    }

    // Update job configuration
    Object.assign(job, updates);
    this.jobs.set(jobId, job);

    // Restart job if enabled
    this.stopJob(jobId);
    if (job.enabled) {
      this.startJob(jobId);
    }

    logger.info(`Job updated: ${job.name}`);
  }

  updateJobEnabled(jobId: string, enabled: boolean): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      logger.error(`Cannot update job enabled state: Job ${jobId} not found`);
      return;
    }

    job.enabled = enabled;
    this.jobs.set(jobId, job);
    logger.info(`Job ${job.name} enabled state updated to: ${enabled}`);
  }

  getJobStatus(jobId: string): { enabled: boolean; running: boolean; cronSchedule: string } | null {
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }

    return {
      enabled: job.enabled,
      running: this.cronTasks.has(jobId),
      cronSchedule: job.cronSchedule,
    };
  }

  getAllJobs(): Map<string, Job> {
    return new Map(this.jobs);
  }

  getJobStatusEnriched(jobId: string): JobStatusEnriched | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    const lastExecution = this.executionService.getLatestExecution(jobId) || undefined;
    const running = this.currentExecutions.has(jobId);

    // Calculate next run from cron expression
    let nextRunEstimate: string | undefined;
    if (job.enabled && this.cronTasks.has(jobId)) {
      try {
        const interval = CronExpressionParser.parse(job.cronSchedule);
        const nextRun = interval.next();
        nextRunEstimate = nextRun.toDate().toISOString();
      } catch (error) {
        logger.error(`Failed to parse cron expression for ${job.name}:`, error);
      }
    }

    return {
      id: job.id,
      name: job.name,
      enabled: job.enabled,
      running,
      cronSchedule: job.cronSchedule,
      lastExecution,
      nextRunEstimate,
    };
  }

  getAllJobsEnriched(): JobStatusEnriched[] {
    const enriched: JobStatusEnriched[] = [];
    for (const [jobId] of this.jobs) {
      const status = this.getJobStatusEnriched(jobId);
      if (status) enriched.push(status);
    }
    return enriched;
  }

  startAllEnabledJobs(): void {
    logger.info('Starting all enabled jobs...');
    for (const [jobId, job] of this.jobs) {
      if (job.enabled) {
        this.startJob(jobId);
      }
    }
  }

  stopAllJobs(): void {
    logger.info('Stopping all jobs...');
    for (const jobId of this.cronTasks.keys()) {
      this.stopJob(jobId);
    }
  }
}

// Singleton instance
export const JobScheduler = new JobSchedulerService();
