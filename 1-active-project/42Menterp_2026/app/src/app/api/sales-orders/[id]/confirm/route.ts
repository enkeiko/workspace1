import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordStatusChange } from "@/lib/status-history";

/**
 * 수주 확정 API
 *
 * PRD 2.5 상태 전이 규칙:
 * - DRAFT → CONFIRMED
 * - 확정 후 발주 전환 가능
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

    // 수주 조회
    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: { store: true },
        },
      },
    });

    if (!salesOrder) {
      return NextResponse.json(
        { error: "수주를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // DRAFT 상태만 확정 가능
    if (salesOrder.status !== "DRAFT") {
      return NextResponse.json(
        { error: "초안 상태의 수주만 확정할 수 있습니다" },
        { status: 400 }
      );
    }

    // 항목 검증
    if (salesOrder.items.length === 0) {
      return NextResponse.json(
        { error: "수주 항목이 없습니다" },
        { status: 400 }
      );
    }

    // 매장 연결 검증 (최소 1개 이상 매장 연결 필요)
    const itemsWithStore = salesOrder.items.filter((item) => item.storeId);
    if (itemsWithStore.length === 0) {
      return NextResponse.json(
        { error: "최소 1개 이상의 매장이 연결되어야 합니다" },
        { status: 400 }
      );
    }

    // 상태 변경
    const confirmedOrder = await prisma.salesOrder.update({
      where: { id },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        confirmedById: session.user.id,
      },
      include: {
        customer: true,
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
      entityType: "SALES_ORDER",
      entityId: id,
      fromStatus: salesOrder.status,
      toStatus: "CONFIRMED",
      changedById: session.user.id,
    });

    // WorkLog 기록
    const storeIds = [...new Set(
      itemsWithStore.map((item) => item.storeId as string)
    )];

    for (const storeId of storeIds) {
      await prisma.workLog.create({
        data: {
          storeId,
          workType: "SALES_ORDER_CONFIRMED",
          workDate: new Date(),
          description: `수주 확정 - ${salesOrder.salesOrderNo}`,
          createdById: session.user.id,
        },
      });
    }

    return NextResponse.json({
      message: "수주가 확정되었습니다",
      salesOrder: confirmedOrder,
    });
  } catch (error) {
    console.error("Failed to confirm sales order:", error);
    return NextResponse.json(
      { error: "수주 확정에 실패했습니다" },
      { status: 500 }
    );
  }
}
