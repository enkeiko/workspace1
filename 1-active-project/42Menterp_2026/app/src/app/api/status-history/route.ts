import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EntityType } from "@prisma/client";

/**
 * StatusHistory 조회 API
 *
 * Expert Review: 상태 변경 이력을 추적하여 감사 추적 제공
 */

/**
 * GET: 상태 이력 조회
 * Query params:
 * - entityType: QUOTATION, SALES_ORDER, PURCHASE_ORDER, WORK_STATEMENT, SETTLEMENT, TAX_INVOICE
 * - entityId: 특정 엔티티 ID
 * - limit: 조회 개수 (기본 50)
 * - offset: 오프셋
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType") as EntityType | null;
    const entityId = searchParams.get("entityId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    const where: Record<string, unknown> = {};

    if (entityType) {
      where.entityType = entityType;
    }

    if (entityId) {
      where.entityId = entityId;
    }

    if (fromDate || toDate) {
      where.changedAt = {};
      if (fromDate) {
        (where.changedAt as Record<string, unknown>).gte = new Date(fromDate);
      }
      if (toDate) {
        (where.changedAt as Record<string, unknown>).lte = new Date(toDate);
      }
    }

    const [history, total] = await Promise.all([
      prisma.statusHistory.findMany({
        where,
        include: {
          changedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { changedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.statusHistory.count({ where }),
    ]);

    // 엔티티 상세 정보 보강
    const enrichedHistory = await Promise.all(
      history.map(async (h) => {
        let entityDetails: Record<string, unknown> | null = null;

        try {
          switch (h.entityType) {
            case "QUOTATION":
              entityDetails = await prisma.quotation.findUnique({
                where: { id: h.entityId },
                select: { quotationNo: true, totalAmount: true },
              });
              break;
            case "SALES_ORDER":
              entityDetails = await prisma.salesOrder.findUnique({
                where: { id: h.entityId },
                select: { salesOrderNo: true, totalAmount: true },
              });
              break;
            case "PURCHASE_ORDER":
              entityDetails = await prisma.purchaseOrder.findUnique({
                where: { id: h.entityId },
                select: { purchaseOrderNo: true, totalAmount: true },
              });
              break;
            case "WORK_STATEMENT":
              entityDetails = await prisma.workStatement.findUnique({
                where: { id: h.entityId },
                select: { statementNo: true, totalAmount: true },
              });
              break;
            case "SETTLEMENT":
              entityDetails = await prisma.settlement.findUnique({
                where: { id: h.entityId },
                select: { settlementMonth: true, amount: true, type: true },
              });
              break;
            case "TAX_INVOICE":
              entityDetails = await prisma.taxInvoice.findUnique({
                where: { id: h.entityId },
                select: { ntsConfirmNo: true, supplyAmount: true, status: true },
              });
              break;
          }
        } catch {
          // 엔티티가 삭제된 경우 무시
        }

        return {
          ...h,
          entityDetails,
        };
      })
    );

    return NextResponse.json({
      history: enrichedHistory,
      pagination: { total, limit, offset },
    });
  } catch (error) {
    console.error("Failed to fetch status history:", error);
    return NextResponse.json(
      { error: "상태 이력 조회에 실패했습니다" },
      { status: 500 }
    );
  }
}
