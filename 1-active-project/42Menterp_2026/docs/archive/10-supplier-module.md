# 10. 거래처 관리 모듈 상세 설계

> Supplier Management Module - 광고대행업 원가 관리의 핵심

## 1. 개요

### 1.1 모듈 목적

거래처(Supplier)는 광고대행 서비스를 실제로 수행하는 외부 파트너입니다.
- 블로그 마케팅 업체
- 리뷰 대행 업체
- 광고 제작 업체
- 프리랜서 등

**이 모듈이 없으면 원가 파악이 불가능 → 손익 계산 불가**

### 1.2 핵심 기능

| 기능 | 설명 |
|------|------|
| 거래처 등록 | 업체 정보, 담당자, 계좌 등록 |
| 서비스 유형 관리 | 거래처별 취급 서비스 분류 |
| 매입 단가 관리 | 거래처별 상품 단가 설정 |
| 발주 이력 | 거래처별 발주 내역 조회 |
| 정산 현황 | 미지급금, 지급 이력 |

---

## 2. 데이터 모델

### 2.1 Supplier (거래처)

```prisma
model Supplier {
  id             Int       @id @default(autoincrement())
  
  // 기본 정보
  name           String                    // 거래처명 (필수)
  businessNumber String?   @unique         // 사업자등록번호
  ceoName        String?                   // 대표자명
  
  // 연락처
  contactName    String?                   // 담당자명
  phone          String?                   // 전화번호
  mobile         String?                   // 휴대폰
  email          String?                   // 이메일
  
  // 주소
  address        String?                   // 사업장 주소
  
  // 서비스 정보
  serviceTypes   String?                   // JSON: ["블로그", "리뷰", "광고"]
  website        String?                   // 웹사이트/포트폴리오
  
  // 결제 정보
  paymentTerms   String?                   // 결제 조건 (선결제, 후결제, D+7 등)
  bankName       String?                   // 은행명
  bankAccount    String?                   // 계좌번호
  accountHolder  String?                   // 예금주
  
  // 평가/메모
  rating         Int?                      // 평점 (1-5)
  notes          String?                   // 비고
  
  // 상태
  isActive       Boolean   @default(true)
  
  // 타임스탬프
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // 관계
  products        SupplierProduct[]
  purchaseOrders  PurchaseOrder[]

  @@index([name])
  @@index([businessNumber])
  @@index([isActive])
}
```

### 2.2 SupplierProduct (거래처별 상품 단가)

```prisma
model SupplierProduct {
  id            Int       @id @default(autoincrement())
  supplierId    Int
  productId     Int
  
  // 가격 정보
  supplierPrice Decimal                    // 매입가 (거래처 단가)
  minOrderQty   Int?      @default(1)      // 최소 주문량
  
  // 리드타임
  leadTimeDays  Int?                       // 작업 소요일
  
  // 우선순위
  isPreferred   Boolean   @default(false)  // 우선 거래처 여부
  
  // 유효기간
  validFrom     DateTime?                  // 유효 시작일
  validUntil    DateTime?                  // 유효 종료일
  
  // 메모
  notes         String?
  
  // 타임스탬프
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // 관계
  supplier    Supplier  @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  product     Product   @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([supplierId, productId])
  @@index([supplierId])
  @@index([productId])
  @@index([isPreferred])
}
```

---

## 3. API 설계

### 3.1 거래처 CRUD

#### GET /api/suppliers
거래처 목록 조회

**Query Parameters:**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| search | string | 이름/사업자번호 검색 |
| serviceType | string | 서비스 유형 필터 |
| isActive | boolean | 활성 상태 필터 |
| page | number | 페이지 번호 |
| limit | number | 페이지당 개수 |

**Response:**
```json
{
  "success": true,
  "data": {
    "suppliers": [
      {
        "id": 1,
        "name": "블로그마케팅A사",
        "businessNumber": "123-45-67890",
        "contactName": "김담당",
        "phone": "02-1234-5678",
        "serviceTypes": ["블로그", "체험단"],
        "paymentTerms": "작업완료 후 7일",
        "isActive": true,
        "_count": {
          "purchaseOrders": 15
        }
      }
    ],
    "pagination": {
      "total": 25,
      "page": 1,
      "limit": 20,
      "totalPages": 2
    }
  }
}
```

#### POST /api/suppliers
거래처 생성

**Request Body:**
```json
{
  "name": "블로그마케팅A사",
  "businessNumber": "123-45-67890",
  "contactName": "김담당",
  "phone": "02-1234-5678",
  "email": "contact@blogmarketing.com",
  "serviceTypes": ["블로그", "체험단"],
  "paymentTerms": "작업완료 후 7일",
  "bankName": "국민은행",
  "bankAccount": "123-456-789012",
  "accountHolder": "블로그마케팅A사"
}
```

