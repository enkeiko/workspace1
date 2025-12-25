# 06. 기술 스택 및 아키텍처 추천

## 1. 성능 요구사항 분석

### 1.1 현재 병목 지점
| 작업 | 현재 방식 | 예상 소요시간 |
|------|----------|--------------|
| 키워드 조합 생성 | 순차 처리 | 1-2초 |
| **순위 검증 (API 호출)** | 순차 처리 | **키워드당 2-3초** |
| 결과 저장 | 파일 I/O | 0.5초 |

> ⚠️ **핵심 병목**: 순위 검증 API 호출 (전체 시간의 95% 이상 차지)

### 1.2 목표 성능
- 100개 키워드 검증: 현재 ~300초 → 목표 **30초 이하**
- 병렬 처리로 **10배 이상 속도 향상**

---

## 2. 언어별 비교 분석

### 2.1 비교 매트릭스

| 기준 | Node.js | Python | Go | C# (.NET) |
|------|---------|--------|-----|-----------|
| **비동기 I/O** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **HTTP 동시성** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **개발 생산성** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **기존 코드 재사용** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **메모리 효율** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **배포 용이성** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

### 2.2 상세 분석

#### **🏆 추천 1순위: Node.js**
```javascript
// 장점: place-keywords-maker-v2와 동일 스택, 비동기 처리 우수
const results = await Promise.all(
  keywords.map(kw => validateRank(kw, { concurrency: 10 }))
);
```

**선택 이유:**
- `place-keywords-maker-v2`와 **동일 언어** → 코드 재사용 극대화
- 이벤트 루프 기반 **네이티브 비동기** 처리
- `p-limit`, `p-queue` 등 동시성 제어 라이브러리 풍부
- Puppeteer/Playwright 크롤링 생태계 최고 수준

#### 추천 2순위: Go
```go
// 장점: 고루틴으로 초경량 동시성
var wg sync.WaitGroup
results := make(chan RankResult, len(keywords))
for _, kw := range keywords {
    wg.Add(1)
    go func(k string) {
        defer wg.Done()
        results <- validateRank(k)
    }(kw)
}
```

**적합 케이스:**
- 대규모 처리 (1000+ 키워드/분)
- 단일 바이너리 배포 필요
- 메모리 효율 극대화 필요

#### 비추천: Python
- GIL(Global Interpreter Lock)로 인한 **진정한 병렬처리 제한**
- asyncio 사용 가능하나 Node.js 대비 복잡
- 기존 place-keywords-maker-v2와 스택 불일치

---

## 3. 추천 아키텍처

### 3.1 Node.js 기반 최적 구조

```
┌─────────────────────────────────────────────────────────────┐
│                      GUI Layer                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Electron / Web Browser (app.html)                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Server (Express)                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │ /keyword/   │ │ /validate/  │ │ /place-data/        │   │
│  │ generate    │ │ batch       │ │ (place-keywords-v2) │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Processing Layer                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Worker Pool (p-queue)                      │   │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │   │
│  │  │Worker 1│ │Worker 2│ │Worker 3│ │Worker N│        │   │
│  │  │ (검증) │ │ (검증) │ │ (검증) │ │ (검증) │        │   │
│  │  └────────┘ └────────┘ └────────┘ └────────┘        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                                 │
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │   SQLite DB     │  │  place-keywords-maker-v2 Data   │   │
│  │  (검증 결과)    │  │     (1차 키워드 소스)           │   │
│  └─────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 핵심 컴포넌트

#### A. 동시성 제어 (Rate Limiting)
```javascript
// src/core/RankValidator.js
const PQueue = require('p-queue');

class RankValidator {
  constructor(options = {}) {
    this.queue = new PQueue({
      concurrency: options.concurrency || 10,  // 동시 요청 수
      interval: 1000,                           // 1초당
      intervalCap: 20                           // 최대 20개 요청
    });
  }

  async validateBatch(keywords, mid) {
    const tasks = keywords.map(kw =>
      this.queue.add(() => this.validateSingle(kw, mid))
    );
    return Promise.all(tasks);
  }

  async validateSingle(keyword, mid) {
    // 네이버 검색 API 호출
    const results = await this.searchNaver(keyword);
    const rank = this.findRank(results, mid);
    return { keyword, rank, timestamp: Date.now() };
  }
}
```

#### B. 캐싱 전략
```javascript
// src/core/CacheManager.js
const NodeCache = require('node-cache');

class CacheManager {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: 3600,      // 1시간 캐시
      checkperiod: 600   // 10분마다 정리
    });
  }

  getCachedRank(keyword, mid) {
    const key = `${keyword}:${mid}`;
    return this.cache.get(key);
  }

  setCachedRank(keyword, mid, rank) {
    const key = `${keyword}:${mid}`;
    this.cache.set(key, { rank, cachedAt: Date.now() });
  }
}
```

#### C. place-keywords-maker-v2 통합
```javascript
// src/adapters/PlaceKeywordsAdapter.js
const path = require('path');
const { StoreDatabase } = require('../../place-keywords-maker-v2/src/database/StoreDatabase');

