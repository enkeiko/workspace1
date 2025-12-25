"use client";

import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { Receipt, TrendingUp, TrendingDown, DollarSign, CreditCard, Wallet } from "lucide-react";
import { toast } from "sonner";

interface DashboardSummary {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  unpaidAmount: number;
  paidAmount: number;
}

interface RevenueByPeriod {
  period: string;
  revenue: number;
  cost: number;
  profit: number;
}

interface RevenueByCustomer {
  customerId: number;
  customerName: string;
  revenue: number;
}

interface RevenueByStore {
  storeId: number;
  storeName: string;
  revenue: number;
}

interface DashboardData {
  summary: DashboardSummary;
  revenueByPeriod: RevenueByPeriod[];
  revenueByCustomer: RevenueByCustomer[];
  revenueByStore: RevenueByStore[];
}

export default function SettlementsPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<string>("month");

  useEffect(() => {
    fetchDashboard();
  }, [period]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        period,
      });

      const response = await fetch(`/api/settlements/dashboard?${params}`);

      if (!response.ok) {
        throw new Error("데이터를 불러오는데 실패했습니다.");
      }

      const result = await response.json();

      if (result.success) {
        setDashboard(result.data);
      } else {
        throw new Error(result.error?.message || "데이터를 불러오는데 실패했습니다.");
      }
    } catch (error) {
      console.error("대시보드 데이터 조회 실패:", error);
      const errorMessage =
        error instanceof Error ? error.message : "오류가 발생했습니다.";
      setError(errorMessage);
      toast.error("데이터 로딩 실패", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ko-KR").format(price);
  };

  const formatPeriod = (period: string) => {
    const [year, month] = period.split("-");
    return `${year}년 ${month}월`;
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <div className="mb-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !dashboard) {
    return (
      <MainLayout>
        <div className="container mx-auto p-6">
          <ErrorState
            title="데이터 로딩 실패"
            description={error || "대시보드 데이터를 불러올 수 없습니다."}
            onRetry={fetchDashboard}
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">정산 관리</h1>
            <p className="text-gray-500">매출 및 정산 현황을 확인합니다.</p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="기간 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">오늘</SelectItem>
              <SelectItem value="week">최근 7일</SelectItem>
              <SelectItem value="month">최근 1개월</SelectItem>
              <SelectItem value="quarter">최근 3개월</SelectItem>
              <SelectItem value="year">최근 1년</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 요약 카드 */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 매출</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatPrice(dashboard.summary.totalRevenue)}원
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 비용</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatPrice(dashboard.summary.totalCost)}원
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 수익</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatPrice(dashboard.summary.totalProfit)}원
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">미수금</CardTitle>
              <CreditCard className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatPrice(dashboard.summary.unpaidAmount)}원
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">선금</CardTitle>
              <Wallet className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {formatPrice(dashboard.summary.paidAmount)}원
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 기간별 매출/비용 */}
        {dashboard.revenueByPeriod.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>기간별 매출/비용</CardTitle>
              <CardDescription>월별 매출 및 비용 추이</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboard.revenueByPeriod.map((item) => (
                  <div
                    key={item.period}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{formatPeriod(item.period)}</p>
                      <p className="text-sm text-gray-500">
                        매출: {formatPrice(item.revenue)}원 | 비용: {formatPrice(item.cost)}원
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">
                        수익: {formatPrice(item.profit)}원
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* 고객별 매출 */}
          {dashboard.revenueByCustomer.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>고객별 매출</CardTitle>
                <CardDescription>고객사별 매출 현황</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard.revenueByCustomer.slice(0, 10).map((item) => (
                    <div
                      key={item.customerId}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{item.customerName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-green-600">
                          {formatPrice(item.revenue)}원
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 매장별 매출 */}
          {dashboard.revenueByStore.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>매장별 매출</CardTitle>
                <CardDescription>매장별 매출 현황</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboard.revenueByStore.slice(0, 10).map((item) => (
                    <div
                      key={item.storeId}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{item.storeName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-green-600">
                          {formatPrice(item.revenue)}원
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

