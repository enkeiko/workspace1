# Quick Start (KR/EN)

## 설치 (Installation)

1) Python 3.11 설치
2) 의존성 설치

```bash
pip install -r requirements.txt
```

## 사용법 (Usage)

### L1: 데이터 수집 및 완성도 (Data & Completeness)

```bash
python -m src.cli.main l1 --store-id STORE123 --out l1.json
```
- 선택: `--input path/to/mock_store.json` (로컬 mock 데이터 사용)

### L2: 키워드 후보 생성 (Keyword Candidates)

```bash
python -m src.cli.main l2 --input l1.json --out l2.json
```

### L3: 최종 전략 생성 (Final Strategy)

```bash
python -m src.cli.main l3 --input l2.json --out strategy.json
```

## 참고 (Notes)

- v1은 Mock 모드로 동작하여 네이버 API 호출이 없습니다.
- 출력은 JSON 파일로 생성되며, 각 단계는 독립적으로 실행 가능합니다.

