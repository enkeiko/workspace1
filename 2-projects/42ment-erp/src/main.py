"""
42ment ERP v0.1 - Main Streamlit Application
프리랜서를 위한 경량 프로젝트 관리 시스템
"""
import streamlit as st
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.logger import log_info


def init_session_state():
    """Initialize all session state variables"""
    # User authentication
    if 'user_authenticated' not in st.session_state:
        st.session_state.user_authenticated = False

    # Current selections
    if 'selected_client_id' not in st.session_state:
        st.session_state.selected_client_id = None

    if 'selected_project_id' not in st.session_state:
        st.session_state.selected_project_id = None

    if 'selected_invoice_id' not in st.session_state:
        st.session_state.selected_invoice_id = None

    # Form states
    if 'form_mode' not in st.session_state:
        st.session_state.form_mode = 'view'  # view/create/edit

    if 'form_data' not in st.session_state:
        st.session_state.form_data = {}

    # Filter states
    if 'filter_status' not in st.session_state:
        st.session_state.filter_status = 'all'

    if 'filter_date_range' not in st.session_state:
        st.session_state.filter_date_range = None


def main():
    """Main application entry point"""
    # Page configuration
    st.set_page_config(
        page_title="42ment ERP v0.1",
        page_icon="📊",
        layout="wide",
        initial_sidebar_state="expanded"
    )

    # Initialize session state
    init_session_state()

    # Header
    st.title("📊 42ment ERP v0.1")
    st.markdown("**프리랜서를 위한 경량 프로젝트 관리 시스템**")
    st.divider()

    # Home page content
    st.header("환영합니다!")

    st.markdown("""
    ### 핵심 기능

    - **고객 관리**: 사이드바에서 "1_clients" 페이지로 이동
    - **프로젝트 관리**: 사이드바에서 "2_projects" 페이지로 이동
    - **작업 시간 기록**: 사이드바에서 "3_time_entries" 페이지로 이동
    - **청구서 생성**: 사이드바에서 "4_invoices" 페이지로 이동

    ### 시작하기

    1. 데이터베이스가 초기화되지 않았다면, 터미널에서 다음 명령어를 실행하세요:
       ```bash
       python src/database/db.py --init
       ```

    2. (선택사항) 샘플 데이터를 로드하려면:
       ```bash
       python src/database/db.py --load-sample-data
       ```

    3. 사이드바에서 원하는 기능을 선택하여 사용하세요

    ### 핵심 가치

    - **데이터 투명성**: 모든 변경 사항의 완전한 이력 추적
    - **직접성**: 외부 SaaS 의존 없이 로컬에서 모든 데이터 관리
    - **이식성**: CSV/JSON 기반 데이터 내보내기/가져오기
    - **Fail-safe**: 자동화 실패 시 항상 수동 입력 경로 제공
    """)

    st.divider()

    # Quick stats (placeholder - will be implemented later)
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric("총 고객 수", "0", help="등록된 총 고객 수")

    with col2:
        st.metric("활성 프로젝트", "0", help="진행 중인 프로젝트 수")

    with col3:
        st.metric("이번 주 작업 시간", "0h", help="이번 주 기록된 총 작업 시간")

    with col4:
        st.metric("대기중인 청구서", "0", help="발송 대기 중인 청구서 수")

    st.divider()

    # Footer
    st.markdown("""
    ---
    **42ment ERP v0.1** | [Documentation](../specs/002-42ment-erp/README.md) | [GitHub](#)
    """)

    log_info('Home page loaded')


if __name__ == '__main__':
    main()
