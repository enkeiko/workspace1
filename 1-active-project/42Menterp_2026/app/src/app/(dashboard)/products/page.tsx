"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, FileDown, FileUp, Download, Settings } from "lucide-react";
import { toast } from "sonner";
import {
  DataTable,
  BulkActionBar,
  BulkDelete,
  useSelection,
  usePagination,
  type ColumnDef,
  type FilterConfig,
} from "@/components/common";

interface ProductRow {
  [key: string]: unknown;
  id: string;
  code: string;
  name: string;
  type: string;
  description: string | null;
  saleUnitPrice: number;
  costUnitPrice: number;
  isActive: boolean;
  channel: {
    id: string;
    name: string;
    code: string;
  } | null;
}

const typeInfo: Record<string, { label: string; color: string }> = {
  TRAFFIC: { label: "트래픽", color: "text-orange-700 bg-orange-50 border-orange-200" },
  DIRECTION: { label: "길찾기", color: "text-purple-700 bg-purple-50 border-purple-200" },
  REVIEW: { label: "리뷰", color: "text-blue-700 bg-blue-50 border-blue-200" },
  BLOG: { label: "블로그", color: "text-green-700 bg-green-50 border-green-200" },
  SAVE: { label: "저장", color: "text-cyan-700 bg-cyan-50 border-cyan-200" },
  RECEIPT: { label: "영수증", color: "text-pink-700 bg-pink-50 border-pink-200" },
};

