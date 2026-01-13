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
  Upload,
  ExternalLink,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ExcelUploadDialog } from "@/components/stores/excel-upload-dialog";

interface Store {
  id: string;
  name: string;
  mid: string;
  placeUrl: string | null;
  address: string | null;
  category: string | null;
  status: "ACTIVE" | "PAUSED" | "TERMINATED";
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

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);

      const res = await fetch(`/api/stores?${params}`);
      const data = await res.json();

      if (res.ok) {
        setStores(data.stores);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch stores:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStores();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchStores]);

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
          <h2 className="text-2xl font-bold tracking-tight">매장 관리</h2>
          <p className="text-muted-foreground">
            등록된 매장을 관리하고 새 매장을 추가하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Excel 업로드
          </Button>
          <Button asChild>
            <Link href="/stores/new">
              <Plus className="h-4 w-4 mr-2" />
              매장 등록
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
                placeholder="매장명, MID, 주소 검색..."
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
          ) : stores.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search || statusFilter !== "all"
                ? "검색 결과가 없습니다."
                : "등록된 매장이 없습니다."}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>매장명</TableHead>
                    <TableHead>MID</TableHead>
                    <TableHead>주소</TableHead>
                    <TableHead>업종</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead className="w-[100px]">링크</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.map((store) => (
                    <TableRow key={store.id}>
                      <TableCell>
                        <Link
                          href={`/stores/${store.id}`}
                          className="font-medium hover:underline"
                        >
                          {store.name}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {store.mid}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {store.address || "-"}
                      </TableCell>
                      <TableCell>{store.category || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={statusMap[store.status].variant}>
                          {statusMap[store.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {store.placeUrl && (
                          <a
                            href={store.placeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
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

      <ExcelUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onSuccess={fetchStores}
      />
    </div>
  );
}
