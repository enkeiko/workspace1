# 42ment 네이버 플레이스 마케팅 ERP PRD v3.0

> **작성일**: 2026-01-12
> **버전**: 3.0
> **상태**: 최종 검토 대기

---

## 목차

1. [비즈니스 개요](#1-비즈니스-개요)
2. [시스템 아키텍처](#2-시스템-아키텍처)
3. [사용자 및 권한 관리](#3-사용자-및-권한-관리)
4. [매장(광고주) 관리](#4-매장광고주-관리)
5. [발주 채널 관리](#5-발주-채널-관리)
6. [견적서 관리](#6-견적서-관리)
7. [발주 관리](#7-발주-관리)
8. [발주서 출력 (Google Sheets 연동)](#8-발주서-출력-google-sheets-연동)
9. [정산 관리](#9-정산-관리)
10. [파트너사 관리 (멀티테넌시)](#10-파트너사-관리-멀티테넌시)
11. [마케팅 작업 로그](#11-마케팅-작업-로그)
12. [키워드 순위 트래킹](#12-키워드-순위-트래킹)
13. [바로빌 API 연동](#13-바로빌-api-연동)
14. [알림 시스템](#14-알림-시스템)
15. [대시보드 및 보고서](#15-대시보드-및-보고서)
16. [시스템 관리](#16-시스템-관리)
17. [데이터 모델 (ERD)](#17-데이터-모델-erd)
18. [기술 스택](#18-기술-스택)
19. [개발 우선순위](#19-개발-우선순위)
20. [비기능 요구사항](#20-비기능-요구사항)

---

## 1. 비즈니스 개요

### 1.1 서비스 설명
네이버 플레이스에 등록된 매장(광고주)들의 리뷰/저장/길찾기 마케팅을 대행하는 ERP 시스템

### 1.2 핵심 비즈니스 플로우
```
광고주(매장) 계약
    ↓
발주 등록 (채널별: 피닉스, 말차, 히든 등)
    ↓
채널에 발주서 전송 (Google Sheets)
    ↓
마케팅 작업 진행 (리뷰/저장/길찾기/유입)
    ↓
작업 완료 확인 + 키워드 순위 트래킹
    ↓
정산 (매장 → 본사 → 채널)
    ↓
세금계산서 발행/수신
```

### 1.3 현재 문제점 (AS-IS)
- Excel로 수기 관리 → 누락/오류 빈번
- 발주서 채널별 수동 작성 → 시간 소요
- 정산/계산서 수동 확인 → 누락 위험
- 마케팅 효과 측정 불가 → 키워드 순위 미추적
- 파트너사 관리 어려움 → 정산 복잡

### 1.4 목표 (TO-BE)
- 발주~정산 전 과정 시스템화
- 채널별 발주서 자동 생성 (Google Sheets)
- 세금계산서 자동 발행/수신 (바로빌)
- 키워드 순위 자동 트래킹
- 파트너사 멀티테넌시 지원

---

## 2. 시스템 아키텍처

### 2.1 멀티테넌시 구조
```
본사 (Super Admin)
  ├── 파트너사 A (Partner Admin)
  │     ├── 담당자 1 (Operator)
  │     ├── 담당자 2 (Operator)
  │     └── 매장들...
  ├── 파트너사 B (Partner Admin)
  │     └── 매장들...
  └── 직영 매장들 (본사 직접 관리)
```

### 2.2 외부 시스템 연동
```
┌─────────────────────────────────────────────────────────┐
│                    42ment ERP                           │
├─────────────────────────────────────────────────────────┤
│  [발주 관리]  [정산 관리]  [키워드 트래킹]  [대시보드]   │
└───────┬──────────┬──────────────┬───────────────┬───────┘
        │          │              │               │
   ┌────▼────┐ ┌───▼────┐  ┌─────▼─────┐  ┌─────▼─────┐
   │ Google  │ │바로빌  │  │  네이버   │  │  카카오   │
   │ Sheets  │ │  API   │  │  플레이스 │  │  알림톡   │
   │  API    │ │        │  │ (크롤링)  │  │   API    │
   └─────────┘ └────────┘  └───────────┘  └───────────┘
```

---

## 3. 사용자 및 권한 관리

### 3.1 권한 레벨

| 레벨 | 역할 | 권한 범위 |
|------|------|----------|
| Super Admin | 본사 관리자 | 전체 시스템 + 파트너 관리 + 정산 + 시스템 설정 |
| Partner Admin | 파트너사 관리자 | 자사 매장/발주/담당자 관리 + 자사 정산 조회 |
| Operator | 담당자 | 매장 등록, 발주 입력, 작업 로그 기록 |
| Viewer | 조회 전용 | 읽기만 가능 |

### 3.2 인증 기능
- 이메일 + 비밀번호 로그인
- 비밀번호 재설정 (이메일 인증)
- 세션 관리 (30분 타임아웃)
- 로그인 이력 기록 (IP, 일시, 성공/실패)

### 3.3 사용자 데이터
```
[users]
- id (PK)
- tenant_id (FK) - 소속 파트너사 (null = 본사)
- email (unique)
- password_hash
- name
- phone
- role: super_admin / partner_admin / operator / viewer
- status: active / inactive / suspended
- last_login_at
- created_at
- updated_at
```

---

## 4. 매장(광고주) 관리

### 4.1 매장 정보

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| name | string | O | 매장명 |
| mid | string | O | 네이버 플레이스 ID |
| place_url | string | - | 플레이스 URL (자동생성) |
| business_no | string | - | 사업자번호 |
| representative | string | - | 대표자명 |
| contact_name | string | - | 담당자명 |
| contact_phone | string | - | 연락처 |
| contact_email | string | - | 이메일 |
| address | string | - | 주소 |
| category | string | - | 업종 (음식점/카페/미용실 등) |
| contract_start | date | - | 계약 시작일 |
| contract_end | date | - | 계약 종료일 |
| monthly_budget | number | - | 월 예산 |
| status | enum | O | active / paused / terminated |
| memo | text | - | 메모 |

### 4.2 매장 기능
- CRUD (등록/조회/수정/삭제)
- Excel 일괄 업로드/다운로드
- 검색/필터링 (매장명, 상태, 카테고리)
- 사업자등록 상태 조회 (바로빌 API)

### 4.3 매장 데이터
```
[stores]
- id (PK)
- tenant_id (FK) - 소속 파트너사
- name
- mid (unique)
- place_url
- business_no
- representative
- contact_name, contact_phone, contact_email
- address
- category
- contract_start, contract_end
- monthly_budget
- status
- memo
- created_by (FK)
- created_at
- updated_at
```

---

## 5. 발주 채널 관리

### 5.1 채널 정보

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| name | string | O | 채널명 (피닉스, 말차, 히든 등) |
| code | string | O | 채널 코드 |
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

### 5.2 채널별 템플릿 매핑

```
[channel_templates]
- id (PK)
- channel_id (FK)
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
[partner_prices]
- id (PK)
- tenant_id (FK) - 파트너사
- channel_id (FK) - 채널
- unit_price - 공급단가
- effective_from - 적용 시작일
- effective_to - 적용 종료일
- created_at
```

**단가 구조:**
```
채널: 말차
├── 본사 원가: 100원/건
├── 파트너 A 공급가: 130원 (마진 30원)
├── 파트너 B 공급가: 120원 (마진 20원)
└── 파트너 C 공급가: 140원 (마진 40원)
```

---

## 6. 견적서 관리

### 6.1 개요

견적서는 **발주와 연동되지만 독립적으로 운영**되는 기능입니다.

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
| 발주 연동 | 견적→발주, 발주→견적 양방향 연결 | P0 |
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

### 6.5 견적-발주 연동

**Order 테이블 확장:**
```
[orders]
- ...
- quotation_id (FK) - 연결된 견적서 (optional)
- ...
```

**연동 규칙:**
- 견적서 1개에서 여러 발주 생성 가능 (1:N)
- 발주는 견적서 없이도 생성 가능 (quotation_id = null)
- 발주 생성 후에도 견적서 연결 가능 (역방향)

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

## 7. 발주 관리

### 7.1 발주 상태 플로우

```
[작성중] ──→ [발주대기] ──→ [발주완료] ──→ [작업중] ──→ [완료]
   │              │
   └── [삭제]     └── [취소/반려]
```

| 상태 | 설명 | 가능한 액션 |
|------|------|------------|
| 작성중 | 초안 저장 | 수정, 삭제, 발주확정 |
| 발주대기 | 발주 확정됨 | 취소, 발주서출력 |
| 발주완료 | 채널에 전송됨 | - |
| 작업중 | 마케팅 작업 진행중 | 완료처리 |
| 완료 | 작업 완료 | - |
| 취소 | 취소됨 | - |

### 7.2 발주 등록 프로세스

```
1. 채널 선택 (예: 말차)
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

### 7.3 발주 데이터

```
[orders] - 발주 헤더
- id (PK)
- order_no (unique) - 발주번호 (PO-YYYYMMDD-001)
- tenant_id (FK)
- channel_id (FK)
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

[order_items] - 발주 상세
- id (PK)
- order_id (FK)
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
- 채널별/매장별/파트너사별 필터링
- 상태별 필터
- 발주 상세 조회/수정
- 발주 취소 (사유 입력 필수)

---

## 8. Google Drive 연동 (발주/수주)

### 8.1 개요

채널별로 **발주 시트**와 **수주(작업결과) 시트**를 각각 설정하여 양방향 데이터 연동

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Drive 연동 구조                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   [42ment ERP]                      [채널 Google Drive]     │
│                                                             │
│   발주 등록 ──────────────────────→ 발주 시트 (쓰기)        │
│   (내가 채널에 주문)                 채널이 확인/작업        │
│                                                             │
│   수주 확인 ←────────────────────── 수주 시트 (읽기)        │
│   (채널 작업결과 수신)               채널이 결과 입력        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 발주 vs 수주 시트 구분

| 구분 | 발주 시트 | 수주 시트 |
|------|----------|----------|
| 용도 | 내가 채널에 작업 요청 | 채널이 작업 결과 보고 |
| 데이터 방향 | ERP → 시트 (쓰기) | 시트 → ERP (읽기) |
| 주체 | 42ment가 입력 | 채널이 입력 |
| 예시 | "이 매장에 리뷰 100건 해주세요" | "리뷰 100건 완료했습니다" |

### 8.3 채널별 시트 설정

```
[channel_sheets] - 채널별 Google Drive 설정
- id (PK)
- channel_id (FK)
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

### 8.4 채널 설정 화면 예시

```
┌─────────────────────────────────────────────────────────────┐
│  채널 설정: 히든 (애드파인)                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [기본 정보]                                                │
│  채널명: 히든                                               │
│  채널 유형: 유입                                            │
│  기본 단가: 35원                                            │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  [📤 발주 시트 설정] - 내가 채널에 주문할 때                 │
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
│  [📥 수주 시트 설정] - 채널 작업결과 받을 때                 │
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
3. 채널의 발주 시트 설정 조회
4. 데이터 변환 (시스템 → 시트 컬럼 매핑)
5. Google Sheets API로 데이터 입력
   - 옵션 A: 템플릿 복사 → 새 시트 생성
   - 옵션 B: 기존 시트에 행 추가 (Append)
6. 시트 링크 반환
7. 발주 상태 → 발주완료
```

**발주서 출력 이력:**
```
[order_exports]
- id (PK)
- order_id (FK)
- channel_sheet_id (FK)
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
2. 채널의 수주 시트 설정 조회
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
- channel_sheet_id (FK)
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
[order_receipts] - 수주(작업결과) 데이터
- id (PK)
- order_item_id (FK) - 매칭된 발주 상세
- channel_sheet_id (FK)
- source_row - 시트 원본 행 번호
- mid
- keyword
- completed_qty - 완료 수량
- completed_date
- channel_note - 채널 비고
- match_status: matched / unmatched / manual
- synced_at
- created_at
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

### 8.9 채널별 시트 예시

| 채널 | 발주 시트 | 수주 시트 |
|------|----------|----------|
| 히든 | `42ment X 애드파인 접수시트` | `작업완료 시트` |
| 퍼플페퍼 | `리워드 퍼플페퍼 여수 X 42ment` | `정산 시트` |
| 말차 | `42ment 발주서` | `말차 결과보고` |
| 피닉스 | (API 연동) | (API 연동) |

---

## 9. 정산 관리

### 9.1 정산 구조

```
[매출 정산] 매장 → 본사/파트너사
├── 매장별 월 발주 금액 집계
├── 입금 확인 처리
├── 미수금 관리
└── 세금계산서 발행

[비용 정산] 본사 → 채널
├── 채널별 월 발주 금액 집계
├── 지급 처리
└── 세금계산서 수신 확인

[파트너 정산] 본사 ↔ 파트너사
├── 파트너사별 월 매출 집계
├── 수수료(마진) 계산
└── 정산서 생성
```

### 9.2 정산 데이터

```
[settlements]
- id (PK)
- tenant_id (FK) - 파트너사 (null = 본사 직접)
- settlement_month - 정산월 (YYYY-MM)
- type: revenue / cost / partner
- target_type: store / channel / partner
- target_id - 대상 ID
- order_amount - 발주 금액
- settlement_amount - 정산 금액
- commission_rate - 수수료율 (파트너 정산용)
- commission_amount - 수수료 금액
- tax_invoice_id (FK) - 연결된 세금계산서
- payment_status: pending / paid / overdue
- payment_date
- memo
- created_at
```

### 9.3 입금 확인

```
[payment_records]
- id (PK)
- settlement_id (FK)
- store_id (FK)
- amount
- payment_date
- payment_method: transfer / card / etc
- depositor_name - 입금자명
- matched_type: auto / manual
- memo
- created_by (FK)
- created_at
```

---

## 10. 파트너사 관리 (멀티테넌시)

### 10.1 파트너사 정보

```
[tenants]
- id (PK)
- name - 파트너사명
- code - 파트너사 코드
- business_no - 사업자번호
- representative - 대표자
- contact_name, contact_phone, contact_email
- address
- commission_type: fixed / rate - 수수료 유형
- default_commission_rate - 기본 수수료율
- bank_name - 정산 계좌 은행
- bank_account - 정산 계좌번호
- bank_holder - 예금주
- status: active / inactive / suspended
- contract_start, contract_end
- memo
- created_at
- updated_at
```

### 10.2 파트너사 관리 기능 (Super Admin)

- 파트너사 등록/수정/비활성화
- 파트너사별 담당자 계정 생성/관리
- 파트너사별 채널 단가 설정
- 파트너사별 발주/매출 현황 조회
- 파트너사 정산 처리

### 10.3 파트너사 화면 (Partner Admin)

- 자사 매장 관리
- 자사 발주 등록/조회
- 자사 정산 현황 조회
- 자사 담당자 관리

---

## 11. 마케팅 작업 로그

### 11.1 개요
매장별 마케팅 작업 내역을 기록하여 이력 관리 및 효과 분석

### 11.2 로그 유형

| 유형 | 설명 | 기록 방식 |
|------|------|----------|
| 자동 | 발주/정산 시스템 연동 | 시스템 자동 기록 |
| 수동 | 담당자 직접 입력 | 담당자 수동 입력 |

### 11.3 작업 로그 데이터

```
[work_logs]
- id (PK)
- store_id (FK)
- order_item_id (FK) - 연결된 발주 상세 (nullable)
- log_type: auto / manual
- work_type: 리뷰 / 저장 / 길찾기 / 유입 / 기타
- channel_id (FK)
- work_date
- keyword - 작업 키워드
- qty - 작업 수량
- status: pending / in_progress / completed / failed
- result_note - 결과 메모
- evidence_url - 증빙 URL (스크린샷 등)
- created_by (FK)
- created_at
- updated_at
```

### 11.4 작업 로그 기능

**자동 기록:**
- 발주 등록 시 → 작업 예정 로그 생성
- 발주 상태 변경 시 → 로그 상태 업데이트
- 키워드 순위 체크 시 → 결과 자동 연결

**수동 기록:**
- 담당자가 직접 작업 내역 입력
- 증빙 자료 첨부 (이미지 URL)
- 특이사항 메모

### 11.5 작업 로그 화면

```
[매장 상세 > 작업 이력 탭]

필터: [전체 ▼] [2026년 1월 ▼] [말차 ▼]

┌─────────────────────────────────────────────────────────┐
│ 날짜       │ 유형   │ 채널  │ 키워드      │ 수량 │ 상태   │
├─────────────────────────────────────────────────────────┤
│ 2026-01-10 │ 유입   │ 히든  │ 강남 카페   │ 200  │ 완료   │
│ 2026-01-08 │ 저장   │ 말차  │ 압구정 바   │ 100  │ 진행중 │
│ 2026-01-05 │ 리뷰   │ 피닉스│ -          │ 50   │ 완료   │
└─────────────────────────────────────────────────────────┘

[+ 수동 작업 추가]
```

---

## 12. 키워드 순위 트래킹

### 12.1 개요
네이버 플레이스 검색에서 매장의 키워드별 순위를 자동 추적

### 12.2 크롤링 기능 (기존 도구 활용)

**기반 기술:**
- Python + requests + BeautifulSoup
- 네이버 플레이스 검색 결과 파싱
- MID 기반 순위 확인

**핵심 로직:**
```python
def check_keyword_rank(keyword, target_mid, top_n=30):
    """
    키워드 검색 결과에서 target_mid의 순위 확인

    Returns:
        - rank: 순위 (1~30), 미노출 시 0
        - match_type: exact(상위3) / natural(4~30) / none
    """
    results = search_naver_place(keyword)
    for i, place in enumerate(results[:top_n]):
        if place['mid'] == target_mid:
            rank = i + 1
            match_type = 'exact' if rank <= 3 else 'natural'
            return rank, match_type
    return 0, 'none'
```

### 12.3 키워드 관리

```
[store_keywords] - 매장별 트래킹 키워드
- id (PK)
- store_id (FK)
- keyword
- keyword_type: target / location / combined
- is_active
- created_at

[keyword_combinations] - 키워드 조합 설정
- id (PK)
- store_id (FK)
- location_keyword - 위치 키워드 (강남, 홍대 등)
- target_keyword - 목적 키워드 (맛집, 카페 등)
- combined_keyword - 조합 키워드 (강남 맛집)
- is_active
```

### 12.4 순위 트래킹 데이터

```
[keyword_rankings]
- id (PK)
- store_id (FK)
- keyword
- check_date
- check_time
- rank - 순위 (0 = 미노출)
- match_type: exact / natural / none
- previous_rank - 이전 순위
- rank_change - 순위 변동 (+/-)
- created_at

[ranking_snapshots] - 일별 스냅샷
- id (PK)
- store_id (FK)
- snapshot_date
- total_keywords - 총 트래킹 키워드 수
- exposed_count - 노출 키워드 수
- exact_count - 정확매칭 수 (상위 3위)
- natural_count - 자연유입 수 (4~30위)
- avg_rank - 평균 순위
```

### 12.5 트래킹 스케줄

| 주기 | 대상 | 설명 |
|------|------|------|
| 일 1회 | 전체 활성 키워드 | 매일 오전 6시 자동 체크 |
| 수동 | 선택 키워드 | 담당자 즉시 체크 |
| 발주 연동 | 발주 키워드 | 발주 시작/종료일 자동 체크 |

### 12.6 순위 트래킹 화면

```
[매장 상세 > 키워드 순위 탭]

매장: 마르케 (MID: 1374995918)

[키워드 관리]
┌───────────────────────────────────────────────────────────┐
│ 키워드        │ 현재순위 │ 변동  │ 타입     │ 최근체크    │
├───────────────────────────────────────────────────────────┤
│ 강남 카페     │ 2위     │ ▲3   │ 정확매칭 │ 01-12 06:00 │
│ 논현동 소금빵 │ 5위     │ ▼2   │ 자연유입 │ 01-12 06:00 │
│ 압구정 베이커리│ 12위    │ -    │ 자연유입 │ 01-12 06:00 │
│ 강남역 디저트 │ 미노출   │ -    │ -       │ 01-12 06:00 │
└───────────────────────────────────────────────────────────┘

[+ 키워드 추가] [지금 체크] [순위 리포트]

[순위 추이 그래프]
     ^
  1위│    ★
  5위│  ●───●───●
 10위│        ○───○
 15위│
     └─────────────────→
       1/8  1/9  1/10 1/11 1/12
```

### 12.7 키워드 발굴 기능 (기존 도구 연동)

**자동 키워드 발굴:**
```
1. 매장 MID 입력
2. 위치키워드 + 목적키워드 조합 생성
3. 각 조합으로 검색 → 매장 노출 여부 확인
4. 노출 키워드 자동 등록
```

**입력 파일:**
- 위치키워드.txt: 지역명 목록
- 목적키워드.txt: 업종/서비스 키워드

**출력:**
- 정확매칭 키워드 (상위 3위)
- 자연유입 키워드 (4~30위)

---

## 13. 바로빌 API 연동

### 13.1 연동 기능 요약

| 기능 | 용도 | 우선순위 |
|------|------|----------|
| 세금계산서 발행 | 매장에게 매출 계산서 발행 | 필수 |
| 홈택스 매입 조회 | 채널에서 받은 계산서 자동 수집 | 필수 |
| 사업자등록 상태조회 | 거래처 휴/폐업 확인 | 필수 |
| 계좌조회 | 입금 확인 자동화 | 권장 |
| 카카오 알림톡 | 발주/정산 알림 발송 | 권장 |

### 13.2 세금계산서 관리

**매출 세금계산서 (발행):**
```
1. 매장별 월 정산 금액 확정
2. 발행 대상 목록 생성
3. 바로빌 API로 일괄 발행
4. 발행 결과 자동 기록
5. 실패 건 재발행 처리
```

**매입 세금계산서 (수신):**
```
1. 홈택스 매입 내역 자동 수집 (일 1회)
2. 발행자(채널) 기준 분류
3. 발주 금액과 자동 매칭
4. 매칭 결과:
   - 일치 → 정산완료
   - 차이 → 확인 필요 알림
   - 미수신 → 채널에 발행 요청
```

### 13.3 세금계산서 데이터

```
[tax_invoices]
- id (PK)
- type: sales / purchase (매출/매입)
- issue_date
- supplier_business_no
- supplier_name
- receiver_business_no
- receiver_name
- supply_amount - 공급가액
- tax_amount - 세액
- total_amount - 합계
- nts_confirm_no - 국세청 승인번호
- status: issued / sent / failed
- matched_settlement_id (FK)
- barobill_id - 바로빌 문서 ID
- created_at
```

### 13.4 사업자등록 상태조회

**용도:**
- 신규 매장 등록 시 유효성 확인
- 정기 거래처 상태 체크 (월 1회)
- 계산서 발행 전 상태 확인

```
[business_status_logs]
- id (PK)
- business_no
- status: 정상 / 휴업 / 폐업
- business_name
- representative
- checked_at
```

### 13.5 계좌조회 (입금 확인 자동화)

```
1. 법인 계좌 거래내역 조회
2. 입금자명 + 금액으로 매장 매칭
3. 자동 매칭 성공 → 입금확인 처리
4. 매칭 실패 → 수동 확인 목록

[bank_transactions]
- id (PK)
- account_no
- transaction_date
- type: deposit / withdraw
- amount
- balance
- depositor_name
- memo
- matched_store_id (FK)
- matched_at
```

### 13.6 바로빌 설정

```
[barobill_settings]
- api_id
- api_key
- corp_num - 사업자번호
- cert_key - 공인인증서 (필요시)
- default_issuer_name - 기본 발행 담당자
- default_issuer_email
- auto_issue_enabled - 자동발행 여부
- sync_schedule - 동기화 스케줄
```

---

## 14. 알림 시스템

### 14.1 알림 채널

| 채널 | 설정 | 용도 |
|------|------|------|
| 시스템 알림 | 기본 ON | 모든 알림 |
| 카카오 알림톡 | 수신번호 | 주요 알림 |
| 이메일 | 수신주소 | 정산/계산서 |
| 슬랙 | 웹훅 URL | 팀 알림 (선택) |

### 14.2 알림 유형

| 유형 | 설명 | 기본 채널 |
|------|------|----------|
| 발주 마감 임박 | D-1, 당일 알림 | 시스템, 알림톡 |
| 발주 상태 변경 | 확정/완료 등 | 시스템 |
| 입금 요청 | 정산 금액 안내 | 알림톡, 이메일 |
| 입금 확인 | 입금 완료 안내 | 시스템 |
| 세금계산서 발행 | 발행 완료 안내 | 이메일 |
| 키워드 순위 변동 | 급등/급락 알림 | 시스템 |
| 거래처 상태 변동 | 휴/폐업 알림 | 시스템, 이메일 |

### 14.3 알림 설정

```
[notification_settings]
- id (PK)
- user_id (FK)
- notification_type
- channel: system / kakao / email / slack
- enabled
- receiver - 수신 정보
```

### 14.4 알림톡 템플릿

```
[발주 접수 알림]
#{매장명}님, 발주가 접수되었습니다.
- 채널: #{채널명}
- 수량: #{총수량}건
- 기간: #{시작일} ~ #{종료일}
- 금액: #{금액}원

[입금 요청 알림]
#{매장명}님, 정산 금액 입금을 요청드립니다.
- 정산 금액: #{금액}원
- 입금 계좌: #{계좌정보}
- 입금 기한: #{기한}

[키워드 순위 알림]
#{매장명} 키워드 순위가 변동되었습니다.
- #{키워드}: #{이전순위}위 → #{현재순위}위 (#{변동})
```

---

## 15. 대시보드 및 보고서

### 15.1 메인 대시보드

```
┌─────────────────────────────────────────────────────────────┐
│                    금주 발주 현황                            │
├──────────────┬──────────────┬──────────────┬───────────────┤
│   발주 건수   │   총 수량    │   총 금액    │  완료율       │
│     45건     │   12,500건   │  4,500,000원 │    78%       │
└──────────────┴──────────────┴──────────────┴───────────────┘

┌─────────────────────────────┬─────────────────────────────┐
│     채널별 발주 현황         │      상태별 발주 현황        │
│  ┌────────────────────┐    │  ┌────────────────────┐    │
│  │ 피닉스  ████████ 35% │    │  │ 완료    ████████ 78% │    │
│  │ 말차    █████ 25%   │    │  │ 작업중  ███ 15%     │    │
│  │ 히든    ████ 20%    │    │  │ 발주대기 ██ 7%      │    │
│  │ 기타    ████ 20%    │    │  └────────────────────┘    │
│  └────────────────────┘    │                             │
└─────────────────────────────┴─────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      알림                                   │
├─────────────────────────────────────────────────────────────┤
│ ⚠️ 발주 마감 임박: 히든 채널 (오늘 19:00)                    │
│ 💰 미입금 매장 3건 (총 850,000원)                           │
│ 📊 키워드 순위 변동: 마르케 "강남카페" 5위→2위              │
└─────────────────────────────────────────────────────────────┘
```

### 15.2 보고서

| 보고서 | 내용 | 출력 |
|--------|------|------|
| 월간 발주 리포트 | 월별 발주 현황 집계 | Excel/PDF |
| 채널별 실적 | 채널별 발주/정산 현황 | Excel |
| 매장별 실적 | 매장별 발주/키워드 현황 | Excel |
| 파트너사별 실적 | 파트너사별 매출/수수료 | Excel |
| 키워드 순위 리포트 | 매장별 키워드 순위 추이 | Excel/PDF |

---

## 16. 시스템 관리

### 16.1 시스템 설정 (Super Admin)

```
[일반 설정]
- 회사 정보 (상호, 사업자번호, 대표자, 주소)
- 시스템 로고
- 기본 통화 / 날짜 형식

[바로빌 연동]
- API 인증 정보
- 자동발행 설정
- 동기화 스케줄

[Google 연동]
- 서비스 계정 인증
- 기본 폴더 ID

[알림 설정]
- 알림톡 발신 프로필
- 이메일 SMTP 설정
- 슬랙 웹훅

[크롤링 설정]
- 크롤링 주기
- 프록시 설정 (필요시)
- User-Agent 설정
```

### 16.2 공통 코드 관리

```
[common_codes]
- id (PK)
- group_code: status / product_type / category 등
- code
- name
- sort_order
- is_active
```

### 16.3 감사 로그

```
[audit_logs]
- id (PK)
- user_id (FK)
- action: create / update / delete / login / export
- target_type: store / order / settlement 등
- target_id
- before_value (JSON)
- after_value (JSON)
- ip_address
- user_agent
- created_at
```

### 16.4 데이터 백업

- 일일 자동 백업 (DB)
- 수동 백업/복원 기능
- 백업 이력 관리

---

## 17. 데이터 모델 (ERD)

### 17.1 핵심 테이블 관계

```
[tenants] 1──N [users]
[tenants] 1──N [stores]
[tenants] 1──N [quotations]
[tenants] 1──N [orders]
[tenants] 1──N [settlements]

[stores] 1──N [quotations]
[stores] 1──N [order_items]
[stores] 1──N [work_logs]
[stores] 1──N [store_keywords]
[stores] 1──N [keyword_rankings]

[quotations] 1──N [quotation_items]
[quotations] 1──N [orders]  (견적→발주 연동)

[channels] 1──N [orders]
[channels] 1──N [channel_templates]
[channels] 1──N [partner_prices]

[orders] N──1 [quotations]  (선택적 연결)
[orders] 1──N [order_items]
[orders] 1──N [order_exports]

[order_items] 1──N [work_logs]

[settlements] 1──1 [tax_invoices]
[settlements] 1──N [payment_records]
```

### 17.2 전체 테이블 목록

| 그룹 | 테이블 | 설명 |
|------|--------|------|
| 인증 | users | 사용자 |
| 인증 | tenants | 파트너사 |
| 매장 | stores | 매장 |
| 매장 | store_keywords | 매장 키워드 |
| 채널 | channels | 발주 채널 |
| 채널 | channel_templates | 채널 템플릿 |
| 채널 | partner_prices | 파트너 단가 |
| 견적 | quotations | 견적서 헤더 |
| 견적 | quotation_items | 견적서 항목 |
| 발주 | orders | 발주 헤더 |
| 발주 | order_items | 발주 상세 |
| 발주 | order_exports | 발주서 출력 이력 |
| 작업 | work_logs | 작업 로그 |
| 키워드 | keyword_rankings | 키워드 순위 |
| 키워드 | ranking_snapshots | 순위 스냅샷 |
| 정산 | settlements | 정산 |
| 정산 | payment_records | 입금 기록 |
| 정산 | tax_invoices | 세금계산서 |
| 정산 | bank_transactions | 계좌 거래내역 |
| 정산 | business_status_logs | 사업자 상태 |
| 시스템 | notification_settings | 알림 설정 |
| 시스템 | audit_logs | 감사 로그 |
| 시스템 | common_codes | 공통 코드 |

---

## 18. 기술 스택

### 18.1 권장 스택 (풀스택)

| 구분 | 기술 | 비고 |
|------|------|------|
| Frontend | Next.js 14 + TypeScript | App Router |
| Styling | TailwindCSS + shadcn/ui | |
| Backend | Next.js API Routes | |
| ORM | Prisma | |
| Database | PostgreSQL | Supabase 권장 |
| Auth | NextAuth.js | |
| 배포 | Vercel | |
| 크롤링 | Python + FastAPI | 별도 서비스 |
| 큐 | Redis + BullMQ | 크롤링 작업 큐 |

### 18.2 외부 API

| 서비스 | 용도 | 비고 |
|--------|------|------|
| Google Sheets API | 발주서 출력 | 서비스 계정 |
| 바로빌 API | 세금계산서/정산 | 유료 |
| 카카오 알림톡 API | 알림 발송 | 바로빌 통해 가능 |
| 네이버 플레이스 | 키워드 크롤링 | 자체 크롤러 |

---

## 19. 개발 우선순위

### Phase 1: MVP (핵심)
```
1. 로그인/인증 (단일 Admin)
2. 매장 관리 + Excel 업로드
3. 채널 관리
4. 발주 등록 (키워드 기반)
5. 발주 현황 조회
6. Google Sheets 발주서 출력
```

### Phase 2: 정산 + 트래킹
```
7. 발주 상태 관리 (플로우)
8. 대시보드
9. 정산 관리 (매출/비용)
10. 키워드 순위 트래킹 (기본)
11. 마케팅 작업 로그
12. 바로빌 - 사업자상태 조회
```

### Phase 3: 멀티테넌시
```
13. 파트너사 관리
14. 파트너사별 권한 분리
15. 파트너사별 단가 관리
16. 파트너 정산
```

### Phase 4: 자동화
```
17. 바로빌 - 세금계산서 발행
18. 바로빌 - 매입 조회
19. 바로빌 - 계좌조회 (입금확인)
20. 카카오 알림톡
21. 키워드 자동 발굴
22. 순위 변동 알림
```

### Phase 5: 고도화
```
23. 채널 API 연동 (자동 발주)
24. 리포트/통계 고도화
25. 모바일 반응형
26. 성능 최적화
```

---

## 20. 비기능 요구사항

### 20.1 보안

| 항목 | 요구사항 |
|------|----------|
| 인증 | 비밀번호 bcrypt 암호화 |
| 통신 | HTTPS 필수 |
| 세션 | 30분 타임아웃, JWT |
| 접근제어 | 역할 기반 권한 관리 |
| 감사 | 주요 액션 로그 기록 |
| 주입 방지 | SQL Injection, XSS 방지 |

### 20.2 성능

| 항목 | 요구사항 |
|------|----------|
| 매장 수 | 10,000개 이상 처리 |
| 발주 목록 | 2초 이내 로딩 |
| Excel 업로드 | 1,000건 30초 이내 |
| 키워드 체크 | 100개 키워드 5분 이내 |
| 동시 사용자 | 50명 이상 |

### 20.3 운영

| 항목 | 요구사항 |
|------|----------|
| 가용성 | 99% 이상 |
| 백업 | 일일 자동 백업 |
| 모니터링 | 에러 로깅 + 알림 |
| 복구 | RTO 4시간 이내 |

---

## 부록 A: 화면 목록

```
📊 대시보드
   └── 메인 대시보드

📝 견적서 관리
   ├── 견적서 목록
   ├── 견적서 등록
   ├── 견적서 상세/수정
   └── PDF 미리보기/다운로드

📦 발주 관리
   ├── 발주 등록
   ├── 발주 현황
   ├── 발주 상세
   └── 발주서 출력

🏪 매장 관리
   ├── 매장 목록
   ├── 매장 등록/수정
   ├── 매장 상세
   │    ├── 기본 정보
   │    ├── 발주 이력
   │    ├── 작업 로그
   │    └── 키워드 순위
   └── Excel 업로드

📡 채널 관리
   ├── 채널 목록
   ├── 채널 등록/수정
   └── 템플릿 설정

🔍 키워드 트래킹
   ├── 순위 현황
   ├── 키워드 발굴
   └── 순위 리포트

💰 정산 관리 (Admin)
   ├── 매출 정산
   ├── 비용 정산
   ├── 파트너 정산
   ├── 입금 확인
   └── 세금계산서

🏢 파트너 관리 (Super Admin)
   ├── 파트너사 목록
   ├── 파트너사 등록/수정
   ├── 파트너 단가 설정
   └── 파트너 정산

⚙️ 시스템 설정 (Admin)
   ├── 사용자 관리
   ├── 공통 코드
   ├── 바로빌 설정
   ├── Google 연동
   ├── 알림 설정
   └── 로그 조회
```

---

## 부록 B: 용어 정의

| 용어 | 설명 |
|------|------|
| MID | 네이버 플레이스 매장 고유 ID |
| 채널 | 마케팅 작업을 수행하는 대행업체 (피닉스, 말차, 히든 등) |
| 발주 | 채널에 마케팅 작업을 요청하는 것 |
| 정확매칭 | 검색 결과 상위 3위 이내 노출 |
| 자연유입 | 검색 결과 4~30위 노출 |
| 파트너사 | 본사 아래 영업/운영하는 대리점/지사 |
| 테넌트 | 멀티테넌시 구조에서 각 파트너사 단위 |

---

## 부록 C: 참고 자료

- [바로빌 개발자센터](https://dev.barobill.co.kr/)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [네이버 플레이스 키워드탐색 역공학 문서](./Reward_Keyword_Makers_Reverse_Engineering.md)

---

**문서 끝**
