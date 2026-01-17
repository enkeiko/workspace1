# 42Ment ERP 전체 리팩토링 통합 실행 프롬프트

> **작성일**: 2026-01-17
> **실행 방식**: 단일 명령으로 Phase 1~4 전체 실행
> **예상 소요 시간**: 2~4시간 (Agent 자동 실행)
> **백업 필수**: 실행 전 반드시 데이터베이스 및 코드 백업

---

## 🚀 통합 실행 프롬프트

아래 프롬프트를 복사하여 **Claude Code Agent** 또는 **Task Tool을 사용하는 에이전트**에게 전달하세요.

---

```markdown
# 작업 요청: 42Ment ERP 전체 워크플로우 중심 리팩토링

## 프로젝트 정보
- **경로**: C:\Users\enkei\workspace\1-active-project\42Menterp_2026
- **앱 경로**: C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app
- **목표**: 광고대행사 워크플로우 중심 전면 재구축
- **방법**: Bottom-up Rebuild (데이터 → 컴포넌트 → 워크플로우 → 도메인)

## 사전 작업 (필수)

### 1. 백업 생성
```bash
# 현재 디렉토리로 이동
cd C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app

# 스키마 백업
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
Copy-Item prisma/schema.prisma "prisma/schema.backup.$timestamp.prisma"

# Git 백업 커밋
git add .
git commit -m "Backup before full rebuild - $timestamp"
git tag "backup-before-rebuild-$timestamp"
```

### 2. 의존성 확인 및 설치
```bash
# 필요한 패키지 설치
npm install @tanstack/react-table xlsx cmdk recharts
```

---

## Phase 1: Foundation Rebuild (기초 재구축)

### Task 1.1: Prisma 스키마 워크플로우 연결 강화

#### 목표
워크플로우 연결 및 광고업 도메인 필드 추가

#### 작업 내용

**파일**: `prisma/schema.prisma`

다음 변경사항을 적용하세요:

##### 1.1.1 워크플로우 연결 강화

**Quotation 모델**에 추가:
```prisma
model Quotation {
  // ... 기존 필드

  // 승인 시 자동 생성되는 주문
  salesOrder      SalesOrder?     @relation("QuotationToOrder")
}
```

**SalesOrder 모델**에 추가:
```prisma
model SalesOrder {
  // ... 기존 필드

  // 상위 문서: Quotation
  quotationId     String?         @unique
  quotation       Quotation?      @relation("QuotationToOrder", fields: [quotationId], references: [id])

  // 하위 문서: PurchaseOrders (상품별 분리)
  purchaseOrders  PurchaseOrder[] @relation("OrderToPurchase")

  @@index([quotationId])
}
```

**PurchaseOrder 모델**에 추가:
```prisma
model PurchaseOrder {
  // ... 기존 필드

  // 상위 문서: SalesOrder
  salesOrderId      String
  salesOrder        SalesOrder    @relation("OrderToPurchase", fields: [salesOrderId], references: [id])

  // 정산 연결
  workStatement     WorkStatement?

  @@index([salesOrderId])
}
```

##### 1.1.2 PurchaseOrderItem 광고업 필드 추가

```prisma
model PurchaseOrderItem {
  // ... 기존 필드

  // 🔑 키워드 (광고업 핵심)
  keyword         String          @default("")

  // 🎯 성과 목표
  goalType        GoalType        @default(FULL_PERIOD)
  targetRank      Int?
  currentRank     Int?

  // 📊 성과 측정
  successDays     Int             @default(0)
  failDays        Int             @default(0)

  // 💰 정산
  refundPerDay    Int?

  // 📸 증빙
  thumbnailUrl    String?

  @@index([keyword])
  @@fulltext([keyword, proofNote])
}

enum GoalType {
  RANKING       // 순위 보장형
  TRAFFIC       // 트래픽 보장형
  FULL_PERIOD   // 단순 기간제
}
```

##### 1.1.3 새 모델 추가

```prisma
// 캠페인 자동 연장
model CampaignRenewal {
  id                String          @id @default(cuid())
  originalOrderId   String
  originalOrder     PurchaseOrder   @relation("OriginalOrder", fields: [originalOrderId], references: [id])

  proposedStartDate DateTime
  proposedEndDate   DateTime
  proposedAmount    Int

  status            RenewalStatus   @default(PENDING)

  renewedOrderId    String?         @unique
  renewedOrder      PurchaseOrder?  @relation("RenewedOrder", fields: [renewedOrderId], references: [id])

  expiryNotifiedAt  DateTime?
  acceptedAt        DateTime?
  acceptedById      String?
  acceptedBy        User?           @relation(fields: [acceptedById], references: [id])

  createdAt         DateTime        @default(now())

  @@index([originalOrderId])
  @@index([status])
}

