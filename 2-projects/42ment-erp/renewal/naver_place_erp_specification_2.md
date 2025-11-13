# 네이버 플레이스 SEO 광고대행 ERP 시스템 기획서

## 문서 정보
- **작성일**: 2025-11-13
- **버전**: 1.0
- **프로젝트명**: (미정 - 추후 결정)

---

## 1. 프로젝트 개요

### 1.1 목적
네이버 플레이스 SEO 마케팅을 중심으로 하는 광고대행사의 업무 전체를 관리하는 맞춤형 ERP 시스템 구축

### 1.2 핵심 가치 제안
- **현재**: 자사 마케팅 업무 자동화 및 효율화
- **중기**: 다른 광고대행사에게 ERP 서비스로 제공
- **장기**: 고객이 직접 발주할 수 있는 플랫폼으로 확장

### 1.3 시스템 특징
1. 네이버 플레이스 MID 기반 매장정보 자동 수집
2. 다양한 채널(네이버, 인스타, 유튜브, 다이닝코드 등) 통합 관리
3. 키워드 순위 추적 및 SEO 성과 측정
4. 자동화된 견적서/계산서 발행 및 정산 시스템
5. 일/주/월/분기별 데이터 조회 및 엑셀 다운로드

### 1.4 핵심 성공 요소
- 모든 기능과 데이터베이스의 철저한 문서화
- 확장 가능한 아키텍처 설계
- 외부 시스템과의 유연한 연동 구조

---

## 2. 시스템 아키텍처

### 2.1 전체 구조
```
┌─────────────────────────────────────────────────────────┐
│                    프론트엔드 (Web)                      │
│              - 대시보드 / CRM / 주문관리                 │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│                    백엔드 API 서버                       │
│         - RESTful API / GraphQL (선택)                  │
│         - 비즈니스 로직 처리                             │
└─────────────────────────────────────────────────────────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
┌───▼────┐         ┌───────▼──────┐      ┌───────▼──────┐
│  DB    │         │  크롤링 서버  │      │ 외부 API 연동│
│(PostgreSQL/│     │  (네이버 등) │      │ - 세금계산서 │
│ MySQL)  │         │              │      │ - 은행 API   │
└─────────┘         └──────────────┘      │ - 카카오톡   │
                                          │ - Google Drive│
                                          └──────────────┘
```

### 2.2 기술 스택 제안

#### 프론트엔드
- **Framework**: Next.js 14+ (React 기반)
- **UI Library**: shadcn/ui + Tailwind CSS
- **상태관리**: Zustand 또는 TanStack Query
- **차트/대시보드**: Recharts, Chart.js

#### 백엔드
- **Framework**: 
  - Option A: Node.js + Express/Fastify
  - Option B: Python + FastAPI (크롤링 통합 용이)
- **ORM**: Prisma (Node.js) / SQLAlchemy (Python)
- **인증**: JWT + OAuth 2.0

#### 데이터베이스
- **Main DB**: PostgreSQL (복잡한 관계형 데이터)
- **Cache**: Redis (순위 데이터, 세션)
- **File Storage**: AWS S3 / Google Cloud Storage

#### 크롤링 & 자동화
- **Playwright** (네이버 크롤링)
- **Puppeteer** (대체 옵션)
- **n8n** (워크플로우 자동화)

#### 외부 연동
- Naver API (가능한 범위)
- 홈택스 세금계산서 API
- 은행 오픈뱅킹 API
- 카카오톡 알림톡 API
- Google Drive API

---

## 3. 데이터베이스 설계

### 3.1 ERD 개요

#### 핵심 엔티티 관계
```
고객(Customer) N ─── M 매장(Store) [through store_stakeholders]
매장(Store) 1 ─── N 주문(Order)
매장(Store) 1 ─── N 키워드순위(KeywordRank)
매장(Store) 1 ─── N 진단보고서(Diagnosis)
주문(Order) 1 ─── N 주문상품(OrderItem)
주문(Order) 1 ─── 1 구매주문(PurchaseOrder)
상품(Product) N ─── M 거래처(Supplier)
사용자(User) N ─── M 역할(Role)
```

**관계 설계 주요 변경사항:**
- 고객-매장: 1:N → N:M (대행사, 프랜차이즈 본사 등 복잡한 관계 지원)
- 사용자-역할: 권한 관리를 위한 RBAC 구조 추가

### 3.2 주요 테이블 명세

#### 3.2.1 사용자 및 권한 관리

**users** (사용자)
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- bcrypt 해시
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    
    -- 상태
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    
    -- 보안
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(45),
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP,
    
    -- 메타
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
```

**roles** (역할)
```sql
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, -- 'admin', 'manager', 'staff', 'viewer'
    display_name VARCHAR(100),
    description TEXT,
    permissions JSONB, -- {"customers": ["read", "write"], "orders": ["read"]}
    is_system BOOLEAN DEFAULT FALSE, -- 시스템 기본 역할 (삭제 불가)
    created_at TIMESTAMP DEFAULT NOW()
);

-- 기본 역할 시드 데이터
INSERT INTO roles (name, display_name, is_system, permissions) VALUES
('admin', '관리자', TRUE, '{"*": ["*"]}'),
('manager', '매니저', TRUE, '{"customers": ["*"], "stores": ["*"], "orders": ["*"]}'),
('staff', '직원', TRUE, '{"stores": ["read", "update"], "work_history": ["*"]}'),
('viewer', '뷰어', TRUE, '{"*": ["read"]}');
```

**user_roles** (사용자-역할 매핑)
```sql
CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
```

**audit_logs** (감사 로그)
```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    
    -- 액션 정보
    entity_type VARCHAR(50) NOT NULL, -- 'customer', 'order', 'store' 등
    entity_id INT,
    action VARCHAR(20) NOT NULL, -- 'create', 'update', 'delete', 'login'
    
    -- 변경 내역
    changes JSONB, -- {"before": {...}, "after": {...}}
    
    -- 요청 정보
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

#### 3.2.2 내정보 관리

**my_company_info** (내 회사 정보)
```sql
CREATE TABLE my_company_info (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(200) NOT NULL,
    business_number VARCHAR(20) UNIQUE,
    ceo_name VARCHAR(100),
    tel VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    bank_account VARCHAR(100),
    logo_url TEXT,
    tax_invoice_api_key TEXT, -- 암호화 필요
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3.2.3 고객 관리

**customers** (고객 정보)
```sql
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    customer_code VARCHAR(50) UNIQUE, -- 고객코드 (자동생성)
    customer_type ENUM('individual', 'corporate'), -- 개인/법인
    
    -- 기본정보
    name VARCHAR(100) NOT NULL,
    business_number VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(100),
    
    -- 담당자 정보
    contact_name VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    
    -- 주소
    address TEXT,
    
    -- 계약정보
    contract_type ENUM('monthly', 'project', 'commission'), -- 월정액/프로젝트/수수료
    payment_terms INT DEFAULT 0, -- 결제조건 (당월/익월 등 일수)
    
    -- 문서
    business_registration_url TEXT, -- 사업자등록증
    contract_url TEXT, -- 계약서
    business_card_url TEXT, -- 명함
    
    -- 메모
    notes TEXT,
    tags TEXT[], -- 태그 (JSON 배열)
    
    -- 상태
    status ENUM('active', 'inactive', 'pending') DEFAULT 'active',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_customers_code ON customers(customer_code);
