# 04. place-keywords-maker-v2 연동 가이드 (INTEGRATION)

> **문서 버전**: 1.0.0
> **최종 수정**: 2025-12-16

---

## 1. 개요

### 1.1 연동 목적
`place-keywords-maker-v2`의 크롤링 데이터와 키워드 분류 체계를 활용하여
`Reward_keyword_maker`의 1차 키워드 자동 수집 기능을 구현

### 1.2 시스템 구성

```
┌─────────────────────────────────────────────────────────────────┐
│                      place-keywords-maker-v2                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ PlaceCrawlerV04 │  │ AddressParser   │  │KeywordClassifier│  │
│  │ (데이터 수집)    │  │ (지역 키워드)   │  │ (5분류)         │  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                    │                    │           │
│           └────────────────────┼────────────────────┘           │
│                                │                                │
│                    data/output/l1/{MID}.json                    │
└────────────────────────────────┼────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────┼────────────────────────────────┐
│                     Reward_keyword_maker_v2                      │
│                                │                                │
│  ┌─────────────────────────────▼─────────────────────────────┐  │
│  │              PlaceKeywordsAdapter                          │  │
│  │              (데이터 변환 및 연동)                          │  │
│  └─────────────────────────────┬─────────────────────────────┘  │
│                                │                                │
│           ┌────────────────────┼────────────────────┐          │
│           ▼                    ▼                    ▼          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │KeywordCombinator│  │  RankValidator  │  │   TxtExporter   │  │
│  │ (조합 생성)      │  │ (순위 검증)     │  │ (결과 저장)     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. 연동 방식

### 2.1 Option A: 파일 기반 연동 (권장)

**장점:**
- 최소한의 변경으로 구현 가능
- 두 프로젝트 독립적 운영
- 디버깅 용이

**구현:**
```javascript
// src/integration/PlaceKeywordsAdapter.js

const fs = require('fs');
const path = require('path');

class PlaceKeywordsAdapter {
  constructor(options = {}) {
    // place-keywords-maker-v2의 출력 경로
    this.dataPath = options.dataPath ||
      path.join(__dirname, '../../../place-keywords-maker-v2/data/output/l1');
  }

  /**
   * MID로 크롤링 데이터 조회
   * @param {string} mid - 플레이스 MID
   * @returns {object|null} - L1 크롤링 데이터
   */
  async getPlaceData(mid) {
    const filePath = path.join(this.dataPath, `${mid}.json`);

    if (!fs.existsSync(filePath)) {
      console.log(`[Adapter] 캐시된 데이터 없음: ${mid}`);
      return null;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`[Adapter] 캐시 데이터 로드: ${mid}`);
    return data;
  }

  /**
   * 크롤링 데이터를 5분류 KeywordSet으로 변환
   * @param {object} l1Data - L1 크롤링 데이터
   * @returns {object} - 5분류 KeywordSet
   */
  convertToKeywordSet(l1Data) {
    if (!l1Data) return null;

    const { basic, menus, facilities, votedKeywords, representativeKeywords } = l1Data;

    return {
      mid: l1Data.placeId,

      CORE: this._extractCoreKeywords(basic, representativeKeywords),
      LOCATION: this._extractLocationKeywords(basic.address),
      MENU: this._extractMenuKeywords(menus),
      ATTRIBUTE: this._extractAttributeKeywords(facilities),
      SENTIMENT: this._extractSentimentKeywords(votedKeywords),

      source: 'auto',
      createdAt: new Date().toISOString()
    };
  }

  // Private methods
  _extractCoreKeywords(basic, representativeKeywords = []) {
    const keywords = [];
    let priority = 1;

    // 카테고리 (최우선)
    if (basic.category) {
      keywords.push({ value: basic.category, priority: priority++, source: 'category' });
    }

    // SEO 키워드
    if (basic.seoKeywords) {
      basic.seoKeywords.forEach(kw => {
        keywords.push({ value: kw, priority: priority++, source: 'seoKeywords' });
      });
    }

    // 대표 키워드
    representativeKeywords.forEach(kw => {
      if (!keywords.find(k => k.value === kw)) {
        keywords.push({ value: kw, priority: priority++, source: 'representativeKeywords' });
      }
    });

    // 태그
    if (basic.tags) {
      basic.tags.forEach(tag => {
        if (!keywords.find(k => k.value === tag)) {
          keywords.push({ value: tag, priority: priority++, source: 'tags' });
        }
      });
    }

    return keywords;
  }

