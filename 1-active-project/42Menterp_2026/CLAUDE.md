# 42ment ERP 프로젝트 설정

## 필독 문서

작업 시작 전 반드시 읽기:
1. `docs/progress/CONTEXT_SUMMARY.md` - 프로젝트 컨텍스트
2. `docs/progress/CHANGELOG.md` - 최근 변경 이력
3. `docs/progress/agents/ASSIGNMENT.md` - 멀티 에이전트 작업 할당
4. `docs/progress/DATA_PATTERNS.md` - **데이터 처리 공통 패턴 (필수)**

## 작업 규칙

- **언어**: 한국어
- **파일 경로**: 항상 전체 경로(full path) 사용
- **문서 저장**: 진행사항은 `docs/progress/`에 저장
- **임시 파일**: `.tmp/` 폴더에 생성, 작업 완료 후 삭제

## 메인 프로젝트

- `app/` - Next.js 프로젝트 (개발 대상)
- `docs/PRD_v3.0/` - 기준 PRD

---

## 🔴 프로젝트 전체 필수 지침

### 1. 엑셀 업로드/다운로드 (모든 목록형 데이터)

**모든 목록형 데이터**는 다음 기능을 **필수로** 구현해야 합니다:

| 기능 | 설명 | 필수 |
|------|------|------|
| 엑셀 양식 다운로드 | 업로드용 빈 양식 제공 (필수/선택 필드 구분) | ✅ |
| 엑셀 업로드 | 양식에 맞춰 일괄 등록 | ✅ |
| 엑셀 내보내기 | 현재 데이터를 동일 양식으로 다운로드 | ✅ |
| 양식 호환성 | 업로드/다운로드 양식 동일 (재업로드 가능) | ✅ |

**적용 대상 메뉴:**
- `/customers` - 고객 관리
- `/stores` - 매장 관리
- `/products` - 상품 관리
- `/orders` - 주문 관리 (견적/수주)
- `/purchase-orders` - 발주 관리
- `/settlements` - 정산 관리
- `/accounts` - 계정 관리

### 2. 목록 일괄 처리 기능

**모든 목록 페이지**는 다음 기능을 **필수로** 구현해야 합니다:

| 기능 | 설명 | 필수 |
|------|------|------|
| 체크박스 선택 | 개별/전체/범위(Shift) 선택 | ✅ |
| 일괄 수정 | 선택된 항목 상태/필드 일괄 변경 | ✅ |
| 일괄 삭제 | 선택된 항목 일괄 삭제 (제약조건 체크) | ✅ |
| 일괄 액션 | 선택된 항목 일괄 주문/발주/정산 등 | ✅ |
| 플로팅 툴바 | 선택 시 액션 버튼 표시 | ✅ |

### 3. 공용 컴포넌트 사용

새 목록 페이지 구현 시 **반드시** 공용 컴포넌트 사용:

```
app/src/components/common/
├── data-table/           # 일괄 선택 테이블
├── excel-import/         # 엑셀 업로드 다이얼로그
├── excel-export/         # 엑셀 내보내기
└── bulk-actions/         # 일괄 액션 툴바
```

### 4. API 패턴

모든 목록 API는 다음 엔드포인트를 **필수로** 구현:

```
GET    /api/{resource}              # 목록 조회
POST   /api/{resource}              # 생성
GET    /api/{resource}/[id]         # 상세 조회
PUT    /api/{resource}/[id]         # 수정
DELETE /api/{resource}/[id]         # 삭제
PATCH  /api/{resource}/bulk         # 일괄 수정/삭제 ✅ 필수
POST   /api/{resource}/import       # 엑셀 임포트 ✅ 필수
GET    /api/{resource}/export       # 엑셀 내보내기 ✅ 필수
GET    /api/{resource}/template     # 엑셀 양식 다운로드 ✅ 필수
```

---

**자세한 구현 가이드:** `docs/progress/DATA_PATTERNS.md` 참조
