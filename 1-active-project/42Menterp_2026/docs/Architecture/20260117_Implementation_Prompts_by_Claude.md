# 42Ment ERP 전체 리팩토링 실행 프롬프트

> **작성일**: 2026-01-17
> **목적**: 워크플로우 중심 재개편을 단계별로 실행하기 위한 Agent 프롬프트 모음
> **사용법**: 각 프롬프트를 순차적으로 Claude에게 전달하여 실행

---

## 🚀 사용 방법

### 실행 순서
1. **프롬프트 복사**: 아래 프롬프트를 순서대로 복사
2. **Claude에게 전달**: 새 대화 세션에서 프롬프트 붙여넣기
3. **검토 및 확인**: 작업 완료 후 결과 확인
4. **다음 단계**: 이전 단계 성공 후 다음 프롬프트 실행

### 주의사항
- ⚠️ 각 단계는 이전 단계가 완료된 후 실행하세요
- ⚠️ 데이터베이스 백업은 필수입니다
- ⚠️ Git commit을 각 단계마다 만드세요

---

## Phase 1: Foundation Rebuild

### Prompt 1-1: 데이터베이스 스키마 리팩토링

```
# 작업 요청: 데이터베이스 스키마 워크플로우 연결 강화

## 목표
42Ment ERP의 Prisma 스키마를 광고대행사 워크플로우 중심으로 전면 재구축합니다.

## 현재 위치
프로젝트 경로: C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app

## 작업 내용

### 1. 기존 스키마 백업
```bash
cd C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app
cp prisma/schema.prisma prisma/schema.backup.$(Get-Date -Format "yyyyMMdd").prisma
```

### 2. 스키마 업데이트
다음 내용을 반영하여 prisma/schema.prisma를 수정하세요:

#### 2.1 워크플로우 연결 강화
- Quotation 모델: salesOrder 관계 추가 (1:1)
- SalesOrder 모델: quotation, purchaseOrders 관계 추가
- PurchaseOrder 모델: salesOrder 관계 추가 (Many:1)

#### 2.2 광고업 도메인 필드 추가
PurchaseOrderItem에 다음 필드 추가:
- keyword: String (기본값 "")
- goalType: GoalType enum (RANKING, TRAFFIC, FULL_PERIOD)
- targetRank: Int? (목표 순위)
- currentRank: Int? (현재 순위)
- successDays: Int (달성일 수)
- failDays: Int (실패일 수)
- refundPerDay: Int? (일일 차감액)
- thumbnailUrl: String? (증빙 썸네일)

인덱스 추가:
- @@index([keyword])
- @@fulltext([keyword, proofNote])

#### 2.3 새 모델 추가

**CampaignRenewal** (캠페인 자동 연장):
- id, originalOrderId, proposedStartDate, proposedEndDate, proposedAmount
- status: RenewalStatus (PENDING, ACCEPTED, DECLINED, EXPIRED)
- renewedOrderId, expiryNotifiedAt, acceptedAt, acceptedById

**BillingRule** (성과 기반 정산 규칙):
- id, productId, ruleType, targetRank, minCompletionRate
- refundType, refundRate, effectiveFrom, effectiveTo, isActive

**ClientReport** (고객 공개 리포트):
- id, secretToken, salesOrderId, title, description
- showPricing, expiresAt, viewCount, lastViewedAt

**RankingSnapshot** (순위 아카이빙):
- id, storeKeywordId, ranking, checkDate, checkTime
- screenshotUrl, pageUrl, searchEngine, device

#### 2.4 Settlement 모델 확장
다음 필드 추가:
- isRetroactive: Boolean (소급분 여부)
- originalMonth: String? (원래 귀속 월)
- adjustmentNote: String? (조정 메모)

인덱스 추가:
- @@index([isRetroactive])
- @@index([originalMonth])

#### 2.5 WorkStatement 모델 확장
- purchaseOrder 관계를 1:1로 변경
- settlement 관계 추가

### 3. Migration 실행
```bash
npx prisma migrate dev --name workflow_rebuild_phase1_schema
npx prisma generate
```

### 4. 검증
- Migration이 성공적으로 적용되었는지 확인
- Prisma Client가 정상 생성되었는지 확인
- 기존 데이터가 손상되지 않았는지 확인

## 주의사항
- 기존 데이터와의 호환성을 유지하세요
- 필수 필드에는 기본값을 설정하세요
- Foreign Key 제약조건을 확인하세요

## 완료 조건
- [ ] 스키마 파일 백업 완료
- [ ] 모든 모델 및 필드 추가 완료
- [ ] Migration 성공
- [ ] Prisma Client 생성 완료
- [ ] 타입 에러 없음

작업을 시작해주세요.
```

---

### Prompt 1-2: 공통 컴포넌트 구현 (DataTableV2)

