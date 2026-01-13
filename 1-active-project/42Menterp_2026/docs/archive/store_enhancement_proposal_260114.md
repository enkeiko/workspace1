# 매장 관리 고도화 제안서 (Store Management Enhancement Proposal)

**작성일:** 2026-01-14
**작성자:** Antigravity Agent

---

## 1. 현황 분석 (Current Status)

### 1.1 기능 현황
- **목록 조회:** 매장명, MID, 주소 등 기본 정보 조회 및 상태 필터링 기능 제공.
- **상세 조회:** 기본 정보, 키워드 순위, 작업 로그 등 3개 탭으로 구성.
- **데이터 관리:** 매장 등록/수정/삭제, 엑셀 일괄 업로드 기능 지원.

### 1.2 주요 문제점
- **UX/UI:**
    - 목록 화면에서 주요 정보(연락처, 담당자 등) 확인이 어려움.
    - 상세 페이지의 '수정' 모드가 전체 폼으로 전환되어, 부분 수정이 번거로움.
    - 탭 전환 시 시각적 피드백이 부족하고, 데이터 로딩 중 화면 깜빡임 발생.
    - 긴 입력 폼(매장 등록)이 단일 페이지로 구성되어 입력 피로도가 높음.
- **Technical (기술적 부채):**
    - `StoreDetailPage`(`[id]/page.tsx`) 파일이 1,100라인 이상으로 비대하여 유지보수가 어려움.
    - 모든 데이터(매장정보, 순위, 로그, 고객사목록)를 Client Side에서 Fetching (`useEffect`)하여 초기 로딩 속도 저하.
    - 상태(State) 관리가 복잡하게 얽혀 있어 버그 발생 가능성이 높음.

---

## 2. 고도화 제안 (Enhancement Proposal)

### 2.1 UX/UI 개선

#### A. 매장 목록 (List View)
- **정보 계층화:** 주요 정보(매장명, 상태)와 보조 정보(MID, 주소)를 시각적으로 구분하여 가독성 강화.
- **퀵 액션(Quick Actions):** 목록에서 바로 '상태 변경'이나 '상세 페이지 이동'이 가능한 호버 액션 추가.
- **요약 카드(Summary Cards):** 목록 상단에 전체 매장 수, 활성 매장 수, 금일 이슈 등을 보여주는 대시보드 요약 추가.

#### B. 매장 상세 (Detail View)
- **헤더 재구성:** 스크롤 시에도 매장명과 주요 상태값, 저장 버튼이 상단에 고정되도록 개선 (Sticky Header).
- **탭 구조 분리:** 각 탭(기본정보, 키워드, 로그)을 독립된 섹션으로 명확히 구분하고, Lazy Loading 적용.
- **인라인 수정 (Inline Edit):** 전체 수정 모드 대신, 각 필드 클릭 시 바로 수정 가능한 인라인 에디팅 도입 검토.

#### C. 입력 폼 (Forms)
- **단계별 입력 (Wizard UI):** 매장 등록 시 `기본 정보 -> 담당자 정보 -> 부가 정보` 순으로 입력 단계를 분리.
- **유효성 검사 강화:** 실시간 유효성 검사 및 에러 메시지 직관적 표시.

### 2.2 기술 아키텍처 개선 (Technical Architecture)

#### A. 컴포넌트 분리 (Component Splitting)
거대한 `StoreDetailPage`를 기능 단위로 분리:
- `app/(dashboard)/stores/[id]/page.tsx` (Server Component: 데이터 Fetching 담당)
- `components/stores/store-detail-header.tsx`
- `components/stores/store-basic-info.tsx`
- `components/stores/keyword-ranking-list.tsx`
- `components/stores/work-log-history.tsx`

#### B. Server Components & Suspense 도입
- 초기 데이터(매장 정보)는 서버 컴포넌트에서 Fetching하여 **SEO** 및 **초기 로딩 성능** 개선.
- 무거운 데이터(작업 로그, 키워드 순위)는 `Suspense`를 활용하여 스트리밍 방식으로 로딩 처리.

#### C. 상태 관리 최적화
- **React Hook Form + Zod:** 복잡한 폼 상태 관리 및 유효성 검사 로직 표준화.
- **React Query (TanStack Query):** 클라이언트 사이드 데이터 캐싱 및 동기화 최적화 (필요 시 도입).

---

## 3. 실행 로드맵 (Roadmap)

### Phase 1: 구조 개선 (Refactoring)
1. `StoreDetailPage` 컴포넌트 분리 (Header, Tabs, Info, Logs).
2. Server Component 전환 (초기 데이터 Fetching 로직 이동).

### Phase 2: UX 고도화 (UX Polish)
1. 매장 목록 대시보드(요약 카드) 추가.
2. 상세 페이지 UI 개선 (Sticky Header, Tab 디자인).
3. 폼 입력 UX 개선 (Wizard 방식 또는 섹션 구분 강화).

### Phase 3: 기능 확장 (New Features)
1. 매장별 통계 대시보드 심화 (키워드 추이 그래프 등).
2. 연동 API 확장 (외부 지도 서비스 연동 등).

---

## 4. 기대 효과
- **사용성:** 정보 접근성 향상 및 업무 처리 속도 증가.
- **유지보수:** 코드 복잡도 60% 이상 감소 예상, 기능 수정/확장 용이성 확보.
- **성능:** 초기 로딩 시간(LCP) 40% 이상 개선 예상.
