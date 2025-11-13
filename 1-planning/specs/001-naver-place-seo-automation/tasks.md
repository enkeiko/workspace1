# Implementation Tasks: Naver Place SEO Automation

**Feature Branch**: `001-naver-place-seo-automation`
**Generated**: 2025-11-11
**Based on**: [spec.md](./spec.md) | [plan.md](./plan.md)

---

## Overview

This document provides an **immediately executable task list** for implementing the Naver Place SEO Automation system. Tasks are organized by user story to enable independent implementation and testing.

**Total Tasks**: 87
**Phases**: 7 (Setup + Foundational + 4 User Stories + Polish)
**MVP Scope**: Phase 1 + Phase 2 + Phase 3 (US1 only)

---

## Implementation Strategy

### Incremental Delivery Approach

1. **Phase 1-3 (MVP)**: Complete L1 data collection pipeline with CLI
   - Delivers immediate value: Users can collect and evaluate store data
   - Independently testable: Input Place ID → Output completeness score

2. **Phase 4**: Add L2 AI keyword analysis
   - Builds on US1 data: Requires completeness score ≥60
   - Independently testable: Input L1 data → Output keyword recommendations

3. **Phase 5**: Add L3 final strategy generation
   - Combines US1+US2: Requires both L1 and L2 outputs
   - Independently testable: Input L2 keywords → Output final strategy

4. **Phase 6**: Add GUI dashboard (optional enhancement)
   - Parallel development: Independent from core pipeline
   - Independently testable: Browser access → Display L1/L2/L3 controls

5. **Phase 7**: Polish and cross-cutting concerns

---

## Task Legend

- `[P]` = Parallelizable (can run concurrently with other `[P]` tasks in same phase)
- `[US#]` = User Story number (maps to spec.md)
- File paths are relative to repository root
- All tasks follow checklist format: `- [ ] [TaskID] [Labels] Description with file path`

---

## Phase 1: Project Setup & Infrastructure

**Goal**: Initialize project structure, configuration, and shared utilities

**Tasks**: 15

### Configuration & Environment

- [ ] T001 Create project root structure with src/, tests/, docs/ directories
- [ ] T002 [P] Initialize Python project with pyproject.toml (Python 3.10+)
- [ ] T003 [P] Initialize Node.js project with package.json (Node 18+)
- [ ] T004 [P] Create .gitignore for Python/Node.js/IDE files
- [ ] T005 [P] Create local.config.yml template with all config sections in config/local.config.yml
- [ ] T006 [P] Create .env.example with API key placeholders
- [ ] T007 [P] Create README.md with project overview and setup instructions

### Logging & Error Handling

- [ ] T008 [P] Implement Python structured logger with JSON output in src/lib/logger.py
- [ ] T009 [P] Implement Node.js Winston logger with JSON output in src/lib/logger.ts
- [ ] T010 [P] Define error code system (E_{MODULE}_{NUMBER}) in docs/error-codes.md
- [ ] T011 [P] Create error handler utilities with retry logic in src/lib/error-handler.py
- [ ] T012 [P] Create error handler utilities with retry logic in src/lib/error-handler.ts

### Database Setup

- [ ] T013 Create database schema with Place, CompletenessScore, KeywordStrategy tables in src/db/schema.sql
- [ ] T014 Implement database connection manager with SQLite/PostgreSQL support in src/db/connection.py
- [ ] T015 Implement database migration utilities in src/db/migrations/

---

## Phase 2: Foundational Components (Blocking Prerequisites)

**Goal**: Build shared components required by all user stories

**Tasks**: 12

### Address Parsing Module

- [ ] T016 Implement address parser extracting city/district/neighborhood/station in src/lib/address-parser.py
- [ ] T017 Create address parser unit tests with Korean address samples in tests/unit/test_address_parser.py

### Industry Classification

- [ ] T018 Implement industry categorizer (restaurant/cafe/retail/professional/healthcare) in src/lib/industry-classifier.py
- [ ] T019 Create industry classifier unit tests with category mappings in tests/unit/test_industry_classifier.py