```
# 작업 요청: 표준화된 DataTable 공통 컴포넌트 구현

## 목표
모든 CRUD 페이지에서 재사용 가능한 DataTable 컴포넌트를 구현합니다.

## 현재 위치
프로젝트 경로: C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app

## 작업 내용

### 1. DataTableV2 컴포넌트 생성
파일: src/components/common/data-table-v2.tsx

#### 필수 기능
- ✅ 체크박스 선택 (row selection)
- ✅ 정렬 (sorting)
- ✅ 필터링 (global search)
- ✅ 페이지네이션
- ✅ Excel 다운로드/업로드 버튼
- ✅ 템플릿 다운로드 버튼
- ✅ Bulk Actions 드롭다운
- ✅ 신규 등록 버튼

#### Props 인터페이스
```typescript
interface DataTableV2Props<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];

  // Excel 기능
  enableExcel?: boolean;
  onExcelDownload?: () => Promise<void>;
  onExcelUpload?: (file: File) => Promise<void>;
  onTemplateDownload?: () => Promise<void>;

  // Bulk Actions
  enableBulkActions?: boolean;
  bulkActions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: (selectedRows: TData[]) => void;
    variant?: 'default' | 'destructive';
  }>;

  // 필터
  searchPlaceholder?: string;
  searchColumn?: string;

  // 신규 등록
  onNewClick?: () => void;
  newButtonLabel?: string;
}
```

#### UI 구성
```
┌─────────────────────────────────────────────────────┐
│ [검색창]              [Bulk] [템플릿] [업로드] [다운] [추가] │
├─────────────────────────────────────────────────────┤
│ [□] 컬럼1    컬럼2    컬럼3    컬럼4    컬럼5        │
│ [□] 데이터   데이터   데이터   데이터   데이터       │
│ [□] 데이터   데이터   데이터   데이터   데이터       │
├─────────────────────────────────────────────────────┤
│                              [이전] [다음]           │
└─────────────────────────────────────────────────────┘
```

### 2. Excel 유틸리티 함수 생성
파일: src/lib/excel-utils.ts

#### 함수 목록
1. `downloadExcelTemplate()` - 템플릿 다운로드
2. `downloadExcelData()` - 데이터 엑셀 다운로드
3. `parseExcelFile()` - 엑셀 파일 파싱

#### 사용 라이브러리
- xlsx (이미 설치되어 있음)

### 3. 사용 예시 컴포넌트 작성
파일: src/app/(dashboard)/stores/page.tsx (참고용)

DataTableV2를 사용하는 예시 페이지를 작성하여 사용법을 문서화하세요.

## 기술 스택
- @tanstack/react-table (최신 버전)
- shadcn/ui 컴포넌트 (Button, Input, Checkbox, DropdownMenu)
- lucide-react 아이콘
- xlsx 라이브러리

## 완료 조건
- [ ] DataTableV2 컴포넌트 구현 완료
- [ ] Excel 유틸리티 함수 구현 완료
- [ ] TypeScript 타입 에러 없음
- [ ] 예시 페이지 작성 완료
- [ ] 컴포넌트 재사용 가능 확인

작업을 시작해주세요.
```

---

### Prompt 1-3: Products 페이지 404 오류 수정

```
# 작업 요청: Products 페이지 404 오류 긴급 수정

## 목표
Products 페이지의 404 오류를 수정하고 표준 패턴을 적용합니다.

## 현재 위치
프로젝트 경로: C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app

## 문제 상황
- `/products/new` 라우트 접근 시 404 오류 발생
- Products 목록 페이지에 Excel/Bulk Actions 미적용

## 작업 내용

### 1. 누락된 파일 생성

#### 파일: src/app/(dashboard)/products/new/page.tsx
상품 신규 등록 폼 페이지 생성:
- 상품명 입력
- 상품 타입 선택 (TRAFFIC, BLOG, REVIEW 등)
- 기본 단가 입력
- 기본 채널 선택
- 등록/취소 버튼

#### 파일: src/app/(dashboard)/products/[id]/page.tsx
상품 상세/수정 페이지 생성:
- 기존 데이터 로드
- 수정 폼
- 저장/삭제 버튼

### 2. Products 목록 페이지 리팩토링

#### 파일: src/app/(dashboard)/products/page.tsx
DataTableV2 컴포넌트 적용:
- Excel 다운로드/업로드 기능 추가
- 템플릿 다운로드 기능 추가
- Bulk Delete 기능 추가
- 검색 기능 추가

### 3. API 엔드포인트 확인 및 수정

#### 파일: src/app/api/products/route.ts
- GET: 목록 조회
- POST: 신규 등록

#### 파일: src/app/api/products/[id]/route.ts
- GET: 상세 조회
- PATCH: 수정
- DELETE: 삭제

#### 파일: src/app/api/products/bulk/route.ts (신규)
- POST: Excel 일괄 등록
- DELETE: 일괄 삭제

#### 파일: src/app/api/products/template/route.ts (신규)
- GET: Excel 템플릿 다운로드

#### 파일: src/app/api/products/export/route.ts (신규)
- GET: Excel 데이터 다운로드

### 4. 컬럼 정의
```typescript
const columns = [
  { accessorKey: 'name', header: '상품명' },
  { accessorKey: 'type', header: '타입' },
  { accessorKey: 'baseUnitPrice', header: '기본 단가' },
  { accessorKey: 'defaultChannel.name', header: '기본 채널' },
  { accessorKey: 'isActive', header: '활성화' },
];
```

### 5. Excel 컬럼 매핑
- 상품명 → name
- 타입 → type (TRAFFIC, BLOG, REVIEW 등)
- 기본단가 → baseUnitPrice
- 기본채널 → defaultChannelName
- 활성화 → isActive (Y/N)

## 완료 조건
- [ ] `/products/new` 페이지 정상 작동
- [ ] `/products/[id]` 페이지 정상 작동
- [ ] `/products` 목록 페이지 DataTableV2 적용
- [ ] Excel 다운로드/업로드 기능 작동
- [ ] Bulk Delete 기능 작동
- [ ] 모든 API 엔드포인트 정상 응답
- [ ] 404 에러 없음

작업을 시작해주세요.
```

---

### Prompt 1-4: 전체 페이지 표준화 (Stores, Settlements, Accounts)

