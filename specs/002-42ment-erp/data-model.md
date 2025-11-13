# Data Model: 42ment ERP v0.1

**Date**: 2025-11-12
**Feature**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)
**Schema Version**: 1.0.0

## Overview

본 문서는 42ment ERP v0.1의 데이터베이스 스키마를 정의합니다. SQLite를 사용하며, Brand Studio ERP Core System 개발 원칙을 준수합니다.

**핵심 원칙**:
- **공통 필드 규약**: 모든 테이블에 id, created_at, updated_at, manual_edit, source, notes 포함
- **단일 진실의 원천**: Client, Project, TimeEntry, Invoice, Adjustment 5개 핵심 테이블
- **완전한 이력 추적**: Adjustment 테이블로 모든 변경 기록
- **이식성**: Foreign Key는 논리적 참조로 구현 (파일 이동 가능)

---

## Schema Version Table

```sql
-- 스키마 버전 관리 테이블
CREATE TABLE schema_version (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT NOT NULL
);

-- 초기 버전 기록
INSERT INTO schema_version (version, description)
VALUES ('1.0.0', 'Initial schema: Client, Project, TimeEntry, Invoice, Adjustment tables');
```

**용도**: 스키마 변경 이력을 추적하고, 마이그레이션 스크립트 실행 여부를 확인합니다.

---

## Core Entities

### 1. Client (고객)

```sql
CREATE TABLE clients (
    -- Primary Key
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Business Fields
    name TEXT NOT NULL,                     -- 고객 이름 (필수)
    email TEXT,                             -- 이메일 (선택)
    phone TEXT,                             -- 전화번호 (선택)
    company TEXT,                           -- 회사명 (선택)
    address TEXT,                           -- 주소 (선택)

    -- Common Fields (Brand Studio ERP 규약)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'system',
    manual_edit TEXT DEFAULT 'N',           -- Y/N
    source TEXT DEFAULT 'manual',           -- manual/import/api
    notes TEXT                              -- 비고
);

-- Indexes
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_created_at ON clients(created_at);
```

**설계 결정**:
- `name`만 NOT NULL (최소 필수 정보)
- `email`은 unique 제약 없음 (동명이인 또는 이메일 없는 고객 허용)
- `notes`는 자유 형식 텍스트 (고객 특이사항 기록)

**관계**:
- **1:N with Project**: 한 고객은 여러 프로젝트를 가질 수 있음

---

### 2. Project (프로젝트)

```sql
CREATE TABLE projects (
    -- Primary Key
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Business Fields
    client_id INTEGER NOT NULL,             -- 고객 ID (논리적 참조)
    name TEXT NOT NULL,                     -- 프로젝트 이름
    description TEXT,                       -- 프로젝트 설명
    start_date DATE,                        -- 시작일 (YYYY-MM-DD)
    end_date DATE,                          -- 종료일 (YYYY-MM-DD)
    status TEXT DEFAULT 'active',           -- active/completed/on_hold
    budget REAL,                            -- 예산 (원)
    hourly_rate REAL,                       -- 시간당 요금 (원/시간)

    -- Common Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'system',
    manual_edit TEXT DEFAULT 'N',
    source TEXT DEFAULT 'manual',
    notes TEXT
);

-- Indexes
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_start_date ON projects(start_date);
CREATE INDEX idx_projects_created_at ON projects(created_at);
```

**설계 결정**:
- `client_id`는 논리적 참조 (FK 제약 없음, 이식성 우선)
- `status`는 TEXT (enum 미지원, 애플리케이션에서 검증)
- `budget`과 `hourly_rate`는 선택 (시간제/고정가 프로젝트 모두 지원)

**관계**:
- **N:1 with Client**: 여러 프로젝트는 하나의 고객에 속함
- **1:N with TimeEntry**: 하나의 프로젝트는 여러 작업 시간 기록을 가짐
- **1:N with Invoice**: 하나의 프로젝트는 여러 청구서를 가질 수 있음

**제약 조건 (애플리케이션 수준)**:
- `end_date >= start_date`
- `status IN ('active', 'completed', 'on_hold')`

