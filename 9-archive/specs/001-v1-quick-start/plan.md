# Implementation Plan: Naver Place SEO Automation (Quick Start v1)

Branch: `001-naver-place-seo-automation` | Date: 2025-11-10 | Spec: [specs/001-v1-quick-start/spec.md](spec.md)

Input: Feature specification from `specs/001-v1-quick-start/spec.md`

## Summary
## 요약

Deliver a local, pipeline-based tool to improve Naver Place SEO via:
네이버 플레이스 SEO 개선을 위한 로컬 실행 파이프라인 도구 제공:

- **L1** Data collection via Playwright crawler + data organization
- **L1** Playwright 크롤러를 통한 데이터 수집 + 데이터 정리
- **L2** AI-based keyword analysis (OpenAI/Anthropic + Mock mode)
- **L2** AI 기반 키워드 분석 (OpenAI/Anthropic + Mock 모드)
- **L3** Final keyword strategy generation combining AI recommendations with search metrics
- **L3** AI 추천과 검색 지표를 결합한 최종 키워드 전략 생성

CLI-first MVP with stage independence (each stage runnable in isolation). GUI dashboard with SSE real-time logging.
CLI 우선 MVP, 각 단계 독립 실행 가능. SSE 실시간 로깅을 제공하는 GUI 대시보드.

## Technical Context
## 기술 컨텍스트

**Language/Version**: JavaScript (Node.js 18+)
**언어/버전**: JavaScript (Node.js 18+)

**Primary Dependencies**:
**주요 의존성**:
- `playwright` - Naver Place crawling with bot detection evasion
- `playwright` - 봇 탐지 우회를 포함한 네이버 플레이스 크롤링
- `openai` or `@anthropic-ai/sdk` - AI keyword analysis (optional)
- `openai` 또는 `@anthropic-ai/sdk` - AI 키워드 분석 (선택)
- `winston` - Structured logging with file rotation
- `winston` - 파일 로테이션을 포함한 구조화된 로깅
- `js-yaml` - Configuration file parsing
- `js-yaml` - 설정 파일 파싱
- `express` - GUI web server
- `express` - GUI 웹 서버

**Storage**: Local JSON files; SQLite/PostgreSQL migration planned for Phase 2
**저장소**: 로컬 JSON 파일; 2단계에서 SQLite/PostgreSQL 마이그레이션 계획

**Testing**: Manual testing for quick start; Jest/Mocha for future
**테스트**: 빠른 시작을 위한 수동 테스트; 향후 Jest/Mocha

**Target Platform**: Windows 10+, macOS 12+, Ubuntu 20.04+
**대상 플랫폼**: Windows 10+, macOS 12+, Ubuntu 20.04+

**Project Type**: Single project (CLI + GUI in same codebase)
**프로젝트 유형**: 단일 프로젝트 (CLI + GUI 동일 코드베이스)

**Performance Goals**:
**성능 목표**:
- L1 single store: <5 minutes (including crawling 3s + wait 5s)
- L1 단일 매장: <5분 (크롤링 3초 + 대기 5초 포함)
- L1 without crawling: <1 second per store
- L1 크롤링 없이: 매장당 <1초
- Memory: <2GB for 100 stores batch processing
- 메모리: 100개 매장 배치 처리 시 <2GB
- GUI response: <3 seconds to start SSE log stream
- GUI 응답: SSE 로그 스트림 시작 <3초

**Constraints**:
**제약사항**:
- Respect Naver API rate limits (10 req/sec)
- 네이버 API 속도 제한 준수 (초당 10회 요청)
- No auto-login or settings modification (ToS compliance)
- 자동 로그인 또는 설정 수정 금지 (이용약관 준수)
- Offline-capable via Mock mode (no API keys required for testing)
- Mock 모드를 통한 오프라인 가능 (테스트 시 API 키 불필요)
- Crawling: 30-second wait on bot detection, auto-retry
- 크롤링: 봇 탐지 시 30초 대기, 자동 재시도

