<!--
═══════════════════════════════════════════════════════════════════════════════
SYNC IMPACT REPORT
동기화 영향 보고서
═══════════════════════════════════════════════════════════════════════════════

Version Change: 1.0.1 → 1.1.0 (Simplified principles, added 2 new principles)
버전 변경: 1.0.1 → 1.1.0 (원칙 간소화, 2개 신규 원칙 추가)

Modified Principles:
수정된 원칙:
  - UPDATED: III. Pipeline Architecture → Added DB sharing & CRM integration
  - 업데이트: III. 파이프라인 아키텍처 → DB 공유 및 CRM 연계 추가
  - UPDATED: IV. Observability & Logging → Simplified to principles only
  - 업데이트: IV. 관찰 가능성 & 로깅 → 원칙만 간소화
  - UPDATED: VI. Data Quality & Completeness → Removed specific scores
  - 업데이트: VI. 데이터 품질 & 완성도 → 구체적 점수 제거
  - NEW: VIII. AI & Prompt Management
  - 신규: VIII. AI 및 프롬프트 관리
  - NEW: IX. Performance & API Management
  - 신규: IX. 성능 및 API 관리

Added Sections:
추가된 섹션:
  - Core Principles (9 principles)
  - 핵심 원칙 (9가지 원칙)
  - Code Quality Standards
  - 코드 품질 기준
  - Development Workflow
  - 개발 워크플로우
  - Governance
  - 거버넌스

Templates Requiring Updates:
업데이트 필요 템플릿:
  ⏳ plan-template.md - Need to update constitution check to reference 9 principles
  ⏳ plan-template.md - 9가지 원칙 참조하도록 constitution 체크 업데이트 필요
  ✅ spec-template.md - Already aligned
  ✅ spec-template.md - 이미 정렬됨
  ✅ tasks-template.md - Already aligned
  ✅ tasks-template.md - 이미 정렬됨

Follow-up TODOs:
후속 TODO:
  - None (all placeholders filled)
  - 없음 (모든 플레이스홀더 작성 완료)

═══════════════════════════════════════════════════════════════════════════════
-->

# Naver Place SEO Automation Constitution
# 네이버 플레이스 SEO 자동화 헌법

## Core Principles
## 핵심 원칙

### I. Complete Code First
### I. 완전한 코드 우선

**Every code commit MUST be production-ready and complete.**
**모든 코드 커밋은 프로덕션 준비가 완료되고 완전해야 합니다.**

- ❌ **FORBIDDEN**: TODO comments indicating unfinished functionality
- ❌ **금지**: 미완성 기능을 나타내는 TODO 주석
- ❌ **FORBIDDEN**: Placeholder implementations or stub functions
- ❌ **금지**: 플레이스홀더 구현 또는 스텁 함수
- ✅ **REQUIRED**: Fully functional, testable code with all edge cases handled
- ✅ **필수**: 모든 엣지 케이스를 처리하는 완전히 작동하고 테스트 가능한 코드
- ✅ **REQUIRED**: Empty catch blocks must have explicit error handling or justification
- ✅ **필수**: 빈 catch 블록은 명시적인 에러 처리 또는 정당화가 있어야 함

**Rationale**: Incomplete code creates technical debt and reduces code quality. Every commit should represent a complete, working increment.
**근거**: 불완전한 코드는 기술 부채를 만들고 코드 품질을 낮춥니다. 모든 커밋은 완전하고 작동하는 증분을 나타내야 합니다.

**Enforcement**: Code reviews MUST reject any PR containing TODO comments or incomplete implementations.
**시행**: 코드 리뷰는 TODO 주석이나 불완전한 구현이 포함된 PR을 거부해야 합니다.

### II. Structured Error Handling
### II. 구조화된 에러 처리

**All errors MUST follow a standardized code + logging + recovery pattern.**
**모든 에러는 표준화된 코드 + 로깅 + 복구 패턴을 따라야 합니다.**

