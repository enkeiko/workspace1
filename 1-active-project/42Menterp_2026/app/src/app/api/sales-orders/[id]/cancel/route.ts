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
 * 수주 취소 API
 *
 * PRD 2.5 상태 전이 규칙:
 * - DRAFT → CANCELLED (무조건 취소 가능)
 * - CONFIRMED → CANCELLED (발주 대기 상태인 PO만 자동 취소)
 * - IN_PROGRESS → 취소 불가 (진행 중인 발주가 있음)
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

    // 수주 조회
    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        purchaseOrders: {
          select: { id: true, status: true, purchaseOrderNo: true },
        },
      },
    });

    if (!salesOrder) {
      return NextResponse.json(
        { error: "수주를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 이미 취소된 경우
    if (salesOrder.status === "CANCELLED") {
      return NextResponse.json(
        { error: "이미 취소된 수주입니다" },
        { status: 400 }
      );
    }

    // 완료된 경우 취소 불가
    if (salesOrder.status === "COMPLETED") {
      return NextResponse.json(
        { error: "완료된 수주는 취소할 수 없습니다" },
        { status: 400 }
      );
    }

    // IN_PROGRESS 상태에서는 진행 중인 발주 확인
    if (salesOrder.status === "IN_PROGRESS") {
      const activeOrders = salesOrder.purchaseOrders.filter(
        (po) => !["PENDING", "CANCELLED"].includes(po.status)
      );

      if (activeOrders.length > 0) {
        return NextResponse.json(
          {
            error: "진행 중인 발주가 있어 취소할 수 없습니다",
            activeOrders: activeOrders.map((po) => po.purchaseOrderNo),
          },
          { status: 400 }
        );
      }
    }

    // 트랜잭션으로 처리
    const result = await prisma.$transaction(async (tx) => {
      // PENDING 상태의 발주 자동 취소
      const pendingOrders = salesOrder.purchaseOrders.filter(
        (po) => po.status === "PENDING"
      );

      if (pendingOrders.length > 0) {
        await tx.purchaseOrder.updateMany({
          where: {
            id: { in: pendingOrders.map((po) => po.id) },
          },
          data: {
            status: "CANCELLED",
            note: `수주 취소로 인한 자동 취소 (${salesOrder.salesOrderNo})`,
          },
        });
      }

      // 수주 취소
      const cancelledOrder = await tx.salesOrder.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledById: session.user.id,
          cancelReason: reason,
        },
        include: {
          customer: true,
          cancelledBy: {
            select: { name: true },
          },
        },
      });

      return {
        cancelledOrder,
        autoCancelledPOs: pendingOrders.length,
      };
    });

    // StatusHistory 기록
    await recordStatusChange({
      entityType: "SALES_ORDER",
      entityId: id,
      fromStatus: salesOrder.status,
      toStatus: "CANCELLED",
      reason,
      changedById: session.user.id,
    });

    // 자동 취소된 발주들의 StatusHistory도 기록
    const pendingOrders = salesOrder.purchaseOrders.filter(
      (po) => po.status === "PENDING"
    );
    for (const po of pendingOrders) {
      await recordStatusChange({
        entityType: "PURCHASE_ORDER",
        entityId: po.id,
        fromStatus: "PENDING",
        toStatus: "CANCELLED",
        reason: `수주 취소로 인한 자동 취소 (${salesOrder.salesOrderNo})`,
        changedById: session.user.id,
      });
    }

    // WorkLog 기록
    const salesOrderWithItems = await prisma.salesOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    if (salesOrderWithItems) {
      const storeIds = [...new Set(
        salesOrderWithItems.items
          .filter((item) => item.storeId)
          .map((item) => item.storeId as string)
      )];

      for (const storeId of storeIds) {
        await prisma.workLog.create({
          data: {
            storeId,
            workType: "SALES_ORDER_CANCELLED",
            workDate: new Date(),
            description: `수주 취소 - ${salesOrder.salesOrderNo}${reason ? ` (사유: ${reason})` : ""}`,
            createdById: session.user.id,
          },
        });
      }
    }

    return NextResponse.json({
      message: "수주가 취소되었습니다",
      salesOrder: result.cancelledOrder,
      autoCancelledPurchaseOrders: result.autoCancelledPOs,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to cancel sales order:", error);
    return NextResponse.json(
      { error: "수주 취소에 실패했습니다" },
      { status: 500 }
    );
  }
}
