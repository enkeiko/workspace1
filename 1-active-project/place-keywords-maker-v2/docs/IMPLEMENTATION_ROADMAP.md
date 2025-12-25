# V2.1 구현 로드맵 - 우선순위별 실행 가이드
**작성일**: 2025-11-14
**버전**: 2.1.0
**예상 기간**: 4주 (주당 20-30시간)

---

## 📋 전체 개요

### 목표
가이드북 v1.1 기반으로 L1 크롤링 및 데이터 수집의 **정교함과 사용성을 극대화**

### 4주 일정
```
Week 1: Apollo State 파싱 + 핵심 크롤링
Week 2: 지역/키워드 파싱 + 완성도 평가
Week 3: 저장 최적화 + 캐싱 + 검증
Week 4: GUI 연동 + 테스트 + 문서화
```

### 산출물
✅ PlaceCrawler (완전 구현)
✅ DataParser (115점 만점 평가)
✅ AddressParser (신규)
✅ KeywordClassifier (신규)
✅ StorageManager (신규)
✅ CacheManager (신규)
✅ 통합 테스트 (70% 커버리지)

---

## Week 1: 핵심 크롤링 강화

### 🎯 목표
Apollo State 완전 파싱 + 메뉴/리뷰/이미지 수집

### Day 1-2: Apollo State 파싱 기반 구축

#### Task 1.1: PlaceCrawler 업데이트
**파일**: `src/modules/crawler/PlaceCrawler.js`

```javascript
// 1. _crawlPlaceInternal() 메서드 교체
async _crawlPlaceInternal(placeId) {
  const page = await this.browser.newPage();

  try {
    await page.setUserAgent(this.config.userAgent);

    // 페이지 접속 (모바일 URL)
    const url = `https://m.place.naver.com/restaurant/${placeId}/home`;
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: this.config.timeout,
    });

    // Apollo State 추출
    const apolloState = await page.evaluate(() => {
      return window.__APOLLO_STATE__ || {};
    });

    // 디버깅용 저장
    await fs.writeFile(
      `./data/debug/apollo_${placeId}.json`,
      JSON.stringify(apolloState, null, 2)
    );

    // 기본 정보 추출
    const placeKey = `Place:${placeId}`;
    const placeData = apolloState[placeKey] || {};

    return {
      placeId,
      apolloState,
      basic: {
        id: placeData.id || placeId,
        name: placeData.name || '',
        category: placeData.category || '',
        subCategory: placeData.subCategory || '',
        address: placeData.roadAddress || placeData.address || '',
        phone: placeData.phone || '',
        rating: placeData.visitorReviewsScore || 0,
        businessHours: placeData.businessHours || null,
        description: placeData.description || ''
      },
      crawledAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error(`Failed to crawl place ${placeId}:`, error);
    throw error;
  } finally {
    await page.close();
  }
}
```

**테스트**:
```bash
# 실제 Place ID로 테스트
node -e "
  import('./src/modules/crawler/PlaceCrawler.js').then(async ({ PlaceCrawler }) => {
    const crawler = new PlaceCrawler();
    await crawler.initialize();
    const result = await crawler.crawlPlace('1768171911');
    console.log(JSON.stringify(result, null, 2));
    await crawler.close();
  });
"
```

#### Task 1.2: 메뉴 추출 로직
**추가**: `src/modules/crawler/PlaceCrawler.js`

```javascript
/**
 * Apollo State에서 메뉴 추출
 */
