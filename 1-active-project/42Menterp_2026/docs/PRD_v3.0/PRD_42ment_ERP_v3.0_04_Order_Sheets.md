# 42ment 네이버 플레이스 마케팅 ERP PRD v3.0 - 주문/발주/시트 연동

> **작성일**: 2026-01-12
> **버전**: 3.0
> **상태**: 최종 검토 대기

참조: `../../PRD_42ment_ERP_v3.0.md`

## 7. 주문/발주 관리

### 7.0 주문/수주 관리 (Sales Order)

**정의:** 고객 승인 확정된 주문을 관리하는 상위 문서  
**역할:** 발주를 상품별로 분리 생성하는 기준 문서

**상태 플로우:**
```
[작성중] ──→ [확정] ──→ [종료]
   │
   └── [취소]
```

```
[sales_orders]
- id (PK)
- sales_order_no (unique) - 주문번호 (SO-YYYYMM-XXXX)
- tenant_id (FK)
- customer_id (FK)
- store_id (FK) - 매장 (optional)
- quotation_id (FK) - 연결된 견적서 (optional)
- status: draft / confirmed / canceled / closed
- order_date
- total_amount
- memo
- created_by (FK)
- created_at
- updated_at

[sales_order_items]
- id (PK)
- sales_order_id (FK)
- product_id (FK)
- product_type
- quantity
- unit_price
- amount
- notes
- created_at
```

### 7.1 발주 상태 플로우 (Purchase Order)

```
[작성중] ──→ [발주대기] ──→ [발주완료] ──→ [작업중] ──→ [완료]
   │              │
   └── [삭제]     └── [취소/반려]
```

| 상태 | 설명 | 가능한 액션 |
|------|------|------------|
| 작성중 | 초안 저장 | 수정, 삭제, 발주확정 |
| 발주대기 | 발주 확정됨 | 취소, 발주서출력 |
| 발주완료 | 상품에 전송됨 | - |
| 작업중 | 마케팅 작업 진행중 | 완료처리 |
| 완료 | 작업 완료 | - |
| 취소 | 취소됨 | - |

### 7.2 발주 등록 프로세스

```
1. 상품 선택 (예: 말차)
2. 발주 주차 선택 (예: 26년 1월 2주차)
3. 매장 다중 선택 (체크박스 + 검색)
4. 매장별 상세 입력:
   - 상품 유형: 유입 / 저장 / 리뷰
   - 작업 키워드 (여러 개 가능)
   - 일 요청량 (기본값 설정 가능)
   - 시작일 / 종료일
5. 발주 저장 (상태: 작성중)
6. 검토 후 "발주 확정" → 상태: 발주대기
7. 발주서 출력 (Google Sheets)
```

### 7.3 발주 데이터 (Purchase Order)

```
[purchase_orders] - 발주 헤더
- id (PK)
- purchase_order_no (unique) - 발주번호 (PO-YYYYMMDD-001)
- tenant_id (FK)
- sales_order_id (FK) - 연결된 주문
- product_id (FK)
- order_week - 발주 주차 (YYYY-WW)
- order_date
- status
- total_qty - 총 수량
- total_amount - 총 금액
- memo
- created_by (FK)
- confirmed_by (FK)
- confirmed_at
- created_at
- updated_at

[purchase_order_items] - 발주 상세
- id (PK)
- purchase_order_id (FK)
- sales_order_item_id (FK)
- store_id (FK)
- product_type: 유입 / 저장 / 리뷰 / 길찾기
- keyword - 작업 키워드
- daily_qty - 일 요청량
- start_date
- end_date
- work_days - 작업일수 (자동계산)
- total_qty - 총수량 (daily_qty × work_days)
- unit_price - 단가
- amount - 금액 (total_qty × unit_price)
- note - 특이사항
- status - 개별 상태
- created_at
```

### 7.4 발주 현황 조회
- 주차별/월별 발주 목록
- 상품별/매장별/파트너사별 필터링
- 상태별 필터
- 발주 상세 조회/수정
- 발주 취소 (사유 입력 필수)

---


## 8. Google Drive 연동 (발주/수주)

### 8.1 개요

