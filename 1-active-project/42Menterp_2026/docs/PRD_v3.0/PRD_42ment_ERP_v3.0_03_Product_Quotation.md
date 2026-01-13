# 42ment 네이버 플레이스 마케팅 ERP PRD v3.0 - 상품/견적

> **작성일**: 2026-01-12
> **버전**: 3.0
> **상태**: 최종 검토 대기

참조: `../../PRD_42ment_ERP_v3.0.md`

## 5. 발주 상품 관리

### 5.0 상품 테이블 표준 명칭

- `products`: 발주 상품 마스터
- `product_templates`: 상품별 시트 템플릿 매핑
- `product_prices`: 상품 단가(파트너사별 공급단가 포함)
- `product_sheets`: 상품별 Google Drive 시트 설정 (상세는 주문/발주 문서 참고)
- FK는 `product_id`로 통일, 작업유형은 `product_type` 사용

### 5.1 상품 정보

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| name | string | O | 상품명 (피닉스, 말차, 히든 등) |
| code | string | O | 상품 코드 |
| type | enum | O | 리뷰 / 저장 / 길찾기 / 유입 |
| base_unit_price | number | O | 기본 단가 (건당) |
| min_qty | number | - | 최소 발주 수량 |
| min_days | number | - | 최소 구동일 |
| max_days | number | - | 최대 구동일 |
| same_day_deadline | time | - | 당일 마감 시간 |
| next_day_deadline | time | - | 익일 마감 시간 |
| weekend_available | boolean | - | 주말 등록 가능 여부 |
| as_available | boolean | - | AS 가능 여부 |
| refund_policy | text | - | 환불 정책 |
| output_type | enum | O | google_sheets / excel / api |
| gdrive_folder_id | string | - | Google Drive 폴더 ID |
| gdrive_template_id | string | - | 템플릿 시트 ID |
| status | enum | O | active / inactive |

### 5.2 상품별 템플릿 매핑

```
[product_templates]
- id (PK)
- product_id (FK)
- template_name
- column_mapping (JSON) - 시스템 필드 → 시트 컬럼 매핑
- header_row - 헤더 시작 행
- data_start_row - 데이터 시작 행
```

**매핑 예시 (퍼플페퍼):**
```json
{
  "NO": "row_number",
  "담당자": "manager_name",
  "대행사": "partner_name",
  "상품": "product_type",
  "접수일": "order_date",
  "MID": "mid",
  "플레이스명": "store_name",
  "작업키워드": "keyword",
  "요청량": "daily_qty",
  "시작일": "start_date",
  "마감일": "end_date",
  "플레이스url": "place_url"
}
```

**매핑 예시 (히든):**
```json
{
  "작성일": "order_date",
  "시작일": "start_date",
  "종료일": "end_date",
  "메인 키워드": "keyword",
  "플레이스명": "store_name",
  "일 참여인원": "daily_qty",
  "플레이스URL": "place_url",
  "MID": "mid",
  "상품종류선택": "product_type"
}
```

### 5.3 파트너사별 단가 설정

```
[product_prices]
- id (PK)
- tenant_id (FK) - 파트너사
- product_id (FK) - 상품
- unit_price - 공급단가
- effective_from - 적용 시작일
- effective_to - 적용 종료일
- created_at
```

**단가 구조:**
```
상품: 말차
├── 본사 원가: 100원/건
├── 파트너 A 공급가: 130원 (마진 30원)
├── 파트너 B 공급가: 120원 (마진 20원)
└── 파트너 C 공급가: 140원 (마진 40원)
```

---


## 6. 견적서 관리

### 6.1 개요

견적서는 **주문/수주와 연동되며**, 발주는 주문을 기반으로 생성됩니다.

**비즈니스 시나리오:**
```
[시나리오 1: 견적 선행]
상담 → 견적서 작성 → 고객 승인 → 발주 생성 (견적 연동)

[시나리오 2: 발주 선행]  
긴급 요청 → 발주 먼저 처리 → 나중에 견적서 발행 (증빙용)

[시나리오 3: 독립 운영]
견적만 발행 (미성사) / 발주만 처리 (기존 고객)
```

### 6.2 견적서 상태 플로우

```
[작성중] ──→ [발송완료] ──→ [승인] ──→ 발주 생성
   │              │            │
   └── [삭제]     │            └── [거절]
                  └── [만료]
```

| 상태 | 코드 | 설명 | 가능한 액션 |
|------|------|------|------------|
| 작성중 | draft | 초안 저장 상태 | 수정, 삭제, 발송 |
| 발송완료 | sent | 고객에게 발송됨 | 재발송, 승인처리, 거절처리 |
| 승인됨 | accepted | 고객이 승인함 | 발주 전환 |
| 거절됨 | rejected | 고객이 거절함 | 복사하여 재작성 |
| 만료됨 | expired | 유효기간 경과 | 복사하여 재작성 |

### 6.3 견적서 기능 목록

