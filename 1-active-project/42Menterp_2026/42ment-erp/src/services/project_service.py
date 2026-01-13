"""
Project service - Business logic for project management
"""
import sys
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.models import project as project_model
from src.models import client as client_model
from src.models import adjustment as adjustment_model
from src.utils.validators import (
    validate_non_empty, validate_max_length,
    validate_date_format, validate_date_range,
    validate_positive_number, validate_choice
)
from src.utils.logger import log_info, log_error


VALID_STATUSES = ['active', 'completed', 'on_hold', 'cancelled']


def validate_project_data(name, client_id, start_date=None, end_date=None,
                          status='active', estimated_budget=None, estimated_hours=None):
    """
    Validate project input data

    Args:
        name (str): Project name
        client_id (int): Client ID
        start_date (str): Start date (YYYY-MM-DD)
        end_date (str): End date (YYYY-MM-DD)
        status (str): Project status
        estimated_budget (float): Estimated budget
        estimated_hours (float): Estimated hours

    Returns:
        dict: {'valid': bool, 'errors': list}
    """
    errors = []

    # Validate name
    result = validate_non_empty(name, '프로젝트 이름')
    if not result['valid']:
        errors.append(result['error'])

    result = validate_max_length(name, 200, '프로젝트 이름')
    if not result['valid']:
        errors.append(result['error'])

    # Validate client_id exists
    if client_id:
        client_result = client_model.get_by_id(client_id)
        if not client_result['success']:
            errors.append('유효하지 않은 고객 ID입니다')

    # Validate dates
    if start_date:
        result = validate_date_format(start_date)
        if not result['valid']:
            errors.append(f'시작일: {result["error"]}')

    if end_date:
        result = validate_date_format(end_date)
        if not result['valid']:
            errors.append(f'종료일: {result["error"]}')

    # Validate date range
    if start_date and end_date:
        result = validate_date_range(start_date, end_date)
        if not result['valid']:
            errors.append(result['error'])

    # Validate status
    result = validate_choice(status, VALID_STATUSES, '프로젝트 상태')
    if not result['valid']:
        errors.append(result['error'])

    # Validate estimated budget
    if estimated_budget is not None:
        result = validate_positive_number(estimated_budget, '예상 예산')
        if not result['valid']:
            errors.append(result['error'])

    # Validate estimated hours
    if estimated_hours is not None:
        result = validate_positive_number(estimated_hours, '예상 작업 시간')
        if not result['valid']:
            errors.append(result['error'])

    return {
        'valid': len(errors) == 0,
        'errors': errors
    }


def create_project(client_id, name, start_date=None, end_date=None, status='active',
                   estimated_budget=None, estimated_hours=None, notes=None):
    """
    Create new project with validation and adjustment logging

    Args:
        client_id (int): Client ID
        name (str): Project name
        start_date (str): Start date
        end_date (str): End date
        status (str): Status
        estimated_budget (float): Estimated budget
        estimated_hours (float): Estimated hours
        notes (str): Notes

    Returns:
        dict: Result from model create
    """
    # Validate data
    validation = validate_project_data(
        name, client_id, start_date, end_date,
        status, estimated_budget, estimated_hours
    )
    if not validation['valid']:
        return {
            'success': False,
            'data': None,
            'message': '입력 데이터가 올바르지 않습니다',
            'error': '\n'.join(validation['errors'])
        }

    # Create project
    result = project_model.create(
        client_id, name, start_date, end_date, status,
        estimated_budget, estimated_hours, notes
    )

    if result['success']:
        # Log creation in adjustment table
        project_id = result['data']['id']
        adjustment_model.create(
            ref_type='project',
            ref_id=project_id,
            field_name='created',
            old_value=None,
            new_value={
                'name': name,
                'client_id': client_id,
                'start_date': start_date,
                'end_date': end_date,
                'status': status
            },
            reason='새 프로젝트 생성',
            adjusted_by='user'
        )

    return result


