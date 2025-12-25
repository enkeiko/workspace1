# 네이버 플레이스 SEO 광고대행 ERP 개발 프롬프트

## 프롬프트 개요
이 문서는 AI 개발 에이전트(Claude, GPT 등)가 네이버 플레이스 SEO 광고대행 ERP 시스템을 단계별로 개발할 수 있도록 구조화된 프롬프트를 제공합니다.

---

## 사전 준비사항

### 제공해야 할 문서
1. `naver_place_erp_specification.md` - 상세 기획서
2. 이 프롬프트 문서

### 개발 환경
- Node.js 18+ 또는 20+
- npm 또는 yarn
- PostgreSQL 14+
- Git

---

---

## Phase 0: 기반 작업 (필수 선행)

### 0-1. 인증 시스템 구현

```
**작업 목표**: JWT 기반 인증 시스템 전체 구현

**중요도**: ⭐⭐⭐⭐⭐ (최우선 - 이것 없이는 다른 작업 진행 불가)

**수행할 작업**:

**1단계: 데이터베이스 테이블 생성**
```sql
-- users 테이블
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(45),
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- refresh_tokens 테이블
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP
);
```

**2단계: 비밀번호 해싱 유틸리티**
```typescript
// lib/auth/password.ts
import bcrypt from 'bcrypt'

const SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(
  password: string, 
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// 비밀번호 강도 검증
export function validatePasswordStrength(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('비밀번호는 최소 8자 이상이어야 합니다')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('대문자를 최소 1개 포함해야 합니다')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('소문자를 최소 1개 포함해야 합니다')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('숫자를 최소 1개 포함해야 합니다')
  }
  
  return { valid: errors.length === 0, errors }
}
```

**3단계: JWT 유틸리티**
```typescript
// lib/auth/jwt.ts
import jwt from 'jsonwebtoken'

interface JWTPayload {
  userId: number
  email: string
}

export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: '1h'
  })
}

export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: '7d'
  })
}

export function verifyAccessToken(token: string): JWTPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload
}

export function verifyRefreshToken(token: string): JWTPayload {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as JWTPayload
}
```

**4단계: 회원가입 API**
```typescript
// app/api/auth/register/route.ts
import { z } from 'zod'
import { hashPassword, validatePasswordStrength } from '@/lib/auth/password'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  name: z.string().min(1).max(100),
  phone: z.string().optional()
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password, name, phone } = registerSchema.parse(body)
    
    // 비밀번호 강도 검증
    const { valid, errors } = validatePasswordStrength(password)
    if (!valid) {
      return Response.json({ errors }, { status: 400 })
    }
    
    // 이메일 중복 체크
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return Response.json({ error: '이미 사용 중인 이메일입니다' }, { status: 400 })
    }
    
    // 비밀번호 해싱
    const passwordHash = await hashPassword(password)
    
    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        phone
      }
    })
    
    return Response.json({ 
      message: '회원가입 완료',
      userId: user.id 
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ errors: error.errors }, { status: 400 })
    }
    return Response.json({ error: '서버 오류' }, { status: 500 })
  }
}
```

**5단계: 로그인 API**
```typescript
// app/api/auth/login/route.ts
import { z } from 'zod'
import { verifyPassword } from '@/lib/auth/password'
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password } = loginSchema.parse(body)
    
    // 사용자 조회
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return Response.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' }, { status: 401 })
    }
    
    // 계정 잠금 체크
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return Response.json({ error: '계정이 잠겨있습니다. 잠시 후 다시 시도하세요' }, { status: 403 })
    }
    
    // 비밀번호 검증
    const isValid = await verifyPassword(password, user.passwordHash)
    
    if (!isValid) {
      // 실패 횟수 증가
      const failedAttempts = user.failedLoginAttempts + 1
      const updates: any = { failedLoginAttempts: failedAttempts }
      
      // 5회 실패 시 30분 잠금
      if (failedAttempts >= 5) {
        updates.lockedUntil = new Date(Date.now() + 30 * 60 * 1000)
      }
      
      await prisma.user.update({
        where: { id: user.id },
        data: updates
      })
      
      return Response.json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' }, { status: 401 })
    }
    
    // 로그인 성공 - 토큰 생성
    const payload = { userId: user.id, email: user.email }
    const accessToken = generateAccessToken(payload)
    const refreshToken = generateRefreshToken(payload)
    
    // Refresh Token DB 저장
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7일
      }
    })
    
    // 로그인 정보 업데이트
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: req.headers.get('x-forwarded-for') || 'unknown',
        failedLoginAttempts: 0,
        lockedUntil: null
      }
    })
    
    return Response.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    })
  } catch (error) {
    return Response.json({ error: '서버 오류' }, { status: 500 })
  }
}
```

**6단계: 토큰 갱신 API**
```typescript
// app/api/auth/refresh/route.ts
import { verifyRefreshToken, generateAccessToken } from '@/lib/auth/jwt'

export async function POST(req: Request) {
  try {
    const { refreshToken } = await req.json()
    
    // Refresh Token 검증
    const payload = verifyRefreshToken(refreshToken)
    
    // DB에 토큰 존재 확인
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken }
    })
    
    if (!storedToken || storedToken.expiresAt < new Date()) {
      return Response.json({ error: '유효하지 않은 토큰입니다' }, { status: 401 })
    }
    
    // 새 Access Token 발급
    const newAccessToken = generateAccessToken({
      userId: payload.userId,
      email: payload.email
    })
    
    // 마지막 사용 시간 업데이트
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { lastUsedAt: new Date() }
    })
    
    return Response.json({ accessToken: newAccessToken })
  } catch (error) {
    return Response.json({ error: '토큰 갱신 실패' }, { status: 401 })
  }
}
```

**7단계: 인증 미들웨어**
```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth/jwt'

export function middleware(request: NextRequest) {
  // 공개 경로
  const publicPaths = ['/api/auth/login', '/api/auth/register', '/login', '/register']
  if (publicPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next()
  }
  
  // 토큰 확인
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const payload = verifyAccessToken(token)
    
    // 헤더에 사용자 정보 추가
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.userId.toString())
    requestHeaders.set('x-user-email', payload.email)
    
    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    })
  } catch (error) {
    return Response.json({ error: 'Invalid token' }, { status: 401 })
  }
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*']
}
```

**8단계: 프론트엔드 인증 컨텍스트**
```typescript
// lib/auth-context.tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface User {
  id: number
  email: string
  name: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType>(null!)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    // 페이지 로드 시 토큰 확인
    const token = localStorage.getItem('accessToken')
    if (token) {
      // 사용자 정보 가져오기
      fetchUser(token)
    } else {
      setIsLoading(false)
    }
  }, [])
  
  async function login(email: string, password: string) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error)
    }
    
    const data = await response.json()
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    setUser(data.user)
  }
  
  function logout() {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setUser(null)
  }
  
  async function fetchUser(token: string) {
    // 구현...
    setIsLoading(false)
  }
  
  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

