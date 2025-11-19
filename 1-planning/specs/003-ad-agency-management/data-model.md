# 데이터베이스 스키마 설계 - Phase 1

**프로젝트명**: 42ment 광고대행사 관리 시스템
**Phase**: 1 (MVP)
**버전**: 1.0
**작성일**: 2025-11-14
**DB**: PostgreSQL (또는 MySQL)

---

## 📌 ERD 개요

```
CompanyInfo (1) ---- (N) BankAccount

Client (1) ---- (N) Store
Client (1) ---- (N) AdAccount
Client (1) ---- (N) Quote
Client (1) ---- (N) Order
Client (1) ---- (N) Contract
Client (1) ---- (N) Invoice
Client (1) ---- (N) Payment
Client (1) ---- (N) Report

Quote (1) ---- (N) QuoteItem
Order (1) ---- (N) OrderItem

ProductCategory (1) ---- (N) Product (선택사항)

Store (1) ---- (N) Order (nullable)
Store (1) ---- (N) Quote (nullable)
Store (1) ---- (N) Contract (nullable)
Store (1) ---- (N) Report (nullable)

Quote (1) ---- (1) Order (nullable, 견적 → 주문 전환)

Order (1) ---- (N) Invoice (nullable)

Invoice (1) ---- (N) Payment (nullable, 부분 입금 지원)

BankAccount (1) ---- (N) Payment (nullable)
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
    business_registration_file VARCHAR(500), -- 파일 경로
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

### 3. client (고객)

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
    report_day VARCHAR(20), -- 예: "Monday", "5"
    report_emails TEXT, -- 쉼표로 구분된 이메일 목록
    report_template VARCHAR(50) DEFAULT 'monthly_report' CHECK (report_template IN ('weekly_report', 'monthly_report')),
    report_enabled CHAR(1) DEFAULT 'N' CHECK (report_enabled IN ('Y', 'N')),

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
    business_type VARCHAR(100), -- 업종
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
    password TEXT, -- 암호화 저장 (AES-256 또는 bcrypt)
    api_key TEXT, -- 암호화 저장
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
- `password`와 `api_key`는 애플리케이션 레벨에서 암호화하여 저장
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

판매 상품을 저장합니다. (Phase 1에서는 선택사항)

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

### 8. quote (견적서)

고객에게 발행하는 견적서를 저장합니다.

```sql
CREATE TABLE quote (
    id SERIAL PRIMARY KEY,
    client_id INT NOT NULL,
    store_id INT,
    quote_number VARCHAR(50) UNIQUE NOT NULL, -- 예: Q-20251114-001
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

### 9. quote_item (견적 항목)

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

### 10. order (주문)

실제 주문 정보를 저장합니다.

```sql
CREATE TABLE "order" (
    id SERIAL PRIMARY KEY,
    client_id INT NOT NULL,
    store_id INT,
    quote_id INT, -- 견적서에서 전환된 경우
    order_number VARCHAR(50) UNIQUE NOT NULL, -- 예: O-20251114-001
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

### 11. order_item (주문 항목)

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

### 12. contract (계약서)

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
    contract_file VARCHAR(500), -- 파일 경로
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'admin',

    FOREIGN KEY (client_id) REFERENCES client(id) ON DELETE RESTRICT,
    FOREIGN KEY (store_id) REFERENCES store(id) ON DELETE SET NULL
);
```

**인덱스**:
```sql
CREATE INDEX idx_contract_client_id ON contract(client_id);
CREATE INDEX idx_contract_store_id ON contract(store_id);
CREATE INDEX idx_contract_end_date ON contract(end_date);
```

---

### 13. invoice (세금계산서)

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
    invoice_file VARCHAR(500), -- 파일 경로
    is_paid CHAR(1) DEFAULT 'N' CHECK (is_paid IN ('Y', 'N')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50) DEFAULT 'admin',

    FOREIGN KEY (client_id) REFERENCES client(id) ON DELETE RESTRICT,
    FOREIGN KEY (order_id) REFERENCES "order"(id) ON DELETE SET NULL
);
```

**인덱스**:
```sql
CREATE INDEX idx_invoice_client_id ON invoice(client_id);
CREATE INDEX idx_invoice_order_id ON invoice(order_id);
CREATE INDEX idx_invoice_number ON invoice(invoice_number);
CREATE INDEX idx_invoice_issue_date ON invoice(issue_date);
CREATE INDEX idx_invoice_is_paid ON invoice(is_paid);
```

---

### 14. payment (입금)

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

---

### 15. report (보고서)

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
    keyword_ranking TEXT, -- JSON 형태로 저장
    review_count INT DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0.00,

    -- 보고서 내용
    summary TEXT, -- 주요 성과 요약
    improvements TEXT, -- 개선 사항 및 특이사항
    attachments TEXT, -- JSON 배열 (파일 경로 목록)

    -- 발송 정보
    sent_at TIMESTAMP,
    sent_to TEXT, -- 쉼표로 구분된 이메일 목록
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

### 1. 고객별 미수금 조회

```sql
SELECT
    c.id,
    c.company_name,
    COALESCE(SUM(i.total), 0) AS total_invoice,
    COALESCE(SUM(p.amount), 0) AS total_payment,
    COALESCE(SUM(i.total), 0) - COALESCE(SUM(p.amount), 0) AS unpaid_amount
