import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Users,
  Store,
  ShoppingCart,
  FileText,
  Calendar,
  Clock,
  FolderOpen,
  TrendingUp,
} from "lucide-react";
import { customerService } from "@/lib/services/customer.service";
import { orderService } from "@/lib/services/order.service";
import { taskService } from "@/lib/services/task.service";
import { settlementService } from "@/lib/services/settlement.service";

async function getDashboardStats() {
  try {
    const [customers, orders, tasks, dashboard] = await Promise.all([
      customerService.getCustomers({ limit: 1 }),
      orderService.getOrders({ status: "in_progress", limit: 1 }),
      taskService.getTasks({ status: "in_progress", limit: 1 }),
      settlementService.getDashboard({ period: "month" }),
    ]);

    return {
      customerCount: customers.pagination.total,
      activeOrderCount: orders.pagination.total,
      activeTaskCount: tasks.pagination.total,
      monthlyRevenue: dashboard.summary.totalRevenue,
    };
  } catch (error) {
    console.error("대시보드 통계 조회 실패:", error);
    return {
      customerCount: 0,
      activeOrderCount: 0,
      activeTaskCount: 0,
      monthlyRevenue: 0,
    };
  }
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("ko-KR").format(price);
}

export default async function HomePage() {
  const stats = await getDashboardStats();

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">대시보드</h1>
          <p className="text-gray-500">전체 현황을 한눈에 확인하세요.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/customers">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">고객</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.customerCount}</div>
                <p className="text-xs text-muted-foreground">등록된 고객 수</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/orders">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">주문</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeOrderCount}</div>
                <p className="text-xs text-muted-foreground">진행 중인 주문</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/settlements">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">매출</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPrice(stats.monthlyRevenue)}원</div>
                <p className="text-xs text-muted-foreground">이번 달 매출</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/tasks">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">작업</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.activeTaskCount}</div>
                <p className="text-xs text-muted-foreground">진행 중인 작업</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>빠른 액션</CardTitle>
              <CardDescription>자주 사용하는 기능에 빠르게 접근하세요.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Link href="/customers/new">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  새 고객 추가
                </Button>
              </Link>
              <Link href="/orders/new">
                <Button variant="outline" className="w-full justify-start">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  새 주문 추가
                </Button>
              </Link>
              <Link href="/quotations/new">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  새 견적서 작성
                </Button>
              </Link>
              <Link href="/consultations/new">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  상담 기록 추가
                </Button>
              </Link>
              <Link href="/tasks/new">
                <Button variant="outline" className="w-full justify-start">
                  <Clock className="mr-2 h-4 w-4" />
                  새 작업 추가
                </Button>
              </Link>
              <Link href="/documents/new">
                <Button variant="outline" className="w-full justify-start">
                  <FolderOpen className="mr-2 h-4 w-4" />
                  문서 업로드
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>최근 활동</CardTitle>
              <CardDescription>최근에 등록된 항목들을 확인하세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">데이터가 없습니다.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

