# 데이터베이스 스키마 설계 - Phase 1 (v1.1)

**프로젝트명**: 42ment 광고대행사 관리 시스템
**Phase**: 1 (MVP)
**버전**: 1.1 (업데이트)
**작성일**: 2025-11-14
**DB**: PostgreSQL (또는 MySQL)

---

## 📝 변경 이력

### v1.1 (2025-11-14)
- ✅ `client_product_price` 테이블 추가 (고객별 단가)
- ✅ `sequence_counter` 테이블 추가 (번호 생성 관리)
- ✅ `audit_log` 테이블 추가 (감사 로그)
- ✅ `notification` 테이블 추가 (알림 관리)
- ✅ `invoice` 테이블 수정 (paid_amount, invoice_type 등 추가)
- ✅ `client` 테이블 수정 (status, deactivated_at 추가)
- ✅ `contract` 테이블 수정 (parent_contract_id 등 추가)

### v1.0 (2025-11-14)
- 초기 스키마 설계 (15개 테이블)

---

## 📌 ERD 개요

```
CompanyInfo (1) ---- (N) BankAccount

Client (1) ---- (N) Store
Client (1) ---- (N) AdAccount
Client (1) ---- (N) ClientProductPrice ⭐ NEW
Client (1) ---- (N) Quote
Client (1) ---- (N) Order
Client (1) ---- (N) Contract
Client (1) ---- (N) Invoice
Client (1) ---- (N) Payment
Client (1) ---- (N) Report

ProductCategory (1) ---- (N) Product (선택사항)
ProductCategory (1) ---- (N) ClientProductPrice ⭐ NEW

Quote (1) ---- (N) QuoteItem
Order (1) ---- (N) OrderItem

Store (1) ---- (N) Order (nullable)
Store (1) ---- (N) Quote (nullable)
Store (1) ---- (N) Contract
Store (1) ---- (N) Report (nullable)

Quote (1) ---- (1) Order (nullable, 견적 → 주문 전환)

Order (1) ---- (N) Invoice (nullable)

Invoice (1) ---- (N) Payment (nullable, 부분 입금 지원)
Invoice (1) ---- (1) Invoice (self-reference, 수정/취소 세금계산서) ⭐ NEW

BankAccount (1) ---- (N) Payment (nullable)

-- 신규 테이블들 ⭐
SequenceCounter (번호 관리)
AuditLog (감사 로그)
Notification (알림)
```

---

## 🗂️ 테이블 정의

### 1. company_info (내정보)

회사의 기본 정보를 저장합니다.

```sql
CREATE TABLE company_info (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    ceo_name VARCHAR(100),
    business_number VARCHAR(50) UNIQUE,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    business_registration_file VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'admin'
);
```

**인덱스**:
```sql
CREATE INDEX idx_company_business_number ON company_info(business_number);
```

---

### 2. bank_account (회사 계좌)

회사의 은행 계좌 정보를 저장합니다.

```sql
CREATE TABLE bank_account (
    id SERIAL PRIMARY KEY,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_holder VARCHAR(100) NOT NULL,
    is_default CHAR(1) DEFAULT 'N' CHECK (is_default IN ('Y', 'N')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'admin'
);
```

**제약 조건**:
- 기본 계좌는 1개만 존재해야 함 (애플리케이션 레벨에서 제어)

**인덱스**:
```sql
CREATE INDEX idx_bank_is_default ON bank_account(is_default);
```

---

### 3. client (고객) ⭐ UPDATED

광고대행사의 고객 정보를 저장합니다.

```sql
CREATE TABLE client (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    ceo_name VARCHAR(100),
    contact_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    business_number VARCHAR(50),
    address TEXT,
    memo TEXT,

    -- 보고서 발송 정보
    report_frequency VARCHAR(20) DEFAULT 'none' CHECK (report_frequency IN ('weekly', 'monthly', 'quarterly', 'none')),
    report_day VARCHAR(20),
    report_emails TEXT,
    report_template VARCHAR(50) DEFAULT 'monthly_report' CHECK (report_template IN ('weekly_report', 'monthly_report')),
    report_enabled CHAR(1) DEFAULT 'N' CHECK (report_enabled IN ('Y', 'N')),

    -- ⭐ 고객 상태 관리 (v1.1 추가)
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    deactivated_at TIMESTAMP,
    deactivation_reason TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'admin'
);
```