CREATE INDEX idx_customers_business_number ON customers(business_number);
```

**customer_conversations** (고객 중요 대화 기록)
```sql
CREATE TABLE customer_conversations (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
    conversation_date TIMESTAMP,
    conversation_type ENUM('call', 'meeting', 'email', 'message'),
    subject VARCHAR(200),
    content TEXT,
    attachments TEXT[], -- 첨부파일 URL 배열
    created_by INT, -- 작성자 (추후 user_id)
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversations_customer ON customer_conversations(customer_id);
```

#### 3.2.4 매장 정보 관리

**stores** (매장 정보)
```sql
CREATE TABLE stores (
    id SERIAL PRIMARY KEY,
    -- customer_id 제거 (다대다 관계로 변경)
    
    -- 네이버 플레이스 정보
    naver_mid VARCHAR(50) UNIQUE NOT NULL, -- 네이버 MID (고유키)
    naver_place_url TEXT,
    
    -- 기본 정보
    store_name VARCHAR(200) NOT NULL,
    category VARCHAR(100), -- 업종
    sub_category VARCHAR(100),
    
    -- 연락처
    phone VARCHAR(20),
    address TEXT,
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    
    -- 운영 정보
    business_hours JSONB, -- 영업시간 (JSON)
    holiday TEXT,
    description TEXT,
    
    -- 네이버 플레이스 계정 (암호화 필요)
    naver_account_id VARCHAR(100), -- 암호화
    naver_account_pw TEXT, -- 암호화
    
    -- 메타 정보
    profile_image_url TEXT,
    cover_images TEXT[], -- 커버 이미지들
    
    -- 통계 정보 (크롤링)
    review_count INT DEFAULT 0,
    review_avg_rating DECIMAL(2,1),
    visitor_review_count INT DEFAULT 0,
    blog_review_count INT DEFAULT 0,
    
    -- 외부 채널
    instagram_url TEXT,
    youtube_url TEXT,
    tiktok_url TEXT,
    kakao_map_url TEXT,
    dining_code_url TEXT,
    
    -- 구글 드라이브 연동
    google_drive_folder_id TEXT, -- 매장별 드라이브 폴더
    
    -- 상태
    status ENUM('active', 'inactive', 'paused') DEFAULT 'active',
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stores_mid ON stores(naver_mid);
```

**store_stakeholders** (매장-고객 관계)
```sql
CREATE TABLE store_stakeholders (
    id SERIAL PRIMARY KEY,
    store_id INT REFERENCES stores(id) ON DELETE CASCADE,
    customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
    
    -- 역할 정의
    role ENUM('owner', 'contract_party', 'manager', 'agency') NOT NULL,
    -- owner: 실제 매장 소유주
    -- contract_party: 계약 당사자 (청구 대상)
    -- manager: 매장 담당자
    -- agency: 대행사
    
    -- 권한
    is_billing_contact BOOLEAN DEFAULT FALSE, -- 청구서 수신 대상
    is_primary BOOLEAN DEFAULT FALSE, -- 주 담당자
    
    -- 메모
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(store_id, customer_id, role)
);

CREATE INDEX idx_stakeholders_store ON store_stakeholders(store_id);
CREATE INDEX idx_stakeholders_customer ON store_stakeholders(customer_id);
CREATE INDEX idx_stakeholders_billing ON store_stakeholders(is_billing_contact) WHERE is_billing_contact = TRUE;
```

**store_keywords** (매장 목표 키워드)
```sql
CREATE TABLE store_keywords (
    id SERIAL PRIMARY KEY,
    store_id INT REFERENCES stores(id) ON DELETE CASCADE,
    keyword VARCHAR(200) NOT NULL,
    keyword_type ENUM('primary', 'secondary', 'long_tail'), -- 메인/서브/롱테일
    search_volume INT, -- 월 검색량
    competition_level ENUM('low', 'medium', 'high'), -- 경쟁도
    is_active BOOLEAN DEFAULT TRUE,
    priority INT DEFAULT 0, -- 우선순위
    target_rank INT, -- 목표 순위
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_keywords_store ON store_keywords(store_id);
CREATE INDEX idx_keywords_active ON store_keywords(store_id, is_active);
```

**store_keyword_history** (키워드 변경 이력)
```sql
CREATE TABLE store_keyword_history (
    id SERIAL PRIMARY KEY,
    store_id INT REFERENCES stores(id) ON DELETE CASCADE,
    keyword_id INT REFERENCES store_keywords(id) ON DELETE SET NULL,
    
    keyword VARCHAR(200) NOT NULL, -- 비정규화 (키워드 삭제 시에도 이력 보존)
    action ENUM('added', 'removed', 'modified', 'activated', 'deactivated'),
    
    -- 변경 내용
    changes JSONB, -- {"target_rank": {"before": 5, "after": 3}}
    
    changed_by INT REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_keyword_history_store ON store_keyword_history(store_id);
CREATE INDEX idx_keyword_history_keyword ON store_keyword_history(keyword_id);
```

**keyword_rankings** (키워드 순위 기록)
```sql
CREATE TABLE keyword_rankings (
    id SERIAL PRIMARY KEY,
    store_id INT REFERENCES stores(id) ON DELETE CASCADE,
    keyword_id INT REFERENCES store_keywords(id) ON DELETE SET NULL,
    keyword VARCHAR(200) NOT NULL, -- 비정규화 (빠른 조회 및 키워드 삭제 시 이력 보존)
    
    -- 순위 정보
    rank_position INT, -- 순위 (0: 노출안됨, NULL: 데이터 없음)
    rank_date DATE NOT NULL,
    
    -- 추가 메트릭
    is_ad BOOLEAN DEFAULT FALSE, -- 광고 여부
    n2_score DECIMAL(10, 2), -- N2 지수
    
    -- 크롤링 메타데이터
    data_source VARCHAR(50), -- 'manual', 'adlog', 'crawler_naver', 'api'
    crawl_metadata JSONB, -- {"reliability": 0.95, "crawl_duration_ms": 1234, "retry_count": 0}
    
    -- 타임스탬프
    crawled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(store_id, keyword_id, rank_date, data_source) -- 같은 날짜, 같은 소스의 중복 방지
);

CREATE INDEX idx_rankings_store_date ON keyword_rankings(store_id, rank_date DESC);
CREATE INDEX idx_rankings_keyword_date ON keyword_rankings(keyword_id, rank_date DESC);
CREATE INDEX idx_rankings_source ON keyword_rankings(data_source);
```

#### 3.2.5 진단 및 보고서

**diagnoses** (진단 보고서)
```sql
CREATE TABLE diagnoses (
    id SERIAL PRIMARY KEY,
    store_id INT REFERENCES stores(id) ON DELETE CASCADE,
    diagnosis_type ENUM('initial', 'weekly', 'monthly', 'project'), -- 진단 유형
    diagnosis_date DATE NOT NULL,
    
    -- SEO 진단
    seo_score INT, -- 0-100 점수
    seo_issues JSONB, -- 발견된 이슈들
    seo_recommendations JSONB, -- 개선 권고사항
    
    -- 경쟁사 분석
    competitor_analysis JSONB,
    
    -- 상권 분석
    market_analysis JSONB,
    
    -- 콘텐츠 현황
    content_status JSONB,
    
    -- 보고서 파일
    report_url TEXT, -- PDF 보고서 URL
    
    created_by INT, -- 작성자
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_diagnoses_store ON diagnoses(store_id);
```

**store_work_history** (작업 히스토리)
```sql
CREATE TABLE store_work_history (
    id SERIAL PRIMARY KEY,
    store_id INT REFERENCES stores(id) ON DELETE CASCADE,
    order_id INT REFERENCES orders(id), -- 연결된 주문
    
    work_date DATE NOT NULL,
    work_type VARCHAR(100), -- 블로그, 리뷰, 광고세팅 등
    work_detail TEXT,
    work_count INT DEFAULT 1, -- 작업 수량
    
    -- 성과
    before_rank INT,
    after_rank INT,
    
    notes TEXT,
    attachments TEXT[], -- 작업 증빙 파일들
    
    created_by INT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_work_history_store ON store_work_history(store_id);
CREATE INDEX idx_work_history_date ON store_work_history(work_date);
```

#### 3.2.6 상품 관리

**product_categories** (상품 카테고리)
```sql
CREATE TABLE product_categories (
    id SERIAL PRIMARY KEY,
    parent_id INT REFERENCES product_categories(id), -- 대-중-소 분류
    category_name VARCHAR(100) NOT NULL,
    category_level INT NOT NULL, -- 1: 대, 2: 중, 3: 소
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_categories_parent ON product_categories(parent_id);
```

**products** (상품/서비스 품목)
```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id INT REFERENCES product_categories(id),
    
    product_code VARCHAR(50) UNIQUE,
    product_name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- 기본 단가
    base_price DECIMAL(10, 2) NOT NULL,
    cost_price DECIMAL(10, 2), -- 원가
    
    unit VARCHAR(20) DEFAULT '건', -- 단위
    
    -- 상태
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_products_code ON products(product_code);
CREATE INDEX idx_products_category ON products(category_id);
```

**customer_product_prices** (고객별 특별 단가)
```sql
CREATE TABLE customer_product_prices (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    
    custom_price DECIMAL(10, 2) NOT NULL,
    
    valid_from DATE,
    valid_until DATE,
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(customer_id, product_id)
);

CREATE INDEX idx_custom_prices_customer ON customer_product_prices(customer_id);
```

#### 3.2.7 판매/주문 관리

**orders** (주문/견적)
```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL, -- 주문번호 (자동생성)
    
    customer_id INT REFERENCES customers(id),
    store_id INT REFERENCES stores(id), -- 특정 매장 주문인 경우
    
    order_type ENUM('quote', 'order', 'contract'), -- 견적/주문/계약
    order_status ENUM('draft', 'sent', 'confirmed', 'in_progress', 'completed', 'cancelled'),
    
    -- 금액
    subtotal DECIMAL(10, 2) NOT NULL, -- 공급가액
    tax_amount DECIMAL(10, 2), -- 세액
    total_amount DECIMAL(10, 2) NOT NULL, -- 총액
    
    -- 날짜
    order_date DATE NOT NULL,
    start_date DATE, -- 작업 시작일
    end_date DATE, -- 작업 종료일
    
    -- 결제 정보
    payment_method VARCHAR(50),
    payment_status ENUM('unpaid', 'partial', 'paid', 'overdue'),
    payment_due_date DATE,
    
    -- 문서
    quote_pdf_url TEXT, -- 견적서 PDF
    contract_pdf_url TEXT, -- 계약서 PDF
    
    -- 메모
    notes TEXT,
    internal_notes TEXT, -- 내부 메모
    
    created_by INT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_date ON orders(order_date);
```

**order_items** (주문 상품 내역)
```sql
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id),
    
    product_name VARCHAR(200), -- 비정규화 (변경 이력 보존)
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    
    -- 할인
    discount_rate DECIMAL(5, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    
    subtotal DECIMAL(10, 2) NOT NULL, -- 소계
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
```

#### 3.2.8 구매/거래처 관리

**suppliers** (거래처)
```sql
CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    supplier_code VARCHAR(50) UNIQUE,
    supplier_name VARCHAR(200) NOT NULL,
    
    business_number VARCHAR(20),
    contact_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    
    address TEXT,
    website_url TEXT,
    
    -- 취급 품목/서비스
    service_types TEXT[], -- ['블로그', '리뷰', '광고' 등]
    
    -- 발주 방식
    order_sheet_url TEXT, -- 구글시트 등
    order_method ENUM('sheet', 'email', 'system', 'manual'),
    
    -- 문서
    business_card_url TEXT,
    contract_url TEXT,
    
    -- 결제 조건
    payment_terms TEXT,
    bank_account VARCHAR(100),
    
    notes TEXT,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_suppliers_code ON suppliers(supplier_code);
```

**supplier_products** (거래처별 상품 원가)
```sql
CREATE TABLE supplier_products (
    id SERIAL PRIMARY KEY,
    supplier_id INT REFERENCES suppliers(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    
    supplier_price DECIMAL(10, 2) NOT NULL, -- 매입가
    
    lead_time_days INT, -- 리드타임 (일)
    minimum_order_quantity INT,
    
    is_preferred BOOLEAN DEFAULT FALSE, -- 우선 거래처 여부
    
    valid_from DATE,
    valid_until DATE,
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(supplier_id, product_id)
);

CREATE INDEX idx_supplier_products_supplier ON supplier_products(supplier_id);
CREATE INDEX idx_supplier_products_product ON supplier_products(product_id);
```

**purchase_orders** (구매 주문)
```sql
CREATE TABLE purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL, -- 발주번호
    
    order_id INT REFERENCES orders(id), -- 연결된 판매주문
    supplier_id INT REFERENCES suppliers(id),
    store_id INT REFERENCES stores(id), -- 작업 대상 매장
    
    po_status ENUM('draft', 'sent', 'confirmed', 'in_progress', 'completed', 'cancelled'),
    
    -- 금액
    total_amount DECIMAL(10, 2) NOT NULL,
    
    -- 날짜
    po_date DATE NOT NULL,
    delivery_date DATE,
    completed_date DATE,
    
    -- 메모
    notes TEXT,
    
    created_by INT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_po_number ON purchase_orders(po_number);
CREATE INDEX idx_po_order ON purchase_orders(order_id);
CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
```

**purchase_order_items** (구매 주문 항목)
```sql
CREATE TABLE purchase_order_items (
    id SERIAL PRIMARY KEY,
    po_id INT REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id),
    
    product_name VARCHAR(200),
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    
    -- 작업 정보 (블로그/리뷰 등)
    work_details JSONB, -- 키워드, URL 등
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_po_items_po ON purchase_order_items(po_id);
```

#### 3.2.9 정산/입금 관리

**invoices** (세금계산서)
```sql
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    
    order_id INT REFERENCES orders(id),
    customer_id INT REFERENCES customers(id),
    
    invoice_type ENUM('tax_invoice', 'cash_receipt'), -- 세금계산서/현금영수증
    invoice_status ENUM('draft', 'issued', 'sent', 'paid', 'cancelled'),
    
    -- 금액
    supply_amount DECIMAL(10, 2) NOT NULL, -- 공급가액
    tax_amount DECIMAL(10, 2) NOT NULL, -- 세액
    total_amount DECIMAL(10, 2) NOT NULL, -- 합계
    
    -- 날짜
    issue_date DATE NOT NULL,
    
    -- 외부 API 정보
    external_invoice_id VARCHAR(100), -- 홈택스 등 외부 ID
    
    -- 문서
    invoice_pdf_url TEXT,
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_order ON invoices(order_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
```

**payments** (입금 기록)
```sql
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    
    invoice_id INT REFERENCES invoices(id),
    order_id INT REFERENCES orders(id),
    customer_id INT REFERENCES customers(id),
    
    -- 입금 정보
    payment_date DATE NOT NULL,
    payment_amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50),
    
    -- 은행 정보 (오픈뱅킹 API)
    bank_name VARCHAR(50),
    bank_transaction_id VARCHAR(100),
    depositor_name VARCHAR(100), -- 입금자명
    
    -- 매칭 상태
    match_status ENUM('auto_matched', 'manual_matched', 'unmatched'),
    matched_by INT, -- 매칭한 사용자
    matched_at TIMESTAMP,
    
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
```

**profit_analysis** (손익 분석)
```sql
CREATE TABLE profit_analysis (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id),
    
    -- 매출
    revenue DECIMAL(10, 2) NOT NULL,
    
    -- 비용
    cost_of_goods DECIMAL(10, 2), -- 매입원가
    operating_expenses DECIMAL(10, 2), -- 운영비용
    
    -- 손익
    gross_profit DECIMAL(10, 2), -- 매출총이익
    net_profit DECIMAL(10, 2), -- 순이익
    profit_margin DECIMAL(5, 2), -- 이익률 (%)
    
    analysis_date DATE NOT NULL,
    period_type ENUM('daily', 'weekly', 'monthly', 'quarterly'),
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_profit_order ON profit_analysis(order_id);
CREATE INDEX idx_profit_date ON profit_analysis(analysis_date);
```

#### 3.2.10 알림 및 스케줄

**notifications** (알림)
```sql
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    
    notification_type ENUM('payment_due', 'contract_expiry', 'work_deadline', 'keyword_rank_change', 'system'),
    
    related_entity VARCHAR(50), -- 'order', 'invoice', 'contract'
    related_id INT,
    
    title VARCHAR(200),
    message TEXT,
    
    recipient_type ENUM('internal', 'customer'),
    recipient_id INT,
    
    -- 발송
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP,
    send_method VARCHAR(20), -- 'kakao', 'email', 'sms', 'push'
    
    -- 읽음
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    
    scheduled_at TIMESTAMP, -- 예약 발송
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_type, recipient_id);
CREATE INDEX idx_notifications_sent ON notifications(is_sent, scheduled_at);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, is_read) WHERE is_read = FALSE;
```

**notification_preferences** (알림 설정)
```sql
CREATE TABLE notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    
    notification_type VARCHAR(50), -- 'payment_due', 'keyword_rank_change' 등
    
    -- 채널별 설정
    enabled BOOLEAN DEFAULT TRUE,
    channels TEXT[], -- ['kakao', 'email', 'sms', 'push']
    
    -- 알림 조건
    conditions JSONB, -- {"min_rank_change": 3, "time_range": "09:00-18:00"}
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(user_id, notification_type)
);

CREATE INDEX idx_notification_prefs_user ON notification_preferences(user_id);
```

**calendar_events** (캘린더 이벤트)
```sql
CREATE TABLE calendar_events (
    id SERIAL PRIMARY KEY,
    
    event_type ENUM('payment_due', 'contract_renewal', 'work_deadline', 'meeting'),
    
    related_entity VARCHAR(50),
    related_id INT,
    
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP,
    
    is_all_day BOOLEAN DEFAULT FALSE,
    
    -- 알림
    reminder_minutes INT[], -- [30, 1440] = 30분전, 1일전
    
    created_by INT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_calendar_events_date ON calendar_events(start_datetime);
```

---

## 4. 보안 설계

### 4.1 인증 (Authentication)

#### JWT 기반 인증 시스템
```typescript
// lib/auth/jwt.ts
import jwt from 'jsonwebtoken'

interface JWTPayload {
  userId: number
  email: string
  roles: string[]
}

export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: '1h'
  })
}

export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: '7d'
  })
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload
}
```

**refresh_tokens** 테이블
```sql
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
```

### 4.2 암호화 (Encryption)

#### 민감 정보 암호화
```typescript
// lib/crypto/encryption.ts
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