## Constitution Check
## 헌법 준수 확인

### I. Complete Code First
### I. 완전한 코드 우선
- [x] No TODO comments in shipped code
- [x] 출시 코드에 TODO 주석 없음
- [x] Each module fully functional with Mock mode
- [x] 각 모듈은 Mock 모드로 완전히 작동
- [x] Empty catch blocks justified or removed
- [x] 빈 catch 블록은 정당화되거나 제거됨

### II. Structured Error Handling
### II. 구조화된 에러 처리
- [x] Error codes: `E_L1_XXX`, `E_L2_XXX`, `E_L3_XXX`, `E_SYS_XXX`
- [x] 에러 코드: `E_L1_XXX`, `E_L2_XXX`, `E_L3_XXX`, `E_SYS_XXX`
- [x] Logger usage (no console.log/error)
- [x] Logger 사용 (console.log/error 금지)
- [x] Recovery strategies: exponential backoff, Mock fallback
- [x] 복구 전략: 지수 백오프, Mock 대체

### III. Pipeline Architecture
### III. 파이프라인 아키텍처
- [x] L1/L2/L3 independent modules
- [x] L1/L2/L3 독립 모듈
- [x] JSON file-based inter-stage communication
- [x] JSON 파일 기반 단계 간 통신
- [x] Shared database schema for future expansion
- [x] 향후 확장을 위한 공유 데이터베이스 스키마

### IV. Observability & Logging
### IV. 관찰 가능성 & 로깅
- [x] Winston structured logging (debug/info/warn/error)
- [x] Winston 구조화된 로깅 (debug/info/warn/error)
- [x] SSE real-time log streaming for GUI
- [x] GUI용 SSE 실시간 로그 스트리밍
- [x] Progress indicators for batch operations (>10 items)
- [x] 배치 작업용 진행률 표시 (>10개 항목)

### V. Configuration Management
### V. 설정 관리
- [x] `local.config.yml` for paths and settings
- [x] 경로 및 설정용 `local.config.yml`
- [x] Environment variables for API keys
- [x] API 키용 환경 변수
- [x] Mock mode enabled by default
- [x] Mock 모드 기본 활성화

### VI. Data Quality & Completeness
### VI. 데이터 품질 & 완성도
- [x] ~~Completeness scoring system (removed per user request)~~
- [x] ~~완성도 평가 시스템 (사용자 요청으로 제거)~~
- [x] Data validation: required fields check
- [x] 데이터 검증: 필수 필드 확인
- [x] Industry-specific data collection (menus for restaurants, etc.)
- [x] 업종별 데이터 수집 (식당은 메뉴 등)

### VII. Bilingual Documentation
### VII. 이중 언어 문서화
- [x] KR/EN in spec.md, plan.md, tasks.md
- [x] spec.md, plan.md, tasks.md에 한국어/영어
- [x] Code comments for complex logic
- [x] 복잡한 로직에 코드 주석

### VIII. AI & Prompt Management
### VIII. AI & 프롬프트 관리
- [x] Prompts stored in `src/lib/prompts/` directory
- [x] 프롬프트를 `src/lib/prompts/` 디렉토리에 저장
- [x] Mock AI client for testing without API keys
- [x] API 키 없이 테스트용 Mock AI 클라이언트
- [x] AI cost tracking placeholder
- [x] AI 비용 추적 플레이스홀더

### IX. Performance & API Management
### IX. 성능 & API 관리
- [x] Exponential backoff retry logic
- [x] 지수 백오프 재시도 로직
- [x] Naver API rate limit compliance (10 req/sec)
- [x] 네이버 API 속도 제한 준수 (초당 10회)
- [x] Mock mode for all external APIs
- [x] 모든 외부 API용 Mock 모드

## Project Structure
## 프로젝트 구조

