# 11. 구매발주 관리 모듈 상세 설계

> Purchase Order Management Module - 비용 추적의 핵심

## 1. 개요

### 1.1 모듈 목적

구매발주(PurchaseOrder)는 **고객 주문을 이행하기 위해 거래처에 발주하는 내역**입니다.

```
[고객] ──청구──→ [우리회사] ──발주──→ [거래처]
          매출                  비용
```

**이 모듈이 있어야 손익 계산이 가능합니다.**

### 1.2 핵심 기능

| 기능 | 설명 |
|------|------|
| 발주 생성 | 주문에서 발주 생성, 거래처 선택 |
| 상태 관리 | 초안 → 발송 → 진행중 → 완료 |
| 비용 추적 | 발주 금액 = 원가 |
| 다중 발주 | 1개 주문 → N개 발주 가능 |
| 작업 상세 | 키워드, URL 등 상세 정보 |

---

## 2. 데이터 모델

### 2.1 PurchaseOrder (구매발주)

```prisma
model PurchaseOrder {
  id            Int       @id @default(autoincrement())
  
  // 연결 정보
  orderId       Int?                       // 연결된 판매주문
  supplierId    Int                        // 거래처 (필수)
  storeId       Int?                       // 작업 대상 매장
  
  // 발주 정보
  poNumber      String    @unique          // 발주번호 (자동생성)
  poDate        DateTime                   // 발주일
  deliveryDate  DateTime?                  // 납기일 (예정)
  completedDate DateTime?                  // 완료일 (실제)
  
  // 금액
  subtotal      Decimal   @default(0)      // 공급가액
  taxAmount     Decimal   @default(0)      // 세액
  totalAmount   Decimal   @default(0)      // 합계 (비용)
  
  // 상태
  status        String    @default("draft")
  // draft: 초안
  // sent: 발송완료
  // confirmed: 거래처확인
  // in_progress: 작업중
  // completed: 완료
  // cancelled: 취소
  
  // 메모
  notes         String?
  internalNotes String?                    // 내부 메모 (거래처 미공개)
  
  // 타임스탬프
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // 관계
  order       Order?              @relation(fields: [orderId], references: [id], onDelete: SetNull)
  supplier    Supplier            @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  store       Store?              @relation(fields: [storeId], references: [id], onDelete: SetNull)
  items       PurchaseOrderItem[]

  @@index([orderId])
  @@index([supplierId])
  @@index([storeId])
  @@index([poNumber])
  @@index([poDate])
  @@index([status])
}
```

### 2.2 PurchaseOrderItem (발주 항목)

```prisma
model PurchaseOrderItem {
  id          Int       @id @default(autoincrement())
  poId        Int
  
  // 상품 정보
  productId   Int?
  productName String                      // 상품명 (스냅샷)
  productDesc String?                     // 상품 설명
  
  // 수량/가격
  quantity    Int       @default(1)
  unitPrice   Decimal                     // 매입 단가
  totalPrice  Decimal                     // 소계
  
  // 작업 상세 (광고대행 특화)
  workDetails String?                     // JSON: 작업 상세 정보
  
  // 진행 상태
  itemStatus  String    @default("pending")
  // pending: 대기
  // in_progress: 진행중
  // completed: 완료
  // cancelled: 취소
  
  completedAt DateTime?                   // 항목별 완료일
  
  // 메모
  notes       String?
  
  // 타임스탬프
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // 관계
  purchaseOrder PurchaseOrder @relation(fields: [poId], references: [id], onDelete: Cascade)
  product       Product?      @relation(fields: [productId], references: [id], onDelete: SetNull)

  @@index([poId])
  @@index([productId])
  @@index([itemStatus])
}
```

### 2.3 workDetails JSON 구조

```typescript
interface WorkDetails {
  // 공통
  deadline?: string;           // 작업 기한
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  
  // 블로그/리뷰 작업
  keywords?: string[];         // 타겟 키워드
  targetUrl?: string;          // 네이버 플레이스 URL
  blogUrl?: string;            // 작성된 블로그 URL
  reviewCount?: number;        // 리뷰 건수
  
  // 트래픽 작업
  dailyCount?: number;         // 일일 유입수
  totalDays?: number;          // 총 일수
  startDate?: string;          // 시작일
  endDate?: string;            // 종료일
  
  // 결과물
  deliverables?: {
    type: string;              // 'blog_post' | 'review' | 'report'
    url?: string;
    note?: string;
  }[];
}
```