// 환경변수에서 Base64로 인코딩된 키 가져오기
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'base64')

export interface EncryptedData {
  encrypted: string
  iv: string
  authTag: string
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  // IV:AuthTag:EncryptedData 형식으로 저장
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decrypt(encryptedString: string): string {
  const [ivHex, authTagHex, encryptedText] = encryptedString.split(':')
  
  if (!ivHex || !authTagHex || !encryptedText) {
    throw new Error('Invalid encrypted data format')
  }
  
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

// 암호화 키 생성 (초기 설정 시 한 번만 실행)
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('base64')
}
```

**암호화 대상 필드:**
- stores.naver_account_pw
- my_company_info.tax_invoice_api_key
- 기타 API 키들

**사용 예:**
```typescript
// 저장 시
const encryptedPassword = encrypt(plainPassword)
await prisma.store.update({
  where: { id },
  data: { naver_account_pw: encryptedPassword }
})

// 조회 시
const store = await prisma.store.findUnique({ where: { id } })
const plainPassword = decrypt(store.naver_account_pw)
```

### 5.3 비밀번호 해싱

```typescript
// lib/auth/password.ts
import bcrypt from 'bcrypt'

const SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(
  password: string, 
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
```

### 5.4 권한 검증 (Authorization)

```typescript
// lib/auth/permissions.ts

type Permission = 'read' | 'create' | 'update' | 'delete' | '*'
type Resource = 'customers' | 'stores' | 'orders' | '*'

interface PermissionMap {
  [resource: string]: Permission[]
}

export function checkPermission(
  userRoles: Role[],
  resource: Resource,
  action: Permission
): boolean {
  for (const role of userRoles) {
    const permissions = role.permissions as PermissionMap
    
    // 전체 권한 체크
    if (permissions['*']?.includes('*')) return true
    
    // 특정 리소스 전체 권한
    if (permissions[resource]?.includes('*')) return true
    
    // 특정 액션 권한
    if (permissions[resource]?.includes(action)) return true
  }
  
  return false
}

// 미들웨어로 사용
export function requirePermission(resource: Resource, action: Permission) {
  return async (req: NextRequest) => {
    const user = await getCurrentUser(req)
    
    if (!checkPermission(user.roles, resource, action)) {
      return new Response('Forbidden', { status: 403 })
    }
    
    return NextResponse.next()
  }
}
```

### 5.5 Rate Limiting

```typescript
// lib/security/rate-limit.ts
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL!)

interface RateLimitConfig {
  windowMs: number  // 시간 윈도우 (밀리초)
  maxRequests: number  // 최대 요청 수
}

const rateLimitConfigs: Record<string, RateLimitConfig> = {
  api: { windowMs: 60000, maxRequests: 100 },  // 분당 100회
  crawl: { windowMs: 60000, maxRequests: 10 }, // 분당 10회
  login: { windowMs: 300000, maxRequests: 5 }  // 5분당 5회
}

export async function checkRateLimit(
  identifier: string,  // IP 또는 User ID
  type: keyof typeof rateLimitConfigs
): Promise<{ allowed: boolean; remaining: number }> {
  const config = rateLimitConfigs[type]
  const key = `ratelimit:${type}:${identifier}`
  
  const current = await redis.incr(key)
  
  if (current === 1) {
    await redis.pexpire(key, config.windowMs)
  }
  
  const allowed = current <= config.maxRequests
  const remaining = Math.max(0, config.maxRequests - current)
  
  return { allowed, remaining }
}

// Next.js 미들웨어에서 사용
export async function rateLimitMiddleware(
  req: NextRequest,
  type: keyof typeof rateLimitConfigs
) {
  const ip = req.ip || 'unknown'
  const { allowed, remaining } = await checkRateLimit(ip, type)
  
  if (!allowed) {
    return new Response('Too Many Requests', { 
      status: 429,
      headers: {
        'X-RateLimit-Remaining': '0',
        'Retry-After': '60'
      }
    })
  }
  
  const response = NextResponse.next()
  response.headers.set('X-RateLimit-Remaining', remaining.toString())
  
  return response
}
```

### 5.6 CSRF 보호

```typescript
// lib/security/csrf.ts
import { nanoid } from 'nanoid'

export function generateCSRFToken(): string {
  return nanoid(32)
}

export function verifyCSRFToken(token: string, storedToken: string): boolean {
  return token === storedToken
}

// API 라우트에서 사용
export async function POST(req: Request) {
  const csrfToken = req.headers.get('X-CSRF-Token')
  const sessionToken = await getSessionToken(req)
  
  if (!verifyCSRFToken(csrfToken, sessionToken)) {
    return new Response('Invalid CSRF Token', { status: 403 })
  }
  
  // ... 정상 처리
}
```

### 5.7 입력 검증 (Input Validation)

```typescript
// lib/validation/schemas.ts
import { z } from 'zod'

// 공통 스키마
export const emailSchema = z.string().email('유효한 이메일을 입력하세요')
export const phoneSchema = z.string().regex(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/, '유효한 전화번호를 입력하세요')
export const businessNumberSchema = z.string().regex(/^\d{3}-\d{2}-\d{5}$/, '올바른 사업자번호 형식입니다 (000-00-00000)')

// 고객 생성 스키마
export const createCustomerSchema = z.object({
  name: z.string().min(1, '이름은 필수입니다').max(100),
  businessNumber: businessNumberSchema.optional(),
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  contactName: z.string().max(100).optional(),
  address: z.string().max(500).optional()
})

// API에서 사용
export async function POST(req: Request) {
  const body = await req.json()
  
  try {
    const validated = createCustomerSchema.parse(body)
    // ... 검증된 데이터로 처리
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ errors: error.errors }, { status: 400 })
    }
    throw error
  }
}
```

### 5.8 XSS 방지

React는 기본적으로 XSS를 방지하지만, 다음 경우 주의:

```typescript
// ❌ 위험: dangerouslySetInnerHTML 사용
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ 안전: DOMPurify 사용
import DOMPurify from 'isomorphic-dompurify'