**필요한 패키지**:
```bash
npm install jsonwebtoken bcrypt
npm install -D @types/jsonwebtoken @types/bcrypt
```

**완료 기준**:
- 회원가입/로그인 API 동작
- JWT 발급 및 검증
- 미들웨어 인증 체크
- 프론트엔드 인증 상태 관리

**결과물**:
- 완전한 인증 시스템
- 로그인/회원가입 페이지
```

---

### 0-2. 권한 관리 시스템 (RBAC)

```
**작업 목표**: Role-Based Access Control 구현

**수행할 작업**:

**1단계: 역할 및 권한 테이블**
```sql
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    description TEXT,
    permissions JSONB,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- 기본 역할 시드
INSERT INTO roles (name, display_name, is_system, permissions) VALUES
('admin', '관리자', TRUE, '{"*": ["*"]}'),
('manager', '매니저', TRUE, '{"customers": ["*"], "stores": ["*"], "orders": ["*"], "reports": ["read"]}'),
('staff', '직원', TRUE, '{"stores": ["read", "update"], "keywords": ["*"], "work_history": ["*"]}'),
('viewer', '뷰어', TRUE, '{"*": ["read"]}');
```

**2단계: 권한 체크 유틸리티**
```typescript
// lib/auth/permissions.ts

type Permission = 'read' | 'create' | 'update' | 'delete' | '*'
type Resource = 'customers' | 'stores' | 'orders' | 'reports' | '*'

interface PermissionMap {
  [resource: string]: Permission[]
}

export function checkPermission(
  userPermissions: PermissionMap,
  resource: Resource,
  action: Permission
): boolean {
  // 전체 권한
  if (userPermissions['*']?.includes('*')) return true
  
  // 리소스 전체 권한
  if (userPermissions[resource]?.includes('*')) return true
  
  // 특정 액션 권한
  if (userPermissions[resource]?.includes(action)) return true
  
  return false
}

// API에서 사용
export function requirePermission(resource: Resource, action: Permission) {
  return async (req: Request) => {
    const userId = req.headers.get('x-user-id')
    
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      include: {
        userRoles: {
          include: { role: true }
        }
      }
    })
    
    const hasPermission = user.userRoles.some(ur => 
      checkPermission(ur.role.permissions as PermissionMap, resource, action)
    )
    
    if (!hasPermission) {
      throw new Error('Forbidden')
    }
  }
}
```

**완료 기준**:
- 역할 관리 CRUD
- 사용자별 역할 할당
- API에서 권한 체크

**결과물**:
- 권한 관리 시스템
- 권한 체크 미들웨어
```

---

### 0-3. 암호화 유틸리티

```
**작업 목표**: 민감 정보 암호화/복호화 시스템

**수행할 작업**:

**암호화 유틸리티 구현** (보완 문서의 4.2 참조)
```typescript
// lib/crypto/encryption.ts
// [보완 문서에 있는 전체 코드 구현]
```

**사용 예시**:
```typescript
// 네이버 계정 비밀번호 저장 시
const encrypted = encrypt(plainPassword)
await prisma.store.update({
  where: { id },
  data: { naverAccountPw: encrypted }
})

// 조회 시
const store = await prisma.store.findUnique({ where: { id } })
const plainPassword = decrypt(store.naverAccountPw)
```

**환경변수 설정**:
```bash
# 암호화 키 생성 (한 번만 실행)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# .env 에 추가
ENCRYPTION_KEY="생성된_키"
```

**완료 기준**:
- 암호화/복호화 동작 확인
- 환경변수 설정
- 민감 정보 필드에 적용

**결과물**:
- 암호화 유틸리티
- 암호화 키 관리
```

---

### 0-4. 감사 로그 시스템

```
**작업 목표**: 중요 작업 이력 자동 기록

**수행할 작업**:

**1단계: 감사 로그 테이블** (이미 추가됨)

**2단계: 로그 기록 유틸리티**
```typescript
// lib/audit/logger.ts

interface AuditLog {
  entityType: string
  entityId: number
  action: 'create' | 'update' | 'delete' | 'login' | 'logout'
  changes?: {
    before?: any
    after?: any
  }
}

export async function logAudit(
  userId: number,
  log: AuditLog,
  req: Request
) {
  await prisma.auditLog.create({
    data: {
      userId,
      entityType: log.entityType,
      entityId: log.entityId,
      action: log.action,
      changes: log.changes || {},
      ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
      userAgent: req.headers.get('user-agent') || ''
    }
  })
}

// API에서 사용
export async function PUT(req: Request) {
  const userId = Number(req.headers.get('x-user-id'))
  const { id } = params
  
  // 기존 데이터 조회
  const before = await prisma.customer.findUnique({ where: { id } })
  
  // 업데이트
  const after = await prisma.customer.update({
    where: { id },
    data: updateData
  })
  
  // 감사 로그
  await logAudit(userId, {
    entityType: 'customer',
    entityId: id,
    action: 'update',
    changes: { before, after }
  }, req)
  
  return Response.json(after)
}
```

**완료 기준**:
- 주요 작업에 로그 기록
- 로그 조회 페이지

**결과물**:
- 감사 로그 시스템
- 로그 뷰어
```

---

## Phase 1: MVP 개발 프롬프트

### 1-1. 프로젝트 초기 설정

```
당신은 전문 풀스택 개발자입니다. 네이버 플레이스 SEO 광고대행사용 ERP 시스템을 개발할 것입니다.

**작업 목표**: Next.js 기반 프로젝트 초기 설정

**수행할 작업**:
1. Next.js 14+ 프로젝트 생성 (App Router 사용)
2. TypeScript 설정
3. Prisma ORM 설정 및 PostgreSQL 연결
4. shadcn/ui 설치 및 기본 컴포넌트 셋업
5. Tailwind CSS 설정
6. 기본 폴더 구조 생성:
   ```
   /app
     /(auth)          # 인증 페이지
     /(dashboard)     # 메인 대시보드
       /customers     # 고객 관리
       /stores        # 매장 관리
       /orders        # 주문 관리
       /settings      # 설정
     /api             # API 라우트
   /components
     /ui              # shadcn/ui 컴포넌트
     /dashboard       # 대시보드 전용 컴포넌트
   /lib
     /db              # Prisma 클라이언트
     /utils           # 유틸리티 함수
   /prisma
     schema.prisma    # DB 스키마
   ```

