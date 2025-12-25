"""
Database initialization and connection management
"""
import sqlite3
import os
import sys
from pathlib import Path


def get_db_path():
    """Get absolute path to database file"""
    # Get project root (3 levels up from this file)
    project_root = Path(__file__).parent.parent.parent
    db_path = project_root / "data" / "42ment.db"

    # Ensure data directory exists
    db_path.parent.mkdir(parents=True, exist_ok=True)

    return str(db_path)


def get_connection():
    """
    Create and return database connection with proper configuration

    Returns:
        sqlite3.Connection: Database connection
    """
    db_path = get_db_path()
    conn = sqlite3.connect(db_path, check_same_thread=False, timeout=30)

    # Enable Foreign Key support
    conn.execute("PRAGMA foreign_keys = ON;")

    # Return rows as dict-like objects
    conn.row_factory = sqlite3.Row

    return conn


def init_database(force=False):
    """
    Initialize database with schema from migration script

    Args:
        force (bool): If True, drop existing tables and recreate

    Returns:
        dict: Success status and message
    """
    db_path = get_db_path()

    # Check if database already exists
    db_exists = os.path.exists(db_path)

    if db_exists and not force:
        return {
            'success': False,
            'message': f'Database already exists at {db_path}. Use --force to recreate.'
        }

    try:
        conn = get_connection()

        # Read migration script
        migration_path = Path(__file__).parent / "migrations" / "001_initial_schema.sql"

        if not migration_path.exists():
            return {
                'success': False,
                'message': f'Migration script not found at {migration_path}'
            }

        with open(migration_path, 'r', encoding='utf-8') as f:
            schema_sql = f.read()

        # Execute migration
        conn.executescript(schema_sql)
        conn.commit()
        conn.close()

        return {
            'success': True,
            'message': f'Database initialized successfully at {db_path}'
        }

    except Exception as e:
        return {
            'success': False,
            'message': f'Failed to initialize database: {str(e)}'
        }


def load_sample_data():
    """
    Load sample data for testing and demonstration

    Returns:
        dict: Success status and message
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Sample Clients
        cursor.executemany("""
            INSERT INTO clients (name, email, phone, company, notes)
            VALUES (?, ?, ?, ?, ?)
        """, [
            ('홍길동', 'hong@example.com', '010-1234-5678', '홍길동 주식회사', '주요 고객'),
            ('김영희', 'kim@example.com', '010-9876-5432', None, '개인 고객'),
            ('이철수', None, '010-5555-6666', '이철수 스튜디오', '디자인 의뢰')
        ])

        # Sample Projects
        cursor.executemany("""
            INSERT INTO projects (client_id, name, description, start_date, status, hourly_rate)
            VALUES (?, ?, ?, ?, ?, ?)
        """, [
            (1, '웹사이트 리뉴얼', '회사 홈페이지 전면 개편', '2025-01-01', 'active', 50000),
            (2, '로고 디자인', '개인 브랜드 로고 제작', '2025-02-01', 'completed', 30000)
        ])

        # Sample TimeEntries
        cursor.executemany("""
            INSERT INTO time_entries (project_id, date, hours, description, billable)
            VALUES (?, ?, ?, ?, ?)
        """, [
            (1, '2025-01-05', 4.0, '초기 기획 회의', 'Y'),
            (1, '2025-01-06', 6.5, '와이어프레임 작성', 'Y'),
            (2, '2025-02-03', 3.0, '로고 시안 3개 제작', 'Y')
        ])

        # Sample Invoices
        cursor.executemany("""
            INSERT INTO invoices (client_id, project_id, invoice_number, issue_date, due_date, status, subtotal, vat, total, vat_included)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [
            (1, 1, 'INV-2025-001', '2025-01-31', '2025-02-15', 'sent', 500000, 50000, 550000, 'N'),
            (2, 2, 'INV-2025-002', '2025-02-28', '2025-03-15', 'paid', 90000, 9000, 99000, 'N')
        ])

        # Sample Adjustments
        cursor.executemany("""
            INSERT INTO adjustments (ref_type, ref_id, field_name, old_value, new_value, reason, adjusted_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, [
            ('client', 1, 'phone', '"010-1234-0000"', '"010-1234-5678"', '고객이 전화번호 변경 요청', 'user'),
            ('project', 2, 'status', '"active"', '"completed"', '프로젝트 완료', 'system')
        ])

        conn.commit()
        conn.close()

        return {
            'success': True,
            'message': 'Sample data loaded successfully'
        }

    except Exception as e:
        return {
            'success': False,
            'message': f'Failed to load sample data: {str(e)}'
        }


def main():
    """CLI entry point for database management"""
    import argparse

    parser = argparse.ArgumentParser(description='42ment ERP Database Management')
    parser.add_argument('--init', action='store_true', help='Initialize database')
    parser.add_argument('--force', action='store_true', help='Force recreate database')
    parser.add_argument('--load-sample-data', action='store_true', help='Load sample data')

    args = parser.parse_args()

    if args.init:
        result = init_database(force=args.force)
        print(result['message'])
        sys.exit(0 if result['success'] else 1)

    elif args.load_sample_data:
        result = load_sample_data()
        print(result['message'])
        sys.exit(0 if result['success'] else 1)

    else:
        parser.print_help()
        sys.exit(1)


if __name__ == '__main__':
    main()
