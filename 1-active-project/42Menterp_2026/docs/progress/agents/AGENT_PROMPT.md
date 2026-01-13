# 42ment ERP 에이전트 지침 프롬프트

> 다른 AI 에이전트에게 복사해서 전달하세요.

---

## 프롬프트 (복사용)

```
# 42ment ERP 프로젝트 작업 지침

## 프로젝트 정보
- **경로**: C:\Users\enkei\workspace\1-active-project\42Menterp_2026
- **유형**: 네이버 플레이스 마케팅 발주 관리 시스템 ERP
- **스택**: Next.js 14+ (App Router), PostgreSQL, Prisma, NextAuth, shadcn/ui

## 작업 시작 전 필수 읽기 (순서대로)

1. `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\docs\progress\CONTEXT_SUMMARY.md`
   → 프로젝트 전체 컨텍스트, 현재 구현 상태

2. `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\docs\progress\CHANGELOG.md`
   → 최근 변경 이력, 다른 에이전트 작업 내역

3. `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\docs\progress\agents\ASSIGNMENT.md`
   → 작업 할당표, 담당 메뉴 확인/등록

4. `C:\Users\enkei\workspace\1-active-project\42Menterp_2026\docs\PRD_v3.0\00_INDEX.md`
   → PRD 인덱스 (필요시 상세 PRD 참조)

## 작업 규칙

### 기본 규칙
- **언어 (Language Strategy)**: **사용자 대면 출력은 무조건 한국어**
  - IDE, CLI의 모든 디스크립션, 진행 보고, 상태 요약은 반드시 **한국어**로 작성합니다.
  - 에이전트 간 소통용 프롬프트나 기술 문서는 **영어**로 작성 가능하나, 반드시 핵심 내용을 담은 **한국어 요약 주석**을 포함해야 합니다.
- **파일 경로**: 항상 전체 경로(full path) 사용
- **임시 파일**: `.tmp/` 폴더에 생성, 작업 완료 후 삭제

### 멀티 에이전트 협업 규칙
1. ASSIGNMENT.md에서 담당 메뉴 확인
2. 자신의 로그 파일 생성 (예: `agents/dashboard.md`)
3. **할당된 폴더 내에서만 작업** (충돌 방지)
4. 공용 파일 수정 시 CHANGELOG.md에 먼저 기록
5. 작업 완료 후 CHANGELOG.md 업데이트

### 파일 소유권 (메뉴별)
- /dashboard → app/src/app/(dashboard)/dashboard/**
- /customers → app/src/app/(dashboard)/customers/**
- /stores → app/src/app/(dashboard)/stores/**
- /products → app/src/app/(dashboard)/products/**
- /orders → app/src/app/(dashboard)/orders/**
- /purchase-orders → app/src/app/(dashboard)/purchase-orders/**
- /settlements → app/src/app/(dashboard)/settlements/**
- /accounts → app/src/app/(dashboard)/accounts/**
- /settings → app/src/app/(dashboard)/settings/**

### 공용 파일 (수정 전 CHANGELOG 기록 필수)
- app/src/components/layout/sidebar.tsx
- app/src/components/ui/*
- app/src/lib/*
- app/prisma/schema.prisma
- app/next.config.ts

## 작업 흐름

1. 필수 문서 읽기 (위 4개)
2. ASSIGNMENT.md에서 담당 메뉴 등록 (상태: "진행중")
3. 자신의 로그 파일 생성
4. 작업 수행
5. CHANGELOG.md에 변경 내역 기록
6. ASSIGNMENT.md 상태 업데이트 (상태: "완료")

## 현재 메뉴 구조 (9개)

| 메뉴 | 경로 | 설명 |
|------|------|------|
| 대시보드 | /dashboard | KPI, 알림, 차트 |
| 고객 관리 | /customers | 광고주 CRUD |
| 매장 관리 | /stores | 매장 CRUD, 키워드/작업로그 탭 |
| 상품 관리 | /products | 리뷰/저장/길찾기/트래픽 |
| 주문 관리 | /orders | 견적/수주/거래명세서 탭 |
| 발주 관리 | /purchase-orders | 채널별 발주, 작업명세 탭 |
| 정산 관리 | /settlements | 정산현황/세금계산서 탭 |
| 계정 관리 | /accounts | 관리자/파트너사 탭 |
| 설정 | /settings | 시스템 설정, 연동 설정 |

## 담당 메뉴: [여기에 메뉴명 입력]

위 문서들을 읽고, [메뉴명] 메뉴의 [작업내용]을 진행해주세요.
```

---

## 사용 예시

### 대시보드 담당 에이전트에게

```
# 42ment ERP 프로젝트 작업 지침

[위 프롬프트 전체 복사]

## 담당 메뉴: 대시보드

위 문서들을 읽고, 대시보드 메뉴의 KPI 위젯 디자인 개선을 진행해주세요.
```

### 정산 관리 담당 에이전트에게

```
# 42ment ERP 프로젝트 작업 지침

[위 프롬프트 전체 복사]

## 담당 메뉴: 정산 관리

위 문서들을 읽고, 정산 관리 메뉴의 Excel 내보내기 기능 개선을 진행해주세요.
```

---

## 주의사항

- 다른 에이전트 작업 중인 파일 발견 시 → 작업 중단, ASSIGNMENT.md 확인
- 스키마 변경 필요 시 → CHANGELOG에 기록 후 진행, 다른 에이전트에게 알림
- 충돌 발생 시 → 해당 에이전트 로그 파일에 메모 남기기
