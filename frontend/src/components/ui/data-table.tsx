import * as React from 'react';
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { getSortIcon } from './data-table-utils';
import { Pagination } from './pagination';

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

  // Use controlled sorting if provided, otherwise use internal state
  const sorting = controlledSorting ?? internalSorting;

  const setSorting = React.useCallback(
    (updater: SortingState | ((old: SortingState) => SortingState)) => {
      if (onControlledSortingChange) {
        onControlledSortingChange(updater);
      } else {
        setInternalSorting(updater);
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
    onSortingChange: setSorting,
    state: {
      sorting,
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
                                header.column.toggleSorting(
                                  header.column.getIsSorted() === 'asc',
                                  e.shiftKey
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
                              header.column.getCanSort() &&
                              typeof header.column.columnDef.header === 'string'
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
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
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
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(page) => onPageChange?.(page)}
            />
          </div>
        ) : null}
      </Card>
    </div>
  );
}
