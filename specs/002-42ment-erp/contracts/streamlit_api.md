# Streamlit API Contract

**Date**: 2025-11-12
**Feature**: [spec.md](../spec.md)
**Plan**: [plan.md](../plan.md)

## Overview

본 문서는 Streamlit UI Layer와 Service Layer 간의 인터페이스를 상세히 정의합니다. 각 페이지별 Service 호출 패턴, Session State 관리, 폼 처리, 에러 핸들링 규칙을 포함합니다.

---

## Session State Management

### Session State Keys

```python
# User session
st.session_state.user_authenticated = False  # 사용자 인증 여부

# Current selections
st.session_state.selected_client_id = None   # 선택된 고객 ID
st.session_state.selected_project_id = None  # 선택된 프로젝트 ID
st.session_state.selected_invoice_id = None  # 선택된 청구서 ID

# Form states
st.session_state.form_mode = 'view'          # 'view', 'create', 'edit'
st.session_state.form_data = {}              # 폼 임시 데이터

# Filter states
st.session_state.filter_status = 'all'       # 프로젝트/청구서 필터
st.session_state.filter_date_range = None    # 날짜 범위 필터
```

### Initialization Pattern

```python
# src/main.py (Entry point)
import streamlit as st

def init_session_state():
    """Initialize all session state variables"""
    if 'user_authenticated' not in st.session_state:
        st.session_state.user_authenticated = False

    if 'selected_client_id' not in st.session_state:
        st.session_state.selected_client_id = None

    # ... initialize other keys

if __name__ == '__main__':
    init_session_state()
    st.title("42ment ERP v0.1")
    st.write("프리랜서를 위한 경량 프로젝트 관리 시스템")
```

---

## Page 1: Client Management (`src/ui/pages/1_clients.py`)

### Service Layer Interface

```python
from src.services.client_service import ClientService

# Initialize service
client_service = ClientService()
```

### UI Functions

#### 1. List Clients

```python
def display_clients_list():
    """Display all clients in a table"""
    result = client_service.get_all_clients()

    if not result['success']:
        st.error(f"고객 목록을 불러올 수 없습니다: {result['error']}")
        return

    clients = result['data']

    if not clients:
        st.info("등록된 고객이 없습니다")
        return

    # Display as dataframe
    import pandas as pd
    df = pd.DataFrame(clients)
    st.dataframe(df[['id', 'name', 'email', 'phone', 'company']])

    # Selection
    selected_id = st.selectbox(
        "고객 선택",
        options=[c['id'] for c in clients],
        format_func=lambda x: next(c['name'] for c in clients if c['id'] == x)
    )

    if selected_id:
        st.session_state.selected_client_id = selected_id
```

#### 2. Create Client

```python
def create_client_form():
    """Display form to create a new client"""
    with st.form("create_client_form"):
        st.subheader("새 고객 추가")

        name = st.text_input("고객 이름 *", max_chars=100)
        email = st.text_input("이메일", max_chars=100)
        phone = st.text_input("전화번호", max_chars=20)
        company = st.text_input("회사명", max_chars=100)
        address = st.text_area("주소", max_chars=200)
        notes = st.text_area("비고", max_chars=500)

        submitted = st.form_submit_button("고객 추가")

        if submitted:
            if not name:
                st.error("고객 이름은 필수입니다")
                return

            # Call service
            result = client_service.create_client(
                name=name,
                email=email or None,
                phone=phone or None,
                company=company or None,
                address=address or None,
                notes=notes or None
            )

            if result['success']:
                st.success(f"✅ {result['message']}")
                st.rerun()
            else:
                st.error(f"❌ {result['error']}")
```

#### 3. Update Client

```python
def update_client_form(client_id: int):
    """Display form to update existing client"""
    # Load current data
    result = client_service.get_client(client_id)

    if not result['success']:
        st.error(f"고객 정보를 불러올 수 없습니다: {result['error']}")
        return

    client = result['data']

    with st.form("update_client_form"):
        st.subheader(f"고객 수정: {client['name']}")

        name = st.text_input("고객 이름 *", value=client['name'], max_chars=100)
        email = st.text_input("이메일", value=client['email'] or '', max_chars=100)
        phone = st.text_input("전화번호", value=client['phone'] or '', max_chars=20)
        company = st.text_input("회사명", value=client['company'] or '', max_chars=100)
        address = st.text_area("주소", value=client['address'] or '', max_chars=200)
        notes = st.text_area("비고", value=client['notes'] or '', max_chars=500)

        reason = st.text_input("변경 사유 *", placeholder="예: 고객 요청으로 전화번호 수정")

        submitted = st.form_submit_button("수정 완료")

        if submitted:
            if not name:
                st.error("고객 이름은 필수입니다")
                return

            if not reason:
                st.error("변경 사유는 필수입니다")
                return

            # Prepare updates
            updates = {
                'name': name,
                'email': email or None,
                'phone': phone or None,
                'company': company or None,
                'address': address or None,
                'notes': notes or None
            }

            # Call service
            result = client_service.update_client(client_id, updates, reason)

            if result['success']:
                st.success(f"✅ {result['message']}")
                st.rerun()
            else:
                st.error(f"❌ {result['error']}")
```