**제약 조건**:
- TypeScript strict 모드 사용
- ESLint + Prettier 설정
- 환경변수는 .env 파일로 관리

**완료 기준**:
- `npm run dev` 실행 시 정상 작동
- Prisma 클라이언트 생성 완료
- 기본 레이아웃 렌더링 확인

**결과물**: 
프로젝트 구조와 설정 파일들을 생성하고, README.md에 설정 방법을 문서화하세요.
```

---

### 1-2. 데이터베이스 스키마 구현

```
**작업 목표**: Prisma 스키마 파일 작성 및 마이그레이션

**참고 문서**: `naver_place_erp_specification.md`의 "3. 데이터베이스 설계" 섹션

**수행할 작업**:
1. prisma/schema.prisma 파일에 다음 테이블 정의:
   - User (기본 사용자, 일단 간단하게)
   - Customer (고객)
   - Store (매장)
   - StoreKeyword (매장 키워드)
   - KeywordRanking (키워드 순위)
   - ProductCategory (상품 카테고리)
   - Product (상품)
   - Order (주문)
   - OrderItem (주문 항목)

2. 관계 설정:
   - Customer 1:N Store
   - Store 1:N StoreKeyword
   - Store 1:N KeywordRanking
   - Order 1:N OrderItem
   - 등등 (기획서 ERD 참조)

3. 인덱스 추가:
   - 자주 조회되는 컬럼 (MID, 고객코드, 주문번호 등)
   - 날짜 범위 검색용 컬럼

4. Enum 타입 정의:
   - OrderStatus
   - PaymentStatus
   - 등

**제약 조건**:
- 모든 테이블에 createdAt, updatedAt 추가
- 외래키 제약조건 명시
- 삭제 시 동작 정의 (CASCADE, SET NULL 등)

**완료 기준**:
- `npx prisma migrate dev` 실행 성공
- `npx prisma studio`로 테이블 확인 가능
- Prisma Client 타입 생성 확인

**결과물**:
완성된 schema.prisma 파일과 마이그레이션 파일들
```

---

### 1-3. 기본 레이아웃 및 네비게이션 구현

```
**작업 목표**: 대시보드 기본 레이아웃 및 사이드바 네비게이션 구현

**수행할 작업**:
1. 메인 레이아웃 컴포넌트 생성:
   - 사이드바 (왼쪽, 고정)
   - 헤더 (상단, 알림/프로필)
   - 메인 컨텐츠 영역

2. 사이드바 메뉴 구성:
   - 대시보드
   - 고객관리
   - 매장관리
   - 주문관리
   - 구매관리
   - 정산관리
   - 보고서
   - 설정

3. shadcn/ui 컴포넌트 활용:
   - Sidebar (직접 구현 또는 shadcn/ui 패턴)
   - Avatar (프로필)
   - Badge (알림)
   - Button
   - 등

4. 반응형 디자인:
   - 모바일에서 사이드바 토글
   - 태블릿/데스크탑 최적화

