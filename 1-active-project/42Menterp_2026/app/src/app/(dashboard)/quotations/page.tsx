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

interface Quotation {
  id: string;
  quotationNo: string;
  subject: string | null;
  status: string;
  totalAmount: number;
  taxAmount: number;
  validUntil: string;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    businessName: string | null;
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
  SENT: { label: "발송됨", variant: "secondary" },
  ACCEPTED: { label: "승인됨", variant: "default" },
  REJECTED: { label: "거절됨", variant: "destructive" },
  EXPIRED: { label: "만료됨", variant: "destructive" },
};

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all")
        params.append("status", statusFilter);

      const res = await fetch(`/api/quotations?${params}`);
      const data = await res.json();

      if (res.ok) {
        setQuotations(data.quotations);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch quotations:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuotations();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchQuotations]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            견적 관리 <span className="text-sm font-normal text-muted-foreground">Quotation</span>
          </h2>
          <p className="text-muted-foreground">
            고객에게 제안할 견적서를 작성하고 관리합니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/quotations/new">
            <Plus className="h-4 w-4 mr-2" />
            견적서 작성
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="견적번호, 제목 검색..."
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
                <SelectItem value="SENT">발송됨</SelectItem>
                <SelectItem value="ACCEPTED">승인됨</SelectItem>
                <SelectItem value="REJECTED">거절됨</SelectItem>
                <SelectItem value="EXPIRED">만료됨</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : quotations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {search || statusFilter !== "all"
                ? "검색 결과가 없습니다."
                : "등록된 견적서가 없습니다."}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>견적번호</TableHead>
                    <TableHead>고객</TableHead>
                    <TableHead>제목</TableHead>
                    <TableHead className="text-right">항목수</TableHead>
                    <TableHead className="text-right">금액 (VAT별도)</TableHead>
                    <TableHead>유효기간</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>작성자</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotations.map((quotation) => (
                    <TableRow key={quotation.id}>
                      <TableCell>
                        <Link
                          href={`/quotations/${quotation.id}`}
                          className="font-medium hover:underline"
                        >
                          {quotation.quotationNo}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {quotation.customer.businessName || quotation.customer.name}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {quotation.subject || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {quotation._count.items}건
                      </TableCell>
                      <TableCell className="text-right">
                        {quotation.totalAmount.toLocaleString()}원
                      </TableCell>
                      <TableCell>
                        {format(new Date(quotation.validUntil), "yyyy-MM-dd", {
                          locale: ko,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusMap[quotation.status]?.variant}>
                          {statusMap[quotation.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{quotation.createdBy.name}</TableCell>
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
