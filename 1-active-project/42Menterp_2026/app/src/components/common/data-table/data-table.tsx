"use client";

import { useCallback, useMemo, useRef } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DataTableHeader } from "./data-table-header";
import { DataTablePagination } from "./data-table-pagination";
import { DataTableProps, ColumnDef } from "./types";

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  selectable = false,
  selectedIds = [],
  onSelect,
  onSelectAll,
  getRowId = (row) => (row.id as string) || "",
  pagination,
  onPageChange,
  onLimitChange,
  sortable = false,
  sortBy,
  sortOrder,
  onSort,
  searchable = false,
  searchValue,
  searchPlaceholder,
  onSearch,
  filters,
  filterValues,
  onFilter,
  loading = false,
  emptyMessage = "데이터가 없습니다",
  onRowClick,
  headerActions,
}: DataTableProps<T>) {
  const lastSelectedRef = useRef<string | null>(null);

  // 전체 선택 상태 계산
  const allRowIds = useMemo(() => data.map(getRowId), [data, getRowId]);
  const isAllSelected = useMemo(
    () => allRowIds.length > 0 && allRowIds.every((id) => selectedIds.includes(id)),
    [allRowIds, selectedIds]
  );
  const isSomeSelected = useMemo(
    () => selectedIds.length > 0 && !isAllSelected,
    [selectedIds.length, isAllSelected]
  );

  // 전체 선택/해제 핸들러
  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      onSelectAll?.([]);
    } else {
      onSelectAll?.(allRowIds);
    }
  }, [isAllSelected, allRowIds, onSelectAll]);

  // 개별 행 선택 핸들러 (Shift 키 지원)
  const handleRowSelect = useCallback(
    (id: string, event: React.MouseEvent) => {
      if (event.shiftKey && lastSelectedRef.current && onSelectAll) {
        const startIndex = allRowIds.indexOf(lastSelectedRef.current);
        const endIndex = allRowIds.indexOf(id);

        if (startIndex !== -1 && endIndex !== -1) {
          const [from, to] = startIndex < endIndex
            ? [startIndex, endIndex]
            : [endIndex, startIndex];
          const rangeIds = allRowIds.slice(from, to + 1);
          const newSet = new Set([...selectedIds, ...rangeIds]);
          onSelectAll(Array.from(newSet));
          return;
        }
      }

      lastSelectedRef.current = id;
      onSelect?.(id);
    },
    [allRowIds, selectedIds, onSelect, onSelectAll]
  );

  // 정렬 핸들러
  const handleSort = useCallback(
    (field: string) => {
      if (!onSort) return;
      const newOrder =
        sortBy === field && sortOrder === "asc" ? "desc" : "asc";
      onSort(field, newOrder);
    },
    [sortBy, sortOrder, onSort]
  );

  // 셀 값 추출
  const getCellValue = useCallback(
    (row: T, column: ColumnDef<T>) => {
      if (column.accessorFn) {
        return column.accessorFn(row);
      }
      if (column.accessorKey) {
        return row[column.accessorKey as string];
      }
      return null;
    },
    []
  );

  // 정렬 아이콘 렌더링
  const renderSortIcon = (columnId: string) => {
    if (sortBy !== columnId) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  return (
    <div className="space-y-4">
      {/* 헤더 (검색, 필터, 액션) */}
      {(searchable || filters?.length || headerActions) && (
        <DataTableHeader
          searchable={searchable}
          searchValue={searchValue}
          searchPlaceholder={searchPlaceholder}
          onSearch={onSearch}
          filters={filters}
          filterValues={filterValues}
          onFilter={onFilter}
          headerActions={headerActions}
        />
      )}

      {/* 테이블 */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {/* 선택 체크박스 */}
              {selectable && (
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isSomeSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="전체 선택"
                  />
                </TableHead>
              )}

              {/* 컬럼 헤더 */}
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  style={{ width: column.width }}
                  className={cn(
                    column.align === "center" && "text-center",
                    column.align === "right" && "text-right"
                  )}
                >
                  {column.sortable !== false && sortable && onSort ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8 data-[state=open]:bg-accent"
                      onClick={() => handleSort(column.id)}
                    >
                      {column.header}
                      {renderSortIcon(column.id)}
                    </Button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="h-32 text-center"
                >
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">불러오는 중...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="h-32 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => {
                const rowId = getRowId(row);
                const isSelected = selectedIds.includes(rowId);

                return (
                  <TableRow
                    key={rowId}
                    data-state={isSelected ? "selected" : undefined}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(onRowClick && "cursor-pointer")}
                  >
                    {/* 선택 체크박스 */}
                    {selectable && (
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => {}}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowSelect(rowId, e);
                          }}
                          aria-label={`${rowId} 선택`}
                        />
                      </TableCell>
                    )}

                    {/* 데이터 셀 */}
                    {columns.map((column) => {
                      const value = getCellValue(row, column);
                      return (
                        <TableCell
                          key={column.id}
                          className={cn(
                            column.align === "center" && "text-center",
                            column.align === "right" && "text-right"
                          )}
                        >
                          {column.cell
                            ? column.cell({ row, value })
                            : (value as React.ReactNode)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* 페이지네이션 */}
      {pagination && (
        <DataTablePagination
          pagination={pagination}
          onPageChange={onPageChange}
          onLimitChange={onLimitChange}
        />
      )}
    </div>
  );
}
