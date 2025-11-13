# Quick Start Guide: 42ment ERP v0.1

**Date**: 2025-11-12
**Feature**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)

## Overview

본 문서는 42ment ERP v0.1 개발 환경 설정 및 실행 방법을 안내합니다. 개발자가 5분 안에 로컬 환경에서 앱을 실행할 수 있도록 구성되었습니다.

---

## Prerequisites

### Required Software

| 소프트웨어 | 버전 | 용도 | 설치 확인 |
|-----------|------|------|---------|
| **Python** | 3.11+ | 런타임 | `python --version` |
| **pip** | 최신 | 패키지 관리자 | `pip --version` |
| **Git** | 최신 | 버전 관리 | `git --version` |

### Optional Tools

| 도구 | 용도 |
|------|------|
| **VS Code** | 코드 에디터 (권장) |
| **SQLite Browser** | 데이터베이스 확인 |

---

## Installation Steps

### Step 1: Clone Repository

```bash
# Git clone (repository URL은 실제 URL로 교체)
git clone <repository-url>
cd 42ment-erp

# 또는 ZIP 다운로드 후 압축 해제
```

### Step 2: Create Virtual Environment

```bash
# Python 가상 환경 생성
python -m venv venv

# 가상 환경 활성화
# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

**확인**: 터미널에 `(venv)` 표시 확인

### Step 3: Install Dependencies

```bash
# 패키지 설치
pip install -r requirements.txt

# 설치 확인
pip list
```

**주요 패키지**:
- `streamlit>=1.28.0`
- `pandas>=2.0.0`
- `weasyprint>=60.0`
- `jsonschema>=4.0.0`
- `pytest>=7.0.0` (개발용)

### Step 4: Initialize Database

```bash
# 데이터베이스 초기화 스크립트 실행
python src/database/db.py --init

# 샘플 데이터 로드 (선택)
python src/database/db.py --load-sample-data
```

**결과 확인**:
- `data/42ment.db` 파일 생성
- `data/logs/` 디렉토리 생성

### Step 5: Run Application

```bash
# Streamlit 앱 실행
streamlit run src/main.py

# 또는 포트 지정
streamlit run src/main.py --server.port 8501
```

**결과**: 웹 브라우저에서 `http://localhost:8501` 자동 열림

---

## Project Structure

```
42ment-erp/
├── src/
│   ├── main.py                    # 🚀 Streamlit 앱 진입점
│   ├── database/
│   │   ├── db.py                  # 데이터베이스 초기화 및 연결
│   │   ├── schema.py              # 테이블 정의
│   │   └── migrations/
│   │       └── 001_initial_schema.sql
│   ├── models/                    # 데이터 모델 (CRUD)
│   │   ├── client.py
│   │   ├── project.py
│   │   ├── time_entry.py
│   │   ├── invoice.py
│   │   └── adjustment.py
│   ├── services/                  # 비즈니스 로직
│   │   ├── client_service.py
│   │   ├── project_service.py
│   │   ├── time_entry_service.py
│   │   ├── invoice_service.py
│   │   └── export_service.py
│   ├── ui/                        # UI 컴포넌트
│   │   ├── pages/
│   │   │   ├── 1_clients.py       # 고객 관리 페이지
│   │   │   ├── 2_projects.py      # 프로젝트 관리 페이지
│   │   │   ├── 3_time_entries.py  # 작업 시간 페이지
│   │   │   └── 4_invoices.py      # 청구서 페이지
│   │   └── components/
│   │       ├── forms.py
│   │       ├── tables.py
│   │       └── charts.py
│   ├── utils/                     # 유틸리티
│   │   ├── logger.py
│   │   ├── validators.py
│   │   └── formatters.py
│   └── templates/                 # PDF 템플릿
│       ├── invoice_template.html
│       └── fonts/
│           └── NanumGothic.ttf
├── data/
│   ├── 42ment.db                  # SQLite 데이터베이스
│   ├── exports/                   # CSV/JSON/PDF 내보내기
│   └── logs/                      # 애플리케이션 로그
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── config/
│   ├── config.yaml
│   └── .env.template
├── requirements.txt
├── setup.py
└── README.md
```

---

## First Run Checklist

### 1. Database Initialization

