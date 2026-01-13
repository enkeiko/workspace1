# 변경 이력 (CHANGELOG)

> **형식:** 날짜 역순 (최신이 위)
> **용도:** 모든 에이전트가 다른 에이전트의 변경사항 파악

---

## 2026-01-14

### 용어 통일: 채널/상품 개념 정리
**담당:** Claude Opus 4.5

**수정 문서 (6개):**
- `IMPLEMENTATION_ROADMAP.md` v1.0 → v1.1
- `PRODUCTS_PURCHASEORDERS_ENHANCEMENT.md` v1.0 → v1.1
- `DATA_ANALYSIS_INTEGRATION.md`
- `CONTEXT_SUMMARY.md`
- `CHANGELOG.md`

**용어 정의:**
| 용어 | 올바른 정의 | 예시 |
|------|------------|------|
| **채널(Channel)** | 마케팅이 이뤄지는 플랫폼 | 네이버, 인스타그램, 틱톡 |
| **상품(Product)** | 마케팅 서비스/공급업체 | 피닉스, 히든, 호올스 등 20개 |

**수정 내용:**
- "채널-상품 마스터" → "상품 마스터"
- "20개 채널" → "20개 상품(마케팅 서비스)"
- "채널별 수량" → "상품별 수량"
- 각 문서 상단에 용어 정의 섹션 추가

---

### 통합 구현 로드맵 작성 및 문서 정리
**담당:** Claude Opus 4.5

**작성 파일:**
- `docs/progress/IMPLEMENTATION_ROADMAP.md` - 통합 구현 로드맵 (신규)
  - 7개 분석/기획 문서 통합
  - 5단계 구현 계획 (총 4.5주)
  - 35+ 태스크 우선순위 정리

**문서 정리:**
- `docs/Temp/` 폴더 삭제 (문서 정리 완료)
- 아래 문서들 `docs/archive/`로 이동:
  - `batch_order_system_proposal.md` (IMPLEMENTATION_ROADMAP에 통합)
  - `store_enhancement_proposal_260114.md`
  - `260114_fix.md`

**통합된 핵심 내용:**
- 주간 발주 Smart Grid 시스템 (기간+수량 관리)
- 20개 상품(마케팅 서비스) 마스터 데이터
- Manual Override 보호 로직
- 양방향 동기화 (그리드 ↔ SO/PO)

---

### 운영 데이터 종합 분석 및 통합 제안서 작성
**담당:** Claude Opus 4.5

**분석 데이터:**
- `Data/거래처목록(1~94).xls` - 거래처 마스터 94건
- `Data/세금계산서등록양식(일반).xls` - 홈택스 양식 (암호 보호)
- `Data/251226_12월 4주_접수시트.xlsx` - 발주 접수 시트

**작성/수정 파일:**
- `docs/progress/DATA_ANALYSIS_INTEGRATION.md` - 운영 데이터 분석 및 통합 제안 (신규)
- `docs/progress/TAX_INVOICE_AUTOMATION.md` - 세금계산서 자동화 문서 (이동 및 보완)
  - 원본: `docs/Temp/tax_invoice_automation_spec.md`
  - v1.0 → v1.1 업데이트 (데이터 품질 분석, API 스펙 상세화)

**거래처목록 분석 결과:**
- 총 94개 거래처, 사업자번호 100% 보유
- 이메일 81%, 주소 21%, 연락처 0%
- 세금계산서 발행 가능: 약 76개 (81%)

**`tax_invoice_automation_spec.md` 평가:**
- 문제 정의: ✅ 적절
- 데이터 분석: ⚠️ 보완됨 (실제 데이터 품질 반영)
- API 설계: ⚠️ 보완됨 (상세 스펙 추가)
- 검증 로직: ✅ 신규 추가

---

### 상품관리 및 발주관리 고도화 문서 작성
**담당:** Claude Opus 4.5

**분석 데이터:** `Data/251226_12월 4주_접수시트.xlsx`

**작성 파일:**
- `docs/progress/PRODUCTS_PURCHASEORDERS_ENHANCEMENT.md` - 상품/발주관리 고도화 문서 (신규)

