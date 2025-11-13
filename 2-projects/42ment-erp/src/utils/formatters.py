"""
Data formatting utilities
"""
from datetime import datetime, date


def format_currency(amount):
    """
    Format amount as Korean currency

    Args:
        amount (float or int): Amount to format

    Returns:
        str: Formatted currency string (e.g., "1,234,567원")
    """
    if amount is None:
        return "0원"

    try:
        amount = float(amount)
        return f"{amount:,.0f}원"
    except (ValueError, TypeError):
        return "0원"


def format_date(date_value, format='%Y-%m-%d'):
    """
    Format date to string

    Args:
        date_value: Date object, datetime, or string
        format (str): Output format

    Returns:
        str: Formatted date string
    """
    if date_value is None:
        return ""

    if isinstance(date_value, str):
        return date_value  # Already formatted

    if isinstance(date_value, (date, datetime)):
        return date_value.strftime(format)

    return ""


def format_datetime(datetime_value, format='%Y-%m-%d %H:%M:%S'):
    """
    Format datetime to string

    Args:
        datetime_value: Datetime object or string
        format (str): Output format

    Returns:
        str: Formatted datetime string
    """
    return format_date(datetime_value, format)


def format_hours(hours):
    """
    Format hours as human-readable string

    Args:
        hours (float): Number of hours

    Returns:
        str: Formatted hours string (e.g., "8.5시간")
    """
    if hours is None:
        return "0시간"

    try:
        hours = float(hours)
        return f"{hours:.1f}시간"
    except (ValueError, TypeError):
        return "0시간"


def format_phone(phone):
    """
    Format phone number with hyphens if not already formatted

    Args:
        phone (str): Phone number

    Returns:
        str: Formatted phone number
    """
    if not phone:
        return ""

    # If already formatted, return as is
    if '-' in phone:
        return phone

    # Remove any non-digit characters
    digits = ''.join(c for c in phone if c.isdigit())

    # Format based on length
    if len(digits) == 11:  # Mobile: 010-####-####
        return f"{digits[:3]}-{digits[3:7]}-{digits[7:]}"
    elif len(digits) == 10:  # Seoul: 02-###-####
        return f"{digits[:2]}-{digits[2:5]}-{digits[5:]}"
    elif len(digits) == 9:  # Some landlines: 02-###-###
        return f"{digits[:2]}-{digits[2:5]}-{digits[5:]}"
    else:
        return phone  # Return original if can't format


def format_status_korean(status):
    """
    Convert status code to Korean label

    Args:
        status (str): Status code

    Returns:
        str: Korean status label
    """
    status_map = {
        'active': '진행중',
        'completed': '완료',
        'on_hold': '보류',
        'draft': '초안',
        'sent': '발송',
        'paid': '결제완료',
        'overdue': '연체'
    }

    return status_map.get(status, status)


def format_yes_no_korean(value):
    """
    Convert Y/N to Korean

    Args:
        value (str): Y or N

    Returns:
        str: Korean Yes/No
    """
    if value == 'Y':
        return '예'
    elif value == 'N':
        return '아니오'
    else:
        return value


def format_percentage(value):
    """
    Format as percentage

    Args:
        value (float): Value between 0 and 1

    Returns:
        str: Percentage string (e.g., "85.5%")
    """
    if value is None:
        return "0%"

    try:
        value = float(value)
        return f"{value * 100:.1f}%"
    except (ValueError, TypeError):
        return "0%"


def truncate_text(text, max_length=50, suffix='...'):
    """
    Truncate text to maximum length

    Args:
        text (str): Text to truncate
        max_length (int): Maximum length
        suffix (str): Suffix to append if truncated

    Returns:
        str: Truncated text
    """
    if not text:
        return ""

    if len(text) <= max_length:
        return text

    return text[:max_length - len(suffix)] + suffix
