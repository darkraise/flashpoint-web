import { UserDatabaseService } from './UserDatabaseService';
import { logger } from '../utils/logger';

interface JobExecutionRow {
  id: number;
  job_id: string;
  job_name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  message: string | null;
  error_details: string | null;
  triggered_by: string;
}

export interface JobExecutionLog {
  id: number;
  jobId: string;
  jobName: string;
  status: 'running' | 'success' | 'failed';
  startedAt: string;
  completedAt?: string;
  durationSeconds?: number;
  message?: string;
  errorDetails?: string;
  triggeredBy: string;
}

export class JobExecutionService {
  /**
   * Start logging a job execution
   */
  startExecution(jobId: string, jobName: string, triggeredBy: string): number {
    const startedAt = new Date().toISOString();
    const result = UserDatabaseService.run(
      `INSERT INTO job_execution_logs (job_id, job_name, status, started_at, triggered_by)
       VALUES (?, ?, 'running', ?, ?)`,
      [jobId, jobName, startedAt, triggeredBy]
    );
    logger.info(`[JobExecution] Started logging: ${jobName} (ID: ${result.lastInsertRowid})`);
    return result.lastInsertRowid as number;
  }

  /**
   * Complete a job execution log
   */
  completeExecution(
    id: number,
    status: 'success' | 'failed',
    message?: string,
    errorDetails?: string
  ): void {
    const completedAt = new Date().toISOString();

    // Calculate duration
    const log = UserDatabaseService.get('SELECT started_at FROM job_execution_logs WHERE id = ?', [
      id,
    ]) as { started_at: string } | null;

    if (!log) {
      logger.error(`[JobExecution] Cannot complete: log ${id} not found`);
      return;
    }

    const startTime = new Date(log.started_at).getTime();
    const endTime = new Date(completedAt).getTime();
    const durationSeconds = Math.floor((endTime - startTime) / 1000);

    UserDatabaseService.run(
      `UPDATE job_execution_logs
       SET status = ?, completed_at = ?, duration_seconds = ?, message = ?, error_details = ?
       WHERE id = ?`,
      [status, completedAt, durationSeconds, message || null, errorDetails || null, id]
    );

    logger.info(`[JobExecution] Completed log ${id}: ${status} (${durationSeconds}s)`);
  }

  /**
   * Get logs for a specific job
   */
  getJobLogs(jobId: string, limit = 50, offset = 0): { data: JobExecutionLog[]; total: number } {
    const total = UserDatabaseService.get(
      'SELECT COUNT(*) as count FROM job_execution_logs WHERE job_id = ?',
      [jobId]
    ) as { count: number };

    const logs = UserDatabaseService.all(
      `SELECT * FROM job_execution_logs
       WHERE job_id = ?
       ORDER BY started_at DESC
       LIMIT ? OFFSET ?`,
      [jobId, limit, offset]
    ) as JobExecutionRow[];

    return {
      data: logs.map(this.mapToJobExecutionLog),
      total: total.count,
    };
  }

  /**
   * Get all recent logs
   */
  getAllLogs(limit = 100, offset = 0): { data: JobExecutionLog[]; total: number } {
    const total = UserDatabaseService.get(
      'SELECT COUNT(*) as count FROM job_execution_logs',
      []
    ) as { count: number };

    const logs = UserDatabaseService.all(
      `SELECT * FROM job_execution_logs
       ORDER BY started_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    ) as JobExecutionRow[];

    return {
      data: logs.map(this.mapToJobExecutionLog),
      total: total.count,
    };
  }

  /**
   * Get latest execution for a job
   */
  getLatestExecution(jobId: string): JobExecutionLog | null {
    const log = UserDatabaseService.get(
      `SELECT * FROM job_execution_logs
       WHERE job_id = ?
       ORDER BY started_at DESC
       LIMIT 1`,
      [jobId]
    ) as JobExecutionRow | undefined;

    return log ? this.mapToJobExecutionLog(log) : null;
  }

  /**
   * Cleanup old logs (older than retention days)
   */
  cleanupOldLogs(retentionDays = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffISO = cutoffDate.toISOString();

    const result = UserDatabaseService.run('DELETE FROM job_execution_logs WHERE started_at < ?', [
      cutoffISO,
    ]);

    logger.info(`[JobExecution] Cleaned up ${result.changes} old logs`);
    return result.changes;
  }

  private mapToJobExecutionLog(row: JobExecutionRow): JobExecutionLog {
    return {
      id: row.id,
      jobId: row.job_id,
      jobName: row.job_name,
      status: row.status as 'running' | 'success' | 'failed',
      startedAt: row.started_at,
      completedAt: row.completed_at || undefined,
      durationSeconds: row.duration_seconds || undefined,
      message: row.message || undefined,
      errorDetails: row.error_details || undefined,
      triggeredBy: row.triggered_by,
    };
  }
}