_extractMenusFromApollo(apolloState, placeId) {
  const menus = [];

  // Apollo State 키 순회
  Object.keys(apolloState).forEach(key => {
    // Menu: 또는 MenuItem: 키 찾기
    if (key.startsWith('Menu:') || key.startsWith('MenuItem:')) {
      const menuData = apolloState[key];

      // 가격 파싱
      const price = this._parsePrice(menuData.price || menuData.priceStr);

      menus.push({
        id: menuData.id,
        name: menuData.name || '',
        price,
        priceRange: menuData.priceRange || null,
        description: menuData.description || '',
        image: menuData.imageUrl || menuData.image || null,
        isRecommended: menuData.isRecommended || menuData.recommended || false,
        tags: menuData.tags || []
      });
    }
  });

  // 추천 메뉴 우선 정렬 + 최대 50개
  return menus
    .sort((a, b) => (b.isRecommended ? 1 : 0) - (a.isRecommended ? 1 : 0))
    .slice(0, 50);
}

/**
 * 가격 문자열 파싱
 */
_parsePrice(priceStr) {
  if (!priceStr) return null;

  // "4,500원" → 4500
  const cleaned = String(priceStr).replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : null;
}
```

**_crawlPlaceInternal에 추가**:
```javascript
return {
  // ...기존 코드...
  menus: this._extractMenusFromApollo(apolloState, placeId),
  // ...
};
```

**테스트 데이터 확인**:
```bash
# Apollo State에서 Menu 키 찾기
cat ./data/debug/apollo_1768171911.json | jq 'keys[] | select(startswith("Menu"))'
```

### Day 3-4: 블로그 리뷰 수집

#### Task 1.3: 블로그 리뷰 추출
**추가**: `src/modules/crawler/PlaceCrawler.js`

```javascript
/**
 * 블로그 리뷰 전문 추출 (1500자+, 최대 10개)
 */
_extractBlogReviewsFromApollo(apolloState, placeId) {
  const blogReviews = [];

  Object.keys(apolloState).forEach(key => {
    if (key.startsWith('BlogReview:') || key.startsWith('Review:')) {
      const review = apolloState[key];

      // 블로그 리뷰만 필터링
      if (review.type === 'BLOG' || review.source === 'blog') {
        // 1500자 이상만 수집
        if (review.content && review.content.length >= 1500) {
          blogReviews.push({
            id: review.id,
            author: review.author || review.writerNickname || '',
            date: review.createdAt || review.date || '',
            content: review.content,
            url: review.url || review.blogUrl || '',
            hashtags: this._extractHashtags(review.content),
            hasReceipt: review.hasReceiptImage || review.visitReview || false,
            images: review.images || review.imageUrls || []
          });
        }
      }
    }
  });

  // 최신순 정렬, 최대 10개
  return blogReviews
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);
}

/**
 * 해시태그 추출
 */
_extractHashtags(text) {
  if (!text) return [];

  const hashtagRegex = /#[가-힣a-zA-Z0-9_]+/g;
  const matches = text.match(hashtagRegex) || [];
  return [...new Set(matches)]; // 중복 제거
}

/**
 * 리뷰 통계 추출
 */
_extractReviewStats(apolloState, placeId) {
  const placeKey = `Place:${placeId}`;
  const placeData = apolloState[placeKey] || {};

  return {
    total: placeData.reviewCount || placeData.totalReviewCount || 0,
    textReviewCount: placeData.textReviewCount || 0,
    visitReviewCount: placeData.visitReviewCount || 0,
    averageRating: placeData.visitorReviewsScore || placeData.rating || 0
  };
}

/**
 * 짧은 리뷰 요약 (3개)
 */
_extractReviewSummary(apolloState, placeId) {
  const summaries = [];

  Object.keys(apolloState).forEach(key => {
    if (key.startsWith('Review:') && summaries.length < 3) {
      const review = apolloState[key];

      if (review.content && review.content.length < 100) {
        summaries.push(review.content);
      }
    }
  });

  return summaries;
}
```

**_crawlPlaceInternal에 추가**:
```javascript
return {
  // ...
  reviews: {
    stats: this._extractReviewStats(apolloState, placeId),
    blogReviews: this._extractBlogReviewsFromApollo(apolloState, placeId),
    summary: this._extractReviewSummary(apolloState, placeId)
  },
  // ...
};
```

### Day 5: 이미지 수집 및 분류

#### Task 1.4: 이미지 자동 분류
**추가**: `src/modules/crawler/PlaceCrawler.js`

```javascript
/**
 * 이미지 추출 및 자동 분류
 */