**인덱스**:
```sql
CREATE INDEX idx_client_company_name ON client(company_name);
CREATE INDEX idx_client_contact_name ON client(contact_name);
CREATE INDEX idx_client_phone ON client(phone);
CREATE INDEX idx_client_report_enabled ON client(report_enabled);
CREATE INDEX idx_client_status ON client(status); -- ⭐ NEW
```

---

### 4. store (매장)

고객의 매장 정보를 저장합니다.

```sql
CREATE TABLE store (
    id SERIAL PRIMARY KEY,
    client_id INT NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    address TEXT,
    business_type VARCHAR(100),
    phone VARCHAR(20),
    memo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'admin',

    FOREIGN KEY (client_id) REFERENCES client(id) ON DELETE RESTRICT
);
```

**인덱스**:
```sql
CREATE INDEX idx_store_client_id ON store(client_id);
CREATE INDEX idx_store_name ON store(store_name);
```

---

### 5. ad_account (광고 계정)

고객별 광고 매체 계정 정보를 저장합니다.

```sql
CREATE TABLE ad_account (
    id SERIAL PRIMARY KEY,
    client_id INT NOT NULL,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('naver', 'google', 'meta', 'kakao', 'other')),
    account_id VARCHAR(255) NOT NULL,
    password TEXT,
    api_key TEXT,
    access_level VARCHAR(20) DEFAULT 'read' CHECK (access_level IN ('read', 'write', 'admin')),
    expiry_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    memo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'admin',

    FOREIGN KEY (client_id) REFERENCES client(id) ON DELETE CASCADE
);
```

**인덱스**:
```sql
CREATE INDEX idx_ad_account_client_id ON ad_account(client_id);
CREATE INDEX idx_ad_account_platform ON ad_account(platform);
CREATE INDEX idx_ad_account_expiry_date ON ad_account(expiry_date);
CREATE INDEX idx_ad_account_status ON ad_account(status);
```

**보안 고려사항**:
- `password`와 `api_key`는 AES-256으로 암호화하여 저장
- 복호화는 필요 시에만 수행

---

### 6. product_category (상품 카테고리)

판매 상품의 카테고리를 저장합니다.

```sql
CREATE TABLE product_category (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(255) NOT NULL,
    default_price DECIMAL(12, 2) DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'admin'
);
```

**인덱스**:
```sql
CREATE INDEX idx_category_name ON product_category(category_name);
```

---

### 7. product (상품) - 선택사항

판매 상품을 저장합니다.

```sql
CREATE TABLE product (
    id SERIAL PRIMARY KEY,
    category_id INT,
    product_name VARCHAR(255) NOT NULL,
    default_price DECIMAL(12, 2) DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'admin',

    FOREIGN KEY (category_id) REFERENCES product_category(id) ON DELETE SET NULL
);
```

**인덱스**:
```sql
CREATE INDEX idx_product_category_id ON product(category_id);
CREATE INDEX idx_product_name ON product(product_name);
```

---

### 8. client_product_price (고객별 단가) ⭐ NEW

고객별 특별 단가를 저장합니다.

```sql
CREATE TABLE client_product_price (
    id SERIAL PRIMARY KEY,
    client_id INT NOT NULL,
    product_category_id INT NOT NULL,
    custom_price DECIMAL(12, 2) NOT NULL,
    effective_from DATE NOT NULL,
    effective_until DATE,
    memo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'admin',

    FOREIGN KEY (client_id) REFERENCES client(id) ON DELETE CASCADE,
    FOREIGN KEY (product_category_id) REFERENCES product_category(id) ON DELETE CASCADE,
    UNIQUE(client_id, product_category_id, effective_from)
);
```

**인덱스**:
```sql
CREATE INDEX idx_client_price_client_id ON client_product_price(client_id);
CREATE INDEX idx_client_price_category_id ON client_product_price(product_category_id);
CREATE INDEX idx_client_price_effective ON client_product_price(effective_from, effective_until);
```

**비즈니스 룰**:
- 같은 고객, 같은 카테고리에 대해 기간이 겹치는 단가는 불가
- `effective_until`이 NULL이면 무기한 유효

