# 코딩 컨벤션 및 가이드라인

## 1. TypeScript 코딩 스타일

### 1.1 기본 규칙
- **타입 명시**: 가능한 한 명시적으로 타입 지정
- **타입 추론 활용**: 간단한 경우 타입 추론 활용
- **any 사용 금지**: `any` 타입 사용 지양, `unknown` 사용 고려
- **인터페이스 vs 타입**: 객체 타입은 인터페이스, 유니온/교차 타입은 타입 별칭

### 1.2 타입 정의 예시

#### 인터페이스
```typescript
// ✅ 좋은 예
interface Customer {
  id: number
  name: string
  email: string
  createdAt: Date
}

// ❌ 나쁜 예
interface Customer {
  id: any
  name: any
}
```

#### 타입 별칭
```typescript
// ✅ 좋은 예
type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

type CustomerWithOrders = Customer & {
  orders: Order[]
}
```

### 1.3 제네릭 사용
```typescript
// ✅ 좋은 예
function getById<T>(id: number): Promise<T | null> {
  // ...
}

// ❌ 나쁜 예
function getById(id: number): Promise<any> {
  // ...
}
```

## 2. React 컴포넌트 작성 규칙

### 2.1 컴포넌트 구조
```typescript
// 1. Import 문
import { useState } from 'react'
import { Button } from '@/components/ui/button'

// 2. 타입 정의
interface CustomerFormProps {
  customerId?: number
  onSubmit: (data: CustomerFormData) => void
}

// 3. 컴포넌트 정의
export function CustomerForm({ customerId, onSubmit }: CustomerFormProps) {
  // 4. Hooks
  const [isLoading, setIsLoading] = useState(false)
  
  // 5. 이벤트 핸들러
  const handleSubmit = async (data: CustomerFormData) => {
    // ...
  }
  
  // 6. 렌더링
  return (
    <form onSubmit={handleSubmit}>
      {/* ... */}
    </form>
  )
}
```

### 2.2 컴포넌트 네이밍
- **파스칼 케이스**: 컴포넌트명은 PascalCase
- **파일명**: 컴포넌트 파일명은 컴포넌트명과 동일
- **기본 export**: 컴포넌트는 기본 export 사용

```typescript
// ✅ 좋은 예
// CustomerList.tsx
export default function CustomerList() {
  // ...
}

// ❌ 나쁜 예
// customer-list.tsx
export function customerList() {
  // ...
}
```

### 2.3 Props 타입 정의
```typescript
// ✅ 좋은 예
interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary'
  disabled?: boolean
}

export function Button({ children, onClick, variant = 'primary', disabled }: ButtonProps) {
  // ...
}

// ❌ 나쁜 예
export function Button(props: any) {
  // ...
}
```

### 2.4 Hooks 사용 규칙
- **커스텀 훅**: `use` 접두사 사용
- **훅 순서**: 항상 같은 순서로 호출
- **조건부 호출 금지**: 조건문 안에서 훅 호출 금지

```typescript
// ✅ 좋은 예
function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { data, error } = useCustomers()
  
  // ...
}

// ❌ 나쁜 예
function CustomerList() {
  if (someCondition) {
    const [customers, setCustomers] = useState<Customer[]>([])
  }
  // ...
}
```

## 3. 파일 네이밍 규칙

### 3.1 컴포넌트 파일
- **PascalCase**: `CustomerList.tsx`, `OrderDetail.tsx`
- **확장자**: `.tsx` (JSX 포함), `.ts` (타입만)

### 3.2 유틸리티 파일
- **camelCase**: `formatDate.ts`, `exportToExcel.ts`
- **확장자**: `.ts`

### 3.3 타입 파일
- **camelCase**: `customer.ts`, `order.ts`
- **확장자**: `.ts`

### 3.4 API 라우트 파일
- **소문자**: `route.ts`
- **디렉토리 구조**: `app/api/customers/route.ts`

### 3.5 서비스 파일
- **camelCase + .service**: `customer.service.ts`, `order.service.ts`
- **확장자**: `.ts`

## 4. 폴더 구조 규칙

### 4.1 컴포넌트 폴더
```
components/
├── ui/              # shadcn/ui 컴포넌트
├── layout/          # 레이아웃 컴포넌트
├── customers/       # 고객 관련 컴포넌트
├── orders/          # 주문 관련 컴포넌트
└── shared/          # 공통 컴포넌트
```

### 4.2 라이브러리 폴더
```
lib/
├── prisma/          # Prisma 클라이언트
├── services/        # 비즈니스 로직
├── validators/      # Zod 스키마
├── utils/           # 유틸리티 함수
├── hooks/           # 커스텀 훅
└── constants/       # 상수
```

