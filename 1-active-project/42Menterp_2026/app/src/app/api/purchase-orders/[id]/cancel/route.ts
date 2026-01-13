import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordStatusChange } from "@/lib/status-history";
import { z } from "zod";

const cancelSchema = z.object({
  reason: z.string().optional(),
});

/**
 * 발주 취소 API
 *
 * PRD 2.5 상태 전이 규칙:
 * - DRAFT/PENDING/CONFIRMED → CANCELLED
 * - IN_PROGRESS → 작업 명세 확인 필요
 * - COMPLETED → 취소 불가
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
    const body = await request.json().catch(() => ({}));
    const { reason } = cancelSchema.parse(body);

    // 발주 조회
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        channel: true,
        items: {
          include: { store: true },
        },
        workStatements: {
          where: {
            status: { in: ["CONFIRMED", "LOCKED"] },
          },
        },
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "발주를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 이미 취소된 경우
    if (purchaseOrder.status === "CANCELLED") {
      return NextResponse.json(
        { error: "이미 취소된 발주입니다" },
        { status: 400 }
      );
    }

    // 완료된 경우 취소 불가
    if (purchaseOrder.status === "COMPLETED") {
      return NextResponse.json(
        { error: "완료된 발주는 취소할 수 없습니다" },
        { status: 400 }
      );
    }

    // IN_PROGRESS 상태에서 확정된 작업 명세가 있는 경우
    if (purchaseOrder.status === "IN_PROGRESS" && purchaseOrder.workStatements.length > 0) {
      return NextResponse.json(
        {
          error: "확정된 작업 명세가 있어 취소할 수 없습니다",
          workStatements: purchaseOrder.workStatements.map((ws) => ws.statementNo),
        },
        { status: 400 }
      );
    }

    // 상태 변경
    const cancelledOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelledById: session.user.id,
        cancelReason: reason,
      },
      include: {
        channel: true,
        cancelledBy: {
          select: { name: true },
        },
      },
    });

    // StatusHistory 기록
    await recordStatusChange({
      entityType: "PURCHASE_ORDER",
      entityId: id,
      fromStatus: purchaseOrder.status,
      toStatus: "CANCELLED",
      reason,
      changedById: session.user.id,
    });

    // WorkLog 기록
    const storeIds = [...new Set(purchaseOrder.items.map((item) => item.storeId))];

    for (const storeId of storeIds) {
      await prisma.workLog.create({
        data: {
          storeId,
          purchaseOrderId: id,
          workType: "PURCHASE_ORDER_CANCELLED",
          workDate: new Date(),
          description: `${purchaseOrder.channel.name} 발주 취소 - ${purchaseOrder.purchaseOrderNo}${reason ? ` (사유: ${reason})` : ""}`,
          createdById: session.user.id,
        },
      });
    }

    return NextResponse.json({
      message: "발주가 취소되었습니다",
      purchaseOrder: cancelledOrder,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to cancel purchase order:", error);
    return NextResponse.json(
      { error: "발주 취소에 실패했습니다" },
      { status: 500 }
    );
  }
}