<div dangerouslySetInnerHTML={{ 
  __html: DOMPurify.sanitize(userInput) 
}} />
```

### 5.9 SQL Injection 방지

Prisma를 사용하면 자동으로 방지되지만, Raw Query 사용 시 주의:

```typescript
// ❌ 위험
const result = await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`

// ✅ 안전: Parameterized Query
const result = await prisma.$queryRaw`SELECT * FROM users WHERE email = ${Prisma.sql`${email}`}`

// ✅ 더 안전: Prisma 메서드 사용
const result = await prisma.user.findUnique({ where: { email } })
```

### 4.10 환경변수 관리

```bash
# .env.example (공개 가능)
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
ENCRYPTION_KEY="" # generateEncryptionKey()로 생성
JWT_SECRET="" # 랜덤 문자열 (최소 32자)
JWT_REFRESH_SECRET="" # 다른 랜덤 문자열
REDIS_URL="redis://localhost:6379"

# 외부 API
NAVER_CLIENT_ID=""
NAVER_CLIENT_SECRET=""
KAKAO_API_KEY=""
HOMETAX_API_KEY=""

# .env.local (실제 값, Git 제외)
# 실제 프로덕션 값 입력
```

**환경변수 검증:**
```typescript
// lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  ENCRYPTION_KEY: z.string().min(32),
  JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().url(),
  // ... 기타
})

export const env = envSchema.parse(process.env)
```

