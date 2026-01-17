"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  ShoppingCart,
  Truck,
  ClipboardCheck,
  CreditCard,
  ArrowRight,
  Activity,
  RefreshCw,
  Loader2,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowStage {
  id: string;
  title: string;
  count: number;
  subCounts?: Record<string, number>;
  color: string;
  href: string;
}

interface WorkflowActivity {
  id: string;
  type: string;
  message: string;
  severity: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface DashboardData {
  stages: WorkflowStage[];
  monthly: {
    quotations: number;
    salesOrders: number;
    purchaseOrders: number;
    settlementAmount: number;
  };
  recentActivities: WorkflowActivity[];
}

const stageIcons: Record<string, React.ReactNode> = {
  quotations: <FileText className="h-6 w-6" />,
  sales_orders: <ShoppingCart className="h-6 w-6" />,
  purchase_orders: <Truck className="h-6 w-6" />,
  work_statements: <ClipboardCheck className="h-6 w-6" />,
  settlements: <CreditCard className="h-6 w-6" />,
};

const stageColors: Record<string, string> = {
  blue: "bg-blue-50 border-blue-200 text-blue-700",
  green: "bg-green-50 border-green-200 text-green-700",
  orange: "bg-orange-50 border-orange-200 text-orange-700",
  purple: "bg-purple-50 border-purple-200 text-purple-700",
  pink: "bg-pink-50 border-pink-200 text-pink-700",
};

const severityIcons: Record<string, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  warning: <AlertCircle className="h-4 w-4 text-yellow-500" />,
  error: <AlertCircle className="h-4 w-4 text-red-500" />,
  info: <Info className="h-4 w-4 text-blue-500" />,
};

export default function WorkflowDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/dashboard/workflow");
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch (error) {
      console.error("Failed to fetch workflow dashboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // 30초마다 자동 새로고침
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">워크플로우 대시보드</h2>
          <p className="text-muted-foreground">
            전체 업무 흐름을 한눈에 확인하세요.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => fetchData(true)}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          새로고침
        </Button>
      </div>

      {/* 5단계 파이프라인 */}
      <div className="grid gap-4 md:grid-cols-5">
        {data?.stages.map((stage, index) => (
          <Card
            key={stage.id}
            className={cn(
              "relative overflow-hidden border-2 transition-all hover:shadow-md",
              stageColors[stage.color]
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                {stageIcons[stage.id]}
                {index < (data?.stages.length || 0) - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-10" />
                )}
              </div>
              <CardTitle className="text-lg">{stage.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stage.count}</div>
              {stage.subCounts && (
                <div className="flex gap-2 mt-1 text-xs">
                  <span>초안: {stage.subCounts.draft}</span>
                  <span>확정: {stage.subCounts.confirmed}</span>
                </div>
              )}
              <Link
                href={stage.href}
                className="text-sm underline mt-2 inline-block"
              >
                상세 보기
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 이번 달 통계 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              이번 달 현황
            </CardTitle>
            <CardDescription>
              {new Date().toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "long",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">견적서</p>
                <p className="text-2xl font-bold">{data?.monthly.quotations}건</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">수주</p>
                <p className="text-2xl font-bold">{data?.monthly.salesOrders}건</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">발주</p>
                <p className="text-2xl font-bold">
                  {data?.monthly.purchaseOrders}건
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">정산 금액</p>
                <p className="text-2xl font-bold">
                  {(data?.monthly.settlementAmount || 0).toLocaleString()}원
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 최근 활동 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              최근 활동
            </CardTitle>
            <CardDescription>워크플로우 진행 현황</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {data?.recentActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  최근 활동이 없습니다.
                </p>
              ) : (
                data?.recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50"
                  >
                    {severityIcons[activity.severity] || severityIcons.info}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleString("ko-KR")}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {activity.type.split("_").slice(0, 2).join("_")}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 빠른 액션 */}
      <Card>
        <CardHeader>
          <CardTitle>빠른 액션</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/quotations/new">
                <FileText className="h-4 w-4 mr-2" />
                새 견적서
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/orders/new">
                <ShoppingCart className="h-4 w-4 mr-2" />
                새 수주
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/purchase-orders">
                <Truck className="h-4 w-4 mr-2" />
                발주 관리
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/settlements">
                <CreditCard className="h-4 w-4 mr-2" />
                정산 관리
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