_extractAndClassifyImages(apolloState, placeId) {
  const images = [];

  Object.keys(apolloState).forEach(key => {
    if (key.startsWith('Image:') || key.startsWith('Photo:')) {
      const img = apolloState[key];

      images.push({
        url: img.url || img.imageUrl || '',
        description: img.caption || img.description || '',
        category: this._classifyImageCategory(img),
        width: img.width || null,
        height: img.height || null,
        isHighQuality: (img.width >= 1200 && img.height >= 800)
      });
    }
  });

  // 카테고리별 집계
  const categorized = {
    menu: images.filter(i => i.category === 'menu').length,
    interior: images.filter(i => i.category === 'interior').length,
    food: images.filter(i => i.category === 'food').length,
    exterior: images.filter(i => i.category === 'exterior').length,
    service: images.filter(i => i.category === 'service').length
  };

  return {
    total: images.length,
    highQuality: images.filter(i => i.isHighQuality).length,
    categorized,
    images
  };
}

/**
 * 이미지 카테고리 자동 분류
 */
_classifyImageCategory(img) {
  const desc = (img.caption || img.description || '').toLowerCase();
  const tags = (img.tags || []).join(' ').toLowerCase();
  const text = `${desc} ${tags}`;

  // 키워드 기반 분류
  if (/(메뉴|가격|판|price|menu)/i.test(text)) return 'menu';
  if (/(인테리어|내부|좌석|테이블|interior)/i.test(text)) return 'interior';
  if (/(음식|요리|디저트|커피|food|dish)/i.test(text)) return 'food';
  if (/(외관|입구|건물|간판|exterior)/i.test(text)) return 'exterior';
  if (/(서비스|직원|포장|service)/i.test(text)) return 'service';

  return 'food'; // 기본값
}
```

#### Task 1.5: 편의시설 및 결제수단
```javascript
/**
 * 편의시설 추출
 */
_extractFacilities(apolloState, placeId) {
  const placeKey = `Place:${placeId}`;
  const placeData = apolloState[placeKey] || {};

  const facilities = placeData.facilities || placeData.amenities || [];

  return facilities.map(f => {
    if (typeof f === 'string') {
      return { name: f, available: true };
    }
    return {
      name: f.name || f,
      icon: f.icon || null,
      available: f.available !== false
    };
  });
}

/**
 * 결제수단 추출
 */
_extractPayments(apolloState, placeId) {
  const placeKey = `Place:${placeId}`;
  const placeData = apolloState[placeKey] || {};

  return placeData.paymentMethods || placeData.payments || [];
}
```

**최종 _crawlPlaceInternal**:
```javascript
return {
  placeId,
  apolloState, // 디버깅용
  basic: { ... },
  menus: this._extractMenusFromApollo(apolloState, placeId),
  reviews: {
    stats: this._extractReviewStats(apolloState, placeId),
    blogReviews: this._extractBlogReviewsFromApollo(apolloState, placeId),
    summary: this._extractReviewSummary(apolloState, placeId)
  },
  images: this._extractAndClassifyImages(apolloState, placeId),
  facilities: this._extractFacilities(apolloState, placeId),
  payments: this._extractPayments(apolloState, placeId),
  parking: placeData.parkingInfo || null,
  crawledAt: new Date().toISOString()
};
```

### Day 6-7: 테스트 및 디버깅

#### Task 1.6: 단위 테스트 작성
**파일**: `tests/unit/PlaceCrawler.test.js`

```javascript
import { PlaceCrawler } from '../../src/modules/crawler/PlaceCrawler.js';
import { mockApolloState } from '../mocks/apollo-state.mock.js';

