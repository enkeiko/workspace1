# 42Ment ERP 2026 - 데이터 모델

## 문서 정보

- **작성일**: 2025-12-31
- **버전**: 1.0
- **관련 문서**: 00-executive-summary.md, 01-business-flow.md
- **기반 스키마**: marketing-agency-erp/prisma/schema.prisma

---

## 1. 전체 ERD (Entity Relationship Diagram)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           42Ment ERP 2026 ERD                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐     1:N     ┌──────────┐     1:N     ┌──────────────┐    │
│  │ Customer │────────────>│  Store   │────────────>│ WorkHistory  │    │
│  └────┬─────┘             └────┬─────┘             └──────────────┘    │
│       │                        │                                        │
│       │ 1:N                    │ 1:N                                    │
│       ▼                        ▼                                        │
│  ┌──────────┐     N:1     ┌──────────┐                                 │
│  │Quotation │<────────────│  Order   │                                 │
│  └────┬─────┘             └────┬─────┘                                 │
│       │                        │                                        │
│       │ 1:N                    │ 1:N              1:N                   │
│       ▼                        ├────────────────────┐                   │
│  ┌────────────┐                ▼                    ▼                   │
│  │Quotation   │          ┌──────────┐         ┌─────────────┐          │
│  │   Item     │          │OrderItem │         │PurchaseOrder│ ⭐ NEW   │
│  └────────────┘          └──────────┘         └──────┬──────┘          │
│                                                      │                  │
│                                                      │ 1:N              │
│                                                      ▼                  │
│  ┌──────────┐     1:N     ┌──────────┐        ┌──────────────┐         │
│  │ Product  │────────────>│Supplier  │ ⭐ NEW │PurchaseOrder │ ⭐ NEW  │
│  └────┬─────┘             │ Product  │        │    Item      │         │
│       │                   └──────────┘        └──────────────┘         │
│       │ N:M                     │                                       │
│       ▼                         │ N:1                                   │
│  ┌────────────────┐            ▼                                       │
│  │CustomerProduct │ ⭐   ┌──────────┐                                  │
│  │    Price       │ NEW  │ Supplier │ ⭐ NEW                           │
│  └────────────────┘      └──────────┘                                  │
│                                                                         │
│  ┌──────────┐     N:1     ┌──────────┐     1:N     ┌──────────┐        │
│  │ Invoice  │<────────────│  Order   │────────────>│ Payment  │ ⭐ NEW │
│  └──────────┘             └────┬─────┘             └──────────┘        │
│                                │                                        │
│                                │ 1:1                                    │
│                                ▼                                        │
│                          ┌─────────────┐                               │
│                          │ProfitAnalysis│ ⭐ NEW                       │
│                          └─────────────┘                               │
│                                                                         │
│  보조 테이블:                                                           │
│  ┌─────────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐    │
│  │Consultation │ │   Task   │ │TimeEntry│ │ Document │ │ AuditLog │    │
│  └─────────────┘ └──────────┘ └────────┘ └──────────┘ └──────────┘    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

