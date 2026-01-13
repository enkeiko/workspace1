# 42ment ERP v0.1

프리랜서를 위한 경량 프로젝트 관리 시스템

## Overview

42ment ERP는 프리랜서가 고객 관리, 프로젝트 일정 추적, 작업 시간 기록, 자동 청구서 생성을 간단하게 수행할 수 있도록 돕는 로컬 우선 애플리케이션입니다.

### 핵심 기능

- **고객 정보 관리**: 고객 등록, 조회, 수정 및 변경 이력 추적
- **프로젝트 관리**: 프로젝트 생성, 상태 관리, 필터링
- **작업 시간 기록**: 프로젝트별 작업 시간 기록 및 누적 시간 조회
- **자동 청구서 생성**: 작업 시간 기반 청구서 자동 생성 및 PDF 출력

### 핵심 가치

- **데이터 투명성**: 모든 데이터 변경의 완전한 이력 추적 (Adjustment 테이블)
- **직접성**: 외부 SaaS 의존 없이 로컬에서 모든 데이터 관리
- **이식성**: CSV/JSON 기반 데이터 내보내기/가져오기
- **Fail-safe**: 자동화 실패 시 항상 수동 입력 경로 제공

## Tech Stack

- **Language**: Python 3.11+
- **UI Framework**: Streamlit 1.28+
- **Database**: SQLite (로컬 파일 기반)
- **PDF Generation**: WeasyPrint
- **Data Processing**: Pandas
- **Testing**: pytest

## Quick Start

### Prerequisites

- Python 3.11 or higher
- pip (Python package manager)

### Installation

```bash
# Clone repository
git clone <repository-url>
cd 42ment-erp

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Initialize database
python src/database/db.py --init

# (Optional) Load sample data
python src/database/db.py --load-sample-data
```

### Run Application

```bash
# Start Streamlit app
streamlit run src/main.py

# Or specify custom port
streamlit run src/main.py --server.port 8501
```

The application will open automatically in your web browser at `http://localhost:8501`

## Project Structure

```
42ment-erp/
├── src/
│   ├── main.py              # Streamlit app entry point
│   ├── database/            # Database layer
│   │   ├── db.py           # Connection & initialization
│   │   ├── schema.py       # Table definitions
│   │   └── migrations/     # Schema migration scripts
│   ├── models/              # Data models (CRUD)
│   │   ├── client.py
│   │   ├── project.py
│   │   ├── time_entry.py
│   │   ├── invoice.py
│   │   └── adjustment.py
│   ├── services/            # Business logic
│   │   ├── client_service.py
│   │   ├── project_service.py
│   │   ├── time_entry_service.py
│   │   ├── invoice_service.py
│   │   └── export_service.py
│   ├── ui/                  # UI components
│   │   ├── pages/          # Streamlit pages
│   │   └── components/     # Reusable components
│   ├── utils/               # Utilities
│   │   ├── logger.py
│   │   ├── validators.py
│   │   └── formatters.py
│   └── templates/           # PDF templates
│       └── fonts/
├── data/
│   ├── 42ment.db           # SQLite database (generated)
│   ├── exports/            # CSV/JSON/PDF exports
│   ├── logs/               # Application logs
│   └── backups/            # Database backups
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── config/
│   ├── config.yaml
│   └── .env.template
├── requirements.txt
└── README.md
```

## Development

### Testing

```bash
# Run all tests
pytest tests/

# Run with coverage
pytest --cov=src tests/

# Run specific test file
pytest tests/unit/test_client_service.py
```

### Database Management

```bash
# Initialize database
python src/database/db.py --init

# Load sample data
python src/database/db.py --load-sample-data

# Backup database
cp data/42ment.db data/backups/backup_$(date +%Y%m%d).db
```

## Data Export/Import

### Export

```bash
# Export all data to CSV
python src/services/export_service.py --export-all --format csv

# Export to JSON
python src/services/export_service.py --export-all --format json
```

### Import

```bash
# Import from CSV
python src/services/export_service.py --import clients --file data/exports/clients.csv
```

## Brand Studio ERP Principles

본 시스템은 다음 개발 원칙을 따릅니다:

1. **직접성 (Direct Control)**: 외부 SaaS 의존 금지, 모든 핵심 로직은 내부 코드
2. **투명성 (Traceability)**: 모든 데이터 변경 이력 추적 (Adjustment 테이블)
3. **일관성 (Consistency)**: 모든 엔티티에 공통 필드 규약 적용
4. **단일 진실의 원천 (Single Source of Truth)**: Client, Project, TimeEntry, Invoice, Adjustment가 핵심 엔티티
5. **Fail-safe 구조**: 자동화 실패 시 항상 수동 입력 경로 제공
6. **사람 우선 (Human-First)**: 사람이 AI보다 우선, 수동 수정이 항상 가능

## Documentation

- [Specification](../specs/002-42ment-erp/spec.md) - 기능 명세
- [Implementation Plan](../specs/002-42ment-erp/plan.md) - 구현 계획
- [Data Model](../specs/002-42ment-erp/data-model.md) - 데이터베이스 스키마
- [Contracts](../specs/002-42ment-erp/contracts/) - API 인터페이스
- [Quick Start Guide](../specs/002-42ment-erp/quickstart.md) - 개발자 가이드
- [Tasks](../specs/002-42ment-erp/tasks.md) - 구현 작업 목록

## License

(Add your license here)

## Contributing

(Add contribution guidelines here)

## Support

For issues and questions, please refer to the documentation in `specs/002-42ment-erp/`.