class PlaceKeywordsAdapter {
  constructor() {
    this.db = new StoreDatabase();
  }

  async getKeywordsForPlace(mid) {
    const store = await this.db.getStore(mid);
    if (!store) return null;

    return {
      CORE: this.extractCore(store),
      LOCATION: this.extractLocation(store),
      MENU: this.extractMenu(store),
      ATTRIBUTE: this.extractAttribute(store),
      SENTIMENT: this.extractSentiment(store)
    };
  }

  extractCore(store) {
    return [
      ...(store.category || []),
      ...(store.seoKeywords || [])
    ].map(k => ({ text: k, source: 'place-keywords-v2' }));
  }
  // ... 기타 추출 메서드
}
```

---

## 4. 성능 최적화 전략

### 4.1 병렬 처리 수준 결정

| 동시성 | 예상 속도 | 리스크 |
|--------|----------|--------|
| 5개 | 60초/100키워드 | 안전 |
| **10개** | **30초/100키워드** | **권장** |
| 20개 | 15초/100키워드 | IP 차단 위험 |
| 50개+ | 빠름 | 높은 차단 위험 |

### 4.2 스마트 배치 전략
```javascript
class SmartBatcher {
  // 1. 우선순위 기반 배치
  prioritizeBatch(keywords) {
    return keywords.sort((a, b) => {
      // T1 키워드 먼저 검증
      const tierOrder = { T1: 0, T2: 1, T3: 2 };
      return tierOrder[a.tier] - tierOrder[b.tier];
    });
  }

  // 2. 조기 종료
  async validateWithEarlyStop(keywords, mid, targetCount = 30) {
    const winners = [];
    for (const batch of this.chunk(keywords, 10)) {
      const results = await this.validateBatch(batch, mid);
      winners.push(...results.filter(r => r.rank <= 5));

      // 목표 달성시 조기 종료
      if (winners.length >= targetCount) break;
    }
    return winners;
  }
}
```

### 4.3 결과 스트리밍
```javascript
// 실시간 결과 전송 (SSE)
app.get('/validate/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');

  const validator = new RankValidator();
  validator.on('result', (result) => {
    res.write(`data: ${JSON.stringify(result)}\n\n`);
  });

  await validator.validateBatch(keywords, mid);
  res.end();
});
```

---

## 5. 구현 로드맵

### Phase 1: 핵심 엔진 (1주)
```
src/
├── core/
│   ├── RankValidator.js      # 순위 검증 엔진
│   ├── KeywordCombinator.js  # 키워드 조합기
│   └── CacheManager.js       # 캐시 관리
├── adapters/
│   └── PlaceKeywordsAdapter.js
└── index.js
```

### Phase 2: API 서버 (3일)
```
src/
├── server/
│   ├── routes/
│   │   ├── keyword.js
│   │   ├── validate.js
│   │   └── place.js
│   └── app.js
```

### Phase 3: GUI 통합 (3일)
- 기존 place-keywords-maker-v2의 app.html 확장
- 또는 Electron 앱으로 패키징

---

## 6. 최종 추천

### 🎯 최종 선택: **Node.js + Express + p-queue**

| 항목 | 선택 |
|------|------|
| **언어** | Node.js 20+ |
| **프레임워크** | Express.js |
| **동시성 제어** | p-queue |
| **HTTP 클라이언트** | got 또는 axios |
| **크롤링** | Playwright (필요시) |
| **캐시** | node-cache |
| **DB** | SQLite (better-sqlite3) |
| **GUI** | 기존 app.html 재사용 |

### 예상 성능 개선
| 항목 | 현재 (.NET) | 개선 후 (Node.js) |
|------|------------|------------------|
| 100 키워드 검증 | ~300초 | **~30초** |
| 동시 처리 | 1개 | 10개 |
| 메모리 사용 | ~200MB | ~100MB |
| 배포 크기 | ~50MB | ~30MB |

---

## 7. 빠른 시작 템플릿

```javascript
// quick-start.js
const PQueue = require('p-queue');
const got = require('got');

const queue = new PQueue({ concurrency: 10 });

async function validateKeyword(keyword, mid) {
  const url = `https://m.search.naver.com/search.naver?query=${encodeURIComponent(keyword)}&where=m_local`;
  const response = await got(url);
  // 순위 파싱 로직...
  return { keyword, rank: findRank(response.body, mid) };
}

async function main() {
  const keywords = ['강남 맛집', '강남 삼겹살', '강남역 고기집'];
  const mid = '1234567890';

  const start = Date.now();
  const results = await Promise.all(
    keywords.map(kw => queue.add(() => validateKeyword(kw, mid)))
  );
  console.log(`완료: ${Date.now() - start}ms`);
  console.log(results.filter(r => r.rank <= 5));
}

main();
```

---

*문서 작성일: 2024년*
*작성자: Claude Code*
