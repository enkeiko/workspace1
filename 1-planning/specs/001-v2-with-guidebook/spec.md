# Feature Specification: 네이버 플레이스 SEO 자동화
# Feature Specification: Naver Place SEO Automation

**Feature Branch**: `001-naver-place-seo-automation`
**Created**: 2025-11-09
**Status**: Draft
**Input**: User description: "네이버플레이스 SEO 자동화 프로그램 - Place_Keywords_maker를 기반으로 네이버 플레이스 검색 최적화를 위한 자동화 시스템 개발"

---

## Executive Summary
## 개요

### What (무엇을)
네이버 플레이스 매장 데이터를 수집하고 AI 분석을 통해 검색 최적화(SEO) 키워드 전략을 자동으로 생성하는 로컬 실행 도구입니다.
A local execution tool that collects Naver Place store data and automatically generates search optimization (SEO) keyword strategies through AI analysis.

### Why (왜)
매장 운영자들은 네이버 플레이스 검색 노출을 개선하기 위해 최적의 키워드를 찾는 데 많은 시간과 시행착오를 겪습니다. 이 시스템은 데이터 기반 분석과 AI 추천을 통해 이 과정을 자동화하고, 업종별 특성을 반영한 맞춤 전략을 제공합니다.
Store owners spend significant time and trial-and-error finding optimal keywords to improve Naver Place search exposure. This system automates this process through data-driven analysis and AI recommendations, providing customized strategies that reflect industry-specific characteristics.

### How (어떻게)
**3단계 파이프라인 (L1 → L2 → L3)**:
**3-stage pipeline (L1 → L2 → L3)**:
1. **L1 (데이터 수집)**: 네이버 플레이스 크롤러로 매장 정보 수집 및 완성도 평가
2. **L2 (AI 분석)**: AI를 활용한 업종별 키워드 분석 및 추천
3. **L3 (최종 전략)**: 네이버 검색 API 데이터와 AI 추천을 결합한 최종 키워드 전략 생성

각 단계는 독립적으로 실행 가능하며, CLI와 GUI(웹 대시보드)를 통해 접근할 수 있습니다.
Each stage can be executed independently and accessed via CLI and GUI (web dashboard).

### Who (누구를 위한)
- **주 대상**: 네이버 플레이스에 등록된 소상공인 (식당, 카페, 소매점, 전문 서비스, 의료 시설 운영자)
- **Primary audience**: Small business owners registered on Naver Place (restaurant, cafe, retail, professional services, healthcare operators)
- **부 대상**: 디지털 마케팅 대행사, SEO 컨설턴트
- **Secondary audience**: Digital marketing agencies, SEO consultants

### Key Features (핵심 기능)
- ✅ 네이버 플레이스 데이터 자동 크롤링 및 완성도 평가 (0-100점)
- ✅ 업종별 차별화된 AI 키워드 추천 (식당: 메뉴 중심, 소매: 제품사진 중심)
- ✅ 네이버 검색 API 기반 검색량 및 경쟁도 분석
- ✅ 현재 키워드 대비 개선 예상치 비교
- ✅ 실시간 로그 스트리밍 및 진행률 표시
- ✅ Mock 모드 지원 (API 키 없이 테스트 가능)
- ✅ CLI + GUI 인터페이스 제공

### Success Metrics (성공 지표)
- L1 데이터 수집: 단일 매장 5분 이내 완료
- AI 키워드 추천: 업종별 맞춤 키워드 3-5개 생성
- 메모리 효율: 100개 매장 처리 시 2GB 이하 사용
- 사용자 편의성: Mock 모드로 API 키 없이 전체 파이프라인 테스트 가능

### Out of Scope (범위 외)
❌ 네이버 플레이스 계정 자동 로그인 및 설정 변경
❌ 경쟁사 매장 자동 분석 (법적/윤리적 이슈)
❌ 결제 시스템 연동 및 유료 구독 모델
❌ 모바일 앱 개발

### Timeline Estimate (예상 일정)
- **P1 (L1 데이터 수집)**: 2-3주
- **P2 (L2 AI 분석)**: 2-3주
- **P3 (L3 최종 전략)**: 1-2주
- **P4 (GUI 대시보드)**: 2-3주 (병렬 개발 가능)
- **총 예상 기간**: 7-11주 (P1-P3 순차 + P4 병렬)

---

## User Scenarios & Testing *(mandatory)*
## 사용자 시나리오 및 테스트 *(필수)*

### User Story 1 - 데이터 수집 및 완성도 평가 (Priority: P1)
### User Story 1 - Data Collection and Completeness Evaluation (Priority: P1)

매장 운영자는 자신의 네이버 플레이스 데이터를 수집하고 현재 데이터의 완성도를 파악하여 SEO 개선이 필요한 영역을 식별할 수 있습니다.
Store owners can collect their Naver Place data and understand current data completeness to identify areas needing SEO improvement.

**Why this priority**: SEO 최적화의 기초가 되는 현재 상태 파악은 모든 후속 작업의 전제 조건입니다. 데이터 없이는 분석과 전략 수립이 불가능합니다.
**Why this priority**: Understanding current state is the foundation for SEO optimization and prerequisite for all subsequent work. Analysis and strategy cannot proceed without data.

**Independent Test**: 매장 ID를 입력하면 완성도 점수(0-100점)와 부족한 데이터 항목 목록을 반환하여 독립적으로 테스트 및 검증 가능합니다.
**Independent Test**: Can be independently tested by inputting store ID and verifying completeness score (0-100) and missing data item list are returned.

**Acceptance Scenarios**:
**수락 시나리오**:

1. **Given** 사용자가 유효한 네이버 플레이스 ID를 제공하면, **When** 데이터 수집을 실행하면, **Then** 매장 정보(카테고리, 주소, 메뉴, 리뷰, 사진)가 수집되고 완성도 점수가 계산됩니다.
   **Given** user provides a valid Naver Place ID, **When** data collection executes, **Then** store information (category, address, menu, reviews, photos) is collected and completeness score is calculated.

2. **Given** 수집된 데이터에 필수 항목(카테고리, 기본 주소)이 누락되었으면, **When** 완성도 평가가 실행되면, **Then** 완성도 점수가 60점 이하로 표시되고 누락 항목이 명시됩니다.
   **Given** collected data is missing required items (category, basic address), **When** completeness evaluation runs, **Then** completeness score shows below 60 and missing items are specified.

3. **Given** 여러 매장 데이터를 동시 수집하면, **When** 배치 처리를 실행하면, **Then** 각 매장별 진행률이 실시간으로 표시되고 전체 처리 시간이 보고됩니다.
   **Given** multiple store data is collected simultaneously, **When** batch processing executes, **Then** progress for each store is displayed in real-time and total processing time is reported.

---

