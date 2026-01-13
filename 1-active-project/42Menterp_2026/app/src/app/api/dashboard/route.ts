import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, format } from "date-fns";

export async function GET() {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/65b289cd-d346-4f18-b84f-38aa47fa8192',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/route.ts:GET',message:'API called',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion
    const session = await getServerSession(authOptions);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/65b289cd-d346-4f18-b84f-38aa47fa8192',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/route.ts:session',message:'Session check',data:{hasSession:!!session,userEmail:session?.user?.email},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    if (!session) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/65b289cd-d346-4f18-b84f-38aa47fa8192',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/route.ts:unauthorized',message:'No session - returning 401',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/65b289cd-d346-4f18-b84f-38aa47fa8192',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/route.ts:beforeQuery',message:'About to query database',data:{weekStart:weekStart.toISOString(),weekEnd:weekEnd.toISOString()},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // 기본 통계
    const [
      totalStores,
      activeStores,
      totalChannels,
      activeChannels,
      totalSalesOrders,
      weeklySalesOrders,
      monthlySalesOrders,
    ] = await Promise.all([
      prisma.store.count(),
      prisma.store.count({ where: { status: "ACTIVE" } }),
      prisma.channel.count(),
      prisma.channel.count({ where: { status: "ACTIVE" } }),
      prisma.salesOrder.count(),
      prisma.salesOrder.findMany({
        where: {
          orderDate: { gte: weekStart, lte: weekEnd },
        },
        include: { 
          customer: true,
          items: true,
        },
      }),
      prisma.salesOrder.findMany({
        where: {
          orderDate: { gte: monthStart, lte: monthEnd },
        },
        include: {
          items: true,
        },
      }),
    ]);

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/65b289cd-d346-4f18-b84f-38aa47fa8192',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/route.ts:afterQuery',message:'Database query complete',data:{totalStores,activeStores,totalSalesOrders,weeklyCount:weeklySalesOrders.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // 주간 통계 계산
    const weeklyStats = {
      orderCount: weeklySalesOrders.length,
      totalQty: weeklySalesOrders.reduce((sum, o) => 
        sum + o.items.reduce((itemSum, item) => itemSum + item.totalQty, 0), 0),
      totalAmount: weeklySalesOrders.reduce((sum, o) => sum + o.totalAmount, 0),
    };

    // 월간 통계 계산
    const monthlyStats = {
      orderCount: monthlySalesOrders.length,
      totalQty: monthlySalesOrders.reduce((sum, o) => 
        sum + o.items.reduce((itemSum, item) => itemSum + item.totalQty, 0), 0),
      totalAmount: monthlySalesOrders.reduce((sum, o) => sum + o.totalAmount, 0),
    };

    // 고객별 주간 수주 현황 (기존 채널별 → 고객별로 변경)
    const customerStats = weeklySalesOrders.reduce((acc, order) => {
      const customerName = order.customer?.name || "미지정";
      if (!acc[customerName]) {
        acc[customerName] = { name: customerName, count: 0, qty: 0, amount: 0 };
      }
      acc[customerName].count += 1;
      acc[customerName].qty += order.items.reduce((sum, item) => sum + item.totalQty, 0);
      acc[customerName].amount += order.totalAmount;
      return acc;
    }, {} as Record<string, { name: string; count: number; qty: number; amount: number }>);

    // 상태별 주간 수주 현황
    const statusStats = weeklySalesOrders.reduce((acc, order) => {
      if (!acc[order.status]) {
        acc[order.status] = { status: order.status, count: 0 };
      }
      acc[order.status].count += 1;
      return acc;
    }, {} as Record<string, { status: string; count: number }>);

    // 최근 6개월 월별 트렌드
    const monthlyTrend = await Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const targetMonth = subMonths(now, 5 - i);
        const mStart = startOfMonth(targetMonth);
        const mEnd = endOfMonth(targetMonth);
        return prisma.salesOrder.aggregate({
          where: {
            orderDate: { gte: mStart, lte: mEnd },
          },
          _sum: { totalAmount: true },
          _count: true,
        }).then((result) => ({
          month: format(targetMonth, "yyyy-MM"),
          label: format(targetMonth, "M월"),
          count: result._count,
          qty: 0, // items 합산이 필요하면 별도 쿼리 필요
          amount: result._sum.totalAmount || 0,
        }));
      })
    );

    // 최근 수주 5건
    const recentSalesOrders = await prisma.salesOrder.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { name: true } },
        createdBy: { select: { name: true } },
        items: true,
      },
    });

    // 알림 (대기 중인 수주, 완료되지 않은 수주 등)
    const confirmedOrders = await prisma.salesOrder.count({
      where: { status: "CONFIRMED" },
    });
    const draftOrders = await prisma.salesOrder.count({
      where: { status: "DRAFT" },
    });
    const inProgressOrders = await prisma.salesOrder.count({
      where: { status: "IN_PROGRESS" },
    });

    const alerts = [];
    if (draftOrders > 0) {
      alerts.push({
        type: "warning",
        title: "초안 수주",
        message: `${draftOrders}건의 수주가 초안 상태입니다.`,
        link: "/sales-orders?status=DRAFT",
      });
    }
    if (confirmedOrders > 0) {
      alerts.push({
        type: "info",
        title: "확정된 수주",
        message: `${confirmedOrders}건의 수주가 확정 상태입니다.`,
        link: "/sales-orders?status=CONFIRMED",
      });
    }
    if (inProgressOrders > 0) {
      alerts.push({
        type: "info",
        title: "진행 중인 수주",
        message: `${inProgressOrders}건의 수주가 진행 중입니다.`,
        link: "/sales-orders?status=IN_PROGRESS",
      });
    }

    return NextResponse.json({
      overview: {
        totalStores,
        activeStores,
        totalChannels,
        activeChannels,
        totalOrders: totalSalesOrders,
      },
      weeklyStats,
      monthlyStats,
      channelStats: Object.values(customerStats), // 하위호환 유지
      statusStats: Object.values(statusStats),
      monthlyTrend,
      recentOrders: recentSalesOrders.map((o) => ({
        id: o.id,
        orderNo: o.salesOrderNo,
        orderDate: o.orderDate,
        status: o.status,
        totalQty: o.items.reduce((sum, item) => sum + item.totalQty, 0),
        totalAmount: o.totalAmount,
        channel: { name: o.customer?.name || "미지정" }, // 하위호환 유지
        createdBy: o.createdBy,
      })),
      alerts,
    });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/65b289cd-d346-4f18-b84f-38aa47fa8192',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard/route.ts:catch',message:'Error caught',data:{errorName:(error as Error)?.name,errorMessage:(error as Error)?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D'})}).catch(()=>{});
    // #endregion
    console.error("Failed to fetch dashboard data:", error);
    return NextResponse.json(
      { error: "대시보드 데이터를 불러오는데 실패했습니다" },
      { status: 500 }
    );
  }
}