FROM client c
LEFT JOIN invoice i ON c.id = i.client_id
LEFT JOIN payment p ON c.id = p.client_id
GROUP BY c.id, c.company_name
HAVING COALESCE(SUM(i.total), 0) - COALESCE(SUM(p.amount), 0) > 0
ORDER BY unpaid_amount DESC;
```

---

### 2. 계약 만료 알림 (D-7 이내)

```sql
SELECT
    c.contract_name,
    cl.company_name,
    c.end_date,
    DATEDIFF(c.end_date, CURRENT_DATE) AS days_remaining
FROM contract c
JOIN client cl ON c.client_id = cl.id
WHERE c.end_date BETWEEN CURRENT_DATE AND DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY)
ORDER BY c.end_date ASC;
```

---

### 3. 월별 매출 요약

```sql
SELECT
    DATE_FORMAT(i.issue_date, '%Y-%m') AS month,
    COALESCE(SUM(i.total), 0) AS total_sales,
    COALESCE(SUM(p.amount), 0) AS total_received,
    COALESCE(SUM(i.total), 0) - COALESCE(SUM(p.amount), 0) AS unpaid
FROM invoice i
LEFT JOIN payment p ON i.client_id = p.client_id
    AND DATE_FORMAT(i.issue_date, '%Y-%m') = DATE_FORMAT(p.payment_date, '%Y-%m')
WHERE i.issue_date >= DATE_SUB(CURRENT_DATE, INTERVAL 6 MONTH)
GROUP BY DATE_FORMAT(i.issue_date, '%Y-%m')
ORDER BY month DESC;
```

---

### 4. 고객별 보고서 발송 대상 조회 (매주 월요일)

```sql
SELECT
    c.id,
    c.company_name,
    c.report_emails,
    c.report_template
FROM client c
WHERE c.report_enabled = 'Y'
    AND c.report_frequency = 'weekly'
    AND c.report_day = 'Monday'
    AND DAYNAME(CURRENT_DATE) = 'Monday';
```

---

### 5. 광고 계정 만료 알림 (D-30 이내)

```sql
SELECT
    c.company_name,
    a.platform,
    a.account_id,
    a.expiry_date,
    DATEDIFF(a.expiry_date, CURRENT_DATE) AS days_remaining
FROM ad_account a
JOIN client c ON a.client_id = c.id
WHERE a.status = 'active'
    AND a.expiry_date BETWEEN CURRENT_DATE AND DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY)
ORDER BY a.expiry_date ASC;
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
   8. quote
   9. quote_item
   10. order
   11. order_item
   12. contract
   13. invoice
   14. payment
   15. report
   ```

2. **초기 데이터**:
   - company_info: 회사 기본 정보 1건
   - bank_account: 기본 계좌 1건
   - product_category: 기본 카테고리 (블로그, 카페, 지도 최적화 등)

---

## 📝 추후 확장 고려사항

### Phase 2-3에서 추가할 테이블

1. **purchase (구매 관리)**
2. **supplier (거래처)**
3. **campaign (캠페인)**
4. **task (작업/일정)**
5. **lead (리드/영업)**
6. **audit_log (감사 로그)**

---

**문서 버전**: 1.0
**최종 수정일**: 2025-11-14
**작성자**: Claude (Database Architect)
**검토자**: (검토 필요)
