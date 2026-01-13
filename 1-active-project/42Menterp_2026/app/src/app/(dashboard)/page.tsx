"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, Radio, FileText, TrendingUp, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface DashboardStats {
  storeCount: number;
  channelCount: number;
  weeklyOrderCount: number;
  weeklyTotalQty: number;
}

interface RecentOrder {
  id: string;
  orderNo: string;
  orderDate: string;
  status: string;
  totalQty: number;
  totalAmount: number;
  channel: {
    name: string;
  };
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  DRAFT: { label: "초안", variant: "outline" },
  PENDING: { label: "대기", variant: "secondary" },
  CONFIRMED: { label: "확정", variant: "default" },
  IN_PROGRESS: { label: "진행중", variant: "default" },
  COMPLETED: { label: "완료", variant: "default" },
  CANCELLED: { label: "취소", variant: "destructive" },
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [storesRes, channelsRes, ordersRes] = await Promise.all([
        fetch("/api/stores?limit=1"),
        fetch("/api/channels"),
        fetch("/api/orders?limit=5"),
      ]);

      const storesData = await storesRes.json();
      const channelsData = await channelsRes.json();
      const ordersData = await ordersRes.json();

      setStats({
        storeCount: storesData.pagination?.total || 0,
        channelCount: channelsData.pagination?.total || 0,
        weeklyOrderCount: ordersData.pagination?.total || 0,
        weeklyTotalQty: ordersData.orders?.reduce(
          (sum: number, o: RecentOrder) => sum + o.totalQty,
          0
        ) || 0,
      });

      setRecentOrders(ordersData.orders || []);
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">대시보드</h2>
        <p className="text-muted-foreground">
          네이버 플레이스 마케팅 현황을 한눈에 확인하세요.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 매장</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.storeCount || 0}</div>
            <p className="text-xs text-muted-foreground">등록된 매장 수</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">채널</CardTitle>
            <Radio className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.channelCount || 0}</div>
            <p className="text-xs text-muted-foreground">활성 채널 수</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 발주</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.weeklyOrderCount || 0}건
            </div>
            <p className="text-xs text-muted-foreground">등록된 발주 건수</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 수량</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.weeklyTotalQty || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">총 발주 수량</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>최근 발주</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              아직 발주 내역이 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
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
