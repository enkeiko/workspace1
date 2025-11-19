# 비즈니스 룰 정의서 - Phase 1

**프로젝트명**: 42ment 광고대행사 관리 시스템
**Phase**: 1 (MVP)
**버전**: 1.1
**작성일**: 2025-11-14

---

## 📌 개요

이 문서는 Phase 1 구현 시 필요한 핵심 비즈니스 룰을 정의합니다. 모든 개발자는 구현 전 이 문서를 숙지해야 합니다.

---

## 🔢 1. 번호 생성 규칙

### 1.1 견적서 번호 (Quote Number)

**포맷**: `Q-YYYYMM-XXX`

**예시**:
- `Q-202511-001` (2025년 11월 첫 번째 견적서)
- `Q-202511-002` (2025년 11월 두 번째 견적서)

**생성 규칙**:
1. 월별로 번호 리셋 (매월 1일 001부터 시작)
2. 3자리 일련번호 (001~999)
3. 999 초과 시 4자리로 확장
4. 트랜잭션 락으로 동시성 제어

**구현**:
```sql
-- sequence_counter 테이블에서 관리
-- 트랜잭션 내에서:
1. SELECT FOR UPDATE로 락 획득
2. last_number + 1
3. UPDATE last_number
4. 번호 생성 및 반환
```

---

### 1.2 주문 번호 (Order Number)

**포맷**: `O-YYYYMM-XXX`

**예시**:
- `O-202511-001`
- `O-202511-002`

**생성 규칙**: 견적서 번호와 동일

---

### 1.3 세금계산서 번호 (Invoice Number)

**포맷**: `I-YYYYMM-XXX`

**예시**:
- `I-202511-001`
- `I-202511-002`

**생성 규칙**: 견적서 번호와 동일

**추가 규칙**:
- 수정 세금계산서: `I-202511-001-M1` (M = Modified)
- 취소 세금계산서: `I-202511-001-C` (C = Cancelled)

---

## 💰 2. 가격 및 금액 계산 규칙

### 2.1 고객별 단가 우선순위

**우선순위**:
1. **고객별 특별 단가** (`client_product_price` 테이블)
2. **상품 기본 단가** (`product.default_price`)
3. **카테고리 기본 단가** (`product_category.default_price`)

**적용 규칙**:
```
IF client_product_price EXISTS AND valid_date_range THEN
    use client_product_price.custom_price
ELSE IF product EXISTS THEN
    use product.default_price
ELSE
    use product_category.default_price
END IF
```

**유효 기간 체크**:
- `effective_from <= 오늘 <= effective_until`
- `effective_until`이 NULL이면 무기한

---

### 2.2 부가세 계산 규칙

**기본 규칙**:
- 부가세율: **10%**
- `vat = ROUND(subtotal * 0.1)`
- `total = subtotal + vat`

**부가세 포함/별도 옵션**:

**별도 (vat_included = 'N')**:
```
subtotal = item1 + item2 + ...
vat = ROUND(subtotal * 0.1)
total = subtotal + vat
```

**포함 (vat_included = 'Y')**:
```
total = item1 + item2 + ...
subtotal = ROUND(total / 1.1)
vat = total - subtotal
```

**단수 처리**:
- 원 단위 반올림 (ROUND)
- 10원 단위 절사는 Phase 2에서 옵션으로 제공

**면세 처리 (Phase 1에서는 미지원)**:
- Phase 2에서 `tax_type` 필드 추가 예정

---

### 2.3 항목별 소계 계산

**QuoteItem / OrderItem**:
```
subtotal = quantity * unit_price
```

**견적서/주문 전체**:
```
subtotal = SUM(all items.subtotal)
vat = ROUND(subtotal * 0.1)
total = subtotal + vat
```

---

## 📊 3. 미수금 계산 규칙

### 3.1 기본 계산식