---

### 3. TimeEntry (작업 시간 기록)

```sql
CREATE TABLE time_entries (
    -- Primary Key
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Business Fields
    project_id INTEGER NOT NULL,            -- 프로젝트 ID (논리적 참조)
    date DATE NOT NULL,                     -- 작업 날짜 (YYYY-MM-DD)
    hours REAL NOT NULL,                    -- 작업 시간 (시간 단위, 예: 2.5)
    description TEXT,                       -- 작업 내용 설명
    billable TEXT DEFAULT 'Y',              -- 청구 가능 여부 (Y/N)

    -- Common Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'system',
    manual_edit TEXT DEFAULT 'N',
    source TEXT DEFAULT 'manual',
    notes TEXT
);

-- Indexes
CREATE INDEX idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX idx_time_entries_date ON time_entries(date);
CREATE INDEX idx_time_entries_billable ON time_entries(billable);
CREATE INDEX idx_time_entries_created_at ON time_entries(created_at);
```

**설계 결정**:
- `hours`는 REAL (소수점 시간 지원, 예: 2.5시간)
- `billable`은 Y/N (일부 작업은 청구 불가능)
- `description`은 선택 (간단한 작업 메모)

**관계**:
- **N:1 with Project**: 여러 작업 시간 기록은 하나의 프로젝트에 속함

**제약 조건 (애플리케이션 수준)**:
- `hours > 0`
- `billable IN ('Y', 'N')`

---

### 4. Invoice (청구서)

```sql
CREATE TABLE invoices (
    -- Primary Key
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Business Fields
    client_id INTEGER NOT NULL,             -- 고객 ID (논리적 참조)
    project_id INTEGER,                     -- 프로젝트 ID (선택, NULL 가능)
    invoice_number TEXT UNIQUE NOT NULL,    -- 청구서 번호 (예: INV-2025-001)
    issue_date DATE NOT NULL,               -- 발행일 (YYYY-MM-DD)
    due_date DATE,                          -- 마감일 (YYYY-MM-DD)
    status TEXT DEFAULT 'draft',            -- draft/sent/paid/overdue

    -- Amount Fields (Brand Studio ERP 금액 규약)
    subtotal REAL NOT NULL,                 -- 공급가 (원)
    vat REAL DEFAULT 0,                     -- 부가세 (원)
    total REAL NOT NULL,                    -- 합계 (원)
    vat_included TEXT DEFAULT 'N',          -- 부가세 포함 여부 (Y/N)

    -- Common Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'system',
    manual_edit TEXT DEFAULT 'N',
    source TEXT DEFAULT 'manual',
    notes TEXT
);

-- Indexes
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_project_id ON invoices(project_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_invoices_created_at ON invoices(created_at);
```

**설계 결정**:
- `invoice_number`는 UNIQUE (중복 청구서 번호 방지)
- `project_id`는 NULL 허용 (프로젝트 외 일회성 청구 가능)
- `subtotal + vat = total` (애플리케이션에서 검증)
- `status`는 TEXT (애플리케이션에서 검증)

**관계**:
- **N:1 with Client**: 여러 청구서는 하나의 고객에 속함
- **N:1 with Project**: 여러 청구서는 하나의 프로젝트에 속함 (선택)

**제약 조건 (애플리케이션 수준)**:
- `total = subtotal + vat`
- `due_date >= issue_date`
- `status IN ('draft', 'sent', 'paid', 'overdue')`
- `vat_included IN ('Y', 'N')`

**청구서 번호 생성 로직** (애플리케이션):
```python
def generate_invoice_number() -> str:
    """Generate unique invoice number: INV-YYYY-XXX"""
    from datetime import datetime
    year = datetime.now().year
    # Get last invoice number for this year
    last_number = get_last_invoice_number(year)
    next_number = last_number + 1
    return f"INV-{year}-{next_number:03d}"
```

---

### 5. Adjustment (변경 이력 / Audit Log)

