# Naver Place SEO 자동화 v2 기획서 (Guidebook v1.1 + Taxonomy 통합)

## Executive Summary
- 목적: Naver Place 데이터 수집→분석→개선→산출 4단계를 단일 스키마로 표준화하여, 사실 기반(검증 가능) 개선안을 자동 생성하고 배포 가이드를 제공한다.
- 범위: Collector/Analyzer/Improver/Generator 파이프라인, 공통 스키마, 택소노미(C‑Sys: core/region/attributes+meta) 매핑, GUI/CLI, 검증 및 문서.
- 원칙: 랭킹/가중치 등 비공개 요소는 “unknown”으로 명시. 모든 계산은 재현 가능성과 근거 기록을 우선.

## Objectives & Success Criteria
- Objectives
  - O1: 파이프라인 4단계 통합 및 공통 스키마 적용
  - O2: C‑Sys 기반 키워드 매핑(근거/확신도 기록)과 NAP 불일치 탐지
  - O3: Guidebook 규칙에 따른 Intro/News/Visual 자동 제안
  - O4: 산출물(Guidebook.md, Deploy_Checklist.md, audit_report.json) 생성과 스키마 검증
- Success Criteria (측정 가능)
  - S1: MOCK 모드 End‑to‑End 100% 성공 + 스키마 검증 OK
  - S2: 실수집 모드에서 최소 필드(상호/주소/전화) 확보 및 NAP 검증 성공
  - S3: keywords.details에 근거(rule, source, text)와 확신도(confidence) 기록
  - S4: Guidebook 규칙(분량/구조/금지어) 준수 여부 체크리스트 패스

## Scope
- In: 파이프라인 4단계, 스키마/택소노미, GUI/CLI, 스키마 검증, 문서화, 오프라인 입력 대체 경로
- Out: 비공개 랭킹 역공학, 계정 자동 로그인/설정 변경, 경쟁사 자동 크롤링, 유료 배포 인프라

## User Scenarios
- US1 수집·완성도 파악(P1): Place ID 입력→수집→정규화→필수필드/결측 확인
- US2 키워드 매핑(P1): 카테고리/주소/메뉴/리뷰 토큰→C‑Sys 매핑→근거/확신도 기록
- US3 개선안 생성(P2): Intro/News/Visual 제안(Guidebook 규칙 준수, 과장/추정 금지)
- US4 산출/검증(P2): Guidebook.md/Checklist/audit JSON 출력 + Ajv 스키마 검증
- US5 GUI 실행(P2): 폼 입력→모의/실수집 실행→로그/산출물 링크 확인

## Functional Requirements (FR)
- FR‑001 Collector: Naver Place 페이지 접근, 차단 시 재시도/회로차단, 오프라인 대체(raw.json/page.html)
- FR‑002 NAP: intake vs collected 상호/주소/전화 비교 및 mismatch 리포트
- FR‑003 Parser/Normalizer: 이름/주소/카테고리/메뉴/사진/리뷰 정규화(결측 허용/빈배열)
- FR‑004 Taxonomy Normalize: keyword_meta_taxonomy.yaml → normalized.json 파싱 파이프라인
- FR‑005 Mapping(C‑Sys): core/region/attributes 매핑 + keywords.details(evidence, confidence)
- FR‑006 Metrics: relevance/popularity/trust = “unknown”, basis[] 비워서 내보냄
- FR‑007 Improver: 키워드 제안, Intro/News/Visual(Guidebook 규칙) + NAP 보정 제안
- FR‑008 Generator: Guidebook.md, Deploy_Checklist.md, audit_report.json 생성
- FR‑009 Schema Validation: Ajv(2020)로 collector/analysis/improved 검증
- FR‑010 GUI: in‑process 실행(자식 프로세스/파일리스 스폰 금지), /run API 제공
- FR‑011 Logging: 단계별 info/warn/error 로그, 콘솔/파일 선택(파일은 선택)
- FR‑012 Config: 실행 브라우저 경로/헤드리스/지연 등 환경변수/설정으로 주입

## Non‑Functional Requirements (NFR)
- NFR‑001 재현성: 모든 산출물에 schema_version/생성시각 기록, provenance 단계별 정보 포함
- NFR‑002 안전성: DOM 의존 최소화(네트워크 응답/오프라인 대체), 차단 시 우회전략
- NFR‑003 법/정책: 비공개 랭킹 역공학·과장 문구·추정 서술 금지, 사실 기반만 출력
- NFR‑004 성능: 단건 < 10s(모의), 배치 병렬 옵션은 추후, 메모리 512MB 내 권장
- NFR‑005 이식성: Windows 우선, 로컬 Chrome/Edge 지정으로 보안 솔루션 호환