```
# 작업 요청: 모든 CRUD 페이지에 표준 패턴 적용

## 목표
Stores, Settlements, Accounts 페이지를 DataTableV2 기반으로 통일합니다.

## 현재 위치
프로젝트 경로: C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app

## 작업 대상 페이지

### 1. Stores (매장 관리)
파일: src/app/(dashboard)/stores/page.tsx

#### 현재 상태
- 일부 기능만 구현됨
- Excel 업로드는 있으나 표준화 필요

#### 개선 사항
- DataTableV2 컴포넌트 적용
- Excel 템플릿 다운로드 추가
- Bulk Delete 기능 추가
- 검색 기능 강화

#### Excel 컬럼
- 매장명, 고객사명, 주소, 전화번호, 활성화여부

#### API 엔드포인트 추가
- /api/stores/template (GET)
- /api/stores/export (GET)
- /api/stores/bulk (DELETE)

### 2. Settlements (정산 관리)
파일: src/app/(dashboard)/settlements/page.tsx

#### 현재 상태
- 기본 목록만 표시
- Excel 기능 없음

#### 개선 사항
- DataTableV2 컴포넌트 적용
- 정산월 필터 추가
- 매장/채널 필터 추가
- Excel 다운로드 기능 추가
- 소급분 표시 (isRetroactive 배지)
- Bulk 상태 변경 기능

#### Excel 컬럼
- 정산번호, 정산월, 매장명, 채널명, 구분, 금액, 청구금액, 환불금액, 상태, 소급여부

#### API 엔드포인트 추가
- /api/settlements/export (GET)
- /api/settlements/template (GET)
- /api/settlements/bulk (PATCH) - 상태 일괄 변경

#### 특수 기능
- "재계산" 버튼 추가 (각 행)
- 소급분 필터 토글 스위치

### 3. Accounts (계정 관리)
파일: src/app/(dashboard)/accounts/page.tsx

#### 현재 상태
- 기본 목록만 표시
- Excel 기능 없음

#### 개선 사항
- DataTableV2 컴포넌트 적용
- Excel 다운로드/업로드 기능 추가
- Bulk 권한 변경 기능
- Bulk 활성화/비활성화 기능

#### Excel 컬럼
- 이메일, 이름, 역할, 소속, 전화번호, 활성화여부

#### API 엔드포인트 추가
- /api/users/export (GET)
- /api/users/template (GET)
- /api/users/bulk (PATCH) - 역할/상태 일괄 변경

## 공통 작업 사항

### 모든 페이지 공통
1. DataTableV2 컴포넌트 사용
2. Excel 3종 세트 구현:
   - 템플릿 다운로드
   - 데이터 다운로드
   - 데이터 업로드
3. Bulk Actions 최소 1개 이상 구현
4. 검색 기능 구현
5. 페이지네이션 구현

### API 엔드포인트 표준화
각 리소스별로 다음 엔드포인트 구현:
- GET /api/{resource} - 목록 조회
- POST /api/{resource} - 생성
- GET /api/{resource}/[id] - 상세 조회
- PATCH /api/{resource}/[id] - 수정
- DELETE /api/{resource}/[id] - 삭제
- GET /api/{resource}/template - Excel 템플릿
- GET /api/{resource}/export - Excel 다운로드
- POST /api/{resource}/bulk - Excel 업로드
- DELETE /api/{resource}/bulk - 일괄 삭제
- PATCH /api/{resource}/bulk - 일괄 수정

## 완료 조건
- [ ] Stores 페이지 표준화 완료
- [ ] Settlements 페이지 표준화 완료
- [ ] Accounts 페이지 표준화 완료
- [ ] 모든 페이지 Excel 3종 기능 작동
- [ ] 모든 페이지 Bulk Actions 작동
- [ ] 모든 API 엔드포인트 정상 응답
- [ ] TypeScript 에러 없음
- [ ] UI/UX 일관성 확보

작업을 시작해주세요. 한 페이지씩 순차적으로 진행하며, 각 페이지 완료 후 다음으로 넘어가세요.
```

---

## Phase 2: Core Workflow Implementation

### Prompt 2-1: 워크플로우 자동화 API 구현

```
# 작업 요청: 견적→주문→발주 워크플로우 자동화 API 구현

## 목표
비즈니스 워크플로우를 자동화하는 API를 구현합니다.

## 현재 위치
프로젝트 경로: C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app

## 작업 내용

### 1. 견적 승인 → 주문 자동 생성
파일: src/app/api/quotations/[id]/accept/route.ts

#### 기능
1. 견적서 상태를 ACCEPTED로 변경
2. 견적서 내용을 복사하여 SalesOrder 자동 생성
3. SalesOrder 번호 자동 생성 (SO+날짜+랜덤코드)
4. 견적 항목을 주문 항목으로 복사
5. Transaction으로 원자성 보장

#### Request
```typescript
POST /api/quotations/{quotationId}/accept
```

#### Response
```typescript
{
  quotation: Quotation,
  salesOrder: SalesOrder
}
```

### 2. 주문 확정 → 발주서 분리 생성
파일: src/app/api/sales-orders/[id]/confirm/route.ts

#### 기능
1. 주문서 상태를 PROCESSING으로 변경
2. 주문 항목을 상품별로 그룹핑
3. 각 상품 그룹마다 별도의 PurchaseOrder 생성
4. PurchaseOrder 번호 자동 생성 (PO+날짜+랜덤코드)
5. 상품의 기본 채널을 발주 채널로 설정
6. Transaction으로 원자성 보장

#### Request
```typescript
POST /api/sales-orders/{salesOrderId}/confirm
```

#### Response
```typescript
{
  salesOrder: SalesOrder,
  purchaseOrders: PurchaseOrder[]
}
```

### 3. 발주 완료 → 명세서 자동 생성
파일: src/app/api/purchase-orders/[id]/complete/route.ts

#### 기능
1. 발주서 상태를 COMPLETED로 변경
2. WorkStatement 자동 생성
3. 발주 항목을 명세서 항목으로 복사
4. 명세서 번호 자동 생성 (WS+날짜+랜덤코드)
5. Transaction으로 원자성 보장

#### Request
```typescript
POST /api/purchase-orders/{purchaseOrderId}/complete
```

#### Response
```typescript
{
  purchaseOrder: PurchaseOrder,
  workStatement: WorkStatement
}
```

### 4. 명세서 승인 → 정산 생성
파일: src/app/api/work-statements/[id]/approve/route.ts

#### 기능
1. 명세서 상태를 CONFIRMED로 변경
2. Settlement 자동 생성
3. 정산 번호 자동 생성 (ST+날짜+랜덤코드)
4. 정산월 자동 설정 (현재 월)
5. Transaction으로 원자성 보장

#### Request
```typescript
POST /api/work-statements/{workStatementId}/approve
```

#### Response
```typescript
{
  workStatement: WorkStatement,
  settlement: Settlement
}
```

## 공통 요구사항

### 에러 처리
- 각 단계마다 상태 검증
- 이미 처리된 요청 중복 방지
- 명확한 에러 메시지 반환

### 로깅
- 각 워크플로우 전환 로그 기록
- 생성된 문서 번호 로깅

### Transaction
- 모든 DB 작업은 Transaction 내에서 실행
- 실패 시 전체 롤백

## 완료 조건
- [ ] 4개 API 엔드포인트 모두 구현 완료
- [ ] Transaction 정상 작동 확인
- [ ] 에러 핸들링 구현 완료
- [ ] TypeScript 타입 에러 없음
- [ ] 각 API 테스트 완료 (Postman/curl)

작업을 시작해주세요.
```

