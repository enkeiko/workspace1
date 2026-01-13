# 13. 입금 관리 모듈 상세 설계

> Payment Management Module - 현금흐름 관리

## 1. 개요

### 1.1 모듈 목적

입금 관리는 **고객으로부터 받은 돈을 기록하고 청구서와 매칭**하는 기능입니다.

```
[청구서 발행] ──────→ [입금 확인] ──────→ [매칭] ──────→ [미수금 정리]
  Invoice              Payment          Match           Order 업데이트
```

### 1.2 핵심 기능

| 기능 | 설명 |
|------|------|
| 입금 기록 | 입금 내역 수동/자동 등록 |
| 청구서 매칭 | 입금과 청구서(Invoice) 연결 |
| 자동 매칭 | 금액, 입금자명으로 자동 매칭 시도 |
| 미수금 관리 | 미입금 현황 실시간 파악 |
| 과입금/부족 처리 | 금액 불일치 처리 |

---

## 2. 데이터 모델

### 2.1 Payment (입금)

```prisma
model Payment {
  id            Int       @id @default(autoincrement())
  
  // 연결
  invoiceId     Int?                       // 매칭된 청구서 (선택)
  customerId    Int                        // 고객 (필수)
  orderId       Int?                       // 주문 (선택, 편의용)
  
  // 입금 정보
  paymentDate   DateTime                   // 입금일
  amount        Decimal                    // 입금액
  
  // 입금 상세
  paymentMethod String?                    // 결제 수단
  // bank_transfer: 계좌이체
  // card: 카드
  // cash: 현금
  // other: 기타
  
  bankName      String?                    // 입금 은행
  depositorName String?                    // 입금자명
  transactionId String?                    // 거래 ID (은행 거래번호)
  
  // 매칭 정보
  matchStatus   String    @default("unmatched")
  // unmatched: 미매칭
  // auto_matched: 자동 매칭
  // manual_matched: 수동 매칭
  // partial_matched: 부분 매칭
  
  matchedBy     String?                    // 매칭한 사용자
  matchedAt     DateTime?                  // 매칭 일시
  
  // 메모
  notes         String?
  
  // 타임스탬프
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // 관계
  invoice   Invoice?  @relation(fields: [invoiceId], references: [id], onDelete: SetNull)
  customer  Customer  @relation(fields: [customerId], references: [id], onDelete: Cascade)

  @@index([invoiceId])
  @@index([customerId])
  @@index([orderId])
  @@index([paymentDate])
  @@index([matchStatus])
  @@index([depositorName])
}
```

### 2.2 Invoice 확장 (기존 모델 수정)

```prisma
model Invoice {
  // ... 기존 필드 ...
  
  // 금액 상세 (확장)
  supplyAmount  Decimal              // 공급가액
  taxAmount     Decimal              // 세액
  totalAmount   Decimal              // 합계 = 공급가액 + 세액
  
  // 입금 현황
  paidAmount    Decimal   @default(0)  // 입금된 금액
  remainAmount  Decimal?               // 미수금 = totalAmount - paidAmount
  
  // 상태
  isPaid        Boolean   @default(false)
  paidDate      DateTime?
  status        String    @default("pending")
  // pending: 대기
  // sent: 발송
  // partial_paid: 부분입금
  // paid: 완납
  // overdue: 연체
  // cancelled: 취소
  
  // 관계 추가
  payments      Payment[]
}
```

---

## 3. API 설계

### 3.1 입금 CRUD

#### GET /api/payments
입금 목록 조회

**Query Parameters:**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| customerId | number | 고객 ID |
| matchStatus | string | 매칭 상태 |
| startDate | string | 입금일 시작 |
| endDate | string | 입금일 종료 |
| page | number | 페이지 |
| limit | number | 페이지당 개수 |

