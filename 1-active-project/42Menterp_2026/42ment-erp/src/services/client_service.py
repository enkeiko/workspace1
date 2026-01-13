"""
Client service - Business logic for client management
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.models import client as client_model
from src.models import adjustment as adjustment_model
from src.utils.validators import (
    validate_non_empty, validate_max_length,
    validate_email, validate_phone
)
from src.utils.logger import log_info, log_error


def validate_client_data(name, email=None, phone=None):
    """
    Validate client input data

    Args:
        name (str): Client name
        email (str): Email
        phone (str): Phone

    Returns:
        dict: {'valid': bool, 'errors': list}
    """
    errors = []

    # Validate name
    result = validate_non_empty(name, '고객 이름')
    if not result['valid']:
        errors.append(result['error'])

    result = validate_max_length(name, 100, '고객 이름')
    if not result['valid']:
        errors.append(result['error'])

    # Validate email (optional)
    if email:
        result = validate_email(email)
        if not result['valid']:
            errors.append(result['error'])

    # Validate phone (optional)
    if phone:
        result = validate_phone(phone)
        if not result['valid']:
            errors.append(result['error'])

    return {
        'valid': len(errors) == 0,
        'errors': errors
    }


def create_client(name, email=None, phone=None, company=None, address=None, notes=None):
    """
    Create new client with validation and adjustment logging

    Args:
        name (str): Client name
        email (str): Email
        phone (str): Phone
        company (str): Company
        address (str): Address
        notes (str): Notes

    Returns:
        dict: Result from model create
    """
    # Validate data
    validation = validate_client_data(name, email, phone)
    if not validation['valid']:
        return {
            'success': False,
            'data': None,
            'message': '입력 데이터가 올바르지 않습니다',
            'error': '\n'.join(validation['errors'])
        }

    # Create client
    result = client_model.create(name, email, phone, company, address, notes)

    if result['success']:
        # Log creation in adjustment table
        client_id = result['data']['id']
        adjustment_model.create(
            ref_type='client',
            ref_id=client_id,
            field_name='created',
            old_value=None,
            new_value={'name': name, 'email': email, 'phone': phone},
            reason='새 고객 등록',
            adjusted_by='user'
        )

    return result


def update_client(client_id, updates, reason):
    """
    Update client with validation and adjustment logging

    Args:
        client_id (int): Client ID
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
    current_result = client_model.get_by_id(client_id)
    if not current_result['success']:
        return current_result

    current_data = current_result['data']

    # Validate new data
    validation = validate_client_data(
        updates.get('name', current_data['name']),
        updates.get('email'),
        updates.get('phone')
    )
    if not validation['valid']:
        return {
            'success': False,
            'data': None,
            'message': '입력 데이터가 올바르지 않습니다',
            'error': '\n'.join(validation['errors'])
        }

    # Update client
    result = client_model.update(
        client_id,
        name=updates.get('name'),
        email=updates.get('email'),
        phone=updates.get('phone'),
        company=updates.get('company'),
        address=updates.get('address'),
        notes=updates.get('notes')
    )

    if result['success']:
        # Log each field change
        for field, new_value in updates.items():
            old_value = current_data.get(field)
            if old_value != new_value:
                adjustment_model.create(
                    ref_type='client',
                    ref_id=client_id,
                    field_name=field,
                    old_value=old_value,
                    new_value=new_value,
                    reason=reason,
                    adjusted_by='user'
                )

    return result


def get_client(client_id):
    """
    Get client by ID

    Args:
        client_id (int): Client ID

    Returns:
        dict: Result from model
    """
    return client_model.get_by_id(client_id)


def get_all_clients():
    """
    Get all clients

    Returns:
        dict: Result from model
    """
    return client_model.get_all()


def search_clients(query, search_type='name'):
    """
    Search clients by name or email

    Args:
        query (str): Search query
        search_type (str): 'name' or 'email'

    Returns:
        dict: Search results
    """
    if not query or not query.strip():
        return get_all_clients()

    if search_type == 'email':
        return client_model.search_by_email(query)
    else:
        return client_model.search_by_name(query)


def delete_client(client_id, reason):
    """
    Delete client with reason logging

    Args:
        client_id (int): Client ID
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
    current_result = client_model.get_by_id(client_id)
    if not current_result['success']:
        return current_result

    current_data = current_result['data']

    # Delete client
    result = client_model.delete(client_id)

    if result['success']:
        # Log deletion
        adjustment_model.create(
            ref_type='client',
            ref_id=client_id,
            field_name='deleted',
            old_value=current_data,
            new_value=None,
            reason=reason,
            adjusted_by='user'
        )

    return result


def get_change_history(client_id):
    """
    Get change history for client

    Args:
        client_id (int): Client ID

    Returns:
        dict: Change history from adjustment model
    """
    return adjustment_model.get_change_history('client', client_id)
