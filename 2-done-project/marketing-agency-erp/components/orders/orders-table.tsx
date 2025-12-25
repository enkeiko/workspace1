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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit, Trash2, Eye, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useDebounce } from "@/hooks/use-debounce";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "sonner";

interface Order {
  id: number;
  orderNumber: string;
  orderDate: string;
  dueDate?: string;
  status: string;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  customer: {
    id: number;
    name: string;
  };
  store: {
    id: number;
    name: string;
  } | null;
  quotation?: {
    id: number;
    quotationNumber: string;
  } | null;
  _count?: {
    items: number;
  };
  createdAt: string;
}

interface OrdersTableProps {
  initialOrders: Order[];
  initialTotalPages: number;
  initialPage: number;
}

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  in_progress: "outline",
  completed: "default",
  cancelled: "destructive",
};

const statusLabels: Record<string, string> = {
  pending: "대기중",
  in_progress: "진행중",
  completed: "완료",
  cancelled: "취소",
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("ko-KR").format(price);
}

export function OrdersTable({
  initialOrders,
  initialTotalPages,
  initialPage,
}: OrdersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState(initialOrders);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

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
    router.push(`/orders?${params.toString()}`);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value !== "all") {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    params.set("page", "1");
    router.push(`/orders?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/orders?${params.toString()}`);
  };

  const handleDeleteClick = (order: Order) => {
    setOrderToDelete(order);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;

    try {
      const response = await fetch(`/api/orders/${orderToDelete.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        toast.success("삭제 완료", {
          description: "주문이 삭제되었습니다.",
        });
        router.refresh();
      } else {
        toast.error("삭제 실패", {
          description: result.error?.message || "주문 삭제에 실패했습니다.",
        });
      }
    } catch (error) {
      console.error("삭제 실패:", error);
      toast.error("삭제 실패", {
        description: "주문 삭제 중 오류가 발생했습니다.",
      });
    } finally {
      setOrderToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>주문 목록</CardTitle>
          <CardDescription>등록된 주문을 검색하고 관리합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="주문번호, 메모로 검색..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="pending">대기중</SelectItem>
                <SelectItem value="in_progress">진행중</SelectItem>
                <SelectItem value="completed">완료</SelectItem>
                <SelectItem value="cancelled">취소</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {orders.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title={search || statusFilter !== "all" ? "검색 결과가 없습니다" : "등록된 주문이 없습니다"}
              description={
                search || statusFilter !== "all"
                  ? "다른 검색 조건으로 다시 시도해보세요."
                  : "첫 번째 주문을 추가하여 시작하세요."
              }
              actionLabel={search || statusFilter !== "all" ? undefined : "주문 추가"}
              actionHref={search || statusFilter !== "all" ? undefined : "/orders/new"}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>주문번호</TableHead>
                    <TableHead>고객</TableHead>
                    <TableHead>매장</TableHead>
                    <TableHead>주문일</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>총액</TableHead>
                    <TableHead>미지불</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/orders/${order.id}`}
                          className="text-primary hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{order.customer.name}</TableCell>
                      <TableCell>{order.store?.name || "-"}</TableCell>
                      <TableCell>
                        {new Date(order.orderDate).toLocaleDateString("ko-KR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[order.status] || "default"}>
                          {statusLabels[order.status] || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatPrice(Number(order.totalAmount))}원</TableCell>
                      <TableCell>
                        {order.unpaidAmount > 0 ? (
                          <span className="text-red-600 font-medium">
                            {formatPrice(order.unpaidAmount)}원
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/orders/${order.id}`}>
                            <Button variant="ghost" size="icon" title="상세보기">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/orders/${order.id}/edit`}>
                            <Button variant="ghost" size="icon" title="수정">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="삭제"
                            onClick={() => handleDeleteClick(order)}
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
        title="주문을 삭제하시겠습니까?"
        description="이 작업은 되돌릴 수 없습니다. 주문 정보와 관련된 모든 데이터가 삭제됩니다."
        itemName={orderToDelete?.orderNumber || "주문"}
        requireConfirmation={true}
      />
    </>
  );
}

