"""
Client Management Page
고객 정보 관리 - 고객 등록, 조회, 수정, 삭제, 변경 이력 확인
"""
import streamlit as st
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from src.services import client_service
from src.ui.components.forms import (
    text_input_with_validation, text_area_with_validation,
    submit_button, success_message, error_message, info_message
)
from src.ui.components.tables import (
    display_dataframe, display_change_history,
    create_search_box
)


def main():
    st.title("👥 고객 관리")
    st.markdown("고객 정보를 등록, 조회, 수정할 수 있습니다")
    st.divider()

    # Tabs
    tab1, tab2, tab3, tab4 = st.tabs(["📋 목록", "➕ 추가", "✏️ 수정", "📜 변경 이력"])

    with tab1:
        display_client_list()

    with tab2:
        create_client_form()

    with tab3:
        update_client_form()

    with tab4:
        display_client_history()


def display_client_list():
    """Display list of all clients"""
    st.subheader("고객 목록")

    # Search box
    col1, col2 = st.columns([3, 1])
    with col1:
        search_query = create_search_box(placeholder="고객 이름 또는 이메일로 검색", key="client_search")
    with col2:
        search_type = st.selectbox("검색 유형", options=["name", "email"], format_func=lambda x: "이름" if x == "name" else "이메일", key="search_type")

    # Get clients
    if search_query:
        result = client_service.search_clients(search_query, search_type)
    else:
        result = client_service.get_all_clients()

    if not result['success']:
        error_message(result.get('message', '고객 목록을 불러올 수 없습니다'))
        return

    clients = result['data']

    if not clients:
        info_message("등록된 고객이 없습니다")
        return

    # Display count
    st.markdown(f"**총 {len(clients)}명의 고객**")

    # Display table
    display_dataframe(
        clients,
        columns=['id', 'name', 'email', 'phone', 'company', 'created_at'],
        height=400
    )

    # Select client for actions
    st.markdown("### 고객 선택")
    client_options = {f"{c['name']} (ID: {c['id']})": c['id'] for c in clients}
    selected_label = st.selectbox("작업할 고객을 선택하세요", options=list(client_options.keys()), key="selected_client_label")

    if selected_label:
        selected_id = client_options[selected_label]
        st.session_state.selected_client_id = selected_id

        # Display selected client details
        selected_client = next(c for c in clients if c['id'] == selected_id)
        with st.expander("선택한 고객 정보", expanded=True):
            col1, col2 = st.columns(2)
            with col1:
                st.write(f"**이름**: {selected_client['name']}")
                st.write(f"**이메일**: {selected_client.get('email', '-')}")
                st.write(f"**전화번호**: {selected_client.get('phone', '-')}")
            with col2:
                st.write(f"**회사명**: {selected_client.get('company', '-')}")
                st.write(f"**등록일**: {selected_client['created_at']}")

        # Delete button
        if st.button("🗑️ 고객 삭제", type="secondary"):
            st.session_state.show_delete_confirm = True

        if st.session_state.get('show_delete_confirm', False):
            st.warning("⚠️ 정말로 이 고객을 삭제하시겠습니까?")
            delete_reason = st.text_input("삭제 사유", key="delete_reason")
            col1, col2 = st.columns(2)
            with col1:
                if st.button("삭제 확인", type="primary"):
                    if delete_reason:
                        result = client_service.delete_client(selected_id, delete_reason)
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


def create_client_form():
    """Display form to create new client"""
    st.subheader("새 고객 추가")

    with st.form("create_client_form"):
        name = text_input_with_validation("고객 이름", max_chars=100, required=True)
        email = text_input_with_validation("이메일", max_chars=100, help="선택사항")
        phone = text_input_with_validation("전화번호", max_chars=20, help="형식: 010-1234-5678")
        company = text_input_with_validation("회사명", max_chars=100)
        address = text_area_with_validation("주소", max_chars=200, height=100)
        notes = text_area_with_validation("비고", max_chars=500, height=100)

        submitted = submit_button("고객 추가")

        if submitted:
            if not name:
                error_message("고객 이름은 필수입니다")
            else:
                result = client_service.create_client(
                    name=name,
                    email=email or None,
                    phone=phone or None,
                    company=company or None,
                    address=address or None,
                    notes=notes or None
                )

                if result['success']:
                    success_message(result['message'])
                    st.balloons()
                else:
                    error_message(result.get('error', result['message']))


def update_client_form():
    """Display form to update existing client"""
    st.subheader("고객 정보 수정")

    # Check if client is selected
    if 'selected_client_id' not in st.session_state or st.session_state.selected_client_id is None:
        info_message("목록 탭에서 수정할 고객을 선택해주세요")
        return

    client_id = st.session_state.selected_client_id

    # Load current data
    result = client_service.get_client(client_id)
    if not result['success']:
        error_message(result.get('message', '고객 정보를 불러올 수 없습니다'))
        return

    client = result['data']

    st.info(f"수정 중인 고객: **{client['name']}** (ID: {client_id})")

    with st.form("update_client_form"):
        name = text_input_with_validation("고객 이름", value=client['name'], max_chars=100, required=True)
        email = text_input_with_validation("이메일", value=client['email'] or '', max_chars=100)
        phone = text_input_with_validation("전화번호", value=client['phone'] or '', max_chars=20)
        company = text_input_with_validation("회사명", value=client['company'] or '', max_chars=100)
        address = text_area_with_validation("주소", value=client['address'] or '', max_chars=200, height=100)
        notes = text_area_with_validation("비고", value=client['notes'] or '', max_chars=500, height=100)

        reason = text_input_with_validation("변경 사유", required=True, help="변경하는 이유를 입력해주세요")

        submitted = submit_button("수정 완료")

        if submitted:
            if not name:
                error_message("고객 이름은 필수입니다")
            elif not reason:
                error_message("변경 사유는 필수입니다")
            else:
                updates = {
                    'name': name,
                    'email': email or None,
                    'phone': phone or None,
                    'company': company or None,
                    'address': address or None,
                    'notes': notes or None
                }

                result = client_service.update_client(client_id, updates, reason)

                if result['success']:
                    success_message(result['message'])
                else:
                    error_message(result.get('error', result['message']))


def display_client_history():
    """Display change history for selected client"""
    st.subheader("고객 변경 이력")

    # Check if client is selected
    if 'selected_client_id' not in st.session_state or st.session_state.selected_client_id is None:
        info_message("목록 탭에서 고객을 선택해주세요")
        return

    client_id = st.session_state.selected_client_id

    # Load client info
    client_result = client_service.get_client(client_id)
    if client_result['success']:
        st.info(f"조회 중인 고객: **{client_result['data']['name']}** (ID: {client_id})")

    # Load change history
    result = client_service.get_change_history(client_id)

    if not result['success']:
        error_message(result.get('error', '변경 이력을 불러올 수 없습니다'))
        return

    history = result['data']

    if not history:
        info_message("변경 이력이 없습니다")
        return

    # Display history
    display_change_history(history)


if __name__ == '__main__':
    main()
