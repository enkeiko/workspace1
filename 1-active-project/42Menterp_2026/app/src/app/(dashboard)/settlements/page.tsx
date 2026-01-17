"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  Check,
  Clock,
  Download,
  FileSpreadsheet,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  FileDown,
  FileUp,
} from "lucide-react";
import { toast } from "sonner";
import { format, subMonths } from "date-fns";
import { ko } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Store {
  id: string;
  name: string;
  mid: string;
}

interface Channel {
  id: string;
  name: string;
}

interface Settlement {
  id: string;
  storeId: string;
  store: Store;
  channelId: string | null;
  channel: Channel | null;
  settlementMonth: string;
  type: "REVENUE" | "COST";
  amount: number;
  description: string | null;
  status: "PENDING" | "CONFIRMED" | "PAID";
  confirmedAt: string | null;
  confirmedBy: { id: string; name: string } | null;
  createdAt: string;
}

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

interface SummaryData {
  currentMonth: string;
  summary: {
    revenue: number;
    cost: number;
    pendingCount: number;
  };
  monthlyTrend: Array<{
    month: string;
    revenue: number;
    cost: number;
  }>;
  storeStats: Array<{
    storeId: string;
    storeName: string;
    storeMid: string;
    revenue: number;
    cost: number;
    profit: number;
  }>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "대기", variant: "outline" },
  CONFIRMED: { label: "확정", variant: "secondary" },
  PAID: { label: "입금완료", variant: "default" },
};

const typeMap: Record<string, { label: string; color: string }> = {
  REVENUE: { label: "매출", color: "text-green-600" },
  COST: { label: "비용", color: "text-red-600" },
};

const invoiceTypeMap = {
  SALES: { label: "매출", color: "bg-blue-500", icon: ArrowUpRight },
  PURCHASE: { label: "매입", color: "bg-orange-500", icon: ArrowDownRight },
};

const invoiceStatusMap = {
  DRAFT: { label: "초안", variant: "outline" as const },
  ISSUED: { label: "발행", variant: "default" as const },
  SENT: { label: "전송", variant: "default" as const },
  FAILED: { label: "실패", variant: "destructive" as const },
};

