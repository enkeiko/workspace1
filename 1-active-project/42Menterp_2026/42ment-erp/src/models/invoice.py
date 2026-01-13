"""
Invoice model - CRUD operations for invoice entity
"""
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.database.db import get_connection
from src.utils.logger import log_info, log_error


def create(client_id, project_id, invoice_number, invoice_date, due_date,
           subtotal, tax, total, status='draft', notes=None):
    """
    Create new invoice

    Args:
        client_id (int): Client ID (required, foreign key)
        project_id (int): Project ID (foreign key)
        invoice_number (str): Invoice number (required, unique)
        invoice_date (str): Invoice date (YYYY-MM-DD)
        due_date (str): Due date (YYYY-MM-DD)
        subtotal (float): Subtotal amount
        tax (float): Tax amount
        total (float): Total amount
        status (str): Invoice status (draft, sent, paid, overdue, cancelled)
        notes (str): Additional notes

    Returns:
        dict: {'success': bool, 'data': dict or None, 'message': str, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO invoices (
                client_id, project_id, invoice_number, invoice_date, due_date,
                subtotal, tax, total, status, notes
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (client_id, project_id, invoice_number, invoice_date, due_date,
              subtotal, tax, total, status, notes))

        conn.commit()
        invoice_id = cursor.lastrowid

        result = get_by_id(invoice_id)
        conn.close()

        log_info('Invoice created', invoice_id=invoice_id, invoice_number=invoice_number, total=total)

        return {
            'success': True,
            'data': result['data'],
            'message': f'인보이스 {invoice_number}이(가) 생성되었습니다'
        }

    except Exception as e:
        log_error('Failed to create invoice', error=str(e))
        return {
            'success': False,
            'data': None,
            'message': '인보이스 생성에 실패했습니다',
            'error': str(e)
        }


def get_by_id(invoice_id):
    """
    Get invoice by ID with client and project information

    Args:
        invoice_id (int): Invoice ID

    Returns:
        dict: {'success': bool, 'data': dict or None, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                i.id, i.client_id, i.project_id, i.invoice_number,
                i.invoice_date, i.due_date, i.subtotal, i.tax, i.total,
                i.status, i.notes, i.pdf_path,
                i.created_at, i.updated_at, i.created_by, i.manual_edit, i.source,
                c.name as client_name, c.email as client_email, c.company as client_company,
                c.address as client_address,
                p.name as project_name
            FROM invoices i
            LEFT JOIN clients c ON i.client_id = c.id
            LEFT JOIN projects p ON i.project_id = p.id
            WHERE i.id = ?
        """, (invoice_id,))

        row = cursor.fetchone()
        conn.close()

        if row:
            return {'success': True, 'data': dict(row)}
        else:
            return {
                'success': False,
                'data': None,
                'error': '인보이스를 찾을 수 없습니다'
            }

    except Exception as e:
        log_error('Failed to get invoice', invoice_id=invoice_id, error=str(e))
        return {
            'success': False,
            'data': None,
            'error': str(e)
        }


def get_by_invoice_number(invoice_number):
    """
    Get invoice by invoice number

    Args:
        invoice_number (str): Invoice number

    Returns:
        dict: {'success': bool, 'data': dict or None, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                i.id, i.client_id, i.project_id, i.invoice_number,
                i.invoice_date, i.due_date, i.subtotal, i.tax, i.total,
                i.status, i.notes, i.pdf_path,
                i.created_at, i.updated_at,
                c.name as client_name,
                p.name as project_name
            FROM invoices i
            LEFT JOIN clients c ON i.client_id = c.id
            LEFT JOIN projects p ON i.project_id = p.id
            WHERE i.invoice_number = ?
        """, (invoice_number,))

        row = cursor.fetchone()
        conn.close()

        if row:
            return {'success': True, 'data': dict(row)}
        else:
            return {
                'success': False,
                'data': None,
                'error': f'인보이스 번호 {invoice_number}를 찾을 수 없습니다'
            }

    except Exception as e:
        log_error('Failed to get invoice by number', invoice_number=invoice_number, error=str(e))
        return {
            'success': False,
            'data': None,
            'error': str(e)
        }


def get_all():
    """
    Get all invoices with client and project information

    Returns:
        dict: {'success': bool, 'data': list, 'total': int, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                i.id, i.client_id, i.project_id, i.invoice_number,
                i.invoice_date, i.due_date, i.subtotal, i.tax, i.total,
                i.status, i.pdf_path,
                i.created_at, i.updated_at,
                c.name as client_name,
                p.name as project_name
            FROM invoices i
            LEFT JOIN clients c ON i.client_id = c.id
            LEFT JOIN projects p ON i.project_id = p.id
            ORDER BY i.invoice_date DESC, i.created_at DESC
        """)

        rows = cursor.fetchall()
        conn.close()

        invoices = [dict(row) for row in rows]

        return {
            'success': True,
            'data': invoices,
            'total': len(invoices)
        }

    except Exception as e:
        log_error('Failed to get all invoices', error=str(e))
        return {
            'success': False,
            'data': [],
            'total': 0,
            'error': str(e)
        }


def get_by_client(client_id):
    """
    Get all invoices for a specific client

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
                i.id, i.client_id, i.project_id, i.invoice_number,
                i.invoice_date, i.due_date, i.subtotal, i.tax, i.total,
                i.status, i.pdf_path,
                i.created_at, i.updated_at,
                c.name as client_name,
                p.name as project_name
            FROM invoices i
            LEFT JOIN clients c ON i.client_id = c.id
            LEFT JOIN projects p ON i.project_id = p.id
            WHERE i.client_id = ?
            ORDER BY i.invoice_date DESC
        """, (client_id,))

        rows = cursor.fetchall()
        conn.close()

        invoices = [dict(row) for row in rows]

        return {
            'success': True,
            'data': invoices
        }

    except Exception as e:
        log_error('Failed to get invoices by client', client_id=client_id, error=str(e))
        return {
            'success': False,
            'data': [],
            'error': str(e)
        }


def get_by_project(project_id):
    """
    Get all invoices for a specific project

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
                i.id, i.client_id, i.project_id, i.invoice_number,
                i.invoice_date, i.due_date, i.subtotal, i.tax, i.total,
                i.status, i.pdf_path,
                i.created_at, i.updated_at,
                c.name as client_name,
                p.name as project_name
            FROM invoices i
            LEFT JOIN clients c ON i.client_id = c.id
            LEFT JOIN projects p ON i.project_id = p.id
            WHERE i.project_id = ?
            ORDER BY i.invoice_date DESC
        """, (project_id,))

        rows = cursor.fetchall()
        conn.close()

        invoices = [dict(row) for row in rows]

        return {
            'success': True,
            'data': invoices
        }

    except Exception as e:
        log_error('Failed to get invoices by project', project_id=project_id, error=str(e))
        return {
            'success': False,
            'data': [],
            'error': str(e)
        }


def get_by_status(status):
    """
    Get all invoices with specific status

    Args:
        status (str): Invoice status (draft, sent, paid, overdue, cancelled)

    Returns:
        dict: {'success': bool, 'data': list, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                i.id, i.client_id, i.project_id, i.invoice_number,
                i.invoice_date, i.due_date, i.subtotal, i.tax, i.total,
                i.status, i.pdf_path,
                i.created_at, i.updated_at,
                c.name as client_name,
                p.name as project_name
            FROM invoices i
            LEFT JOIN clients c ON i.client_id = c.id
            LEFT JOIN projects p ON i.project_id = p.id
            WHERE i.status = ?
            ORDER BY i.invoice_date DESC
        """, (status,))

        rows = cursor.fetchall()
        conn.close()

        invoices = [dict(row) for row in rows]

        return {
            'success': True,
            'data': invoices
        }

    except Exception as e:
        log_error('Failed to get invoices by status', status=status, error=str(e))
        return {
            'success': False,
            'data': [],
            'error': str(e)
        }


def update(invoice_id, client_id=None, project_id=None, invoice_number=None,
           invoice_date=None, due_date=None, subtotal=None, tax=None, total=None,
           status=None, notes=None):
    """
    Update invoice

    Args:
        invoice_id (int): Invoice ID
        client_id (int): Client ID
        project_id (int): Project ID
        invoice_number (str): Invoice number
        invoice_date (str): Invoice date
        due_date (str): Due date
        subtotal (float): Subtotal amount
        tax (float): Tax amount
        total (float): Total amount
        status (str): Status
        notes (str): Notes

    Returns:
        dict: {'success': bool, 'data': dict or None, 'message': str, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE invoices
            SET client_id = ?, project_id = ?, invoice_number = ?,
                invoice_date = ?, due_date = ?, subtotal = ?, tax = ?, total = ?,
                status = ?, notes = ?,
                updated_at = CURRENT_TIMESTAMP, manual_edit = 'Y'
            WHERE id = ?
        """, (client_id, project_id, invoice_number, invoice_date, due_date,
              subtotal, tax, total, status, notes, invoice_id))

        conn.commit()

        if cursor.rowcount == 0:
            conn.close()
            return {
                'success': False,
                'data': None,
                'message': '인보이스를 찾을 수 없습니다',
                'error': 'NOT_FOUND'
            }

        result = get_by_id(invoice_id)
        conn.close()

        log_info('Invoice updated', invoice_id=invoice_id)

        return {
            'success': True,
            'data': result['data'],
            'message': '인보이스 정보가 수정되었습니다'
        }

    except Exception as e:
        log_error('Failed to update invoice', invoice_id=invoice_id, error=str(e))
        return {
            'success': False,
            'data': None,
            'message': '인보이스 정보 수정에 실패했습니다',
            'error': str(e)
        }


def update_status(invoice_id, status):
    """
    Update invoice status

    Args:
        invoice_id (int): Invoice ID
        status (str): New status

    Returns:
        dict: {'success': bool, 'message': str, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE invoices
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (status, invoice_id))

        conn.commit()

        if cursor.rowcount == 0:
            conn.close()
            return {
                'success': False,
                'message': '인보이스를 찾을 수 없습니다',
                'error': 'NOT_FOUND'
            }

        conn.close()
        log_info('Invoice status updated', invoice_id=invoice_id, status=status)

        return {
            'success': True,
            'message': f'인보이스 상태가 {status}(으)로 변경되었습니다'
        }

    except Exception as e:
        log_error('Failed to update invoice status', invoice_id=invoice_id, error=str(e))
        return {
            'success': False,
            'message': '인보이스 상태 변경에 실패했습니다',
            'error': str(e)
        }


def update_pdf_path(invoice_id, pdf_path):
    """
    Update invoice PDF path

    Args:
        invoice_id (int): Invoice ID
        pdf_path (str): Path to PDF file

    Returns:
        dict: {'success': bool, 'message': str, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            UPDATE invoices
            SET pdf_path = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (pdf_path, invoice_id))

        conn.commit()

        if cursor.rowcount == 0:
            conn.close()
            return {
                'success': False,
                'message': '인보이스를 찾을 수 없습니다',
                'error': 'NOT_FOUND'
            }

        conn.close()
        log_info('Invoice PDF path updated', invoice_id=invoice_id)

        return {
            'success': True,
            'message': 'PDF 경로가 업데이트되었습니다'
        }

    except Exception as e:
        log_error('Failed to update PDF path', invoice_id=invoice_id, error=str(e))
        return {
            'success': False,
            'message': 'PDF 경로 업데이트에 실패했습니다',
            'error': str(e)
        }


def delete(invoice_id):
    """
    Delete invoice

    Args:
        invoice_id (int): Invoice ID

    Returns:
        dict: {'success': bool, 'message': str, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("DELETE FROM invoices WHERE id = ?", (invoice_id,))
        conn.commit()

        if cursor.rowcount == 0:
            conn.close()
            return {
                'success': False,
                'message': '인보이스를 찾을 수 없습니다',
                'error': 'NOT_FOUND'
            }

        conn.close()
        log_info('Invoice deleted', invoice_id=invoice_id)

        return {
            'success': True,
            'message': '인보이스가 삭제되었습니다'
        }

    except Exception as e:
        log_error('Failed to delete invoice', invoice_id=invoice_id, error=str(e))
        return {
            'success': False,
            'message': '인보이스 삭제에 실패했습니다',
            'error': str(e)
        }


def generate_invoice_number():
    """
    Generate next invoice number in format: INV-YYYYMMDD-XXX

    Returns:
        str: Generated invoice number
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Get today's date prefix
        today = datetime.now().strftime('%Y%m%d')
        prefix = f'INV-{today}'

        # Find the highest sequence number for today
        cursor.execute("""
            SELECT invoice_number
            FROM invoices
            WHERE invoice_number LIKE ?
            ORDER BY invoice_number DESC
            LIMIT 1
        """, (f'{prefix}%',))

        row = cursor.fetchone()
        conn.close()

        if row:
            # Extract sequence number and increment
            last_number = row['invoice_number']
            last_seq = int(last_number.split('-')[-1])
            new_seq = last_seq + 1
        else:
            new_seq = 1

        return f'{prefix}-{new_seq:03d}'

    except Exception as e:
        log_error('Failed to generate invoice number', error=str(e))
        # Fallback to timestamp-based number
        return f'INV-{datetime.now().strftime("%Y%m%d%H%M%S")}'


def calculate_totals_by_status():
    """
    Calculate total amounts grouped by status

    Returns:
        dict: {'success': bool, 'data': dict with status totals, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                status,
                COUNT(*) as count,
                SUM(total) as total_amount
            FROM invoices
            GROUP BY status
        """)

        rows = cursor.fetchall()
        conn.close()

        totals = {row['status']: {'count': row['count'], 'total': row['total_amount']} for row in rows}

        return {
            'success': True,
            'data': totals
        }

    except Exception as e:
        log_error('Failed to calculate totals by status', error=str(e))
        return {
            'success': False,
            'data': None,
            'error': str(e)
        }