enum RenewalStatus {
  PENDING
  ACCEPTED
  DECLINED
  EXPIRED
}

// 성과 기반 정산 규칙
model BillingRule {
  id                String          @id @default(cuid())
  productId         String
  product           Product         @relation(fields: [productId], references: [id])

  ruleType          BillingRuleType
  targetRank        Int?
  minCompletionRate Float?

  refundType        RefundType      @default(DAILY_PRORATED)
  refundRate        Float           @default(1.0)

  effectiveFrom     DateTime        @default(now())
  effectiveTo       DateTime?
  isActive          Boolean         @default(true)

  createdAt         DateTime        @default(now())

  @@index([productId])
}

enum BillingRuleType {
  RANK_GUARANTEE
  COMPLETION_BASED
  HYBRID
}

enum RefundType {
  DAILY_PRORATED
  FULL_REFUND
  NO_REFUND
}

// 고객 공개 리포트
model ClientReport {
  id              String      @id @default(cuid())
  secretToken     String      @unique @default(cuid())

  salesOrderId    String
  salesOrder      SalesOrder  @relation(fields: [salesOrderId], references: [id])

  title           String
  description     String?
  showPricing     Boolean     @default(false)
  expiresAt       DateTime?

  viewCount       Int         @default(0)
  lastViewedAt    DateTime?

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([secretToken])
}

// 순위 스냅샷
model RankingSnapshot {
  id              String          @id @default(cuid())
  storeKeywordId  String
  storeKeyword    StoreKeyword    @relation(fields: [storeKeywordId], references: [id])

  ranking         Int
  checkDate       DateTime
  checkTime       String          @default("00:00")

  screenshotUrl   String?
  pageUrl         String?
  searchEngine    String          @default("NAVER")
  device          String          @default("MOBILE")

  createdAt       DateTime        @default(now())

  @@index([storeKeywordId, checkDate])
  @@index([checkDate])
}

// 워크플로우 활동 로그
model WorkflowActivity {
  id          String   @id @default(cuid())
  type        String
  message     String
  metadata    Json?
  severity    String   @default("info")
  createdAt   DateTime @default(now())

  @@index([createdAt])
}
```

##### 1.1.4 Settlement 소급분 필드 추가

```prisma
model Settlement {
  // ... 기존 필드

  // 소급분 표시
  isRetroactive     Boolean         @default(false)
  originalMonth     String?
  adjustmentNote    String?

  @@index([isRetroactive])
  @@index([originalMonth])
}
```

#### Migration 실행
```bash
npx prisma migrate dev --name full_workflow_rebuild
npx prisma generate
```

---

### Task 1.2: DataTableV2 공통 컴포넌트 구현

#### 파일 1: `src/components/common/data-table-v2.tsx`

Excel 업로드/다운로드, Bulk Actions, 검색, 페이지네이션이 모두 포함된 재사용 가능한 DataTable 컴포넌트를 구현하세요.

**필수 기능**:
- ✅ TanStack Table 기반
- ✅ Row Selection (체크박스)
- ✅ Global Search
- ✅ Sorting
- ✅ Pagination
- ✅ Excel 다운로드/업로드/템플릿 버튼
- ✅ Bulk Actions 드롭다운
- ✅ 신규 등록 버튼

**Props 인터페이스**:
```typescript
interface DataTableV2Props<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  enableExcel?: boolean;
  onExcelDownload?: () => Promise<void>;
  onExcelUpload?: (file: File) => Promise<void>;
  onTemplateDownload?: () => Promise<void>;
  enableBulkActions?: boolean;
  bulkActions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: (selectedRows: TData[]) => void;
    variant?: 'default' | 'destructive';
  }>;
  searchPlaceholder?: string;
  onNewClick?: () => void;
  newButtonLabel?: string;
}
```

#### 파일 2: `src/lib/excel-utils.ts`

Excel 처리 유틸리티 함수 3개를 구현하세요:

```typescript
export async function downloadExcelTemplate(
  filename: string,
  columns: { header: string; key: string }[]
): Promise<void>

export async function downloadExcelData<T>(
  filename: string,
  data: T[],
  columns: { header: string; key: keyof T }[]
): Promise<void>