```sql
CREATE TABLE adjustments (
    -- Primary Key
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Reference Fields
    ref_type TEXT NOT NULL,                 -- 'client', 'project', 'time_entry', 'invoice'
    ref_id INTEGER NOT NULL,                -- 참조 엔티티의 ID

    -- Change Fields
    field_name TEXT NOT NULL,               -- 변경된 필드명
    old_value TEXT,                         -- 이전 값 (JSON 직렬화)
    new_value TEXT,                         -- 새 값 (JSON 직렬화)
    reason TEXT,                            -- 변경 사유
    adjusted_by TEXT NOT NULL,              -- 변경 주체 ('system', 'user', 'import')

    -- Common Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'system',
    manual_edit TEXT DEFAULT 'N',
    source TEXT DEFAULT 'manual',
    notes TEXT
);

-- Indexes
CREATE INDEX idx_adjustments_ref ON adjustments(ref_type, ref_id);
CREATE INDEX idx_adjustments_created_at ON adjustments(created_at);
CREATE INDEX idx_adjustments_adjusted_by ON adjustments(adjusted_by);
```

**설계 결정**:
- `ref_type` + `ref_id`로 모든 엔티티 참조 (Generic Audit Log)
- `old_value`, `new_value`는 JSON 문자열 (모든 데이터 타입 지원)
- `reason`은 필수 (변경 근거 추적)
- `updated_at` 없음 (이력은 수정되지 않음, immutable)

**관계**:
- **N:1 with Client/Project/TimeEntry/Invoice**: 논리적 참조 (ref_type + ref_id)

**용도**:
- 모든 데이터 변경 이력 추적 (투명성 원칙)
- 감사 추적 (Audit Trail)
- 데이터 복구 (특정 시점으로 롤백 가능)

**사용 예시**:
```sql
-- 고객 이름 변경 시 Adjustment 기록
INSERT INTO adjustments (ref_type, ref_id, field_name, old_value, new_value, reason, adjusted_by)
VALUES ('client', 123, 'name', '"홍길동"', '"홍길순"', '고객 요청', 'user');

-- 프로젝트 상태 변경 시 Adjustment 기록
INSERT INTO adjustments (ref_type, ref_id, field_name, old_value, new_value, reason, adjusted_by)
VALUES ('project', 456, 'status', '"active"', '"completed"', '프로젝트 완료', 'system');
```

---

## Entity Relationships (ER Diagram)

```
┌─────────────┐
│   Client    │
│ (고객)      │
└─────────────┘
      │ 1
      │
      │ N
┌─────────────┐       ┌─────────────┐
│   Project   │───N───│  TimeEntry  │
│ (프로젝트)  │       │ (작업시간)  │
└─────────────┘       └─────────────┘
      │ 1
      │
      │ N
┌─────────────┐
│   Invoice   │
│ (청구서)    │
└─────────────┘

          ┌──────────────────┐
          │   Adjustment     │
          │ (변경 이력)      │
          │                  │
          │ ref_type, ref_id │
          └──────────────────┘
                  │
                  │ (논리적 참조)
                  │
    ┌─────────────┼─────────────┬─────────────┐
    │             │             │             │
  Client      Project      TimeEntry      Invoice
```

**관계 요약**:
- **Client → Project**: 1:N (한 고객은 여러 프로젝트 소유)
- **Project → TimeEntry**: 1:N (한 프로젝트는 여러 작업 시간 기록)
- **Client → Invoice**: 1:N (한 고객은 여러 청구서 소유)
- **Project → Invoice**: 1:N (한 프로젝트는 여러 청구서 소유, NULL 가능)
- **Adjustment → 모든 엔티티**: N:1 (논리적 참조)

---

## Common Field Convention

**모든 테이블에 적용되는 공통 필드** (Brand Studio ERP 규약):

