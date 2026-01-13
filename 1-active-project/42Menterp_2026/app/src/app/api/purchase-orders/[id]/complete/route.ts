import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordStatusChange } from "@/lib/status-history";

/**
 * 발주 완료 API
 *
 * PRD 2.5 상태 전이 규칙:
 * - IN_PROGRESS → COMPLETED
 * - 완료 시 정산 자동 생성
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 발주 조회
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        tenant: true,
        channel: true,
        items: {
          include: { store: true },
        },
        workStatements: {
          where: { status: "DRAFT" },
        },
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "발주를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // CONFIRMED 또는 IN_PROGRESS 상태만 완료 가능
    if (!["CONFIRMED", "IN_PROGRESS"].includes(purchaseOrder.status)) {
      return NextResponse.json(
        { error: "확정 또는 진행중 상태의 발주만 완료할 수 있습니다" },
        { status: 400 }
      );
    }

    // 미확정 작업 명세가 있는 경우 경고
    if (purchaseOrder.workStatements.length > 0) {
      return NextResponse.json(
        {
          error: "미확정 작업 명세가 있습니다. 먼저 명세를 확정하거나 삭제해주세요.",
          draftStatements: purchaseOrder.workStatements.map((ws) => ws.statementNo),
        },
        { status: 400 }
      );
    }

    // 트랜잭션으로 처리
    const result = await prisma.$transaction(async (tx) => {
      // 1. 발주 상태 변경
      const completedOrder = await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          completedById: session.user.id,
        },
      });

      // 2. 정산 자동 생성 (매장별)
      const settlementMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const storeAmounts = new Map<string, number>();

      for (const item of purchaseOrder.items) {
        const current = storeAmounts.get(item.storeId) || 0;
        storeAmounts.set(item.storeId, current + item.amount);
      }

      const createdSettlements: string[] = [];

      for (const [storeId, amount] of storeAmounts) {
        // 매출 정산 (고객으로부터 받을 금액)
        const revenueSettlement = await tx.settlement.create({
          data: {
            tenantId: purchaseOrder.tenantId,
            storeId,
            channelId: purchaseOrder.channelId,
            settlementMonth,
            type: "REVENUE",
            amount,
            description: `${purchaseOrder.purchaseOrderNo} 발주 완료`,
            status: "PENDING",
          },
        });

        // 비용 정산 (채널에 지불할 금액)
        const costSettlement = await tx.settlement.create({
          data: {
            tenantId: purchaseOrder.tenantId,
            storeId,
            channelId: purchaseOrder.channelId,
            settlementMonth,
            type: "COST",
            amount,
            description: `${purchaseOrder.purchaseOrderNo} 채널 비용`,
            status: "PENDING",
          },
        });

        createdSettlements.push(revenueSettlement.id, costSettlement.id);
      }

      return {
        completedOrder,
        settlementsCreated: createdSettlements.length,
      };
    });

    // StatusHistory 기록
    await recordStatusChange({
      entityType: "PURCHASE_ORDER",
      entityId: id,
      fromStatus: purchaseOrder.status,
      toStatus: "COMPLETED",
      changedById: session.user.id,
    });

    // WorkLog 기록
    const storeIds = [...new Set(purchaseOrder.items.map((item) => item.storeId))];

    for (const storeId of storeIds) {
      const storeItems = purchaseOrder.items.filter((item) => item.storeId === storeId);
      const totalQty = storeItems.reduce((sum, item) => sum + item.totalQty, 0);

      await prisma.workLog.create({
        data: {
          storeId,
          purchaseOrderId: id,
          workType: "PURCHASE_ORDER_COMPLETED",
          workDate: new Date(),
          description: `${purchaseOrder.channel.name} 발주 완료 - ${purchaseOrder.purchaseOrderNo}`,
          qty: totalQty,
          createdById: session.user.id,
        },
      });
    }

    // 결과 조회
    const completedOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        channel: true,
        items: {
          include: {
            store: true,
            product: true,
          },
        },
        completedBy: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json({
      message: "발주가 완료되었습니다",
      purchaseOrder: completedOrder,
      settlementsCreated: result.settlementsCreated,
    });
  } catch (error) {
    console.error("Failed to complete purchase order:", error);
    return NextResponse.json(
      { error: "발주 완료에 실패했습니다" },
      { status: 500 }
    );
  }
}
