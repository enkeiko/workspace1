import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 워크플로우 대시보드 통계 API
 *
 * GET /api/dashboard/workflow
 *
 * 5단계 카드별 통계:
 * - 견적 대기
 * - 주문 확정
 * - 발주 진행
 * - 명세서 대기
 * - 정산 대기
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 병렬로 통계 조회
    const [
      pendingQuotations,
      draftSalesOrders,
      confirmedSalesOrders,
      inProgressPurchaseOrders,
      draftWorkStatements,
      pendingSettlements,
      recentActivities,
    ] = await Promise.all([
      // 1. 견적 대기 (DRAFT, SENT)
      prisma.quotation.count({
        where: {
          status: { in: ["DRAFT", "SENT"] },
        },
      }),

      // 2. 수주 초안
      prisma.salesOrder.count({
        where: { status: "DRAFT" },
      }),

      // 3. 수주 확정 (발주 대기)
      prisma.salesOrder.count({
        where: { status: "CONFIRMED" },
      }),

      // 4. 발주 진행중
      prisma.purchaseOrder.count({
        where: { status: { in: ["CONFIRMED", "IN_PROGRESS"] } },
      }),

      // 5. 명세서 초안
      prisma.workStatement.count({
        where: { status: "DRAFT" },
      }),

      // 6. 정산 대기
      prisma.settlement.count({
        where: { status: "PENDING" },
      }),

      // 7. 최근 워크플로우 활동 (WorkflowActivity 테이블에서)
      prisma.workflowActivity.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    // 이번 달 통계
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      monthlyQuotations,
      monthlySalesOrders,
      monthlyPurchaseOrders,
      monthlySettlementAmount,
    ] = await Promise.all([
      prisma.quotation.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      prisma.salesOrder.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      prisma.purchaseOrder.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      prisma.settlement.aggregate({
        where: {
          createdAt: { gte: startOfMonth },
          status: { in: ["CONFIRMED", "PAID"] },
        },
        _sum: { amount: true },
      }),
    ]);

    return NextResponse.json({
      stages: [
        {
          id: "quotations",
          title: "견적 대기",
          count: pendingQuotations,
          color: "blue",
          href: "/quotations?status=DRAFT,SENT",
        },
        {
          id: "sales_orders",
          title: "주문 대기",
          count: draftSalesOrders + confirmedSalesOrders,
          subCounts: {
            draft: draftSalesOrders,
            confirmed: confirmedSalesOrders,
          },
          color: "green",
          href: "/orders?status=DRAFT,CONFIRMED",
        },
        {
          id: "purchase_orders",
          title: "발주 진행",
          count: inProgressPurchaseOrders,
          color: "orange",
          href: "/purchase-orders?status=CONFIRMED,IN_PROGRESS",
        },
        {
          id: "work_statements",
          title: "명세서 대기",
          count: draftWorkStatements,
          color: "purple",
          href: "/work-statements?status=DRAFT",
        },
        {
          id: "settlements",
          title: "정산 대기",
          count: pendingSettlements,
          color: "pink",
          href: "/settlements?status=PENDING",
        },
      ],
      monthly: {
        quotations: monthlyQuotations,
        salesOrders: monthlySalesOrders,
        purchaseOrders: monthlyPurchaseOrders,
        settlementAmount: monthlySettlementAmount._sum.amount || 0,
      },
      recentActivities: recentActivities.map((activity) => ({
        id: activity.id,
        type: activity.type,
        message: activity.message,
        severity: activity.severity,
        createdAt: activity.createdAt,
        metadata: activity.metadata,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch workflow dashboard:", error);
    return NextResponse.json(
      { error: "대시보드 데이터 조회에 실패했습니다" },
      { status: 500 }
    );
  }
}