---

## 3. API 설계

### 3.1 구매발주 CRUD

#### GET /api/purchase-orders
발주 목록 조회

**Query Parameters:**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| orderId | number | 주문 ID로 필터 |
| supplierId | number | 거래처 ID로 필터 |
| status | string | 상태 필터 |
| startDate | string | 발주일 시작 |
| endDate | string | 발주일 종료 |
| page | number | 페이지 번호 |
| limit | number | 페이지당 개수 |

**Response:**
```json
{
  "success": true,
  "data": {
    "purchaseOrders": [
      {
        "id": 1,
        "poNumber": "PO-202601-0001",
        "poDate": "2026-01-05",
        "status": "in_progress",
        "totalAmount": 300000,
        "supplier": {
          "id": 1,
          "name": "블로그마케팅A사"
        },
        "order": {
          "id": 1,
          "orderNumber": "ORD-202601-0001"
        },
        "store": {
          "id": 1,
          "name": "길동이네 치킨"
        },
        "_count": {
          "items": 3
        }
      }
    ],
    "pagination": { ... },
    "summary": {
      "totalAmount": 5000000,
      "byStatus": {
        "draft": 2,
        "sent": 3,
        "in_progress": 5,
        "completed": 10
      }
    }
  }
}
```

#### POST /api/purchase-orders
발주 생성

**Request Body:**
```json
{
  "orderId": 1,
  "supplierId": 1,
  "storeId": 1,
  "poDate": "2026-01-05",
  "deliveryDate": "2026-01-12",
  "items": [
    {
      "productId": 1,
      "productName": "파워블로거 포스팅",
      "quantity": 5,
      "unitPrice": 30000,
      "workDetails": {
        "keywords": ["강남 맛집", "서울 데이트"],
        "targetUrl": "https://place.naver.com/..."
      }
    }
  ],
  "notes": "1주일 내 완료 요청"
}
```

#### GET /api/purchase-orders/[id]
발주 상세 조회

#### PUT /api/purchase-orders/[id]
발주 수정

#### DELETE /api/purchase-orders/[id]
발주 삭제 (draft 상태만 가능)

---

### 3.2 상태 변경 API

#### PATCH /api/purchase-orders/[id]/status
발주 상태 변경

**Request Body:**
```json
{
  "status": "sent",
  "note": "거래처에 카카오톡으로 발송"
}
```

**상태 전이 규칙:**
```
draft → sent → confirmed → in_progress → completed
  ↓       ↓         ↓            ↓
cancelled cancelled cancelled   cancelled
```

---

### 3.3 주문에서 발주 생성 API

#### POST /api/orders/[id]/create-po
주문에서 구매발주 자동 생성

**Request Body:**
```json
{
  "supplierId": 1,
  "items": [1, 2, 3],  // OrderItem IDs (선택적, 없으면 전체)
  "deliveryDate": "2026-01-12"
}
```

**처리 로직:**
1. 주문 정보 조회
2. 선택된 OrderItem들을 PurchaseOrderItem으로 변환
3. 거래처별 매입 단가 적용 (SupplierProduct)
4. 발주번호 자동 생성
5. PurchaseOrder 생성

---

### 3.4 항목별 상태 업데이트 API

#### PATCH /api/purchase-orders/[id]/items/[itemId]/status
개별 항목 상태 변경

**Request Body:**
```json
{
  "itemStatus": "completed",
  "workDetails": {
    "blogUrl": "https://blog.naver.com/...",
    "deliverables": [
      { "type": "blog_post", "url": "https://..." }
    ]
  }
}
```

---

## 4. UI 설계

### 4.1 구매발주 목록 페이지 `/purchase-orders`