#### GET /api/suppliers/[id]
거래처 상세 조회

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "블로그마케팅A사",
    "businessNumber": "123-45-67890",
    "contactName": "김담당",
    "phone": "02-1234-5678",
    "email": "contact@blogmarketing.com",
    "serviceTypes": ["블로그", "체험단"],
    "paymentTerms": "작업완료 후 7일",
    "bankName": "국민은행",
    "bankAccount": "123-456-789012",
    "accountHolder": "블로그마케팅A사",
    "rating": 4,
    "isActive": true,
    "products": [
      {
        "id": 1,
        "product": { "id": 1, "name": "파워블로거 포스팅" },
        "supplierPrice": 30000,
        "leadTimeDays": 3,
        "isPreferred": true
      }
    ],
    "recentOrders": [
      {
        "id": 1,
        "poNumber": "PO-202601-0001",
        "totalAmount": 300000,
        "status": "completed"
      }
    ],
    "stats": {
      "totalOrders": 15,
      "totalAmount": 4500000,
      "avgLeadTime": 3.2
    }
  }
}
```

#### PUT /api/suppliers/[id]
거래처 수정

#### DELETE /api/suppliers/[id]
거래처 삭제 (soft delete - isActive = false)

---

### 3.2 거래처별 상품 단가 API

#### GET /api/suppliers/[id]/products
거래처의 취급 상품 목록

#### POST /api/suppliers/[id]/products
거래처에 상품 단가 추가

**Request Body:**
```json
{
  "productId": 1,
  "supplierPrice": 30000,
  "leadTimeDays": 3,
  "minOrderQty": 1,
  "isPreferred": true
}
```

#### PUT /api/suppliers/[id]/products/[productId]
상품 단가 수정

#### DELETE /api/suppliers/[id]/products/[productId]
상품 단가 삭제

---

### 3.3 상품별 거래처 조회 API

#### GET /api/products/[id]/suppliers
특정 상품을 취급하는 거래처 목록 (가격 비교)

**Response:**
```json
{
  "success": true,
  "data": {
    "product": {
      "id": 1,
      "name": "파워블로거 포스팅",
      "unitPrice": 50000
    },
    "suppliers": [
      {
        "supplier": { "id": 1, "name": "A업체" },
        "supplierPrice": 30000,
        "leadTimeDays": 3,
        "isPreferred": true,
        "margin": 20000,
        "marginRate": 40
      },
      {
        "supplier": { "id": 2, "name": "B업체" },
        "supplierPrice": 25000,
        "leadTimeDays": 5,
        "isPreferred": false,
        "margin": 25000,
        "marginRate": 50
      }
    ]
  }
}
```

---

## 4. UI 설계

### 4.1 거래처 목록 페이지 `/suppliers`

```
┌─────────────────────────────────────────────────────────────────┐
│  거래처 관리                                    [+ 거래처 추가]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [검색: ____________] [서비스: 전체 ▼] [상태: 활성 ▼] [검색]   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ □ │ 거래처명      │ 서비스유형  │ 담당자  │ 발주건수 │ 상태 │
│  ├───┼───────────────┼────────────┼────────┼─────────┼──────┤   │
│  │ □ │ 블로그마케팅A │ 블로그,체험 │ 김담당 │   15건  │ 활성 │   │
│  │ □ │ 리뷰대행B사   │ 리뷰       │ 이담당 │   23건  │ 활성 │   │
│  │ □ │ 광고제작C     │ 디자인     │ 박담당 │    8건  │ 비활성│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  < 1 2 3 ... >                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 거래처 상세 페이지 `/suppliers/[id]`

