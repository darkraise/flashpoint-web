import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { ChevronDown } from 'lucide-react';
import { useActivities } from '../../hooks/useActivities';
import { ActivityFilters } from '../../types/auth';
import { DataTable } from '../ui/data-table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';

interface ActivityLog {
  id: number;
  userId: number | null;
  username: string | null;
  action: string;
  resource: string | null;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export function ActivityTable() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const limit = 20;

  const { data, isLoading, isError, error } = useActivities(page, limit, filters);

  const handleFilterChange = (key: keyof ActivityFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({});
    setPage(1);
  };

  const columns: ColumnDef<ActivityLog>[] = [
    {
      accessorKey: 'createdAt',
      header: 'Timestamp',
      cell: ({ row }) => {
        const timestamp = row.getValue('createdAt') as string;
        return (
          <div className="text-muted-foreground whitespace-nowrap">
            {new Date(timestamp).toLocaleString()}
          </div>
        );
      },
    },
    {
      accessorKey: 'username',
      header: 'User',
      cell: ({ row }) => {
        const username = row.getValue('username') as string | null;
        return (
          <div className="font-medium">
            {username || <span className="text-muted-foreground">System</span>}
          </div>
        );
      },
    },
    {
      accessorKey: 'action',
      header: 'Action',
      cell: ({ row }) => {
        const action = row.getValue('action') as string;
        return (
          <Badge variant="secondary" className="font-mono text-xs">
            {action}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'resource',
      header: 'Resource',
      cell: ({ row }) => {
        const resource = row.getValue('resource') as string | null;
        const resourceId = row.original.resourceId;
        return (
          <div className="text-muted-foreground">
            {resource || '-'}
            {resourceId && (
              <span className="text-muted-foreground/60"> #{resourceId}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'ipAddress',
      header: 'IP Address',
      cell: ({ row }) => {
        const ipAddress = row.getValue('ipAddress') as string | null;
        return (
          <div className="text-muted-foreground font-mono text-xs">
            {ipAddress || '-'}
          </div>
        );
      },
    },
    {
      accessorKey: 'userAgent',
      header: 'User Agent',
      cell: ({ row }) => {
        const userAgent = row.getValue('userAgent') as string | null;
        return (
          <div className="text-muted-foreground text-xs max-w-xs truncate">
            {userAgent || '-'}
          </div>
        );
      },
    },
  ];

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-destructive">
        Error loading activity logs:{' '}
        {(error as any)?.response?.data?.error?.message || 'Unknown error'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {showFilters ? 'Hide' : 'Show'} Filters
              <ChevronDown
                className={`ml-2 h-4 w-4 transition-transform ${
                  showFilters ? 'rotate-180' : ''
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          {Object.keys(filters).length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
        <CollapsibleContent className="mt-4">
          <div className="rounded-lg border bg-card p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username-filter">Username</Label>
              <Input
                id="username-filter"
                type="text"
                value={filters.username || ''}
                onChange={(e) => handleFilterChange('username', e.target.value)}
                placeholder="Filter by username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="action-filter">Action</Label>
              <Input
                id="action-filter"
                type="text"
                value={filters.action || ''}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                placeholder="e.g. login, users.create"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resource-filter">Resource</Label>
              <Input
                id="resource-filter"
                type="text"
                value={filters.resource || ''}
                onChange={(e) => handleFilterChange('resource', e.target.value)}
                placeholder="e.g. users, roles"
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <DataTable
        columns={columns}
        data={data?.data || []}
        pagination={data?.pagination}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage="No activity logs found"
      />
    </div>
  );
}