**디자인 가이드**:
- 색상: 네이버 그린 계열 (Primary: #03C75A)
- 폰트: Pretendard 또는 Inter
- 다크모드 지원 (선택)

**완료 기준**:
- 모든 메뉴 페이지 접근 가능
- 현재 활성 메뉴 하이라이트
- 반응형 동작 확인

**결과물**:
app/(dashboard)/layout.tsx 및 관련 컴포넌트들
```

---

### 1-4. 고객 관리 CRUD 구현

```
**작업 목표**: 고객 관리 기능의 완전한 CRUD 구현

**수행할 작업**:

**백엔드 (API Routes)**:
1. `/api/customers` API 구현:
   ```typescript
   GET    /api/customers              // 목록 (페이지네이션, 검색, 필터)
   POST   /api/customers              // 생성
   GET    /api/customers/[id]         // 상세
   PUT    /api/customers/[id]         // 수정
   DELETE /api/customers/[id]         // 삭제
   ```

2. 비즈니스 로직:
   - 고객코드 자동 생성 (예: CUS-20241113-0001)
   - 사업자번호 중복 체크
   - 입력 데이터 검증 (Zod 사용)

3. 에러 핸들링:
   - 400: Bad Request
   - 404: Not Found
   - 500: Server Error

**프론트엔드 (페이지 & 컴포넌트)**:
1. `/customers` - 고객 목록 페이지:
   - 데이터 테이블 (TanStack Table 또는 shadcn/ui Table)
   - 검색 바 (이름, 사업자번호)
   - 필터 (상태, 태그)
   - 페이지네이션
   - "새 고객 추가" 버튼

2. `/customers/new` - 고객 등록 페이지:
   - 폼 (react-hook-form + Zod)
   - 필드:
     * 기본정보 (이름, 사업자번호, 연락처)
     * 담당자 정보
     * 주소
     * 계약 정보
   - 파일 업로드 (사업자등록증, 명함)
   - "저장" / "취소" 버튼

3. `/customers/[id]` - 고객 상세 페이지:
   - 탭 구성:
     * Overview: 기본 정보 + 요약
     * 매장: 관리 중인 매장 목록
     * 주문: 주문/계약 내역
     * 대화기록: 중요 대화 타임라인
     * 문서: 첨부 파일 관리
   - "수정" / "삭제" 버튼

4. `/customers/[id]/edit` - 고객 수정 페이지:
   - 등록 폼과 동일, 기존 데이터 로드

**사용할 라이브러리**:
- react-hook-form: 폼 관리
- zod: 스키마 검증
- @tanstack/react-table: 테이블
- date-fns: 날짜 포맷팅
- react-hot-toast: 알림 메시지

**완료 기준**:
- 고객 등록/조회/수정/삭제 모두 정상 작동
- 입력 검증 동작 확인
- 에러 처리 확인
- 반응형 UI

**결과물**:
- app/api/customers/** - API 라우트
- app/(dashboard)/customers/** - 페이지들
- components/dashboard/customers/** - 관련 컴포넌트
```

---

### 1-5. 매장 관리 CRUD + 네이버 크롤링

```
**작업 목표**: 매장 관리 기능 및 네이버 플레이스 자동 크롤링 구현

**수행할 작업**:

**1단계: 매장 CRUD (고객과 유사)**
- API: /api/stores
- 페이지: /stores, /stores/new, /stores/[id], /stores/[id]/edit
- 고객 선택 드롭다운 추가

**2단계: 네이버 크롤링 기능**

**크롤링 API**:
```typescript
POST /api/stores/crawl
Request Body: {
  url: "https://m.place.naver.com/restaurant/1234567890/home"
  // 또는
  mid: "1234567890"
}

Response: {
  success: true,
  data: {
    mid: "1234567890",
    name: "엔케이 떡카페",
    category: "카페",
    address: "서울 강남구...",
    phone: "02-1234-5678",
    businessHours: {...},
    reviewCount: 150,
    reviewAvgRating: 4.5,
    profileImageUrl: "...",
    coverImages: [...]
  }
}
```

**크롤링 구현 (Playwright)**:
1. lib/crawler/naver-place.ts 생성
2. 함수 구조:
   ```typescript
   async function crawlNaverPlace(mid: string) {
     const browser = await chromium.launch()
     const page = await browser.newPage()
     
     try {
       // 1. 페이지 접속
       await page.goto(`https://m.place.naver.com/restaurant/${mid}/home`)
       
       // 2. 데이터 추출
       const name = await page.locator('.place_name').textContent()
       const category = await page.locator('.category').textContent()
       // ... 기타 정보
       
       return { success: true, data: {...} }
     } catch (error) {
       return { success: false, error: error.message }
     } finally {
       await browser.close()
     }
   }
   ```

3. 크롤링 큐 시스템 (선택적, 일단 동기 처리):
   - 나중에 BullMQ + Redis로 업그레이드

**프론트엔드 통합**:
1. 매장 등록 페이지에 "URL로 자동 입력" 기능:
   - 입력: 네이버 플레이스 URL 또는 MID
   - "불러오기" 버튼 클릭
   - 로딩 인디케이터
   - 크롤링 결과로 폼 자동 채우기
   - 사용자가 수정 가능

2. 매장 상세 페이지에 "정보 업데이트" 버튼:
   - 기존 매장 정보 재크롤링
   - 변경사항 하이라이트

**제약 조건**:
- 크롤링 실패 시 적절한 에러 메시지
- 타임아웃 설정 (30초)
- Rate Limiting (동시 요청 제한)

**완료 기준**:
- URL 입력 → 크롤링 → 폼 자동 채우기 동작 확인
- 크롤링 실패 케이스 처리 확인
- 매장 CRUD 모두 정상 작동

**필요한 패키지**:
```bash
npm install playwright
npx playwright install chromium
```

**결과물**:
- lib/crawler/naver-place.ts
- app/api/stores/crawl/route.ts
- 매장 관리 페이지들
```

---

### 1-6. 키워드 관리 기능

```
**작업 목표**: 매장별 목표 키워드 관리 및 순위 입력 기능

**수행할 작업**:

**백엔드 API**:
```typescript
// 키워드 관리
GET    /api/stores/[storeId]/keywords
POST   /api/stores/[storeId]/keywords
PUT    /api/stores/[storeId]/keywords/[keywordId]
DELETE /api/stores/[storeId]/keywords/[keywordId]

// 순위 데이터
GET    /api/stores/[storeId]/rankings?from=2024-01-01&to=2024-12-31
POST   /api/stores/[storeId]/rankings       // 수동 입력
POST   /api/stores/[storeId]/rankings/bulk  // 엑셀 업로드
```

**프론트엔드**:

1. 매장 상세 > 키워드 관리 탭:
   - 키워드 목록 테이블:
     * 키워드명
     * 타입 (메인/서브/롱테일)
     * 현재 순위
     * 목표 순위
     * 검색량
     * 우선순위
     * 액션 (수정/삭제)
   - "키워드 추가" 버튼 → 모달/드로어
   - 드래그앤드롭으로 우선순위 조정

2. 매장 상세 > 순위 추적 탭:
   - 기간 선택 (일/주/월)
   - 키워드별 순위 그래프 (Recharts):
     * 선 그래프
     * 다중 키워드 비교 가능
     * Tooltip에 날짜/순위 표시
   - 순위 데이터 테이블:
     * 날짜 | 키워드1 | 키워드2 | ... 
     * 순위 변동 표시 (↑↓)
   - "순위 입력" 버튼
   - "엑셀 업로드" 버튼

3. 순위 수동 입력 모달:
   - 날짜 선택
   - 키워드별 순위 입력 폼
   - "저장" 버튼

4. 엑셀 업로드 기능:
   - 템플릿 다운로드 버튼
   - 파일 업로드 (드래그앤드롭)
   - 파싱 및 검증
   - 미리보기
   - "가져오기" 버튼

**엑셀 처리 (서버)**:
```typescript
// lib/excel/ranking-parser.ts
import xlsx from 'xlsx'

function parseRankingExcel(file: Buffer) {
  const workbook = xlsx.read(file)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const data = xlsx.utils.sheet_to_json(sheet)
  
  // 검증 및 변환
  return data.map(row => ({
    date: new Date(row['날짜']),
    keyword: row['키워드'],
    rank: parseInt(row['순위'])
  }))
}
```

**필요한 패키지**:
```bash
npm install recharts xlsx
npm install -D @types/xlsx
```

**완료 기준**:
- 키워드 CRUD 정상 작동
- 순위 수동 입력 동작
- 엑셀 업로드 및 파싱 성공
- 그래프 정상 렌더링

**결과물**:
- API 라우트들
- 키워드 관리 UI
- 순위 추적 UI
- 엑셀 파서 유틸리티
```

---

### 1-7. 주문/견적 관리 기능

```
**작업 목표**: 주문 및 견적서 생성 기능 구현

**수행할 작업**:

**상품 관리 선행 작업**:
1. 상품 카테고리 시드 데이터 생성:
   ```typescript
   // prisma/seed.ts
   대분류:
   - 네이버플레이스
   - SNS마케팅
   - 콘텐츠제작
   
   중분류:
   - 블로그
   - 리뷰
   - 광고세팅
   
   품목:
   - 파워블로거 포스팅
   - 일반 블로그 포스팅
   - 방문 리뷰
   등
   ```

2. 상품 관리 페이지 (간단히):
   - /settings/products
   - 카테고리별 품목 목록
   - 품목 추가/수정/삭제
   - 기본 단가 설정

**주문 생성 플로우**:
1. /orders/new 페이지:
   - Step 1: 고객/매장 선택
     * 고객 드롭다운 (검색 가능)
     * 매장 드롭다운 (해당 고객의 매장)
     * 또는 "신규 매장" 버튼
   
   - Step 2: 상품 추가
     * 카테고리별 상품 선택
     * 각 상품:
       - 수량 입력
       - 단가 (고객별 특별단가 있으면 자동 적용)
       - 할인율/할인액
       - 소계 자동 계산
     * "상품 추가" 버튼으로 여러 상품 추가
   
   - Step 3: 금액 확인
     * 공급가액 합계
     * 부가세 (10%)
     * 총액
     * 작업 기간 (시작일, 종료일)
     * 메모
   
   - Step 4: 견적서 생성 미리보기
     * PDF 미리보기 (선택적)
     * "견적서 저장" 버튼
     * "견적서 생성 및 발송" 버튼

**견적서 PDF 생성**:
```typescript
// lib/pdf/quote-generator.ts
import PDFDocument from 'pdfkit'

async function generateQuotePDF(order: Order) {
  const doc = new PDFDocument()
  
  // 회사 정보
  doc.fontSize(20).text('견 적 서', { align: 'center' })
  doc.moveDown()
  
  // 고객 정보
  doc.fontSize(12).text(`수신: ${customer.name}`)
  doc.text(`사업자번호: ${customer.businessNumber}`)
  doc.moveDown()
  
  // 견적 내역 테이블
  // ... (항목명, 수량, 단가, 금액)
  
  // 합계
  doc.text(`공급가액: ${order.subtotal.toLocaleString()}원`)
  doc.text(`부가세: ${order.taxAmount.toLocaleString()}원`)
  doc.text(`합계: ${order.totalAmount.toLocaleString()}원`)
  
  // 저장
  const buffer = await streamToBuffer(doc)
  return buffer
}
```

**API 엔드포인트**:
```typescript
POST /api/orders                  // 주문 생성
GET  /api/orders/[id]             // 주문 상세
PUT  /api/orders/[id]             // 주문 수정
POST /api/orders/[id]/quote       // 견적서 PDF 생성
POST /api/orders/[id]/send        // 견적서 발송 (이메일/카톡)
```

**주문 목록 페이지**:
- /orders
- 필터: 상태, 고객, 기간
- 검색: 주문번호, 고객명
- 상태별 카운트 (견적/확정/진행/완료)
- 테이블: 주문번호, 고객, 매장, 금액, 상태, 날짜

**필요한 패키지**:
```bash
npm install pdfkit
npm install -D @types/pdfkit
```

**완료 기준**:
- 주문 생성 플로우 완성
- PDF 견적서 생성 확인
- 주문 목록/상세 페이지 동작

**결과물**:
- 주문 관리 페이지들
- PDF 생성 유틸리티
- 관련 API
```

---

### 1-8. 기본 대시보드 구현

```
**작업 목표**: 주요 지표를 보여주는 대시보드 페이지

**수행할 작업**:

**대시보드 구성 요소**:

1. 상단 KPI 카드 (4개):
   ```
   [이번 달 매출]  [입금액]  [미수금]  [진행 중 주문]
   ```
   - 각 카드: 제목, 큰 숫자, 전월 대비 증감 (↑12%)

2. 매출 추이 그래프:
   - 최근 6개월 또는 12개월
   - 선 그래프 (Recharts)
   - 매출액 vs 입금액 비교

3. 최근 활동 (2컬럼 레이아웃):
   - 왼쪽: 최근 주문 목록 (5건)
     * 주문번호, 고객명, 금액, 상태
     * "전체 보기" 링크
   
   - 오른쪽: 키워드 순위 현황
     * 목표 달성 매장 수
     * 평균 순위 변동
     * 주요 순위 상승 키워드 (Top 3)

4. 알림 & 할일:
   - 계산서 발행 필요 (N건)
   - 결제 예정일 임박 (N건)
   - 계약 갱신 필요 (N건)
   - 각 항목 클릭 → 해당 페이지로 이동

**API**:
```typescript
GET /api/dashboard/stats
Response: {
  thisMonthRevenue: 50000000,
  thisMonthPayment: 42000000,
  unpaidAmount: 8000000,
  inProgressOrders: 15,
  
  revenueChart: [
    { month: '2024-06', revenue: 45000000 },
    { month: '2024-07', revenue: 48000000 },
    ...
  ],
  
  recentOrders: [...],
  keywordStats: {...},
  alerts: [...]
}
```

**구현 팁**:
- 복잡한 집계 쿼리는 Prisma의 aggregate 활용
- 캐싱 고려 (Redis, 또는 Next.js의 revalidate)
- 로딩 상태 표시 (Skeleton UI)

**완료 기준**:
- 모든 KPI 카드 정상 표시
- 그래프 렌더링 확인
- 최근 활동 목록 로드
- 알림 표시 및 링크 동작

**결과물**:
- app/(dashboard)/page.tsx
- components/dashboard/stats-cards.tsx
- components/dashboard/revenue-chart.tsx
- components/dashboard/recent-activity.tsx
```

---

## Phase 2: 확장 기능 프롬프트

### 2-1. 작업 히스토리 관리

```
**작업 목표**: 매장별 작업 기록 및 작업 전후 순위 비교

**수행할 작업**:

**데이터 모델**:
- StoreWorkHistory 테이블 (이미 스키마에 정의됨)

**API**:
```typescript
GET  /api/stores/[id]/work-history
POST /api/stores/[id]/work-history
PUT  /api/stores/[id]/work-history/[historyId]
DELETE /api/stores/[id]/work-history/[historyId]
```

**UI**:
1. 매장 상세 > 작업 히스토리 탭:
   - 타임라인 형식 또는 테이블
   - 각 항목:
     * 작업일
     * 작업 유형 (블로그, 리뷰, 광고 등)
     * 작업 내용
     * 작업 수량
     * 작업 전 순위 → 작업 후 순위
     * 첨부파일 (작업 증빙)
   - "작업 추가" 버튼

2. 작업 추가 모달:
   - 작업일 선택
   - 작업 유형 선택
   - 작업 상세 입력
   - 연결된 주문 선택 (옵션)
   - 키워드별 작업 전 순위 자동 불러오기
   - 작업 후 순위 입력 (또는 나중에)
   - 파일 첨부 (이미지, PDF 등)

**완료 기준**:
- 작업 기록 CRUD 동작
- 타임라인 UI 표시
- 순위 비교 기능

**결과물**:
- 작업 히스토리 API 및 UI
```

---

### 2-2. 진단 보고서 생성

```
**작업 목표**: 매장 진단 및 보고서 자동 생성

**수행할 작업**:

**진단 프로세스**:
1. 데이터 수집:
   - 매장 정보
   - 키워드 순위 데이터
   - 리뷰 현황
   - 작업 히스토리

2. 분석 로직:
   ```typescript
   // lib/diagnosis/analyzer.ts
   
   function analyzeSEO(store: Store) {
     // 프로필 완성도 체크
     let score = 0
     if (store.description) score += 20
     if (store.businessHours) score += 20
     if (store.coverImages.length >= 5) score += 20
     // ...
     
     return { score, issues: [...], recommendations: [...] }
   }
   
   function analyzeKeywords(rankings: KeywordRanking[]) {
     // 순위 추이 분석
     // 목표 달성률
     // 개선 필요 키워드
   }
   ```

3. 보고서 생성 (HTML → PDF):
   ```typescript
   // lib/diagnosis/report-generator.ts
   
   async function generateDiagnosisReport(diagnosis: Diagnosis) {
     const html = renderToStaticMarkup(
       <DiagnosisReportTemplate diagnosis={diagnosis} />
     )
     
     // HTML → PDF 변환 (puppeteer 또는 playwright)
     const pdf = await htmlToPdf(html)
     return pdf
   }
   ```

**API**:
```typescript
POST /api/stores/[id]/diagnoses        // 진단 시작
GET  /api/stores/[id]/diagnoses        // 진단 목록
GET  /api/diagnoses/[id]               // 진단 상세
POST /api/diagnoses/[id]/report        // 보고서 PDF 생성
POST /api/diagnoses/[id]/send          // 보고서 발송
```

**UI**:
1. 매장 상세 > 진단/보고서 탭:
   - 보고서 목록 (카드 또는 테이블)
   - "새 진단 시작" 버튼

2. 진단 생성 페이지:
   - 진단 유형 선택 (초기/주간/월간)
   - "진단 시작" 버튼
   - 진행 상태 표시 (로딩/분석 중)
   - 결과 요약 표시
   - "보고서 생성" 버튼

3. 보고서 상세 페이지:
   - SEO 점수 및 그래프
   - 키워드 분석 결과
   - 권장사항
   - PDF 다운로드 버튼
   - 발송 버튼 (이메일/카톡)

**보고서 템플릿 (React 컴포넌트)**:
```typescript
// components/reports/diagnosis-template.tsx
export function DiagnosisReportTemplate({ diagnosis }) {
  return (
    <div className="report">
      <header>
        <h1>매장 진단 보고서</h1>
        <p>{diagnosis.store.name}</p>
      </header>
      
      <section>
        <h2>SEO 현황</h2>
        <div className="score-circle">{diagnosis.seoScore}</div>
        {/* 차트, 이슈, 권장사항 */}
      </section>
      
      {/* 기타 섹션들 */}
    </div>
  )
}
```

**완료 기준**:
- 진단 로직 구현
- 보고서 PDF 생성
- UI 완성

**결과물**:
- 진단 분석기
- 보고서 생성기
- 관련 UI
```