**Response:**
```json
{
  "success": true,
  "data": {
    "payments": [
      {
        "id": 1,
        "paymentDate": "2026-01-05",
        "amount": 1100000,
        "depositorName": "길동이네",
        "bankName": "국민은행",
        "matchStatus": "auto_matched",
        "customer": {
          "id": 1,
          "name": "길동이네 치킨"
        },
        "invoice": {
          "id": 1,
          "invoiceNumber": "INV-202601-0001",
          "totalAmount": 1100000
        }
      }
    ],
    "pagination": { ... },
    "summary": {
      "totalAmount": 5500000,
      "unmatchedCount": 3,
      "unmatchedAmount": 500000
    }
  }
}
```

#### POST /api/payments
입금 등록

**Request Body:**
```json
{
  "customerId": 1,
  "paymentDate": "2026-01-05",
  "amount": 1100000,
  "paymentMethod": "bank_transfer",
  "bankName": "국민은행",
  "depositorName": "길동이네",
  "transactionId": "202601051234567",
  "notes": "1월분 결제"
}
```

**처리 로직:**
1. 입금 기록 생성
2. 자동 매칭 시도 (옵션)
3. 매칭 성공 시 Invoice/Order 업데이트

#### GET /api/payments/[id]
입금 상세

#### PUT /api/payments/[id]
입금 수정

#### DELETE /api/payments/[id]
입금 삭제 (미매칭 상태만)

---

### 3.2 매칭 API

#### POST /api/payments/[id]/match
입금-청구서 수동 매칭

**Request Body:**
```json
{
  "invoiceId": 1,
  "notes": "담당자 확인 후 매칭"
}
```

**처리 로직:**
1. 입금과 청구서 연결
2. Invoice.paidAmount += Payment.amount
3. Invoice 상태 업데이트 (partial_paid 또는 paid)
4. Order.paidAmount 업데이트

#### DELETE /api/payments/[id]/match
매칭 해제

**처리 로직:**
1. Invoice.paidAmount -= Payment.amount
2. Invoice 상태 롤백
3. Order.paidAmount 업데이트
4. Payment.matchStatus = 'unmatched'

---

### 3.3 자동 매칭 API

#### POST /api/payments/auto-match
미매칭 입금 일괄 자동 매칭

**Response:**
```json
{
  "success": true,
  "data": {
    "processed": 10,
    "matched": 7,
    "unmatched": 3,
    "matchedPayments": [
      {
        "paymentId": 1,
        "invoiceId": 1,
        "matchReason": "금액 일치, 입금자명 포함"
      }
    ]
  }
}
```

---

### 3.4 미수금 현황 API

#### GET /api/payments/receivables
미수금 현황 조회

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalReceivable": 5000000,
      "overdueAmount": 1000000,
      "dueThisWeek": 2000000,
      "invoiceCount": 15
    },
    "invoices": [
      {
        "id": 1,
        "invoiceNumber": "INV-202601-0001",
        "customer": { "id": 1, "name": "A고객" },
        "totalAmount": 1100000,
        "paidAmount": 0,
        "remainAmount": 1100000,
        "invoiceDate": "2026-01-01",
        "dueDate": "2026-01-15",
        "daysOverdue": 0,
        "status": "sent"
      }
    ],
    "byCustomer": [
      {
        "customer": { "id": 1, "name": "A고객" },
        "totalReceivable": 2200000,
        "overdueAmount": 0,
        "invoiceCount": 2
      }
    ]
  }
}
```

---

## 4. UI 설계

### 4.1 입금 관리 페이지 `/payments`

```
┌─────────────────────────────────────────────────────────────────┐
│  입금 관리                            [자동 매칭] [+ 입금 등록] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [기간: 2026.01 ▼] [상태: 전체 ▼] [고객: 전체 ▼] [검색]        │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 요약:  총 입금 ₩5,500,000  │  미매칭 3건 ₩500,000       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [입금 목록]  [미수금 현황]                                     │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │입금일   │입금자명  │금액      │매칭상태│청구서번호 │액션  ││
│  ├─────────┼─────────┼─────────┼───────┼──────────┼──────┤│
│  │01-05   │길동이네  │₩1,100K │✅자동 │INV-0001 │[상세]││
│  │01-05   │홍길동   │₩500K   │🔴미매칭│-        │[매칭]││
│  │01-04   │A상사    │₩2,200K │✅수동 │INV-0002 │[상세]││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 미수금 현황 탭

