# 신규 프로젝트 구조 설계 (naver_seo_autom_0.5_by_codex)

## 목표
- Collector / Analyzer / Improver / Generator 4단계를 단일 스키마(schema.json)로 연결
- 클라이언트별 I/O 디렉토리와 산출물 경로 표준화

## 디렉토리 구조
- `src/collector/` 수집기(Puppeteer 스텁 + NAP 불일치 탐지 + 택소노미 태깅 준비)
- `src/analyzer/` 분석기(키워드 매핑, R/P/T = unknown, 결측/오류 탐지)
- `src/improver/` 개선기(키워드 제안, 소개문, 4주 캘린더, 리뷰 템플릿, 비주얼 제안)
- `src/generator/` 생성기(Guidebook.md, Deploy_Checklist.md, audit_report.json)
- `src/utils/` 공용 유틸(logger, retry, CircuitBreaker)
- `shared/schema.json` 공통 스키마(JSON Schema)
- `shared/keyword_meta_taxonomy.yaml` 택소노미(기준 맵)
- `clients/{brand}/` 브랜드별 입출력
  - `intake.json`(입력) → `collector.json` → `analysis.json` → `improved.json`
  - `inputs/`, `outputs/` 산출/부가자료
- `docs/refactoring/` 단계별 문서

## I/O 규칙
- 모든 단계는 `shared/schema.json` 구조를 준수
- 불명확/검증불가한 산식은 “unknown”으로 기록
- 불일치/결측 탐지 시 `analysis.*`에 기록하고 개선안 제시

## 실행 시나리오(샘플)
- `npm run collector` → `npm run analyzer` → `npm run improver` → `npm run generator`