---

### Prompt 2-2: 구글 시트 양방향 연동 구현

```
# 작업 요청: 구글 시트 양방향 연동 시스템 구현

## 목표
발주서와 구글 시트를 양방향으로 연동하여 작업 지시와 결과 수집을 자동화합니다.

## 현재 위치
프로젝트 경로: C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app

## 사전 준비
1. Google Cloud Console에서 Service Account 생성
2. Google Sheets API 활성화
3. 환경변수 설정:
   - GOOGLE_SHEETS_CREDENTIALS (Service Account JSON)

## 작업 내용

### 1. 구글 시트 설정 스키마 확인
SheetConfig 모델이 이미 schema.prisma에 있는지 확인:
- spreadsheetId
- orderSheetName, orderSheetRange
- receiptSheetName, receiptSheetRange

없으면 추가하세요.

### 2. 발주서 → 시트 Export API
파일: src/app/api/purchase-orders/[id]/export-to-sheet/route.ts

#### 기능
1. PurchaseOrder와 Items 조회
2. Channel의 SheetConfig 조회
3. Google Sheets API로 데이터 추가
4. SheetExport 로그 생성

#### 시트 포맷
| 발주번호 | 매장명 | 키워드 | 수량 | 시작일 | 종료일 | 금액 | 작업URL | 완료일 |
|---------|--------|--------|------|--------|--------|------|---------|--------|
| PO...   | 강남점 | 강남맛집 | 30 | 2026-01 | 2026-02 | 300000 | (빈칸) | (빈칸) |

#### Request
```typescript
POST /api/purchase-orders/{purchaseOrderId}/export-to-sheet
```

#### Response
```typescript
{
  success: true,
  rowCount: number,
  spreadsheetId: string,
  sheetName: string
}
```

### 3. 시트 → 작업 결과 Import Cron
파일: src/app/api/cron/import-sheet-receipts/route.ts

#### 기능
1. 활성 채널의 SheetConfig 조회
2. 각 시트의 수주 시트 데이터 읽기
3. 작업URL이 입력된 행만 처리
4. 발주번호+키워드+매장명으로 PurchaseOrderItem 매칭
5. proofUrl 업데이트, 상태를 COMPLETED로 변경
6. SheetImport 로그 생성

#### 스케줄링
Vercel Cron 또는 수동 트리거:
```typescript
// vercel.json
{
  "crons": [{
    "path": "/api/cron/import-sheet-receipts",
    "schedule": "0 */6 * * *"  // 6시간마다
  }]
}
```

#### Request
```typescript
GET /api/cron/import-sheet-receipts
```

#### Response
```typescript
{
  success: true,
  channelsProcessed: number,
  itemsUpdated: number
}
```

### 4. 시트 템플릿 생성 유틸리티
파일: src/lib/google-sheets-utils.ts

#### 함수
```typescript
export async function createSheetTemplate(
  spreadsheetId: string,
  sheetName: string
): Promise<void>

