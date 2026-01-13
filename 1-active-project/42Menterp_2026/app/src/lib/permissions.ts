/**
 * 권한 관리 시스템
 *
 * 역할:
 * - SUPER_ADMIN: 모든 권한 (시스템 설정, 사용자 관리 포함)
 * - ADMIN: 관리자 권한 (정산, 세금계산서, 채널 관리)
 * - OPERATOR: 운영자 권한 (매장, 발주, 수주 관리)
 * - VIEWER: 읽기 전용
 */

import { Role } from "@prisma/client";

// UserRole을 Role로 alias
type UserRole = Role;

// 권한 정의
export const PERMISSIONS = {
  // 시스템 설정
  SYSTEM_SETTINGS: "system:settings",
  USER_MANAGE: "system:users",

  // 매장 관리
  STORE_READ: "store:read",
  STORE_CREATE: "store:create",
  STORE_UPDATE: "store:update",
  STORE_DELETE: "store:delete",

  // 채널 관리
  CHANNEL_READ: "channel:read",
  CHANNEL_CREATE: "channel:create",
  CHANNEL_UPDATE: "channel:update",
  CHANNEL_DELETE: "channel:delete",

  // 수주 관리
  SALES_ORDER_READ: "sales_order:read",
  SALES_ORDER_CREATE: "sales_order:create",
  SALES_ORDER_UPDATE: "sales_order:update",
  SALES_ORDER_DELETE: "sales_order:delete",

  // 발주 관리
  PURCHASE_ORDER_READ: "purchase_order:read",
  PURCHASE_ORDER_CREATE: "purchase_order:create",
  PURCHASE_ORDER_UPDATE: "purchase_order:update",
  PURCHASE_ORDER_DELETE: "purchase_order:delete",
  PURCHASE_ORDER_BATCH: "purchase_order:batch",

  // 정산 관리
  SETTLEMENT_READ: "settlement:read",
  SETTLEMENT_CREATE: "settlement:create",
  SETTLEMENT_UPDATE: "settlement:update",
  SETTLEMENT_DELETE: "settlement:delete",
  SETTLEMENT_EXPORT: "settlement:export",

  // 세금계산서
  TAX_INVOICE_READ: "tax_invoice:read",
  TAX_INVOICE_ISSUE: "tax_invoice:issue",

  // 보고서
  REPORT_VIEW: "report:view",
  REPORT_EXPORT: "report:export",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// 역할별 권한 매핑
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS), // 모든 권한

  ADMIN: [
    // 시스템 (사용자 관리 제외)
    PERMISSIONS.SYSTEM_SETTINGS,
    // 매장 - 전체
    PERMISSIONS.STORE_READ,
    PERMISSIONS.STORE_CREATE,
    PERMISSIONS.STORE_UPDATE,
    PERMISSIONS.STORE_DELETE,
    // 채널 - 전체
    PERMISSIONS.CHANNEL_READ,
    PERMISSIONS.CHANNEL_CREATE,
    PERMISSIONS.CHANNEL_UPDATE,
    PERMISSIONS.CHANNEL_DELETE,
    // 수주 - 전체
    PERMISSIONS.SALES_ORDER_READ,
    PERMISSIONS.SALES_ORDER_CREATE,
    PERMISSIONS.SALES_ORDER_UPDATE,
    PERMISSIONS.SALES_ORDER_DELETE,
    // 발주 - 전체
    PERMISSIONS.PURCHASE_ORDER_READ,
    PERMISSIONS.PURCHASE_ORDER_CREATE,
    PERMISSIONS.PURCHASE_ORDER_UPDATE,
    PERMISSIONS.PURCHASE_ORDER_DELETE,
    PERMISSIONS.PURCHASE_ORDER_BATCH,
    // 정산 - 전체
    PERMISSIONS.SETTLEMENT_READ,
    PERMISSIONS.SETTLEMENT_CREATE,
    PERMISSIONS.SETTLEMENT_UPDATE,
    PERMISSIONS.SETTLEMENT_DELETE,
    PERMISSIONS.SETTLEMENT_EXPORT,
    // 세금계산서 - 전체
    PERMISSIONS.TAX_INVOICE_READ,
    PERMISSIONS.TAX_INVOICE_ISSUE,
    // 보고서
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_EXPORT,
  ],

  OPERATOR: [
    // 매장 - 읽기/생성/수정
    PERMISSIONS.STORE_READ,
    PERMISSIONS.STORE_CREATE,
    PERMISSIONS.STORE_UPDATE,
    // 채널 - 읽기
    PERMISSIONS.CHANNEL_READ,
    // 수주 - 전체
    PERMISSIONS.SALES_ORDER_READ,
    PERMISSIONS.SALES_ORDER_CREATE,
    PERMISSIONS.SALES_ORDER_UPDATE,
    // 발주 - 전체 (삭제 제외)
    PERMISSIONS.PURCHASE_ORDER_READ,
    PERMISSIONS.PURCHASE_ORDER_CREATE,
    PERMISSIONS.PURCHASE_ORDER_UPDATE,
    PERMISSIONS.PURCHASE_ORDER_BATCH,
    // 정산 - 읽기/생성
    PERMISSIONS.SETTLEMENT_READ,
    PERMISSIONS.SETTLEMENT_CREATE,
    // 보고서 - 읽기
    PERMISSIONS.REPORT_VIEW,
  ],

  VIEWER: [
    // 읽기 전용
    PERMISSIONS.STORE_READ,
    PERMISSIONS.CHANNEL_READ,
    PERMISSIONS.SALES_ORDER_READ,
    PERMISSIONS.PURCHASE_ORDER_READ,
    PERMISSIONS.SETTLEMENT_READ,
    PERMISSIONS.TAX_INVOICE_READ,
    PERMISSIONS.REPORT_VIEW,
  ],

  PARTNER_ADMIN: [
    // 파트너 관리자 - 자신의 매장 관련 권한만
    PERMISSIONS.STORE_READ,
    PERMISSIONS.STORE_UPDATE,
    PERMISSIONS.CHANNEL_READ,
    PERMISSIONS.SALES_ORDER_READ,
    PERMISSIONS.PURCHASE_ORDER_READ,
    PERMISSIONS.SETTLEMENT_READ,
    PERMISSIONS.TAX_INVOICE_READ,
    PERMISSIONS.REPORT_VIEW,
  ],
};

