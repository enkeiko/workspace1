"""
Invoice service - Business logic for invoice management
"""
import sys
from pathlib import Path
from datetime import datetime, date

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.models import invoice as invoice_model
from src.models import client as client_model
from src.models import project as project_model
from src.models import time_entry as time_entry_model
from src.models import adjustment as adjustment_model
from src.utils.validators import (
    validate_non_empty, validate_date_format,
    validate_date_range, validate_positive_number,
    validate_choice
)
from src.utils.logger import log_info, log_error


VALID_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled']


def validate_invoice_data(client_id, invoice_number, invoice_date, due_date,
                          subtotal, tax, total, status='draft'):
    """
    Validate invoice input data

    Args:
        client_id (int): Client ID
        invoice_number (str): Invoice number
        invoice_date (str): Invoice date
        due_date (str): Due date
        subtotal (float): Subtotal amount
        tax (float): Tax amount
        total (float): Total amount
        status (str): Invoice status

    Returns:
        dict: {'valid': bool, 'errors': list}
    """
    errors = []

    # Validate client_id exists
    if client_id:
        client_result = client_model.get_by_id(client_id)
        if not client_result['success']:
            errors.append('유효하지 않은 고객 ID입니다')

    # Validate invoice number
    result = validate_non_empty(invoice_number, '인보이스 번호')
    if not result['valid']:
        errors.append(result['error'])

    # Validate dates
    if invoice_date:
        result = validate_date_format(invoice_date)
        if not result['valid']:
            errors.append(f'인보이스 날짜: {result["error"]}')

    if due_date:
        result = validate_date_format(due_date)
        if not result['valid']:
            errors.append(f'지급 기한: {result["error"]}')

    # Validate date range (invoice_date <= due_date)
    if invoice_date and due_date:
        result = validate_date_range(invoice_date, due_date)
        if not result['valid']:
            errors.append('지급 기한은 인보이스 날짜보다 빠를 수 없습니다')

    # Validate amounts
    if subtotal is not None:
        result = validate_positive_number(subtotal, '소계', allow_zero=True)
        if not result['valid']:
            errors.append(result['error'])

    if tax is not None:
        result = validate_positive_number(tax, '세금', allow_zero=True)
        if not result['valid']:
            errors.append(result['error'])

    if total is not None:
        result = validate_positive_number(total, '합계')
        if not result['valid']:
            errors.append(result['error'])

    # Validate status
    result = validate_choice(status, VALID_STATUSES, '인보이스 상태')
    if not result['valid']:
        errors.append(result['error'])

    # Validate math: subtotal + tax should equal total
    if subtotal is not None and tax is not None and total is not None:
        calculated_total = subtotal + tax
        if abs(calculated_total - total) > 0.01:  # Allow small floating point differences
            errors.append(f'합계가 일치하지 않습니다 (소계 + 세금 = {calculated_total:.2f}, 입력된 합계 = {total:.2f})')

    return {
        'valid': len(errors) == 0,
        'errors': errors
    }


def create_invoice(client_id, project_id, invoice_number, invoice_date, due_date,
                   subtotal, tax, total, status='draft', notes=None):
    """
    Create new invoice with validation and adjustment logging

    Args:
        client_id (int): Client ID
        project_id (int): Project ID
        invoice_number (str): Invoice number
        invoice_date (str or date): Invoice date
        due_date (str or date): Due date
        subtotal (float): Subtotal amount
        tax (float): Tax amount
        total (float): Total amount
        status (str): Status
        notes (str): Notes

    Returns:
        dict: Result from model create
    """
    # Convert date objects to strings if needed
    if isinstance(invoice_date, date):
        invoice_date = invoice_date.isoformat()
    if isinstance(due_date, date):
        due_date = due_date.isoformat()

    # Validate data
    validation = validate_invoice_data(
        client_id, invoice_number, invoice_date, due_date,
        subtotal, tax, total, status
    )
    if not validation['valid']:
        return {
            'success': False,
            'data': None,
            'message': '입력 데이터가 올바르지 않습니다',
            'error': '\n'.join(validation['errors'])
        }

    # Create invoice
    result = invoice_model.create(
        client_id, project_id, invoice_number, invoice_date, due_date,
        subtotal, tax, total, status, notes
    )

    if result['success']:
        # Log creation in adjustment table
        invoice_id = result['data']['id']
        adjustment_model.create(
            ref_type='invoice',
            ref_id=invoice_id,
            field_name='created',
            old_value=None,
            new_value={
                'invoice_number': invoice_number,
                'client_id': client_id,
                'project_id': project_id,
                'total': total,
                'status': status
            },
            reason='새 인보이스 생성',
            adjusted_by='user'
        )

    return result


