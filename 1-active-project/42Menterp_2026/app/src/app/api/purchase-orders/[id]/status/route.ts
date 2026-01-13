import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const statusSchema = z.object({
  status: z.enum([
    "DRAFT",
    "PENDING",
    "CONFIRMED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
  ]),
});

const validTransitions: Record<string, string[]> = {
  DRAFT: ["PENDING", "CANCELLED"],
  PENDING: ["CONFIRMED", "DRAFT", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

// 상태 변경에 따른 WorkLog 유형 매핑
const statusToWorkType: Record<string, string> = {
  CONFIRMED: "PURCHASE_ORDER_CONFIRMED",
  COMPLETED: "PURCHASE_ORDER_COMPLETED",
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status: newStatus } = statusSchema.parse(body);

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "발주를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const allowedStatuses = validTransitions[purchaseOrder.status];
    if (!allowedStatuses?.includes(newStatus)) {
      return NextResponse.json(
        { error: `${purchaseOrder.status}에서 ${newStatus}로 변경할 수 없습니다` },
        { status: 400 }
      );
    }

    // 발주 정보와 항목들 조회 (정산/로그 생성용)
    const orderWithItems = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: { store: true },
        },
        channel: true,
      },
    });

    // 상태 업데이트
    const updatedOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: newStatus },
    });

    // WorkLog 자동 생성 (CONFIRMED, COMPLETED 상태일 때)
    const workType = statusToWorkType[newStatus];
    if (workType && orderWithItems) {
      const storeIds = [...new Set(orderWithItems.items.map((item) => item.storeId))];

      for (const storeId of storeIds) {
        const storeItems = orderWithItems.items.filter((item) => item.storeId === storeId);
        const totalQty = storeItems.reduce((sum, item) => sum + item.totalQty, 0);

        await prisma.workLog.create({
          data: {
            storeId,
            purchaseOrderId: id,
            workType: workType as "PURCHASE_ORDER_CONFIRMED" | "PURCHASE_ORDER_COMPLETED",
            workDate: new Date(),
            description: `${orderWithItems.channel.name} 발주 ${newStatus === "CONFIRMED" ? "확정" : "완료"} - ${orderWithItems.purchaseOrderNo}`,
            qty: totalQty,
            createdById: session.user?.id as string,
          },
        });
      }
    }

    // 발주 완료 시 정산 자동 생성
    if (newStatus === "COMPLETED" && orderWithItems) {
      const settlementMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

      // 매장별 매출 정산 생성
      const storeAmounts = new Map<string, number>();
      for (const item of orderWithItems.items) {
        const current = storeAmounts.get(item.storeId) || 0;
        storeAmounts.set(item.storeId, current + item.amount);
      }

      for (const [storeId, amount] of storeAmounts) {
        // 매출 정산 (고객으로부터 받을 금액)
        await prisma.settlement.create({
          data: {
            storeId,
            channelId: orderWithItems.channelId,
            settlementMonth,
            type: "REVENUE",
            amount,
            description: `${orderWithItems.purchaseOrderNo} 발주 완료`,
            status: "PENDING",
          },
        });

        // 비용 정산 (채널에 지불할 금액)
        await prisma.settlement.create({
          data: {
            storeId,
            channelId: orderWithItems.channelId,
            settlementMonth,
            type: "COST",
            amount,
            description: `${orderWithItems.purchaseOrderNo} 채널 비용`,
            status: "PENDING",
          },
        });
      }
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to update purchase order status:", error);
    return NextResponse.json(
      { error: "상태 변경에 실패했습니다" },
      { status: 500 }
    );
  }
}