export async function parseExcelFile<T>(
  file: File,
  columnMapping: Record<string, keyof T>
): Promise<T[]>
```

---

### Task 1.3: Products 페이지 404 오류 수정

#### 파일 1: `src/app/(dashboard)/products/new/page.tsx`
상품 신규 등록 폼 페이지 생성

#### 파일 2: `src/app/(dashboard)/products/[id]/page.tsx`
상품 상세/수정 페이지 생성

#### 파일 3: `src/app/(dashboard)/products/page.tsx`
DataTableV2를 사용하여 리팩토링

#### API 엔드포인트 구현:
- `src/app/api/products/bulk/route.ts` - POST (Excel 업로드), DELETE (일괄 삭제)
- `src/app/api/products/template/route.ts` - GET (템플릿 다운로드)
- `src/app/api/products/export/route.ts` - GET (데이터 다운로드)

---

### Task 1.4: 전체 페이지 표준화

다음 페이지들을 DataTableV2 기반으로 리팩토링하세요:

#### 1. Stores (매장 관리)
- 파일: `src/app/(dashboard)/stores/page.tsx`
- API: `/api/stores/template`, `/api/stores/export`, `/api/stores/bulk` (DELETE)

#### 2. Settlements (정산 관리)
- 파일: `src/app/(dashboard)/settlements/page.tsx`
- API: `/api/settlements/export`, `/api/settlements/template`, `/api/settlements/bulk` (PATCH)
- 특수 기능: 소급분 필터 토글, 재계산 버튼

#### 3. Accounts (계정 관리)
- 파일: `src/app/(dashboard)/accounts/page.tsx`
- API: `/api/users/export`, `/api/users/template`, `/api/users/bulk` (PATCH)

---

## Phase 2: Core Workflow Implementation

### Task 2.1: 워크플로우 자동화 API 구현

#### API 1: 견적 승인 → 주문 자동 생성
**파일**: `src/app/api/quotations/[id]/accept/route.ts`

```typescript
// POST /api/quotations/{id}/accept
// 1. Quotation 상태 → ACCEPTED
// 2. SalesOrder 자동 생성 (quotationId 연결)
// 3. Items 복사
// Transaction 사용
```

#### API 2: 주문 확정 → 발주서 분리 생성
**파일**: `src/app/api/sales-orders/[id]/confirm/route.ts`

```typescript
// POST /api/sales-orders/{id}/confirm
// 1. SalesOrder 상태 → PROCESSING
// 2. Items를 Product별로 그룹핑
// 3. 각 그룹마다 PurchaseOrder 생성
// Transaction 사용
```

#### API 3: 발주 완료 → 명세서 생성
**파일**: `src/app/api/purchase-orders/[id]/complete/route.ts`

```typescript
// POST /api/purchase-orders/{id}/complete
// 1. PurchaseOrder 상태 → COMPLETED
// 2. WorkStatement 자동 생성
// Transaction 사용
```

#### API 4: 명세서 승인 → 정산 생성
**파일**: `src/app/api/work-statements/[id]/approve/route.ts`

```typescript
// POST /api/work-statements/{id}/approve
// 1. WorkStatement 상태 → CONFIRMED
// 2. Settlement 자동 생성
// Transaction 사용
```

---

### Task 2.2: 구글 시트 양방향 연동

#### API 1: 발주서 → 시트 Export
**파일**: `src/app/api/purchase-orders/[id]/export-to-sheet/route.ts`

Google Sheets API 사용하여 발주 항목을 시트에 추가

#### API 2: 시트 → 작업 결과 Import (Cron)
**파일**: `src/app/api/cron/import-sheet-receipts/route.ts`

시트에서 작업URL이 입력된 행을 읽어 proofUrl 업데이트

#### 유틸리티
**파일**: `src/lib/google-sheets-utils.ts`

```typescript
export async function appendToSheet(...)
export async function readFromSheet(...)
```

---

### Task 2.3: 워크플로우 대시보드

#### 대시보드 페이지
**파일**: `src/app/(dashboard)/workflow/page.tsx`

5단계 카드 표시:
- 견적 대기
- 주문 확정
- 발주 진행
- 명세서 대기
- 정산 대기

최근 활동 타임라인 표시

#### 대시보드 API
**파일**: `src/app/api/dashboard/workflow/route.ts`

각 단계별 통계 반환

#### 활동 로깅 유틸리티
**파일**: `src/lib/workflow-logger.ts`

```typescript
export async function logWorkflowActivity(
  type: string,
  message: string,
  metadata?: any,
  severity?: 'info' | 'warning' | 'error'
): Promise<void>
```

기존 워크플로우 API에 로깅 추가

---

## Phase 3: Domain-Specific Features

### Task 3.1: 키워드 중심 통합 검색

#### Universal Search API
**파일**: `src/app/api/search/universal/route.ts`

병렬로 검색:
1. 캠페인 (PurchaseOrderItem) - 키워드 그룹핑
2. 매장 (Store)
3. 키워드 (StoreKeyword)
4. 주문 (PurchaseOrder)

#### Command Palette (⌘K)
**파일**: `src/components/common/command-palette.tsx`

- cmdk 라이브러리 사용
- Cmd/Ctrl + K로 열기
- 실시간 검색
- 빠른 액션 메뉴

#### 검색 결과 UI
**파일**: `src/components/search/universal-search-results.tsx`

키워드 그룹 카드 표시

#### 헤더 검색 버튼
**파일**: `src/components/layout/header.tsx`

검색 버튼 추가

---

### Task 3.2: 캠페인 자동 연장

#### Cron: 만료 감지
**파일**: `src/app/api/cron/renewal-proposals/route.ts`

3일 내 만료 예정 발주서 찾아 CampaignRenewal 생성

#### API: 연장 수락
**파일**: `src/app/api/renewals/accept/route.ts`

원본 발주 복제하여 새 발주 생성

#### UI: 연장 카드
**파일**: `src/components/renewal/renewal-card.tsx`

D-Day 색상 코딩, 원클릭 연장 버튼

#### 페이지: 연장 목록
**파일**: `src/app/(dashboard)/renewals/page.tsx`

---

### Task 3.3: 성과 기반 정산

#### Cron: 순위 체크 (시뮬레이션)
**파일**: `src/app/api/cron/ranking-check/route.ts`

랜덤 순위 생성하여 KeywordRanking 저장

#### 서비스: 정산 계산
**파일**: `src/services/billing-calculator.service.ts`

```typescript
export class BillingCalculatorService {
  async calculatePerformanceBilling(...)
  async executeMonthlySettlement(month: string)
}
```

#### API: 월간 정산 실행
**파일**: `src/app/api/settlements/calculate-monthly/route.ts`

#### 대시보드: 수익성 분석
**파일**: `src/app/(dashboard)/analytics/profitability/page.tsx`

KPI 카드, Waterfall Chart, 상품별 마진 테이블

#### API: 수익성 데이터
**파일**: `src/app/api/analytics/profitability/route.ts`

---

### Task 3.4: 고객 공개 리포트

#### API: 리포트 생성
**파일**: `src/app/api/reports/create/route.ts`

ClientReport 생성, secretToken 발급

#### 공개 페이지
**파일**: `src/app/reports/[token]/page.tsx`

- 로그인 불필요
- 키워드별 성과 표시
- 순위 그래프
- 증빙 썸네일

#### 컴포넌트: 순위 그래프
**파일**: `src/components/reports/ranking-chart.tsx`

Recharts 사용

#### 관리 페이지
**파일**: `src/app/(dashboard)/reports/page.tsx`

생성된 리포트 목록, URL 복사

---

## Phase 4: Operation Optimization

### Task 4.1: 레거시 데이터 마이그레이션

#### API: 레거시 임포트
**파일**: `src/app/api/legacy/import-settlement/route.ts`

Excel 업로드 → Settlement 직접 생성 (isRetroactive = true)

#### API: 정산 재계산
**파일**: `src/app/api/settlements/recalculate/route.ts`

기존 정산과 실제 데이터 비교, 차액 조정

#### UI: 레거시 임포트
**파일**: `src/app/(dashboard)/legacy/import/page.tsx`

#### 컴포넌트: 재계산 버튼
**파일**: `src/components/settlement/recalculation-button.tsx`

---

### Task 4.2: 최종 테스트 및 최적화

#### E2E 테스트 시나리오 실행
1. 견적 생성 → 승인 → 주문 생성 확인
2. 주문 확정 → 발주 분리 확인
3. 시트 Export → Import → proofUrl 업데이트 확인
4. 명세서 생성 → 정산 생성 확인
5. 성과 계산 → 차감 확인

#### 성능 최적화
- Database Index 확인
- React Query 캐싱 설정 (`src/lib/react-query.ts`)
- Server-side Pagination 적용

#### 문서화
- API 문서 생성: `docs/API_REFERENCE.md`
- 사용자 가이드: `docs/USER_GUIDE.md`

---

## 완료 조건 체크리스트

### Phase 1: Foundation
- [ ] Prisma 스키마 업데이트 완료
- [ ] Migration 성공
- [ ] DataTableV2 컴포넌트 구현
- [ ] Excel 유틸리티 구현
- [ ] Products 404 수정
- [ ] 모든 페이지 표준화 (Stores, Settlements, Accounts)

### Phase 2: Core Workflow
- [ ] 4개 워크플로우 API 구현
- [ ] 구글 시트 Export/Import 구현
- [ ] 워크플로우 대시보드 구현
- [ ] 활동 로깅 적용

### Phase 3: Domain Features
- [ ] Universal Search API 구현
- [ ] Command Palette (⌘K) 구현
- [ ] 캠페인 자동 연장 구현
- [ ] 성과 기반 정산 구현
- [ ] 고객 공개 리포트 구현

### Phase 4: Optimization
- [ ] 레거시 임포트 구현
- [ ] 정산 재계산 구현
- [ ] E2E 테스트 통과
- [ ] 성능 최적화 완료
- [ ] 문서 작성 완료

### 최종 검증
- [ ] 모든 페이지 404 에러 없음
- [ ] TypeScript 에러 없음
- [ ] Build 성공
- [ ] 모든 API 정상 응답

---

## 에러 발생 시

에러가 발생하면:
1. 전체 에러 메시지 캡처
2. 해당 파일 및 라인 확인
3. 스키마 관련 에러면 Migration 재실행
4. 의존성 에러면 npm install 재실행
5. 계속 진행 가능하면 다음 Task로 이동

---

## 최종 커밋

모든 작업 완료 후:
```bash
git add .
git commit -m "feat: Complete workflow-centric rebuild

