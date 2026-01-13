/**
 * StatusHistory 자동 기록 유틸리티
 * Expert Review 권장사항: Universal Search & Status History Log
 */

import { prisma } from "@/lib/prisma";
import { EntityType } from "@prisma/client";

interface StatusChangeParams {
  entityType: EntityType;
  entityId: string;
  fromStatus: string | null;
  toStatus: string;
  reason?: string;
  isManualOverride?: boolean;
  changedById?: string;
}

/**
 * 상태 변경 이력을 기록합니다
 */
export async function recordStatusChange({
  entityType,
  entityId,
  fromStatus,
  toStatus,
  reason,
  isManualOverride = false,
  changedById,
}: StatusChangeParams) {
  // 상태가 동일하면 기록하지 않음
  if (fromStatus === toStatus) {
    return null;
  }

  return prisma.statusHistory.create({
    data: {
      entityType,
      entityId,
      fromStatus,
      toStatus,
      reason,
      isManualOverride,
      changedById,
    },
  });
}

/**
 * 특정 엔티티의 상태 변경 이력을 조회합니다
 */
export async function getStatusHistory(
  entityType: EntityType,
  entityId: string
) {
  return prisma.statusHistory.findMany({
    where: {
      entityType,
      entityId,
    },
    include: {
      changedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      changedAt: "desc",
    },
  });
}

/**
 * 여러 엔티티의 최근 상태 변경 이력을 조회합니다 (Universal Search용)
 */
export async function getRecentStatusChanges(options: {
  entityTypes?: EntityType[];
  limit?: number;
  changedById?: string;
}) {
  const { entityTypes, limit = 50, changedById } = options;

  return prisma.statusHistory.findMany({
    where: {
      ...(entityTypes && { entityType: { in: entityTypes } }),
      ...(changedById && { changedById }),
    },
    include: {
      changedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      changedAt: "desc",
    },
    take: limit,
  });
}

/**
 * 엔티티 타입에 따른 문서 정보를 조회합니다
 */
export async function getEntityDetails(entityType: EntityType, entityId: string) {
  switch (entityType) {
    case "QUOTATION":
      return prisma.quotation.findUnique({
        where: { id: entityId },
        select: {
          id: true,
          quotationNo: true,
          status: true,
          customer: { select: { name: true } },
        },
      });
    case "SALES_ORDER":
      return prisma.salesOrder.findUnique({
        where: { id: entityId },
        select: {
          id: true,
          salesOrderNo: true,
          status: true,
          customer: { select: { name: true } },
        },
      });
    case "PURCHASE_ORDER":
      return prisma.purchaseOrder.findUnique({
        where: { id: entityId },
        select: {
          id: true,
          purchaseOrderNo: true,
          status: true,
          channel: { select: { name: true } },
        },
      });
    case "WORK_STATEMENT":
      return prisma.workStatement.findUnique({
        where: { id: entityId },
        select: {
          id: true,
          statementNo: true,
          status: true,
          purchaseOrder: {
            select: {
              purchaseOrderNo: true,
              channel: { select: { name: true } },
            },
          },
        },
      });
    case "SETTLEMENT":
      return prisma.settlement.findUnique({
        where: { id: entityId },
        select: {
          id: true,
          settlementMonth: true,
          status: true,
          store: { select: { name: true } },
        },
      });
    case "TAX_INVOICE":
      return prisma.taxInvoice.findUnique({
        where: { id: entityId },
        select: {
          id: true,
          type: true,
          status: true,
          receiverName: true,
        },
      });
    default:
      return null;
  }
}

/**
 * 엔티티 타입 한글명
 */
export const entityTypeLabels: Record<EntityType, string> = {
  QUOTATION: "견적서",
  SALES_ORDER: "수주",
  PURCHASE_ORDER: "발주",
  WORK_STATEMENT: "작업명세",
  SETTLEMENT: "정산",
  TAX_INVOICE: "세금계산서",
};
