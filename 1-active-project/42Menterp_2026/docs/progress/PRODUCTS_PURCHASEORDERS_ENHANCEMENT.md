# 상품관리 및 발주관리 고도화 개발 문서

> **작성일**: 2026-01-14
> **버전**: 1.1
> **담당 메뉴**: `/products`, `/purchase-orders`
> **분석 데이터**: `Data/251226_12월 4주_접수시트.xlsx`

---

## 0. 용어 정의 (중요)

| 용어 | 정의 | 예시 |
|------|------|------|
| **채널(Channel)** | 마케팅이 이뤄지는 플랫폼 | 네이버, 인스타그램, 틱톡, 유튜브 |
| **상품(Product)** | 마케팅 서비스/공급업체 | 피닉스, 히든, 호올스, 말차 등 (20개) |

> ⚠️ **주의**: 아래 문서에서 "피닉스, 히든" 등은 **상품(마케팅 서비스)**

---

## 🔴 필수 참조 문서

| 문서 | 내용 | 필수 |
|------|------|------|
| `DATA_PATTERNS.md` | 엑셀 업로드/다운로드, 일괄 처리 공통 패턴 | ✅ |
| `COMMON_COMPONENTS.md` | 공용 컴포넌트 API 및 사용법 | ✅ |

---

## 1. 실제 업무 데이터 분석

### 1.1 접수시트 구조 분석

실제 운영 중인 접수시트(`251226_12월 4주_접수시트.xlsx`)를 분석한 결과:

**시트 구조:**
- 주간별 시트 분리 (예: `25_12m_4w` = 2025년 12월 4주차)
- 38개 이상의 주간 시트 누적

**컬럼 구조 (12월 4주차 기준):**
```
접수요일 | 날짜 | mid | 매장명 | 플레이스url |
[상품별 수량 컬럼들] | 입금확인 | 저 | 비고
```

**상품(마케팅 서비스) 목록 (실제 사용 중):**

| 유형 | 상품명 | 설명 |
|------|--------|------|
| 트래픽 | 피닉스, 호올스, 히든, 엑셀런트, 토스, 다타, 언더더딜, 퍼펙트, 버즈빌, 텐케이 | 유입 트래픽 |
| 길찾기 | 홈런볼/길찾, 말차길찾기, 버즈빌길 | 길찾기 수 |
| 블로그 | 실블, 비실 | 실제블로그, 비실명블로그 |
| 리뷰 | 겟, 추가, 247 | 리뷰 작성 |
| 영수증 | 영수증(퍼플), 영수증(애드), 영수증(불곰) | 영수증 리뷰 |

### 1.2 발주 통계 (12월 4주차 분석)

```
총 발주 건수: 77건
고유 매장 수: 65개

상품별 발주 현황:
┌─────────────┬───────┬─────────┬─────────┐
│ 상품        │ 건수  │ 총 수량 │ 평균    │
├─────────────┼───────┼─────────┼─────────┤
│ 히든        │ 15건  │ 3,200개 │ 213개   │
│ 피닉스      │ 12건  │ 1,900개 │ 158개   │
│ 버즈빌길    │ 10건  │ 1,000개 │ 100개   │
│ 홈런볼/길찾 │ 7건   │ 800개   │ 114개   │
│ 겟(리뷰)    │ 14건  │ 89개    │ 6개     │
│ 추가(리뷰)  │ 5건   │ 34개    │ 7개     │
└─────────────┴───────┴─────────┴─────────┘

유형별 합계:
- 트래픽: 30건, 6,000개
- 길찾기: 18건, 1,900개
- 리뷰: 21건, 133개
```

### 1.3 현재 문제점 (As-Is)

| 문제 | 설명 | 영향 |
|------|------|------|
| **엑셀 수작업** | 주간별 시트로 수동 관리 | 데이터 누락, 입력 오류 |
| **상품명 비표준화** | 시트마다 컬럼명 다름 | 자동화 어려움 |
| **히스토리 추적 불가** | 시트 분리로 통합 조회 불가 | 분석/보고 어려움 |
| **이중 입력** | 시트 작성 후 시스템 재입력 | 업무 비효율 |
| **입금확인 수동** | 별도 컬럼으로 수기 관리 | 정산 오류 |

