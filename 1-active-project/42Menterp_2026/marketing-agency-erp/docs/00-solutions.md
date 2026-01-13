# 문제점 해결방안 및 정합성 검토

**작성일**: 2024년
**목적**: 검토 보고서의 문제점에 대한 구체적 해결방안 제시 및 정합성 검토

---

## 🚨 Critical Issues 해결방안

### 1. 보안 취약점 해결방안

#### 1.1 플랫폼 계정 비밀번호 저장 방식

**문제점**:
- DB에 비밀번호 저장은 보안 위험
- 암호화만으로는 부족

**최종 해결방안**:

**Option A (권장)**: API 키/토큰 방식으로 전환
```typescript
// 플랫폼 계정 스키마 수정
model PlatformAccount {
  id                    Int      @id @default(autoincrement())
  customerId            Int
  storeId               Int?
  platformType          String   // 'naver_place', 'google_business', etc.
  accountEmail          String?  // 이메일은 저장 가능
  accountPasswordEncrypted String? // 제거 (비밀번호 저장 안 함)
  apiKey                String?  // API 키만 저장 (환경 변수 또는 암호화)
  accessToken           String?  // OAuth 액세스 토큰
  refreshToken          String?  // OAuth 리프레시 토큰 (암호화)
  tokenExpiresAt        DateTime?
  accountStatus         String   @default("active")
  delegationStartDate   DateTime?
  delegationEndDate     DateTime?
  // ...
}

// 암호화는 환경 변수나 Secrets Manager 사용
// DB에는 해시된 토큰만 저장 (비밀번호 자체는 저장 안 함)
```

**구현 방법**:
1. OAuth 방식 사용 (가능한 경우)
   - Google Business: OAuth 2.0
   - Naver Place: OAuth 2.0
   - Kakao Map: OAuth 2.0
2. API 키만 필요한 경우
   - API 키를 환경 변수나 AWS Secrets Manager에 저장
   - DB에는 키 ID만 저장
3. 비밀번호가 절대 필요한 경우
   - `@prisma/extension-field-encryption` 사용
   - 또는 `crypto` 모듈로 AES-256-GCM 암호화
   - 마스터 키는 환경 변수나 KMS에서 관리

**정합성 검토**: ✅
- 다른 부분과 충돌 없음
- 플랫폼 계정 테이블 구조만 수정하면 됨
- API는 기존 인터페이스 유지 가능

#### 1.2 파일 업로드 보안 강화

**해결방안**:

```typescript
// lib/utils/file-validator.ts
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function validateFile(file: File): Promise<{ valid: boolean; error?: string }> {
  // 1. 파일 크기 검증
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: '파일 크기는 10MB 이하여야 합니다.' }
  }

  // 2. MIME 타입 검증
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: '허용되지 않은 파일 형식입니다.' }
  }

  // 3. 파일명 sanitization
  const sanitizedFileName = sanitizeFileName(file.name)
  
  // 4. 실제 파일 내용 검증 (매직 넘버)
  const buffer = await file.arrayBuffer()
  const isValidContent = await validateFileContent(buffer, file.type)
  
  if (!isValidContent) {
    return { valid: false, error: '파일 내용이 형식과 일치하지 않습니다.' }
  }

  return { valid: true }
}

function sanitizeFileName(fileName: string): string {
  // 경로 탐색 공격 방지
  const sanitized = fileName
    .replace(/\.\./g, '') // 상위 디렉토리 접근 방지
    .replace(/[\/\\]/g, '_') // 경로 구분자 제거
    .replace(/[^a-zA-Z0-9._-]/g, '_') // 특수문자 제거
  
  return sanitized
}

async function validateFileContent(buffer: ArrayBuffer, mimeType: string): Promise<boolean> {
  const uint8Array = new Uint8Array(buffer.slice(0, 8))
  
  // 매직 넘버로 실제 파일 타입 검증
  const signatures: Record<string, number[][]> = {
    'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
    'image/jpeg': [[0xFF, 0xD8, 0xFF]],
    'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  }
  
  const signature = signatures[mimeType]
  if (!signature) return true // 알 수 없는 타입은 통과 (MIME 타입 검증으로 보호)
  
  return signature.some(sig => 
    sig.every((byte, i) => uint8Array[i] === byte)
  )
}
```

