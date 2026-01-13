-- 42ment ERP v0.1 - Initial Database Schema
-- Generated: 2025-11-12
-- Version: 1.0.0

-- Enable Foreign Key support
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
