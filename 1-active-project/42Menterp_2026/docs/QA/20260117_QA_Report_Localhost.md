# QA 테스트 보고서: 로컬호스트 ERP (현황 점검)
> **날짜:** 2026-01-17
> **테스터:** Antigravity Browser Agent
> **대상:** http://localhost:3001
> **작성 모드:** 자동화 탐색 및 검증 (Autonomous Exploration)

## 1. 요약 (Summary)
로컬 개발 서버(3001 포트)를 대상으로 `CLAUDE.md`에 명시된 **필수 구현 기능(Excel 기능, 일괄 처리, 생성 기능)**의 탑재 여부를 전수 조사했습니다.
대부분의 목록 페이지에서 **필수 규격(Excel, Bulk Action) 미준수** 사항이 다수 발견되었으며, **상품 추가 기능의 404 에러**가 확인되었습니다.

### 🚨 주요 발견 사항 (Critical Findings)
*   **상품 관리 (Products)**: `[+ 상품 추가]` 버튼 클릭 시 **404 Not Found** 에러 발생.
*   **규격 미준수 (Non-Compliance)**: `CLAUDE.md`에 명시된 "모든 목록형 데이터의 엑셀 업로드/다운로드 및 일괄 처리" 규격이 `/customers`를 제외한 대부분의 페이지에서 누락됨.

---

## 2. 필수 기능 이행 현황 (Compliance Matrix)
`CLAUDE.md`의 **"프로젝트 전체 필수 지침"**에 따른 구현 여부 점검표입니다.

| 페이지 (Page) | 엑셀 양식 다운로드 | 엑셀 업로드 | 엑셀 내보내기 | 일괄 처리(Bulk) | 신규 등록(New) | 비고 |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **고객 (Customers)** | ✅ YES | ✅ YES | ❓ (확인필요) | ✅ YES | ✅ YES | 가장 양호함 |
| **매장 (Stores)** | ❌ NO | ✅ YES | ❌ NO | ❌ NO | ✅ YES | 일괄 선택 불가 |
| **상품 (Products)** | ❌ NO | ❌ NO | ❌ NO | ❌ NO | 🚨 **BROKEN** | **등록 버튼 404 에러** |
| **주문 (Orders)** | ❌ NO | ❌ NO | ❌ NO | ❌ NO | ✅ YES | 데이터 없음 상태 |
| **발주 (Purchase)** | ❌ NO | ❌ NO | ❌ NO | ✅ YES | ✅ YES | 엑셀 기능 전무 |
| **정산 (Settlements)** | ✅ YES | ❌ NO | ❌ NO | ❌ NO | ✅ YES | 업로드 불가 |
| **계정 (Accounts)** | ❌ NO | ❌ NO | ❌ NO | ❌ NO | ✅ YES | 기능 최소 구현된 듯 |

> **참고:** '엑셀 내보내기' 버튼이 별도로 존재하지 않고 '양식 다운로드'만 있는 경우가 많아, 내보내기 기능의 명확한 구현 여부는 코드 레벨 확인이 필요할 수 있음.

---

## 3. 상세 발견 사항 (Detailed Findings)

### � 1. 상품 관리 (Products) - 치명적 오류
*   **증상**: 목록 페이지 우측 상단의 `[상품 추가]` 버튼 클릭 시 404 에러 페이지로 이동.
*   **원인 추정**: `/products/new` 경로에 대한 페이지 라우팅이 구현되지 않음.
*   **스크린샷**: `products_list_page.png` (목록은 보이나 버튼 동작 실패)

### 🟠 2. 매장 관리 (Stores) - 기능 누락
*   **증상**: 매장 목록은 정상적으로 표시되나, 체크박스(Bulk Action)가 없어 다중 선택 및 일괄 처리가 불가능함.
*   **누락**: `Bulk Actions`, `Excel Template Download`.

### 🟠 3. 주문/발주/계정 (Orders/Purchase/Accounts) - 기능 누락
*   **증상**: 페이지 뼈대는 있으나 `CLAUDE.md`에서 강제한 공통 데이터 패턴(Excel, Bulk)이 거의 적용되지 않음.
*   **특이사항**:
    *   `/orders`: 데이터가 하나도 없어 테이블 렌더링 확인 불가.
    *   `/purchase-orders`: 체크박스는 있으나 엑셀 기능 전무.

---

## 4. 스크린샷 증적 (Screenshot Evidence)
테스트 과정에서 캡처된 주요 화면입니다. (파일명 참조)

*   `customers_list_page` : 규격 준수가 가장 잘 된 페이지
*   `stores_list_page` : 일괄 선택 기능 부재
*   `products_list_page` : 버튼 클릭 후 404 발생
*   `purchase_orders_list_page` : 엑셀 버튼 부재

## 5. 결론 및 제언
현재 구현 상태는 **초기 프로토타입 단계**로 보이며, `CLAUDE.md`에 정의된 **표준 데이터 패턴(Data Patterns)**이 전사적으로 적용되지 않았습니다.
우선적으로 **`/products/new` 404 에러 수정**이 시급하며, 이후 **공통 컴포넌트(Excel/Bulk)**를 모든 목록 페이지에 일괄 적용하는 리팩토링이 필요합니다.