---

### 9. quote (견적서)

고객에게 발행하는 견적서를 저장합니다.

```sql
CREATE TABLE quote (
    id SERIAL PRIMARY KEY,
    client_id INT NOT NULL,
    store_id INT,
    quote_number VARCHAR(50) UNIQUE NOT NULL,
    quote_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'converted')),
    subtotal DECIMAL(12, 2) DEFAULT 0.00,
    vat DECIMAL(12, 2) DEFAULT 0.00,
    total DECIMAL(12, 2) DEFAULT 0.00,
    vat_included CHAR(1) DEFAULT 'N' CHECK (vat_included IN ('Y', 'N')),
    memo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'admin',

    FOREIGN KEY (client_id) REFERENCES client(id) ON DELETE RESTRICT,
    FOREIGN KEY (store_id) REFERENCES store(id) ON DELETE SET NULL
);
```

**인덱스**:
```sql
CREATE INDEX idx_quote_client_id ON quote(client_id);
CREATE INDEX idx_quote_store_id ON quote(store_id);
CREATE INDEX idx_quote_number ON quote(quote_number);
CREATE INDEX idx_quote_date ON quote(quote_date);
CREATE INDEX idx_quote_status ON quote(status);
```

---

### 10. quote_item (견적 항목)

견적서의 개별 항목을 저장합니다.

```sql
CREATE TABLE quote_item (
    id SERIAL PRIMARY KEY,
    quote_id INT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT DEFAULT 1,
    unit_price DECIMAL(12, 2) DEFAULT 0.00,
    subtotal DECIMAL(12, 2) DEFAULT 0.00,
    memo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'admin',

    FOREIGN KEY (quote_id) REFERENCES quote(id) ON DELETE CASCADE
);
```

**인덱스**:
```sql
CREATE INDEX idx_quote_item_quote_id ON quote_item(quote_id);
```

---

### 11. order (주문)

실제 주문 정보를 저장합니다.

```sql
CREATE TABLE "order" (
    id SERIAL PRIMARY KEY,
    client_id INT NOT NULL,
    store_id INT,
    quote_id INT,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    order_date DATE NOT NULL,
    delivery_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    subtotal DECIMAL(12, 2) DEFAULT 0.00,
    vat DECIMAL(12, 2) DEFAULT 0.00,
    total DECIMAL(12, 2) DEFAULT 0.00,
    vat_included CHAR(1) DEFAULT 'N' CHECK (vat_included IN ('Y', 'N')),
    memo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'admin',

    FOREIGN KEY (client_id) REFERENCES client(id) ON DELETE RESTRICT,
    FOREIGN KEY (store_id) REFERENCES store(id) ON DELETE SET NULL,
    FOREIGN KEY (quote_id) REFERENCES quote(id) ON DELETE SET NULL
);
```

**인덱스**:
```sql
CREATE INDEX idx_order_client_id ON "order"(client_id);
CREATE INDEX idx_order_store_id ON "order"(store_id);
CREATE INDEX idx_order_quote_id ON "order"(quote_id);
CREATE INDEX idx_order_number ON "order"(order_number);
CREATE INDEX idx_order_date ON "order"(order_date);
CREATE INDEX idx_order_status ON "order"(status);
```

---

### 12. order_item (주문 항목)

주문의 개별 항목을 저장합니다.

```sql
CREATE TABLE order_item (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT DEFAULT 1,
    unit_price DECIMAL(12, 2) DEFAULT 0.00,
    subtotal DECIMAL(12, 2) DEFAULT 0.00,
    memo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'admin',

    FOREIGN KEY (order_id) REFERENCES "order"(id) ON DELETE CASCADE
);
```

**인덱스**:
```sql
CREATE INDEX idx_order_item_order_id ON order_item(order_id);
```

---

### 13. contract (계약서) ⭐ UPDATED

고객과의 계약 정보를 저장합니다.

