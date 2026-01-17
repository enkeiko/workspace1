import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RenewalStatus, PurchaseOrderStatus } from "@prisma/client";

/**
 * Renewal Proposals Cron Job
 *
 * 3일 내 만료 예정 주문을 조회하고 CampaignRenewal을 자동 생성합니다.
 *
 * GET /api/cron/renewal-proposals
 *
 * Vercel Cron 설정 (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/renewal-proposals",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 */

interface RenewalProposalResult {
  created: number;
  skipped: number;
  errors: string[];
  proposals: Array<{
    purchaseOrderNo: string;
    proposedStartDate: string;
    proposedEndDate: string;
    proposedAmount: number;
  }>;
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<RenewalProposalResult | { error: string }>> {
  try {
    // Cron secret 검증 (옵션)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // 로컬 개발에서는 skip
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // 3일 내 만료 예정 주문 조회
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const expiringOrders = await prisma.purchaseOrder.findMany({
      where: {
        status: { in: [PurchaseOrderStatus.IN_PROGRESS, PurchaseOrderStatus.CONFIRMED] },
        items: {
          some: {
            endDate: {
              gte: now,
              lte: threeDaysLater,
            },
          },
        },
        // 이미 연장 제안이 없는 주문만
        originalRenewals: {
          none: {
            status: RenewalStatus.PENDING,
          },
        },
      },
      include: {
        items: true,
        channel: true,
        tenant: true,
      },
    });

    const result: RenewalProposalResult = {
      created: 0,
      skipped: 0,
      errors: [],
      proposals: [],
    };

    for (const order of expiringOrders) {
      try {
        // 최대 종료일 계산
        const maxEndDate = order.items.reduce((max, item) => {
          return item.endDate > max ? item.endDate : max;
        }, new Date(0));

        // 연장 기간 계산 (원본과 동일한 기간)
        const firstStartDate = order.items.reduce((min, item) => {
          return item.startDate < min ? item.startDate : min;
        }, new Date());
        const originalDuration = maxEndDate.getTime() - firstStartDate.getTime();

        // 새로운 시작/종료일
        const proposedStartDate = new Date(maxEndDate.getTime() + 24 * 60 * 60 * 1000); // 만료 다음날
        const proposedEndDate = new Date(proposedStartDate.getTime() + originalDuration);

        // 연장 금액 (원본과 동일)
        const proposedAmount = order.totalAmount;

        // CampaignRenewal 생성
        await prisma.campaignRenewal.create({
          data: {
            originalOrderId: order.id,
            proposedStartDate,
            proposedEndDate,
            proposedAmount,
            status: RenewalStatus.PENDING,
            expiryNotifiedAt: now,
          },
        });

        result.created++;
        result.proposals.push({
          purchaseOrderNo: order.purchaseOrderNo,
          proposedStartDate: proposedStartDate.toISOString().split("T")[0],
          proposedEndDate: proposedEndDate.toISOString().split("T")[0],
          proposedAmount,
        });

        // 알림 생성 (있으면)
        if (order.createdById) {
          await prisma.notification.create({
            data: {
              userId: order.createdById,
              type: "PURCHASE_ORDER_DEADLINE",
              title: "캠페인 만료 예정",
              message: `주문 ${order.purchaseOrderNo}가 ${getDaysUntil(maxEndDate)}일 후 만료됩니다. 연장을 검토해주세요.`,
              channel: "SYSTEM",
              data: {
                purchaseOrderId: order.id,
                purchaseOrderNo: order.purchaseOrderNo,
                expiryDate: maxEndDate.toISOString(),
              },
            },
          });
        }
      } catch (err) {
        result.skipped++;
        result.errors.push(
          `${order.purchaseOrderNo}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Renewal proposals cron error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron job 실패" },
      { status: 500 }
    );
  }
}

function getDaysUntil(date: Date): number {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