---

## 2. 상품(Product) 관리 고도화

### 2.1 현재 스키마 vs 실제 업무

**현재 DB 스키마:**
```prisma
model Product {
  code          String        @unique
  name          String
  type          ProductType   // TRAFFIC, SAVE, REVIEW, DIRECTION
  channelId     String?
  saleUnitPrice Int           // 판매가
  costUnitPrice Int           // 매입가
}

enum ProductType {
  TRAFFIC    // 트래픽(유입)
  SAVE       // 저장
  REVIEW     // 리뷰
  DIRECTION  // 길찾기
}
```

**실제 업무 요구사항:**
- 상품이 더 세분화됨 (피닉스 트래픽, 호올스 트래픽 등)
- 같은 유형이라도 상품별로 단가가 다름
- 영수증 리뷰는 별도 유형으로 관리 필요

### 2.2 상품 유형 확장 제안

```prisma
enum ProductType {
  TRAFFIC       // 트래픽(유입)
  SAVE          // 저장
  REVIEW        // 리뷰
  DIRECTION     // 길찾기
  BLOG          // 블로그 배포
  RECEIPT       // 영수증 리뷰 (신규)
}
```

### 2.3 상품(마케팅 서비스) 마스터 데이터

시스템에 등록해야 할 20개 상품:

```typescript
const PRODUCT_MASTER = {
  // 트래픽 상품
  'PHOENIX': { code: 'PHOENIX', name: '피닉스', type: 'TRAFFIC' },
  'HOALLS': { code: 'HOALLS', name: '호올스', type: 'TRAFFIC' },
  'HIDDEN': { code: 'HIDDEN', name: '히든', type: 'TRAFFIC' },
  'EXCELLENT': { code: 'EXCELLENT', name: '엑셀런트', type: 'TRAFFIC' },
  'TOSS': { code: 'TOSS', name: '토스', type: 'TRAFFIC' },
  'DATA': { code: 'DATA', name: '다타', type: 'TRAFFIC' },
  'UNDERTHEDEAL': { code: 'UNDERTHEDEAL', name: '언더더딜', type: 'TRAFFIC' },
  'PERFECT': { code: 'PERFECT', name: '퍼펙트', type: 'TRAFFIC' },
  'BUZZVIL': { code: 'BUZZVIL', name: '버즈빌', type: 'TRAFFIC' },
  'TENK': { code: 'TENK', name: '텐케이', type: 'TRAFFIC' },

  // 길찾기 상품
  'HOMERUNBALL': { code: 'HOMERUNBALL', name: '홈런볼/길찾', type: 'DIRECTION' },
  'MATCHA_DIR': { code: 'MATCHA_DIR', name: '말차길찾기', type: 'DIRECTION' },
  'BUZZVIL_DIR': { code: 'BUZZVIL_DIR', name: '버즈빌길', type: 'DIRECTION' },

  // 블로그 상품
  'REAL_BLOG': { code: 'REAL_BLOG', name: '실블', type: 'BLOG' },
  'ANON_BLOG': { code: 'ANON_BLOG', name: '비실', type: 'BLOG' },

  // 리뷰 상품
  'GET': { code: 'GET', name: '겟', type: 'REVIEW' },
  'EXTRA': { code: 'EXTRA', name: '추가', type: 'REVIEW' },
  '247': { code: '247', name: '247', type: 'REVIEW' },

  // 영수증 리뷰 상품
  'RECEIPT_PURPLE': { code: 'RECEIPT_PURPLE', name: '영수증(퍼플)', type: 'RECEIPT' },
  'RECEIPT_AD': { code: 'RECEIPT_AD', name: '영수증(애드)', type: 'RECEIPT' },
  'RECEIPT_BEAR': { code: 'RECEIPT_BEAR', name: '영수증(불곰)', type: 'RECEIPT' },
};
```

### 2.4 상품 관리 UI 개선

#### 유형별 그룹화 뷰

