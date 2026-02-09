import { apiClient } from './client';
import type { JobStatusEnriched, JobLogsResponse } from '@/types/jobs';

export const jobsApi = {
  getAll: async (): Promise<JobStatusEnriched[]> => {
    const { data } = await apiClient.get<JobStatusEnriched[]>('/jobs');
    return data;
  },

  getById: async (jobId: string): Promise<JobStatusEnriched> => {
    const { data } = await apiClient.get<JobStatusEnriched>(`/jobs/${jobId}`);
    return data;
  },

  update: async (jobId: string, updates: { enabled: boolean }): Promise<JobStatusEnriched> => {
    const { data } = await apiClient.patch<JobStatusEnriched>(`/jobs/${jobId}`, updates);
    return data;
  },

  start: async (jobId: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post(`/jobs/${jobId}/start`);
    return data;
  },

  stop: async (jobId: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post(`/jobs/${jobId}/stop`);
    return data;
  },

  trigger: async (jobId: string): Promise<{ success: boolean; message: string }> => {
    const { data } = await apiClient.post(`/jobs/${jobId}/trigger`);
    return data;
  },

  getLogs: async (jobId: string, limit = 50, offset = 0): Promise<JobLogsResponse> => {
    const { data } = await apiClient.get<JobLogsResponse>(`/jobs/${jobId}/logs`, {
      params: { limit, offset },
    });
    return data;
  },

  getAllLogs: async (limit = 100, offset = 0): Promise<JobLogsResponse> => {
    const { data } = await apiClient.get<JobLogsResponse>('/jobs/logs/all', {
      params: { limit, offset },
    });
    return data;
  },
};