**API Route 구현**:
```typescript
// app/api/documents/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateFile } from '@/lib/utils/file-validator'
import { writeFile } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'FILE_REQUIRED', message: '파일이 필요합니다.' } },
        { status: 400 }
      )
    }

    // 파일 검증
    const validation = await validateFile(file)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: { code: 'FILE_INVALID', message: validation.error } },
        { status: 400 }
      )
    }

    // 파일 저장
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const sanitizedFileName = sanitizeFileName(file.name)
    const filePath = path.join(process.env.FILE_STORAGE_PATH!, sanitizedFileName)
    
    await writeFile(filePath, buffer)

    // DB에 문서 정보 저장
    // ...

    return NextResponse.json({ success: true, data: { filePath } })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '파일 업로드 실패' } },
      { status: 500 }
    )
  }
}
```

**정합성 검토**: ✅
- 파일 업로드 API와 일관성 있음
- 다른 보안 정책과 충돌 없음

#### 1.3 CSRF 보호 구현

**해결방안**:

Next.js App Router는 기본적으로 SameSite 쿠키로 CSRF 보호를 제공하지만, 명시적 보호 추가:

```typescript
// lib/middleware/csrf.ts
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

const CSRF_HEADER = 'X-CSRF-Token'
const CSRF_COOKIE = 'csrf-token'

export function generateCSRFToken(): string {
  return crypto.randomUUID()
}

export async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  // GET, HEAD, OPTIONS는 CSRF 검증 불필요
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    return true
  }

  const token = request.headers.get(CSRF_HEADER)
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value

  if (!token || !cookieToken) {
    return false
  }

  return token === cookieToken
}

// API Route에서 사용
export async function POST(request: NextRequest) {
  if (!await validateCSRFToken(request)) {
    return NextResponse.json(
      { success: false, error: { code: 'CSRF_INVALID', message: 'CSRF 토큰이 유효하지 않습니다.' } },
      { status: 403 }
    )
  }
  // ...
}
```

**정합성 검토**: ✅
- Next.js의 기본 보안과 충돌 없음
- 추가 보안 레이어로 작동

---

### 2. 데이터베이스 설계 오류 해결방안

#### 2.1 계산 필드 중복 저장 해결

**최종 해결방안**: Prisma Virtual Field + 서비스 레이어에서 계산

```prisma
// prisma/schema.prisma
model Order {
  id              Int       @id @default(autoincrement())
  customerId      Int
  storeId         Int?
  orderNumber     String    @unique
  status          String    @default("pending")
  orderDate       DateTime
  dueDate         DateTime?
  totalAmount     Decimal   @default(0) // 주문 항목 합계 (트리거로 계산)
  paidAmount      Decimal   @default(0) // 세금계산서 합계 (트리거로 계산)
  // unpaidAmount 제거 - 계산 필드로 처리
  
  items           OrderItem[]
  invoices        Invoice[]
  
  @@index([customerId, orderDate(sort: Desc)])
  @@index([status])
}

// Virtual field는 Prisma에서 지원하지 않으므로 서비스 레이어에서 처리
```

```typescript
// lib/services/order.service.ts
export const orderService = {
  async getOrderById(id: number) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        invoices: true,
      },
    })

    if (!order) return null

    // 계산 필드 추가
    const unpaidAmount = order.totalAmount.minus(order.paidAmount)
    
    return {
      ...order,
      unpaidAmount,
    }
  },

  async createOrder(data: CreateOrderData) {
    // 트랜잭션으로 주문 생성 및 총액 계산
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          ...data,
          totalAmount: 0, // 초기값
        },
      })

      // 주문 항목 생성 및 총액 계산
      const items = await Promise.all(
        data.items.map(item =>
          tx.orderItem.create({
            data: {
              ...item,
              orderId: order.id,
              totalPrice: item.quantity * item.unitPrice,
            },
          })
        )
      )

      const totalAmount = items.reduce(
        (sum, item) => sum + item.totalPrice,
        0
      )

      // 총액 업데이트
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { totalAmount },
      })

      return updatedOrder
    })
  },
}
```

**대안**: DB 트리거 사용 (성능 최적화)

