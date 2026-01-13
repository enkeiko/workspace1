# 14. 고객별 단가 관리 모듈 상세 설계

> Customer Pricing Module - 가격 정책 관리

## 1. 개요

### 1.1 모듈 목적

고객별 특별 단가는 **VIP 고객, 대량 거래 고객에게 차별화된 가격**을 적용하는 기능입니다.

```
일반 고객:     기본가 50,000원
VIP 고객:      특별가 45,000원 (10% 할인)
대량 계약 고객: 특별가 40,000원 (20% 할인)
```

### 1.2 핵심 기능

| 기능 | 설명 |
|------|------|
| 고객별 단가 설정 | 특정 고객에게 상품별 특별가 적용 |
| 유효기간 관리 | 계약 기간에 따른 단가 유효기간 |
| 자동 적용 | 견적/주문 생성 시 특별가 자동 적용 |
| 이력 관리 | 단가 변경 이력 추적 |

---

## 2. 데이터 모델

### 2.1 CustomerProductPrice (고객별 상품 단가)

```prisma
model CustomerProductPrice {
  id          Int       @id @default(autoincrement())
  customerId  Int
  productId   Int
  
  // 가격 정보
  customPrice Decimal                    // 특별 단가
  discountRate Decimal?                  // 할인율 % (참고용)
  
  // 유효기간
  validFrom   DateTime?                  // 시작일 (null = 즉시)
  validUntil  DateTime?                  // 종료일 (null = 무기한)
  
  // 조건
  minQuantity Int?                       // 최소 수량 조건
  
  // 메모
  notes       String?                    // 적용 사유 등
  
  // 타임스탬프
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // 관계
  customer    Customer  @relation(fields: [customerId], references: [id], onDelete: Cascade)
  product     Product   @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([customerId, productId])
  @@index([customerId])
  @@index([productId])
  @@index([validFrom])
  @@index([validUntil])
}
```

### 2.2 단가 적용 우선순위

```
┌─────────────────────────────────────────────────────────────┐
│                    단가 적용 우선순위                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1순위: CustomerProductPrice (고객별 특별가)                │
│         - 해당 고객 + 해당 상품 조합이 있고                  │
│         - 현재 날짜가 유효기간 내이면                        │
│         → customPrice 적용                                  │
│                                                             │
│  2순위: Product.unitPrice (기본 판매가)                     │
│         - 특별가가 없거나 유효기간 외이면                    │
│         → unitPrice 적용                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. API 설계

### 3.1 고객별 단가 CRUD

#### GET /api/customers/[customerId]/prices
특정 고객의 특별 단가 목록

**Response:**
```json
{
  "success": true,
  "data": {
    "customer": {
      "id": 1,
      "name": "VIP 고객사"
    },
    "prices": [
      {
        "id": 1,
        "product": {
          "id": 1,
          "name": "파워블로거 포스팅",
          "unitPrice": 50000
        },
        "customPrice": 45000,
        "discountRate": 10,
        "validFrom": "2026-01-01",
        "validUntil": "2026-12-31",
        "isActive": true,
        "notes": "연간 계약 할인"
      }
    ],
    "summary": {
      "totalProducts": 5,
      "avgDiscountRate": 12.5
    }
  }
}
```

#### POST /api/customers/[customerId]/prices
특별 단가 추가

**Request Body:**
```json
{
  "productId": 1,
  "customPrice": 45000,
  "validFrom": "2026-01-01",
  "validUntil": "2026-12-31",
  "minQuantity": 1,
  "notes": "연간 계약 할인 (10%)"
}
```

#### PUT /api/customers/[customerId]/prices/[priceId]
특별 단가 수정

#### DELETE /api/customers/[customerId]/prices/[priceId]
특별 단가 삭제

---

### 3.2 상품별 고객 단가 조회

#### GET /api/products/[productId]/customer-prices
특정 상품의 고객별 단가 목록

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
    "customerPrices": [
      {
        "customer": { "id": 1, "name": "A고객" },
        "customPrice": 45000,
        "discountRate": 10,
        "isActive": true
      },
      {
        "customer": { "id": 2, "name": "B고객" },
        "customPrice": 40000,
        "discountRate": 20,
        "isActive": true
      }
    ]
  }
}
```

---

### 3.3 단가 조회 유틸 API

#### GET /api/pricing/lookup
특정 고객-상품의 적용 단가 조회

**Query Parameters:**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| customerId | number | 고객 ID |
| productId | number | 상품 ID |
| quantity | number | 수량 (선택) |
| date | string | 적용일 (선택, 기본: 오늘) |

**Response:**
```json
{
  "success": true,
  "data": {
    "customer": { "id": 1, "name": "VIP 고객사" },
    "product": { "id": 1, "name": "파워블로거 포스팅" },
    "pricing": {
      "basePrice": 50000,
      "appliedPrice": 45000,
      "discountAmount": 5000,
      "discountRate": 10,
      "priceType": "customer_special",
      "source": {
        "id": 1,
        "validUntil": "2026-12-31"
      }
    }
  }
}
```

---