### User Story 2 - AI 기반 키워드 분석 및 추천 (Priority: P2)
### User Story 2 - AI-based Keyword Analysis and Recommendations (Priority: P2)

매장 운영자는 수집된 데이터를 바탕으로 AI가 분석한 최적 키워드 추천을 받아 네이버 검색 노출을 개선할 수 있습니다.
Store owners can receive AI-analyzed optimal keyword recommendations based on collected data to improve Naver search exposure.

**Why this priority**: 데이터 수집(P1) 이후에만 가능하며, 키워드 전략은 SEO의 핵심 가치를 제공합니다. P1 없이는 실행 불가능합니다.
**Why this priority**: Only possible after data collection (P1), and keyword strategy provides core SEO value. Cannot execute without P1.

**Independent Test**: 완성도 점수 60점 이상인 매장 데이터를 입력하면 업종별 맞춤 키워드 리스트(주요/보조)와 검색량 예측을 반환하여 독립적으로 테스트 가능합니다.
**Independent Test**: Can be independently tested by inputting store data with completeness score above 60 and verifying industry-specific keyword list (primary/secondary) and search volume predictions are returned.

**Acceptance Scenarios**:
**수락 시나리오**:

1. **Given** 완성도 60점 이상인 식당 데이터가 있으면, **When** AI 키워드 분석을 실행하면, **Then** 메뉴, 지역, 속성을 조합한 키워드 리스트가 우선순위와 함께 제공됩니다.
   **Given** restaurant data with completeness above 60 exists, **When** AI keyword analysis executes, **Then** keyword list combining menu, location, and attributes is provided with priorities.

2. **Given** 업종별 특성(식당/카페, 소매, 전문서비스, 의료)이 다르면, **When** 키워드 추천을 실행하면, **Then** 업종별로 강조되는 요소(식당: 메뉴/리뷰, 소매: 제품사진/영업시간)가 반영된 키워드가 생성됩니다.
   **Given** industry characteristics differ (restaurant/cafe, retail, professional services, healthcare), **When** keyword recommendation executes, **Then** keywords reflecting industry-emphasized elements (restaurant: menu/reviews, retail: product photos/hours) are generated.

3. **Given** 현재 사용 중인 키워드 성능 데이터가 있으면, **When** 키워드 비교 분석을 실행하면, **Then** 기존 키워드 대비 개선 예상치가 표시됩니다.
   **Given** current keyword performance data exists, **When** keyword comparison analysis executes, **Then** expected improvement versus existing keywords is displayed.

---

### User Story 3 - 최종 키워드 전략 생성 및 적용 (Priority: P3)
### User Story 3 - Final Keyword Strategy Generation and Application (Priority: P3)

매장 운영자는 AI 추천과 네이버 검색 데이터를 결합한 최종 키워드 전략을 받아 실제 네이버 플레이스 설정에 적용할 수 있습니다.
Store owners can receive final keyword strategy combining AI recommendations and Naver search data to apply to actual Naver Place settings.

**Why this priority**: P1과 P2 완료 후에만 실행 가능하며, 최종 전략 도출은 전체 파이프라인의 결과물입니다.
**Why this priority**: Only executable after P1 and P2 completion, and final strategy derivation is the output of the entire pipeline.

**Independent Test**: AI 추천 키워드와 검색량 데이터를 입력하면 최종 키워드 세트(대표/보조)와 적용 가이드를 반환하여 독립적으로 테스트 가능합니다.
**Independent Test**: Can be independently tested by inputting AI-recommended keywords and search volume data and verifying final keyword set (primary/secondary) and application guide are returned.

**Acceptance Scenarios**:
**수락 시나리오**:

1. **Given** AI 키워드 추천과 네이버 검색 API 데이터가 준비되면, **When** 최종 전략 생성을 실행하면, **Then** 검색량과 경쟁도를 고려한 최적 키워드 조합이 생성됩니다.
   **Given** AI keyword recommendations and Naver Search API data are ready, **When** final strategy generation executes, **Then** optimal keyword combination considering search volume and competition is generated.

2. **Given** 여러 키워드 후보가 있으면, **When** 우선순위 스코어링을 실행하면, **Then** 각 키워드의 점수와 선정 이유가 제공됩니다.
   **Given** multiple keyword candidates exist, **When** priority scoring executes, **Then** each keyword's score and selection rationale are provided.

3. **Given** 최종 키워드 전략이 생성되면, **When** 적용 가이드를 확인하면, **Then** 네이버 플레이스 설정 방법과 예상 효과가 단계별로 안내됩니다.
   **Given** final keyword strategy is generated, **When** application guide is reviewed, **Then** Naver Place configuration method and expected effects are guided step-by-step.

---

### User Story 4 - GUI 대시보드를 통한 전체 프로세스 모니터링 (Priority: P4)
### User Story 4 - Full Process Monitoring via GUI Dashboard (Priority: P4)

매장 운영자는 웹 대시보드를 통해 L1/L2/L3 각 단계의 진행 상황을 실시간으로 확인하고 결과를 시각적으로 분석할 수 있습니다.
Store owners can monitor L1/L2/L3 stage progress in real-time through web dashboard and visually analyze results.

**Why this priority**: CLI는 P1-P3에서 모든 핵심 기능을 제공하며, GUI는 사용자 편의성 향상을 위한 선택적 기능입니다. 코어 파이프라인과 독립적으로 병렬 개발 가능합니다.
**Why this priority**: CLI provides all core functionality in P1-P3, and GUI is an optional feature for improved user convenience. Can be developed in parallel independently from core pipeline.

**Independent Test**: 로컬 서버를 시작하고 브라우저로 접속하면 L1 실행 버튼과 결과 차트가 표시되어 독립적으로 테스트 가능합니다.
**Independent Test**: Can be independently tested by starting local server and verifying L1 execution button and result charts are displayed in browser.

**Acceptance Scenarios**:
**수락 시나리오**:

1. **Given** GUI 서버가 실행 중이면, **When** 브라우저로 접속하면, **Then** L1/L2/L3 탭과 각 단계 실행 버튼이 표시됩니다.
   **Given** GUI server is running, **When** browser accesses, **Then** L1/L2/L3 tabs and execution buttons for each stage are displayed.

2. **Given** L1 프로세스가 실행 중이면, **When** 로그 탭을 확인하면, **Then** 실시간 로그 스트림과 진행률 바가 표시됩니다.
   **Given** L1 process is running, **When** log tab is checked, **Then** real-time log stream and progress bar are displayed.

3. **Given** L1 결과가 생성되면, **When** 대시보드를 확인하면, **Then** 완성도 분포 차트, 평균 점수, 처리 매장 수가 시각화됩니다.
   **Given** L1 results are generated, **When** dashboard is checked, **Then** completeness distribution chart, average score, and processed store count are visualized.