#### 4. View Change History

```python
def display_client_history(client_id: int):
    """Display change history for a client"""
    result = client_service.get_change_history(client_id)

    if not result['success']:
        st.error(f"변경 이력을 불러올 수 없습니다: {result['error']}")
        return

    history = result['data']

    if not history:
        st.info("변경 이력이 없습니다")
        return

    st.subheader("변경 이력")

    for entry in history:
        with st.expander(f"{entry['field']} - {entry['at']}"):
            st.write(f"**변경자**: {entry['by']}")
            st.write(f"**이전 값**: {entry['old']}")
            st.write(f"**새 값**: {entry['new']}")
            st.write(f"**사유**: {entry['reason']}")
```

### Service Methods Called

```python
# ClientService methods used by UI
client_service.get_all_clients() -> dict
client_service.get_client(client_id: int) -> dict
client_service.create_client(name, email, phone, ...) -> dict
client_service.update_client(client_id, updates: dict, reason: str) -> dict
client_service.delete_client(client_id: int, reason: str) -> dict
client_service.get_change_history(client_id: int) -> dict
```

---

## Page 2: Project Management (`src/ui/pages/2_projects.py`)

### Service Layer Interface

```python
from src.services.project_service import ProjectService
from src.services.client_service import ClientService

project_service = ProjectService()
client_service = ClientService()
```

### UI Functions

#### 1. Create Project

```python
def create_project_form():
    """Display form to create a new project"""
    # Load clients for selection
    clients_result = client_service.get_all_clients()

    if not clients_result['success']:
        st.error("고객 목록을 불러올 수 없습니다")
        return

    clients = clients_result['data']

    if not clients:
        st.warning("먼저 고객을 등록해주세요")
        return

    with st.form("create_project_form"):
        st.subheader("새 프로젝트 추가")

        client_id = st.selectbox(
            "고객 선택 *",
            options=[c['id'] for c in clients],
            format_func=lambda x: next(c['name'] for c in clients if c['id'] == x)
        )

        name = st.text_input("프로젝트 이름 *", max_chars=100)
        description = st.text_area("프로젝트 설명", max_chars=500)

        col1, col2 = st.columns(2)
        with col1:
            start_date = st.date_input("시작일")
        with col2:
            end_date = st.date_input("종료일")

        status = st.selectbox("상태", options=['active', 'completed', 'on_hold'])

        budget = st.number_input("예산 (원)", min_value=0, step=10000)
        hourly_rate = st.number_input("시간당 요금 (원/시간)", min_value=0, step=1000)

        notes = st.text_area("비고", max_chars=500)

        submitted = st.form_submit_button("프로젝트 추가")

        if submitted:
            if not name:
                st.error("프로젝트 이름은 필수입니다")
                return

            if end_date and start_date and end_date < start_date:
                st.error("종료일은 시작일보다 이후여야 합니다")
                return

            # Call service
            result = project_service.create_project(
                client_id=client_id,
                name=name,
                description=description or None,
                start_date=start_date.isoformat() if start_date else None,
                end_date=end_date.isoformat() if end_date else None,
                status=status,
                budget=budget if budget > 0 else None,
                hourly_rate=hourly_rate if hourly_rate > 0 else None,
                notes=notes or None
            )

            if result['success']:
                st.success(f"✅ {result['message']}")
                st.rerun()
            else:
                st.error(f"❌ {result['error']}")
```

#### 2. Filter Projects

```python
def display_projects_with_filter():
    """Display projects with status filter"""
    st.subheader("프로젝트 목록")

    # Filter
    status_filter = st.selectbox(
        "상태 필터",
        options=['all', 'active', 'completed', 'on_hold'],
        format_func=lambda x: {
            'all': '전체',
            'active': '진행 중',
            'completed': '완료',
            'on_hold': '보류'
        }[x]
    )

    # Get filtered projects
    if status_filter == 'all':
        result = project_service.get_all_projects()
    else:
        result = project_service.get_projects_by_status(status_filter)

    if not result['success']:
        st.error(f"프로젝트 목록을 불러올 수 없습니다: {result['error']}")
        return

    projects = result['data']

    if not projects:
        st.info("프로젝트가 없습니다")
        return

    # Display
    import pandas as pd
    df = pd.DataFrame(projects)
    st.dataframe(df[['id', 'client_name', 'name', 'status', 'start_date', 'end_date']])
```

### Service Methods Called

