"""
Apply database migration 003_add_foreign_keys.sql
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from src.database.db import get_connection
from src.utils.logger import log_info, log_error


def apply_migration():
    """Apply the foreign key migration"""
    migration_file = Path(__file__).parent / 'src' / 'database' / 'migrations' / '003_add_foreign_keys.sql'

    if not migration_file.exists():
        print(f"[ERROR] Migration file not found: {migration_file}")
        return False

    try:
        # Read migration SQL
        with open(migration_file, 'r', encoding='utf-8') as f:
            sql = f.read()

        # Execute migration as a script (not split by semicolon)
        conn = get_connection()
        cursor = conn.cursor()

        # Execute the entire script
        cursor.executescript(sql)

        conn.commit()
        conn.close()

        print("[OK] Migration 003 applied successfully - Foreign keys added")
        log_info("Migration 003 applied successfully")
        return True

    except Exception as e:
        print(f"[ERROR] Failed to apply migration: {e}")
        log_error("Failed to apply migration 003", error=str(e))
        return False


if __name__ == '__main__':
    success = apply_migration()
    sys.exit(0 if success else 1)