def update_invoice(invoice_id, updates, reason):
    """
    Update invoice with validation and adjustment logging

    Args:
        invoice_id (int): Invoice ID
        updates (dict): Fields to update
        reason (str): Reason for change

    Returns:
        dict: Result from model update
    """
    # Validate reason
    if not reason or not reason.strip():
        return {
            'success': False,
            'data': None,
            'message': '변경 사유는 필수입니다',
            'error': 'REASON_REQUIRED'
        }

    # Get current data for comparison
    current_result = invoice_model.get_by_id(invoice_id)
    if not current_result['success']:
        return current_result

    current_data = current_result['data']

    # Convert date objects to strings if needed
    invoice_date = updates.get('invoice_date', current_data['invoice_date'])
    if isinstance(invoice_date, date):
        invoice_date = invoice_date.isoformat()
        updates['invoice_date'] = invoice_date

    due_date = updates.get('due_date', current_data['due_date'])
    if isinstance(due_date, date):
        due_date = due_date.isoformat()
        updates['due_date'] = due_date

    # Validate new data
    validation = validate_invoice_data(
        updates.get('client_id', current_data['client_id']),
        updates.get('invoice_number', current_data['invoice_number']),
        invoice_date,
        due_date,
        updates.get('subtotal', current_data['subtotal']),
        updates.get('tax', current_data['tax']),
        updates.get('total', current_data['total']),
        updates.get('status', current_data['status'])
    )
    if not validation['valid']:
        return {
            'success': False,
            'data': None,
            'message': '입력 데이터가 올바르지 않습니다',
            'error': '\n'.join(validation['errors'])
        }

    # Update invoice
    result = invoice_model.update(
        invoice_id,
        client_id=updates.get('client_id'),
        project_id=updates.get('project_id'),
        invoice_number=updates.get('invoice_number'),
        invoice_date=invoice_date,
        due_date=due_date,
        subtotal=updates.get('subtotal'),
        tax=updates.get('tax'),
        total=updates.get('total'),
        status=updates.get('status'),
        notes=updates.get('notes')
    )

    if result['success']:
        # Log each field change
        for field, new_value in updates.items():
            old_value = current_data.get(field)
            if old_value != new_value:
                adjustment_model.create(
                    ref_type='invoice',
                    ref_id=invoice_id,
                    field_name=field,
                    old_value=old_value,
                    new_value=new_value,
                    reason=reason,
                    adjusted_by='user'
                )

    return result


def get_invoice(invoice_id):
    """
    Get invoice by ID

    Args:
        invoice_id (int): Invoice ID

    Returns:
        dict: Result from model
    """
    return invoice_model.get_by_id(invoice_id)


def get_invoice_by_number(invoice_number):
    """
    Get invoice by invoice number

    Args:
        invoice_number (str): Invoice number

    Returns:
        dict: Result from model
    """
    return invoice_model.get_by_invoice_number(invoice_number)


def get_all_invoices():
    """
    Get all invoices

    Returns:
        dict: Result from model
    """
    return invoice_model.get_all()


def get_invoices_by_client(client_id):
    """
    Get all invoices for a specific client

    Args:
        client_id (int): Client ID

    Returns:
        dict: Result from model
    """
    return invoice_model.get_by_client(client_id)


def get_invoices_by_project(project_id):
    """
    Get all invoices for a specific project

    Args:
        project_id (int): Project ID

    Returns:
        dict: Result from model
    """
    return invoice_model.get_by_project(project_id)


def get_invoices_by_status(status):
    """
    Get invoices by status

    Args:
        status (str): Invoice status

    Returns:
        dict: Result from model
    """
    # Validate status
    result = validate_choice(status, VALID_STATUSES, '인보이스 상태')
    if not result['valid']:
        return {
            'success': False,
            'data': [],
            'error': result['error']
        }

    return invoice_model.get_by_status(status)


