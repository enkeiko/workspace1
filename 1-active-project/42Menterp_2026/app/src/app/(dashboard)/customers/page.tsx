"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Plus,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileDown,
  FileUp,
} from "lucide-react";
import { toast } from "sonner";
import { CustomerTable, CustomerRow } from "./components/customer-table";
import { CustomerBulkActions } from "./components/customer-bulk-actions";

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

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
  link.download = getFilenameFromHeader(response.headers.get("content-disposition")) || fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);

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
  }, [pagination.page, pagination.limit, search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => customers.some((c) => c.id === id)));
  }, [customers]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const toggleAll = () => {
    const allSelected = customers.every((customer) => selectedIds.includes(customer.id));
    setSelectedIds(allSelected ? [] : customers.map((customer) => customer.id));
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
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
        setSelectedIds([]);
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
        const blockedIds = (data.errors || []).map((item: { id: string }) => item.id);
        setSelectedIds(blockedIds);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">고객 관리</h2>
          <p className="text-muted-foreground">
            등록된 고객(광고주)을 관리하고 새 고객을 추가하세요.
          </p>
        </div>
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
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="고객명, 사업자번호, 담당자 검색..."
                className="pl-9"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="ACTIVE">활성</SelectItem>
                <SelectItem value="PAUSED">일시정지</SelectItem>
                <SelectItem value="TERMINATED">종료</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {selectedIds.length > 0 && (
            <div className="mb-4">
              <CustomerBulkActions
                selectedCount={selectedIds.length}
                onStatusChange={handleBulkStatusChange}
                onDelete={handleBulkDelete}
                onExport={handleExport}
                onClear={() => setSelectedIds([])}
                loading={bulkLoading}
              />
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search || statusFilter !== "all"
                ? "검색 결과가 없습니다."
                : "등록된 고객이 없습니다."}
            </div>
          ) : (
            <>
              <CustomerTable
                customers={customers}
                selectedIds={selectedIds}
                onToggleAll={toggleAll}
                onToggleOne={toggleOne}
              />

              {pagination.totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                  <p className="text-sm text-muted-foreground">
                    총 {pagination.total}개 중 {(pagination.page - 1) * pagination.limit + 1}-
                    {Math.min(pagination.page * pagination.limit, pagination.total)}개 표시
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() =>
                        setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      {pagination.page} / {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === pagination.totalPages}
                      onClick={() =>
                        setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
