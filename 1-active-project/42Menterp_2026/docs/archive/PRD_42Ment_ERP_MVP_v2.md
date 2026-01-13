# 42Ment ERP MVP v2 - 구현 계획서 (PRD)

> **작성일:** 2026-01-12  
> **버전:** 2.0  
> **상태:** 확정

---

## 1. 개요

### 1.1 프로젝트 목적
광고대행사(42Ment)의 핵심 업무 프로세스를 시스템화하여 수작업을 최소화하고 손익을 실시간으로 파악할 수 있는 ERP 시스템 구축

### 1.2 핵심 문제
- 현재 Excel로 수기 관리 → 시스템화 필요
- 발주 비용 관리 부재 → 손익 파악 불가
- 입금 확인 수작업 → 자동화 필요
- 연장/만료 관리 누락 → 알림 시스템 필요

### 1.3 기술 스택
- **Frontend/Backend:** Next.js 14+ (App Router)
- **Database:** SQLite (MVP) → PostgreSQL (확장 시)
- **ORM:** Prisma
- **UI:** shadcn/ui + Tailwind CSS
- **PDF:** @react-pdf/renderer
- **Excel:** xlsx (SheetJS)
- **알림:** Telegram Bot API

---

## 2. 핵심 비즈니스 플로우

```
[1] 고객 문의/상담
      ↓
[2] 견적서 작성 → PDF 저장 → 이미지 발송
      ↓
[3] 고객 확정 → 주문 전환 (수정 가능)
      ↓
[4] 거래처별 일괄 발주 → 발주서 Excel
      ↓
[5] 입금 확인 (자동/수동)
      ↓
[6] 작업 진행 → 연장 알림 (D-1, D-3)
      ↓
[7] 세금계산서 발급 (Excel 일괄)
      ↓
[8] 손익 분석
```

---

## 3. 데이터 모델 (Prisma Schema)

### 3.1 기존 모델 수정

```prisma
// Store 모델 확장
model Store {
  id             Int       @id @default(autoincrement())
  customerId     Int
  name           String
  type           String?
  address        String?
  phone          String?
  website        String?
  description    String?
  metadata       String?
  naverPlaceId   String?   // NEW: 네이버플레이스 mid
  naverPlaceUrl  String?   // NEW: 플레이스 URL
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  
  // relations...
}

// Order 모델 확장
model Order {
  id            Int       @id @default(autoincrement())
  customerId    Int
  storeId       Int?
  quotationId   Int?
  orderNumber   String    @unique
  status        String    @default("pending")
  orderDate     DateTime
  dueDate       DateTime?
  
  // NEW: 부가세 관련
  vatType       String    @default("taxable")  // taxable, exempt
  supplyAmount  Decimal   @default(0)          // 공급가액
  vatAmount     Decimal   @default(0)          // 부가세
  totalAmount   Decimal   @default(0)          // 합계
  
  // NEW: 입금 관련
  isPaid        Boolean   @default(false)
  paidDate      DateTime?
  paidAmount    Decimal   @default(0)
  unpaidAmount  Decimal   @default(0)
  bankAccount   String?   // taxable, exempt 계좌 구분
  
  notes         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // relations...
  purchaseOrders PurchaseOrder[]
}

// Customer 모델 확장
model Customer {
  // 기존 필드...
  representativeName String?  // NEW: 대표자명 (세금계산서용)
  
  // relations...
  customerPrices CustomerProductPrice[]
}
```

### 3.2 신규 모델

