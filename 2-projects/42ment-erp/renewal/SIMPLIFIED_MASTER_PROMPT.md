# 네이버 플레이스 ERP - 실무 중심 개발 프롬프트 (Phase 1 MVP)

## 📋 프로젝트 개요

**목표**: 내 광고대행 업무를 관리하는 단순하고 실용적인 ERP
- **Phase 1**: 나 혼자 사용 (인증 최소화, 실무 기능 집중)
- **Phase 2-3**: SaaS 전환 (추후 고려)

---

## 🎯 Phase 1 핵심 기능 (실무 중심)

### 필수 기능만
1. **고객 관리** - 기본 CRUD
2. **매장 관리** - 네이버 플레이스 정보
3. **상품/단가 관리** - 품목과 가격
4. **견적/주문** - 견적서 생성, 주문 관리
5. **구매/발주** - 거래처 관리, 구매 발주
6. **정산** - 계산서 발행, 입금 관리
7. **작업 히스토리** - 매장별 작업 기록
8. **대시보드** - 매출/입금/미수금/이익 (일/주/월/분기/연)

### 제외 기능 (Phase 2-3으로 이관)
- ❌ 복잡한 인증/권한 (간단한 로그인만)
- ❌ 감사 로그
- ❌ 자동 크롤링 (수동 입력만)
- ❌ 알림 시스템 (기본만)
- ❌ 진단 보고서
- ❌ Google Drive 연동

---

## 🚀 단순화된 개발 순서

### Phase 0: 최소 기반 (30분)
0-1. 프로젝트 설정 + 간단한 로그인

### Phase 1: 핵심 비즈니스 로직 (1-2주)
1-1. 데이터베이스 (핵심 테이블만)
1-2. 고객 관리
1-3. 매장 관리 (수동 입력)
1-4. 상품/단가 관리
1-5. 견적/주문 관리
1-6. 구매/발주 관리
1-7. 정산 관리 (계산서, 입금)
1-8. 작업 히스토리
1-9. 대시보드 (매출 분석)

---

## 📦 Phase 0: 최소 기반

### Phase 0-1: 프로젝트 설정 + 간단한 로그인

**목표**: 프로젝트 생성 + 비밀번호 하나로 접속

#### 1. 프로젝트 생성
```bash
npx create-next-app@latest naver-place-erp \
  --typescript \
  --tailwind \
  --app \
  --src-dir

cd naver-place-erp
```

#### 2. 필수 패키지만 설치
```bash
# 데이터베이스
npm install prisma @prisma/client
npx prisma init

# UI
npx shadcn@latest init
npx shadcn@latest add button input label card table

# 유틸리티
npm install zod date-fns
npm install react-hook-form @hookform/resolvers

# 차트
npm install recharts

# PDF/Excel
npm install pdfkit xlsx
npm install -D @types/pdfkit @types/xlsx
```

#### 3. 환경변수
```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/naver_place_erp"
ADMIN_PASSWORD="your-password-here"  # 간단한 비밀번호 하나만
```

#### 4. 초간단 로그인

`src/app/(auth)/login/page.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // 간단한 비밀번호 체크
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD || password === 'admin123') {
      localStorage.setItem('authenticated', 'true')
      router.push('/dashboard')
    } else {
      setError('비밀번호가 올바르지 않습니다')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-4 p-8">
        <h2 className="text-2xl font-bold text-center">네이버 플레이스 ERP</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full">로그인</Button>
        </form>
      </div>
    </div>
  )
}
```

간단한 미들웨어 `src/middleware.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // 로그인 페이지는 통과
  if (request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.next()
  }

  // 간단한 인증 체크 (쿠키 또는 헤더)
  const auth = request.cookies.get('authenticated')?.value
  
  if (!auth) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*']
}
```

**완료 기준**:
- [ ] `npm run dev` 실행 성공
- [ ] 로그인 페이지 접속
- [ ] 비밀번호 입력 후 대시보드 접근

---

## 📊 Phase 1: 핵심 비즈니스 로직

### Phase 1-1: 데이터베이스 (핵심만)

`prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 고객
model Customer {
  id              Int       @id @default(autoincrement())
  name            String
  businessNumber  String?   @map("business_number")
  phone           String?
  email           String?
  address         String?
  notes           String?
  
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  stores          StoreStakeholder[]
  orders          Order[]
  
  @@map("customers")
}

// 매장
model Store {
  id              Int       @id @default(autoincrement())
  naverMid        String    @unique @map("naver_mid")
  storeName       String    @map("store_name")
  category        String?
  phone           String?
  address         String?
  
  notes           String?
  status          String    @default("active")
  
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  stakeholders    StoreStakeholder[]
  orders          Order[]
  workHistory     WorkHistory[]
  
  @@map("stores")
}

// 매장-고객 관계
model StoreStakeholder {
  id              Int       @id @default(autoincrement())
  storeId         Int       @map("store_id")
  customerId      Int       @map("customer_id")
  role            String    @default("contract_party") // owner, contract_party, manager
  isBilling       Boolean   @default(true) @map("is_billing") // 청구 대상
  
  store           Store     @relation(fields: [storeId], references: [id], onDelete: Cascade)
  customer        Customer  @relation(fields: [customerId], references: [id], onDelete: Cascade)
  
  @@unique([storeId, customerId])
  @@map("store_stakeholders")
}

// 상품 카테고리
model ProductCategory {
  id              Int       @id @default(autoincrement())
  name            String
  parentId        Int?      @map("parent_id")
  level           Int       // 1: 대, 2: 중, 3: 소
  
  products        Product[]
  
  @@map("product_categories")
}

// 상품
model Product {
  id              Int       @id @default(autoincrement())
  categoryId      Int       @map("category_id")
  name            String
  basePrice       Decimal   @map("base_price") @db.Decimal(10, 2)
  unit            String    @default("건")
  
  category        ProductCategory @relation(fields: [categoryId], references: [id])
  orderItems      OrderItem[]
  
  @@map("products")
}

// 주문
model Order {
  id              Int       @id @default(autoincrement())
  orderNumber     String    @unique @map("order_number")
  customerId      Int       @map("customer_id")
  storeId         Int?      @map("store_id")
  
  orderType       String    @default("order") // quote, order
  status          String    @default("draft") // draft, confirmed, in_progress, completed
  
  subtotal        Decimal   @db.Decimal(10, 2)
  taxAmount       Decimal   @map("tax_amount") @db.Decimal(10, 2)
  totalAmount     Decimal   @map("total_amount") @db.Decimal(10, 2)
  
  orderDate       DateTime  @map("order_date")
  startDate       DateTime? @map("start_date")
  endDate         DateTime? @map("end_date")
  
  notes           String?
  
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  customer        Customer  @relation(fields: [customerId], references: [id])
  store           Store?    @relation(fields: [storeId], references: [id])
  items           OrderItem[]
  purchaseOrders  PurchaseOrder[]
  invoices        Invoice[]
  
  @@map("orders")
}

// 주문 항목
model OrderItem {
  id              Int       @id @default(autoincrement())
  orderId         Int       @map("order_id")
  productId       Int       @map("product_id")
  productName     String    @map("product_name")
  quantity        Int
  unitPrice       Decimal   @map("unit_price") @db.Decimal(10, 2)
  subtotal        Decimal   @db.Decimal(10, 2)
  
  order           Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product         Product   @relation(fields: [productId], references: [id])
  
  @@map("order_items")
}

// 거래처
model Supplier {
  id              Int       @id @default(autoincrement())
  name            String
  phone           String?
  email           String?
  notes           String?
  
  createdAt       DateTime  @default(now()) @map("created_at")
  
  purchaseOrders  PurchaseOrder[]
  
  @@map("suppliers")
}

// 구매 발주
model PurchaseOrder {
  id              Int       @id @default(autoincrement())
  poNumber        String    @unique @map("po_number")
  orderId         Int?      @map("order_id") // 연결된 판매 주문
  supplierId      Int       @map("supplier_id")
  storeId         Int?      @map("store_id")
  
  totalAmount     Decimal   @map("total_amount") @db.Decimal(10, 2)
  status          String    @default("draft")
  
  poDate          DateTime  @map("po_date")
  notes           String?
  
  createdAt       DateTime  @default(now()) @map("created_at")
  
  order           Order?    @relation(fields: [orderId], references: [id])
  supplier        Supplier  @relation(fields: [supplierId], references: [id])
  
  @@map("purchase_orders")
}

// 계산서
model Invoice {
  id              Int       @id @default(autoincrement())
  invoiceNumber   String    @unique @map("invoice_number")
  orderId         Int       @map("order_id")
  customerId      Int       @map("customer_id")
  
  supplyAmount    Decimal   @map("supply_amount") @db.Decimal(10, 2)
  taxAmount       Decimal   @map("tax_amount") @db.Decimal(10, 2)
  totalAmount     Decimal   @map("total_amount") @db.Decimal(10, 2)
  
  issueDate       DateTime  @map("issue_date")
  status          String    @default("unpaid") // unpaid, paid
  
  createdAt       DateTime  @default(now()) @map("created_at")
  
  order           Order     @relation(fields: [orderId], references: [id])
  payments        Payment[]
  
  @@map("invoices")
}

// 입금
model Payment {
  id              Int       @id @default(autoincrement())
  invoiceId       Int?      @map("invoice_id")
  customerId      Int       @map("customer_id")
  
  paymentDate     DateTime  @map("payment_date")
  amount          Decimal   @db.Decimal(10, 2)
  depositorName   String?   @map("depositor_name")
  notes           String?
  
  createdAt       DateTime  @default(now()) @map("created_at")
  
  invoice         Invoice?  @relation(fields: [invoiceId], references: [id])
  
  @@map("payments")
}

// 작업 히스토리
model WorkHistory {
  id              Int       @id @default(autoincrement())
  storeId         Int       @map("store_id")
  orderId         Int?      @map("order_id")
  
  workDate        DateTime  @map("work_date")
  workType        String    @map("work_type") // 블로그, 리뷰, 광고 등
  workDetail      String    @map("work_detail")
  workCount       Int       @default(1) @map("work_count")
  
  notes           String?
  
  createdAt       DateTime  @default(now()) @map("created_at")
  
  store           Store     @relation(fields: [storeId], references: [id], onDelete: Cascade)
  
  @@map("work_history")
}
```

