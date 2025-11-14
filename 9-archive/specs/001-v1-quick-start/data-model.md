# Data Model (Phase 1)
# 데이터 모델 (1단계)

Based on existing Place_Keywords_maker implementation (JavaScript/Node.js)
기존 Place_Keywords_maker 구현 기반 (JavaScript/Node.js)

## Core Entities
## 핵심 엔티티

### Place (매장)
**Purpose**: Central data structure from Naver Place crawling
**목적**: 네이버 플레이스 크롤링의 중심 데이터 구조

**TypeScript Interface**:
```typescript
interface Place {
  // Basic Info
  id: string;                    // Naver Place ID
  name: string;
  category: string;              // e.g., "restaurant", "cafe"
  roadAddress: string;
  address: string;
  phone: string | null;
  virtualPhone: string | null;
  talktalkUrl: string | null;

  // Coordinate
  coordinate: {
    lat: number;
    lng: number;
  };

  // Menu Information
  menus: Menu[];

  // Review Statistics
  reviewStats: {
    total: number;               // visitorReviewsTotal
    textTotal: number;           // visitorReviewsTextReviewTotal
    score: number;               // visitorReviewsScore (e.g., 4.5)
    microReviews: string[];      // Short review keywords
  };

  // Blog Reviews
  blogReviews: BlogReview[];

  // Images
  images: {
    menu: ImageData[];
    interior: ImageData[];
    food: ImageData[];
    all: ImageData[];
  };

  // Facilities
  facilities: {
    conveniences: string[];      // e.g., ["parking", "wifi"]
    paymentInfo: string[];
    parkingInfo: string | null;
  };

  // Metadata
  visitorReviewsCount: number;
  blogReviewCount: number;
  rating: number;
  businessHours: any | null;     // Business hours data
  url: string;                   // Full Naver Place URL
  collectedAt: string;           // ISO 8601 timestamp
}
```

**Example**:
```javascript
{
  "id": "1768171911",
  "name": "히도 강남점",
  "category": "restaurant",
  "roadAddress": "서울특별시 강남구 테헤란로 123",
  "address": "서울특별시 강남구 역삼동 123-45",
  "phone": "02-1234-5678",
  "coordinate": {
    "lat": 37.498095,
    "lng": 127.027610
  },
  "menus": [
    {
      "name": "철판닭갈비",
      "price": 15000,
      "priceFormatted": "15,000원",
      "description": "매콤한 닭갈비",
      "recommend": true,
      "images": ["https://..."]
    }
  ],
  "reviewStats": {
    "total": 150,
    "textTotal": 45,
    "score": 4.5,
    "microReviews": ["맛있어요", "친절해요"]
  },
  "collectedAt": "2025-11-10T10:30:00Z"
}
```

---

### Menu (메뉴)
**Purpose**: Individual menu item from restaurant/cafe
**목적**: 식당/카페의 개별 메뉴 항목

```typescript
interface Menu {
  name: string;
  price: number | null;
  priceFormatted: string | null;  // e.g., "15,000원"
  description: string;
  recommend: boolean;              // Is this a recommended menu?
  images: string[];                // Image URLs
}
```

---

### BlogReview (블로그 리뷰)
**Purpose**: User-generated blog review collected from Apollo State
**목적**: Apollo State에서 수집한 사용자 생성 블로그 리뷰

```typescript
interface BlogReview {
  id: string;
  title: string;
  contents: string;                // Full review text
  author: string;                  // Blogger name
  date: string;                    // Review date
  url: string;                     // Blog URL
  images: string[];                // Review images
  tags: string[];                  // Review tags/hashtags
  rank: number | null;             // Review ranking
}
```

---

### ImageData (이미지 데이터)
**Purpose**: Categorized image information
**목적**: 분류된 이미지 정보

```typescript
interface ImageData {
  url: string;
  description: string;
  category: 'MENU' | 'INTERIOR' | 'FOOD' | 'unknown';
}
```

---

### CurrentKeywords (현재 키워드)
**Purpose**: Store's currently used keywords and performance data
**목적**: 매장의 현재 사용 중인 키워드 및 성과 데이터

**File**: `data/input/current_keywords.json`

```typescript
interface CurrentKeywords {
  [placeId: string]: {
    primary_keywords: string[];
    secondary_keywords: string[];
    last_updated: string;          // ISO 8601 date
    performance: {
      avg_monthly_searches: number;
      avg_click_rate: number;      // 0.0 - 1.0
      conversion_rate: number;     // 0.0 - 1.0
    };
    notes: string;
  };
}
```

**Example**:
```javascript
{
  "1768171911": {
    "primary_keywords": ["강남 닭갈비", "히도 강남점"],
    "secondary_keywords": ["강남 맛집", "닭갈비 맛집"],
    "last_updated": "2025-09-15",
    "performance": {
      "avg_monthly_searches": 5000,
      "avg_click_rate": 0.15,
      "conversion_rate": 0.05
    },
    "notes": "9월 이후 '히도 강남점' 검색량 감소 추세"
  }
}
```

---

### ManualNotes (수동 메모)
**Purpose**: Manually entered business context and goals
**목적**: 수동으로 입력한 비즈니스 컨텍스트 및 목표

**File**: `data/input/manual_notes.json`

```typescript
interface ManualNotes {
  [placeId: string]: {
    target_keywords: string[];
    special_notes: string;
    brand_story: string;
    representative_menu: string[];
    business_goals: string;
  };
}
```

