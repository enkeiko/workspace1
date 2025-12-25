"""
Project Management Page
프로젝트 관리 - 프로젝트 생성, 조회, 수정, 삭제, 변경 이력 확인
"""
import streamlit as st
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from src.services import project_service, client_service
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
    st.title("📁 프로젝트 관리")
    st.markdown("프로젝트를 생성, 조회, 수정할 수 있습니다")
    st.divider()

    # Tabs
    tab1, tab2, tab3, tab4 = st.tabs(["📋 목록", "➕ 추가", "✏️ 수정", "📜 변경 이력"])

    with tab1:
        display_project_list()

    with tab2:
        create_project_form()

    with tab3:
        update_project_form()

    with tab4:
        display_project_history()


def display_project_list():
    """Display list of all projects"""
    st.subheader("프로젝트 목록")

    # Search and filter
    col1, col2, col3 = st.columns([2, 1, 1])
    with col1:
        search_query = create_search_box(placeholder="프로젝트 이름으로 검색", key="project_search")
    with col2:
        status_filter = st.selectbox(
            "상태 필터",
            options=['all', 'active', 'completed', 'on_hold', 'cancelled'],
            format_func=lambda x: {
                'all': '전체',
                'active': '진행중',
                'completed': '완료',
                'on_hold': '보류',
                'cancelled': '취소'
            }[x],
            key="status_filter"
        )
    with col3:
        # Get all clients for filter
        clients_result = client_service.get_all_clients()
        if clients_result['success']:
            client_options = {'all': '전체 고객'}
            client_options.update({c['id']: c['name'] for c in clients_result['data']})
            client_filter = st.selectbox(
                "고객 필터",
                options=list(client_options.keys()),
                format_func=lambda x: client_options[x],
                key="client_filter"
            )
        else:
            client_filter = 'all'

    # Get projects
    if search_query:
        result = project_service.search_projects(search_query)
    elif status_filter != 'all':
        result = project_service.get_projects_by_status(status_filter)
    else:
        result = project_service.get_all_projects()

    if not result['success']:
        error_message(result.get('message', '프로젝트 목록을 불러올 수 없습니다'))
        return

    projects = result['data']

    # Apply client filter
    if client_filter != 'all':
        projects = [p for p in projects if p['client_id'] == client_filter]

    if not projects:
        info_message("등록된 프로젝트가 없습니다")
        return

    # Display count
    st.markdown(f"**총 {len(projects)}개의 프로젝트**")

    # Display table
    display_dataframe(
        projects,
        columns=['id', 'name', 'client_name', 'status', 'start_date', 'end_date',
                 'estimated_budget', 'actual_budget', 'created_at'],
        height=400
    )

    # Select project for actions
    st.markdown("### 프로젝트 선택")
    project_options = {f"{p['name']} (ID: {p['id']}  - {p['client_name']})": p['id'] for p in projects}
    selected_label = st.selectbox(
        "작업할 프로젝트를 선택하세요",
        options=list(project_options.keys()),
        key="selected_project_label"
    )

    if selected_label:
        selected_id = project_options[selected_label]
        st.session_state.selected_project_id = selected_id

        # Display selected project details
        selected_project = next(p for p in projects if p['id'] == selected_id)
        with st.expander("선택한 프로젝트 정보", expanded=True):
            # Display stats
            stats_result = project_service.calculate_project_stats(selected_id)
            if stats_result['success']:
                stats = stats_result['data']
                display_metrics_row([
                    {
                        'label': '예상 예산',
                        'value': f"{stats['estimated_budget']:,.0f}원" if stats['estimated_budget'] else '-'
                    },
                    {
                        'label': '실제 예산',
                        'value': f"{stats['actual_budget']:,.0f}원" if stats['actual_budget'] else '-',
                        'delta': f"{stats['budget_usage_percent']:.1f}%" if stats['estimated_budget'] > 0 else None
                    },
                    {
                        'label': '예상 시간',
                        'value': f"{stats['estimated_hours']:.1f}시간" if stats['estimated_hours'] else '-'
                    },
                    {
                        'label': '실제 시간',
                        'value': f"{stats['actual_hours']:.1f}시간" if stats['actual_hours'] else '-',
                        'delta': f"{stats['hours_usage_percent']:.1f}%" if stats['estimated_hours'] > 0 else None
                    }
                ])

            col1, col2 = st.columns(2)
            with col1:
                st.write(f"**프로젝트명**: {selected_project['name']}")
                st.write(f"**고객**: {selected_project['client_name']}")
                st.write(f"**상태**: {format_status_korean(selected_project['status'])}")
            with col2:
                st.write(f"**시작일**: {selected_project.get('start_date', '-')}")
                st.write(f"**종료일**: {selected_project.get('end_date', '-')}")
                st.write(f"**등록일**: {selected_project['created_at']}")

        # Delete button
        if st.button("🗑️ 프로젝트 삭제", type="secondary"):
            st.session_state.show_delete_confirm = True

        if st.session_state.get('show_delete_confirm', False):
            st.warning("⚠️ 정말로 이 프로젝트를 삭제하시겠습니까?")
            delete_reason = st.text_input("삭제 사유", key="delete_reason")
            col1, col2 = st.columns(2)
            with col1:
                if st.button("삭제 확인", type="primary"):
                    if delete_reason:
                        result = project_service.delete_project(selected_id, delete_reason)
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


