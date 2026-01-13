# PRD v3.0 vs 현재 구현 갭 분석

> **작성일**: 2026-01-13
> **기준 문서**: PRD_42ment_ERP_v3.0 (챕터별 분리본)

---

## 1. 스키마 갭 분석

### 1.1 구현 완료 (28개 테이블)

| 그룹 | 모델 | PRD 테이블명 | 상태 |
|------|------|-------------|:----:|
| 기본 | `Tenant` | tenants | ✅ |
| 기본 | `User` | users | ✅ |
| 고객 | `Customer` | customers | ✅ |
| 매장 | `Store` | stores | ✅ |
| 상품 | `Product` | products | ✅ |
| 상품 | `Channel` | channels (=PRD의 상품) | ✅ |
| 상품 | `ChannelSheet` | product_sheets | ✅ |
| 견적 | `Quotation` | quotations | ✅ |
| 견적 | `QuotationItem` | quotation_items | ✅ |
| 주문 | `SalesOrder` | sales_orders | ✅ |
| 주문 | `SalesOrderItem` | sales_order_items | ✅ |
| 발주 | `PurchaseOrder` | purchase_orders | ✅ |
| 발주 | `PurchaseOrderItem` | purchase_order_items | ✅ |
| 발주 | `PurchaseOrderExport` | purchase_order_exports | ✅ |
| 명세 | `Statement` | statements (거래명세서) | ✅ |
| 명세 | `StatementItem` | statement_items | ✅ |
| 정산 | `Settlement` | settlements | ✅ |
| 정산 | `TaxInvoice` | tax_invoices | ✅ |
| 정산 | `TaxInvoiceItem` | tax_invoice_items | ✅ |
| 키워드 | `StoreKeyword` | store_keywords | ✅ |
| 키워드 | `KeywordRanking` | keyword_rankings | ✅ |
| 작업 | `WorkLog` | work_logs | ✅ |
| 작업 | `BusinessCheck` | business_status_logs | ✅ |
| 파트너 | `PartnerPrice` | product_prices | ✅ |
| 파트너 | `PartnerSettlement` | partner_settlements | ✅ |
| 알림 | `Notification` | notifications | ✅ |
| 알림 | `NotificationSetting` | notification_settings | ✅ |

### 1.2 Phase 1 완료 (2026-01-13)

| 그룹 | PRD 테이블명 | 용도 | 상태 |
|------|-------------|------|:----:|
| 정산 | `WorkStatement` | 작업 명세 (정산 기준 문서) | ✅ |
| 정산 | `WorkStatementItem` | 작업 명세 상세 | ✅ |
| 정산 | `SettlementLine` | 정산 라인 (명세 연결) | ✅ |
| 정산 | `PaymentRecord` | 입금 기록 | ✅ |

### 1.3 미구현 (Phase 2+)

| 그룹 | PRD 테이블명 | 용도 | 우선순위 |
|------|-------------|------|:--------:|
| 발주 | `purchase_order_receipts` | 수주(작업결과) 동기화 | P1 |
| 발주 | `receipt_syncs` | 동기화 이력 | P1 |
| 키워드 | `ranking_snapshots` | 일별 순위 스냅샷 | P2 |
| 키워드 | `keyword_monthly_stats` | 월별 집계 | P2 |
| 시스템 | `audit_logs` | 감사 로그 | P2 |
| 시스템 | `api_error_logs` | 외부 API 에러 로그 | P2 |
| 시스템 | `retry_queue` | 재시도 큐 | P2 |
| 시스템 | `job_locks` | 동시성 제어 | P2 |
| 시스템 | `data_retention_settings` | 데이터 보관 정책 | P3 |

---

## 2. API 갭 분석

### 2.1 구현 완료

| 모듈 | Endpoint | GET | POST | PUT | DELETE | 비고 |
|------|----------|:---:|:----:|:---:|:------:|------|
| 견적 | /api/quotations | ✅ | ✅ | ✅ | ✅ | |
| 견적 | /api/quotations/[id]/convert | - | ✅ | - | - | 주문 전환 |
| 주문 | /api/sales-orders | ✅ | ✅ | - | - | |
| 주문 | /api/sales-orders/[id] | ✅ | - | ✅ | ✅ | |
| 발주 | /api/purchase-orders | ✅ | ✅ | - | - | |
| 발주 | /api/purchase-orders/[id] | ✅ | - | ✅ | - | |
| 발주 | /api/purchase-orders/[id]/status | - | ✅ | - | - | 상태 변경 |
| 정산 | /api/settlements | ✅ | ✅ | - | - | |
| 세금 | /api/tax-invoices | ✅ | ✅ | - | - | |
| 시트 | /api/sheets/export | - | ✅ | - | - | 발주서 출력 |

