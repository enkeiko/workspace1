# 프로젝트 문서 검토 보고서

**검토자**: 20년차 프로덕트 디렉터 관점
**검토 일자**: 2024년
**검토 범위**: 전체 개발 문서 (01-08)

---

## 🚨 Critical Issues (즉시 수정 필요)

### 1. 보안 취약점

#### 1.1 플랫폼 계정 비밀번호 저장 방식
**문제점**:
- `PLATFORM_ACCOUNTS` 테이블에 `account_password_encrypted`로 저장 계획
- 암호화만으로는 부족, 해시 + 솔트 필요
- 비밀번호를 DB에 저장하는 것 자체가 보안 위험

**권장사항**:
- 비밀번호를 DB에 저장하지 말 것
- 플랫폼 계정은 토큰/API 키 방식 사용 권장
- 반드시 필요한 경우 환경 변수나 암호화된 키 저장소 사용 (예: AWS Secrets Manager)
- 암호화 시 `bcrypt` 또는 `argon2` 사용 (단순 암호화 아님)

#### 1.2 파일 업로드 보안 미흡
**문제점**:
- 파일 업로드 검증이 명확하지 않음
- 파일 타입, 크기 제한만 언급, 구체적인 검증 방법 부재
- 바이러스 스캔은 "향후"로만 표기

**권장사항**:
- 파일 확장자 화이트리스트 검증 (서버 사이드)
- MIME 타입 검증 (확장자 조작 방지)
- 파일 크기 제한 명시 (예: 10MB)
- 파일명 sanitization (경로 탐색 공격 방지)
- 클라우드 저장소 사용 시 사전 서명 URL 활용

#### 1.3 CSRF 보호 부재
**문제점**:
- Next.js 기본 보호만 언급, 구체적 방법 없음

**권장사항**:
- API Routes에 CSRF 토큰 검증 추가
- Next.js App Router의 경우 `csrf` 라이브러리 사용

### 2. 데이터베이스 설계 오류

#### 2.1 계산 필드 중복 저장
**문제점**:
- `ORDERS` 테이블의 `unpaid_amount`가 계산 필드인데 저장
- `total_amount`도 `order_items` 합계와 중복 가능

**권장사항**:
- 계산 필드는 DB 뷰(VIEW) 또는 Prisma computed field로 처리
- 또는 트리거로 자동 계산하되, 항상 일관성 유지 메커니즘 필요
- API 응답 시 계산해서 반환하는 방식 권장

```sql
-- 권장: DB 뷰 사용
CREATE VIEW order_totals AS
SELECT 
  o.id,
  o.total_amount - COALESCE(SUM(i.paid_amount), 0) as unpaid_amount
FROM orders o
LEFT JOIN invoices i ON i.order_id = o.id
GROUP BY o.id;
```

#### 2.2 관계 설계 불일치
**문제점**:
- ERD에서 `ORDERS ↔ QUOTATIONS`를 1:1로 표시
- 실제로는 한 견적서에서 여러 주문이 생성될 수 있고, 한 주문도 여러 견적서로부터 생성될 수 있음

**권장사항**:
- `QUOTATIONS`에 `converted_to_order_id` (nullable) 추가
- 또는 중간 테이블 `QUOTATION_ORDER_LINKS` 생성

#### 2.3 NULL 가능성 미고려
**문제점**:
- `ORDER_ITEMS.product_id`가 NOT NULL인데, 커스텀 상품 입력 시 문제
- `QUOTATION_ITEMS`도 동일

**권장사항**:
- `product_id`를 nullable로 변경
- 대신 `product_name`, `product_description` 필드 추가 (NULL일 때 사용)

#### 2.4 외래 키 삭제 정책
**문제점**:
- 모든 외래 키가 `ON DELETE RESTRICT`로만 설정
- 실제 비즈니스 로직에 따라 CASCADE 또는 SET NULL 필요할 수 있음

**권장사항**:
- 테이블별로 적절한 삭제 정책 설정:
  - 고객 삭제: 매장/주문은 보존 필요 → RESTRICT
  - 주문 삭제: 주문 항목은 CASCADE
  - 상품 삭제: 주문 항목은 보존 필요 → SET NULL

### 3. Next.js 구현 관련 오류