describe('PlaceCrawler - Apollo State Parsing', () => {
  let crawler;

  beforeAll(() => {
    crawler = new PlaceCrawler();
  });

  describe('_extractMenusFromApollo', () => {
    test('should extract menus with price', () => {
      const menus = crawler._extractMenusFromApollo(mockApolloState, '1768171911');

      expect(menus.length).toBeGreaterThan(0);
      expect(menus[0]).toHaveProperty('name');
      expect(menus[0]).toHaveProperty('price');
      expect(typeof menus[0].price).toBe('number');
    });

    test('should limit to 50 menus', () => {
      const menus = crawler._extractMenusFromApollo(mockApolloState, '1768171911');
      expect(menus.length).toBeLessThanOrEqual(50);
    });

    test('should prioritize recommended menus', () => {
      const menus = crawler._extractMenusFromApollo(mockApolloState, '1768171911');
      const firstMenu = menus[0];

      if (menus.some(m => m.isRecommended)) {
        expect(firstMenu.isRecommended).toBe(true);
      }
    });
  });

  describe('_extractBlogReviewsFromApollo', () => {
    test('should extract blog reviews (1500+ chars)', () => {
      const reviews = crawler._extractBlogReviewsFromApollo(mockApolloState, '1768171911');

      expect(reviews.length).toBeLessThanOrEqual(10);
      reviews.forEach(review => {
        expect(review.content.length).toBeGreaterThanOrEqual(1500);
        expect(review).toHaveProperty('hashtags');
        expect(Array.isArray(review.hashtags)).toBe(true);
      });
    });
  });

  describe('_extractAndClassifyImages', () => {
    test('should classify images into categories', () => {
      const result = crawler._extractAndClassifyImages(mockApolloState, '1768171911');

      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('categorized');
      expect(result.categorized).toHaveProperty('menu');
      expect(result.categorized).toHaveProperty('interior');
      expect(result.categorized).toHaveProperty('food');
    });
  });
});
```

#### Task 1.7: Mock 데이터 작성
**파일**: `tests/mocks/apollo-state.mock.js`

```javascript
export const mockApolloState = {
  "Place:1768171911": {
    id: "1768171911",
    name: "테스트 카페",
    category: "카페",
    subCategory: "커피전문점",
    roadAddress: "서울특별시 강남구 역삼동 123-45",
    phone: "02-1234-5678",
    visitorReviewsScore: 4.5,
    reviewCount: 1234,
    textReviewCount: 567,
    visitReviewCount: 89,
    facilities: ["WiFi", "주차"],
    paymentMethods: ["카드", "네이버페이"],
    parkingInfo: "주차 가능 (5대)"
  },

  "Menu:menu_001": {
    id: "menu_001",
    name: "아메리카노",
    price: "4,500원",
    description: "신선한 원두로 만든 아메리카노",
    imageUrl: "https://example.com/americano.jpg",
    isRecommended: true
  },

  "Menu:menu_002": {
    id: "menu_002",
    name: "카페라떼",
    price: "5,000원",
    description: "",
    imageUrl: null,
    isRecommended: false
  },

  "BlogReview:review_001": {
    id: "review_001",
    type: "BLOG",
    author: "블로거",
    content: "아메리카노가 정말 맛있었습니다. ".repeat(100), // 1500자+
    createdAt: "2025-01-10T10:00:00Z",
    url: "https://blog.naver.com/test",
    hasReceiptImage: true,
    images: []
  },

  "Image:img_001": {
    url: "https://example.com/menu1.jpg",
    caption: "메뉴판",
    width: 1920,
    height: 1080,
    tags: ["메뉴"]
  },

  "Image:img_002": {
    url: "https://example.com/interior1.jpg",
    caption: "인테리어",
    width: 1200,
    height: 800,
    tags: ["인테리어", "좌석"]
  }
};
```

#### Week 1 완료 기준
```bash
# 1. 테스트 통과
npm test -- PlaceCrawler.test.js

# 2. 실제 크롤링 성공
node scripts/test-crawl.js 1768171911