```python
# ProjectService methods
project_service.get_all_projects() -> dict
project_service.get_projects_by_status(status: str) -> dict
project_service.get_project(project_id: int) -> dict
project_service.create_project(...) -> dict
project_service.update_project(project_id, updates: dict, reason: str) -> dict
project_service.get_project_statistics(project_id: int) -> dict  # 총 작업 시간, 청구 가능 시간 등
```

---

## Page 3: Time Entry Management (`src/ui/pages/3_time_entries.py`)

### Service Layer Interface

```python
from src.services.time_entry_service import TimeEntryService
from src.services.project_service import ProjectService

time_entry_service = TimeEntryService()
project_service = ProjectService()
```

### UI Functions

#### 1. Create Time Entry

```python
def create_time_entry_form():
    """Display form to create a time entry"""
    # Load active projects
    result = project_service.get_projects_by_status('active')

    if not result['success']:
        st.error("프로젝트 목록을 불러올 수 없습니다")
        return

    projects = result['data']

    if not projects:
        st.warning("진행 중인 프로젝트가 없습니다")
        return

    with st.form("create_time_entry_form"):
        st.subheader("작업 시간 기록")

        project_id = st.selectbox(
            "프로젝트 선택 *",
            options=[p['id'] for p in projects],
            format_func=lambda x: next(f"{p['client_name']} - {p['name']}" for p in projects if p['id'] == x)
        )

        date = st.date_input("작업 날짜 *", value=datetime.date.today())

        hours = st.number_input("작업 시간 (시간) *", min_value=0.5, max_value=24.0, step=0.5, value=1.0)

        description = st.text_area("작업 내용", max_chars=500)

        billable = st.checkbox("청구 가능", value=True)

        notes = st.text_area("비고", max_chars=500)

        submitted = st.form_submit_button("기록 추가")

        if submitted:
            result = time_entry_service.create_time_entry(
                project_id=project_id,
                date=date.isoformat(),
                hours=hours,
                description=description or None,
                billable='Y' if billable else 'N',
                notes=notes or None
            )

            if result['success']:
                st.success(f"✅ {result['message']}")
                st.rerun()
            else:
                st.error(f"❌ {result['error']}")
```

#### 2. Weekly Summary

```python
def display_weekly_summary():
    """Display weekly time entry summary"""
    import datetime

    st.subheader("주간 작업 시간 요약")

    # Date range selector
    col1, col2 = st.columns(2)
    with col1:
        start_date = st.date_input("시작일", value=datetime.date.today() - datetime.timedelta(days=7))
    with col2:
        end_date = st.date_input("종료일", value=datetime.date.today())

    # Get summary
    result = time_entry_service.get_time_entries_by_date_range(
        start_date.isoformat(),
        end_date.isoformat()
    )

    if not result['success']:
        st.error(f"작업 시간을 불러올 수 없습니다: {result['error']}")
        return

    entries = result['data']

    if not entries:
        st.info("해당 기간에 기록된 작업 시간이 없습니다")
        return

    # Calculate summary
    total_hours = sum(e['hours'] for e in entries)
    billable_hours = sum(e['hours'] for e in entries if e['billable'] == 'Y')
    non_billable_hours = total_hours - billable_hours

    # Display metrics
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("총 작업 시간", f"{total_hours:.1f}시간")
    with col2:
        st.metric("청구 가능 시간", f"{billable_hours:.1f}시간")
    with col3:
        st.metric("청구 불가 시간", f"{non_billable_hours:.1f}시간")

    # Display table
    import pandas as pd
    df = pd.DataFrame(entries)
    st.dataframe(df[['date', 'project_name', 'hours', 'description', 'billable']])
```

### Service Methods Called

```python
# TimeEntryService methods
time_entry_service.create_time_entry(...) -> dict
time_entry_service.get_time_entries_by_project(project_id: int) -> dict
time_entry_service.get_time_entries_by_date_range(start_date: str, end_date: str) -> dict
time_entry_service.update_time_entry(entry_id, updates: dict, reason: str) -> dict
time_entry_service.delete_time_entry(entry_id: int, reason: str) -> dict
```

---

## Page 4: Invoice Management (`src/ui/pages/4_invoices.py`)

### Service Layer Interface

```python
from src.services.invoice_service import InvoiceService
from src.services.client_service import ClientService
from src.services.project_service import ProjectService

invoice_service = InvoiceService()
client_service = ClientService()
project_service = ProjectService()
```

### UI Functions

#### 1. Generate Invoice from Time Entries

