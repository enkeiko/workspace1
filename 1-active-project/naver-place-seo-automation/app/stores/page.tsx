"use client";

import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Eye, Store } from "lucide-react";
import Link from "next/link";
import { useDebounce } from "@/hooks/use-debounce";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { toast } from "sonner";

interface Store {
  id: number;
  name: string;
  type?: string;
  address?: string;
  phone?: string;
  website?: string;
  customer: {
    id: number;
    name: string;
  };
  createdAt: string;
}

interface Customer {
  id: number;
  name: string;
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);

  const debouncedSearch = useDebounce(search, 500);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    fetchStores();
  }, [page, debouncedSearch, customerFilter]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers?limit=100");
      const result = await response.json();
      if (result.success) {
        setCustomers(result.data.customers || []);
      }
    } catch (error) {
      console.error("고객 목록 조회 실패:", error);
    }
  };

  const fetchStores = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(customerFilter !== "all" && { customerId: customerFilter }),
      });

      const response = await fetch(`/api/stores?${params}`);

      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }

      const result = await response.json();

      if (result.success) {
        setStores(result.data.stores || []);
        setTotalPages(result.data.pagination?.totalPages || 1);
      } else {
        throw new Error(result.error?.message || "데이터를 불러오는데 실패했습니다.");
      }
    } catch (error) {
      console.error("매장 목록 조회 실패:", error);
      setError(error instanceof Error ? error.message : "오류가 발생했습니다.");
      toast.error("매장 목록 조회 실패", {
        description: error instanceof Error ? error.message : "오류가 발생했습니다.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (store: Store) => {
    setStoreToDelete(store);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!storeToDelete) return;

    try {
      const response = await fetch(`/api/stores/${storeToDelete.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("삭제 완료", {
          description: "매장이 삭제되었습니다.",
        });
        fetchStores();
      } else {
        toast.error("삭제 실패", {
          description: result.error?.message || "매장 삭제에 실패했습니다.",
        });
      }
    } catch (error) {
      console.error("삭제 실패:", error);
      toast.error("삭제 실패", {
        description: "매장 삭제 중 오류가 발생했습니다.",
      });
    } finally {
      setStoreToDelete(null);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">매장 관리</h1>
            <p className="text-gray-500">매장 정보를 관리합니다.</p>
          </div>
          <Link href="/stores/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              매장 추가
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>매장 목록</CardTitle>
            <CardDescription>등록된 매장을 검색하고 관리합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="매장명, 주소로 검색..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <Select
                value={customerFilter}
                onValueChange={(value) => {
                  setCustomerFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="고객사" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 고객사</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : error ? (
              <ErrorState
                title="데이터 로딩 실패"
                description={error}
                onRetry={fetchStores}
              />
            ) : stores.length === 0 ? (
              <EmptyState
                icon={Store}
                title={search || customerFilter !== "all" ? "검색 결과가 없습니다" : "등록된 매장이 없습니다"}
                description={
                  search || customerFilter !== "all"
                    ? "다른 검색 조건으로 다시 시도해보세요."
                    : "첫 번째 매장을 추가하여 시작하세요."
                }
                actionLabel={search || customerFilter !== "all" ? undefined : "매장 추가"}
                actionHref={search || customerFilter !== "all" ? undefined : "/stores/new"}
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>매장명</TableHead>
                      <TableHead>고객사</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>연락처</TableHead>
                      <TableHead>등록일</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores.map((store) => (
                      <TableRow key={store.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/stores/${store.id}`}
                            className="text-primary hover:underline"
                          >
                            {store.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/customers/${store.customer.id}`}
                            className="text-primary hover:underline"
                          >
                            {store.customer.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {store.type ? <Badge variant="outline">{store.type}</Badge> : "-"}
                        </TableCell>
                        <TableCell>
                          <div>
                            {store.phone && <div>{store.phone}</div>}
                            {store.website && (
                              <div className="text-sm text-gray-500">{store.website}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(store.createdAt).toLocaleDateString("ko-KR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/stores/${store.id}`}>
                              <Button variant="ghost" size="icon" title="상세보기">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/stores/${store.id}/edit`}>
                              <Button variant="ghost" size="icon" title="수정">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="삭제"
                              onClick={() => handleDeleteClick(store)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      이전
                    </Button>
                    <span className="text-sm text-gray-500">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      다음
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="매장을 삭제하시겠습니까?"
        description="이 작업은 되돌릴 수 없습니다. 매장 정보와 관련된 모든 데이터가 삭제됩니다."
        itemName={storeToDelete?.name || "매장"}
        requireConfirmation={true}
      />
    </MainLayout>
  );
}

