# Tasks: Naver Place SEO Automation (Quick Start V1)

**Input**: Design documents from `1-planning/specs/001-v1-quick-start/`
**Prerequisites**: plan.md, spec.md, data-model.md, quickstart.md

**Tests**: Not explicitly requested - focusing on manual testing for quick start MVP
**Organization**: Tasks are grouped by user story to enable independent implementation and testing

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Single project structure based on existing Place_Keywords_maker:
- **src/**: Source code
- **data/**: Input/output data
- **tests/**: Future tests (not in Phase 1)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure per plan.md

- [X] T001 Create project directory structure: src/{crawler,processors,services,lib}, data/{input,output,logs}
- [X] T002 Initialize Node.js project with package.json (Node.js 18+, dependencies: playwright, winston, express, js-yaml)
- [X] T003 [P] Create local.config.yml configuration file with default paths and settings
- [X] T004 [P] Create .env.example file for API key templates (OPENAI_API_KEY, ANTHROPIC_API_KEY, NAVER_CLIENT_ID, NAVER_CLIENT_SECRET)
- [X] T005 [P] Setup .gitignore to exclude node_modules, data/output, .env, logs

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Implement Winston structured logger in src/lib/logger.js with debug/info/warn/error levels and file rotation
- [X] T007 [P] Create error code system in src/lib/errors.js with E_L1_XXX, E_L2_XXX, E_L3_XXX, E_SYS_XXX codes and bilingual messages
- [X] T008 [P] Implement config manager in src/services/config-manager.js to load local.config.yml and environment variables
- [X] T009 [P] Create mock Naver Search API client in src/services/naver-api.js with hash-based pseudo-random search volumes
- [X] T010 [P] Create mock AI API client in src/services/ai-api.js with deterministic keyword generation for testing
- [X] T011 [P] Setup prompt templates directory src/lib/prompts/ with restaurant.txt, cafe.txt, default.txt
- [X] T012 Create data validation utilities in src/lib/validators.js for Place, Menu, and required field checks
- [X] T013 Setup Express GUI server scaffold in src/gui-server.js with basic route structure
- [X] T014 Create CLI entry point in src/main.js with command parsing for L1/L2/L3 stages

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Data Collection and Validation (Priority: P1) 🎯 MVP

**Goal**: Store owners can collect their Naver Place data and validate required data items to confirm data is ready for SEO analysis

**Independent Test**: Input store ID → Returns collected data with validation results showing missing required fields

### Implementation for User Story 1

- [X] T015 [P] [US1] Create Place interface and validation in src/lib/validators.js with required fields check (id, name, category)
- [X] T016 [P] [US1] Create ultimate-scraper.js in src/crawler/ with Playwright bot detection evasion (30s wait, auto-retry)
- [X] T017 [P] [US1] Create batch-scraper.js in src/crawler/ for multiple stores with progress indicators
- [X] T018 [US1] Implement Apollo State parser in src/crawler/place-scraper.js to extract menus, reviews, images from window.__APOLLO_STATE__
- [X] T019 [US1] Create L1 processor in src/processors/l1-processor.js to collect data, parse address (si/gu/dong/station), validate required fields
- [X] T020 [US1] Implement data file loading in L1 processor: load current_keywords.json, manual_notes.json from data/input/
- [X] T021 [US1] Add exponential backoff retry logic in L1 processor for bot detection (3 retries, 30s wait)
- [X] T022 [US1] Generate L1 outputs: data/output/l1/data_collected_l1.json and data/output/l1/keyword_elements_l1.json
- [X] T023 [US1] Implement CLI command for L1: node src/main.js l1 --place-id {id} with progress logging
- [X] T024 [US1] Add parallel batch processing support in L1 processor with per-store progress tracking
- [X] T025 [US1] Implement error handling in L1: E_L1_001 (file not found), E_L1_002 (validation failed), E_L1_003 (bot detected)

**Checkpoint**: User Story 1 complete - L1 data collection fully functional and independently testable

---

## Phase 4: User Story 2 - AI-based Keyword Analysis (Priority: P2)

**Goal**: Store owners can receive AI-analyzed optimal keyword recommendations based on collected data to improve Naver search exposure

**Independent Test**: Input L1 data with completeness 60+ → Returns industry-specific keyword list with priorities and search volume predictions

### Implementation for User Story 2

- [ ] T026 [P] [US2] Create keyword matrix generator in src/processors/l2-processor.js combining location + category + menu + attributes
- [ ] T027 [P] [US2] Implement industry-specific prompt loading in L2 processor from src/lib/prompts/ based on place category
- [ ] T028 [US2] Integrate real AI API client (OpenAI/Anthropic) in L2 processor with Mock mode fallback
- [ ] T029 [US2] Implement Naver Search API integration in L2 processor to query search volume and competition with rate limiting (10 req/sec)
- [ ] T030 [US2] Add keyword candidate generation in L2 processor: 50-200 candidates with type (short_term/long_term) and classification (main/sub)
- [ ] T031 [US2] Implement AI keyword analysis in L2 processor with relevance scoring and rationale generation
- [ ] T032 [US2] Generate L2 output: data/output/l2/target_keywords_l2.json with candidates, matrix_size, ai_analysis_used flag
- [ ] T033 [US2] Implement CLI command for L2: node src/main.js l2 --input data/output/l1/data_collected_l1.json
- [ ] T034 [US2] Add current keyword comparison in L2 processor showing improvement expectations vs existing keywords
- [ ] T035 [US2] Implement error handling in L2: E_L2_001 (AI API auth failed), E_L2_002 (rate limit), E_L2_003 (response parsing failed)
- [ ] T036 [US2] Add AI cost tracking placeholder in L2 processor logging estimated token usage

**Checkpoint**: User Story 2 complete - AI keyword analysis fully functional and independently testable

---

## Phase 5: User Story 3 - Final Keyword Strategy Generation (Priority: P3)

**Goal**: Store owners can receive final keyword strategy combining AI recommendations and Naver search data to apply to actual Naver Place settings

**Independent Test**: Input L2 keyword candidates + search data → Returns final keyword set (primary/secondary) with application guide

### Implementation for User Story 3

- [ ] T037 [P] [US3] Create L3 processor in src/processors/l3-processor.js with keyword prioritization logic
- [ ] T038 [US3] Implement keyword scoring algorithm in L3 processor combining search volume, competition, and AI relevance score
- [ ] T039 [US3] Add final keyword selection in L3 processor: top 5 primary keywords, top 10 secondary keywords
- [ ] T040 [US3] Generate strategy recommendations in L3 processor: focus (short_term/long_term/balanced), approach, expected_impact
- [ ] T041 [US3] Create Naver Place application guide generator in L3 processor with step-by-step instructions
- [ ] T042 [US3] Generate L3 output: data/output/l3/keyword_strategy.json with primary_keywords, secondary_keywords, strategy, application_guide
- [ ] T043 [US3] Implement CLI command for L3: node src/main.js l3 --input data/output/l2/target_keywords_l2.json
- [ ] T044 [US3] Add keyword rationale explanations in L3 output for each selected keyword
- [ ] T045 [US3] Implement error handling in L3: E_L3_001 (insufficient candidates), E_L3_002 (scoring failed)

**Checkpoint**: User Story 3 complete - Final strategy generation fully functional and independently testable

---

## Phase 6: User Story 4 - GUI Dashboard Monitoring (Priority: P4)

**Goal**: Store owners can monitor L1/L2/L3 stage progress in real-time through web dashboard and visually analyze results

**Independent Test**: Start local server + browser access → Displays L1 execution button and result charts

### Implementation for User Story 4

- [ ] T046 [P] [US4] Implement SSE log streaming endpoint GET /logs/stream in src/gui-server.js with keep-alive every 30s
- [ ] T047 [P] [US4] Create POST /l1/process endpoint in src/gui-server.js to execute L1 pipeline with real-time logging
- [ ] T048 [P] [US4] Create GET /l1/results endpoint in src/gui-server.js to retrieve L1 output JSON
- [ ] T049 [P] [US4] Create POST /l2/process endpoint in src/gui-server.js to execute L2 pipeline
- [ ] T050 [P] [US4] Create GET /l2/results endpoint in src/gui-server.js to retrieve L2 output JSON
- [ ] T051 [P] [US4] Create POST /l3/process endpoint in src/gui-server.js to execute L3 pipeline
- [ ] T052 [P] [US4] Create GET /l3/results endpoint in src/gui-server.js to retrieve L3 output JSON
- [ ] T053 [P] [US4] Create GET /logs/all endpoint in src/gui-server.js to fetch all logs as JSON
- [ ] T054 [P] [US4] Create POST /logs/clear endpoint in src/gui-server.js to clear log files
- [ ] T055 [P] [US4] Create GET /logs/download endpoint in src/gui-server.js to download logs as file
- [ ] T056 [US4] Integrate Winston logger with SSE streaming in src/lib/logger.js to broadcast log events to connected clients
- [ ] T057 [US4] Create basic HTML GUI interface in src/gui-app.html with L1/L2/L3 tabs and execution buttons
- [ ] T058 [US4] Add real-time log viewer in GUI with SSE connection and auto-scroll
- [ ] T059 [US4] Add progress indicators in GUI showing batch processing status for multiple stores
- [ ] T060 [US4] Implement GUI server startup: node src/gui-server.js listening on port 3000 (configurable)
- [ ] T061 [US4] Add error display in GUI showing error codes and bilingual recovery guides
- [ ] T062 [US4] Create result visualization in GUI: display primary/secondary keywords, scores, search volumes

**Checkpoint**: User Story 4 complete - GUI dashboard fully functional with real-time monitoring

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T063 [P] Create comprehensive README.md with installation, quick start, CLI usage, GUI usage sections (KR/EN)
- [ ] T064 [P] Update quickstart.md with actual CLI commands and example outputs
- [ ] T065 [P] Add code comments for complex logic in Apollo State parsing, keyword matrix generation, priority scoring
- [ ] T066 [P] Create error code reference documentation in docs/ERROR_CODES.md with all E_XXX_XXX codes
- [ ] T067 Validate all CLI commands work end-to-end: L1 → L2 → L3 pipeline
- [ ] T068 Validate GUI server works end-to-end: start server → execute L1/L2/L3 → view results
- [ ] T069 [P] Performance testing: verify 100 stores batch processing stays under 2GB memory
- [ ] T070 [P] Add CLI help text: node src/main.js --help showing all commands and options
- [ ] T071 Code cleanup: remove console.log, ensure all logging uses Winston, remove empty catch blocks
- [ ] T072 Security review: verify API keys stored in .env, no secrets in code, data stays local
- [ ] T073 Create example data files in data/input/ for testing: sample current_keywords.json, manual_notes.json
- [ ] T074 Test Mock mode: verify L1/L2/L3 work without any API keys configured
- [ ] T075 Cross-platform testing: verify runs on Windows 10+, macOS 12+, Ubuntu 20.04+

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion
  - US1 (P1): Can start after Phase 2 - No dependencies on other stories
  - US2 (P2): Can start after Phase 2 - Consumes US1 output but can be developed independently with mock L1 data
  - US3 (P3): Can start after Phase 2 - Consumes US2 output but can be developed independently with mock L2 data
  - US4 (P4): Can start after Phase 2 - Integrates all stories but can be developed in parallel with UI mocks
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Must complete first - provides data foundation for all other stories
- **User Story 2 (P2)**: Depends on US1 output format - but can be developed independently with mock L1 JSON
- **User Story 3 (P3)**: Depends on US2 output format - but can be developed independently with mock L2 JSON
- **User Story 4 (P4)**: Integrates US1/US2/US3 - but can be developed in parallel with API contracts

### Within Each User Story

- **US1**: Crawler components (T015-T018) → Processor (T019-T022) → CLI integration (T023-T025)
- **US2**: Matrix generator (T026) + Prompt loading (T027) → AI integration (T028-T031) → Output generation (T032-T036)
- **US3**: Processor scaffold (T037) → Scoring logic (T038-T041) → Output + CLI (T042-T045)
- **US4**: API endpoints (T046-T055) can run in parallel → Logger integration (T056) → GUI interface (T057-T062)

### Parallel Opportunities

- All Setup tasks (T003, T004, T005) can run in parallel
- Most Foundational tasks (T007-T014) can run in parallel after T006 (logger)
- Within US1: T015, T016, T017 can run in parallel
- Within US2: T026, T027 can run in parallel
- Within US4: All endpoint tasks (T046-T055) can run in parallel
- Polish tasks (T063-T066, T069-T070, T072-T074) can run in parallel

---

## Parallel Example: User Story 1

After Phase 2 completion, these US1 tasks can be parallelized:

```bash
# Create validation and scrapers in parallel:
Task T015: "Create Place interface and validation in src/lib/validators.js"
Task T016: "Create ultimate-scraper.js in src/crawler/"
Task T017: "Create batch-scraper.js in src/crawler/"

# After scrapers complete, implement parser and processor:
Task T018: "Implement Apollo State parser in src/crawler/place-scraper.js"
Task T019: "Create L1 processor in src/processors/l1-processor.js"
```

---

## Parallel Example: User Story 4

All GUI endpoints can be implemented in parallel:

```bash
Task T046: "Implement SSE log streaming endpoint GET /logs/stream"
Task T047: "Create POST /l1/process endpoint"
Task T048: "Create GET /l1/results endpoint"
Task T049: "Create POST /l2/process endpoint"
Task T050: "Create GET /l2/results endpoint"
Task T051: "Create POST /l3/process endpoint"
Task T052: "Create GET /l3/results endpoint"
Task T053: "Create GET /logs/all endpoint"
Task T054: "Create POST /logs/clear endpoint"
Task T055: "Create GET /logs/download endpoint"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T014) - CRITICAL blocker
3. Complete Phase 3: User Story 1 (T015-T025)
4. **STOP and VALIDATE**: Test L1 data collection independently with various Place IDs
5. Deploy/demo L1 CLI if ready

**Rationale**: US1 provides the data foundation. Without reliable data collection, keyword analysis (US2) and strategy generation (US3) cannot function. This is the true MVP.

### Incremental Delivery

1. **Milestone 1**: Setup + Foundational → Foundation ready for development
2. **Milestone 2**: Add User Story 1 → Test independently with 10+ stores → Deploy/Demo (MVP!)
   - Users can now collect and validate their Naver Place data
3. **Milestone 3**: Add User Story 2 → Test independently with L1 outputs → Deploy/Demo
   - Users can now get AI keyword recommendations
4. **Milestone 4**: Add User Story 3 → Test independently with L2 outputs → Deploy/Demo
   - Users can now get final keyword strategies to apply
5. **Milestone 5**: Add User Story 4 → Test GUI end-to-end → Deploy/Demo
   - Users can now use web dashboard for better UX
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers after Phase 2 completion:

1. **Team completes Setup + Foundational together** (critical path)
2. **Once Foundational is done, parallel development:**
   - Developer A: User Story 1 (T015-T025) - Data collection
   - Developer B: User Story 2 (T026-T036) - Keyword analysis (using mock L1 data)
   - Developer C: User Story 3 (T037-T045) - Final strategy (using mock L2 data)
   - Developer D: User Story 4 (T046-T062) - GUI dashboard (using mock APIs)
3. **Integration phase**: Connect real outputs after each story completes independently
4. Stories complete and integrate independently

---

## Task Summary

- **Total Tasks**: 75
- **Phase 1 (Setup)**: 5 tasks
- **Phase 2 (Foundational)**: 9 tasks (CRITICAL - blocks all user stories)
- **Phase 3 (US1 - Data Collection)**: 11 tasks
- **Phase 4 (US2 - AI Analysis)**: 11 tasks
- **Phase 5 (US3 - Final Strategy)**: 9 tasks
- **Phase 6 (US4 - GUI Dashboard)**: 17 tasks
- **Phase 7 (Polish)**: 13 tasks

### Parallel Opportunities Identified

- **Setup Phase**: 3 parallel tasks (T003, T004, T005)
- **Foundational Phase**: 8 parallel tasks (T007-T014 after T006)
- **US1 Phase**: 3 parallel tasks (T015, T016, T017)
- **US2 Phase**: 2 parallel tasks (T026, T027)
- **US4 Phase**: 10 parallel tasks (T046-T055)
- **Polish Phase**: 7 parallel tasks (T063-T066, T069, T070, T072-T074)

### Independent Test Criteria

- **US1**: Input Place ID → Outputs validated data with missing fields report → Success if required fields validated
- **US2**: Input L1 data → Outputs keyword candidates with scores → Success if 50+ keywords generated with search volumes
- **US3**: Input L2 candidates → Outputs final strategy with 5 primary + 10 secondary keywords → Success if application guide included
- **US4**: Access http://localhost:3000 → Displays tabs and execute buttons → Success if L1 runs and logs stream in real-time

### Suggested MVP Scope

**Minimum Viable Product**: Phase 1 + Phase 2 + Phase 3 (User Story 1 only)

**Rationale**:
- User Story 1 provides immediate value: store owners can collect and validate their Naver Place data
- Establishes data foundation for all subsequent analysis
- Demonstrates core technical capability (crawling, parsing, validation)
- Can be tested and delivered independently
- Total: 25 tasks (5 + 9 + 11)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Tests are optional for this quick start - focusing on manual validation
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Mock mode (AI + Naver API) ensures development can proceed without API keys
- All tasks follow constitution principles: complete code, structured errors, pipeline architecture
- File paths based on plan.md structure: single project with src/ at repository root

---

**Last Updated**: 2025-11-12
**Generated by**: /speckit.tasks command
**Feature**: Naver Place SEO Automation V1 Quick Start
