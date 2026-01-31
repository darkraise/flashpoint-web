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

export interface JobStatusEnriched {
  id: string;
  name: string;
  enabled: boolean;
  running: boolean;
  cronSchedule: string;
  lastExecution?: JobExecutionLog;
  nextRunEstimate?: string;
}

export interface JobLogsResponse {
  data: JobExecutionLog[];
  total: number;
  limit: number;
  offset: number;
}