---

### Edge Cases
### 엣지 케이스

- 네이버 플레이스 ID가 존재하지 않거나 비공개 상태인 경우 어떻게 처리하는가?
- What happens when Naver Place ID does not exist or is private?

- 크롤러 데이터가 불완전하거나 손상된 JSON 형식인 경우 시스템이 어떻게 복구하는가?
- How does system recover when crawler data is incomplete or corrupted JSON format?

- 동시에 100개 이상의 매장을 처리할 때 메모리 및 성능 제약은 어떻게 관리하는가?
- How are memory and performance constraints managed when processing 100+ stores simultaneously?

- AI API 또는 네이버 검색 API가 일시적으로 장애 상태일 때 재시도 및 대기 전략은?
- What are retry and wait strategies when AI API or Naver Search API is temporarily down?

- 업종 카테고리가 여러 개(예: 카페이면서 베이커리)인 경우 키워드 전략이 어떻게 조합되는가?
- How is keyword strategy combined when multiple industry categories exist (e.g., cafe and bakery)?

## Requirements *(mandatory)*
## 요구사항 *(필수)*

### Functional Requirements
### 기능 요구사항

- **FR-001**: 시스템은 네이버 플레이스 ID를 입력받아 크롤러를 통해 매장 데이터를 수집해야 합니다.
- **FR-001**: System MUST accept Naver Place ID and collect store data via crawler.

- **FR-002**: 시스템은 수집된 데이터를 업종별로 분류하고 완성도 점수를 계산해야 합니다(가중치 기반 평가).
- **FR-002**: System MUST classify collected data by industry and calculate completeness score (weighted evaluation).

- **FR-003**: 시스템은 주소 데이터를 파싱하여 시/구/동/역 정보를 추출해야 합니다.
- **FR-003**: System MUST parse address data to extract city/district/neighborhood/station information.

- **FR-004**: 시스템은 키워드 요소를 카테고리(핵심), 지역, 메뉴, 속성으로 분류해야 합니다.
- **FR-004**: System MUST classify keyword elements into category (core), location, menu, and attributes.

- **FR-005**: 시스템은 AI를 활용하여 업종별 맞춤 키워드를 분석하고 추천해야 합니다.
- **FR-005**: System MUST analyze and recommend industry-specific keywords using AI.

- **FR-006**: 시스템은 네이버 검색 API를 통해 키워드별 검색량과 경쟁도 데이터를 조회해야 합니다.
- **FR-006**: System MUST query search volume and competition data per keyword via Naver Search API.

- **FR-007**: 시스템은 L1(데이터 수집), L2(AI 분석), L3(최종 전략) 파이프라인을 독립적으로 실행 가능해야 합니다.
- **FR-007**: System MUST support independent execution of L1 (data collection), L2 (AI analysis), L3 (final strategy) pipeline stages.

- **FR-008**: 시스템은 각 파이프라인 단계의 입출력 데이터를 JSON 형식으로 저장해야 합니다.
- **FR-008**: System MUST save input/output data for each pipeline stage in JSON format.

- **FR-009**: 시스템은 CLI 인터페이스를 통해 각 단계를 실행할 수 있어야 합니다.
- **FR-009**: System MUST support execution of each stage via CLI interface.

- **FR-010**: 시스템은 GUI 웹 대시보드를 통해 L1/L2/L3 프로세스를 시작하고 모니터링할 수 있어야 합니다.
- **FR-010**: System MUST support starting and monitoring L1/L2/L3 processes via GUI web dashboard.

- **FR-011**: 시스템은 실시간 로그 스트리밍(SSE)을 지원하여 진행 상황을 표시해야 합니다.
- **FR-011**: System MUST support real-time log streaming (SSE) to display progress.

- **FR-012**: 시스템은 여러 매장을 배치 처리할 때 각 매장별 진행률을 표시해야 합니다.
- **FR-012**: System MUST display progress per store when batch processing multiple stores.

- **FR-013**: 시스템은 구조화된 로거를 사용하여 debug/info/warn/error 레벨로 로깅해야 합니다.
- **FR-013**: System MUST use structured logger with debug/info/warn/error levels.

- **FR-014**: 시스템은 모든 경로, API 키, 환경 설정을 외부 설정 파일(local.config.yml, 환경 변수)로 관리해야 합니다.
- **FR-014**: System MUST manage all paths, API keys, and environment settings via external config files (local.config.yml, environment variables).

- **FR-015**: 시스템은 API 키 없이도 Mock 모드로 테스트 가능해야 합니다.
- **FR-015**: System MUST be testable in Mock mode without API keys.

- **FR-016**: 시스템은 에러 발생 시 E_{MODULE}_{NUMBER} 형식의 에러 코드를 반환해야 합니다.
- **FR-016**: System MUST return error codes in E_{MODULE}_{NUMBER} format when errors occur.

- **FR-017**: 시스템은 현재 사용 중인 키워드 성능 데이터(검색량, 클릭률)를 입력받아 비교 분석할 수 있어야 합니다.
- **FR-017**: System MUST accept current keyword performance data (search volume, click rate) for comparison analysis.

- **FR-018**: 시스템은 수동 메모(목표 키워드, 특별 노트, 비즈니스 목표)를 선택적으로 입력받아 키워드 전략에 반영해야 합니다.
- **FR-018**: System MUST optionally accept manual notes (target keywords, special notes, business goals) and reflect them in keyword strategy.

- **FR-019**: 시스템은 최종 키워드 전략 결과를 네이버 플레이스 설정 적용 가이드와 함께 제공해야 합니다.
- **FR-019**: System MUST provide final keyword strategy results with Naver Place configuration application guide.

- **FR-020**: 시스템은 AI 사용 비용을 추적하고 모니터링해야 합니다.
- **FR-020**: System MUST track and monitor AI usage costs.

- **FR-021**: 시스템은 네이버 API 속도 제한을 준수하고 재시도 로직을 구현해야 합니다.
- **FR-021**: System MUST respect Naver API rate limits and implement retry logic.

- **FR-022**: 시스템은 업종별(식당/카페, 소매, 전문서비스, 의료) 차별화된 키워드 평가 기준을 적용해야 합니다.
- **FR-022**: System MUST apply differentiated keyword evaluation criteria by industry (restaurant/cafe, retail, professional services, healthcare).

- **FR-023**: 시스템은 공유 데이터베이스를 사용하여 L1/L2/L3 단계 간 데이터 일관성을 보장해야 합니다.
- **FR-023**: System MUST use shared database to ensure data consistency across L1/L2/L3 stages.

- **FR-024**: 시스템은 향후 CRM 및 마케팅 자동화 시스템 연동을 위한 확장 가능한 스키마를 사용해야 합니다.
- **FR-024**: System MUST use extensible schema for future CRM and marketing automation system integration.