```sql
CREATE TABLE contract (
    id SERIAL PRIMARY KEY,
    client_id INT NOT NULL,
    store_id INT,
    contract_name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    contract_amount DECIMAL(12, 2) DEFAULT 0.00,
    contract_summary TEXT,
    contract_file VARCHAR(500),

    -- ⭐ 계약 갱신 관리 (v1.1 추가)
    parent_contract_id INT,
    is_auto_renewal CHAR(1) DEFAULT 'N' CHECK (is_auto_renewal IN ('Y', 'N')),
    renewal_count INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'admin',

    FOREIGN KEY (client_id) REFERENCES client(id) ON DELETE RESTRICT,
    FOREIGN KEY (store_id) REFERENCES store(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_contract_id) REFERENCES contract(id) ON DELETE SET NULL -- ⭐ NEW
);
```

**인덱스**:
```sql
CREATE INDEX idx_contract_client_id ON contract(client_id);
CREATE INDEX idx_contract_store_id ON contract(store_id);
CREATE INDEX idx_contract_end_date ON contract(end_date);
CREATE INDEX idx_contract_parent_id ON contract(parent_contract_id); -- ⭐ NEW
```

---

### 14. invoice (세금계산서) ⭐ UPDATED

발행한 세금계산서 정보를 저장합니다.

```sql
CREATE TABLE invoice (
    id SERIAL PRIMARY KEY,
    client_id INT NOT NULL,
    order_id INT,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    issue_date DATE NOT NULL,
    subtotal DECIMAL(12, 2) DEFAULT 0.00,
    vat DECIMAL(12, 2) DEFAULT 0.00,
    total DECIMAL(12, 2) DEFAULT 0.00,
    invoice_file VARCHAR(500),

    -- ⭐ 입금 관리 개선 (v1.1 추가)
    paid_amount DECIMAL(12, 2) DEFAULT 0.00,
    is_paid CHAR(1) DEFAULT 'N' CHECK (is_paid IN ('Y', 'N')),

    -- ⭐ 세금계산서 유형 관리 (v1.1 추가)
    invoice_type VARCHAR(20) DEFAULT 'normal' CHECK (invoice_type IN ('normal', 'modified', 'cancelled')),
    original_invoice_id INT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'admin',

    FOREIGN KEY (client_id) REFERENCES client(id) ON DELETE RESTRICT,
    FOREIGN KEY (order_id) REFERENCES "order"(id) ON DELETE SET NULL,
    FOREIGN KEY (original_invoice_id) REFERENCES invoice(id) ON DELETE SET NULL -- ⭐ NEW
);
```

**인덱스**:
```sql
CREATE INDEX idx_invoice_client_id ON invoice(client_id);
CREATE INDEX idx_invoice_order_id ON invoice(order_id);
CREATE INDEX idx_invoice_number ON invoice(invoice_number);
CREATE INDEX idx_invoice_issue_date ON invoice(issue_date);
CREATE INDEX idx_invoice_is_paid ON invoice(is_paid);
CREATE INDEX idx_invoice_type ON invoice(invoice_type); -- ⭐ NEW
CREATE INDEX idx_invoice_original_id ON invoice(original_invoice_id); -- ⭐ NEW
```

**비즈니스 룰**:
- `paid_amount`: Payment 테이블에서 자동 집계
- `is_paid`: `paid_amount >= total`이면 'Y'
- `invoice_type = 'modified'` 또는 `'cancelled'`인 경우 `original_invoice_id` 필수

---

### 15. payment (입금)

입금 정보를 저장합니다.

```sql
CREATE TABLE payment (
    id SERIAL PRIMARY KEY,
    client_id INT NOT NULL,
    invoice_id INT,
    bank_account_id INT,
    payment_date DATE NOT NULL,
    amount DECIMAL(12, 2) DEFAULT 0.00,
    memo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'admin',

    FOREIGN KEY (client_id) REFERENCES client(id) ON DELETE RESTRICT,
    FOREIGN KEY (invoice_id) REFERENCES invoice(id) ON DELETE SET NULL,
    FOREIGN KEY (bank_account_id) REFERENCES bank_account(id) ON DELETE SET NULL
);
```

**인덱스**:
```sql
CREATE INDEX idx_payment_client_id ON payment(client_id);
CREATE INDEX idx_payment_invoice_id ON payment(invoice_id);
CREATE INDEX idx_payment_date ON payment(payment_date);
```