```python
def generate_invoice_from_time_entries():
    """Generate invoice automatically from billable time entries"""
    st.subheader("청구서 자동 생성")

    # Select project
    result = project_service.get_all_projects()

    if not result['success']:
        st.error("프로젝트 목록을 불러올 수 없습니다")
        return

    projects = result['data']

    if not projects:
        st.warning("프로젝트가 없습니다")
        return

    with st.form("generate_invoice_form"):
        project_id = st.selectbox(
            "프로젝트 선택 *",
            options=[p['id'] for p in projects],
            format_func=lambda x: next(f"{p['client_name']} - {p['name']}" for p in projects if p['id'] == x)
        )

        issue_date = st.date_input("발행일 *", value=datetime.date.today())
        due_date = st.date_input("마감일", value=datetime.date.today() + datetime.timedelta(days=15))

        vat_included = st.checkbox("부가세 포함", value=False)

        notes = st.text_area("비고", max_chars=500)

        # Preview calculation
        preview_button = st.form_submit_button("미리보기")
        generate_button = st.form_submit_button("청구서 생성")

        if preview_button or generate_button:
            # Get preview
            preview_result = invoice_service.preview_invoice(project_id)

            if not preview_result['success']:
                st.error(f"청구서 미리보기 실패: {preview_result['error']}")
                return

            preview = preview_result['data']

            st.write("### 청구서 미리보기")
            st.write(f"**총 작업 시간**: {preview['total_hours']:.1f}시간")
            st.write(f"**청구 가능 시간**: {preview['billable_hours']:.1f}시간")
            st.write(f"**시간당 요금**: {preview['hourly_rate']:,}원")
            st.write(f"**공급가**: {preview['subtotal']:,}원")
            st.write(f"**부가세**: {preview['vat']:,}원")
            st.write(f"**합계**: {preview['total']:,}원")

            if generate_button:
                # Generate invoice
                result = invoice_service.generate_invoice_from_time_entries(
                    project_id=project_id,
                    issue_date=issue_date.isoformat(),
                    due_date=due_date.isoformat() if due_date else None,
                    vat_included='Y' if vat_included else 'N',
                    notes=notes or None
                )

                if result['success']:
                    st.success(f"✅ 청구서가 생성되었습니다: {result['data']['invoice_number']}")
                    st.rerun()
                else:
                    st.error(f"❌ {result['error']}")
```

#### 2. Export Invoice to PDF

```python
def export_invoice_to_pdf(invoice_id: int):
    """Export invoice to PDF file"""
    result = invoice_service.export_invoice_to_pdf(invoice_id)

    if not result['success']:
        st.error(f"PDF 생성 실패: {result['error']}")
        return

    pdf_path = result['data']['pdf_path']

    # Download button
    with open(pdf_path, 'rb') as f:
        st.download_button(
            label="📄 PDF 다운로드",
            data=f,
            file_name=os.path.basename(pdf_path),
            mime='application/pdf'
        )
```

### Service Methods Called

```python
# InvoiceService methods
invoice_service.preview_invoice(project_id: int) -> dict
invoice_service.generate_invoice_from_time_entries(project_id, issue_date, ...) -> dict
invoice_service.create_manual_invoice(client_id, subtotal, vat, ...) -> dict
invoice_service.update_invoice_status(invoice_id, new_status: str, reason: str) -> dict
invoice_service.export_invoice_to_pdf(invoice_id: int) -> dict
invoice_service.get_invoices_by_client(client_id: int) -> dict
invoice_service.get_invoices_by_status(status: str) -> dict
```

---

## Common UI Patterns

### 1. Loading Spinner

```python
with st.spinner("처리 중..."):
    result = service.some_operation()
```

### 2. Confirmation Dialog

```python
if st.button("삭제", type="primary"):
    confirm = st.checkbox("정말 삭제하시겠습니까?")
    if confirm:
        result = service.delete_operation()
```

### 3. Tab Navigation

```python
tab1, tab2, tab3 = st.tabs(["목록", "생성", "이력"])

with tab1:
    display_list()

with tab2:
    create_form()

with tab3:
    display_history()
```

### 4. Sidebar Filters

```python
with st.sidebar:
    st.header("필터")
    status_filter = st.selectbox("상태", ['all', 'active', 'completed'])
    date_range = st.date_input("날짜 범위", [start_date, end_date])
```

---

## Error Display Standards

```python
# Success
st.success("✅ 작업이 완료되었습니다")

# Info
st.info("ℹ️ 추가 정보가 필요합니다")

# Warning
st.warning("⚠️ 일부 데이터가 누락되었습니다")

# Error
st.error("❌ 작업 실패: 오류 메시지")
```

---

## Next Steps

✅ **contracts/ 완료** → Phase 1 완료:
1. `quickstart.md` 작성 (개발자 온보딩 가이드)

**연관 문서**:
- [README.md](./README.md) - 계층 구조 및 책임
- [spec.md](../spec.md) - 기능 명세
- [plan.md](../plan.md) - 구현 계획
- [data-model.md](../data-model.md) - 데이터베이스 스키마