**Example**:
```javascript
{
  "1768171911": {
    "target_keywords": ["닭갈비", "강남맛집"],
    "special_notes": "런치 세트 인기, 직장인 고객 많음",
    "brand_story": "20년 전통의 닭갈비 전문점",
    "representative_menu": ["철판닭갈비", "치즈닭갈비"],
    "business_goals": "회식 고객 확대, 저녁 매출 증대"
  }
}
```

---

## L1 Output Models
## L1 출력 모델

### L1 Data Collected (L1 수집 데이터)
**File**: `data/output/l1/data_collected_l1.json`

```typescript
interface L1DataCollected {
  [placeId: string]: {
    place: Place;                  // Full place data
    current_keywords: any | null;  // From current_keywords.json
    manual_notes: any | null;      // From manual_notes.json
    metadata: {
      has_current_keywords: boolean;
      has_manual_notes: boolean;
      review_count: number;
      photo_count: number;
      menu_count: number;
    };
  };
}
```

---

### L1 Keyword Elements (L1 키워드 요소)
**File**: `data/output/l1/keyword_elements_l1.json`

```typescript
interface L1KeywordElements {
  [placeId: string]: {
    core_elements: {
      category: string;
      brand_name: string;
    };

    region_elements: {
      si: string | null;           // e.g., "서울"
      gu: string | null;           // e.g., "강남구"
      dong: string | null;         // e.g., "역삼동"
      station: string | null;      // e.g., "강남역"
    };

    menu_elements: {
      all_menus: string[];
      recommended: string[];
      representative: string[];    // From manual_notes
    };

    attribute_elements: {
      facilities: string[];
      specialties: string[];
    };

    current_keywords: any | null;  // Existing keywords

    business_context: {
      target_keywords: string[];
      goals: string | null;
    };
  };
}
```

---

## L2 Output Models
## L2 출력 모델

### L2 Keyword Candidates (L2 키워드 후보)
**File**: `data/output/l2/target_keywords_l2.json`

```typescript
interface L2KeywordCandidates {
  [placeId: string]: {
    candidates: KeywordCandidate[];
    matrix_size: number;           // Total combinations generated
    ai_analysis_used: boolean;     // true if real AI, false if mock
    generated_at: string;          // ISO 8601 timestamp
  };
}

interface KeywordCandidate {
  keyword: string;
  type: 'short_term' | 'long_term';
  classification: 'main' | 'sub';
  search_volume: number | null;   // From Naver API or Mock
  competition: number | null;     // 0.0 - 1.0
  relevance_score: number | null; // From AI analysis
  rationale: string;               // Why this keyword was selected
}
```

**Example**:
```javascript
{
  "1768171911": {
    "candidates": [
      {
        "keyword": "강남 닭갈비",
        "type": "short_term",
        "classification": "main",
        "search_volume": 5200,
        "competition": 0.65,
        "relevance_score": 0.92,
        "rationale": "High search volume, strong menu relevance"
      }
    ],
    "matrix_size": 125,
    "ai_analysis_used": true,
    "generated_at": "2025-11-10T11:00:00Z"
  }
}
```

---

## L3 Output Models (Future)
## L3 출력 모델 (향후)

### L3 Final Strategy (L3 최종 전략)
**File**: `data/output/l3/keyword_strategy.json`

```typescript
interface L3FinalStrategy {
  [placeId: string]: {
    primary_keywords: string[];    // Top 5 main keywords
    secondary_keywords: string[];  // Top 10 supporting keywords
    strategy: {
      focus: 'short_term' | 'long_term' | 'balanced';
      approach: string;
      expected_impact: string;
    };
    application_guide: string;     // How to apply to Naver Place
    generated_at: string;
  };
}
```

---

## Error Logging Models
## 에러 로깅 모델

### ErrorLog (에러 로그)
```typescript
interface ErrorLog {
  code: string;                    // E_{MODULE}_{NUMBER}
  message: string;
  message_ko: string;
  message_en: string;
  recoveryGuide_ko: string;
  recoveryGuide_en: string;
  timestamp: string;               // ISO 8601
  context: any;                    // Additional error context
}
```

**Example**:
```javascript
{
  "code": "E_L1_001",
  "message_ko": "크롤러 JSON 파일을 찾을 수 없습니다.",
  "message_en": "Crawler JSON file not found.",
  "recoveryGuide_ko": "1. 크롤링을 먼저 실행하세요\\n2. data/input/places-advanced/ 폴더 확인",
  "recoveryGuide_en": "1. Run crawling first\\n2. Check data/input/places-advanced/ folder",
  "timestamp": "2025-11-10T10:30:00Z",
  "context": {
    "placeId": "1768171911",
    "expectedPath": "data/input/places-advanced/place-1768171911-FULL.json"
  }
}
```

---

## Pipeline Stage Result
## 파이프라인 단계 결과

```typescript
interface PipelineStageResult {
  stage: 'L1' | 'L2' | 'L3';
  placeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input: any;                      // Input data summary
  output: any;                     // Output data summary
  processingTime: number;          // milliseconds
  statistics: {
    items_processed: number;
    items_failed: number;
    [key: string]: any;
  };
  errors: ErrorLog[];
  createdAt: string;               // ISO 8601
}
```

---

## Validation Rules
## 검증 규칙

### Place Validation
```javascript
function validatePlace(place) {
  const required = ['id', 'name', 'category'];
  const missing = required.filter(field => !place[field]);

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }

  return true;
}
```

### Menu Validation
```javascript
function validateMenu(menu) {
  if (!menu.name || menu.name.trim() === '') {
    throw new Error('Menu name is required');
  }

  return true;
}
```

---

**Last Updated**: 2025-11-10
**마지막 업데이트**: 2025-11-10