### 2.2 Phase 1 완료 (2026-01-13)

| 모듈 | Endpoint | 용도 | 상태 |
|------|----------|------|:----:|
| 주문 | `/api/sales-orders/[id]/confirm` | 주문 확정 | ✅ |
| 주문 | `/api/sales-orders/[id]/cancel` | 주문 취소 | ✅ |
| 주문 | `/api/sales-orders/[id]/convert-to-po` | 발주 분리 생성 | ✅ |
| 발주 | `/api/purchase-orders/[id]/confirm` | 발주 확정 | ✅ |
| 발주 | `/api/purchase-orders/[id]/cancel` | 발주 취소 | ✅ |
| 발주 | `/api/purchase-orders/[id]/complete` | 작업 완료 | ✅ |
| 발주 | `/api/sheets/export` | 시트 출력 | ✅ |
| 명세 | `/api/work-statements` | CRUD | ✅ |
| 명세 | `/api/work-statements/[id]/confirm` | 명세 확정 | ✅ |

### 2.3 미구현 (Phase 2+)

| 모듈 | Endpoint | 용도 | 우선순위 |
|------|----------|------|:--------:|
| 수주 | `/api/receipts/sync` | 동기화 실행 | P1 |
| 수주 | `/api/receipts/unmatched` | 미매칭 목록 | P1 |
| 수주 | `/api/receipts/[id]/match` | 수동 매칭 | P1 |
| 명세 | `/api/work-statements/bulk` | 일괄 생성 | P1 |
| 정산 | `/api/settlements/[id]/complete` | 정산 완료 | P1 |
| 입금 | `/api/payments` | CRUD | P1 |
| 입금 | `/api/payments/match` | 자동 매칭 | P2 |

---

## 3. UI 페이지 갭 분석

### 3.1 구현 완료 (33개 페이지)

```
✅ /dashboard
✅ /customers, /customers/new, /customers/[id]
✅ /stores, /stores/new, /stores/[id]
✅ /channels, /channels/[id]
✅ /quotations, /quotations/new, /quotations/[id], /quotations/[id]/preview
✅ /sales-orders, /sales-orders/new, /sales-orders/[id]
✅ /purchase-orders, /purchase-orders/new, /purchase-orders/[id]
✅ /statements, /statements/new, /statements/[id], /statements/[id]/preview
✅ /settlements
✅ /tax-invoices, /tax-invoices/new
✅ /work-logs
✅ /keywords
✅ /tenants, /tenants/new
✅ /settings, /settings/barobill
```

### 3.2 Phase 1 완료 (2026-01-13)

| 페이지 | 상태 | 구현 내용 |
|--------|:----:|----------|
| `/work-statements` | ✅ | 목록 페이지 |
| `/work-statements/new` | ✅ | 등록 페이지 |
| `/work-statements/[id]` | ✅ | 상세 페이지 |
| `/sales-orders/[id]` | ✅ | 확정/취소/발주생성/완료 버튼 |
| `/purchase-orders/[id]` | ✅ | 확정/취소/시작/완료/명세등록/발주서출력 버튼 |

### 3.3 미구현 (Phase 2+)

| 페이지 | 상태 | 필요 작업 | 우선순위 |
|--------|:----:|----------|:--------:|
| `/payments` | ❌ | 입금 관리 페이지 | P1 |
| `/receipts` | ❌ | 수주 동기화 관리 | P1 |
| `/settlements` | ⚠️ | 명세 연결 UI 추가 | P1 |

---

## 4. 비즈니스 로직 갭

### 4.1 문서 상태 전이 (PRD 2.5절)

| 플로우 | 현재 구현 | PRD 정의 | 상태 |
|--------|----------|---------|:----:|
| 견적 취소 | ✅ | 연결된 주문 체크 필요 | 구현됨 |
| 주문 취소 | ✅ | 발주대기만 자동 취소 | 구현됨 |
| 발주 취소 | ✅ | 명세 확인 필요 | 구현됨 |
| 명세 확정 | ✅ | 정산 라인 자동 생성 | 구현됨 |

### 4.2 스냅샷 규칙 (PRD 2.6절)

| 시점 | 현재 구현 | 상태 |
|------|----------|:----:|
| 견적 생성 | ✅ unit_price 저장 | 완료 |
| 주문 생성 | ✅ unit_price 저장 | 완료 |
| 발주 확정 | ✅ unit_price 저장 | 완료 |
| 명세 확정 | ✅ unit_price_snapshot 저장 | 완료 |

### 4.3 동시성 제어 (PRD 20.5절)

