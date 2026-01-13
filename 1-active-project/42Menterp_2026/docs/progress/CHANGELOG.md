# 변경 이력 (CHANGELOG)

> **형식:** 날짜 역순 (최신이 위)
> **용도:** 모든 에이전트가 다른 에이전트의 변경사항 파악

---

## 2026-01-14

### 메뉴 구조 UX/UI 개선
**담당:** Claude Opus 4.5

**변경 파일:**
- `app/src/components/layout/sidebar.tsx` - 메뉴 15개 → 9개 간소화
- `app/src/app/(dashboard)/orders/page.tsx` - 주문 관리 통합 (신규)
- `app/src/app/(dashboard)/products/page.tsx` - 상품 관리 (신규)
- `app/src/app/(dashboard)/accounts/page.tsx` - 계정 관리 (신규)
- `app/src/app/(dashboard)/settlements/page.tsx` - 세금계산서 탭 추가
- `app/src/app/(dashboard)/stores/[id]/page.tsx` - 키워드/작업로그 탭 추가
- `app/src/app/(dashboard)/purchase-orders/[id]/page.tsx` - 작업명세 탭 추가
- `app/src/app/api/users/route.ts` - 사용자 API (신규)
- `app/next.config.ts` - URL 리다이렉트 설정

**커밋:** `42c0c9e`

---

### 문서 구조 정리
**담당:** Claude Opus 4.5

**변경 사항:**
- `docs/README.md` 생성 (인덱스)
- `docs/progress/CONTEXT_SUMMARY.md` 업데이트
- `docs/archive/` 폴더 생성, 과거 문서 23개 이동
- `marketing-agency-erp/` 폴더 삭제 (구버전)

---

## 2026-01-13

### Expert Review 반영
**담당:** 이전 세션

**추가된 기능:**
- SheetImportLog (Staging Table 패턴)
- StatusHistory (상태 변경 이력)
- CostAdjustment (비용 조정)
- 통합 검색 API (`/api/search`)

---

## 템플릿

```markdown
## YYYY-MM-DD

### 작업 제목
**담당:** 에이전트명

**변경 파일:**
- `경로/파일명` - 변경 내용

**커밋:** `해시` (있으면)

**참고:** 추가 설명
```
