"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Store,
  Radio,
  FileText,
  TrendingUp,
  Loader2,
  AlertTriangle,
  Info,
  ArrowRight,
  Calendar,
  DollarSign,
  CreditCard,
  Clock,
  Wallet,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

interface DashboardData {
  overview: {
    totalStores: number;
    activeStores: number;
    totalChannels: number;
    activeChannels: number;
    totalOrders: number;
  };
  weeklyStats: {
    orderCount: number;
    totalQty: number;
    totalAmount: number;
  };
  monthlyStats: {
    orderCount: number;
    totalQty: number;
    totalAmount: number;
  };
  settlementStats: {
    monthlyRevenue: number;
    monthlyCost: number;
    monthlyProfit: number;
    pendingRevenue: number;
    pendingCost: number;
  };
  channelStats: Array<{
    name: string;
    count: number;
    qty: number;
    amount: number;
  }>;
  statusStats: Array<{
    status: string;
    count: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    label: string;
    count: number;
    qty: number;
    amount: number;
  }>;
  expiringItems: Array<{
    id: string;
    storeName: string;
    channelName: string;
    purchaseOrderNo: string;
    endDate: string;
    daysLeft: number;
  }>;
  recentOrders: Array<{
    id: string;
    orderNo: string;
    orderDate: string;
    status: string;
    totalQty: number;
    totalAmount: number;
    channel: { name: string };
    createdBy: { name: string };
  }>;
  alerts: Array<{
    type: string;
    title: string;
    message: string;
    link: string;
  }>;
}

