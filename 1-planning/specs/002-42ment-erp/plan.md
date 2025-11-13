# Implementation Plan: 42ment ERP v0.1

**Branch**: `002-42ment-erp` | **Date**: 2025-11-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-42ment-erp/spec.md`

## Summary

42ment ERP v0.1은 프리랜서를 위한 경량 프로젝트 관리 시스템으로, 고객 관리, 프로젝트 일정 추적, 작업 시간 기록, 자동 청구서 생성 기능을 제공합니다. Brand Studio ERP Core System 개발 원칙을 기반으로 구조화된 통제력, 데이터 투명성, 그리고 Fail-safe 구조를 핵심으로 설계되었습니다.

**핵심 가치**:
- 단일 사용자(프리랜서 본인)를 위한 간단하고 직관적인 인터페이스
- 모든 데이터 변경의 완전한 이력 추적 (Adjustment 테이블)
- CSV/JSON 기반 데이터 이식성 (외부 의존성 최소화)
- 로컬 우선 아키텍처 (클라우드 동기화 불필요)

## Technical Context

**Language/Version**: Python 3.11+
**Primary Dependencies**:
- Streamlit 1.28+ (웹 UI 프레임워크)
- SQLite (내장, 로컬 데이터베이스)
- ReportLab or WeasyPrint (PDF 생성)
- Pandas (데이터 처리 및 CSV/JSON I/O)

**Storage**: SQLite (로컬 파일 기반 데이터베이스, `data/42ment.db`)
**Testing**: pytest + Streamlit testing utilities
**Target Platform**: Windows/Mac/Linux Desktop (웹 브라우저를 통한 로컬 앱)
**Project Type**: Single project (Python backend + Streamlit frontend)
**Performance Goals**:
- 고객/프로젝트 조회: <100ms
- 청구서 생성: <2초
- CSV/JSON Export: <5초 (최대 1000개 레코드 기준)

**Constraints**:
- 단일 사용자만 지원 (동시 접속 불필요)
- 로컬 환경에서만 실행 (인터넷 연결 불필요)
- 데이터베이스 크기: <100MB (예상)
- 메모리 사용량: <200MB

**Scale/Scope**:
- 예상 고객 수: 최대 500명
- 예상 프로젝트 수: 최대 1000개
- 예상 작업 시간 레코드: 최대 10,000개
- 예상 청구서 수: 최대 2000개

## Constitution Check (42ment ERP Principles)

*GATE: Brand Studio ERP Core System 개발 원칙 준수 확인*

### 1. 직접성 (Direct Control)
- [x] 외부 SaaS 의존 없음 (로컬 SQLite 사용)
- [x] I/O 포트: CSV, JSON, PDF만 사용
- [x] 데이터 주권: 사용자가 언제든 Export/Import 가능

### 2. 투명성 (Traceability)
- [x] Adjustment 테이블로 모든 변경 이력 기록
- [x] 각 엔티티의 생성→수정→삭제 전체 이력 추적
- [x] 변경 근거는 절대 삭제되지 않음

### 3. 일관성 (Consistency over Convenience)
- [x] 모든 엔티티에 공통 필드 규약 적용
- [x] 스키마 버전 관리 계획 (schema_version 필드)
- [x] 마이그레이션 스크립트 지원 예정

### 4. 단일 진실의 원천 (Single Source of Truth)
- [x] Client, Project, TimeEntry, Invoice, Adjustment가 핵심 엔티티
- [x] 모든 계산은 이 엔티티들을 기반으로 생성
- [x] 중복 데이터 저장 금지

### 5. Fail-safe 구조
- [x] 자동 계산 실패 시 수동 입력 모드 제공
- [x] 시스템 부분 장애가 전체를 중단시키지 않음
- [x] CSV/JSON Import를 통한 수동 복구 경로 존재

### 6. 사람 우선 (Human-First)
- [x] AI 기능 없음 (v0.1에서는 제외)
- [x] 모든 입력은 사용자가 직접 제어
- [x] 수동 수정이 항상 가능

**Violations**: 없음

## Project Structure

### Documentation (this feature)

```text
specs/002-42ment-erp/
├── spec.md              # Feature specification
├── plan.md              # This file (implementation plan)
├── research.md          # Technology research (Phase 0)
├── data-model.md        # Database schema (Phase 1)
├── contracts/           # API contracts (Phase 1)
│   ├── README.md
│   └── streamlit_api.md
├── quickstart.md        # Developer quick start (Phase 1)
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Implementation tasks (Phase 2, /speckit.tasks)
```

### Source Code (repository root)

```text
42ment-erp/                  # Project root
├── src/
│   ├── __init__.py
│   ├── main.py              # Streamlit app entry point
│   ├── database/
│   │   ├── __init__.py
│   │   ├── db.py            # SQLite connection & initialization
│   │   ├── schema.py        # Table definitions
│   │   └── migrations/      # Schema migration scripts
│   ├── models/
│   │   ├── __init__.py
│   │   ├── client.py        # Client entity
│   │   ├── project.py       # Project entity
│   │   ├── time_entry.py    # TimeEntry entity
│   │   ├── invoice.py       # Invoice entity
│   │   └── adjustment.py    # Adjustment (audit log)
│   ├── services/
│   │   ├── __init__.py
│   │   ├── client_service.py
│   │   ├── project_service.py
│   │   ├── time_entry_service.py
│   │   ├── invoice_service.py
│   │   └── export_service.py  # CSV/JSON/PDF export
│   ├── ui/
│   │   ├── __init__.py
│   │   ├── pages/
│   │   │   ├── home.py
│   │   │   ├── clients.py
│   │   │   ├── projects.py
│   │   │   ├── time_entries.py
│   │   │   └── invoices.py
│   │   └── components/
│   │       ├── forms.py
│   │       ├── tables.py
│   │       └── charts.py
│   └── utils/
│       ├── __init__.py
│       ├── logger.py         # Structured logging
│       ├── validators.py     # Input validation
│       └── formatters.py     # Data formatting utilities
├── data/
│   ├── 42ment.db            # SQLite database (generated)
│   ├── exports/             # CSV/JSON/PDF exports
│   └── logs/                # Application logs
├── tests/
│   ├── __init__.py
│   ├── unit/
│   │   ├── test_models.py
│   │   ├── test_services.py
│   │   └── test_utils.py
│   ├── integration/
│   │   ├── test_database.py
│   │   └── test_workflows.py
│   └── fixtures/
│       └── sample_data.py
├── config/
│   ├── config.yaml          # Application configuration
│   └── .env.template        # Environment template
├── requirements.txt
├── setup.py
└── README.md
```

**Structure Decision**: Single project 구조 선택. Streamlit 기반 웹 앱이지만 별도의 backend/frontend 분리가 불필요한 단순 구조. 모든 로직은 Python으로 통합되며, Streamlit이 UI 렌더링을 담당.

## Complexity Tracking

> **해당 없음** - Constitution 원칙 위반 사항 없음.

## Phase 0: Research & Technology Decisions

### Research Tasks

1. **Streamlit 아키텍처 패턴**
   - Streamlit 앱의 multi-page 구조 및 상태 관리 방식 조사
   - Session state를 활용한 사용자 데이터 관리 패턴

2. **SQLite 스키마 설계 및 마이그레이션**
   - SQLite에서 Foreign Key 제약 조건 활성화 방법
   - Alembic 또는 수동 마이그레이션 스크립트 패턴

3. **PDF 생성 라이브러리 비교**
   - ReportLab vs WeasyPrint vs xhtml2pdf
   - 한글 지원 및 템플릿 기반 PDF 생성 방식

4. **데이터 Export/Import 패턴**
   - Pandas를 활용한 CSV/JSON 변환
   - 스키마 검증 및 에러 처리 패턴

5. **Audit Log 구현 패턴**
   - SQLite trigger vs Application-level logging
   - Adjustment 테이블 설계 모범 사례

### Expected Decisions (research.md)

- **UI Framework**: Streamlit 1.28+ (확정)
  - 이유: 빠른 프로토타이핑, Python 네이티브, 추가 프론트엔드 기술 불필요

- **PDF Library**: WeasyPrint (추천)
  - 이유: HTML/CSS 기반 템플릿, 한글 지원 우수, 유지보수 활발

- **Migration Tool**: 수동 SQL 스크립트 (v0.1)
  - 이유: 단순 구조, Alembic 오버헤드 불필요, 향후 Alembic 전환 가능

- **Audit Logging**: Application-level (Adjustment 테이블)
  - 이유: 유연성, 명시적 제어, 테스트 용이성

## Phase 1: Design Artifacts

### 1. data-model.md

**목적**: SQLite 데이터베이스 스키마 정의

**포함 내용**:
- 5개 핵심 테이블 DDL (Client, Project, TimeEntry, Invoice, Adjustment)
- 공통 필드 규약 적용 (id, created_at, updated_at, manual_edit, source, notes)
- 관계 정의 (Foreign Keys)
- 인덱스 전략
- 마이그레이션 스크립트 예시

### 2. contracts/

**목적**: Streamlit과 Service Layer 간 인터페이스 정의

**포함 내용**:
- `contracts/README.md`: Streamlit 앱 구조 설명
- `contracts/streamlit_api.md`:
  - UI → Service 호출 패턴
  - Service → Model 데이터 흐름
  - 에러 처리 규칙
  - 상태 관리 규칙

### 3. quickstart.md

**목적**: 개발자 온보딩 가이드

**포함 내용**:
- 로컬 환경 설정 (Python 3.11+, venv 생성)
- 의존성 설치 (`pip install -r requirements.txt`)
- 데이터베이스 초기화 (`python src/database/db.py --init`)
- 앱 실행 (`streamlit run src/main.py`)
- 샘플 데이터 로드 방법
- 테스트 실행 (`pytest tests/`)

## Technical Decisions

### Database

**Choice**: SQLite
**Rationale**:
- 로컬 파일 기반, 설치 불필요
- Python 내장 지원
- 단일 사용자에게 충분한 성능
- 이식성 우수 (파일 하나로 백업 가능)

**Schema Version**: 1.0.0
**Migration Strategy**: 수동 SQL 스크립트 (향후 Alembic 전환 고려)

### UI Framework

**Choice**: Streamlit
**Rationale**:
- Python만으로 웹 UI 구현 가능
- 빠른 프로토타이핑 및 반복 개발
- 추가 프론트엔드 기술 학습 불필요
- 내장 상태 관리 및 폼 처리

**Limitations**:
- 복잡한 SPA 구현 어려움 → v0.1에서는 문제 없음
- 커스터마이징 제한적 → 기본 스타일로 충분

### PDF Generation

**Choice**: WeasyPrint
**Rationale**:
- HTML/CSS 템플릿 기반 (디자인 유연성)
- 한글 폰트 지원 우수
- 유지보수 활발, 라이센스 자유로움 (BSD)

**Alternative**: ReportLab (코드 기반 PDF 생성, 더 복잡)

### Logging

**Choice**: Python logging 모듈 + 파일 로거
**Format**: JSON 구조화 로그
**Levels**: DEBUG, INFO, WARNING, ERROR
**Output**: `data/logs/app_YYYYMMDD.log`

### Testing Strategy

**Framework**: pytest
**Coverage Goal**: >80% (core services)
**Test Types**:
1. **Unit Tests**: models, services, utils
2. **Integration Tests**: database workflows, end-to-end user stories
3. **Manual Tests**: Streamlit UI 상호작용

## Implementation Strategy

### MVP Scope (User Story 1 Only)

**P1 - 고객 정보 관리**만 구현:
- Client 모델 + service
- SQLite 스키마 (Client 테이블)
- Streamlit UI (고객 추가/조회/수정)
- Adjustment 테이블 (이력 추적)

**Deliverable**: 고객 등록 및 조회 가능한 최소 기능 앱

### Incremental Delivery

```
MVP (P1) → v0.1.0 (2주)
  ↓
P2 추가 → v0.2.0 (1주)
  ↓
P3 추가 → v0.3.0 (1주)
  ↓
P4 추가 → v1.0.0 (2주)
```

### Risk Mitigation

| Risk | Mitigation |
|------|------------|
| SQLite 성능 부족 | 인덱스 최적화, 필요시 PostgreSQL 전환 경로 준비 |
| Streamlit 제약 | 복잡한 UI는 v2.0에서 React 전환 고려 |
| PDF 생성 실패 | WeasyPrint fallback: 기본 텍스트 파일 출력 |
| 데이터 손실 | 자동 백업 스크립트 (매일 `data/` 폴더 복사) |

## Next Steps

1. **Phase 0 완료**: `research.md` 작성 (기술 선택 근거 문서화)
2. **Phase 1 시작**: `data-model.md`, `contracts/`, `quickstart.md` 생성
3. **Agent Context 업데이트**: `.claude/agent-context-claude.md` 업데이트
4. **Phase 2 준비**: `/speckit.tasks` 명령어로 task.md 생성