```
┌─────────────────────────────────────────────────────────────────────┐
│ 상품 관리                                      [+ 상품 등록] [엑셀]  │
├─────────────────────────────────────────────────────────────────────┤
│ [전체] [트래픽 10] [길찾기 3] [블로그 2] [리뷰 3] [영수증 3]         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ 트래픽 (10)                                           [펼치기/접기] │
│ ├─ 피닉스     PHOENIX     ₩45/개    활성    [수정] [삭제]          │
│ ├─ 호올스     HOALLS      ₩50/개    활성    [수정] [삭제]          │
│ ├─ 히든       HIDDEN      ₩55/개    활성    [수정] [삭제]          │
│ └─ ...                                                              │
│                                                                     │
│ 길찾기 (3)                                           [펼치기/접기]  │
│ ├─ 홈런볼     HOMERUNBALL ₩100/개   활성    [수정] [삭제]          │
│ └─ ...                                                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### 단가 일괄 수정

```
┌─────────────────────────────────────────────────────────────────────┐
│ 단가 일괄 수정                                                 [X]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ 적용 대상: ☑ 트래픽 전체  ☐ 선택한 상품만                          │
│                                                                     │
│ 수정 방식: ○ 고정 금액  ● 비율 조정                                │
│                                                                     │
│ 조정 비율: [+10] % (인상)                                           │
│                                                                     │
│ 미리보기:                                                           │
│ ┌───────────┬──────────┬──────────┐                                │
│ │ 상품      │ 현재 단가│ 변경 단가│                                │
│ ├───────────┼──────────┼──────────┤                                │
│ │ 피닉스    │ ₩45     │ ₩50 (+5)│                                 │
│ │ 호올스    │ ₩50     │ ₩55 (+5)│                                 │
│ └───────────┴──────────┴──────────┘                                │
│                                                                     │
│                                    [취소]  [10개 상품 일괄 수정]    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. 발주(PurchaseOrder) 관리 고도화

### 3.1 현재 문제점 vs 개선 방향

| 현재 (As-Is) | 개선 (To-Be) |
|-------------|-------------|
| 매장별로 발주 생성 | 주간 일괄 발주 등록 |
| 상품 선택 복잡 | 상품별 수량만 입력 |
| 엑셀 수동 작성 | 시스템에서 발주서 자동 생성 |
| 개별 입금 확인 | 일괄 입금 처리 |

### 3.2 간편 발주 등록 (Quick Order Entry)

**기존 접수시트 스타일의 입력 UI:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 간편 발주 등록                                    2025년 12월 4주차         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ ┌─ 매장 선택 ─────────────────────────────────────────────────────────────┐│
│ │ [매장 검색...              🔍]  또는  [엑셀 업로드]                     ││
│ │                                                                         ││
│ │ 선택된 매장: 오월의꽃수저 신동카페거리점 (MID: 2064392403)              ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│ ┌─ 상품별 수량 입력 ──────────────────────────────────────────────────────┐│
│ │                                                                         ││
│ │  트래픽                              길찾기                              ││
│ │  ┌────────┬───────┐                  ┌────────┬───────┐                 ││
│ │  │ 피닉스 │ [   ] │                  │ 홈런볼 │ [100] │                 ││
│ │  │ 호올스 │ [   ] │                  │ 말차   │ [   ] │                 ││
│ │  │ 히든   │ [   ] │                  │ 버즈빌 │ [   ] │                 ││
│ │  │ 엑셀런트│ [300]│                  └────────┴───────┘                 ││
│ │  │ 토스   │ [   ] │                                                     ││
│ │  │ ...    │       │                  리뷰                                ││
│ │  └────────┴───────┘                  ┌────────┬───────┐                 ││
│ │                                      │ 겟     │ [  5] │                 ││
│ │                                      │ 추가   │ [   ] │                 ││
│ │                                      │ 247    │ [   ] │                 ││
│ │                                      └────────┴───────┘                 ││
│ │                                                                         ││
│ │  비고: [                                                              ] ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│ 예상 금액: ₩125,500 (트래픽 ₩90,000 + 길찾기 ₩10,000 + 리뷰 ₩25,500)     │
│                                                                             │
│                              [+ 다른 매장 추가]  [발주 등록]               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 주간 일괄 발주 업로드

