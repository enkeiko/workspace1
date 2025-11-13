# CLI Contracts

## L1 (Data Collection & Keyword Elements Extraction)

### Input Files

**`data/input/place_ids.txt`**
```
1768171911
1265317185
1538590732
```

**`data/input/current_keywords.json`** (optional)
```json
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

**`data/input/manual_notes.json`** (optional)
```json
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

### Output: `data/output/l1/data_collected_l1.json`

```json
{
  "1768171911": {
    "place": {
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
      "blogReviews": [
        {
          "id": "blog123",
          "title": "히도 강남점 후기",
          "contents": "닭갈비가 정말 맛있습니다...",
          "author": "블로거A",
          "date": "2025-10-15",
          "url": "https://blog.naver.com/...",
          "images": ["https://..."],
          "tags": ["닭갈비", "강남맛집"]
        }
      ],
      "images": {
        "menu": [{"url": "https://...", "description": "철판닭갈비", "category": "MENU"}],
        "interior": [{"url": "https://...", "description": "실내", "category": "INTERIOR"}],
        "food": [{"url": "https://...", "description": "음식", "category": "FOOD"}],
        "all": []
      },
      "facilities": {
        "conveniences": ["주차", "와이파이"],
        "paymentInfo": ["신용카드", "현금"],
        "parkingInfo": "건물 지하 주차장"
      },
      "collectedAt": "2025-11-10T10:30:00Z"
    },
    "current_keywords": {
      "primary_keywords": ["강남 닭갈비", "히도 강남점"],
      "secondary_keywords": ["강남 맛집", "닭갈비 맛집"],
      "last_updated": "2025-09-15",
      "performance": {
        "avg_monthly_searches": 5000,
        "avg_click_rate": 0.15,
        "conversion_rate": 0.05
      },
      "notes": "9월 이후 '히도 강남점' 검색량 감소 추세"
    },
    "manual_notes": {
      "target_keywords": ["닭갈비", "강남맛집"],
      "special_notes": "런치 세트 인기, 직장인 고객 많음",
      "brand_story": "20년 전통의 닭갈비 전문점",
      "representative_menu": ["철판닭갈비", "치즈닭갈비"],
      "business_goals": "회식 고객 확대, 저녁 매출 증대"
    },
    "metadata": {
      "has_current_keywords": true,
      "has_manual_notes": true,
      "review_count": 150,
      "photo_count": 25,
      "menu_count": 8
    }
  }
}
```

### Output: `data/output/l1/keyword_elements_l1.json`

```json
{
  "1768171911": {
    "core_elements": {
      "category": "restaurant",
      "brand_name": "히도 강남점"
    },
    "region_elements": {
      "si": "서울",
      "gu": "강남구",
      "dong": "역삼동",
      "station": "강남역"
    },
    "menu_elements": {
      "all_menus": ["철판닭갈비", "치즈닭갈비", "볶음밥", "된장찌개"],
      "recommended": ["철판닭갈비", "치즈닭갈비"],
      "representative": ["철판닭갈비", "치즈닭갈비"]
    },
    "attribute_elements": {
      "facilities": ["주차", "와이파이"],
      "specialties": ["런치 세트 인기, 직장인 고객 많음"]
    },
    "current_keywords": {
      "primary_keywords": ["강남 닭갈비", "히도 강남점"],
      "secondary_keywords": ["강남 맛집", "닭갈비 맛집"]
    },
    "business_context": {
      "target_keywords": ["닭갈비", "강남맛집"],
      "goals": "회식 고객 확대, 저녁 매출 증대"
    }
  }
}
```

### Output: `data/output/l1/l1_errors.json`

```json
[
  {
    "code": "E_L1_001",
    "placeId": "9999999999",
    "message": "Crawler JSON file not found",
    "timestamp": "2025-11-10T10:35:00Z",
    "context": {
      "expectedPath": "data/input/places-advanced/place-9999999999-FULL.json"
    }
  }
]
```

---

## L2 (Keyword Candidates Generation)

### Input
- `data/output/l1/keyword_elements_l1.json` (from L1)

### Output: `data/output/l2/target_keywords_l2.json`

```json
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
        "rationale": "높은 검색량과 강한 메뉴 관련성"
      },
      {
        "keyword": "강남역 닭갈비",
        "type": "short_term",
        "classification": "main",
        "search_volume": 3800,
        "competition": 0.58,
        "relevance_score": 0.88,
        "rationale": "역 근처 검색 수요가 높음"
      },
      {
        "keyword": "히도 강남점",
        "type": "long_term",
        "classification": "main",
        "search_volume": 1200,
        "competition": 0.20,
        "relevance_score": 1.0,
        "rationale": "브랜드 인지도 강화용 키워드"
      },
      {
        "keyword": "강남 맛집",
        "type": "short_term",
        "classification": "sub",
        "search_volume": 15000,
        "competition": 0.85,
        "relevance_score": 0.65,
        "rationale": "검색량은 많지만 경쟁이 심함"
      },
      {
        "keyword": "강남역 철판닭갈비",
        "type": "short_term",
        "classification": "main",
        "search_volume": 2400,
        "competition": 0.45,
        "relevance_score": 0.85,
        "rationale": "대표 메뉴와 지역 결합으로 높은 전환율 예상"
      }
    ],
    "matrix_size": 125,
    "ai_analysis_used": true,
    "generated_at": "2025-11-10T11:00:00Z"
  }
}
```

