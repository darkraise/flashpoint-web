import { useState, memo, useMemo, useCallback, useTransition } from 'react';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { ChevronDown, AlertCircle } from 'lucide-react';
import { useActivities } from '@/hooks/useActivities';
import { useActivityFilters } from '@/hooks/useActivityFilters';
import { useDebounce } from '@/hooks/useDebounce';
import { ActivityFilters } from '@/types/auth';
import { getErrorMessage } from '@/types/api-error';
import { getActionBadgeVariant } from '@/utils/activityUtils';
import { DataTable } from '../ui/data-table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { FilterInput } from './FilterInput';
import { DatePicker } from '../ui/date-picker';
import { FormattedDate } from '../common/FormattedDate';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

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

const PAGINATION_LIMIT = 20;
const DEBOUNCE_DELAY = 500;

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
          {resourceId ? <span className="text-muted-foreground/60"> #{resourceId}</span> : null}
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
      return <div className="text-muted-foreground font-mono text-xs">{ipAddress || '-'}</div>;
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

  const [sortBy, setSortBy] = useState<
    'createdAt' | 'username' | 'action' | 'resource' | 'ipAddress'
  >('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [, startTransition] = useTransition();

  const { filters: filterState, updateFilter, clearFilters } = useActivityFilters();

  const debouncedUsername = useDebounce(filterState.username, DEBOUNCE_DELAY);
  const debouncedAction = useDebounce(filterState.action, DEBOUNCE_DELAY);
  const debouncedResource = useDebounce(filterState.resource, DEBOUNCE_DELAY);

  // Only include dates if the range is valid
  const hasValidDateRange =
    !filterState.dateRangeError || (!filterState.startDate && !filterState.endDate);
  const filters: ActivityFilters = useMemo(
    () => ({
      username: debouncedUsername || undefined,
      action: debouncedAction || undefined,
      resource: debouncedResource || undefined,
      startDate:
        hasValidDateRange && filterState.startDate
          ? filterState.startDate.toISOString()
          : undefined,
      endDate:
        hasValidDateRange && filterState.endDate ? filterState.endDate.toISOString() : undefined,
      sortBy,
      sortOrder,
    }),
    [
      debouncedUsername,
      debouncedAction,
      debouncedResource,
      filterState.startDate,
      filterState.endDate,
      hasValidDateRange,
      sortBy,
      sortOrder,
    ]
  );

  const { data, isLoading, isError, error } = useActivities(page, limit, filters);

  const sortingState: SortingState = useMemo(
    () => [{ id: sortBy, desc: sortOrder === 'desc' }],
    [sortBy, sortOrder]
  );

  const handleSortingChange = useCallback(
    (updaterOrValue: SortingState | ((old: SortingState) => SortingState)) => {
      const newSorting =
        typeof updaterOrValue === 'function' ? updaterOrValue(sortingState) : updaterOrValue;

      startTransition(() => {
        if (newSorting.length === 0) {
          setSortBy('createdAt');
          setSortOrder('desc');
        } else {
          const { id, desc } = newSorting[0];
          setSortBy(id as typeof sortBy);
          setSortOrder(desc ? 'desc' : 'asc');
        }
        setPage(1);
      });
    },
    [sortingState]
  );

  const handleClearFilters = useCallback(() => {
    clearFilters();
    setPage(1);
  }, [clearFilters]);

  const hasActiveFilters =
    filterState.username ||
    filterState.action ||
    filterState.resource ||
    filterState.startDate ||
    filterState.endDate;

  const activeFilterCount = [
    filterState.username,
    filterState.action,
    filterState.resource,
    filterState.startDate,
    filterState.endDate,
  ].filter(Boolean).length;

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 px-4 py-3 text-destructive">
        Error loading activity logs: {getErrorMessage(error)}
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
              {!showFilters && activeFilterCount > 0 ? (
                <Badge variant="default" className="h-5 min-w-[20px] px-1.5 text-xs font-semibold">
                  {activeFilterCount}
                </Badge>
              ) : null}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
              />
            </Button>
          </CollapsibleTrigger>
          {hasActiveFilters ? (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          ) : null}
        </div>
        <CollapsibleContent className="mt-4">
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FilterInput
                id="username-filter"
                label="Username"
                value={filterState.username}
                onChange={(val) => updateFilter('username', val)}
                placeholder="Filter by username"
                onPageReset={() => setPage(1)}
              />

              <FilterInput
                id="action-filter"
                label="Action (prefix match)"
                value={filterState.action}
                onChange={(val) => updateFilter('action', val)}
                placeholder="e.g. login, auth, users"
                onPageReset={() => setPage(1)}
              />

              <FilterInput
                id="resource-filter"
                label="Resource (prefix match)"
                value={filterState.resource}
                onChange={(val) => updateFilter('resource', val)}
                placeholder="e.g. users, roles"
                onPageReset={() => setPage(1)}
              />
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-date-filter">Start Date</Label>
                  <DatePicker
                    id="start-date-filter"
                    date={filterState.startDate}
                    onDateChange={(date) => {
                      updateFilter('startDate', date);
                      setPage(1);
                    }}
                    placeholder="Filter by start date"
                    clearable={true}
                    className={filterState.dateRangeError ? 'border-destructive' : ''}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date-filter">End Date</Label>
                  <DatePicker
                    id="end-date-filter"
                    date={filterState.endDate}
                    onDateChange={(date) => {
                      updateFilter('endDate', date);
                      setPage(1);
                    }}
                    placeholder="Filter by end date"
                    clearable={true}
                    className={filterState.dateRangeError ? 'border-destructive' : ''}
                  />
                </div>
              </div>

              {filterState.dateRangeError ? (
                <div className="text-sm text-destructive flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {filterState.dateRangeError}
                </div>
              ) : null}
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
