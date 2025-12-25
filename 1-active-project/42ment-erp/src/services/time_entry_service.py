"""
Time Entry service - Business logic for time entry management
"""
import sys
from pathlib import Path
from datetime import datetime, date

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.models import time_entry as time_entry_model
from src.models import project as project_model
from src.models import adjustment as adjustment_model
from src.utils.validators import (
    validate_date_format, validate_positive_number,
    validate_choice, validate_hours
)
from src.utils.logger import log_info, log_error


VALID_BILLABLE_FLAGS = ['Y', 'N']
VALID_TASK_TYPES = ['development', 'meeting', 'research', 'design', 'testing', 'documentation', 'other']


def validate_time_entry_data(project_id, date_worked, hours, billable='Y', task_type=None):
    """
    Validate time entry input data

    Args:
        project_id (int): Project ID
        date_worked (str): Date of work (YYYY-MM-DD)
        hours (float): Hours worked
        billable (str): Billable flag ('Y' or 'N')
        task_type (str): Type of task

    Returns:
        dict: {'valid': bool, 'errors': list}
    """
    errors = []

    # Validate project_id exists
    if project_id:
        project_result = project_model.get_by_id(project_id)
        if not project_result['success']:
            errors.append('유효하지 않은 프로젝트 ID입니다')

    # Validate date
    if date_worked:
        result = validate_date_format(date_worked)
        if not result['valid']:
            errors.append(f'작업 날짜: {result["error"]}')

    # Validate hours
    if hours is not None:
        result = validate_hours(hours)
        if not result['valid']:
            errors.append(result['error'])
    else:
        errors.append('작업 시간은 필수입니다')

    # Validate billable flag
    result = validate_choice(billable, VALID_BILLABLE_FLAGS, '청구 가능 여부')
    if not result['valid']:
        errors.append(result['error'])

    # Validate task type (optional)
    if task_type:
        result = validate_choice(task_type, VALID_TASK_TYPES, '작업 유형')
        if not result['valid']:
            errors.append(result['error'])

    return {
        'valid': len(errors) == 0,
        'errors': errors
    }


def create_time_entry(project_id, date_worked, hours, billable='Y',
                      description=None, task_type=None, notes=None):
    """
    Create new time entry with validation and adjustment logging

    Args:
        project_id (int): Project ID
        date_worked (str or date): Date of work
        hours (float): Hours worked
        billable (str): Billable flag
        description (str): Work description
        task_type (str): Task type
        notes (str): Notes

    Returns:
        dict: Result from model create
    """
    # Convert date object to string if needed
    if isinstance(date_worked, date):
        date_worked = date_worked.isoformat()

    # Validate data
    validation = validate_time_entry_data(
        project_id, date_worked, hours, billable, task_type
    )
    if not validation['valid']:
        return {
            'success': False,
            'data': None,
            'message': '입력 데이터가 올바르지 않습니다',
            'error': '\n'.join(validation['errors'])
        }

    # Create time entry
    result = time_entry_model.create(
        project_id, date_worked, hours, billable,
        description, task_type, notes
    )

    if result['success']:
        # Log creation in adjustment table
        entry_id = result['data']['id']
        adjustment_model.create(
            ref_type='time_entry',
            ref_id=entry_id,
            field_name='created',
            old_value=None,
            new_value={
                'project_id': project_id,
                'date': date_worked,
                'hours': hours,
                'billable': billable
            },
            reason='새 작업 시간 기록',
            adjusted_by='user'
        )

        # Update project actual hours
        _update_project_actuals(project_id)

    return result