| 상황 | 현재 구현 | 필요 작업 |
|------|----------|----------|
| 발주 동시 수정 | ❌ | version 컬럼 추가 |
| 정산 처리 중 | ❌ | 트랜잭션 락 추가 |
| 시트 동기화 | ❌ | job_locks 테이블 |

---

## 5. 구현 우선순위 로드맵

### Phase 1: 핵심 플로우 완성 (P0)

```
1. 스키마 추가
   - WorkStatement, WorkStatementItem

2. API 추가
   - 주문: confirm, cancel, convert-to-po
   - 발주: confirm, cancel, export
   - 명세: CRUD, confirm

3. UI 추가
   - /work-statements 페이지들
   - 기존 페이지에 버튼/연결 추가

4. 비즈니스 로직
   - 문서 상태 전이 규칙 구현
   - 명세 → 정산 자동 생성
```

### Phase 2: 정산/동기화 (P1)

```
1. 스키마 추가
   - SettlementLine
   - PaymentRecord
   - PurchaseOrderReceipt
   - ReceiptSync

2. API 추가
   - 수주 동기화
   - 입금 관리
   - 정산 완료 처리

3. UI 추가
   - /payments 페이지
   - /receipts 페이지
   - 정산 상세 UI 개선
```

### Phase 3: 시스템 안정화 (P2)

```
1. 스키마 추가
   - AuditLog
   - ApiErrorLog, RetryQueue
   - JobLock
   - RankingSnapshot, KeywordMonthlyStats

2. 기능 추가
   - 동시성 제어 (version 컬럼)
   - 에러 로깅 및 재시도
   - 데이터 아카이빙

3. 성능 최적화
   - 인덱스 최적화
   - 쿼리 최적화
```

### Phase 4: 고도화 (P3)

```
- 데이터 보관 정책 자동화
- 리포트/통계 고도화
- 모바일 반응형 개선
```

---

## 6. 작업 체크리스트

### Phase 1 체크리스트 (✅ 완료 - 2026-01-13)

- [x] `prisma/schema.prisma`에 WorkStatement, WorkStatementItem, SettlementLine, PaymentRecord 모델 추가
- [x] `/api/work-statements` API 생성 (CRUD + confirm)
- [x] `/api/sales-orders/[id]/confirm` API 생성
- [x] `/api/sales-orders/[id]/cancel` API 생성
- [x] `/api/sales-orders/[id]/convert-to-po` API 생성
- [x] `/api/purchase-orders/[id]/confirm` API 생성
- [x] `/api/purchase-orders/[id]/cancel` API 생성
- [x] `/api/purchase-orders/[id]/complete` API 생성
- [x] `/work-statements` 페이지 생성 (목록, 등록, 상세)
- [x] `/sales-orders/[id]` 페이지에 확정/취소/발주생성/완료 버튼 추가
- [x] `/purchase-orders/[id]` 페이지에 확정/취소/시작/완료/명세등록 버튼 추가

### Phase 2 체크리스트 (미완료)

- [ ] 수주 동기화 기능 (receipts)
- [ ] 입금 관리 기능 (/payments)
- [ ] 정산 완료 처리 연동

---

---

## 7. Expert Review 권장사항 반영 (2026-01-13)

### 7.1 스키마 추가 완료

| 모델 | 용도 | 상태 |
|------|------|:----:|
| `SheetImportLog` | Google Sheet Staging Table (Dirty -> Clean 패턴) | ✅ |
| `StatusHistory` | 상태 변경 이력 추적 (Universal Search 지원) | ✅ |
| `CostAdjustment` | Unbillable Cost 처리 (작업 완료, 고객 미지불) | ✅ |

### 7.2 필드 추가 완료

| 모델 | 필드 | 용도 | 상태 |
|------|------|------|:----:|
| `PurchaseOrderItem` | `proofUrl`, `proofNote` | Evidence-Based Billing | ✅ |
| `PurchaseOrderItem` | `isManualOverride`, `manualOverrideReason` | Manual Override | ✅ |
| `WorkStatementItem` | `proofUrl`, `proofNote` | Evidence-Based Billing | ✅ |
| `PurchaseOrder` | `isManualOverride`, `manualOverrideReason` | Manual Override | ✅ |
| `Settlement` | `billableAmount`, `unbillableAmount`, `adjustmentAmount`, `unbillableReason` | Unbillable Cost | ✅ |

### 7.3 남은 작업 (Phase 2+)

- [ ] SheetImportLog 처리 API (`/api/sheet-imports`)
- [ ] StatusHistory 자동 기록 로직 (상태 변경 시 Hook)
- [ ] CostAdjustment 관리 UI
- [ ] Universal Search 페이지

---

**다음 단계**: Phase 2 구현 또는 Phase 1 테스트/QA
