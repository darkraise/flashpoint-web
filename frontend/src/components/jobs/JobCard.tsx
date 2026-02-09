import { JobStatusEnriched } from '@/types/jobs';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Square, Zap, Eye, CheckCircle, XCircle, Loader2, Settings } from 'lucide-react';
import { JobScheduleDisplay } from './JobScheduleDisplay';
import { formatDuration } from '@/lib/cron-utils';
import { formatDistanceToNow } from 'date-fns';

interface JobCardProps {
  job: JobStatusEnriched;
  onStop: (jobId: string) => void;
  onTrigger: (jobId: string) => void;
  onViewLogs: (jobId: string) => void;
  onEdit: (jobId: string) => void;
  onToggleEnabled: (jobId: string, enabled: boolean) => void;
  disabled?: boolean;
}

export function JobCard({
  job,
  onStop,
  onTrigger,
  onViewLogs,
  onEdit,
  onToggleEnabled,
  disabled,
}: JobCardProps) {
  const getLastExecutionBadge = () => {
    if (!job.lastExecution) return <Badge variant="outline">Never run</Badge>;

    const { status } = job.lastExecution;
    if (status === 'success') {
      return (
        <Badge variant="default" className="bg-green-600 dark:bg-green-600 gap-1">
          <CheckCircle size={12} /> Success
        </Badge>
      );
    } else if (status === 'failed') {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle size={12} /> Failed
        </Badge>
      );
    } else {
      return (
        <Badge variant="default" className="gap-1">
          <Loader2 size={12} className="animate-spin" /> Running
        </Badge>
      );
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow flex flex-col h-full">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-xl">{job.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">ID: {job.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id={`job-enabled-${job.id}`}
              checked={job.enabled}
              onCheckedChange={(checked: boolean) => onToggleEnabled(job.id, checked)}
              disabled={disabled || job.running}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-3 flex-1 overflow-auto">
        {job.running ? (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3">
            <div className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-blue-500" />
              <span className="text-sm font-medium">Job is currently running</span>
            </div>
          </div>
        ) : null}

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Schedule</p>
          <JobScheduleDisplay cronSchedule={job.cronSchedule} />
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
            Last Execution
          </p>
          {job.running ? (
            <Badge variant="outline">Currently running...</Badge>
          ) : job.lastExecution ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                {getLastExecutionBadge()}
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(job.lastExecution.startedAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              {job.lastExecution.durationSeconds !== undefined ? (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">
                    {formatDuration(job.lastExecution.durationSeconds)}
                  </span>
                </div>
              ) : null}
              {job.lastExecution.message ? (
                <div className="mt-2 text-xs space-y-1">
                  {job.lastExecution.message.includes('Games updated') ? (
                    <div className="bg-muted/50 rounded p-2 space-y-0.5">
                      {job.lastExecution.message.match(/Games updated: (\d+)/) ? (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Games updated:</span>
                          <span className="font-medium">
                            {job.lastExecution.message.match(/Games updated: (\d+)/)?.[1]}
                          </span>
                        </div>
                      ) : null}
                      {job.lastExecution.message.match(/Tags updated: (\d+)/) ? (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tags updated:</span>
                          <span className="font-medium">
                            {job.lastExecution.message.match(/Tags updated: (\d+)/)?.[1]}
                          </span>
                        </div>
                      ) : null}
                      {job.lastExecution.message.match(/Platforms updated: (\d+)/) ? (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Platforms updated:</span>
                          <span className="font-medium">
                            {job.lastExecution.message.match(/Platforms updated: (\d+)/)?.[1]}
                          </span>
                        </div>
                      ) : null}
                      {job.lastExecution.message.match(/Games deleted: (\d+)/) ? (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Games deleted:</span>
                          <span className="font-medium">
                            {job.lastExecution.message.match(/Games deleted: (\d+)/)?.[1]}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">{job.lastExecution.message}</p>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <Badge variant="outline">Never run</Badge>
          )}
        </div>

        {job.enabled && job.nextRunEstimate && !job.running ? (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Next Run</p>
            <p className="text-sm">
              {formatDistanceToNow(new Date(job.nextRunEstimate), {
                addSuffix: true,
              })}
            </p>
          </div>
        ) : null}
      </CardContent>

      <CardFooter className="flex gap-2 pt-4 border-t flex-wrap flex-shrink-0">
        {job.running ? (
          <Button onClick={() => onStop(job.id)} variant="outline" size="sm" disabled={disabled}>
            <Square size={16} className="mr-1" />
            Stop
          </Button>
        ) : null}
        <Button
          onClick={() => onTrigger(job.id)}
          variant="outline"
          size="sm"
          disabled={disabled || job.running}
        >
          <Zap size={16} className="mr-1" />
          Trigger Now
        </Button>
        <Button onClick={() => onEdit(job.id)} variant="outline" size="sm">
          <Settings size={16} className="mr-1" />
          Edit
        </Button>
        <div className="flex-1" />
        <Button onClick={() => onViewLogs(job.id)} variant="ghost" size="sm">
          <Eye size={16} className="mr-1" />
          View Logs
        </Button>
      </CardFooter>
    </Card>
  );
}