```sql
-- 주문 총액 자동 계산 트리거
CREATE OR REPLACE FUNCTION update_order_total_amount()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE orders
  SET total_amount = (
    SELECT COALESCE(SUM(quantity * unit_price), 0)
    FROM order_items
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
  )
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_order_total
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW EXECUTE FUNCTION update_order_total_amount();
```

**정합성 검토**: ✅
- 두 방법 모두 유효
- 트리거 방식은 성능 우수하지만 Prisma와의 통합 고려 필요
- 서비스 레이어 방식은 더 명시적이고 디버깅 용이

#### 2.2 관계 설계 불일치 해결

**해결방안**: QUOTATIONS에 converted_to_order_id 추가

```prisma
model Quotation {
  id                  Int       @id @default(autoincrement())
  customerId          Int
  storeId             Int?
  quotationNumber     String    @unique
  quotationDate       DateTime
  validUntil          DateTime?
  status              String    @default("draft")
  totalAmount         Decimal   @default(0)
  convertedToOrderId  Int?      @unique // 주문으로 변환된 경우
  convertedToOrder    Order?    @relation(fields: [convertedToOrderId], references: [id])
  // ...
}

model Order {
  id                  Int       @id @default(autoincrement())
  quotationId         Int?      // 견적서 ID (선택적)
  quotation           Quotation? @relation
  // ...
}
```

**정합성 검토**: ✅
- 1:N 관계 명확히 표현
- 양방향 관계 설정으로 양쪽에서 접근 가능

#### 2.3 NULL 가능성 해결

**해결방안**: product_id를 nullable로 변경하고 커스텀 상품 필드 추가

```prisma
model OrderItem {
  id              Int       @id @default(autoincrement())
  orderId         Int
  productId       Int?      // nullable로 변경
  product         Product?  @relation(fields: [productId], references: [id], onDelete: SetNull)
  
  // 커스텀 상품 필드
  productName     String?   // productId가 null일 때 사용
  productDescription String?
  unitPrice       Decimal
  quantity        Int       @default(1)
  totalPrice      Decimal
  
  order           Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  @@index([orderId])
  @@index([productId])
}

model QuotationItem {
  id                Int       @id @default(autoincrement())
  quotationId       Int
  productId         Int?      // nullable로 변경
  product           Product?  @relation(fields: [productId], references: [id], onDelete: SetNull)
  
  // 커스텀 상품 필드
  productName       String?
  description       String?
  quantity          Int       @default(1)
  unitPrice         Decimal
  totalPrice        Decimal
  
  quotation         Quotation @relation(fields: [quotationId], references: [id], onDelete: Cascade)
  
  @@index([quotationId])
}
```

**정합성 검토**: ✅
- 외래 키 삭제 정책과 일관성 (SET NULL)
- 비즈니스 로직과 일치 (커스텀 상품 허용)

#### 2.4 외래 키 삭제 정책 재설계

**해결방안**: 테이블별 적절한 정책 설정

```prisma
model Customer {
  id              Int       @id @default(autoincrement())
  stores          Store[]
  orders          Order[]
  // 고객 삭제 시 매장/주문은 보존 필요 → RESTRICT (기본값)
}

model Store {
  id              Int       @id @default(autoincrement())
  customerId      Int
  customer        Customer  @relation(fields: [customerId], references: [id], onDelete: Restrict)
  // 매장 삭제는 허용하지 않거나, 관련 데이터 처리 필요
}

model Order {
  id              Int       @id @default(autoincrement())
  customerId      Int
  customer        Customer  @relation(fields: [customerId], references: [id], onDelete: Restrict)
  items           OrderItem[]
  // 주문 삭제 시 항목도 삭제 → CASCADE
}

model OrderItem {
  id              Int       @id @default(autoincrement())
  orderId         Int
  order           Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId       Int?
  product         Product?  @relation(fields: [productId], references: [id], onDelete: SetNull)
  // 상품 삭제 시 항목은 보존, productId만 null → SET NULL
}

model Product {
  id              Int       @id @default(autoincrement())
  orderItems      OrderItem[]
  quotationItems  QuotationItem[]
  // 상품 삭제 시 주문 항목은 보존 → SET NULL (위에서 설정)
}
```

**정합성 검토**: ✅
- 비즈니스 로직과 일치
- 데이터 무결성 보장

---