```
┌─────────────────────────────────────────────────────────────────┐
│  미수금 현황                                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │  총 미수금   │ │  연체 금액   │ │ 이번 주 만기 │            │
│  │  ₩5,000,000  │ │  ₩1,000,000  │ │  ₩2,000,000  │            │
│  │    (15건)    │ │    (3건)     │ │    (5건)     │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │청구번호    │고객     │청구금액 │미수금  │만기일 │경과일│상태││
│  ├────────────┼────────┼────────┼───────┼──────┼─────┼────┤│
│  │INV-0001   │A고객   │₩1.1M  │₩1.1M │01-15 │-    │🟢  ││
│  │INV-0002   │B고객   │₩2.2M  │₩1.0M │01-10 │-5일 │🟡  ││
│  │INV-0003   │C고객   │₩500K  │₩500K │01-01 │+4일 │🔴  ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  🟢 정상  🟡 만기 임박 (7일 이내)  🔴 연체                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 입금 등록 모달

```
┌─────────────────────────────────────────────────────────────────┐
│  입금 등록                                               [X]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  고객 *        [길동이네 치킨 ▼]    [미수금: ₩1,100,000]        │
│                                                                 │
│  입금일 *      [2026-01-05]                                     │
│  입금액 *      [1,100,000]                                      │
│                                                                 │
│  결제 수단     [계좌이체 ▼]                                     │
│  입금 은행     [국민은행 ▼]                                     │
│  입금자명      [길동이네            ]                           │
│  거래번호      [202601051234567     ] (선택)                    │
│                                                                 │
│  ☑ 자동 매칭 시도                                               │
│                                                                 │
│  비고          [                    ]                           │
│                                                                 │
│                              [취소]  [등록]                     │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 수동 매칭 모달

```
┌─────────────────────────────────────────────────────────────────┐
│  입금 매칭                                               [X]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  입금 정보 ──────────────────────────────────────────────────  │
│  입금일: 2026-01-05                                             │
│  입금액: ₩500,000                                               │
│  입금자명: 홍길동                                               │
│                                                                 │
│  매칭할 청구서 선택 ─────────────────────────────────────────  │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ ○ │ INV-0001 │ A고객 │ ₩500,000 │ 미수금 ₩500,000       ││
│  │ ○ │ INV-0002 │ B고객 │ ₩1,000,000 │ 미수금 ₩1,000,000   ││
│  │ ● │ INV-0003 │ 홍길동 │ ₩500,000 │ 미수금 ₩500,000 ← 추천││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  매칭 메모     [담당자 확인 완료    ]                           │
│                                                                 │
│                              [취소]  [매칭]                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. 비즈니스 로직

### 5.1 자동 매칭 알고리즘

```typescript
interface MatchCandidate {
  invoiceId: number;
  score: number;
  reasons: string[];
}