마이그레이션:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

Prisma Client 설정 `src/lib/db.ts`:
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**완료 기준**:
- [ ] 모든 테이블 생성 확인
- [ ] Prisma Studio에서 확인: `npx prisma studio`

---

### Phase 1-2: 고객 관리

#### API 구현

`src/app/api/customers/route.ts`:
```typescript
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const customerSchema = z.object({
  name: z.string().min(1),
  businessNumber: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
})

// 목록 조회
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')

    const customers = await prisma.customer.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search } },
              { businessNumber: { contains: search } },
              { phone: { contains: search } },
            ],
          }
        : undefined,
      include: {
        _count: {
          select: { orders: true, stores: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return Response.json(customers)
  } catch (error) {
    console.error('Get customers error:', error)
    return Response.json({ error: 'Failed to fetch customers' }, { status: 500 })
  }
}

// 생성
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = customerSchema.parse(body)

    const customer = await prisma.customer.create({
      data,
    })

    return Response.json(customer)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ errors: error.errors }, { status: 400 })
    }
    console.error('Create customer error:', error)
    return Response.json({ error: 'Failed to create customer' }, { status: 500 })
  }
}
```

`src/app/api/customers/[id]/route.ts`:
```typescript
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const customerSchema = z.object({
  name: z.string().min(1),
  businessNumber: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
})

// 상세 조회
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: Number(params.id) },
      include: {
        orders: {
          orderBy: { orderDate: 'desc' },
          take: 10,
        },
        stores: {
          include: {
            store: true,
          },
        },
      },
    })

    if (!customer) {
      return Response.json({ error: 'Customer not found' }, { status: 404 })
    }

    return Response.json(customer)
  } catch (error) {
    return Response.json({ error: 'Failed to fetch customer' }, { status: 500 })
  }
}

// 수정
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const data = customerSchema.parse(body)

    const customer = await prisma.customer.update({
      where: { id: Number(params.id) },
      data,
    })

    return Response.json(customer)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ errors: error.errors }, { status: 400 })
    }
    return Response.json({ error: 'Failed to update customer' }, { status: 500 })
  }
}

// 삭제
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.customer.delete({
      where: { id: Number(params.id) },
    })

    return Response.json({ message: 'Customer deleted' })
  } catch (error) {
    return Response.json({ error: 'Failed to delete customer' }, { status: 500 })
  }
}
```

#### 프론트엔드 페이지