export async function appendToSheet(
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<void>

export async function readFromSheet(
  spreadsheetId: string,
  range: string
): Promise<any[][]>
```

### 5. SheetConfig 관리 UI
파일: src/app/(dashboard)/channels/[id]/sheet-config/page.tsx

#### 기능
- Spreadsheet ID 입력
- 시트명 및 범위 설정
- 연결 테스트 버튼
- 저장 버튼

## 완료 조건
- [ ] Export API 구현 완료
- [ ] Import Cron 구현 완료
- [ ] Google Sheets API 연동 성공
- [ ] SheetConfig UI 구현 완료
- [ ] 테스트 시트에서 정상 작동 확인
- [ ] 에러 핸들링 구현 완료

작업을 시작해주세요.
```

---

### Prompt 2-3: 워크플로우 대시보드 UI 구현

```
# 작업 요청: 워크플로우 현황 대시보드 구현

## 목표
전체 비즈니스 워크플로우의 현황을 한눈에 파악할 수 있는 대시보드를 구축합니다.

## 현재 위치
프로젝트 경로: C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app

## 작업 내용

### 1. 워크플로우 대시보드 페이지
파일: src/app/(dashboard)/workflow/page.tsx

#### 레이아웃
```
┌─────────────────────────────────────────────────────┐
│ 워크플로우 현황                                       │
├─────────────────────────────────────────────────────┤
│ [견적 12] → [주문 8] → [발주 25] → [명세 18] → [정산 3] │
│    대기5      확정8      진행18      대기10      대기3   │
└─────────────────────────────────────────────────────┘
│ 최근 활동                                            │
│ ✅ 견적 QT-001 승인됨 → 주문 SO-001 생성          5분전 │
│ ⏰ 발주 PO-015 시트 Export 완료                  10분전 │
│ ⚠️  캠페인 만료 예정 (3일 후 12건)                긴급  │
└─────────────────────────────────────────────────────┘
```

#### 구성 요소
1. **단계별 카드** (5개)
   - 견적 대기 건수
   - 주문 확정 건수
   - 발주 진행 건수
   - 명세서 대기 건수
   - 정산 대기 건수

2. **화살표 아이콘** (단계 간 연결)

3. **최근 활동 타임라인**
   - 최근 10개 워크플로우 전환 이벤트
   - 아이콘 + 메시지 + 시간
   - 긴급도 표시 (배지)

### 2. 대시보드 데이터 API
파일: src/app/api/dashboard/workflow/route.ts

#### Response
```typescript
{
  quotations: {
    total: number,
    pending: number,
    sent: number,
    accepted: number
  },
  salesOrders: {
    total: number,
    draft: number,
    confirmed: number,
    processing: number
  },
  purchaseOrders: {
    total: number,
    confirmed: number,
    inProgress: number,
    completed: number
  },
  workStatements: {
    total: number,
    draft: number,
    pending: number,
    confirmed: number
  },
  settlements: {
    total: number,
    pending: number,
    confirmed: number,
    paid: number
  },
  recentActivities: Array<{
    id: string,
    type: 'QUOTATION_ACCEPTED' | 'ORDER_CONFIRMED' | 'PO_EXPORTED' | 'CAMPAIGN_EXPIRING',
    message: string,
    timestamp: Date,
    severity: 'info' | 'warning' | 'error'
  }>
}
```

### 3. 활동 로그 스키마 추가
파일: prisma/schema.prisma

```prisma
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

Migration:
```bash
npx prisma migrate dev --name add_workflow_activity
```

### 4. 활동 로깅 유틸리티
파일: src/lib/workflow-logger.ts

```typescript
export async function logWorkflowActivity(
  type: string,
  message: string,
  metadata?: any,
  severity?: 'info' | 'warning' | 'error'
): Promise<void>
```

기존 워크플로우 API에 로깅 추가:
- 견적 승인 시
- 주문 확정 시
- 발주 시트 Export 시
- 명세서 승인 시

### 5. 메뉴에 대시보드 추가
파일: src/components/layout/sidebar.tsx

"워크플로우" 메뉴 항목 추가 (홈 다음)

## 완료 조건
- [ ] 대시보드 페이지 UI 구현 완료
- [ ] 대시보드 API 구현 완료
- [ ] WorkflowActivity 스키마 추가 완료
- [ ] 로깅 유틸리티 구현 완료
- [ ] 기존 API에 로깅 추가 완료
- [ ] 메뉴에 대시보드 추가 완료
- [ ] 실시간 데이터 정상 표시 확인

작업을 시작해주세요.
```

---

## Phase 3: Domain-Specific Features

### Prompt 3-1: 키워드 중심 통합 검색 구현

```
# 작업 요청: 키워드 중심 통합 검색 시스템 구현

## 목표
키워드를 입력하면 관련된 모든 리소스(캠페인, 매장, 주문)를 한번에 검색하는 시스템을 구축합니다.

## 현재 위치
프로젝트 경로: C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app

## 작업 내용

### 1. Universal Search API
파일: src/app/api/search/universal/route.ts

#### 기능
병렬로 다음 4가지를 검색:
1. **캠페인** (PurchaseOrderItem)
   - keyword 또는 note에 검색어 포함
   - 상태가 CANCELLED 아닌 것
   - 키워드별로 그룹핑

2. **매장** (Store)
   - name에 검색어 포함
   - 최신 키워드 순위 포함

3. **키워드** (StoreKeyword)
   - keyword에 검색어 포함
   - 활성 상태만
   - 최신 순위 포함

4. **주문** (PurchaseOrder)
   - purchaseOrderNo 또는 memo에 검색어 포함

#### Request
```typescript
GET /api/search/universal?q={searchQuery}
```

#### Response
```typescript
{
  results: {
    campaigns: Array<{
      keyword: string,
      stores: Store[],
      totalOrders: number,
      activeCount: number,
      currentRank: number | null,
      targetRank: number | null
    }>,
    stores: Store[],
    keywords: StoreKeyword[],
    orders: PurchaseOrder[]
  },
  meta: {
    totalCount: number,
    query: string
  }
}
```

### 2. Command Palette (⌘K)
파일: src/components/common/command-palette.tsx

#### 기능
- Cmd/Ctrl + K로 열기
- 실시간 검색 (debounce 300ms)
- 검색 결과 그룹별 표시
- 빠른 액션 메뉴
- Enter로 상세 페이지 이동

#### 빠른 액션
- 새 발주 생성
- 순위 체크 실행
- 고객 리포트 생성

#### 사용 라이브러리
- cmdk (Command Menu for React)

설치:
```bash
npm install cmdk
```

### 3. 검색 결과 UI
파일: src/components/search/universal-search-results.tsx

#### 키워드 그룹 카드 표시
```
┌──────────────────────────────────────────────┐
│ 🔍 강남 맛집                    [3개 진행중] │
│ 현재 3위 (목표: 5위)          D-5 (2026-01-21) │
│ 완료 15/30일                                  │
│ [강남점] [홍대점] [신촌점] +2개 매장           │
│                              [상세보기 →]     │
└──────────────────────────────────────────────┘
```

#### 구성 요소
- 키워드명
- 진행 상태 배지
- 현재/목표 순위
- D-Day
- 완료율
- 관련 매장 미리보기
- 상세보기 버튼

### 4. 전역 검색 버튼
파일: src/components/layout/header.tsx

#### 기능
- 헤더에 검색 버튼 추가
- 클릭 시 Command Palette 열기
- ⌘K 단축키 힌트 표시

### 5. 검색 페이지 (선택사항)
파일: src/app/(dashboard)/search/page.tsx

전용 검색 페이지 (Command Palette 대안)

## 완료 조건
- [ ] Universal Search API 구현 완료
- [ ] Command Palette 구현 완료
- [ ] 검색 결과 UI 구현 완료
- [ ] 헤더에 검색 버튼 추가 완료
- [ ] ⌘K 단축키 작동 확인
- [ ] 검색 성능 최적화 (300ms 이내)
- [ ] 키보드 네비게이션 작동 확인

작업을 시작해주세요.
```

---

### Prompt 3-2: 캠페인 자동 연장 시스템 구현

```
# 작업 요청: 캠페인 자동 연장 제안 시스템 구현

## 목표
만료 예정 캠페인을 자동 감지하고 원클릭 연장을 지원하는 시스템을 구축합니다.

## 현재 위치
프로젝트 경로: C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app

## 작업 내용

### 1. 만료 감지 Cron Job
파일: src/app/api/cron/renewal-proposals/route.ts

#### 기능
1. 3일 내 만료 예정 PurchaseOrder 조회
2. 기존 제안이 없으면 CampaignRenewal 생성
3. 제안 내용:
   - 기존과 동일한 금액
   - 종료일 다음날부터 +30일
4. 알림 전송 (선택사항)

#### 스케줄링
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/renewal-proposals",
    "schedule": "0 9 * * *"  // 매일 오전 9시
  }]
}
```

#### Request
```typescript
GET /api/cron/renewal-proposals
```

#### Response
```typescript
{
  processed: number,
  created: number
}
```

### 2. 연장 제안 수락 API
파일: src/app/api/renewals/accept/route.ts

#### 기능
1. CampaignRenewal 조회
2. 원본 PurchaseOrder 복제
3. 날짜만 변경 (제안된 시작일/종료일)
4. 새 PurchaseOrder 생성
5. CampaignRenewal 상태를 ACCEPTED로 변경
6. renewedOrderId 연결

#### Request
```typescript
POST /api/renewals/accept
Body: {
  proposalId: string,
  modifications?: {
    startDate?: string,
    endDate?: string,
    amount?: number
  }
}
```

#### Response
```typescript
{
  renewedOrder: PurchaseOrder,
  proposal: CampaignRenewal
}
```

### 3. 연장 제안 카드 UI
파일: src/components/renewal/renewal-card.tsx

#### 디자인
```
┌──────────────────────────────────────────────┐
│ ⚠️  만료 예정 캠페인              [D-3]      │
├──────────────────────────────────────────────┤
│ PO2026-015                                   │
│ 12개 키워드 · 2026-01-20 종료                │
│                                              │
│ 연장 기간: 2026-01-21 ~ 2026-02-20 (30일)   │
│ 예상 금액: ₩3,000,000                        │
│                                              │
│ [✓ 동일 조건으로 연장] [수정 후 연장] [거절] │
└──────────────────────────────────────────────┘
```

#### Props
```typescript
interface RenewalCardProps {
  proposal: CampaignRenewal & {
    originalOrder: PurchaseOrder
  }
}
```

#### D-Day 색상 코딩
- D-0 이하: 빨강 배경
- D-3 이하: 주황 배경
- D-7 이하: 노랑 배경

### 4. 연장 제안 목록 페이지
파일: src/app/(dashboard)/renewals/page.tsx

#### 기능
- PENDING 상태 제안만 표시
- D-Day 순 정렬
- 필터: 전체/긴급/일반
- 카드 그리드 레이아웃

### 5. 대시보드에 연장 위젯 추가
파일: src/app/(dashboard)/page.tsx (메인 대시보드)

#### 위젯
```
┌──────────────────────────────────────┐
│ ⚠️  만료 예정 캠페인                  │
│                                      │
│ D-1: 3건                             │
│ D-3: 5건                             │
│ D-7: 12건                            │
│                                      │
│                   [전체 보기 →]      │
└──────────────────────────────────────┘
```

## 완료 조건
- [ ] Cron Job 구현 완료
- [ ] 연장 수락 API 구현 완료
- [ ] RenewalCard 컴포넌트 구현 완료
- [ ] 연장 목록 페이지 구현 완료
- [ ] 대시보드 위젯 추가 완료
- [ ] D-Day 색상 코딩 작동 확인
- [ ] 원클릭 연장 정상 작동 확인

작업을 시작해주세요.
```

