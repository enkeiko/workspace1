# 42ment ERP v0.1 - Quick Start Guide

## 빠른 시작 (5분 안에)

### 1단계: 의존성 설치
```bash
pip install -r requirements.txt
```

만약 WeasyPrint 설치에 문제가 있다면, 일단 제외하고 설치:
```bash
pip install streamlit>=1.28.0 pandas>=2.0.0
```

### 2단계: 데이터베이스 초기화 및 샘플 데이터 로드
```bash
python run.py --init --sample
```

출력 예시:
```
Initializing database...
[OK] Database initialized successfully
Loading sample data...
[OK] Sample data loaded successfully
```

### 3단계: 애플리케이션 실행
```bash
streamlit run src/main.py
```

### 4단계: 브라우저에서 확인
자동으로 브라우저가 열립니다. 안 열리면:
```
http://localhost:8501
```

## 샘플 데이터 확인

애플리케이션이 시작되면 다음 데이터가 이미 들어있습니다:

### 고객 (Clients)
- 김철수 (kim@example.com)
- 이영희 (lee@example.com)
- 박민수 (park@example.com)

### 프로젝트 (Projects)
- 웹사이트 리뉴얼 (김철수)
- 모바일 앱 개발 (이영희)

### 시간 기록 (Time Entries)
- 3개의 샘플 작업 시간 기록

### 인보이스 (Invoices)
- 2개의 샘플 인보이스

## 주요 기능 테스트

### 1. 고객 관리
1. 사이드바에서 "👥 고객 관리" 클릭
2. "목록" 탭에서 기존 고객 확인
3. "추가" 탭에서 새 고객 등록
4. "수정" 탭에서 고객 정보 수정
5. "변경 이력" 탭에서 변경 내역 확인

### 2. 프로젝트 관리
1. "📁 프로젝트 관리" 페이지로 이동
2. 프로젝트 상태별 필터링
3. 새 프로젝트 생성
4. 프로젝트 통계 확인

### 3. 시간 추적
1. "⏱️ 작업 시간 관리" 페이지로 이동
2. 새 작업 시간 기록
3. 청구 가능/불가 구분
4. 기간별 통계 확인

### 4. 인보이스 생성
1. "📄 인보이스 관리" 페이지로 이동
2. 프로젝트 선택
3. 작업 시간 기반 자동 계산
4. 인보이스 생성

## 데이터베이스 위치

```
42ment-erp/data/42ment.db
```

데이터베이스를 초기화하려면:
```bash
python run.py --force --sample
```

## 로그 파일 위치

```
42ment-erp/data/logs/app_YYYYMMDD.log
```

## 문제 해결

### 데이터베이스 오류
```bash
python run.py --force --sample
```

### 모듈을 찾을 수 없음
```bash
pip install -r requirements.txt
```

### Streamlit 실행 안됨
```bash
python -m streamlit run src/main.py
```

### 한글 깨짐
Windows 환경에서는 콘솔 인코딩 설정:
```bash
chcp 65001
streamlit run src/main.py
```

## 다음 단계

1. ✅ 샘플 데이터로 기능 테스트
2. ✅ 실제 고객/프로젝트 데이터 입력
3. ✅ 작업 시간 기록 습관화
4. ✅ 정기적으로 인보이스 생성

## 지원

문제가 있거나 개선 제안이 있으면:
- README.md 참조
- IMPLEMENTATION_SUMMARY.md 참조