**분석 결과:**
- 실제 접수시트 구조 분석 (38개 주간 시트, 20개 상품)
- 12월 4주차 발주 통계: 77건, 65개 매장
- 상품별 발주 현황: 트래픽 6,000개, 길찾기 1,900개, 리뷰 133개

**주요 개선 사항:**
1. **상품관리**: 상품 마스터 데이터 정의 (20개), 유형별 그룹화 UI, 단가 일괄 수정
2. **발주관리**: 간편 발주 등록 (상품별 수량 입력), 주간 일괄 업로드 (접수시트 호환), 주간 그룹화 뷰

**신규 API:**
- `POST /api/purchase-orders/quick` - 간편 발주
- `POST /api/purchase-orders/import` - 주간 일괄 업로드 (접수시트 양식)
- `PUT /api/products/bulk-price` - 단가 일괄 수정

---

### 고객-매장 통합 제안서 병합
**담당:** Claude Opus 4.5

**변경 파일:**
- `docs/progress/CUSTOMERS_ENHANCEMENT.md` - v1.1 → v1.2 업데이트

**통합된 내용 (from `store_customer_integration_proposal_260114.md`):**
- 고객-매장 개념 정의 (Bill-To Party vs Service Location)
- 매장 등록 시 "고객 정보 사용" 체크박스 기능
- Store 조회 시 Fallback 로직 (`store.businessNo || customer.businessNo`)
- 목록 페이지 관계 시각화 (매장 수, 고객사 바로가기)

**원본 문서 이동:**
- `docs/Temp/store_customer_integration_proposal_260114.md` → `docs/archive/`

---

### 🔴 프로젝트 전체 지침 수립: 엑셀 업로드/다운로드 및 일괄 처리
**담당:** Claude Opus 4.5

**변경/작성 파일:**
- `CLAUDE.md` - 프로젝트 전체 필수 지침 추가
- `docs/progress/DATA_PATTERNS.md` - 데이터 처리 공통 패턴 가이드 (신규)
- `docs/progress/COMMON_COMPONENTS.md` - 공용 컴포넌트 설계 문서 (신규)

**핵심 지침 (모든 에이전트 필수 준수):**

1. **엑셀 업로드/다운로드** - 모든 목록형 데이터에 필수 적용
   - 양식 다운로드 (필수/선택 필드 구분)
   - 엑셀 업로드 (일괄 등록, 검증 포함)
   - 엑셀 내보내기 (동일 양식으로 다운로드)
   - 양식 호환성 (다운로드 → 수정 → 재업로드 가능)

2. **목록 일괄 처리** - 모든 목록 페이지에 필수 적용
   - 체크박스 선택 (개별/전체/범위)
   - 일괄 수정 (상태 변경 등)
   - 일괄 삭제 (제약조건 체크)
   - 일괄 액션 (주문/발주/정산 등)

3. **필수 API 패턴:**
   - `PATCH /api/{resource}/bulk` - 일괄 수정/삭제
   - `POST /api/{resource}/import` - 엑셀 업로드
   - `GET /api/{resource}/export` - 엑셀 내보내기
   - `GET /api/{resource}/template` - 양식 다운로드

4. **적용 대상:** 고객, 매장, 상품, 주문, 발주, 정산, 계정 (7개 메뉴)

**참고:** 상세 구현 가이드는 `DATA_PATTERNS.md`, `COMMON_COMPONENTS.md` 참조

---

### 고객관리 고도화 개발 문서 작성
**담당:** Claude Opus 4.5

**작성 파일:**
- `docs/progress/CUSTOMERS_ENHANCEMENT.md` - 고객관리 고도화 개발 문서 (신규)

**포함 내용:**
- 엑셀 파일 업로드 (일괄 등록) 설계
- 목록 일괄 선택/수정/삭제 기능 설계
- 고객-매장 정보 동기화 규칙
- 세금계산서 연동 필드 검증
- 고객 상세 페이지 UX 개선 (Master-Detail 패턴)
- API 설계 및 파일 구조
- 구현 우선순위 및 작업 단위

---

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

### Hydration Error 수정
**담당:** Antigravity Agent

**변경 파일:**
- `app/src/app/layout.tsx` - `suppressHydrationWarning` 속성 추가 (폰트/확장프로그램 충돌 방지)

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