### 3.4 일괄 단가 설정 API

#### POST /api/customers/[customerId]/prices/bulk
여러 상품 단가 일괄 설정

**Request Body:**
```json
{
  "prices": [
    { "productId": 1, "customPrice": 45000 },
    { "productId": 2, "customPrice": 22000 },
    { "productId": 3, "customPrice": 90000 }
  ],
  "validFrom": "2026-01-01",
  "validUntil": "2026-12-31",
  "notes": "2026년 연간 계약"
}
```

---

## 4. UI 설계

### 4.1 고객 상세 - 특별 단가 섹션

```
┌─────────────────────────────────────────────────────────────────┐
│  💰 특별 단가 (5개 상품)                       [+ 단가 추가]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ 상품명           │ 기본가  │ 특별가  │ 할인 │ 유효기간   │액션││
│  ├──────────────────┼────────┼────────┼─────┼──────────┼────┤│
│  │ 파워블로거 포스팅 │₩50,000│₩45,000│ 10% │~2026.12.31│[✏️]││
│  │ 체험단 리뷰      │₩25,000│₩22,000│ 12% │~2026.12.31│[✏️]││
│  │ 트래픽 50타      │₩55,000│₩50,000│  9% │~2026.12.31│[✏️]││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  평균 할인율: 10.3%                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 특별 단가 설정 모달

```
┌─────────────────────────────────────────────────────────────────┐
│  특별 단가 설정                                          [X]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  고객: VIP 고객사                                               │
│  상품: 파워블로거 포스팅                                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 기본 판매가:     ₩50,000                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  특별 단가 *   [45,000        ]                                 │
│                                                                 │
│  할인율:       10% (₩5,000 할인)                               │
│                                                                 │
│  유효기간      [2026-01-01] ~ [2026-12-31]                     │
│               ☐ 무기한 적용                                     │
│                                                                 │
│  최소 수량     [         ] (선택, 비워두면 제한 없음)           │
│                                                                 │
│  적용 사유     [연간 계약 할인 (10%)                     ]      │
│                                                                 │
│                              [취소]  [저장]                     │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 견적서 작성 시 단가 적용 UI

```
┌─────────────────────────────────────────────────────────────────┐
│  견적서 항목                                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  고객: VIP 고객사 ✨ (특별 단가 적용 대상)                       │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ 상품 선택: [파워블로거 포스팅 ▼]                           ││
│  │                                                            ││
│  │ 기본가: ₩50,000  →  적용가: ₩45,000 💰 10% 할인           ││
│  │                                                            ││
│  │ 수량: [5    ]                                              ││
│  │                                                            ││
│  │ 금액: ₩225,000 (정가 대비 ₩25,000 절약)                   ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 단가 비교 팝업

```
┌─────────────────────────────────────────────────────────────────┐
│  파워블로거 포스팅 - 고객별 단가 현황                    [X]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  기본 판매가: ₩50,000                                          │
│                                                                 │
│  고객별 특별 단가:                                              │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ 고객명        │ 특별가   │ 할인율 │ 유효기간    │ 상태    ││
│  ├───────────────┼─────────┼───────┼────────────┼────────┤│
│  │ A고객 (VIP)  │ ₩40,000 │  20%  │ ~2026.12   │ 🟢 활성 ││
│  │ B고객        │ ₩45,000 │  10%  │ ~2026.06   │ 🟢 활성 ││
│  │ C고객        │ ₩47,500 │   5%  │ ~2026.03   │ 🟡 임박 ││
│  │ D고객        │ ₩48,000 │   4%  │ 만료       │ 🔴 만료 ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  통계:                                                          │
│  - 특별 단가 고객: 4개사                                        │
│  - 평균 할인율: 9.75%                                           │
│  - 평균 특별가: ₩45,125                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. 비즈니스 로직

### 5.1 적용 단가 조회

```typescript
interface AppliedPrice {
  basePrice: number;
  appliedPrice: number;
  discountAmount: number;
  discountRate: number;
  priceType: 'base' | 'customer_special';
  source?: CustomerProductPrice;
}

async function getAppliedPrice(
  customerId: number,
  productId: number,
  quantity: number = 1,
  date: Date = new Date()
): Promise<AppliedPrice> {
  // 1. 기본 상품 정보 조회
  const product = await prisma.product.findUnique({
    where: { id: productId }
  });
  
  if (!product) {
    throw new Error('상품을 찾을 수 없습니다.');
  }
  
  const basePrice = Number(product.unitPrice);
  
  // 2. 고객 특별 단가 조회
  const customerPrice = await prisma.customerProductPrice.findUnique({
    where: {
      customerId_productId: { customerId, productId }
    }
  });
  
  // 3. 특별 단가 유효성 검사
  if (customerPrice) {
    const isValidDate = 
      (!customerPrice.validFrom || customerPrice.validFrom <= date) &&
      (!customerPrice.validUntil || customerPrice.validUntil >= date);
    
    const isValidQuantity = 
      !customerPrice.minQuantity || quantity >= customerPrice.minQuantity;
    
    if (isValidDate && isValidQuantity) {
      const appliedPrice = Number(customerPrice.customPrice);
      const discountAmount = basePrice - appliedPrice;
      const discountRate = (discountAmount / basePrice) * 100;
      
      return {
        basePrice,
        appliedPrice,
        discountAmount,
        discountRate: Math.round(discountRate * 100) / 100,
        priceType: 'customer_special',
        source: customerPrice
      };
    }
  }
  
  // 4. 특별 단가 없으면 기본가 반환
  return {
    basePrice,
    appliedPrice: basePrice,
    discountAmount: 0,
    discountRate: 0,
    priceType: 'base'
  };
}
```