**트리거** (paid_amount 자동 갱신):
```sql
-- Payment INSERT/UPDATE/DELETE 시 Invoice.paid_amount 자동 갱신
CREATE OR REPLACE FUNCTION update_invoice_paid_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE invoice
        SET paid_amount = COALESCE((
            SELECT SUM(amount)
            FROM payment
            WHERE invoice_id = OLD.invoice_id
        ), 0),
        is_paid = CASE
            WHEN COALESCE((SELECT SUM(amount) FROM payment WHERE invoice_id = OLD.invoice_id), 0) >= total THEN 'Y'
            ELSE 'N'
        END
        WHERE id = OLD.invoice_id;
        RETURN OLD;
    ELSE
        UPDATE invoice
        SET paid_amount = COALESCE((
            SELECT SUM(amount)
            FROM payment
            WHERE invoice_id = NEW.invoice_id
        ), 0),
        is_paid = CASE
            WHEN COALESCE((SELECT SUM(amount) FROM payment WHERE invoice_id = NEW.invoice_id), 0) >= total THEN 'Y'
            ELSE 'N'
        END
        WHERE id = NEW.invoice_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_invoice_paid_amount
AFTER INSERT OR UPDATE OR DELETE ON payment
FOR EACH ROW
WHEN (NEW.invoice_id IS NOT NULL OR OLD.invoice_id IS NOT NULL)
EXECUTE FUNCTION update_invoice_paid_amount();
```

---

### 16. report (보고서)

고객에게 발송하는 보고서를 저장합니다.

```sql
CREATE TABLE report (
    id SERIAL PRIMARY KEY,
    client_id INT NOT NULL,
    store_id INT,
    report_period_start DATE NOT NULL,
    report_period_end DATE NOT NULL,
    template VARCHAR(50) DEFAULT 'monthly_report' CHECK (template IN ('weekly_report', 'monthly_report')),

    -- 성과 데이터
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    conversions INT DEFAULT 0,
    cost DECIMAL(12, 2) DEFAULT 0.00,
    keyword_ranking TEXT,
    review_count INT DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0.00,

    -- 보고서 내용
    summary TEXT,
    improvements TEXT,
    attachments TEXT,

    -- 발송 정보
    sent_at TIMESTAMP,
    sent_to TEXT,
    sent_method VARCHAR(20) DEFAULT 'manual' CHECK (sent_method IN ('email', 'kakao', 'manual')),
    sent_status VARCHAR(20) DEFAULT 'pending' CHECK (sent_status IN ('success', 'failed', 'pending')),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'admin',

    FOREIGN KEY (client_id) REFERENCES client(id) ON DELETE RESTRICT,
    FOREIGN KEY (store_id) REFERENCES store(id) ON DELETE SET NULL
);
```

**인덱스**:
```sql
CREATE INDEX idx_report_client_id ON report(client_id);
CREATE INDEX idx_report_store_id ON report(store_id);
CREATE INDEX idx_report_period_start ON report(report_period_start);
CREATE INDEX idx_report_period_end ON report(report_period_end);
CREATE INDEX idx_report_sent_at ON report(sent_at);
CREATE INDEX idx_report_sent_status ON report(sent_status);
```

---

### 17. sequence_counter (번호 관리) ⭐ NEW

견적서, 주문, 세금계산서 번호를 관리합니다.

```sql
CREATE TABLE sequence_counter (
    id SERIAL PRIMARY KEY,
    sequence_type VARCHAR(50) NOT NULL,
    prefix VARCHAR(10) NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    last_number INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(sequence_type, year, month)
);
```

**인덱스**:
```sql
CREATE INDEX idx_sequence_type ON sequence_counter(sequence_type, year, month);
```

**초기 데이터**:
```sql
INSERT INTO sequence_counter (sequence_type, prefix, year, month, last_number) VALUES
('quote', 'Q-', 2025, 11, 0),
('order', 'O-', 2025, 11, 0),
('invoice', 'I-', 2025, 11, 0);
```

**사용 예시**:
```sql
-- 번호 생성 (트랜잭션 필수)
BEGIN;

SELECT last_number
FROM sequence_counter
WHERE sequence_type = 'quote'
  AND year = 2025
  AND month = 11
FOR UPDATE;

UPDATE sequence_counter
SET last_number = last_number + 1,
    updated_at = CURRENT_TIMESTAMP
WHERE sequence_type = 'quote'
  AND year = 2025
  AND month = 11;

-- 생성된 번호: Q-202511-001 (last_number + 1을 3자리로 포맷)

COMMIT;
```