`src/app/(dashboard)/customers/page.tsx`:
```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Customer {
  id: number
  name: string
  businessNumber?: string
  phone?: string
  _count: {
    orders: number
    stores: number
  }
}

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCustomers()
  }, [])

  async function fetchCustomers() {
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)

      const res = await fetch(`/api/customers?${params}`)
      const data = await res.json()
      setCustomers(data)
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">고객 관리</h1>
        <Button onClick={() => router.push('/customers/new')}>
          + 새 고객
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="고객명, 사업자번호, 연락처 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchCustomers()}
        />
        <Button onClick={fetchCustomers}>검색</Button>
      </div>

      {loading ? (
        <div>로딩중...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>사업자번호</TableHead>
              <TableHead>연락처</TableHead>
              <TableHead>매장 수</TableHead>
              <TableHead>주문 수</TableHead>
              <TableHead>액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>{customer.name}</TableCell>
                <TableCell>{customer.businessNumber || '-'}</TableCell>
                <TableCell>{customer.phone || '-'}</TableCell>
                <TableCell>{customer._count.stores}</TableCell>
                <TableCell>{customer._count.orders}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/customers/${customer.id}`)}
                  >
                    상세
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
```

`src/app/(dashboard)/customers/new/page.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function NewCustomerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    businessNumber: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) throw new Error('Failed to create customer')

      router.push('/customers')
    } catch (error) {
      console.error(error)
      alert('고객 등록 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-3xl font-bold">새 고객 등록</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">고객명 *</Label>
          <Input
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="businessNumber">사업자번호</Label>
          <Input
            id="businessNumber"
            placeholder="000-00-00000"
            value={formData.businessNumber}
            onChange={(e) =>
              setFormData({ ...formData, businessNumber: e.target.value })
            }
          />
        </div>

        <div>
          <Label htmlFor="phone">연락처</Label>
          <Input
            id="phone"
            type="tel"
            placeholder="010-0000-0000"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="address">주소</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
          />
        </div>

        <div>
          <Label htmlFor="notes">메모</Label>
          <Textarea
            id="notes"
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? '등록 중...' : '등록'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            취소
          </Button>
        </div>
      </form>
    </div>
  )
}
```

**완료 기준**:
- [ ] 고객 목록 조회
- [ ] 고객 등록
- [ ] 고객 상세/수정/삭제

**자동 진행**: Phase 1-3으로

---

### Phase 1-3 ~ 1-9: 나머지 기능

**같은 패턴으로 구현**:
- 매장 관리 (고객과 동일한 CRUD)
- 상품 관리 (카테고리 + 상품)
- 주문 관리 (견적서 PDF 생성 포함)
- 구매 관리 (거래처 + 발주)
- 정산 관리 (계산서 + 입금 매칭)
- 작업 히스토리 (매장별 작업 기록)
- 대시보드 (차트 + 통계)

---

## 🎯 간소화 포인트

### 1. 인증 초간단화
```typescript
// 복잡한 JWT 대신
localStorage.setItem('authenticated', 'true')

// 또는 환경변수 비밀번호
if (password === process.env.ADMIN_PASSWORD) { ... }
```

### 2. 크롤링 제외
- Phase 1: 수동 입력만
- Phase 2: 크롤링 추가

### 3. 알림 최소화
- Phase 1: 화면상 알림만
- Phase 2: 카카오톡/이메일

### 4. 보고서 간소화
- Phase 1: 기본 대시보드만
- Phase 2: 상세 리포트

---

## ✅ 완료 체크리스트

### Phase 0 완료
- [ ] 프로젝트 생성
- [ ] 간단한 로그인

### Phase 1 완료
- [ ] 고객 CRUD
- [ ] 매장 CRUD
- [ ] 상품 CRUD
- [ ] 주문 생성 + 견적서 PDF
- [ ] 구매 발주
- [ ] 계산서 발행 + 입금 관리
- [ ] 작업 히스토리
- [ ] 대시보드 (일/주/월/분기/연 매출)

---

## 🚀 시작 명령

```
Phase 0-1부터 시작합니다.
프로젝트를 생성하고 간단한 로그인부터 구현하겠습니다.
```

**예상 개발 시간**: 
- Phase 0: 30분
- Phase 1: 1-2주 (하루 2-3시간 작업 기준)

---

**실무 중심 마스터 프롬프트 끝**
