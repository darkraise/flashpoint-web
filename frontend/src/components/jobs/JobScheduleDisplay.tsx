import { cronToReadable } from '@/lib/cron-utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock } from 'lucide-react';

interface JobScheduleDisplayProps {
  cronSchedule: string;
}

export function JobScheduleDisplay({ cronSchedule }: JobScheduleDisplayProps) {
  const readable = cronToReadable(cronSchedule);

  return (
    <div className="flex items-center gap-2 text-sm">
      <Clock size={16} className="text-muted-foreground" />
      <div>
        <p className="font-medium">{readable}</p>
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="text-xs text-muted-foreground font-mono cursor-help">
              {cronSchedule}
            </p>
          </TooltipTrigger>
          <TooltipContent>
            <p>Cron expression: {cronSchedule}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
