# 고객관리(Customers) 고도화 개발 문서

> **작성일**: 2026-01-14
> **버전**: 1.2
> **담당 메뉴**: `/customers`
> **파일 범위**: `app/src/app/(dashboard)/customers/**`

---

## 🔴 필수 참조 문서

이 문서를 읽기 전에 반드시 아래 문서를 먼저 읽으세요:

| 문서 | 내용 | 필수 |
|------|------|------|
| `DATA_PATTERNS.md` | 엑셀 업로드/다운로드, 일괄 처리 공통 패턴 | ✅ |
| `COMMON_COMPONENTS.md` | 공용 컴포넌트 API 및 사용법 | ✅ |

**이 문서는 위 공통 패턴을 기반으로 고객관리 전용 기능만 정의합니다.**

---

## 1. 현황 분석

### 1.1 현재 구현 상태

| 기능 | 상태 | 비고 |
|------|------|------|
| 기본 CRUD | ✅ 완료 | 목록, 등록, 상세, 수정, 삭제 |
| 연결된 매장 목록 | ✅ 완료 | 상세 페이지에서 표시 |
| **엑셀 업로드/다운로드** | ❌ 미구현 | `DATA_PATTERNS.md` 패턴 적용 필요 |
| **일괄 선택/수정/삭제** | ❌ 미구현 | `DATA_PATTERNS.md` 패턴 적용 필요 |
| **고객-매장 동기화** | ❌ 미구현 | 고객 전용 기능 |
| **세금계산서 필드 검증** | ❌ 미구현 | 고객 전용 기능 |

### 1.2 고객-매장 개념 정의

> **출처**: `store_customer_integration_proposal_260114.md` (통합됨)

데이터의 역할을 명확히 분리하여 혼선을 줄입니다.

| 엔티티 | 역할 | 비유 (E-Commerce) | 주요 관리 항목 |
|--------|------|-------------------|----------------|
| **고객 (Customer)** | **계약 및 정산 주체** (Bill-To Party) | 주문자 (Buyer) | 세금계산서 정보, 계약 기간, 정산 이메일 |
| **매장 (Store)** | **서비스 제공 대상** (Service Location) | 배송지 (Shipping Addr) | MID, 플레이스 URL, 키워드, 작업 로그 |

**핵심 개념**: "고객(돈)이 매장(일)을 소유한다" - 1:N 관계의 명확한 계층 구조

### 1.3 Customer 스키마

```prisma
model Customer {
  id             String         @id @default(cuid())
  name           String                          // 고객명 (필수)
  businessNo     String?        @unique          // 사업자번호
  representative String?                         // 대표자
  contactName    String?                         // 담당자명
  contactPhone   String?                         // 연락처
  contactEmail   String?                         // 이메일
  address        String?                         // 주소
  contractStart  DateTime?                       // 계약 시작일
  contractEnd    DateTime?                       // 계약 종료일
  monthlyBudget  Int?                            // 월 예산
  status         CustomerStatus @default(ACTIVE) // 상태
  memo           String?                         // 메모

  // 관계
  stores         Store[]
  quotations     Quotation[]
  salesOrders    SalesOrder[]
  statements     Statement[]
}
```

---

## 2. 공통 패턴 적용 (DATA_PATTERNS.md 기반)

### 2.1 엑셀 양식 필드

> **참조**: `DATA_PATTERNS.md` 섹션 6.1 (Customer 필드 정의)

**고객 전용 추가 정보:**

| 필드 | 세금계산서 연동 | 매장 동기화 | 설명 |
|------|----------------|------------|------|
| businessNo | ✅ 필수 | ✅ | 공급받는 자 사업자등록번호 |
| representative | ✅ 권장 | ✅ | 공급받는 자 대표자 |
| address | ✅ 권장 | 선택적 | 공급받는 자 주소 |
| contactEmail | ✅ 권장 | - | 전자세금계산서 발송 이메일 |

### 2.2 삭제 제약조건

> **참조**: `DATA_PATTERNS.md` 섹션 3.4 (삭제 제약조건)

```typescript
// 고객 삭제 불가 조건
const customerDeleteConstraints = [
  '연결된 매장 있음',        // stores.length > 0
  '진행중인 견적 있음',      // quotations (not REJECTED)
  '진행중인 수주 있음',      // salesOrders (not CANCELLED)
];
```

### 2.3 API 엔드포인트

> **참조**: `DATA_PATTERNS.md` 섹션 4.1 (필수 엔드포인트)

