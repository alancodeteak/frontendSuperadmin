"use client";

import * as React from "react";
import {
  type ColumnDef,
  type PaginationState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronDown,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleX,
  Columns3,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DataTableServerPagination = {
  pageIndex: number;
  pageSize: number;
  total?: number;
  hasNextPage: boolean;
  onPageChange: (pageIndex: number) => void;
};

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  /** Hide the built-in client search box (e.g. when the page owns a server-side search). */
  hideSearch?: boolean;
  emptyMessage?: string;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  getRowId?: (row: TData, index: number) => string;
  onRowClick?: (row: TData) => void;
  rowClassName?: (row: TData) => string | undefined;
  serverPagination?: DataTableServerPagination;
  toolbar?: React.ReactNode;
  className?: string;
};

function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder = "Search table…",
  searchValue,
  onSearchChange,
  hideSearch = false,
  emptyMessage = "No results.",
  initialPageSize = 10,
  pageSizeOptions = [5, 10, 25, 50],
  getRowId,
  onRowClick,
  rowClassName,
  serverPagination,
  toolbar,
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [internalGlobalFilter, setInternalGlobalFilter] = React.useState("");
  const globalFilter = searchValue ?? internalGlobalFilter;
  const setGlobalFilter = React.useCallback(
    (value: string) => {
      if (onSearchChange) onSearchChange(value);
      else setInternalGlobalFilter(value);
    },
    [onSearchChange],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  });
  const columnMenuRef = React.useRef<HTMLDetailsElement>(null);

  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: {
      sorting,
      globalFilter,
      columnVisibility,
      pagination: serverPagination
        ? {
            pageIndex: serverPagination.pageIndex,
            pageSize: serverPagination.pageSize,
          }
        : pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: (updater) => {
      const next =
        typeof updater === "function" ? updater(globalFilter) : updater;
      setGlobalFilter(next);
    },
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: serverPagination ? undefined : setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: serverPagination ? undefined : getPaginationRowModel(),
    manualPagination: Boolean(serverPagination),
  });

  const visibleRows = table.getRowModel().rows;
  const firstResult = serverPagination
    ? serverPagination.pageIndex * serverPagination.pageSize +
      (data.length > 0 ? 1 : 0)
    : pagination.pageIndex * pagination.pageSize + (visibleRows.length > 0 ? 1 : 0);
  const lastResult = serverPagination
    ? serverPagination.pageIndex * serverPagination.pageSize + data.length
    : Math.min(
        pagination.pageIndex * pagination.pageSize + visibleRows.length,
        table.getFilteredRowModel().rows.length,
      );
  const resultCount =
    serverPagination?.total ?? table.getFilteredRowModel().rows.length;
  const canPrevious = serverPagination
    ? serverPagination.pageIndex > 0
    : table.getCanPreviousPage();
  const canNext = serverPagination
    ? serverPagination.hasNextPage
    : table.getCanNextPage();

  function changePage(nextPage: number) {
    if (serverPagination) {
      serverPagination.onPageChange(Math.max(0, nextPage));
      return;
    }
    table.setPageIndex(Math.max(0, nextPage));
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          {hideSearch ? null : (
            <div className="relative min-w-56 max-w-sm flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                className={cn("pl-9", globalFilter && "pr-9")}
                value={globalFilter}
                onChange={(event) => {
                  setGlobalFilter(event.target.value);
                  if (!serverPagination) table.setPageIndex(0);
                }}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
              />
              {globalFilter ? (
                <button
                  type="button"
                  aria-label="Clear table search"
                  className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setGlobalFilter("")}
                >
                  <CircleX className="size-4" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          )}
          {toolbar}
        </div>

        <details ref={columnMenuRef} className="group relative">
          <summary className="flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-input bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden">
            <Columns3 className="size-4 text-muted-foreground" />
            View
          </summary>
          <div className="absolute top-[calc(100%+0.35rem)] right-0 z-40 min-w-44 rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-lg">
            <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
              Toggle columns
            </p>
            {table
              .getAllLeafColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <label
                  key={column.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm capitalize hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={column.getIsVisible()}
                    onChange={(event) =>
                      column.toggleVisibility(event.target.checked)
                    }
                    className="size-4 accent-primary"
                  />
                  {column.columnDef.meta &&
                  typeof column.columnDef.meta === "object" &&
                  "label" in column.columnDef.meta
                    ? String(column.columnDef.meta.label)
                    : column.id.replaceAll("_", " ")}
                </label>
              ))}
          </div>
        </details>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <Table className="table-fixed">
          <TableHeader className="bg-muted/35">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={
                      header.getSize() !== 150
                        ? { width: `${header.getSize()}px` }
                        : undefined
                    }
                    className="h-11"
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        className="flex h-full w-full items-center justify-between gap-2 text-left"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {header.column.getIsSorted() === "asc" ? (
                          <ChevronUp className="size-4 shrink-0 opacity-60" />
                        ) : header.column.getIsSorted() === "desc" ? (
                          <ChevronDown className="size-4 shrink-0 opacity-60" />
                        ) : (
                          <span className="size-4 shrink-0" />
                        )}
                      </button>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {visibleRows.length ? (
              visibleRows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    onRowClick ? "cursor-pointer" : undefined,
                    rowClassName?.(row.original),
                  )}
                  onClick={(event) => {
                    if (!onRowClick) return;
                    const target = event.target as HTMLElement;
                    if (
                      target.closest(
                        "a,button,input,select,textarea,[role='button'],[role='menuitem']",
                      )
                    ) {
                      return;
                    }
                    onRowClick(row.original);
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        {!serverPagination ? (
          <div className="flex items-center gap-2">
            <Label
              htmlFor="data-table-page-size"
              className="hidden text-xs text-muted-foreground sm:block"
            >
              Rows per page
            </Label>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(value) => {
                if (value) table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger id="data-table-page-size" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((pageSize) => (
                  <SelectItem key={pageSize} value={String(pageSize)}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <span />
        )}

        <p
          className="text-sm whitespace-nowrap text-muted-foreground"
          aria-live="polite"
        >
          <span className="text-foreground">
            {firstResult}-{lastResult}
          </span>{" "}
          of <span className="text-foreground">{resultCount}</span>
        </p>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            disabled={!canPrevious}
            onClick={() => changePage(0)}
            aria-label="Go to first page"
          >
            <ChevronFirst className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            disabled={!canPrevious}
            onClick={() =>
              changePage(
                serverPagination
                  ? serverPagination.pageIndex - 1
                  : pagination.pageIndex - 1,
              )
            }
            aria-label="Go to previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            disabled={!canNext}
            onClick={() =>
              changePage(
                serverPagination
                  ? serverPagination.pageIndex + 1
                  : pagination.pageIndex + 1,
              )
            }
            aria-label="Go to next page"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            disabled={!canNext || Boolean(serverPagination)}
            onClick={() => table.lastPage()}
            aria-label="Go to last page"
          >
            <ChevronLast className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export { DataTable };
export type { ColumnDef };