- Phase 1: Foundation (Schema, Components, Pages)
- Phase 2: Core Workflow (APIs, Sheets, Dashboard)
- Phase 3: Domain Features (Search, Renewal, Billing, Reports)
- Phase 4: Optimization (Legacy, Testing)

All CRUD pages standardized with DataTableV2
End-to-end workflow automation implemented
Domain-specific features for ad agency business"

git tag "rebuild-complete-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
```

---

## 작업 시작

위 내용을 순서대로 실행하세요. 각 Task는 독립적으로 실행 가능하지만, 순서를 지켜야 의존성 문제가 없습니다.

**예상 소요 시간**: 2~4시간 (자동 실행)

작업을 시작하겠습니다.
```

---

## 🎯 에이전트 실행 방법

### 방법 1: Claude Code CLI (권장)

터미널에서:
```bash
# 1. 프롬프트 파일 생성
cd C:\Users\enkei\workspace\1-active-project\42Menterp_2026
notepad rebuild-prompt.txt

# 2. 위의 통합 프롬프트 복사하여 붙여넣기 및 저장

# 3. Claude에게 전달
# (Claude Code CLI를 열고 파일 내용을 복사-붙여넣기)
```

### 방법 2: Task Tool 사용

현재 대화에서:
```
Task tool을 사용하여 general-purpose 에이전트 실행:

프롬프트: [위의 통합 프롬프트 전체 복사]
run_in_background: true
```