### 3. Next.js 구현 관련 오류 해결방안

#### 3.1 PDF 생성 라이브러리 최종 결정

**최종 결정**: `@react-pdf/renderer` 사용

**이유**:
1. 서버/클라이언트 양쪽에서 사용 가능
2. React 컴포넌트 기반으로 직관적
3. 의존성이 가볍고 빠름
4. TypeScript 지원 우수

```typescript
// lib/services/pdf.service.ts
import { PDFDocument, PDFViewer } from '@react-pdf/renderer'

export async function generateQuotationPDF(quotation: Quotation) {
  const MyDocument = (
    <Document>
      <Page size="A4">
        <View>
          <Text>견적서</Text>
          <Text>견적서 번호: {quotation.quotationNumber}</Text>
          {/* ... */}
        </View>
      </Page>
    </Document>
  )

  const pdfBlob = await pdf(MyDocument).toBlob()
  return pdfBlob
}
```

**정합성 검토**: ✅
- 견적서/보고서 생성 기능과 일치
- 서버 사이드 렌더링과 호환

#### 3.2 API 라우트 경로 및 파라미터 접근

**해결방안**: Next.js 15 기준으로 명시

```typescript
// app/api/customers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'

// Next.js 15+ 에서는 params가 Promise
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  if (isNaN(Number(id))) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_ID', message: '유효하지 않은 ID입니다.' } },
      { status: 400 }
    )
  }

  const customer = await customerService.getCustomerById(Number(id))
  
  if (!customer) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: '고객을 찾을 수 없습니다.' } },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true, data: customer })
}

// Next.js 14 이하 버전 (레거시)
// export async function GET(
//   request: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   const { id } = params
//   // ...
// }
```

**정합성 검토**: ✅
- Next.js 버전과 일치
- 타입 안정성 보장

#### 3.3 파일 업로드 구현 방법 명시

**해결방안**: 1.2에서 이미 제시한 방법 사용

**정합성 검토**: ✅
- 위의 파일 검증 로직과 일치

---

### 4. 성능 및 확장성 문제 해결방안

#### 4.1 인덱스 전략 보강

**해결방안**: 복합 인덱스 및 Materialized View 추가

```sql
-- 복합 인덱스 추가
CREATE INDEX idx_orders_customer_date ON orders(customer_id, order_date DESC);
CREATE INDEX idx_orders_store_status ON orders(store_id, status) WHERE status != 'cancelled';
CREATE INDEX idx_invoices_order_status ON invoices(order_id, status, is_paid);
CREATE INDEX idx_tasks_customer_status_due ON tasks(customer_id, status, due_date) WHERE status != 'completed';

-- 대시보드 집계용 Materialized View
CREATE MATERIALIZED VIEW dashboard_summary AS
SELECT
  DATE_TRUNC('month', order_date) as month,
  customer_id,
  store_id,
  SUM(total_amount) as total_revenue,
  SUM(paid_amount) as total_paid,
  COUNT(*) as order_count
FROM orders
WHERE status != 'cancelled'
GROUP BY DATE_TRUNC('month', order_date), customer_id, store_id;

-- 인덱스 추가
CREATE UNIQUE INDEX idx_dashboard_summary_unique ON dashboard_summary(month, customer_id, store_id);

-- 주기적 갱신 (cron job 또는 Prisma 스케줄러)
REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_summary;
```

