# Technology Research: 42ment ERP v0.1

**Date**: 2025-11-12
**Feature**: [spec.md](./spec.md)
**Plan**: [plan.md](./plan.md)

## Overview

본 문서는 42ment ERP v0.1 개발에 앞서 수행한 기술 조사 및 의사결정 근거를 기록합니다. Brand Studio ERP Core System 개발 원칙을 준수하며, 로컬 우선, 데이터 투명성, Fail-safe 구조를 최우선으로 고려했습니다.

---

## 1. Streamlit 아키텍처 패턴

### 조사 내용

**Multi-page 구조**:
- Streamlit 1.28+는 `pages/` 디렉토리 기반 자동 페이지 라우팅 지원
- 각 `.py` 파일이 자동으로 사이드바 메뉴로 등록됨
- 파일명 앞에 숫자를 붙여 정렬 가능 (예: `1_clients.py`, `2_projects.py`)

**Session State 관리**:
```python
# 초기화
if 'current_client' not in st.session_state:
    st.session_state.current_client = None

# 읽기/쓰기
st.session_state.current_client = client_data
client = st.session_state.current_client
```

**권장 패턴**:
- UI 로직과 비즈니스 로직 분리 (UI → Service → Model)
- 상태는 최소화하고, 데이터베이스를 단일 진실의 원천으로 사용
- 폼 제출 후 즉시 `st.rerun()` 호출하여 화면 갱신

### 의사결정

✅ **선택**: Streamlit 1.28+ with multi-page structure

**근거**:
- Python만으로 웹 UI 구현 가능 (프론트엔드 기술 불필요)
- 빠른 프로토타이핑 및 반복 개발 가능
- 내장 폼 처리 및 상태 관리
- 단일 사용자 환경에 충분한 성능

**제약사항**:
- 복잡한 SPA(Single Page Application) 구현 어려움 → v0.1에서는 문제 없음
- 커스터마이징 제한적 → 기본 스타일로 충분
- 실시간 협업 불가 → 단일 사용자이므로 무관

**프로젝트 구조**:
```
src/
├── main.py                    # Entry point (Home)
├── ui/
│   ├── pages/
│   │   ├── 1_clients.py       # 고객 관리
│   │   ├── 2_projects.py      # 프로젝트 관리
│   │   ├── 3_time_entries.py  # 작업 시간 기록
│   │   └── 4_invoices.py      # 청구서 관리
│   └── components/
│       ├── forms.py           # 재사용 가능한 폼
│       ├── tables.py          # 데이터 테이블
│       └── charts.py          # 시각화
```

---

## 2. SQLite 스키마 설계 및 마이그레이션

### 조사 내용

**Foreign Key 제약 조건 활성화**:
```python
import sqlite3

conn = sqlite3.connect('data/42ment.db')
conn.execute("PRAGMA foreign_keys = ON;")
```
- SQLite는 기본적으로 FK가 비활성화되어 있음
- 연결 시마다 명시적으로 활성화 필요

**마이그레이션 도구 비교**:

| 도구 | 장점 | 단점 | 적합성 |
|------|------|------|--------|
| **Alembic** | 자동 마이그레이션 생성, 버전 관리 | 설정 복잡, 오버헤드 큼 | v1.0+ 고려 |
| **수동 SQL 스크립트** | 단순, 명시적 제어, 학습 곡선 낮음 | 자동화 부족 | ✅ v0.1 선택 |
| **SQLAlchemy + Alembic** | ORM + 마이그레이션 통합 | 복잡성 증가 | 불필요 |

**공통 필드 규약** (Brand Studio ERP 원칙):
```sql
-- 모든 테이블에 공통 적용
id INTEGER PRIMARY KEY AUTOINCREMENT,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
created_by TEXT DEFAULT 'system',
manual_edit TEXT DEFAULT 'N',  -- Y/N
source TEXT DEFAULT 'manual',   -- manual/import/api
notes TEXT
```

### 의사결정

✅ **선택**: SQLite + 수동 SQL 마이그레이션 스크립트 (v0.1)

**근거**:
1. **단순성**: v0.1은 초기 스키마가 단순하며, Alembic 오버헤드 불필요
2. **명시적 제어**: SQL 스크립트로 모든 변경 사항을 명확히 추적 가능
3. **이식성**: 파일 하나로 백업/복원 가능 (`.db` 파일)
4. **확장 경로**: 향후 v1.0에서 Alembic 전환 가능

**마이그레이션 전략**:
```
src/database/migrations/
├── 001_initial_schema.sql      # 초기 스키마
├── 002_add_adjustment_table.sql
└── 003_add_invoice_fields.sql
```

