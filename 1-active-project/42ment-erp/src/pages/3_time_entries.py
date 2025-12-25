"""
Time Entry Management Page
시간 기록 관리 - 작업 시간 입력, 조회, 수정, 삭제
"""
import streamlit as st
import sys
from pathlib import Path
from datetime import datetime, timedelta, date

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from src.services import time_entry_service, project_service
from src.ui.components.forms import (
    text_input_with_validation, text_area_with_validation,
    date_input_with_validation, number_input_with_validation,
    selectbox_with_validation, submit_button,
    success_message, error_message, info_message
)
from src.ui.components.tables import (
    display_dataframe, display_change_history,
    create_search_box, display_metrics_row
)


def main():
    st.title("⏱️ 작업 시간 관리")
    st.markdown("작업 시간을 기록하고 청구 가능 시간을 추적합니다")
    st.divider()

    # Tabs
    tab1, tab2, tab3, tab4 = st.tabs(["📋 목록", "➕ 추가", "✏️ 수정", "📊 통계"])

    with tab1:
        display_time_entry_list()

    with tab2:
        create_time_entry_form()

    with tab3:
        update_time_entry_form()

    with tab4:
        display_time_entry_stats()


def display_time_entry_list():
    """Display list of all time entries"""
    st.subheader("작업 시간 기록 목록")

    # Filters
    col1, col2, col3 = st.columns([2, 1, 1])
    with col1:
        # Get all projects for filter
        projects_result = project_service.get_all_projects()
        if projects_result['success']:
            project_options = {'all': '전체 프로젝트'}
            project_options.update({p['id']: f"{p['name']} ({p['client_name']})" for p in projects_result['data']})
            project_filter = st.selectbox(
                "프로젝트 필터",
                options=list(project_options.keys()),
                format_func=lambda x: project_options[x],
                key="project_filter"
            )
        else:
            project_filter = 'all'

    with col2:
        billable_filter = st.selectbox(
            "청구 가능 필터",
            options=['all', 'Y', 'N'],
            format_func=lambda x: {'all': '전체', 'Y': '청구 가능', 'N': '청구 불가'}[x],
            key="billable_filter"
        )

    with col3:
        # Date range filter
        date_range = st.selectbox(
            "기간",
            options=['all', 'today', 'week', 'month', 'custom'],
            format_func=lambda x: {
                'all': '전체',
                'today': '오늘',
                'week': '이번 주',
                'month': '이번 달',
                'custom': '사용자 지정'
            }[x],
            key="date_range_filter"
        )

    # Custom date range
    start_date = None
    end_date = None
    if date_range == 'custom':
        col1, col2 = st.columns(2)
        with col1:
            start_date = st.date_input("시작일", value=datetime.now().date() - timedelta(days=30))
        with col2:
            end_date = st.date_input("종료일", value=datetime.now().date())
    elif date_range == 'today':
        start_date = end_date = datetime.now().date()
    elif date_range == 'week':
        today = datetime.now().date()
        start_date = today - timedelta(days=today.weekday())
        end_date = start_date + timedelta(days=6)
    elif date_range == 'month':
        today = datetime.now().date()
        start_date = today.replace(day=1)
        # Last day of month
        if today.month == 12:
            end_date = today.replace(day=31)
        else:
            end_date = (today.replace(month=today.month + 1, day=1) - timedelta(days=1))

    # Get time entries
    if date_range != 'all' and start_date and end_date:
        result = time_entry_service.get_time_entries_by_date_range(start_date, end_date)
    elif project_filter != 'all':
        result = time_entry_service.get_time_entries_by_project(project_filter)
    elif billable_filter != 'all':
        result = time_entry_service.get_time_entries_by_billable(billable_filter)
    else:
        result = time_entry_service.get_all_time_entries()

    if not result['success']:
        error_message(result.get('message', '작업 시간 기록을 불러올 수 없습니다'))
        return

    entries = result['data']

    # Apply additional filters
    if project_filter != 'all':
        entries = [e for e in entries if e['project_id'] == project_filter]
    if billable_filter != 'all':
        entries = [e for e in entries if e['billable'] == billable_filter]

    if not entries:
        info_message("작업 시간 기록이 없습니다")
        return

    # Calculate totals
    total_hours = sum(e['hours'] for e in entries)
    billable_hours = sum(e['hours'] for e in entries if e['billable'] == 'Y')
    non_billable_hours = sum(e['hours'] for e in entries if e['billable'] == 'N')

    # Display summary metrics
    display_metrics_row([
        {'label': '총 작업 시간', 'value': f'{total_hours:.1f}시간'},
        {'label': '청구 가능', 'value': f'{billable_hours:.1f}시간'},
        {'label': '청구 불가', 'value': f'{non_billable_hours:.1f}시간'},
        {'label': '기록 수', 'value': f'{len(entries)}건'}
    ])

    st.markdown(f"**총 {len(entries)}개의 작업 시간 기록**")

    # Display table
    display_dataframe(
        entries,
        columns=['id', 'date', 'project_name', 'client_name', 'hours',
                 'billable', 'task_type', 'description'],
        height=400
    )

    # Select entry for actions
    st.markdown("### 작업 시간 선택")
    entry_options = {
        f"{e['date']} - {e['project_name']} ({e['hours']}시간) (ID: {e['id']})": e['id']
        for e in entries
    }
    selected_label = st.selectbox(
        "작업할 기록을 선택하세요",
        options=list(entry_options.keys()),
        key="selected_entry_label"
    )

    if selected_label:
        selected_id = entry_options[selected_label]
        st.session_state.selected_time_entry_id = selected_id

        # Display selected entry details
        selected_entry = next(e for e in entries if e['id'] == selected_id)
        with st.expander("선택한 작업 시간 기록", expanded=True):
            col1, col2 = st.columns(2)
            with col1:
                st.write(f"**날짜**: {selected_entry['date']}")
                st.write(f"**프로젝트**: {selected_entry['project_name']}")
                st.write(f"**고객**: {selected_entry['client_name']}")
                st.write(f"**작업 시간**: {selected_entry['hours']}시간")
            with col2:
                st.write(f"**청구 가능**: {'예' if selected_entry['billable'] == 'Y' else '아니오'}")
                st.write(f"**작업 유형**: {format_task_type_korean(selected_entry.get('task_type', '-'))}")
                st.write(f"**설명**: {selected_entry.get('description', '-')}")
                st.write(f"**등록일**: {selected_entry['created_at']}")

        # Delete button
        if st.button("🗑️ 기록 삭제", type="secondary"):
            st.session_state.show_delete_confirm = True

        if st.session_state.get('show_delete_confirm', False):
            st.warning("⚠️ 정말로 이 작업 시간 기록을 삭제하시겠습니까?")
            delete_reason = st.text_input("삭제 사유", key="delete_reason")
            col1, col2 = st.columns(2)
            with col1:
                if st.button("삭제 확인", type="primary"):
                    if delete_reason:
                        result = time_entry_service.delete_time_entry(selected_id, delete_reason)
                        if result['success']:
                            success_message(result['message'])
                            st.session_state.show_delete_confirm = False
                            st.rerun()
                        else:
                            error_message(result['message'])
                    else:
                        error_message("삭제 사유를 입력해주세요")
            with col2:
                if st.button("취소"):
                    st.session_state.show_delete_confirm = False
                    st.rerun()


