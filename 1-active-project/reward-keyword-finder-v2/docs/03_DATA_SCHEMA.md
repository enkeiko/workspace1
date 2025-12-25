# 03. 데이터 구조 정의 (DATA_SCHEMA)

> **문서 버전**: 1.0.0
> **최종 수정**: 2025-12-16

---

## 1. 핵심 데이터 엔티티

### 1.1 PlaceInfo (업체 정보)

```typescript
interface PlaceInfo {
  // 식별자
  mid: string;              // 네이버 플레이스 MID (예: "1421207239")
  url: string;              // 원본 URL

  // 기본 정보
  name: string;             // 업체명
  category: string;         // 대분류 카테고리 (예: "미용실")
  subCategory?: string;     // 소분류 카테고리 (예: "헤어샵")

  // 주소 정보
  address: {
    full: string;           // 전체 주소
    road: string;           // 도로명 주소
    jibun: string;          // 지번 주소
    city: string;           // 시/도 (예: "부산")
    district: string;       // 구/군 (예: "연제구")
    dong: string;           // 동 (예: "연산동")
    station?: string;       // 인근 역 (예: "연산역")
    commercialArea?: string; // 상권 (예: "서면")
  };

  // 수집 시간
  crawledAt: string;        // ISO 8601 형식
}
```

### 1.2 KeywordSet (5분류 키워드 세트)

```typescript
interface KeywordSet {
  mid: string;              // 대상 업체 MID

  // 5분류 키워드
  CORE: KeywordItem[];      // 업종 키워드
  LOCATION: KeywordItem[];  // 지역 키워드
  MENU: KeywordItem[];      // 메뉴 키워드
  ATTRIBUTE: KeywordItem[]; // 속성 키워드
  SENTIMENT: KeywordItem[]; // 감성 키워드

  // 메타 정보
  source: 'auto' | 'manual' | 'mixed';  // 수집 방식
  createdAt: string;
  updatedAt: string;
}

interface KeywordItem {
  value: string;            // 키워드 값
  priority: number;         // 우선순위 (1이 가장 높음)
  source: string;           // 출처 (예: "seoKeywords", "votedKeywords")
  count?: number;           // 빈도 수 (votedKeywords의 경우)
}
```

### 1.3 Combination (생성된 조합)

```typescript
interface Combination {
  keyword: string;          // 조합된 키워드 (예: "강남역 미용실")
  tier: 'T1' | 'T2' | 'T3'; // 우선순위 티어
  pattern: string;          // 조합 패턴 (예: "LOC+CORE")
  components: {
    location?: string;
    core?: string;
    menu?: string;
    attribute?: string;
    sentiment?: string;
  };
  length: number;           // 글자수 (공백 제외)
}
```

### 1.4 ValidationResult (검증 결과)

```typescript
interface ValidationResult {
  keyword: string;          // 검증한 키워드
  mid: string;              // 대상 MID

  // 순위 정보
  rank: number | null;      // 검색 순위 (null = 미발견)
  page: number | null;      // 검색 결과 페이지

  // 분류
  matchType: 'natural' | 'exact' | 'none';
  // natural: rank <= 5 (자연유입)
  // exact: rank 6~10 (정확매칭)
  // none: rank > 10 또는 미발견

  // 메타 정보
  searchUrl: string;        // 검색에 사용된 URL
  validatedAt: string;      // 검증 시각
  responseTime: number;     // 응답 시간 (ms)

  // 조합 정보 (선택적)
  tier?: string;
  pattern?: string;
}
```

### 1.5 JobResult (작업 결과)