## 5. 변수 및 함수 네이밍

### 5.1 변수 네이밍
- **camelCase**: 일반 변수
- **UPPER_SNAKE_CASE**: 상수
- **명확한 이름**: 축약어 지양

```typescript
// ✅ 좋은 예
const customerName = 'ABC 회사'
const MAX_RETRY_COUNT = 3
const isCustomerActive = true

// ❌ 나쁜 예
const cn = 'ABC 회사'
const max = 3
const flag = true
```

### 5.2 함수 네이밍
- **camelCase**: 일반 함수
- **동사로 시작**: `get`, `create`, `update`, `delete`, `fetch`
- **명확한 이름**: 함수의 역할을 명확히 표현

```typescript
// ✅ 좋은 예
function getCustomerById(id: number): Promise<Customer | null>
function createOrder(data: CreateOrderData): Promise<Order>
function formatCurrency(amount: number): string

// ❌ 나쁜 예
function customer(id: number)
function order(data: any)
function format(amount: number)
```

### 5.3 Boolean 변수
- **is/has/should 접두사**: Boolean 변수는 접두사 사용

```typescript
// ✅ 좋은 예
const isActive = true
const hasPermission = false
const shouldShowModal = true

// ❌ 나쁜 예
const active = true
const permission = false
```

## 6. 코드 포맷팅

### 6.1 들여쓰기
- **2 spaces**: 들여쓰기는 2칸
- **일관성**: 프로젝트 전체에서 일관성 유지

### 6.2 세미콜론
- **사용 안 함**: Prettier 설정에 따라 세미콜론 사용 안 함

```typescript
// ✅ 좋은 예
const name = 'John'
const age = 30

// ❌ 나쁜 예
const name = 'John';
const age = 30;
```

### 6.3 따옴표
- **작은따옴표**: 문자열은 작은따옴표 사용

```typescript
// ✅ 좋은 예
const message = 'Hello, World!'

// ❌ 나쁜 예
const message = "Hello, World!"
```

### 6.4 줄 길이
- **100자**: 최대 줄 길이 100자
- **줄바꿈**: 긴 줄은 적절히 줄바꿈

```typescript
// ✅ 좋은 예
const result = await fetchCustomerData({
  customerId: id,
  includeOrders: true,
  includeStores: true,
})

// ❌ 나쁜 예
const result = await fetchCustomerData({ customerId: id, includeOrders: true, includeStores: true })
```

## 7. 주석 작성 규칙

### 7.1 함수 주석
```typescript
/**
 * 고객 ID로 고객 정보를 조회합니다.
 * 
 * @param id - 고객 ID
 * @returns 고객 정보 또는 null
 * @throws {NotFoundError} 고객을 찾을 수 없을 때
 */
async function getCustomerById(id: number): Promise<Customer | null> {
  // ...
}
```

### 7.2 복잡한 로직 주석
```typescript
// ✅ 좋은 예
// 주문 총액 계산: 각 항목의 단가 * 수량의 합계
const totalAmount = orderItems.reduce(
  (sum, item) => sum + item.unitPrice * item.quantity,
  0
)

// ❌ 나쁜 예
// 계산
const total = items.reduce((s, i) => s + i.p * i.q, 0)
```

### 7.3 TODO 주석
```typescript
// TODO: OCR 기능 구현 필요
// FIXME: 성능 최적화 필요
// NOTE: 향후 API 연동 예정
```

## 8. 에러 처리

### 8.1 에러 타입 정의
```typescript
// ✅ 좋은 예
class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message)
    this.name = 'ValidationError'
  }
}
```

### 8.2 에러 처리 패턴
```typescript
// ✅ 좋은 예
try {
  const customer = await getCustomerById(id)
  if (!customer) {
    throw new NotFoundError('고객을 찾을 수 없습니다.')
  }
  return customer
} catch (error) {
  if (error instanceof NotFoundError) {
    // 특정 에러 처리
  }
  throw error
}

// ❌ 나쁜 예
try {
  const customer = await getCustomerById(id)
  return customer
} catch (error) {
  console.log(error)
  return null
}
```

## 9. API 라우트 작성 규칙

### 9.1 API 라우트 구조
```typescript
// app/api/customers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { customerService } from '@/lib/services/customer.service'

// GET 요청
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    
    const result = await customerService.getCustomers({ page, limit })
    
    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '서버 오류가 발생했습니다.',
        },
      },
      { status: 500 }
    )
  }
}

// POST 요청
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // 검증
    const validatedData = customerSchema.parse(body)
    
    // 생성
    const customer = await customerService.createCustomer(validatedData)
    
    return NextResponse.json(
      {
        success: true,
        data: customer,
        message: '고객이 성공적으로 생성되었습니다.',
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '입력 데이터가 유효하지 않습니다.',
            details: error.errors,
          },
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '서버 오류가 발생했습니다.',
        },
      },
      { status: 500 }
    )
  }
}
```