```typescript
// 기본 CRUD (구현 완료)
GET    /api/customers              ✅
POST   /api/customers              ✅
GET    /api/customers/[id]         ✅
PUT    /api/customers/[id]         ✅
DELETE /api/customers/[id]         ✅

// 일괄 처리 (구현 필요)
PATCH  /api/customers/bulk         ❌ → DATA_PATTERNS.md 4.2 스펙 적용
GET    /api/customers/template     ❌ → DATA_PATTERNS.md 4.5 스펙 적용
POST   /api/customers/import       ❌ → DATA_PATTERNS.md 4.3 스펙 적용
GET    /api/customers/export       ❌ → DATA_PATTERNS.md 4.4 스펙 적용
```

---

## 3. 고객 전용 기능 (이 문서에서 정의)

### 3.1 고객-매장 정보 동기화

고객(Customer)과 매장(Store)은 1:N 관계이며, 일부 필드는 고객 정보 수정 시 매장에도 반영 가능합니다.

#### 매장 등록 시 고객 정보 자동 채우기 (Auto-fill)

매장 등록/수정 화면에서 고객사 선택 시 사업자 정보를 자동으로 가져옵니다.

```
┌─────────────────────────────────────────────────────────────────┐
│ 매장 등록                                                        │
├─────────────────────────────────────────────────────────────────┤
│ 고객사: [ABC 마케팅 ▼]                                           │
│                                                                 │
│ ☑ 고객사 사업자 정보 사용                                        │
│   └ 사업자번호, 대표자, 주소가 자동으로 채워집니다               │
│                                                                 │
│ 사업자번호: [123-45-67890] (자동)                                │
│ 대표자:     [홍길동      ] (자동)                                │
│ 주소:       [서울시 강남구] (자동)                                │
│                                                                 │
│ ※ 지점별 사업자가 다른 경우 개별 수정 가능                       │
└─────────────────────────────────────────────────────────────────┘
```

#### UI 레벨 상속 (Fallback 로직)

DB 스키마 변경 없이, UI 레벨에서 상속 개념을 적용합니다.

```typescript
// Store 조회 시 Fallback 로직
function getStoreDisplayValue(store: Store, field: keyof Store) {
  // Store에 값이 있으면 Store 값 사용
  if (store[field]) return store[field];

  // 없으면 Customer 값으로 Fallback
  if (store.customer?.[field]) return store.customer[field];

  return null;
}

// 예시: 사업자번호 표시
const displayBusinessNo = store.businessNo || store.customer?.businessNo;
```

#### 동기화 대상 필드

| 고객 필드 | 매장 필드 | 동기화 방향 | 설명 |
|-----------|-----------|-------------|------|
| `businessNo` | `businessNo` | Customer → Store | 세금계산서용 사업자번호 |
| `representative` | `representative` | Customer → Store | 대표자명 |
| `address` | `address` | 선택적 | 사업장 주소 (매장별 다를 수 있음) |
| `contactPhone` | `contactPhone` | 선택적 | 연락처 (매장별 다를 수 있음) |

#### 동기화 UX

```
┌─────────────────────────────────────────────────────────────────┐
│ 고객 정보 수정                                                  │
├─────────────────────────────────────────────────────────────────┤
│ 사업자번호: [123-45-67890]                                      │
│                                                                 │
│ ⚠️ 연결된 매장 3개에 동일한 사업자번호가 있습니다.              │
│                                                                 │
│ ☑ 연결된 매장의 사업자번호도 함께 수정                         │
│   └ 동기화 대상: 강남점, 홍대점, 신촌점                         │
│                                                                 │
│                                    [취소]  [저장]               │
└─────────────────────────────────────────────────────────────────┘
```

#### 동기화 API (PUT /api/customers/[id] 확장)

```typescript
interface CustomerUpdateRequest {
  // 기본 필드 (DATA_PATTERNS 표준)
  name: string;
  businessNo?: string;
  // ... 기타 필드

  // 🔴 고객 전용: 동기화 옵션
  syncOptions?: {
    syncBusinessNo: boolean;       // 매장 사업자번호 동기화
    syncRepresentative: boolean;   // 매장 대표자 동기화
    syncAddress: boolean;          // 매장 주소 동기화 (선택)
    syncContactPhone: boolean;     // 매장 연락처 동기화 (선택)
    targetStoreIds?: string[];     // 특정 매장만 동기화 (null이면 전체)
  };
}
```

---

### 3.2 세금계산서 연동 필드 검증

세금계산서 발행 시 고객 정보에서 자동으로 채워지는 필드입니다.

#### 필수 필드 (세금계산서 발행용)