### Non-Functional Requirements
### 비기능 요구사항

#### Performance (성능)
- **NFR-001**: 단일 매장의 L1 데이터 수집은 5분 이내에 완료되어야 합니다.
- **NFR-001**: L1 data collection for a single store MUST complete within 5 minutes.

- **NFR-002**: GUI 대시보드는 L1 프로세스 실행 버튼 클릭 후 3초 이내에 로그 스트림을 시작해야 합니다.
- **NFR-002**: GUI dashboard MUST start log stream within 3 seconds after clicking L1 process execution button.

- **NFR-003**: 100개 매장 배치 처리 시 메모리 사용량은 2GB를 초과하지 않아야 합니다.
- **NFR-003**: Memory usage MUST NOT exceed 2GB when batch processing 100 stores.

- **NFR-004**: AI API 응답 시간은 평균 5초 이내여야 합니다 (타임아웃: 30초).
- **NFR-004**: AI API response time MUST average under 5 seconds (timeout: 30 seconds).

#### Security (보안)
- **NFR-005**: 모든 API 키는 환경 변수 또는 암호화된 설정 파일에 저장되어야 합니다.
- **NFR-005**: All API keys MUST be stored in environment variables or encrypted config files.

- **NFR-006**: 크롤링 데이터는 로컬 파일시스템에만 저장되며 외부 전송은 사용자 명시적 동의 후에만 가능합니다.
- **NFR-006**: Crawled data MUST only be stored on local filesystem and external transmission requires explicit user consent.

- **NFR-007**: 데이터베이스 연결은 TLS/SSL을 사용해야 합니다 (PostgreSQL 사용 시).
- **NFR-007**: Database connections MUST use TLS/SSL (when using PostgreSQL).

#### Reliability (신뢰성)
- **NFR-008**: API 장애 발생 시 exponential backoff 전략으로 최대 3회 재시도해야 합니다.
- **NFR-008**: System MUST retry up to 3 times with exponential backoff strategy when API failures occur.

- **NFR-009**: 크롤러 데이터 파싱 실패 시 부분 데이터를 보존하고 에러 로그를 기록해야 합니다.
- **NFR-009**: When crawler data parsing fails, partial data MUST be preserved and error logs recorded.

- **NFR-010**: CLI 프로세스는 SIGINT/SIGTERM 시그널 수신 시 graceful shutdown을 수행해야 합니다.
- **NFR-010**: CLI processes MUST perform graceful shutdown on SIGINT/SIGTERM signals.

#### Availability (가용성)
- **NFR-011**: Mock 모드는 외부 API 없이 100% 가용해야 합니다 (개발/테스트 목적).
- **NFR-011**: Mock mode MUST be 100% available without external APIs (for development/testing).

- **NFR-012**: GUI 서버는 로컬호스트에서 99% uptime을 유지해야 합니다 (개발 환경 기준).
- **NFR-012**: GUI server MUST maintain 99% uptime on localhost (development environment).

#### Scalability (확장성)
- **NFR-013**: 시스템은 1,000개 매장 데이터를 처리할 수 있도록 설계되어야 합니다.
- **NFR-013**: System MUST be designed to process 1,000 store data.

- **NFR-014**: 데이터베이스 스키마는 향후 다중 사용자 지원을 위해 확장 가능해야 합니다.
- **NFR-014**: Database schema MUST be extensible for future multi-user support.

#### Maintainability (유지보수성)
- **NFR-015**: 모든 코드는 TypeScript 또는 Python type hints를 사용하여 타입 안정성을 보장해야 합니다.
- **NFR-015**: All code MUST use TypeScript or Python type hints to ensure type safety.

- **NFR-016**: 각 모듈은 단위 테스트 커버리지 70% 이상을 유지해야 합니다.
- **NFR-016**: Each module MUST maintain unit test coverage of 70% or higher.

- **NFR-017**: 로그는 구조화된 JSON 형식으로 출력되어야 합니다 (검색 및 분석 용이성).
- **NFR-017**: Logs MUST be output in structured JSON format (for searchability and analysis).

#### Usability (사용성)
- **NFR-018**: CLI는 --help 플래그로 모든 명령어의 사용법을 표시해야 합니다.
- **NFR-018**: CLI MUST display usage instructions for all commands with --help flag.

- **NFR-019**: 모든 에러 메시지는 한글과 영어를 병기하고 복구 가이드를 포함해야 합니다.
- **NFR-019**: All error messages MUST include both Korean and English with recovery guides.

- **NFR-020**: GUI 대시보드는 Chrome, Firefox, Edge 최신 2개 버전을 지원해야 합니다.
- **NFR-020**: GUI dashboard MUST support latest 2 versions of Chrome, Firefox, and Edge.

#### Portability (이식성)
- **NFR-021**: 시스템은 Windows 10+, macOS 12+, Ubuntu 20.04+ 환경에서 실행 가능해야 합니다.
- **NFR-021**: System MUST be executable on Windows 10+, macOS 12+, Ubuntu 20.04+.

- **NFR-022**: 모든 경로는 절대 경로가 아닌 상대 경로 또는 설정 파일 기반으로 처리되어야 합니다.
- **NFR-022**: All paths MUST be handled as relative paths or config-based, not absolute paths.

### Key Entities & Data Models
### 핵심 엔티티 및 데이터 모델

#### Place (매장)
L1/L2/L3 파이프라인의 중심 데이터 단위입니다.
Central data unit of L1/L2/L3 pipeline.

```typescript
Place {
  placeId: string                    // 네이버 플레이스 ID / Naver Place ID
  category: IndustryCategory         // 업종 카테고리 / Industry category
  address: Address                   // 구조화된 주소 / Structured address
  brandName: string                  // 브랜드명 / Brand name
  operationStatus: OperationStatus   // 운영 상태 / Operation status
  crawledAt: timestamp               // 수집 시각 / Collection timestamp
}

IndustryCategory = 'restaurant' | 'cafe' | 'retail' | 'professional_service' | 'healthcare'
OperationStatus = 'active' | 'closed' | 'pending' | 'private'

Address {
  full: string           // 전체 주소 / Full address
  city: string           // 시 / City
  district: string       // 구 / District
  neighborhood: string   // 동 / Neighborhood
  station: string?       // 최근접 역 (선택) / Nearest station (optional)
}
```

#### Completeness Score (완성도 점수)
매장 데이터의 완성도를 나타내는 0-100점 점수입니다.
0-100 score representing store data completeness.

```typescript
CompletenessScore {
  totalScore: number (0-100)      // 전체 점수 / Total score
  breakdown: {
    basicInfo: number (0-20)      // 기본 정보 / Basic info
    menu: number (0-25)            // 메뉴 / Menu (restaurants)
    photos: number (0-20)          // 사진 / Photos
    reviews: number (0-20)         // 리뷰 / Reviews
    amenities: number (0-15)       // 편의시설 / Amenities
  }
  missingItems: string[]           // 누락 항목 목록 / Missing items
  industryWeights: object          // 업종별 가중치 / Industry-specific weights
}
```