def create_time_entry_form():
    """Display form to create new time entry"""
    st.subheader("새 작업 시간 기록")

    # Get projects for dropdown
    projects_result = project_service.get_all_projects()
    if not projects_result['success'] or not projects_result['data']:
        error_message("프로젝트를 먼저 등록해주세요")
        return

    projects = projects_result['data']
    project_options = {p['id']: f"{p['name']} - {p['client_name']} (ID: {p['id']})" for p in projects}

    with st.form("create_time_entry_form"):
        project_id = selectbox_with_validation(
            "프로젝트 선택",
            options=list(project_options.keys()),
            format_func=lambda x: project_options[x],
            required=True
        )

        date_worked = date_input_with_validation(
            "작업 날짜",
            value=datetime.now().date(),
            required=True
        )

        hours = number_input_with_validation(
            "작업 시간",
            value=1.0,
            min_value=0.1,
            max_value=24.0,
            step=0.5,
            format="%.1f",
            required=True,
            help="0.1 ~ 24.0 시간"
        )

        billable = selectbox_with_validation(
            "청구 가능 여부",
            options=['Y', 'N'],
            format_func=lambda x: '예 (청구 가능)' if x == 'Y' else '아니오 (청구 불가)',
            help="고객에게 청구할 수 있는 작업인지 선택"
        )

        task_type = selectbox_with_validation(
            "작업 유형",
            options=['development', 'meeting', 'research', 'design', 'testing', 'documentation', 'other'],
            format_func=format_task_type_korean,
            help="선택사항"
        )

        description = text_area_with_validation(
            "작업 설명",
            max_chars=500,
            height=100,
            help="어떤 작업을 했는지 간단히 설명"
        )

        notes = text_area_with_validation(
            "비고",
            max_chars=500,
            height=100,
            help="추가 메모"
        )

        submitted = submit_button("작업 시간 기록")

        if submitted:
            if not project_id:
                error_message("프로젝트 선택은 필수입니다")
            elif hours <= 0:
                error_message("작업 시간은 0보다 커야 합니다")
            else:
                result = time_entry_service.create_time_entry(
                    project_id=project_id,
                    date_worked=date_worked,
                    hours=hours,
                    billable=billable,
                    description=description or None,
                    task_type=task_type if task_type else None,
                    notes=notes or None
                )

                if result['success']:
                    success_message(result['message'])
                    st.balloons()
                else:
                    error_message(result.get('error', result['message']))


