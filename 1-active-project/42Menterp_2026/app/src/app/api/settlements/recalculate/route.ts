import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettlementType, SettlementStatus } from "@prisma/client";

/**
 * Recalculation API
 *
 * 확정된 정산을 재계산하고 차액 정산서를 생성합니다.
 *
 * POST /api/settlements/recalculate
 * Body: { settlementId: string } or { month: string }
 */

interface RecalculationResult {
  success: boolean;
  originalTotal: number;
  recalculatedTotal: number;
  difference: number;
  adjustmentSettlementId?: string;
  message: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<RecalculationResult | { error: string }>> {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { settlementId, month } = body;

    if (!settlementId && !month) {
      return NextResponse.json(
        { error: "settlementId 또는 month가 필요합니다" },
        { status: 400 }
      );
    }

    // 정산 조회
    let settlements;
    if (settlementId) {
      const settlement = await prisma.settlement.findUnique({
        where: { id: settlementId },
        include: { store: true, lines: true },
      });
      settlements = settlement ? [settlement] : [];
    } else {
      settlements = await prisma.settlement.findMany({
        where: {
          settlementMonth: month,
          status: { in: [SettlementStatus.CONFIRMED, SettlementStatus.PAID] },
          isRetroactive: false, // 소급분은 제외
        },
        include: { store: true, lines: true },
      });
    }

    if (settlements.length === 0) {
      return NextResponse.json(
        { error: "해당 정산을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    let originalTotal = 0;
    let recalculatedTotal = 0;

    // 각 정산별 재계산
    for (const settlement of settlements) {
      originalTotal += settlement.amount;

      // 실제 데이터 기반 재계산
      // 1. WorkStatement 기반 금액
      const workStatementTotal = settlement.lines.reduce(
        (sum, line) => sum + line.totalAmount,
        0
      );

      // 2. PurchaseOrder 기반 금액 (해당 매장, 해당 월)
      const [year, monthNum] = settlement.settlementMonth.split("-").map(Number);
      const monthStart = new Date(year, monthNum - 1, 1);
      const monthEnd = new Date(year, monthNum, 0, 23, 59, 59);

      const purchaseOrderItems = await prisma.purchaseOrderItem.findMany({
        where: {
          storeId: settlement.storeId,
          startDate: { gte: monthStart },
          endDate: { lte: monthEnd },
          status: "COMPLETED",
        },
      });

      const purchaseOrderTotal = purchaseOrderItems.reduce(
        (sum, item) => sum + item.amount,
        0
      );

      // 더 큰 값 사용 (WorkStatement 또는 PurchaseOrder)
      const actualTotal = Math.max(workStatementTotal, purchaseOrderTotal);
      recalculatedTotal += actualTotal;
    }

    const difference = recalculatedTotal - originalTotal;

    // 차액이 있으면 조정 정산서 생성
    let adjustmentSettlementId: string | undefined;
    if (Math.abs(difference) > 0) {
      const firstSettlement = settlements[0];

      const adjustment = await prisma.settlement.create({
        data: {
          storeId: firstSettlement.storeId,
          settlementMonth: new Date().toISOString().slice(0, 7), // 현재 월
          type: difference > 0 ? SettlementType.REVENUE : SettlementType.COST,
          amount: Math.abs(difference),
          status: SettlementStatus.PENDING,
          description: `재계산 차액 조정 (원래 월: ${firstSettlement.settlementMonth})`,
          isRetroactive: true,
          originalMonth: firstSettlement.settlementMonth,
          adjustmentNote: `원래 금액: ${originalTotal}, 재계산 금액: ${recalculatedTotal}`,
          adjustmentAmount: difference,
        },
      });

      adjustmentSettlementId = adjustment.id;
    }

    return NextResponse.json({
      success: true,
      originalTotal,
      recalculatedTotal,
      difference,
      adjustmentSettlementId,
      message:
        difference === 0
          ? "차액이 없습니다"
          : `${difference > 0 ? "추가 청구" : "환불"} 정산서가 생성되었습니다`,
    });
  } catch (error) {
    console.error("Recalculation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "재계산 실패" },
      { status: 500 }
    );
  }
}
