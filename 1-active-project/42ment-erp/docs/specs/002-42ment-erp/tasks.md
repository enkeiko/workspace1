# Tasks: 42ment ERP v0.1

**Input**: Design documents from `/specs/002-42ment-erp/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in the specification, so test tasks are excluded. Focus is on implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create project directory structure (src/, data/, tests/, config/)
- [X] T002 Create requirements.txt with dependencies (streamlit>=1.28.0, pandas>=2.0.0, weasyprint>=60.0, jsonschema>=4.0.0, pytest>=7.0.0)
- [X] T003 [P] Create .gitignore for Python project (venv/, __pycache__/, *.db, data/exports/, data/logs/)
- [X] T004 [P] Create README.md with project overview and setup instructions
- [X] T005 [P] Create config/config.yaml for application configuration
- [X] T006 [P] Create config/.env.template for environment variables

**Checkpoint**: Basic project structure ready

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Create src/__init__.py
- [X] T008 Create database initialization script in src/database/db.py (connection, init_database function)
- [X] T009 Create database schema file in src/database/schema.py (common field conventions)
- [X] T010 Create migration script src/database/migrations/001_initial_schema.sql (all 5 tables: clients, projects, time_entries, invoices, adjustments, schema_version)
- [X] T011 [P] Create logging utility in src/utils/logger.py (structured JSON logging)
- [X] T012 [P] Create validator utility in src/utils/validators.py (email, phone, date validation)
- [X] T013 [P] Create formatter utility in src/utils/formatters.py (currency, date formatting)
- [X] T014 Create Adjustment model in src/models/adjustment.py (audit log CRUD operations)
- [X] T015 Create base Streamlit app entry point in src/main.py (session state initialization, home page)
- [X] T016 [P] Create reusable form components in src/ui/components/forms.py
- [X] T017 [P] Create reusable table components in src/ui/components/tables.py

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - 고객 정보 관리 (Priority: P1) 🎯 MVP

**Goal**: 프리랜서는 고객의 기본 정보를 등록, 조회, 수정할 수 있어야 합니다

**Independent Test**: 고객을 등록하고, 검색하여 조회하고, 정보를 수정한 후 변경 이력을 확인할 수 있으면 독립적으로 테스트 완료입니다

### Implementation for User Story 1

- [ ] T018 [P] [US1] Create Client model in src/models/client.py (CRUD operations: create, get_by_id, get_all, update, delete, search_by_name, search_by_email)
- [ ] T019 [US1] Implement ClientService in src/services/client_service.py (business logic: validate client data, create_client with Adjustment logging, update_client with reason tracking, get_client, get_all_clients, search_clients, get_change_history)
- [ ] T020 [US1] Create client management page in src/ui/pages/1_clients.py (list clients, create form, update form, delete confirmation, search functionality, display change history)
- [ ] T021 [US1] Add client name validation (non-empty, max 100 chars) in ClientService
- [ ] T022 [US1] Add email format validation (optional field) in ClientService
- [ ] T023 [US1] Implement client search by name or email in ClientService and UI
- [ ] T024 [US1] Implement change history display for clients (query Adjustment table filtered by ref_type='client')

**Checkpoint**: User Story 1 완료 - 고객 등록, 조회, 수정, 변경 이력 확인 가능

---

## Phase 4: User Story 2 - 프로젝트 생성 및 일정 관리 (Priority: P2)

**Goal**: 프리랜서는 고객별로 프로젝트를 생성하고, 프로젝트명, 시작일, 마감일, 상태를 관리할 수 있어야 합니다

**Independent Test**: 기존 고객에 대해 프로젝트를 생성하고, 프로젝트 상태를 변경하고, 상태별로 필터링하여 조회할 수 있으면 독립적으로 테스트 완료입니다

### Implementation for User Story 2

- [ ] T025 [P] [US2] Create Project model in src/models/project.py (CRUD operations: create, get_by_id, get_all, get_by_client_id, get_by_status, update, update_status)
- [ ] T026 [US2] Implement ProjectService in src/services/project_service.py (business logic: validate project data, create_project with Adjustment logging, update_project with reason tracking, validate date constraints, get_project, get_all_projects, get_projects_by_status, get_projects_by_client, get_change_history, get_project_statistics)
- [ ] T027 [US2] Create project management page in src/ui/pages/2_projects.py (list projects with client names, create form with client selector, update form, status filter dropdown, project details view, change history display)
- [ ] T028 [US2] Add project name validation (non-empty, max 100 chars) in ProjectService
- [ ] T029 [US2] Add date constraint validation (end_date >= start_date) in ProjectService
- [ ] T030 [US2] Add status validation (must be 'active', 'completed', or 'on_hold') in ProjectService
- [ ] T031 [US2] Implement project filtering by status (dropdown: all/active/completed/on_hold) in UI
- [ ] T032 [US2] Implement client_id foreign key validation (client must exist) in ProjectService
- [ ] T033 [US2] Implement project statistics calculation (total projects, active count, completed count) in ProjectService

**Checkpoint**: User Story 2 완료 - 프로젝트 생성, 상태 관리, 필터링 가능

---

## Phase 5: User Story 3 - 작업 시간 기록 (Priority: P3)

**Goal**: 프리랜서는 각 프로젝트에 대해 작업한 시간을 기록하고, 프로젝트별로 누적 작업 시간을 조회할 수 있어야 합니다

**Independent Test**: 기존 프로젝트에 대해 작업 시간을 등록하고, 프로젝트별 총 작업 시간을 조회하고, 날짜 범위로 필터링할 수 있으면 독립적으로 테스트 완료입니다

### Implementation for User Story 3

- [ ] T034 [P] [US3] Create TimeEntry model in src/models/time_entry.py (CRUD operations: create, get_by_id, get_all, get_by_project_id, get_by_date_range, update, delete, calculate_total_hours)
- [ ] T035 [US3] Implement TimeEntryService in src/services/time_entry_service.py (business logic: validate time entry data, create_time_entry with Adjustment logging, update_time_entry with reason tracking, get_time_entry, get_time_entries_by_project, get_time_entries_by_date_range, calculate_project_total_hours, calculate_billable_hours, get_change_history)
- [ ] T036 [US3] Create time entry management page in src/ui/pages/3_time_entries.py (list time entries with project names, create form with project selector and date picker, update form, delete confirmation, weekly summary view with metrics, date range filter)
- [ ] T037 [US3] Add hours validation (must be > 0, max 24 hours per day) in TimeEntryService
- [ ] T038 [US3] Add billable flag validation (must be 'Y' or 'N') in TimeEntryService
- [ ] T039 [US3] Implement project_id foreign key validation (project must exist) in TimeEntryService
- [ ] T040 [US3] Implement total hours calculation by project (sum all hours for project_id) in TimeEntryService
- [ ] T041 [US3] Implement billable hours calculation (sum hours where billable='Y') in TimeEntryService
- [ ] T042 [US3] Implement date range filtering in UI (start_date, end_date inputs with date picker)
- [ ] T043 [US3] Implement weekly summary display (total hours, billable hours, non-billable hours metrics) in UI

**Checkpoint**: User Story 3 완료 - 작업 시간 기록, 누적 시간 조회, 날짜 필터링 가능

---

## Phase 6: User Story 4 - 자동 청구서 생성 (Priority: P4)

**Goal**: 프리랜서는 프로젝트 정보와 작업 시간을 기반으로 청구서를 자동으로 생성하고 PDF로 저장할 수 있어야 합니다

**Independent Test**: 작업 시간이 기록된 프로젝트에 대해 청구서를 생성하고, 생성된 청구서에 올바른 정보가 포함되어 있고 PDF로 다운로드할 수 있으면 독립적으로 테스트 완료입니다

### Implementation for User Story 4

- [ ] T044 [P] [US4] Create Invoice model in src/models/invoice.py (CRUD operations: create, get_by_id, get_all, get_by_client_id, get_by_project_id, get_by_status, update_status, generate_invoice_number)
- [ ] T045 [US4] Implement InvoiceService in src/services/invoice_service.py (business logic: generate_invoice_from_time_entries, create_manual_invoice, calculate_subtotal_and_vat, preview_invoice, validate_invoice_data, update_invoice_status with Adjustment logging, get_invoice, get_invoices_by_client, get_invoices_by_status, get_change_history)
- [ ] T046 [P] [US4] Create HTML template for invoice PDF in src/templates/invoice_template.html (고객 정보, 프로젝트명, 작업 내역 테이블, 금액 계산, Korean font support)
- [ ] T047 [P] [US4] Add NanumGothic font file to src/templates/fonts/NanumGothic.ttf (for Korean text in PDF)
- [ ] T048 [US4] Implement ExportService in src/services/export_service.py (export_invoice_to_pdf using WeasyPrint, fallback to text file on error)
- [ ] T049 [US4] Create invoice management page in src/ui/pages/4_invoices.py (list invoices, generate invoice form with project selector, preview calculation before generation, manual invoice form for fixed amount, PDF download button, status filter, invoice details view)
- [ ] T050 [US4] Add invoice number generation logic (format: INV-YYYY-XXX) in InvoiceService
- [ ] T051 [US4] Add invoice number uniqueness validation (check duplicate before insert) in InvoiceService
- [ ] T052 [US4] Add amount validation (subtotal + vat = total) in InvoiceService
- [ ] T053 [US4] Add date validation (due_date >= issue_date) in InvoiceService
- [ ] T054 [US4] Add VAT calculation logic (vat = subtotal * 0.1 if vat_included='N', else subtotal = total / 1.1) in InvoiceService
- [ ] T055 [US4] Implement invoice preview (calculate amounts without saving) in InvoiceService
- [ ] T056 [US4] Implement automatic invoice generation from time entries (query billable time entries, calculate total with hourly_rate) in InvoiceService
- [ ] T057 [US4] Implement manual invoice creation (user inputs subtotal directly, no time entry dependency) in InvoiceService
- [ ] T058 [US4] Implement PDF export with WeasyPrint (render HTML template, save to data/exports/) in ExportService
- [ ] T059 [US4] Implement fallback to text file export (if WeasyPrint fails, save invoice data as .txt) in ExportService
- [ ] T060 [US4] Add PDF download button in UI (st.download_button with generated PDF file)

**Checkpoint**: User Story 4 완료 - 청구서 자동 생성, PDF 저장, 수동 청구서 생성 가능

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Enhance user experience and add non-functional features

- [ ] T061 [P] Implement CSV export for clients in ExportService (to_csv using pandas)
- [ ] T062 [P] Implement CSV export for projects in ExportService (to_csv using pandas)
- [ ] T063 [P] Implement CSV export for time entries in ExportService (to_csv using pandas)
- [ ] T064 [P] Implement CSV export for invoices in ExportService (to_csv using pandas)
- [ ] T065 [P] Implement JSON export for all entities in ExportService (to_json using pandas)
- [ ] T066 [P] Implement CSV import with schema validation in ExportService (read_csv, validate with jsonschema, batch insert)
- [ ] T067 [P] Implement JSON import with schema validation in ExportService (read_json, validate with jsonschema, batch insert)
- [ ] T068 [P] Create JSON schema files for validation in src/schemas/ (client_schema.json, project_schema.json, time_entry_schema.json, invoice_schema.json)
- [ ] T069 [P] Add error handling for database operations (try-catch, return error dict)
- [ ] T070 [P] Add error handling for export/import operations (file not found, schema validation errors)
- [ ] T071 [P] Implement automatic database backup script (copy data/42ment.db to data/backups/ with timestamp)
- [ ] T072 [P] Add session state management for UI (current selections, form modes, filter states) in src/main.py
- [ ] T073 [P] Create chart component for dashboard in src/ui/components/charts.py (project status distribution, monthly hours chart)
- [ ] T074 [P] Add home page with dashboard widgets in src/ui/pages/home.py (total clients, active projects, this week hours, pending invoices)
- [ ] T075 [P] Implement simple password authentication in src/main.py (hardcoded password, stored in config/config.yaml)
- [ ] T076 [P] Add data/exports/ directory creation in database init script
- [ ] T077 [P] Add data/logs/ directory creation in database init script
- [ ] T078 [P] Add sample data loading script in src/database/db.py --load-sample-data option (3 clients, 2 projects, 3 time entries, 2 invoices, 2 adjustments)

**Checkpoint**: Polish 완료 - Export/Import, 백업, 대시보드, 인증 추가

---

## Implementation Strategy

### MVP Scope (User Story 1 Only) 🎯

**MVP Deliverable**: 고객 등록 및 조회 가능한 최소 기능 앱

**Tasks for MVP**:
- Phase 1: Setup (T001-T006)
- Phase 2: Foundational (T007-T017)
- Phase 3: User Story 1 (T018-T024)

**Timeline**: 2주 (v0.1.0)

### Incremental Delivery

```
MVP (US1) → v0.1.0 (2주)
  T001-T024 complete
  ↓
