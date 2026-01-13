import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format, subMonths } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentMonth = format(new Date(), "yyyy-MM");

    // 이번 달 정산 요약
    const currentMonthSummary = await prisma.settlement.groupBy({
      by: ["type", "status"],
      _sum: { amount: true },
      _count: true,
      where: { settlementMonth: currentMonth },
    });

    // 최근 6개월 정산 추이
    const monthlyTrend = await Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const targetMonth = format(subMonths(new Date(), 5 - i), "yyyy-MM");
        return prisma.settlement.groupBy({
          by: ["type"],
          _sum: { amount: true },
          where: { settlementMonth: targetMonth },
        }).then((result) => ({
          month: targetMonth,
          revenue: result.find(r => r.type === "REVENUE")?._sum.amount || 0,
          cost: result.find(r => r.type === "COST")?._sum.amount || 0,
        }));
      })
    );

    // 미정산 건수
    const pendingCount = await prisma.settlement.count({
      where: { status: "PENDING" },
    });

    // 매장별 정산 현황 (이번 달)
    const storeSettlements = await prisma.settlement.groupBy({
      by: ["storeId", "type"],
      _sum: { amount: true },
      where: { settlementMonth: currentMonth },
    });

    // 매장 정보 조회
    const storeIds = [...new Set(storeSettlements.map(s => s.storeId))];
    const stores = await prisma.store.findMany({
      where: { id: { in: storeIds } },
      select: { id: true, name: true, mid: true },
    });

    const storeMap = new Map(stores.map(s => [s.id, s]));
    const storeStats = storeIds.map(storeId => {
      const store = storeMap.get(storeId);
      const revenue = storeSettlements.find(s => s.storeId === storeId && s.type === "REVENUE")?._sum.amount || 0;
      const cost = storeSettlements.find(s => s.storeId === storeId && s.type === "COST")?._sum.amount || 0;
      return {
        storeId,
        storeName: store?.name || "Unknown",
        storeMid: store?.mid || "",
        revenue,
        cost,
        profit: revenue - cost,
      };
    }).sort((a, b) => b.profit - a.profit);

    return NextResponse.json({
      currentMonth,
      summary: {
        revenue: currentMonthSummary
          .filter(s => s.type === "REVENUE")
          .reduce((sum, s) => sum + (s._sum.amount || 0), 0),
        cost: currentMonthSummary
          .filter(s => s.type === "COST")
          .reduce((sum, s) => sum + (s._sum.amount || 0), 0),
        pendingCount,
      },
      monthlyTrend,
      storeStats,
    });
  } catch (error) {
    console.error("Failed to fetch settlement summary:", error);
    return NextResponse.json(
      { error: "정산 요약을 불러오는데 실패했습니다" },
      { status: 500 }
    );
  }
}
