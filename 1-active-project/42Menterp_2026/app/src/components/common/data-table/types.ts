import { ReactNode } from "react";

export interface ColumnDef<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  accessorFn?: (row: T) => unknown;
  cell?: (info: { row: T; value: unknown }) => ReactNode;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
}

export interface FilterConfig {
  id: string;
  label: string;
  type: "select" | "date" | "dateRange";
  options?: { label: string; value: string }[];
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DataTableProps<T> {
  // 필수
  data: T[];
  columns: ColumnDef<T>[];

  // 선택 기능
  selectable?: boolean;
  selectedIds?: string[];
  onSelect?: (id: string) => void;
  onSelectAll?: (ids: string[]) => void;
  getRowId?: (row: T) => string;

  // 페이지네이션
  pagination?: PaginationState;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;

  // 정렬
  sortable?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (field: string, order: "asc" | "desc") => void;

  // 검색/필터
  searchable?: boolean;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  filters?: FilterConfig[];
  filterValues?: Record<string, string>;
  onFilter?: (filters: Record<string, string>) => void;

  // 상태
  loading?: boolean;
  emptyMessage?: string;

  // 행 액션
  onRowClick?: (row: T) => void;

  // 헤더 액션
  headerActions?: ReactNode;
}
