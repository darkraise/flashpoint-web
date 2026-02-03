import { JobExecutionLog } from '@/types/jobs';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { formatDuration } from '@/lib/cron-utils';
import { CheckCircle, XCircle, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

interface JobExecutionLogTableProps {
  logs: JobExecutionLog[];
  loading?: boolean;
}

export function JobExecutionLogTable({ logs, loading }: JobExecutionLogTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (id: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge variant="default" className="bg-green-600 gap-1">
            <CheckCircle size={12} /> Success
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle size={12} /> Failed
          </Badge>
        );
      case 'running':
        return (
          <Badge variant="default" className="gap-1">
            <Loader2 size={12} className="animate-spin" /> Running
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading logs...</div>;
  }

  if (logs.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No execution logs found</div>;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted">
          <tr>
            <th className="text-left p-3 text-sm font-semibold"></th>
            <th className="text-left p-3 text-sm font-semibold">Status</th>
            <th className="text-left p-3 text-sm font-semibold">Started</th>
            <th className="text-left p-3 text-sm font-semibold">Duration</th>
            <th className="text-left p-3 text-sm font-semibold">Triggered By</th>
            <th className="text-left p-3 text-sm font-semibold">Message</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <>
              <tr key={log.id} className="border-t hover:bg-accent/50">
                <td className="p-3">
                  {log.errorDetails ? (
                    <button
                      onClick={() => toggleRow(log.id)}
                      className="hover:bg-accent p-1 rounded"
                    >
                      {expandedRows.has(log.id) ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </button>
                  ) : null}
                </td>
                <td className="p-3">{getStatusBadge(log.status)}</td>
                <td className="p-3 text-sm">
                  {formatDistanceToNow(new Date(log.startedAt), { addSuffix: true })}
                </td>
                <td className="p-3 text-sm">{formatDuration(log.durationSeconds)}</td>
                <td className="p-3 text-sm">{log.triggeredBy}</td>
                <td className="p-3 text-sm text-muted-foreground">{log.message || '-'}</td>
              </tr>
              {expandedRows.has(log.id) && log.errorDetails ? (
                <tr className="border-t bg-red-950/20">
                  <td colSpan={6} className="p-3">
                    <div className="text-xs font-mono bg-red-950/50 p-3 rounded">
                      <p className="font-semibold text-red-400 mb-2">Error Details:</p>
                      <pre className="whitespace-pre-wrap text-red-300">{log.errorDetails}</pre>
                    </div>
                  </td>
                </tr>
              ) : null}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