### Configuration Loader

- [ ] T020 [P] Implement YAML config loader with validation in src/lib/config-loader.py
- [ ] T021 [P] Implement environment variable loader with defaults in src/lib/env-loader.py

### API Client Base Classes

- [ ] T022 [P] Create base API client with retry/timeout/rate-limiting in src/lib/api-client-base.py
- [ ] T023 [P] Create Naver API client wrapper with rate limit handling in src/lib/naver-api-client.py
- [ ] T024 [P] Create AI API client wrapper (OpenAI/Anthropic) in src/lib/ai-api-client.py

### Mock Mode Support

- [ ] T025 [P] Implement mock data generator for Place data in tests/mocks/mock-place-data.py
- [ ] T026 [P] Implement mock API responses for Naver/AI APIs in tests/mocks/mock-api-responses.py
- [ ] T027 Create mock mode configuration flag in config/local.config.yml

---

## Phase 3: User Story 1 - L1 Data Collection & Completeness Evaluation (P1)

**Goal**: Users can collect Naver Place data and evaluate completeness score

**Independent Test**: Input Place ID → Output JSON with completeness score (0-100) and missing items

**Tasks**: 18

### Data Models

- [ ] T028 [P] [US1] Create Place model with placeId/category/address/brandName in src/models/place.py
- [ ] T029 [P] [US1] Create CompletenessScore model with breakdown/missingItems in src/models/completeness.py
- [ ] T030 [P] [US1] Create Address model with structured fields in src/models/address.py

### Crawler Integration

- [ ] T031 [US1] Integrate Place_Crawler V1 as dependency in requirements.txt
- [ ] T032 [US1] Create crawler adapter parsing V1 JSON output in src/services/crawler-adapter.py
- [ ] T033 [US1] Implement crawler data validator with schema validation in src/services/crawler-validator.py
- [ ] T034 [US1] Handle crawler errors (E_CRAWLER_001/002/003) in src/services/crawler-adapter.py

### Completeness Evaluation Engine

- [ ] T035 [US1] Implement industry-specific weight calculator in src/services/completeness-calculator.py
- [ ] T036 [US1] Implement completeness scoring algorithm (0-100) in src/services/completeness-calculator.py
- [ ] T037 [US1] Implement missing items detector with recommendations in src/services/completeness-calculator.py
- [ ] T038 [US1] Create completeness evaluation unit tests with industry samples in tests/unit/test_completeness_calculator.py

### L1 Pipeline Service

- [ ] T039 [US1] Implement L1 pipeline orchestrator in src/services/l1-pipeline.py
- [ ] T040 [US1] Add L1 input validation (Place ID format) in src/services/l1-pipeline.py
- [ ] T041 [US1] Add L1 output JSON serialization in src/services/l1-pipeline.py
- [ ] T042 [US1] Implement L1 batch processing with progress tracking in src/services/l1-batch-processor.py

### CLI Interface

- [ ] T043 [US1] Create L1 CLI command with --place-id argument in src/cli/l1-cli.py
- [ ] T044 [US1] Add L1 CLI batch mode with --input-file in src/cli/l1-cli.py
- [ ] T045 [US1] Implement L1 progress display with real-time logging in src/cli/l1-cli.py

---

## Phase 4: User Story 2 - L2 AI Keyword Analysis (P2)

**Goal**: Users receive AI-analyzed keyword recommendations based on L1 data

**Dependencies**: Requires US1 completion (needs completeness score ≥60)

**Independent Test**: Input L1 JSON (score ≥60) → Output keyword list with priorities

**Tasks**: 16

### Data Models

- [ ] T046 [P] [US2] Create KeywordElement model with type/value/priority/source in src/models/keyword.py
- [ ] T047 [P] [US2] Create PerformanceData model for keyword comparison in src/models/performance.py

### Keyword Extraction

- [ ] T048 [US2] Implement keyword extractor from Place data (category/location/menu/attributes) in src/services/keyword-extractor.py
- [ ] T049 [US2] Create keyword extraction unit tests with menu/review samples in tests/unit/test_keyword_extractor.py

