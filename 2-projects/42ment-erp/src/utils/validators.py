"""
Input validation utilities
"""
import re
from datetime import datetime


def validate_email(email):
    """
    Validate email format

    Args:
        email (str): Email address to validate

    Returns:
        dict: {'valid': bool, 'error': str or None}
    """
    if not email:
        return {'valid': True, 'error': None}  # Email is optional

    # Basic email regex pattern
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

    if re.match(pattern, email):
        return {'valid': True, 'error': None}
    else:
        return {'valid': False, 'error': '올바른 이메일 형식이 아닙니다'}


def validate_phone(phone):
    """
    Validate Korean phone number format

    Args:
        phone (str): Phone number to validate

    Returns:
        dict: {'valid': bool, 'error': str or None}
    """
    if not phone:
        return {'valid': True, 'error': None}  # Phone is optional

    # Korean phone number pattern: 010-####-#### or 02-###-####
    pattern = r'^0\d{1,2}-\d{3,4}-\d{4}$'

    if re.match(pattern, phone):
        return {'valid': True, 'error': None}
    else:
        return {
            'valid': False,
            'error': '올바른 전화번호 형식이 아닙니다 (예: 010-1234-5678)'
        }


def validate_date(date_str, format='%Y-%m-%d'):
    """
    Validate date string format

    Args:
        date_str (str): Date string to validate
        format (str): Expected date format

    Returns:
        dict: {'valid': bool, 'error': str or None, 'date': datetime or None}
    """
    if not date_str:
        return {'valid': True, 'error': None, 'date': None}

    try:
        date_obj = datetime.strptime(date_str, format)
        return {'valid': True, 'error': None, 'date': date_obj}
    except ValueError:
        return {
            'valid': False,
            'error': f'올바른 날짜 형식이 아닙니다 (예: {datetime.now().strftime(format)})',
            'date': None
        }


def validate_date_format(date_str, format='%Y-%m-%d'):
    """
    Validate date string format (alias for validate_date for backward compatibility)

    Args:
        date_str (str): Date string to validate
        format (str): Expected date format

    Returns:
        dict: {'valid': bool, 'error': str or None}
    """
    result = validate_date(date_str, format)
    return {'valid': result['valid'], 'error': result['error']}


def validate_date_range(start_date_str, end_date_str, format='%Y-%m-%d'):
    """
    Validate date range (start_date <= end_date)

    Args:
        start_date_str (str): Start date string
        end_date_str (str): End date string
        format (str): Date format

    Returns:
        dict: {'valid': bool, 'error': str or None}
    """
    if not start_date_str or not end_date_str:
        return {'valid': True, 'error': None}

    start_result = validate_date(start_date_str, format)
    end_result = validate_date(end_date_str, format)

    if not start_result['valid']:
        return start_result

    if not end_result['valid']:
        return end_result

    if start_result['date'] > end_result['date']:
        return {
            'valid': False,
            'error': '종료일은 시작일보다 이후여야 합니다'
        }

    return {'valid': True, 'error': None}


def validate_non_empty(value, field_name='필드'):
    """
    Validate non-empty string

    Args:
        value (str): Value to validate
        field_name (str): Field name for error message

    Returns:
        dict: {'valid': bool, 'error': str or None}
    """
    if not value or not value.strip():
        return {
            'valid': False,
            'error': f'{field_name}은(는) 필수입니다'
        }

    return {'valid': True, 'error': None}


def validate_max_length(value, max_length, field_name='필드'):
    """
    Validate maximum string length

    Args:
        value (str): Value to validate
        max_length (int): Maximum allowed length
        field_name (str): Field name for error message

    Returns:
        dict: {'valid': bool, 'error': str or None}
    """
    if not value:
        return {'valid': True, 'error': None}

    if len(value) > max_length:
        return {
            'valid': False,
            'error': f'{field_name}은(는) 최대 {max_length}자까지 입력 가능합니다'
        }

    return {'valid': True, 'error': None}


def validate_positive_number(value, field_name='값', allow_zero=False):
    """
    Validate positive number

    Args:
        value (float or int): Value to validate
        field_name (str): Field name for error message
        allow_zero (bool): Whether to allow zero values

    Returns:
        dict: {'valid': bool, 'error': str or None}
    """
    try:
        num = float(value)
        if allow_zero:
            if num < 0:
                return {
                    'valid': False,
                    'error': f'{field_name}은(는) 0 이상이어야 합니다'
                }
        else:
            if num <= 0:
                return {
                    'valid': False,
                    'error': f'{field_name}은(는) 0보다 커야 합니다'
                }
        return {'valid': True, 'error': None}
    except (ValueError, TypeError):
        return {
            'valid': False,
            'error': f'{field_name}은(는) 숫자여야 합니다'
        }


def validate_hours(hours):
    """
    Validate hours (0 < hours <= 24)

    Args:
        hours (float): Hours to validate

    Returns:
        dict: {'valid': bool, 'error': str or None}
    """
    result = validate_positive_number(hours, '작업 시간')
    if not result['valid']:
        return result

    if float(hours) > 24:
        return {
            'valid': False,
            'error': '작업 시간은 24시간을 초과할 수 없습니다'
        }

    return {'valid': True, 'error': None}


def validate_choice(value, choices, field_name='값'):
    """
    Validate value is in allowed choices

    Args:
        value (str): Value to validate
        choices (list): List of allowed values
        field_name (str): Field name for error message

    Returns:
        dict: {'valid': bool, 'error': str or None}
    """
    if value not in choices:
        return {
            'valid': False,
            'error': f'{field_name}은(는) {", ".join(choices)} 중 하나여야 합니다'
        }

    return {'valid': True, 'error': None}
