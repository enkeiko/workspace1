"""
Invoice Management Page
인보이스 관리 - 인보이스 생성, 조회, 수정, PDF 출력
"""
import streamlit as st
import sys
from pathlib import Path
from datetime import datetime, timedelta

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from src.services import invoice_service, client_service, project_service
from src.ui.components.forms import *
from src.ui.components.tables import *


def main():
    st.title("📄 인보이스 관리")
    st.markdown("인보이스를 생성하고 PDF로 출력합니다")
    st.divider()

    tab1, tab2, tab3, tab4 = st.tabs(["📋 목록", "➕ 생성", "✏️ 수정", "📊 통계"])

    with tab1:
        display_invoice_list()
    with tab2:
        create_invoice_form()
    with tab3:
        update_invoice_form()
    with tab4:
        display_invoice_stats()


def display_invoice_list():
    st.subheader("인보이스 목록")

    # Filters
    col1, col2 = st.columns(2)
    with col1:
        status_filter = st.selectbox(
            "상태",
            ['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'],
            format_func=lambda x: {'all': '전체', 'draft': '초안', 'sent': '발송', 'paid': '결제완료', 'overdue': '연체', 'cancelled': '취소'}[x]
        )
    with col2:
        clients_result = client_service.get_all_clients()
        if clients_result['success']:
            client_options = {'all': '전체 고객'}
            client_options.update({c['id']: c['name'] for c in clients_result['data']})
            client_filter = st.selectbox("고객", list(client_options.keys()), format_func=lambda x: client_options[x])
        else:
            client_filter = 'all'

    # Get invoices
    if status_filter != 'all':
        result = invoice_service.get_invoices_by_status(status_filter)
    else:
        result = invoice_service.get_all_invoices()

    if not result['success']:
        error_message(result.get('message', '인보이스를 불러올 수 없습니다'))
        return

    invoices = result['data']
    if client_filter != 'all':
        invoices = [inv for inv in invoices if inv['client_id'] == client_filter]

    if not invoices:
        info_message("인보이스가 없습니다")
        return

    # Summary
    total_amount = sum(inv['total'] for inv in invoices)
    st.markdown(f"**총 {len(invoices)}건 / 합계: {total_amount:,.0f}원**")

    display_dataframe(
        invoices,
        columns=['id', 'invoice_number', 'client_name', 'project_name', 'invoice_date', 'due_date', 'total', 'status'],
        height=400
    )

    # Selection
    inv_options = {f"{inv['invoice_number']} - {inv['client_name']} ({inv['total']:,.0f}원)": inv['id'] for inv in invoices}
    if inv_options:
        selected = st.selectbox("인보이스 선택", list(inv_options.keys()))
        if selected:
            st.session_state.selected_invoice_id = inv_options[selected]


def create_invoice_form():
    st.subheader("인보이스 생성")

    # Get projects
    projects_result = project_service.get_all_projects()
    if not projects_result['success'] or not projects_result['data']:
        error_message("프로젝트를 먼저 등록해주세요")
        return

    projects = projects_result['data']
    project_options = {p['id']: f"{p['name']} - {p['client_name']}" for p in projects}

    with st.form("create_invoice"):
        project_id = selectbox_with_validation("프로젝트", list(project_options.keys()), format_func=lambda x: project_options[x], required=True)

        # Auto-generate invoice number
        invoice_number = st.text_input("인보이스 번호", value=invoice_service.generate_invoice_number())

        col1, col2 = st.columns(2)
        with col1:
            invoice_date = date_input_with_validation("인보이스 날짜", value=datetime.now().date(), required=True)
        with col2:
            due_date = date_input_with_validation("지급 기한", value=datetime.now().date() + timedelta(days=30), required=True)

        # Amount calculation
        st.markdown("### 금액 계산")
        hourly_rate = number_input_with_validation("시간당 요금 (원)", value=50000.0, min_value=0.0, step=10000.0)

        if st.button("작업 시간에서 계산"):
            calc_result = invoice_service.calculate_invoice_from_time_entries(project_id, hourly_rate=hourly_rate)
            if calc_result['success']:
                st.session_state.calc_subtotal = calc_result['data']['subtotal']
                st.session_state.calc_tax = calc_result['data']['tax']
                st.session_state.calc_total = calc_result['data']['total']
                st.session_state.calc_hours = calc_result['data']['total_hours']
                success_message(f"{calc_result['data']['total_hours']:.1f}시간 기준으로 계산되었습니다")

        subtotal = number_input_with_validation("소계", value=st.session_state.get('calc_subtotal', 0.0), min_value=0.0, step=10000.0)
        tax = number_input_with_validation("세금 (10%)", value=st.session_state.get('calc_tax', subtotal * 0.1), min_value=0.0, step=1000.0)
        total = number_input_with_validation("합계", value=st.session_state.get('calc_total', subtotal + tax), min_value=0.0, step=10000.0)

        status = selectbox_with_validation("상태", ['draft', 'sent'], format_func=lambda x: {'draft': '초안', 'sent': '발송'}[x])
        notes = text_area_with_validation("비고", max_chars=500, height=100)

        if submit_button("인보이스 생성"):
            # Get client_id from project
            proj = next(p for p in projects if p['id'] == project_id)
            result = invoice_service.create_invoice(
                proj['client_id'], project_id, invoice_number,
                invoice_date, due_date, subtotal, tax, total, status, notes
            )
            if result['success']:
                success_message(result['message'])
                st.balloons()
            else:
                error_message(result.get('error', result['message']))


