"use client";

import { useState, useEffect } from "react";
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
import {
  Plus,
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  Check,
  Clock,
} from "lucide-react";
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

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PENDING: { label: "대기", variant: "outline" },
  CONFIRMED: { label: "확정", variant: "secondary" },
  PAID: { label: "입금완료", variant: "default" },
};

const typeMap: Record<string, { label: string; color: string }> = {
  REVENUE: { label: "매출", color: "text-green-600" },
  COST: { label: "비용", color: "text-red-600" },
};

export default function SettlementsPage() {
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

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedType]);

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

  if (loading && !settlements.length) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const profit = (summary?.summary.revenue || 0) - (summary?.summary.cost || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">정산 관리</h2>
          <p className="text-muted-foreground">
            매장별 매출/비용 정산을 관리합니다.
          </p>
        </div>
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
    </div>
  );
}