#### Keyword Element (키워드 요소)
키워드 구성 요소입니다.
Keyword components.

```typescript
KeywordElement {
  type: KeywordType                // 키워드 유형 / Keyword type
  value: string                    // 키워드 값 / Keyword value
  priority: number (1-10)          // 우선순위 / Priority
  source: KeywordSource            // 출처 / Source
}

KeywordType = 'category' | 'location' | 'menu' | 'attribute'
KeywordSource = 'crawled' | 'ai_generated' | 'user_input'
```

#### Keyword Strategy (키워드 전략)
최종 추천 결과입니다.
Final recommendation result.

```typescript
KeywordStrategy {
  placeId: string                  // 매장 ID / Place ID
  primaryKeywords: Keyword[]       // 주요 키워드 (3-5개) / Primary keywords (3-5)
  secondaryKeywords: Keyword[]     // 보조 키워드 (5-10개) / Secondary keywords (5-10)
  generatedAt: timestamp           // 생성 시각 / Generation timestamp
  applicationGuide: string         // 적용 가이드 / Application guide
}

Keyword {
  text: string                     // 키워드 텍스트 / Keyword text
  searchVolume: number             // 예상 검색량 / Predicted search volume
  competition: number (0-1)        // 경쟁도 / Competition level
  priorityScore: number (0-100)    // 우선순위 점수 / Priority score
  rationale: string                // 선정 이유 / Selection rationale
}
```

#### Performance Data (성능 데이터)
현재 키워드의 성과 지표입니다.
Performance metrics of current keywords.

```typescript
PerformanceData {
  keyword: string                  // 키워드 / Keyword
  monthlySearchVolume: number      // 월평균 검색량 / Monthly average search volume
  clickRate: number (0-1)          // 클릭률 / Click rate
  exposureRank: number             // 노출 순위 / Exposure ranking
  period: { start: date, end: date } // 측정 기간 / Measurement period
}
```

#### Pipeline Stage Result (파이프라인 단계 결과)
각 L1/L2/L3 단계의 실행 결과입니다.
Execution result for each L1/L2/L3 stage.

```typescript
PipelineStageResult {
  stage: 'L1' | 'L2' | 'L3'        // 단계 / Stage
  placeId: string                  // 매장 ID / Place ID
  status: ExecutionStatus          // 실행 상태 / Execution status
  input: object                    // 입력 데이터 / Input data
  output: object                   // 출력 데이터 / Output data
  processingTime: number (ms)      // 처리 시간 / Processing time
  statistics: object               // 통계 정보 / Statistics
  errors: ErrorLog[]               // 에러 로그 / Error logs
  createdAt: timestamp             // 생성 시각 / Creation timestamp
}

ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed'

ErrorLog {
  code: string                     // E_{MODULE}_{NUMBER}
  message: string                  // 에러 메시지 / Error message
  recoveryGuide: string            // 복구 가이드 / Recovery guide
  timestamp: timestamp             // 발생 시각 / Occurrence timestamp
}
```

## Success Criteria *(mandatory)*
## 성공 기준 *(필수)*

### Measurable Outcomes
### 측정 가능한 결과

- **SC-001**: 사용자가 단일 매장의 L1 데이터 수집을 5분 이내에 완료할 수 있습니다.
- **SC-001**: Users can complete L1 data collection for a single store within 5 minutes.

- **SC-002**: 시스템이 10개 매장을 배치 처리할 때 각 매장별 진행률을 실시간으로 표시합니다.
- **SC-002**: System displays real-time progress per store when batch processing 10 stores.

- **SC-003**: 완성도 평가 점수가 업종별 특성을 반영하여 식당의 경우 메뉴 비중이 25% 이상 적용됩니다.
- **SC-003**: Completeness evaluation score reflects industry characteristics with menu weight of 25% or more for restaurants.

- **SC-004**: AI 키워드 추천 결과가 업종별로 차별화되어 식당은 메뉴 중심, 소매는 제품사진 중심 키워드를 생성합니다.
- **SC-004**: AI keyword recommendations are differentiated by industry, generating menu-focused keywords for restaurants and product photo-focused keywords for retail.

- **SC-005**: GUI 대시보드에서 L1 프로세스 실행 버튼 클릭 후 3초 이내에 실시간 로그 스트림이 시작됩니다.
- **SC-005**: Real-time log stream starts within 3 seconds after clicking L1 process execution button in GUI dashboard.

- **SC-006**: 시스템이 API 장애 발생 시 최대 3회까지 자동 재시도하며 재시도 간격을 점진적으로 증가시킵니다.
- **SC-006**: System automatically retries up to 3 times when API failures occur and progressively increases retry intervals.

- **SC-007**: Mock 모드에서 API 키 없이도 L1/L2/L3 전체 파이프라인을 실행하고 테스트할 수 있습니다.
- **SC-007**: In Mock mode, entire L1/L2/L3 pipeline can be executed and tested without API keys.

- **SC-008**: 에러 발생 시 E_{MODULE}_{NUMBER} 형식의 에러 코드와 함께 복구 가이드가 제공됩니다.
- **SC-008**: When errors occur, error codes in E_{MODULE}_{NUMBER} format are provided with recovery guides.

- **SC-009**: 사용자가 최종 키워드 전략 결과를 확인하면 네이버 플레이스 설정 적용 방법이 단계별로 안내됩니다.
- **SC-009**: When users review final keyword strategy results, Naver Place configuration application method is guided step-by-step.

- **SC-010**: AI 사용 비용이 실시간으로 추적되어 대시보드에 누적 비용이 표시됩니다.
- **SC-010**: AI usage costs are tracked in real-time and cumulative costs are displayed on dashboard.

- **SC-011**: 시스템이 100개 매장 데이터를 처리할 때 메모리 사용량이 2GB를 초과하지 않습니다.
- **SC-011**: When system processes 100 store data, memory usage does not exceed 2GB.

- **SC-012**: 사용자가 현재 키워드 대비 개선 예상치를 확인할 때 검색량 증가율과 클릭률 향상 예측이 표시됩니다.
- **SC-012**: When users check expected improvement versus current keywords, search volume increase rate and click rate improvement predictions are displayed.

## Error Handling Strategy
## 에러 처리 전략

### Principles
### 원칙

- **Fail Fast**: 입력 검증 단계에서 즉시 실패하여 잘못된 데이터가 파이프라인으로 진입하는 것을 방지합니다.
- **Fail Fast**: Fail immediately at input validation stage to prevent invalid data from entering pipeline.