const statusMap: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }
> = {
  DRAFT: { label: "초안", variant: "outline", color: "#9CA3AF" },
  PENDING: { label: "대기", variant: "secondary", color: "#F59E0B" },
  CONFIRMED: { label: "확정", variant: "default", color: "#3B82F6" },
  IN_PROGRESS: { label: "진행중", variant: "default", color: "#8B5CF6" },
  COMPLETED: { label: "완료", variant: "default", color: "#10B981" },
  CANCELLED: { label: "취소", variant: "destructive", color: "#EF4444" },
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/dashboard");
      const result = await res.json();
      if (res.ok) {
        setData(result);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        데이터를 불러올 수 없습니다.
      </div>
    );
  }

  const statusChartData = data.statusStats.map((s) => ({
    name: statusMap[s.status]?.label || s.status,
    value: s.count,
    color: statusMap[s.status]?.color || "#9CA3AF",
  }));

  const formatAmount = (amount: number) => {
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(1)}억`;
    }
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(0)}만`;
    }
    return amount.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">대시보드</h2>
          <p className="text-muted-foreground">
            네이버 플레이스 마케팅 현황을 한눈에 확인하세요.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {format(new Date(), "yyyy년 M월 d일 (EEEE)", { locale: ko })}
        </div>
      </div>

      {/* 알림 섹션 */}
      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((alert, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                alert.type === "warning"
                  ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20"
                  : "bg-blue-50 border-blue-200 dark:bg-blue-950/20"
              }`}
            >
              <div className="flex items-center gap-3">
                {alert.type === "warning" ? (
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                ) : (
                  <Info className="h-5 w-5 text-blue-600" />
                )}
                <div>
                  <p className="font-medium">{alert.title}</p>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={alert.link}>
                  확인하기 <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* 주요 통계 카드 - 1행 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 매장</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalStores}</div>
            <p className="text-xs text-muted-foreground">
              활성 {data.overview.activeStores}개
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 채널</CardTitle>
            <Radio className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.activeChannels}</div>
            <p className="text-xs text-muted-foreground">
              전체 {data.overview.totalChannels}개
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">금주 발주</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.weeklyStats.orderCount}건</div>
            <p className="text-xs text-muted-foreground">
              {data.weeklyStats.totalQty.toLocaleString()}개 · {formatAmount(data.weeklyStats.totalAmount)}원
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">금월 발주</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.monthlyStats.orderCount}건</div>
            <p className="text-xs text-muted-foreground">
              {data.monthlyStats.totalQty.toLocaleString()}개 · {formatAmount(data.monthlyStats.totalAmount)}원
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 정산 현황 카드 - 2행 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">금월 매출</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatAmount(data.settlementStats.monthlyRevenue)}원
            </div>
            <p className="text-xs text-muted-foreground">
              고객 청구 금액
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">금월 비용</CardTitle>
            <CreditCard className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatAmount(data.settlementStats.monthlyCost)}원
            </div>
            <p className="text-xs text-muted-foreground">
              채널 지급 금액
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">금월 수익</CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.settlementStats.monthlyProfit >= 0 ? "text-blue-600" : "text-red-600"}`}>
              {formatAmount(data.settlementStats.monthlyProfit)}원
            </div>
            <p className="text-xs text-muted-foreground">
              매출 - 비용
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">미수금</CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatAmount(data.settlementStats.pendingRevenue)}원
            </div>
            <p className="text-xs text-muted-foreground">
              미지급: {formatAmount(data.settlementStats.pendingCost)}원
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 차트 영역 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 월별 발주 추이 */}
        <Card>
          <CardHeader>
            <CardTitle>월별 발주 추이</CardTitle>
            <CardDescription>최근 6개월간 발주 현황</CardDescription>
          </CardHeader>
          <CardContent>
            {data.monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value, name) => {
                      const v = Number(value) || 0;
                      if (name === "count") return [`${v}건`, "발주"];
                      if (name === "qty") return [`${v.toLocaleString()}개`, "수량"];
                      return [v, String(name)];
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: "#3B82F6" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                데이터가 없습니다
              </div>
            )}
          </CardContent>
        </Card>

        {/* 상태별 발주 현황 */}
        <Card>
          <CardHeader>
            <CardTitle>금주 상태별 발주</CardTitle>
            <CardDescription>이번 주 발주 상태 분포</CardDescription>
          </CardHeader>
          <CardContent>
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                이번 주 발주가 없습니다
              </div>
            )}
          </CardContent>
        </Card>

        {/* 채널별 발주 현황 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>금주 채널별 발주</CardTitle>
            <CardDescription>이번 주 채널별 발주 건수 및 수량</CardDescription>
          </CardHeader>
          <CardContent>
            {data.channelStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.channelStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value, name) => {
                      const v = Number(value) || 0;
                      if (name === "count") return [`${v}건`, "발주"];
                      if (name === "qty") return [`${v.toLocaleString()}개`, "수량"];
                      return [v, String(name)];
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="count" name="발주" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="qty" name="수량" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                이번 주 발주가 없습니다
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 연장 예정 & 최근 발주 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 연장 예정 매장 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>연장 예정</CardTitle>
              <CardDescription>3일 내 종료되는 발주</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/purchase-orders?expiring=all">
                전체보기 <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.expiringItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                3일 내 종료 예정인 발주가 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {data.expiringItems.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">{item.storeName}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.channelName} · {item.purchaseOrderNo}
                      </p>
                    </div>
                    <Badge variant={item.daysLeft <= 1 ? "destructive" : "secondary"}>
                      D-{item.daysLeft}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 최근 발주 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>최근 수주</CardTitle>
              <CardDescription>최근 등록된 수주 5건</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/sales-orders">
                전체보기 <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.recentOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                아직 수주 내역이 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <Link
                        href={`/sales-orders/${order.id}`}
                        className="font-medium hover:underline"
                      >
                        {order.orderNo}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {order.channel.name} ·{" "}
                        {format(new Date(order.orderDate), "M월 d일", { locale: ko })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {formatAmount(order.totalAmount)}원
                      </span>
                      <Badge variant={statusMap[order.status]?.variant}>
                        {statusMap[order.status]?.label}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
