"""
Reusable form components for Streamlit UI
"""
import streamlit as st
from datetime import datetime, date


def text_input_with_validation(label, value="", max_chars=None, required=False, help=None):
    """
    Text input with validation

    Args:
        label (str): Input label
        value (str): Default value
        max_chars (int): Maximum characters
        required (bool): Is required field
        help (str): Help text

    Returns:
        str: Input value
    """
    if required:
        label = f"{label} *"

    input_value = st.text_input(
        label,
        value=value,
        max_chars=max_chars,
        help=help
    )

    return input_value


def text_area_with_validation(label, value="", max_chars=None, height=None, required=False, help=None):
    """
    Text area with validation

    Args:
        label (str): Input label
        value (str): Default value
        max_chars (int): Maximum characters
        height (int): Height in pixels
        required (bool): Is required field
        help (str): Help text

    Returns:
        str: Input value
    """
    if required:
        label = f"{label} *"

    input_value = st.text_area(
        label,
        value=value,
        max_chars=max_chars,
        height=height,
        help=help
    )

    return input_value


def date_input_with_validation(label, value=None, min_value=None, max_value=None, required=False, help=None):
    """
    Date input with validation

    Args:
        label (str): Input label
        value: Default value (can be date object, datetime, or string YYYY-MM-DD)
        min_value: Minimum date
        max_value: Maximum date
        required (bool): Is required field
        help (str): Help text

    Returns:
        date: Selected date or None
    """
    if required:
        label = f"{label} *"

    # Handle string date values
    if isinstance(value, str):
        try:
            value = datetime.strptime(value, '%Y-%m-%d').date()
        except (ValueError, TypeError):
            value = None

    # Don't set default date if value is None and not required
    if value is None and not required:
        # Return None for optional empty dates
        try:
            input_value = st.date_input(
                label,
                value=None,
                min_value=min_value,
                max_value=max_value,
                help=help
            )
        except:
            # Fallback if None not supported
            input_value = st.date_input(
                label,
                value=datetime.now().date(),
                min_value=min_value,
                max_value=max_value,
                help=help
            )
    else:
        if value is None:
            value = datetime.now().date()
        input_value = st.date_input(
            label,
            value=value,
            min_value=min_value,
            max_value=max_value,
            help=help
        )

    return input_value


def number_input_with_validation(label, value=0.0, min_value=None, max_value=None, step=None, format=None, required=False, help=None):
    """
    Number input with validation

    Args:
        label (str): Input label
        value: Default value
        min_value: Minimum value
        max_value: Maximum value
        step: Step increment
        format: Display format
        required (bool): Is required field
        help (str): Help text

    Returns:
        float: Input value
    """
    if required:
        label = f"{label} *"

    input_value = st.number_input(
        label,
        value=value,
        min_value=min_value,
        max_value=max_value,
        step=step,
        format=format,
        help=help
    )

    return input_value


def selectbox_with_validation(label, options, index=0, default=None, format_func=None, required=False, help=None):
    """
    Selectbox with validation

    Args:
        label (str): Input label
        options (list): List of options
        index (int): Default selected index (used if default is None)
        default: Default value to select (will find matching index)
        format_func: Function to format option display
        required (bool): Is required field
        help (str): Help text

    Returns:
        Selected value
    """
    if required:
        label = f"{label} *"

    # If default value provided, find its index
    if default is not None:
        try:
            index = list(options).index(default)
        except (ValueError, TypeError):
            # If default not found, use provided index
            pass

    input_value = st.selectbox(
        label,
        options=options,
        index=index,
        format_func=format_func,
        help=help
    )

    return input_value


def checkbox_with_label(label, value=False, help=None):
    """
    Checkbox with label

    Args:
        label (str): Checkbox label
        value (bool): Default value
        help (str): Help text

    Returns:
        bool: Checkbox value
    """
    return st.checkbox(label, value=value, help=help)


def submit_button(label="저장", type="primary", use_container_width=False):
    """
    Form submit button

    Args:
        label (str): Button label
        type (str): Button type ('primary', 'secondary')
        use_container_width (bool): Use full width

    Returns:
        bool: Button clicked
    """
    return st.form_submit_button(
        label,
        type=type,
        use_container_width=use_container_width
    )


def action_buttons(on_submit=None, on_cancel=None, submit_label="저장", cancel_label="취소"):
    """
    Action buttons (Submit and Cancel)

    Args:
        on_submit: Submit callback
        on_cancel: Cancel callback
        submit_label (str): Submit button label
        cancel_label (str): Cancel button label

    Returns:
        tuple: (submit_clicked, cancel_clicked)
    """
    col1, col2 = st.columns(2)

    with col1:
        submit_clicked = st.button(submit_label, type="primary", use_container_width=True)
        if submit_clicked and on_submit:
            on_submit()

    with col2:
        cancel_clicked = st.button(cancel_label, use_container_width=True)
        if cancel_clicked and on_cancel:
            on_cancel()

    return submit_clicked, cancel_clicked


def confirm_dialog(message, key=None):
    """
    Simple confirmation dialog

    Args:
        message (str): Confirmation message
        key (str): Unique key for widget

    Returns:
        bool: User confirmed
    """
    st.warning(message)
    return st.checkbox("예, 확인했습니다", key=key)


def success_message(message):
    """Display success message"""
    st.success(f"✅ {message}")


def error_message(message):
    """Display error message"""
    st.error(f"❌ {message}")


def warning_message(message):
    """Display warning message"""
    st.warning(f"⚠️ {message}")


def info_message(message):
    """Display info message"""
    st.info(f"ℹ️ {message}")