**스키마 버전 관리**:
```sql
CREATE TABLE schema_version (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

INSERT INTO schema_version (version, description)
VALUES ('1.0.0', 'Initial schema with Client, Project, TimeEntry, Invoice, Adjustment');
```

**향후 전환 시점**: 테이블 수 > 10개 또는 마이그레이션 > 20회 시 Alembic 도입 검토

---

## 3. PDF 생성 라이브러리 비교

### 조사 내용

**라이브러리 비교**:

| 라이브러리 | 방식 | 한글 지원 | 템플릿 | 유지보수 | 라이센스 |
|-----------|------|----------|--------|---------|---------|
| **WeasyPrint** | HTML/CSS | ✅ 우수 | HTML 템플릿 | 활발 | BSD |
| **ReportLab** | Python 코드 | ✅ 가능 | 코드 기반 | 활발 | BSD |
| **xhtml2pdf** | HTML/CSS | ⚠️ 제한적 | HTML 템플릿 | 정체 | Apache 2.0 |
| **FPDF** | Python 코드 | ⚠️ 제한적 | 코드 기반 | 정체 | LGPL |

**WeasyPrint 예시**:
```python
from weasyprint import HTML

html_content = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @font-face {
            font-family: 'NanumGothic';
            src: url('NanumGothic.ttf');
        }
        body { font-family: 'NanumGothic', sans-serif; }
        .invoice-header { font-size: 24px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="invoice-header">청구서</div>
    <p>고객명: {{ client_name }}</p>
    <p>청구 금액: {{ total }}원</p>
</body>
</html>
"""

HTML(string=html_content).write_pdf('invoice.pdf')
```

**ReportLab 예시**:
```python
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

pdfmetrics.registerFont(TTFont('NanumGothic', 'NanumGothic.ttf'))

c = canvas.Canvas("invoice.pdf", pagesize=A4)
c.setFont('NanumGothic', 24)
c.drawString(100, 800, "청구서")
c.setFont('NanumGothic', 12)
c.drawString(100, 770, f"고객명: {client_name}")
c.save()
```

### 의사결정

✅ **선택**: WeasyPrint

**근거**:
1. **템플릿 기반**: HTML/CSS로 디자인 유연성 확보 (디자이너 협업 가능)
2. **한글 지원**: TTF 폰트 등록만으로 완벽 지원
3. **유지보수**: 2024년까지 활발히 업데이트 중
4. **라이센스**: BSD 라이센스로 상업적 사용 자유로움
5. **Brand Studio 원칙**: 템플릿 파일을 버전 관리하여 변경 이력 추적 가능

**대안 (ReportLab)**: 코드 기반 PDF 생성이 필요한 경우 사용 가능하지만, v0.1에서는 템플릿 기반이 더 적합

**템플릿 구조**:
```
src/templates/
├── invoice_template.html      # 청구서 템플릿
└── fonts/
    └── NanumGothic.ttf        # 한글 폰트
```

**Fallback 전략** (Fail-safe 원칙):
```python
try:
    HTML(string=html_content).write_pdf(output_path)
except Exception as e:
    logger.error(f"PDF generation failed: {e}")
    # Fallback: 텍스트 파일로 저장
    with open(output_path.replace('.pdf', '.txt'), 'w', encoding='utf-8') as f:
        f.write(plain_text_invoice)
```

---

## 4. 데이터 Export/Import 패턴

### 조사 내용

**Pandas를 활용한 CSV/JSON 변환**:

```python
import pandas as pd
import sqlite3

# Export
conn = sqlite3.connect('data/42ment.db')
df = pd.read_sql_query("SELECT * FROM clients", conn)
df.to_csv('exports/clients.csv', index=False, encoding='utf-8-sig')
df.to_json('exports/clients.json', orient='records', force_ascii=False, indent=2)

# Import
df = pd.read_csv('imports/clients.csv', encoding='utf-8-sig')
df.to_sql('clients', conn, if_exists='append', index=False)
```

**스키마 검증 패턴**:
```python
from typing import List, Dict, Any
import jsonschema

CLIENT_SCHEMA = {
    "type": "object",
    "required": ["name", "email", "phone"],
    "properties": {
        "name": {"type": "string", "minLength": 1},
        "email": {"type": "string", "format": "email"},
        "phone": {"type": "string", "pattern": "^[0-9-]+$"},
        "notes": {"type": "string"}
    }
}

def validate_import_data(data: List[Dict[str, Any]], schema: dict) -> List[str]:
    """Returns list of validation errors, empty if valid"""
    errors = []
    for i, record in enumerate(data):
        try:
            jsonschema.validate(record, schema)
        except jsonschema.ValidationError as e:
            errors.append(f"Row {i+1}: {e.message}")
    return errors
```

