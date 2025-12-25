# Collector/Parser v0.4 기술설계서

## 1. 개요

### 1.1 문서 목적
네이버 플레이스 랭킹 관련 신규 데이터 필드를 기존 Collector에 통합하기 위한 기술 설계를 정의합니다.

### 1.2 버전 정보
- **현재 버전**: v0.3 (Apollo State 기반 수집)
- **목표 버전**: v0.4 (랭킹 피처 + GraphQL 병합)
- **설계일**: 2025-11-20

---

## 2. 필드 분류 (ADD / REPLACE / KEEP)

### 2.1 ADD (신규 추가)
새 랭킹 데이터에서 기존에 없던 필드들입니다.

| 필드명 | 설명 | 데이터 타입 | 소스 |
|--------|------|-------------|------|
| `categoryCodeList` | 업종 분류 코드 배열 | `string[]` | Apollo State |
| `gdid` | 글로벌 문서 ID (N1/N2/N3) | `string` | Apollo State |
| `votedKeywords` | 투표된 키워드 (count 포함) | `{name: string, count: number}[]` | GraphQL |
| `visitCategories` | 방문 목적 카테고리 | `{name: string, count: number}[]` | Apollo State |
| `visitorReviewStats` | 방문자 리뷰 상세 통계 | `object` | Apollo State |
| `blogCafeReviewCount` | 블로그/카페 리뷰 수 | `number` | Apollo State |
| `isTableOrder` | 테이블 주문 가능 여부 | `boolean` | Apollo State |
| `pickup` | 포장 가능 여부 | `boolean` | Apollo State |
| `bookingBusinessId` | 예약 비즈니스 ID | `string | null` | Apollo State |
| `options` | 주문 옵션 (배달/포장/예약) | `object` | Apollo State |
| `breakTime` | 브레이크타임 정보 | `{start: string, end: string}[]` | Apollo State |
| `lastOrder` | 라스트오더 시간 | `string | null` | Apollo State |

### 2.2 REPLACE (기존 대체)
기존 필드를 새로운 구조나 더 정확한 데이터로 대체합니다.

| 기존 필드 | 신규 필드 | 이유 |
|-----------|-----------|------|
| `reviews.stats.total` | `visitorReviewStats.total` | 방문자/블로그 구분 세분화 |
| `basic.tags` | `votedKeywords` | 사용자 투표 기반 키워드로 신뢰도 향상 |

### 2.3 KEEP (유지)
기존 기능에서 유지할 필드들입니다.

| 필드명 | 유지 이유 |
|--------|-----------|
| `basic.*` | 기본 정보는 필수 |
| `menus` | 메뉴 정보 유지 |
| `images` | 이미지 분류 유지 |
| `facilities` | 편의시설 정보 유지 |
| `payments` | 결제수단 정보 유지 |

---

## 3. 크롤링 방식 재검토

### 3.1 데이터 소스 평가

| 필드 | Apollo State | GraphQL API | HTML DOM | Primary |
|------|--------------|-------------|----------|---------|
| `categoryCodeList` | ✅ 안정 | ✅ | ❌ | Apollo State |
| `gdid` | ✅ 안정 | ✅ | ❌ | Apollo State |
| `votedKeywords` | ⚠️ 일부 | ✅ 완전 | ❌ | GraphQL |
| `visitCategories` | ✅ 안정 | ✅ | ❌ | Apollo State |
| `visitorReviewStats` | ✅ 안정 | ✅ | ❌ | Apollo State |
| `blogCafeReviewCount` | ✅ 안정 | ✅ | ❌ | Apollo State |
| `isTableOrder` | ✅ 안정 | ✅ | ❌ | Apollo State |
| `pickup` | ✅ 안정 | ✅ | ❌ | Apollo State |
| `bookingBusinessId` | ✅ 안정 | ✅ | ❌ | Apollo State |
| `options` | ✅ 안정 | ✅ | ❌ | Apollo State |
| `breakTime` | ✅ 안정 | ✅ | ⚠️ | Apollo State |
| `lastOrder` | ✅ 안정 | ✅ | ⚠️ | Apollo State |

### 3.2 수집 전략