```typescript
interface JobResult {
  jobId: string;            // 작업 고유 ID
  mid: string;              // 대상 MID

  // 통계
  stats: {
    totalKeywords: number;  // 전체 키워드 수
    validated: number;      // 검증 완료 수
    natural: number;        // 자연유입 키워드 수
    exact: number;          // 정확매칭 키워드 수
    none: number;           // 미노출 키워드 수
    failed: number;         // 검증 실패 수
  };

  // 결과 데이터
  results: ValidationResult[];

  // 시간 정보
  startedAt: string;
  completedAt: string;
  duration: number;         // 소요 시간 (ms)

  // 상태
  status: 'pending' | 'running' | 'completed' | 'failed';
  error?: string;
}
```

---

## 2. 파일 형식

### 2.1 입력 파일

#### 키워드 입력 (기존 V1 호환)
```
# 목적키워드.txt
미용실
헤어샵
헤어
펌
염색

# 위치키워드.txt
강남역
역삼동
역삼
강남

# 추가키워드.txt (카테고리=동의어 형식)
미용실=미용,헤어,헤어샵
카페=커피,커피숍
```

#### 5분류 키워드 (V2 JSON)
```json
{
  "mid": "1421207239",
  "CORE": [
    { "value": "미용실", "priority": 1, "source": "category" },
    { "value": "헤어샵", "priority": 2, "source": "seoKeywords" }
  ],
  "LOCATION": [
    { "value": "연산역", "priority": 1, "source": "addressParser" },
    { "value": "연산동", "priority": 2, "source": "addressParser" }
  ],
  "MENU": [
    { "value": "히피펌", "priority": 1, "source": "menus" },
    { "value": "C컬펌", "priority": 2, "source": "menus" }
  ],
  "ATTRIBUTE": [
    { "value": "예약가능", "priority": 1, "source": "facilities" }
  ],
  "SENTIMENT": [
    { "value": "친절한", "priority": 1, "source": "votedKeywords", "count": 45 }
  ],
  "createdAt": "2025-12-16T10:00:00Z"
}
```

### 2.2 출력 파일

#### 자연유입 결과 TXT
```
# 1421207239 자연유입 추출결과.txt
# 생성일시: 2025-12-16 10:30:00
# 총 키워드: 15개

부산 연산역 미용실
연산동 미용실
연산 헤어샵
부산 연산역 히피펌
연산동 C컬펌
...
```

#### 정확매칭 결과 TXT
```
# 1421207239 정확매칭 추출결과.txt
# 생성일시: 2025-12-16 10:30:00
# 총 키워드: 8개

연산 미용실
부산 헤어샵
...
```

#### 상세 결과 JSON
```json
{
  "jobId": "job_20251216_103000_1421207239",
  "mid": "1421207239",
  "stats": {
    "totalKeywords": 120,
    "validated": 120,
    "natural": 15,
    "exact": 8,
    "none": 97,
    "failed": 0
  },
  "results": [
    {
      "keyword": "부산 연산역 미용실",
      "rank": 2,
      "matchType": "natural",
      "tier": "T1",
      "pattern": "LOC+CORE",
      "validatedAt": "2025-12-16T10:25:30Z"
    },
    {
      "keyword": "연산 미용실",
      "rank": 7,
      "matchType": "exact",
      "tier": "T1",
      "pattern": "LOC+CORE",
      "validatedAt": "2025-12-16T10:25:32Z"
    }
  ],
  "startedAt": "2025-12-16T10:20:00Z",
  "completedAt": "2025-12-16T10:30:00Z",
  "duration": 600000,
  "status": "completed"
}
```

---

## 3. place-keywords-maker-v2 데이터 연동

### 3.1 입력 데이터 (L1 크롤링 결과)