- ❌ **FORBIDDEN**: Silent error swallowing (empty catch blocks without logging)
- ❌ **금지**: 조용한 에러 삼키기 (로깅 없는 빈 catch 블록)
- ❌ **FORBIDDEN**: Generic console.log for error reporting
- ❌ **금지**: 에러 보고를 위한 일반적인 console.log
- ✅ **REQUIRED**: Structured error codes following `E_{MODULE}_{NUMBER}` format
- ✅ **필수**: `E_{모듈}_{번호}` 형식을 따르는 구조화된 에러 코드
- ✅ **REQUIRED**: Logger usage (logger.error, logger.warn) instead of console methods
- ✅ **필수**: console 메서드 대신 Logger 사용 (logger.error, logger.warn)
- ✅ **REQUIRED**: Recovery attempts or graceful degradation when possible
- ✅ **필수**: 가능한 경우 복구 시도 또는 우아한 성능 저하

**Error Code Format**:
**에러 코드 형식**:
```javascript
E_{MODULE}_{NUMBER}: Description
E_{모듈}_{번호}: 설명
Examples / 예시:
  E_L1_001: Crawler JSON file not found
  E_L1_001: 크롤러 JSON 파일을 찾을 수 없음
  E_L2_001: Naver API call failed
  E_L2_001: 네이버 API 호출 실패
  E_L3_001: Target keywords missing
  E_L3_001: 목표 키워드 누락
```

**Error Handling Pattern**:
**에러 처리 패턴**:
```javascript
try {
  // Operation
  // 작업
} catch (error) {
  logger.error('❌ Operation failed', {
    errorCode: 'E_L1_001',
    context: { placeId },
    error: error.message
  });

  // Recovery attempt (if possible)
  // 복구 시도 (가능한 경우)
  if (error.message.includes('E_L1_001')) {
    return await retryWithFallback();
  }

  // Propagate if unrecoverable
  // 복구 불가능하면 전파
  throw error;
}
```

**Rationale**: Consistent error handling enables better debugging, monitoring, and recovery. Error codes provide traceability and enable systematic error analysis.
**근거**: 일관된 에러 처리는 더 나은 디버깅, 모니터링 및 복구를 가능하게 합니다. 에러 코드는 추적성을 제공하고 체계적인 에러 분석을 가능하게 합니다.

### III. Pipeline Architecture & System Integration
### III. 파이프라인 아키텍처 및 시스템 통합

**Independent stages sharing common data infrastructure**:
**공통 데이터 인프라를 공유하는 독립적 단계**:

- Three-stage pipeline: L1 (Data Collection) → L2 (Analysis) → L3 (Strategy)
- 3단계 파이프라인: L1 (데이터 수집) → L2 (분석) → L3 (전략)
- Each stage independently executable and testable
- 각 단계는 독립적으로 실행 및 테스트 가능
- Shared normalized database for data consistency
- 데이터 일관성을 위한 공유 정규화 데이터베이스
- Schema designed for future system integrations (CRM, marketing automation)
- 향후 시스템 통합을 위한 스키마 설계 (CRM, 마케팅 자동화)
- Industry-specific attributes managed in extensible tables
- 확장 가능한 테이블에서 관리되는 업종별 속성

**Technology flexibility**:
**기술 유연성**:
- Use appropriate language/tool for each task
- 각 작업에 적합한 언어/도구 사용
- Python and JavaScript both supported
- Python과 JavaScript 모두 지원
- Ensure proper inter-process communication
- 적절한 프로세스 간 통신 보장

**Rationale**: Stage independence enables incremental development and testing. Shared database ensures consistency and prepares for future system integrations. Multi-language support leverages best tools for each task.
**근거**: 단계 독립성은 점진적 개발과 테스트를 가능하게 합니다. 공유 데이터베이스는 일관성을 보장하고 향후 시스템 통합을 준비합니다. 다중 언어 지원은 각 작업에 최적의 도구를 활용합니다.

### IV. Observability & Logging
### IV. 관찰 가능성 & 로깅

**All operations MUST be observable through structured logging**:
**모든 작업은 구조화된 로깅을 통해 관찰 가능해야 함**:

- Use structured logger with appropriate severity levels
- 적절한 심각도 수준의 구조화된 로거 사용
- Real-time log streaming for long-running operations
- 장기 실행 작업을 위한 실시간 로그 스트리밍
- Progress indicators for multi-item processing
- 다중 항목 처리를 위한 진행률 표시
- Visual indicators for operation status
- 작업 상태를 위한 시각적 표시
- Logs persisted for post-analysis
- 사후 분석을 위한 로그 보존

**Rationale**: Structured logging enables monitoring, debugging, and building user confidence through transparency.
**근거**: 구조화된 로깅은 모니터링, 디버깅, 투명성을 통한 사용자 신뢰 구축을 가능하게 합니다.

### V. Configuration Management
### V. 설정 관리

**All paths, API keys, and environment-specific settings MUST be externalized.**
**모든 경로, API 키 및 환경별 설정은 외부화되어야 합니다.**

- ❌ **FORBIDDEN**: Hardcoded file paths in source code
- ❌ **금지**: 소스 코드에 하드코딩된 파일 경로
- ❌ **FORBIDDEN**: API keys or secrets in code or git
- ❌ **금지**: 코드나 git에 API 키 또는 비밀 정보
- ✅ **REQUIRED**: Use `local.config.yml` for project paths
- ✅ **필수**: 프로젝트 경로에 `local.config.yml` 사용
- ✅ **REQUIRED**: Use environment variables for secrets
- ✅ **필수**: 비밀 정보에 환경 변수 사용
- ✅ **REQUIRED**: Provide fallback to Mock mode when API keys unavailable
- ✅ **필수**: API 키를 사용할 수 없을 때 Mock 모드로 대체 제공

**Configuration Hierarchy**:
**설정 계층 구조**:
1. Environment variables (highest priority)
1. 환경 변수 (최우선순위)
2. Command-line arguments
2. 명령줄 인자
3. `local.config.yml`
3. `local.config.yml`
4. Mock/default values (lowest priority)
4. Mock/기본값 (최저 우선순위)

**Mock Mode** (MANDATORY):
**Mock 모드** (필수):
- All API integrations MUST support Mock mode
- 모든 API 통합은 Mock 모드를 지원해야 함
- Mock mode enables testing without real API keys
- Mock 모드는 실제 API 키 없이 테스트를 가능하게 함
- Mock data MUST be realistic and representative
- Mock 데이터는 현실적이고 대표성이 있어야 함

**Rationale**: Externalized configuration enables environment portability, security (no secrets in code), and testing flexibility (Mock mode).
**근거**: 외부화된 설정은 환경 이식성, 보안(코드에 비밀 없음) 및 테스트 유연성(Mock 모드)을 가능하게 합니다.

### VI. Data Quality & Completeness
### VI. 데이터 품질 & 완성도

**Maximize data collection and evaluate quality**:
**데이터 수집 최대화 및 품질 평가**:

- Collect maximum possible data from all available sources
- 가능한 모든 소스에서 최대 데이터 수집
- Weighted scoring system based on data importance
- 데이터 중요도 기반 가중치 평가 시스템
- Industry-specific evaluation criteria
- 업종별 평가 기준
- Quality classification guides processing decisions
- 품질 분류가 처리 결정을 안내
- Scoring weights and thresholds are configurable
- 평가 가중치 및 임계값은 설정 가능

**Industry differentiation**:
**업종별 차별화**:
- Restaurant/Cafe: Emphasize menu, reviews, food photos
- 식당/카페: 메뉴, 리뷰, 음식 사진 강조
- Retail: Emphasize product photos, hours, location accessibility
- 소매: 제품 사진, 영업시간, 위치 접근성 강조
- Professional Services: Emphasize credentials, service descriptions, reviews
- 전문 서비스: 자격, 서비스 설명, 리뷰 강조
- Healthcare: Emphasize specialties, hours, insurance, facilities
- 의료: 전문 분야, 진료시간, 보험, 시설 강조