---

### 2-3. 구매/거래처 관리

```
**작업 목표**: 구매 발주 및 거래처 관리 기능

**수행할 작업**:

**거래처 관리**:
- CRUD API 및 페이지 (고객 관리와 유사)
- /suppliers
- 추가 필드: 취급 서비스, 발주 방식, 발주시트 URL

**구매 발주 기능**:
1. 판매 주문 확정 후 → "구매 발주 생성" 버튼
2. 구매 발주 생성 페이지:
   - 판매 주문 정보 자동 로드
   - 각 항목별 거래처 선택
   - 원가 입력/확인
   - 작업 상세 정보 (키워드, URL 등)
   - 총 구매 금액 계산
   - "발주서 생성" 버튼

3. 발주 방식별 처리:
   - 구글시트: API로 자동 입력
   - 이메일: 발주서 이메일 발송
   - 수동: 발주서 PDF 다운로드

**구매 발주 상태 관리**:
- draft → sent → confirmed → in_progress → completed
- 각 상태별 액션 정의

**발주서 PDF 생성**:
- 견적서와 유사한 포맷
- 거래처 정보, 작업 내역, 금액

**완료 기준**:
- 거래처 CRUD
- 구매 발주 생성 플로우
- 발주서 생성

**결과물**:
- 거래처 관리 페이지
- 구매 발주 페이지
- 발주서 생성기
```