| 필드명 | 타입 | 기본값 | 설명 |
|--------|------|--------|------|
| `id` | INTEGER PRIMARY KEY | AUTO | 고유 식별자 |
| `created_at` | TIMESTAMP | CURRENT_TIMESTAMP | 생성 시각 |
| `updated_at` | TIMESTAMP | CURRENT_TIMESTAMP | 최종 수정 시각 |
| `created_by` | TEXT | 'system' | 생성자 ('system', 'user', 'import') |
| `manual_edit` | TEXT | 'N' | 수동 편집 여부 (Y/N) |
| `source` | TEXT | 'manual' | 데이터 출처 ('manual', 'import', 'api') |
| `notes` | TEXT | NULL | 비고 (자유 형식) |

**용도**:
- `created_at`, `updated_at`: 시간축 기반 데이터 추적
- `created_by`: 데이터 생성 주체 추적
- `manual_edit`: 사용자가 직접 수정한 데이터 구분
- `source`: 데이터 출처 구분 (수동 입력 vs Import vs API)
- `notes`: 추가 정보 기록

---

## Amount Field Convention

**금액 관련 필드** (Brand Studio ERP 규약):

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `subtotal` | REAL | 공급가 (부가세 제외) |
| `vat` | REAL | 부가세 (10%) |
| `total` | REAL | 합계 (subtotal + vat) |
| `vat_included` | TEXT | 부가세 포함 여부 (Y/N) |

**계산 규칙** (애플리케이션 수준):
```python
if vat_included == 'Y':
    subtotal = total / 1.1
    vat = total - subtotal
else:
    total = subtotal + vat
```

---

## Database Initialization Script

```sql
-- database/migrations/001_initial_schema.sql

-- Enable Foreign Key support (optional, for future use)
PRAGMA foreign_keys = ON;

-- Schema Version Table
CREATE TABLE schema_version (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT NOT NULL
);

INSERT INTO schema_version (version, description)
VALUES ('1.0.0', 'Initial schema: Client, Project, TimeEntry, Invoice, Adjustment tables');

-- Client Table
CREATE TABLE clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'system',
    manual_edit TEXT DEFAULT 'N',
    source TEXT DEFAULT 'manual',
    notes TEXT
);

CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_created_at ON clients(created_at);

-- Project Table
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'active',
    budget REAL,
    hourly_rate REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'system',
    manual_edit TEXT DEFAULT 'N',
    source TEXT DEFAULT 'manual',
    notes TEXT
);

CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_start_date ON projects(start_date);
CREATE INDEX idx_projects_created_at ON projects(created_at);

-- TimeEntry Table
CREATE TABLE time_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    date DATE NOT NULL,
    hours REAL NOT NULL,
    description TEXT,
    billable TEXT DEFAULT 'Y',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'system',
    manual_edit TEXT DEFAULT 'N',
    source TEXT DEFAULT 'manual',
    notes TEXT
);

CREATE INDEX idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX idx_time_entries_date ON time_entries(date);
CREATE INDEX idx_time_entries_billable ON time_entries(billable);
CREATE INDEX idx_time_entries_created_at ON time_entries(created_at);

-- Invoice Table
CREATE TABLE invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    project_id INTEGER,
    invoice_number TEXT UNIQUE NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'draft',
    subtotal REAL NOT NULL,
    vat REAL DEFAULT 0,
    total REAL NOT NULL,
    vat_included TEXT DEFAULT 'N',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'system',
    manual_edit TEXT DEFAULT 'N',
    source TEXT DEFAULT 'manual',
    notes TEXT
);

CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_project_id ON invoices(project_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_invoices_created_at ON invoices(created_at);

-- Adjustment Table (Audit Log)
CREATE TABLE adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ref_type TEXT NOT NULL,
    ref_id INTEGER NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    adjusted_by TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'system',
    manual_edit TEXT DEFAULT 'N',
    source TEXT DEFAULT 'manual',
    notes TEXT
);

CREATE INDEX idx_adjustments_ref ON adjustments(ref_type, ref_id);
CREATE INDEX idx_adjustments_created_at ON adjustments(created_at);
CREATE INDEX idx_adjustments_adjusted_by ON adjustments(adjusted_by);
```