### Documentation (this feature)
### 문서 (이 기능)

```
specs/001-v1-quick-start/
├── spec.md              # Feature specification
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0 research notes
├── data-model.md        # Data models and schemas
├── quickstart.md        # How to run CLI/GUI
├── contracts/           # CLI I/O contracts
│   └── README.md
└── tasks.md             # Task list grouped by user stories
```

### Source Code (repository root)
### 소스 코드 (저장소 루트)

```
src/
├── crawler/
│   ├── ultimate-scraper.js      # Playwright-based Naver Place crawler
│   ├── batch-scraper.js         # Batch crawling for multiple stores
│   └── place-scraper.js         # Single store crawler
│
├── processors/
│   ├── l1-processor.js          # L1: Data collection & organization
│   ├── l2-processor.js          # L2: AI keyword analysis
│   └── l3-processor.js          # L3: Final strategy generation
│
├── services/
│   ├── naver-api.js             # Naver Search API client (+ Mock)
│   ├── ai-api.js                # OpenAI/Anthropic client (+ Mock)
│   └── config-manager.js        # API key encryption/storage
│
├── lib/
│   ├── logger.js                # Winston logger + SSE streaming
│   ├── errors.js                # Error codes and handlers
│   └── prompts/                 # AI prompt templates
│       ├── restaurant.txt
│       ├── cafe.txt
│       └── default.txt
│
├── gui-server.js                # Express server for GUI
├── main.js                      # CLI entry point
└── abusing-detector.js          # Bot detection handling

data/
├── input/
│   ├── places-advanced/         # Crawled store data (FULL.json)
│   ├── current_keywords.json    # Current keywords per store
│   └── manual_notes.json        # Manual notes per store
│
├── output/
│   ├── l1/                      # L1 outputs
│   ├── l2/                      # L2 outputs
│   └── l3/                      # L3 outputs
│
└── logs/
    ├── cli.log                  # CLI logs
    └── gui-server.log           # GUI server logs

tests/                           # Future: Jest/Mocha tests
├── unit/
├── integration/
└── contract/
```

**Structure Decision**:
**구조 결정**:

Single-project layout based on existing Place_Keywords_maker implementation. CLI and GUI share the same codebase. Future GUI frontend can be added to `frontend/` directory without disrupting backend.
기존 Place_Keywords_maker 구현 기반 단일 프로젝트 레이아웃. CLI와 GUI는 동일한 코드베이스 공유. 향후 GUI 프론트엔드는 백엔드를 방해하지 않고 `frontend/` 디렉토리에 추가 가능.

## Key Implementation Details from Existing Code
## 기존 코드의 주요 구현 세부사항

### L1 Processor
### L1 프로세서

**Apollo State Parsing**:
**Apollo State 파싱**:
- Extract `window.__APOLLO_STATE__` from Naver Place HTML
- 네이버 플레이스 HTML에서 `window.__APOLLO_STATE__` 추출
- Parse menu items with `Menu:{placeId}_*` keys
- `Menu:{placeId}_*` 키로 메뉴 항목 파싱
- Collect blog reviews from Apollo State objects
- Apollo State 객체에서 블로그 리뷰 수집
- Extract images by category (menu, interior, food)
- 카테고리별 이미지 추출 (메뉴, 인테리어, 음식)

**Bot Detection Evasion**:
**봇 탐지 우회**:
- Custom User-Agent: Chrome 131.0.0.0
- 커스텀 User-Agent: Chrome 131.0.0.0
- Disable automation flags: `webdriver` set to undefined
- 자동화 플래그 비활성화: `webdriver`를 undefined로 설정
- On detection: wait 30 seconds, retry automatically
- 탐지 시: 30초 대기, 자동 재시도