const activeOptions = [
  { value: "true", label: "활성" },
  { value: "false", label: "비활성" },
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

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({
    type: "all",
    isActive: "all",
  });

  const { pagination, setPagination, setPage } = usePagination({
    initialLimit: 20,
  });
  const { selectedIds, toggle, selectAll, clear, selectedCount } =
    useSelection();

  // 컬럼 정의
  const columns: ColumnDef<ProductRow>[] = useMemo(
    () => [
      {
        id: "name",
        header: "상품명",
        accessorKey: "name",
        cell: ({ row }) => (
          <Link
            href={`/products/${row.id}`}
            className="font-medium hover:underline"
          >
            {row.name}
          </Link>
        ),
      },
      {
        id: "code",
        header: "코드",
        accessorKey: "code",
        cell: ({ value }) => (
          <span className="font-mono text-sm">{value as string}</span>
        ),
        width: "120px",
      },
      {
        id: "type",
        header: "유형",
        accessorKey: "type",
        cell: ({ value }) => {
          const type = value as string;
          const info = typeInfo[type];
          return info ? (
            <Badge variant="outline" className={info.color}>
              {info.label}
            </Badge>
          ) : (
            type
          );
        },
        width: "100px",
      },
      {
        id: "saleUnitPrice",
        header: "판매 단가",
        accessorKey: "saleUnitPrice",
        cell: ({ value }) => `${(value as number).toLocaleString()}원`,
        align: "right",
        width: "120px",
      },
      {
        id: "costUnitPrice",
        header: "매입 단가",
        accessorKey: "costUnitPrice",
        cell: ({ value }) => `${(value as number).toLocaleString()}원`,
        align: "right",
        width: "120px",
      },
      {
        id: "margin",
        header: "마진",
        accessorFn: (row) => row.saleUnitPrice - row.costUnitPrice,
        cell: ({ value }) => (
          <span className={Number(value) > 0 ? "text-green-600" : "text-red-600"}>
            {(value as number).toLocaleString()}원
          </span>
        ),
        align: "right",
        width: "100px",
      },
      {
        id: "channel",
        header: "채널",
        accessorFn: (row) => row.channel?.name || "-",
        width: "120px",
      },
      {
        id: "isActive",
        header: "상태",
        accessorKey: "isActive",
        cell: ({ value }) => (
          <Badge variant={value ? "default" : "secondary"}>
            {value ? "활성" : "비활성"}
          </Badge>
        ),
        width: "80px",
      },
      {
        id: "actions",
        header: "설정",
        accessorFn: (row) => row.id,
        cell: ({ row }) => (
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/products/${row.id}`}>
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        ),
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
        id: "type",
        label: "유형",
        type: "select",
        options: [
          { label: "전체", value: "all" },
          { label: "트래픽", value: "TRAFFIC" },
          { label: "길찾기", value: "DIRECTION" },
          { label: "리뷰", value: "REVIEW" },
          { label: "블로그", value: "BLOG" },
          { label: "저장", value: "SAVE" },
          { label: "영수증", value: "RECEIPT" },
        ],
      },
      {
        id: "isActive",
        label: "상태",
        type: "select",
        options: [
          { label: "전체", value: "all" },
          { label: "활성", value: "true" },
          { label: "비활성", value: "false" },
        ],
      },
    ],
    []
  );

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.append("search", search);
      if (filterValues.type && filterValues.type !== "all") {
        params.append("type", filterValues.type);
      }
      if (filterValues.isActive && filterValues.isActive !== "all") {
        params.append("isActive", filterValues.isActive);
      }

      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();

      if (res.ok) {
        setProducts(data.products);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, filterValues, setPagination]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  // 데이터 변경 시 선택 상태 정리
  useEffect(() => {
    const currentIds = products.map((p) => p.id);
    const validIds = selectedIds.filter((id) => currentIds.includes(id));
    if (validIds.length !== selectedIds.length) {
      selectAll(validIds);
    }
  }, [products, selectedIds, selectAll]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleFilter = (values: Record<string, string>) => {
    setFilterValues(values);
    setPage(1);
  };

  const handleBulkActiveChange = async (isActive: boolean) => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/products/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedIds,
          action: "update",
          data: { isActive },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`상태 변경 완료: ${data.summary.updated}건`);
        clear();
        fetchProducts();
      } else {
        toast.error(data.error || "상태 변경에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to update products:", error);
      toast.error("상태 변경 중 오류가 발생했습니다");
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
      const res = await fetch(`/api/products/export?${params}`);
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "엑셀 내보내기에 실패했습니다");
        return;
      }
      await downloadBlob(res, "상품_내보내기.xlsx");
    } catch (error) {
      console.error("Failed to export products:", error);
      toast.error("엑셀 내보내기 중 오류가 발생했습니다");
    }
  };

  const handleTemplateDownload = async () => {
    try {
      const res = await fetch("/api/products/template");
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "양식 다운로드에 실패했습니다");
        return;
      }
      await downloadBlob(res, "상품_엑셀_양식.xlsx");
    } catch (error) {
      console.error("Failed to download template:", error);
      toast.error("양식 다운로드 중 오류가 발생했습니다");
    }
  };

  // 헤더 액션 버튼들
  const headerActions = (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={handleTemplateDownload}>
        <FileDown className="h-4 w-4 mr-2" />
        엑셀 양식
      </Button>
      <Button variant="outline" asChild>
        <Link href="/products/import">
          <FileUp className="h-4 w-4 mr-2" />
          엑셀 업로드
        </Link>
      </Button>
      <Button asChild>
        <Link href="/products/new">
          <Plus className="h-4 w-4 mr-2" />
          상품 추가
        </Link>
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">상품 관리</h2>
          <p className="text-muted-foreground">
            마케팅 상품(서비스)을 관리합니다.
          </p>
        </div>
        {headerActions}
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            data={products}
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
            searchPlaceholder="상품명, 코드 검색..."
            onSearch={handleSearch}
            filters={filters}
            filterValues={filterValues}
            onFilter={handleFilter}
            loading={loading}
            emptyMessage={
              search || filterValues.type !== "all" || filterValues.isActive !== "all"
                ? "검색 결과가 없습니다."
                : "등록된 상품이 없습니다."
            }
          />
        </CardContent>
      </Card>

      {/* 일괄 작업 바 */}
      <BulkActionBar selectedCount={selectedCount} onClear={clear}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleBulkActiveChange(true)}
          disabled={bulkLoading}
        >
          활성화
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleBulkActiveChange(false)}
          disabled={bulkLoading}
        >
          비활성화
        </Button>
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
          resource="products"
          onSuccess={() => {
            fetchProducts();
            clear();
          }}
          confirmMessage="선택한 상품을 삭제하시겠습니까? 연결된 견적/수주/발주가 있는 상품은 삭제할 수 없습니다."
          disabled={bulkLoading}
        />
      </BulkActionBar>
    </div>
  );
}
