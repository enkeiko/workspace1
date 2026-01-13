# 42ment 네이버 플레이스 마케팅 ERP PRD v3.0 - 시스템/ERD/로드맵

> **작성일**: 2026-01-12
> **버전**: 3.0
> **상태**: 최종 검토 대기

참조: `../../PRD_42ment_ERP_v3.0.md`

## 16. 시스템 관리

### 16.1 시스템 설정 (Super Admin)

```
[일반 설정]
- 회사 정보 (상호, 사업자번호, 대표자, 주소)
- 시스템 로고
- 기본 통화 / 날짜 형식

[바로빌 연동]
- API 인증 정보
- 자동발행 설정
- 동기화 스케줄

[Google 연동]
- 서비스 계정 인증
- 기본 폴더 ID

[알림 설정]
- 알림톡 발신 프로필
- 이메일 SMTP 설정
- 슬랙 웹훅

[크롤링 설정]
- 크롤링 주기
- 프록시 설정 (필요시)
- User-Agent 설정
```

### 16.2 공통 코드 관리

```
[common_codes]
- id (PK)
- group_code: status / product_type / category 등
- code
- name
- sort_order
- is_active
```

### 16.3 감사 로그

```
[audit_logs]
- id (PK)
- user_id (FK)
- action: create / update / delete / login / export
- target_type: store / order / settlement 등
- target_id
- before_value (JSON)
- after_value (JSON)
- ip_address
- user_agent
- created_at
```

### 16.4 데이터 백업

- 일일 자동 백업 (DB)
- 수동 백업/복원 기능
- 백업 이력 관리

---


## 17. 데이터 모델 (ERD)

### 17.1 핵심 테이블 관계

```
[tenants] 1──N [users]
[tenants] 1──N [customers]
[tenants] 1──N [stores]
[tenants] 1──N [products]
[tenants] 1──N [quotations]
[tenants] 1──N [sales_orders]
[tenants] 1──N [orders]
[tenants] 1──N [settlements]

[customers] 1──N [stores]
[customers] 1──N [quotations]
[customers] 1──N [sales_orders]

[stores] 1──N [quotations]
[stores] 1──N [order_items]
[stores] 1──N [work_logs]
[stores] 1──N [store_keywords]
[stores] 1──N [keyword_rankings]

[quotations] 1──N [quotation_items]
[quotations] 1──N [sales_orders]  (견적→주문 연동)

[sales_orders] 1──N [sales_order_items]
[sales_orders] 1──N [purchase_orders]  (주문→발주 분리)

[products] 1──N [purchase_orders]
[products] 1──N [product_templates]
[products] 1──N [product_prices]
[products] 1──N [product_sheets]

[purchase_orders] N──1 [sales_orders]  (선택적 연결)
[purchase_orders] 1──N [purchase_order_items]
[purchase_orders] 1──N [purchase_order_exports]
[purchase_orders] 1──N [work_statements]

[purchase_order_items] 1──N [work_logs]
[purchase_order_items] 1──N [work_statement_items]
[purchase_order_items] 1──N [purchase_order_receipts]

[work_statements] 1──N [work_statement_items]

[settlements] 1──1 [tax_invoices]
[settlements] 1──N [payment_records]
[settlements] 1──N [settlement_lines]
```

### 17.2 전체 테이블 목록

| 그룹 | 테이블 | 설명 |
|------|--------|------|
| 인증 | users | 사용자 |
| 인증 | tenants | 파트너사 |
| 고객 | customers | 고객사 |
| 매장 | stores | 매장 |
| 매장 | store_keywords | 매장 키워드 |
| 상품 | products | 발주 상품 |
| 상품 | product_templates | 상품 템플릿 |
| 상품 | product_prices | 파트너 단가 |
| 상품 | product_sheets | 상품 시트 설정 |
| 견적 | quotations | 견적서 헤더 |
| 견적 | quotation_items | 견적서 항목 |
| 주문 | sales_orders | 주문/수주 헤더 |
| 주문 | sales_order_items | 주문/수주 상세 |
| 발주 | purchase_orders | 발주 헤더 |
| 발주 | purchase_order_items | 발주 상세 |
| 발주 | purchase_order_exports | 발주서 출력 이력 |
| 발주 | purchase_order_receipts | 수주(작업결과) 이력 |
| 작업 | work_logs | 작업 로그 |
| 키워드 | keyword_rankings | 키워드 순위 |
| 키워드 | ranking_snapshots | 순위 스냅샷 |
| 명세 | work_statements | 작업 명세 |
| 명세 | work_statement_items | 작업 명세 상세 |
| 정산 | settlements | 정산 |
| 정산 | settlement_lines | 정산 라인 |
| 정산 | payment_records | 입금 기록 |
| 정산 | tax_invoices | 세금계산서 |
| 정산 | bank_transactions | 계좌 거래내역 |
| 정산 | business_status_logs | 사업자 상태 |
| 시스템 | notification_settings | 알림 설정 |
| 시스템 | audit_logs | 감사 로그 |
| 시스템 | common_codes | 공통 코드 |

---


## 18. 기술 스택

### 18.1 권장 스택 (풀스택)