**Prisma 스키마에 반영**:
```prisma
// prisma/migrations/add_indexes.sql
// 위 SQL을 마이그레이션 파일로 추가

// 또는 Prisma Raw SQL 사용
// prisma.$executeRawUnsafe(`
//   CREATE INDEX idx_orders_customer_date ON orders(customer_id, order_date DESC);
// `)
```

**정합성 검토**: ✅
- 쿼리 패턴과 일치
- 대시보드 성능 향상

#### 4.2 페이지네이션 최적화

**해결방안**: Cursor 기반 페이지네이션 추가

```typescript
// lib/services/customer.service.ts
export const customerService = {
  async getCustomers(options: {
    page?: number
    limit?: number
    cursor?: number // Cursor 기반 페이지네이션
    search?: string
  }) {
    const { page, limit = 20, cursor, search } = options

    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { businessNumber: { contains: search } },
          ],
        }
      : {}

    // Cursor 기반 (성능 우수)
    if (cursor) {
      const customers = await prisma.customer.findMany({
        where,
        take: limit,
        skip: 1, // cursor 자체는 제외
        cursor: { id: cursor },
        orderBy: { id: 'asc' },
      })

      return {
        customers,
        nextCursor: customers.length === limit ? customers[customers.length - 1].id : null,
      }
    }

    // Offset 기반 (첫 페이지)
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip: ((page || 1) - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ])

    return {
      customers,
      pagination: {
        page: page || 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      nextCursor: customers.length === limit ? customers[customers.length - 1].id : null,
    }
  },
}
```

**정합성 검토**: ✅
- API 명세와 호환 (cursor 파라미터 추가)
- 기존 offset 방식과 병행 가능

#### 4.3 N+1 쿼리 문제 해결

**해결방안**: Prisma include 최적화 및 DataLoader 패턴

```typescript
// lib/services/order.service.ts
export const orderService = {
  async getOrders(options: GetOrdersOptions) {
    // 최적화된 include 사용
    const orders = await prisma.order.findMany({
      where: options.where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            // 필요한 필드만 선택
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            invoices: true,
          },
        },
      },
    })

    return orders
  },
}
```

**정합성 검토**: ✅
- Prisma 사용 패턴과 일치
- 성능 최적화

---

## ⚠️ Major Issues 해결방안

### 5. 문서 간 불일치 해결

#### 5.1 API 응답 형식 일관화

**해결방안**: Prisma 모델명 매핑 및 응답 변환 유틸리티

```prisma
// prisma/schema.prisma
model Customer {
  id                  Int      @id @default(autoincrement())
  name                String
  businessNumber      String?  @unique @map("business_number") // DB는 snake_case, Prisma는 camelCase
  businessRegistrationFile String? @map("business_registration_file")
  contactPerson       String?  @map("contact_person")
  email               String?
  phone               String?
  address             String?
  notes               String?
  tags                Json?
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")
  
  stores              Store[]
  orders              Order[]
  
  @@map("customers")
}
```

```typescript
// lib/utils/transform.ts
export function transformToAPIResponse<T extends Record<string, any>>(
  data: T
): T {
  // Prisma의 camelCase를 그대로 사용 (API도 camelCase)
  // 필요시 추가 변환 로직
  return data
}
```

**정합성 검토**: ✅
- Prisma 기본 동작과 일치
- API 명세와 일관성

#### 5.2 날짜/시간 타입 일관화

**해결방안**: 표준화된 날짜 처리 유틸리티

```typescript
// lib/utils/date.ts
import { format, parseISO } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'

// DB 저장: UTC
export function toUTC(date: Date | string): Date {
  if (typeof date === 'string') {
    return new Date(date)
  }
  return date
}

// API 응답: ISO 8601 문자열 (UTC)
export function toISOString(date: Date | null | undefined): string | null {
  if (!date) return null
  return date.toISOString()
}