```
┌─────────────────────────────────────────────────────────────────┐
│  구매발주 관리                                   [+ 발주 추가]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [기간: 2026.01 ▼] [거래처: 전체 ▼] [상태: 전체 ▼] [검색]      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 상태 요약:  초안 2  │  발송 3  │  진행중 5  │  완료 10   │  │
│  │            총 발주금액: ₩5,000,000                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ □ │발주번호        │거래처      │주문번호    │금액    │상태 ││
│  ├───┼────────────────┼───────────┼───────────┼───────┼─────┤│
│  │ □ │PO-202601-0001 │블로그A사   │ORD-0001  │₩300K │진행중││
│  │ □ │PO-202601-0002 │리뷰B사    │ORD-0001  │₩200K │완료 ││
│  │ □ │PO-202601-0003 │트래픽C사   │ORD-0002  │₩500K │발송 ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  < 1 2 3 ... >                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 구매발주 상세 페이지 `/purchase-orders/[id]`

```
┌─────────────────────────────────────────────────────────────────┐
│  ← 목록                 PO-202601-0001          [수정] [삭제]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  상태: [🟡 진행중 ▼]                          [상태 변경 로그]  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 발주 정보                                                 │ │
│  │ ─────────────────────────────────────────────────────── │ │
│  │ 발주일: 2026-01-05      납기일: 2026-01-12               │ │
│  │ 거래처: 블로그마케팅A사   담당자: 김담당 (010-1234-5678)  │ │
│  │ 연결주문: ORD-202601-0001 (길동이네 치킨)                 │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  발주 항목 (3)                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ # │ 상품              │ 수량 │ 단가    │ 금액     │ 상태  │ │
│  ├───┼───────────────────┼─────┼────────┼─────────┼──────┤ │
│  │ 1 │ 파워블로거 포스팅  │  5  │ ₩30,000│ ₩150,000│ ✅완료│ │
│  │ 2 │ 체험단 리뷰       │  10 │ ₩15,000│ ₩150,000│ 🔄진행│ │
│  │ 3 │ 블로그 배너광고   │  1  │ ₩100,000│₩100,000│ ⏳대기│ │
│  ├───┴───────────────────┴─────┴────────┴─────────┴──────┤ │
│  │                               공급가액: ₩363,636       │ │
│  │                               부가세:   ₩36,364        │ │
│  │                               합계:     ₩400,000       │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [항목 1 상세] ──────────────────────────────                  │
│  키워드: 강남 맛집, 서울 데이트                                 │
│  타겟 URL: https://place.naver.com/...                         │
│  결과물:                                                       │
│  - https://blog.naver.com/abc/123 (2026-01-07)                 │
│  - https://blog.naver.com/def/456 (2026-01-08)                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 주문 상세에서 발주 생성

주문 상세 페이지 `/orders/[id]`에 발주 섹션 추가:

