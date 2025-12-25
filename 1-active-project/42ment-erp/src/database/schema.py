"""
Database schema definitions and common field conventions
"""

# Common field convention (Brand Studio ERP 규약)
COMMON_FIELDS = {
    'id': 'INTEGER PRIMARY KEY AUTOINCREMENT',
    'created_at': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    'updated_at': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    'created_by': "TEXT DEFAULT 'system'",
    'manual_edit': "TEXT DEFAULT 'N'",  # Y/N
    'source': "TEXT DEFAULT 'manual'",  # manual/import/api
    'notes': 'TEXT'
}

# Amount field convention
AMOUNT_FIELDS = {
    'subtotal': 'REAL NOT NULL',  # 공급가
    'vat': 'REAL DEFAULT 0',      # 부가세
    'total': 'REAL NOT NULL',     # 합계
    'vat_included': "TEXT DEFAULT 'N'"  # Y/N
}

# Entity schemas
CLIENT_SCHEMA = {
    'table': 'clients',
    'fields': {
        **COMMON_FIELDS,
        'name': 'TEXT NOT NULL',
        'email': 'TEXT',
        'phone': 'TEXT',
        'company': 'TEXT',
        'address': 'TEXT'
    },
    'indexes': [
        'CREATE INDEX idx_clients_name ON clients(name);',
        'CREATE INDEX idx_clients_email ON clients(email);',
        'CREATE INDEX idx_clients_created_at ON clients(created_at);'
    ]
}

PROJECT_SCHEMA = {
    'table': 'projects',
    'fields': {
        **COMMON_FIELDS,
        'client_id': 'INTEGER NOT NULL',
        'name': 'TEXT NOT NULL',
        'description': 'TEXT',
        'start_date': 'DATE',
        'end_date': 'DATE',
        'status': "TEXT DEFAULT 'active'",  # active/completed/on_hold
        'budget': 'REAL',
        'hourly_rate': 'REAL'
    },
    'indexes': [
        'CREATE INDEX idx_projects_client_id ON projects(client_id);',
        'CREATE INDEX idx_projects_status ON projects(status);',
        'CREATE INDEX idx_projects_start_date ON projects(start_date);',
        'CREATE INDEX idx_projects_created_at ON projects(created_at);'
    ]
}

TIME_ENTRY_SCHEMA = {
    'table': 'time_entries',
    'fields': {
        **COMMON_FIELDS,
        'project_id': 'INTEGER NOT NULL',
        'date': 'DATE NOT NULL',
        'hours': 'REAL NOT NULL',
        'description': 'TEXT',
        'billable': "TEXT DEFAULT 'Y'"  # Y/N
    },
    'indexes': [
        'CREATE INDEX idx_time_entries_project_id ON time_entries(project_id);',
        'CREATE INDEX idx_time_entries_date ON time_entries(date);',
        'CREATE INDEX idx_time_entries_billable ON time_entries(billable);',
        'CREATE INDEX idx_time_entries_created_at ON time_entries(created_at);'
    ]
}

INVOICE_SCHEMA = {
    'table': 'invoices',
    'fields': {
        **COMMON_FIELDS,
        **AMOUNT_FIELDS,
        'client_id': 'INTEGER NOT NULL',
        'project_id': 'INTEGER',
        'invoice_number': 'TEXT UNIQUE NOT NULL',
        'issue_date': 'DATE NOT NULL',
        'due_date': 'DATE',
        'status': "TEXT DEFAULT 'draft'"  # draft/sent/paid/overdue
    },
    'indexes': [
        'CREATE INDEX idx_invoices_client_id ON invoices(client_id);',
        'CREATE INDEX idx_invoices_project_id ON invoices(project_id);',
        'CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);',
        'CREATE INDEX idx_invoices_status ON invoices(status);',
        'CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);',
        'CREATE INDEX idx_invoices_created_at ON invoices(created_at);'
    ]
}

ADJUSTMENT_SCHEMA = {
    'table': 'adjustments',
    'fields': {
        'id': 'INTEGER PRIMARY KEY AUTOINCREMENT',
        'ref_type': 'TEXT NOT NULL',  # client/project/time_entry/invoice
        'ref_id': 'INTEGER NOT NULL',
        'field_name': 'TEXT NOT NULL',
        'old_value': 'TEXT',
        'new_value': 'TEXT',
        'reason': 'TEXT',
        'adjusted_by': 'TEXT NOT NULL',  # system/user/import
        'created_at': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
        'created_by': "TEXT DEFAULT 'system'",
        'manual_edit': "TEXT DEFAULT 'N'",
        'source': "TEXT DEFAULT 'manual'",
        'notes': 'TEXT'
    },
    'indexes': [
        'CREATE INDEX idx_adjustments_ref ON adjustments(ref_type, ref_id);',
        'CREATE INDEX idx_adjustments_created_at ON adjustments(created_at);',
        'CREATE INDEX idx_adjustments_adjusted_by ON adjustments(adjusted_by);'
    ]
}

# Schema version
SCHEMA_VERSION = '1.0.0'
