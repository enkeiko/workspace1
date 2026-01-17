"use client";

import { useState, useCallback, ReactNode } from "react";
import {
  Download,
  Upload,
  FileSpreadsheet,
  Plus,
  MoreHorizontal,
  Trash2,
  Edit,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "./data-table/data-table";
import { ColumnDef, FilterConfig, PaginationState } from "./data-table/types";
import { cn } from "@/lib/utils";

export interface BulkAction<T> {
  label: string;
  icon?: ReactNode;
  onClick: (selectedRows: T[]) => void | Promise<void>;
  variant?: "default" | "destructive";
  disabled?: boolean;
}

export interface DataTableV2Props<T extends Record<string, unknown>> {
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

  // Excel 기능
  enableExcel?: boolean;
  onExcelDownload?: () => Promise<void>;
  onExcelUpload?: (file: File) => Promise<void>;
  onTemplateDownload?: () => Promise<void>;
  excelUploadLabel?: string;

  // Bulk Actions
  enableBulkActions?: boolean;
  bulkActions?: BulkAction<T>[];

  // 신규 등록
  onNewClick?: () => void;
  newButtonLabel?: string;

  // 추가 헤더 액션
  extraHeaderActions?: ReactNode;
}

export function DataTableV2<T extends Record<string, unknown>>({
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
  searchPlaceholder = "검색...",
  onSearch,
  filters,
  filterValues,
  onFilter,
  loading = false,
  emptyMessage = "데이터가 없습니다",
  onRowClick,
  enableExcel = false,
  onExcelDownload,
  onExcelUpload,
  onTemplateDownload,
  excelUploadLabel = "Excel 업로드",
  enableBulkActions = false,
  bulkActions = [],
  onNewClick,
  newButtonLabel = "신규 등록",
  extraHeaderActions,
}: DataTableV2Props<T>) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);

  // 선택된 행 데이터 가져오기
  const selectedRows = data.filter((row) => selectedIds.includes(getRowId(row)));

  // Excel 다운로드 핸들러
  const handleExcelDownload = useCallback(async () => {
    if (!onExcelDownload) return;
    setExcelLoading(true);
    try {
      await onExcelDownload();
    } finally {
      setExcelLoading(false);
    }
  }, [onExcelDownload]);

  // 템플릿 다운로드 핸들러
  const handleTemplateDownload = useCallback(async () => {
    if (!onTemplateDownload) return;
    setExcelLoading(true);
    try {
      await onTemplateDownload();
    } finally {
      setExcelLoading(false);
    }
  }, [onTemplateDownload]);

  // 파일 선택 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // 업로드 핸들러
  const handleUpload = async () => {
    if (!selectedFile || !onExcelUpload) return;

    setUploading(true);
    try {
      await onExcelUpload(selectedFile);
      setUploadDialogOpen(false);
      setSelectedFile(null);
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  // Bulk Action 핸들러
  const handleBulkAction = async (action: BulkAction<T>) => {
    if (selectedRows.length === 0) return;
    await action.onClick(selectedRows);
  };

  // 헤더 액션 렌더링
  const headerActions = (
    <div className="flex items-center gap-2">
      {/* 선택된 항목 표시 & Bulk Actions */}
      {enableBulkActions && selectedIds.length > 0 && (
        <div className="flex items-center gap-2 mr-2 px-3 py-1.5 bg-primary/10 rounded-md">
          <span className="text-sm font-medium text-primary">
            {selectedIds.length}개 선택됨
          </span>
          {bulkActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <MoreHorizontal className="h-4 w-4 mr-1" />
                  일괄 작업
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {bulkActions.map((action, index) => (
                  <DropdownMenuItem
                    key={index}
                    onClick={() => handleBulkAction(action)}
                    disabled={action.disabled}
                    className={cn(
                      action.variant === "destructive" && "text-destructive"
                    )}
                  >
                    {action.icon && <span className="mr-2">{action.icon}</span>}
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* Excel 기능 */}
      {enableExcel && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={excelLoading}>
              {excelLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4 mr-2" />
              )}
              Excel
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onTemplateDownload && (
              <DropdownMenuItem onClick={handleTemplateDownload}>
                <Download className="h-4 w-4 mr-2" />
                양식 다운로드
              </DropdownMenuItem>
            )}
            {onExcelUpload && (
              <DropdownMenuItem onClick={() => setUploadDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                {excelUploadLabel}
              </DropdownMenuItem>
            )}
            {(onTemplateDownload || onExcelUpload) && onExcelDownload && (
              <DropdownMenuSeparator />
            )}
            {onExcelDownload && (
              <DropdownMenuItem onClick={handleExcelDownload}>
                <Download className="h-4 w-4 mr-2" />
                데이터 내보내기
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* 추가 헤더 액션 */}
      {extraHeaderActions}

      {/* 신규 등록 버튼 */}
      {onNewClick && (
        <Button onClick={onNewClick} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          {newButtonLabel}
        </Button>
      )}
    </div>
  );

  return (
    <>
      <DataTable
        data={data}
        columns={columns}
        selectable={selectable}
        selectedIds={selectedIds}
        onSelect={onSelect}
        onSelectAll={onSelectAll}
        getRowId={getRowId}
        pagination={pagination}
        onPageChange={onPageChange}
        onLimitChange={onLimitChange}
        sortable={sortable}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={onSort}
        searchable={searchable}
        searchValue={searchValue}
        searchPlaceholder={searchPlaceholder}
        onSearch={onSearch}
        filters={filters}
        filterValues={filterValues}
        onFilter={onFilter}
        loading={loading}
        emptyMessage={emptyMessage}
        onRowClick={onRowClick}
        headerActions={headerActions}
      />

      {/* Excel 업로드 다이얼로그 */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{excelUploadLabel}</DialogTitle>
            <DialogDescription>
              Excel 파일을 선택하여 데이터를 일괄 등록합니다. 양식에 맞게 작성된
              파일만 업로드해주세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="excel-file">파일 선택</Label>
              <Input
                id="excel-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
              />
            </div>

            {selectedFile && (
              <div className="text-sm text-muted-foreground">
                선택된 파일: {selectedFile.name}
              </div>
            )}

            <div className="flex justify-between">
              {onTemplateDownload && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={handleTemplateDownload}
                  className="p-0"
                >
                  <Download className="h-4 w-4 mr-1" />
                  양식 다운로드
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button
                  variant="outline"
                  onClick={() => {
                    setUploadDialogOpen(false);
                    setSelectedFile(null);
                  }}
                >
                  취소
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                >
                  {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  업로드
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// 기본 Bulk Actions 생성 헬퍼
export function createBulkDeleteAction<T>(
  onDelete: (rows: T[]) => Promise<void>
): BulkAction<T> {
  return {
    label: "일괄 삭제",
    icon: <Trash2 className="h-4 w-4" />,
    onClick: onDelete,
    variant: "destructive",
  };
}

export function createBulkEditAction<T>(
  onEdit: (rows: T[]) => Promise<void>
): BulkAction<T> {
  return {
    label: "일괄 수정",
    icon: <Edit className="h-4 w-4" />,
    onClick: onEdit,
  };
}