**에러 처리 패턴**:
```python
def import_csv(file_path: str, table_name: str) -> dict:
    """
    Returns: {
        'success': bool,
        'imported_count': int,
        'failed_count': int,
        'errors': List[str]
    }
    """
    try:
        df = pd.read_csv(file_path, encoding='utf-8-sig')

        # 스키마 검증
        errors = validate_import_data(df.to_dict('records'), SCHEMA_MAP[table_name])
        if errors:
            return {'success': False, 'errors': errors}

        # 데이터베이스 삽입 (트랜잭션)
        conn = sqlite3.connect('data/42ment.db')
        imported_count = 0
        failed_count = 0

        for record in df.to_dict('records'):
            try:
                # INSERT 실행
                imported_count += 1
            except Exception as e:
                failed_count += 1
                errors.append(f"Record {record.get('name', 'unknown')}: {str(e)}")

        conn.commit()
        return {
            'success': True,
            'imported_count': imported_count,
            'failed_count': failed_count,
            'errors': errors
        }
    except Exception as e:
        return {'success': False, 'errors': [str(e)]}
```

### 의사결정

✅ **선택**: Pandas + jsonschema 기반 Export/Import

**근거**:
1. **Pandas**: CSV/JSON 변환이 간단하고, 대용량 데이터 처리 가능
2. **jsonschema**: 표준 검증 라이브러리로 스키마 버전 관리 가능
3. **Brand Studio 원칙**:
   - **직접성**: CSV/JSON만 허용하여 이식성 확보
   - **투명성**: Import 시 모든 변경 사항을 Adjustment 테이블에 기록
   - **Fail-safe**: 검증 실패 시 부분 Import 지원 (성공한 레코드만 반영)

**Export 전략**:
- 모든 테이블을 개별 CSV/JSON 파일로 Export
- 날짜별 폴더 생성 (`exports/2025-11-12/`)
- Adjustment 테이블도 함께 Export (이력 보존)

**Import 전략**:
- 스키마 검증 → 트랜잭션 → Adjustment 기록 순서 보장
- 중복 데이터 처리: `email` 등 unique 필드로 update/insert 선택
- Rollback 지원: Import 실패 시 전체 트랜잭션 취소

**스키마 파일 관리**:
```
src/schemas/
├── client_schema.json
├── project_schema.json
├── time_entry_schema.json
└── invoice_schema.json
```

---

## 5. Audit Log 구현 패턴

### 조사 내용

**SQLite Trigger vs Application-level Logging**:

| 방식 | 장점 | 단점 | 적합성 |
|------|------|------|--------|
| **SQLite Trigger** | 자동 기록, DB 수준 보장 | 디버깅 어려움, 유연성 낮음 | ⚠️ 복잡성 증가 |
| **Application-level** | 명시적 제어, 테스트 용이, 유연성 | 누락 가능성 | ✅ v0.1 선택 |

**Application-level Adjustment 테이블**:
```sql
CREATE TABLE adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ref_type TEXT NOT NULL,           -- 'client', 'project', 'time_entry', 'invoice'
    ref_id INTEGER NOT NULL,          -- 참조 엔티티의 ID
    field_name TEXT NOT NULL,         -- 변경된 필드명
    old_value TEXT,                   -- 이전 값 (JSON 직렬화)
    new_value TEXT,                   -- 새 값 (JSON 직렬화)
    reason TEXT,                      -- 변경 사유
    adjusted_by TEXT NOT NULL,        -- 'system', 'user', 'import'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'system',
    manual_edit TEXT DEFAULT 'N',
    source TEXT DEFAULT 'manual',
    notes TEXT
);

CREATE INDEX idx_adjustments_ref ON adjustments(ref_type, ref_id);
CREATE INDEX idx_adjustments_created_at ON adjustments(created_at);
```

