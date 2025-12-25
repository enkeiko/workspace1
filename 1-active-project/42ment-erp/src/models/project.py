"""
Project model - CRUD operations for project entity
"""
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.database.db import get_connection
from src.utils.logger import log_info, log_error


def create(client_id, name, start_date=None, end_date=None, status='active',
           estimated_budget=None, estimated_hours=None, notes=None):
    """
    Create new project

    Args:
        client_id (int): Client ID (required, foreign key)
        name (str): Project name (required)
        start_date (str): Start date (YYYY-MM-DD)
        end_date (str): End date (YYYY-MM-DD)
        status (str): Project status (active, completed, on_hold, cancelled)
        estimated_budget (float): Estimated budget
        estimated_hours (float): Estimated hours
        notes (str): Additional notes

    Returns:
        dict: {'success': bool, 'data': dict or None, 'message': str, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO projects (
                client_id, name, start_date, end_date, status,
                estimated_budget, estimated_hours, notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (client_id, name, start_date, end_date, status,
              estimated_budget, estimated_hours, notes))

        conn.commit()
        project_id = cursor.lastrowid

        result = get_by_id(project_id)
        conn.close()

        log_info('Project created', project_id=project_id, name=name, client_id=client_id)

        return {
            'success': True,
            'data': result['data'],
            'message': f'프로젝트 "{name}"이(가) 생성되었습니다'
        }

    except Exception as e:
        log_error('Failed to create project', error=str(e))
        return {
            'success': False,
            'data': None,
            'message': '프로젝트 생성에 실패했습니다',
            'error': str(e)
        }


def get_by_id(project_id):
    """
    Get project by ID with client information

    Args:
        project_id (int): Project ID

    Returns:
        dict: {'success': bool, 'data': dict or None, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                p.id, p.client_id, p.name, p.start_date, p.end_date, p.status,
                p.estimated_budget, p.estimated_hours, p.actual_budget, p.actual_hours,
                p.created_at, p.updated_at, p.created_by, p.manual_edit, p.source, p.notes,
                c.name as client_name
            FROM projects p
            LEFT JOIN clients c ON p.client_id = c.id
            WHERE p.id = ?
        """, (project_id,))

        row = cursor.fetchone()
        conn.close()

        if row:
            return {'success': True, 'data': dict(row)}
        else:
            return {
                'success': False,
                'data': None,
                'error': '프로젝트를 찾을 수 없습니다'
            }

    except Exception as e:
        log_error('Failed to get project', project_id=project_id, error=str(e))
        return {
            'success': False,
            'data': None,
            'error': str(e)
        }


def get_all():
    """
    Get all projects with client information

    Returns:
        dict: {'success': bool, 'data': list, 'total': int, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                p.id, p.client_id, p.name, p.start_date, p.end_date, p.status,
                p.estimated_budget, p.estimated_hours, p.actual_budget, p.actual_hours,
                p.created_at, p.updated_at,
                c.name as client_name
            FROM projects p
            LEFT JOIN clients c ON p.client_id = c.id
            ORDER BY p.created_at DESC
        """)

        rows = cursor.fetchall()
        conn.close()

        projects = [dict(row) for row in rows]

        return {
            'success': True,
            'data': projects,
            'total': len(projects)
        }

    except Exception as e:
        log_error('Failed to get all projects', error=str(e))
        return {
            'success': False,
            'data': [],
            'total': 0,
            'error': str(e)
        }


def get_by_client(client_id):
    """
    Get all projects for a specific client

    Args:
        client_id (int): Client ID

    Returns:
        dict: {'success': bool, 'data': list, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                p.id, p.client_id, p.name, p.start_date, p.end_date, p.status,
                p.estimated_budget, p.estimated_hours, p.actual_budget, p.actual_hours,
                p.created_at, p.updated_at,
                c.name as client_name
            FROM projects p
            LEFT JOIN clients c ON p.client_id = c.id
            WHERE p.client_id = ?
            ORDER BY p.created_at DESC
        """, (client_id,))

        rows = cursor.fetchall()
        conn.close()

        projects = [dict(row) for row in rows]

        return {
            'success': True,
            'data': projects
        }

    except Exception as e:
        log_error('Failed to get projects by client', client_id=client_id, error=str(e))
        return {
            'success': False,
            'data': [],
            'error': str(e)
        }


def get_by_status(status):
    """
    Get all projects with specific status

    Args:
        status (str): Project status (active, completed, on_hold, cancelled)

    Returns:
        dict: {'success': bool, 'data': list, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                p.id, p.client_id, p.name, p.start_date, p.end_date, p.status,
                p.estimated_budget, p.estimated_hours, p.actual_budget, p.actual_hours,
                p.created_at, p.updated_at,
                c.name as client_name
            FROM projects p
            LEFT JOIN clients c ON p.client_id = c.id
            WHERE p.status = ?
            ORDER BY p.created_at DESC
        """, (status,))

        rows = cursor.fetchall()
        conn.close()

        projects = [dict(row) for row in rows]

        return {
            'success': True,
            'data': projects
        }

    except Exception as e:
        log_error('Failed to get projects by status', status=status, error=str(e))
        return {
            'success': False,
            'data': [],
            'error': str(e)
        }


def update(project_id, client_id=None, name=None, start_date=None, end_date=None,
           status=None, estimated_budget=None, estimated_hours=None, notes=None):
    """
    Update project

    Args:
        project_id (int): Project ID
        client_id (int): Client ID
        name (str): Project name
        start_date (str): Start date
        end_date (str): End date
        status (str): Status
        estimated_budget (float): Estimated budget
        estimated_hours (float): Estimated hours
        notes (str): Notes

    Returns:
        dict: {'success': bool, 'data': dict or None, 'message': str, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE projects
            SET client_id = ?, name = ?, start_date = ?, end_date = ?,
                status = ?, estimated_budget = ?, estimated_hours = ?, notes = ?,
                updated_at = CURRENT_TIMESTAMP, manual_edit = 'Y'
            WHERE id = ?
        """, (client_id, name, start_date, end_date, status,
              estimated_budget, estimated_hours, notes, project_id))

        conn.commit()

        if cursor.rowcount == 0:
            conn.close()
            return {
                'success': False,
                'data': None,
                'message': '프로젝트를 찾을 수 없습니다',
                'error': 'NOT_FOUND'
            }

        result = get_by_id(project_id)
        conn.close()

        log_info('Project updated', project_id=project_id)

        return {
            'success': True,
            'data': result['data'],
            'message': '프로젝트 정보가 수정되었습니다'
        }

    except Exception as e:
        log_error('Failed to update project', project_id=project_id, error=str(e))
        return {
            'success': False,
            'data': None,
            'message': '프로젝트 정보 수정에 실패했습니다',
            'error': str(e)
        }


def update_actuals(project_id, actual_budget=None, actual_hours=None):
    """
    Update actual budget and hours (typically calculated from time entries and invoices)

    Args:
        project_id (int): Project ID
        actual_budget (float): Actual budget spent
        actual_hours (float): Actual hours worked

    Returns:
        dict: {'success': bool, 'message': str, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE projects
            SET actual_budget = ?, actual_hours = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (actual_budget, actual_hours, project_id))

        conn.commit()

        if cursor.rowcount == 0:
            conn.close()
            return {
                'success': False,
                'message': '프로젝트를 찾을 수 없습니다',
                'error': 'NOT_FOUND'
            }

        conn.close()
        log_info('Project actuals updated', project_id=project_id)

        return {
            'success': True,
            'message': '프로젝트 실제 수치가 업데이트되었습니다'
        }

    except Exception as e:
        log_error('Failed to update project actuals', project_id=project_id, error=str(e))
        return {
            'success': False,
            'message': '프로젝트 실제 수치 업데이트에 실패했습니다',
            'error': str(e)
        }


def delete(project_id):
    """
    Delete project

    Args:
        project_id (int): Project ID

    Returns:
        dict: {'success': bool, 'message': str, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Check if project has time entries
        cursor.execute("SELECT COUNT(*) FROM time_entries WHERE project_id = ?", (project_id,))
        time_entry_count = cursor.fetchone()[0]

        # Check if project has invoices
        cursor.execute("SELECT COUNT(*) FROM invoices WHERE project_id = ?", (project_id,))
        invoice_count = cursor.fetchone()[0]

        if time_entry_count > 0 or invoice_count > 0:
            conn.close()
            return {
                'success': False,
                'message': f'이 프로젝트에 연결된 타임엔트리({time_entry_count}개) 또는 인보이스({invoice_count}개)가 있어 삭제할 수 없습니다',
                'error': 'HAS_DEPENDENCIES'
            }

        cursor.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        conn.commit()

        if cursor.rowcount == 0:
            conn.close()
            return {
                'success': False,
                'message': '프로젝트를 찾을 수 없습니다',
                'error': 'NOT_FOUND'
            }

        conn.close()
        log_info('Project deleted', project_id=project_id)

        return {
            'success': True,
            'message': '프로젝트가 삭제되었습니다'
        }

    except Exception as e:
        log_error('Failed to delete project', project_id=project_id, error=str(e))
        return {
            'success': False,
            'message': '프로젝트 삭제에 실패했습니다',
            'error': str(e)
        }


def search_by_name(query):
    """
    Search projects by name

    Args:
        query (str): Search query

    Returns:
        dict: {'success': bool, 'data': list, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                p.id, p.client_id, p.name, p.start_date, p.end_date, p.status,
                p.estimated_budget, p.estimated_hours, p.actual_budget, p.actual_hours,
                p.created_at, p.updated_at,
                c.name as client_name
            FROM projects p
            LEFT JOIN clients c ON p.client_id = c.id
            WHERE p.name LIKE ?
            ORDER BY p.name
        """, (f'%{query}%',))

        rows = cursor.fetchall()
        conn.close()

        projects = [dict(row) for row in rows]

        return {
            'success': True,
            'data': projects
        }

    except Exception as e:
        log_error('Failed to search projects by name', query=query, error=str(e))
        return {
            'success': False,
            'data': [],
            'error': str(e)
        }
