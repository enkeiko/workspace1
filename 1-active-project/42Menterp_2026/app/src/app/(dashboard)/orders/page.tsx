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
  FileSignature,
  ShoppingCart,
  FileCheck,
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

interface SalesOrder {
  id: string;
  salesOrderNo: string;
  orderDate: string;
  status: string;
  totalAmount: number;
  taxAmount: number;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    businessName: string | null;
  };
  sourceQuotation?: {
    id: string;
    quotationNo: string;
  } | null;
  createdBy: {
    name: string;
  };
  _count: {
    items: number;
    purchaseOrders: number;
  };
}

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

const quotationStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "초안", variant: "outline" },
  SENT: { label: "발송됨", variant: "secondary" },
  ACCEPTED: { label: "승인됨", variant: "default" },
  REJECTED: { label: "거절됨", variant: "destructive" },
  EXPIRED: { label: "만료됨", variant: "destructive" },
};

const salesOrderStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "초안", variant: "outline" },
  CONFIRMED: { label: "확정", variant: "secondary" },
  IN_PROGRESS: { label: "진행중", variant: "default" },
  COMPLETED: { label: "완료", variant: "default" },
  CANCELLED: { label: "취소", variant: "destructive" },
};

const statementStatusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "초안", variant: "outline" },
  ISSUED: { label: "발행됨", variant: "secondary" },
  DELIVERED: { label: "전달됨", variant: "default" },
};

export default function OrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "quotations";

  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
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

  const handleTabChange = (value: string) => {
    router.push(`/orders?tab=${value}`);
    setSearch("");
    setStatusFilter("all");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);

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

  const fetchSalesOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);

      const res = await fetch(`/api/sales-orders?${params}`);
      const data = await res.json();

      if (res.ok) {
        setSalesOrders(data.salesOrders);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch sales orders:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter]);

  const fetchStatements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);

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
      if (currentTab === "quotations") {
        fetchQuotations();
      } else if (currentTab === "sales-orders") {
        fetchSalesOrders();
      } else if (currentTab === "statements") {
        fetchStatements();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [currentTab, fetchQuotations, fetchSalesOrders, fetchStatements]);

  const getStatusOptions = () => {
    if (currentTab === "quotations") {
      return [
        { value: "all", label: "전체" },
        { value: "DRAFT", label: "초안" },
        { value: "SENT", label: "발송됨" },
        { value: "ACCEPTED", label: "승인됨" },
        { value: "REJECTED", label: "거절됨" },
        { value: "EXPIRED", label: "만료됨" },
      ];
    } else if (currentTab === "sales-orders") {
      return [
        { value: "all", label: "전체" },
        { value: "DRAFT", label: "초안" },
        { value: "CONFIRMED", label: "확정" },
        { value: "IN_PROGRESS", label: "진행중" },
        { value: "COMPLETED", label: "완료" },
        { value: "CANCELLED", label: "취소" },
      ];
    } else {
      return [
        { value: "all", label: "전체" },
        { value: "DRAFT", label: "초안" },
        { value: "ISSUED", label: "발행됨" },
        { value: "DELIVERED", label: "전달됨" },
      ];
    }
  };

  const getAddButton = () => {
    if (currentTab === "quotations") {
      return (
        <Button asChild>
          <Link href="/quotations/new">
            <Plus className="h-4 w-4 mr-2" />
            견적서 작성
          </Link>
        </Button>
      );
    } else if (currentTab === "sales-orders") {
      return (
        <Button asChild>
          <Link href="/sales-orders/new">
            <Plus className="h-4 w-4 mr-2" />
            수주 등록
          </Link>
        </Button>
      );
    } else {
      return (
        <Button asChild>
          <Link href="/statements/new">
            <Plus className="h-4 w-4 mr-2" />
            명세서 발행
          </Link>
        </Button>
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">주문 관리</h2>
          <p className="text-muted-foreground">
            견적서, 수주, 거래명세서를 통합 관리합니다.
          </p>
        </div>
        {getAddButton()}
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="quotations" className="flex items-center gap-2">
            <FileSignature className="h-4 w-4" />
            견적서
          </TabsTrigger>
          <TabsTrigger value="sales-orders" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            수주
          </TabsTrigger>
          <TabsTrigger value="statements" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            거래명세서
          </TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={
                    currentTab === "quotations"
                      ? "견적번호, 제목 검색..."
                      : currentTab === "sales-orders"
                      ? "수주번호 검색..."
                      : "명세서번호 검색..."
                  }
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
                  {getStatusOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
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
                <TabsContent value="quotations" className="mt-0">
                  {quotations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {search || statusFilter !== "all"
                        ? "검색 결과가 없습니다."
                        : "등록된 견적서가 없습니다."}
                    </div>
                  ) : (
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
                              <Badge variant={quotationStatusMap[quotation.status]?.variant}>
                                {quotationStatusMap[quotation.status]?.label}
                              </Badge>
                            </TableCell>
                            <TableCell>{quotation.createdBy.name}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                <TabsContent value="sales-orders" className="mt-0">
                  {salesOrders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {search || statusFilter !== "all"
                        ? "검색 결과가 없습니다."
                        : "등록된 수주가 없습니다."}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>수주번호</TableHead>
                          <TableHead>고객</TableHead>
                          <TableHead>견적서</TableHead>
                          <TableHead>주문일</TableHead>
                          <TableHead className="text-right">항목수</TableHead>
                          <TableHead className="text-right">발주</TableHead>
                          <TableHead className="text-right">금액 (VAT별도)</TableHead>
                          <TableHead>상태</TableHead>
                          <TableHead>담당자</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell>
                              <Link
                                href={`/sales-orders/${order.id}`}
                                className="font-medium hover:underline"
                              >
                                {order.salesOrderNo}
                              </Link>
                            </TableCell>
                            <TableCell>
                              {order.customer.businessName || order.customer.name}
                            </TableCell>
                            <TableCell>
                              {order.sourceQuotation ? (
                                <Link
                                  href={`/quotations/${order.sourceQuotation.id}`}
                                  className="text-blue-600 hover:underline text-sm"
                                >
                                  {order.sourceQuotation.quotationNo}
                                </Link>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {format(new Date(order.orderDate), "yyyy-MM-dd", {
                                locale: ko,
                              })}
                            </TableCell>
                            <TableCell className="text-right">
                              {order._count.items}건
                            </TableCell>
                            <TableCell className="text-right">
                              {order._count.purchaseOrders > 0 ? (
                                <Badge variant="secondary">{order._count.purchaseOrders}건</Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {order.totalAmount.toLocaleString()}원
                            </TableCell>
                            <TableCell>
                              <Badge variant={salesOrderStatusMap[order.status]?.variant}>
                                {salesOrderStatusMap[order.status]?.label}
                              </Badge>
                            </TableCell>
                            <TableCell>{order.createdBy.name}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                <TabsContent value="statements" className="mt-0">
                  {statements.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {search || statusFilter !== "all"
                        ? "검색 결과가 없습니다."
                        : "등록된 거래명세서가 없습니다."}
                    </div>
                  ) : (
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
                              {statement.salesOrder.customer.businessName ||
                                statement.salesOrder.customer.name}
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
                              <Badge variant={statementStatusMap[statement.status]?.variant}>
                                {statementStatusMap[statement.status]?.label}
                              </Badge>
                            </TableCell>
                            <TableCell>{statement.createdBy.name}</TableCell>
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
