# place-keywords-maker-v2 프로젝트 분석 보고서

본 문서는 기존 프로젝트 `place-keywords-maker-v2`의 구조, 구성요소, 중복/폐기 코드, 핵심 이슈와 리팩터링 우선순위를 정리합니다. 이후 단계에서 가이드북(251113_Guidebook_v1.1_full.md)과 메타 택소노미(keyword_meta_taxonomy.yaml)를 근거로 통합 파이프라인으로 재구성합니다.

## 개요
- 경로: `C:\Users\Nk Ko\Documents\workspace\2-projects\place-keywords-maker-v2`
- 런타임: Node.js (ES Module), Puppeteer, Jest, ESLint, js-yaml, dotenv
- 현재 구현 범위: L1 수집 파이프라인(Collector 중심) + 최소 유틸 + GUI 서버 초안 + 단위테스트 일부
- 계획/문서: README.md, SPEC.md 존재 (L2/L3 계획과 GUI 요건 포함, 다수 미구현)

## 폴더 구조 요약
- `src/`
  - `config/default.yml`: 크롤러/파서/파이프라인/로깅/AI 설정값. 일부 항목은 미사용(예: logging.file, ai 등) 추정
  - `gui/` (`server.js`, `app.html`, `index.html`, `simple.html`): 간단한 Node 서버와 정적 페이지(진행중)
  - `modules/`
    - `crawler/PlaceCrawler.js`: Puppeteer 기반 네이버플레이스 크롤러, CircuitBreaker + 재시도 로직 사용
    - `parser/DataParser.js`: 크롤링 원시 데이터를 정규화, 필드 파싱 및 completeness 점수 산출
    - `processor/L1Processor.js`: 단일/배치 처리, 결과 저장(JSON)
  - `pipelines/l1-pipeline.js`: 설정/입력 로드 → L1Processor 초기화/실행 → 결과 출력 요약
  - `utils/` (`CircuitBreaker.js`, `retry.js`, `logger.js`): 회로차단, 재시도, 로거
- `data/`
  - `input/place-ids.txt`: Place ID 목록
  - `output/l1/place-*.json`: L1 처리 결과 샘플 존재
  - `cache/`: 비어있거나 임시 용도
- `tests/`
  - `unit/CircuitBreaker.test.js`: CircuitBreaker 단위 테스트 (기타 모듈 테스트 부재)
- 루트 파일
  - `package.json`: 스크립트(`l1`, `l2`, `l3`, `gui`, `test*`, `lint`) 및 의존성 정의
  - `jest.config.js`: 커버리지 70% 임계값 정의(현실적으로 미달 추정)
  - `.env.example`, `README.md`, `SPEC.md`
  - `legacy/`: `v1` 폴더 있으나 내용 없음(또는 비어있음)
  - `node_modules/`: 대규모 의존성 폴더

## 모듈 및 기능 구성
- Collector (현 L1 중심)
  - `PlaceCrawler`: Puppeteer로 페이지 진입, `page.evaluate`에서 DOM 셀렉터 기반으로 기본 필드 추출. CircuitBreaker와 exponentialBackoff로 안정성 보강
  - 입력: Place ID
  - 출력: 원시 필드(이름/카테고리/주소/전화 등, TODO 주석 다수)
- Parser
  - `DataParser`: 기본정보/메뉴/사진/리뷰/영업시간/설명 파싱 및 정제. completeness 점수(가중치 기반) 계산
  - 입력: 크롤링 원시 데이터
  - 출력: 정규화된 객체 + completeness 점수
- Processor
  - `L1Processor`: placeId 단건/배치 처리, 결과 파일 저장(`data/output/l1/place-*.json`)
- Pipeline Entry
  - `l1-pipeline.js`: 설정(`src/config/default.yml`)과 입력 파일(`data/input/place-ids.txt`)을 로드, 배치 실행/요약 출력
- Utilities
  - `CircuitBreaker`, `retry(exponentialBackoff/linearRetry)`, `logger`
- GUI (초안)
  - `src/gui/server.js` 및 정적 HTML들: 간단한 서버 및 화면 골격. 파이프라인 연동 미완성