  _extractLocationKeywords(address) {
    const keywords = [];
    let priority = 1;

    // 상권 (최우선)
    if (address.commercialArea) {
      keywords.push({ value: address.commercialArea, priority: priority++, source: 'address' });
    }

    // 역 (상세 → 일반)
    if (address.station) {
      keywords.push({ value: address.station, priority: priority++, source: 'address' });
      const stationOnly = address.station.replace(/역$/, '');
      if (stationOnly !== address.station) {
        keywords.push({ value: stationOnly, priority: priority++, source: 'address' });
      }
    }

    // 동
    if (address.dong) {
      keywords.push({ value: address.dong, priority: priority++, source: 'address' });
    }

    // 구
    if (address.district) {
      keywords.push({ value: address.district, priority: priority++, source: 'address' });
    }

    // 시 + 동 조합
    if (address.city && address.dong) {
      const cityDong = `${address.city} ${address.dong.replace(/동$/, '')}`;
      keywords.push({ value: cityDong, priority: priority++, source: 'address' });
    }

    // 시
    if (address.city) {
      keywords.push({ value: address.city, priority: priority++, source: 'address' });
    }

    return keywords;
  }

  _extractMenuKeywords(menus = []) {
    return menus
      .sort((a, b) => {
        // 추천 메뉴 우선
        if (a.recommend && !b.recommend) return -1;
        if (!a.recommend && b.recommend) return 1;
        return 0;
      })
      .map((menu, index) => ({
        value: menu.name,
        priority: index + 1,
        source: 'menus'
      }));
  }

  _extractAttributeKeywords(facilities = []) {
    const attrMap = {
      '주차': '주차가능',
      '예약': '예약가능',
      'WiFi': 'WiFi',
      '포장': '포장가능',
      '배달': '배달가능',
      '단체석': '단체석',
      '반려동물': '애견동반'
    };

    return facilities
      .filter(f => f.available)
      .map((f, index) => ({
        value: attrMap[f.name] || f.name,
        priority: index + 1,
        source: 'facilities'
      }));
  }

  _extractSentimentKeywords(votedKeywords = []) {
    const sentMap = {
      '친절해요': '친절한',
      '손재주가 좋아요': '손재주좋은',
      '분위기가 좋아요': '분위기좋은',
      '맛있어요': '맛있는',
      '가성비가 좋아요': '가성비좋은',
      '재방문하고 싶어요': '재방문'
    };

    return votedKeywords
      .sort((a, b) => b.count - a.count)
      .map((kw, index) => ({
        value: sentMap[kw.name] || kw.name.replace(/요$/, ''),
        priority: index + 1,
        source: 'votedKeywords',
        count: kw.count
      }));
  }
}

module.exports = PlaceKeywordsAdapter;
```

### 2.2 Option B: API 연동 (향후 확장)

place-keywords-maker-v2에 REST API 엔드포인트 추가 후 연동

```javascript
// place-keywords-maker-v2/src/api/keywords.js

const express = require('express');
const router = express.Router();

// GET /api/keywords/:mid
router.get('/:mid', async (req, res) => {
  const { mid } = req.params;

  // 캐시된 데이터 조회
  const cachedData = await getCachedData(mid);

  if (cachedData) {
    return res.json(convertToKeywordSet(cachedData));
  }

  // 캐시 없으면 실시간 크롤링
  const crawler = new PlaceCrawlerV04();
  const data = await crawler.crawl(mid);

  res.json(convertToKeywordSet(data));
});

module.exports = router;
```

```javascript
// Reward_keyword_maker_v2/src/integration/PlaceKeywordsApiClient.js

const axios = require('axios');

class PlaceKeywordsApiClient {
  constructor(baseUrl = 'http://localhost:3000/api') {
    this.baseUrl = baseUrl;
  }

