import { useState, useEffect, memo, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { ChevronDown, Info, AlertCircle } from 'lucide-react';
import { useActivities } from '../../hooks/useActivities';
import { useDebounce } from '../../hooks/useDebounce';
import { ActivityFilters } from '../../types/auth';
import { DataTable } from '../ui/data-table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { FormattedDate } from '../common/FormattedDate';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

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

interface ActivityTableProps {
  dashboardFilter?: string;
}

// Helper to get filter display info
const getDashboardFilterInfo = (filter: string) => {
  const filterMap: Record<string, { label: string; hint: string; suggestion?: string }> = {
    auth: {
      label: 'Authentication Events',
      hint: 'Try filtering by action: "login", "logout", "register", or "auth.login.failed"',
      suggestion: 'login'
    },
    failed: {
      label: 'Failed Operations',
      hint: 'Look for actions containing "fail" or "error" in the action column',
    },
    system: {
      label: 'System Events',
      hint: 'Look for entries with "System" in the User column',
    },
    users: {
      label: 'Unique Active Users',
      hint: 'View all user activities below',
    },
    peak: {
      label: 'Peak Activity Hour',
      hint: 'View all activities below',
    },
    total: {
      label: 'Total Activities',
      hint: 'Showing all activities',
    },
  };
  return filterMap[filter] || null;
};

// Constants
const PAGINATION_LIMIT = 20;
const DEBOUNCE_DELAY = 500;

// Helper to get badge variant based on action type
const getActionBadgeVariant = (action: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (action.includes('fail') || action.includes('error')) {
    return 'destructive';
  }
  if (action.startsWith('auth') || action === 'login' || action === 'logout' || action === 'register') {
    return 'default';
  }
  return 'secondary';
};

// Columns definition - moved outside component to prevent recreation on every render
const ACTIVITY_TABLE_COLUMNS: ColumnDef<ActivityLog>[] = [
  {
    accessorKey: 'createdAt',
    header: 'Timestamp',
    cell: ({ row }) => {
      const timestamp = row.getValue('createdAt') as string;
      return (
        <div className="text-muted-foreground whitespace-nowrap">
          <FormattedDate date={timestamp} type="datetime" />
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
        <Badge variant={getActionBadgeVariant(action)} className="font-mono text-xs">
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
      if (!userAgent) {
        return <div className="text-muted-foreground text-xs">-</div>;
      }
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-muted-foreground text-xs max-w-xs truncate cursor-help">
                {userAgent}
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-md">
              <p className="text-xs break-all">{userAgent}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
];

function ActivityTableComponent({ dashboardFilter }: ActivityTableProps) {
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const limit = PAGINATION_LIMIT;

  // Immediate input values (not debounced)
  const [usernameInput, setUsernameInput] = useState('');
  const [actionInput, setActionInput] = useState('');
  const [resourceInput, setResourceInput] = useState('');
  const [startDateInput, setStartDateInput] = useState('');
  const [endDateInput, setEndDateInput] = useState('');
  const [dateRangeError, setDateRangeError] = useState<string>('');

  // Debounced values for API calls
  const debouncedUsername = useDebounce(usernameInput, DEBOUNCE_DELAY);
  const debouncedAction = useDebounce(actionInput, DEBOUNCE_DELAY);
  const debouncedResource = useDebounce(resourceInput, DEBOUNCE_DELAY);
  const debouncedStartDate = useDebounce(startDateInput, DEBOUNCE_DELAY);
  const debouncedEndDate = useDebounce(endDateInput, DEBOUNCE_DELAY);

  // Auto-expand filters and apply suggestion when dashboard filter changes
  useEffect(() => {
    if (dashboardFilter) {
      const filterInfo = getDashboardFilterInfo(dashboardFilter);
      if (filterInfo?.suggestion && !actionInput) {
        setActionInput(filterInfo.suggestion);
      }
      setShowFilters(true);
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardFilter]);

  // Validate date range
  useEffect(() => {
    if (debouncedStartDate && debouncedEndDate) {
      const start = new Date(debouncedStartDate);
      const end = new Date(debouncedEndDate);

      if (end < start) {
        setDateRangeError('End date must be after or equal to start date');
      } else {
        setDateRangeError('');
      }
    } else {
      setDateRangeError('');
    }
  }, [debouncedStartDate, debouncedEndDate]);

  // Build filters object from debounced values
  // Only include dates if the range is valid
  const hasValidDateRange = !dateRangeError || (!debouncedStartDate && !debouncedEndDate);
  const filters: ActivityFilters = useMemo(() => ({
    username: debouncedUsername || undefined,
    action: debouncedAction || undefined,
    resource: debouncedResource || undefined,
    startDate: hasValidDateRange ? (debouncedStartDate || undefined) : undefined,
    endDate: hasValidDateRange ? (debouncedEndDate || undefined) : undefined,
  }), [debouncedUsername, debouncedAction, debouncedResource, debouncedStartDate, debouncedEndDate, hasValidDateRange]);

  const { data, isLoading, isError, error } = useActivities(page, limit, filters);

  const handleClearFilters = () => {
    setUsernameInput('');
    setActionInput('');
    setResourceInput('');
    setStartDateInput('');
    setEndDateInput('');
    setDateRangeError('');
    setPage(1);
  };

  // Check if any filters are active
  const hasActiveFilters =
    usernameInput || actionInput || resourceInput || startDateInput || endDateInput;

  // Count active filters
  const activeFilterCount = [
    usernameInput,
    actionInput,
    resourceInput,
    startDateInput,
    endDateInput,
  ].filter(Boolean).length;

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-destructive">
        Error loading activity logs:{' '}
        {(error as any)?.response?.data?.error?.message || 'Unknown error'}
      </div>
    );
  }

  const dashboardFilterInfo = dashboardFilter ? getDashboardFilterInfo(dashboardFilter) : null;

  return (
    <div className="space-y-4">
      {/* Dashboard Filter Indicator */}
      {dashboardFilterInfo && (
        <div className="flex items-start gap-3 p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="default" className="font-semibold">
                {dashboardFilterInfo.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {dashboardFilterInfo.hint}
            </p>
          </div>
        </div>
      )}

      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              {showFilters ? 'Hide' : 'Show'} Filters
              {!showFilters && activeFilterCount > 0 && (
                <Badge
                  variant="default"
                  className="h-5 min-w-[20px] px-1.5 text-xs font-semibold"
                >
                  {activeFilterCount}
                </Badge>
              )}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  showFilters ? 'rotate-180' : ''
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
        <CollapsibleContent className="mt-4">
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username-filter">Username</Label>
                <Input
                  id="username-filter"
                  type="text"
                  value={usernameInput}
                  onChange={(e) => {
                    setUsernameInput(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Filter by username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="action-filter">Action (prefix match)</Label>
                <Input
                  id="action-filter"
                  type="text"
                  value={actionInput}
                  onChange={(e) => {
                    setActionInput(e.target.value);
                    setPage(1);
                  }}
                  placeholder="e.g. login, auth, users"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resource-filter">Resource (prefix match)</Label>
                <Input
                  id="resource-filter"
                  type="text"
                  value={resourceInput}
                  onChange={(e) => {
                    setResourceInput(e.target.value);
                    setPage(1);
                  }}
                  placeholder="e.g. users, roles"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date-filter">Start Date</Label>
                  <Input
                    id="start-date-filter"
                    type="datetime-local"
                    value={startDateInput}
                    onChange={(e) => {
                      setStartDateInput(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Filter by start date"
                    className={dateRangeError ? 'border-destructive' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date-filter">End Date</Label>
                  <Input
                    id="end-date-filter"
                    type="datetime-local"
                    value={endDateInput}
                    onChange={(e) => {
                      setEndDateInput(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Filter by end date"
                    className={dateRangeError ? 'border-destructive' : ''}
                  />
                </div>
              </div>

              {dateRangeError && (
                <div className="text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {dateRangeError}
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <DataTable
        columns={ACTIVITY_TABLE_COLUMNS}
        data={data?.data || []}
        pagination={data?.pagination}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage="No activity logs found"
      />
    </div>
  );
}

export const ActivityTable = memo(ActivityTableComponent);