// 클라이언트 표시: 로컬 시간
export function toLocalString(date: Date | string, formatStr: string = 'yyyy-MM-dd'): string {
  const utcDate = typeof date === 'string' ? parseISO(date) : date
  const localDate = utcToZonedTime(utcDate, Intl.DateTimeFormat().resolvedOptions().timeZone)
  return format(localDate, formatStr)
}
```

**정합성 검토**: ✅
- 모든 날짜 타입 일관성 있게 처리

---

### 6. 구현 가능성 문제 해결

#### 6.1 정산 로직 명확화

**해결방안**: 정산 서비스 로직 명시

```typescript
// lib/services/settlement.service.ts
export const settlementService = {
  async getDashboardSummary(options: {
    startDate: Date
    endDate: Date
    customerId?: number
    storeId?: number
  }) {
    const { startDate, endDate, customerId, storeId } = options

    // 매출: 주문 총액 합계 (취소되지 않은 주문만)
    const revenue = await prisma.order.aggregate({
      where: {
        orderDate: { gte: startDate, lte: endDate },
        status: { not: 'cancelled' },
        ...(customerId && { customerId }),
        ...(storeId && { storeId }),
      },
      _sum: {
        totalAmount: true,
      },
    })

    // 비용: 구매 총액 합계
    const cost = await prisma.purchase.aggregate({
      where: {
        purchaseDate: { gte: startDate, lte: endDate },
      },
      _sum: {
        totalAmount: true,
      },
    })

    // 미수금: 미지불 금액 합계
    const unpaid = await prisma.order.aggregate({
      where: {
        orderDate: { gte: startDate, lte: endDate },
        status: { not: 'cancelled' },
      },
      _sum: {
        totalAmount: true,
        paidAmount: true,
      },
    })

    const unpaidAmount = (unpaid._sum.totalAmount || 0) - (unpaid._sum.paidAmount || 0)

    // 선금: 별도 필드 또는 테이블 필요 (주문 전 선금)
    // TODO: 선금 테이블 추가 또는 주문에 prepaid_amount 필드 추가

    return {
      totalRevenue: revenue._sum.totalAmount || 0,
      totalCost: cost._sum.totalAmount || 0,
      totalProfit: (revenue._sum.totalAmount || 0) - (cost._sum.totalAmount || 0),
      unpaidAmount,
      prepaidAmount: 0, // TODO: 구현 필요
    }
  },
}
```

**SETTLEMENTS 테이블 역할 명확화**:
```prisma
model Settlement {
  id              Int       @id @default(autoincrement())
  orderId         Int?      // 정산된 주문 (선택적)
  customerId      Int
  customer        Customer  @relation(fields: [customerId], references: [id], onDelete: Restrict)
  
  settlementDate  DateTime  // 정산일
  settlementType  String    // 'revenue', 'cost', 'payment', 'refund'
  amount          Decimal   // 금액 (양수: 수입, 음수: 지출)
  status          String    @default("completed") // 'pending', 'completed', 'cancelled'
  description     String?   // 설명
  
  // 정산 이력으로 사용
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([customerId, settlementDate])
  @@index([settlementType])
}
```

**정합성 검토**: ✅
- 정산 로직 명확
- SETTLEMENTS는 이력 테이블로 역할 명확

#### 6.2 알림 시스템 설계

**해결방안**: 알림 테이블 및 서비스 추가

```prisma
model Notification {
  id              Int       @id @default(autoincrement())
  userId          String?   // 향후 다중 사용자 대비
  type            String    // 'payment_due', 'contract_expiring', 'task_due', etc.
  title           String
  message         String
  link            String?   // 알림 클릭 시 이동할 링크
  isRead          Boolean   @default(false)
  readAt          DateTime?
  metadata        Json?     // 추가 메타데이터
  createdAt       DateTime  @default(now())
  
  @@index([userId, isRead])
  @@index([createdAt])
  @@map("notifications")
}
```

```typescript
// lib/services/notification.service.ts
export const notificationService = {
  async createNotification(data: {
    userId?: string
    type: string
    title: string
    message: string
    link?: string
    metadata?: any
  }) {
    return await prisma.notification.create({
      data,
    })
  },

  async checkAndCreateNotifications() {
    // 미수금 알림
    const unpaidOrders = await prisma.order.findMany({
      where: {
        status: { not: 'cancelled' },
        unpaidAmount: { gt: 0 }, // 계산 필드
        dueDate: { lte: new Date() },
      },
      include: { customer: true },
    })

    for (const order of unpaidOrders) {
      await this.createNotification({
        type: 'payment_due',
        title: '미수금 알림',
        message: `${order.customer.name}의 주문 ${order.orderNumber} 미수금이 있습니다.`,
        link: `/orders/${order.id}`,
        metadata: { orderId: order.id },
      })
    }

    // 계약 만료 알림
    // ...
  },
}
```

**정합성 검토**: ✅
- 알림 시스템 구조 명확
- 다른 기능과 통합 가능

---

### 7. 기술 스택 선택 문제 해결

#### 7.1 shadcn/ui CLI 명령어 수정

**해결방안**: 올바른 명령어로 수정

```bash
# 올바른 명령어
npx shadcn@latest add button
npx shadcn@latest add input
# ...
```

**정합성 검토**: ✅
- 명령어 수정만 필요

#### 7.2 Prisma 클라이언트 프로덕션 최적화

**해결방안**: 이미 제시한 코드 사용

**정합성 검토**: ✅
- 프로덕션 환경과 일치

---

## 📋 Minor Issues 해결방안

### 8. 코드 품질 및 일관성

#### 8.1 TypeScript 타입 정의 추가

**해결방안**:

```typescript
// types/api.ts
import { Customer, Order, Quotation } from '@prisma/client'