async function findMatchCandidates(payment: Payment): Promise<MatchCandidate[]> {
  const candidates: MatchCandidate[] = [];
  
  // 해당 고객의 미결제 청구서 조회
  const unpaidInvoices = await prisma.invoice.findMany({
    where: {
      customerId: payment.customerId,
      isPaid: false,
      status: { notIn: ['cancelled'] }
    }
  });
  
  for (const invoice of unpaidInvoices) {
    let score = 0;
    const reasons: string[] = [];
    const remainAmount = Number(invoice.totalAmount) - Number(invoice.paidAmount || 0);
    
    // 1. 금액 정확히 일치 (가장 높은 점수)
    if (Number(payment.amount) === remainAmount) {
      score += 50;
      reasons.push('금액 일치');
    }
    // 금액 근접 (5% 이내)
    else if (Math.abs(Number(payment.amount) - remainAmount) / remainAmount <= 0.05) {
      score += 30;
      reasons.push('금액 근접');
    }
    
    // 2. 입금자명 매칭
    if (payment.depositorName) {
      const customer = await prisma.customer.findUnique({
        where: { id: payment.customerId }
      });
      
      if (customer.name.includes(payment.depositorName) || 
          payment.depositorName.includes(customer.name)) {
        score += 30;
        reasons.push('입금자명 일치');
      }
      
      // 사업자번호 포함 여부
      if (customer.businessNumber && 
          payment.depositorName.includes(customer.businessNumber.replace(/-/g, ''))) {
        score += 20;
        reasons.push('사업자번호 포함');
      }
    }
    
    // 3. 청구서 날짜 근접
    const daysDiff = Math.abs(
      (payment.paymentDate.getTime() - invoice.invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff <= 30) {
      score += Math.max(0, 20 - daysDiff);
      reasons.push('날짜 근접');
    }
    
    if (score > 0) {
      candidates.push({
        invoiceId: invoice.id,
        score,
        reasons
      });
    }
  }
  
  // 점수 높은 순 정렬
  return candidates.sort((a, b) => b.score - a.score);
}

async function autoMatch(paymentId: number): Promise<boolean> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (payment.matchStatus !== 'unmatched') return false;
  
  const candidates = await findMatchCandidates(payment);
  
  // 점수 70 이상이고 금액 일치하면 자동 매칭
  if (candidates.length > 0 && candidates[0].score >= 70) {
    const invoice = await prisma.invoice.findUnique({ 
      where: { id: candidates[0].invoiceId } 
    });
    const remainAmount = Number(invoice.totalAmount) - Number(invoice.paidAmount || 0);
    
    if (Number(payment.amount) === remainAmount) {
      await matchPayment(paymentId, candidates[0].invoiceId, 'auto');
      return true;
    }
  }
  
  return false;
}
```

### 5.2 매칭 처리

```typescript
async function matchPayment(
  paymentId: number, 
  invoiceId: number, 
  matchType: 'auto' | 'manual',
  matchedBy?: string
) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    const invoice = await tx.invoice.findUnique({ 
      where: { id: invoiceId },
      include: { order: true }
    });
    
    // 1. Payment 업데이트
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        invoiceId,
        orderId: invoice.orderId,
        matchStatus: matchType === 'auto' ? 'auto_matched' : 'manual_matched',
        matchedBy,
        matchedAt: new Date()
      }
    });
    
    // 2. Invoice 업데이트
    const newPaidAmount = Number(invoice.paidAmount || 0) + Number(payment.amount);
    const remainAmount = Number(invoice.totalAmount) - newPaidAmount;
    const isPaid = remainAmount <= 0;
    
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaidAmount,
        remainAmount: Math.max(0, remainAmount),
        isPaid,
        paidDate: isPaid ? new Date() : null,
        status: isPaid ? 'paid' : 'partial_paid'
      }
    });
    
    // 3. Order 업데이트
    if (invoice.orderId) {
      const order = await tx.order.findUnique({ where: { id: invoice.orderId } });
      const newOrderPaidAmount = Number(order.paidAmount || 0) + Number(payment.amount);
      
      await tx.order.update({
        where: { id: invoice.orderId },
        data: {
          paidAmount: newOrderPaidAmount,
          unpaidAmount: Number(order.totalAmount) - newOrderPaidAmount
        }
      });
    }
    
    return true;
  });
}
```

### 5.3 매칭 해제

```typescript
async function unmatchPayment(paymentId: number) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ 
      where: { id: paymentId },
      include: { invoice: { include: { order: true } } }
    });
    
    if (!payment.invoiceId) return false;
    
    // 1. Invoice 롤백
    const newPaidAmount = Number(payment.invoice.paidAmount) - Number(payment.amount);
    
    await tx.invoice.update({
      where: { id: payment.invoiceId },
      data: {
        paidAmount: Math.max(0, newPaidAmount),
        remainAmount: Number(payment.invoice.totalAmount) - Math.max(0, newPaidAmount),
        isPaid: false,
        paidDate: null,
        status: newPaidAmount > 0 ? 'partial_paid' : 'sent'
      }
    });
    
    // 2. Order 롤백
    if (payment.invoice.orderId) {
      const order = payment.invoice.order;
      const newOrderPaidAmount = Number(order.paidAmount) - Number(payment.amount);
      
      await tx.order.update({
        where: { id: payment.invoice.orderId },
        data: {
          paidAmount: Math.max(0, newOrderPaidAmount),
          unpaidAmount: Number(order.totalAmount) - Math.max(0, newOrderPaidAmount)
        }
      });
    }
    
    // 3. Payment 업데이트
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        invoiceId: null,
        orderId: null,
        matchStatus: 'unmatched',
        matchedBy: null,
        matchedAt: null
      }
    });
    
    return true;
  });
}
```

### 5.4 미수금 집계

```typescript
async function getReceivablesSummary() {
  const now = new Date();
  const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  // 전체 미수금
  const unpaidInvoices = await prisma.invoice.findMany({
    where: {
      isPaid: false,
      status: { notIn: ['cancelled'] }
    },
    include: {
      customer: true,
      order: true
    }
  });
  
  let totalReceivable = 0;
  let overdueAmount = 0;
  let dueThisWeek = 0;
  
  const invoicesWithStatus = unpaidInvoices.map(inv => {
    const remainAmount = Number(inv.totalAmount) - Number(inv.paidAmount || 0);
    totalReceivable += remainAmount;
    
    let daysOverdue = 0;
    let status = 'normal';
    
    if (inv.dueDate) {
      daysOverdue = Math.floor(
        (now.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysOverdue > 0) {
        overdueAmount += remainAmount;
        status = 'overdue';
      } else if (inv.dueDate <= oneWeekLater) {
        dueThisWeek += remainAmount;
        status = 'due_soon';
      }
    }
    
    return {
      ...inv,
      remainAmount,
      daysOverdue,
      status
    };
  });
  
  return {
    summary: {
      totalReceivable,
      overdueAmount,
      dueThisWeek,
      invoiceCount: unpaidInvoices.length
    },
    invoices: invoicesWithStatus
  };
}
```

---

## 6. 연동 포인트

### 6.1 청구서(Invoice) 모듈

- 청구서 상세에 입금 내역 표시
- 입금 매칭 시 청구서 상태 자동 업데이트

### 6.2 주문(Order) 모듈

- 주문 상세에 입금 현황 표시
- paidAmount, unpaidAmount 자동 계산

### 6.3 대시보드

- 미수금 현황 위젯
- 연체 알림

### 6.4 고객(Customer) 모듈

- 고객 상세에 입금 이력
- 고객별 미수금 현황

---

## 7. 구현 우선순위

### Phase 1 (필수)
1. [ ] Payment 모델 추가
2. [ ] Invoice 모델 확장
3. [ ] 입금 CRUD API
4. [ ] 수동 매칭 API
5. [ ] 입금 목록/등록 페이지

### Phase 2 (권장)
6. [ ] 자동 매칭 알고리즘
7. [ ] 미수금 현황 API/UI
8. [ ] 대시보드 미수금 위젯
9. [ ] 매칭 해제 기능

### Phase 3 (선택)
10. [ ] 은행 거래내역 자동 수집 (API)
11. [ ] 연체 알림 (이메일/카톡)
12. [ ] 수금 독촉 기능

---

## 변경 이력

| 버전 | 날짜 | 변경 내역 | 작성자 |
|------|------|----------|--------|
| 1.0 | 2026-01-05 | 초안 작성 | AI Assistant |


