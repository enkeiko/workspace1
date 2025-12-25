# Collector/Parser v0.4 구현 가이드

## 1. 개요

이 문서는 Collector v0.4를 프로젝트에 통합하고 사용하는 방법을 설명합니다.

---

## 2. 설치 및 설정

### 2.1 의존성 확인

```json
// package.json
{
  "dependencies": {
    "puppeteer": "^21.0.0"
  }
}
```

### 2.2 환경 변수

```bash
# .env
PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
PPTR_HEADLESS_NEW=1
```

---

## 3. 모듈 구조

```
src/modules/
├── crawler/
│   ├── PlaceCrawler.js          # 기존 크롤러 (v0.3)
│   ├── PlaceCrawlerV04.js       # 새 크롤러 (v0.4)
│   └── GraphQLFetcher.js        # GraphQL 수집
├── parser/
│   ├── DataParser.js            # 기존 파서
│   ├── GdidParser.js            # gdid 파싱
│   └── RankFeatureParser.js     # 랭킹 피처 파싱
└── merger/
    └── DataMerger.js            # 데이터 병합
```

---

## 4. 기본 사용법

### 4.1 단일 매장 크롤링

```javascript
import { PlaceCrawlerV04 } from './src/modules/crawler/PlaceCrawlerV04.js';

async function crawlSinglePlace() {
  const crawler = new PlaceCrawlerV04({
    headless: true,
    enableGraphQL: true,
    timeout: 30000,
  });

  try {
    await crawler.initialize();

    const result = await crawler.crawlPlace('1100305155');
    console.log('Result:', result);

    // 신규 필드 접근
    console.log('votedKeywords:', result.ranking.votedKeywords);
    console.log('categoryCodeList:', result.ranking.categoryCodeList);
    console.log('gdid:', result.ranking.gdid);
    console.log('isTableOrder:', result.orderOptions.isTableOrder);
    console.log('lastOrder:', result.operationTime.lastOrder);

  } finally {
    await crawler.close();
  }
}

crawlSinglePlace();
```

### 4.2 배치 크롤링

```javascript
import { PlaceCrawlerV04 } from './src/modules/crawler/PlaceCrawlerV04.js';

async function crawlBatch() {
  const crawler = new PlaceCrawlerV04();
  await crawler.initialize();

  const placeIds = ['1100305155', '37574607', '1946113775'];
  const results = await crawler.crawlBatch(placeIds);

  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.placeId}: ${result.data.basic.name}`);
    } else {
      console.log(`❌ ${result.placeId}: ${result.error}`);
    }
  });

  await crawler.close();
}
```

### 4.3 GraphQL만 사용

```javascript
import { GraphQLFetcher } from './src/modules/crawler/GraphQLFetcher.js';

async function fetchKeywords() {
  const fetcher = new GraphQLFetcher();
  const result = await fetcher.fetchVotedKeywords('1100305155');

  console.log('votedKeywords:', result.votedKeywords);
  console.log('visitPurposes:', result.visitPurposes);
}
```

---

## 5. 설정 옵션

### 5.1 PlaceCrawlerV04 옵션

```javascript
const options = {
  // Puppeteer 설정
  timeout: 30000,              // 페이지 로드 타임아웃 (ms)
  headless: true,              // 헤드리스 모드
  headlessNew: true,           // 새 헤드리스 모드
  userAgent: 'Mozilla/5.0...', // User-Agent
  executablePath: '',          // Chrome 실행 파일 경로
  userDataDir: '',             // 프로필 저장 경로

  // 재시도 설정
  retryAttempts: 3,            // 재시도 횟수
  retryDelay: 2000,            // 재시도 간격 (ms)

  // v0.4 전용
  enableGraphQL: true,         // GraphQL 수집 활성화

  // GraphQL 설정
  graphql: {
    endpoint: 'https://pcmap-api.place.naver.com/graphql',
    timeout: 10000,
    retryAttempts: 2,
  },

  // 병합 설정
  merger: {
    priorityGraphQL: ['votedKeywords', 'visitPurposes'],
    priorityApollo: ['basic', 'menus', 'images'],
  },
};
```

---

## 6. 출력 데이터 구조

### 6.1 전체 구조

```typescript
interface PlaceDataV04 {
  placeId: string;
  crawledAt: string;
  completeness: number;      // 0-100

