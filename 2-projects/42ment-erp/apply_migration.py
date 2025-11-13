"""
Apply database migration 002_fix_schema_mismatch.sql
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from src.database.db import get_connection
from src.utils.logger import log_info, log_error


def apply_migration():
    """Apply the schema fix migration"""
    migration_file = Path(__file__).parent / 'src' / 'database' / 'migrations' / '002_fix_schema_mismatch.sql'

    if not migration_file.exists():
        print(f"[ERROR] Migration file not found: {migration_file}")
        return False

    try:
        # Read migration SQL
        with open(migration_file, 'r', encoding='utf-8') as f:
            sql = f.read()

        # Execute migration
        conn = get_connection()
        cursor = conn.cursor()

        # Execute each statement
        statements = sql.split(';')
        for statement in statements:
            statement = statement.strip()
            if statement and not statement.startswith('--'):
                try:
                    cursor.execute(statement)
                except Exception as e:
                    # Skip if column already exists
                    if 'duplicate column name' in str(e).lower():
                        print(f"[INFO] Column already exists, skipping...")
                        continue
                    else:
                        raise

        conn.commit()
        conn.close()

        print("[OK] Migration 002 applied successfully")
        log_info("Migration 002 applied successfully")
        return True

    except Exception as e:
        print(f"[ERROR] Failed to apply migration: {e}")
        log_error("Failed to apply migration", error=str(e))
        return False


if __name__ == '__main__':
    success = apply_migration()
    sys.exit(0 if success else 1)
