import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { recordStatusChange } from "@/lib/status-history";
import { PurchaseOrderStatus } from "@prisma/client";
import { sendTelegramMessage } from "@/lib/telegram";

const batchUpdateSchema = z.object({
  ids: z.array(z.string()).min(1, "최소 1개 이상 선택해주세요"),
  action: z.enum(["confirm", "start", "complete", "cancel"]),
});

const statusTransitions: Record<string, { from: PurchaseOrderStatus[]; to: PurchaseOrderStatus }> = {
  confirm: { from: ["DRAFT", "PENDING"], to: "CONFIRMED" },
  start: { from: ["CONFIRMED"], to: "IN_PROGRESS" },
  complete: { from: ["IN_PROGRESS"], to: "COMPLETED" },
  cancel: { from: ["DRAFT", "PENDING", "CONFIRMED"], to: "CANCELLED" },
};

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { ids, action } = batchUpdateSchema.parse(body);

    const transition = statusTransitions[action];
    if (!transition) {
      return NextResponse.json(
        { error: "유효하지 않은 액션입니다" },
        { status: 400 }
      );
    }

    // 대상 발주 조회
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: { id: { in: ids } },
      select: { id: true, purchaseOrderNo: true, status: true },
    });

    if (purchaseOrders.length === 0) {
      return NextResponse.json(
        { error: "선택된 발주를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 상태 전이 검증
    const validOrders = purchaseOrders.filter((order) =>
      transition.from.includes(order.status)
    );
    const invalidOrders = purchaseOrders.filter(
      (order) => !transition.from.includes(order.status)
    );

    if (validOrders.length === 0) {
      return NextResponse.json(
        {
          error: `선택된 발주 중 ${action} 처리 가능한 건이 없습니다`,
          invalidOrders: invalidOrders.map((o) => ({
            purchaseOrderNo: o.purchaseOrderNo,
            currentStatus: o.status,
          })),
        },
        { status: 400 }
      );
    }

    // 일괄 업데이트
    const updateResult = await prisma.purchaseOrder.updateMany({
      where: { id: { in: validOrders.map((o) => o.id) } },
      data: {
        status: transition.to,
        updatedAt: new Date(),
      },
    });

    // 상태 변경 이력 기록
    for (const order of validOrders) {
      await recordStatusChange({
        entityType: "PURCHASE_ORDER",
        entityId: order.id,
        fromStatus: order.status,
        toStatus: transition.to,
        changedById: session.user.id,
        reason: `일괄 ${action} 처리`,
      });
    }

    // 텔레그램 알림 (비동기)
    const actionLabels: Record<string, string> = {
      confirm: "확정",
      start: "진행 시작",
      complete: "완료",
      cancel: "취소",
    };

    const statusEmoji: Record<string, string> = {
      confirm: "📋",
      start: "🔄",
      complete: "✅",
      cancel: "❌",
    };

    sendTelegramMessage(
      `<b>${statusEmoji[action]} 발주 일괄 ${actionLabels[action]}</b>\n\n` +
      `• 처리 건수: ${updateResult.count}건\n` +
      `• 담당자: ${session.user.name || session.user.email}`
    ).catch((err) => console.error("Telegram notification failed:", err));

    return NextResponse.json({
      success: true,
      updated: updateResult.count,
      skipped: invalidOrders.length,
      invalidOrders:
        invalidOrders.length > 0
          ? invalidOrders.map((o) => ({
              purchaseOrderNo: o.purchaseOrderNo,
              currentStatus: o.status,
            }))
          : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to batch update purchase orders:", error);
    return NextResponse.json(
      { error: "일괄 처리에 실패했습니다" },
      { status: 500 }
    );
  }
}