---

### Prompt 3-3: 성과 기반 정산 시스템 구현

```
# 작업 요청: 성과 기반 자동 정산 시스템 구현

## 목표
순위 목표 달성 여부에 따라 자동으로 정산 금액을 조정하는 시스템을 구축합니다.

## 현재 위치
프로젝트 경로: C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app

## 작업 내용

### 1. 순위 자동 체크 Cron (시뮬레이션)
파일: src/app/api/cron/ranking-check/route.ts

#### 기능
실제 크롤링 대신 시뮬레이션으로 구현:
1. 활성 StoreKeyword 조회
2. 랜덤 순위 생성 (1~30)
3. KeywordRanking 레코드 생성
4. PurchaseOrderItem의 currentRank 업데이트

#### 스케줄링
```json
{
  "crons": [{
    "path": "/api/cron/ranking-check",
    "schedule": "0 0 * * *"  // 매일 자정
  }]
}
```

### 2. 정산 계산 서비스
파일: src/services/billing-calculator.service.ts

#### 클래스
```typescript
export class BillingCalculatorService {
  async calculatePerformanceBilling(
    purchaseOrderItem: PurchaseOrderItem,
    month: string
  ): Promise<BillingResult>

  async executeMonthlySettlement(month: string): Promise<void>
}

type BillingResult = {
  billableAmount: number;
  unbillableAmount: number;
  achievedDays?: number;
  failedDays?: number;
  deductionDays: { date: Date; rank: number; targetRank: number }[];
  reason: string;
}
```

#### 계산 로직
1. BillingRule 조회 (상품별)
2. 해당 월의 KeywordRanking 조회
3. targetRank 이하 달성일 수 계산
4. 실패일 수 × 일일 단가 × 환불 비율 = 차감액
5. 청구 금액 = 계약 금액 - 차감액

### 3. 월간 정산 실행 API
파일: src/app/api/settlements/calculate-monthly/route.ts

#### 기능
1. 해당 월에 종료된 PurchaseOrderItem 조회
2. 각 항목별 성과 계산 (BillingCalculatorService 사용)
3. Settlement 레코드 생성
4. billableAmount, unbillableAmount, unbillableReason 저장

#### Request
```typescript
POST /api/settlements/calculate-monthly
Body: {
  month: string  // "2026-01"
}
```

#### Response
```typescript
{
  month: string,
  processedItems: number,
  totalBillable: number,
  totalUnbillable: number,
  settlements: Settlement[]
}
```

### 4. 수익성 분석 대시보드
파일: src/app/(dashboard)/analytics/profitability/page.tsx

#### KPI 카드 (4개)
1. 총 매출 (SalesOrderItem 합계)
2. 매입 원가 (PurchaseOrderItem 합계)
3. 성과 미달 환불 (unbillableAmount 합계)
4. 실제 마진율

#### Waterfall Chart
매출 → (-원가) → 총이익 → (-환불) → 순이익

#### 상품별 마진 테이블
| 상품 | 매출 | 원가 | 환불 | 순이익 | 마진율 |

### 5. 수익성 API
파일: src/app/api/analytics/profitability/route.ts

#### Request
```typescript
GET /api/analytics/profitability?month=2026-01
```

#### Response
```typescript
{
  month: string,
  revenue: number,
  cost: number,
  refunds: number,
  grossProfit: number,
  netProfit: number,
  grossMargin: number,
  netMargin: number,
  breakdown: {
    byProduct: Array<{
      id: string,
      name: string,
      revenue: number,
      cost: number,
      refunds: number,
      netProfit: number,
      netMargin: number
    }>,
    byChannel: Array<...>,
    byCustomer: Array<...>
  }
}
```

## 완료 조건
- [ ] 순위 체크 Cron 구현 완료 (시뮬레이션)
- [ ] BillingCalculatorService 구현 완료
- [ ] 월간 정산 API 구현 완료
- [ ] 수익성 대시보드 UI 구현 완료
- [ ] 수익성 API 구현 완료
- [ ] Waterfall Chart 표시 확인
- [ ] 계산 로직 검증 완료

작업을 시작해주세요.
```

