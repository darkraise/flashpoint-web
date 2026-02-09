import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { JobStatusEnriched } from '@/types/jobs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Info, Settings, AlertCircle } from 'lucide-react';
import { systemSettingsApi } from '@/lib/api';
import { useDialog } from '@/contexts/DialogContext';
import { cronToReadable, isValidCron } from '@/lib/cron-utils';
import { AxiosError } from 'axios';

interface JobEditDialogProps {
  job: JobStatusEnriched | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JobEditDialog({ job, open, onOpenChange }: JobEditDialogProps) {
  const { showToast } = useDialog();
  const queryClient = useQueryClient();

  const [cronSchedule, setCronSchedule] = useState(job?.cronSchedule || '0 * * * *');
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateCronExpression = (cron: string) => {
    if (!cron.trim()) {
      setValidationError('Cron expression is required');
      return false;
    }

    if (!isValidCron(cron)) {
      setValidationError('Invalid cron expression format');
      return false;
    }

    setValidationError(null);
    return true;
  };

  useEffect(() => {
    if (job) {
      setCronSchedule(job.cronSchedule);
      setValidationError(null);
    }
  }, [job]);

  const handleCronChange = (value: string) => {
    setCronSchedule(value);
    validateCronExpression(value);
  };

  const updateJobSettings = useMutation({
    mutationFn: (settings: Record<string, unknown>) =>
      systemSettingsApi.updateCategory('jobs', settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['systemSettings', 'jobs'] });
      showToast('Job settings updated successfully', 'success');
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const axiosError = error instanceof AxiosError ? error : null;
      const message = axiosError?.response?.data?.error?.message || 'Failed to update job settings';
      showToast(message, 'error');
    },
  });

  const handleSave = () => {
    if (!job) return;

    if (!validateCronExpression(cronSchedule)) {
      showToast('Please fix the validation errors before saving', 'error');
      return;
    }

    const settingsKey = job.id === 'metadata-sync' ? 'metadataSync' : job.id;

    updateJobSettings.mutate({
      [`${settingsKey}Schedule`]: cronSchedule,
    });
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings size={24} className="text-primary" />
            Edit Job: {job.name}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="cron-schedule" className="text-base">
              Schedule (Cron Expression)
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              Define when the job should run automatically using a cron expression. Use the format:{' '}
              <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">
                minute hour day month weekday
              </code>
            </p>
            <input
              id="cron-schedule"
              type="text"
              placeholder="0 * * * *"
              className={`w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-1 font-mono text-sm ${
                validationError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-border focus:ring-primary'
              }`}
              value={cronSchedule}
              onChange={(e) => handleCronChange(e.target.value)}
              disabled={updateJobSettings.isPending}
            />

            {validationError ? (
              <div className="flex items-center gap-2 text-sm text-red-500">
                <AlertCircle size={16} />
                <span>{validationError}</span>
              </div>
            ) : null}

            {!validationError && cronSchedule ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Info size={16} />
                <span>Will run: {cronToReadable(cronSchedule)}</span>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 mt-2">
              <button
                type="button"
                className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
                onClick={() => handleCronChange('*/15 * * * *')}
              >
                Every 15 min
              </button>
              <button
                type="button"
                className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
                onClick={() => handleCronChange('*/30 * * * *')}
              >
                Every 30 min
              </button>
              <button
                type="button"
                className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
                onClick={() => handleCronChange('0 * * * *')}
              >
                Hourly
              </button>
              <button
                type="button"
                className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
                onClick={() => handleCronChange('0 */6 * * *')}
              >
                Every 6 hours
              </button>
              <button
                type="button"
                className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
                onClick={() => handleCronChange('0 0 * * *')}
              >
                Daily
              </button>
            </div>
          </div>

          <div className="bg-muted/30 rounded-md p-3 border border-border/50">
            <div className="flex items-start gap-2">
              <Info size={18} className="text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  <span>Current Schedule: </span>
                  {validationError ? 'Invalid cron expression' : cronToReadable(cronSchedule)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <code className="font-mono bg-background px-1 py-0.5 rounded">
                    {cronSchedule}
                  </code>
                </p>
              </div>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateJobSettings.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateJobSettings.isPending || !!validationError}>
            {updateJobSettings.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