#### 3.1 PDF 생성 라이브러리 선택
**문제점**:
- `pdfkit`과 `puppeteer` 둘 다 언급
- `pdfkit`: 서버 사이드 전용, Node.js 환경 필요
- `puppeteer`: 무거운 의존성 (Chromium 포함), MVP에 과함

**권장사항**:
- MVP: `@react-pdf/renderer` (서버/클라이언트 양쪽 가능)
- 또는 `pdfkit` (서버 전용, 가볍고 빠름)
- `puppeteer`는 MVP 이후로 제외

#### 3.2 API 라우트 경로 오류
**문제점**:
- 문서에서 `/api/customers/[id]/route.ts` 언급
- Next.js App Router는 `/api/customers/[id]/route.ts`가 맞지만
- 동적 라우트 파라미터 접근 방법 명시 필요

**권장사항**:
- API Route에서 params 접근 방법 명시:
```typescript
// app/api/customers/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // Next.js 15+ 에서는 params가 Promise
}
```

#### 3.3 파일 업로드 구현 누락
**문제점**:
- 문서에서 `multipart/form-data`만 언급
- Next.js에서 처리 방법 구체적으로 없음

**권장사항**:
- `formidable` 또는 Next.js 13+ `request.formData()` 사용
- 예시 코드 추가:
```typescript
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  // ...
}
```

### 4. 성능 및 확장성 문제

#### 4.1 인덱스 전략 부족
**문제점**:
- 기본 인덱스만 언급, 복합 인덱스 전략 없음
- 대시보드 조회 쿼리 최적화 고려 부족

**권장사항**:
- 복합 인덱스 추가:
  ```sql
  CREATE INDEX idx_orders_customer_date ON orders(customer_id, order_date DESC);
  CREATE INDEX idx_invoices_order_status ON invoices(order_id, status, is_paid);
  ```
- 대시보드 집계 쿼리는 Materialized View 고려

#### 4.2 페이지네이션 최적화 부재
**문제점**:
- OFFSET 기반 페이지네이션만 언급
- 대량 데이터에서 성능 문제 발생

**권장사항**:
- Cursor 기반 페이지네이션 병행:
  - 첫 페이지: OFFSET
  - 이후: `cursor` + `limit` (id 기반)

#### 4.3 N+1 쿼리 문제 미고려
**문제점**:
- Prisma 사용 시 include 최적화 방법 언급 없음

**권장사항**:
- Prisma select/include 최적화 예시 추가
- 필요시 데이터 로더 패턴 고려

---

## ⚠️ Major Issues (수정 권장)

### 5. 문서 간 불일치

#### 5.1 API 응답 형식 불일치
**문제점**:
- API 명세서에서 camelCase (`businessNumber`)
- DB 설계에서 snake_case (`business_number`)
- Prisma는 기본적으로 camelCase로 변환하지만 명확히 하지 않음

**권장사항**:
- Prisma `@@map` 사용 명시
- API 응답 변환 전략 명확화

#### 5.2 날짜/시간 타입 혼용
**문제점**:
- DB: `DATE`, `TIMESTAMP` 혼용
- API: ISO 8601 문자열
- TypeScript: `Date` 객체
- 변환 로직 명시 없음

**권장사항**:
- 모든 날짜는 UTC로 저장
- API 응답은 ISO 8601 문자열
- 클라이언트에서 로컬 시간 변환

### 6. 구현 가능성 문제

#### 6.1 정산 로직 불명확
**문제점**:
- `SETTLEMENTS` 테이블의 역할이 모호
- 매출/비용 집계 방식 명확하지 않음
- 미수금/선금 계산 로직 부재

**권장사항**:
- 정산 로직 명확화:
  - 매출: `orders.total_amount` 합계
  - 비용: `purchases.total_amount` 합계
  - 미수금: `orders.unpaid_amount` 합계
  - 선금: 별도 테이블 또는 필드 필요
- `SETTLEMENTS`는 정산 이력으로 사용

#### 6.2 알림 시스템 설계 부재
**문제점**:
- 알림 기능 언급은 있으나 구현 방법 없음
- 알림 저장소, 발송 방식 미정

**권장사항**:
- 알림 테이블 추가:
  ```sql
  CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100),
    type VARCHAR(50),
    title VARCHAR(255),
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```
- 실시간 알림: WebSocket 또는 Server-Sent Events
- 이메일/카카오톡: 큐 시스템 (BullMQ 등)

