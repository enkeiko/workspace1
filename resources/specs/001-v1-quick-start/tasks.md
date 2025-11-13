---

description: "Task list for quick-start CLI MVP"
---

# Tasks: Naver Place SEO Automation (Quick Start v1)

Input: plan.md, spec.md (user stories), data-model.md, contracts/
Organization: Tasks grouped by user story; P denotes parallelizable tasks

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create project structure per implementation plan (src/, tests/, data/)
- [ ] T002 Initialize Node.js project and pin dependencies in `package.json`
- [ ] T003 [P] Configure Winston logging, error handling, and YAML configuration loader

---

## Phase 2: Foundational (Blocking Prerequisites)

Purpose: Core infrastructure required before any story

- [ ] T004 Implement `src/lib/config.js` (local.config.yml + env overrides)
- [ ] T005 [P] Implement `src/lib/logger.js` structured logging with Winston
- [ ] T006 [P] Implement `src/lib/errors.js` with error codes (E_L{stage}_{NNN})
- [ ] T007 Implement `src/lib/http-client.js` with axios/node-fetch + retry logic
- [ ] T008 Implement `src/lib/ai-client.js` mock provider + `src/lib/prompts/`

Checkpoint: Foundation ready

---

## Phase 3: User Story 1 - Data Collection (Priority: P1)

Goal: Collect store data from Naver Place and output JSON

### T010 [P][US1] Define data models in `src/models/`
- Create `src/models/place.js` (Place, Menu, BlogReview, ImageData interfaces)
- Create `src/models/l1-output.js` (L1DataCollected, L1KeywordElements)
- Add JSDoc type annotations for IDE support

### T011 [US1] Implement V1 Crawler Integration
**File**: `src/crawler/naver-place-crawler.js`

**Implementation Details**:
- Use Playwright for browser automation
- Target URL: `https://m.place.naver.com/place/{placeId}/home`
- Extract `window.__APOLLO_STATE__` from HTML
- Parse Apollo State keys:
  - `PlaceDetailBase:{placeId}` → Basic info
  - `Menu:{placeId}_*` → Menu items
  - `VisitorReview:*` → Review data
  - `Image:*` → Images (categorize by type)
- Bot detection handling:
  - Custom User-Agent: Chrome 131.0.0.0
  - On detection: wait 30 seconds, retry
  - Max 3 retries per place

**Pseudo-code**:
```javascript
async function crawlPlace(placeId) {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();

  // Set custom User-Agent
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0'
  });

  // Navigate and wait for Apollo State
  await page.goto(`https://m.place.naver.com/place/${placeId}/home`);
  await page.waitForSelector('#app-root');

  // Extract Apollo State
  const html = await page.content();
  const apolloMatch = html.match(/window\.__APOLLO_STATE__\s*=\s*({.+?});/s);
  const apolloState = JSON.parse(apolloMatch[1]);

  // Parse data
  const place = parseApolloState(apolloState, placeId);

  await browser.close();
  return place;
}

