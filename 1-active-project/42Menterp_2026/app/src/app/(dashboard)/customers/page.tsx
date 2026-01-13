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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Plus,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Store,
} from "lucide-react";
import { format } from "date-fns";

interface Customer {
  id: string;
  name: string;
  businessNo: string | null;
  representative: string | null;
  contactName: string | null;
  contactPhone: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  status: "ACTIVE" | "PAUSED" | "TERMINATED";
  _count: {
    stores: number;
  };
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusMap = {
  ACTIVE: { label: "활성", variant: "default" as const },
  PAUSED: { label: "일시정지", variant: "secondary" as const },
  TERMINATED: { label: "종료", variant: "destructive" as const },
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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

  const handleSearch = (value: string) => {
    setSearch(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">고객 관리</h2>
          <p className="text-muted-foreground">
            등록된 고객(광고주)을 관리하고 새 고객을 추가하세요.
          </p>
        </div>
        <div className="flex gap-2">
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
          <div className="flex items-center gap-4">
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>고객명</TableHead>
                    <TableHead>사업자번호</TableHead>
                    <TableHead>담당자</TableHead>
                    <TableHead>연락처</TableHead>
                    <TableHead>계약기간</TableHead>
                    <TableHead>매장수</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <Link
                          href={`/customers/${customer.id}`}
                          className="font-medium hover:underline"
                        >
                          {customer.name}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {customer.businessNo || "-"}
                      </TableCell>
                      <TableCell>{customer.contactName || "-"}</TableCell>
                      <TableCell>{customer.contactPhone || "-"}</TableCell>
                      <TableCell className="text-sm">
                        {customer.contractStart && customer.contractEnd
                          ? `${format(new Date(customer.contractStart), "yy.MM.dd")} ~ ${format(new Date(customer.contractEnd), "yy.MM.dd")}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Store className="h-4 w-4 text-muted-foreground" />
                          <span>{customer._count.stores}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusMap[customer.status].variant}>
                          {statusMap[customer.status].label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
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