```prisma
// 거래처 (발주 채널)
model Supplier {
  id          Int       @id @default(autoincrement())
  name        String    // 피닉스, 말차, 히든 등
  contactName String?
  phone       String?
  email       String?
  bankAccount String?
  notes       String?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  products       SupplierProduct[]
  purchaseOrders PurchaseOrder[]
}

// 거래처별 상품 단가
model SupplierProduct {
  id          Int      @id @default(autoincrement())
  supplierId  Int
  productId   Int
  unitCost    Decimal  // 이 거래처의 단가
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  supplier    Supplier @relation(fields: [supplierId], references: [id], onDelete: Cascade)
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  @@unique([supplierId, productId])
}

// 고객별 특별 단가
model CustomerProductPrice {
  id          Int      @id @default(autoincrement())
  customerId  Int
  productId   Int
  unitPrice   Decimal  // 이 고객에게 적용되는 특별 단가
  notes       String?  // 할인 사유 등
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  customer    Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  product     Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  
  @@unique([customerId, productId])
}

// 구매발주
model PurchaseOrder {
  id              Int       @id @default(autoincrement())
  supplierId      Int
  poNumber        String    @unique  // 발주번호
  poDate          DateTime
  status          String    @default("pending")  // pending, sent, completed
  totalAmount     Decimal   @default(0)
  notes           String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  supplier        Supplier           @relation(fields: [supplierId], references: [id])
  items           PurchaseOrderItem[]
  
  @@index([supplierId])
  @@index([poDate])
  @@index([status])
}

// 발주 항목
model PurchaseOrderItem {
  id              Int      @id @default(autoincrement())
  purchaseOrderId Int
  orderId         Int?     // 연결된 고객 주문
  orderItemId     Int?     // 연결된 주문 항목
  storeId         Int?     // 매장 (발주서 출력용)
  productId       Int?
  productName     String?
  quantity        Int      @default(1)  // 실제 발주 수량 (주문과 다를 수 있음)
  unitCost        Decimal
  totalCost       Decimal
  notes           String?
  createdAt       DateTime @default(now())
  
  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  
  @@index([purchaseOrderId])
  @@index([orderId])
}

// 입금 내역 (은행 연동용)
model BankTransaction {
  id              Int       @id @default(autoincrement())
  bankAccount     String    // 계좌 구분 (taxable/exempt)
  transactionDate DateTime
  amount          Decimal
  depositorName   String    // 입금자명
  memo            String?
  isMatched       Boolean   @default(false)
  matchedOrderId  Int?      // 매칭된 주문
  importedAt      DateTime  @default(now())
  
  @@index([bankAccount])
  @@index([transactionDate])
  @@index([isMatched])
}
```

---

## 4. 기능 상세

### 4.1 고객별 단가 관리
- **위치:** 고객 상세 > 특별 단가 탭
- **기능:**
  - 고객별 상품 특별 단가 등록/수정/삭제
  - 견적/주문 생성 시 자동 적용
  - 기본 단가와 비교 표시

### 4.2 견적서 발송
- **PDF 생성:** @react-pdf/renderer로 견적서 템플릿
- **이미지 변환:** PDF → PNG 변환
- **발송:**
  - 텔레그램: 본인에게 이미지 전송
  - 이메일: 고객 이메일로 전송 (선택)

### 4.3 견적 → 주문 전환
- **현재:** 견적 내용 그대로 복사
- **개선:** 전환 시 수정 화면 표시
  - 수량/단가/항목 변경 가능
  - 항목 추가/삭제 가능
  - 견적서와 연결은 유지

### 4.4 부가세 처리
- **기본:** 부가세 별도 (vatType = "taxable")
  - 공급가액 100,000원 + 부가세 10,000원 = 110,000원
- **면세:** 부가세 없음 (vatType = "exempt")
  - 공급가액 100,000원 = 100,000원
- **UI:** 주문 생성 시 선택

### 4.5 거래처별 일괄 발주
```
[일괄 발주] 화면
    ↓
1. 거래처(채널) 선택
2. 미발주 주문 자동 필터 (해당 상품 포함된 것)
3. 매장별 건수 확인/수정
4. [일괄 발주] 버튼
    ↓
- PurchaseOrder 생성
- 발주서 Excel 다운로드
```

**발주서 Excel 양식:**
| 매장명 | mid | 플레이스URL | 건수 | 비고 |
|--------|-----|-------------|------|------|

### 4.6 입금 확인

