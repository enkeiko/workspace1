"""
Reusable table components for Streamlit UI
"""
import streamlit as st
import pandas as pd


def display_dataframe(data, columns=None, height=None, use_container_width=True):
    """
    Display data as Streamlit dataframe

    Args:
        data (list): List of dicts or DataFrame
        columns (list): Column names to display
        height (int): Table height
        use_container_width (bool): Use full container width

    Returns:
        None
    """
    if not data:
        st.info("데이터가 없습니다")
        return

    # Convert to DataFrame if needed
    if not isinstance(data, pd.DataFrame):
        df = pd.DataFrame(data)
    else:
        df = data

    # Select columns if specified
    if columns:
        df = df[columns]

    # Display
    st.dataframe(
        df,
        height=height,
        use_container_width=use_container_width
    )


def display_table(data, columns=None):
    """
    Display data as static table

    Args:
        data (list): List of dicts or DataFrame
        columns (list): Column names to display

    Returns:
        None
    """
    if not data:
        st.info("데이터가 없습니다")
        return

    # Convert to DataFrame if needed
    if not isinstance(data, pd.DataFrame):
        df = pd.DataFrame(data)
    else:
        df = data

    # Select columns if specified
    if columns:
        df = df[columns]

    # Display
    st.table(df)


def display_metrics_row(metrics):
    """
    Display metrics in a row

    Args:
        metrics (list): List of dicts with 'label', 'value', 'delta' keys

    Returns:
        None
    """
    cols = st.columns(len(metrics))

    for i, metric in enumerate(metrics):
        with cols[i]:
            st.metric(
                label=metric.get('label', ''),
                value=metric.get('value', ''),
                delta=metric.get('delta'),
                help=metric.get('help')
            )


def display_key_value_pairs(data, title=None):
    """
    Display key-value pairs in a formatted way

    Args:
        data (dict): Dictionary of key-value pairs
        title (str): Optional title

    Returns:
        None
    """
    if title:
        st.subheader(title)

    for key, value in data.items():
        col1, col2 = st.columns([1, 2])
        with col1:
            st.markdown(f"**{key}**")
        with col2:
            st.markdown(value if value is not None else "-")


def create_paginated_table(data, page_size=10, page_key="page"):
    """
    Create paginated table

    Args:
        data (list): List of data items
        page_size (int): Items per page
        page_key (str): Session state key for current page

    Returns:
        list: Current page data
    """
    if not data:
        st.info("데이터가 없습니다")
        return []

    # Initialize page number
    if page_key not in st.session_state:
        st.session_state[page_key] = 1

    total_pages = (len(data) + page_size - 1) // page_size

    # Pagination controls
    col1, col2, col3 = st.columns([1, 2, 1])

    with col1:
        if st.button("◀ 이전", key=f"{page_key}_prev"):
            if st.session_state[page_key] > 1:
                st.session_state[page_key] -= 1

    with col2:
        st.markdown(f"<center>페이지 {st.session_state[page_key]} / {total_pages}</center>", unsafe_allow_html=True)

    with col3:
        if st.button("다음 ▶", key=f"{page_key}_next"):
            if st.session_state[page_key] < total_pages:
                st.session_state[page_key] += 1

    # Calculate slice
    start_idx = (st.session_state[page_key] - 1) * page_size
    end_idx = start_idx + page_size

    return data[start_idx:end_idx]


def display_expandable_rows(data, title_func, content_func):
    """
    Display data as expandable rows

    Args:
        data (list): List of data items
        title_func (callable): Function to generate row title from data item
        content_func (callable): Function to generate row content from data item

    Returns:
        None
    """
    if not data:
        st.info("데이터가 없습니다")
        return

    for item in data:
        with st.expander(title_func(item)):
            content_func(item)


def display_selectable_list(data, label_func, key_prefix="select"):
    """
    Display selectable list with radio buttons

    Args:
        data (list): List of data items
        label_func (callable): Function to generate label from data item
        key_prefix (str): Prefix for widget key

    Returns:
        Selected item or None
    """
    if not data:
        st.info("데이터가 없습니다")
        return None

    labels = [label_func(item) for item in data]

    selected_label = st.radio(
        "선택하세요",
        options=labels,
        key=f"{key_prefix}_radio"
    )

    # Find selected item
    selected_idx = labels.index(selected_label)
    return data[selected_idx]


def display_change_history(history):
    """
    Display change history in a formatted way

    Args:
        history (list): List of change records with 'field', 'old', 'new', 'reason', 'by', 'at' keys

    Returns:
        None
    """
    if not history:
        st.info("변경 이력이 없습니다")
        return

    st.subheader("변경 이력")

    for entry in history:
        with st.expander(f"{entry['field']} - {entry['at']}"):
            col1, col2 = st.columns(2)

            with col1:
                st.markdown("**이전 값**")
                st.code(str(entry['old']))

            with col2:
                st.markdown("**새 값**")
                st.code(str(entry['new']))

            st.markdown(f"**변경 사유**: {entry['reason']}")
            st.markdown(f"**변경자**: {entry['by']}")


def create_search_box(placeholder="검색...", key="search"):
    """
    Create search box

    Args:
        placeholder (str): Placeholder text
        key (str): Widget key

    Returns:
        str: Search query
    """
    return st.text_input(
        "검색",
        placeholder=placeholder,
        key=key,
        label_visibility="collapsed"
    )


def create_filter_row(filters):
    """
    Create filter row with multiple filter inputs

    Args:
        filters (list): List of dicts with 'type', 'label', 'options' keys

    Returns:
        dict: Filter values
    """
    cols = st.columns(len(filters))
    filter_values = {}

    for i, filter_config in enumerate(filters):
        with cols[i]:
            filter_type = filter_config.get('type', 'selectbox')
            label = filter_config.get('label', '')
            key = filter_config.get('key', f'filter_{i}')

            if filter_type == 'selectbox':
                filter_values[key] = st.selectbox(
                    label,
                    options=filter_config.get('options', []),
                    key=key
                )
            elif filter_type == 'text':
                filter_values[key] = st.text_input(
                    label,
                    key=key
                )
            elif filter_type == 'date':
                filter_values[key] = st.date_input(
                    label,
                    key=key
                )

    return filter_values