---

### 18. audit_log (감사 로그) ⭐ NEW

모든 중요 데이터 변경을 기록합니다.

```sql
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id INT NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    field_name VARCHAR(50),
    old_value TEXT,
    new_value TEXT,
    user_id VARCHAR(50) NOT NULL,
    user_ip VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**인덱스**:
```sql
CREATE INDEX idx_audit_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_created_at ON audit_log(created_at);
CREATE INDEX idx_audit_user_id ON audit_log(user_id);
```

**감사 대상**:
- Quote, Order, Invoice, Payment (필수)
- Client (연락처, 계좌 변경)
- Contract (금액 변경)

**트리거 예시** (Invoice 변경 시):
```sql
CREATE OR REPLACE FUNCTION log_invoice_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD.total != NEW.total THEN
            INSERT INTO audit_log (table_name, record_id, action, field_name, old_value, new_value, user_id)
            VALUES ('invoice', NEW.id, 'UPDATE', 'total', OLD.total::TEXT, NEW.total::TEXT, NEW.updated_by);
        END IF;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, action, field_name, new_value, user_id)
        VALUES ('invoice', NEW.id, 'INSERT', NULL, NULL, NEW.created_by);
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, action, field_name, old_value, user_id)
        VALUES ('invoice', OLD.id, 'DELETE', NULL, NULL, OLD.updated_by);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_log_invoice_changes