#### 과세 계좌 (3가지 방식)
1. **수동:** 주문별 입금완료 체크
2. **엑셀 업로드:** 은행 내역 엑셀 → 자동 매칭
3. **API 연동:** 하나은행 기업 API

#### 면세 계좌
- **수동만:** 직접 체크

#### 자동 매칭 로직
```
입금자명 + 금액 → 고객명 + 미입금 주문 금액 매칭
    ↓
매칭 성공 → 자동 입금완료 처리
매칭 실패 → 수동 확인 목록에 표시
```

### 4.7 세금계산서 발급
- **방식:** 홈택스 엑셀 일괄 발급
- **기능:**
  - 주문 목록에서 다중 선택
  - [세금계산서 Excel] 버튼 → 홈택스 양식 다운로드
  - 홈택스에서 일괄 업로드

**필요 데이터:**
| 작성일자 | 공급받는자 사업자번호 | 상호 | 대표자 | 공급가액 | 세액 | 품목 |
|----------|----------------------|------|--------|----------|------|------|

### 4.8 연장 알림
- **대상:** OrderItem.endDate 기준
- **알림 시점:** D-3, D-1 (종료 3일/1일 전)
- **발송:** 텔레그램 봇
- **내용:**
  ```
  ⚠️ 연장 필요한 주문 3건
  
  - A고객/강남점 블로그 (내일 종료)
  - B고객/홍대점 트래픽 (3일 후 종료)
  - C고객/부산점 리뷰 (내일 종료)
  ```

### 4.9 주문 대시보드 개선
```
┌─────────────────────────────────────────────────┐
│  📊 주문 현황                                    │
├─────────┬─────────┬─────────┬─────────┬────────┤
│ 전체    │ 진행중  │ 완료    │ 연장필요 │ 미입금  │
│ 125건   │ 45건    │ 72건    │ ⚠️ 8건  │ 12건   │
└─────────┴─────────┴─────────┴─────────┴────────┘
```
- 탭/필터로 빠른 조회
- 연장필요: endDate 기준 D-3 이내
- 미입금: isPaid = false

### 4.10 손익 분석
- **계산:** 주문 매출 - 발주 비용 = 이익
- **화면:** 기존 정산 대시보드 활성화
- **표시:**
  - 기간별 매출/비용/이익
  - 고객별 수익
  - 상품별 마진율

---

## 5. 구현 우선순위

### Phase 1: 핵심 기능 (1~2주)
| 순서 | 기능 | 예상 시간 |
|------|------|-----------|
| 1 | Prisma 스키마 확장 | 2시간 |
| 2 | 거래처(Supplier) CRUD | 4시간 |
| 3 | 거래처별 상품 단가 | 2시간 |
| 4 | 구매발주(PurchaseOrder) CRUD | 6시간 |
| 5 | 채널별 일괄 발주 화면 | 6시간 |
| 6 | 발주서 Excel 다운로드 | 3시간 |
| 7 | 손익 대시보드 연결 | 2시간 |

### Phase 2: 견적/주문 개선 (1주)
| 순서 | 기능 | 예상 시간 |
|------|------|-----------|
| 1 | 고객별 특별 단가 | 4시간 |
| 2 | 견적→주문 전환 개선 | 4시간 |
| 3 | 부가세 처리 (과세/면세) | 3시간 |
| 4 | 견적서 PDF 생성 | 4시간 |
| 5 | PDF → 이미지 변환 | 2시간 |
| 6 | 텔레그램 발송 | 2시간 |

### Phase 3: 입금/세금계산서 (1주)
| 순서 | 기능 | 예상 시간 |
|------|------|-----------|
| 1 | 입금 수동 확인 | 2시간 |
| 2 | 입금 엑셀 업로드 매칭 | 4시간 |
| 3 | 하나은행 API 연동 | 8시간 |
| 4 | 세금계산서 Excel 출력 | 4시간 |

