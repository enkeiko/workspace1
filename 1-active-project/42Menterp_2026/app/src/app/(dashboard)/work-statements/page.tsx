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
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface WorkStatement {
  id: string;
  statementNo: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  supplyAmount: number;
  taxAmount: number;
  totalAmount: number;
  createdAt: string;
  purchaseOrder: {
    purchaseOrderNo: string;
    channel: {
      name: string;
    };
  };
  createdBy: {
    name: string;
  };
  confirmedBy: {
    name: string;
  } | null;
  _count: {
    items: number;
    settlementLines: number;
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
  CONFIRMED: { label: "확정", variant: "default" },
  LOCKED: { label: "잠김", variant: "secondary" },
};

export default function WorkStatementsPage() {
  const [workStatements, setWorkStatements] = useState<WorkStatement[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchWorkStatements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all")
        params.append("status", statusFilter);

      const res = await fetch(`/api/work-statements?${params}`);
      const data = await res.json();

      if (res.ok) {
        setWorkStatements(data.workStatements);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch work statements:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchWorkStatements();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchWorkStatements]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            작업 명세 <span className="text-sm font-normal text-muted-foreground">Work Statement</span>
          </h2>
          <p className="text-muted-foreground">
            발주에 대한 작업 내역을 기록하고 정산과 연결합니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/work-statements/new">
            <Plus className="h-4 w-4 mr-2" />
            명세 등록
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="명세번호 검색..."
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
                <SelectItem value="CONFIRMED">확정</SelectItem>
                <SelectItem value="LOCKED">잠김</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : workStatements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search || statusFilter !== "all"
                ? "검색 결과가 없습니다."
                : "등록된 작업 명세가 없습니다."}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>명세번호</TableHead>
                    <TableHead>발주번호</TableHead>
                    <TableHead>채널</TableHead>
                    <TableHead>작업기간</TableHead>
                    <TableHead className="text-right">항목수</TableHead>
                    <TableHead className="text-right">금액 (VAT포함)</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>담당자</TableHead>
                    <TableHead className="text-right">정산연결</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workStatements.map((ws) => (
                    <TableRow key={ws.id}>
                      <TableCell>
                        <Link
                          href={`/work-statements/${ws.id}`}
                          className="font-medium hover:underline"
                        >
                          {ws.statementNo}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/purchase-orders/${ws.purchaseOrder.purchaseOrderNo}`}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          {ws.purchaseOrder.purchaseOrderNo}
                        </Link>
                      </TableCell>
                      <TableCell>{ws.purchaseOrder.channel.name}</TableCell>
                      <TableCell>
                        {format(new Date(ws.periodStart), "MM/dd", { locale: ko })} - {format(new Date(ws.periodEnd), "MM/dd", { locale: ko })}
                      </TableCell>
                      <TableCell className="text-right">
                        {ws._count.items}건
                      </TableCell>
                      <TableCell className="text-right">
                        {ws.totalAmount.toLocaleString()}원
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusMap[ws.status]?.variant}>
                          {statusMap[ws.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {ws.confirmedBy?.name || ws.createdBy.name}
                      </TableCell>
                      <TableCell className="text-right">
                        {ws._count.settlementLines > 0 ? (
                          <Badge variant="secondary">{ws._count.settlementLines}건</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
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