```json
// data/output/l1/{MID}.json
{
  "placeId": "1421207239",
  "crawledAt": "2025-12-16T09:00:00Z",

  "basic": {
    "name": "이쁜다헤어",
    "category": "미용실",
    "address": {
      "full": "부산 연제구 연산동 123-45",
      "road": "부산 연제구 연산로 123",
      "city": "부산",
      "district": "연제구",
      "dong": "연산동"
    },
    "phone": "051-123-4567",
    "description": "연산역 도보 3분, 친절한 상담...",
    "tags": ["히피펌", "C컬펌", "남자펌"],
    "seoKeywords": ["연산역미용실", "부산히피펌"],
    "sns": {
      "instagram": "https://instagram.com/..."
    }
  },

  "menus": [
    { "name": "히피펌", "price": 80000, "recommend": true },
    { "name": "C컬펌", "price": 70000, "recommend": true },
    { "name": "볼륨매직", "price": 100000, "recommend": false }
  ],

  "reviews": {
    "stats": { "total": 150, "visitor": 120, "blog": 30, "average": 4.5 },
    "blogReviews": [
      { "content": "친절하고 손재주가 좋아요...", "date": "2025-12-01" }
    ],
    "summary": {
      "positive": ["친절", "손재주좋은", "분위기좋은"],
      "negative": []
    }
  },

  "facilities": [
    { "name": "주차", "available": true },
    { "name": "예약", "available": true },
    { "name": "WiFi", "available": true }
  ],

  "votedKeywords": [
    { "name": "친절해요", "count": 45 },
    { "name": "손재주가 좋아요", "count": 32 },
    { "name": "분위기가 좋아요", "count": 28 }
  ],

  "representativeKeywords": ["연산역미용실", "히피펌", "C컬펌"]
}
```

### 3.2 데이터 변환 로직

```javascript
/**
 * place-keywords-maker-v2 데이터를 5분류 KeywordSet으로 변환
 */
function convertToKeywordSet(l1Data) {
  const { basic, menus, facilities, votedKeywords, representativeKeywords } = l1Data;

  return {
    mid: l1Data.placeId,

    // CORE: 업종 키워드
    CORE: [
      { value: basic.category, priority: 1, source: 'category' },
      ...basic.seoKeywords.map((kw, i) => ({
        value: kw,
        priority: i + 2,
        source: 'seoKeywords'
      })),
      ...(basic.tags || []).map((tag, i) => ({
        value: tag,
        priority: i + 10,
        source: 'tags'
      }))
    ].filter(uniqueByValue),

    // LOCATION: 지역 키워드 (AddressParser 사용)
    LOCATION: parseAddress(basic.address),

    // MENU: 메뉴 키워드
    MENU: menus
      .sort((a, b) => (b.recommend ? 1 : 0) - (a.recommend ? 1 : 0))
      .map((menu, i) => ({
        value: menu.name,
        priority: i + 1,
        source: 'menus'
      })),

    // ATTRIBUTE: 속성 키워드
    ATTRIBUTE: facilities
      .filter(f => f.available)
      .map((f, i) => ({
        value: convertFacilityName(f.name),
        priority: i + 1,
        source: 'facilities'
      })),

    // SENTIMENT: 감성 키워드
    SENTIMENT: votedKeywords
      .sort((a, b) => b.count - a.count)
      .map((kw, i) => ({
        value: convertSentimentName(kw.name),
        priority: i + 1,
        source: 'votedKeywords',
        count: kw.count
      })),

    source: 'auto',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * 주소를 LOCATION 키워드 배열로 변환
 */
function parseAddress(address) {
  const keywords = [];
  let priority = 1;

  // 상권 (최우선)
  if (address.commercialArea) {
    keywords.push({ value: address.commercialArea, priority: priority++, source: 'addressParser' });
  }

  // 역
  if (address.station) {
    keywords.push({ value: address.station, priority: priority++, source: 'addressParser' });
    // 역 이름만 (예: "연산역" → "연산")
    const stationOnly = address.station.replace(/역$/, '');
    keywords.push({ value: stationOnly, priority: priority++, source: 'addressParser' });
  }

  // 동
  if (address.dong) {
    keywords.push({ value: address.dong, priority: priority++, source: 'addressParser' });
  }

  // 구
  if (address.district) {
    keywords.push({ value: address.district, priority: priority++, source: 'addressParser' });
  }

  // 시
  if (address.city) {
    keywords.push({ value: address.city, priority: priority++, source: 'addressParser' });
  }

  return keywords;
}
```