**Primary Source: Apollo State (window.__APOLLO_STATE__)**
- 장점: 단일 페이지 로드로 대부분 데이터 수집 가능
- 단점: 일부 상세 정보 누락 가능

**Secondary Source: GraphQL API**
- 장점: votedKeywords 등 상세 정보 완전 수집
- 단점: API 변경에 취약, Rate limiting 리스크

**결정 사유**: Apollo State를 Primary로 하고, votedKeywords 등 특정 필드만 GraphQL 보조 수집

---

## 4. gdid 파싱 전략

### 4.1 gdid 구조 분석
```
gdid = "N1:12345678" | "N2:87654321" | "N3:11223344"
```

| 접두사 | 의미 | 파싱 방식 |
|--------|------|-----------|
| N1 | 네이버 플레이스 기본 | 숫자 추출 → placeId |
| N2 | 블로그/UGC 기반 | 별도 매핑 테이블 필요 |
| N3 | 통합 검색 결과 | 크로스 참조 필요 |

### 4.2 gdid 파서 설계
```javascript
class GdidParser {
  parse(gdid) {
    const [type, id] = gdid.split(':');
    return {
      type,              // 'N1' | 'N2' | 'N3'
      rawId: id,         // 원본 ID
      placeId: this._resolvePlaceId(type, id)
    };
  }

  _resolvePlaceId(type, id) {
    switch(type) {
      case 'N1': return id;
      case 'N2': return this._lookupN2(id);
      case 'N3': return this._crossRefN3(id);
      default: return null;
    }
  }
}
```

---

## 5. 아키텍처 설계

### 5.1 모듈 구조

```
src/modules/
├── crawler/
│   ├── PlaceCrawler.js          # 메인 크롤러 (v0.4 업그레이드)
│   └── GraphQLFetcher.js        # GraphQL API 호출 모듈 (신규)
├── parser/
│   ├── DataParser.js            # 데이터 파싱 (v0.4 업그레이드)
│   ├── GdidParser.js            # gdid 파싱 (신규)
│   └── RankFeatureParser.js     # 랭킹 피처 파싱 (신규)
└── merger/
    └── DataMerger.js            # Apollo + GraphQL 병합 (신규)
```

### 5.2 데이터 플로우

```
┌─────────────────┐
│  PlaceCrawler   │
│  (Primary)      │
└────────┬────────┘
         │ Apollo State
         ▼
┌─────────────────┐     ┌─────────────────┐
│  GraphQLFetcher │ ◄── │ votedKeywords   │
│  (Secondary)    │     │ 전용 수집       │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│   DataMerger    │
│ (데이터 병합)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  DataParser     │
│ (정규화/검증)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ RankFeatureParser│
│ (랭킹 피처 추출) │
└────────┬────────┘
         │
         ▼
    [최종 결과]
```

### 5.3 출력 스키마 (v0.4)

```typescript
interface PlaceDataV04 {
  // 기존 필드 (KEEP)
  placeId: string;
  crawledAt: string;
  basic: BasicInfo;
  menus: MenuItem[];
  reviews: ReviewData;
  images: ImageData[];
  facilities: Facility[];
  payments: string[];

  // 신규 필드 (ADD)
  ranking: {
    categoryCodeList: string[];
    gdid: GdidInfo;
    votedKeywords: VotedKeyword[];
    visitCategories: VisitCategory[];
  };

  reviewStats: {
    visitor: VisitorReviewStats;
    blogCafe: number;
  };

  orderOptions: {
    isTableOrder: boolean;
    pickup: boolean;
    bookingBusinessId: string | null;
    options: OrderOption[];
  };

  operationTime: {
    breakTime: BreakTimeInfo[];
    lastOrder: string | null;
  };
}
```

---

## 6. GraphQL Payload 설계

### 6.1 votedKeywords 쿼리

```graphql
query getVisitorReviewStats($input: VisitorReviewStatsInput!) {
  visitorReviewStats(input: $input) {
    id
    name
    votedKeywords {
      keyword
      count
      iconUrl
    }
    visitPurposes {
      name
      count
    }
  }
}
```