- **Graceful Degradation**: AI API 장애 시 기본 휴리스틱 알고리즘으로 최소한의 키워드 추천을 제공합니다.
- **Graceful Degradation**: Provide minimal keyword recommendations using basic heuristic algorithms when AI API fails.

- **User Feedback**: 모든 에러에 한글/영어 병기 메시지와 복구 가이드를 포함하여 사용자가 스스로 문제를 해결할 수 있도록 합니다.
- **User Feedback**: Include Korean/English bilingual messages and recovery guides for all errors to enable users to resolve issues themselves.

- **Contextual Logging**: 에러 발생 시 전체 컨텍스트(입력 파라미터, 실행 상태, 타임스탬프)를 로깅하여 디버깅을 용이하게 합니다.
- **Contextual Logging**: Log full context (input parameters, execution state, timestamp) when errors occur to facilitate debugging.

### Error Code System
### 에러 코드 체계

모든 에러는 `E_{MODULE}_{NUMBER}` 형식을 따릅니다:
All errors follow `E_{MODULE}_{NUMBER}` format:

- **E_CRAWLER_001**: 네이버 플레이스 ID가 존재하지 않음 / Naver Place ID does not exist
- **E_CRAWLER_002**: 크롤링 데이터 파싱 실패 (손상된 JSON) / Crawling data parsing failed (corrupted JSON)
- **E_CRAWLER_003**: 네트워크 타임아웃 (30초 초과) / Network timeout (exceeded 30 seconds)

- **E_AI_001**: AI API 인증 실패 (잘못된 API 키) / AI API authentication failed (invalid API key)
- **E_AI_002**: AI API 요청 제한 초과 (rate limit) / AI API rate limit exceeded
- **E_AI_003**: AI API 응답 파싱 실패 / AI API response parsing failed

- **E_NAVER_001**: 네이버 검색 API 인증 실패 / Naver Search API authentication failed
- **E_NAVER_002**: 네이버 API 속도 제한 초과 / Naver API rate limit exceeded
- **E_NAVER_003**: 검색 결과 없음 (검색량 0) / No search results (volume 0)

- **E_DB_001**: 데이터베이스 연결 실패 / Database connection failed
- **E_DB_002**: 쿼리 실행 타임아웃 / Query execution timeout
- **E_DB_003**: 중복 키 에러 / Duplicate key error

- **E_PIPELINE_001**: L1 → L2 데이터 전달 실패 (스키마 불일치) / L1 → L2 data transfer failed (schema mismatch)
- **E_PIPELINE_002**: 파이프라인 중단 (사용자 취소) / Pipeline interrupted (user cancellation)
- **E_PIPELINE_003**: 메모리 부족 (2GB 초과) / Out of memory (exceeded 2GB)

### Retry Strategy
### 재시도 전략

| 에러 유형 / Error Type | 재시도 횟수 / Retry Count | 재시도 간격 / Retry Interval | 전략 / Strategy |
|----------------------|--------------------------|------------------------------|----------------|
| 네트워크 타임아웃 / Network timeout | 3 | 2s, 4s, 8s | Exponential backoff |
| AI API 속도 제한 / AI API rate limit | 3 | 10s, 20s, 40s | Exponential backoff with jitter |
| 네이버 API 속도 제한 / Naver API rate limit | 5 | 5s, 10s, 20s, 40s, 80s | Exponential backoff |
| 데이터베이스 연결 / DB connection | 3 | 1s, 2s, 4s | Exponential backoff |
| 데이터 파싱 실패 / Data parsing failure | 0 | N/A | No retry (fail fast) |

### Error Recovery Workflow
### 에러 복구 워크플로우

1. **에러 감지 / Error Detection**: 예외 발생 또는 응답 상태 코드 확인
2. **에러 분류 / Error Classification**: 에러 코드 매핑 및 재시도 가능 여부 판단
3. **재시도 또는 즉시 실패 / Retry or Fail**: 재시도 전략 적용 또는 사용자에게 에러 보고
4. **로깅 / Logging**: 구조화된 JSON 로그 출력 (에러 코드, 메시지, 컨텍스트)
5. **사용자 피드백 / User Feedback**: 복구 가이드와 함께 에러 메시지 표시

### Example Error Messages
### 에러 메시지 예시

```json
{
  "code": "E_AI_002",
  "message_ko": "AI API 요청 제한을 초과했습니다. 잠시 후 다시 시도해주세요.",
  "message_en": "AI API rate limit exceeded. Please try again later.",
  "recoveryGuide_ko": "1. 1분 대기 후 재시도\n2. API 키의 할당량 확인\n3. Mock 모드로 테스트 진행",
  "recoveryGuide_en": "1. Wait 1 minute and retry\n2. Check API key quota\n3. Proceed with Mock mode testing",
  "timestamp": "2025-11-09T10:30:45Z",
  "context": {
    "placeId": "12345",
    "stage": "L2",
    "requestCount": 150
  }
}
```

## Out of Scope
## 범위 외 항목

다음 기능들은 현재 프로젝트 범위에 포함되지 않습니다:
The following features are NOT included in current project scope:

- **네이버 플레이스 계정 자동 로그인 및 설정 자동 변경**: 사용자가 직접 네이버 플레이스 관리자 페이지에서 키워드를 적용해야 합니다. 자동화는 법적/보안 이슈가 있을 수 있습니다.
- **Naver Place account auto-login and automatic settings modification**: Users must manually apply keywords in Naver Place admin page. Automation may have legal/security issues.

- **경쟁사 매장 자동 분석 및 비교**: 타 매장 데이터 수집은 네이버 이용약관 위반 가능성이 있으며, 윤리적 문제가 발생할 수 있습니다.
- **Competitor store automatic analysis and comparison**: Collecting other stores' data may violate Naver terms of service and raise ethical concerns.

- **결제 시스템 연동 및 유료 구독 모델**: 현재는 로컬 실행 도구로만 제공됩니다. 향후 SaaS 전환 시 고려될 수 있습니다.
- **Payment system integration and paid subscription model**: Currently provided as local execution tool only. May be considered in future SaaS transition.

- **모바일 앱 개발 (iOS/Android)**: GUI는 웹 브라우저 기반으로만 제공됩니다. 모바일 반응형 UI는 향후 검토될 수 있습니다.
- **Mobile app development (iOS/Android)**: GUI is only provided via web browser. Mobile responsive UI may be considered in future.

- **실시간 검색량 모니터링 및 알림**: 네이버 검색 API는 실시간 데이터를 제공하지 않으며, 주기적 배치 분석만 지원합니다.
- **Real-time search volume monitoring and alerts**: Naver Search API does not provide real-time data, only periodic batch analysis is supported.