### 방법 3: 별도 Agent 세션

1. 새 Claude 대화 세션 열기
2. 위의 통합 프롬프트 전체 복사
3. 붙여넣기 후 실행
4. 진행 상황 모니터링

---

## ⏱️ 예상 소요 시간

- **Phase 1**: 30~45분 (스키마 + 컴포넌트 + 페이지)
- **Phase 2**: 45~60분 (워크플로우 API + 시트 연동)
- **Phase 3**: 60~90분 (검색 + 연장 + 정산 + 리포트)
- **Phase 4**: 30~45분 (레거시 + 테스트)

**총 예상 시간**: 2시간 30분 ~ 4시간

---

## 🚨 주의사항

### 실행 전 필수
1. ✅ 데이터베이스 백업
2. ✅ Git 백업 커밋 생성
3. ✅ 개발 환경에서만 실행

### 모니터링
- 에러 발생 시 자동으로 다음 Task 진행
- 치명적 에러 시 중단될 수 있음
- 로그를 주기적으로 확인

### 복구 방법
에러로 중단된 경우:
```bash
# Git으로 되돌리기
git reset --hard backup-before-rebuild-{timestamp}

# 또는 특정 커밋으로
git log --oneline
git reset --hard {commit-hash}
```

---

이제 **위의 통합 프롬프트를 복사**하여 실행하시면 됩니다!