---

## 11. 기능 명세서

### 5.1 내정보 관리

#### 기능 목록
1. **회사 기본정보 관리**
   - 사업자등록증, 명함, 로고 등록
   - 계좌정보, 연락처 관리
   
2. **API 키 관리**
   - 세금계산서 API 키
   - 카카오톡 알림톡 API 키
   - 은행 오픈뱅킹 API 키
   - Google Drive API 인증정보

3. **템플릿 관리**
   - 견적서 템플릿
   - 계약서 템플릿
   - 보고서 템플릿

#### 화면 구성
- 설정 > 회사정보
- 설정 > API 연동
- 설정 > 문서 템플릿

---

### 5.2 고객정보 관리 (CRM)

#### 주요 기능

**4.2.1 고객 등록/수정**
- **자동 입력**: 
  - 사업자등록증 OCR (tesseract.js / Google Vision API)
  - 명함 OCR
- **수동 입력**: 
  - 기본정보, 담당자, 계약조건
- **문서 관리**:
  - 사업자등록증, 계약서, 명함 파일 업로드 및 관리

**4.2.2 고객 목록 및 검색**
- 검색 필터: 이름, 사업자번호, 상태, 태그
- 정렬: 등록일, 이름, 최근 거래일
- 엑셀 다운로드

**4.2.3 고객 상세 페이지**
- **Overview 탭**:
  - 기본정보 요약
  - 최근 주문 내역
  - 미수금 현황
  - 관리 중인 매장 목록
  
- **거래내역 탭**:
  - 주문/계약 목록
  - 입금 내역
  - 손익 현황
  
- **대화기록 탭**:
  - 통화/미팅/메일 기록
  - 타임라인 형식
  
- **문서 탭**:
  - 계약서, 견적서, 보고서 목록
  
- **매장 탭**:
  - 이 고객이 관리하는 매장 목록

**4.2.4 고객 중요 대화 기록**
- 대화 유형별 필터 (통화, 미팅, 이메일 등)
- 첨부파일 관리
- 검색 기능

#### API 엔드포인트
```
GET    /api/customers              # 고객 목록
POST   /api/customers              # 고객 등록
GET    /api/customers/:id          # 고객 상세
PUT    /api/customers/:id          # 고객 수정
DELETE /api/customers/:id          # 고객 삭제

POST   /api/customers/:id/conversations  # 대화 기록 추가
GET    /api/customers/:id/conversations  # 대화 기록 조회

POST   /api/customers/ocr          # OCR 처리
```

---

### 5.3 매장정보 관리

#### 주요 기능

**4.3.1 매장 등록**

**자동 크롤링 방식**:
```
입력: 네이버 플레이스 URL 또는 MID
      (예: https://m.place.naver.com/restaurant/1234567890/home)

자동 수집 정보:
1. 기본 정보
   - 매장명, 카테고리, 주소, 전화번호
   - 영업시간, 휴무일
   - 소개글
   
2. 통계 정보
   - 리뷰 개수, 평균 평점
   - 방문자 리뷰 수, 블로그 리뷰 수
   
3. 미디어
   - 프로필 이미지
   - 커버 이미지들
   
4. 외부 채널 자동 검색
   - 인스타그램 (매장명 + 지역 검색)
   - 유튜브 (매장명 검색)
   - 다이닝코드 (크롤링)
```

**크롤링 구현 방식**:
- Playwright 사용
- 주기적 업데이트 (일 1회, 또는 수동 트리거)
- 크롤링 큐 시스템 (대량 처리)

**수동 입력**:
- 네이버 계정 정보 (암호화 저장)
- 목표 키워드 설정
- Google Drive 폴더 연결

**4.3.2 매장 목록 및 검색**
- 고객별 필터링
- 상태별 필터링 (active/inactive/paused)
- 키워드 순위 현황 미리보기
- 대량 작업 (일괄 업데이트, 순위 조회 등)

**4.3.3 매장 상세 페이지**

**Overview 탭**:
- 기본정보 카드
- 최근 키워드 순위 차트
- 진행 중인 작업/주문
- 최근 작업 히스토리

**키워드 관리 탭**:
- 목표 키워드 목록
- 키워드별 순위 추이 그래프
- 키워드 추가/수정/삭제
- 목표 순위 설정

**순위 추적 탭**:
- 일별/주별/월별 순위 데이터 테이블
- 순위 변동 그래프
- 엑셀 다운로드
- 수동 순위 입력

**작업 히스토리 탭**:
- 작업 내역 타임라인
- 작업 전후 순위 비교
- 첨부파일 (작업 증빙)

**진단/보고서 탭**:
- 진단 보고서 목록
- 보고서 생성
- PDF 다운로드

**채널 관리 탭**:
- 네이버 플레이스 상태
- 인스타그램 현황
- 유튜브 현황
- 기타 채널 링크

**주문 탭**:
- 이 매장에 대한 주문 목록
- 빠른 주문 생성

#### API 엔드포인트
```
GET    /api/stores                      # 매장 목록
POST   /api/stores                      # 매장 등록
POST   /api/stores/crawl                # URL/MID로 크롤링
GET    /api/stores/:id                  # 매장 상세
PUT    /api/stores/:id                  # 매장 수정
DELETE /api/stores/:id                  # 매장 삭제

GET    /api/stores/:id/keywords         # 키워드 목록
POST   /api/stores/:id/keywords         # 키워드 추가
PUT    /api/stores/:id/keywords/:kid    # 키워드 수정
DELETE /api/stores/:id/keywords/:kid    # 키워드 삭제

GET    /api/stores/:id/rankings         # 순위 데이터 조회
POST   /api/stores/:id/rankings         # 순위 수동 입력
POST   /api/stores/:id/rankings/crawl   # 순위 크롤링

GET    /api/stores/:id/work-history     # 작업 히스토리
POST   /api/stores/:id/work-history     # 작업 기록 추가

GET    /api/stores/:id/diagnoses        # 진단 보고서 목록
POST   /api/stores/:id/diagnoses        # 진단 보고서 생성
```

---

### 5.4 진단 및 보고서

#### 5.4.1 매장 진단 기능

**진단 항목**:

1. **SEO 상태 진단**
   - 네이버 플레이스 프로필 완성도
   - 키워드 최적화 점수
   - 콘텐츠 발행 현황
   - 리뷰 관리 상태

2. **목표 키워드 분석**
   - 메인 키워드 순위
   - 서브 키워드 형성 상태
   - 경쟁사 대비 순위

3. **콘텐츠 현황**
   - 블로그 발행 현황
   - 리뷰 수 및 평점
   - 사진 업로드 현황

4. **상권 분석**
   - 지역별 검색량
   - 경쟁 매장 분석
   - 시장 기회 분석

5. **마케팅 계획**
   - 추천 마케팅 활동
   - 예상 비용
   - 예상 효과

**진단 프로세스**:
```
1. 데이터 수집
   - 매장 정보
   - 키워드 순위
   - 리뷰/콘텐츠 현황
   - 경쟁사 정보 (크롤링)

2. 분석 및 점수 산정
   - AI 분석 (Claude API 활용 가능)
   - 점수화 알고리즘

3. 보고서 생성
   - HTML/PDF 변환
   - 차트/그래프 포함

4. 저장 및 발송
   - DB 저장
   - 고객에게 카카오톡/이메일 발송
```

#### 5.4.2 보고서 유형

**초기 진단 보고서**:
- 매장 현황 전체 분석
- 문제점 및 개선방안
- 마케팅 제안

**주간 보고서**:
- 이번 주 작업 내역
- 키워드 순위 변동
- 다음 주 계획

**월간 보고서**:
- 월간 성과 요약
- 목표 대비 달성률
- 다음 달 전략

**프로젝트 완료 보고서**:
- 프로젝트 전체 요약
- Before/After 비교
- ROI 분석

#### API 엔드포인트
```
POST   /api/diagnoses/create            # 진단 시작
GET    /api/diagnoses/:id               # 진단 결과 조회
POST   /api/diagnoses/:id/report        # 보고서 생성 (PDF)
POST   /api/diagnoses/:id/send          # 보고서 발송
```