**Rationale**: Industry-specific scoring reflects real-world SEO factors. Configurable weights allow adaptation. Maximum data collection ensures comprehensive keyword strategy.
**근거**: 업종별 평가는 실제 SEO 요소를 반영합니다. 설정 가능한 가중치는 조정을 허용합니다. 최대 데이터 수집은 포괄적인 키워드 전략을 보장합니다.

### VII. Bilingual Documentation
### VII. 이중 언어 문서화

**All documentation MUST use bilingual format (Korean + English).**
**모든 문서는 이중 언어 형식(한국어 + 영어)을 사용해야 합니다.**

- ✅ **REQUIRED**: Alternate Korean and English line by line
- ✅ **필수**: 한국어와 영어를 한 줄씩 번갈아 작성
- ✅ **REQUIRED**: Apply to all markdown documentation files
- ✅ **필수**: 모든 마크다운 문서 파일에 적용
- 📝 **Applies to**: README, spec.md, plan.md, tasks.md, constitution.md
- 📝 **적용 대상**: README, spec.md, plan.md, tasks.md, constitution.md
- 📝 **Code comments**: Use bilingual format for complex logic explanations
- 📝 **코드 주석**: 복잡한 로직 설명에 이중 언어 형식 사용

**Format Example**:
**형식 예시**:
```markdown
## Section Title
## 섹션 제목

This is a description in English.
이것은 한국어로 된 설명입니다.

- First point in English
- 첫 번째 요점 한국어
- Second point in English
- 두 번째 요점 한국어
```

**Rationale**: Enables accessibility for both Korean and international developers, facilitating collaboration and knowledge transfer.
**근거**: 한국인 개발자와 국제 개발자 모두의 접근성을 보장하여 협업과 지식 전달을 용이하게 합니다.

### VIII. AI & Prompt Management
### VIII. AI 및 프롬프트 관리

**Managed, versioned, and cost-tracked AI usage**:
**관리되고 버전화되며 비용이 추적되는 AI 사용**:

- Prompts stored separately from code
- 프롬프트는 코드와 별도 저장
- Version-controlled prompt templates
- 버전 관리되는 프롬프트 템플릿
- Industry-specific prompt customization
- 업종별 프롬프트 맞춤화
- Track and monitor AI costs
- AI 비용 추적 및 모니터링

**Rationale**: Managed prompts enable rapid iteration and industry customization. Cost tracking prevents budget overruns and enables ROI analysis.
**근거**: 관리된 프롬프트는 신속한 반복과 업종별 맞춤화를 가능하게 합니다. 비용 추적은 예산 초과를 방지하고 ROI 분석을 가능하게 합니다.

### IX. Performance & API Management
### IX. 성능 및 API 관리

**Responsible and sustainable API usage**:
**책임감 있고 지속 가능한 API 사용**:

- Respect external service policies and rate limits
- 외부 서비스 정책 및 속도 제한 준수
- Monitor and manage API costs
- API 비용 모니터링 및 관리
- Implement retry and resilience patterns
- 재시도 및 복원력 패턴 구현
- Track performance metrics for optimization
- 최적화를 위한 성능 메트릭 추적

**Rationale**: Rate limiting prevents service blocking. Cost management ensures sustainable operations. Resilience patterns ensure reliability.
**근거**: 속도 제한은 서비스 차단을 방지합니다. 비용 관리는 지속 가능한 운영을 보장합니다. 복원력 패턴은 신뢰성을 보장합니다.

## Code Quality Standards
## 코드 품질 기준

### Naming Conventions
### 네이밍 규칙

**Files**:
**파일**:
- Kebab-case: `l1-processor.js`, `naver-api.js`
- 케밥 케이스: `l1-processor.js`, `naver-api.js`
- Meaningful: `place-scraper.js` ✅ vs `scraper.js` ❌
- 의미 있게: `place-scraper.js` ✅ vs `scraper.js` ❌