**고객별 미수금**:
```
미수금 = 총 세금계산서 발행액 - 총 입금액

WHERE:
  총 발행액 = SUM(invoice.total WHERE client_id = X)
  총 입금액 = SUM(payment.amount WHERE client_id = X)
```

### 3.2 세금계산서별 입금 상태

**Invoice.paid_amount 계산**:
```sql
-- Payment와 Invoice 연결된 경우
paid_amount = SUM(payment.amount WHERE invoice_id = invoice.id)

-- 연결되지 않은 경우
paid_amount = 0
```

**Invoice.is_paid 계산**:
```sql
is_paid = CASE
    WHEN paid_amount >= total THEN 'Y'
    ELSE 'N'
END
```

### 3.3 부분 입금 처리

**시나리오 1: 세금계산서에 직접 연결**
```
Invoice: 100만원
Payment 1: 50만원 (invoice_id 지정)
Payment 2: 50만원 (invoice_id 지정)

Result:
  paid_amount = 100만원
  is_paid = 'Y'
```

**시나리오 2: 고객에게만 연결**
```
Invoice 1: 100만원
Invoice 2: 200만원
Payment: 150만원 (invoice_id = NULL, client_id만 지정)

Result:
  고객 미수금 = 300만원 - 150만원 = 150만원
  (어느 세금계산서에 적용할지는 수동 매칭 필요)
```

### 3.4 초과 입금 (선수금)

**처리 방법**:
```
총 입금액 > 총 발행액인 경우:
  선수금 = 총 입금액 - 총 발행액
  미수금 = 0

대시보드에 "선수금" 표시
```

---

## 🔄 4. 상태 전이 규칙

### 4.1 견적서 (Quote) 상태 전이

**상태 목록**:
- `pending`: 대기 (초기 상태)
- `approved`: 승인됨
- `rejected`: 거절됨
- `converted`: 주문으로 전환됨

**전이 규칙**:
```mermaid
pending --> approved   (승인)
pending --> rejected   (거절)
approved --> converted (주문 전환)
pending --> converted  (직접 전환 허용)
```

**불가능한 전이**:
- `converted` → 다른 상태 (전환 후 변경 불가)
- `rejected` → `approved`
- `rejected` → `converted`

**전이 조건**:
- **converted**로 변경 시: Order 레코드 생성 필수
- **converted** 상태의 견적서는 수정/삭제 불가

---

### 4.2 주문 (Order) 상태 전이

**상태 목록**:
- `pending`: 대기 (초기 상태)
- `in_progress`: 진행중
- `completed`: 완료
- `cancelled`: 취소

**전이 규칙**:
```mermaid
pending --> in_progress (작업 시작)
pending --> cancelled   (취소)
in_progress --> completed (완료)
in_progress --> cancelled (취소, 단 세금계산서 미발행 시만)
```

**불가능한 전이**:
- `completed` → 다른 상태 (완료 후 변경 불가)
- `cancelled` → 다른 상태 (취소 후 복구 불가)

**전이 조건**:
- **cancelled**로 변경 시:
  - 연결된 Invoice가 없어야 함
  - Invoice가 있으면 오류 반환
  - 안내 메시지: "세금계산서가 발행된 주문은 취소할 수 없습니다"

---

### 4.3 세금계산서 (Invoice) 상태

**상태 목록 (invoice_type)**:
- `normal`: 정상 발행
- `modified`: 수정 세금계산서
- `cancelled`: 취소 세금계산서

**발행 규칙**:
1. **정상 발행 (normal)**:
   - 주문당 1개만 발행 가능
   - 중복 체크: `SELECT COUNT(*) FROM invoice WHERE order_id = X AND invoice_type = 'normal'`
   - 이미 있으면 오류

2. **수정 발행 (modified)**:
   - 원본 세금계산서 존재 필수
   - `original_invoice_id` 지정 필수
   - 원본의 `is_paid = 'Y'`이면 수정 불가