def update_time_entry(entry_id, updates, reason):
    """
    Update time entry with validation and adjustment logging

    Args:
        entry_id (int): Time entry ID
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
    current_result = time_entry_model.get_by_id(entry_id)
    if not current_result['success']:
        return current_result

    current_data = current_result['data']

    # Convert date object to string if needed
    date_worked = updates.get('date', current_data['date'])
    if isinstance(date_worked, date):
        date_worked = date_worked.isoformat()
        updates['date'] = date_worked

    # Validate new data
    validation = validate_time_entry_data(
        updates.get('project_id', current_data['project_id']),
        date_worked,
        updates.get('hours', current_data['hours']),
        updates.get('billable', current_data['billable']),
        updates.get('task_type', current_data['task_type'])
    )
    if not validation['valid']:
        return {
            'success': False,
            'data': None,
            'message': '입력 데이터가 올바르지 않습니다',
            'error': '\n'.join(validation['errors'])
        }

    # Update time entry
    result = time_entry_model.update(
        entry_id,
        project_id=updates.get('project_id'),
        date_worked=date_worked,
        hours=updates.get('hours'),
        billable=updates.get('billable'),
        description=updates.get('description'),
        task_type=updates.get('task_type'),
        notes=updates.get('notes')
    )

    if result['success']:
        # Log each field change
        for field, new_value in updates.items():
            old_value = current_data.get(field)
            if old_value != new_value:
                adjustment_model.create(
                    ref_type='time_entry',
                    ref_id=entry_id,
                    field_name=field,
                    old_value=old_value,
                    new_value=new_value,
                    reason=reason,
                    adjusted_by='user'
                )

        # Update project actual hours if project or hours changed
        if 'project_id' in updates or 'hours' in updates:
            _update_project_actuals(current_data['project_id'])
            if 'project_id' in updates and updates['project_id'] != current_data['project_id']:
                _update_project_actuals(updates['project_id'])

    return result


def get_time_entry(entry_id):
    """
    Get time entry by ID

    Args:
        entry_id (int): Time entry ID

    Returns:
        dict: Result from model
    """
    return time_entry_model.get_by_id(entry_id)


def get_all_time_entries():
    """
    Get all time entries

    Returns:
        dict: Result from model
    """
    return time_entry_model.get_all()


def get_time_entries_by_project(project_id):
    """
    Get all time entries for a specific project

    Args:
        project_id (int): Project ID

    Returns:
        dict: Result from model
    """
    return time_entry_model.get_by_project(project_id)


def get_time_entries_by_date_range(start_date, end_date):
    """
    Get time entries within date range

    Args:
        start_date (str or date): Start date
        end_date (str or date): End date

    Returns:
        dict: Result from model
    """
    # Convert date objects to strings if needed
    if isinstance(start_date, date):
        start_date = start_date.isoformat()
    if isinstance(end_date, date):
        end_date = end_date.isoformat()

    return time_entry_model.get_by_date_range(start_date, end_date)


def get_time_entries_by_billable(billable='Y'):
    """
    Get time entries by billable status

    Args:
        billable (str): 'Y' or 'N'

    Returns:
        dict: Result from model
    """
    # Validate billable flag
    result = validate_choice(billable, VALID_BILLABLE_FLAGS, '청구 가능 여부')
    if not result['valid']:
        return {
            'success': False,
            'data': [],
            'error': result['error']
        }

    return time_entry_model.get_by_billable(billable)


def delete_time_entry(entry_id, reason):
    """
    Delete time entry with reason logging

    Args:
        entry_id (int): Time entry ID
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
    current_result = time_entry_model.get_by_id(entry_id)
    if not current_result['success']:
        return current_result

    current_data = current_result['data']
    project_id = current_data['project_id']

    # Delete time entry
    result = time_entry_model.delete(entry_id)

    if result['success']:
        # Log deletion
        adjustment_model.create(
            ref_type='time_entry',
            ref_id=entry_id,
            field_name='deleted',
            old_value=current_data,
            new_value=None,
            reason=reason,
            adjusted_by='user'
        )

        # Update project actual hours
        _update_project_actuals(project_id)

    return result


def get_change_history(entry_id):
    """
    Get change history for time entry

    Args:
        entry_id (int): Time entry ID

    Returns:
        dict: Change history from adjustment model
    """
    return adjustment_model.get_change_history('time_entry', entry_id)


def get_project_time_summary(project_id):
    """
    Get time summary for a project

    Args:
        project_id (int): Project ID

    Returns:
        dict: Time summary with billable/non-billable breakdown
    """
    return time_entry_model.calculate_project_totals(project_id)


def get_date_range_summary(start_date, end_date):
    """
    Get time summary for a date range

    Args:
        start_date (str or date): Start date
        end_date (str or date): End date

    Returns:
        dict: Time summary with totals
    """
    # Convert date objects to strings if needed
    if isinstance(start_date, date):
        start_date = start_date.isoformat()
    if isinstance(end_date, date):
        end_date = end_date.isoformat()

    return time_entry_model.calculate_date_range_totals(start_date, end_date)


def _update_project_actuals(project_id):
    """
    Internal helper to update project actual hours based on time entries

    Args:
        project_id (int): Project ID
    """
    try:
        # Calculate total hours for project
        totals_result = time_entry_model.calculate_project_totals(project_id)
        if totals_result['success']:
            total_hours = totals_result['data']['total_hours']

            # Update project
            from src.models import project as project_model
            project_model.update_actuals(project_id, actual_hours=total_hours)

            log_info('Project actuals updated', project_id=project_id, actual_hours=total_hours)
    except Exception as e:
        log_error('Failed to update project actuals', project_id=project_id, error=str(e))