**Variables**:
**변수**:
- camelCase: `placeId`, `currentKeywords`
- 카멜 케이스: `placeId`, `currentKeywords`
- Boolean prefix: `isValid`, `hasError`, `canRetry`
- 불린 접두사: `isValid`, `hasError`, `canRetry`
- Descriptive: `totalPrice` ✅ vs `tp` ❌
- 설명적: `totalPrice` ✅ vs `tp` ❌

**Functions**:
**함수**:
- camelCase: `processData`, `validateInput`
- 카멜 케이스: `processData`, `validateInput`
- Verb-first: `getPlace`, `createKeywords`, `updateScore`
- 동사 우선: `getPlace`, `createKeywords`, `updateScore`
- Clear intent: `parseAddress` ✅ vs `parse` ❌
- 명확한 의도: `parseAddress` ✅ vs `parse` ❌

**Constants**:
**상수**:
- UPPER_SNAKE_CASE: `MAX_RETRIES`, `API_TIMEOUT`
- 대문자 스네이크 케이스: `MAX_RETRIES`, `API_TIMEOUT`
- Explicit: `DEFAULT_LOG_LEVEL` ✅ vs `LEVEL` ❌
- 명시적: `DEFAULT_LOG_LEVEL` ✅ vs `LEVEL` ❌

### File Organization
### 파일 구조

```
project/
├── src/
│   ├── processors/      # L1, L2, L3 processors
│   │                    # L1, L2, L3 프로세서
│   ├── services/        # External API clients (Naver, OpenAI)
│   │                    # 외부 API 클라이언트 (네이버, OpenAI)
│   ├── utils/           # Shared utilities
│   │                    # 공유 유틸리티
│   ├── logger.js        # Logging infrastructure
│   │                    # 로깅 인프라
│   └── main.js          # CLI entry point
│                        # CLI 진입점
├── data/
│   ├── input/           # Input data (read-only in production)
│   │                    # 입력 데이터 (프로덕션에서 읽기 전용)
│   ├── output/          # Generated outputs (l1/, l2/, l3/)
│   │                    # 생성된 출력 (l1/, l2/, l3/)
│   └── logs/            # Log files
│                        # 로그 파일
├── work instruction/    # Detailed documentation
│                        # 상세 문서
└── package.json
```

### Documentation
### 문서화

**JSDoc** (REQUIRED for public functions):
**JSDoc** (공개 함수에 필수):
```javascript
/**
 * Processes place data through L1 pipeline
 * L1 파이프라인을 통해 플레이스 데이터 처리
 *
 * @param {Object} options - Processing options
 * @param {Object} options - 처리 옵션
 * @param {string[]} options.placeIds - Optional place IDs to crawl
 * @param {string[]} options.placeIds - 크롤링할 선택적 플레이스 ID
 * @returns {Promise<Object>} Processing results with summary
 * @returns {Promise<Object>} 요약과 함께 처리 결과
 * @throws {Error} E_L1_001, E_L1_002, E_L1_003
 *
 * @example
 * const result = await processor.process({ placeIds: ['123'] });
 */
```

**Inline Comments** (REQUIRED for complex logic):
**인라인 주석** (복잡한 로직에 필수):
```javascript
// Keyword scoring formula:
// 키워드 점수 계산 공식:
// 1. Base score from search volume (normalized 0-1)
// 1. 검색량 기반 점수 (0-1로 정규화)
// 2. AI relevance multiplier (0.5-1.5)
// 2. AI 관련성 곱셈 (0.5-1.5)
// 3. Competition penalty (0.7-1.0)
// 3. 경쟁 페널티 (0.7-1.0)
const score = (volume / maxVolume) * aiRelevance * competitionFactor;
```

## Development Workflow
## 개발 워크플로우

### Feature Development Lifecycle
### 기능 개발 생명주기