3. **취소 발행 (cancelled)**:
   - 원본 세금계산서 존재 필수
   - `original_invoice_id` 지정 필수
   - 원본의 `is_paid = 'Y'`이면 취소 불가
   - 취소 시 `total`, `vat`, `subtotal`은 음수로 기록

---

## 🔄 5. 견적서 → 주문 전환 규칙

### 5.1 전환 프로세스

**Step 1: 검증**
```
1. Quote.status = 'pending' OR 'approved'인지 확인
2. Quote가 이미 'converted'이면 오류
```

**Step 2: Order 생성**
```sql
INSERT INTO "order" (
    client_id,
    store_id,
    quote_id,
    order_number, -- 새로 생성
    order_date, -- 오늘 날짜
    status, -- 'pending'
    subtotal, -- Quote.subtotal 복사
    vat, -- Quote.vat 복사
    total, -- Quote.total 복사
    vat_included -- Quote.vat_included 복사
) VALUES (...);
```

**Step 3: OrderItem 복사**
```sql
INSERT INTO order_item (
    order_id,
    product_name,
    quantity,
    unit_price,
    subtotal,
    memo
)
SELECT
    [new_order_id],
    qi.product_name,
    qi.quantity,
    qi.unit_price, -- ⚠️ 전환 시점의 가격 고정
    qi.subtotal,
    qi.memo
FROM quote_item qi
WHERE qi.quote_id = [quote_id];
```

**Step 4: Quote 상태 업데이트**
```sql
UPDATE quote
SET status = 'converted'
WHERE id = [quote_id];
```

### 5.2 가격 변동 처리

**원칙**: **견적 시점의 가격을 주문에 고정**

**이유**:
- 견적 승인 후 가격이 변경되어도 고객에게 견적가 보장
- 가격 변동 시 새 견적서 발행 권장

**구현**:
- OrderItem에는 QuoteItem의 `unit_price`를 그대로 복사
- Product나 Category의 가격 변경과 무관하게 주문 가격 유지

---

## 📝 6. 고객별 단가 관리 규칙

### 6.1 단가 유효 기간

**설정 방법**:
```
effective_from: 2025-01-01
effective_until: 2025-12-31
```

**유효성 체크**:
```sql
WHERE effective_from <= CURRENT_DATE
  AND (effective_until IS NULL OR effective_until >= CURRENT_DATE)
```

### 6.2 중복 방지

**제약 조건**:
- 같은 고객, 같은 상품 카테고리에 대해
- 기간이 겹치는 단가는 등록 불가

**검증 로직**:
```sql
SELECT COUNT(*)
FROM client_product_price
WHERE client_id = X
  AND product_category_id = Y
  AND (
    (effective_from <= new_from AND effective_until >= new_from)
    OR (effective_from <= new_until AND effective_until >= new_until)
  );

-- COUNT > 0이면 중복
```

### 6.3 단가 히스토리 보존

**원칙**: 과거 단가는 삭제하지 않음

**이유**:
- 과거 견적서/주문의 가격 근거 보존
- 가격 변동 이력 추적

**구현**:
- Soft Delete 또는 `is_active` 플래그 사용
- 새 단가 등록 시 기존 단가의 `effective_until` 업데이트

---

## 🗑️ 7. 데이터 삭제 규칙

### 7.1 하드 삭제 (Hard Delete)

**허용**:
- `pending` 상태의 견적서 (전환되지 않은 경우)
- 연관 데이터가 없는 엔티티

**불가**:
- `converted` 상태의 견적서
- 세금계산서가 발행된 주문
- 입금이 있는 고객
- 매장이 있는 고객

### 7.2 소프트 삭제 (Soft Delete)

**Phase 1에서는 미구현**
- Phase 2에서 `deleted_at`, `deleted_by` 추가 예정

**임시 대안**:
- 고객: `status = 'inactive'`로 변경
- 기타: 삭제 전 연관 데이터 체크

---

## 📅 8. 날짜 관련 규칙

### 8.1 견적서/주문 날짜

