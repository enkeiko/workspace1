# 42Ment ERP 2026 - MVP 구현 계획

> **목표**: "이번 달 얼마 벌었는가?"에 3초 내 답변 가능한 시스템

---

## 1. MVP 범위 정의

### ✅ MVP 포함 (필수)

| 모듈 | 기능 | 목적 |
|------|------|------|
| **거래처 관리** | Supplier CRUD | 비용 추적의 대상 정의 |
| **구매발주** | PurchaseOrder CRUD | 원가(비용) 기록 |
| **손익분석** | 자동 계산 | 매출-비용=이익 |
| **입금 관리** | Payment CRUD | 미수금 파악 |
| **대시보드** | 손익/미수금 위젯 | 경영 현황 한눈에 |

### ❌ MVP 제외 (Phase 2+)

| 기능 | 이유 |
|------|------|
| 고객 셀프서비스 포털 | 운영 효율화, 필수 아님 |
| 고객별 특별 단가 | 초기엔 수동 입력 가능 |
| PDF 견적서/계산서 | 엑셀/수동 발행 가능 |
| AuditLog (변경이력) | 초기엔 불필요 |
| 알림 시스템 | 수동 연락 가능 |
| 인증/권한 관리 | 1인 사용 가정 |

---

## 2. 현재 상태 vs MVP 목표

```
┌─────────────────────────────────────────────────────────────┐
│                    현재 상태 (이미 구현됨)                    │
├─────────────────────────────────────────────────────────────┤
│ ✅ Customer (고객) CRUD                                      │
│ ✅ Store (매장) CRUD                                         │
│ ✅ Product (상품) CRUD                                       │
│ ✅ Quotation (견적) CRUD + 주문 전환                         │
│ ✅ Order (주문) CRUD                                         │
│ ✅ Invoice (청구서) CRUD                                     │
│ ✅ Consultation (상담) CRUD                                  │
│ ✅ Task (업무) CRUD                                          │
│                                                             │
│ ❌ 비용 추적 없음 → 손익 계산 불가                           │
│ ❌ 입금 관리 없음 → 미수금 파악 불가                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    MVP 목표 (추가 구현)                       │
├─────────────────────────────────────────────────────────────┤
│ 🆕 Supplier (거래처) CRUD                                    │
│ 🆕 PurchaseOrder (구매발주) CRUD                             │
│ 🆕 ProfitAnalysis (손익분석) 자동 계산                       │
│ 🆕 Payment (입금) CRUD                                       │
│ 🆕 Dashboard 손익/미수금 위젯                                │
│                                                             │
│ ✅ 결과: "이번 달 매출 500만, 비용 350만, 이익 150만"        │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 데이터 모델 (MVP용 최소 스키마)

### 3.1 Supplier (거래처)

```prisma
model Supplier {
  id             Int       @id @default(autoincrement())
  name           String                    // 거래처명 (필수)
  contactName    String?                   // 담당자
  phone          String?                   // 연락처
  email          String?                   // 이메일
  serviceTypes   String?                   // "블로그,리뷰" (콤마 구분)
  notes          String?                   // 메모
  isActive       Boolean   @default(true)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  
  purchaseOrders PurchaseOrder[]
}
```

### 3.2 PurchaseOrder (구매발주)

```prisma
model PurchaseOrder {
  id            Int       @id @default(autoincrement())
  poNumber      String    @unique          // PO-202601-0001
  orderId       Int?                       // 연결된 판매주문 (선택)
  supplierId    Int                        // 거래처 (필수)
  storeId       Int?                       // 작업 대상 매장 (선택)
  poDate        DateTime  @default(now())  // 발주일
  totalAmount   Decimal   @default(0)      // 발주 금액 (비용)
  status        String    @default("draft") // draft/sent/completed
  workDetails   String?                    // 작업 내용 메모
  notes         String?                    // 비고
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  order         Order?    @relation(fields: [orderId], references: [id])
  supplier      Supplier  @relation(fields: [supplierId], references: [id])
  store         Store?    @relation(fields: [storeId], references: [id])
}
```

### 3.3 Payment (입금)

```prisma
model Payment {
  id            Int       @id @default(autoincrement())
  customerId    Int                        // 고객
  invoiceId     Int?                       // 연결된 청구서 (선택)
  paymentDate   DateTime                   // 입금일
  amount        Decimal                    // 입금액
  depositorName String?                    // 입금자명
  method        String?   @default("bank") // bank/card/cash
  notes         String?                    // 비고
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  customer      Customer  @relation(fields: [customerId], references: [id])
  invoice       Invoice?  @relation(fields: [invoiceId], references: [id])
}
```

### 3.4 기존 모델에 추가할 필드

```prisma
// Order 모델에 추가
model Order {
  // ... 기존 필드 ...
  purchaseOrders  PurchaseOrder[]  // 🆕 연결된 구매발주들
}

// Customer 모델에 추가
model Customer {
  // ... 기존 필드 ...
  payments        Payment[]        // 🆕 입금 내역
}