⭐ NEW: 2026 버전 신규 추가 테이블
```

---

## 2. 기존 테이블 (marketing-agency-erp 유지)

### 2.1 Customer (고객)

```prisma
model Customer {
  id                        Int       @id @default(autoincrement())
  name                      String
  businessNumber            String?   @unique  // 사업자번호
  businessRegistrationFile  String?            // 사업자등록증 파일
  contactPerson             String?            // 담당자명
  email                     String?
  phone                     String?
  address                   String?
  notes                     String?
  tags                      String?            // JSON array
  createdAt                 DateTime  @default(now())
  updatedAt                 DateTime  @updatedAt

  // 관계
  stores              Store[]
  orders              Order[]
  quotations          Quotation[]
  consultations       Consultation[]
  tasks               Task[]
  documents           Document[]
  settlements         Settlement[]
  invoices            Invoice[]
  customerPrices      CustomerProductPrice[]  // ⭐ NEW
  payments            Payment[]               // ⭐ NEW

  @@index([businessNumber])
  @@index([name])
}
```

### 2.2 Store (매장)

```prisma
model Store {
  id          Int       @id @default(autoincrement())
  customerId  Int
  name        String
  type        String?              // 매장 유형
  address     String?
  phone       String?
  website     String?
  description String?
  metadata    String?              // JSON (추가 정보)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // 관계
  customer        Customer           @relation(fields: [customerId], references: [id], onDelete: Cascade)
  orders          Order[]
  quotations      Quotation[]
  consultations   Consultation[]
  tasks           Task[]
  documents       Document[]
  purchaseOrders  PurchaseOrder[]    // ⭐ NEW
  workHistory     WorkHistory[]      // ⭐ NEW (기존 있었으나 연결 추가)

  @@index([customerId])
  @@index([name])
}
```

### 2.3 Product (상품)

```prisma
model Product {
  id          Int       @id @default(autoincrement())
  name        String
  category    String?
  description String?
  unitPrice   Decimal   @default(0)      // 기본 판매가
  costPrice   Decimal?                   // ⭐ NEW: 기본 원가 (참고용)
  unit        String?                    // 단위 (건, 개월, 회 등)
  isActive    Boolean   @default(true)
  productType String    @default("general")  // ⭐ NEW: general, advertising
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // 관계
  orderItems          OrderItem[]
  quotationItems      QuotationItem[]
  customerPrices      CustomerProductPrice[]  // ⭐ NEW
  supplierProducts    SupplierProduct[]       // ⭐ NEW
  purchaseOrderItems  PurchaseOrderItem[]     // ⭐ NEW

  @@index([name])
  @@index([category])
  @@index([isActive])
  @@index([productType])
}
```

### 2.4 Order (주문)

```prisma
model Order {
  id           Int       @id @default(autoincrement())
  customerId   Int
  storeId      Int?
  quotationId  Int?
  orderNumber  String    @unique          // 주문번호 (자동생성)
  status       String    @default("pending")  // pending, confirmed, in_progress, completed, cancelled
  orderDate    DateTime
  dueDate      DateTime?
  totalAmount  Decimal   @default(0)      // 총 금액 (매출)
  paidAmount   Decimal   @default(0)      // 입금액
  unpaidAmount Decimal   @default(0)      // 미수금 (자동계산)
  notes        String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  // 관계
  customer        Customer         @relation(fields: [customerId], references: [id], onDelete: Cascade)
  store           Store?           @relation(fields: [storeId], references: [id], onDelete: SetNull)
  quotation       Quotation?       @relation(fields: [quotationId], references: [id], onDelete: SetNull)
  items           OrderItem[]
  invoices        Invoice[]
  settlements     Settlement[]
  consultations   Consultation[]
  tasks           Task[]
  documents       Document[]
  purchaseOrders  PurchaseOrder[]  // ⭐ NEW
  profitAnalysis  ProfitAnalysis?  // ⭐ NEW

  @@index([customerId])
  @@index([storeId])
  @@index([quotationId])
  @@index([orderNumber])
  @@index([orderDate])
  @@index([status])
}
```

### 2.5 OrderItem (주문 항목)

```prisma
model OrderItem {
  id                 Int       @id @default(autoincrement())
  orderId            Int
  productId          Int?
  productName        String?
  productDescription String?
  quantity           Int       @default(1)
  unitPrice          Decimal              // 판매 단가
  totalPrice         Decimal
  notes              String?
  // 광고 상품 특성
  isAdvertising      Boolean   @default(false)  // ⭐ NEW
  startDate          DateTime?            // 광고 시작일
  endDate            DateTime?            // 광고 종료일
  dailyCount         Int?                 // 일일 건수/유입타수
  totalDays          Int?                 // 총 진행일수
  createdAt          DateTime  @default(now())

  // 관계
  order   Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product Product? @relation(fields: [productId], references: [id], onDelete: SetNull)

  @@index([orderId])
  @@index([productId])
  @@index([startDate])
  @@index([endDate])
}
```

### 2.6 Quotation (견적서)

```prisma
model Quotation {
  id              Int       @id @default(autoincrement())
  customerId      Int
  storeId         Int?
  quotationNumber String    @unique
  quotationDate   DateTime
  validUntil      DateTime?
  status          String    @default("draft")  // draft, sent, accepted, rejected, expired
  totalAmount     Decimal   @default(0)
  taxAmount       Decimal   @default(0)        // ⭐ NEW: 부가세
  notes           String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // 관계
  customer        Customer        @relation(fields: [customerId], references: [id], onDelete: Cascade)
  store           Store?          @relation(fields: [storeId], references: [id], onDelete: SetNull)
  items           QuotationItem[]
  orders          Order[]
  consultations   Consultation[]

  @@index([customerId])
  @@index([quotationNumber])
  @@index([status])
  @@index([quotationDate])
}
```

### 2.7 Invoice (세금계산서)

```prisma
model Invoice {
  id            Int       @id @default(autoincrement())
  orderId       Int
  customerId    Int
  invoiceNumber String    @unique
  invoiceType   String    @default("tax_invoice")  // ⭐ NEW: tax_invoice, cash_receipt
  invoiceDate   DateTime
  dueDate       DateTime?
  status        String    @default("pending")  // pending, sent, paid, cancelled
  supplyAmount  Decimal              // ⭐ NEW: 공급가액
  taxAmount     Decimal              // ⭐ NEW: 세액
  totalAmount   Decimal              // ⭐ NEW: 합계 (amount → totalAmount)
  isPaid        Boolean   @default(false)
  paidDate      DateTime?
  paidAmount    Decimal   @default(0)  // ⭐ NEW: 실제 입금액
  notes         String?
  pdfUrl        String?              // ⭐ NEW: PDF 파일 경로
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // 관계
  order     Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  customer  Customer  @relation(fields: [customerId], references: [id], onDelete: Cascade)
  payments  Payment[]  // ⭐ NEW

  @@index([orderId])
  @@index([customerId])
  @@index([invoiceNumber])
  @@index([status])
  @@index([isPaid])
  @@index([invoiceDate])
}
```

---

## 3. 신규 테이블 (2026 추가) ⭐

### 3.1 Supplier (거래처) ⭐ NEW

```prisma
model Supplier {
  id             Int       @id @default(autoincrement())
  name           String
  businessNumber String?   @unique          // 사업자번호
  contactName    String?                    // 담당자명
  phone          String?
  email          String?
  address        String?
  website        String?
  serviceTypes   String?                    // JSON: ["블로그", "리뷰", "광고"]
  paymentTerms   String?                    // 결제 조건 (선결제, 후결제, D+7 등)
  bankAccount    String?                    // 계좌 정보
  notes          String?
  isActive       Boolean   @default(true)
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

**주요 필드 설명**:
- `serviceTypes`: 거래처가 취급하는 서비스 유형 (필터링용)
- `paymentTerms`: 결제 조건 (예: "선결제", "작업완료 후 7일 내", "월말 정산")
- `bankAccount`: 대금 이체용 계좌 정보

---

### 3.2 SupplierProduct (거래처별 상품 단가) ⭐ NEW

```prisma
model SupplierProduct {
  id            Int       @id @default(autoincrement())
  supplierId    Int
  productId     Int
  supplierPrice Decimal                    // 매입가
  leadTimeDays  Int?                       // 리드타임 (작업 소요일)
  minOrderQty   Int?                       // 최소 주문량
  isPreferred   Boolean   @default(false)  // 우선 거래처 여부
  validFrom     DateTime?
  validUntil    DateTime?
  notes         String?
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

**활용 예시**:
```
상품: "파워블로거 포스팅"
- A거래처: 매입가 3만원, 리드타임 3일
- B거래처: 매입가 2.5만원, 리드타임 5일, 최소 10건
- C거래처: 매입가 3.5만원, 리드타임 1일 (긴급용)
```

---

### 3.3 PurchaseOrder (구매발주) ⭐ NEW

```prisma
model PurchaseOrder {
  id            Int       @id @default(autoincrement())
  orderId       Int?                       // 연결된 판매주문
  supplierId    Int
  storeId       Int?                       // 작업 대상 매장
  poNumber      String    @unique          // 발주번호 (자동생성)
  poDate        DateTime                   // 발주일
  deliveryDate  DateTime?                  // 납기일
  completedDate DateTime?                  // 완료일
  totalAmount   Decimal                    // 발주 금액 (비용)
  status        String    @default("draft")  // draft, sent, confirmed, in_progress, completed, cancelled
  notes         String?
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

**발주번호 생성 규칙**:
```
PO-YYYYMM-XXXX
예: PO-202512-0001
```

---

### 3.4 PurchaseOrderItem (구매발주 항목) ⭐ NEW

```prisma
model PurchaseOrderItem {
  id          Int       @id @default(autoincrement())
  poId        Int
  productId   Int?
  productName String?
  quantity    Int       @default(1)
  unitPrice   Decimal                    // 매입 단가
  totalPrice  Decimal
  workDetails String?                    // JSON: 작업 상세 (키워드, URL 등)
  notes       String?
  createdAt   DateTime  @default(now())

  // 관계
  purchaseOrder PurchaseOrder @relation(fields: [poId], references: [id], onDelete: Cascade)
  product       Product?      @relation(fields: [productId], references: [id], onDelete: SetNull)

  @@index([poId])
  @@index([productId])
}
```

**workDetails 예시 (JSON)**:
```json
{
  "keywords": ["강남 맛집", "서울 데이트"],
  "targetUrl": "https://place.naver.com/...",
  "blogUrl": "https://blog.naver.com/...",
  "deadline": "2025-12-31"
}
```

---

### 3.5 Payment (입금 기록) ⭐ NEW

```prisma
model Payment {
  id            Int       @id @default(autoincrement())
  invoiceId     Int?                       // 연결된 계산서 (선택)
  customerId    Int
  paymentDate   DateTime                   // 입금일
  amount        Decimal                    // 입금액
  paymentMethod String?                    // bank_transfer, card, cash
  bankName      String?                    // 입금 은행
  depositorName String?                    // 입금자명
  transactionId String?                    // 은행 거래 ID
  matchStatus   String    @default("unmatched")  // auto_matched, manual_matched, unmatched
  matchedBy     String?                    // 매칭한 사용자
  matchedAt     DateTime?                  // 매칭 일시
  notes         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // 관계
  invoice   Invoice?  @relation(fields: [invoiceId], references: [id], onDelete: SetNull)
  customer  Customer  @relation(fields: [customerId], references: [id], onDelete: Cascade)

  @@index([invoiceId])
  @@index([customerId])
  @@index([paymentDate])
  @@index([matchStatus])
}
```

**매칭 로직**:
1. `unmatched`: 입금 기록만 있고 계산서 미연결
2. `auto_matched`: 시스템이 자동으로 Invoice와 매칭
3. `manual_matched`: 관리자가 수동으로 매칭

---

### 3.6 ProfitAnalysis (손익분석) ⭐ NEW

```prisma
model ProfitAnalysis {
  id            Int       @id @default(autoincrement())
  orderId       Int       @unique          // 1:1 관계
  revenue       Decimal                    // 매출 (Order.totalAmount)
  costOfGoods   Decimal                    // 매입원가 (Σ PurchaseOrder.totalAmount)
  grossProfit   Decimal                    // 매출총이익 = revenue - costOfGoods
  profitMargin  Decimal                    // 이익률 % = grossProfit / revenue * 100
  analysisDate  DateTime  @default(now())  // 분석 일시
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // 관계
  order Order @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@index([analysisDate])
}
```

**자동 계산 트리거**:
- Order.status = 'completed' 변경 시
- PurchaseOrder 추가/수정/삭제 시
- 수동 재계산 버튼

---

### 3.7 CustomerProductPrice (고객별 특별 단가) ⭐ NEW

```prisma
model CustomerProductPrice {
  id          Int       @id @default(autoincrement())
  customerId  Int
  productId   Int
  customPrice Decimal                    // 고객 특별가
  validFrom   DateTime?                  // 유효 시작일
  validUntil  DateTime?                  // 유효 종료일
  notes       String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // 관계
  customer    Customer  @relation(fields: [customerId], references: [id], onDelete: Cascade)
  product     Product   @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([customerId, productId])
  @@index([customerId])
  @@index([productId])
}
```

**단가 적용 우선순위**:
1. CustomerProductPrice.customPrice (유효기간 내) → 최우선
2. Product.unitPrice → 기본값

---

### 3.8 WorkHistory (작업 히스토리) - 연결 강화

```prisma
model WorkHistory {
  id          Int       @id @default(autoincrement())
  storeId     Int
  orderId     Int?                       // ⭐ NEW: 주문 연결
  poId        Int?                       // ⭐ NEW: 구매발주 연결
  workDate    DateTime
  workType    String                     // 블로그, 리뷰, 광고세팅 등
  workDetail  String
  workCount   Int       @default(1)      // 작업 수량
  beforeRank  Int?                       // 작업 전 순위
  afterRank   Int?                       // 작업 후 순위
  notes       String?
  attachments String?                    // JSON: 첨부파일 배열
  createdBy   String?
  createdAt   DateTime  @default(now())

  // 관계
  store Store @relation(fields: [storeId], references: [id], onDelete: Cascade)

  @@index([storeId])
  @@index([orderId])
  @@index([workDate])
}
```

---

### 3.9 AuditLog (변경 이력) ⭐ NEW

```prisma
model AuditLog {
  id         Int      @id @default(autoincrement())
  entityType String                     // customer, order, invoice, etc.
  entityId   Int
  action     String                     // create, update, delete
  oldValue   String?                    // JSON: 변경 전 값
  newValue   String?                    // JSON: 변경 후 값
  changedBy  String?                    // 변경한 사용자
  ipAddress  String?                    // IP 주소
  userAgent  String?                    // 브라우저 정보
  createdAt  DateTime @default(now())

  @@index([entityType, entityId])
  @@index([action])
  @@index([createdAt])
}
```

**42ment-erp의 Adjustment 개념 적용**:
- 모든 중요 데이터 변경 이력 추적
- 언제, 누가, 무엇을 변경했는지 기록
- 데이터 복구 및 감사 추적 가능

---

## 4. 테이블 관계 요약

### 4.1 핵심 관계

| 관계 | 설명 |
|------|------|
| Customer → Store | 1:N (고객이 여러 매장 보유) |
| Customer → Order | 1:N (고객이 여러 주문) |
| Quotation → Order | 1:N (견적서에서 여러 주문 가능, 보통 1:1) |
| Order → OrderItem | 1:N (주문에 여러 항목) |
| Order → PurchaseOrder | 1:N (주문에 여러 구매발주) |
| PurchaseOrder → Supplier | N:1 (구매발주가 하나의 거래처) |
| Order → Invoice | 1:N (주문에 여러 계산서) |
| Invoice → Payment | 1:N (계산서에 여러 입금, 분할 결제) |
| Order → ProfitAnalysis | 1:1 (주문당 하나의 손익분석) |

### 4.2 단가 적용 관계

```
Product.unitPrice (기본 판매가)
    ↓
CustomerProductPrice.customPrice (고객 특별가, 우선 적용)
    ↓
QuotationItem.unitPrice / OrderItem.unitPrice (최종 적용가)

SupplierProduct.supplierPrice (거래처별 매입가)
    ↓
PurchaseOrderItem.unitPrice (실제 매입가)
```

---

## 5. 마이그레이션 계획

### 5.1 Phase 1: 핵심 테이블 추가

```bash
# 1. Prisma 스키마 수정
# prisma/schema.prisma 에 신규 모델 추가

# 2. 마이그레이션 생성
npx prisma migrate dev --name add_supplier_purchase_payment

# 3. Prisma Client 재생성
npx prisma generate
```

### 5.2 추가할 테이블 순서

1. **Supplier** (의존성 없음)
2. **SupplierProduct** (Supplier, Product 필요)
3. **PurchaseOrder** (Order, Supplier, Store 필요)
4. **PurchaseOrderItem** (PurchaseOrder, Product 필요)
5. **Payment** (Invoice, Customer 필요)
6. **ProfitAnalysis** (Order 필요)
7. **CustomerProductPrice** (Customer, Product 필요)
8. **AuditLog** (의존성 없음)

### 5.3 기존 테이블 수정

- Product: `costPrice`, `productType` 추가
- Invoice: `invoiceType`, `supplyAmount`, `taxAmount`, `pdfUrl` 추가
- OrderItem: `isAdvertising` 추가
- Quotation: `taxAmount` 추가

---

## 6. 다음 단계

1. **각론 문서 작성**: 모듈별 상세 설계
2. **Prisma 스키마 수정**: 실제 코드 반영
3. **Service Layer 구현**: 비즈니스 로직

---

## 변경 이력

| 버전 | 날짜 | 변경 내역 | 작성자 |
|------|------|----------|--------|
| 1.0 | 2025-12-31 | 초안 작성 | AI Assistant |