```
1. Backlog Creation
1. 백로그 생성
   └─ Document in docscode/backlog/ideas/
   └─ docscode/backlog/ideas/에 문서화

2. Clarification (if needed)
2. 명확화 (필요시)
   └─ Q&A session → docscode/backlog/exploring/
   └─ Q&A 세션 → docscode/backlog/exploring/

3. Specification
3. 명세
   └─ /speckit.specify → .specify/specs/[feature]/spec.md

4. Planning
4. 계획
   └─ /speckit.plan → .specify/specs/[feature]/plan.md

5. Task Generation
5. 작업 생성
   └─ /speckit.tasks → .specify/specs/[feature]/tasks.md

6. Implementation
6. 구현
   └─ /speckit.implement → Execute tasks
   └─ /speckit.implement → 작업 실행

7. Validation
7. 검증
   └─ Test each pipeline stage independently
   └─ 각 파이프라인 단계를 독립적으로 테스트
```

### Commit Standards
### 커밋 표준

**Format**: `<type>(<scope>): <description>`
**형식**: `<타입>(<범위>): <설명>`

**Types**:
**타입**:
- `feat`: New feature (L1, L2, L3 enhancements)
- `feat`: 새 기능 (L1, L2, L3 개선)
- `fix`: Bug fix
- `fix`: 버그 수정
- `refactor`: Code restructuring without behavior change
- `refactor`: 동작 변경 없는 코드 재구성
- `docs`: Documentation updates
- `docs`: 문서 업데이트
- `chore`: Maintenance (dependencies, config)
- `chore`: 유지보수 (의존성, 설정)

**Examples**:
**예시**:
```
feat(l2): add Naver API integration with Mock mode
feat(l2): Mock 모드와 함께 네이버 API 통합 추가
fix(l1): correct address parsing for multi-station locations
fix(l1): 다중 역 위치에 대한 주소 파싱 수정
docs(constitution): add data quality scoring guidelines
docs(constitution): 데이터 품질 평가 가이드라인 추가
refactor(logger): extract SSE streaming to separate module
refactor(logger): SSE 스트리밍을 별도 모듈로 추출
```

### Testing Requirements
### 테스트 요구사항

**Manual Testing** (REQUIRED for each PR):
**수동 테스트** (각 PR에 필수):
- Run affected pipeline stage(s)
- 영향 받는 파이프라인 단계 실행
- Verify output file structure and content
- 출력 파일 구조 및 내용 검증
- Check logs for errors/warnings
- 에러/경고에 대한 로그 확인
- Test with both real and Mock data (if applicable)
- 실제 및 Mock 데이터 둘 다로 테스트 (해당되는 경우)

**Integration Testing** (REQUIRED for pipeline changes):
**통합 테스트** (파이프라인 변경에 필수):
- Run full pipeline (L1 → L2 → L3)
- 전체 파이프라인 실행 (L1 → L2 → L3)
- Verify stage-to-stage data flow
- 단계 간 데이터 흐름 검증
- Confirm no data loss or corruption
- 데이터 손실이나 손상이 없음을 확인

**Edge Cases** (REQUIRED):
**엣지 케이스** (필수):
- Empty input data
- 빈 입력 데이터
- Missing optional fields
- 선택적 필드 누락
- API failures (timeout, rate limit)
- API 실패 (타임아웃, 속도 제한)
- Invalid user input
- 유효하지 않은 사용자 입력

### Code Review Checklist
### 코드 리뷰 체크리스트

- [ ] No TODO comments or incomplete code
- [ ] TODO 주석이나 불완전한 코드 없음
- [ ] Structured error handling with error codes
- [ ] 에러 코드를 사용한 구조화된 에러 처리
- [ ] Logger usage (no console.log/error)
- [ ] Logger 사용 (console.log/error 없음)
- [ ] Configuration externalized (no hardcoded paths/secrets)
- [ ] 설정 외부화 (하드코딩된 경로/비밀 없음)
- [ ] JSDoc for public functions
- [ ] 공개 함수에 JSDoc
- [ ] Inline comments for complex logic
- [ ] 복잡한 로직에 인라인 주석
- [ ] Naming conventions followed
- [ ] 네이밍 규칙 준수
- [ ] Tested with real and Mock data
- [ ] 실제 및 Mock 데이터로 테스트
- [ ] Output files validated
- [ ] 출력 파일 검증
- [ ] Logs reviewed for quality
- [ ] 품질에 대한 로그 검토
- [ ] Bilingual documentation (Korean + English)
- [ ] 이중 언어 문서화 (한국어 + 영어)