- **다중 사용자 협업 기능 (공유, 권한 관리)**: 현재는 단일 사용자 로컬 환경만 지원합니다. 팀 기능은 향후 확장 시 추가될 수 있습니다.
- **Multi-user collaboration features (sharing, permission management)**: Currently supports single-user local environment only. Team features may be added in future expansion.

- **자동 리뷰 생성 또는 조작**: 네이버 리뷰 정책 위반이며 법적 문제를 초래할 수 있습니다.
- **Automatic review generation or manipulation**: Violates Naver review policy and may cause legal issues.

- **블로그/카페 포스팅 자동화**: 네이버 블로그/카페 API 제약 및 스팸 정책 위반 가능성으로 제외됩니다.
- **Blog/cafe posting automation**: Excluded due to Naver blog/cafe API restrictions and potential spam policy violations.

- **SEO 효과 A/B 테스팅**: 네이버 플레이스는 한 번에 하나의 키워드 세트만 설정 가능하므로 A/B 테스트가 불가능합니다.
- **SEO effectiveness A/B testing**: Naver Place allows only one keyword set at a time, making A/B testing impossible.

- **음성 인터페이스 또는 챗봇 UI**: CLI와 GUI 웹 인터페이스로만 제공됩니다.
- **Voice interface or chatbot UI**: Only provided via CLI and GUI web interface.

## Assumptions, Constraints, and Design Decisions
## 가정사항, 제약사항, 설계 결정

### Assumptions (가정사항)
외부 요인에 대한 가정입니다.
Assumptions about external factors.

- 네이버 플레이스 크롤러(Place_Crawler V1)가 이미 구현되어 있고 JSON 형식으로 데이터를 제공합니다.
- Naver Place crawler (Place_Crawler V1) is already implemented and provides data in JSON format.

- 사용자는 유효한 네이버 검색 API 클라이언트 ID와 시크릿을 보유하고 있습니다.
- Users possess valid Naver Search API client ID and secret.

- 사용자는 AI 분석을 위한 OpenAI 또는 Anthropic API 키를 보유하고 있습니다.
- Users possess OpenAI or Anthropic API keys for AI analysis.

- 사용자의 개발 환경은 Node.js 18+ 및 Python 3.10+ 런타임을 지원합니다.
- User's development environment supports Node.js 18+ and Python 3.10+ runtimes.

- 네이버 플레이스 데이터 구조는 크롤러 V1 스펙을 유지하며 호환성이 보장됩니다.
- Naver Place data structure maintains Place_Crawler V1 spec and compatibility is guaranteed.

### Technical Constraints (기술적 제약사항)
시스템이 준수해야 하는 외부 제약입니다.
External constraints that system must comply with.

- **네이버 API 속도 제한**: 초당 10회 요청으로 제한됩니다 (네이버 정책).
- **Naver API rate limit**: Limited to 10 requests per second (Naver policy).

- **AI API 비용**: OpenAI GPT-4는 1K 토큰당 $0.03, Anthropic Claude는 1K 토큰당 $0.015로 과금됩니다.
- **AI API costs**: OpenAI GPT-4 charges $0.03 per 1K tokens, Anthropic Claude charges $0.015 per 1K tokens.

- **브라우저 호환성**: GUI는 Chrome 90+, Firefox 88+, Edge 90+ 이상 버전이 필요합니다.
- **Browser compatibility**: GUI requires Chrome 90+, Firefox 88+, Edge 90+ or higher.

- **OS 호환성**: Windows 10+, macOS 12+, Ubuntu 20.04+ 환경에서만 테스트 및 지원됩니다.
- **OS compatibility**: Only tested and supported on Windows 10+, macOS 12+, Ubuntu 20.04+.

- **메모리 제약**: 100개 매장 동시 처리 시 2GB 메모리를 초과하지 않도록 설계해야 합니다.
- **Memory constraints**: Must be designed not to exceed 2GB memory when processing 100 stores simultaneously.

- **네트워크 타임아웃**: 크롤링 및 API 요청은 30초 타임아웃을 준수해야 합니다.
- **Network timeout**: Crawling and API requests must comply with 30-second timeout.

### Design Decisions (설계 결정)
아키텍처 및 기술 스택 선택입니다.
Architecture and technology stack choices.

- **프로그래밍 언어**: Python (L1 크롤링, L2 AI 분석) + TypeScript/JavaScript (L3 전략, GUI)
- **Programming languages**: Python (L1 crawling, L2 AI analysis) + TypeScript/JavaScript (L3 strategy, GUI)
  - **이유 / Rationale**: Python은 데이터 처리와 AI 연동에 강점, TypeScript는 웹 UI와 타입 안정성에 강점

- **데이터베이스**: SQLite (기본) 또는 PostgreSQL (선택)
- **Database**: SQLite (default) or PostgreSQL (optional)
  - **이유 / Rationale**: SQLite는 설치 없이 즉시 사용 가능, PostgreSQL은 대규모 데이터 처리에 유리

- **GUI 프레임워크**: React + Vite (프론트엔드) + Express (백엔드 API 서버)
- **GUI framework**: React + Vite (frontend) + Express (backend API server)
  - **이유 / Rationale**: 빠른 개발 속도, 풍부한 생태계, 실시간 로그 스트리밍(SSE) 지원

- **로거**: Winston (Node.js) + Python logging (Python)
- **Logger**: Winston (Node.js) + Python logging (Python)
  - **이유 / Rationale**: 구조화된 JSON 로그 출력, 레벨별 필터링, 파일 및 콘솔 동시 출력

- **설정 관리**: YAML 파일 (local.config.yml) + 환경 변수 (.env)
- **Configuration management**: YAML file (local.config.yml) + environment variables (.env)
  - **이유 / Rationale**: YAML은 가독성이 높고, 환경 변수는 민감 정보(API 키) 보호에 적합

- **파이프라인 아키텍처**: 독립적인 L1/L2/L3 모듈, JSON 파일을 통한 데이터 교환
- **Pipeline architecture**: Independent L1/L2/L3 modules, data exchange via JSON files
  - **이유 / Rationale**: 각 단계를 독립적으로 실행 및 테스트 가능, 느슨한 결합(loose coupling)

- **에러 처리**: Exponential backoff 재시도 + 구조화된 에러 코드 시스템
- **Error handling**: Exponential backoff retry + structured error code system
  - **이유 / Rationale**: API 장애에 강건한 시스템, 사용자 친화적인 에러 메시지

- **테스트 전략**: Mock 모드 지원 (API 키 없이 개발/테스트 가능)
- **Testing strategy**: Mock mode support (development/testing without API keys)
  - **이유 / Rationale**: CI/CD 파이프라인에서 외부 API 의존성 제거, 빠른 테스트 실행