  // 기존 필드
  basic: {
    id: string;
    name: string;
    category: string;
    address: {
      road: string;
      jibun: string;
      detail: string;
    };
    phone: string;
    description: string;
    openingHours: string;
    homepage: string;
    tags: string[];
  };

  menus: MenuItem[];
  reviews: ReviewData;
  images: ImageData[];
  facilities: Facility[];
  payments: string[];

  // 신규 필드 (v0.4)
  ranking: {
    categoryCodeList: string[];
    gdid: {
      raw: string;
      type: 'N1' | 'N2' | 'N3';
      placeId: string;
      isValid: boolean;
    };
    votedKeywords: Array<{
      name: string;
      count: number;
      iconUrl?: string;
    }>;
    visitCategories: Array<{
      name: string;
      count: number;
    }>;
  };

  reviewStats: {
    visitor: {
      total: number;
      withPhoto: number;
      withContent: number;
      averageScore: number;
      scoreDistribution: Record<number, number>;
    };
    blogCafe: number;
  };

  orderOptions: {
    isTableOrder: boolean;
    pickup: boolean;
    delivery: boolean;
    bookingBusinessId: string | null;
    options: Array<{
      type: string;
      available: boolean;
      url?: string;
    }>;
  };

  operationTime: {
    breakTime: Array<{
      start: string;
      end: string;
    }>;
    lastOrder: string | null;
    holiday: string | null;
  };

  // 메타데이터
  _version: '0.4';
  _rawApolloState: object;
}
```

---

## 7. 에러 처리

### 7.1 기본 에러 처리

```javascript
try {
  const result = await crawler.crawlPlace(placeId);
} catch (error) {
  if (error.message.includes('timeout')) {
    console.log('타임아웃 발생 - 재시도 필요');
  } else if (error.message.includes('CircuitBreaker')) {
    console.log('서킷 브레이커 활성화 - 잠시 대기');
  } else {
    console.log('알 수 없는 에러:', error.message);
  }
}
```

### 7.2 GraphQL 실패 시 fallback

```javascript
const crawler = new PlaceCrawlerV04({
  enableGraphQL: true,  // GraphQL 활성화
});

// GraphQL 실패 시 자동으로 Apollo State만 사용
// votedKeywords는 빈 배열로 반환됨
```

---

## 8. 성능 최적화

### 8.1 메모리 관리

```javascript
const crawler = new PlaceCrawlerV04({
  userDataDir: './data/cache/puppeteer-profile',  // 캐시 활용
});
```

### 8.2 Rate Limiting

```javascript
async function crawlWithRateLimit(placeIds, delay = 3000) {
  const results = [];

  for (const placeId of placeIds) {
    const result = await crawler.crawlPlace(placeId);
    results.push(result);

    // 요청 간 딜레이
    await new Promise(r => setTimeout(r, delay));
  }

  return results;
}
```

---

## 9. 테스트 실행

### 9.1 유닛 테스트

```bash
node tests/unit/PlaceCrawlerV04.test.js
```

### 9.2 통합 테스트 (실제 크롤링)

테스트 파일에서 `testPlaceCrawlerIntegration()` 주석을 해제하고 실행:

```javascript
// tests/unit/PlaceCrawlerV04.test.js
await testPlaceCrawlerIntegration();  // 주석 해제
```

---

## 10. 트러블슈팅

### 10.1 Chrome 경로 문제

```bash
# Windows
set PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe

# Mac
export PUPPETEER_EXECUTABLE_PATH=/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome
```

### 10.2 GraphQL 403 에러

```javascript
// User-Agent 변경
const crawler = new PlaceCrawlerV04({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
});
```

### 10.3 데이터 누락

```javascript
// 완성도 확인
const result = await crawler.crawlPlace(placeId);
console.log('Completeness:', result.completeness);

// 검증
const { DataMerger } = require('./src/modules/merger/DataMerger.js');
const merger = new DataMerger();
const validation = merger.validate(result);
console.log('Warnings:', validation.warnings);
```

---

## 11. 참고 사항

- v0.4는 기존 v0.3과 하위 호환성을 유지합니다.
- 신규 필드는 optional이므로 기존 코드에 영향을 주지 않습니다.
- GraphQL 수집은 `enableGraphQL: false`로 비활성화할 수 있습니다.
- 실제 프로덕션에서는 rate limiting을 반드시 적용하세요.

---

**작성일**: 2025-11-20
**버전**: v0.4
