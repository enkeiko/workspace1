import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 세금계산서-정산 연동 API
 *
 * POST /api/tax-invoices/link-settlements
 *
 * Body:
 * - taxInvoiceId: 세금계산서 ID
 * - settlementIds: 연결할 정산 ID 목록
 *
 * DELETE /api/tax-invoices/link-settlements
 *
 * Body:
 * - settlementIds: 연결 해제할 정산 ID 목록
 */

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { taxInvoiceId, settlementIds } = body;

    if (!taxInvoiceId || !settlementIds || !Array.isArray(settlementIds)) {
      return NextResponse.json(
        { error: "taxInvoiceId와 settlementIds가 필요합니다" },
        { status: 400 }
      );
    }

    // 세금계산서 존재 확인
    const taxInvoice = await prisma.taxInvoice.findUnique({
      where: { id: taxInvoiceId },
    });

    if (!taxInvoice) {
      return NextResponse.json(
        { error: "세금계산서를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 정산 연결
    const result = await prisma.settlement.updateMany({
      where: {
        id: { in: settlementIds },
        // 이미 다른 세금계산서에 연결되지 않은 것만
        OR: [{ taxInvoiceId: null }, { taxInvoiceId: taxInvoiceId }],
      },
      data: {
        taxInvoiceId,
      },
    });

    // 연결된 정산 조회
    const linkedSettlements = await prisma.settlement.findMany({
      where: { taxInvoiceId },
      select: {
        id: true,
        settlementMonth: true,
        amount: true,
        store: {
          select: {
            id: true,
            name: true,
            customer: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // 세금계산서 금액 합계 업데이트
    const totalAmount = linkedSettlements.reduce((sum, s) => sum + s.amount, 0);
    const taxAmount = Math.round(totalAmount * 0.1);

    await prisma.taxInvoice.update({
      where: { id: taxInvoiceId },
      data: {
        supplyAmount: totalAmount,
        taxAmount,
        totalAmount: totalAmount + taxAmount,
      },
    });

    return NextResponse.json({
      success: true,
      linked: result.count,
      totalSettlements: linkedSettlements.length,
      settlements: linkedSettlements,
    });
  } catch (error) {
    console.error("Failed to link settlements:", error);
    return NextResponse.json(
      { error: "정산 연동에 실패했습니다" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { settlementIds } = body;

    if (!settlementIds || !Array.isArray(settlementIds)) {
      return NextResponse.json(
        { error: "settlementIds가 필요합니다" },
        { status: 400 }
      );
    }

    // 연결 해제
    const result = await prisma.settlement.updateMany({
      where: {
        id: { in: settlementIds },
      },
      data: {
        taxInvoiceId: null,
      },
    });

    return NextResponse.json({
      success: true,
      unlinked: result.count,
    });
  } catch (error) {
    console.error("Failed to unlink settlements:", error);
    return NextResponse.json(
      { error: "정산 연결 해제에 실패했습니다" },
      { status: 500 }
    );
  }
}