**실행 방법**:
```python
# src/database/db.py
import sqlite3

def init_database(db_path: str = 'data/42ment.db'):
    """Initialize database with schema"""
    conn = sqlite3.connect(db_path)

    # Read and execute migration script
    with open('src/database/migrations/001_initial_schema.sql', 'r', encoding='utf-8') as f:
        schema_sql = f.read()
        conn.executescript(schema_sql)

    conn.close()
    print(f"Database initialized: {db_path}")
```

---

## Sample Data (for Testing)

```sql
-- Sample Clients
INSERT INTO clients (name, email, phone, company, notes)
VALUES
    ('홍길동', 'hong@example.com', '010-1234-5678', '홍길동 주식회사', '주요 고객'),
    ('김영희', 'kim@example.com', '010-9876-5432', NULL, '개인 고객'),
    ('이철수', NULL, '010-5555-6666', '이철수 스튜디오', '디자인 의뢰');

-- Sample Projects
INSERT INTO projects (client_id, name, description, start_date, status, hourly_rate)
VALUES
    (1, '웹사이트 리뉴얼', '회사 홈페이지 전면 개편', '2025-01-01', 'active', 50000),
    (2, '로고 디자인', '개인 브랜드 로고 제작', '2025-02-01', 'completed', 30000);

-- Sample TimeEntries
INSERT INTO time_entries (project_id, date, hours, description, billable)
VALUES
    (1, '2025-01-05', 4.0, '초기 기획 회의', 'Y'),
    (1, '2025-01-06', 6.5, '와이어프레임 작성', 'Y'),
    (2, '2025-02-03', 3.0, '로고 시안 3개 제작', 'Y');

-- Sample Invoices
INSERT INTO invoices (client_id, project_id, invoice_number, issue_date, due_date, status, subtotal, vat, total, vat_included)
VALUES
    (1, 1, 'INV-2025-001', '2025-01-31', '2025-02-15', 'sent', 500000, 50000, 550000, 'N'),
    (2, 2, 'INV-2025-002', '2025-02-28', '2025-03-15', 'paid', 90000, 9000, 99000, 'N');

-- Sample Adjustments
INSERT INTO adjustments (ref_type, ref_id, field_name, old_value, new_value, reason, adjusted_by)
VALUES
    ('client', 1, 'phone', '"010-1234-0000"', '"010-1234-5678"', '고객이 전화번호 변경 요청', 'user'),
    ('project', 2, 'status', '"active"', '"completed"', '프로젝트 완료', 'system');
```

---

## Migration Strategy

**버전 관리**:
```
src/database/migrations/
├── 001_initial_schema.sql      # v1.0.0 (이 문서)
├── 002_add_client_fields.sql   # v1.1.0 (예정)
└── 003_add_project_tags.sql    # v1.2.0 (예정)
```

**마이그레이션 실행 로직** (애플리케이션):
```python
def get_current_schema_version(conn: sqlite3.Connection) -> str:
    """Get current schema version from database"""
    cursor = conn.cursor()
    cursor.execute("SELECT version FROM schema_version ORDER BY applied_at DESC LIMIT 1")
    result = cursor.fetchone()
    return result[0] if result else '0.0.0'

def apply_migration(conn: sqlite3.Connection, migration_file: str, version: str, description: str):
    """Apply a single migration script"""
    with open(migration_file, 'r', encoding='utf-8') as f:
        migration_sql = f.read()
        conn.executescript(migration_sql)

    # Record migration
    conn.execute("""
        INSERT INTO schema_version (version, description)
        VALUES (?, ?)
    """, (version, description))

    conn.commit()
    print(f"Migration applied: {version} - {description}")
```

---

## Next Phase

✅ **data-model.md 완료** → Phase 1 계속:
1. `contracts/README.md` 작성 (Streamlit 앱 구조)
2. `contracts/streamlit_api.md` 작성 (UI ↔ Service 인터페이스)
3. `quickstart.md` 작성 (개발자 온보딩 가이드)

**연관 문서**:
- [spec.md](./spec.md) - 기능 명세
- [plan.md](./plan.md) - 구현 계획
- [research.md](./research.md) - 기술 조사
- [checklists/requirements.md](./checklists/requirements.md) - 요구사항 체크리스트
