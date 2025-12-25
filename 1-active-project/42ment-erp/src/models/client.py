"""
Client model - CRUD operations for client entity
"""
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.database.db import get_connection
from src.utils.logger import log_info, log_error
from src.utils.validators import validate_email, validate_phone, validate_non_empty, validate_max_length


def create(name, email=None, phone=None, company=None, address=None, notes=None):
    """
    Create new client

    Args:
        name (str): Client name (required)
        email (str): Email address
        phone (str): Phone number
        company (str): Company name
        address (str): Address
        notes (str): Additional notes

    Returns:
        dict: {'success': bool, 'data': dict or None, 'message': str, 'error': str or None}
    """
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO clients (name, email, phone, company, address, notes)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (name, email, phone, company, address, notes))

        conn.commit()
        client_id = cursor.lastrowid

        result = get_by_id(client_id)

        log_info('Client created', client_id=client_id, name=name)

        return {
            'success': True,
            'data': result['data'],
            'message': f'고객 "{name}"이(가) 등록되었습니다'
        }

    except Exception as e:
        if conn:
            conn.rollback()
        log_error('Failed to create client', error=str(e))
        return {
            'success': False,
            'data': None,
            'message': '고객 등록에 실패했습니다',
            'error': str(e)
        }
    finally:
        if conn:
            conn.close()


def get_by_id(client_id):
    """
    Get client by ID

    Args:
        client_id (int): Client ID

    Returns:
        dict: {'success': bool, 'data': dict or None, 'error': str or None}
    """
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, name, email, phone, company, address,
                   created_at, updated_at, created_by, manual_edit, source, notes
            FROM clients
            WHERE id = ?
        """, (client_id,))

        row = cursor.fetchone()

        if row:
            return {'success': True, 'data': dict(row)}
        else:
            return {
                'success': False,
                'data': None,
                'error': '고객을 찾을 수 없습니다'
            }

    except Exception as e:
        log_error('Failed to get client', client_id=client_id, error=str(e))
        return {
            'success': False,
            'data': None,
            'error': str(e)
        }
    finally:
        if conn:
            conn.close()


def get_all():
    """
    Get all clients

    Returns:
        dict: {'success': bool, 'data': list, 'total': int, 'error': str or None}
    """
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, name, email, phone, company, address,
                   created_at, updated_at
            FROM clients
            ORDER BY created_at DESC
        """)

        rows = cursor.fetchall()
        clients = [dict(row) for row in rows]

        return {
            'success': True,
            'data': clients,
            'total': len(clients)
        }

    except Exception as e:
        log_error('Failed to get all clients', error=str(e))
        return {
            'success': False,
            'data': [],
            'total': 0,
            'error': str(e)
        }
    finally:
        if conn:
            conn.close()


def update(client_id, name=None, email=None, phone=None, company=None, address=None, notes=None):
    """
    Update client

    Args:
        client_id (int): Client ID
        name (str): Client name
        email (str): Email
        phone (str): Phone
        company (str): Company
        address (str): Address
        notes (str): Notes

    Returns:
        dict: {'success': bool, 'data': dict or None, 'message': str, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE clients
            SET name = ?, email = ?, phone = ?, company = ?, address = ?, notes = ?,
                updated_at = CURRENT_TIMESTAMP, manual_edit = 'Y'
            WHERE id = ?
        """, (name, email, phone, company, address, notes, client_id))

        conn.commit()

        if cursor.rowcount == 0:
            conn.close()
            return {
                'success': False,
                'data': None,
                'message': '고객을 찾을 수 없습니다',
                'error': 'NOT_FOUND'
            }

        result = get_by_id(client_id)
        conn.close()

        log_info('Client updated', client_id=client_id)

        return {
            'success': True,
            'data': result['data'],
            'message': '고객 정보가 수정되었습니다'
        }

    except Exception as e:
        log_error('Failed to update client', client_id=client_id, error=str(e))
        return {
            'success': False,
            'data': None,
            'message': '고객 정보 수정에 실패했습니다',
            'error': str(e)
        }


def delete(client_id):
    """
    Delete client

    Args:
        client_id (int): Client ID

    Returns:
        dict: {'success': bool, 'message': str, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Check if client has projects
        cursor.execute("SELECT COUNT(*) FROM projects WHERE client_id = ?", (client_id,))
        project_count = cursor.fetchone()[0]

        if project_count > 0:
            conn.close()
            return {
                'success': False,
                'message': f'이 고객에게 연결된 {project_count}개의 프로젝트가 있어 삭제할 수 없습니다',
                'error': 'HAS_PROJECTS'
            }

        cursor.execute("DELETE FROM clients WHERE id = ?", (client_id,))
        conn.commit()

        if cursor.rowcount == 0:
            conn.close()
            return {
                'success': False,
                'message': '고객을 찾을 수 없습니다',
                'error': 'NOT_FOUND'
            }

        conn.close()
        log_info('Client deleted', client_id=client_id)

        return {
            'success': True,
            'message': '고객이 삭제되었습니다'
        }

    except Exception as e:
        log_error('Failed to delete client', client_id=client_id, error=str(e))
        return {
            'success': False,
            'message': '고객 삭제에 실패했습니다',
            'error': str(e)
        }


def search_by_name(query):
    """
    Search clients by name

    Args:
        query (str): Search query

    Returns:
        dict: {'success': bool, 'data': list, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, name, email, phone, company, address,
                   created_at, updated_at
            FROM clients
            WHERE name LIKE ?
            ORDER BY name
        """, (f'%{query}%',))

        rows = cursor.fetchall()
        conn.close()

        clients = [dict(row) for row in rows]

        return {
            'success': True,
            'data': clients
        }

    except Exception as e:
        log_error('Failed to search clients by name', query=query, error=str(e))
        return {
            'success': False,
            'data': [],
            'error': str(e)
        }


def search_by_email(query):
    """
    Search clients by email

    Args:
        query (str): Search query

    Returns:
        dict: {'success': bool, 'data': list, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, name, email, phone, company, address,
                   created_at, updated_at
            FROM clients
            WHERE email LIKE ?
            ORDER BY name
        """, (f'%{query}%',))

        rows = cursor.fetchall()
        conn.close()

        clients = [dict(row) for row in rows]

        return {
            'success': True,
            'data': clients
        }

    except Exception as e:
        log_error('Failed to search clients by email', query=query, error=str(e))
        return {
            'success': False,
            'data': [],
            'error': str(e)
        }