// Invoice 모델에 추가
model Invoice {
  // ... 기존 필드 ...
  payments        Payment[]        // 🆕 연결된 입금
}

// Store 모델에 추가
model Store {
  // ... 기존 필드 ...
  purchaseOrders  PurchaseOrder[]  // 🆕 해당 매장 발주
}
```

---

## 4. 구현 태스크 (순서대로)

### Phase 1-A: 스키마 확장 (Day 1)

| # | 태스크 | 예상 | 산출물 |
|---|--------|------|--------|
| 1 | Prisma 스키마 확장 | 1h | `schema.prisma` |
| 2 | `npx prisma migrate dev` | 0.5h | DB 마이그레이션 |
| 3 | `npx prisma generate` | 0.5h | 클라이언트 생성 |

### Phase 1-B: 거래처 관리 (Day 1-2)

| # | 태스크 | 예상 | 산출물 |
|---|--------|------|--------|
| 4 | Supplier API (CRUD) | 2h | `/api/suppliers/*` |
| 5 | Supplier 목록 페이지 | 2h | `/suppliers` |
| 6 | Supplier 등록/편집 폼 | 2h | `/suppliers/new`, `/suppliers/[id]/edit` |

### Phase 1-C: 구매발주 관리 (Day 2-3)

| # | 태스크 | 예상 | 산출물 |
|---|--------|------|--------|
| 7 | PurchaseOrder API (CRUD) | 3h | `/api/purchase-orders/*` |
| 8 | PurchaseOrder 목록 페이지 | 2h | `/purchase-orders` |
| 9 | PurchaseOrder 등록/편집 폼 | 3h | `/purchase-orders/new`, `[id]/edit` |
| 10 | 주문→발주 생성 버튼 | 2h | `/orders/[id]` 상세 페이지에 추가 |

### Phase 1-D: 입금 관리 (Day 3-4)

| # | 태스크 | 예상 | 산출물 |
|---|--------|------|--------|
| 11 | Payment API (CRUD) | 2h | `/api/payments/*` |
| 12 | Payment 목록 페이지 | 2h | `/payments` |
| 13 | Payment 등록 폼 | 2h | `/payments/new` |
| 14 | 청구서-입금 수동 연결 | 1h | `/payments/[id]` 편집 |

### Phase 1-E: 손익분석 & 대시보드 (Day 4-5)

| # | 태스크 | 예상 | 산출물 |
|---|--------|------|--------|
| 15 | 손익 계산 API | 2h | `/api/profit-analysis` |
| 16 | 대시보드 손익 카드 | 2h | `/` 또는 `/dashboard` |
| 17 | 대시보드 미수금 카드 | 2h | `/` 또는 `/dashboard` |
| 18 | 통합 테스트 & 버그 수정 | 3h | - |

---

## 5. API 명세 (MVP)

### 5.1 Supplier API

```
GET    /api/suppliers           # 거래처 목록
POST   /api/suppliers           # 거래처 생성
GET    /api/suppliers/[id]      # 거래처 상세
PUT    /api/suppliers/[id]      # 거래처 수정
DELETE /api/suppliers/[id]      # 거래처 삭제
```

### 5.2 PurchaseOrder API

```
GET    /api/purchase-orders           # 발주 목록
POST   /api/purchase-orders           # 발주 생성
GET    /api/purchase-orders/[id]      # 발주 상세
PUT    /api/purchase-orders/[id]      # 발주 수정
DELETE /api/purchase-orders/[id]      # 발주 삭제
POST   /api/orders/[id]/create-po     # 주문→발주 생성
```

### 5.3 Payment API

```
GET    /api/payments           # 입금 목록
POST   /api/payments           # 입금 등록
GET    /api/payments/[id]      # 입금 상세
PUT    /api/payments/[id]      # 입금 수정 (청구서 연결 포함)
DELETE /api/payments/[id]      # 입금 삭제
```

### 5.4 Dashboard API

```
GET    /api/dashboard/summary         # 손익 요약 (기간별)
GET    /api/dashboard/receivables     # 미수금 현황
```

---

## 6. 손익 계산 로직

```javascript
// /api/dashboard/summary 의 핵심 로직
async function calculateProfitSummary(startDate, endDate) {
  // 1. 매출: 해당 기간 주문 합계
  const revenue = await prisma.order.aggregate({
    where: {
      orderDate: { gte: startDate, lte: endDate },
      status: { in: ['confirmed', 'in_progress', 'completed'] }
    },
    _sum: { totalAmount: true }
  });

  // 2. 비용: 해당 기간 구매발주 합계
  const cost = await prisma.purchaseOrder.aggregate({
    where: {
      poDate: { gte: startDate, lte: endDate },
      status: { in: ['sent', 'completed'] }
    },
    _sum: { totalAmount: true }
  });

  // 3. 이익 계산
  const revenueAmount = revenue._sum.totalAmount || 0;
  const costAmount = cost._sum.totalAmount || 0;
  const profit = revenueAmount - costAmount;
  const profitMargin = revenueAmount > 0 
    ? (profit / revenueAmount * 100).toFixed(1) 
    : 0;

  return {
    revenue: revenueAmount,
    cost: costAmount,
    profit: profit,
    profitMargin: `${profitMargin}%`
  };
}
```

---

## 7. 미수금 계산 로직

```javascript
// /api/dashboard/receivables 의 핵심 로직
async function getReceivables() {
  // 미입금 청구서 조회
  const unpaidInvoices = await prisma.invoice.findMany({
    where: { isPaid: false },
    include: {
      customer: true,
      order: true
    },
    orderBy: { invoiceDate: 'asc' }
  });

  // 미수금 합계
  const totalReceivables = unpaidInvoices.reduce(
    (sum, inv) => sum + Number(inv.amount), 
    0
  );

  return {
    total: totalReceivables,
    count: unpaidInvoices.length,
    items: unpaidInvoices.map(inv => ({
      id: inv.id,
      customerName: inv.customer.name,
      invoiceNumber: inv.invoiceNumber,
      amount: inv.amount,
      invoiceDate: inv.invoiceDate,
      daysOverdue: daysSince(inv.dueDate || inv.invoiceDate)
    }))
  };
}
```

---

## 8. UI 와이어프레임

### 8.1 대시보드 (메인)

```
┌─────────────────────────────────────────────────────────────┐
│  42Ment ERP - 대시보드                         2026년 1월 ▼ │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐│
│  │   이번 달   │ │   이번 달   │ │   이번 달   │ │ 미수금 ││
│  │    매출     │ │    비용     │ │    이익     │ │  현황  ││
│  │  ₩500만    │ │  ₩350만    │ │  ₩150만    │ │ ₩80만  ││
│  │            │ │            │ │  (30%)     │ │  (3건) ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────┘│
│                                                             │
│  ┌────────────────────────────────────────────────────────┐│
│  │ 최근 미수금                                    더보기 > ││
│  ├────────────────────────────────────────────────────────┤│
│  │ A사  INV-2501-001  ₩100만  12/15청구  16일 경과  🔴    ││
│  │ B사  INV-2501-002  ₩50만   12/20청구  11일 경과  🟡    ││
│  │ C사  INV-2501-003  ₩30만   12/28청구   3일 경과  🟢    ││
│  └────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 거래처 목록

```
┌─────────────────────────────────────────────────────────────┐
│  거래처 관리                              [+ 거래처 등록]   │
├─────────────────────────────────────────────────────────────┤
│  🔍 검색...                                                 │
├─────────────────────────────────────────────────────────────┤
│  거래처명          담당자      연락처           상태        │
│  ─────────────────────────────────────────────────────────  │
│  블로그팩토리      김OO       010-1234-5678    활성         │
│  리뷰스타          박OO       010-8765-4321    활성         │
│  웹마스터          이OO       010-1111-2222    비활성       │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 구매발주 목록

```
┌─────────────────────────────────────────────────────────────┐
│  구매발주 관리                            [+ 발주 등록]     │
├─────────────────────────────────────────────────────────────┤
│  🔍 검색...          기간: 2026-01 ▼    상태: 전체 ▼       │
├─────────────────────────────────────────────────────────────┤
│  발주번호        거래처         금액      발주일     상태   │
│  ─────────────────────────────────────────────────────────  │
│  PO-2601-001    블로그팩토리   ₩70만    01/03     완료     │
│  PO-2601-002    리뷰스타       ₩30만    01/05     진행중   │
│  PO-2601-003    블로그팩토리   ₩50만    01/05     대기     │
├─────────────────────────────────────────────────────────────┤
│                            합계: ₩150만                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. 완료 기준 체크리스트

### MVP 필수 체크

- [ ] 거래처 등록/조회/수정/삭제 가능
- [ ] 구매발주 등록/조회/수정/삭제 가능
- [ ] 주문 상세에서 "발주 생성" 가능
- [ ] 입금 등록/조회/수정/삭제 가능
- [ ] 대시보드에서 이번 달 **매출/비용/이익** 확인 가능
- [ ] 대시보드에서 **미수금 현황** 확인 가능

### 비즈니스 검증

- [ ] **"이번 달 얼마 벌었지?"** → 대시보드 3초 내 확인
- [ ] **"A 거래처에 얼마 줬지?"** → 구매발주 필터링으로 확인
- [ ] **"B 고객 미수금 얼마야?"** → 미수금 목록에서 확인

---

## 10. 예상 일정

| Day | 작업 | 산출물 |
|-----|------|--------|
| **1** | 스키마 확장 + Supplier CRUD | DB, API, 페이지 |
| **2** | PurchaseOrder API + 페이지 | API, 목록/등록 페이지 |
| **3** | 주문→발주 + Payment API | 버튼, API |
| **4** | Payment 페이지 + 대시보드 API | 페이지, API |
| **5** | 대시보드 UI + 테스트 | 대시보드, QA |

**총 예상: 5일 (40시간)**

---

## 변경 이력

| 버전 | 날짜 | 변경 내역 | 작성자 |
|------|------|----------|--------|
| 1.0 | 2026-01-05 | MVP 범위 정의 및 구현 계획 작성 | AI Assistant |



