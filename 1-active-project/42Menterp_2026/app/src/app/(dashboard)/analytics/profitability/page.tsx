"use client";

import * as React from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  RefreshCw,
  Percent,
  Loader2,
  Calendar,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProfitabilityData {
  summary: {
    totalRevenue: number;
    totalCost: number;
    totalRefund: number;
    grossProfit: number;
    netProfit: number;
    grossMargin: number;
    netMargin: number;
  };
  breakdown: Array<{
    name: string;
    revenue: number;
    cost: number;
    refund: number;
    margin: number;
  }>;
  period: {
    startDate: string;
    endDate: string;
  };
}

export default function ProfitabilityDashboard() {
  const [data, setData] = React.useState<ProfitabilityData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [groupBy, setGroupBy] = React.useState<"product" | "channel" | "customer">("product");
  const [period, setPeriod] = React.useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // 데이터 로드
  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [year, month] = period.split("-");
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(Number(year), Number(month), 0).toISOString().split("T")[0];

      const res = await fetch(
        `/api/analytics/profitability?startDate=${startDate}&endDate=${endDate}&groupBy=${groupBy}`
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "데이터 로드 실패");
      }

      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류 발생");
    } finally {
      setIsLoading(false);
    }
  }, [period, groupBy]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // 숫자 포맷
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // 마진 색상
  const getMarginColor = (margin: number) => {
    if (margin >= 30) return "text-green-600";
    if (margin >= 15) return "text-yellow-600";
    return "text-red-600";
  };

  // 월 옵션 생성 (최근 12개월)
  const monthOptions = React.useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
      options.push({ value, label });
    }
    return options;
  }, []);

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          <p>오류: {error}</p>
          <Button variant="outline" className="mt-2" onClick={loadData}>
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">수익성 분석</h1>
          <p className="text-muted-foreground">
            매출, 원가, 환불, 마진을 분석합니다
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="product">상품별</SelectItem>
              <SelectItem value="channel">채널별</SelectItem>
              <SelectItem value="customer">고객별</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadData} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {isLoading && !data ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <>
          {/* KPI 카드 */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 매출</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.summary.totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground">
                  기간: {data.period.startDate} ~ {data.period.endDate}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 원가</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(data.summary.totalCost)}
                </div>
                <p className="text-xs text-muted-foreground">
                  환불: {formatCurrency(data.summary.totalRefund)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">순이익</CardTitle>
                {data.summary.netProfit >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    "text-2xl font-bold",
                    data.summary.netProfit >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {formatCurrency(data.summary.netProfit)}
                </div>
                <p className="text-xs text-muted-foreground">
                  총이익: {formatCurrency(data.summary.grossProfit)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">순마진</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={cn("text-2xl font-bold", getMarginColor(data.summary.netMargin))}
                >
                  {formatPercent(data.summary.netMargin)}
                </div>
                <p className="text-xs text-muted-foreground">
                  총마진: {formatPercent(data.summary.grossMargin)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Waterfall Chart (간이 버전) */}
          <Card>
            <CardHeader>
              <CardTitle>수익성 분해</CardTitle>
              <CardDescription>
                매출에서 순이익까지의 흐름을 보여줍니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-48">
                {/* 매출 */}
                <div className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-blue-500 rounded-t"
                    style={{
                      height: `${Math.min((data.summary.totalRevenue / Math.max(data.summary.totalRevenue, 1)) * 150, 150)}px`,
                    }}
                  />
                  <span className="text-xs mt-2 text-center">매출</span>
                  <span className="text-xs font-medium">
                    {formatCurrency(data.summary.totalRevenue)}
                  </span>
                </div>

                {/* 원가 (차감) */}
                <div className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-red-400 rounded-t"
                    style={{
                      height: `${Math.min((data.summary.totalCost / Math.max(data.summary.totalRevenue, 1)) * 150, 150)}px`,
                    }}
                  />
                  <span className="text-xs mt-2 text-center">원가</span>
                  <span className="text-xs font-medium">
                    -{formatCurrency(data.summary.totalCost)}
                  </span>
                </div>

                {/* 환불 (가산) */}
                <div className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-green-400 rounded-t"
                    style={{
                      height: `${Math.min((data.summary.totalRefund / Math.max(data.summary.totalRevenue, 1)) * 150, 150)}px`,
                    }}
                  />
                  <span className="text-xs mt-2 text-center">환불</span>
                  <span className="text-xs font-medium">
                    +{formatCurrency(data.summary.totalRefund)}
                  </span>
                </div>

                {/* 순이익 */}
                <div className="flex-1 flex flex-col items-center">
                  <div
                    className={cn(
                      "w-full rounded-t",
                      data.summary.netProfit >= 0 ? "bg-green-600" : "bg-red-600"
                    )}
                    style={{
                      height: `${Math.min((Math.abs(data.summary.netProfit) / Math.max(data.summary.totalRevenue, 1)) * 150, 150)}px`,
                    }}
                  />
                  <span className="text-xs mt-2 text-center">순이익</span>
                  <span className="text-xs font-medium">
                    {formatCurrency(data.summary.netProfit)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 상세 테이블 */}
          <Card>
            <CardHeader>
              <CardTitle>
                {groupBy === "product"
                  ? "상품별"
                  : groupBy === "channel"
                  ? "채널별"
                  : "고객별"}{" "}
                수익성
              </CardTitle>
              <CardDescription>
                각 항목의 매출, 원가, 마진을 비교합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>항목</TableHead>
                    <TableHead className="text-right">매출</TableHead>
                    <TableHead className="text-right">원가</TableHead>
                    <TableHead className="text-right">환불</TableHead>
                    <TableHead className="text-right">마진</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.breakdown.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        데이터가 없습니다
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.breakdown.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.cost)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.refund > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              +{formatCurrency(item.refund)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn("font-medium", getMarginColor(item.margin))}>
                            {formatPercent(item.margin)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
