# Naver Place SEO 자동화 v2 실행 과제(Task Breakdown)

본 문서는 Guidebook v1.1 + Taxonomy를 근거로 v2 목표(Collector → Analyzer → Improver → Generator, 단일 스키마, GUI/CLI) 달성을 위한 실행 과제를 정의한다.

## 원칙
- 사실 기반, 재현 가능, 근거 기록(unknown은 명시).
- 단계별 산출물은 shared/schema.json을 준수하고 Ajv로 검증.
- 보안/운영 환경 제약을 고려해 in‑process 실행 우선.

## 작업 체계(Epics → Tasks)

### EPIC-01 스키마/데이터 표준화
- T-0101 스키마 확정 및 배포
  - 내용: meta/client/keywords(details)/assets/analysis/improvements/provenance 확정
  - 완료조건: shared/schema.json 반영, 문서 02_schema_design.md 업데이트
- T-0102 스키마 검증 파이프라인
  - 내용: Ajv(2020) 기반 validator, pipeline 완료 후 자동 검증
  - 완료조건: scripts/validate.js 동작, 3 산출물 OK

### EPIC-02 택소노미 정규화/인덱싱(C‑Sys)
- T-0201 taxonomy 정규화
  - 내용: keyword_meta_taxonomy.yaml → normalized.json 추출(YAML fenced/code, key:val)
  - 완료조건: scripts/normalize-taxonomy.js, shared/keyword_meta_taxonomy.normalized.json 생성
- T-0202 TaxonomyIndex 구축
  - 내용: facet(core/region/attributes)별 surface→canonical 맵/동의어 처리
  - 완료조건: src/analyzer/mapping/TaxonomyIndex.js, 단위 테스트 통과
- T-0203 KeywordMapper 규칙 엔진
  - 내용: L1 정확일치, L2 정규화/동의어, 제약 필터, 중복/충돌 해소
  - 완료조건: src/analyzer/mapping/KeywordMapper.js, keywords.details(근거/확신도) 기록

### EPIC-03 Collector 안정화/대체 경로
- T-0301 로컬 브라우저 실행 경로 지원
  - 내용: executablePath/headlessNew/userDataDir 옵션 주입
  - 완료조건: 크롬/엣지 경로 지정 시 실행 OK
- T-0302 네트워크/Apollo 훅 스텁
  - 내용: JSON 응답/전역 상태 스캔, 향후 파서 확장 포인트 마련
  - 완료조건: 최소 안전 필드 반환 보장
- T-0303 오프라인 대체 입력
  - 내용: clients/{brand}/inputs/raw.json, page.html 파싱 후 collector.json 생성
  - 완료조건: 크롤 실패 시 대체 경로 자동 사용
- T-0304 NAP 불일치 탐지
  - 내용: intake vs collected 이름/주소/전화 비교
  - 완료조건: analysis.nap_mismatch.* 기록

### EPIC-04 Analyzer 고도화
- T-0401 주소 토큰화/지역 키워드 보강
  - 내용: intake.address.raw 토큰을 region에 병합
  - 완료조건: keywords.region 증가, details 근거 포함
- T-0402 이슈/결측 탐지 룰 확장
  - 내용: 필수 필드 누락/비정상값 탐지 규칙표 정의
  - 완료조건: analysis.missing/analysis.issues 갱신

### EPIC-05 Improver/Generator (Guidebook 반영)
- T-0501 Intro/News/Visual 생성 규칙 반영
  - 내용: 분량/구조/금지어 준수, 문장형 키워드 삽입, 시나리오 템플릿화
  - 완료조건: improved.json에 intro_text/news_calendar/visual_suggestions 품질 상승
- T-0502 NAP 보정 제안
  - 내용: 불일치 항목별 정규화/통일 가이드
  - 완료조건: improvements.nap_corrections 배열 채움
- T-0503 Generator 산출 강화
  - 내용: Guidebook.md/Checklist에 NAP 보정/결측 반영
  - 완료조건: 산출물 갱신, 린팅/포맷 정상

### EPIC-06 GUI/운영
- T-0601 in‑process GUI 실행
  - 내용: POST /run → intake 저장→4단계 실행→outputs 링크 반환
  - 완료조건: express 앱, /health, 정적 /clients 노출
- T-0602 보안 회피(파일리스 오탐 감소)
  - 내용: 자식 프로세스/Start‑Process 최소화, 배치 스크립트 제공
  - 완료조건: start_gui_and_browser.cmd 동작, 문서화

### EPIC-07 품질/검증/문서
- T-0701 E2E 검증 시나리오
  - 내용: MOCK 모드 파이프라인 + validate 필수화
  - 완료조건: pipeline:mock 동시에 성공
- T-0702 문서화
  - 내용: 00~07 리팩터링/QA 문서, README, 기획(plan/tasks)
  - 완료조건: 최신 상태 반영

## 우선순위/일정(가늠)
- P1: T-0101, 0102, 0201, 0301, 0303, 0401, 0601, 0701
- P2: T-0202, 0203, 0302, 0304, 0402, 0502, 0503, 0602, 0702
- P3: T-0501(콘텐츠 품질 보강, 템플릿 고도화)

## 의존관계
- 스키마(EPIC-01) → 매핑/분석/개선/생성
- 정규화(0201) → 인덱스/매핑(0202, 0203)
- Collector(0301/0303) → Analyzer/Improver/Generator
- GUI(0601) → 파이프라인 완료 후 노출

## 완료 기준(Definition of Done)
- 코드: 빌드/실행/테스트 통과, 로그 수준 적절, 환경변수/설정 주입
- 데이터: schema.json 준수, Ajv 검증 OK, unknown/근거 기록
- 문서: 사용/운영/제약 명시, 변경점 반영

## 리스크 및 완화
- DOM/차단 변화: 오프라인 대체, 로컬 브라우저 지정, 응답 파서 확장
- 택소노미 혼합 포맷: 정규화 유지, 순수 YAML 제공 시 품질 향상
- 보안(Fileless): in‑process 실행/배치 스크립트, 자식 프로세스 최소화

## 운영 체크리스트(요약)
- 실행 전: 브라우저 경로(옵션), MOCK 여부, 입력 파일 위치 확인
- 실행 후: outputs/ 3종 산출 확인, Ajv 검증 OK, 로그/오류 없음
- 배포: README/문서 최신, 스크립트 동작, 방화벽/보안 예외 필요 시 등록

