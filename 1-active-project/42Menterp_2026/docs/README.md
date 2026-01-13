# 42ment ERP 문서

> **최종 업데이트:** 2026-01-14

## 개요

네이버 플레이스 마케팅 발주 관리 시스템 ERP

## 문서 구조

```
docs/
├── README.md                    # 이 파일 (인덱스)
├── PRD_v3.0/                    # 최신 PRD (기준 문서)
├── progress/                    # 진행 기록
│   ├── CONTEXT_SUMMARY.md       # 프로젝트 컨텍스트
│   ├── CHANGELOG.md             # 변경 이력
│   └── agents/                  # 멀티 에이전트 작업
│       └── ASSIGNMENT.md        # 작업 할당표
└── archive/                     # 과거 문서 (참고용)
```

## 기준 문서 (PRD v3.0)

| 문서 | 내용 |
|------|------|
| [01_Business_Architecture](PRD_v3.0/PRD_42ment_ERP_v3.0_01_Business_Architecture.md) | 비즈니스 개요, 시스템 아키텍처 |
| [02_Users_Stores](PRD_v3.0/PRD_42ment_ERP_v3.0_02_Users_Stores.md) | 사용자 역할, 매장 관리 |
| [03_Product_Quotation](PRD_v3.0/PRD_42ment_ERP_v3.0_03_Product_Quotation.md) | 상품, 견적 관리 |
| [04_Order_Sheets](PRD_v3.0/PRD_42ment_ERP_v3.0_04_Order_Sheets.md) | 주문, 발주, Google Sheets 연동 |
| [05_Settlement_Billing](PRD_v3.0/PRD_42ment_ERP_v3.0_05_Settlement_Billing.md) | 정산, 세금계산서 |
| [06_Partners](PRD_v3.0/PRD_42ment_ERP_v3.0_06_Partners.md) | 파트너사 관리 |
| [07_Work_Tracking](PRD_v3.0/PRD_42ment_ERP_v3.0_07_Work_Tracking.md) | 작업 추적, 키워드 순위 |
| [08_Notifications_Dashboard](PRD_v3.0/PRD_42ment_ERP_v3.0_08_Notifications_Dashboard.md) | 알림, 대시보드 |
| [09_System_ERD_Roadmap_NFR](PRD_v3.0/PRD_42ment_ERP_v3.0_09_System_ERD_Roadmap_NFR.md) | ERD, 로드맵, 비기능 요구사항 |
| [10_Appendix](PRD_v3.0/PRD_42ment_ERP_v3.0_10_Appendix.md) | 부록 |
| [expert_review](PRD_v3.0/expert_review.md) | Expert Review 반영사항 |

## 현재 구현 상태

### 완료된 기능 (Phase 1-3)

- **인증**: NextAuth.js (5가지 역할: SUPER_ADMIN, ADMIN, PARTNER_ADMIN, OPERATOR, VIEWER)
- **고객/매장 관리**: CRUD, Excel 일괄 등록
- **상품 관리**: 리뷰, 저장, 길찾기, 트래픽
- **주문 흐름**: 견적 → 수주 → 발주 전환
- **정산**: 매출/비용 정산, 세금계산서 (바로빌 연동)
- **외부 연동**: Google Sheets API, 바로빌 API, 텔레그램 알림

### 최근 변경사항 (2026-01-14)

**메뉴 구조 UX/UI 개선 (15개 → 9개)**

| 기존 메뉴 | 변경 |
|-----------|------|
| 채널 관리 | → 상품 관리 |
| 견적/수주/거래명세서 | → 주문 관리 (탭 통합) |
| 정산/세금계산서 | → 정산 관리 (탭 통합) |
| 파트너사 + 사용자 | → 계정 관리 (탭 통합) |
| 키워드 순위/작업 로그 | → 매장 상세 (탭 이동) |
| 작업 명세 | → 발주 상세 (탭 이동) |

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend/Backend | Next.js 14+ (App Router) |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma |
| Auth | NextAuth.js |
| UI | shadcn/ui + Tailwind CSS |
| 외부 연동 | Google Sheets API, 바로빌, 텔레그램 |

## 프로젝트 경로

```
C:\Users\enkei\workspace\1-active-project\42Menterp_2026\
├── app/                    # Next.js 프로젝트
│   ├── src/
│   │   ├── app/           # App Router 페이지
│   │   ├── components/    # UI 컴포넌트
│   │   └── lib/           # 유틸리티
│   └── prisma/
│       └── schema.prisma  # DB 스키마
└── docs/                   # 이 문서들
```

## 작업 규칙

1. **파일 경로**: 항상 전체 경로(full path) 사용
2. **문서 저장**: 진행사항은 `docs/progress/`에 저장
3. **언어**: 한국어 사용
4. **워크플로우**: Claude Code (구현) → QA (검수) → FIX_REQUEST → 수정

## 멀티 에이전트 병행 작업

여러 AI 에이전트가 동시에 작업할 때:

### 필독 문서 (순서대로)
1. `progress/CONTEXT_SUMMARY.md` - 프로젝트 컨텍스트
2. `progress/CHANGELOG.md` - 최근 변경 이력
3. `progress/agents/ASSIGNMENT.md` - 작업 할당표

### 작업 흐름
```
1. ASSIGNMENT.md에서 담당 메뉴 확인/등록
2. 자신의 로그 파일 생성 (예: agents/dashboard.md)
3. 할당된 폴더 내에서만 작업
4. 공용 파일 수정 시 CHANGELOG.md에 기록
5. 완료 후 CHANGELOG.md 업데이트
```

### 충돌 방지
- 각 에이전트는 할당된 메뉴 폴더만 수정
- 공용 파일(sidebar.tsx, schema.prisma 등) 수정 전 CHANGELOG 확인
- 다른 에이전트 작업 중인 파일 발견 시 작업 중단

## 참고

- 과거 문서들은 `archive/` 폴더에 보관
- PRD v3.0이 현재 기준 문서
- 컨텍스트 요약은 `progress/CONTEXT_SUMMARY.md` 참조