def update_time_entry_form():
    """Display form to update existing time entry"""
    st.subheader("작업 시간 기록 수정")

    # Check if entry is selected
    if 'selected_time_entry_id' not in st.session_state or st.session_state.selected_time_entry_id is None:
        info_message("목록 탭에서 수정할 작업 시간 기록을 선택해주세요")
        return

    entry_id = st.session_state.selected_time_entry_id

    # Load current data
    result = time_entry_service.get_time_entry(entry_id)
    if not result['success']:
        error_message(result.get('message', '작업 시간 기록을 불러올 수 없습니다'))
        return

    entry = result['data']

    # Get projects for dropdown
    projects_result = project_service.get_all_projects()
    if not projects_result['success']:
        error_message("프로젝트 목록을 불러올 수 없습니다")
        return

    projects = projects_result['data']
    project_options = {p['id']: f"{p['name']} - {p['client_name']} (ID: {p['id']})" for p in projects}

    st.info(f"수정 중인 기록: **{entry['project_name']}** - {entry['date']} ({entry['hours']}시간) (ID: {entry_id})")

    with st.form("update_time_entry_form"):
        project_id = selectbox_with_validation(
            "프로젝트 선택",
            options=list(project_options.keys()),
            format_func=lambda x: project_options[x],
            default=entry['project_id'],
            required=True
        )

        date_worked = date_input_with_validation(
            "작업 날짜",
            value=entry['date'],
            required=True
        )

        hours = number_input_with_validation(
            "작업 시간",
            value=float(entry['hours']),
            min_value=0.1,
            max_value=24.0,
            step=0.5,
            format="%.1f",
            required=True
        )

        billable = selectbox_with_validation(
            "청구 가능 여부",
            options=['Y', 'N'],
            format_func=lambda x: '예 (청구 가능)' if x == 'Y' else '아니오 (청구 불가)',
            default=entry['billable']
        )

        task_type = selectbox_with_validation(
            "작업 유형",
            options=['development', 'meeting', 'research', 'design', 'testing', 'documentation', 'other'],
            format_func=format_task_type_korean,
            default=entry['task_type'] if entry['task_type'] else 'development'
        )

        description = text_area_with_validation(
            "작업 설명",
            value=entry['description'] or '',
            max_chars=500,
            height=100
        )

        notes = text_area_with_validation(
            "비고",
            value=entry['notes'] or '',
            max_chars=500,
            height=100
        )

        reason = text_input_with_validation(
            "변경 사유",
            required=True,
            help="변경하는 이유를 입력해주세요"
        )

        submitted = submit_button("수정 완료")

        if submitted:
            if not reason:
                error_message("변경 사유는 필수입니다")
            else:
                updates = {
                    'project_id': project_id,
                    'date': date_worked,
                    'hours': hours,
                    'billable': billable,
                    'task_type': task_type if task_type else None,
                    'description': description or None,
                    'notes': notes or None
                }

                result = time_entry_service.update_time_entry(entry_id, updates, reason)

                if result['success']:
                    success_message(result['message'])
                else:
                    error_message(result.get('error', result['message']))


