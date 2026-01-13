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

interface Statement {
  id: string;
  statementNo: string;
  issueDate: string;
  status: string;
  totalAmount: number;
  taxAmount: number;
  createdAt: string;
  salesOrder: {
    id: string;
    salesOrderNo: string;
    customer: {
      id: string;
      name: string;
      businessName: string | null;
    };
  };
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
  ISSUED: { label: "발행됨", variant: "secondary" },
  DELIVERED: { label: "전달됨", variant: "default" },
};

export default function StatementsPage() {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchStatements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all")
        params.append("status", statusFilter);

      const res = await fetch(`/api/statements?${params}`);
      const data = await res.json();

      if (res.ok) {
        setStatements(data.statements);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch statements:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStatements();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchStatements]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            거래명세서 <span className="text-sm font-normal text-muted-foreground">Statement</span>
          </h2>
          <p className="text-muted-foreground">
            수주에 대한 거래명세서를 발행하고 관리합니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/statements/new">
            <Plus className="h-4 w-4 mr-2" />
            명세서 발행
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="명세서번호 검색..."
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
                <SelectItem value="ISSUED">발행됨</SelectItem>
                <SelectItem value="DELIVERED">전달됨</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : statements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search || statusFilter !== "all"
                ? "검색 결과가 없습니다."
                : "등록된 거래명세서가 없습니다."}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>명세서번호</TableHead>
                    <TableHead>수주번호</TableHead>
                    <TableHead>고객</TableHead>
                    <TableHead>발행일</TableHead>
                    <TableHead className="text-right">항목수</TableHead>
                    <TableHead className="text-right">금액 (VAT별도)</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>담당자</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statements.map((statement) => (
                    <TableRow key={statement.id}>
                      <TableCell>
                        <Link
                          href={`/statements/${statement.id}`}
                          className="font-medium hover:underline"
                        >
                          {statement.statementNo}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/sales-orders/${statement.salesOrder.id}`}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          {statement.salesOrder.salesOrderNo}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {statement.salesOrder.customer.businessName || statement.salesOrder.customer.name}
                      </TableCell>
                      <TableCell>
                        {format(new Date(statement.issueDate), "yyyy-MM-dd", {
                          locale: ko,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        {statement._count.items}건
                      </TableCell>
                      <TableCell className="text-right">
                        {statement.totalAmount.toLocaleString()}원
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusMap[statement.status]?.variant}>
                          {statusMap[statement.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{statement.createdBy.name}</TableCell>
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