  async getKeywordSet(mid) {
    const response = await axios.get(`${this.baseUrl}/keywords/${mid}`);
    return response.data;
  }
}
```

---

## 3. 참조 모듈

### 3.1 place-keywords-maker-v2 핵심 모듈

| 모듈 | 경로 | 용도 |
|------|------|------|
| PlaceCrawlerV04 | `src/modules/crawler/PlaceCrawlerV04.js` | Apollo State 기반 크롤링 |
| GraphQLFetcher | `src/modules/crawler/GraphQLFetcher.js` | votedKeywords 수집 |
| AddressParser | `src/modules/parser/AddressParser.js` | 주소 → LOCATION 변환 |
| KeywordClassifier | `src/modules/parser/KeywordClassifier.js` | 5분류 키워드 분류 |

### 3.2 AddressParser 활용

```javascript
// place-keywords-maker-v2/src/modules/parser/AddressParser.js 참조

const STATIONS = {
  '서울': [
    '강남역', '홍대입구역', '신촌역', '역삼역', '선릉역',
    '삼성역', '잠실역', '건대입구역', '신림역', '사당역'
    // ... 30+ 역
  ],
  '부산': [
    '서면역', '해운대역', '센텀시티역', '남포역', '연산역'
    // ...
  ]
};

const COMMERCIAL_AREAS = [
  '강남', '홍대', '신촌', '이태원', '명동',
  '가로수길', '압구정', '청담', '서면', '해운대'
  // ... 20+ 상권
];

class AddressParser {
  parse(address) {
    const result = {
      city: null,
      district: null,
      dong: null,
      station: null,
      commercialArea: null
    };

    // 시/도 추출
    const cityMatch = address.match(/^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/);
    if (cityMatch) result.city = cityMatch[1];

    // 구 추출
    const districtMatch = address.match(/([가-힣]+구)/);
    if (districtMatch) result.district = districtMatch[1];

    // 동 추출
    const dongMatch = address.match(/([가-힣]+동)/);
    if (dongMatch) result.dong = dongMatch[1];

    // 역 추출 (인근 역)
    if (result.city && STATIONS[result.city]) {
      for (const station of STATIONS[result.city]) {
        if (address.includes(station.replace('역', ''))) {
          result.station = station;
          break;
        }
      }
    }

    // 상권 추출
    for (const area of COMMERCIAL_AREAS) {
      if (address.includes(area)) {
        result.commercialArea = area;
        break;
      }
    }

    return result;
  }
}
```

---

## 4. 데이터 흐름

### 4.1 전체 흐름

```
[Step 1] MID 입력
         │
         ▼
[Step 2] place-keywords-maker-v2 데이터 조회
         │
         ├─ 캐시 있음 → JSON 파일 로드
         │
         └─ 캐시 없음 → 실시간 크롤링 (선택적)
         │
         ▼
[Step 3] KeywordSet 변환
         │
         ├─ CORE: category, seoKeywords, tags
         ├─ LOCATION: AddressParser 결과
         ├─ MENU: menus
         ├─ ATTRIBUTE: facilities
         └─ SENTIMENT: votedKeywords
         │
         ▼
[Step 4] 키워드 조합 생성
         │
         ├─ Tier 1: LOC + CORE, LOC + MENU
         ├─ Tier 2: LOC + ATTR + CORE
         └─ Tier 3: LOC + SENT + CORE
         │
         ▼
[Step 5] 순위 검증
         │
         ▼