function parseApolloState(state, placeId) {
  const placeKey = `PlaceDetailBase:${placeId}`;
  const placeData = state[placeKey];

  // Extract menus
  const menus = Object.keys(state)
    .filter(key => key.startsWith(`Menu:${placeId}_`))
    .map(key => {
      const menu = state[key];
      return {
        name: menu.name,
        price: menu.price,
        priceFormatted: menu.priceFormatted,
        description: menu.description || '',
        recommend: menu.recommend || false,
        images: menu.images || []
      };
    });

  // Extract blog reviews
  const blogReviews = Object.keys(state)
    .filter(key => key.startsWith('BlogReview:'))
    .map(key => {
      const review = state[key];
      return {
        id: review.id,
        title: review.title,
        contents: review.contents,
        author: review.author,
        date: review.date,
        url: review.url,
        images: review.images || [],
        tags: review.tags || []
      };
    });

  return {
    id: placeId,
    name: placeData.name,
    category: placeData.category,
    address: placeData.address,
    roadAddress: placeData.roadAddress,
    phone: placeData.phone,
    coordinate: placeData.coordinate,
    menus,
    blogReviews,
    reviewStats: {
      total: placeData.visitorReviewsTotal || 0,
      textTotal: placeData.visitorReviewsTextReviewTotal || 0,
      score: placeData.visitorReviewsScore || 0,
      microReviews: placeData.microReviews || []
    },
    images: categorizeImages(state),
    collectedAt: new Date().toISOString()
  };
}
```

### T012 [US1] Implement L1 Processor
**File**: `src/processors/l1-processor.js`

**Responsibilities**:
1. Load input files:
   - `data/input/place_ids.txt` (one per line)
   - `data/input/current_keywords.json` (optional)
   - `data/input/manual_notes.json` (optional)

2. For each place ID:
   - Call crawler to get place data
   - Load current keywords if exists
   - Load manual notes if exists
   - Validate required fields (id, name, category)
   - Extract keyword elements

3. Generate outputs:
   - `data/output/l1/data_collected_l1.json` (full place data + metadata)
   - `data/output/l1/keyword_elements_l1.json` (extracted elements for L2)
   - `data/output/l1/l1_errors.json` (error log)

**Pseudo-code**:
```javascript
async function processL1(placeIds) {
  const results = {
    dataCollected: {},
    keywordElements: {},
    errors: []
  };

  // Load optional inputs
  const currentKeywords = loadJSON('data/input/current_keywords.json') || {};
  const manualNotes = loadJSON('data/input/manual_notes.json') || {};

  for (const placeId of placeIds) {
    try {
      logger.info(`Processing place ${placeId}`);

      // Crawl place
      const place = await crawlPlace(placeId);

      // Validate
      if (!place.id || !place.name || !place.category) {
        throw new Error('Missing required fields');
      }

      // Build L1 data collected
      results.dataCollected[placeId] = {
        place,
        current_keywords: currentKeywords[placeId] || null,
        manual_notes: manualNotes[placeId] || null,
        metadata: {
          has_current_keywords: !!currentKeywords[placeId],
          has_manual_notes: !!manualNotes[placeId],
          review_count: place.reviewStats.total,
          photo_count: place.images.all.length,
          menu_count: place.menus.length
        }
      };

      // Extract keyword elements
      results.keywordElements[placeId] = extractKeywordElements(
        place,
        currentKeywords[placeId],
        manualNotes[placeId]
      );

      logger.info(`✓ Completed place ${placeId}`);

    } catch (error) {
      logger.error(`✗ Failed place ${placeId}:`, error);
      results.errors.push({
        code: 'E_L1_001',
        placeId,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Write outputs
  writeJSON('data/output/l1/data_collected_l1.json', results.dataCollected);
  writeJSON('data/output/l1/keyword_elements_l1.json', results.keywordElements);
  writeJSON('data/output/l1/l1_errors.json', results.errors);

  return results;
}

function extractKeywordElements(place, currentKeywords, manualNotes) {
  // Parse address for region elements
  const addressParts = parseAddress(place.roadAddress || place.address);

  return {
    core_elements: {
      category: place.category,
      brand_name: place.name
    },
    region_elements: {
      si: addressParts.si,
      gu: addressParts.gu,
      dong: addressParts.dong,
      station: addressParts.station || null
    },
    menu_elements: {
      all_menus: place.menus.map(m => m.name),
      recommended: place.menus.filter(m => m.recommend).map(m => m.name),
      representative: manualNotes?.representative_menu || []
    },
    attribute_elements: {
      facilities: place.facilities?.conveniences || [],
      specialties: manualNotes?.special_notes ? [manualNotes.special_notes] : []
    },
    current_keywords: currentKeywords || null,
    business_context: {
      target_keywords: manualNotes?.target_keywords || [],
      goals: manualNotes?.business_goals || null
    }
  };
}
```

### T013 [US1] CLI `l1` command
**File**: `src/cli/main.js`

**Implementation**:
```javascript
const { Command } = require('commander');
const program = new Command();

program
  .command('l1')
  .description('Run L1 data collection and keyword element extraction')
  .option('-i, --input <file>', 'Input file with place IDs (default: data/input/place_ids.txt)')
  .option('-o, --output <dir>', 'Output directory (default: data/output/l1/)')
  .action(async (options) => {
    const L1Processor = require('../processors/l1-processor');
    const processor = new L1Processor();

    // Load place IDs
    const placeIds = fs.readFileSync(options.input || 'data/input/place_ids.txt', 'utf-8')
      .split('\n')
      .filter(line => line.trim());

    console.log(`Starting L1 processing for ${placeIds.length} places...`);

    // Run processor
    const results = await processor.processL1(placeIds);

    console.log('✓ L1 processing complete');
    console.log(`  Data collected: ${Object.keys(results.dataCollected).length} places`);
    console.log(`  Errors: ${results.errors.length}`);
    console.log(`  Output: ${options.output || 'data/output/l1/'}`);
  });
```

Checkpoint: L1 independently runnable and testable

---

## Phase 4: User Story 2 - AI Keyword Recommendations (Priority: P2)

Goal: Generate keyword candidates with rationales from L1 outputs

### T020 [P][US2] Define L2 models
**File**: `src/models/l2-output.js`

- `KeywordCandidate` (keyword, type, classification, search_volume, competition, relevance_score, rationale)
- `L2KeywordCandidates` (placeId → candidates array)

### T021 [US2] Implement Matrix Generator
**File**: `src/services/keyword-matrix.js`

**Responsibilities**:
- Load L1 keyword elements
- Generate keyword combinations:
  - `{region} + {category}` → "강남 닭갈비"
  - `{region} + {menu}` → "강남역 철판닭갈비"
  - `{category} + {attribute}` → "닭갈비 주차가능"
  - `{brand}` → "히도 강남점"
- Return raw matrix (before filtering)

**Pseudo-code**:
```javascript
function generateKeywordMatrix(elements) {
  const combinations = [];

  // Region + Category
  for (const region of [elements.region_elements.gu, elements.region_elements.dong, elements.region_elements.station]) {
    if (region) {
      combinations.push(`${region} ${elements.core_elements.category}`);
    }
  }

  // Region + Menu
  for (const region of [elements.region_elements.gu, elements.region_elements.station]) {
    if (region) {
      for (const menu of elements.menu_elements.recommended) {
        combinations.push(`${region} ${menu}`);
      }
    }
  }

  // Category + Attribute
  for (const attr of elements.attribute_elements.specialties) {
    combinations.push(`${elements.core_elements.category} ${attr}`);
  }

  // Brand name
  combinations.push(elements.core_elements.brand_name);

  return combinations;
}
```

### T022 [US2] Implement AI Analyzer
**File**: `src/services/l2-analyzer.js`

**Responsibilities**:
- Load keyword matrix
- Call AI (mock or real Claude) to filter and score
- Get search volume from Naver API (mock mode: random 100-10000)
- Select top 15 candidates (10 main, 5 sub)
- Add rationale for each selection

**AI Prompt Template** (`src/lib/prompts/l2-keyword-selection.txt`):
```
당신은 네이버 플레이스 SEO 전문가입니다.

업체 정보:
- 이름: {{brand_name}}
- 카테고리: {{category}}
- 지역: {{region}}
- 대표 메뉴: {{menus}}
- 특징: {{specialties}}

키워드 후보 ({{matrix_size}}개):
{{keyword_matrix}}

작업:
1. 위 키워드 중 SEO 효과가 높은 15개를 선택하세요
2. 각 키워드에 대해:
   - 단기/장기 전략 분류 (short_term / long_term)
   - 주요/보조 분류 (main / sub)
   - 관련성 점수 (0.0-1.0)
   - 선택 이유 (한 문장)

출력 형식 (JSON):
[
  {
    "keyword": "강남 닭갈비",
    "type": "short_term",
    "classification": "main",
    "relevance_score": 0.92,
    "rationale": "높은 검색량과 메뉴 관련성"
  }
]
```

### T023 [US2] CLI `l2` command
```javascript
program
  .command('l2')
  .description('Generate keyword candidates from L1 output')
  .option('-i, --input <dir>', 'L1 output directory (default: data/output/l1/)')
  .option('-o, --output <file>', 'Output file (default: data/output/l2/target_keywords_l2.json)')
  .option('--mock-ai', 'Use mock AI (default: true)')
  .action(async (options) => {
    const L2Analyzer = require('../services/l2-analyzer');

    // Load L1 keyword elements
    const keywordElements = JSON.parse(
      fs.readFileSync(`${options.input || 'data/output/l1'}/keyword_elements_l1.json`)
    );

    const analyzer = new L2Analyzer({ mockAI: options.mockAi !== false });
    const results = await analyzer.generateCandidates(keywordElements);

    // Write output
    fs.writeFileSync(
      options.output || 'data/output/l2/target_keywords_l2.json',
      JSON.stringify(results, null, 2)
    );

    console.log('✓ L2 analysis complete');
    console.log(`  Places processed: ${Object.keys(results).length}`);
  });
```

Checkpoint: L2 independently runnable and testable

---

## Phase 5: User Story 3 - Final Strategy (Priority: P3)

Goal: Combine AI candidates with search metrics to generate final strategy

### T030 [P][US3] Define L3 models
**File**: `src/models/l3-output.js`

- `L3FinalStrategy` (primary_keywords, secondary_keywords, strategy, application_guide)

### T031 [US3] Implement Metrics Provider
**File**: `src/services/naver-metrics.js`

**Mock Mode**:
- Generate random search volume: 100-10000
- Generate random competition: 0.1-0.9

**Real Mode** (Phase 2+):
- Call Naver Search Ads API
- Return actual search volume and competition data

### T032 [US3] Implement Strategy Scorer
**File**: `src/services/l3-strategy.js`

**Scoring Formula**:
```
score = (relevance_score × 0.4) + (search_volume_normalized × 0.3) + ((1 - competition) × 0.3)
```

**Selection**:
- Sort by score descending
- Top 5 → primary_keywords
- Next 10 → secondary_keywords

### T033 [US3] CLI `l3` command
```javascript
program
  .command('l3')
  .description('Generate final keyword strategy from L2 candidates')
  .option('-i, --input <file>', 'L2 candidates file (default: data/output/l2/target_keywords_l2.json)')
  .option('-o, --output <file>', 'Output file (default: data/output/l3/keyword_strategy.json)')
  .action(async (options) => {
    const L3Strategy = require('../services/l3-strategy');

    const candidates = JSON.parse(fs.readFileSync(options.input || 'data/output/l2/target_keywords_l2.json'));

    const strategy = new L3Strategy();
    const results = await strategy.generateStrategy(candidates);

    fs.writeFileSync(
      options.output || 'data/output/l3/keyword_strategy.json',
      JSON.stringify(results, null, 2)
    );

    console.log('✓ L3 strategy generation complete');
  });
```

Checkpoint: L3 independently runnable and testable

---

## Phase 6: GUI Dashboard (Priority: P4, Optional)

### T040 Bootstrap Express Server
**File**: `src/gui/server.js`

**Features**:
- Static file serving (HTML/CSS/JS dashboard)
- REST endpoints:
  - `POST /api/l1/run` → Trigger L1 processing
  - `GET /api/l1/status/:placeId` → Get L1 status
  - `POST /api/l2/run` → Trigger L2 analysis
  - `GET /api/results/:placeId` → Get final strategy
- SSE endpoint:
  - `GET /api/logs/stream` → Real-time Winston log stream

**Pseudo-code**:
```javascript
const express = require('express');
const app = express();

// SSE endpoint for real-time logs
app.get('/api/logs/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Hook into Winston logger
  logger.stream.on('log', (logEntry) => {
    res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
  });
});

// L1 trigger
app.post('/api/l1/run', async (req, res) => {
  const { placeIds } = req.body;
  const processor = new L1Processor();

  // Run in background
  processor.processL1(placeIds).then(results => {
    logger.info('L1 processing complete', { results });
  });

  res.json({ status: 'started' });
});
```

### T041 Dashboard UI
**File**: `src/gui/public/index.html`

**Features**:
- Input: place IDs (textarea)
- Buttons: "Run L1", "Run L2", "Run L3"
- Real-time log display (connected to SSE)
- Results table (place ID, status, keywords)

---

## Phase N: Polish & Docs

- [ ] T050 Update `specs/001-v1-quick-start/quickstart.md` with CLI instructions
- [ ] T051 Write unit tests for key functions (src/tests/)
- [ ] T052 Performance tuning (parallel crawling with Promise.all)
- [ ] T053 Add rate limiting for Naver API calls

---

## Task Dependencies

```
T001 → T002 → T003
       ↓
T004-T008 (Foundational)
       ↓
T010 → T011 → T012 → T013 (L1 complete)
       ↓
T020 → T021 → T022 → T023 (L2 complete)
       ↓
T030 → T031 → T032 → T033 (L3 complete)
       ↓
T040 → T041 (GUI)
       ↓
T050-T053 (Polish)
```

## Estimated Timeline

- Phase 1-2 (Setup + Foundation): 2 days
- Phase 3 (L1): 3-4 days
- Phase 4 (L2): 2-3 days
- Phase 5 (L3): 2 days
- Phase 6 (GUI): 2-3 days
- Phase N (Polish): 1-2 days

**Total**: 12-16 days for MVP

---

**Last Updated**: 2025-11-10