- **배포 방식**: 로컬 실행 도구 (npm/pip 패키지), SaaS 모델은 향후 검토
- **Deployment method**: Local execution tool (npm/pip package), SaaS model to be reviewed in future
  - **이유 / Rationale**: 초기 MVP는 사용자 개인 환경에서 실행, 데이터 프라이버시 보장

- **포트 설정**: GUI 서버는 기본 포트 3000 사용 (설정 파일에서 변경 가능)
- **Port configuration**: GUI server uses default port 3000 (configurable in settings file)
  - **이유 / Rationale**: 표준 개발 포트, 다른 서비스와 충돌 시 설정 파일에서 변경 가능

- **완성도 평가 가중치**: 업종별 차별화된 기본값 제공 (설정 파일에서 커스터마이징 가능)
- **Completeness evaluation weights**: Industry-specific default values provided (customizable in config file)
  - **이유 / Rationale**: 식당은 메뉴 25%, 소매는 제품사진 25% 등 업종 특성 반영

## Risks & Mitigation
## 리스크 및 완화 전략

### Technical Risks
### 기술적 리스크

| 리스크 / Risk | 영향도 / Impact | 확률 / Probability | 완화 전략 / Mitigation |
|--------------|----------------|-------------------|----------------------|
| 네이버 플레이스 HTML 구조 변경으로 크롤러 동작 중단 / Naver Place HTML structure change breaks crawler | High | Medium | 1. 크롤러 V1을 별도 패키지로 분리하여 독립적 업데이트 가능<br>2. HTML 파싱 실패 시 알림 및 매뉴얼 다운로드 가이드 제공<br>3. 주기적 크롤러 상태 모니터링 |
| 네이버 검색 API 정책 변경 또는 키 발급 중단 / Naver Search API policy change or key issuance suspension | High | Low | 1. Mock 모드로 API 없이도 테스트 가능<br>2. 대체 검색량 추정 알고리즘 구현 (Google Trends 기반)<br>3. 사용자에게 API 변경 사항 즉시 공지 |
| AI API 비용 초과로 사용자 부담 증가 / AI API cost overrun increases user burden | Medium | Medium | 1. 요청 전 예상 비용 표시<br>2. 비용 임계값 설정 기능 (예: $10 초과 시 중단)<br>3. 로컬 캐싱으로 중복 요청 방지<br>4. Mock 모드에서 무료 테스트 가능 |
| 대용량 데이터 처리 시 메모리 부족 / Out of memory when processing large datasets | Medium | Low | 1. 배치 처리 시 스트리밍 방식 사용<br>2. 100개 이상 처리 시 자동 청크 분할<br>3. 메모리 사용량 모니터링 및 경고 |
| 크롤러 데이터 파싱 실패 (손상된 JSON) / Crawler data parsing failure (corrupted JSON) | Medium | Medium | 1. JSON 스키마 검증 (JSON Schema)<br>2. 부분 데이터 보존 및 에러 로그 기록<br>3. 사용자에게 원본 데이터 확인 가이드 제공 |
| GUI 서버와 CLI 프로세스 간 통신 실패 / GUI server and CLI process communication failure | Low | Low | 1. Server-Sent Events (SSE) 연결 끊김 시 자동 재연결<br>2. WebSocket 대신 SSE 사용으로 방화벽 이슈 최소화<br>3. 로그 파일을 통한 fallback 모니터링 |

### Business Risks
### 비즈니스 리스크

| 리스크 / Risk | 영향도 / Impact | 확률 / Probability | 완화 전략 / Mitigation |
|--------------|----------------|-------------------|----------------------|
| 네이버 플레이스 SEO 알고리즘 변경으로 키워드 전략 효과 감소 / Naver Place SEO algorithm change reduces keyword strategy effectiveness | High | Medium | 1. 주기적 SEO 트렌드 모니터링 및 알고리즘 업데이트<br>2. 사용자 피드백 수집하여 전략 개선<br>3. A/B 테스트 가이드 제공 (수동) |
| 사용자가 API 키 발급 과정에서 이탈 / Users drop off during API key issuance process | Medium | High | 1. API 키 발급 단계별 가이드 제공 (스크린샷 포함)<br>2. Mock 모드로 API 키 없이 기능 체험 가능<br>3. 동영상 튜토리얼 제공 |
| 경쟁 도구 출시로 시장 점유율 하락 / Market share decline due to competitor tool launch | Medium | Medium | 1. 오픈소스 공개로 커뮤니티 기여 유도<br>2. 차별화 포인트 강화 (업종별 맞춤 전략)<br>3. 빠른 기능 업데이트 및 사용자 요청 반영 |
| 법적 이슈 (네이버 이용약관 위반 가능성) / Legal issues (potential Naver ToS violation) | High | Low | 1. 공개 데이터만 크롤링 (로그인 불필요)<br>2. robots.txt 준수<br>3. 법률 자문을 통한 이용약관 검토<br>4. 사용자에게 책임 소재 명시 (면책 조항) |

### Operational Risks
### 운영 리스크

| 리스크 / Risk | 영향도 / Impact | 확률 / Probability | 완화 전략 / Mitigation |
|--------------|----------------|-------------------|----------------------|
| 사용자 지원 요청 증가로 유지보수 부담 증가 / Maintenance burden increases due to user support requests | Medium | High | 1. 포괄적인 문서화 (README, FAQ, 튜토리얼)<br>2. GitHub Issues를 통한 커뮤니티 지원<br>3. 자주 묻는 질문에 대한 자동 응답 봇 |
| 다양한 OS 환경에서 호환성 이슈 발생 / Compatibility issues arise in diverse OS environments | Medium | Medium | 1. CI/CD에서 Windows/macOS/Linux 자동 테스트<br>2. Docker 컨테이너 제공 (향후)<br>3. OS별 설치 가이드 제공 |
| 크롤러 V1 유지보수 중단으로 의존성 문제 / Dependency issues due to Place_Crawler V1 maintenance discontinuation | High | Low | 1. 크롤러 V1 소스코드 포크 및 자체 유지보수<br>2. 대체 크롤러 개발 계획 수립<br>3. 사용자에게 수동 데이터 입력 옵션 제공 |

### Risk Monitoring Plan
### 리스크 모니터링 계획

- **월간 리뷰**: 네이버 플레이스 정책, API 변경사항, 사용자 피드백 검토
- **Monthly review**: Review Naver Place policies, API changes, and user feedback

- **자동 알림**: 크롤러 실패율 20% 초과 시 개발자에게 알림
- **Automated alerts**: Notify developers when crawler failure rate exceeds 20%

- **사용자 설문**: 분기별 사용자 만족도 조사 및 개선점 수집
- **User surveys**: Quarterly user satisfaction surveys and improvement collection

- **비용 추적**: AI API 사용 비용을 대시보드에 실시간 표시
- **Cost tracking**: Display AI API usage costs in real-time on dashboard
