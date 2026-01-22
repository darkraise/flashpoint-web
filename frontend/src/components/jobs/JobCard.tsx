import { JobStatusEnriched } from "@/types/jobs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Play,
  Square,
  Zap,
  Eye,
  CheckCircle,
  XCircle,
  Loader2,
  Settings,
} from "lucide-react";
import { JobScheduleDisplay } from "./JobScheduleDisplay";
import { formatDuration } from "@/lib/cron-utils";
import { formatDistanceToNow } from "date-fns";

interface JobCardProps {
  job: JobStatusEnriched;
  onStart: (jobId: string) => void;
  onStop: (jobId: string) => void;
  onTrigger: (jobId: string) => void;
  onViewLogs: (jobId: string) => void;
  onEdit: (jobId: string) => void;
  onToggleEnabled: (jobId: string, enabled: boolean) => void;
  disabled?: boolean;
}

export function JobCard({
  job,
  onStart,
  onStop,
  onTrigger,
  onViewLogs,
  onEdit,
  onToggleEnabled,
  disabled,
}: JobCardProps) {
  const getRunningBadge = () => {
    if (job.running) {
      return (
        <Badge variant="default" className="gap-1">
          <Loader2 size={12} className="animate-spin" /> Running
        </Badge>
      );
    }
    return null;
  };

  const getLastExecutionBadge = () => {
    if (!job.lastExecution) return <Badge variant="outline">Never run</Badge>;

    const { status } = job.lastExecution;
    if (status === "success") {
      return (
        <Badge variant="default" className="bg-green-600 gap-1">
          <CheckCircle size={12} /> Success
        </Badge>
      );
    } else if (status === "failed") {
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
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-xl">{job.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">ID: {job.id}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getRunningBadge()}
            <div className="flex items-center gap-2">
              <Label htmlFor={`job-enabled-${job.id}`} className="text-sm cursor-pointer">
                {job.enabled ? "Enabled" : "Disabled"}
              </Label>
              <Switch
                id={`job-enabled-${job.id}`}
                checked={job.enabled}
                onCheckedChange={(checked: boolean) => onToggleEnabled(job.id, checked)}
                disabled={disabled || job.running}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Schedule */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
            Schedule
          </p>
          <JobScheduleDisplay cronSchedule={job.cronSchedule} />
        </div>

        {/* Last Execution */}
        {job.lastExecution && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
              Last Execution
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                {getLastExecutionBadge()}
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(job.lastExecution.startedAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              {job.lastExecution.durationSeconds !== undefined && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-medium">
                    {formatDuration(job.lastExecution.durationSeconds)}
                  </span>
                </div>
              )}
            </div>
            {job.lastExecution.message && (
              <div className="mt-2 text-xs space-y-1">
                {job.lastExecution.message.includes("Games updated") ? (
                  // Parse metadata sync result
                  <div className="bg-muted/50 rounded p-2 space-y-0.5">
                    {job.lastExecution.message.match(
                      /Games updated: (\d+)/,
                    ) && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Games updated:
                        </span>
                        <span className="font-medium">
                          {
                            job.lastExecution.message.match(
                              /Games updated: (\d+)/,
                            )?.[1]
                          }
                        </span>
                      </div>
                    )}
                    {job.lastExecution.message.match(/Tags updated: (\d+)/) && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Tags updated:
                        </span>
                        <span className="font-medium">
                          {
                            job.lastExecution.message.match(
                              /Tags updated: (\d+)/,
                            )?.[1]
                          }
                        </span>
                      </div>
                    )}
                    {job.lastExecution.message.match(
                      /Platforms updated: (\d+)/,
                    ) && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Platforms updated:
                        </span>
                        <span className="font-medium">
                          {
                            job.lastExecution.message.match(
                              /Platforms updated: (\d+)/,
                            )?.[1]
                          }
                        </span>
                      </div>
                    )}
                    {job.lastExecution.message.match(
                      /Games deleted: (\d+)/,
                    ) && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Games deleted:
                        </span>
                        <span className="font-medium">
                          {
                            job.lastExecution.message.match(
                              /Games deleted: (\d+)/,
                            )?.[1]
                          }
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  // Display as plain text for other messages
                  <p className="text-muted-foreground">
                    {job.lastExecution.message}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Next Run */}
        {job.enabled && job.nextRunEstimate && !job.running && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
              Next Run
            </p>
            <p className="text-sm">
              {formatDistanceToNow(new Date(job.nextRunEstimate), {
                addSuffix: true,
              })}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t flex-wrap">
          {job.enabled ? (
            <Button
              onClick={() => onStop(job.id)}
              variant="outline"
              size="sm"
              disabled={disabled || !job.running}
            >
              <Square size={16} className="mr-1" />
              Stop
            </Button>
          ) : (
            <Button
              onClick={() => onStart(job.id)}
              variant="outline"
              size="sm"
              disabled={disabled}
            >
              <Play size={16} className="mr-1" />
              Start
            </Button>
          )}
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
        </div>
      </CardContent>
    </Card>
  );
}