## Governance
## 거버넌스

### Amendment Procedure
### 수정 절차

1. **Proposal**: Document proposed change with rationale
1. **제안**: 근거와 함께 제안된 변경 사항 문서화
2. **Discussion**: Review impact on existing code and processes
2. **토론**: 기존 코드 및 프로세스에 대한 영향 검토
3. **Approval**: Require explicit approval (from project owner or team lead)
3. **승인**: 명시적 승인 필요 (프로젝트 소유자 또는 팀 리더로부터)
4. **Version Bump**:
4. **버전 증가**:
   - **MAJOR**: Removing/redefining core principle (backward incompatible)
   - **MAJOR**: 핵심 원칙 제거/재정의 (하위 호환 불가)
   - **MINOR**: Adding new principle or section
   - **MINOR**: 새 원칙 또는 섹션 추가
   - **PATCH**: Clarifications, wording improvements
   - **PATCH**: 명확화, 문구 개선
5. **Update Propagation**: Update all dependent templates and documentation
5. **업데이트 전파**: 모든 의존 템플릿 및 문서 업데이트
6. **Announcement**: Communicate changes to all contributors
6. **공지**: 모든 기여자에게 변경 사항 전달

### Constitution Supremacy
### 헌법 우위

- This constitution supersedes all other practices not explicitly documented here
- 이 헌법은 여기에 명시적으로 문서화되지 않은 다른 모든 관행보다 우선합니다
- When in doubt, constitution principles take precedence
- 의심스러울 때는 헌법 원칙이 우선합니다
- Deviations MUST be documented and justified in code reviews
- 편차는 코드 리뷰에서 문서화되고 정당화되어야 합니다

### Complexity Justification
### 복잡도 정당화

Any violation of constitution principles MUST be explicitly justified:
헌법 원칙의 모든 위반은 명시적으로 정당화되어야 합니다:
- Document the specific need
- 특정 필요성 문서화
- Explain why simpler approach is insufficient
- 더 간단한 접근 방식이 불충분한 이유 설명
- Include mitigation plan to reduce complexity
- 복잡도를 줄이기 위한 완화 계획 포함

**Example**:
**예시**:
```markdown
## Complexity Tracking (in plan.md)
## 복잡도 추적 (plan.md 내)

| Violation | Why Needed | Simpler Alternative Rejected Because |
| 위반 | 필요 이유 | 더 간단한 대안이 거부된 이유 |
|-----------|------------|-------------------------------------|
| Hardcoded API endpoint | External API change frequency | Config file adds unnecessary indirection for stable endpoint |
| 하드코딩된 API 엔드포인트 | 외부 API 변경 빈도 | 안정적인 엔드포인트에 대해 설정 파일이 불필요한 간접 참조 추가 |
```

### Runtime Guidance
### 런타임 가이드

For day-to-day development guidance, refer to:
일상적인 개발 가이드는 다음을 참조하세요:
- `docscode/rules/@CONVENTIONS.md` - Detailed coding standards
- `docscode/rules/@CONVENTIONS.md` - 상세한 코딩 표준
- `docscode/rules/@ERROR_CODES.md` - Complete error code reference
- `docscode/rules/@ERROR_CODES.md` - 완전한 에러 코드 참조
- `work instruction/master.md` - Pipeline architecture details
- `work instruction/master.md` - 파이프라인 아키텍처 상세 정보
- `work instruction/l1.md`, `l2.md`, `l3.md` - Stage-specific guides
- `work instruction/l1.md`, `l2.md`, `l3.md` - 단계별 가이드

**Version**: 1.1.0 | **Ratified**: 2025-11-08 | **Last Amended**: 2025-11-09
**버전**: 1.1.0 | **비준**: 2025-11-08 | **최종 수정**: 2025-11-09