AFTER INSERT OR UPDATE OR DELETE ON invoice
FOR EACH ROW
EXECUTE FUNCTION log_invoice_changes();
```

---

### 19. notification (알림) ⭐ NEW

계약 만료, 계정 만료 등 알림을 관리합니다.

```sql
CREATE TABLE notification (
    id SERIAL PRIMARY KEY,
    notification_type VARCHAR(50) NOT NULL,
    reference_type VARCHAR(50),
    reference_id INT,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
    is_read CHAR(1) DEFAULT 'N' CHECK (is_read IN ('Y', 'N')),
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**인덱스**:
```sql
CREATE INDEX idx_notification_type ON notification(notification_type);
CREATE INDEX idx_notification_reference ON notification(reference_type, reference_id);
CREATE INDEX idx_notification_is_read ON notification(is_read);
CREATE INDEX idx_notification_created_at ON notification(created_at);
```

**알림 타입**:
- `contract_expiry`: 계약 만료 알림
- `ad_account_expiry`: 광고 계정 만료 알림
- `unpaid_invoice`: 미수금 알림 (Phase 2)

**생성 예시** (배치 작업):
```sql
-- 계약 만료 D-7 알림 생성
INSERT INTO notification (
    notification_type,
    reference_type,
    reference_id,
    title,
    message,
    priority
)
SELECT
    'contract_expiry',
    'contract',
    c.id,
    CONCAT('[', cl.company_name, '] 계약 만료 임박'),
    CONCAT('계약명: ', c.contract_name, ', 만료일: ', c.end_date, ' (D-', DATEDIFF(c.end_date, CURRENT_DATE), ')'),
    'high'
FROM contract c
JOIN client cl ON c.client_id = cl.id
WHERE c.end_date = CURRENT_DATE + INTERVAL 7 DAY
  AND NOT EXISTS (
      SELECT 1 FROM notification
      WHERE reference_type = 'contract'
        AND reference_id = c.id
        AND DATE(created_at) = CURRENT_DATE
  );
```

---

## 🔐 보안 및 제약 조건

### 1. 외래 키 제약 조건

- **ON DELETE RESTRICT**: 연관 데이터가 있으면 삭제 불가 (client, order 등)
- **ON DELETE CASCADE**: 부모 삭제 시 자식도 삭제 (quote_item, order_item, ad_account 등)
- **ON DELETE SET NULL**: 부모 삭제 시 NULL로 설정 (store_id, quote_id 등)

### 2. 암호화

- `ad_account.password`: AES-256 암호화
- `ad_account.api_key`: AES-256 암호화

### 3. 데이터 검증

- 모든 CHECK 제약 조건은 애플리케이션 레벨에서도 검증
- 필수 입력 항목은 NOT NULL로 지정

---

## 📊 주요 쿼리 예시

### 1. 고객별 미수금 조회 (개선)

```sql
SELECT
    c.id,
    c.company_name,
    COALESCE(SUM(i.total), 0) AS total_invoice,
    COALESCE(SUM(i.paid_amount), 0) AS total_payment,
    COALESCE(SUM(i.total - i.paid_amount), 0) AS unpaid_amount
FROM client c
LEFT JOIN invoice i ON c.id = i.client_id
WHERE i.invoice_type = 'normal' -- 정상 세금계산서만
GROUP BY c.id, c.company_name
HAVING COALESCE(SUM(i.total - i.paid_amount), 0) > 0
ORDER BY unpaid_amount DESC;
```

### 2. 고객별 단가 조회 (우선순위 적용)

```sql
-- 특정 고객의 특정 카테고리 단가 조회
SELECT
    COALESCE(cpp.custom_price, pc.default_price) AS final_price
FROM product_category pc
LEFT JOIN client_product_price cpp
    ON cpp.product_category_id = pc.id
    AND cpp.client_id = 123
    AND cpp.effective_from <= CURRENT_DATE
    AND (cpp.effective_until IS NULL OR cpp.effective_until >= CURRENT_DATE)
WHERE pc.id = 456;
```

### 3. 세금계산서 중복 발행 체크

```sql
-- 주문에 대한 정상 세금계산서가 이미 있는지 확인
SELECT COUNT(*)
FROM invoice
WHERE order_id = 789
  AND invoice_type = 'normal';

-- COUNT > 0이면 중복 발행 불가
```

### 4. 읽지 않은 알림 조회

```sql
SELECT
    n.id,
    n.title,
    n.message,
    n.priority,
    n.created_at
FROM notification n
WHERE n.is_read = 'N'
ORDER BY
    CASE n.priority
        WHEN 'high' THEN 1
        WHEN 'normal' THEN 2
        WHEN 'low' THEN 3
    END,
    n.created_at DESC;
```

### 5. 감사 로그 조회 (특정 세금계산서)

```sql
SELECT
    al.action,
    al.field_name,
    al.old_value,
    al.new_value,
    al.user_id,
    al.created_at
FROM audit_log al
WHERE al.table_name = 'invoice'
  AND al.record_id = 123
ORDER BY al.created_at DESC;
```

---

## 🔄 마이그레이션 전략

### 초기 설정

1. **테이블 생성 순서**:
   ```
   1. company_info
   2. bank_account
   3. client
   4. store
   5. ad_account
   6. product_category
   7. product (선택)
   8. client_product_price ⭐ NEW
   9. quote
   10. quote_item
   11. order
   12. order_item
   13. contract
   14. invoice
   15. payment
   16. report
   17. sequence_counter ⭐ NEW
   18. audit_log ⭐ NEW
   19. notification ⭐ NEW
   ```

2. **트리거 생성 순서**:
   ```
   1. update_invoice_paid_amount (payment 트리거)
   2. log_invoice_changes (invoice 트리거)
   3. log_payment_changes (payment 트리거)
   4. log_order_changes (order 트리거)
   ```

3. **초기 데이터**:
   ```sql
   -- company_info: 회사 기본 정보 1건
   -- bank_account: 기본 계좌 1건
   -- product_category: 기본 카테고리 (블로그, 카페, 지도 최적화 등)
   -- sequence_counter: 현재 연월로 초기화
   ```

---

## 📝 Phase 2-3 확장 고려사항

### 추가 예정 테이블

1. **purchase (구매 관리)**
2. **supplier (거래처)**
3. **campaign (캠페인)**
4. **task (작업/일정)**
5. **lead (리드/영업)**
6. **report_template (보고서 템플릿)**
7. **dashboard_cache (대시보드 캐시)**

### 기존 테이블 확장

1. **order_item**: `tax_type` (과세/면세/영세율)
2. **client**: `industry`, `company_size`
3. **invoice**: `due_date` (지급 기한)

---

**문서 버전**: 1.1
**최종 수정일**: 2025-11-14
**작성자**: Claude (Database Architect)
**검토자**: (검토 필요)
**다음 검토 예정일**: Sprint 1 착수 전