US2 추가 → v0.2.0 (1주)
  T025-T033 complete
  ↓
US3 추가 → v0.3.0 (1주)
  T034-T043 complete
  ↓
US4 추가 → v0.4.0 (2주)
  T044-T060 complete
  ↓
Polish → v1.0.0 (1주)
  T061-T078 complete
```

### Dependency Graph

```
Phase 1 (Setup)
  ↓
Phase 2 (Foundational)
  ↓
  ├─→ Phase 3 (US1) → INDEPENDENT
  │
  ├─→ Phase 4 (US2) → Depends on US1 (needs clients)
  │     ↓
  │     ├─→ Phase 5 (US3) → Depends on US2 (needs projects)
  │     │     ↓
  │     │     └─→ Phase 6 (US4) → Depends on US2, US3 (needs projects and time entries)
  │
  └─→ Phase 7 (Polish) → Can run in parallel after Foundational
```

### Parallel Execution Opportunities

#### Phase 1 (Setup)
- T003, T004, T005, T006 can run in parallel after T001-T002

#### Phase 2 (Foundational)
- T011, T012, T013 (utils) can run in parallel
- T016, T017 (UI components) can run in parallel after T015

#### Phase 3 (US1)
- T018 can run independently (just depends on Foundational)

#### Phase 4 (US2)
- T025 can run in parallel with T018 (different models)

#### Phase 5 (US3)
- T034 can run in parallel with T025 (different models)

#### Phase 6 (US4)
- T044, T046, T047 can run in parallel after US2/US3 complete

#### Phase 7 (Polish)
- ALL tasks (T061-T078) can run in parallel (different files, independent features)

---

## Validation Checklist

### Format Validation ✅

- [x] All tasks follow `- [ ] [ID] [P?] [Story?] Description` format
- [x] Task IDs are sequential (T001-T078)
- [x] [P] markers present for parallelizable tasks
- [x] [Story] labels (US1-US4) present for user story phases
- [x] File paths included in all implementation tasks

### Organization Validation ✅

- [x] Tasks organized by user story (Phase 3-6)
- [x] Each phase has clear goal and independent test
- [x] Setup phase (Phase 1) covers project initialization
- [x] Foundational phase (Phase 2) covers blocking prerequisites
- [x] Polish phase (Phase 7) covers cross-cutting concerns
- [x] Dependency graph shows story completion order

### Completeness Validation ✅

- [x] All entities from data-model.md covered (Client, Project, TimeEntry, Invoice, Adjustment)
- [x] All user stories from spec.md covered (US1-US4)
- [x] All tech stack from plan.md addressed (Python, Streamlit, SQLite, WeasyPrint, Pandas)
- [x] All contracts from contracts/ addressed (4 pages, service layer, models)
- [x] MVP scope clearly defined (US1 only)
- [x] Incremental delivery path defined

---

## Summary

**Total Tasks**: 78
**Tasks by Phase**:
- Phase 1 (Setup): 6 tasks
- Phase 2 (Foundational): 11 tasks
- Phase 3 (US1): 7 tasks
- Phase 4 (US2): 9 tasks
- Phase 5 (US3): 10 tasks
- Phase 6 (US4): 17 tasks
- Phase 7 (Polish): 18 tasks

**Parallel Opportunities**:
- Phase 1: 4 tasks can run in parallel
- Phase 2: 5 tasks can run in parallel
- Phase 7: ALL 18 tasks can run in parallel

**Independent Test Criteria**:
- US1: 고객 등록, 조회, 수정, 변경 이력 확인
- US2: 프로젝트 생성, 상태 변경, 필터링 조회
- US3: 작업 시간 등록, 총 시간 조회, 날짜 필터링
- US4: 청구서 생성, 올바른 정보 확인, PDF 다운로드

**Suggested MVP Scope**: User Story 1 only (Tasks T001-T024, 2주 timeline)

---

**Generated**: 2025-11-12
**Feature**: 42ment ERP v0.1
**Branch**: 002-42ment-erp