---

### Prompt 3-4: 고객 공개 리포트 시스템 구현

```
# 작업 요청: 고객 공개 리포트 시스템 구현

## 목표
고객이 로그인 없이 작업 현황을 확인할 수 있는 공개 리포트 시스템을 구축합니다.

## 현재 위치
프로젝트 경로: C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app

## 작업 내용

### 1. 리포트 생성 API
파일: src/app/api/reports/create/route.ts

#### 기능
1. SalesOrder ID 받기
2. ClientReport 생성 (secretToken 자동 생성)
3. 공유 URL 생성

#### Request
```typescript
POST /api/reports/create
Body: {
  salesOrderId: string,
  title: string,
  description?: string,
  showPricing?: boolean,
  expiresAt?: string  // ISO date
}
```

#### Response
```typescript
{
  reportId: string,
  shareUrl: string,  // "https://your-domain.com/reports/{secretToken}"
  secretToken: string
}
```

### 2. 공개 리포트 페이지
파일: src/app/reports/[token]/page.tsx

#### 레이아웃
```
┌──────────────────────────────────────────────┐
│ [로고]                                        │
│                                              │
│ 작업 현황 리포트                              │
│ 고객사명 · 2026-01-17 기준                    │
├──────────────────────────────────────────────┤
│ [총 키워드: 12] [완료율: 75%] [평균순위: 3위] │
├──────────────────────────────────────────────┤
│ 키워드별 성과                                 │
│                                              │
│ ┌──────────────────────────────────────┐    │
│ │ 강남 맛집                             │    │
│ │ 강남역 1번출구점                      │    │
│ │                                      │    │
│ │ [순위 그래프: 7위 → 3위 (▲4)]        │    │
│ │                                      │    │
│ │ [작업 증빙 썸네일]                    │    │
│ │ 작업 결과 보기 →                      │    │
│ │                                      │    │
│ │                        현재 3위       │    │
│ │                        목표 5위       │    │
│ └──────────────────────────────────────┘    │
│                                              │
│                    [PDF 다운로드]             │
└──────────────────────────────────────────────┘
```

#### 기능
1. secretToken으로 ClientReport 조회
2. 만료일 체크
3. 조회수 증가
4. SalesOrder 및 Items 조회
5. 키워드별 순위 그래프 표시
6. 증빙 썸네일 표시
7. PDF Export 버튼

#### 접근 제어
- 로그인 불필요
- expiresAt 체크
- 조회수 자동 증가

### 3. 순위 그래프 컴포넌트
파일: src/components/reports/ranking-chart.tsx

#### 기능
- 최근 30일 순위 변동 그래프
- Line Chart (Recharts 사용)
- 목표 순위 기준선 표시

설치:
```bash
npm install recharts
```

### 4. PDF Export 기능
파일: src/app/api/reports/[token]/pdf/route.ts

#### 기능
1. 리포트 데이터 조회
2. HTML → PDF 변환 (puppeteer 사용)
3. PDF 다운로드

선택사항 (구현 난이도 높음):
- 간단한 방법: 브라우저 인쇄 (window.print())
- 고급 방법: Puppeteer 또는 pdf-lib

### 5. 리포트 관리 페이지
파일: src/app/(dashboard)/reports/page.tsx

#### 기능
- 생성된 리포트 목록
- 공유 URL 복사 버튼
- 조회수 표시
- 만료일 표시
- 리포트 삭제

## 완료 조건
- [ ] 리포트 생성 API 구현 완료
- [ ] 공개 리포트 페이지 구현 완료
- [ ] 순위 그래프 표시 확인
- [ ] 접근 제어 작동 확인
- [ ] PDF Export 구현 완료 (또는 브라우저 인쇄)
- [ ] 리포트 관리 페이지 구현 완료
- [ ] 공유 URL 복사 기능 작동 확인

작업을 시작해주세요.
```

---

## Phase 4: Operation Optimization

### Prompt 4-1: 과거 데이터 마이그레이션 시스템

```
# 작업 요청: 레거시 데이터 마이그레이션 시스템 구현

## 목표
엑셀로 관리되던 과거 정산 데이터를 시스템으로 임포트할 수 있는 기능을 구현합니다.

## 현재 위치
프로젝트 경로: C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app

## 작업 내용

### 1. 레거시 임포트 API
파일: src/app/api/legacy/import-settlement/route.ts

#### 기능
1. 엑셀 파일 업로드
2. 데이터 파싱
3. 매장 자동 생성 (없는 경우)
4. Settlement 직접 생성 (주문 없이)
5. isRetroactive = true 설정

#### 엑셀 포맷
| 매장명 | 키워드 | 작업유형 | 수량 | 단가 | 금액 | 성공여부 |
|--------|--------|----------|------|------|------|----------|
| 강남점 | 강남맛집 | 트래픽 | 30 | 10000 | 300000 | Y |

#### Request
```typescript
POST /api/legacy/import-settlement
FormData: {
  file: File,
  month: string  // "2025-12"
}
```

#### Response
```typescript
{
  total: number,
  success: number,
  failed: number,
  details: Array<{
    row: any,
    status: 'SUCCESS' | 'ERROR' | 'NOT_FOUND',
    error?: string,
    settlementId?: string
  }>
}
```

### 2. 정산 재계산 API
파일: src/app/api/settlements/recalculate/route.ts

#### 기능
1. 기존 정산 조회
2. 현재 실제 데이터로 재계산
3. 차액 계산
4. 차액이 있으면 조정 정산서 생성

#### Request
```typescript
POST /api/settlements/recalculate
Body: {
  settlementMonth: string,
  storeId: string,
  channelId: string
}
```

#### Response
```typescript
{
  message: string,
  diff: number,
  adjustmentSettlement?: Settlement
}
```

### 3. 레거시 임포트 UI
파일: src/app/(dashboard)/legacy/import/page.tsx

#### 구성
1. 월 선택 (month picker)
2. 파일 업로드
3. 진행 상황 표시
4. 결과 요약 (성공/실패 건수)
5. 상세 로그 테이블

### 4. 재계산 버튼 (Settlement 목록)
파일: src/components/settlement/recalculation-button.tsx

#### 위치
Settlements 테이블 각 행에 추가

#### 기능
- 클릭 시 확인 대화상자
- 재계산 실행
- 차액 표시
- 조정 정산서 생성 완료 토스트

### 5. 소급분 필터
파일: src/app/(dashboard)/settlements/page.tsx 수정

#### 기능
- "소급분 포함" 토글 스위치 추가
- isRetroactive = true 항목 노란 배경 표시
- 소급분 배지 표시 (originalMonth)

## 완료 조건
- [ ] 레거시 임포트 API 구현 완료
- [ ] 재계산 API 구현 완료
- [ ] 임포트 UI 구현 완료
- [ ] 재계산 버튼 구현 완료
- [ ] 소급분 필터 구현 완료
- [ ] 테스트 엑셀로 임포트 성공 확인
- [ ] 재계산 정상 작동 확인

작업을 시작해주세요.
```

