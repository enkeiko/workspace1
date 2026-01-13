# 42ment 네이버 플레이스 마케팅 ERP PRD v3.0 - 정산/바로빌

> **작성일**: 2026-01-12
> **버전**: 3.0
> **상태**: 최종 검토 대기

참조: `../../PRD_42ment_ERP_v3.0.md`

## 9. 정산 관리

### 9.1 정산 구조

```
[매출 정산] 매장 → 본사/파트너사
├── 매장별 월 발주 금액 집계
├── 입금 확인 처리
├── 미수금 관리
└── 세금계산서 발행

[비용 정산] 본사 → 상품
├── 상품별 월 발주 금액 집계
├── 지급 처리
└── 세금계산서 수신 확인

[파트너 정산] 본사 ↔ 파트너사
├── 파트너사별 월 매출 집계
├── 수수료(마진) 계산
└── 정산서 생성
```

### 9.2 작업 명세(Work Statement)

**정의:** 상품 작업 결과를 수량/기간 기준으로 확정한 정산 기준 문서

```
[work_statements]
- id (PK)
- purchase_order_id (FK)
- statement_no (unique) - 명세번호 (WS-YYYYMM-XXXX)
- period_start
- period_end
- status: draft / confirmed / locked
- confirmed_at
- confirmed_by (FK)
- created_at

[work_statement_items]
- id (PK)
- statement_id (FK)
- purchase_order_item_id (FK)
- completed_qty
- unit_price_snapshot
- amount
- note
- created_at
```

### 9.2.1 명세 생성 트리거

**자동 생성:**
| 트리거 | 조건 | 생성 내용 |
|--------|------|----------|
| 발주 완료 | status → completed | 발주 수량 기준 명세 초안 |
| 수주 동기화 | matched 건 발생 | 실제 완료 수량 기준 명세 |

**수동 생성:**
- 담당자가 발주 건 선택 → [명세 생성] 클릭
- 복수 발주 건을 하나의 명세로 묶기 가능 (같은 정산월 내)

**생성 규칙:**
```
1. 동일 발주에 대해 기존 명세(draft)가 있으면 업데이트
2. 명세가 confirmed 상태면 새 명세 생성
3. 수주 수량 > 발주 수량이면 경고 후 담당자 확인
```

### 9.2.2 명세→정산 연결

**정산 라인 자동 생성:**
```
명세 확정 (status: confirmed) 시:
  1. 해당 월 settlement 존재 여부 확인
     - 없으면: 신규 settlement 생성
     - 있으면: 기존 settlement에 추가
  2. settlement_lines 생성
     - supply_amount = work_statement_items.amount 합계
     - tax_amount = supply_amount × 0.1
     - total_amount = supply_amount + tax_amount
  3. settlement.settlement_amount 재계산
```

**정산월 그룹핑:**
- 명세의 period_end 기준으로 정산월(settlement_month) 결정
- 예: period_end = 2026-01-15 → settlement_month = 2026-01

### 9.3 정산 데이터

```
[settlements]
- id (PK)
- tenant_id (FK) - 파트너사 (null = 본사 직접)
- settlement_month - 정산월 (YYYY-MM)
- type: revenue / cost / partner
- target_type: store / product / partner
- target_id - 대상 ID
- statement_id (FK) - 연결된 명세
- order_amount - 발주 금액
- settlement_amount - 정산 금액
- commission_rate - 수수료율 (파트너 정산용)
- commission_amount - 수수료 금액
- tax_invoice_id (FK) - 연결된 세금계산서
- payment_status: pending / paid / overdue
- payment_date
- memo
- created_at

[settlement_lines]
- id (PK)
- settlement_id (FK)
- statement_item_id (FK)
- supply_amount
- tax_amount
- total_amount
- created_at
```

### 9.4 입금 확인

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


## 13. 바로빌 API 연동

### 13.1 연동 기능 요약

| 기능 | 용도 | 우선순위 |
|------|------|----------|
| 세금계산서 발행 | 매장에게 매출 계산서 발행 | 필수 |
| 홈택스 매입 조회 | 상품에서 받은 계산서 자동 수집 | 필수 |
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
2. 발행자(상품) 기준 분류
3. 발주 금액과 자동 매칭
4. 매칭 결과:
   - 일치 → 정산완료
   - 차이 → 확인 필요 알림
   - 미수신 → 상품에 발행 요청
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


## 14. API 명세

### 14.1 명세 API (Work Statement)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/work-statements | 명세 목록 조회 |
| POST | /api/work-statements | 명세 생성 |
| GET | /api/work-statements/[id] | 명세 상세 조회 |
| PUT | /api/work-statements/[id] | 명세 수정 (draft만) |
| DELETE | /api/work-statements/[id] | 명세 삭제 (draft만) |
| POST | /api/work-statements/[id]/confirm | 명세 확정 (→ 정산 라인 생성) |
| POST | /api/work-statements/bulk | 복수 발주 → 명세 일괄 생성 |

### 14.2 정산 API (Settlement)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/settlements | 정산 목록 조회 |
| GET | /api/settlements/[id] | 정산 상세 조회 |
| GET | /api/settlements/summary | 정산 현황 요약 (월별/타입별) |
| PUT | /api/settlements/[id] | 정산 수정 (메모 등) |
| POST | /api/settlements/[id]/complete | 정산 완료 처리 |

### 14.3 입금 API (Payment)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/payments | 입금 기록 목록 |
| POST | /api/payments | 입금 기록 생성 (수동) |
| PUT | /api/payments/[id] | 입금 기록 수정 |
| DELETE | /api/payments/[id] | 입금 기록 삭제 |
| POST | /api/payments/match | 입금-정산 자동 매칭 |

### 14.4 세금계산서 API (Tax Invoice)

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/tax-invoices | 세금계산서 목록 |
| POST | /api/tax-invoices/issue | 세금계산서 발행 (바로빌) |
| POST | /api/tax-invoices/issue-bulk | 일괄 발행 |
| POST | /api/tax-invoices/sync-purchase | 매입 세금계산서 동기화 |
| GET | /api/tax-invoices/[id] | 세금계산서 상세 |

### 14.5 바로빌 연동 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /api/barobill/check-business | 사업자등록 상태 조회 |
| POST | /api/barobill/check-business-bulk | 일괄 상태 조회 |
| POST | /api/barobill/sync-bank | 계좌 거래내역 동기화 |
| GET | /api/barobill/status | 바로빌 연결 상태 확인 |

---



