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
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from "lucide-react";
import { format, subMonths } from "date-fns";

interface TaxInvoice {
  id: string;
  type: "SALES" | "PURCHASE";
  issueDate: string;
  supplierBusinessNo: string;
  supplierName: string;
  receiverBusinessNo: string;
  receiverName: string;
  supplyAmount: number;
  taxAmount: number;
  totalAmount: number;
  ntsConfirmNo: string | null;
  status: "DRAFT" | "ISSUED" | "SENT" | "FAILED";
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const typeMap = {
  SALES: { label: "매출", color: "bg-blue-500", icon: ArrowUpRight },
  PURCHASE: { label: "매입", color: "bg-orange-500", icon: ArrowDownRight },
};

const statusMap = {
  DRAFT: { label: "초안", variant: "outline" as const },
  ISSUED: { label: "발행", variant: "default" as const },
  SENT: { label: "전송", variant: "default" as const },
  FAILED: { label: "실패", variant: "destructive" as const },
};

export default function TaxInvoicesPage() {
  const [invoices, setInvoices] = useState<TaxInvoice[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState(
    format(subMonths(new Date(), 3), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.append("search", search);
      if (typeFilter && typeFilter !== "all") params.append("type", typeFilter);
      if (statusFilter && statusFilter !== "all")
        params.append("status", statusFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`/api/tax-invoices?${params}`);
      const data = await res.json();

      if (res.ok) {
        setInvoices(data.invoices);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch tax invoices:", error);
    } finally {
      setLoading(false);
    }
  }, [
    pagination.page,
    pagination.limit,
    search,
    typeFilter,
    statusFilter,
    startDate,
    endDate,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchInvoices]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // 통계 계산
  const salesTotal = invoices
    .filter((i) => i.type === "SALES")
    .reduce((sum, i) => sum + i.totalAmount, 0);
  const purchaseTotal = invoices
    .filter((i) => i.type === "PURCHASE")
    .reduce((sum, i) => sum + i.totalAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">세금계산서</h2>
          <p className="text-muted-foreground">
            매출/매입 세금계산서를 관리합니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/tax-invoices/new">
            <Plus className="h-4 w-4 mr-2" />
            세금계산서 등록
          </Link>
        </Button>
      </div>

      {/* 요약 카드 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 건수</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}건</div>
            <p className="text-xs text-muted-foreground">조회 기간 내</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">매출 합계</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {salesTotal.toLocaleString()}원
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">매입 합계</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {purchaseTotal.toLocaleString()}원
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="상호, 사업자번호, 승인번호 검색..."
                className="pl-9"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-36"
              />
              <span>~</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-36"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="SALES">매출</SelectItem>
                <SelectItem value="PURCHASE">매입</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="DRAFT">초안</SelectItem>
                <SelectItem value="ISSUED">발행</SelectItem>
                <SelectItem value="SENT">전송</SelectItem>
                <SelectItem value="FAILED">실패</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              세금계산서가 없습니다.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>유형</TableHead>
                    <TableHead>발행일</TableHead>
                    <TableHead>공급자</TableHead>
                    <TableHead>공급받는자</TableHead>
                    <TableHead className="text-right">공급가액</TableHead>
                    <TableHead className="text-right">세액</TableHead>
                    <TableHead className="text-right">합계</TableHead>
                    <TableHead>승인번호</TableHead>
                    <TableHead>상태</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => {
                    const TypeIcon = typeMap[invoice.type].icon;
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={`p-1 rounded ${typeMap[invoice.type].color}`}
                            >
                              <TypeIcon className="h-3 w-3 text-white" />
                            </div>
                            <span>{typeMap[invoice.type].label}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.issueDate), "yyyy-MM-dd")}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{invoice.supplierName}</p>
                            <p className="text-xs text-muted-foreground">
                              {invoice.supplierBusinessNo}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{invoice.receiverName}</p>
                            <p className="text-xs text-muted-foreground">
                              {invoice.receiverBusinessNo}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {invoice.supplyAmount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {invoice.taxAmount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {invoice.totalAmount.toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {invoice.ntsConfirmNo || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusMap[invoice.status].variant}>
                            {statusMap[invoice.status].label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    총 {pagination.total}개 중{" "}
                    {(pagination.page - 1) * pagination.limit + 1}-
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total
                    )}
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
