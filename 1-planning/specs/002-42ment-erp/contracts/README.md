# Contracts: API and Interface Definitions

**Date**: 2025-11-12
**Feature**: [spec.md](../spec.md)
**Plan**: [plan.md](../plan.md)

## Overview

본 디렉토리는 42ment ERP v0.1의 계층 간 인터페이스 정의를 포함합니다. Streamlit UI, Service Layer, Model Layer 간의 명확한 계약(Contract)을 정의하여 일관성 있는 개발을 보장합니다.

---

## Architecture Layers

```
┌─────────────────────────────────────┐
│      Streamlit UI Layer             │  <- 사용자 인터페이스
│  (src/ui/pages/, src/ui/components/)│
└─────────────────────────────────────┘
              │
              ▼ (calls)
┌─────────────────────────────────────┐
│       Service Layer                 │  <- 비즈니스 로직
│  (src/services/)                    │
└─────────────────────────────────────┘
              │
              ▼ (uses)
┌─────────────────────────────────────┐
│       Model Layer                   │  <- 데이터 모델
│  (src/models/)                      │
└─────────────────────────────────────┘
              │
              ▼ (persists to)
┌─────────────────────────────────────┐
│      Database Layer                 │  <- 데이터 저장
│  (SQLite: data/42ment.db)           │
└─────────────────────────────────────┘
```

---

## Layer Responsibilities

### 1. UI Layer (`src/ui/`)

**책임**:
- 사용자 입력 수신 (폼, 버튼, 선택)
- 데이터 표시 (테이블, 차트, 리포트)
- Streamlit session state 관리
- Service Layer 호출

**금지 사항**:
- ❌ 직접 데이터베이스 접근
- ❌ 비즈니스 로직 구현
- ❌ 데이터 검증 (간단한 클라이언트 검증만 허용)

**파일 구조**:
```
src/ui/
├── pages/
│   ├── 1_clients.py        # 고객 관리 페이지
│   ├── 2_projects.py       # 프로젝트 관리 페이지
│   ├── 3_time_entries.py   # 작업 시간 기록 페이지
│   └── 4_invoices.py       # 청구서 관리 페이지
└── components/
    ├── forms.py            # 재사용 가능한 폼 컴포넌트
    ├── tables.py           # 데이터 테이블 컴포넌트
    └── charts.py           # 시각화 컴포넌트
```

---

### 2. Service Layer (`src/services/`)

**책임**:
- 비즈니스 로직 구현
- 데이터 검증 (서버 사이드)
- Model Layer 조율
- Adjustment 로깅 (변경 이력 기록)
- 트랜잭션 관리

**금지 사항**:
- ❌ Streamlit 의존성 (st.* 호출 금지)
- ❌ 직접 HTML 렌더링
- ❌ Session state 접근

**파일 구조**:
```
src/services/
├── client_service.py       # 고객 관리 비즈니스 로직
├── project_service.py      # 프로젝트 관리 비즈니스 로직
├── time_entry_service.py   # 작업 시간 비즈니스 로직
├── invoice_service.py      # 청구서 비즈니스 로직
└── export_service.py       # CSV/JSON/PDF Export 로직
```

---

### 3. Model Layer (`src/models/`)

**책임**:
- 데이터베이스 CRUD 작업
- SQL 쿼리 실행
- 데이터 직렬화/역직렬화
- 엔티티 클래스 정의

**금지 사항**:
- ❌ 비즈니스 로직 (계산, 검증 등)
- ❌ Streamlit 의존성
- ❌ Service Layer 호출

**파일 구조**:
```
src/models/
├── client.py               # Client 엔티티 및 CRUD
├── project.py              # Project 엔티티 및 CRUD
├── time_entry.py           # TimeEntry 엔티티 및 CRUD
├── invoice.py              # Invoice 엔티티 및 CRUD
└── adjustment.py           # Adjustment 엔티티 및 CRUD
```

---

## Data Flow Examples

### Example 1: 고객 생성

```
User Input (UI)
  ↓
Streamlit Form (src/ui/pages/1_clients.py)
  │ st.form_submit_button()
  ↓
ClientService.create_client(name, email, phone, ...)
  │ - 데이터 검증
  │ - ClientModel.create() 호출
  │ - AdjustmentModel.log_change() 호출
  ↓
ClientModel.create()
  │ - INSERT INTO clients ...
  │ - Return client_id
  ↓
AdjustmentModel.log_change()
  │ - INSERT INTO adjustments ...
  ↓
Success Response
  ↓
UI Refresh (st.rerun())
```

### Example 2: 청구서 생성 (복잡한 비즈니스 로직)