---

### 2-4. 세금계산서 연동

```
**작업 목표**: 홈택스 또는 세금계산서 API 연동

**수행할 작업**:

**API 선택**:
- 홈택스 API (정식)
- 또는 바로빌, 더존 등 서드파티

**구현**:
1. API 래퍼 작성:
   ```typescript
   // lib/tax-invoice/hometax-api.ts
   
   class HometaxAPI {
     constructor(private apiKey: string) {}
     
     async issue(invoice: Invoice) {
       // API 호출
       const response = await fetch('...', {
         method: 'POST',
         headers: { 'Authorization': `Bearer ${this.apiKey}` },
         body: JSON.stringify({
           supplierBusinessNumber: '...',
           recipientBusinessNumber: '...',
           items: [...],
           totalAmount: ...
         })
       })
       
       return response.json()
     }
     
     async getStatus(invoiceId: string) { ... }
     async cancel(invoiceId: string) { ... }
   }
   ```

2. API 엔드포인트:
   ```typescript
   POST /api/invoices              // 계산서 발행
   GET  /api/invoices/[id]         // 계산서 조회
   POST /api/invoices/[id]/cancel  // 계산서 취소
   ```

3. UI:
   - 주문 상세 > "계산서 발행" 버튼
   - 계산서 정보 확인 모달
   - "발행" 버튼 → API 호출 → 결과 표시
   - 발행된 계산서 목록 (/invoices)

**완료 기준**:
- API 연동 성공
- 계산서 발행 동작
- 오류 처리

**결과물**:
- 세금계산서 API 래퍼
- 계산서 발행 UI
```

---

### 2-5. 입금 관리 및 자동 매칭

```
**작업 목표**: 은행 API 연동 및 입금 자동 매칭

**수행할 작업**:

**은행 오픈뱅킹 API 연동**:
1. 오픈뱅킹 가입 및 API 키 발급
2. API 래퍼:
   ```typescript
   // lib/banking/openbanking-api.ts
   
   class OpenBankingAPI {
     async getTransactions(accountId: string, from: Date, to: Date) {
       // 거래내역 조회
       return [...transactions]
     }
   }
   ```

3. 스케줄러 설정 (node-cron 또는 Vercel Cron):
   ```typescript
   // app/api/cron/sync-payments/route.ts
   
   export async function GET() {
     const api = new OpenBankingAPI()
     const transactions = await api.getTransactions(...)
     
     for (const tx of transactions) {
       // DB에 저장
       await prisma.payment.create({
         data: {
           paymentDate: tx.date,
           paymentAmount: tx.amount,
           depositorName: tx.depositor,
           bankTransactionId: tx.id
         }
       })
     }
   }
   ```

**자동 매칭 로직**:
```typescript
// lib/payment/auto-matcher.ts