```bash
# 데이터베이스 상태 확인
python -c "import sqlite3; conn = sqlite3.connect('data/42ment.db'); print('Tables:', [row[0] for row in conn.execute('SELECT name FROM sqlite_master WHERE type=\"table\"').fetchall()])"
```

**예상 출력**:
```
Tables: ['schema_version', 'clients', 'projects', 'time_entries', 'invoices', 'adjustments']
```

### 2. Streamlit Configuration

`.streamlit/config.toml` 생성 (선택):

```toml
[server]
port = 8501
headless = false

[theme]
primaryColor = "#1f77b4"
backgroundColor = "#ffffff"
secondaryBackgroundColor = "#f0f2f6"
textColor = "#262730"
font = "sans serif"
```

### 3. Sample Data Verification

```bash
# 샘플 데이터 확인 (샘플 데이터 로드한 경우)
python -c "import sqlite3; conn = sqlite3.connect('data/42ment.db'); print('Clients:', conn.execute('SELECT COUNT(*) FROM clients').fetchone()[0])"
```

**예상 출력** (샘플 데이터 로드 시):
```
Clients: 3
```

---

## Common Commands

### Development

```bash
# 앱 실행 (개발 모드)
streamlit run src/main.py

# 테스트 실행
pytest tests/

# 테스트 커버리지
pytest --cov=src tests/

# 코드 스타일 검사
flake8 src/
```

### Database Management

```bash
# 데이터베이스 초기화
python src/database/db.py --init

# 샘플 데이터 로드
python src/database/db.py --load-sample-data

# 데이터베이스 백업
cp data/42ment.db data/backup_$(date +%Y%m%d_%H%M%S).db

# Windows
copy data\42ment.db data\backup_%date:~0,4%%date:~5,2%%date:~8,2%.db
```

### Data Export/Import

```bash
# CSV Export
python src/services/export_service.py --export-all --format csv

# JSON Export
python src/services/export_service.py --export-all --format json

# CSV Import
python src/services/export_service.py --import clients --file data/exports/clients.csv
```

---

## Troubleshooting

### Issue 1: ModuleNotFoundError

**증상**:
```
ModuleNotFoundError: No module named 'streamlit'
```

**해결**:
```bash
# 가상 환경 활성화 확인
# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

# 패키지 재설치
pip install -r requirements.txt
```

### Issue 2: Database Locked

**증상**:
```
sqlite3.OperationalError: database is locked
```

**해결**:
```bash
# 앱 종료 후 다시 시작
# 또는 데이터베이스 파일 잠금 해제
fuser -k data/42ment.db  # Linux
```

### Issue 3: Port Already in Use

**증상**:
```
OSError: [Errno 48] Address already in use
```

**해결**:
```bash
# 다른 포트로 실행
streamlit run src/main.py --server.port 8502

# 또는 기존 프로세스 종료
# Windows
netstat -ano | findstr :8501
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:8501 | xargs kill -9
```

### Issue 4: WeasyPrint Font Error

**증상**:
```
OSError: cannot load library 'gobject-2.0-0'
```

**해결** (Windows):
```bash
# GTK3 Runtime 설치
# https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer/releases
# 다운로드 후 설치

# 또는 ReportLab으로 대체 (requirements.txt 수정)
pip uninstall weasyprint
pip install reportlab
```

**해결** (macOS):
```bash
brew install python3 cairo pango gdk-pixbuf libffi
```

**해결** (Linux):
```bash
sudo apt-get install python3-dev python3-pip python3-cffi libcairo2 libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libffi-dev shared-mime-info
```

---

## Development Workflow

### 1. Feature Development

```bash
# 1. 새 기능 브랜치 생성
git checkout -b feature/client-search

# 2. 코드 작성
# src/services/client_service.py

# 3. 테스트 작성
# tests/unit/test_client_service.py

# 4. 테스트 실행
pytest tests/unit/test_client_service.py

# 5. 커밋
git add .
git commit -m "Add client search feature"

# 6. 푸시
git push origin feature/client-search
```

### 2. Testing Workflow

```bash
# 단위 테스트만 실행
pytest tests/unit/

# 통합 테스트만 실행
pytest tests/integration/

# 특정 파일 테스트
pytest tests/unit/test_client_service.py

# 상세 출력
pytest -v

# 실패 시 즉시 중단
pytest -x
```