| 기능 | 설명 | 우선순위 |
|------|------|----------|
| 견적서 CRUD | 생성/조회/수정/삭제 | P0 |
| PDF 생성 | 견적서 PDF 다운로드/미리보기 | P0 |
| 주문/발주 연동 | 견적→주문 생성, 주문→발주 분리 생성 | P0 |
| 견적서 발송 | 이메일로 PDF 첨부 발송 | P1 |
| 견적서 복사 | 기존 견적서 복사하여 새로 작성 | P1 |

### 6.4 견적서 데이터

```
[quotations] - 견적서 헤더
- id (PK)
- quotation_no (unique) - 견적번호 (Q-YYYYMM-XXXX)
- tenant_id (FK) - 소속 파트너사
- customer_id (FK) - 고객사/매장
- store_id (FK) - 매장 (optional)
- status: draft / sent / accepted / rejected / expired
- quotation_date - 견적일
- valid_until - 유효기간
- total_amount - 총 금액 (공급가액)
- tax_amount - 부가세
- grand_total - 합계 (공급가액 + 부가세)
- notes - 비고
- created_by (FK)
- created_at
- updated_at

[quotation_items] - 견적 항목
- id (PK)
- quotation_id (FK)
- product_name - 상품명
- description - 상품 설명
- quantity - 수량
- unit_price - 단가
- total_price - 금액 (수량 × 단가)
- notes - 비고
- sort_order - 정렬 순서
- created_at
```

### 6.5 견적-주문(수주) 연동

**Sales Order 테이블:**
```
[sales_orders]
- id (PK)
- sales_order_no (unique) - 주문번호 (SO-YYYYMM-XXXX)
- tenant_id (FK)
- customer_id (FK)
- store_id (FK) - 매장 (optional)
- quotation_id (FK) - 연결된 견적서 (optional)
- status: draft / confirmed / canceled
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

**연동 규칙:**
- 견적 승인 시 주문/수주 자동 생성 (기본)
- 주문 1개에서 상품별 발주 다건 분리 (1:N)
- 발주 생성 후에도 견적서 연결 가능 (역방향 보정)

### 6.6 API 명세

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/quotations | 견적서 목록 조회 |
| POST | /api/quotations | 견적서 생성 |
| GET | /api/quotations/[id] | 견적서 상세 조회 |
| PUT | /api/quotations/[id] | 견적서 수정 |
| DELETE | /api/quotations/[id] | 견적서 삭제 |
| POST | /api/quotations/[id]/send | 견적서 발송 (이메일) |
| POST | /api/quotations/[id]/convert-to-order | 견적→발주 전환 |
| GET | /api/quotations/[id]/pdf | PDF 다운로드 |
| GET | /api/quotations/[id]/pdf/preview | PDF 미리보기 |

### 6.7 UI 페이지

```
📝 견적서 관리
   ├── /quotations - 견적서 목록
   │    ├── 검색 (견적번호, 고객명)
   │    ├── 필터 (상태, 기간)
   │    └── 페이지네이션
   ├── /quotations/new - 견적서 등록
   │    ├── 고객/매장 선택
   │    ├── 항목 추가/삭제
   │    ├── 금액 자동 계산
   │    └── 저장/발송
   └── /quotations/[id] - 견적서 상세/수정
        ├── 기본 정보 조회/수정
        ├── PDF 미리보기/다운로드
        ├── 이메일 발송
        └── 발주 전환
```

### 6.8 견적서 PDF 템플릿

```
┌─────────────────────────────────────────────────────────────────┐
│  [회사 로고]                              견   적   서          │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  견적번호: Q-202601-0001              견적일: 2026년 01월 05일  │
│  유효기간: 2026년 01월 12일까지                                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  수   신                                                │   │
│  │  상  호: 길동이네 치킨                                  │   │
│  │  담당자: 홍길동                                         │   │
│  │  연락처: 010-1234-5678                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  공   급   자                                           │   │
│  │  상  호: (주)42멘트                 [인]                │   │
│  │  사업자번호: 123-45-67890                               │   │
│  │  주  소: 서울시 강남구 ...                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  아래와 같이 견적합니다.                                        │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ No │ 품  목         │ 수량 │ 단가     │ 금액           │   │
│  ├────┼────────────────┼─────┼─────────┼────────────────┤   │
│  │  1 │ 유입 50타/일   │  30 │ 35,000  │    1,050,000   │   │
│  │  2 │ 저장 100건     │   1 │ 100,000 │      100,000   │   │
│  │  3 │ 리뷰 10건      │   1 │ 200,000 │      200,000   │   │
│  ├────┴────────────────┴─────┴─────────┼────────────────┤   │
│  │                      공급가액 합계   │    1,350,000   │   │
│  │                      부가세 (10%)    │      135,000   │   │
│  │                      ═══════════════╪════════════════│   │
│  │                      총 견적금액     │    1,485,000   │   │
│  └─────────────────────────────────────┴────────────────┘   │
│                                                                 │
│  ※ 비고                                                        │
│  - 상기 금액은 부가세 포함 금액입니다.                          │
│  - 유효기간 내 계약 시 동일 조건 적용됩니다.                    │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│  (주)42멘트 │ Tel: 02-1234-5678 │ www.42ment.com               │
└─────────────────────────────────────────────────────────────────┘
```

---