async function autoMatchPayments() {
  const unmatchedPayments = await prisma.payment.findMany({
    where: { matchStatus: 'unmatched' }
  })
  
  for (const payment of unmatchedPayments) {
    // 1. 금액 일치하는 계산서 찾기
    const matchingInvoices = await prisma.invoice.findMany({
      where: {
        totalAmount: payment.paymentAmount,
        paymentStatus: 'unpaid'
      },
      include: { customer: true }
    })
    
    // 2. 입금자명 또는 사업자번호로 필터링
    const matched = matchingInvoices.find(inv => 
      inv.customer.name.includes(payment.depositorName) ||
      inv.customer.businessNumber === extractBusinessNumber(payment.depositorName)
    )
    
    if (matched) {
      // 자동 매칭
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          invoiceId: matched.id,
          matchStatus: 'auto_matched'
        }
      })
      
      await prisma.invoice.update({
        where: { id: matched.id },
        data: { paymentStatus: 'paid' }
      })
    }
  }
}
```

**UI**:
1. /payments - 입금 관리 페이지:
   - 미매칭 입금 목록 (강조 표시)
   - 매칭된 입금 목록
   - "은행 동기화" 버튼
   - "수동 입력" 버튼

2. 수동 매칭 인터페이스:
   - 입금 선택
   - 가능한 주문/계산서 목록 추천
   - "매칭" 버튼

**완료 기준**:
- 은행 API 연동
- 자동 매칭 로직 동작
- 수동 매칭 UI

**결과물**:
- 은행 API 래퍼
- 자동 매칭 로직
- 입금 관리 UI
```

---

### 2-6. 손익 분석 및 고급 대시보드

```
**작업 목표**: 상세 손익 분석 및 다양한 리포트

**수행할 작업**:

**손익 계산 로직**:
```typescript
// lib/analytics/profit-calculator.ts

async function calculateProfit(period: { from: Date, to: Date }) {
  // 1. 매출: 해당 기간 완료된 주문들
  const orders = await prisma.order.findMany({
    where: {
      orderStatus: 'completed',
      orderDate: { gte: period.from, lte: period.to }
    },
    include: { purchaseOrders: true }
  })
  
  const revenue = orders.reduce((sum, o) => sum + o.totalAmount, 0)
  
  // 2. 매출원가: 연결된 구매 발주들
  const cogs = orders.reduce((sum, o) => {
    const poCost = o.purchaseOrders.reduce((s, po) => s + po.totalAmount, 0)
    return sum + poCost
  }, 0)
  
  // 3. 매출총이익
  const grossProfit = revenue - cogs
  const grossMargin = (grossProfit / revenue) * 100
  
  return { revenue, cogs, grossProfit, grossMargin }
}
```

**분석 대시보드**:
1. /reports/profit - 손익 분석 페이지:
   - 기간 선택 (일/주/월/분기/커스텀)
   - KPI 카드:
     * 매출액
     * 매출원가
     * 매출총이익
     * 이익률
   - 추이 그래프 (막대 + 선 결합)
   
2. 다차원 분석:
   - 고객별 손익
   - 매장별 손익
   - 상품 카테고리별 손익
   - 거래처별 비용
   - 테이블 + 파이 차트

3. 엑셀 다운로드:
   - 상세 내역 포함
   - 피벗 테이블 형식

**API**:
```typescript
GET /api/reports/profit?from=2024-01-01&to=2024-12-31
GET /api/reports/profit/by-customer
GET /api/reports/profit/by-store
GET /api/reports/profit/by-category
GET /api/reports/profit/export  // 엑셀 다운로드
```

**완료 기준**:
- 손익 계산 로직
- 분석 대시보드 UI
- 엑셀 다운로드

**결과물**:
- 손익 분석 로직
- 리포트 페이지들
```

---

## Phase 3: 자동화 & 고도화 프롬프트

### 3-1. 자동 순위 크롤링 스케줄러

```
**작업 목표**: 일일 자동 순위 크롤링 시스템

**수행할 작업**:

**크롤링 큐 시스템 (BullMQ + Redis)**:
1. 설치 및 설정:
   ```bash
   npm install bullmq ioredis
   ```

2. 큐 정의:
   ```typescript
   // lib/queue/ranking-queue.ts
   import { Queue, Worker } from 'bullmq'
   import Redis from 'ioredis'
   
   const connection = new Redis({
     host: process.env.REDIS_HOST,
     port: parseInt(process.env.REDIS_PORT!)
   })
   
   export const rankingQueue = new Queue('ranking-crawl', { connection })
   
   export const rankingWorker = new Worker(
     'ranking-crawl',
     async (job) => {
       const { storeId, keyword } = job.data
       
       // 순위 크롤링 실행
       const rank = await crawlKeywordRank(storeId, keyword)
       
       // DB 저장
       await prisma.keywordRanking.create({
         data: {
           storeId,
           keyword,
           rankPosition: rank,
           rankDate: new Date()
         }
       })
     },
     { connection }
   )
   ```

3. 스케줄러 (Vercel Cron 또는 node-cron):
   ```typescript
   // app/api/cron/daily-ranking/route.ts
   
   export async function GET() {
     // 모든 활성 매장의 키워드 가져오기
     const stores = await prisma.store.findMany({
       where: { status: 'active' },
       include: { keywords: { where: { isActive: true } } }
     })
     
     // 큐에 작업 추가
     for (const store of stores) {
       for (const keyword of store.keywords) {
         await rankingQueue.add('crawl', {
           storeId: store.id,
           keyword: keyword.keyword
         })
       }
     }
     
     return Response.json({ queued: stores.length })
   }
   ```

4. Vercel Cron 설정:
   ```json
   // vercel.json
   {
     "crons": [{
       "path": "/api/cron/daily-ranking",
       "schedule": "0 2 * * *"  // 매일 새벽 2시
     }]
   }
   ```

**완료 기준**:
- 큐 시스템 동작
- 스케줄러 실행
- 순위 데이터 자동 저장

**결과물**:
- 크롤링 큐
- 스케줄러 Cron Job
```

---

### 3-2. Google Drive 자동 연동