| 구분 | 기술 | 비고 |
|------|------|------|
| Frontend | Next.js 14 + TypeScript | App Router |
| Styling | TailwindCSS + shadcn/ui | |
| Backend | Next.js API Routes | |
| ORM | Prisma | |
| Database | PostgreSQL | Supabase 권장 |
| Auth | NextAuth.js | |
| 배포 | Vercel | |
| 크롤링 | Python + FastAPI | 별도 서비스 |
| 큐 | Redis + BullMQ | 크롤링 작업 큐 |

### 18.2 외부 API

| 서비스 | 용도 | 비고 |
|--------|------|------|
| Google Sheets API | 발주서 출력 | 서비스 계정 |
| 바로빌 API | 세금계산서/정산 | 유료 |
| 카카오 알림톡 API | 알림 발송 | 바로빌 통해 가능 |
| 네이버 플레이스 | 키워드 크롤링 | 자체 크롤러 |

---


## 19. 개발 우선순위

### Phase 1: MVP (핵심)
```
1. 로그인/인증 (단일 Admin)
2. 매장 관리 + Excel 업로드
3. 상품 관리
4. 발주 등록 (키워드 기반)
5. 발주 현황 조회
6. Google Sheets 발주서 출력
```

### Phase 2: 정산 + 트래킹
```
7. 발주 상태 관리 (플로우)
8. 대시보드
9. 정산 관리 (매출/비용)
10. 키워드 순위 트래킹 (기본)
11. 마케팅 작업 로그
12. 바로빌 - 사업자상태 조회
```

### Phase 3: 멀티테넌시
```
13. 파트너사 관리
14. 파트너사별 권한 분리
15. 파트너사별 단가 관리
16. 파트너 정산
```

### Phase 4: 자동화
```
17. 바로빌 - 세금계산서 발행
18. 바로빌 - 매입 조회
19. 바로빌 - 계좌조회 (입금확인)
20. 카카오 알림톡
21. 키워드 자동 발굴
22. 순위 변동 알림
```

### Phase 5: 고도화
```
23. 상품 API 연동 (자동 발주)
24. 리포트/통계 고도화
25. 모바일 반응형
26. 성능 최적화
```

---


## 20. 비기능 요구사항

### 20.1 보안

| 항목 | 요구사항 |
|------|----------|
| 인증 | 비밀번호 bcrypt 암호화 |
| 통신 | HTTPS 필수 |
| 세션 | 30분 타임아웃, JWT |
| 접근제어 | 역할 기반 권한 관리 |
| 감사 | 주요 액션 로그 기록 |
| 주입 방지 | SQL Injection, XSS 방지 |

### 20.2 성능

| 항목 | 요구사항 |
|------|----------|
| 매장 수 | 10,000개 이상 처리 |
| 발주 목록 | 2초 이내 로딩 |
| Excel 업로드 | 1,000건 30초 이내 |
| 키워드 체크 | 100개 키워드 5분 이내 |
| 동시 사용자 | 50명 이상 |

### 20.3 운영

| 항목 | 요구사항 |
|------|----------|
| 가용성 | 99% 이상 |
| 백업 | 일일 자동 백업 |
| 모니터링 | 에러 로깅 + 알림 |
| 복구 | RTO 4시간 이내 |

### 20.4 외부 연동 에러 정책

| 서비스 | 재시도 횟수 | 대기시간 | 실패 시 처리 |
|--------|:---------:|---------|-------------|
| Google Sheets | 3회 | 5/15/30초 | 수동 재출력 유도, 실패 로그 저장 |
| 바로빌 API | 3회 | 10/30/60초 | 발행 실패 목록 저장, 재발행 대기열 |
| 키워드 크롤링 | 2회 | 60초 | 해당 키워드 스킵, 다음 스케줄 대기 |
| 카카오 알림톡 | 2회 | 30초 | 이메일 대체 발송, 실패 로그 |

**에러 로깅:**
```
[api_error_logs]
- id (PK)
- service: google_sheets / barobill / crawler / kakao
- endpoint
- request_payload (JSON)
- response_code
- error_message
- retry_count
- resolved_at
- created_at
```

**재시도 큐:**
```
[retry_queue]
- id (PK)
- job_type: sheet_export / tax_invoice / etc
- target_id - 대상 ID
- payload (JSON)
- retry_count
- next_retry_at
- status: pending / processing / completed / failed
- created_at
```

### 20.5 동시성 제어

| 상황 | 정책 | 구현 방식 |
|------|------|----------|
| 같은 발주 동시 수정 | Optimistic Lock | version 컬럼 + 충돌 시 재시도 |
| 같은 매장 동시 작업로그 | 허용 | 각자 독립 저장 |
| 정산 처리 중 | Pessimistic Lock | SELECT FOR UPDATE |
| 시트 동기화 중 | Job Lock | 동일 시트 중복 실행 방지 |

**Optimistic Lock 구현:**
```
[purchase_orders]
- version (int, default 1)

UPDATE purchase_orders
SET ..., version = version + 1
WHERE id = ? AND version = ?

-- 영향 행 0이면 충돌 발생 → 재조회 후 재시도
```

**Job Lock 구현:**
```
[job_locks]
- id (PK)
- job_type: receipt_sync / keyword_check / etc
- resource_id - 시트 ID, 매장 ID 등
- locked_by - 서버 인스턴스 ID
- locked_at
- expires_at
```

---



