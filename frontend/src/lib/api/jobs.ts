import { apiClient } from './client';
import type { JobStatusEnriched, JobLogsResponse } from '@/types/jobs';

/**
 * Jobs API
 *
 * Manages background jobs and scheduled tasks
 */
export const jobsApi = {
  /**
   * Get all jobs with their status
   */
  getAll: async (): Promise<JobStatusEnriched[]> => {
    const { data } = await apiClient.get<JobStatusEnriched[]>('/jobs');
    return data;
  },

  /**
   * Get job by ID
   */
  getById: async (jobId: string): Promise<JobStatusEnriched> => {
    const { data } = await apiClient.get<JobStatusEnriched>(`/jobs/${jobId}`);
    return data;
  },

  /**
   * Update job configuration
   */
  update: async (
    jobId: string,
    updates: { enabled: boolean }
  ): Promise<JobStatusEnriched> => {
    const { data } = await apiClient.patch<JobStatusEnriched>(`/jobs/${jobId}`, updates);
    return data;
  },

  /**
   * Start a job
   */
  start: async (jobId: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post(`/jobs/${jobId}/start`);
    return data;
  },

  /**
   * Stop a running job
   */
  stop: async (jobId: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post(`/jobs/${jobId}/stop`);
    return data;
  },

  /**
   * Manually trigger a job
   */
  trigger: async (jobId: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post(`/jobs/${jobId}/trigger`);
    return data;
  },

  /**
   * Get logs for a specific job
   */
  getLogs: async (jobId: string, limit = 50, offset = 0): Promise<JobLogsResponse> => {
    const { data } = await apiClient.get<JobLogsResponse>(`/jobs/${jobId}/logs`, {
      params: { limit, offset },
    });
    return data;
  },

  /**
   * Get logs from all jobs
   */
  getAllLogs: async (limit = 100, offset = 0): Promise<JobLogsResponse> => {
    const { data } = await apiClient.get<JobLogsResponse>('/jobs/logs/all', {
      params: { limit, offset },
    });
    return data;
  },
};