### 5.2 견적/주문 생성 시 자동 적용

```typescript
async function applyCustomerPricing(
  customerId: number,
  items: Array<{ productId: number; quantity: number }>
): Promise<Array<{ productId: number; quantity: number; unitPrice: number; priceInfo: AppliedPrice }>> {
  const pricedItems = await Promise.all(
    items.map(async (item) => {
      const priceInfo = await getAppliedPrice(
        customerId,
        item.productId,
        item.quantity
      );
      
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: priceInfo.appliedPrice,
        priceInfo
      };
    })
  );
  
  return pricedItems;
}

// 견적서 생성 시 사용 예시
async function createQuotationWithPricing(
  customerId: number,
  storeId: number,
  items: Array<{ productId: number; quantity: number }>
) {
  const pricedItems = await applyCustomerPricing(customerId, items);
  
  const totalAmount = pricedItems.reduce(
    (sum, item) => sum + (item.unitPrice * item.quantity),
    0
  );
  
  return prisma.quotation.create({
    data: {
      customerId,
      storeId,
      quotationNumber: await generateQuotationNumber(),
      quotationDate: new Date(),
      totalAmount,
      items: {
        create: pricedItems.map(item => ({
          productId: item.productId,
          productName: item.priceInfo.source?.product?.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity
        }))
      }
    }
  });
}
```

### 5.3 할인율 자동 계산

```typescript
function calculateDiscountRate(basePrice: number, customPrice: number): number {
  if (basePrice <= 0) return 0;
  const rate = ((basePrice - customPrice) / basePrice) * 100;
  return Math.round(rate * 100) / 100;
}

// 특별 단가 저장 시 할인율 자동 계산
async function saveCustomerPrice(
  customerId: number,
  productId: number,
  customPrice: number,
  validFrom?: Date,
  validUntil?: Date,
  notes?: string
) {
  const product = await prisma.product.findUnique({
    where: { id: productId }
  });
  
  const discountRate = calculateDiscountRate(
    Number(product.unitPrice),
    customPrice
  );
  
  return prisma.customerProductPrice.upsert({
    where: {
      customerId_productId: { customerId, productId }
    },
    update: {
      customPrice,
      discountRate,
      validFrom,
      validUntil,
      notes
    },
    create: {
      customerId,
      productId,
      customPrice,
      discountRate,
      validFrom,
      validUntil,
      notes
    }
  });
}
```

### 5.4 만료 임박/만료 알림

```typescript
async function getExpiringPrices(daysAhead: number = 30) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  
  return prisma.customerProductPrice.findMany({
    where: {
      validUntil: {
        gte: now,
        lte: futureDate
      }
    },
    include: {
      customer: true,
      product: true
    },
    orderBy: {
      validUntil: 'asc'
    }
  });
}

async function getExpiredPrices() {
  return prisma.customerProductPrice.findMany({
    where: {
      validUntil: {
        lt: new Date()
      }
    },
    include: {
      customer: true,
      product: true
    }
  });
}
```

---

## 6. 연동 포인트

### 6.1 견적(Quotation) 모듈

- 견적 항목 추가 시 고객 특별가 자동 적용
- 할인 적용 여부 시각적 표시

### 6.2 주문(Order) 모듈

- 주문 생성 시 고객 특별가 적용
- 견적 → 주문 전환 시 단가 유지

### 6.3 고객(Customer) 모듈

- 고객 상세에 특별 단가 섹션
- VIP 고객 표시

### 6.4 상품(Product) 모듈

- 상품별 고객 특별가 현황 조회

---

## 7. 구현 우선순위

### Phase 1 (필수)
1. [ ] CustomerProductPrice 모델 추가
2. [ ] 고객별 단가 CRUD API
3. [ ] 단가 조회 유틸 함수
4. [ ] 견적/주문 생성 시 자동 적용

### Phase 2 (권장)
5. [ ] 고객 상세 특별 단가 UI
6. [ ] 견적서 작성 시 할인 표시
7. [ ] 단가 비교 팝업
8. [ ] 일괄 단가 설정

### Phase 3 (선택)
9. [ ] 만료 임박 알림
10. [ ] 단가 변경 이력 (AuditLog 연동)
11. [ ] 가격 정책 템플릿 (등급별 할인율)

---

## 변경 이력

| 버전 | 날짜 | 변경 내역 | 작성자 |
|------|------|----------|--------|
| 1.0 | 2026-01-05 | 초안 작성 | AI Assistant |


