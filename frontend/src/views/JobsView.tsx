import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi } from '@/lib/api';
import { Clock } from 'lucide-react';
import { JobCard } from '@/components/jobs/JobCard';
import { JobExecutionLogTable } from '@/components/jobs/JobExecutionLogTable';
import { JobEditDialog } from '@/components/jobs/JobEditDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog';
import { useDialog } from '@/contexts/DialogContext';
import { Skeleton } from '@/components/ui/skeleton';

export function JobsView() {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { showToast } = useDialog();
  const queryClient = useQueryClient();

  // Fetch jobs with auto-refresh every 5 seconds
  const { data: jobs = [], isLoading, error } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobsApi.getAll(),
    refetchInterval: 5000, // Real-time updates
    refetchIntervalInBackground: true
  });

  // Fetch logs for selected job
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['jobLogs', selectedJobId],
    queryFn: () => jobsApi.getLogs(selectedJobId!, 50, 0),
    enabled: !!selectedJobId && showLogsDialog
  });

  // Start mutation
  const startMutation = useMutation({
    mutationFn: (jobId: string) => jobsApi.start(jobId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      showToast(data.message, 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to start job', 'error');
    }
  });

  // Stop mutation
  const stopMutation = useMutation({
    mutationFn: (jobId: string) => jobsApi.stop(jobId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      showToast(data.message, 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to stop job', 'error');
    }
  });

  // Trigger mutation
  const triggerMutation = useMutation({
    mutationFn: (jobId: string) => jobsApi.trigger(jobId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      showToast(data.message, 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.message || 'Failed to trigger job', 'error');
    }
  });

  const handleStart = (jobId: string) => {
    startMutation.mutate(jobId);
  };

  const handleStop = (jobId: string) => {
    stopMutation.mutate(jobId);
  };

  const handleTrigger = (jobId: string) => {
    triggerMutation.mutate(jobId);
  };

  const handleViewLogs = (jobId: string) => {
    setSelectedJobId(jobId);
    setShowLogsDialog(true);
  };

  const handleEdit = (jobId: string) => {
    setSelectedJobId(jobId);
    setShowEditDialog(true);
  };

  const handleToggleEnabled = (jobId: string, enabled: boolean) => {
    if (enabled) {
      startMutation.mutate(jobId);
    } else {
      stopMutation.mutate(jobId);
    }
  };

  const isAnyMutating = startMutation.isPending || stopMutation.isPending || triggerMutation.isPending;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Clock size={32} className="text-primary" />
        <h1 className="text-3xl font-bold">Background Jobs</h1>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-950/20 border border-red-500 rounded-lg p-4">
          <p className="text-red-400">Failed to load jobs. Please try again.</p>
        </div>
      )}

      {/* Jobs Grid */}
      {!isLoading && !error && (
        <>
          {jobs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock size={48} className="mx-auto mb-4 opacity-50" />
              <p>No background jobs configured</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onStart={handleStart}
                  onStop={handleStop}
                  onTrigger={handleTrigger}
                  onViewLogs={handleViewLogs}
                  onEdit={handleEdit}
                  onToggleEnabled={handleToggleEnabled}
                  disabled={isAnyMutating}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Logs Dialog */}
      <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Execution Logs - {jobs.find(j => j.id === selectedJobId)?.name}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <JobExecutionLogTable
              logs={logsData?.data || []}
              loading={logsLoading}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <JobEditDialog
        job={jobs.find(j => j.id === selectedJobId) || null}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />
    </div>
  );
}