def update_project(project_id, updates, reason):
    """
    Update project with validation and adjustment logging

    Args:
        project_id (int): Project ID
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
    current_result = project_model.get_by_id(project_id)
    if not current_result['success']:
        return current_result

    current_data = current_result['data']

    # Validate new data
    validation = validate_project_data(
        updates.get('name', current_data['name']),
        updates.get('client_id', current_data['client_id']),
        updates.get('start_date', current_data['start_date']),
        updates.get('end_date', current_data['end_date']),
        updates.get('status', current_data['status']),
        updates.get('estimated_budget', current_data['estimated_budget']),
        updates.get('estimated_hours', current_data['estimated_hours'])
    )
    if not validation['valid']:
        return {
            'success': False,
            'data': None,
            'message': '입력 데이터가 올바르지 않습니다',
            'error': '\n'.join(validation['errors'])
        }

    # Update project
    result = project_model.update(
        project_id,
        client_id=updates.get('client_id'),
        name=updates.get('name'),
        start_date=updates.get('start_date'),
        end_date=updates.get('end_date'),
        status=updates.get('status'),
        estimated_budget=updates.get('estimated_budget'),
        estimated_hours=updates.get('estimated_hours'),
        notes=updates.get('notes')
    )

    if result['success']:
        # Log each field change
        for field, new_value in updates.items():
            old_value = current_data.get(field)
            if old_value != new_value:
                adjustment_model.create(
                    ref_type='project',
                    ref_id=project_id,
                    field_name=field,
                    old_value=old_value,
                    new_value=new_value,
                    reason=reason,
                    adjusted_by='user'
                )

    return result


def get_project(project_id):
    """
    Get project by ID

    Args:
        project_id (int): Project ID

    Returns:
        dict: Result from model
    """
    return project_model.get_by_id(project_id)


def get_all_projects():
    """
    Get all projects

    Returns:
        dict: Result from model
    """
    return project_model.get_all()


def get_projects_by_client(client_id):
    """
    Get all projects for a specific client

    Args:
        client_id (int): Client ID

    Returns:
        dict: Result from model
    """
    return project_model.get_by_client(client_id)


def get_projects_by_status(status):
    """
    Get projects by status

    Args:
        status (str): Project status

    Returns:
        dict: Result from model
    """
    # Validate status
    result = validate_choice(status, VALID_STATUSES, '프로젝트 상태')
    if not result['valid']:
        return {
            'success': False,
            'data': [],
            'error': result['error']
        }

    return project_model.get_by_status(status)


def search_projects(query):
    """
    Search projects by name

    Args:
        query (str): Search query

    Returns:
        dict: Search results
    """
    if not query or not query.strip():
        return get_all_projects()

    return project_model.search_by_name(query)


def delete_project(project_id, reason):
    """
    Delete project with reason logging

    Args:
        project_id (int): Project ID
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
    current_result = project_model.get_by_id(project_id)
    if not current_result['success']:
        return current_result

    current_data = current_result['data']

    # Delete project
    result = project_model.delete(project_id)

    if result['success']:
        # Log deletion
        adjustment_model.create(
            ref_type='project',
            ref_id=project_id,
            field_name='deleted',
            old_value=current_data,
            new_value=None,
            reason=reason,
            adjusted_by='user'
        )

    return result


def get_change_history(project_id):
    """
    Get change history for project

    Args:
        project_id (int): Project ID

    Returns:
        dict: Change history from adjustment model
    """
    return adjustment_model.get_change_history('project', project_id)


def calculate_project_stats(project_id):
    """
    Calculate project statistics (budget usage, time spent, etc.)

    Args:
        project_id (int): Project ID

    Returns:
        dict: Project statistics
    """
    project_result = project_model.get_by_id(project_id)
    if not project_result['success']:
        return project_result

    project = project_result['data']

    stats = {
        'estimated_budget': project.get('estimated_budget') or 0,
        'actual_budget': project.get('actual_budget') or 0,
        'estimated_hours': project.get('estimated_hours') or 0,
        'actual_hours': project.get('actual_hours') or 0,
        'budget_usage_percent': 0,
        'hours_usage_percent': 0,
        'budget_remaining': 0,
        'hours_remaining': 0
    }

    # Calculate budget percentages
    if stats['estimated_budget'] > 0:
        stats['budget_usage_percent'] = (stats['actual_budget'] / stats['estimated_budget']) * 100
        stats['budget_remaining'] = stats['estimated_budget'] - stats['actual_budget']

    # Calculate hours percentages
    if stats['estimated_hours'] > 0:
        stats['hours_usage_percent'] = (stats['actual_hours'] / stats['estimated_hours']) * 100
        stats['hours_remaining'] = stats['estimated_hours'] - stats['actual_hours']

    return {
        'success': True,
        'data': stats
    }