상품별로 **발주 시트**와 **수주(작업결과) 시트**를 각각 설정하여 양방향 데이터 연동

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Drive 연동 구조                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   [42ment ERP]                      [상품 Google Drive]     │
│                                                             │
│   발주 등록 ──────────────────────→ 발주 시트 (쓰기)        │
│   (내가 상품에 주문)                 상품이 확인/작업        │
│                                                             │
│   수주 확인 ←────────────────────── 수주 시트 (읽기)        │
│   (상품 작업결과 수신)               상품이 결과 입력        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 발주 vs 수주 시트 구분

| 구분 | 발주 시트 | 수주 시트 |
|------|----------|----------|
| 용도 | 내가 상품에 작업 요청 | 상품이 작업 결과 보고 |
| 데이터 방향 | ERP → 시트 (쓰기) | 시트 → ERP (읽기) |
| 주체 | 42ment가 입력 | 상품이 입력 |
| 예시 | "이 매장에 리뷰 100건 해주세요" | "리뷰 100건 완료했습니다" |

### 8.3 상품별 시트 설정

```
[product_sheets] - 상품별 Google Drive 설정
- id (PK)
- product_id (FK)
- sheet_type: order / receipt (발주 / 수주)
- sheet_name - 시트 별칭
- spreadsheet_id - Google Spreadsheet ID
- spreadsheet_url - 전체 URL
- sheet_tab_name - 시트 탭 이름 (워크시트명)
- folder_id - Google Drive 폴더 ID
- template_id - 템플릿 시트 ID (발주용)
- column_mapping (JSON) - 컬럼 매핑
- header_row - 헤더 행 번호
- data_start_row - 데이터 시작 행
- sync_direction: push / pull / both
- sync_schedule - 동기화 주기 (수주용)
- is_active
- created_at
- updated_at
```

### 8.4 상품 설정 화면 예시

```
┌─────────────────────────────────────────────────────────────┐
│  상품 설정: 히든 (애드파인)                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [기본 정보]                                                │
│  상품명: 히든                                               │
│  상품 유형: 유입                                            │
│  기본 단가: 35원                                            │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  [📤 발주 시트 설정] - 내가 상품에 주문할 때                 │
│                                                             │
│  시트 URL: [https://docs.google.com/spreadsheets/d/1sj...]  │
│  탭 이름:  [히든 접수시트        ]                          │
│  템플릿:   [기존 시트에 행 추가 ▼]                          │
│                                                             │
│  [컬럼 매핑 설정]                                           │
│  ┌─────────────────┬─────────────────┐                     │
│  │ 시스템 필드     │ 시트 컬럼       │                     │
│  ├─────────────────┼─────────────────┤                     │
│  │ 작성일          │ A (작성일)      │                     │
│  │ 시작일          │ B (시작일)      │                     │
│  │ 종료일          │ C (종료일)      │                     │
│  │ 키워드          │ D (메인 키워드) │                     │
│  │ 매장명          │ E (플레이스명)  │                     │
│  │ 일수량          │ G (일 참여인원) │                     │
│  │ ...             │ ...             │                     │
│  └─────────────────┴─────────────────┘                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  [📥 수주 시트 설정] - 상품 작업결과 받을 때                 │
│                                                             │
│  시트 URL: [https://docs.google.com/spreadsheets/d/abc...]  │
│  탭 이름:  [작업완료        ]                               │
│  동기화:   [매일 09:00 자동 ▼]                              │
│                                                             │
│  [컬럼 매핑 설정]                                           │
│  ┌─────────────────┬─────────────────┐                     │
│  │ 시트 컬럼       │ 시스템 필드     │                     │
│  ├─────────────────┼─────────────────┤                     │
│  │ A (MID)         │ mid             │                     │
│  │ B (완료수량)    │ completed_qty   │                     │
│  │ C (완료일)      │ completed_date  │                     │
│  │ D (비고)        │ note            │                     │
│  └─────────────────┴─────────────────┘                     │
│                                                             │
│  [연결 테스트]  [저장]                                      │
└─────────────────────────────────────────────────────────────┘
```

### 8.5 발주 시트 연동 (Push)