def display_time_entry_stats():
    """Display time entry statistics and summaries"""
    st.subheader("작업 시간 통계")

    # Date range selector
    col1, col2 = st.columns(2)
    with col1:
        start_date = st.date_input(
            "시작일",
            value=datetime.now().date().replace(day=1)
        )
    with col2:
        end_date = st.date_input(
            "종료일",
            value=datetime.now().date()
        )

    if start_date > end_date:
        error_message("시작일은 종료일보다 빠르거나 같아야 합니다")
        return

    # Get summary
    summary_result = time_entry_service.get_date_range_summary(start_date, end_date)

    if not summary_result['success']:
        error_message("통계를 불러올 수 없습니다")
        return

    summary = summary_result['data']

    # Display overall metrics
    st.markdown("### 전체 통계")
    display_metrics_row([
        {'label': '총 작업 시간', 'value': f"{summary['total_hours']:.1f}시간"},
        {'label': '청구 가능', 'value': f"{summary['billable_hours']:.1f}시간"},
        {'label': '청구 불가', 'value': f"{summary['non_billable_hours']:.1f}시간"},
        {'label': '기록 수', 'value': f"{summary['entry_count']}건"}
    ])

    # Calculate percentages
    if summary['total_hours'] > 0:
        billable_percent = (summary['billable_hours'] / summary['total_hours']) * 100
        st.progress(billable_percent / 100)
        st.markdown(f"**청구 가능 비율**: {billable_percent:.1f}%")

    st.divider()

    # Get entries for the period
    entries_result = time_entry_service.get_time_entries_by_date_range(start_date, end_date)

    if entries_result['success'] and entries_result['data']:
        entries = entries_result['data']

        # Project breakdown
        st.markdown("### 프로젝트별 시간")

        project_totals = {}
        for entry in entries:
            proj_name = entry['project_name']
            if proj_name not in project_totals:
                project_totals[proj_name] = {'total': 0, 'billable': 0, 'non_billable': 0}

            project_totals[proj_name]['total'] += entry['hours']
            if entry['billable'] == 'Y':
                project_totals[proj_name]['billable'] += entry['hours']
            else:
                project_totals[proj_name]['non_billable'] += entry['hours']

        # Display as table
        project_data = []
        for proj_name, totals in project_totals.items():
            project_data.append({
                '프로젝트': proj_name,
                '총 시간': f"{totals['total']:.1f}h",
                '청구 가능': f"{totals['billable']:.1f}h",
                '청구 불가': f"{totals['non_billable']:.1f}h"
            })

        if project_data:
            display_dataframe(project_data, height=300)


def format_task_type_korean(task_type):
    """Convert task type to Korean"""
    task_type_map = {
        'development': '개발',
        'meeting': '회의',
        'research': '리서치',
        'design': '디자인',
        'testing': '테스트',
        'documentation': '문서화',
        'other': '기타'
    }
    return task_type_map.get(task_type, task_type or '-')


if __name__ == '__main__':
    main()