```
┌─────────────────────────────────────────────────────────────────┐
│  연결된 발주 (2)                              [+ 발주 생성]     │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────────┐│
│  │ PO-202601-0001 │ 블로그A사 │ ₩300,000 │ 진행중 │ [상세]  ││
│  │ PO-202601-0002 │ 리뷰B사   │ ₩200,000 │ 완료   │ [상세]  ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  📊 원가 요약                                                   │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ 매출 (주문 금액):     ₩1,000,000                          ││
│  │ 비용 (발주 합계):     ₩500,000                            ││
│  │ 이익:                 ₩500,000 (50%)                      ││
│  └────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. 비즈니스 로직

### 5.1 발주번호 자동 생성

```typescript
async function generatePONumber(): Promise<string> {
  const today = new Date();
  const prefix = `PO-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  // 해당 월의 마지막 발주번호 조회
  const lastPO = await prisma.purchaseOrder.findFirst({
    where: { poNumber: { startsWith: prefix } },
    orderBy: { poNumber: 'desc' }
  });
  
  let sequence = 1;
  if (lastPO) {
    const lastSeq = parseInt(lastPO.poNumber.split('-')[2]);
    sequence = lastSeq + 1;
  }
  
  return `${prefix}-${String(sequence).padStart(4, '0')}`;
  // 예: PO-202601-0001
}
```

### 5.2 주문 → 발주 변환 로직

```typescript
async function createPOFromOrder(
  orderId: number,
  supplierId: number,
  itemIds?: number[]
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true }
  });
  
  // 선택된 항목만 또는 전체
  const orderItems = itemIds 
    ? order.items.filter(i => itemIds.includes(i.id))
    : order.items;
  
  // 거래처별 매입 단가 조회
  const supplierProducts = await prisma.supplierProduct.findMany({
    where: { 
      supplierId,
      productId: { in: orderItems.map(i => i.productId).filter(Boolean) }
    }
  });
  
  const spMap = new Map(supplierProducts.map(sp => [sp.productId, sp]));
  
  // 발주 항목 변환
  const poItems = orderItems.map(item => {
    const sp = spMap.get(item.productId);
    const unitPrice = sp?.supplierPrice || item.unitPrice; // 매입가 우선, 없으면 판매가
    
    return {
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice,
      totalPrice: unitPrice * item.quantity,
      workDetails: JSON.stringify({
        startDate: item.startDate,
        endDate: item.endDate,
        dailyCount: item.dailyCount
      })
    };
  });
  
  // 합계 계산
  const subtotal = poItems.reduce((sum, i) => sum + i.totalPrice, 0);
  const taxAmount = Math.round(subtotal * 0.1);
  const totalAmount = subtotal + taxAmount;
  
  // 발주 생성
  return prisma.purchaseOrder.create({
    data: {
      poNumber: await generatePONumber(),
      orderId,
      supplierId,
      storeId: order.storeId,
      poDate: new Date(),
      subtotal,
      taxAmount,
      totalAmount,
      status: 'draft',
      items: { create: poItems }
    }
  });
}
```

### 5.3 상태 변경 시 자동 처리

```typescript
async function updatePOStatus(poId: number, newStatus: string) {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
  
  // 상태 전이 검증
  const validTransitions = {
    draft: ['sent', 'cancelled'],
    sent: ['confirmed', 'cancelled'],
    confirmed: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'cancelled'],
    completed: [],
    cancelled: []
  };
  
  if (!validTransitions[po.status].includes(newStatus)) {
    throw new Error(`Invalid status transition: ${po.status} → ${newStatus}`);
  }
  
  const updateData: any = { status: newStatus };
  
  // 완료 시 완료일 기록
  if (newStatus === 'completed') {
    updateData.completedDate = new Date();
    
    // 손익분석 재계산 트리거
    if (po.orderId) {
      await recalculateProfitAnalysis(po.orderId);
    }
  }
  
  return prisma.purchaseOrder.update({
    where: { id: poId },
    data: updateData
  });
}
```

### 5.4 발주 금액이 손익에 미치는 영향

```typescript
// 특정 주문의 총 비용 계산
async function getOrderCost(orderId: number): Promise<number> {
  const result = await prisma.purchaseOrder.aggregate({
    where: { 
      orderId,
      status: { not: 'cancelled' }
    },
    _sum: { totalAmount: true }
  });
  
  return result._sum.totalAmount || 0;
}

// 손익 계산
async function calculateProfit(orderId: number) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  const cost = await getOrderCost(orderId);
  
  const revenue = order.totalAmount;
  const grossProfit = revenue - cost;
  const profitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  
  return { revenue, cost, grossProfit, profitMargin };
}
```

---

## 6. 연동 포인트

### 6.1 주문(Order) 모듈

- 주문에서 발주 생성 버튼
- 주문 상세에 연결된 발주 목록 표시
- 주문별 원가/손익 요약

### 6.2 거래처(Supplier) 모듈

- 발주 생성 시 거래처 선택
- 거래처별 매입 단가 자동 적용
- 거래처 상세에 발주 이력

### 6.3 손익분석(ProfitAnalysis) 모듈

- 발주 금액 = 원가 (Cost of Goods)
- 발주 완료 시 손익 재계산

### 6.4 업무(Task) 모듈 (선택)

- 발주 생성 시 Task 자동 생성
- 발주 항목별 진행 추적

---

## 7. 구현 우선순위

### Phase 1 (필수)
1. [ ] PurchaseOrder CRUD API
2. [ ] PurchaseOrderItem CRUD API
3. [ ] 발주 목록/상세 페이지
4. [ ] 발주 등록/수정 폼
5. [ ] 주문에서 발주 생성 기능

### Phase 2 (권장)
6. [ ] 발주 상태 워크플로우
7. [ ] 항목별 상태 관리
8. [ ] 작업 상세(workDetails) 관리 UI
9. [ ] 발주서 PDF 생성

### Phase 3 (선택)
10. [ ] 거래처 포털 연동
11. [ ] 자동 발주 알림
12. [ ] 발주 승인 워크플로우

---

## 변경 이력

| 버전 | 날짜 | 변경 내역 | 작성자 |
|------|------|----------|--------|
| 1.0 | 2026-01-05 | 초안 작성 | AI Assistant |