### Output: `data/output/l2/l2_errors.json`

```json
[
  {
    "code": "E_L2_001",
    "placeId": "1768171911",
    "message": "AI API rate limit exceeded",
    "timestamp": "2025-11-10T11:05:00Z",
    "context": {
      "retryAfter": 60
    }
  }
]
```

---

## L3 (Final Strategy Generation)

### Input
- `data/output/l2/target_keywords_l2.json` (from L2)

### Output: `data/output/l3/keyword_strategy.json`

```json
{
  "1768171911": {
    "primary_keywords": [
      "강남 닭갈비",
      "강남역 닭갈비",
      "히도 강남점",
      "강남역 철판닭갈비",
      "역삼동 닭갈비"
    ],
    "secondary_keywords": [
      "강남 맛집",
      "강남 회식 장소",
      "닭갈비 맛집",
      "강남 직장인 맛집",
      "테헤란로 닭갈비",
      "강남 저녁 추천",
      "강남 한식",
      "역삼동 맛집",
      "치즈닭갈비 강남",
      "강남 주차 맛집"
    ],
    "strategy": {
      "focus": "balanced",
      "approach": "단기적으로 지역+카테고리 키워드로 유입을 확보하고, 장기적으로 브랜드명 인지도를 높입니다. 대표 메뉴인 철판닭갈비와 치즈닭갈비를 활용한 키워드로 전환율을 극대화합니다.",
      "expected_impact": "3개월 내 월간 검색 유입 30% 증가, 브랜드 검색 비율 15% 증가 예상"
    },
    "application_guide": "1. 네이버 플레이스 '업체 설명'에 primary_keywords 5개 자연스럽게 배치\n2. 메뉴 설명에 '강남역', '철판닭갈비' 등 핵심 키워드 포함\n3. 블로그 리뷰 작성 시 secondary_keywords 활용\n4. 월 1회 키워드 성과 모니터링 및 조정",
    "generated_at": "2025-11-10T11:30:00Z"
  }
}
```

### Output: `data/output/l3/l3_errors.json`

```json
[
  {
    "code": "E_L3_001",
    "placeId": "1768171911",
    "message": "Naver Search Ads API authentication failed",
    "timestamp": "2025-11-10T11:35:00Z",
    "context": {
      "apiEndpoint": "https://api.naver.com/keywordstool"
    }
  }
]
```

---

## CLI Usage Examples

### Run L1 (Data Collection)
```bash
node src/cli/main.js l1
# Output:
# Starting L1 processing for 3 places...
# [INFO] Processing place 1768171911
# [INFO] ✓ Completed place 1768171911
# [INFO] Processing place 1265317185
# [INFO] ✓ Completed place 1265317185
# [INFO] Processing place 1538590732
# [INFO] ✓ Completed place 1538590732
# ✓ L1 processing complete
#   Data collected: 3 places
#   Errors: 0
#   Output: data/output/l1/
```

### Run L2 (Keyword Candidates)
```bash
node src/cli/main.js l2 --mock-ai
# Output:
# Loading L1 keyword elements from data/output/l1/keyword_elements_l1.json
# [INFO] Generating keyword matrix for place 1768171911
# [INFO] Matrix size: 125 combinations
# [INFO] Calling AI to filter and score keywords
# [INFO] Selected 15 candidates
# ✓ L2 analysis complete
#   Places processed: 3
```

### Run L3 (Final Strategy)
```bash
node src/cli/main.js l3
# Output:
# Loading L2 candidates from data/output/l2/target_keywords_l2.json
# [INFO] Fetching search metrics for place 1768171911
# [INFO] Calculating strategy scores
# [INFO] Selected 5 primary keywords, 10 secondary keywords
# ✓ L3 strategy generation complete
```

### Custom Input/Output Paths
```bash
node src/cli/main.js l1 -i data/input/custom_places.txt -o data/output/custom_l1/
node src/cli/main.js l2 -i data/output/custom_l1/ -o data/output/custom_l2.json
node src/cli/main.js l3 -i data/output/custom_l2.json -o data/output/custom_l3.json
```

---

## Error Code Reference

### L1 Errors
- `E_L1_001` - Crawler JSON file not found
- `E_L1_002` - Invalid place data (missing required fields)
- `E_L1_003` - Bot detection triggered (max retries exceeded)
- `E_L1_004` - Network error during crawling

### L2 Errors
- `E_L2_001` - AI API rate limit exceeded
- `E_L2_002` - AI response parsing failed
- `E_L2_003` - Keyword matrix generation failed
- `E_L2_004` - Missing L1 input file

### L3 Errors
- `E_L3_001` - Naver Search Ads API authentication failed
- `E_L3_002` - Metrics fetching failed
- `E_L3_003` - Strategy scoring failed
- `E_L3_004` - Missing L2 input file

---

**Last Updated**: 2025-11-10