```
**작업 목표**: 매장별 구글 드라이브 폴더 자동 생성 및 파일 관리

**수행할 작업**:

**Google Drive API 설정**:
1. GCP에서 프로젝트 생성 및 Drive API 활성화
2. 서비스 계정 생성 및 키 다운로드
3. API 래퍼:
   ```typescript
   // lib/google-drive/drive-api.ts
   import { google } from 'googleapis'
   
   class GoogleDriveService {
     private drive
     
     constructor() {
       const auth = new google.auth.GoogleAuth({
         keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
         scopes: ['https://www.googleapis.com/auth/drive']
       })
       
       this.drive = google.drive({ version: 'v3', auth })
     }
     
     async createFolder(name: string, parentId?: string) {
       const fileMetadata = {
         name,
         mimeType: 'application/vnd.google-apps.folder',
         parents: parentId ? [parentId] : []
       }
       
       const file = await this.drive.files.create({
         requestBody: fileMetadata,
         fields: 'id'
       })
       
       return file.data.id
     }
     
     async uploadFile(file: Buffer, name: string, folderId: string) {
       const media = {
         mimeType: 'image/jpeg',
         body: Readable.from(file)
       }
       
       const fileMetadata = {
         name,
         parents: [folderId]
       }
       
       const result = await this.drive.files.create({
         requestBody: fileMetadata,
         media,
         fields: 'id, webViewLink'
       })
       
       return result.data
     }
   }
   ```

**자동 폴더 생성**:
```typescript
// 매장 생성 시 자동으로 드라이브 폴더 생성
async function createStoreWithFolder(storeData) {
  const driveService = new GoogleDriveService()
  
  // 1. 드라이브 폴더 생성
  const folderId = await driveService.createFolder(
    `[${storeData.name}] ${storeData.mid}`
  )
  
  // 2. 매장 데이터에 폴더 ID 저장
  const store = await prisma.store.create({
    data: {
      ...storeData,
      googleDriveFolderId: folderId
    }
  })
  
  return store
}
```

**파일 업로드 기능**:
- 매장 상세 페이지에 "파일 업로드" 버튼
- 이미지, PDF 등 업로드
- 자동으로 해당 매장 드라이브 폴더에 저장

**완료 기준**:
- 드라이브 API 연동
- 자동 폴더 생성
- 파일 업로드/조회

**결과물**:
- Google Drive 서비스
- 자동 폴더 생성 로직
```

---

### 3-3. 구매 발주 자동화 (구글시트 연동)

```
**작업 목표**: 구매 발주를 거래처 구글시트에 자동 입력

**수행할 작업**:

**Google Sheets API 연동**:
```typescript
// lib/google-sheets/sheets-api.ts
import { google } from 'googleapis'

class GoogleSheetsService {
  private sheets
  
  constructor() {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    })
    
    this.sheets = google.sheets({ version: 'v4', auth })
  }
  
  async appendRow(spreadsheetId: string, range: string, values: any[][]) {
    await this.sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values }
    })
  }
}
```

**자동 발주 프로세스**:
1. 구매 발주 생성 완료 시
2. 거래처의 발주 방식 확인
3. 발주 방식이 'sheet'인 경우:
   ```typescript
   async function sendPurchaseOrderToSheet(po: PurchaseOrder) {
     const supplier = await prisma.supplier.findUnique({
       where: { id: po.supplierId },
       include: { orderSheetTemplate: true }  // 시트 URL, 템플릿 정보
     })
     
     if (supplier.orderMethod !== 'sheet') return
     
     const sheetsService = new GoogleSheetsService()
     
     // 발주 데이터 포맷팅
     const rows = po.items.map(item => [
       po.poNumber,
       new Date().toISOString().split('T')[0],
       item.store.name,
       item.store.naver_mid,
       item.keyword || '',
       item.product.name,
       item.quantity,
       item.notes
     ])
     
     // 시트에 추가
     const spreadsheetId = extractSpreadsheetId(supplier.orderSheetUrl)
     await sheetsService.appendRow(spreadsheetId, 'A:H', rows)
   }
   ```

**완료 기준**:
- 구글시트 API 연동
- 자동 발주 입력 동작

**결과물**:
- Google Sheets 서비스
- 자동 발주 로직
```

---

## 추가 프롬프트: 모범 사례

### 코드 품질 체크리스트

```
**모든 개발 작업 후 다음을 확인하세요**:

1. **타입 안정성**:
   - TypeScript strict 모드 오류 없음
   - any 타입 최소화
   - Zod 스키마로 런타임 검증

2. **에러 핸들링**:
   - try-catch 블록 사용
   - 사용자 친화적 에러 메시지
   - 에러 로깅 (Sentry 등)

3. **성능**:
   - N+1 쿼리 방지 (Prisma include 활용)
   - 적절한 인덱스
   - 페이지네이션 구현

4. **보안**:
   - SQL 인젝션 방지 (Prisma 사용)
   - XSS 방지 (React 자동 이스케이프)
   - CSRF 토큰 (필요시)
   - 민감 정보 암호화

5. **사용자 경험**:
   - 로딩 상태 표시
   - 에러 메시지 표시
   - 성공 피드백 (Toast)
   - 반응형 디자인

6. **테스트**:
   - 핵심 로직 단위 테스트
   - API 엔드포인트 테스트
   - E2E 테스트 (주요 플로우)
```

---

## 개발 시작 명령어

```bash
# 1. 프로젝트 생성
npx create-next-app@latest naver-place-erp --typescript --tailwind --app

cd naver-place-erp

# 2. 필수 패키지 설치
npm install prisma @prisma/client
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install react-hook-form @hookform/resolvers zod
npm install date-fns recharts
npm install playwright pdfkit xlsx

# shadcn/ui 초기화
npx shadcn@latest init

# 3. 개발 서버 실행
npm run dev
```

---

## 최종 체크리스트

Phase 1 완료 시 확인:
- [ ] 고객 관리 CRUD
- [ ] 매장 관리 CRUD + 크롤링
- [ ] 키워드 관리
- [ ] 순위 데이터 입력
- [ ] 주문/견적 관리
- [ ] 기본 대시보드

Phase 2 완료 시 확인:
- [ ] 작업 히스토리
- [ ] 진단 보고서
- [ ] 구매/거래처 관리
- [ ] 세금계산서 연동
- [ ] 입금 관리
- [ ] 손익 분석

Phase 3 완료 시 확인:
- [ ] 자동 순위 크롤링
- [ ] Google Drive 연동
- [ ] 구매 발주 자동화
- [ ] 고급 대시보드

---

**프롬프트 문서 끝**

각 단계별로 이 프롬프트를 AI 개발 에이전트(Claude, GPT)에게 제공하면, 
체계적으로 ERP 시스템을 개발할 수 있습니다.