---

### 5.5 순위 관리

#### 5.5.1 순위 데이터 수집 방법

**방법 1: Adlog.kr 크롤링**
```
1. Playwright로 adlog.kr 접속
2. 매장별 키워드 입력 및 조회
3. HTML 테이블 파싱
4. DB 저장
```

**방법 2: Adlog.kr 엑셀 다운로드**
```
1. 사용자가 수동으로 엑셀 다운로드
2. 업로드 API로 파일 전송
3. 파싱 및 클리닝
4. DB 저장
```

**방법 3: 직접 크롤링**
```
1. 네이버 검색 결과 크롤링
2. 플레이스 순위 파싱
3. DB 저장
```

**방법 4: 수동 입력**
```
- 간단한 폼으로 순위 직접 입력
```

#### 5.5.2 순위 분석 기능

- **순위 추이 그래프**: 
  - 일/주/월별 그래프
  - 다중 키워드 비교
  - 작업 히스토리 오버레이

- **순위 변동 알림**:
  - 목표 순위 달성 시 알림
  - 순위 급락 시 알림 (5위 이상 하락)

- **경쟁사 비교**:
  - 동일 키워드 경쟁사 순위
  - 시장 점유율 분석

#### 5.5.3 데이터 관리

- **대량 업로드**:
  - 엑셀/CSV 템플릿 제공
  - 일괄 업로드 기능

- **데이터 정제**:
  - 중복 제거
  - 이상치 감지

- **엑셀 다운로드**:
  - 기간별 필터링
  - 매장별/키워드별 필터링
  - 피벗 테이블 형식 지원

#### API 엔드포인트
```
POST   /api/rankings/upload             # 엑셀 업로드
POST   /api/rankings/crawl              # 크롤링 실행
GET    /api/rankings/export             # 엑셀 다운로드
```

---

### 5.6 판매/주문 관리

#### 5.6.1 주문 생성 프로세스

**주문 생성 방법**:

1. **매장에서 직접 주문**:
   ```
   매장 상세 > "주문 생성" 버튼
   → 고객 정보 자동 입력
   → 상품 선택
   → 견적서 생성
   ```

2. **고객에서 주문**:
   ```
   고객 상세 > "주문 생성" 버튼
   → 매장 선택 (또는 신규 매장)
   → 상품 선택
   → 견적서 생성
   ```

3. **대량 주문 (엑셀)**:
   ```
   엑셀 템플릿 다운로드
   → 정보 입력 (고객, 매장, 상품)
   → 업로드
   → 검증 및 일괄 생성
   ```

**견적서 생성**:
- 템플릿 기반 PDF 생성
- 회사 로고, 인감 자동 삽입
- 고객별 커스텀 단가 자동 적용
- 미리보기 기능

**견적서 발송**:
- 카카오톡 알림톡 (템플릿 필요)
- 이메일 (첨부파일)
- SMS (링크)

#### 5.6.2 주문 상태 관리

**상태 흐름**:
```
견적 (draft/sent) 
→ 확정 (confirmed) 
→ 작업중 (in_progress) 
→ 완료 (completed)
→ (취소 cancelled)
```

**상태별 액션**:
- **견적**: 수정, 발송, 삭제
- **확정**: 계약서 생성, 작업 시작, 구매발주
- **작업중**: 진행상황 업데이트, 작업기록
- **완료**: 계산서 발행, 보고서 생성

#### 5.6.3 상품 관리

**상품 카테고리**:
```
대분류: 네이버플레이스, SNS마케팅, 콘텐츠제작
├─ 중분류: 블로그, 리뷰, 광고
   ├─ 소분류: 체험단, 일반 블로그, 파워블로거
      └─ 품목: 파워블로거 포스팅 1건
```

**품목 정보**:
- 품목명, 설명
- 기본 단가 (공급가)
- 원가 (선택)
- 단위 (건, 개월, 회 등)

**고객별 특별 단가**:
- 고객별로 특정 품목 단가 별도 설정
- 유효기간 설정 가능

#### API 엔드포인트
```
GET    /api/orders                      # 주문 목록
POST   /api/orders                      # 주문 생성
POST   /api/orders/bulk                 # 대량 주문 (엑셀)
GET    /api/orders/:id                  # 주문 상세
PUT    /api/orders/:id                  # 주문 수정
DELETE /api/orders/:id                  # 주문 삭제

POST   /api/orders/:id/quote            # 견적서 생성
POST   /api/orders/:id/send             # 견적서 발송
POST   /api/orders/:id/confirm          # 주문 확정

GET    /api/products                    # 상품 목록
POST   /api/products                    # 상품 생성
GET    /api/products/:id                # 상품 상세
PUT    /api/products/:id                # 상품 수정

GET    /api/categories                  # 카테고리 목록
POST   /api/categories                  # 카테고리 생성
```

---

### 5.7 구매/거래처 관리

#### 5.7.1 거래처 관리

**거래처 등록**:
- 기본정보 (사업자번호, 연락처 등)
- 취급 서비스 유형
- 발주 방식 (구글시트, 이메일, 시스템, 수동)
- 결제 조건

**거래처별 상품 원가 관리**:
- 거래처마다 동일 상품의 원가가 다를 수 있음
- 우선 거래처 설정
- 리드타임, 최소 주문량 설정

#### 5.7.2 구매 발주 프로세스

**발주 생성**:
```
1. 판매주문 확정 후 "구매발주" 버튼
2. 자동으로 주문 항목 불러오기
3. 거래처 선택
   - 시스템이 최적 거래처 추천 (원가, 리드타임 고려)
4. 원가 확인 및 조정
5. 발주서 생성
```

**발주 방식별 처리**:

1. **구글시트 연동**:
   ```
   - 거래처별 구글시트 템플릿
   - API로 자동 입력 (MID, 키워드 등)
   - 발주 완료 통지
   ```

2. **이메일 발주**:
   ```
   - 이메일 템플릿 생성
   - 첨부파일 (엑셀 또는 PDF)
   - 자동 발송
   ```

3. **시스템 연동**:
   ```
   - 거래처 시스템 API 연동
   - 자동 발주 생성
   ```

4. **수동 발주**:
   ```
   - 발주서 PDF 생성
   - 수동으로 전달
   ```

#### 5.7.3 구매 관리

**발주 상태 관리**:
- draft → sent → confirmed → in_progress → completed

**작업 정보 관리**:
- 블로그: 키워드, URL, 작성일
- 리뷰: 키워드, 플랫폼
- 광고: 캠페인 정보

**완료 처리**:
- 작업 증빙 첨부 (스크린샷 등)
- 매장 작업 히스토리에 자동 기록

#### API 엔드포인트
```
GET    /api/suppliers                   # 거래처 목록
POST   /api/suppliers                   # 거래처 등록
GET    /api/suppliers/:id               # 거래처 상세
PUT    /api/suppliers/:id               # 거래처 수정

GET    /api/purchase-orders             # 구매발주 목록
POST   /api/purchase-orders             # 구매발주 생성
GET    /api/purchase-orders/:id         # 구매발주 상세
PUT    /api/purchase-orders/:id         # 구매발주 수정

POST   /api/purchase-orders/:id/send    # 발주 전송
```

---

### 5.8 정산/입금/매출 관리

#### 5.8.1 계산서 발행

**세금계산서 발행 프로세스**:
```
1. 주문 완료 후 "계산서 발행" 버튼
2. 세금계산서 정보 확인
   - 공급자: 내 회사 정보 (자동)
   - 공급받는자: 고객 정보 (자동)
   - 품목 및 금액 (주문 정보 기반)
3. 홈택스 API 연동하여 전자세금계산서 발행
4. 발행 완료 시 고객에게 알림
```

**현금영수증**:
- 간이과세자 또는 개인 고객용
- 발행 프로세스 동일

**발송**:
- 카카오톡 알림톡 (계산서 링크)
- 이메일 (PDF 첨부)
- SMS

#### 5.8.2 입금 관리

**입금 데이터 수집**:
1. **은행 오픈뱅킹 API 연동**:
   ```
   - 일일 1회 또는 실시간 입금내역 가져오기
   - 거래일시, 금액, 입금자명, 적요
   ```

2. **수동 입력**:
   ```
   - 입금 정보 직접 입력
   ```

