"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, FileDown, FileUp, ExternalLink, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DataTable,
  BulkActionBar,
  BulkDelete,
  BulkStatusChange,
  useSelection,
  usePagination,
  type ColumnDef,
  type FilterConfig,
} from "@/components/common";

interface StoreRow {
  [key: string]: unknown;
  id: string;
  name: string;
  mid: string;
  placeUrl: string | null;
  address: string | null;
  category: string | null;
  status: "ACTIVE" | "PAUSED" | "TERMINATED";
  customer: {
    name: string;
  } | null;
  createdAt: string;
}

const statusMap = {
  ACTIVE: { label: "활성", variant: "default" as const },
  PAUSED: { label: "일시정지", variant: "secondary" as const },
  TERMINATED: { label: "종료", variant: "destructive" as const },
};

const statusOptions = [
  { value: "ACTIVE", label: "활성" },
  { value: "PAUSED", label: "일시정지" },
  { value: "TERMINATED", label: "종료" },
];

const getFilenameFromHeader = (header: string | null) => {
  if (!header) return null;
  const utfMatch = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1]);
  const asciiMatch = header.match(/filename="?([^";]+)"?/i);
  return asciiMatch?.[1] || null;
};

const downloadBlob = async (response: Response, fallbackName: string) => {
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    getFilenameFromHeader(response.headers.get("content-disposition")) ||
    fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export default function StoresPage() {
  const router = useRouter();
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    status: "all",
  });

  const { pagination, setPagination, setPage } = usePagination({
    initialLimit: 20,
  });
  const { selectedIds, toggle, selectAll, clear, selectedCount } =
    useSelection();

  // 컬럼 정의
  const columns: ColumnDef<StoreRow>[] = useMemo(
    () => [
      {
        id: "name",
        header: "매장명",
        accessorKey: "name",
        cell: ({ row }) => (
          <Link
            href={`/stores/${row.id}`}
            className="font-medium hover:underline"
          >
            {row.name}
          </Link>
        ),
      },
      {
        id: "mid",
        header: "MID",
        accessorKey: "mid",
        cell: ({ value }) => (
          <span className="font-mono text-sm">{value as string}</span>
        ),
        width: "120px",
      },
      {
        id: "address",
        header: "주소",
        accessorKey: "address",
        cell: ({ value }) => (
          <span className="max-w-[200px] truncate block">
            {(value as string) || "-"}
          </span>
        ),
      },
      {
        id: "category",
        header: "업종",
        accessorKey: "category",
        cell: ({ value }) => (value as string) || "-",
        width: "120px",
      },
      {
        id: "customer",
        header: "고객명",
        accessorFn: (row) => row.customer?.name || "-",
        width: "120px",
      },
      {
        id: "status",
        header: "상태",
        accessorKey: "status",
        cell: ({ value }) => {
          const status = value as keyof typeof statusMap;
          return (
            <Badge variant={statusMap[status].variant}>
              {statusMap[status].label}
            </Badge>
          );
        },
        width: "100px",
      },
      {
        id: "placeUrl",
        header: "링크",
        accessorKey: "placeUrl",
        cell: ({ value }) =>
          value ? (
            <a
              href={value as string}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null,
        width: "60px",
        align: "center",
      },
    ],
    []
  );

  // 필터 설정
  const filters: FilterConfig[] = useMemo(
    () => [
      {
        id: "status",
        label: "상태",
        type: "select",
        options: [
          { label: "전체", value: "all" },
          { label: "활성", value: "ACTIVE" },
          { label: "일시정지", value: "PAUSED" },
          { label: "종료", value: "TERMINATED" },
        ],
      },
    ],
    []
  );

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.append("search", search);
      if (filterValues.status && filterValues.status !== "all") {
        params.append("status", filterValues.status);
      }

      const res = await fetch(`/api/stores?${params}`);
      const data = await res.json();

      if (res.ok) {
        setStores(data.stores);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch stores:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, filterValues, setPagination]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStores();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchStores]);

  // 데이터 변경 시 선택 상태 정리
  useEffect(() => {
    const currentIds = stores.map((s) => s.id);
    const validIds = selectedIds.filter((id) => currentIds.includes(id));
    if (validIds.length !== selectedIds.length) {
      selectAll(validIds);
    }
  }, [stores, selectedIds, selectAll]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleFilter = (values: Record<string, string>) => {
    setFilterValues(values);
    setPage(1);
  };

  const handleExport = async () => {
    if (selectedIds.length === 0) return;
    try {
      const params = new URLSearchParams({
        ids: selectedIds.join(","),
      });
      const res = await fetch(`/api/stores/export?${params}`);
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "엑셀 내보내기에 실패했습니다");
        return;
      }
      await downloadBlob(res, "매장_내보내기.xlsx");
    } catch (error) {
      console.error("Failed to export stores:", error);
      toast.error("엑셀 내보내기 중 오류가 발생했습니다");
    }
  };

  const handleTemplateDownload = async () => {
    try {
      const res = await fetch("/api/stores/template");
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "양식 다운로드에 실패했습니다");
        return;
      }
      await downloadBlob(res, "매장_엑셀_양식.xlsx");
    } catch (error) {
      console.error("Failed to download template:", error);
      toast.error("양식 다운로드 중 오류가 발생했습니다");
    }
  };

  const handleRowClick = (row: StoreRow) => {
    router.push(`/stores/${row.id}`);
  };

  // 헤더 액션 버튼들
  const headerActions = (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={handleTemplateDownload}>
        <FileDown className="h-4 w-4 mr-2" />
        엑셀 양식
      </Button>
      <Button variant="outline" asChild>
        <Link href="/stores/import">
          <FileUp className="h-4 w-4 mr-2" />
          엑셀 업로드
        </Link>
      </Button>
      <Button asChild>
        <Link href="/stores/new">
          <Plus className="h-4 w-4 mr-2" />
          매장 등록
        </Link>
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">매장 관리</h2>
          <p className="text-muted-foreground">
            등록된 매장을 관리하고 새 매장을 추가하세요.
          </p>
        </div>
        {headerActions}
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            data={stores}
            columns={columns}
            selectable
            selectedIds={selectedIds}
            onSelect={toggle}
            onSelectAll={selectAll}
            getRowId={(row) => row.id}
            pagination={pagination}
            onPageChange={setPage}
            searchable
            searchValue={search}
            searchPlaceholder="매장명, MID, 주소 검색..."
            onSearch={handleSearch}
            filters={filters}
            filterValues={filterValues}
            onFilter={handleFilter}
            loading={loading}
            emptyMessage={
              search || filterValues.status !== "all"
                ? "검색 결과가 없습니다."
                : "등록된 매장이 없습니다."
            }
          />
        </CardContent>
      </Card>

      {/* 일괄 작업 바 */}
      <BulkActionBar selectedCount={selectedCount} onClear={clear}>
        <BulkStatusChange
          selectedIds={selectedIds}
          resource="stores"
          options={statusOptions}
          onSuccess={() => {
            fetchStores();
            clear();
          }}
          disabled={bulkLoading}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={bulkLoading}
        >
          <Download className="mr-1 h-4 w-4" />
          엑셀 내보내기
        </Button>
        <BulkDelete
          selectedIds={selectedIds}
          resource="stores"
          onSuccess={() => {
            fetchStores();
            clear();
          }}
          confirmMessage="선택한 매장을 삭제하시겠습니까? 연결된 발주나 정산이 있는 매장은 삭제할 수 없습니다."
          disabled={bulkLoading}
        />
      </BulkActionBar>
    </div>
  );
}