```
User Input (UI)
  ↓
InvoiceService.generate_invoice_from_time_entries(project_id)
  │ 1. TimeEntryModel.get_billable_entries(project_id)
  │ 2. Calculate subtotal (sum of hours * hourly_rate)
  │ 3. Calculate VAT (subtotal * 0.1)
  │ 4. Generate invoice_number
  │ 5. InvoiceModel.create(...)
  │ 6. AdjustmentModel.log_change(...)
  ↓
InvoiceModel.create()
  │ - INSERT INTO invoices ...
  ↓
Success Response
  ↓
UI Display Invoice Details
```

---

## Interface Contracts

### Service → Model Contract

**원칙**:
- Service는 Model의 public 메서드만 호출
- Model은 항상 결과를 dict 또는 dataclass로 반환
- 에러는 Exception으로 전파 (Service에서 처리)

**Model 반환 타입**:
```python
# Success
{
    'success': True,
    'data': {...},  # 엔티티 데이터 또는 리스트
    'message': 'Operation successful'
}

# Error
{
    'success': False,
    'error': 'Error message',
    'code': 'ERROR_CODE'
}
```

### UI → Service Contract

**원칙**:
- UI는 Service의 public 메서드만 호출
- Service는 항상 dict로 결과 반환
- UI는 결과에 따라 st.success() 또는 st.error() 표시

**Service 반환 타입**:
```python
# Success
{
    'success': True,
    'data': {...},
    'message': '고객이 성공적으로 생성되었습니다'
}

# Error
{
    'success': False,
    'error': '이메일 형식이 올바르지 않습니다',
    'code': 'INVALID_EMAIL'
}
```

---

## Error Handling

### Error Codes

```python
# Common Errors
'INVALID_INPUT'        # 입력 데이터 검증 실패
'NOT_FOUND'            # 엔티티가 존재하지 않음
'DUPLICATE'            # 중복 데이터 (예: invoice_number)
'CONSTRAINT_VIOLATION' # 제약 조건 위반 (예: end_date < start_date)

# Database Errors
'DB_CONNECTION_ERROR'  # 데이터베이스 연결 실패
'DB_QUERY_ERROR'       # 쿼리 실행 실패

# Business Logic Errors
'INSUFFICIENT_DATA'    # 데이터 부족 (예: 청구서 생성 시 작업 시간 없음)
'INVALID_STATE'        # 잘못된 상태 (예: completed 프로젝트 수정 시도)
```

### Error Propagation

```python
# Model Layer
def get_client(client_id: int) -> dict:
    try:
        # SQL query
        if not result:
            return {'success': False, 'error': 'Client not found', 'code': 'NOT_FOUND'}
        return {'success': True, 'data': result}
    except sqlite3.Error as e:
        return {'success': False, 'error': str(e), 'code': 'DB_QUERY_ERROR'}

# Service Layer
def get_client(client_id: int) -> dict:
    result = ClientModel.get_client(client_id)
    if not result['success']:
        logger.error(f"Failed to get client {client_id}: {result['error']}")
    return result

# UI Layer
result = ClientService.get_client(client_id)
if result['success']:
    st.success(result['message'])
    display_client(result['data'])
else:
    st.error(f"오류: {result['error']}")
```

---

## Testing Strategy

### Unit Tests

```python
# Service Layer Tests
def test_create_client_success():
    result = ClientService.create_client('홍길동', 'hong@example.com', '010-1234-5678')
    assert result['success'] == True
    assert result['data']['name'] == '홍길동'

def test_create_client_invalid_email():
    result = ClientService.create_client('홍길동', 'invalid-email', '010-1234-5678')
    assert result['success'] == False
    assert result['code'] == 'INVALID_INPUT'
```

### Integration Tests

```python
# Full Workflow Tests
def test_invoice_generation_workflow():
    # 1. Create client
    client = ClientService.create_client(...)
    # 2. Create project
    project = ProjectService.create_project(client['data']['id'], ...)
    # 3. Add time entries
    TimeEntryService.create_time_entry(project['data']['id'], ...)
    # 4. Generate invoice
    invoice = InvoiceService.generate_invoice_from_time_entries(project['data']['id'])

    assert invoice['success'] == True
    assert invoice['data']['total'] > 0
```

---

## Documents in This Directory

1. **[streamlit_api.md](./streamlit_api.md)**: Streamlit UI ↔ Service 인터페이스 상세 정의
   - 각 페이지별 Service 호출 패턴
   - Session state 관리 규칙
   - 폼 처리 및 에러 핸들링

---

## Next Steps

✅ **contracts/README.md 완료** → Phase 1 계속:
1. `contracts/streamlit_api.md` 작성
2. `quickstart.md` 작성

**연관 문서**:
- [spec.md](../spec.md) - 기능 명세
- [plan.md](../plan.md) - 구현 계획
- [research.md](../research.md) - 기술 조사
- [data-model.md](../data-model.md) - 데이터베이스 스키마
