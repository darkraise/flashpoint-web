import { useState, useEffect, memo, useMemo, useCallback, useRef, useTransition } from 'react';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { ChevronDown, AlertCircle } from 'lucide-react';
import { useActivities } from '../../hooks/useActivities';
import { useDebounce } from '../../hooks/useDebounce';
import { ActivityFilters } from '../../types/auth';
import { getApiErrorMessage } from '@/utils/errorUtils';
import { DataTable } from '../ui/data-table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { DatePicker } from '../ui/date-picker';
import { FormattedDate } from '../common/FormattedDate';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import {
  Tooltip,
  TooltipContent,
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
    enableSorting: true,
    sortDescFirst: true,
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
    enableSorting: true,
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
    enableSorting: true,
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
    enableSorting: true,
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
    enableSorting: true,
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
    enableSorting: false,
    cell: ({ row }) => {
      const userAgent = row.getValue('userAgent') as string | null;
      if (!userAgent) {
        return <div className="text-muted-foreground text-xs">-</div>;
      }
      return (
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
      );
    },
  },
];

function ActivityTableComponent() {
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const limit = PAGINATION_LIMIT;

  // Sorting state
  const [sortBy, setSortBy] = useState<'createdAt' | 'username' | 'action' | 'resource' | 'ipAddress'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Ref to track current sorting state without closure issues
  const sortingStateRef = useRef<SortingState>([{ id: 'createdAt', desc: true }]);

  // Transition for deferred state updates
  const [, startTransition] = useTransition();

  // Immediate input values (not debounced)
  const [usernameInput, setUsernameInput] = useState('');
  const [actionInput, setActionInput] = useState('');
  const [resourceInput, setResourceInput] = useState('');
  const [startDateInput, setStartDateInput] = useState<Date | undefined>(undefined);
  const [endDateInput, setEndDateInput] = useState<Date | undefined>(undefined);
  const [dateRangeError, setDateRangeError] = useState<string>('');

  // Debounced values for API calls
  const debouncedUsername = useDebounce(usernameInput, DEBOUNCE_DELAY);
  const debouncedAction = useDebounce(actionInput, DEBOUNCE_DELAY);
  const debouncedResource = useDebounce(resourceInput, DEBOUNCE_DELAY);


  // Validate date range
  useEffect(() => {
    if (startDateInput && endDateInput) {
      if (endDateInput < startDateInput) {
        setDateRangeError('End date must be after or equal to start date');
      } else {
        setDateRangeError('');
      }
    } else {
      setDateRangeError('');
    }
  }, [startDateInput, endDateInput]);

  // Build filters object - convert Date objects to ISO strings for API
  // Only include dates if the range is valid
  const hasValidDateRange = !dateRangeError || (!startDateInput && !endDateInput);
  const filters: ActivityFilters = useMemo(() => ({
    username: debouncedUsername || undefined,
    action: debouncedAction || undefined,
    resource: debouncedResource || undefined,
    startDate: hasValidDateRange && startDateInput ? startDateInput.toISOString() : undefined,
    endDate: hasValidDateRange && endDateInput ? endDateInput.toISOString() : undefined,
    sortBy,
    sortOrder,
  }), [debouncedUsername, debouncedAction, debouncedResource, startDateInput, endDateInput, hasValidDateRange, sortBy, sortOrder]);

  const { data, isLoading, isError, error } = useActivities(page, limit, filters);

  // Convert sorting state to TanStack Table format
  const sortingState: SortingState = useMemo(() => [
    { id: sortBy, desc: sortOrder === 'desc' }
  ], [sortBy, sortOrder]);

  // Keep ref in sync with sortingState
  useEffect(() => {
    sortingStateRef.current = sortingState;
  }, [sortingState]);

  // Handle sorting changes from DataTable
  const handleSortingChange = useCallback((updaterOrValue: SortingState | ((old: SortingState) => SortingState)) => {
    // Use the ref to get the current state, avoiding stale closure
    const newSorting = typeof updaterOrValue === 'function'
      ? updaterOrValue(sortingStateRef.current)
      : updaterOrValue;

    // Wrap state updates in transition to defer prop changes
    startTransition(() => {
      if (newSorting.length === 0) {
        // Reset to default when cleared
        setSortBy('createdAt');
        setSortOrder('desc');
      } else {
        const { id, desc } = newSorting[0];
        setSortBy(id as typeof sortBy);
        setSortOrder(desc ? 'desc' : 'asc');
      }
      setPage(1); // Reset to first page on sort change
    });
  }, []); // Empty dependency array - callback is stable

  const handleClearFilters = () => {
    setUsernameInput('');
    setActionInput('');
    setResourceInput('');
    setStartDateInput(undefined);
    setEndDateInput(undefined);
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
        Error loading activity logs: {getApiErrorMessage(error, 'Unknown error')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
                  <DatePicker
                    id="start-date-filter"
                    date={startDateInput}
                    onDateChange={(date) => {
                      setStartDateInput(date);
                      setPage(1);
                    }}
                    placeholder="Filter by start date"
                    clearable={true}
                    className={dateRangeError ? 'border-destructive' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date-filter">End Date</Label>
                  <DatePicker
                    id="end-date-filter"
                    date={endDateInput}
                    onDateChange={(date) => {
                      setEndDateInput(date);
                      setPage(1);
                    }}
                    placeholder="Filter by end date"
                    clearable={true}
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
        sorting={sortingState}
        onSortingChange={handleSortingChange}
        isLoading={isLoading}
        emptyMessage="No activity logs found"
        caption="Activity logs showing user actions and system events"
      />
    </div>
  );
}

export const ActivityTable = memo(ActivityTableComponent);