### 7. 기술 스택 선택 문제

#### 7.1 shadcn/ui CLI 명령어 오류
**문제점**:
- `npx shadcn-ui@latest` 명령어 오류
- 정확한 명령어: `npx shadcn@latest`

**수정**:
```bash
# 잘못된 명령어
npx shadcn-ui@latest add button

# 올바른 명령어
npx shadcn@latest add button
```

#### 7.2 Prisma 클라이언트 싱글톤 패턴
**문제점**:
- 개발 환경 설정에 Prisma 클라이언트 싱글톤 패턴은 있으나
- 프로덕션 환경에서 connection pool 관리 누락

**권장사항**:
```typescript
// 프로덕션 최적화
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})
```

---

## 📋 Minor Issues (개선 권장)

### 8. 코드 품질 및 일관성

#### 8.1 TypeScript 타입 정의 누락
**문제점**:
- API 명세서에 TypeScript 타입 정의 없음
- Prisma 타입과 API 타입 매핑 명확하지 않음

**권장사항**:
- `types/api.ts`에 API 타입 정의 추가
- Prisma 타입에서 API 타입 변환 유틸리티 함수

#### 8.2 에러 핸들링 표준화
**문제점**:
- 에러 코드는 있으나 구체적인 에러 클래스 구조 없음

**권장사항**:
```typescript
// lib/errors/app-error.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super('NOT_FOUND', message, 404)
  }
}
```

### 9. 개발 일정 현실성

#### 9.1 일정이 비현실적으로 느림
**문제점**:
- 총 12주 (3개월)로 계획
- 1인 개발 기준으로도 여유가 많음

**권장사항**:
- MVP는 6-8주로 단축 가능
- 병렬 작업 가능 부분 식별
- MVP 범위 재검토 (불필요한 기능 제외)

### 10. 문서 완성도

#### 10.1 테스트 전략 부재
**문제점**:
- 테스트는 "향후"로만 표기
- MVP에서도 최소한의 통합 테스트 필요

**권장사항**:
- MVP에서도 API 통합 테스트 포함
- E2E 테스트는 Phase 2로

#### 10.2 모니터링 및 로깅 부재
**문제점**:
- 에러 로깅만 언급, 구체적 방법 없음

**권장사항**:
- 로깅 라이브러리 선택 (예: `pino`, `winston`)
- 구조화된 로그 형식 정의
- 에러 추적 도구 연동 (Sentry 등)

---

## ✅ 긍정적인 부분

1. **체계적인 문서화**: 8개 문서로 잘 구성됨
2. **모듈화된 구조**: 도메인별로 잘 분리됨
3. **확장성 고려**: Phase 2 이후 확장 계획 포함
4. **타입 안정성**: TypeScript 사용 계획
5. **현대적인 스택**: Next.js 14, Prisma, PostgreSQL

---

## 🔧 즉시 수정해야 할 항목

### 우선순위 1 (보안)
1. 플랫폼 계정 비밀번호 저장 방식 변경
2. 파일 업로드 보안 검증 강화
3. CSRF 보호 구현 방법 추가

### 우선순위 2 (데이터 무결성)
1. 계산 필드 처리 방식 변경
2. 외래 키 삭제 정책 재설계
3. NULL 허용 필드 검토

### 우선순위 3 (구현 가능성)
1. PDF 생성 라이브러리 결정
2. 파일 업로드 구현 방법 명시
3. 정산 로직 명확화

---

## 📝 추가 검토 필요 사항

1. **환경 변수 관리**: 민감 정보 관리 방법
2. **백업 전략**: 자동 백업 구현 방법
3. **배포 전략**: CI/CD 파이프라인 상세
4. **성능 모니터링**: 실제 사용량 모니터링 방법
5. **데이터 마이그레이션**: 기존 데이터 이관 전략

---

## 결론

전체적으로 잘 구조화된 문서이지만, **보안**과 **데이터 무결성** 측면에서 즉시 수정이 필요한 부분이 있습니다. 특히 플랫폼 계정 비밀번호 저장 방식은 재설계가 필수입니다.

구현 전에 위 Critical Issues와 Major Issues를 해결한 후 진행하는 것을 강력히 권장합니다.

