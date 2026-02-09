import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

import { getSortIcon } from './data-table-utils';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
  };
  onPageChange?: (page: number) => void;
  sorting?: SortingState;
  onSortingChange?: (updater: SortingState | ((old: SortingState) => SortingState)) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  caption?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pagination,
  onPageChange,
  sorting: controlledSorting,
  onSortingChange: onControlledSortingChange,
  isLoading = false,
  emptyMessage = 'No results.',
  caption,
}: DataTableProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  // Use controlled sorting if provided, otherwise use internal state
  const sorting = controlledSorting ?? internalSorting;

  const setSorting = React.useCallback(
    (updater: SortingState | ((old: SortingState) => SortingState)) => {
      if (onControlledSortingChange) {
        onControlledSortingChange(updater);
      } else {
        // Properly handle both function and value updaters
        if (typeof updater === 'function') {
          setInternalSorting((old) => updater(old));
        } else {
          setInternalSorting(updater);
        }
      }
    },
    [onControlledSortingChange]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: pagination ? undefined : getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    manualPagination: !!pagination,
    manualSorting: !!controlledSorting,
    pageCount: pagination?.totalPages,
    enableSortingRemoval: false,
  });

  if (isLoading) {
    return (
      <div
        className="text-center py-8 text-muted-foreground"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="sr-only">Loading data, please wait...</span>
        <span aria-hidden="true">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-md">
        <div className="overflow-x-auto">
          <Table>
            {caption && <caption className="sr-only">{caption}</caption>}
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : (
                          <div
                            className={
                              header.column.getCanSort()
                                ? 'flex items-center gap-2 cursor-pointer select-none hover:text-primary transition-colors'
                                : ''
                            }
                            onClick={header.column.getToggleSortingHandler()}
                            role={header.column.getCanSort() ? 'button' : undefined}
                            tabIndex={header.column.getCanSort() ? 0 : undefined}
                            onKeyDown={(e) => {
                              if (
                                header.column.getCanSort() &&
                                (e.key === 'Enter' || e.key === ' ')
                              ) {
                                e.preventDefault();
                                header.column.getToggleSortingHandler()?.(
                                  e as unknown as React.MouseEvent
                                );
                              }
                            }}
                            aria-sort={
                              header.column.getIsSorted() === 'asc'
                                ? 'ascending'
                                : header.column.getIsSorted() === 'desc'
                                  ? 'descending'
                                  : undefined
                            }
                            aria-label={
                              header.column.getCanSort()
                                ? `Sort by ${header.column.columnDef.header}`
                                : undefined
                            }
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {getSortIcon(header.column.getIsSorted())}
                          </div>
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {pagination && pagination.totalPages > 1 ? (
          <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center p-4 border-t bg-muted/30">
            <div className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange?.(1)}
                disabled={pagination.page === 1}
                title="First page"
                aria-label="Go to first page"
              >
                <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange?.(pagination.totalPages)}
                disabled={pagination.page === pagination.totalPages}
                title="Last page"
                aria-label="Go to last page"
              >
                <ChevronsRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
