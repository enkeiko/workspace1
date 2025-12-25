"""
Quick start script for 42ment ERP
Run this to initialize database and start the application
"""
import sys
import argparse
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.database.db import init_database, load_sample_data
from src.utils.logger import log_info


def main():
    parser = argparse.ArgumentParser(description='42ment ERP - Quick Start')
    parser.add_argument('--init', action='store_true', help='Initialize database')
    parser.add_argument('--sample', action='store_true', help='Load sample data')
    parser.add_argument('--force', action='store_true', help='Force reinitialize database')

    args = parser.parse_args()

    if args.init or args.force:
        print("Initializing database...")
        result = init_database(force=args.force)
        if result['success']:
            print(f"[OK] {result['message']}")
        else:
            print(f"[ERROR] {result['message']}")
            return

    if args.sample:
        print("Loading sample data...")
        result = load_sample_data()
        if result['success']:
            print(f"[OK] {result['message']}")
        else:
            print(f"[ERROR] {result['message']}")
            return

    if not (args.init or args.sample or args.force):
        print("""
42ment ERP v0.1

Usage:
    python run.py --init          # Initialize database
    python run.py --sample        # Load sample data
    python run.py --force         # Force reinitialize database

To start the application:
    streamlit run src/main.py

Or:
    python -m streamlit run src/main.py
        """)


if __name__ == '__main__':
    main()
