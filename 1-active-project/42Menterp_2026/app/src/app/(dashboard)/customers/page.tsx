"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, FileDown, FileUp, Store, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
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
import { CustomerTaxStatus } from "./components/customer-tax-status";
import { TaxInvoiceSummary } from "./components/tax-invoice-summary";

interface CustomerRow {
  [key: string]: unknown;
  id: string;
  name: string;
  businessNo: string | null;
  representative: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  address: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  status: "ACTIVE" | "PAUSED" | "TERMINATED";
  _count: {
    stores: number;
  };
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

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
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
  const columns: ColumnDef<CustomerRow>[] = useMemo(
    () => [
      {
        id: "name",
        header: "고객명",
        accessorKey: "name",
        cell: ({ row }) => (
          <Link
            href={`/customers/${row.id}`}
            className="font-medium hover:underline"
          >
            {row.name}
          </Link>
        ),
      },
      {
        id: "businessNo",
        header: "사업자번호",
        accessorKey: "businessNo",
        cell: ({ value }) => (
          <span className="font-mono text-sm">
            {(value as string) || "-"}
          </span>
        ),
      },
      {
        id: "contactName",
        header: "담당자",
        accessorKey: "contactName",
        cell: ({ value }) => (value as string) || "-",
      },
      {
        id: "contactPhone",
        header: "연락처",
        accessorKey: "contactPhone",
        cell: ({ value }) => (value as string) || "-",
      },
      {
        id: "contract",
        header: "계약기간",
        accessorFn: (row) =>
          row.contractStart && row.contractEnd
            ? `${format(new Date(row.contractStart), "yy.MM.dd")} ~ ${format(new Date(row.contractEnd), "yy.MM.dd")}`
            : "-",
      },
      {
        id: "stores",
        header: "매장수",
        accessorFn: (row) => row._count.stores,
        cell: ({ value }) => (
          <div className="flex items-center gap-1">
            <Store className="h-4 w-4 text-muted-foreground" />
            <span>{value as number}</span>
          </div>
        ),
        align: "center",
        width: "80px",
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
        id: "taxStatus",
        header: "세금계산서",
        accessorFn: (row) => row,
        cell: ({ row }) => (
          <CustomerTaxStatus
            businessNo={row.businessNo}
            representative={row.representative}
            address={row.address}
            contactEmail={row.contactEmail}
            compact
          />
        ),
        width: "120px",
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

  const fetchCustomers = useCallback(async () => {
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

      const res = await fetch(`/api/customers?${params}`);
      const data = await res.json();

      if (res.ok) {
        setCustomers(data.customers);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, filterValues, setPagination]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  // 데이터 변경 시 선택 상태 정리
  useEffect(() => {
    const currentIds = customers.map((c) => c.id);
    const validIds = selectedIds.filter((id) => currentIds.includes(id));
    if (validIds.length !== selectedIds.length) {
      selectAll(validIds);
    }
  }, [customers, selectedIds, selectAll]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleFilter = (values: Record<string, string>) => {
    setFilterValues(values);
    setPage(1);
  };

  const handleBulkStatusChange = async (status: string) => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/customers/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedIds,
          action: "update",
          data: { status },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`상태 변경 완료: ${data.summary.updated}건`);
        clear();
        fetchCustomers();
      } else {
        toast.error(data.error || "상태 변경에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to update customers:", error);
      toast.error("상태 변경 중 오류가 발생했습니다");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/customers/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedIds,
          action: "delete",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          `삭제 완료: ${data.summary.deleted}건 (차단 ${data.summary.failed}건)`
        );
        const blockedIds = (data.errors || []).map(
          (item: { id: string }) => item.id
        );
        selectAll(blockedIds);
        fetchCustomers();
      } else {
        toast.error(data.error || "일괄 삭제에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to delete customers:", error);
      toast.error("삭제 중 오류가 발생했습니다");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleExport = async () => {
    if (selectedIds.length === 0) return;
    try {
      const params = new URLSearchParams({
        ids: selectedIds.join(","),
      });
      const res = await fetch(`/api/customers/export?${params}`);
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "엑셀 내보내기에 실패했습니다");
        return;
      }
      await downloadBlob(res, "고객_내보내기.xlsx");
    } catch (error) {
      console.error("Failed to export customers:", error);
      toast.error("엑셀 내보내기 중 오류가 발생했습니다");
    }
  };

  const handleTemplateDownload = async () => {
    try {
      const res = await fetch("/api/customers/template");
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "양식 다운로드에 실패했습니다");
        return;
      }
      await downloadBlob(res, "고객_엑셀_양식.xlsx");
    } catch (error) {
      console.error("Failed to download template:", error);
      toast.error("양식 다운로드 중 오류가 발생했습니다");
    }
  };

  const handleRowClick = (row: CustomerRow) => {
    router.push(`/customers/${row.id}`);
  };

  // 헤더 액션 버튼들
  const headerActions = (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={handleTemplateDownload}>
        <FileDown className="h-4 w-4 mr-2" />
        엑셀 양식
      </Button>
      <Button variant="outline" asChild>
        <Link href="/customers/import">
          <FileUp className="h-4 w-4 mr-2" />
          엑셀 업로드
        </Link>
      </Button>
      <Button asChild>
        <Link href="/customers/new">
          <Plus className="h-4 w-4 mr-2" />
          고객 등록
        </Link>
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">고객 관리</h2>
          <p className="text-muted-foreground">
            등록된 고객(광고주)을 관리하고 새 고객을 추가하세요.
          </p>
        </div>
        {headerActions}
      </div>

      {/* 세금계산서 준비 현황 요약 */}
      <TaxInvoiceSummary />

      <Card>
        <CardContent className="pt-6">
          <DataTable
            data={customers}
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
            searchPlaceholder="고객명, 사업자번호, 담당자 검색..."
            onSearch={handleSearch}
            filters={filters}
            filterValues={filterValues}
            onFilter={handleFilter}
            loading={loading}
            emptyMessage={
              search || filterValues.status !== "all"
                ? "검색 결과가 없습니다."
                : "등록된 고객이 없습니다."
            }
          />
        </CardContent>
      </Card>

      {/* 일괄 작업 바 */}
      <BulkActionBar selectedCount={selectedCount} onClear={clear}>
        <BulkStatusChange
          selectedIds={selectedIds}
          resource="customers"
          options={statusOptions}
          onSuccess={() => {
            fetchCustomers();
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
          resource="customers"
          onSuccess={() => {
            fetchCustomers();
            clear();
          }}
          confirmMessage="선택한 고객을 삭제하시겠습니까? 연결된 매장이나 진행 중 문서가 있는 고객은 삭제할 수 없습니다."
          disabled={bulkLoading}
        />
      </BulkActionBar>
    </div>
  );
}
