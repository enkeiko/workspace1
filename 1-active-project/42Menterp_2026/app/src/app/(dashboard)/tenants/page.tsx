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
  Building2,
  Users,
  Store,
  FileText,
} from "lucide-react";
import { format } from "date-fns";

interface Tenant {
  id: string;
  name: string;
  code: string;
  businessNo: string | null;
  representative: string | null;
  contactName: string | null;
  contactPhone: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  defaultCommissionRate: number | null;
  contractStart: string | null;
  contractEnd: string | null;
  _count: {
    users: number;
    stores: number;
    orders: number;
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
  INACTIVE: { label: "비활성", variant: "secondary" as const },
  SUSPENDED: { label: "정지", variant: "destructive" as const },
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all")
        params.append("status", statusFilter);

      const res = await fetch(`/api/tenants?${params}`);
      const data = await res.json();

      if (res.ok) {
        setTenants(data.tenants);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch tenants:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTenants();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchTenants]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // 통계 계산
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter((t) => t.status === "ACTIVE").length;
  const totalUsers = tenants.reduce((sum, t) => sum + t._count.users, 0);
  const totalStores = tenants.reduce((sum, t) => sum + t._count.stores, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">파트너사 관리</h2>
          <p className="text-muted-foreground">
            파트너사를 등록하고 관리합니다. (Super Admin 전용)
          </p>
        </div>
        <Button asChild>
          <Link href="/tenants/new">
            <Plus className="h-4 w-4 mr-2" />
            파트너사 등록
          </Link>
        </Button>
      </div>

      {/* 요약 카드 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium">전체 파트너사</span>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}개</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium">활성 파트너사</span>
            <Building2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeTenants}개
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium">총 담당자</span>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalUsers}명</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <span className="text-sm font-medium">총 매장</span>
            <Store className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {totalStores}개
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="파트너사명, 코드, 사업자번호 검색..."
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
                <SelectItem value="INACTIVE">비활성</SelectItem>
                <SelectItem value="SUSPENDED">정지</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tenants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search || statusFilter !== "all"
                ? "검색 결과가 없습니다."
                : "등록된 파트너사가 없습니다."}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>파트너사</TableHead>
                    <TableHead>사업자번호</TableHead>
                    <TableHead>담당자</TableHead>
                    <TableHead>수수료율</TableHead>
                    <TableHead>계약기간</TableHead>
                    <TableHead className="text-center">담당자</TableHead>
                    <TableHead className="text-center">매장</TableHead>
                    <TableHead className="text-center">발주</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <Link
                          href={`/tenants/${tenant.id}`}
                          className="font-medium hover:underline"
                        >
                          {tenant.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {tenant.code}
                        </p>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {tenant.businessNo || "-"}
                      </TableCell>
                      <TableCell>
                        {tenant.contactName || "-"}
                        {tenant.contactPhone && (
                          <p className="text-xs text-muted-foreground">
                            {tenant.contactPhone}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {tenant.defaultCommissionRate
                          ? `${(tenant.defaultCommissionRate * 100).toFixed(0)}%`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {tenant.contractStart && tenant.contractEnd
                          ? `${format(new Date(tenant.contractStart), "yy.MM.dd")} ~ ${format(new Date(tenant.contractEnd), "yy.MM.dd")}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {tenant._count.users}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Store className="h-4 w-4 text-muted-foreground" />
                          {tenant._count.stores}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {tenant._count.orders}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusMap[tenant.status].variant}>
                          {statusMap[tenant.status].label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    총 {pagination.total}개 중{" "}
                    {(pagination.page - 1) * pagination.limit + 1}-
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                    개 표시
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