```typescript
interface TaxInvoiceRequiredFields {
  receiverBusinessNo: string;  // 공급받는 자 사업자등록번호 (필수)
  receiverName: string;        // 공급받는 자 상호 (필수)
  receiverCeoName?: string;    // 공급받는 자 대표자 (권장)
  receiverAddr?: string;       // 공급받는 자 주소 (권장)
  receiverEmail?: string;      // 전자세금계산서 발송 이메일 (권장)
}

// Customer → TaxInvoice 매핑
const customerToTaxInvoice = {
  name: 'receiverName',
  businessNo: 'receiverBusinessNo',
  representative: 'receiverCeoName',
  address: 'receiverAddr',
  contactEmail: 'receiverEmail',
};
```

#### 검증 상태 표시

고객 목록 및 상세 페이지에서 세금계산서 발행 준비 상태를 표시합니다.

```
┌─────────────────────────────────────────────────────────────────┐
│ ABC 마케팅                                      [활성]          │
│ 123-45-67890                                                    │
├─────────────────────────────────────────────────────────────────┤
│ 세금계산서 발행 준비: ✅ 완료                                   │
│ ✅ 사업자번호  ✅ 대표자  ✅ 주소  ✅ 이메일                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ XYZ 컴퍼니                                      [활성]          │
│ 미등록                                                          │
├─────────────────────────────────────────────────────────────────┤
│ 세금계산서 발행 준비: ⚠️ 미완료 (3개 필드 누락)                │
│ ❌ 사업자번호  ❌ 대표자  ❌ 주소  ✅ 이메일                    │
│                                      [정보 입력하기]            │
└─────────────────────────────────────────────────────────────────┘
```

#### 세금계산서 준비 상태 컴포넌트

```tsx
// components/customer-tax-status.tsx
interface TaxReadyStatusProps {
  customer: Customer;
  variant?: 'badge' | 'detail';
}

const requiredFields = ['businessNo'];           // 필수
const recommendedFields = ['representative', 'address', 'contactEmail']; // 권장

export function CustomerTaxStatus({ customer, variant = 'badge' }: TaxReadyStatusProps) {
  const missingRequired = requiredFields.filter(f => !customer[f]);
  const missingRecommended = recommendedFields.filter(f => !customer[f]);

  const isReady = missingRequired.length === 0;
  const isComplete = isReady && missingRecommended.length === 0;

  // ... 렌더링
}
```

---

### 3.3 고객 상세 페이지 UX 개선

#### 목록 페이지 관계 시각화

**고객 목록**: 운영 매장 수와 주요 매장명 표시
```
┌─────────────────────────────────────────────────────────────────┐
│ [고객사] (주)맛있는세상                    [매장] 3개 운영 중    │
│ 사업자: 123-45-67890                 (강남맛집, 홍대맛집 외 1)   │
└─────────────────────────────────────────────────────────────────┘
```

**매장 목록**: 소속 고객사 명확히 표시 + 바로가기 링크
```
┌─────────────────────────────────────────────────────────────────┐
│ [매장명] 강남맛집                     [고객사] (주)맛있는세상 →  │
│ MID: 12345678                        담당: 홍길동 (010-1234-5678)│
└─────────────────────────────────────────────────────────────────┘
```

#### Master-Detail 패턴 적용

```
┌─────────────────────────────────────────────────────────────────────┐
│ ← 고객 목록                                                         │
├─────────────────────────────────────────────────────────────────────┤
│ ABC 마케팅 주식회사                        [활성] [수정] [삭제]     │
│ 123-45-67890 · 매장 3개 · 계약: 2026.01~2026.12                    │
├────────────────┬────────────────────────────────────────────────────┤
│ [기본정보]     │                                                    │
│ [매장정보] (3) │  ┌──────────────────────────────────────────────┐ │
│ [주문이력] (5) │  │ 강남점                            [활성]     │ │
│ [정산이력] (2) │  │ MID: 12345678 · 카페/디저트                  │ │
│                │  │ 서울시 강남구 테헤란로 123                   │ │
│                │  │                                              │ │
│                │  │ 키워드: 강남카페, 테헤란로맛집 외 3개        │ │
│                │  │ 최근 작업: 2026-01-13 리뷰 5건               │ │
│                │  │                                              │ │
│                │  │              [매장 상세] [키워드 관리]       │ │
│                │  └──────────────────────────────────────────────┘ │
└────────────────┴────────────────────────────────────────────────────┘
```

#### 탭 구조

| 탭 | 내용 | 데이터 |
|----|----|--------|
| 기본정보 | 고객 기본 정보 편집 + 세금계산서 준비 상태 | Customer |
| 매장정보 | 연결된 매장 목록 및 요약 | Store[] |
| 주문이력 | 견적/수주 이력 | Quotation[], SalesOrder[] |
| 정산이력 | 세금계산서/정산 이력 | TaxInvoice[], Settlement[] |