def delete_invoice(invoice_id, reason):
    """
    Delete invoice with reason logging

    Args:
        invoice_id (int): Invoice ID
        reason (str): Reason for deletion

    Returns:
        dict: Result from model
    """
    # Validate reason
    if not reason or not reason.strip():
        return {
            'success': False,
            'message': '삭제 사유는 필수입니다',
            'error': 'REASON_REQUIRED'
        }

    # Get current data before deletion
    current_result = invoice_model.get_by_id(invoice_id)
    if not current_result['success']:
        return current_result

    current_data = current_result['data']

    # Delete invoice
    result = invoice_model.delete(invoice_id)

    if result['success']:
        # Log deletion
        adjustment_model.create(
            ref_type='invoice',
            ref_id=invoice_id,
            field_name='deleted',
            old_value=current_data,
            new_value=None,
            reason=reason,
            adjusted_by='user'
        )

    return result


def update_invoice_status(invoice_id, status, reason):
    """
    Update invoice status with logging

    Args:
        invoice_id (int): Invoice ID
        status (str): New status
        reason (str): Reason for change

    Returns:
        dict: Result from model
    """
    # Validate reason
    if not reason or not reason.strip():
        return {
            'success': False,
            'message': '변경 사유는 필수입니다',
            'error': 'REASON_REQUIRED'
        }

    # Validate status
    result = validate_choice(status, VALID_STATUSES, '인보이스 상태')
    if not result['valid']:
        return {
            'success': False,
            'message': result['error'],
            'error': 'INVALID_STATUS'
        }

    # Get current data
    current_result = invoice_model.get_by_id(invoice_id)
    if not current_result['success']:
        return current_result

    old_status = current_result['data']['status']

    # Update status
    result = invoice_model.update_status(invoice_id, status)

    if result['success']:
        # Log status change
        adjustment_model.create(
            ref_type='invoice',
            ref_id=invoice_id,
            field_name='status',
            old_value=old_status,
            new_value=status,
            reason=reason,
            adjusted_by='user'
        )

    return result


def get_change_history(invoice_id):
    """
    Get change history for invoice

    Args:
        invoice_id (int): Invoice ID

    Returns:
        dict: Change history from adjustment model
    """
    return adjustment_model.get_change_history('invoice', invoice_id)


def generate_invoice_number():
    """
    Generate next invoice number

    Returns:
        str: Generated invoice number
    """
    return invoice_model.generate_invoice_number()


def calculate_invoice_from_time_entries(project_id, start_date=None, end_date=None, hourly_rate=None):
    """
    Calculate invoice amounts from billable time entries

    Args:
        project_id (int): Project ID
        start_date (str or date): Start date for time entries
        end_date (str or date): End date for time entries
        hourly_rate (float): Hourly rate (won per hour)

    Returns:
        dict: Calculated amounts and time entry details
    """
    try:
        # Get time entries for project
        if start_date and end_date:
            # Convert dates if needed
            if isinstance(start_date, date):
                start_date = start_date.isoformat()
            if isinstance(end_date, date):
                end_date = end_date.isoformat()

            entries_result = time_entry_model.get_by_date_range(start_date, end_date)
            if entries_result['success']:
                entries = [e for e in entries_result['data'] if e['project_id'] == project_id and e['billable'] == 'Y']
            else:
                return entries_result
        else:
            entries_result = time_entry_model.get_by_project(project_id)
            if entries_result['success']:
                entries = [e for e in entries_result['data'] if e['billable'] == 'Y']
            else:
                return entries_result

        # Calculate total billable hours
        total_hours = sum(e['hours'] for e in entries)

        # Calculate amounts
        if hourly_rate:
            subtotal = total_hours * hourly_rate
            tax = subtotal * 0.10  # 10% tax
            total = subtotal + tax
        else:
            subtotal = 0
            tax = 0
            total = 0

        return {
            'success': True,
            'data': {
                'entries': entries,
                'total_hours': total_hours,
                'hourly_rate': hourly_rate or 0,
                'subtotal': subtotal,
                'tax': tax,
                'total': total
            }
        }

    except Exception as e:
        log_error('Failed to calculate invoice from time entries', project_id=project_id, error=str(e))
        return {
            'success': False,
            'data': None,
            'error': str(e)
        }


def get_invoice_statistics():
    """
    Get invoice statistics (totals by status)

    Returns:
        dict: Statistics data
    """
    return invoice_model.calculate_totals_by_status()