**입금 매칭**:
1. **자동 매칭 로직**:
   ```python
   if 입금금액 == 계산서금액 AND (입금자명 == 고객명 OR 사업자번호):
       자동매칭
   elif 입금금액 == 주문금액:
       자동매칭 (계산서 미발행 케이스)
   else:
       수동매칭 대상
   ```

2. **수동 매칭**:
   ```
   - 미매칭 입금 목록 표시
   - 가능한 주문/계산서 목록 추천
   - 수동으로 선택하여 매칭
   ```

**미수금 관리**:
- 고객별 미수금 현황
- 결제 예정일 초과 알림
- 독촉 자동화 (선택)

#### 5.8.3 손익 분석

**손익 계산**:
```
매출액 = 판매 주문 금액
매출원가 = 구매 발주 금액
매출총이익 = 매출액 - 매출원가
매출총이익률 = (매출총이익 / 매출액) × 100

순이익 = 매출총이익 - 운영비용 (선택 입력)
```

**분석 기간**:
- 일별, 주별, 월별, 분기별
- 커스텀 기간 선택

**분석 차원**:
- 전체
- 고객별
- 매장별
- 상품 카테고리별
- 거래처별

#### 5.8.4 대시보드

**매출 현황**:
- 이번 달 매출액, 순이익
- 목표 대비 달성률
- 전월 대비 증감

**입금 현황**:
- 이번 달 입금액
- 미수금 총액
- 기한 초과 미수금

**주문 현황**:
- 진행 중인 주문 개수
- 이번 주 완료 주문

**키워드 순위 현황**:
- 목표 달성 매장 수
- 평균 순위 변동

#### API 엔드포인트
```
GET    /api/invoices                    # 계산서 목록
POST   /api/invoices                    # 계산서 발행
GET    /api/invoices/:id                # 계산서 상세
POST   /api/invoices/:id/send           # 계산서 발송

GET    /api/payments                    # 입금 내역
POST   /api/payments                    # 입금 수동 입력
POST   /api/payments/sync               # 은행 API 동기화
POST   /api/payments/:id/match          # 입금 매칭

GET    /api/reports/profit              # 손익 분석
GET    /api/reports/revenue             # 매출 분석
GET    /api/reports/dashboard           # 대시보드 데이터
```

---

### 5.9 알림 및 스케줄

#### 5.9.1 알림 유형

**결제 관련**:
- 계산서 발행 알림
- 결제 예정일 알림 (D-7, D-3, D-Day)
- 입금 확인 알림

**계약 관련**:
- 계약 만료 예정 알림 (D-30, D-14, D-7)
- 계약 갱신 필요

**작업 관련**:
- 작업 마감일 알림
- 구매 발주 완료 알림
- 작업 완료 알림

**성과 관련**:
- 목표 순위 달성 알림
- 순위 급락 알림 (5위 이상 하락)

#### 5.9.2 알림 발송 방법

- 카카오톡 알림톡 (우선)
- 이메일
- SMS
- 시스템 내 알림

#### 5.9.3 캘린더 연동

**구글 캘린더 연동**:
- 주요 일정 자동 등록
- 양방향 동기화 (선택)

**자체 캘린더**:
- 결제일, 계약갱신일, 작업마감일 등
- 월간/주간 뷰
- 일정 알림

#### API 엔드포인트
```
GET    /api/notifications               # 알림 목록
POST   /api/notifications               # 알림 생성
PUT    /api/notifications/:id/read      # 알림 읽음 처리

GET    /api/calendar/events             # 캘린더 일정
POST   /api/calendar/events             # 일정 생성
```

---

## 11. 화면 설계 (Wireframe 개념)

### 5.1 레이아웃 구조

```
┌────────────────────────────────────────────────────────┐
│  [로고]  네이버플레이스 ERP        [알림] [프로필]     │
├────────────────────────────────────────────────────────┤
│ 사이드바 │              메인 컨텐츠 영역                │
│         │                                              │
│ 대시보드 │                                              │
│ 고객관리 │                                              │
│ 매장관리 │                                              │
│ 주문관리 │                                              │
│ 구매관리 │                                              │
│ 정산관리 │                                              │
│ 보고서   │                                              │
│ 설정     │                                              │
│         │                                              │
└─────────┴──────────────────────────────────────────────┘
```

### 5.2 주요 화면

#### 5.2.1 대시보드
```
┌─────────────────────────────────────────────────────┐
│ 이번 달 요약                                         │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐│
│ │ 매출액   │ │ 입금액   │ │ 미수금   │ │ 순이익   ││
│ │ 5,000만원│ │ 4,200만원│ │ 800만원  │ │ 1,200만원││
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘│
├─────────────────────────────────────────────────────┤
│ 매출 추이 그래프 (최근 6개월)                        │
│ [선 그래프]                                          │
├─────────────────────────────────────────────────────┤
│ 최근 주문         │  키워드 순위 현황                │
│ - 주문 #1234     │  목표 달성: 15/30 매장           │
│ - 주문 #1235     │  평균 순위: 3.2위                │
│ - 주문 #1236     │  순위 상승: 12 매장              │
├─────────────────────────────────────────────────────┤
│ 알림 & 할일                                          │
│ - 계산서 발행 필요 (3건)                             │
│ - 결제 예정일 임박 (2건)                             │
│ - 계약 갱신 필요 (1건)                               │
└─────────────────────────────────────────────────────┘
```

#### 5.2.2 고객 목록
```
┌─────────────────────────────────────────────────────┐
│ 고객 관리                     [+ 새 고객] [엑셀 다운]│
├─────────────────────────────────────────────────────┤
│ [검색: 이름/사업자번호] [필터: 상태▼] [정렬: 이름▼] │
├──────┬───────────┬────────┬────────┬────────┬───────┤
│ 이름 │ 연락처     │ 매장수 │ 미수금 │ 상태   │ 액션  │
├──────┼───────────┼────────┼────────┼────────┼───────┤
│ 김OO │ 010-1234- │   3    │ 50만원 │ Active │[상세] │
│ 이OO │ 010-5678- │   1    │   -    │ Active │[상세] │
│ ...  │           │        │        │        │       │
└──────┴───────────┴────────┴────────┴────────┴───────┘
```

#### 5.2.3 매장 상세
```
┌─────────────────────────────────────────────────────┐
│ ← 뒤로   [매장명: 엔케이 떡카페]           [수정]    │
├─────────────────────────────────────────────────────┤
│ [Overview] [키워드] [순위추적] [작업히스토리] [주문]│
├─────────────────────────────────────────────────────┤
│ 기본 정보                                            │
│ - 주소: 서울시 강남구...                             │
│ - 연락처: 02-1234-5678                               │
│ - 카테고리: 떡카페                                   │
│                                                      │
│ 키워드 순위 현황                                     │
│ ┌──────────────────────────────────────┐            │
│ │ [라인 차트]                          │            │
│ │ 강남 떡카페: 1위 → 1위 (0)          │            │
│ │ 서울 떡카페: 3위 → 2위 (↑1)        │            │
│ └──────────────────────────────────────┘            │
│                                                      │
│ 최근 작업                                            │
│ - 2024-11-10: 블로그 포스팅 3건                      │
│ - 2024-11-08: 리뷰 이벤트 진행                       │
│                                                      │
│ 진행 중인 주문                                       │
│ - 주문 #1234: 블로그 10건 (진행중)                  │
└─────────────────────────────────────────────────────┘
```

#### 5.2.4 주문 생성
```
┌─────────────────────────────────────────────────────┐
│ 새 주문/견적 생성                                    │
├─────────────────────────────────────────────────────┤
│ 1. 고객 정보                                         │
│    고객 선택: [김OO ▼]                              │
│    매장 선택: [엔케이 떡카페 ▼] [+ 새 매장]         │
│                                                      │
│ 2. 상품 선택                                         │
│    ┌────────────────────────────────────┐           │
│    │ [+ 상품 추가]                      │           │
│    ├─────┬───────┬────┬─────┬──────┤           │
│    │품목 │ 수량  │단가│ 금액│ 삭제 │           │
│    ├─────┼───────┼────┼─────┼──────┤           │
│    │블로그│  10  │5만 │50만 │ [X]  │           │
│    │리뷰  │   5  │3만 │15만 │ [X]  │           │
│    └─────┴───────┴────┴─────┴──────┘           │
│                                                      │
│ 3. 금액 확인                                         │
│    공급가액: 650,000원                               │
│    부가세:    65,000원                               │
│    합계:     715,000원                               │
│                                                      │
│ 4. 기간                                              │
│    시작일: [2024-11-15]  종료일: [2024-12-15]       │
│                                                      │
│ [취소]              [견적서 생성] [주문 생성]        │
└─────────────────────────────────────────────────────┘
```