# 3. 출력 확인
cat ./data/debug/apollo_1768171911.json | jq '.basic, .menus[0], .reviews.stats'
```

---

## Week 2: 지역/키워드 파싱 + 완성도 평가

### 🎯 목표
AddressParser, KeywordClassifier 구현 + 115점 만점 평가

### Day 8-9: AddressParser 구현

#### Task 2.1: AddressParser 생성
**파일**: `src/modules/parser/AddressParser.js` (신규)

전체 코드는 [L1_CRAWLING_ENHANCEMENT_GUIDE.md](./L1_CRAWLING_ENHANCEMENT_GUIDE.md) 참조

**핵심 메서드**:
```javascript
parse(address)         // 주소 파싱
_extractCity()         // 시/도
_extractDistrict()     // 구/군
_extractDong()         // 동/읍/면
_extractStation()      // 역
_normalizeRegion()     // "강남구" → "강남"
```

**테스트**:
```javascript
// tests/unit/AddressParser.test.js
describe('AddressParser', () => {
  const parser = new AddressParser();

  test('should parse full address', () => {
    const result = parser.parse('서울특별시 강남구 역삼동 123-45 (강남역 2번출구)');

    expect(result.city).toBe('서울특별시');
    expect(result.district).toBe('강남구');
    expect(result.dong).toBe('역삼동');
    expect(result.station).toBe('강남역');
    expect(result.normalized.city).toBe('서울');
    expect(result.normalized.district).toBe('강남');
  });

  test('should handle partial address', () => {
    const result = parser.parse('경기도 성남시 분당구');

    expect(result.city).toBe('경기도');
    expect(result.district).toBe('성남시');
    expect(result.dong).toBeNull();
  });
});
```

### Day 10-11: KeywordClassifier 구현

#### Task 2.2: KeywordClassifier 생성
**파일**: `src/modules/parser/KeywordClassifier.js` (신규)

**핵심 메서드**:
```javascript
classify(placeData)         // 5가지 분류
_extractCore()              // 카테고리, 브랜드
_extractLocation()          // 지역 조합
_extractMenu()              // 메뉴, 가격대
_extractAttribute()         // 편의시설, 결제
_extractSentiment()         // 감성 키워드 (리뷰 분석)
```

**테스트**:
```javascript
describe('KeywordClassifier', () => {
  const classifier = new KeywordClassifier();

  test('should classify 5 keyword categories', () => {
    const result = classifier.classify(mockPlaceData);

    expect(result).toHaveProperty('core');
    expect(result).toHaveProperty('location');
    expect(result).toHaveProperty('menu');
    expect(result).toHaveProperty('attribute');
    expect(result).toHaveProperty('sentiment');
  });

  test('should generate location combinations', () => {
    const result = classifier.classify(mockPlaceData);

    expect(result.location).toContain('강남역 카페');
    expect(result.location).toContain('역삼 카페');
  });

  test('should extract sentiment from reviews', () => {
    const result = classifier.classify(mockPlaceData);

    expect(result.sentiment.some(k => k.includes('분위기'))).toBe(true);
  });
});
```

### Day 12-13: 완성도 평가 강화 (115점)

#### Task 2.3: DataParser 업데이트
**파일**: `src/modules/parser/DataParser.js`

**메서드 교체**:
```javascript
calculateCompleteness(parsedData) {
  const breakdown = {
    basic: this._scoreBasicInfo(parsedData),       // 20점
    menus: this._scoreMenus(parsedData),           // 20점
    reviews: this._scoreReviews(parsedData),       // 25점
    images: this._scoreImages(parsedData),         // 15점
    facilities: this._scoreFacilities(parsedData), // 10점
    keywords: this._scoreKeywords(parsedData),     // 15점
    manual: this._scoreManual(parsedData)          // 10점
  };

  const total = Object.values(breakdown).reduce((sum, score) => sum + score, 0);
  const grade = this._getGrade(total);

  return { score: total, grade, breakdown, timestamp: new Date().toISOString() };
}
```

전체 코드는 [L1_CRAWLING_ENHANCEMENT_GUIDE.md](./L1_CRAWLING_ENHANCEMENT_GUIDE.md) 참조

**테스트**:
```javascript
describe('DataParser - Completeness', () => {
  const parser = new DataParser();

  test('should score 115 points max', () => {
    const result = parser.calculateCompleteness(perfectPlaceData);
    expect(result.score).toBeLessThanOrEqual(115);
  });

  test('should grade HIGH for 90+', () => {
    const result = parser.calculateCompleteness(highScorePlaceData);
    expect(result.grade).toBe('HIGH');
  });

  test('should have detailed breakdown', () => {
    const result = parser.calculateCompleteness(mockPlaceData);
    expect(result.breakdown).toHaveProperty('basic');
    expect(result.breakdown).toHaveProperty('menus');
    expect(result.breakdown).toHaveProperty('reviews');
  });
});
```

### Day 14: L1Processor 통합

#### Task 2.4: L1Processor 업데이트
**파일**: `src/modules/processor/L1Processor.js`

**추가**:
```javascript
import { AddressParser } from '../parser/AddressParser.js';
import { KeywordClassifier } from '../parser/KeywordClassifier.js';