/**
 * 사용자가 특정 권한을 가지고 있는지 확인
 */
export function hasPermission(
  userRole: UserRole | undefined | null,
  permission: Permission
): boolean {
  if (!userRole) return false;
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
}

/**
 * 사용자가 여러 권한 중 하나라도 가지고 있는지 확인
 */
export function hasAnyPermission(
  userRole: UserRole | undefined | null,
  permissions: Permission[]
): boolean {
  if (!userRole) return false;
  const userPermissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.some((p) => userPermissions.includes(p));
}

/**
 * 사용자가 여러 권한을 모두 가지고 있는지 확인
 */
export function hasAllPermissions(
  userRole: UserRole | undefined | null,
  permissions: Permission[]
): boolean {
  if (!userRole) return false;
  const userPermissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.every((p) => userPermissions.includes(p));
}

/**
 * 역할의 한글 레이블
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "최고 관리자",
  PARTNER_ADMIN: "파트너 관리자",
  ADMIN: "관리자",
  OPERATOR: "운영자",
  VIEWER: "열람자",
};

/**
 * API 라우트에서 사용할 권한 체크 헬퍼
 */
export function checkPermission(
  userRole: UserRole | undefined | null,
  permission: Permission
): { authorized: boolean; error?: string } {
  if (!userRole) {
    return { authorized: false, error: "인증이 필요합니다" };
  }

  if (!hasPermission(userRole, permission)) {
    return {
      authorized: false,
      error: `이 작업을 수행할 권한이 없습니다 (필요: ${permission})`,
    };
  }

  return { authorized: true };
}

/**
 * 역할 우선순위 (높을수록 상위 권한)
 */
export const ROLE_PRIORITY: Record<UserRole, number> = {
  SUPER_ADMIN: 100,
  ADMIN: 80,
  PARTNER_ADMIN: 70,
  OPERATOR: 60,
  VIEWER: 40,
};

/**
 * 상위 역할인지 확인
 */
export function isHigherOrEqualRole(
  userRole: UserRole | undefined | null,
  targetRole: UserRole
): boolean {
  if (!userRole) return false;
  return ROLE_PRIORITY[userRole] >= ROLE_PRIORITY[targetRole];
}
