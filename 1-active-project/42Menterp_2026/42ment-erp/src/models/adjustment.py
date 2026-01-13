"""
Adjustment model for audit logging
Tracks all data changes for transparency (Brand Studio ERP principle)
"""
import json
from datetime import datetime
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.database.db import get_connection
from src.utils.logger import log_info, log_error


def create(ref_type, ref_id, field_name, old_value, new_value, reason, adjusted_by='user'):
    """
    Create new adjustment record

    Args:
        ref_type (str): Entity type ('client', 'project', 'time_entry', 'invoice')
        ref_id (int): Entity ID
        field_name (str): Changed field name
        old_value: Previous value (will be JSON serialized)
        new_value: New value (will be JSON serialized)
        reason (str): Reason for change
        adjusted_by (str): Who made the change ('user', 'system', 'import')

    Returns:
        dict: {'success': bool, 'data': dict or None, 'message': str, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Serialize values to JSON
        old_value_json = json.dumps(old_value, ensure_ascii=False) if old_value is not None else None
        new_value_json = json.dumps(new_value, ensure_ascii=False) if new_value is not None else None

        cursor.execute("""
            INSERT INTO adjustments
            (ref_type, ref_id, field_name, old_value, new_value, reason, adjusted_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (ref_type, ref_id, field_name, old_value_json, new_value_json, reason, adjusted_by))

        conn.commit()
        adjustment_id = cursor.lastrowid

        # Fetch created adjustment
        result = get_by_id(adjustment_id)

        conn.close()

        log_info('Adjustment created', ref_type=ref_type, ref_id=ref_id, field=field_name)

        return {
            'success': True,
            'data': result['data'],
            'message': '변경 이력이 기록되었습니다'
        }

    except Exception as e:
        log_error('Failed to create adjustment', error=str(e))
        return {
            'success': False,
            'data': None,
            'message': '변경 이력 기록에 실패했습니다',
            'error': str(e)
        }


def get_by_id(adjustment_id):
    """
    Get adjustment by ID

    Args:
        adjustment_id (int): Adjustment ID

    Returns:
        dict: {'success': bool, 'data': dict or None, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, ref_type, ref_id, field_name, old_value, new_value, reason, adjusted_by,
                   created_at, created_by, notes
            FROM adjustments
            WHERE id = ?
        """, (adjustment_id,))

        row = cursor.fetchone()
        conn.close()

        if row:
            adjustment = dict(row)
            # Deserialize JSON values
            if adjustment['old_value']:
                adjustment['old_value'] = json.loads(adjustment['old_value'])
            if adjustment['new_value']:
                adjustment['new_value'] = json.loads(adjustment['new_value'])

            return {'success': True, 'data': adjustment}
        else:
            return {
                'success': False,
                'data': None,
                'error': '변경 이력을 찾을 수 없습니다'
            }

    except Exception as e:
        log_error('Failed to get adjustment', adjustment_id=adjustment_id, error=str(e))
        return {
            'success': False,
            'data': None,
            'error': str(e)
        }


def get_by_reference(ref_type, ref_id):
    """
    Get all adjustments for a specific entity

    Args:
        ref_type (str): Entity type
        ref_id (int): Entity ID

    Returns:
        dict: {'success': bool, 'data': list, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT id, ref_type, ref_id, field_name, old_value, new_value, reason, adjusted_by,
                   created_at, created_by, notes
            FROM adjustments
            WHERE ref_type = ? AND ref_id = ?
            ORDER BY created_at DESC
        """, (ref_type, ref_id))

        rows = cursor.fetchall()
        conn.close()

        adjustments = []
        for row in rows:
            adjustment = dict(row)
            # Deserialize JSON values
            if adjustment['old_value']:
                adjustment['old_value'] = json.loads(adjustment['old_value'])
            if adjustment['new_value']:
                adjustment['new_value'] = json.loads(adjustment['new_value'])
            adjustments.append(adjustment)

        return {'success': True, 'data': adjustments}

    except Exception as e:
        log_error('Failed to get adjustments by reference', ref_type=ref_type, ref_id=ref_id, error=str(e))
        return {
            'success': False,
            'data': [],
            'error': str(e)
        }


def get_all(limit=100, offset=0):
    """
    Get all adjustments with pagination

    Args:
        limit (int): Number of records to return
        offset (int): Number of records to skip

    Returns:
        dict: {'success': bool, 'data': list, 'total': int, 'error': str or None}
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Get total count
        cursor.execute("SELECT COUNT(*) FROM adjustments")
        total = cursor.fetchone()[0]

        # Get paginated results
        cursor.execute("""
            SELECT id, ref_type, ref_id, field_name, old_value, new_value, reason, adjusted_by,
                   created_at, created_by, notes
            FROM adjustments
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        """, (limit, offset))

        rows = cursor.fetchall()
        conn.close()

        adjustments = []
        for row in rows:
            adjustment = dict(row)
            # Deserialize JSON values (but keep truncated for list view)
            adjustments.append(adjustment)

        return {
            'success': True,
            'data': adjustments,
            'total': total
        }

    except Exception as e:
        log_error('Failed to get all adjustments', error=str(e))
        return {
            'success': False,
            'data': [],
            'total': 0,
            'error': str(e)
        }


def log_field_change(ref_type, ref_id, field_name, old_value, new_value, reason, adjusted_by='user'):
    """
    Convenience function to log a field change
    This is the primary function used by services

    Args:
        ref_type (str): Entity type
        ref_id (int): Entity ID
        field_name (str): Field that changed
        old_value: Previous value
        new_value: New value
        reason (str): Reason for change
        adjusted_by (str): Who made the change

    Returns:
        dict: Result from create()
    """
    return create(ref_type, ref_id, field_name, old_value, new_value, reason, adjusted_by)


def get_change_history(ref_type, ref_id):
    """
    Get formatted change history for an entity

    Args:
        ref_type (str): Entity type
        ref_id (int): Entity ID

    Returns:
        dict: {'success': bool, 'data': list of formatted history, 'error': str or None}
    """
    result = get_by_reference(ref_type, ref_id)

    if not result['success']:
        return result

    # Format history for display
    history = []
    for adj in result['data']:
        history.append({
            'field': adj['field_name'],
            'old': adj['old_value'],
            'new': adj['new_value'],
            'reason': adj['reason'],
            'by': adj['adjusted_by'],
            'at': adj['created_at']
        })

    return {
        'success': True,
        'data': history
    }