### Phase 4: 알림/대시보드 (3일)
| 순서 | 기능 | 예상 시간 |
|------|------|-----------|
| 1 | 연장 알림 (D-1, D-3) | 4시간 |
| 2 | 주문 대시보드 개선 | 4시간 |
| 3 | Store 필드 추가 (mid, URL) | 1시간 |

---

## 6. 화면 구성

### 6.1 신규 화면
- `/suppliers` - 거래처 목록
- `/suppliers/new` - 거래처 등록
- `/suppliers/[id]` - 거래처 상세 (상품 단가 포함)
- `/purchase-orders` - 발주 목록
- `/purchase-orders/new` - 발주 등록
- `/purchase-orders/bulk` - **채널별 일괄 발주**
- `/customers/[id]/prices` - 고객별 특별 단가
- `/bank-transactions` - 입금 내역 (매칭 관리)

### 6.2 기존 화면 수정
- `/orders` - 대시보드 개선 (연장필요/미입금 필터)
- `/orders/new` - 부가세 선택 추가
- `/quotations/[id]` - PDF/이미지 발송 버튼
- `/quotations/[id]/convert` - 주문 전환 (수정 가능)
- `/settlements` - 손익 표시 활성화

---

## 7. API 엔드포인트

### 7.1 신규 API
```
# 거래처
GET/POST   /api/suppliers
GET/PUT/DELETE /api/suppliers/[id]
GET/POST   /api/suppliers/[id]/products  # 거래처별 상품 단가

# 구매발주
GET/POST   /api/purchase-orders
GET/PUT/DELETE /api/purchase-orders/[id]
POST       /api/purchase-orders/bulk      # 일괄 발주
GET        /api/purchase-orders/[id]/excel # 발주서 Excel

# 고객별 단가
GET/POST   /api/customers/[id]/prices
PUT/DELETE /api/customers/[id]/prices/[productId]

# 견적서 발송
GET        /api/quotations/[id]/pdf       # PDF 다운로드
POST       /api/quotations/[id]/send      # 텔레그램/이메일 발송

# 입금
POST       /api/bank-transactions/import  # 엑셀 업로드
POST       /api/bank-transactions/sync    # 하나은행 API 동기화
POST       /api/bank-transactions/match   # 자동 매칭

# 세금계산서
POST       /api/orders/tax-invoice-excel  # 홈택스 양식 Excel
```

---

## 8. 환경 설정

### 8.1 필요한 환경변수 (.env)
```env
# Database
DATABASE_URL="file:./dev.db"

# Telegram
TELEGRAM_BOT_TOKEN="your-bot-token"
TELEGRAM_CHAT_ID="your-chat-id"

# Email (선택)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# 하나은행 API (Phase 3)
HANA_API_KEY="your-api-key"
HANA_ACCOUNT_TAXABLE="과세계좌번호"
HANA_ACCOUNT_EXEMPT="면세계좌번호"
```

---

## 9. 성공 기준

### MVP 완료 조건
- [ ] 거래처 등록 및 상품별 단가 설정 가능
- [ ] 주문에서 거래처별 발주 생성 가능
- [ ] 채널별 일괄 발주 및 발주서 Excel 다운로드
- [ ] 손익 대시보드에서 실제 비용 반영
- [ ] 고객별 특별 단가 적용
- [ ] 견적서 PDF 생성 및 이미지 발송
- [ ] 부가세 별도/면세 선택 가능
- [ ] 입금 확인 (수동 + 엑셀 매칭)
- [ ] 세금계산서 Excel 출력
- [ ] 연장 필요 알림 (텔레그램)

---

## 10. 참고사항

### 10.1 기존 코드베이스
- 위치: `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\marketing-agency-erp`
- 이미 구현된 것: Customer, Store, Product, Order, Quotation, Invoice, Consultation, Task, Document, Settlement(일부)

### 10.2 향후 확장 (Post-MVP)
- 카카오 알림톡 발송
- 고객 포털 (셀프 주문)
- 모바일 앱
- 다른 은행 API 연동
- 리포트 자동 생성/발송

---

**문서 끝**