**엑셀 양식 (접수시트 호환):**

| 필드 | 헤더 | 필수 | 설명 |
|------|------|------|------|
| 접수요일 | 접수요일 | ✅ | 월/화/수/목/금/토/일 |
| 날짜 | 날짜 | ✅ | YYYY-MM-DD |
| mid | mid | ✅ | 네이버 플레이스 MID |
| 매장명 | 매장명 | | 자동 조회 가능 |
| 플레이스url | 플레이스url | | 자동 생성 가능 |
| 피닉스 | 피닉스 | | 수량 (숫자) |
| 호올스 | 호올스 | | 수량 (숫자) |
| ... | ... | | 상품별 수량 |
| 입금확인 | 입금확인 | | ㅇ/X 또는 금액 |
| 비고 | 비고 | | 메모 |

**업로드 처리 플로우:**

```
엑셀 업로드
    ↓
1. 파싱 & 검증
   - MID 존재 여부 확인
   - 상품명 매핑 확인
   - 수량 숫자 검증
    ↓
2. 매장 자동 매칭/생성
   - 기존 매장: MID로 매칭
   - 신규 매장: 자동 생성 (확인 필요)
    ↓
3. 발주 생성
   - 상품별 PurchaseOrder 자동 생성
   - PurchaseOrderItem 생성
    ↓
4. 결과 리포트
   - 성공/실패 건수
   - 오류 상세 내역
```

### 3.4 발주 목록 UI 개선

**주간별 그룹화 뷰:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 발주 관리                                                               │
├─────────────────────────────────────────────────────────────────────────┤
│ [간편 발주] [엑셀 업로드] [엑셀 다운로드]           🔍 [검색...]        │
│                                                                         │
│ 기간: [2025-12-23] ~ [2025-12-29]  상품: [전체 ▼]  상태: [전체 ▼]      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ 📅 12월 4주차 (12/23~12/29)                    77건 | ₩3,250,000        │
│ ├─────────────────────────────────────────────────────────────────────┤ │
│ │ ☐ │ 날짜  │ 매장명              │ 상품    │ 수량 │ 금액    │ 상태  │ │
│ ├───┼───────┼─────────────────────┼─────────┼──────┼─────────┼───────┤ │
│ │ ☐ │ 12/24 │ 오월의꽃수저        │ 엑셀런트│ 300  │ ₩90,000 │ 확정  │ │
│ │ ☐ │ 12/24 │ 오월의꽃수저        │ 홈런볼  │ 100  │ ₩10,000 │ 확정  │ │
│ │ ☐ │ 12/24 │ 비빔상회            │ 히든    │ 300  │ ₩45,000 │ 대기  │ │
│ │ ☐ │ 12/25 │ 하이짐              │ 피닉스  │ 100  │ ₩15,000 │ 진행중│ │
│ │ ☐ │ 12/25 │ 하노이별            │ 히든    │ 150  │ ₩22,500 │ 완료  │ │
│ └───┴───────┴─────────────────────┴─────────┴──────┴─────────┴───────┘ │
│                                                                         │
│ 📅 12월 3주차 (12/16~12/22)                    85건 | ₩3,450,000        │
│ └─ [펼치기]                                                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**일괄 처리 툴바:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ✓ 5건 선택됨                                                            │
│                                                                         │
│ [상태 변경 ▼]  [일괄 확정]  [Google Sheet 전송]  [삭제]    [선택 해제] │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.5 발주 상세 페이지 개선

**탭 구조:**

| 탭 | 내용 |
|----|----|
| 기본정보 | 발주 정보, 매장 정보, 상품 정보 |
| 발주 항목 | PurchaseOrderItem 목록 |
| 작업 명세 | WorkStatement 연결 |
| 시트 전송 | Google Sheets 전송 이력 |
| 히스토리 | 상태 변경 이력 |

---

## 4. API 설계

### 4.1 상품 API

