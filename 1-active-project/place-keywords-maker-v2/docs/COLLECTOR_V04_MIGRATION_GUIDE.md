# Collector/Parser v0.4 마이그레이션 가이드

## 1. 개요

이 문서는 Collector v0.3에서 v0.4로 업그레이드하는 방법을 설명합니다.

---

## 2. 변경점 요약

### 2.1 신규 모듈

| 모듈 | 파일 | 설명 |
|------|------|------|
| GraphQLFetcher | `crawler/GraphQLFetcher.js` | GraphQL API 호출 |
| GdidParser | `parser/GdidParser.js` | gdid 파싱 |
| RankFeatureParser | `parser/RankFeatureParser.js` | 랭킹 피처 추출 |
| DataMerger | `merger/DataMerger.js` | 데이터 병합 |
| PlaceCrawlerV04 | `crawler/PlaceCrawlerV04.js` | 통합 크롤러 v0.4 |

### 2.2 신규 데이터 필드

```javascript
// v0.4 신규 필드
{
  ranking: {
    categoryCodeList: [],   // 업종 코드 배열
    gdid: {},               // 글로벌 문서 ID
    votedKeywords: [],      // 투표 키워드
    visitCategories: [],    // 방문 목적
  },
  reviewStats: {
    visitor: {},            // 방문자 리뷰 통계
    blogCafe: 0,            // 블로그/카페 리뷰 수
  },
  orderOptions: {
    isTableOrder: false,    // 테이블 주문
    pickup: false,          // 포장
    delivery: false,        // 배달
    bookingBusinessId: null,// 예약 ID
    options: [],            // 기타 옵션
  },
  operationTime: {
    breakTime: [],          // 브레이크타임
    lastOrder: null,        // 라스트오더
    holiday: null,          // 휴무일
  },
}
```

---

## 3. 마이그레이션 단계

### 3.1 Step 1: 파일 추가

신규 모듈 파일들을 프로젝트에 추가합니다:

```bash
src/modules/
├── crawler/
│   ├── GraphQLFetcher.js    # 추가
│   └── PlaceCrawlerV04.js   # 추가
├── parser/
│   ├── GdidParser.js        # 추가
│   └── RankFeatureParser.js # 추가
└── merger/
    └── DataMerger.js        # 추가 (새 폴더)
```

### 3.2 Step 2: import 변경

기존 코드에서 import를 변경합니다:

```javascript
// Before (v0.3)
import { PlaceCrawler } from './modules/crawler/PlaceCrawler.js';

// After (v0.4)
import { PlaceCrawlerV04 } from './modules/crawler/PlaceCrawlerV04.js';
```

### 3.3 Step 3: 설정 업데이트

v0.4 전용 설정을 추가합니다:

```javascript
// Before
const crawler = new PlaceCrawler({
  timeout: 30000,
  headless: true,
});

// After
const crawler = new PlaceCrawlerV04({
  timeout: 30000,
  headless: true,
  enableGraphQL: true,  // 신규
  graphql: {            // 신규
    timeout: 10000,
  },
});
```

### 3.4 Step 4: 데이터 접근 업데이트

신규 필드에 접근하는 코드를 추가합니다:

```javascript
// Before
const name = result.basic.name;
const reviews = result.reviews.stats.total;

// After - 기존 필드 유지
const name = result.basic.name;
const reviews = result.reviews.stats.total;

// After - 신규 필드 추가
const votedKeywords = result.ranking?.votedKeywords || [];
const categoryCodeList = result.ranking?.categoryCodeList || [];
const isTableOrder = result.orderOptions?.isTableOrder || false;
const lastOrder = result.operationTime?.lastOrder || null;
```

---

## 4. 데이터베이스 마이그레이션

### 4.1 스키마 변경 (SQL)

```sql
-- 신규 컬럼 추가
ALTER TABLE places ADD COLUMN category_codes JSON;
ALTER TABLE places ADD COLUMN gdid VARCHAR(50);
ALTER TABLE places ADD COLUMN voted_keywords JSON;
ALTER TABLE places ADD COLUMN visitor_review_stats JSON;
ALTER TABLE places ADD COLUMN blog_cafe_review_count INT DEFAULT 0;
ALTER TABLE places ADD COLUMN is_table_order BOOLEAN DEFAULT FALSE;
ALTER TABLE places ADD COLUMN pickup BOOLEAN DEFAULT FALSE;
ALTER TABLE places ADD COLUMN booking_business_id VARCHAR(100);
ALTER TABLE places ADD COLUMN order_options JSON;
ALTER TABLE places ADD COLUMN break_time JSON;
ALTER TABLE places ADD COLUMN last_order VARCHAR(10);
ALTER TABLE places ADD COLUMN holiday VARCHAR(255);

-- 인덱스 추가 (검색 최적화)
CREATE INDEX idx_places_is_table_order ON places(is_table_order);
CREATE INDEX idx_places_pickup ON places(pickup);
```

### 4.2 MongoDB 스키마 (Mongoose)