export default function SettlementsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "settlements";

  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedType, setSelectedType] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    storeId: "",
    channelId: "",
    settlementMonth: format(new Date(), "yyyy-MM"),
    type: "REVENUE" as "REVENUE" | "COST",
    amount: 0,
    description: "",
  });

  // Tax Invoice states
  const [invoices, setInvoices] = useState<TaxInvoice[]>([]);
  const [invoicePagination, setInvoicePagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<string>("all");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("all");
  const [invoiceStartDate, setInvoiceStartDate] = useState(
    format(subMonths(new Date(), 3), "yyyy-MM-dd")
  );
  const [invoiceEndDate, setInvoiceEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const handleTabChange = (value: string) => {
    router.push(`/settlements?tab=${value}`);
  };

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: invoicePagination.page.toString(),
        limit: invoicePagination.limit.toString(),
      });
      if (invoiceSearch) params.append("search", invoiceSearch);
      if (invoiceTypeFilter && invoiceTypeFilter !== "all") params.append("type", invoiceTypeFilter);
      if (invoiceStatusFilter && invoiceStatusFilter !== "all") params.append("status", invoiceStatusFilter);
      if (invoiceStartDate) params.append("startDate", invoiceStartDate);
      if (invoiceEndDate) params.append("endDate", invoiceEndDate);

      const res = await fetch(`/api/tax-invoices?${params}`);
      const data = await res.json();

      if (res.ok) {
        setInvoices(data.invoices || []);
        setInvoicePagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      }
    } catch (error) {
      console.error("Failed to fetch tax invoices:", error);
    } finally {
      setLoading(false);
    }
  }, [invoicePagination.page, invoicePagination.limit, invoiceSearch, invoiceTypeFilter, invoiceStatusFilter, invoiceStartDate, invoiceEndDate]);

  useEffect(() => {
    if (currentTab === "tax-invoices") {
      fetchInvoices();
    } else {
      fetchData();
    }
  }, [currentTab, selectedMonth, selectedType]);

  useEffect(() => {
    if (currentTab === "tax-invoices") {
      const timer = setTimeout(() => {
        fetchInvoices();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentTab, fetchInvoices]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedMonth) params.append("month", selectedMonth);
      if (selectedType) params.append("type", selectedType);

      const [settlementsRes, summaryRes, storesRes, channelsRes] = await Promise.all([
        fetch(`/api/settlements?${params}`),
        fetch("/api/settlements/summary"),
        fetch("/api/stores"),
        fetch("/api/channels"),
      ]);

      if (settlementsRes.ok) {
        const data = await settlementsRes.json();
        setSettlements(data.settlements);
      }
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      }
      if (storesRes.ok) {
        const data = await storesRes.json();
        setStores(data.stores || []);
      }
      if (channelsRes.ok) {
        const data = await channelsRes.json();
        setChannels(data.channels || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          channelId: formData.channelId || null,
        }),
      });
      if (res.ok) {
        setIsDialogOpen(false);
        setFormData({
          storeId: "",
          channelId: "",
          settlementMonth: format(new Date(), "yyyy-MM"),
          type: "REVENUE",
          amount: 0,
          description: "",
        });
        fetchData();
      }
    } catch (error) {
      console.error("Failed to create settlement:", error);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/settlements/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to update settlement:", error);
    }
  };

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, "yyyy-MM"),
      label: format(date, "yyyy년 M월", { locale: ko }),
    };
  });

  const profit = (summary?.summary.revenue || 0) - (summary?.summary.cost || 0);

  const salesTotal = invoices
    .filter((i) => i.type === "SALES")
    .reduce((sum, i) => sum + i.totalAmount, 0);
  const purchaseTotal = invoices
    .filter((i) => i.type === "PURCHASE")
    .reduce((sum, i) => sum + i.totalAmount, 0);

  const getFilenameFromHeader = (header: string | null) => {
    if (!header) return null;
    const utfMatch = header.match(/filename\*=UTF-8''([^;]+)/i);
    if (utfMatch?.[1]) return decodeURIComponent(utfMatch[1]);
    const asciiMatch = header.match(/filename="?([^";]+)"?/i);
    return asciiMatch?.[1] || null;
  };

  const downloadBlob = async (response: Response, fallbackName: string) => {
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = getFilenameFromHeader(response.headers.get("content-disposition")) || fallbackName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleTemplateDownload = async () => {
    try {
      const res = await fetch("/api/settlements/template");
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "양식 다운로드에 실패했습니다");
        return;
      }
      await downloadBlob(res, "정산_엑셀_양식.xlsx");
    } catch (error) {
      console.error("Failed to download template:", error);
      toast.error("양식 다운로드 중 오류가 발생했습니다");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/settlements/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(data.message);
        if (data.results.errors?.length > 0) {
          console.warn("Import errors:", data.results.errors);
        }
        fetchData();
      } else {
        toast.error(data.error || "업로드에 실패했습니다");
      }
    } catch (error) {
      console.error("Failed to upload:", error);
      toast.error("업로드 중 오류가 발생했습니다");
    } finally {
      e.target.value = "";
    }
  };

  const getAddButton = () => {
    if (currentTab === "tax-invoices") {
      return (
        <Button asChild>
          <Link href="/tax-invoices/new">
            <Plus className="h-4 w-4 mr-2" />
            세금계산서 등록
          </Link>
        </Button>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={handleTemplateDownload}>
          <FileDown className="h-4 w-4 mr-2" />
          엑셀 양식
        </Button>
        <Button variant="outline" asChild className="cursor-pointer">
          <label>
            <FileUp className="h-4 w-4 mr-2" />
            엑셀 업로드
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            window.location.href = `/api/settlements/export?month=${selectedMonth}`;
          }}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel 내보내기
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" /> 정산 등록
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>정산 등록</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>매장</Label>
                <select
                  value={formData.storeId}
                  onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="">매장 선택</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name} ({store.mid})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>채널 (선택)</Label>
                <select
                  value={formData.channelId}
                  onChange={(e) => setFormData({ ...formData, channelId: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="">채널 선택</option>
                  {channels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      {channel.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>정산월</Label>
                  <Input
                    type="month"
                    value={formData.settlementMonth}
                    onChange={(e) => setFormData({ ...formData, settlementMonth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>유형</Label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as "REVENUE" | "COST" })}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  >
                    <option value="REVENUE">매출</option>
                    <option value="COST">비용</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>금액</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })}
                  placeholder="금액 입력"
                />
              </div>
              <div className="space-y-2">
                <Label>설명</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="정산 내용 설명"
                />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={!formData.storeId || !formData.amount}>
                등록
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">정산 관리</h2>
          <p className="text-muted-foreground">
            매출/비용 정산 및 세금계산서를 통합 관리합니다.
          </p>
        </div>
        {getAddButton()}
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="settlements" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            정산 현황
          </TabsTrigger>
          <TabsTrigger value="tax-invoices" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            세금계산서
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settlements" className="mt-4 space-y-6">
          {/* 요약 카드 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번 달 매출</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(summary?.summary.revenue || 0).toLocaleString()}원
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번 달 비용</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {(summary?.summary.cost || 0).toLocaleString()}원
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번 달 수익</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${profit >= 0 ? "text-blue-600" : "text-red-600"}`}>
              {profit.toLocaleString()}원
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">미정산 건수</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {summary?.summary.pendingCount || 0}건
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 월별 추이 차트 */}
      <Card>
        <CardHeader>
          <CardTitle>월별 정산 추이</CardTitle>
          <CardDescription>최근 6개월간 매출/비용 현황</CardDescription>
        </CardHeader>
        <CardContent>
          {summary?.monthlyTrend && summary.monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={summary.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => value.substring(5) + "월"}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
                />
                <Tooltip
                  formatter={(value) => `${Number(value || 0).toLocaleString()}원`}
                  labelFormatter={(label) => `${String(label).substring(0, 4)}년 ${String(label).substring(5)}월`}
                />
                <Legend />
                <Bar dataKey="revenue" name="매출" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" name="비용" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              정산 데이터가 없습니다
            </div>
          )}
        </CardContent>
      </Card>

      {/* 필터 및 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>정산 목록</CardTitle>
              <CardDescription>월별 정산 내역을 확인합니다.</CardDescription>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">전체 유형</option>
                <option value="REVENUE">매출</option>
                <option value="COST">비용</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {settlements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              해당 월에 등록된 정산이 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {settlements.map((settlement) => (
                <div
                  key={settlement.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-12 rounded ${settlement.type === "REVENUE" ? "bg-green-500" : "bg-red-500"}`} />
                    <div>
                      <p className="font-medium">{settlement.store.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {settlement.channel?.name || "채널 미지정"} · {settlement.description || "설명 없음"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`font-medium ${typeMap[settlement.type].color}`}>
                        {settlement.type === "REVENUE" ? "+" : "-"}{settlement.amount.toLocaleString()}원
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {typeMap[settlement.type].label}
                      </p>
                    </div>
                    <Badge variant={statusMap[settlement.status].variant}>
                      {statusMap[settlement.status].label}
                    </Badge>
                    {settlement.status === "PENDING" && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(settlement.id, "CONFIRMED")}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleStatusChange(settlement.id, "PAID")}
                        >
                          <Wallet className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {settlement.status === "CONFIRMED" && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleStatusChange(settlement.id, "PAID")}
                      >
                        <Wallet className="h-4 w-4 mr-1" /> 입금
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 매장별 수익 현황 */}
      {summary?.storeStats && summary.storeStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>매장별 수익 현황</CardTitle>
            <CardDescription>이번 달 매장별 매출/비용/수익</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {summary.storeStats.slice(0, 10).map((store) => (
                <div
                  key={store.storeId}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{store.storeName}</p>
                    <p className="text-sm text-muted-foreground">{store.storeMid}</p>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <p className="text-green-600">+{store.revenue.toLocaleString()}</p>
                      <p className="text-muted-foreground">매출</p>
                    </div>
                    <div className="text-right">
                      <p className="text-red-600">-{store.cost.toLocaleString()}</p>
                      <p className="text-muted-foreground">비용</p>
                    </div>
                    <div className="text-right min-w-[100px]">
                      <p className={`font-medium ${store.profit >= 0 ? "text-blue-600" : "text-red-600"}`}>
                        {store.profit.toLocaleString()}원
                      </p>
                      <p className="text-muted-foreground">수익</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="tax-invoices" className="mt-4 space-y-6">
          {/* 세금계산서 요약 카드 */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">매출 세금계산서</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {salesTotal.toLocaleString()}원
                </div>
                <p className="text-xs text-muted-foreground">
                  {invoices.filter((i) => i.type === "SALES").length}건
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">매입 세금계산서</CardTitle>
                <ArrowDownRight className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {purchaseTotal.toLocaleString()}원
                </div>
                <p className="text-xs text-muted-foreground">
                  {invoices.filter((i) => i.type === "PURCHASE").length}건
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">합계</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(salesTotal - purchaseTotal).toLocaleString()}원
                </div>
                <p className="text-xs text-muted-foreground">
                  총 {invoices.length}건
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 세금계산서 목록 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="사업자번호, 상호 검색..."
                    className="pl-9"
                    value={invoiceSearch}
                    onChange={(e) => {
                      setInvoiceSearch(e.target.value);
                      setInvoicePagination((prev) => ({ ...prev, page: 1 }));
                    }}
                  />
                </div>
                <Select
                  value={invoiceTypeFilter}
                  onValueChange={(value) => {
                    setInvoiceTypeFilter(value);
                    setInvoicePagination((prev) => ({ ...prev, page: 1 }));
                  }}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="유형" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="SALES">매출</SelectItem>
                    <SelectItem value="PURCHASE">매입</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={invoiceStatusFilter}
                  onValueChange={(value) => {
                    setInvoiceStatusFilter(value);
                    setInvoicePagination((prev) => ({ ...prev, page: 1 }));
                  }}
                >
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
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    className="w-[140px]"
                    value={invoiceStartDate}
                    onChange={(e) => setInvoiceStartDate(e.target.value)}
                  />
                  <span className="text-muted-foreground">~</span>
                  <Input
                    type="date"
                    className="w-[140px]"
                    value={invoiceEndDate}
                    onChange={(e) => setInvoiceEndDate(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {invoiceSearch || invoiceTypeFilter !== "all" || invoiceStatusFilter !== "all"
                    ? "검색 결과가 없습니다."
                    : "등록된 세금계산서가 없습니다."}
                </div>
              ) : (
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
                      const TypeIcon = invoiceTypeMap[invoice.type].icon;
                      return (
                        <TableRow key={invoice.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`p-1 rounded ${invoiceTypeMap[invoice.type].color}`}>
                                <TypeIcon className="h-3 w-3 text-white" />
                              </div>
                              <span className="text-sm">{invoiceTypeMap[invoice.type].label}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(invoice.issueDate), "yyyy-MM-dd")}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{invoice.supplierName}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {invoice.supplierBusinessNo}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{invoice.receiverName}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {invoice.receiverBusinessNo}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {invoice.supplyAmount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {invoice.taxAmount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {invoice.totalAmount.toLocaleString()}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {invoice.ntsConfirmNo || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={invoiceStatusMap[invoice.status].variant}>
                              {invoiceStatusMap[invoice.status].label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              {invoicePagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">총 {invoicePagination.total}건</p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={invoicePagination.page === 1}
                      onClick={() =>
                        setInvoicePagination((prev) => ({
                          ...prev,
                          page: prev.page - 1,
                        }))
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      {invoicePagination.page} / {invoicePagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={invoicePagination.page === invoicePagination.totalPages}
                      onClick={() =>
                        setInvoicePagination((prev) => ({
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
