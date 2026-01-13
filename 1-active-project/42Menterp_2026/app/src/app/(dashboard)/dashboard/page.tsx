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
  AlertCircle,
  AlertTriangle,
  Info,
  ArrowRight,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
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

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/65b289cd-d346-4f18-b84f-38aa47fa8192',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/page.tsx:fetch',message:'Fetching dashboard API',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      const res = await fetch("/api/dashboard");
      const result = await res.json();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/65b289cd-d346-4f18-b84f-38aa47fa8192',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/page.tsx:response',message:'API response received',data:{status:res.status,ok:res.ok,hasData:!!result,errorMsg:result?.error},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B,C'})}).catch(()=>{});
      // #endregion
      if (res.ok) {
        setData(result);
      }
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/65b289cd-d346-4f18-b84f-38aa47fa8192',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/page.tsx:catch',message:'Fetch error',data:{errorMsg:(error as Error)?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,D'})}).catch(()=>{});
      // #endregion
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

      {/* 주요 통계 카드 */}
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
              {data.weeklyStats.totalQty.toLocaleString()}개 · {(data.weeklyStats.totalAmount / 10000).toFixed(0)}만원
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
              {data.monthlyStats.totalQty.toLocaleString()}개 · {(data.monthlyStats.totalAmount / 10000).toFixed(0)}만원
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

      {/* 최근 발주 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>최근 발주</CardTitle>
            <CardDescription>최근 등록된 발주 5건</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/orders">
              전체보기 <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {data.recentOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              아직 발주 내역이 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {data.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <Link
                        href={`/orders/${order.id}`}
                        className="font-medium hover:underline"
                      >
                        {order.orderNo}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {order.channel.name} ·{" "}
                        {format(new Date(order.orderDate), "M월 d일", {
                          locale: ko,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">
                        {order.totalQty.toLocaleString()}건
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {order.totalAmount.toLocaleString()}원
                      </p>
                    </div>
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
  );
}
