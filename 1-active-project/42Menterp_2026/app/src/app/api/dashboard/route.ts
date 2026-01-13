import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, format, addDays } from "date-fns";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const currentMonth = format(now, "yyyy-MM");

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

    // 정산 현황 (이번 달)
    const [revenueSettlements, costSettlements] = await Promise.all([
      prisma.settlement.aggregate({
        where: {
          settlementMonth: currentMonth,
          type: "REVENUE",
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.settlement.aggregate({
        where: {
          settlementMonth: currentMonth,
          type: "COST",
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    // 미수금/미지급금 (PENDING 상태)
    const [pendingRevenue, pendingCost] = await Promise.all([
      prisma.settlement.aggregate({
        where: {
          type: "REVENUE",
          status: "PENDING",
        },
        _sum: { amount: true },
      }),
      prisma.settlement.aggregate({
        where: {
          type: "COST",
          status: "PENDING",
        },
        _sum: { amount: true },
      }),
    ]);

    const settlementStats = {
      monthlyRevenue: revenueSettlements._sum.amount || 0,
      monthlyCost: costSettlements._sum.amount || 0,
      monthlyProfit: (revenueSettlements._sum.amount || 0) - (costSettlements._sum.amount || 0),
      pendingRevenue: pendingRevenue._sum.amount || 0,
      pendingCost: pendingCost._sum.amount || 0,
    };

    // 채널별 주간 발주 현황
    const weeklyPurchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        orderDate: { gte: weekStart, lte: weekEnd },
      },
      include: {
        channel: true,
        items: true,
      },
    });

    const channelStats = weeklyPurchaseOrders.reduce((acc, order) => {
      const channelName = order.channel?.name || "미지정";
      if (!acc[channelName]) {
        acc[channelName] = { name: channelName, count: 0, qty: 0, amount: 0 };
      }
      acc[channelName].count += 1;
      acc[channelName].qty += order.items.reduce((sum, item) => sum + item.totalQty, 0);
      acc[channelName].amount += order.totalAmount;
      return acc;
    }, {} as Record<string, { name: string; count: number; qty: number; amount: number }>);

    // 상태별 주간 발주 현황
    const statusStats = weeklyPurchaseOrders.reduce((acc, order) => {
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
          qty: 0,
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

    // 연장 예정 매장 (D-3, D-1) - PurchaseOrderItem의 endDate 기준
    const d3Date = addDays(now, 3);
    const d1Date = addDays(now, 1);

    const expiringItems = await prisma.purchaseOrderItem.findMany({
      where: {
        endDate: {
          gte: now,
          lte: d3Date,
        },
        purchaseOrder: {
          status: { in: ["CONFIRMED", "IN_PROGRESS"] },
        },
      },
      include: {
        store: { select: { name: true } },
        purchaseOrder: {
          select: {
            purchaseOrderNo: true,
            channel: { select: { name: true } },
          },
        },
      },
      orderBy: { endDate: "asc" },
      take: 10,
    });

    // 알림 생성
    const alerts = [];

    // 연장 예정 알림
    const d1Items = expiringItems.filter(item => {
      const endDate = new Date(item.endDate);
      return endDate <= d1Date;
    });
    const d3Items = expiringItems.filter(item => {
      const endDate = new Date(item.endDate);
      return endDate > d1Date && endDate <= d3Date;
    });

    if (d1Items.length > 0) {
      alerts.push({
        type: "warning",
        title: "내일 종료 예정",
        message: `${d1Items.length}건의 발주가 내일 종료됩니다.`,
        link: "/purchase-orders?expiring=d1",
      });
    }
    if (d3Items.length > 0) {
      alerts.push({
        type: "info",
        title: "3일 내 종료 예정",
        message: `${d3Items.length}건의 발주가 3일 내 종료됩니다.`,
        link: "/purchase-orders?expiring=d3",
      });
    }

    // 초안/확정 수주 알림
    const draftOrders = await prisma.salesOrder.count({
      where: { status: "DRAFT" },
    });
    const confirmedOrders = await prisma.salesOrder.count({
      where: { status: "CONFIRMED" },
    });

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
        message: `${confirmedOrders}건의 수주가 발주 대기 중입니다.`,
        link: "/sales-orders?status=CONFIRMED",
      });
    }

    // 미수금 알림
    if (settlementStats.pendingRevenue > 0) {
      alerts.push({
        type: "warning",
        title: "미수금 현황",
        message: `${(settlementStats.pendingRevenue / 10000).toFixed(0)}만원의 미수금이 있습니다.`,
        link: "/settlements?type=REVENUE&status=PENDING",
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
      settlementStats,
      channelStats: Object.values(channelStats),
      statusStats: Object.values(statusStats),
      monthlyTrend,
      expiringItems: expiringItems.map(item => ({
        id: item.id,
        storeName: item.store.name,
        channelName: item.purchaseOrder.channel.name,
        purchaseOrderNo: item.purchaseOrder.purchaseOrderNo,
        endDate: item.endDate,
        daysLeft: Math.ceil((new Date(item.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      })),
      recentOrders: recentSalesOrders.map((o) => ({
        id: o.id,
        orderNo: o.salesOrderNo,
        orderDate: o.orderDate,
        status: o.status,
        totalQty: o.items.reduce((sum, item) => sum + item.totalQty, 0),
        totalAmount: o.totalAmount,
        channel: { name: o.customer?.name || "미지정" },
        createdBy: o.createdBy,
      })),
      alerts,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    return NextResponse.json(
      { error: "대시보드 데이터를 불러오는데 실패했습니다" },
      { status: 500 }
    );
  }
}
