-- Migration 002: Fix Schema Mismatch
-- Adds missing fields used by the application code
-- Date: 2025-11-12

-- Add missing fields to projects table
ALTER TABLE projects ADD COLUMN estimated_budget REAL;
ALTER TABLE projects ADD COLUMN estimated_hours REAL;
ALTER TABLE projects ADD COLUMN actual_budget REAL DEFAULT 0;
ALTER TABLE projects ADD COLUMN actual_hours REAL DEFAULT 0;

-- Add missing fields to time_entries table
ALTER TABLE time_entries ADD COLUMN task_type TEXT;

-- Add missing fields to invoices table
ALTER TABLE invoices ADD COLUMN invoice_date DATE;
ALTER TABLE invoices ADD COLUMN tax REAL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN pdf_path TEXT;

-- Update existing data
-- Copy budget to estimated_budget for existing projects
UPDATE projects SET estimated_budget = budget WHERE budget IS NOT NULL;
UPDATE projects SET estimated_hours = hourly_rate WHERE hourly_rate IS NOT NULL;

-- Copy issue_date to invoice_date for existing invoices
UPDATE invoices SET invoice_date = issue_date WHERE issue_date IS NOT NULL;
UPDATE invoices SET tax = vat WHERE vat IS NOT NULL;

-- Update schema version
INSERT INTO schema_version (version, description)
VALUES ('1.0.1', 'Fixed schema mismatch: added estimated/actual fields to projects, task_type to time_entries, invoice_date/tax/pdf_path to invoices');