### AI Analysis Service

- [ ] T050 [US2] Load AI prompts from separate files in prompts/l2-keyword-analysis.txt
- [ ] T051 [US2] Implement industry-specific prompt selector in src/services/ai-prompt-selector.py
- [ ] T052 [US2] Implement AI keyword analyzer with API client in src/services/ai-keyword-analyzer.py
- [ ] T053 [US2] Parse AI responses and extract keyword recommendations in src/services/ai-keyword-analyzer.py
- [ ] T054 [US2] Handle AI API errors (E_AI_001/002/003) with fallback in src/services/ai-keyword-analyzer.py
- [ ] T055 [US2] Implement AI cost tracking and logging in src/services/ai-cost-tracker.py

### Keyword Comparison

- [ ] T056 [US2] Implement current keyword performance loader in src/services/keyword-comparator.py
- [ ] T057 [US2] Implement keyword comparison analyzer (old vs new) in src/services/keyword-comparator.py

### L2 Pipeline Service

- [ ] T058 [US2] Implement L2 pipeline orchestrator in src/services/l2-pipeline.py
- [ ] T059 [US2] Add L2 input validation (L1 data + completeness ≥60) in src/services/l2-pipeline.py
- [ ] T060 [US2] Add L2 output JSON serialization with keyword list in src/services/l2-pipeline.py

### CLI Interface

- [ ] T061 [US2] Create L2 CLI command with --l1-output argument in src/cli/l2-cli.py

---

## Phase 5: User Story 3 - L3 Final Keyword Strategy (P3)

**Goal**: Users receive final keyword strategy combining AI + Naver Search data

**Dependencies**: Requires US1 + US2 completion

**Independent Test**: Input L2 keywords → Output final strategy with application guide

**Tasks**: 15

### Data Models

- [ ] T062 [P] [US3] Create KeywordStrategy model with primary/secondary keywords in src/models/keyword-strategy.ts
- [ ] T063 [P] [US3] Create Keyword model with searchVolume/competition/priorityScore in src/models/keyword.ts

### Naver Search API Integration

- [ ] T064 [US3] Implement Naver Search API client for search volume queries in src/services/naver-search-client.ts
- [ ] T065 [US3] Implement search volume fetcher with rate limiting in src/services/search-volume-fetcher.ts
- [ ] T066 [US3] Implement competition analyzer from search results in src/services/competition-analyzer.ts
- [ ] T067 [US3] Handle Naver API errors (E_NAVER_001/002/003) in src/services/naver-search-client.ts

### Keyword Prioritization

- [ ] T068 [US3] Implement keyword scoring algorithm (search volume + competition) in src/services/keyword-scorer.ts
- [ ] T069 [US3] Implement primary/secondary keyword selector in src/services/keyword-selector.ts
- [ ] T070 [US3] Generate keyword selection rationale in src/services/keyword-selector.ts

### Strategy Generation

- [ ] T071 [US3] Implement final strategy generator in src/services/strategy-generator.ts
- [ ] T072 [US3] Generate Naver Place application guide in src/services/application-guide-generator.ts

### L3 Pipeline Service

- [ ] T073 [US3] Implement L3 pipeline orchestrator in src/services/l3-pipeline.ts
- [ ] T074 [US3] Add L3 input validation (L2 keywords + Naver API key) in src/services/l3-pipeline.ts
- [ ] T075 [US3] Add L3 output JSON serialization with final strategy in src/services/l3-pipeline.ts

### CLI Interface

- [ ] T076 [US3] Create L3 CLI command with --l2-output argument in src/cli/l3-cli.ts

---

## Phase 6: User Story 4 - GUI Dashboard (P4)

**Goal**: Users can monitor L1/L2/L3 processes via web dashboard

**Dependencies**: None (can be developed in parallel with US1-3)

**Independent Test**: Start server → Browser displays L1/L2/L3 tabs

**Tasks**: 18

### Backend API Server