**quote_date / order_date**:
- 기본값: 생성 당일 (CURRENT_DATE)
- 수동 변경 가능 (소급 등록 지원)
- 과거 날짜 허용, 미래 날짜 경고

### 8.2 납품 예정일

**delivery_date**:
- 필수 아님 (nullable)
- order_date보다 이전 날짜 불가
- 검증: `delivery_date >= order_date`

### 8.3 세금계산서 발행일

**issue_date**:
- 매출 인식 기준일
- 과거 날짜 허용 (소급 발행)
- 미래 날짜 불가
- 검증: `issue_date <= CURRENT_DATE`

### 8.4 입금일

**payment_date**:
- 과거 날짜 허용
- 미래 날짜 불가
- 검증: `payment_date <= CURRENT_DATE`

---

## 🔐 9. 보안 관련 규칙

### 9.1 광고 계정 비밀번호 암호화

**암호화 방식**: AES-256-CBC

**구현**:
```javascript
// 암호화
const encrypted = encrypt(plaintext, SECRET_KEY);

// 복호화 (필요 시에만)
const decrypted = decrypt(encrypted, SECRET_KEY);
```

**저장**:
- DB에는 암호화된 값만 저장
- 조회 시에도 기본적으로 마스킹 (`******`)
- "보기" 버튼 클릭 시에만 복호화하여 표시

### 9.2 API 키 암호화

**암호화 방식**: AES-256-CBC (비밀번호와 동일)

**추가 보안**:
- API 키 조회 로그 기록 (`audit_log`)
- 복호화 시도 횟수 제한 (1분에 10회)

---

## 📊 10. 매출 인식 규칙

### 10.1 매출 인식 시점

**기준**: **세금계산서 발행일** (`invoice.issue_date`)

**이유**:
- 세금계산서 발행 = 매출 발생
- 회계 처리 기준과 일치

**주문일 vs 발행일**:
- `order_date`: 내부 관리용
- `invoice.issue_date`: 회계/재무 기준

### 10.2 매출 집계 범위

**월별 매출**:
```sql
WHERE invoice.issue_date >= '2025-11-01'
  AND invoice.issue_date < '2025-12-01'
```

**분기별 매출**:
```sql
WHERE invoice.issue_date >= '2025-01-01'
  AND invoice.issue_date < '2025-04-01'
```

---

## 🔔 11. 알림 규칙

### 11.1 계약 만료 알림

**알림 시점**:
- D-30 (30일 전)
- D-7 (7일 전)
- D-Day (당일)

**알림 대상**:
```sql
WHERE contract.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL 30 DAY
```

**중복 알림 방지**:
- 하루에 1번만 알림 생성
- `notification` 테이블에 `created_at`으로 체크

### 11.2 광고 계정 만료 알림

**알림 시점**:
- D-30 (30일 전)
- D-7 (7일 전)
- D-Day (당일)

**알림 대상**:
```sql
WHERE ad_account.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL 30 DAY
  AND ad_account.status = 'active'
```

### 11.3 미수금 알림

**Phase 1에서는 미구현**
- Phase 2에서 지원 예정
- D+30, D+60, D+90 (입금 예정일 기준)

---

## 📄 12. 파일 업로드 규칙

### 12.1 허용 파일 형식

**이미지**:
- JPG, JPEG, PNG, GIF
- 최대 크기: 5MB

**문서**:
- PDF
- 최대 크기: 5MB

**Phase 1 제한**:
- Excel, Word 등은 Phase 2에서 지원

### 12.2 파일명 규칙

**저장 파일명**:
```
{timestamp}_{random_string}_{original_filename}

예시:
20251114153045_a7f3b2_계약서.pdf
```

**저장 경로**:
```
/uploads/{year}/{month}/{entity_type}/{entity_id}/

예시:
/uploads/2025/11/contract/123/20251114153045_a7f3b2_계약서.pdf
```

### 12.3 파일 삭제 규칙