---

## 11. API 연동 요구사항

### 6.1 필수 연동

#### 6.1.1 세금계산서 API
- **제공사**: 홈택스, 바로빌, 더존 등
- **기능**: 전자세금계산서 발행, 조회, 취소
- **예상 비용**: 월 3~5만원 (건당 과금)

#### 6.1.2 카카오톡 알림톡 API
- **제공사**: 카카오
- **기능**: 견적서, 계산서, 입금확인 등 알림 발송
- **예상 비용**: 건당 5~15원

#### 6.1.3 Google Drive API
- **기능**: 
  - 매장별 폴더 생성
  - 파일 업로드 (이미지, 문서)
  - 파일 조회
- **비용**: 무료 (스토리지는 별도)

### 6.2 선택 연동

#### 6.2.1 은행 오픈뱅킹 API
- **기능**: 계좌 거래내역 조회
- **비용**: 무료 또는 소액 (은행별 상이)

#### 6.2.2 구글 캘린더 API
- **기능**: 일정 동기화
- **비용**: 무료

#### 6.2.3 네이버 API (제한적)
- **검색 API**: 키워드 검색량 조회
- **지역검색 API**: 플레이스 정보
- **비용**: 무료 (일일 쿼터 제한)

### 6.3 OCR API

#### Google Vision API
- **기능**: 사업자등록증, 명함 텍스트 추출
- **비용**: 월 1,000건까지 무료, 이후 건당 과금

---

## 11. 개발 우선순위 및 로드맵

### Phase 1: MVP (2-3개월)

**핵심 기능만 구현**
1. ✅ 고객 관리 (CRUD)
2. ✅ 매장 관리 (CRUD + 네이버 크롤링)
3. ✅ 키워드 관리
4. ✅ 순위 데이터 입력 (수동 + 엑셀 업로드)
5. ✅ 주문 관리 (생성, 조회, 수정)
6. ✅ 견적서 생성 (PDF)
7. ✅ 기본 대시보드

**기술 스택 (MVP)**:
- Frontend: Next.js + shadcn/ui
- Backend: Next.js API Routes + Prisma + PostgreSQL
- 크롤링: Playwright

### Phase 2: 확장 기능 (3-4개월)

1. ✅ 구매 관리
2. ✅ 거래처 관리
3. ✅ 작업 히스토리
4. ✅ 진단 보고서
5. ✅ 세금계산서 연동
6. ✅ 카카오톡 알림
7. ✅ 입금 관리
8. ✅ 손익 분석

### Phase 3: 자동화 & 고도화 (3-4개월)

1. ✅ 자동 순위 크롤링 (스케줄러)
2. ✅ 은행 API 연동
3. ✅ Google Drive 자동 연동
4. ✅ AI 기반 진단 보고서
5. ✅ 구매 발주 자동화 (구글시트 연동)
6. ✅ 고급 대시보드 & 리포트
7. ✅ 모바일 앱 (선택)

### Phase 4: B2B 전환 준비 (3-4개월)

1. ✅ 멀티 테넌트 아키텍처
2. ✅ 사용자 권한 관리
3. ✅ 과금 시스템
4. ✅ API 문서화 (외부 제공)
5. ✅ 화이트라벨링 옵션

---

## 11. 기술적 고려사항

### 8.1 보안

**중요 데이터 암호화**:
- 네이버 계정 비밀번호
- API 키들
- 고객 개인정보

**방법**:
- AES-256 암호화
- 환경변수로 암호화 키 관리
- DB 컬럼 암호화

### 8.2 성능 최적화

**크롤링 최적화**:
- 큐 시스템 (BullMQ + Redis)
- 병렬 처리
- 크롤링 간격 조절 (Rate Limiting)

**데이터베이스 최적화**:
- 적절한 인덱스
- 쿼리 최적화
- 커넥션 풀링

**캐싱**:
- Redis 활용
- 순위 데이터, 대시보드 데이터 캐싱

### 8.3 확장성

**모듈화**:
- 각 기능을 독립적인 모듈로 개발
- API 우선 설계

**데이터베이스**:
- 수평 확장 가능한 구조
- 샤딩 고려 (향후)

**마이크로서비스 전환 가능성**:
- 크롤링 서버 분리
- 알림 서버 분리

### 8.4 문서화

**필수 문서**:
1. ✅ **API 문서**: OpenAPI (Swagger)
2. ✅ **데이터베이스 문서**: ERD + 테이블 설명
3. ✅ **기능 명세서**: 본 문서
4. ✅ **배포 가이드**: 인프라 설정
5. ✅ **사용자 매뉴얼**: 화면별 사용법

**도구**:
- API: Swagger / Postman
- ERD: dbdiagram.io / draw.io
- 기능: Notion / Confluence
- 코드: JSDoc / TypeDoc

---

## 11. 예상 비용

### 9.1 개발 비용

**자체 개발 (Enkei)**:
- 개발 기간: 6-12개월
- 인건비: N/A (본인 개발)

**외주 개발 (참고)**:
- MVP: 3,000만원 ~ 5,000만원
- 전체: 7,000만원 ~ 1억원

### 9.2 운영 비용 (월간)

**인프라**:
- 서버 (AWS/GCP): 10만원 ~ 30만원
- DB (PostgreSQL): 5만원 ~ 15만원
- 스토리지: 3만원 ~ 10만원

**API 비용**:
- 세금계산서: 3만원 ~ 5만원
- 카카오톡: 2만원 ~ 10만원 (사용량에 따라)
- 기타 API: 1만원 ~ 5만원

**합계**: 월 25만원 ~ 75만원

### 9.3 ROI 분석

**현재 수동 작업 시간**:
- 견적서 작성: 월 20시간
- 순위 체크: 월 15시간
- 보고서 작성: 월 10시간
- 정산 작업: 월 10시간
- **합계**: 월 55시간

**자동화 후**:
- **절감 시간**: 월 40시간 이상
- **시급 환산** (5만원): 월 200만원 절감
- **회수 기간**: 개발 투입 시간 대비 3-6개월

**추가 수익**:
- 처리 가능 고객 수 증가
- 실수 감소로 인한 신뢰도 향상
- B2B 전환 시 추가 수익원

---

## 11. 다음 단계

### 10.1 즉시 수행
1. ✅ 기술 스택 최종 결정
2. ✅ 개발 환경 설정
3. ✅ 데이터베이스 ERD 정교화
4. ✅ MVP 기능 우선순위 재검토

### 10.2 단기 (1주일 내)
1. 프로젝트 셋업
   - Git 레포지토리
   - Next.js + Prisma 초기 설정
   - 기본 레이아웃 구현
2. 첫 번째 기능 구현 시작
   - 고객 관리 CRUD

### 10.3 중기 (1개월 내)
1. 매장 관리 + 크롤링 구현
2. 주문 관리 + 견적서 생성
3. 기본 대시보드

---

## 부록 A: 용어 정의

- **MID**: 네이버 플레이스의 고유 매장 ID
- **SEO**: Search Engine Optimization (검색엔진 최적화)
- **N2 지수**: 네이버 플레이스 노출 알고리즘의 핵심 지표 (추정)
- **OCR**: Optical Character Recognition (광학 문자 인식)
- **ERP**: Enterprise Resource Planning

---

## 부록 B: 참고 자료

**벤치마킹 대상**:
1. 광고대행 ERP
   - 애드픽 (광고 통합 관리)
   - 모비온 (광고 운영 플랫폼)
2. 일반 ERP
   - 더존 SmartA (중소기업 ERP)
   - 아이작스 (재무/회계)
3. CRM
   - HubSpot
   - Salesforce

**기술 문서**:
- Next.js: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs
- Playwright: https://playwright.dev/
- shadcn/ui: https://ui.shadcn.com/

---

## 변경 이력

| 버전 | 날짜 | 변경 내역 | 작성자 |
|------|------|----------|--------|
| 1.0  | 2025-11-13 | 초안 작성 | Claude |

---

**문서 끝**