- [ ] T077 [P] [US4] Initialize Express server with TypeScript in src/api/server.ts
- [ ] T078 [P] [US4] Create API routes for L1/L2/L3 pipeline execution in src/api/routes/pipeline-routes.ts
- [ ] T079 [P] [US4] Implement Server-Sent Events (SSE) endpoint for log streaming in src/api/routes/sse-routes.ts
- [ ] T080 [P] [US4] Create process manager spawning Python/Node CLI processes in src/api/services/process-manager.ts
- [ ] T081 [P] [US4] Implement log aggregator collecting CLI outputs in src/api/services/log-aggregator.ts

### Frontend React App

- [ ] T082 [P] [US4] Initialize React + Vite project in frontend/ directory
- [ ] T083 [P] [US4] Create main dashboard layout with L1/L2/L3 tabs in frontend/src/components/Dashboard.tsx
- [ ] T084 [P] [US4] Create L1 execution panel with Place ID input in frontend/src/components/L1Panel.tsx
- [ ] T085 [P] [US4] Create L2 execution panel with L1 output selector in frontend/src/components/L2Panel.tsx
- [ ] T086 [P] [US4] Create L3 execution panel with L2 output selector in frontend/src/components/L3Panel.tsx

### Real-time Monitoring

- [ ] T087 [P] [US4] Implement SSE client subscribing to log stream in frontend/src/services/sse-client.ts
- [ ] T088 [P] [US4] Create real-time log display component in frontend/src/components/LogViewer.tsx
- [ ] T089 [P] [US4] Create progress bar component for batch processing in frontend/src/components/ProgressBar.tsx

### Data Visualization

- [ ] T090 [P] [US4] Create completeness score chart (L1 results) in frontend/src/components/CompletenessChart.tsx
- [ ] T091 [P] [US4] Create keyword distribution chart (L2 results) in frontend/src/components/KeywordChart.tsx
- [ ] T092 [P] [US4] Create AI cost tracker display in frontend/src/components/CostTracker.tsx

### GUI Integration

- [ ] T093 [US4] Connect frontend to backend API with error handling in frontend/src/services/api-client.ts
- [ ] T094 [US4] Implement GUI server startup script in package.json

---

## Phase 7: Polish & Cross-Cutting Concerns

**Goal**: Production readiness, documentation, and testing

**Tasks**: 13

### Testing

- [ ] T095 [P] Create integration test for L1 pipeline end-to-end in tests/integration/test_l1_pipeline.py
- [ ] T096 [P] Create integration test for L2 pipeline end-to-end in tests/integration/test_l2_pipeline.py
- [ ] T097 [P] Create integration test for L3 pipeline end-to-end in tests/integration/test_l3_pipeline.ts
- [ ] T098 [P] Create integration test for GUI server in tests/integration/test_gui_server.ts

### Documentation

- [ ] T099 [P] Create user guide for CLI usage in docs/cli-guide.md
- [ ] T100 [P] Create user guide for GUI usage in docs/gui-guide.md
- [ ] T101 [P] Create API key setup guide with screenshots in docs/api-setup.md
- [ ] T102 [P] Create troubleshooting guide with error code reference in docs/troubleshooting.md
- [ ] T103 [P] Update README.md with quick start instructions

### Performance & Optimization

- [ ] T104 Implement memory monitoring for batch processing in src/lib/memory-monitor.py
- [ ] T105 Optimize database queries with indexes in src/db/migrations/002_add_indexes.sql

### Deployment

- [ ] T106 Create installation script for dependencies in scripts/install.sh
- [ ] T107 Create startup script for GUI server in scripts/start-gui.sh

---

## Dependencies & Execution Order

### Story Completion Order

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ← BLOCKING: Required by all user stories
    ↓
    ├─→ Phase 3 (US1: L1 Collection) ← BLOCKING: Required by US2
    │       ↓
    │   Phase 4 (US2: L2 Analysis) ← BLOCKING: Required by US3
    │       ↓
    │   Phase 5 (US3: L3 Strategy)
    │
    └─→ Phase 6 (US4: GUI) ← PARALLEL: Independent from US1-3