**플로우:**
```
1. 발주 확정 (상태: 발주대기)
2. "발주서 출력" 클릭
3. 상품의 발주 시트 설정 조회
4. 데이터 변환 (시스템 → 시트 컬럼 매핑)
5. Google Sheets API로 데이터 입력
   - 옵션 A: 템플릿 복사 → 새 시트 생성
   - 옵션 B: 기존 시트에 행 추가 (Append)
6. 시트 링크 반환
7. 발주 상태 → 발주완료
```

**발주서 출력 이력:**
```
[purchase_order_exports]
- id (PK)
- purchase_order_id (FK)
- product_sheet_id (FK)
- spreadsheet_url - 실제 출력된 시트 URL
- sheet_tab_name - 출력된 탭 이름
- row_range - 입력된 행 범위 (예: A10:Z25)
- exported_at
- exported_by (FK)
- status: success / failed
- error_message
```

### 8.6 수주 시트 연동 (Pull)

**플로우:**
```
1. 스케줄에 따라 자동 실행 (또는 수동 동기화)
2. 상품의 수주 시트 설정 조회
3. Google Sheets API로 데이터 읽기
4. 데이터 변환 (시트 컬럼 → 시스템 필드 매핑)
5. 발주 건과 매칭 (MID + 키워드 + 기간)
6. 작업 로그 자동 생성/업데이트
7. 발주 상태 업데이트 (작업중 → 완료)
```

**수주 동기화 이력:**
```
[receipt_syncs]
- id (PK)
- product_sheet_id (FK)
- sync_type: auto / manual
- synced_at
- synced_by (FK) - null if auto
- total_rows - 읽은 행 수
- matched_count - 매칭 성공
- unmatched_count - 매칭 실패
- new_count - 신규 생성
- updated_count - 업데이트
- status: success / partial / failed
- error_message
```

**수주 데이터:**
```
[purchase_order_receipts] - 수주(작업결과) 데이터
- id (PK)
- purchase_order_item_id (FK) - 매칭된 발주 상세
- product_sheet_id (FK)
- source_row - 시트 원본 행 번호
- mid
- keyword
- completed_qty - 완료 수량
- completed_date
- product_note - 상품 비고
- match_status: matched / unmatched / manual
- synced_at
- created_at
```

**연동 규칙:**
- `purchase_order_receipts`는 작업 명세(Work Statement) 집계의 원천 데이터로 사용
- 수주 수량 합계가 발주 수량을 초과할 경우 경고/수동 검수

### 8.6.1 매칭 실패 건 처리 프로세스

**매칭 실패 원인:**
- MID 불일치 (오타, 삭제된 매장)
- 발주 기간 외 작업 완료
- 키워드 불일치

**처리 플로우:**
```
1. 동기화 완료 후 unmatched 건 별도 목록 표시
2. 담당자 확인:
   - 매장 선택 드롭다운 (MID로 검색)
   - 발주 건 선택 (해당 매장의 발주 목록)
3. 처리 옵션:
   - [매칭 확정] → match_status: manual
   - [작업로그만 생성] → 발주 없이 수기 작업로그
   - [무효 처리] → match_status: invalid
4. 무효 처리 건은 정산 제외
```

**미매칭 건 화면:**
```
┌─────────────────────────────────────────────────────────────┐
│  미매칭 수주 건 (3건)                    [일괄 무효 처리]     │
├─────────────────────────────────────────────────────────────┤
│ 시트      │ MID        │ 키워드    │ 수량 │ 액션           │
├───────────┼────────────┼──────────┼─────┼────────────────┤
│ 히든 수주  │ 9999999999 │ 강남카페  │ 100 │ [매칭] [무효]  │
│ 말차 수주  │ 1234567890 │ -        │ 50  │ [매칭] [무효]  │
│ 피닉스    │ 1111111111 │ 홍대맛집  │ 200 │ [매칭] [무효]  │
└─────────────────────────────────────────────────────────────┘
```

### 8.7 시트 URL 입력 방법

**전체 URL 입력:**
```
https://docs.google.com/spreadsheets/d/1sjbln5BWM4XjyB8TReKh8Xvp1S80wrMJvoJLkoYN9l0/edit?usp=sharing
```