**Data Structure**:
**데이터 구조**:
```javascript
{
  id: string,
  name: string,
  category: string,
  roadAddress: string,
  address: string,
  phone: string,
  menus: [
    {
      name: string,
      price: number,
      priceFormatted: string,
      description: string,
      recommend: boolean,
      images: string[]
    }
  ],
  reviewStats: {
    total: number,
    textTotal: number,
    score: number,
    microReviews: string[]
  },
  blogReviews: [
    {
      id: string,
      title: string,
      contents: string,
      author: string,
      date: string,
      url: string,
      images: string[],
      tags: string[]
    }
  ],
  images: {
    menu: ImageData[],
    interior: ImageData[],
    food: ImageData[],
    all: ImageData[]
  },
  collectedAt: timestamp
}
```

### L2 Processor
### L2 프로세서

**Keyword Matrix Generation**:
**키워드 매트릭스 생성**:
- Combine location + category + menu + attributes
- 지역 + 카테고리 + 메뉴 + 속성 조합
- Generate 50-200 keyword candidates
- 50-200개 키워드 후보 생성

**AI Analysis**:
**AI 분석**:
- Industry-specific prompts from `src/lib/prompts/`
- `src/lib/prompts/`의 업종별 프롬프트
- Mock mode: deterministic keyword generation
- Mock 모드: 결정론적 키워드 생성
- Real mode: OpenAI GPT-4 or Anthropic Claude
- 실제 모드: OpenAI GPT-4 또는 Anthropic Claude

**Naver Search API**:
**네이버 검색 API**:
- Query keyword search volume and competition
- 키워드 검색량 및 경쟁도 조회
- Mock mode: hash-based pseudo-random values
- Mock 모드: 해시 기반 의사 랜덤 값
- Rate limit: 10 req/sec with exponential backoff
- 속도 제한: 지수 백오프로 초당 10회 요청

### Logger & SSE
### 로거 & SSE

**Winston Logger**:
**Winston 로거**:
- Levels: debug, info, warn, error
- 레벨: debug, info, warn, error
- File rotation: daily, max 14 days
- 파일 로테이션: 일간, 최대 14일
- Console + File dual output
- 콘솔 + 파일 이중 출력

**SSE Streaming**:
**SSE 스트리밍**:
- Endpoint: `GET /logs/stream`
- 엔드포인트: `GET /logs/stream`
- Format: `event: log\ndata: {JSON}\n\n`
- 형식: `event: log\ndata: {JSON}\n\n`
- Keep-alive: every 30 seconds
- Keep-alive: 30초마다

### GUI Server
### GUI 서버

**API Endpoints**:
**API 엔드포인트**:
```
POST /l1/process          - Execute L1 pipeline
GET  /l1/results          - Get L1 results
POST /l2/process          - Execute L2 pipeline
GET  /l2/results          - Get L2 results
POST /l3/process          - Execute L3 pipeline (future)
GET  /l3/results          - Get L3 results (future)
GET  /logs/stream         - SSE log streaming
GET  /logs/all            - Get all logs (JSON)
POST /logs/clear          - Clear logs
GET  /logs/download       - Download logs as file
POST /stores/add          - Add new store (future)
GET  /stores/list         - List all stores (future)
GET  /stores/:id          - Get store details (future)
PUT  /stores/:id          - Update store (future)
DELETE /stores/:id        - Delete store (future)
```

## Complexity Tracking
## 복잡도 추적

No constitution violations in current scope.
현재 범위에서 헌법 위반 없음.

**Future considerations**:
**향후 고려사항**:
- Database migration (JSON → SQLite/PostgreSQL) requires schema design
- 데이터베이스 마이그레이션 (JSON → SQLite/PostgreSQL)은 스키마 설계 필요
- Multi-user support requires authentication/authorization
- 다중 사용자 지원은 인증/권한 부여 필요
- Business services (quotations, invoices) require integration design
- 비즈니스 서비스 (견적서, 세금계산서)는 통합 설계 필요

---

**Last Updated**: 2025-11-10
**마지막 업데이트**: 2025-11-10