**Service Layer 패턴**:
```python
from typing import Optional
import json

class AdjustmentService:
    def log_change(
        self,
        ref_type: str,
        ref_id: int,
        field_name: str,
        old_value: any,
        new_value: any,
        reason: str,
        adjusted_by: str = 'user'
    ):
        """Log a single field change to Adjustment table"""
        conn = sqlite3.connect('data/42ment.db')
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO adjustments
            (ref_type, ref_id, field_name, old_value, new_value, reason, adjusted_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            ref_type,
            ref_id,
            field_name,
            json.dumps(old_value, ensure_ascii=False),
            json.dumps(new_value, ensure_ascii=False),
            reason,
            adjusted_by
        ))

        conn.commit()
        conn.close()

class ClientService:
    def update_client(self, client_id: int, updates: dict, reason: str):
        """Update client and log all changes"""
        # 1. 기존 데이터 조회
        old_client = self.get_client(client_id)

        # 2. 변경 사항 적용
        conn = sqlite3.connect('data/42ment.db')
        cursor = conn.cursor()

        for field, new_value in updates.items():
            old_value = getattr(old_client, field)

            # 3. 각 필드 변경 기록
            if old_value != new_value:
                AdjustmentService().log_change(
                    ref_type='client',
                    ref_id=client_id,
                    field_name=field,
                    old_value=old_value,
                    new_value=new_value,
                    reason=reason,
                    adjusted_by='user'
                )

        # 4. 실제 업데이트
        cursor.execute("""
            UPDATE clients
            SET name=?, email=?, phone=?, updated_at=CURRENT_TIMESTAMP, manual_edit='Y'
            WHERE id=?
        """, (updates['name'], updates['email'], updates['phone'], client_id))

        conn.commit()
        conn.close()
```

### 의사결정

✅ **선택**: Application-level Adjustment 테이블

**근거**:
1. **투명성 (Brand Studio 원칙)**: 모든 변경이 명시적으로 기록됨
2. **유연성**: 변경 사유, 변경자 정보를 함께 기록 가능
3. **테스트 용이성**: Service Layer에서 Adjustment 생성을 명시적으로 테스트 가능
4. **디버깅**: 로그를 쉽게 조회하고 분석 가능
5. **Fail-safe**: Application 로직이 실패해도 데이터는 보존됨

**Trigger가 적합한 경우** (향후 고려):
- 데이터 변경이 여러 경로에서 발생할 때 (다중 사용자, API, batch job 등)
- v1.0 이후 고려

**이력 조회 패턴**:
```python
def get_change_history(ref_type: str, ref_id: int) -> List[dict]:
    """Get full change history for an entity"""
    conn = sqlite3.connect('data/42ment.db')
    cursor = conn.cursor()

    cursor.execute("""
        SELECT field_name, old_value, new_value, reason, adjusted_by, created_at
        FROM adjustments
        WHERE ref_type = ? AND ref_id = ?
        ORDER BY created_at DESC
    """, (ref_type, ref_id))

    return [
        {
            'field': row[0],
            'old': json.loads(row[1]),
            'new': json.loads(row[2]),
            'reason': row[3],
            'by': row[4],
            'at': row[5]
        }
        for row in cursor.fetchall()
    ]
```

---

## Summary of Decisions

| 영역 | 선택 | 대안 | 향후 전환 시점 |
|------|------|------|---------------|
| **UI Framework** | Streamlit 1.28+ | React, Vue | 복잡한 SPA 필요 시 (v2.0+) |
| **Database** | SQLite | PostgreSQL | 동시 사용자 > 1 또는 데이터 > 1GB |
| **Migration Tool** | 수동 SQL 스크립트 | Alembic | 테이블 > 10개 또는 마이그레이션 > 20회 |
| **PDF Library** | WeasyPrint | ReportLab | 코드 기반 생성 필요 시 |
| **Export/Import** | Pandas + jsonschema | Custom parser | 성능 문제 발생 시 (>10,000 레코드) |
| **Audit Log** | Application-level | SQLite Trigger | 다중 사용자 환경 전환 시 |

---

## Risk Analysis

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Streamlit 성능 부족 | Low | Medium | 인덱스 최적화, 필요시 React 전환 |
| SQLite 동시 접속 제한 | Low | Low | 단일 사용자이므로 무관 |
| WeasyPrint 한글 폰트 오류 | Medium | Low | Fallback: 텍스트 파일 출력 |
| 데이터 손실 | Low | High | 자동 백업 스크립트 (일단위) |
| Adjustment 테이블 누락 | Medium | High | Service Layer에서 강제 호출 + 단위 테스트 |

---

## Next Phase

✅ **Phase 0 완료** → Phase 1 시작:
1. `data-model.md` 작성 (SQLite 스키마 DDL 정의)
2. `contracts/streamlit_api.md` 작성 (UI ↔ Service 인터페이스)
3. `quickstart.md` 작성 (개발자 온보딩 가이드)

**연관 문서**:
- [spec.md](./spec.md) - 기능 명세
- [plan.md](./plan.md) - 구현 계획
- [checklists/requirements.md](./checklists/requirements.md) - 요구사항 체크리스트