[Step 6] 결과 저장
```

### 4.2 데이터 변환 예시

**입력 (L1 데이터):**
```json
{
  "placeId": "1421207239",
  "basic": {
    "name": "이쁜다헤어",
    "category": "미용실",
    "address": {
      "city": "부산",
      "district": "연제구",
      "dong": "연산동"
    },
    "seoKeywords": ["연산역미용실", "부산히피펌"]
  },
  "menus": [
    { "name": "히피펌", "recommend": true },
    { "name": "C컬펌", "recommend": true }
  ],
  "facilities": [
    { "name": "주차", "available": true },
    { "name": "예약", "available": true }
  ],
  "votedKeywords": [
    { "name": "친절해요", "count": 45 }
  ]
}
```

**출력 (KeywordSet):**
```json
{
  "mid": "1421207239",
  "CORE": [
    { "value": "미용실", "priority": 1, "source": "category" },
    { "value": "연산역미용실", "priority": 2, "source": "seoKeywords" },
    { "value": "부산히피펌", "priority": 3, "source": "seoKeywords" }
  ],
  "LOCATION": [
    { "value": "연산역", "priority": 1, "source": "address" },
    { "value": "연산", "priority": 2, "source": "address" },
    { "value": "연산동", "priority": 3, "source": "address" },
    { "value": "부산 연산", "priority": 4, "source": "address" },
    { "value": "부산", "priority": 5, "source": "address" }
  ],
  "MENU": [
    { "value": "히피펌", "priority": 1, "source": "menus" },
    { "value": "C컬펌", "priority": 2, "source": "menus" }
  ],
  "ATTRIBUTE": [
    { "value": "주차가능", "priority": 1, "source": "facilities" },
    { "value": "예약가능", "priority": 2, "source": "facilities" }
  ],
  "SENTIMENT": [
    { "value": "친절한", "priority": 1, "source": "votedKeywords", "count": 45 }
  ]
}
```

---

## 5. 에러 처리

### 5.1 데이터 없음 처리

```javascript
async function getKeywords(mid) {
  const adapter = new PlaceKeywordsAdapter();

  // Step 1: 캐시 조회
  let placeData = await adapter.getPlaceData(mid);

  // Step 2: 캐시 없으면 수동 입력 요청
  if (!placeData) {
    console.log(`[Warning] MID ${mid}의 크롤링 데이터가 없습니다.`);
    console.log(`[Info] place-keywords-maker-v2에서 먼저 크롤링을 실행하거나,`);
    console.log(`[Info] 수동으로 키워드를 입력해주세요.`);

    return {
      mid,
      CORE: [],
      LOCATION: [],
      MENU: [],
      ATTRIBUTE: [],
      SENTIMENT: [],
      source: 'manual',
      needsManualInput: true
    };
  }

  return adapter.convertToKeywordSet(placeData);
}
```

### 5.2 부분 데이터 처리

```javascript
function validateKeywordSet(keywordSet) {
  const warnings = [];

  if (keywordSet.CORE.length === 0) {
    warnings.push('CORE 키워드가 없습니다. 업종을 수동 입력해주세요.');
  }

  if (keywordSet.LOCATION.length === 0) {
    warnings.push('LOCATION 키워드가 없습니다. 지역을 수동 입력해주세요.');
  }

  if (keywordSet.MENU.length === 0) {
    warnings.push('MENU 키워드가 없습니다. (선택적)');
  }

  return {
    isValid: keywordSet.CORE.length > 0 && keywordSet.LOCATION.length > 0,
    warnings
  };
}
```

---

## 6. 테스트

### 6.1 단위 테스트

```javascript
// tests/integration/PlaceKeywordsAdapter.test.js

const PlaceKeywordsAdapter = require('../../src/integration/PlaceKeywordsAdapter');

describe('PlaceKeywordsAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new PlaceKeywordsAdapter({
      dataPath: './tests/fixtures/l1'
    });
  });

  test('should load cached data', async () => {
    const data = await adapter.getPlaceData('1421207239');
    expect(data).not.toBeNull();
    expect(data.placeId).toBe('1421207239');
  });

  test('should convert to keyword set', () => {
    const l1Data = require('./fixtures/l1/1421207239.json');
    const keywordSet = adapter.convertToKeywordSet(l1Data);

    expect(keywordSet.CORE.length).toBeGreaterThan(0);
    expect(keywordSet.LOCATION.length).toBeGreaterThan(0);
    expect(keywordSet.CORE[0].source).toBe('category');
  });

  test('should prioritize station over dong', () => {
    const l1Data = {
      placeId: 'test',
      basic: {
        category: '미용실',
        address: {
          city: '서울',
          district: '강남구',
          dong: '역삼동',
          station: '역삼역'
        }
      }
    };

    const keywordSet = adapter.convertToKeywordSet(l1Data);
    const locations = keywordSet.LOCATION;

    const stationIndex = locations.findIndex(l => l.value === '역삼역');
    const dongIndex = locations.findIndex(l => l.value === '역삼동');

    expect(stationIndex).toBeLessThan(dongIndex);
  });
});
```

---

*문서 작성: 2025-12-16*
