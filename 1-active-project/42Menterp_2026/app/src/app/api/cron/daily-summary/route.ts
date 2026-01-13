import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyDailySettlementSummary } from "@/lib/telegram";
import { format, startOfDay, endOfDay, subDays } from "date-fns";

/**
 * 일일 정산 요약 알림 Cron Job
 *
 * 매일 오전 10시에 실행 권장 (전일 정산 요약)
 */
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 전일 데이터 조회
    const yesterday = subDays(new Date(), 1);
    const dayStart = startOfDay(yesterday);
    const dayEnd = endOfDay(yesterday);

    // 전일 생성된 정산 데이터 집계
    const [revenueResult, costResult, pendingCount] = await Promise.all([
      prisma.settlement.aggregate({
        where: {
          createdAt: { gte: dayStart, lte: dayEnd },
          type: "REVENUE",
        },
        _sum: { amount: true },
      }),
      prisma.settlement.aggregate({
        where: {
          createdAt: { gte: dayStart, lte: dayEnd },
          type: "COST",
        },
        _sum: { amount: true },
      }),
      prisma.settlement.count({
        where: { status: "PENDING" },
      }),
    ]);

    const revenue = revenueResult._sum.amount || 0;
    const cost = costResult._sum.amount || 0;
    const profit = revenue - cost;

    // 전일 데이터가 없으면 알림 스킵
    if (revenue === 0 && cost === 0) {
      return NextResponse.json({
        success: true,
        message: "전일 정산 데이터 없음 - 알림 스킵",
      });
    }

    // 텔레그램 알림 전송
    const result = await notifyDailySettlementSummary({
      date: format(yesterday, "yyyy년 M월 d일"),
      revenue,
      cost,
      profit,
      pendingCount,
    });

    return NextResponse.json({
      success: result.success,
      message: result.success ? "일일 요약 알림 전송 완료" : result.error,
      data: { revenue, cost, profit, pendingCount },
    });
  } catch (error) {
    console.error("Daily summary cron error:", error);
    return NextResponse.json(
      { error: "Cron job 실행 실패" },
      { status: 500 }
    );
  }
}
