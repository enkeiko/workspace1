# 42ment ERP 프로젝트 컨텍스트 요약

> **최종 업데이트:** 2026-01-14
> **용도:** 다른 AI 채팅에서 이어서 작업할 때 참고

---

## 0. 작업 규칙 (필독)

### 파일 경로 표기
- **항상 전체 경로(full path)** 사용
- ❌ `CONTEXT_SUMMARY.md`
- ✅ `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\docs\progress\CONTEXT_SUMMARY.md`

### 문서 저장 위치
- **진행사항 문서**: `docs/progress/`
- **기준 PRD**: `docs/PRD_v3.0/`
- **과거 문서**: `docs/archive/`

### 언어
- **한국어** 사용

---

## 1. 프로젝트 개요

**42ment** 광고대행사의 **네이버 플레이스 마케팅 발주 관리 시스템** ERP

### 핵심 비즈니스
- 네이버 플레이스에 등록된 매장(광고주)들의 리뷰/저장/길찾기/유입 마케팅 대행
- 여러 채널(피닉스, 말차, 히든 등)에 발주
- Google Sheets로 발주서 전송

---

## 2. 프로젝트 구조

```
C:\Users\enkei\workspace\1-active-project\42Menterp_2026\
├── app\                    ← 현재 개발 중인 Next.js 프로젝트
│   ├── src\
│   │   ├── app\           # App Router 페이지
│   │   ├── components\    # UI 컴포넌트 (shadcn/ui)
│   │   ├── lib\           # 유틸리티 (auth, prisma, permissions)
│   │   └── types\         # 타입 정의
│   └── prisma\
│       └── schema.prisma  # DB 스키마 (30+ 테이블)
│
└── docs\
    ├── README.md          ← 문서 인덱스
    ├── PRD_v3.0\          ← 최신 PRD (기준 문서)
    ├── progress\          ← 진행사항 문서
    └── archive\           ← 과거 문서
```

---

## 3. 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend/Backend | Next.js 14+ (App Router) |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma |
| Auth | NextAuth.js |
| UI | shadcn/ui + Tailwind CSS |
| 외부 연동 | Google Sheets API, 바로빌(세금계산서), 텔레그램 |

---

## 4. 현재 구현 상태

### Phase 1-3 완료
- [x] Prisma 스키마 정의 (30+ 테이블)
- [x] NextAuth 인증 (5가지 역할)
- [x] 고객사(Tenant), 매장(Store), 상품(Product) CRUD
- [x] 견적(Quotation) → 수주(SalesOrder) → 발주(PurchaseOrder) 전환
- [x] 정산(Settlement) 관리, 세금계산서(TaxInvoice) 바로빌 연동
- [x] Google Sheets 연동
- [x] 대시보드 KPI, 텔레그램 알림

### Phase 4 완료 (2026-01-14) - 메뉴 구조 UX/UI 개선

**사이드바 메뉴 간소화 (15개 → 9개)**

| 변경 전 | 변경 후 |
|---------|---------|
| 채널 관리 | 상품 관리 (이름 변경) |
| 견적 관리 | 주문 관리 (탭: 견적/수주/거래명세서) |
| 수주 관리 | ↑ 통합 |
| 거래명세서 | ↑ 통합 |
| 정산 관리 | 정산 관리 (탭: 정산현황/세금계산서) |
| 세금계산서 | ↑ 통합 |
| 파트너사 | 계정 관리 (탭: 관리자/파트너사) |
| 키워드 순위 | 매장 상세 탭으로 이동 |
| 작업 로그 | 매장 상세 탭으로 이동 |
| 작업 명세 | 발주 상세 탭으로 이동 |

**새로 추가된 페이지/API**

| 경로 | 설명 |
|------|------|
| `/orders` | 주문 관리 통합 페이지 (탭 UI) |
| `/products` | 상품 관리 (기존 채널 관리) |
| `/accounts` | 계정 관리 (관리자 + 파트너사) |
| `/api/users` | 사용자 API (GET 목록, POST 생성) |

**탭 추가된 페이지**

| 페이지 | 추가된 탭 |
|--------|----------|
| `/settlements` | 세금계산서 탭 |
| `/stores/[id]` | 키워드 순위, 작업 로그 탭 |
| `/purchase-orders/[id]` | 작업 명세 탭 |

---

## 5. 핵심 데이터 모델

```
User          - 사용자 (SUPER_ADMIN, PARTNER_ADMIN, ADMIN, OPERATOR, VIEWER)
Tenant        - 고객사
Customer      - 고객 (Tenant 소속)
Store         - 매장 (mid, placeUrl, businessNo 등)
Channel       - 발주 채널 (피닉스, 말차, 히든 등)
Product       - 상품 (키워드, 리뷰, 저장 등)

Quotation     - 견적서
SalesOrder    - 수주 (고객 주문)
PurchaseOrder - 발주 (채널 발주)
WorkStatement - 작업 명세
Settlement    - 정산
TaxInvoice    - 세금계산서

SheetImportLog - 시트 임포트 스테이징
StatusHistory  - 상태 변경 이력
```

---

## 6. 상태 전이 규칙

```
Quotation:     DRAFT → SENT → ACCEPTED/REJECTED
SalesOrder:    DRAFT → CONFIRMED → IN_PROGRESS → COMPLETED/CANCELLED
PurchaseOrder: DRAFT → PENDING → CONFIRMED → IN_PROGRESS → COMPLETED/CANCELLED
WorkStatement: DRAFT → CONFIRMED → LOCKED
Settlement:    PENDING → CONFIRMED → PAID
TaxInvoice:    DRAFT → ISSUED → SENT → FAILED
```

---

## 7. 주요 문서 위치

| 문서 | 경로 |
|------|------|
| 문서 인덱스 | `docs/README.md` |
| PRD v3.0 | `docs/PRD_v3.0/` |
| 컨텍스트 요약 | `docs/progress/CONTEXT_SUMMARY.md` (이 문서) |
| 과거 문서 | `docs/archive/` |

---

## 8. 다음 단계 (Phase 5 예정)

- [ ] 감사 로그 대시보드
- [ ] 보고서 PDF 내보내기
- [ ] Google Sheets 양방향 동기화
- [ ] 이메일 알림 (세금계산서 발행 시)

---

## 9. 중요 참고사항

- **PRD v3.0**이 최신 기획서 (docs/PRD_v3.0/)
- **과거 문서**는 docs/archive/에 보관 (참고용)
- **한국어** 사용
- **파일 경로는 항상 전체 경로로 표기**

---

**이 문서를 새 채팅에서 먼저 읽고 작업을 이어가세요.**