## 중복/폐기 코드 및 잠재적 불용 요소
- `legacy/v1`: 비어있음(또는 실내용 없음). 유지 필요성 낮음 → 신규 프로젝트로 이관 시 제외 후보
- `config.default.yml`
  - `logging.file`, `ai.*` 등 현재 코드 경로에서 직접 사용되지 않음 → 실제 사용 여부 점검 필요
- `README`와 `SPEC` 내 계획된 L2/L3/GUI 상세가 코드에 불일치(미구현). 문서-코드 괴리 발생
- `DataParser` completeness 가중치 기반 점수는 임의 추정값으로 “검증 불가한 랭킹/점수”에 해당 → 규칙상 제거 또는 “unknown” 명시 필요

## 핵심 이슈
- 크롤링 신뢰성
  - `PlaceCrawler`의 DOM 셀렉터(`.place_name`, `.category`, `.address`, `.phone`)는 네이버 플레이스 실제 DOM과 상이할 가능성 높음(페이지 구조 변경/클래스명 난독화). TODO 주석 존재
  - Apollo state 또는 네트워크 응답을 통한 구조적 수집 미구현. 차단/봇탐지 대응 전략 부재(랜덤 UA/쿠키/지연/헤드리스 우회 등)
- 스키마 부재/IO 일관성 결여
  - 모듈 간 공용 스키마가 없어 Collector/Parser/Processor 간 타입·필드 보장이 약함
  - 출력은 `data/output/l1` 단일 레벨로 저장되어 후속 단계(L2/L3)와의 인터페이스가 불명확
- 분석/개선/생성 단계 미구현
  - Analyzer(키워드 매핑, R/P/T 지표, 결측/오류 탐지), Improver(키워드 제안/소개문/캘린더/리뷰양식/비주얼 개선), Generator(Guidebook/Checklist/audit) 부재
- 테스트 커버리지 부족
  - CircuitBreaker만 단위 테스트 존재. 크롤러/파서/파이프라인/유틸 추가 테스트 필요
- 인코딩/문자 깨짐
  - 주석 일부에 인코딩 깨짐 현상(에디터/코드 페이지 이슈) → 문서화 및 주석 정비 필요

## 리팩터링 우선순위(권고)
1) 통합 스키마 정의 및 I/O 표준화
   - `shared/schema.json` 설계: business, keywords(region/core/attributes), assets, ops, analysis, improvements 섹션 포함
   - Collector → Analyzer → Improver → Generator 전 단계에 동일 스키마 적용
2) Collector 정교화
   - Naver Place 수집 로직을 DOM 셀렉터 의존 최소화(Apollo state·XHR 응답 파싱 고려)
   - NAP(상호/주소/전화) 불일치 탐지 로직 추가, 택소노미 기반 태깅 준비
   - 재시도/회로차단 유지, 차단 회피 전략(지연, 헤더 다양화 등) 보강
3) Analyzer 구현
   - 키워드 매핑(C-Sys), 사실 기반 Relevance/Popularity/Trust 지표 산정(불명확/가중 공식은 “unknown”으로 표기)
   - 결측/오류 데이터 탐지 및 수정 제안
4) Improver 구축
   - 키워드 제안, 소개문 생성, 4주 뉴스 캘린더, 리뷰 템플릿, 비주얼 개선 제안
5) Generator 구축
   - Guidebook.md, Deploy_Checklist.md, audit_report.json 산출
6) 문서화 체계
   - 각 단계별 `/docs/refactoring/` 하위에 설계/결정/근거 기록(소형 모델이 따라할 수 있도록 절차 중심)
7) 테스트/운영
   - 단위/통합 테스트 추가, 설정 주입/모킹 구조 확립, 민감 정보 분리(.env)

## 결론
- 현재 프로젝트는 L1 수집 파이프라인의 뼈대가 갖춰져 있으나, 스키마 부재와 L2/L3 미구현으로 전체 자동화 파이프라인은 미완성 상태입니다.
- 본 리팩터링에서는 가이드북·택소노미를 근거로 Collector/Analyzer/Improver/Generator 4단계를 통합 스키마로 연결하고, 검증 불가한 점수/랭킹 공식은 제거 또는 “unknown”으로 처리합니다.
