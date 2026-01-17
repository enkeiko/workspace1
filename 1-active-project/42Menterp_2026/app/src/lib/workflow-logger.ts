import { prisma } from "@/lib/prisma";

export type WorkflowActivityType =
  | "QUOTATION_CREATED"
  | "QUOTATION_ACCEPTED"
  | "QUOTATION_REJECTED"
  | "SALES_ORDER_CREATED"
  | "SALES_ORDER_CONFIRMED"
  | "SALES_ORDER_CANCELLED"
  | "PURCHASE_ORDER_CREATED"
  | "PURCHASE_ORDER_CONFIRMED"
  | "PURCHASE_ORDER_COMPLETED"
  | "PURCHASE_ORDER_CANCELLED"
  | "WORK_STATEMENT_CREATED"
  | "WORK_STATEMENT_CONFIRMED"
  | "SETTLEMENT_CREATED"
  | "SETTLEMENT_CONFIRMED"
  | "SHEET_EXPORT"
  | "SHEET_IMPORT"
  | "RENEWAL_PROPOSED"
  | "RENEWAL_ACCEPTED"
  | "RENEWAL_DECLINED"
  | "SYSTEM";

export type WorkflowActivitySeverity = "info" | "warning" | "error" | "success";

export interface WorkflowActivityMetadata {
  entityId?: string;
  entityType?: string;
  userId?: string;
  userName?: string;
  amount?: number;
  count?: number;
  [key: string]: unknown;
}

/**
 * 워크플로우 활동 로깅 유틸리티
 *
 * 시스템에서 발생하는 워크플로우 활동을 기록합니다.
 * 대시보드 타임라인에서 조회할 수 있습니다.
 */
export async function logWorkflowActivity(
  type: WorkflowActivityType | string,
  message: string,
  metadata?: WorkflowActivityMetadata,
  severity: WorkflowActivitySeverity = "info"
): Promise<void> {
  try {
    await prisma.workflowActivity.create({
      data: {
        type,
        message,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        severity,
      },
    });
  } catch (error) {
    console.error("Failed to log workflow activity:", error);
    // 로깅 실패는 메인 로직에 영향을 주지 않도록 함
  }
}

/**
 * 최근 워크플로우 활동 조회
 */
export async function getRecentWorkflowActivities(
  limit = 20,
  type?: string,
  severity?: WorkflowActivitySeverity
) {
  const where: Record<string, unknown> = {};

  if (type) {
    where.type = type;
  }

  if (severity) {
    where.severity = severity;
  }

  return prisma.workflowActivity.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

/**
 * 오늘 워크플로우 활동 통계
 */
export async function getTodayWorkflowStats() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const activities = await prisma.workflowActivity.groupBy({
    by: ["type"],
    where: {
      createdAt: { gte: startOfDay },
    },
    _count: true,
  });

  return activities.reduce(
    (acc, item) => {
      acc[item.type] = item._count;
      return acc;
    },
    {} as Record<string, number>
  );
}

// 편의 함수들
export const logQuotationCreated = (quotationNo: string, userId: string, userName: string) =>
  logWorkflowActivity(
    "QUOTATION_CREATED",
    `견적서 ${quotationNo} 생성됨`,
    { entityId: quotationNo, entityType: "QUOTATION", userId, userName },
    "info"
  );

export const logQuotationAccepted = (quotationNo: string, salesOrderNo: string) =>
  logWorkflowActivity(
    "QUOTATION_ACCEPTED",
    `견적서 ${quotationNo} → 수주 ${salesOrderNo} 전환됨`,
    { entityId: quotationNo, entityType: "QUOTATION", salesOrderNo },
    "success"
  );

export const logSalesOrderConfirmed = (salesOrderNo: string, userId: string, userName: string) =>
  logWorkflowActivity(
    "SALES_ORDER_CONFIRMED",
    `수주 ${salesOrderNo} 확정됨`,
    { entityId: salesOrderNo, entityType: "SALES_ORDER", userId, userName },
    "success"
  );

export const logPurchaseOrderCreated = (
  purchaseOrderNo: string,
  channelName: string,
  itemCount: number
) =>
  logWorkflowActivity(
    "PURCHASE_ORDER_CREATED",
    `발주 ${purchaseOrderNo} 생성됨 (${channelName}, ${itemCount}건)`,
    { entityId: purchaseOrderNo, entityType: "PURCHASE_ORDER", channelName, count: itemCount },
    "info"
  );

export const logPurchaseOrderCompleted = (purchaseOrderNo: string, settlementsCreated: number) =>
  logWorkflowActivity(
    "PURCHASE_ORDER_COMPLETED",
    `발주 ${purchaseOrderNo} 완료됨 (정산 ${settlementsCreated}건 생성)`,
    { entityId: purchaseOrderNo, entityType: "PURCHASE_ORDER", count: settlementsCreated },
    "success"
  );

export const logSheetExport = (purchaseOrderNo: string, sheetName: string, rowCount: number) =>
  logWorkflowActivity(
    "SHEET_EXPORT",
    `발주 ${purchaseOrderNo} → ${sheetName} 시트 내보내기 완료 (${rowCount}행)`,
    { entityId: purchaseOrderNo, entityType: "PURCHASE_ORDER", sheetName, count: rowCount },
    "info"
  );

export const logSheetImport = (sheetName: string, importedCount: number, errorCount: number) =>
  logWorkflowActivity(
    "SHEET_IMPORT",
    `${sheetName} 시트에서 ${importedCount}건 가져오기 완료${errorCount > 0 ? ` (오류 ${errorCount}건)` : ""}`,
    { sheetName, importedCount, errorCount },
    errorCount > 0 ? "warning" : "success"
  );

export const logRenewalProposed = (
  originalOrderNo: string,
  proposedAmount: number,
  daysUntilExpiry: number
) =>
  logWorkflowActivity(
    "RENEWAL_PROPOSED",
    `발주 ${originalOrderNo} 연장 제안됨 (D-${daysUntilExpiry}, ${proposedAmount.toLocaleString()}원)`,
    { entityId: originalOrderNo, entityType: "PURCHASE_ORDER", amount: proposedAmount, daysUntilExpiry },
    "info"
  );

export const logRenewalAccepted = (originalOrderNo: string, newOrderNo: string) =>
  logWorkflowActivity(
    "RENEWAL_ACCEPTED",
    `발주 ${originalOrderNo} → ${newOrderNo} 연장 수락됨`,
    { originalOrderNo, newOrderNo },
    "success"
  );
