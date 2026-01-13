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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface PurchaseOrder {
  id: string;
  purchaseOrderNo: string;
  orderWeek: string;
  orderDate: string;
  status: string;
  totalQty: number;
  totalAmount: number;
  channel: {
    name: string;
    code: string;
  };
  salesOrder?: {
    salesOrderNo: string;
  } | null;
  createdBy: {
    name: string;
  };
  _count: {
    items: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "초안", variant: "outline" },
  PENDING: { label: "대기", variant: "secondary" },
  CONFIRMED: { label: "확정", variant: "default" },
  IN_PROGRESS: { label: "진행중", variant: "default" },
  COMPLETED: { label: "완료", variant: "default" },
  CANCELLED: { label: "취소", variant: "destructive" },
};

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchPurchaseOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all")
        params.append("status", statusFilter);

      const res = await fetch(`/api/purchase-orders?${params}`);
      const data = await res.json();

      if (res.ok) {
        setPurchaseOrders(data.purchaseOrders);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch purchase orders:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPurchaseOrders();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchPurchaseOrders]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            발주 관리 <span className="text-sm font-normal text-muted-foreground">Purchase Order</span>
          </h2>
          <p className="text-muted-foreground">
            채널에 발주를 등록하고 관리합니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/purchase-orders/new">
            <Plus className="h-4 w-4 mr-2" />
            발주 등록
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="발주번호 검색..."
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="DRAFT">초안</SelectItem>
                <SelectItem value="PENDING">대기</SelectItem>
                <SelectItem value="CONFIRMED">확정</SelectItem>
                <SelectItem value="IN_PROGRESS">진행중</SelectItem>
                <SelectItem value="COMPLETED">완료</SelectItem>
                <SelectItem value="CANCELLED">취소</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : purchaseOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search || statusFilter !== "all"
                ? "검색 결과가 없습니다."
                : "등록된 발주가 없습니다."}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>발주번호</TableHead>
                    <TableHead>수주번호</TableHead>
                    <TableHead>채널</TableHead>
                    <TableHead>발주일</TableHead>
                    <TableHead className="text-right">항목수</TableHead>
                    <TableHead className="text-right">총 수량</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>담당자</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Link
                          href={`/purchase-orders/${order.id}`}
                          className="font-medium hover:underline"
                        >
                          {order.purchaseOrderNo}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {order.salesOrder?.salesOrderNo || "-"}
                      </TableCell>
                      <TableCell>{order.channel.name}</TableCell>
                      <TableCell>
                        {format(new Date(order.orderDate), "yyyy-MM-dd", {
                          locale: ko,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        {order._count.items}건
                      </TableCell>
                      <TableCell className="text-right">
                        {order.totalQty.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {order.totalAmount.toLocaleString()}원
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusMap[order.status]?.variant}>
                          {statusMap[order.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.createdBy.name}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    총 {pagination.total}건
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: prev.page - 1,
                        }))
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
                        setPagination((prev) => ({
                          ...prev,
                          page: prev.page + 1,
                        }))
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