## Data & Schema
- schema.json(공통)
  - meta, client(brand/place_id/business{address/category/web/ops}), keywords{core/region/attributes, details}, assets{photos/menus}, analysis{issues/missing/nap_mismatch, r/p/t}, improvements{intro/news/review/visual/nap_corrections}, provenance
- I/O 규칙
  - Collector: intake.json+place_id → collector.json
  - Analyzer: intake+collector → analysis.json
  - Improver: intake+collector+analysis → improved.json
  - Generator: Guidebook.md, Deploy_Checklist.md, audit_report.json

## Taxonomy & Mapping (C‑Sys)
- 입력: keyword_meta_taxonomy.yaml(혼합 포맷) → normalized.json 추출(YAML 코드블록/키:값)
- 인덱스: facet(core/region/attributes)별 surface→canonical 맵, 동의어/정규형 처리
- 규칙 레이어
  - L1 정확 일치(surface/canonical)
  - L2 정규화 포함/접두/접미 + 동의어
  - L3 패턴/정규식(선택), L4 편집거리(선택)
  - 제약 필터(카테고리/행정계층), 중복/충돌 해소
- 근거/확신도: keywords.details[{facet, canonical, confidence, evidence{rule,source,text}}]

## Guidebook Rules 적용(요지)
- Intro: 1,200~2,000자, 브랜드→서비스→이용→위치→후기/마무리, 과장/추정 금지, 주요 키워드 자연 삽입
- News: 주2회, 감성/시즌 주제, 문장형 키워드, 사실(메뉴/가격) 기반
- Visual: 메뉴/실내/조리/가격표/비교컷, 파일명 규칙(지역_메뉴_속성_번호.jpg), 중복/저해상 금지
- 리뷰: 자가작성 금지, 자연언어 가이드, SLA 24~48h 대응

## System Architecture
- CLI: scripts/run-all.js, scripts/validate.js, scripts/normalize-taxonomy.js
- GUI: express + in‑process pipeline(/run), STATIC /clients 노출, /health
- Collector: Puppeteer(로컬 브라우저 경로 지원) + 오프라인 대체(raw.json/page.html)
- Analyzer: TaxonomyIndex + KeywordMapper + issues/missing
- Improver: 제안(키워드/Intro/News/Review/Visual/nap_corrections)
- Generator: Guidebook/Checklist/audit

## API (GUI)
- POST /run: {brand, place, name, phone, address, category, mock}
  - 동작: intake.json 저장 → 4단계 실행 → {ok, outputs}
- GET /clients/{brand}/outputs/*: 산출물 정적 제공
- GET /health: {ok:true}

## Risks & Mitigations
- R1 DOM 변경/차단 → 네트워크 응답 파싱·오프라인 대체·로컬 브라우저 지정
- R2 택소노미 원본 혼합 → 정규화 파이프라인 유지, 순수 YAML 제공 시 품질 향상
- R3 보안(Fileless 차단) → 자식 프로세스 최소화, in‑process 실행/배치 스크립트 제공
- R4 콘솔 한글 깨짐 → 파일 UTF‑8 저장, 브라우저/산출물로 확인

## Milestones & Deliverables
- M1 스키마/파이프라인 스캐폴드 + MOCK E2E + 검증(완료)
- M2 Collector 안정화(응답 파싱/오프라인 대체) + GUI in‑process (완료)
- M3 Mapping 고도화(keywords.details) (완료)
- M4 Guidebook 규칙 반영 생성물 품질 보강(진행)
- 산출: schema.json, collector.json/analysis.json/improved.json, Guidebook.md, Deploy_Checklist.md, audit_report.json, 리팩터링/QA 문서

## Acceptance Criteria
- AC1 /run(mock) 한 번으로 산출물 3종 생성 + 스키마 검증 OK
- AC2 collector: NAP mismatch 탐지 기록, 실패 시 오프라인 대체 작동
- AC3 analyzer: keywords.details에 최소 3건 이상 evidence 기록 가능
- AC4 generator: Guidebook 규칙 점검표 패스(분량/구조/금지어)

## Appendix
- Guidebook: 1-planning/docs/architecture/251113_Guidebook_v1.1_full.md
- Taxonomy: 1-planning/docs/architecture/keyword_meta_taxonomy.yaml