---

### Prompt 4-2: 최종 통합 테스트 및 최적화

```
# 작업 요청: 전체 시스템 통합 테스트 및 성능 최적화

## 목표
모든 기능의 통합 테스트를 수행하고 성능을 최적화합니다.

## 현재 위치
프로젝트 경로: C:\Users\enkei\workspace\1-active-project\42Menterp_2026\app

## 작업 내용

### 1. End-to-End 워크플로우 테스트

#### 시나리오
1. 견적서 생성
2. 견적서 승인 → 주문서 자동 생성 확인
3. 주문서 확정 → 발주서 분리 생성 확인
4. 발주서 시트 Export 확인
5. 시트 수동 작성 (작업URL 입력)
6. Import Cron 실행 → proofUrl 업데이트 확인
7. 발주 완료 → 명세서 생성 확인
8. 명세서 승인 → 정산 생성 확인
9. 월간 정산 계산 → 성과 차감 확인

#### 검증 항목
- [ ] 각 단계 정상 작동
- [ ] Transaction 롤백 테스트
- [ ] 에러 핸들링 확인
- [ ] 데이터 일관성 확인

### 2. 성능 최적화

#### Database Index 추가
다음 쿼리에 대한 인덱스 확인:
- PurchaseOrderItem.keyword 검색
- Settlement.settlementMonth 필터
- KeywordRanking.checkDate 범위 조회

#### API 응답 시간 측정
목표: 모든 API < 500ms

느린 엔드포인트 확인:
```bash
# 각 API 호출 시간 측정
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com/api/...
```

#### React Query 캐싱 설정
파일: src/lib/react-query.ts

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1분
      cacheTime: 5 * 60 * 1000, // 5분
    },
  },
});
```

주요 페이지에 적용:
- Dashboard
- Workflow
- Analytics

#### Server-side Pagination
대용량 테이블 페이지네이션:
- Products
- Stores
- Purchase Orders
- Settlements

### 3. 에러 추적 설정

#### Sentry 설치 (선택사항)
```bash
npm install @sentry/nextjs
```

#### 에러 경계 추가
파일: src/components/common/error-boundary.tsx

모든 주요 페이지에 적용

### 4. 통합 문서화

#### API 문서 생성
파일: docs/API_REFERENCE.md

모든 엔드포인트 목록 및 사용법

#### 사용자 가이드 생성
파일: docs/USER_GUIDE.md

주요 기능별 사용 방법

### 5. 배포 준비

#### 환경변수 체크리스트
- [ ] DATABASE_URL
- [ ] GOOGLE_SHEETS_CREDENTIALS
- [ ] NEXTAUTH_SECRET
- [ ] NEXTAUTH_URL

#### Vercel 설정
- [ ] Cron Jobs 설정 확인
- [ ] 환경변수 설정
- [ ] Build 성공 확인

## 완료 조건
- [ ] E2E 워크플로우 테스트 통과
- [ ] 모든 API 응답 시간 < 500ms
- [ ] React Query 캐싱 적용
- [ ] Server-side Pagination 적용
- [ ] 에러 경계 추가 완료
- [ ] API 문서 작성 완료
- [ ] 사용자 가이드 작성 완료
- [ ] Vercel 배포 성공

작업을 시작해주세요.
```

---

## 🎯 전체 실행 순서 요약

### Week 1-2: Foundation
1. Prompt 1-1: 스키마 리팩토링
2. Prompt 1-2: DataTableV2 구현
3. Prompt 1-3: Products 404 수정
4. Prompt 1-4: 전체 페이지 표준화

### Week 3-5: Core Workflow
5. Prompt 2-1: 워크플로우 API
6. Prompt 2-2: 구글 시트 연동
7. Prompt 2-3: 워크플로우 대시보드

### Week 6-9: Domain Features
8. Prompt 3-1: 통합 검색
9. Prompt 3-2: 자동 연장
10. Prompt 3-3: 성과 정산
11. Prompt 3-4: 고객 리포트

### Week 10-11: Optimization
12. Prompt 4-1: 레거시 마이그레이션
13. Prompt 4-2: 통합 테스트 및 최적화

---

## ✅ 사용 팁

1. **한 번에 하나씩**: 각 프롬프트를 순서대로 실행하세요
2. **검증 필수**: 각 단계 완료 후 완료 조건 확인
3. **Git Commit**: 각 단계마다 커밋 생성
4. **백업 필수**: 데이터베이스 백업은 필수입니다
5. **에러 공유**: 에러 발생 시 전체 에러 메시지를 공유하세요

---

## 🚨 주의사항

- ⚠️ 프로덕션 환경에서는 절대 직접 실행하지 마세요
- ⚠️ 개발 환경에서 충분히 테스트 후 배포하세요
- ⚠️ 데이터베이스 백업은 각 단계마다 필수입니다
- ⚠️ Migration은 되돌리기 어려우니 신중하게 진행하세요

---

**다음 단계**: Prompt 1-1부터 순차적으로 Claude에게 전달하여 작업을 시작하세요!
