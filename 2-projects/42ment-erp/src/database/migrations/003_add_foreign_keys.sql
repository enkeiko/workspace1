-- Migration 003: Add Foreign Key Constraints
-- SQLite requires recreating tables to add foreign keys
-- Date: 2025-11-12

PRAGMA foreign_keys = OFF;

-- Backup projects table
CREATE TABLE projects_backup AS SELECT * FROM projects;

-- Drop old projects table
DROP TABLE projects;

-- Recreate projects table with foreign keys
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
    estimated_budget REAL,
    estimated_hours REAL,
    actual_budget REAL DEFAULT 0,
    actual_hours REAL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'system',
    manual_edit TEXT DEFAULT 'N',
    source TEXT DEFAULT 'manual',
    notes TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Restore data (with all columns)
INSERT INTO projects (id, client_id, name, description, start_date, end_date, status,
    budget, hourly_rate, estimated_budget, estimated_hours, actual_budget, actual_hours,
    created_at, updated_at, created_by, manual_edit, source, notes)
SELECT id, client_id, name, description, start_date, end_date, status,
    budget, hourly_rate, estimated_budget, estimated_hours, actual_budget, actual_hours,
    created_at, updated_at, created_by, manual_edit, source, notes
FROM projects_backup;

-- Drop backup
DROP TABLE projects_backup;

-- Recreate indexes
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_start_date ON projects(start_date);
CREATE INDEX idx_projects_created_at ON projects(created_at);


-- Backup time_entries table
CREATE TABLE time_entries_backup AS SELECT * FROM time_entries;

-- Drop old time_entries table
DROP TABLE time_entries;

-- Recreate time_entries table with foreign keys
CREATE TABLE time_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    date DATE NOT NULL,
    hours REAL NOT NULL,
    description TEXT,
    billable TEXT DEFAULT 'Y',
    task_type TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'system',
    manual_edit TEXT DEFAULT 'N',
    source TEXT DEFAULT 'manual',
    notes TEXT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Restore data (with all columns, task_type may be null)
INSERT INTO time_entries (id, project_id, date, hours, description, billable,
    created_at, updated_at, created_by, manual_edit, source, notes)
SELECT id, project_id, date, hours, description, billable,
    created_at, updated_at, created_by, manual_edit, source, notes
FROM time_entries_backup;

-- Drop backup
DROP TABLE time_entries_backup;

-- Recreate indexes
CREATE INDEX idx_time_entries_project_id ON time_entries(project_id);
CREATE INDEX idx_time_entries_date ON time_entries(date);
CREATE INDEX idx_time_entries_billable ON time_entries(billable);
CREATE INDEX idx_time_entries_created_at ON time_entries(created_at);


-- Backup invoices table
CREATE TABLE invoices_backup AS SELECT * FROM invoices;

-- Drop old invoices table
DROP TABLE invoices;

-- Recreate invoices table with foreign keys
CREATE TABLE invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    project_id INTEGER,
    invoice_number TEXT UNIQUE NOT NULL,
    issue_date DATE NOT NULL,
    invoice_date DATE,
    due_date DATE,
    status TEXT DEFAULT 'draft',
    subtotal REAL NOT NULL,
    vat REAL DEFAULT 0,
    tax REAL DEFAULT 0,
    total REAL NOT NULL,
    vat_included TEXT DEFAULT 'N',
    pdf_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'system',
    manual_edit TEXT DEFAULT 'N',
    source TEXT DEFAULT 'manual',
    notes TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Restore data (map old columns to new structure)
INSERT INTO invoices (id, client_id, project_id, invoice_number, issue_date, invoice_date,
    due_date, status, subtotal, vat, tax, total, vat_included,
    created_at, updated_at, created_by, manual_edit, source, notes)
SELECT id, client_id, project_id, invoice_number, issue_date, issue_date,
    due_date, status, subtotal, vat, vat, total, vat_included,
    created_at, updated_at, created_by, manual_edit, source, notes
FROM invoices_backup;

-- Drop backup
DROP TABLE invoices_backup;

-- Recreate indexes
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_project_id ON invoices(project_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_invoices_created_at ON invoices(created_at);

PRAGMA foreign_keys = ON;

-- Update schema version
INSERT INTO schema_version (version, description)
VALUES ('1.0.2', 'Added foreign key constraints to projects, time_entries, and invoices tables');