def create_project_form():
    """Display form to create new project"""
    st.subheader("새 프로젝트 추가")

    # Get clients for dropdown
    clients_result = client_service.get_all_clients()
    if not clients_result['success'] or not clients_result['data']:
        error_message("고객을 먼저 등록해주세요")
        return

    clients = clients_result['data']
    client_options = {c['id']: f"{c['name']} (ID: {c['id']})" for c in clients}

    with st.form("create_project_form"):
        client_id = selectbox_with_validation(
            "고객 선택",
            options=list(client_options.keys()),
            format_func=lambda x: client_options[x],
            required=True
        )

        name = text_input_with_validation("프로젝트 이름", max_chars=200, required=True)

        col1, col2 = st.columns(2)
        with col1:
            start_date = date_input_with_validation("시작일", help="선택사항")
        with col2:
            end_date = date_input_with_validation("종료일", help="선택사항")

        status = selectbox_with_validation(
            "상태",
            options=['active', 'completed', 'on_hold', 'cancelled'],
            format_func=format_status_korean,
            help="기본값: 진행중"
        )

        col1, col2 = st.columns(2)
        with col1:
            estimated_budget = number_input_with_validation(
                "예상 예산 (원)",
                min_value=0.0,
                step=10000.0,
                help="선택사항"
            )
        with col2:
            estimated_hours = number_input_with_validation(
                "예상 작업 시간",
                min_value=0.0,
                step=1.0,
                help="선택사항"
            )

        notes = text_area_with_validation("비고", max_chars=500, height=100)

        submitted = submit_button("프로젝트 추가")

        if submitted:
            if not name:
                error_message("프로젝트 이름은 필수입니다")
            elif not client_id:
                error_message("고객 선택은 필수입니다")
            else:
                result = project_service.create_project(
                    client_id=client_id,
                    name=name,
                    start_date=start_date.isoformat() if start_date else None,
                    end_date=end_date.isoformat() if end_date else None,
                    status=status,
                    estimated_budget=estimated_budget if estimated_budget > 0 else None,
                    estimated_hours=estimated_hours if estimated_hours > 0 else None,
                    notes=notes or None
                )

                if result['success']:
                    success_message(result['message'])
                    st.balloons()
                else:
                    error_message(result.get('error', result['message']))