```javascript
const placeSchemaV04 = new Schema({
  // 기존 필드 유지
  placeId: String,
  basic: Object,
  menus: [Object],
  reviews: Object,
  images: [Object],

  // 신규 필드 추가
  ranking: {
    categoryCodeList: [String],
    gdid: {
      raw: String,
      type: String,
      placeId: String,
      isValid: Boolean,
    },
    votedKeywords: [{
      name: String,
      count: Number,
    }],
    visitCategories: [{
      name: String,
      count: Number,
    }],
  },
  reviewStats: {
    visitor: Object,
    blogCafe: Number,
  },
  orderOptions: {
    isTableOrder: Boolean,
    pickup: Boolean,
    delivery: Boolean,
    bookingBusinessId: String,
    options: [Object],
  },
  operationTime: {
    breakTime: [{
      start: String,
      end: String,
    }],
    lastOrder: String,
    holiday: String,
  },

  // 메타데이터
  _version: String,
});
```

---

## 5. API 응답 변경

### 5.1 REST API 응답 확장

```javascript
// v0.3 응답
{
  "placeId": "12345",
  "basic": { ... },
  "menus": [ ... ],
  "reviews": { ... }
}

// v0.4 응답 (기존 + 신규)
{
  "placeId": "12345",
  "basic": { ... },
  "menus": [ ... ],
  "reviews": { ... },
  "ranking": {
    "categoryCodeList": ["FD001", "FD002"],
    "gdid": { "raw": "N1:12345", "type": "N1" },
    "votedKeywords": [{ "name": "맛있어요", "count": 150 }]
  },
  "orderOptions": {
    "isTableOrder": true,
    "pickup": true
  },
  "operationTime": {
    "lastOrder": "21:00"
  }
}
```

---

## 6. 하위 호환성

### 6.1 v0.3 코드 호환

v0.4는 v0.3과 하위 호환됩니다. 기존 코드는 수정 없이 동작합니다:

```javascript
// 기존 v0.3 코드 - 그대로 동작
const result = await crawler.crawlPlace(placeId);
console.log(result.basic.name);     // 동작
console.log(result.menus.length);   // 동작
```

### 6.2 신규 필드 기본값

신규 필드는 null-safe하게 접근해야 합니다:

```javascript
// 안전한 접근
const keywords = result.ranking?.votedKeywords ?? [];
const lastOrder = result.operationTime?.lastOrder ?? '정보없음';
```

---

## 7. 롤백 방법

v0.4에서 문제 발생 시 v0.3으로 롤백:

### 7.1 코드 롤백

```javascript
// v0.4 → v0.3
import { PlaceCrawler } from './modules/crawler/PlaceCrawler.js';
// PlaceCrawlerV04 대신 기존 PlaceCrawler 사용
```

### 7.2 데이터베이스 롤백

```sql
-- 신규 컬럼 삭제
ALTER TABLE places DROP COLUMN category_codes;
ALTER TABLE places DROP COLUMN gdid;
ALTER TABLE places DROP COLUMN voted_keywords;
-- ... (기타 컬럼 삭제)
```

---

## 8. 테스트 체크리스트

### 8.1 기능 테스트

- [ ] 단일 매장 크롤링 성공
- [ ] 배치 크롤링 성공
- [ ] GraphQL votedKeywords 수집
- [ ] gdid 파싱 (N1/N2/N3)
- [ ] 랭킹 피처 추출
- [ ] 데이터 병합
- [ ] 완성도 계산

### 8.2 호환성 테스트

- [ ] 기존 v0.3 코드 동작 확인
- [ ] API 응답 형식 확인
- [ ] 데이터베이스 저장 확인

### 8.3 에러 테스트

- [ ] GraphQL 실패 시 fallback
- [ ] 타임아웃 처리
- [ ] 잘못된 placeId 처리

---

## 9. FAQ

### Q1: v0.4로 업그레이드해야 하나요?

**A**: 다음 기능이 필요하면 업그레이드를 권장합니다:
- 랭킹 최적화 데이터 (votedKeywords, categoryCodeList)
- 주문 옵션 정보 (테이블오더, 포장, 예약)
- 운영 시간 상세 (브레이크타임, 라스트오더)

### Q2: 기존 데이터는 어떻게 되나요?

**A**: 기존 데이터는 유지됩니다. 신규 필드는 새로 크롤링할 때만 수집됩니다.

### Q3: GraphQL을 비활성화할 수 있나요?

**A**: 네, `enableGraphQL: false` 옵션으로 비활성화할 수 있습니다.

### Q4: 성능 영향은?

**A**: GraphQL 추가 호출로 약 10-20% 시간 증가. 비활성화 시 v0.3과 동일.

---

## 10. 지원

문제 발생 시:
1. [docs/COLLECTOR_V04_TECHNICAL_DESIGN.md](./COLLECTOR_V04_TECHNICAL_DESIGN.md) 참조
2. [docs/COLLECTOR_V04_IMPLEMENTATION_GUIDE.md](./COLLECTOR_V04_IMPLEMENTATION_GUIDE.md) 참조
3. 테스트 파일 실행: `node tests/unit/PlaceCrawlerV04.test.js`

---

**작성일**: 2025-11-20
**v0.3 → v0.4 마이그레이션**