---

## 4. 설정 스키마

### 4.1 애플리케이션 설정

```json
// config.json
{
  "app": {
    "name": "리워드 키워드 메이커 V2",
    "version": "2.0.0"
  },

  "keyword": {
    "minLength": 6,
    "maxLength": 15,
    "maxCombinations": 150,
    "topN": 5
  },

  "validation": {
    "naturalThreshold": 5,
    "exactThreshold": 10,
    "requestDelay": 1500,
    "maxRetries": 3,
    "timeout": 10000
  },

  "output": {
    "directory": "./결과",
    "encoding": "utf-8-bom",
    "format": ["txt", "json"]
  },

  "integration": {
    "placeKeywordsMakerV2": {
      "enabled": true,
      "dataPath": "../place-keywords-maker-v2/data/output/l1"
    }
  }
}
```

### 4.2 업종별 설정

```json
// categories.json
{
  "미용실": {
    "aliases": ["헤어샵", "헤어", "미용", "헤어샵"],
    "menuPatterns": ["펌", "컷", "염색", "매직", "클리닉"],
    "attributeKeywords": ["예약", "주차", "1인샵", "남성전문", "여성전문"],
    "sentimentKeywords": ["친절", "손재주", "스타일", "센스"]
  },
  "카페": {
    "aliases": ["커피", "커피숍", "카페"],
    "menuPatterns": ["커피", "라떼", "디저트", "브런치", "베이커리"],
    "attributeKeywords": ["주차", "루프탑", "애견동반", "노키즈존", "스터디"],
    "sentimentKeywords": ["분위기", "감성", "힙한", "뷰맛집"]
  },
  "음식점": {
    "aliases": ["맛집", "레스토랑", "식당"],
    "menuPatterns": [],
    "attributeKeywords": ["주차", "예약", "배달", "포장", "단체"],
    "sentimentKeywords": ["맛있는", "가성비", "분위기", "친절"]
  }
}
```

---

## 5. 디렉토리 구조

```
Reward_keyword_maker_v2/
├── docs/                       # 개발 지침문서
│   ├── 00_INDEX.md
│   ├── 01_SPEC.md
│   ├── 02_KEYWORD_RULES.md
│   ├── 03_DATA_SCHEMA.md
│   ├── 04_INTEGRATION.md
│   └── 05_API_REFERENCE.md
│
├── src/                        # 소스 코드
│   ├── core/                   # 핵심 로직
│   │   ├── KeywordCollector.js
│   │   ├── KeywordCombinator.js
│   │   └── RankValidator.js
│   │
│   ├── parser/                 # 파서
│   │   ├── UrlParser.js
│   │   ├── AddressParser.js
│   │   └── KeywordClassifier.js
│   │
│   ├── integration/            # 외부 연동
│   │   └── PlaceKeywordsAdapter.js
│   │
│   ├── output/                 # 출력 처리
│   │   ├── TxtExporter.js
│   │   ├── JsonExporter.js
│   │   └── GoogleSheetsExporter.js
│   │
│   └── utils/                  # 유틸리티
│       ├── HttpClient.js
│       ├── Logger.js
│       └── Config.js
│
├── data/                       # 데이터
│   ├── input/                  # 입력 데이터
│   │   ├── keywords/           # 키워드 파일
│   │   └── categories.json     # 업종별 설정
│   │
│   └── output/                 # 출력 데이터
│       └── {MID}/              # MID별 결과
│
├── config/                     # 설정
│   ├── config.json
│   └── config.example.json
│
├── 결과/                       # V1 호환 출력 디렉토리
│
└── tests/                      # 테스트
    ├── unit/
    └── integration/
```

---

*문서 작성: 2025-12-16*