def update_invoice_form():
    st.subheader("인보이스 수정")
    if 'selected_invoice_id' not in st.session_state:
        info_message("목록에서 인보이스를 선택해주세요")
        return

    # Load invoice
    result = invoice_service.get_invoice(st.session_state.selected_invoice_id)
    if not result['success']:
        error_message("인보이스를 불러올 수 없습니다")
        return

    inv = result['data']
    st.info(f"수정 중: {inv['invoice_number']}")

    with st.form("update_invoice"):
        status = selectbox_with_validation(
            "상태",
            ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
            default=inv['status'],
            format_func=lambda x: {'draft': '초안', 'sent': '발송', 'paid': '결제완료', 'overdue': '연체', 'cancelled': '취소'}[x]
        )

        col1, col2 = st.columns(2)
        with col1:
            invoice_date = date_input_with_validation("인보이스 날짜", value=inv['invoice_date'], required=True)
        with col2:
            due_date = date_input_with_validation("지급 기한", value=inv['due_date'], required=True)

        subtotal = number_input_with_validation("소계", value=float(inv['subtotal']), min_value=0.0)
        tax = number_input_with_validation("세금", value=float(inv['tax']), min_value=0.0)
        total = number_input_with_validation("합계", value=float(inv['total']), min_value=0.0)

        notes = text_area_with_validation("비고", value=inv['notes'] or '')
        reason = text_input_with_validation("변경 사유", required=True)

        if submit_button("수정 완료"):
            if not reason:
                error_message("변경 사유는 필수입니다")
            else:
                updates = {
                    'client_id': inv['client_id'],
                    'project_id': inv['project_id'],
                    'invoice_number': inv['invoice_number'],
                    'invoice_date': invoice_date,
                    'due_date': due_date,
                    'subtotal': subtotal,
                    'tax': tax,
                    'total': total,
                    'status': status,
                    'notes': notes or None
                }
                result = invoice_service.update_invoice(st.session_state.selected_invoice_id, updates, reason)
                if result['success']:
                    success_message(result['message'])
                else:
                    error_message(result.get('error', result['message']))


def display_invoice_stats():
    st.subheader("인보이스 통계")

    stats_result = invoice_service.get_invoice_statistics()
    if not stats_result['success']:
        error_message("통계를 불러올 수 없습니다")
        return

    stats = stats_result['data']

    # Display metrics by status
    status_labels = {'draft': '초안', 'sent': '발송', 'paid': '결제완료', 'overdue': '연체', 'cancelled': '취소'}

    for status_key, status_label in status_labels.items():
        if status_key in stats:
            st.markdown(f"### {status_label}")
            col1, col2 = st.columns(2)
            with col1:
                st.metric("건수", f"{stats[status_key]['count']}건")
            with col2:
                st.metric("금액", f"{stats[status_key]['total']:,.0f}원")
            st.divider()


if __name__ == '__main__':
    main()
