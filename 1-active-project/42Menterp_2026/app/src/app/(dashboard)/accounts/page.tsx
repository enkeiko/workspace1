"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Shield,
} from "lucide-react";
import { format } from "date-fns";

interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  status: string;
  tenant?: {
    id: string;
    name: string;
  } | null;
  lastLoginAt: string | null;
  createdAt: string;
}

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

const roleMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  SUPER_ADMIN: { label: "슈퍼관리자", variant: "destructive" },
  ADMIN: { label: "관리자", variant: "default" },
  PARTNER_ADMIN: { label: "파트너관리자", variant: "secondary" },
  OPERATOR: { label: "운영자", variant: "outline" },
  VIEWER: { label: "열람자", variant: "outline" },
};

const userStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ACTIVE: { label: "활성", variant: "default" },
  INACTIVE: { label: "비활성", variant: "secondary" },
  SUSPENDED: { label: "정지", variant: "destructive" },
};

const tenantStatusMap = {
  ACTIVE: { label: "활성", variant: "default" as const },
  INACTIVE: { label: "비활성", variant: "secondary" as const },
  SUSPENDED: { label: "정지", variant: "destructive" as const },
};

export default function AccountsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "users";

  const [users, setUsers] = useState<User[]>([]);
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
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const handleTabChange = (value: string) => {
    router.push(`/accounts?tab=${value}`);
    setSearch("");
    setStatusFilter("all");
    setRoleFilter("all");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (roleFilter && roleFilter !== "all") params.append("role", roleFilter);

      const res = await fetch(`/api/users?${params}`);
      const data = await res.json();

      if (res.ok) {
        setUsers(data.users || []);
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter, roleFilter]);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);

      const res = await fetch(`/api/tenants?${params}`);
      const data = await res.json();

      if (res.ok) {
        setTenants(data.tenants || []);
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      }
    } catch (error) {
      console.error("Failed to fetch tenants:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentTab === "users") {
        fetchUsers();
      } else {
        fetchTenants();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [currentTab, fetchUsers, fetchTenants]);

  const getAddButton = () => {
    if (currentTab === "users") {
      return (
        <Button asChild>
          <Link href="/accounts/users/new">
            <Plus className="h-4 w-4 mr-2" />
            관리자 등록
          </Link>
        </Button>
      );
    }
    return (
      <Button asChild>
        <Link href="/tenants/new">
          <Plus className="h-4 w-4 mr-2" />
          파트너사 등록
        </Link>
      </Button>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">계정 관리</h2>
          <p className="text-muted-foreground">
            관리자 계정과 파트너사를 통합 관리합니다.
          </p>
        </div>
        {getAddButton()}
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            관리자
          </TabsTrigger>
          <TabsTrigger value="partners" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            파트너사
          </TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={
                    currentTab === "users"
                      ? "이름, 이메일 검색..."
                      : "파트너사명, 코드 검색..."
                  }
                  className="pl-9"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                />
              </div>
              {currentTab === "users" && (
                <Select
                  value={roleFilter}
                  onValueChange={(value) => {
                    setRoleFilter(value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="역할" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 역할</SelectItem>
                    <SelectItem value="SUPER_ADMIN">슈퍼관리자</SelectItem>
                    <SelectItem value="ADMIN">관리자</SelectItem>
                    <SelectItem value="PARTNER_ADMIN">파트너관리자</SelectItem>
                    <SelectItem value="OPERATOR">운영자</SelectItem>
                    <SelectItem value="VIEWER">열람자</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="상태" />
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
            ) : (
              <>
                <TabsContent value="users" className="mt-0">
                  {users.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {search || statusFilter !== "all" || roleFilter !== "all"
                        ? "검색 결과가 없습니다."
                        : "등록된 관리자가 없습니다."}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>이름</TableHead>
                          <TableHead>이메일</TableHead>
                          <TableHead>역할</TableHead>
                          <TableHead>소속</TableHead>
                          <TableHead>마지막 로그인</TableHead>
                          <TableHead>상태</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              {user.name}
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge variant={roleMap[user.role]?.variant || "outline"}>
                                {roleMap[user.role]?.label || user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {user.tenant ? (
                                <span className="text-sm">{user.tenant.name}</span>
                              ) : (
                                <span className="text-muted-foreground">본사</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.lastLoginAt
                                ? format(new Date(user.lastLoginAt), "yyyy-MM-dd HH:mm")
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={userStatusMap[user.status]?.variant || "outline"}>
                                {userStatusMap[user.status]?.label || user.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                <TabsContent value="partners" className="mt-0">
                  {tenants.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {search || statusFilter !== "all"
                        ? "검색 결과가 없습니다."
                        : "등록된 파트너사가 없습니다."}
                    </div>
                  ) : (
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
                              <Badge variant={tenantStatusMap[tenant.status].variant}>
                                {tenantStatusMap[tenant.status].label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </>
            )}

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">총 {pagination.total}건</p>
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
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
