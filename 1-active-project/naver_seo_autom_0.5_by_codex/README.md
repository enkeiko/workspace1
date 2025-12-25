# naver_seo_autom_0.5_by_codex

통합 파이프라인(Collector → Analyzer → Improver → Generator)을 단일 스키마로 연결한 네이버 플레이스 SEO 자동화 v0.5.

## 구조
- `src/collector` 수집 (NAP 불일치 탐지, 택소노미 태깅 준비)
- `src/analyzer` 분석 (키워드 매핑 스텁, R/P/T = unknown, 결측 탐지)
- `src/improver` 개선 (키워드 제안, 소개문, 4주 캘린더, 리뷰 템플릿, 비주얼/ NAP 보정 제안)
- `src/generator` 생성 (Guidebook.md, Deploy_Checklist.md, audit_report.json)
- `shared/schema.json` 공용 스키마
- `shared/keyword_meta_taxonomy.yaml` 메타 택소노미 (파싱 실패 시 무시)
- `clients/{brand}` I/O 디렉토리 (intake.json → collector.json → analysis.json → improved.json → outputs)

## 빠른 시작
```powershell
cd naver_seo_autom_0.5_by_codex
$env:PUPPETEER_SKIP_DOWNLOAD='1'; npm install

# 모의 수집 포함 전체 파이프라인
npm run pipeline:mock

# 실제 수집(Chromium 필요)
npm run pipeline
```

## 스키마 검증
```powershell
npm run validate
```

## 문서
- `docs/refactoring/*.md` 단계별 리팩터링 기록