### 6.2 Variables
```json
{
  "input": {
    "businessId": "{{placeId}}",
    "businessType": "restaurant"
  }
}
```

### 6.3 Endpoint
```
POST https://pcmap-api.place.naver.com/graphql
Headers:
  - Content-Type: application/json
  - Referer: https://m.place.naver.com
```

---

## 7. 에러 처리 전략

### 7.1 필드별 fallback

| 필드 | Primary 실패 시 | Secondary 실패 시 |
|------|-----------------|-------------------|
| votedKeywords | GraphQL 재시도 | 빈 배열 반환 |
| categoryCodeList | 카테고리 파싱 | 빈 배열 반환 |
| gdid | 기본값 N1:{placeId} | null |

### 7.2 Rate Limiting 대응

```javascript
const rateLimiter = {
  apolloState: {
    requestsPerMinute: 30,
    delay: 2000
  },
  graphql: {
    requestsPerMinute: 10,
    delay: 6000
  }
};
```

---

## 8. 테스트 전략

### 8.1 테스트 케이스

| 테스트 ID | 설명 | 예상 결과 |
|-----------|------|-----------|
| TC01 | 정상 수집 (음식점) | 모든 필드 수집 |
| TC02 | 정상 수집 (카페) | 메뉴 제외 수집 |
| TC03 | GraphQL 실패 | votedKeywords 빈 배열 |
| TC04 | gdid N2 타입 | 별도 매핑 동작 |
| TC05 | 존재하지 않는 placeId | 에러 핸들링 |

### 8.2 샘플 Place ID
```javascript
const testPlaceIds = [
  '1234567890',  // 음식점
  '2345678901',  // 카페
  '3456789012',  // 복합매장
];
```

---

## 9. 마이그레이션 고려사항

### 9.1 하위 호환성
- 기존 v0.3 출력 형식 유지
- 신규 필드는 optional로 처리

### 9.2 데이터베이스 스키마
```sql
ALTER TABLE places ADD COLUMN category_codes JSON;
ALTER TABLE places ADD COLUMN gdid VARCHAR(50);
ALTER TABLE places ADD COLUMN voted_keywords JSON;
ALTER TABLE places ADD COLUMN is_table_order BOOLEAN DEFAULT FALSE;
ALTER TABLE places ADD COLUMN pickup BOOLEAN DEFAULT FALSE;
ALTER TABLE places ADD COLUMN booking_business_id VARCHAR(100);
ALTER TABLE places ADD COLUMN break_time JSON;
ALTER TABLE places ADD COLUMN last_order VARCHAR(10);
```

---

## 10. 성능 목표

| 메트릭 | 목표 | 비고 |
|--------|------|------|
| 단일 수집 시간 | < 5초 | Apollo State + GraphQL |
| 배치 처리량 | 100개/시간 | Rate limit 준수 |
| 메모리 사용량 | < 500MB | Puppeteer 포함 |
| 성공률 | > 95% | 에러 핸들링 포함 |

---

## 11. 결정 사유 기록

### 11.1 Apollo State를 Primary로 선택한 이유
- 단일 페이지 로드로 80% 이상 데이터 수집 가능
- GraphQL API는 rate limiting 리스크가 높음
- Apollo State는 네이버 프론트엔드에서 사용하는 캐시로 안정성 높음

### 11.2 votedKeywords만 GraphQL로 수집하는 이유
- Apollo State에서 일부 votedKeywords가 누락되는 경우 발견
- GraphQL에서 count 정보까지 완전하게 수집 가능
- 추가 요청이지만 랭킹 계산에 중요한 데이터

### 11.3 breakTime/lastOrder를 별도 파싱하는 이유
- 영업시간 내 세부 정보로 별도 추출 필요
- 운영 시간 정규화를 위해 전용 파서 구현

---

## 부록 A: 참고 자료

- [네이버 플레이스 Apollo State 구조 분석](./APOLLO_STATE_ANALYSIS.md)
- [GraphQL API 문서](./GRAPHQL_API_SPEC.md)

---

**작성**: Claude Code v0.4 자동 설계
**검토 필요**: 실제 테스트 후 필드 매핑 검증 필요