**시스템이 자동 파싱:**
```
- Spreadsheet ID: 1sjbln5BWM4XjyB8TReKh8Xvp1S80wrMJvoJLkoYN9l0
- 탭 이름: 사용자가 별도 입력 (또는 첫 번째 탭)
```

### 8.8 Google API 인증 설정

```
[시스템 설정 > Google 연동]

인증 방식: 서비스 계정 (Service Account)

설정 방법:
1. Google Cloud Console에서 프로젝트 생성
2. Google Sheets API 활성화
3. 서비스 계정 생성 → JSON 키 다운로드
4. 시스템에 JSON 키 업로드
5. 각 시트에 서비스 계정 이메일 공유 권한 부여

[google_settings]
- service_account_email - 서비스 계정 이메일
- credentials_json - 인증 JSON (암호화 저장)
- default_folder_id - 기본 폴더 ID
- is_connected - 연결 상태
- last_verified_at - 마지막 검증 일시
```

### 8.9 상품별 시트 예시

| 상품 | 발주 시트 | 수주 시트 |
|------|----------|----------|
| 히든 | `42ment X 애드파인 접수시트` | `작업완료 시트` |
| 퍼플페퍼 | `리워드 퍼플페퍼 여수 X 42ment` | `정산 시트` |
| 말차 | `42ment 발주서` | `말차 결과보고` |
| 피닉스 | (API 연동) | (API 연동) |

---


## 9. API 명세

### 9.1 주문/수주 API (Sales Order)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/sales-orders | 주문 목록 조회 |
| POST | /api/sales-orders | 주문 생성 |
| GET | /api/sales-orders/[id] | 주문 상세 조회 |
| PUT | /api/sales-orders/[id] | 주문 수정 |
| DELETE | /api/sales-orders/[id] | 주문 삭제 (draft만) |
| POST | /api/sales-orders/[id]/confirm | 주문 확정 |
| POST | /api/sales-orders/[id]/cancel | 주문 취소 |
| POST | /api/sales-orders/[id]/convert-to-po | 발주 분리 생성 |
| GET | /api/sales-orders/[id]/purchase-orders | 연결된 발주 목록 |

### 9.2 발주 API (Purchase Order)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/purchase-orders | 발주 목록 조회 |
| POST | /api/purchase-orders | 발주 생성 |
| GET | /api/purchase-orders/[id] | 발주 상세 조회 |
| PUT | /api/purchase-orders/[id] | 발주 수정 (draft만) |
| DELETE | /api/purchase-orders/[id] | 발주 삭제 (draft만) |
| POST | /api/purchase-orders/[id]/confirm | 발주 확정 (→ 발주대기) |
| POST | /api/purchase-orders/[id]/cancel | 발주 취소 |
| POST | /api/purchase-orders/[id]/export | 시트 출력 (→ 발주완료) |
| POST | /api/purchase-orders/[id]/complete | 작업 완료 처리 |

### 9.3 시트 연동 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/products/[id]/sheets | 상품별 시트 설정 조회 |
| POST | /api/products/[id]/sheets | 시트 설정 추가 |
| PUT | /api/products/[id]/sheets/[sheetId] | 시트 설정 수정 |
| POST | /api/products/[id]/sheets/[sheetId]/test | 연결 테스트 |
| POST | /api/receipts/sync | 수주 동기화 실행 |
| GET | /api/receipts/unmatched | 미매칭 건 목록 |
| POST | /api/receipts/[id]/match | 수동 매칭 처리 |

### 9.4 주문/수주 UI 페이지

```
📋 주문/수주 관리
   ├── /sales-orders - 주문 목록
   │    ├── 검색 (주문번호, 고객명, 매장명)
   │    ├── 필터 (상태, 기간, 파트너사)
   │    └── 페이지네이션
   ├── /sales-orders/new - 주문 등록
   │    ├── 견적서 선택 (기존 견적에서 불러오기)
   │    ├── 고객/매장 선택
   │    ├── 상품 항목 추가
   │    └── 저장/확정
   └── /sales-orders/[id] - 주문 상세
        ├── 기본 정보 조회/수정
        ├── 주문 항목 목록
        ├── 연결된 발주 목록
        └── [발주 분리 생성] 버튼
```

---



