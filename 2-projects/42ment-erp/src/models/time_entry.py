"""
Time Entry model - CRUD operations for time entry entity
"""
import sys
from pathlib import Path
from datetime import datetime, date

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.database.db import get_connection
from src.utils.logger import log_info, log_error


def create(project_id, date_worked, hours, billable='Y', description=None, task_type=None, notes=None):
    """
    Create new time entry

    Args:
        project_id (int): Project ID (required, foreign key)
        date_worked (str): Date of work (YYYY-MM-DD)
        hours (float): Hours worked (required)
        billable (str): Billable flag ('Y' or 'N')
        description (str): Work description
        task_type (str): Type of task (development, meeting, research, etc.)
        notes (str): Additional notes

    Returns:
        dict: {'success': bool, 'data': dict or None, 'message': str, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO time_entries (
                project_id, date, hours, billable, description, task_type, notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (project_id, date_worked, hours, billable, description, task_type, notes))

        conn.commit()
        entry_id = cursor.lastrowid

        result = get_by_id(entry_id)
        conn.close()

        log_info('Time entry created', entry_id=entry_id, project_id=project_id, hours=hours)

        return {
            'success': True,
            'data': result['data'],
            'message': f'{hours}시간의 작업 시간이 기록되었습니다'
        }

    except Exception as e:
        log_error('Failed to create time entry', error=str(e))
        return {
            'success': False,
            'data': None,
            'message': '작업 시간 기록에 실패했습니다',
            'error': str(e)
        }


def get_by_id(entry_id):
    """
    Get time entry by ID with project and client information

    Args:
        entry_id (int): Time entry ID

    Returns:
        dict: {'success': bool, 'data': dict or None, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                te.id, te.project_id, te.date, te.hours, te.billable,
                te.description, te.task_type, te.notes,
                te.created_at, te.updated_at, te.created_by, te.manual_edit, te.source,
                p.name as project_name,
                c.name as client_name
            FROM time_entries te
            LEFT JOIN projects p ON te.project_id = p.id
            LEFT JOIN clients c ON p.client_id = c.id
            WHERE te.id = ?
        """, (entry_id,))

        row = cursor.fetchone()
        conn.close()

        if row:
            return {'success': True, 'data': dict(row)}
        else:
            return {
                'success': False,
                'data': None,
                'error': '작업 시간 기록을 찾을 수 없습니다'
            }

    except Exception as e:
        log_error('Failed to get time entry', entry_id=entry_id, error=str(e))
        return {
            'success': False,
            'data': None,
            'error': str(e)
        }


def get_all():
    """
    Get all time entries with project and client information

    Returns:
        dict: {'success': bool, 'data': list, 'total': int, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                te.id, te.project_id, te.date, te.hours, te.billable,
                te.description, te.task_type,
                te.created_at, te.updated_at,
                p.name as project_name,
                c.name as client_name
            FROM time_entries te
            LEFT JOIN projects p ON te.project_id = p.id
            LEFT JOIN clients c ON p.client_id = c.id
            ORDER BY te.date DESC, te.created_at DESC
        """)

        rows = cursor.fetchall()
        conn.close()

        entries = [dict(row) for row in rows]

        return {
            'success': True,
            'data': entries,
            'total': len(entries)
        }

    except Exception as e:
        log_error('Failed to get all time entries', error=str(e))
        return {
            'success': False,
            'data': [],
            'total': 0,
            'error': str(e)
        }


def get_by_project(project_id):
    """
    Get all time entries for a specific project

    Args:
        project_id (int): Project ID

    Returns:
        dict: {'success': bool, 'data': list, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                te.id, te.project_id, te.date, te.hours, te.billable,
                te.description, te.task_type,
                te.created_at, te.updated_at,
                p.name as project_name,
                c.name as client_name
            FROM time_entries te
            LEFT JOIN projects p ON te.project_id = p.id
            LEFT JOIN clients c ON p.client_id = c.id
            WHERE te.project_id = ?
            ORDER BY te.date DESC, te.created_at DESC
        """, (project_id,))

        rows = cursor.fetchall()
        conn.close()

        entries = [dict(row) for row in rows]

        return {
            'success': True,
            'data': entries
        }

    except Exception as e:
        log_error('Failed to get time entries by project', project_id=project_id, error=str(e))
        return {
            'success': False,
            'data': [],
            'error': str(e)
        }


def get_by_date_range(start_date, end_date):
    """
    Get time entries within a date range

    Args:
        start_date (str): Start date (YYYY-MM-DD)
        end_date (str): End date (YYYY-MM-DD)

    Returns:
        dict: {'success': bool, 'data': list, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                te.id, te.project_id, te.date, te.hours, te.billable,
                te.description, te.task_type,
                te.created_at, te.updated_at,
                p.name as project_name,
                c.name as client_name
            FROM time_entries te
            LEFT JOIN projects p ON te.project_id = p.id
            LEFT JOIN clients c ON p.client_id = c.id
            WHERE te.date BETWEEN ? AND ?
            ORDER BY te.date DESC, te.created_at DESC
        """, (start_date, end_date))

        rows = cursor.fetchall()
        conn.close()

        entries = [dict(row) for row in rows]

        return {
            'success': True,
            'data': entries
        }

    except Exception as e:
        log_error('Failed to get time entries by date range', start_date=start_date, end_date=end_date, error=str(e))
        return {
            'success': False,
            'data': [],
            'error': str(e)
        }


def get_by_billable(billable='Y'):
    """
    Get time entries by billable status

    Args:
        billable (str): 'Y' or 'N'

    Returns:
        dict: {'success': bool, 'data': list, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                te.id, te.project_id, te.date, te.hours, te.billable,
                te.description, te.task_type,
                te.created_at, te.updated_at,
                p.name as project_name,
                c.name as client_name
            FROM time_entries te
            LEFT JOIN projects p ON te.project_id = p.id
            LEFT JOIN clients c ON p.client_id = c.id
            WHERE te.billable = ?
            ORDER BY te.date DESC, te.created_at DESC
        """, (billable,))

        rows = cursor.fetchall()
        conn.close()

        entries = [dict(row) for row in rows]

        return {
            'success': True,
            'data': entries
        }

    except Exception as e:
        log_error('Failed to get time entries by billable', billable=billable, error=str(e))
        return {
            'success': False,
            'data': [],
            'error': str(e)
        }


def update(entry_id, project_id=None, date_worked=None, hours=None, billable=None,
           description=None, task_type=None, notes=None):
    """
    Update time entry

    Args:
        entry_id (int): Time entry ID
        project_id (int): Project ID
        date_worked (str): Date of work
        hours (float): Hours worked
        billable (str): Billable flag
        description (str): Work description
        task_type (str): Task type
        notes (str): Notes

    Returns:
        dict: {'success': bool, 'data': dict or None, 'message': str, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE time_entries
            SET project_id = ?, date = ?, hours = ?, billable = ?,
                description = ?, task_type = ?, notes = ?,
                updated_at = CURRENT_TIMESTAMP, manual_edit = 'Y'
            WHERE id = ?
        """, (project_id, date_worked, hours, billable, description, task_type, notes, entry_id))

        conn.commit()

        if cursor.rowcount == 0:
            conn.close()
            return {
                'success': False,
                'data': None,
                'message': '작업 시간 기록을 찾을 수 없습니다',
                'error': 'NOT_FOUND'
            }

        result = get_by_id(entry_id)
        conn.close()

        log_info('Time entry updated', entry_id=entry_id)

        return {
            'success': True,
            'data': result['data'],
            'message': '작업 시간 기록이 수정되었습니다'
        }

    except Exception as e:
        log_error('Failed to update time entry', entry_id=entry_id, error=str(e))
        return {
            'success': False,
            'data': None,
            'message': '작업 시간 기록 수정에 실패했습니다',
            'error': str(e)
        }


def delete(entry_id):
    """
    Delete time entry

    Args:
        entry_id (int): Time entry ID

    Returns:
        dict: {'success': bool, 'message': str, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM time_entries WHERE id = ?", (entry_id,))
        conn.commit()

        if cursor.rowcount == 0:
            conn.close()
            return {
                'success': False,
                'message': '작업 시간 기록을 찾을 수 없습니다',
                'error': 'NOT_FOUND'
            }

        conn.close()
        log_info('Time entry deleted', entry_id=entry_id)

        return {
            'success': True,
            'message': '작업 시간 기록이 삭제되었습니다'
        }

    except Exception as e:
        log_error('Failed to delete time entry', entry_id=entry_id, error=str(e))
        return {
            'success': False,
            'message': '작업 시간 기록 삭제에 실패했습니다',
            'error': str(e)
        }


def calculate_project_totals(project_id):
    """
    Calculate total hours for a project (billable and non-billable)

    Args:
        project_id (int): Project ID

    Returns:
        dict: {'success': bool, 'data': dict with totals, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                SUM(CASE WHEN billable = 'Y' THEN hours ELSE 0 END) as billable_hours,
                SUM(CASE WHEN billable = 'N' THEN hours ELSE 0 END) as non_billable_hours,
                SUM(hours) as total_hours,
                COUNT(*) as entry_count
            FROM time_entries
            WHERE project_id = ?
        """, (project_id,))

        row = cursor.fetchone()
        conn.close()

        if row:
            data = dict(row)
            return {
                'success': True,
                'data': {
                    'billable_hours': data['billable_hours'] or 0,
                    'non_billable_hours': data['non_billable_hours'] or 0,
                    'total_hours': data['total_hours'] or 0,
                    'entry_count': data['entry_count'] or 0
                }
            }
        else:
            return {
                'success': True,
                'data': {
                    'billable_hours': 0,
                    'non_billable_hours': 0,
                    'total_hours': 0,
                    'entry_count': 0
                }
            }

    except Exception as e:
        log_error('Failed to calculate project totals', project_id=project_id, error=str(e))
        return {
            'success': False,
            'data': None,
            'error': str(e)
        }


def calculate_date_range_totals(start_date, end_date):
    """
    Calculate total hours within a date range

    Args:
        start_date (str): Start date (YYYY-MM-DD)
        end_date (str): End date (YYYY-MM-DD)

    Returns:
        dict: {'success': bool, 'data': dict with totals, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                SUM(CASE WHEN billable = 'Y' THEN hours ELSE 0 END) as billable_hours,
                SUM(CASE WHEN billable = 'N' THEN hours ELSE 0 END) as non_billable_hours,
                SUM(hours) as total_hours,
                COUNT(*) as entry_count,
                COUNT(DISTINCT project_id) as project_count
            FROM time_entries
            WHERE date BETWEEN ? AND ?
        """, (start_date, end_date))

        row = cursor.fetchone()
        conn.close()

        if row:
            data = dict(row)
            return {
                'success': True,
                'data': {
                    'billable_hours': data['billable_hours'] or 0,
                    'non_billable_hours': data['non_billable_hours'] or 0,
                    'total_hours': data['total_hours'] or 0,
                    'entry_count': data['entry_count'] or 0,
                    'project_count': data['project_count'] or 0
                }
            }
        else:
            return {
                'success': True,
                'data': {
                    'billable_hours': 0,
                    'non_billable_hours': 0,
                    'total_hours': 0,
                    'entry_count': 0,
                    'project_count': 0
                }
            }

    except Exception as e:
        log_error('Failed to calculate date range totals', start_date=start_date, end_date=end_date, error=str(e))
        return {
            'success': False,
            'data': None,
            'error': str(e)
        }