### 9.2 동적 라우트
```typescript
// app/api/customers/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id)
  
  if (isNaN(id)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '유효하지 않은 ID입니다.',
        },
      },
      { status: 400 }
    )
  }
  
  // ...
}
```

## 10. 서비스 레이어 작성 규칙

### 10.1 서비스 함수 구조
```typescript
// lib/services/customer.service.ts
import { prisma } from '@/lib/prisma/client'
import { CreateCustomerData, UpdateCustomerData } from '@/types/customer'

export const customerService = {
  async getCustomers(options: {
    page?: number
    limit?: number
    search?: string
  }) {
    const { page = 1, limit = 20, search } = options
    
    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { businessNumber: { contains: search } },
          ],
        }
      : {}
    
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ])
    
    return {
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  },
  
  async getCustomerById(id: number) {
    return prisma.customer.findUnique({
      where: { id },
      include: {
        stores: true,
        orders: true,
      },
    })
  },
  
  async createCustomer(data: CreateCustomerData) {
    return prisma.customer.create({
      data,
    })
  },
  
  async updateCustomer(id: number, data: UpdateCustomerData) {
    return prisma.customer.update({
      where: { id },
      data,
    })
  },
  
  async deleteCustomer(id: number) {
    return prisma.customer.delete({
      where: { id },
    })
  },
}
```

## 11. Git 커밋 메시지 규칙

### 11.1 커밋 메시지 형식
```
<type>: <subject>

<body>

<footer>
```

### 11.2 타입 (Type)
- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 포맷팅, 세미콜론 누락 등
- `refactor`: 코드 리팩토링
- `test`: 테스트 코드 추가/수정
- `chore`: 빌드 업무 수정, 패키지 매니저 설정 등

### 11.3 커밋 메시지 예시
```
feat: 고객 관리 기능 추가

- 고객 목록 조회 API 구현
- 고객 생성/수정/삭제 API 구현
- 고객 목록 UI 컴포넌트 구현

Closes #1
```

```
fix: 주문 총액 계산 오류 수정

주문 항목의 단가와 수량을 곱할 때 소수점 처리 오류 수정
```

## 12. 코드 리뷰 체크리스트

### 12.1 기능적 요구사항
- [ ] 요구사항을 정확히 구현했는가?
- [ ] 에러 처리가 적절한가?
- [ ] 엣지 케이스를 고려했는가?

### 12.2 코드 품질
- [ ] 타입이 명확한가?
- [ ] 함수가 단일 책임을 가지는가?
- [ ] 중복 코드가 없는가?
- [ ] 네이밍이 명확한가?

### 12.3 성능
- [ ] 불필요한 리렌더링이 없는가?
- [ ] 데이터베이스 쿼리가 최적화되었는가?
- [ ] 메모리 누수가 없는가?

### 12.4 보안
- [ ] 입력 데이터 검증이 있는가?
- [ ] SQL Injection 방지가 되어 있는가?
- [ ] 민감 정보가 노출되지 않는가?

### 12.5 테스트
- [ ] 테스트 코드가 작성되었는가? (향후)
- [ ] 테스트가 통과하는가? (향후)

## 13. 추가 가이드라인

### 13.1 import 순서
```typescript
// 1. React 및 Next.js
import { useState } from 'react'
import { NextRequest } from 'next/server'

// 2. 외부 라이브러리
import { z } from 'zod'
import { format } from 'date-fns'

// 3. 내부 컴포넌트
import { Button } from '@/components/ui/button'
import { CustomerForm } from '@/components/customers/CustomerForm'

// 4. 내부 유틸리티
import { prisma } from '@/lib/prisma/client'
import { customerService } from '@/lib/services/customer.service'

// 5. 타입
import type { Customer } from '@/types/customer'
```

### 13.2 상수 정의
```typescript
// ✅ 좋은 예
const ORDER_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const

// ❌ 나쁜 예
const status = 'pending'
```

### 13.3 비동기 처리
```typescript
// ✅ 좋은 예
async function fetchData() {
  try {
    const data = await api.getData()
    return data
  } catch (error) {
    console.error('데이터 조회 실패:', error)
    throw error
  }
}

// ❌ 나쁜 예
function fetchData() {
  api.getData().then(data => {
    // ...
  }).catch(error => {
    // ...
  })
}
```