```
┌─────────────────────────────────────────────────────────────────┐
│  ← 거래처 목록                        [수정] [비활성화] [삭제]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  블로그마케팅A사                                    ⭐⭐⭐⭐☆   │
│  ─────────────────                                              │
│  사업자번호: 123-45-67890                                       │
│  담당자: 김담당 | 02-1234-5678 | contact@blogmarketing.com      │
│  서비스: 블로그, 체험단                                         │
│  결제조건: 작업완료 후 7일                                      │
│  계좌: 국민은행 123-456-789012 (블로그마케팅A사)                │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  [취급 상품]  [발주 내역]  [통계]                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  취급 상품 (3)                                    [+ 상품 추가] │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 상품명           │ 매입가   │ 판매가  │ 마진  │ 리드타임 │   │
│  ├──────────────────┼─────────┼────────┼──────┼─────────┤   │
│  │ 파워블로거 포스팅 │ ₩30,000 │ ₩50,000│ 40%  │   3일    │   │
│  │ 체험단 리뷰      │ ₩15,000 │ ₩25,000│ 40%  │   5일    │   │
│  │ 블로그 배너광고  │ ₩100,000│ ₩150,000│ 33% │   1일    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 거래처 등록/수정 폼

```
┌─────────────────────────────────────────────────────────────────┐
│  거래처 등록                                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [기본 정보]                                                    │
│  거래처명 *     [                              ]                │
│  사업자번호     [              ] [중복확인]                     │
│  대표자명       [                              ]                │
│                                                                 │
│  [담당자 정보]                                                  │
│  담당자명       [                              ]                │
│  전화번호       [                              ]                │
│  휴대폰         [                              ]                │
│  이메일         [                              ]                │
│                                                                 │
│  [서비스 정보]                                                  │
│  서비스 유형    [✓블로그] [✓리뷰] [□광고] [□디자인] [□기타]    │
│  웹사이트       [                              ]                │
│                                                                 │
│  [결제 정보]                                                    │
│  결제 조건      [선결제 ▼]                                      │
│  은행명         [국민은행 ▼]                                    │
│  계좌번호       [                              ]                │
│  예금주         [                              ]                │
│                                                                 │
│  [기타]                                                         │
│  평점           [★★★★☆]                                      │
│  비고           [                              ]                │
│                                                                 │
│                              [취소]  [저장]                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. 비즈니스 로직

### 5.1 서비스 유형 분류

```typescript
const SERVICE_TYPES = [
  { value: 'blog', label: '블로그' },
  { value: 'review', label: '리뷰' },
  { value: 'traffic', label: '트래픽' },
  { value: 'save', label: '저장' },
  { value: 'ad', label: '광고' },
  { value: 'design', label: '디자인' },
  { value: 'seo', label: 'SEO' },
  { value: 'other', label: '기타' },
];
```

### 5.2 결제 조건 분류

```typescript
const PAYMENT_TERMS = [
  { value: 'prepaid', label: '선결제' },
  { value: 'cod', label: '작업완료시' },
  { value: 'd7', label: '작업완료 후 7일' },
  { value: 'd15', label: '작업완료 후 15일' },
  { value: 'd30', label: '작업완료 후 30일' },
  { value: 'monthly', label: '월말 정산' },
  { value: 'custom', label: '협의' },
];
```

### 5.3 최적 거래처 선정 로직

발주 생성 시 자동으로 최적 거래처 추천:

```typescript
function findBestSupplier(productId: number, criteria: 'price' | 'time' | 'preferred') {
  const suppliers = await getSuppliersByProduct(productId);
  
  switch (criteria) {
    case 'price':
      // 가장 저렴한 거래처
      return suppliers.sort((a, b) => a.supplierPrice - b.supplierPrice)[0];
    
    case 'time':
      // 가장 빠른 거래처
      return suppliers.sort((a, b) => a.leadTimeDays - b.leadTimeDays)[0];
    
    case 'preferred':
    default:
      // 우선 거래처 > 가격 순
      return suppliers
        .sort((a, b) => {
          if (a.isPreferred !== b.isPreferred) return b.isPreferred ? 1 : -1;
          return a.supplierPrice - b.supplierPrice;
        })[0];
  }
}
```

### 5.4 마진 계산

```typescript
function calculateMargin(productId: number, supplierId: number) {
  const product = await getProduct(productId);
  const supplierProduct = await getSupplierProduct(supplierId, productId);
  
  const sellingPrice = product.unitPrice;
  const costPrice = supplierProduct.supplierPrice;
  const margin = sellingPrice - costPrice;
  const marginRate = (margin / sellingPrice) * 100;
  
  return { margin, marginRate };
}
```

---

## 6. 연동 포인트

### 6.1 구매발주 모듈과 연동

- 발주 생성 시 거래처 선택
- 거래처별 매입 단가 자동 적용
- 거래처별 발주 내역 조회

### 6.2 손익분석 모듈과 연동

- 거래처별 총 지출액 집계
- 거래처별 평균 마진율 계산

### 6.3 정산 모듈과 연동 (향후)

- 거래처별 미지급금 현황
- 지급 예정 스케줄

---

## 7. 구현 우선순위

### Phase 1 (필수)
1. [ ] Supplier CRUD API
2. [ ] SupplierProduct CRUD API
3. [ ] 거래처 목록/상세 페이지
4. [ ] 거래처 등록/수정 폼

### Phase 2 (권장)
5. [ ] 상품별 거래처 비교 기능
6. [ ] 최적 거래처 추천 기능
7. [ ] 거래처 평점/리뷰 시스템

### Phase 3 (선택)
8. [ ] 거래처 정산 관리
9. [ ] 거래처 포털 (외부 접근)

---

## 변경 이력

| 버전 | 날짜 | 변경 내역 | 작성자 |
|------|------|----------|--------|
| 1.0 | 2026-01-05 | 초안 작성 | AI Assistant |