```typescript
// 기본 CRUD (구현 완료)
GET    /api/products              ✅
POST   /api/products              ✅
GET    /api/products/[id]         ✅
PUT    /api/products/[id]         ✅
DELETE /api/products/[id]         ✅

// 일괄 처리 (구현 필요)
PATCH  /api/products/bulk         ❌ → DATA_PATTERNS.md 4.2 스펙
GET    /api/products/template     ❌ → DATA_PATTERNS.md 4.5 스펙
POST   /api/products/import       ❌ → DATA_PATTERNS.md 4.3 스펙
GET    /api/products/export       ❌ → DATA_PATTERNS.md 4.4 스펙

// 상품 전용 API
PUT    /api/products/bulk-price   ❌ → 단가 일괄 수정
GET    /api/products/by-type      ❌ → 유형별 그룹화 조회
```

### 4.2 발주 API

```typescript
// 기본 CRUD (구현 완료)
GET    /api/purchase-orders              ✅
POST   /api/purchase-orders              ✅
GET    /api/purchase-orders/[id]         ✅
PUT    /api/purchase-orders/[id]         ✅
DELETE /api/purchase-orders/[id]         ✅

// 일괄 처리 (구현 필요)
PATCH  /api/purchase-orders/bulk         ❌ → DATA_PATTERNS.md 4.2 스펙
GET    /api/purchase-orders/template     ❌ → 접수시트 양식
POST   /api/purchase-orders/import       ❌ → 주간 일괄 업로드
GET    /api/purchase-orders/export       ❌ → DATA_PATTERNS.md 4.4 스펙

// 발주 전용 API
POST   /api/purchase-orders/quick        ❌ → 간편 발주 등록
GET    /api/purchase-orders/weekly       ❌ → 주간별 그룹화 조회
POST   /api/purchase-orders/[id]/confirm ❌ → 발주 확정
POST   /api/purchase-orders/[id]/sheet-export ❌ → Google Sheet 전송
```

### 4.3 간편 발주 API 스펙

```typescript
// POST /api/purchase-orders/quick
interface QuickOrderRequest {
  storeId: string;              // 매장 ID
  orderDate: string;            // 발주일 (YYYY-MM-DD)
  orderWeek: string;            // 주차 (예: "2025-W52")
  items: QuickOrderItem[];
  memo?: string;
}

interface QuickOrderItem {
  productCode: string;          // 상품 코드 (예: "PHOENIX")
  quantity: number;             // 수량
}

// Response
interface QuickOrderResponse {
  success: boolean;
  purchaseOrders: {
    id: string;
    purchaseOrderNo: string;
    channel: string;
    totalQty: number;
    totalAmount: number;
  }[];
  totalAmount: number;
}
```

### 4.4 주간 일괄 업로드 API 스펙

```typescript
// POST /api/purchase-orders/import
interface WeeklyImportRequest {
  orderWeek: string;            // 주차 (예: "2025-W52")
  data: WeeklyOrderRow[];
  options: {
    createNewStores: boolean;   // 신규 매장 자동 생성
    skipErrors: boolean;        // 오류 건너뛰기
    updateExisting: boolean;    // 기존 발주 업데이트
  };
}

interface WeeklyOrderRow {
  orderDay: string;             // 접수요일
  orderDate: string;            // 날짜
  mid: string;                  // 네이버 MID
  storeName?: string;           // 매장명
  placeUrl?: string;            // 플레이스 URL
  products: Record<string, number>;  // 상품별 수량
  paymentConfirmed?: boolean;   // 입금확인
  memo?: string;                // 비고
}

// Response
interface WeeklyImportResponse {
  success: boolean;
  summary: {
    total: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  errors: ImportError[];
  createdPurchaseOrders: string[];
}
```

---

## 5. 파일 구조

