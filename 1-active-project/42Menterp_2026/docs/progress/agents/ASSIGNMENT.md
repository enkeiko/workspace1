# 에이전트 작업 할당표

> **최종 업데이트:** 2026-01-14
> **용도:** 멀티 에이전트 병행 작업 시 충돌 방지

---

## 현재 메뉴 구조 (9개)

| # | 메뉴 | 경로 | 담당 | 상태 |
|---|------|------|------|------|
| 1 | 대시보드 | `/dashboard` | - | 대기 |
| 2 | 고객 관리 | `/customers` | Codex | 진행중 |
| 3 | 매장 관리 | `/stores` | - | 대기 |
| 4 | 상품 관리 | `/products` | - | 대기 |
| 5 | 주문 관리 | `/orders` | - | 대기 |
| 6 | 발주 관리 | `/purchase-orders` | - | 대기 |
| 7 | 정산 관리 | `/settlements` | - | 대기 |
| 8 | 계정 관리 | `/accounts` | - | 대기 |
| 9 | 설정 | `/settings` | - | 대기 |

---

## 작업 할당 규칙

### 1. 파일 소유권
각 에이전트는 할당된 메뉴의 파일만 수정 가능:

```
/dashboard      → app/(dashboard)/dashboard/**
/customers      → app/(dashboard)/customers/**
/stores         → app/(dashboard)/stores/**
/products       → app/(dashboard)/products/**
/orders         → app/(dashboard)/orders/**
/purchase-orders → app/(dashboard)/purchase-orders/**
/settlements    → app/(dashboard)/settlements/**
/accounts       → app/(dashboard)/accounts/**
/settings       → app/(dashboard)/settings/**
```

### 2. 공용 파일 수정
아래 파일은 **CHANGELOG.md에 기록 후** 수정:

- `app/src/components/layout/sidebar.tsx`
- `app/src/components/ui/*`
- `app/src/lib/*`
- `app/prisma/schema.prisma`
- `app/next.config.ts`

### 3. 작업 흐름

```
1. ASSIGNMENT.md에서 자신의 메뉴 확인
2. 상태를 "진행중"으로 변경
3. 자신의 로그 파일 생성 (예: dashboard.md)
4. 작업 수행
5. 완료 후 CHANGELOG.md에 기록
6. 상태를 "완료"로 변경
```

### 4. 충돌 발생 시

- 다른 에이전트가 수정 중인 파일 발견 → 작업 중단
- ASSIGNMENT.md 확인 → 담당 에이전트 확인
- 필요시 해당 에이전트 로그 파일에 메모 남기기

---

## 에이전트 로그 파일

| 메뉴 | 로그 파일 |
|------|----------|
| 대시보드 | `agents/dashboard.md` |
| 고객 관리 | `agents/customers.md` |
| 매장 관리 | `agents/stores.md` |
| 상품 관리 | `agents/products.md` |
| 주문 관리 | `agents/orders.md` |
| 발주 관리 | `agents/purchase-orders.md` |
| 정산 관리 | `agents/settlements.md` |
| 계정 관리 | `agents/accounts.md` |
| 설정 | `agents/settings.md` |

---

## 로그 파일 템플릿

```markdown
# [메뉴명] 작업 로그

> **담당:** 에이전트명
> **상태:** 진행중 / 완료
> **시작일:** YYYY-MM-DD

## 목표
-

## 변경 사항
- [ ] 작업 1
- [ ] 작업 2

## 메모
-

## 다른 에이전트에게
-
```

---

## 필독 문서

작업 시작 전 반드시 읽어야 할 문서:

1. `docs/progress/CONTEXT_SUMMARY.md` - 프로젝트 컨텍스트
2. `docs/progress/CHANGELOG.md` - 최근 변경 이력
3. `docs/progress/agents/ASSIGNMENT.md` - 이 문서
4. `docs/README.md` - 문서 구조