def update_project_form():
    """Display form to update existing project"""
    st.subheader("프로젝트 정보 수정")

    # Check if project is selected
    if 'selected_project_id' not in st.session_state or st.session_state.selected_project_id is None:
        info_message("목록 탭에서 수정할 프로젝트를 선택해주세요")
        return

    project_id = st.session_state.selected_project_id

    # Load current data
    result = project_service.get_project(project_id)
    if not result['success']:
        error_message(result.get('message', '프로젝트 정보를 불러올 수 없습니다'))
        return

    project = result['data']

    # Get clients for dropdown
    clients_result = client_service.get_all_clients()
    if not clients_result['success']:
        error_message("고객 목록을 불러올 수 없습니다")
        return

    clients = clients_result['data']
    client_options = {c['id']: f"{c['name']} (ID: {c['id']})" for c in clients}

    st.info(f"수정 중인 프로젝트: **{project['name']}** (ID: {project_id})")

    with st.form("update_project_form"):
        client_id = selectbox_with_validation(
            "고객 선택",
            options=list(client_options.keys()),
            format_func=lambda x: client_options[x],
            default=project['client_id'],
            required=True
        )

        name = text_input_with_validation(
            "프로젝트 이름",
            value=project['name'],
            max_chars=200,
            required=True
        )

        col1, col2 = st.columns(2)
        with col1:
            start_date = date_input_with_validation(
                "시작일",
                value=project['start_date'],
                help="선택사항"
            )
        with col2:
            end_date = date_input_with_validation(
                "종료일",
                value=project['end_date'],
                help="선택사항"
            )

        status = selectbox_with_validation(
            "상태",
            options=['active', 'completed', 'on_hold', 'cancelled'],
            format_func=format_status_korean,
            default=project['status']
        )

        col1, col2 = st.columns(2)
        with col1:
            estimated_budget = number_input_with_validation(
                "예상 예산 (원)",
                value=float(project['estimated_budget']) if project['estimated_budget'] else 0.0,
                min_value=0.0,
                step=10000.0
            )
        with col2:
            estimated_hours = number_input_with_validation(
                "예상 작업 시간",
                value=float(project['estimated_hours']) if project['estimated_hours'] else 0.0,
                min_value=0.0,
                step=1.0
            )

        notes = text_area_with_validation(
            "비고",
            value=project['notes'] or '',
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
            if not name:
                error_message("프로젝트 이름은 필수입니다")
            elif not reason:
                error_message("변경 사유는 필수입니다")
            else:
                updates = {
                    'client_id': client_id,
                    'name': name,
                    'start_date': start_date.isoformat() if start_date else None,
                    'end_date': end_date.isoformat() if end_date else None,
                    'status': status,
                    'estimated_budget': estimated_budget if estimated_budget > 0 else None,
                    'estimated_hours': estimated_hours if estimated_hours > 0 else None,
                    'notes': notes or None
                }

                result = project_service.update_project(project_id, updates, reason)

                if result['success']:
                    success_message(result['message'])
                else:
                    error_message(result.get('error', result['message']))


def display_project_history():
    """Display change history for selected project"""
    st.subheader("프로젝트 변경 이력")

    # Check if project is selected
    if 'selected_project_id' not in st.session_state or st.session_state.selected_project_id is None:
        info_message("목록 탭에서 프로젝트를 선택해주세요")
        return

    project_id = st.session_state.selected_project_id

    # Load project info
    project_result = project_service.get_project(project_id)
    if project_result['success']:
        st.info(f"조회 중인 프로젝트: **{project_result['data']['name']}** (ID: {project_id})")

    # Load change history
    result = project_service.get_change_history(project_id)

    if not result['success']:
        error_message(result.get('error', '변경 이력을 불러올 수 없습니다'))
        return

    history = result['data']

    if not history:
        info_message("변경 이력이 없습니다")
        return

    # Display history
    display_change_history(history)


def format_status_korean(status):
    """Convert status to Korean"""
    status_map = {
        'active': '진행중',
        'completed': '완료',
        'on_hold': '보류',
        'cancelled': '취소'
    }
    return status_map.get(status, status)


if __name__ == '__main__':
    main()
