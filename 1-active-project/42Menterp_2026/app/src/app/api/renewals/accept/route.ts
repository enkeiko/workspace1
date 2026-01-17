import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RenewalStatus, PurchaseOrderStatus, PurchaseOrderItemStatus } from "@prisma/client";

/**
 * Renewal Accept API
 *
 * 연장 제안을 수락하고 새로운 발주를 생성합니다.
 *
 * POST /api/renewals/accept
 * Body: { renewalId: string }
 */

interface AcceptResult {
  success: boolean;
  newOrderId: string;
  newOrderNo: string;
  itemCount: number;
  totalAmount: number;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<AcceptResult | { error: string }>> {
  try {
    // 인증 확인
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 요청 본문 파싱
    const body = await request.json();
    const { renewalId } = body;

    if (!renewalId) {
      return NextResponse.json(
        { error: "renewalId가 필요합니다" },
        { status: 400 }
      );
    }

    // 연장 제안 조회
    const renewal = await prisma.campaignRenewal.findUnique({
      where: { id: renewalId },
      include: {
        originalOrder: {
          include: {
            items: {
              include: {
                store: true,
                product: true,
              },
            },
            channel: true,
            tenant: true,
          },
        },
      },
    });

    if (!renewal) {
      return NextResponse.json(
        { error: "연장 제안을 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    if (renewal.status !== RenewalStatus.PENDING) {
      return NextResponse.json(
        { error: "이미 처리된 연장 제안입니다" },
        { status: 400 }
      );
    }

    const originalOrder = renewal.originalOrder;

    // 트랜잭션으로 새 발주 생성
    const result = await prisma.$transaction(async (tx) => {
      // 새 발주번호 생성
      const today = new Date();
      const datePrefix = `PO${today.getFullYear().toString().slice(-2)}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;

      const lastOrder = await tx.purchaseOrder.findFirst({
        where: { purchaseOrderNo: { startsWith: datePrefix } },
        orderBy: { purchaseOrderNo: "desc" },
      });

      const seq = lastOrder
        ? parseInt(lastOrder.purchaseOrderNo.slice(-4)) + 1
        : 1;
      const newOrderNo = `${datePrefix}-${String(seq).padStart(4, "0")}`;

      // 기간 계산
      const durationDays = Math.ceil(
        (renewal.proposedEndDate.getTime() - renewal.proposedStartDate.getTime()) /
        (1000 * 60 * 60 * 24)
      );

      // 새 발주 생성
      const newOrder = await tx.purchaseOrder.create({
        data: {
          purchaseOrderNo: newOrderNo,
          tenantId: originalOrder.tenantId,
          salesOrderId: originalOrder.salesOrderId,
          channelId: originalOrder.channelId,
          orderWeek: getOrderWeek(renewal.proposedStartDate),
          orderDate: today,
          totalQty: originalOrder.totalQty,
          totalAmount: renewal.proposedAmount,
          status: PurchaseOrderStatus.CONFIRMED,
          memo: `${originalOrder.purchaseOrderNo}에서 연장됨`,
          confirmedAt: today,
          confirmedById: session.user.id,
          createdById: session.user.id,
        },
      });

      // 항목 복제
      const itemData = originalOrder.items.map((item) => ({
        purchaseOrderId: newOrder.id,
        storeId: item.storeId,
        productId: item.productId,
        productType: item.productType,
        keyword: item.keyword,
        dailyQty: item.dailyQty,
        startDate: renewal.proposedStartDate,
        endDate: renewal.proposedEndDate,
        workDays: durationDays,
        totalQty: item.dailyQty * durationDays,
        unitPrice: item.unitPrice,
        amount: item.unitPrice * item.dailyQty * durationDays,
        status: PurchaseOrderItemStatus.PENDING,
        goalType: item.goalType,
        targetRank: item.targetRank,
        guaranteeDays: item.guaranteeDays,
      }));

      await tx.purchaseOrderItem.createMany({
        data: itemData,
      });

      // CampaignRenewal 상태 업데이트
      await tx.campaignRenewal.update({
        where: { id: renewalId },
        data: {
          status: RenewalStatus.ACCEPTED,
          renewedOrderId: newOrder.id,
          acceptedAt: today,
          acceptedById: session.user.id,
        },
      });

      return {
        newOrderId: newOrder.id,
        newOrderNo,
        itemCount: itemData.length,
        totalAmount: renewal.proposedAmount,
      };
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Renewal accept error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "연장 처리 실패" },
      { status: 500 }
    );
  }
}

/**
 * 연장 제안 거절
 *
 * POST /api/renewals/decline
 * Body: { renewalId: string, reason?: string }
 */
export async function PATCH(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { renewalId } = body;

    if (!renewalId) {
      return NextResponse.json(
        { error: "renewalId가 필요합니다" },
        { status: 400 }
      );
    }

    await prisma.campaignRenewal.update({
      where: { id: renewalId },
      data: {
        status: RenewalStatus.DECLINED,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Renewal decline error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "거절 처리 실패" },
      { status: 500 }
    );
  }
}

function getOrderWeek(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const weekNum = Math.ceil(date.getDate() / 7);
  return `${year}-${month}-W${weekNum}`;
}