Phase 7 (Polish) ← Depends on all above
```

### Critical Path

1. **Setup + Foundational** (Phase 1-2): ~1 week
2. **US1 (L1)** (Phase 3): ~2-3 weeks (BLOCKING)
3. **US2 (L2)** (Phase 4): ~2-3 weeks (BLOCKING)
4. **US3 (L3)** (Phase 5): ~1-2 weeks
5. **US4 (GUI)** (Phase 6): ~2-3 weeks (PARALLEL)
6. **Polish** (Phase 7): ~1 week

**Total Sequential Path**: 7-10 weeks (if US4 runs in parallel)

---

## Parallel Execution Opportunities

### Phase 1: All tasks are parallelizable except T013-T015

**Concurrent Groups**:
- Group A: T002, T003, T004 (project initialization)
- Group B: T005, T006, T007 (configuration files)
- Group C: T008, T009, T010, T011, T012 (logging/error handling)
- Sequential: T001 → T013 → T014 → T015 (database setup)

### Phase 2: Address + Industry + Config + API clients can run in parallel

**Concurrent Groups**:
- Group A: T016-T017 (address parsing)
- Group B: T018-T019 (industry classification)
- Group C: T020-T021 (config loaders)
- Group D: T022-T024 (API clients)
- Group E: T025-T027 (mock mode)

### Phase 3 (US1): Models can be built in parallel

**Concurrent Groups**:
- Group A: T028, T029, T030 (data models)
- Sequential: T031 → T032 → T033 → T034 (crawler integration)
- Sequential: T035 → T036 → T037 → T038 (completeness evaluation)
- Sequential: T039 → T040 → T041 → T042 (L1 pipeline)
- Sequential: T043 → T044 → T045 (CLI)

### Phase 4 (US2): Models + Prompts can be built in parallel

**Concurrent Groups**:
- Group A: T046, T047 (data models)
- Sequential: T048 → T049 (keyword extraction)
- Sequential: T050 → T051 → T052 → T053 → T054 → T055 (AI analysis)
- Sequential: T056 → T057 (comparison)
- Sequential: T058 → T059 → T060 → T061 (L2 pipeline + CLI)

### Phase 5 (US3): Models + API clients can be built in parallel

**Concurrent Groups**:
- Group A: T062, T063 (data models)
- Sequential: T064 → T065 → T066 → T067 (Naver API)
- Sequential: T068 → T069 → T070 (prioritization)
- Sequential: T071 → T072 (strategy generation)
- Sequential: T073 → T074 → T075 → T076 (L3 pipeline + CLI)

### Phase 6 (US4): Backend + Frontend can be built in parallel

**Concurrent Groups**:
- Backend Group: T077-T081 (all parallelizable)
- Frontend Group: T082-T092 (all parallelizable)
- Sequential: T093 → T094 (integration)

### Phase 7: All testing/docs tasks are parallelizable

**Concurrent Groups**:
- Group A: T095-T098 (integration tests)
- Group B: T099-T103 (documentation)
- Sequential: T104 → T105 → T106 → T107 (optimization + deployment)

---

## Independent Testing Criteria

### User Story 1 (L1 Data Collection)

**Test Input**:
```json
{
  "placeId": "1234567890"
}
```

**Expected Output**:
```json
{
  "placeId": "1234567890",
  "completenessScore": {
    "totalScore": 75,
    "breakdown": {
      "basicInfo": 20,
      "menu": 18,
      "photos": 15,
      "reviews": 12,
      "amenities": 10
    },
    "missingItems": ["operating_hours", "price_range"]
  },
  "category": "restaurant",
  "address": {
    "city": "서울시",
    "district": "강남구",
    "neighborhood": "역삼동"
  }
}
```

**Validation**:
- Completeness score is 0-100
- Missing items list is populated if score < 100
- Industry category is valid enum

---

### User Story 2 (L2 AI Analysis)

**Test Input**: L1 output (score ≥60)

**Expected Output**:
```json
{
  "keywords": [
    {
      "type": "category",
      "value": "이탈리안 레스토랑",
      "priority": 10,
      "source": "ai_generated"
    },
    {
      "type": "location",
      "value": "강남역 맛집",
      "priority": 9,
      "source": "ai_generated"
    }
  ],
  "aiCostUSD": 0.05
}
```

**Validation**:
- Keywords have valid types (category/location/menu/attribute)
- Priority is 1-10
- AI cost is tracked

---

### User Story 3 (L3 Final Strategy)

**Test Input**: L2 keywords + Naver API key

**Expected Output**:
```json
{
  "primaryKeywords": [
    {
      "text": "강남 이탈리안",
      "searchVolume": 5400,
      "competition": 0.72,
      "priorityScore": 85,
      "rationale": "High search volume with moderate competition"
    }
  ],
  "secondaryKeywords": [...],
  "applicationGuide": "1. 네이버 플레이스 관리자 로그인\n2. 키워드 설정 메뉴 선택..."
}
```

**Validation**:
- Primary keywords: 3-5 items
- Secondary keywords: 5-10 items
- Application guide is populated

---

### User Story 4 (GUI Dashboard)

**Test Input**: Browser access to http://localhost:3000

**Expected Behavior**:
- L1/L2/L3 tabs are visible
- L1 execution button accepts Place ID input
- Real-time log stream displays when process runs
- Completeness chart renders after L1 completion

**Validation**:
- SSE connection is established
- Progress bar updates in real-time
- Results are displayed visually

---

## MVP Scope Recommendation

**Minimum Viable Product**: Phase 1 + Phase 2 + Phase 3 (US1 only)

**Deliverables**:
- CLI tool for L1 data collection
- Completeness evaluation (0-100 score)
- Missing items identification
- Batch processing support
- Basic error handling and logging

**Why this MVP**:
- Provides immediate value: Users can assess their current Naver Place data quality
- Independently testable and deployable
- Establishes foundational pipeline architecture
- Low risk: No external AI/Naver API dependencies required (can use Mock mode)

**Next Increments**:
1. **Increment 2**: Add Phase 4 (US2: AI keyword analysis)
2. **Increment 3**: Add Phase 5 (US3: Final strategy generation)
3. **Increment 4**: Add Phase 6 (US4: GUI dashboard)
4. **Increment 5**: Add Phase 7 (Polish)

---

## Format Validation

All tasks follow the required checklist format:

✅ **Checkbox**: Every task starts with `- [ ]`
✅ **Task ID**: Sequential T001-T107
✅ **[P] marker**: Applied to parallelizable tasks
✅ **[Story] label**: Applied to US1-US4 tasks only
✅ **File paths**: Included in all implementation tasks
✅ **Clear descriptions**: Action-oriented with specific deliverables

---

## Task Summary

| Phase | User Story | Task Count | Parallelizable | Estimated Duration |
|-------|-----------|------------|----------------|-------------------|
| Phase 1 | Setup | 15 | 12 | 1 week |
| Phase 2 | Foundational | 12 | 8 | 1 week |
| Phase 3 | US1 (L1) | 18 | 3 | 2-3 weeks |
| Phase 4 | US2 (L2) | 16 | 2 | 2-3 weeks |
| Phase 5 | US3 (L3) | 15 | 2 | 1-2 weeks |
| Phase 6 | US4 (GUI) | 18 | 16 | 2-3 weeks |
| Phase 7 | Polish | 13 | 9 | 1 week |
| **Total** | | **107** | **52** | **7-11 weeks** |

**Parallel Opportunities**: 52 tasks (48.6%) can run concurrently with proper resource allocation

---

## Next Steps

1. Review this task list with stakeholders
2. Confirm MVP scope (recommend Phase 1-3)
3. Begin Phase 1 setup tasks
4. Execute `/speckit.implement` command to start implementation

**Questions or clarifications?** Refer to [spec.md](./spec.md) for detailed requirements.
