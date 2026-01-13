# 42ment ERP 프로젝트 컨텍스트 요약

> **최종 업데이트:** 2026-01-13
> **용도:** 다른 AI 채팅에서 이어서 작업할 때 참고

---

## 0. 작업 규칙 (필독)

### 파일 경로 표기
- **항상 전체 경로(full path)** 사용
- ❌ `FIX_REQUEST_001.md`
- ✅ `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\docs\progress\FIX_REQUEST_001.md`

### 문서 저장 위치
- **진행사항 문서** (QA 보고서, 수정 지시서 등): `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\docs\progress\`
- **소스코드 폴더에 문서 섞지 않기**

### 워크플로우
```
Claude Code (구현) → QA팀장 (검수) → FIX_REQUEST_00X.md 작성 → Claude Code (수정)
```

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
├── app\                    ← 🔴 현재 개발 중인 Next.js 프로젝트
│   ├── src\
│   │   ├── app\           # App Router 페이지
│   │   ├── components\    # UI 컴포넌트 (shadcn/ui)
│   │   ├── lib\           # 유틸리티 (auth, prisma, status-history)
│   │   └── types\         # 타입 정의
│   └── prisma\
│       └── schema.prisma  # DB 스키마 (28+ 테이블)
│
├── marketing-agency-erp\   ← 기존 프로젝트 (참고용)
├── 42ment-erp\             ← Python 버전 (참고용)
├── docs\
│   ├── progress\          ← 🔴 진행사항 문서
│   │   ├── QA_REPORT_001.md
│   │   ├── FIX_REQUEST_001.md
│   │   └── CONTEXT_SUMMARY.md
│   └── (기타 PRD 문서들)
└── PRD_42ment_ERP_v3.0.md  ← 🔴 최신 PRD (1,420줄)
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
| 외부 연동 | Google Sheets API, 바로빌(세금계산서) |

---

## 4. 현재 구현 상태 (Phase 1 완료)

### 완료된 것
- [x] Prisma 스키마 정의 (28+ 테이블)
- [x] 기본 페이지 구조 (dashboard, stores, orders, channels 등)
- [x] shadcn/ui 컴포넌트 설정
- [x] NextAuth 인증 (middleware 포함)
- [x] 고객사(Tenant), 매장(Store), 채널(Channel) CRUD
- [x] 견적(Quotation) → 수주(SalesOrder) → 발주(PurchaseOrder) 전환
- [x] 정산(Settlement) 관리
- [x] Google Sheets 연동

### Expert Review 반영 (2026-01-13)
- [x] SheetImportLog (Staging Table 패턴) - Google Sheet → DB 데이터 검증
- [x] StatusHistory - 상태 변경 이력 추적
- [x] CostAdjustment - Unbillable 비용 처리
- [x] Evidence-Based Billing (proofUrl 필드)
- [x] Manual Override 필드

### 새로 추가된 API
| API | 설명 |
|-----|------|
| `POST /api/sheet-imports` | 시트 데이터 스테이징 |
| `POST /api/sheet-imports/[id]/validate` | 데이터 검증 |
| `POST /api/sheet-imports/[id]/process` | Core DB 반영 |
| `POST /api/sheet-imports/batch-process` | 일괄 처리 |
| `GET /api/status-history` | 상태 이력 조회 |
| `GET /api/status-history/[entityType]/[entityId]` | 엔티티별 타임라인 |
| `GET /api/search?q=검색어` | 통합 검색 |

---

## 5. 핵심 데이터 모델

```
User          - 사용자 (SUPER_ADMIN, ADMIN, OPERATOR, VIEWER)
Tenant        - 고객사
Customer      - 고객 (Tenant 소속)
Store         - 매장 (mid, placeUrl, businessNo 등)
Channel       - 발주 채널 (피닉스, 말차, 히든 등)
ChannelSheet  - 채널별 Google Sheets 설정
Product       - 상품 (키워드, 리뷰, 저장 등)

Quotation     - 견적서
SalesOrder    - 수주 (고객 주문)
PurchaseOrder - 발주 (채널 발주)
WorkStatement - 작업 명세
Settlement    - 정산
TaxInvoice    - 세금계산서

SheetImportLog - 시트 임포트 스테이징 (Expert Review)
StatusHistory  - 상태 변경 이력 (Expert Review)
CostAdjustment - 비용 조정 (Expert Review)
```

---

## 6. 상태 전이 규칙 (PRD 2.5)

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
| PRD v3.0 (최신) | `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\PRD_42ment_ERP_v3.0.md` |
| PRD v2.0 | `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\docs\PRD_42Ment_ERP_MVP_v2.md` |
| Expert Review | `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\docs\PRD_v3.0\expert_review.md` |
| QA 보고서 | `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\docs\progress\QA_REPORT_001.md` |
| 수정 지시서 | `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\docs\progress\FIX_REQUEST_001.md` |
| 컨텍스트 요약 | `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\docs\progress\CONTEXT_SUMMARY.md` |

---

## 8. 다음 단계

### Phase 2 (예정)
- [ ] 대시보드 KPI 위젯 구현
- [ ] 매장 관리 UI 개선 (일괄 등록, 검색)
- [ ] 발주 관리 UI (상태 필터, 일괄 처리)
- [ ] 정산 보고서 생성
- [ ] 텔레그램 알림 연동

---

## 9. 중요 참고사항

- **Expert Review 패턴 적용 완료** - SheetImportLog(Staging), StatusHistory, CostAdjustment
- **기존 프로젝트** `marketing-agency-erp`는 별도 프로젝트임 (혼동 주의)
- **PRD v3.0**이 최신 기획서 (v2.0은 참고용)
- **QA 검수 후 수정 지시** 방식으로 진행
- **한국어** 사용
- **파일 경로는 항상 전체 경로로 표기**

---

**이 문서를 새 채팅에서 먼저 읽고 작업을 이어가세요.**