### 3. Database Migration

```bash
# 1. 마이그레이션 파일 생성
# src/database/migrations/002_add_client_status.sql

# 2. 마이그레이션 적용
python src/database/db.py --migrate

# 3. 스키마 버전 확인
python -c "import sqlite3; conn = sqlite3.connect('data/42ment.db'); print(conn.execute('SELECT version FROM schema_version ORDER BY applied_at DESC LIMIT 1').fetchone()[0])"
```

---

## Configuration

### Environment Variables

`.env` 파일 생성 (`.env.template` 복사):

```bash
# Application
APP_NAME=42ment ERP
APP_VERSION=0.1.0
ENV=development

# Database
DB_PATH=data/42ment.db
DB_BACKUP_PATH=data/backups/

# Logging
LOG_LEVEL=INFO
LOG_PATH=data/logs/

# Export
EXPORT_PATH=data/exports/

# PDF
PDF_FONT_PATH=src/templates/fonts/NanumGothic.ttf
```

### Application Configuration

`config/config.yaml`:

```yaml
database:
  path: data/42ment.db
  timeout: 30
  check_same_thread: false

logging:
  level: INFO
  format: json
  path: data/logs/
  rotation: daily

export:
  path: data/exports/
  formats: [csv, json, pdf]

pdf:
  font_family: NanumGothic
  font_path: src/templates/fonts/NanumGothic.ttf
  page_size: A4
```

---

## Performance Tips

### 1. Database Indexing

```sql
-- 자주 조회되는 필드에 인덱스 추가
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_time_entries_date ON time_entries(date);
```

### 2. Streamlit Caching

```python
import streamlit as st

@st.cache_data
def load_clients():
    """Cache client list for 5 minutes"""
    return client_service.get_all_clients()
```

### 3. Batch Operations

```python
# Bad: 개별 INSERT
for entry in entries:
    time_entry_service.create_time_entry(...)

# Good: Batch INSERT
time_entry_service.create_time_entries_batch(entries)
```

---

## Next Steps

### After Setup

1. **데이터 입력**: 고객 1명, 프로젝트 1개, 작업 시간 기록 추가
2. **청구서 생성**: 작업 시간 기록을 기반으로 청구서 자동 생성 테스트
3. **PDF 내보내기**: 청구서 PDF 다운로드 확인
4. **변경 이력 확인**: 데이터 수정 후 Adjustment 테이블 확인

### Development Tasks

1. **Phase 2 시작**: `/speckit.tasks` 실행하여 구현 작업 목록 생성
2. **MVP 구현**: User Story 1 (고객 정보 관리) 구현
3. **테스트 작성**: 단위 테스트 및 통합 테스트 추가
4. **문서화**: README.md 업데이트

---

## Resources

### Documentation

- [spec.md](./spec.md) - 기능 명세
- [plan.md](./plan.md) - 구현 계획
- [research.md](./research.md) - 기술 조사
- [data-model.md](./data-model.md) - 데이터베이스 스키마
- [contracts/](./contracts/) - API 인터페이스 정의

### External Links

- [Streamlit Documentation](https://docs.streamlit.io/)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [WeasyPrint Documentation](https://doc.courtbouillon.org/weasyprint/)
- [Pandas Documentation](https://pandas.pydata.org/docs/)

---

## Support

### Getting Help

1. **문서 확인**: `specs/002-42ment-erp/` 디렉토리의 모든 문서 참고
2. **로그 확인**: `data/logs/` 디렉토리의 에러 로그 확인
3. **테스트 실행**: `pytest tests/ -v` 실행하여 문제 영역 파악

### Common Issues

- **데이터베이스 에러**: `data/42ment.db` 삭제 후 재초기화
- **의존성 에러**: `pip install -r requirements.txt --force-reinstall`
- **포트 충돌**: `--server.port` 옵션으로 다른 포트 사용

---

## Conclusion

이제 42ment ERP v0.1 개발 환경이 준비되었습니다!

**다음 단계**:
1. `/speckit.tasks` 실행하여 구현 작업 목록 생성
2. MVP (User Story 1) 구현 시작
3. 테스트 및 문서 작성

**Happy Coding!** 🚀
