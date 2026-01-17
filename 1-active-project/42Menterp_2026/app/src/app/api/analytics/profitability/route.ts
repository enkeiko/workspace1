import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { billingCalculator } from "@/services/billing-calculator.service";

/**
 * Profitability API
 *
 * 수익성 분석 데이터를 반환합니다.
 *
 * GET /api/analytics/profitability?startDate=2026-01-01&endDate=2026-01-31&groupBy=product
 */

interface ProfitabilityResponse {
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

export async function GET(
  request: NextRequest
): Promise<NextResponse<ProfitabilityResponse | { error: string }>> {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 쿼리 파라미터 추출
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const groupBy = (searchParams.get("groupBy") as "product" | "channel" | "customer") || "product";

    // 기본값: 이번 달
    const now = new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = endDateParam
      ? new Date(endDateParam)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // 수익성 분석 실행
    const analysis = await billingCalculator.getProfitabilityAnalysis(
      startDate,
      endDate,
      groupBy
    );

    return NextResponse.json({
      ...analysis,
      period: {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      },
    });
  } catch (error) {
    console.error("Profitability analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "분석 실패" },
      { status: 500 }
    );
  }
}

/**
 * 월별 정산 실행 API
 *
 * POST /api/analytics/profitability/settle
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 정산 월 파라미터
    const body = await request.json();
    const { month } = body;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "month 파라미터가 필요합니다 (형식: YYYY-MM)" },
        { status: 400 }
      );
    }

    // 월별 정산 실행
    const result = await billingCalculator.executeMonthlySettlement(month);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Monthly settlement error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "정산 실패" },
      { status: 500 }
    );
  }
}
