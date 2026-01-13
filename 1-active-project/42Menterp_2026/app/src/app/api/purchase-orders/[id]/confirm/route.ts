import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordStatusChange } from "@/lib/status-history";

/**
 * 발주 확정 API
 *
 * PRD 2.5 상태 전이 규칙:
 * - DRAFT → PENDING → CONFIRMED
 * - 확정 후 작업 시작 가능
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
        channel: true,
        items: {
          include: { store: true },
        },
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "발주를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // PENDING 상태만 확정 가능
    if (purchaseOrder.status !== "PENDING") {
      return NextResponse.json(
        { error: "대기 상태의 발주만 확정할 수 있습니다" },
        { status: 400 }
      );
    }

    // 항목 검증
    if (purchaseOrder.items.length === 0) {
      return NextResponse.json(
        { error: "발주 항목이 없습니다" },
        { status: 400 }
      );
    }

    // 상태 변경
    const confirmedOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        confirmedById: session.user.id,
      },
      include: {
        channel: true,
        items: {
          include: {
            store: true,
            product: true,
          },
        },
        confirmedBy: {
          select: { name: true },
        },
      },
    });

    // StatusHistory 기록
    await recordStatusChange({
      entityType: "PURCHASE_ORDER",
      entityId: id,
      fromStatus: purchaseOrder.status,
      toStatus: "CONFIRMED",
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
          workType: "PURCHASE_ORDER_CONFIRMED",
          workDate: new Date(),
          description: `${purchaseOrder.channel.name} 발주 확정 - ${purchaseOrder.purchaseOrderNo}`,
          qty: totalQty,
          createdById: session.user.id,
        },
      });
    }

    return NextResponse.json({
      message: "발주가 확정되었습니다",
      purchaseOrder: confirmedOrder,
    });
  } catch (error) {
    console.error("Failed to confirm purchase order:", error);
    return NextResponse.json(
      { error: "발주 확정에 실패했습니다" },
      { status: 500 }
    );
  }
}
