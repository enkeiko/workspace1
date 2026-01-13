import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordStatusChange } from "@/lib/status-history";

/**
 * 작업 명세 확정 API
 *
 * PRD 9.2.2 명세→정산 연결:
 * 1. 명세 상태를 CONFIRMED로 변경
 * 2. 해당 월의 Settlement 확인 (없으면 생성)
 * 3. SettlementLine 자동 생성
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

    // 명세 조회
    const workStatement = await prisma.workStatement.findUnique({
      where: { id },
      include: {
        purchaseOrder: {
          include: {
            channel: true,
            tenant: true,
          },
        },
        items: {
          include: {
            purchaseOrderItem: {
              include: { store: true },
            },
          },
        },
        settlementLines: true,
      },
    });

    if (!workStatement) {
      return NextResponse.json(
        { error: "작업 명세를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 이미 확정된 경우
    if (workStatement.status !== "DRAFT") {
      return NextResponse.json(
        { error: "이미 확정된 명세입니다" },
        { status: 400 }
      );
    }

    // 항목이 없는 경우
    if (workStatement.items.length === 0) {
      return NextResponse.json(
        { error: "명세 항목이 없습니다" },
        { status: 400 }
      );
    }

    // 정산월 결정 (periodEnd 기준)
    const periodEnd = new Date(workStatement.periodEnd);
    const settlementMonth = `${periodEnd.getFullYear()}-${(periodEnd.getMonth() + 1).toString().padStart(2, "0")}`;

    // 트랜잭션으로 처리
    const result = await prisma.$transaction(async (tx) => {
      // 1. 명세 상태 변경
      const confirmedStatement = await tx.workStatement.update({
        where: { id },
        data: {
          status: "CONFIRMED",
          confirmedAt: new Date(),
          confirmedById: session.user.id,
        },
      });

      // 2. 매장별로 정산 처리
      const storeSettlements: Record<string, string> = {};

      for (const item of workStatement.items) {
        const storeId = item.purchaseOrderItem.storeId;

        // 해당 매장/월의 정산이 없으면 생성
        if (!storeSettlements[storeId]) {
          let settlement = await tx.settlement.findFirst({
            where: {
              storeId,
              settlementMonth,
              type: "COST", // 채널 비용 정산
              channelId: workStatement.purchaseOrder.channelId,
            },
          });

          if (!settlement) {
            settlement = await tx.settlement.create({
              data: {
                tenantId: workStatement.purchaseOrder.tenantId,
                storeId,
                channelId: workStatement.purchaseOrder.channelId,
                settlementMonth,
                type: "COST",
                amount: 0,
                description: `${settlementMonth} 채널 비용 정산`,
                status: "PENDING",
              },
            });
          }

          storeSettlements[storeId] = settlement.id;
        }

        // 3. SettlementLine 생성
        await tx.settlementLine.create({
          data: {
            settlementId: storeSettlements[storeId],
            workStatementId: id,
            supplyAmount: item.amount,
            taxAmount: Math.round(item.amount * 0.1),
            totalAmount: item.amount + Math.round(item.amount * 0.1),
          },
        });
      }

      // 4. 정산 금액 재계산
      for (const [storeId, settlementId] of Object.entries(storeSettlements)) {
        const lines = await tx.settlementLine.findMany({
          where: { settlementId },
        });

        const totalAmount = lines.reduce((sum, line) => sum + line.totalAmount, 0);

        await tx.settlement.update({
          where: { id: settlementId },
          data: { amount: totalAmount },
        });
      }

      return confirmedStatement;
    });

    // StatusHistory 기록
    await recordStatusChange({
      entityType: "WORK_STATEMENT",
      entityId: id,
      fromStatus: workStatement.status,
      toStatus: "CONFIRMED",
      changedById: session.user.id,
    });

    // 결과 조회
    const updatedStatement = await prisma.workStatement.findUnique({
      where: { id },
      include: {
        purchaseOrder: {
          include: { channel: true },
        },
        items: {
          include: {
            purchaseOrderItem: {
              include: { store: true },
            },
          },
        },
        settlementLines: {
          include: {
            settlement: true,
          },
        },
        confirmedBy: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json({
      message: "작업 명세가 확정되었습니다",
      workStatement: updatedStatement,
      settlementLinesCreated: updatedStatement?.settlementLines.length || 0,
    });
  } catch (error) {
    console.error("Failed to confirm work statement:", error);
    return NextResponse.json(
      { error: "작업 명세 확정에 실패했습니다" },
      { status: 500 }
    );
  }
}