export class L1Processor {
  constructor(config) {
    // ...기존 코드...
    this.addressParser = new AddressParser();
    this.keywordClassifier = new KeywordClassifier();
  }

  /**
   * Step 4: 지역 정보 파싱
   */
  parseLocation(data) {
    return data.map(item => {
      if (!item.success) return item;

      const location = this.addressParser.parse(item.data.basic?.address || '');

      return {
        ...item,
        data: {
          ...item.data,
          location
        }
      };
    });
  }

  /**
   * Step 5: 키워드 요소 분류
   */
  classifyKeywords(data) {
    return data.map(item => {
      if (!item.success) return item;

      const keywordElements = this.keywordClassifier.classify(item.data);

      return {
        ...item,
        data: {
          ...item.data,
          keywordElements
        }
      };
    });
  }
}
```

#### Week 2 완료 기준
```bash
# 1. 모든 단위 테스트 통과
npm test

# 2. E2E 테스트
node scripts/test-l1-pipeline.js

# 3. 출력 검증
cat ./data/l1-output/data_collected_l1.json | jq '.places[0].data | {location, keywordElements, completeness}'
```

---

## Week 3: 저장 최적화 + 캐싱 + 검증

### 🎯 목표
StorageManager, CacheManager, SchemaValidator 구현

### Day 15-16: StorageManager

#### Task 3.1: 계층적 저장 구조
**파일**: `src/modules/storage/StorageManager.js` (신규)

전체 코드는 [DATA_COLLECTION_STORAGE_GUIDE.md](./DATA_COLLECTION_STORAGE_GUIDE.md) 참조

**테스트**:
```javascript
describe('StorageManager', () => {
  let storage;

  beforeEach(async () => {
    storage = new StorageManager({ baseDir: './data/test' });
    await storage.initialize();
  });

  test('should save place with date hierarchy', async () => {
    await storage.savePlace('1768171911', mockPlaceData);

    const loaded = await storage.loadPlace('1768171911');
    expect(loaded).toEqual(mockPlaceData);
  });

  test('should archive old data', async () => {
    // 7일 이상 된 데이터 생성
    // ...
    const archived = await storage.archiveOldData(7);
    expect(archived.length).toBeGreaterThan(0);
  });
});
```

### Day 17-18: CacheManager

#### Task 3.2: 2단계 캐싱
**파일**: `src/modules/cache/CacheManager.js` (신규)

**테스트**:
```javascript
describe('CacheManager', () => {
  let cache;

  beforeEach(() => {
    cache = new CacheManager({ cacheDir: './data/test/cache', ttl: 1000 });
  });

  test('should cache and retrieve data', async () => {
    await cache.set('test-key', { value: 123 });
    const result = await cache.get('test-key');
    expect(result.value).toBe(123);
  });

  test('should expire after TTL', async () => {
    await cache.set('test-key', { value: 123 });
    await new Promise(resolve => setTimeout(resolve, 1500));
    const result = await cache.get('test-key');
    expect(result).toBeNull();
  });
});
```

### Day 19-20: SchemaValidator

#### Task 3.3: 데이터 검증
**파일**: `src/modules/validation/SchemaValidator.js` (신규)

```bash
npm install ajv
```

**테스트**:
```javascript
describe('SchemaValidator', () => {
  const validator = new SchemaValidator();

  test('should validate correct place data', () => {
    const result = validator.validate(validPlaceData, 'place');
    expect(result.valid).toBe(true);
  });

  test('should reject invalid data', () => {
    const result = validator.validate(invalidPlaceData, 'place');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

### Day 21: 통합 테스트

#### Task 3.4: E2E 테스트
**파일**: `tests/integration/l1-pipeline-full.test.js`

```javascript
describe('L1 Pipeline E2E', () => {
  test('should complete full 8-step process with storage', async () => {
    const processor = new L1Processor({
      crawler: { headless: true },
      outputDir: './data/test/l1-output'
    });

    const result = await processor.process(['1768171911']);

    expect(result.successful).toBe(1);
    expect(result.places[0].data).toHaveProperty('location');
    expect(result.places[0].data).toHaveProperty('keywordElements');
    expect(result.places[0].data).toHaveProperty('completeness');

    // 파일 생성 확인
    const files = await fs.readdir('./data/test/l1-output/summaries');
    expect(files).toContain('data_collected_l1.json');
  });
});
```

#### Week 3 완료 기준
```bash
# 1. 모든 테스트 통과
npm test

# 2. 커버리지 확인 (70% 이상)
npm run test:coverage

# 3. 실제 데이터 저장 확인
ls -la ./data/l1-output/places/2025/01/
```

---

## Week 4: GUI 연동 + 최종 테스트

### 🎯 목표
GUI 서버 업데이트 + 실시간 모니터링

### Day 22-23: GUI Server 업데이트

#### Task 4.1: API 엔드포인트 추가
**파일**: `src/gui/server.js`

```javascript
// L1 파이프라인 실행 (SSE 포함)
app.post('/api/l1/process', async (req, res) => {
  const { placeIds } = req.body;

  if (!placeIds || !Array.isArray(placeIds)) {
    return res.status(400).json({ error: 'Invalid placeIds' });
  }

  // 비동기 처리
  processL1InBackground(placeIds, req.sseEmitter);

  res.json({ success: true, message: 'Processing started' });
});

async function processL1InBackground(placeIds, sseEmitter) {
  const processor = new L1Processor({ ... });

  try {
    await processor.process(placeIds, sseEmitter);
    sseEmitter.emit('complete', { success: true });
  } catch (error) {
    sseEmitter.emit('error', { error: error.message });
  }
}
```

### Day 24-25: GUI 프론트엔드 연동

#### Task 4.2: L1 결과 탭 업데이트
**파일**: `src/gui/app.html`

```javascript
// L1 결과 로드
async function loadL1Results() {
  const response = await fetch('/api/l1/results');
  const data = await response.json();

  renderL1Stats(data.stats);
  renderL1Places(data.places);
}

function renderL1Stats(stats) {
  document.getElementById('total-places').textContent = stats.total;
  document.getElementById('avg-completeness').textContent = stats.avgCompleteness;
  document.getElementById('high-grade-count').textContent = stats.highGradeCount;
}

function renderL1Places(places) {
  const container = document.getElementById('places-container');
  container.innerHTML = '';

  places.forEach(place => {
    const card = createPlaceCard(place);
    container.appendChild(card);
  });
}

function createPlaceCard(place) {
  const gradeClass = {
    'HIGH': 'grade-high',
    'MEDIUM': 'grade-medium',
    'LOW': 'grade-low'
  }[place.completeness.grade];

  return `
    <div class="place-card ${gradeClass}">
      <h3>${place.basic.name}</h3>
      <div class="place-info">
        <span>ID: ${place.placeId}</span>
        <span>완성도: ${place.completeness.score}점</span>
        <span class="grade-badge">${place.completeness.grade}</span>
      </div>
      <div class="keyword-preview">
        <strong>키워드:</strong>
        ${place.keywordElements.location.slice(0, 3).join(', ')}
      </div>
    </div>
  `;
}
```

### Day 26-27: 최종 테스트 및 디버깅

#### Task 4.3: 성능 테스트
```bash
# 대량 데이터 처리 테스트
node scripts/benchmark.js --count=100

# 결과:
# - 크롤링 속도: 1개당 5-10초
# - 배치 처리: 10개 동시 처리
# - 메모리 사용: 500MB 이하
```

#### Task 4.4: 문서화
1. **README.md** 업데이트
2. **CHANGELOG.md** 작성
3. **API 문서** 생성 (JSDoc)

```bash
npm run docs  # JSDoc 생성
```

### Day 28: 배포 준비

#### Task 4.5: 배포 체크리스트
- [ ] `.env.example` 업데이트
- [ ] `package.json` 버전 업데이트 (2.1.0)
- [ ] Git tag 생성 (`v2.1.0`)
- [ ] 문서 최종 검토
- [ ] 데모 영상 녹화 (선택)

#### Week 4 완료 기준
```bash
# 1. 전체 테스트 통과
npm test

# 2. GUI 정상 작동
npm run gui
# http://localhost:3000 접속 → 모든 탭 테스트

# 3. 커버리지 70% 이상
npm run test:coverage

# 4. 배포 가능 상태
npm run build (if applicable)
```

---

## 전체 완료 체크리스트

### 코드
- [ ] PlaceCrawler 완전 구현
- [ ] DataParser 115점 만점 평가
- [ ] AddressParser 구현
- [ ] KeywordClassifier 구현
- [ ] StorageManager 구현
- [ ] CacheManager 구현
- [ ] SchemaValidator 구현
- [ ] L1Processor 8단계 완성
- [ ] GUI Server 업데이트
- [ ] GUI Frontend 업데이트

### 테스트
- [ ] 단위 테스트 작성 (모든 모듈)
- [ ] 통합 테스트 작성
- [ ] E2E 테스트 작성
- [ ] 커버리지 70% 이상

### 문서
- [ ] README.md
- [ ] CHANGELOG.md
- [ ] API 문서 (JSDoc)
- [ ] 가이드북 통합 완료

### 배포
- [ ] 버전 업데이트 (v2.1.0)
- [ ] Git tag
- [ ] 데모 준비

---

## 트러블슈팅 가이드

### Issue 1: Apollo State 키가 다름
**증상**: `Place:1768171911` 키를 찾을 수 없음
**해결**: 디버그 파일 확인 후 실제 키 패턴 파악
```bash
cat ./data/debug/apollo_1768171911.json | jq 'keys[] | select(contains("Place"))'
```

### Issue 2: 이미지 분류 정확도 낮음
**증상**: 이미지가 'food'로만 분류됨
**해결**: 분류 키워드 추가 또는 ML 모델 사용 고려
```javascript
// 키워드 추가
if (/(시그니처|대표|추천|best)/i.test(text)) return 'menu';
```

### Issue 3: 메모리 부족
**증상**: 대량 크롤링 시 메모리 초과
**해결**: 배치 크기 줄이기 + 캐시 정리
```javascript
// PlaceCrawler.js
async crawlBatchParallel(placeIds, concurrency = 2) { // 3 → 2로 변경
```

---

**작성일**: 2025-11-14
**작성자**: Claude (42ment Project)
**버전**: 2.1.0
**다음 업데이트**: Week 1 완료 후
