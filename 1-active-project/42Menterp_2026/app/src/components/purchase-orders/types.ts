/**
 * 주간 발주 그리드 타입 정의
 */

// 그리드 셀 데이터
export interface GridCellData {
  qty: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isManualOverride: boolean;
  status: GridCellStatus;
  linkedSalesOrderItemId?: string;
  linkedPurchaseOrderItemId?: string;
  note?: string;
}

export type GridCellStatus =
  | "EMPTY"
  | "PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

// 매장 행 데이터
export interface GridStoreRow {
  storeId: string;
  storeName: string;
  storeMid: string;
  customerId?: string;
  customerName?: string;
  cells: Record<string, GridCellData>; // productCode -> cellData
  rowStatus: GridRowStatus;
}

export type GridRowStatus = "UNCHANGED" | "MODIFIED" | "NEW" | "DELETED";

// 상품 컬럼 정의
export interface GridProductColumn {
  productId: string;
  productCode: string;
  productName: string;
  productType: string;
  saleUnitPrice: number;
  costUnitPrice: number;
}

// 그리드 전체 데이터
export interface WeeklyGridData {
  weekKey: string; // "2026-W02"
  startDate: string;
  endDate: string;
  stores: GridStoreRow[];
  products: GridProductColumn[];
  globalDateRange: {
    startDate: string;
    endDate: string;
  };
}

// 그리드 저장 요청
export interface GridSaveRequest {
  weekKey: string;
  rows: {
    storeId: string;
    cells: {
      productCode: string;
      qty: number;
      startDate: string;
      endDate: string;
    }[];
  }[];
  createSalesOrder: boolean;
  createPurchaseOrder: boolean;
}

// 그리드 저장 응답
export interface GridSaveResponse {
  success: boolean;
  summary: {
    salesOrdersCreated: number;
    purchaseOrdersCreated: number;
    itemsCreated: number;
    itemsUpdated: number;
    itemsSkipped: number;
  };
  errors?: {
    storeId: string;
    productCode: string;
    error: string;
  }[];
}

// 그리드 로드 요청
export interface GridLoadRequest {
  weekKey: string;
  productTypes?: string[]; // 특정 상품 유형만 로드
}

// 빈 셀 생성 헬퍼
export function createEmptyCell(startDate: string, endDate: string): GridCellData {
  return {
    qty: 0,
    startDate,
    endDate,
    isManualOverride: false,
    status: "EMPTY",
  };
}

// 셀 상태별 색상
export const cellStatusColors: Record<GridCellStatus, string> = {
  EMPTY: "bg-background",
  PENDING: "bg-yellow-50 border-yellow-200",
  CONFIRMED: "bg-blue-50 border-blue-200",
  IN_PROGRESS: "bg-purple-50 border-purple-200",
  COMPLETED: "bg-green-50 border-green-200",
  CANCELLED: "bg-gray-100 border-gray-300 opacity-50",
};

// 상태 한글 라벨
export const cellStatusLabels: Record<GridCellStatus, string> = {
  EMPTY: "-",
  PENDING: "대기",
  CONFIRMED: "확정",
  IN_PROGRESS: "진행",
  COMPLETED: "완료",
  CANCELLED: "취소",
};