---

## 4. 파일 구조

> **참조**: `COMMON_COMPONENTS.md` (공용 컴포넌트 사용)

```
app/src/app/(dashboard)/customers/
├── page.tsx                      # 목록 (공용 DataTable 사용)
├── new/
│   └── page.tsx                  # 신규 등록
├── [id]/
│   └── page.tsx                  # 상세 (탭 구조)
└── components/                   # 고객 전용 컴포넌트만
    ├── customer-tax-status.tsx   # 세금계산서 준비 상태 뱃지
    ├── customer-sync-dialog.tsx  # 고객-매장 동기화 다이얼로그
    └── customer-store-card.tsx   # 연결된 매장 카드

app/src/app/api/customers/
├── route.ts                      # GET, POST (구현 완료)
├── [id]/
│   └── route.ts                  # GET, PUT, DELETE (구현 완료)
├── bulk/
│   └── route.ts                  # PATCH (DATA_PATTERNS 4.2 스펙)
├── import/
│   └── route.ts                  # POST (DATA_PATTERNS 4.3 스펙)
├── export/
│   └── route.ts                  # GET (DATA_PATTERNS 4.4 스펙)
└── template/
    └── route.ts                  # GET (DATA_PATTERNS 4.5 스펙)
```

---

## 5. 구현 우선순위

### Phase 1: 공통 패턴 적용 (DATA_PATTERNS 기반)

| # | 작업 | 참조 문서 |
|---|------|----------|
| 1-1 | 공용 컴포넌트 사용하여 목록 페이지 리팩토링 | `COMMON_COMPONENTS.md` |
| 1-2 | `/api/customers/template` 구현 | `DATA_PATTERNS.md` 4.5 |
| 1-3 | `/api/customers/bulk` 구현 | `DATA_PATTERNS.md` 4.2 |
| 1-4 | `/api/customers/import` 구현 | `DATA_PATTERNS.md` 4.3 |
| 1-5 | `/api/customers/export` 구현 | `DATA_PATTERNS.md` 4.4 |

### Phase 2: 고객 전용 기능

| # | 작업 | 참조 |
|---|------|------|
| 2-1 | 세금계산서 준비 상태 컴포넌트 | 이 문서 3.2절 |
| 2-2 | 고객-매장 동기화 다이얼로그 | 이 문서 3.1절 |
| 2-3 | 상세 페이지 탭 구조 | 이 문서 3.3절 |
| 2-4 | 연결된 매장 카드 UI | 이 문서 3.3절 |

---

## 6. 체크리스트

### 공통 패턴 적용 확인

- [ ] `DATA_PATTERNS.md` 체크리스트 (섹션 7) 완료
- [ ] 공용 컴포넌트 (DataTable, BulkActions, Excel) 사용
- [ ] API 스펙이 `DATA_PATTERNS.md`와 일치

### 고객 전용 기능 확인

- [ ] 세금계산서 준비 상태 뱃지 표시
- [ ] 고객 수정 시 매장 동기화 옵션 동작
- [ ] 상세 페이지 탭 구조 적용
- [ ] 연결된 매장 카드 UI 표시
- [ ] 매장 등록 시 "고객 정보 사용" 체크박스
- [ ] Store 조회 시 Fallback 로직 적용
- [ ] 고객 목록에서 운영 매장 수 표시
- [ ] 매장 목록에서 고객사 바로가기 링크

---

## 7. 참고 자료

### 공통 패턴

- `docs/progress/DATA_PATTERNS.md` - 엑셀/일괄처리 공통 패턴
- `docs/progress/COMMON_COMPONENTS.md` - 공용 컴포넌트 API

### 세금계산서 관련

- [국세청 전자세금계산서 발급방법](https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=2462&cntntsId=7788)
- [국세청 사업자등록정보 API](https://www.data.go.kr/tcs/dss/selectApiDataDetailView.do?publicDataPk=15081808)

### UX 패턴

- [Oracle Alta UI - Master-Detail Pattern](https://www.oracle.com/webfolder/ux/middleware/alta/patterns/masterdetail.html)

---

**작성자**: Claude Opus 4.5

---

## 버전 히스토리

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2026-01-14 | 초기 작성 |
| 1.1 | 2026-01-14 | DATA_PATTERNS.md 표준 적용, 중복 내용 제거 |
| 1.2 | 2026-01-14 | `store_customer_integration_proposal_260114.md` 통합 (고객-매장 개념 정의, Auto-fill, Fallback 로직, 목록 시각화) |
