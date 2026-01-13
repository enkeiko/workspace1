# 구현 보고서 #002 - Expert Review 반영

> **작성일:** 2026-01-13
> **작업자:** Claude Code (Opus 4.5)

---

## 1. 작업 개요

PRD v3.0의 Expert Review 권장사항을 반영하여 다음 패턴들을 구현했습니다:
- Google Sheet Staging Table 패턴
- StatusHistory 상태 이력 추적
- Unbillable Cost 처리
- Evidence-Based Billing

---

## 2. 스키마 변경사항

### 2.1 새로운 모델 추가

```prisma
// Google Sheet Staging Table
model SheetImportLog {
  id                     String         @id @default(cuid())
  channelSheetId         String
  channelSheet           ChannelSheet   @relation(...)
  rawData                Json
  rowNumber              Int?
  status                 ImportStatus   @default(PENDING)
  validationErrors       Json?
  matchedPurchaseOrderId String?
  matchedPurchaseOrder   PurchaseOrder? @relation(...)
  processedAt            DateTime?
  processedById          String?
  createdAt              DateTime       @default(now())
  updatedAt              DateTime       @updatedAt
}

// 상태 변경 이력 추적
model StatusHistory {
  id               String     @id @default(cuid())
  entityType       EntityType
  entityId         String
  fromStatus       String?
  toStatus         String
  reason           String?
  isManualOverride Boolean    @default(false)
  changedById      String?
  changedBy        User?      @relation(...)
  changedAt        DateTime   @default(now())
}

// Unbillable 비용 조정
model CostAdjustment {
  id              String           @id @default(cuid())
  purchaseOrderId String?
  workStatementId String?
  adjustmentType  AdjustmentType
  amount          Int
  reason          String
  status          AdjustmentStatus @default(PENDING)
  approvedById    String?
  approvedAt      DateTime?
  createdById     String
  createdAt       DateTime         @default(now())
}
```

### 2.2 Enum 추가/수정

```prisma
enum ImportStatus {
  PENDING
  VALIDATED
  FAILED
  PROCESSED
}

enum EntityType {
  QUOTATION
  SALES_ORDER
  PURCHASE_ORDER
  WORK_STATEMENT
  SETTLEMENT
  TAX_INVOICE
}

enum AdjustmentType {
  UNBILLABLE
  DISCOUNT
  SURCHARGE
  CORRECTION
}

enum WorkType {
  // 기존 값들...
  SALES_ORDER_CANCELLED    // 추가
  PURCHASE_ORDER_CANCELLED // 추가
  CHANNEL_REPORT           // 추가
  SHEET_IMPORT             // 추가
}

enum SheetType {
  ORDER
  RECEIPT
  WORK_REPORT    // 추가
  SETTLEMENT     // 추가
  KEYWORD_RANK   // 추가
}
```

### 2.3 기존 모델 필드 추가

| 모델 | 추가 필드 | 설명 |
|------|-----------|------|
| PurchaseOrder | isManualOverride, manualOverrideReason | Manual Override 원칙 |
| PurchaseOrderItem | isManualOverride, proofUrl, proofNote | Evidence-Based Billing |
| WorkStatementItem | proofUrl, proofNote | Evidence-Based Billing |
| Settlement | isUnbillable, unbillableAmount, unbillableReason | Unbillable 처리 |
| WorkLog | proofUrl, metadata | 증빙 및 메타데이터 |

---

## 3. 새로운 API 엔드포인트

### 3.1 SheetImportLog API

| 엔드포인트 | 메서드 | 설명 |
|------------|--------|------|
| `/api/sheet-imports` | GET | 임포트 로그 목록 조회 |
| `/api/sheet-imports` | POST | 새 임포트 로그 생성 (Raw 데이터 저장) |
| `/api/sheet-imports/[id]/validate` | POST | 데이터 검증 (PENDING → VALIDATED/FAILED) |
| `/api/sheet-imports/[id]/process` | POST | Core DB 반영 (VALIDATED → PROCESSED) |
| `/api/sheet-imports/batch-process` | POST | 일괄 처리 |