```
app/src/app/(dashboard)/products/
├── page.tsx                      # 목록 (유형별 그룹화)
├── new/
│   └── page.tsx                  # 신규 등록
├── [id]/
│   └── page.tsx                  # 상세/수정
└── components/
    ├── product-type-tabs.tsx     # 유형별 탭
    ├── bulk-price-dialog.tsx     # 단가 일괄 수정

app/src/app/(dashboard)/purchase-orders/
├── page.tsx                      # 목록 (주간 그룹화)
├── new/
│   └── page.tsx                  # 신규 등록
├── quick/
│   └── page.tsx                  # 간편 발주
├── [id]/
│   └── page.tsx                  # 상세 (탭 구조)
└── components/
    ├── weekly-group.tsx          # 주간 그룹 컴포넌트
    ├── quick-order-form.tsx      # 간편 발주 폼
    ├── product-quantity-grid.tsx # 상품별 수량 입력 그리드
    ├── sheet-export-dialog.tsx   # Google Sheet 전송
    └── import-preview.tsx        # 업로드 미리보기

app/src/app/api/purchase-orders/
├── route.ts                      # GET, POST
├── [id]/
│   ├── route.ts                  # GET, PUT, DELETE
│   ├── confirm/
│   │   └── route.ts              # POST (확정)
│   └── sheet-export/
│       └── route.ts              # POST (시트 전송)
├── bulk/
│   └── route.ts                  # PATCH
├── quick/
│   └── route.ts                  # POST (간편 발주)
├── import/
│   └── route.ts                  # POST (일괄 업로드)
├── export/
│   └── route.ts                  # GET
├── template/
│   └── route.ts                  # GET (접수시트 양식)
└── weekly/
    └── route.ts                  # GET (주간 조회)
```

---

## 6. 구현 우선순위

### Phase 1: 기반 작업 (높음)

| # | 작업 | 설명 |
|---|------|------|
| 1-1 | 상품 마스터 데이터 등록 | 20개 상품(마케팅 서비스) 등록 |
| 1-2 | 상품 유형별 그룹화 UI | 탭 또는 섹션 구분 |
| 1-3 | 발주 주간 그룹화 UI | 주차별 펼침/접기 |

### Phase 2: 간편 발주 (높음)

| # | 작업 | 설명 |
|---|------|------|
| 2-1 | 간편 발주 폼 UI | 상품별 수량 그리드 |
| 2-2 | `/api/purchase-orders/quick` | 간편 발주 API |
| 2-3 | 금액 자동 계산 | 상품별 단가 적용 |

### Phase 3: 엑셀 일괄 처리 (중간)

| # | 작업 | 설명 |
|---|------|------|
| 3-1 | 접수시트 양식 템플릿 | 기존 양식 호환 |
| 3-2 | 주간 일괄 업로드 | 엑셀 → 발주 변환 |
| 3-3 | 발주 내보내기 | 접수시트 양식 |

### Phase 4: 단가/일괄 처리 (중간)

| # | 작업 | 설명 |
|---|------|------|
| 4-1 | 단가 일괄 수정 | 비율/고정 금액 |
| 4-2 | 발주 일괄 확정 | 상태 일괄 변경 |
| 4-3 | 발주 일괄 삭제 | 제약조건 체크 |

---

## 7. 체크리스트

### 상품 관리

- [ ] 상품 마스터 데이터 등록 (20개 마케팅 서비스)
- [ ] 상품 유형 확장 (RECEIPT 추가)
- [ ] 유형별 그룹화 뷰
- [ ] 단가 일괄 수정 기능
- [ ] 엑셀 업로드/다운로드 (DATA_PATTERNS 적용)

### 발주 관리

- [ ] 주간 그룹화 뷰
- [ ] 간편 발주 폼 (상품별 수량 입력)
- [ ] 접수시트 양식 템플릿
- [ ] 주간 일괄 업로드
- [ ] 발주 일괄 확정/삭제
- [ ] Google Sheet 전송 기능

---

## 8. 참고 자료

### 분석 데이터

- `Data/251226_12월 4주_접수시트.xlsx` - 실제 운영 접수시트

### 관련 문서

- `docs/progress/DATA_PATTERNS.md` - 엑셀/일괄처리 공통 패턴
- `docs/progress/COMMON_COMPONENTS.md` - 공용 컴포넌트 API
- `app/prisma/schema.prisma` - DB 스키마

---

**작성자**: Claude Opus 4.5
**문서 버전**: 1.0