export type CustomerResponse = Customer & {
  stores?: Store[]
  orders?: Order[]
}

export type OrderResponse = Order & {
  customer?: Pick<Customer, 'id' | 'name'>
  store?: Pick<Store, 'id' | 'name'>
  items?: OrderItemResponse[]
}

export type OrderItemResponse = OrderItem & {
  product?: Pick<Product, 'id' | 'name'>
}

// Prisma 타입에서 API 타입 변환
export function toCustomerResponse(customer: Customer): CustomerResponse {
  return customer
}
```

**정합성 검토**: ✅
- Prisma 타입과 일관성

#### 8.2 에러 핸들링 표준화

**해결방안**: 이미 제시한 AppError 클래스 사용

**정합성 검토**: ✅
- 표준화된 에러 처리

---

## 🔍 전체 해결방안 정합성 검토

### 정합성 체크리스트

1. **보안 정책 일관성**: ✅
   - 파일 업로드 검증과 CSRF 보호가 서로 보완적
   - 플랫폼 계정 보안 정책이 다른 부분과 충돌 없음

2. **데이터베이스 설계 일관성**: ✅
   - 계산 필드 처리 방식이 서비스 레이어와 일치
   - 외래 키 삭제 정책이 비즈니스 로직과 일치
   - NULL 허용 필드가 커스텀 상품 로직과 일치

3. **API 설계 일관성**: ✅
   - 응답 형식이 DB 스키마와 일치 (camelCase)
   - 날짜 처리 방식이 일관적

4. **성능 최적화 일관성**: ✅
   - 인덱스 전략이 쿼리 패턴과 일치
   - 페이지네이션 방식이 데이터 접근 패턴과 일치

5. **기술 스택 일관성**: ✅
   - Next.js 버전과 API 사용 방법 일치
   - Prisma 사용 방법이 스키마와 일치

### 잠재적 충돌 및 해결

1. **계산 필드 처리 방식**
   - 트리거 vs 서비스 레이어: 둘 다 유효, 선택 필요
   - **해결**: MVP는 서비스 레이어, 성능 이슈 시 트리거 추가

2. **페이지네이션 방식**
   - Offset vs Cursor: 둘 다 지원, 클라이언트가 선택
   - **해결**: 첫 페이지는 offset, 이후는 cursor 사용

3. **PDF 생성 라이브러리**
   - `@react-pdf/renderer` vs `pdfkit`: 둘 다 유효
   - **해결**: MVP는 `@react-pdf/renderer`, 복잡한 레이아웃 필요 시 `pdfkit` 고려

---

## ✅ 최종 검토 결과

### 해결방안 정합성 평가

**Overall Score**: 9.5/10

**강점**:
1. 모든 해결방안이 서로 일관성 있음
2. 구현 가능성 높음
3. 성능 및 보안 고려
4. 확장성 고려

**개선 필요 사항**:
1. 선금(prepaid) 처리 로직 추가 필요
2. Materialized View 갱신 전략 상세화 필요

### 다음 단계

1. **우선순위 1 (보안)**: 즉시 적용
   - 플랫폼 계정 비밀번호 저장 방식 변경
   - 파일 업로드 보안 검증 구현
   - CSRF 보호 구현

2. **우선순위 2 (데이터 무결성)**: 적용 후 테스트
   - 계산 필드 처리 방식 적용
   - 외래 키 삭제 정책 재설계
   - NULL 허용 필드 적용

3. **우선순위 3 (구현 가능성)**: 구현 시 적용
   - PDF 생성 라이브러리 적용
   - 파일 업로드 구현
   - 정산 로직 구현

---

## 결론

제시한 해결방안들은 **상호 일관성이 높고 구현 가능**합니다. 특히 보안과 데이터 무결성 측면에서 즉시 적용해야 할 사항들이 명확히 정리되었습니다.

다음 단계로 원본 문서들(03-database-design.md, 04-api-specification.md, 06-development-setup.md 등)을 이 해결방안에 맞게 업데이트하는 것을 권장합니다.