### 3.2 StatusHistory API

| 엔드포인트 | 메서드 | 설명 |
|------------|--------|------|
| `/api/status-history` | GET | 상태 이력 조회 (필터링 지원) |
| `/api/status-history/[entityType]/[entityId]` | GET | 특정 엔티티 타임라인 |

### 3.3 Universal Search API

| 엔드포인트 | 메서드 | 설명 |
|------------|--------|------|
| `/api/search?q=검색어` | GET | 통합 검색 (고객사, 매장, 견적, 수주, 발주, 정산) |

---

## 4. 유틸리티 함수

### 4.1 status-history.ts

```typescript
// src/lib/status-history.ts

// 상태 변경 기록
export async function recordStatusChange({
  entityType,
  entityId,
  fromStatus,
  toStatus,
  reason,
  isManualOverride,
  changedById,
}: StatusChangeParams)

// 상태 이력 조회
export async function getStatusHistory(entityType: EntityType, entityId: string)

// 최근 상태 변경 조회
export async function getRecentStatusChanges(limit?: number)

// 엔티티 상세 정보 조회
export async function getEntityDetails(entityType: EntityType, entityId: string)
```

---

## 5. StatusHistory 적용된 API

다음 API들에 상태 변경 시 자동으로 StatusHistory가 기록됩니다:

| API | 상태 전이 |
|-----|-----------|
| `POST /api/sales-orders/[id]/confirm` | DRAFT → CONFIRMED |
| `POST /api/sales-orders/[id]/cancel` | * → CANCELLED |
| `POST /api/purchase-orders/[id]/confirm` | PENDING → CONFIRMED |
| `POST /api/purchase-orders/[id]/cancel` | * → CANCELLED |
| `POST /api/purchase-orders/[id]/complete` | IN_PROGRESS → COMPLETED |
| `POST /api/work-statements/[id]/confirm` | DRAFT → CONFIRMED |

---

## 6. 파일 변경 목록

### 6.1 신규 생성

```
app/src/lib/status-history.ts
app/src/app/api/sheet-imports/route.ts
app/src/app/api/sheet-imports/[id]/validate/route.ts
app/src/app/api/sheet-imports/[id]/process/route.ts
app/src/app/api/sheet-imports/batch-process/route.ts
app/src/app/api/status-history/route.ts
app/src/app/api/status-history/[entityType]/[entityId]/route.ts
app/src/app/api/search/route.ts
docs/progress/IMPLEMENTATION_REPORT_002.md
```

### 6.2 수정

```
app/prisma/schema.prisma
app/src/app/api/sales-orders/[id]/confirm/route.ts
app/src/app/api/sales-orders/[id]/cancel/route.ts
app/src/app/api/purchase-orders/[id]/confirm/route.ts
app/src/app/api/purchase-orders/[id]/cancel/route.ts
app/src/app/api/purchase-orders/[id]/complete/route.ts
app/src/app/api/work-statements/[id]/confirm/route.ts
docs/progress/CONTEXT_SUMMARY.md
```

---

## 7. 검증 결과

- TypeScript 빌드: ✅ 통과 (`npx tsc --noEmit`)
- Prisma 스키마 동기화: ✅ 완료 (`npx prisma db push`)
- Prisma Client 생성: ✅ 완료 (`npx prisma generate`)

---

## 8. 다음 단계 (Phase 2)

1. 대시보드 KPI 위젯 구현
2. 매장 관리 UI 개선 (엑셀 일괄 등록)
3. 발주 관리 UI (상태 필터, 일괄 처리)
4. 정산 보고서 PDF 생성
5. 텔레그램 알림 연동

---

## 9. 참고 문서

- PRD v3.0: `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\PRD_42ment_ERP_v3.0.md`
- Expert Review: `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\docs\PRD_v3.0\expert_review.md`
- Context Summary: `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\docs\progress\CONTEXT_SUMMARY.md`
