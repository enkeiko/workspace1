"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Edit, Trash2, Eye, Users } from "lucide-react";
import Link from "next/link";
import { useDebounce } from "@/hooks/use-debounce";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "sonner";

interface Customer {
  id: number;
  name: string;
  businessNumber?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  tags?: string[];
  createdAt: string;
}

interface CustomersTableProps {
  initialCustomers: Customer[];
  initialTotalPages: number;
  initialPage: number;
}

export function CustomersTable({
  initialCustomers,
  initialTotalPages,
  initialPage,
}: CustomersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState(initialCustomers);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);

  const debouncedSearch = useDebounce(search, 500);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    params.set("page", "1");
    router.push(`/customers?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/customers?${params.toString()}`);
  };

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;

    try {
      const response = await fetch(`/api/customers/${customerToDelete.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("삭제 완료", {
          description: "고객이 삭제되었습니다.",
        });
        router.refresh();
      } else {
        toast.error("삭제 실패", {
          description: result.error?.message || "고객 삭제에 실패했습니다.",
        });
      }
    } catch (error) {
      console.error("삭제 실패:", error);
      toast.error("삭제 실패", {
        description: "고객 삭제 중 오류가 발생했습니다.",
      });
    } finally {
      setCustomerToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>고객 목록</CardTitle>
          <CardDescription>등록된 고객을 검색하고 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="고객명, 사업자번호, 연락처로 검색..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {customers.length === 0 ? (
            <EmptyState
              icon={Users}
              title={search ? "검색 결과가 없습니다" : "등록된 고객이 없습니다"}
              description={
                search
                  ? "다른 검색 조건으로 다시 시도해보세요."
                  : "첫 번째 고객을 추가하여 시작하세요."
              }
              actionLabel={search ? undefined : "고객 추가"}
              actionHref={search ? undefined : "/customers/new"}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>고객명</TableHead>
                    <TableHead>사업자번호</TableHead>
                    <TableHead>담당자</TableHead>
                    <TableHead>연락처</TableHead>
                    <TableHead>등록일</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="text-primary hover:underline"
                        >
                          {customer.name}
                        </Link>
                      </TableCell>
                      <TableCell>{customer.businessNumber || "-"}</TableCell>
                      <TableCell>{customer.contactPerson || "-"}</TableCell>
                      <TableCell>
                        <div>
                          {customer.phone && <div>{customer.phone}</div>}
                          {customer.email && (
                            <div className="text-sm text-gray-500">{customer.email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(customer.createdAt).toLocaleDateString("ko-KR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/customers/${customer.id}`}>
                            <Button variant="ghost" size="icon" title="상세보기">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/customers/${customer.id}/edit`}>
                            <Button variant="ghost" size="icon" title="수정">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="삭제"
                            onClick={() => handleDeleteClick(customer)}
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
                    onClick={() => handlePageChange(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    이전
                  </Button>
                  <span className="text-sm text-gray-500">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
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

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="고객을 삭제하시겠습니까?"
        description="이 작업은 되돌릴 수 없습니다. 고객 정보와 관련된 모든 데이터가 삭제됩니다."
        itemName={customerToDelete?.name || "고객"}
        requireConfirmation={true}
      />
    </>
  );
}