**Hard Delete**:
- 엔티티 삭제 시 파일도 즉시 삭제
- 하지만 **연관 데이터가 있으면 엔티티 자체를 삭제 불가**

**Soft Delete (Phase 2)**:
- 파일 30일 보관 후 삭제

---

## 🔍 13. 검색 및 필터 규칙

### 13.1 검색 조건

**고객 검색**:
- 회사명 (부분 일치, LIKE '%keyword%')
- 담당자명 (부분 일치)
- 전화번호 (부분 일치)

**매장 검색**:
- 매장명 (부분 일치)
- 주소 (부분 일치)

**주문 검색**:
- 주문 번호 (완전 일치)
- 고객명 (부분 일치)
- 날짜 범위 (시작일 ~ 종료일)

### 13.2 정렬 기본값

- **고객 목록**: 최근 생성일 순 (created_at DESC)
- **주문 목록**: 최근 주문일 순 (order_date DESC)
- **세금계산서 목록**: 최근 발행일 순 (issue_date DESC)

---

## 🔄 14. 감사 로그 규칙

### 14.1 로그 대상

**필수 로그**:
- Quote: INSERT, UPDATE, DELETE
- Order: INSERT, UPDATE (status 변경), DELETE
- Invoice: INSERT, UPDATE, DELETE
- Payment: INSERT, UPDATE, DELETE
- Client: UPDATE (연락처, 계좌 변경)
- Contract: INSERT, UPDATE (금액 변경), DELETE

**제외**:
- 단순 조회 (SELECT)
- created_at, updated_at 자동 업데이트

### 14.2 로그 내용

**저장 정보**:
```json
{
  "table_name": "invoice",
  "record_id": 123,
  "action": "UPDATE",
  "field_name": "total",
  "old_value": "1000000",
  "new_value": "1100000",
  "user_id": "admin",
  "user_ip": "192.168.1.100",
  "created_at": "2025-11-14 15:30:45"
}
```

### 14.3 로그 보관

**보관 기간**:
- Phase 1: 무기한 보관
- Phase 2: 정책 수립 (예: 5년)

**접근 권한**:
- 관리자만 조회 가능
- 수정/삭제 불가 (immutable)

---

## 📝 15. 비즈니스 예외 처리

### 15.1 음수 금액

**허용**:
- 취소 세금계산서 (`invoice_type = 'cancelled'`)
- 환불 입금 (`payment.amount < 0`)

**불허**:
- 견적서, 주문의 금액은 항상 양수

### 15.2 0원 거래

**허용**:
- 무상 제공 주문 (total = 0)
- 샘플 제공 등

**처리**:
- vat = 0
- 정상 프로세스 진행

---

## 🔒 16. 동시성 제어

### 16.1 번호 생성

**방법**: SELECT FOR UPDATE

```sql
BEGIN TRANSACTION;

SELECT last_number
FROM sequence_counter
WHERE sequence_type = 'quote'
  AND year = 2025
  AND month = 11
FOR UPDATE;

UPDATE sequence_counter
SET last_number = last_number + 1
WHERE ...;

COMMIT;
```

### 16.2 재고 차감 (Phase 2)

Phase 1에서는 재고 관리 없음

---

## 📚 17. 문서 버전 관리

### 17.1 버전 규칙

**형식**: `major.minor.patch`

**예시**:
- 1.0: 초기 버전
- 1.1: 비즈니스 룰 추가
- 1.2: 계산 규칙 수정
- 2.0: Phase 2 (대규모 변경)

### 17.2 변경 이력

**v1.1 (2025-11-14)**:
- 고객별 단가 규칙 추가
- 미수금 계산 규칙 명확화
- 번호 생성 규칙 정의
- 상태 전이 규칙 상세화

**v1.0 (2025-11-14)**:
- 초기 비즈니스 룰 정의

---

**문서 버전**: 1.1
**최종 수정일**: 2025-11-14
**작성자**: Claude (PM)
**검토자**: (검토 필요)
**다음 검토 예정일**: Sprint 1 착수 전
