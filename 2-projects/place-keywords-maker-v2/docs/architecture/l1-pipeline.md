# L1 — 데이터 수집 및 정렬

## 목적

새로운 대표키워드를 추출하기 위해 모든 가용 데이터를 **최대한 많이 수집**하고, 분석 가능한 형태로 **체계적으로 정렬**합니다. 현재 사용 중인 대표키워드도 수집하여 비교 분석의 기준으로 활용합니다.

## 핵심 원칙

1. **최대한 많은 데이터 수집**: 크롤러, 수동 입력, 현재 키워드, 경쟁사 등 모든 소스
2. **현재 상태 파악**: 기존 대표키워드 성능 분석
3. **체계적 정렬**: 후속 분석(L2)에 최적화된 구조로 변환
4. **품질 검증**: 누락/오류 데이터 사전 제거

## 입력 데이터

### 1. 크롤러 JSON 파일 ⭐
**위치**: `data/input/places-advanced/`
**파일명**: `{place_id}.json`

**수집 정보**:
```json
{
  "id": "1234567890",
  "name": "히도 강남점",
  "category": "닭갈비전문점",
  "address": "서울특별시 강남구 역삼동 123-45",
  "roadAddress": "서울특별시 강남구 테헤란로 123",

  // 메뉴 정보
  "menus": [
    {
      "name": "철판닭갈비",
      "price": "12000",
      "description": "매콤하고 고소한 닭갈비",
      "isRecommended": true
    }
  ],

  // 속성/편의시설
  "attributes": {
    "parking": true,
    "reservation": true,
    "delivery": false,
    "wifi": true,
    "privateRoom": true
  },

  // 리뷰 통계
  "visitorReviews": 1234,
  "blogReviews": 567,
  "rating": 4.5,

  // 기타
  "phone": "02-1234-5678",
  "businessHours": "매일 11:00-22:00",
  "images": ["url1", "url2"]
}
```

### 2. 현재 대표키워드 ⭐⭐
**위치**: `data/input/current_keywords.json`

**형식**:
```json
{
  "1234567890": {
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

### 3. 수동 메모
**위치**: `data/input/manual_notes.json`

**형식**:
```json
{
  "1234567890": {
    "target_keywords": ["닭갈비", "강남맛집"],
    "special_notes": "런치 세트 인기, 직장인 고객 많음",
    "brand_story": "20년 전통의 닭갈비 전문점",
    "representative_menu": ["철판닭갈비", "치즈닭갈비"],
    "business_goals": "회식 고객 확대, 저녁 매출 증대"
  }
}
```

### 4. 경쟁사 정보 (선택 사항)
**위치**: `data/input/competitors.json`

```json
{
  "competitors": [
    {
      "name": "경쟁사A",
      "category": "닭갈비전문점",
      "location": "강남역 인근",
      "keywords_used": ["강남역 닭갈비", "회식 장소"]
    }
  ]
}
```

## 처리 단계

### 1단계: 데이터 소스 스캔 및 목록화
모든 가용 데이터 소스를 스캔하여 수집 가능한 데이터를 파악합니다.

**스캔 로직**:
```javascript
// 의사코드
async function scanDataSources() {
  const sources = {
    crawler: {
      path: 'data/input/places-advanced/',
      files: await scanDirectory('*.json'),
      count: 0
    },
    current_keywords: {
      path: 'data/input/current_keywords.json',
      exists: await fileExists('current_keywords.json'),
      count: 0
    },
    manual_notes: {
      path: 'data/input/manual_notes.json',
      exists: await fileExists('manual_notes.json'),
      count: 0
    },
    competitors: {
      path: 'data/input/competitors.json',
      exists: await fileExists('competitors.json'),
      count: 0
    }
  };

  logger.info(`데이터 소스 스캔 완료:
    - 크롤러 JSON: ${sources.crawler.files.length}개
    - 현재 키워드: ${sources.current_keywords.exists ? '있음' : '없음'}
    - 수동 메모: ${sources.manual_notes.exists ? '있음' : '없음'}
    - 경쟁사 정보: ${sources.competitors.exists ? '있음' : '없음'}
  `);

  return sources;
}
```

**검증**:
- 크롤러 JSON은 필수 (없으면 중단)
- 현재 키워드는 강력 권장 (없으면 경고)
- 나머지는 선택 사항

### 2단계: 데이터 로딩 및 1차 파싱
각 소스에서 데이터를 로드하고 기본 파싱을 수행합니다.

**로딩 프로세스**:
```javascript
async function loadAllData(sources) {
  const rawData = {
    places: [],
    current_keywords: {},
    manual_notes: {},
    competitors: []
  };

  // 1. 크롤러 JSON 로딩
  for (const file of sources.crawler.files) {
    try {
      const json = await loadJSON(file);

      // 기본 검증
      if (json.id && json.name && json.category) {
        rawData.places.push(json);
      } else {
        logger.warn(`필수 필드 누락: ${file}`);
      }
    } catch (error) {
      logger.error(`JSON 파싱 실패: ${file}`, error);
    }
  }

  // 2. 현재 키워드 로딩
  if (sources.current_keywords.exists) {
    rawData.current_keywords = await loadJSON(sources.current_keywords.path);
    logger.info(`현재 키워드 로드: ${Object.keys(rawData.current_keywords).length}개 매장`);
  }

  // 3. 수동 메모 로딩
  if (sources.manual_notes.exists) {
    rawData.manual_notes = await loadJSON(sources.manual_notes.path);
  }

  // 4. 경쟁사 정보 로딩
  if (sources.competitors.exists) {
    const compData = await loadJSON(sources.competitors.path);
    rawData.competitors = compData.competitors || [];
  }

  return rawData;
}
```

### 3단계: 데이터 통합 및 구조화
모든 소스의 데이터를 하나의 통합 구조로 병합합니다.

**통합 로직**:
```javascript
function consolidateData(rawData) {
  const consolidated = [];

  for (const place of rawData.places) {
    const placeId = place.id;

    // 모든 소스 데이터 병합
    const unified = {
      // === 기본 정보 ===
      place_id: placeId,
      name: place.name,
      category: place.category,
      address: {
        full: place.address,
        road: place.roadAddress
      },

      // === 현재 키워드 (중요!) ===
      current_keywords: rawData.current_keywords[placeId] || null,

      // === 수동 입력 정보 ===
      manual: rawData.manual_notes[placeId] || {},

      // === 메뉴 정보 ===
      menus: place.menus || [],

      // === 속성 정보 ===
      attributes: place.attributes || {},

      // === 리뷰 통계 ===
      stats: {
        visitor_reviews: place.visitorReviews || 0,
        blog_reviews: place.blogReviews || 0,
        rating: place.rating || 0
      },

      // === 연락처 ===
      contact: {
        phone: place.phone,
        hours: place.businessHours
      },

      // === 원본 데이터 보존 ===
      _raw: {
        crawler: place,
        current_keywords: rawData.current_keywords[placeId],
        manual: rawData.manual_notes[placeId]
      }
    };

    consolidated.push(unified);
  }

  return consolidated;
}
```

### 4단계: 지역 정보 파싱 및 정규화
주소에서 지역 정보를 추출하고 표준화합니다.

**파싱 로직**:
```javascript
function parseAddress(address) {
  // 예: "서울특별시 강남구 역삼동 123-45"

  const regex = /^([가-힣]+특별시|[가-힣]+광역시|[가-힣]+시)?\s?([가-힣]+구|[가-힣]+군)?\s?([가-힣]+동|[가-힣]+읍|[가-힣]+면)?/;
  const match = address.match(regex);

  if (!match) {
    return { si: null, gu: null, dong: null, station: null };
  }

  // 정규화
  const si = normalizeRegion(match[1]);        // "서울특별시" → "서울"
  const gu = normalizeRegion(match[2]);        // "강남구" → "강남"
  const dong = normalizeRegion(match[3]);      // "역삼동" → "역삼"

  // 역 정보 추출 (매장명 또는 주소에서)
  const station = extractStation(address, match[0]);

  return { si, gu, dong, station };
}

function normalizeRegion(region) {
  if (!region) return null;

  return region
    .replace('특별시', '')
    .replace('광역시', '')
    .replace('구', '')
    .replace('군', '')
    .replace('동', '')
    .replace('읍', '')
    .replace('면', '')
    .trim();
}

function extractStation(fullText, address) {
  // "강남역", "역삼역" 등 추출
  const stationRegex = /([가-힣]+)역/;
  const match = fullText.match(stationRegex);

  if (match) {
    return match[1] + '역';  // "강남역"
  }

  return null;
}
```

**적용 예시**:
```javascript
for (const place of consolidated) {
  const parsed = parseAddress(place.address.full);

  place.address = {
    ...place.address,
    si: parsed.si,           // "서울"
    gu: parsed.gu,           // "강남"
    dong: parsed.dong,       // "역삼"
    station: parsed.station  // "강남역"
  };
}
```

### 5단계: 키워드 추출 요소 분류
후속 분석(L2)에서 활용할 모든 키워드 요소를 체계적으로 분류합니다.

**요소 분류 로직**:
```javascript
function classifyKeywordElements(place) {
  return {
    // === 핵심 요소 (Core) ===
    core_elements: {
      category: extractCoreCategory(place.category),
      // "닭갈비전문점" → "닭갈비"

      subcategory: extractSubCategory(place.category),
      // "전문점", "맛집", "레스토랑" 등

      brand: extractBrandName(place.name),
      // "히도 강남점" → "히도"

      manual_targets: place.manual.target_keywords || []
      // 수동 입력 타겟 키워드
    },

    // === 지역 요소 (Region) ===
    region_elements: {
      si: place.address.si,           // "서울"
      gu: place.address.gu,           // "강남"
      dong: place.address.dong,       // "역삼"
      station: place.address.station, // "강남역"

      // 조합 가능한 형태들
      combinations: [
        place.address.gu,                              // "강남"
        place.address.station,                         // "강남역"
        `${place.address.gu} ${place.address.dong}`,  // "강남 역삼"
        `${place.address.station} 인근`               // "강남역 인근"
      ].filter(Boolean)
    },

    // === 메뉴 요소 (Menu) ===
    menu_elements: {
      all_menus: place.menus.map(m => m.name),

      recommended: place.menus
        .filter(m => m.isRecommended)
        .map(m => m.name),

      representative: place.manual.representative_menu || [],

      price_range: calculatePriceRange(place.menus),
      // { min: 10000, max: 20000, avg: 15000 }
    },

    // === 속성 요소 (Attribute) ===
    attribute_elements: {
      facilities: Object.keys(place.attributes)
        .filter(key => place.attributes[key] === true),
      // ["parking", "reservation", "privateRoom"]

      amenities_text: convertToText(place.attributes)
      // ["주차 가능", "예약 가능", "룸 있음"]
    },

    // === 현재 키워드 (Current) ⭐ ===
    current_keywords: place.current_keywords ? {
      primary: place.current_keywords.primary_keywords,
      secondary: place.current_keywords.secondary_keywords,
      performance: place.current_keywords.performance,
      notes: place.current_keywords.notes
    } : null,

    // === 비즈니스 정보 ===
    business_context: {
      goals: place.manual.business_goals,
      special_notes: place.manual.special_notes,
      brand_story: place.manual.brand_story
    },

    // === 메타 정보 ===
    metadata: {
      review_count: place.stats.visitor_reviews,
      rating: place.stats.rating,
      has_manual_input: Object.keys(place.manual).length > 0,
      has_current_keywords: !!place.current_keywords,
      completeness: 0  // 다음 단계에서 계산
    }
  };
}
```

### 6단계: 데이터 완성도 평가
수집된 데이터의 품질과 완성도를 평가합니다.

**완성도 계산**:
```javascript
function assessDataCompleteness(elements) {
  const checks = {
    // 필수 요소 (각 20점)
    has_category: !!elements.core_elements.category,
    has_region: !!elements.region_elements.gu,
    has_menus: elements.menu_elements.all_menus.length > 0,

    // 중요 요소 (각 15점)
    has_current_keywords: !!elements.current_keywords,
    has_manual_targets: elements.core_elements.manual_targets.length > 0,

    // 보조 요소 (각 10점)
    has_attributes: elements.attribute_elements.facilities.length > 0,
    has_business_goals: !!elements.business_context.goals,

    // 추가 요소 (각 5점)
    has_station: !!elements.region_elements.station,
    has_recommended_menus: elements.menu_elements.recommended.length > 0
  };

  const score =
    (checks.has_category ? 20 : 0) +
    (checks.has_region ? 20 : 0) +
    (checks.has_menus ? 20 : 0) +
    (checks.has_current_keywords ? 15 : 0) +
    (checks.has_manual_targets ? 15 : 0) +
    (checks.has_attributes ? 10 : 0) +
    (checks.has_business_goals ? 5 : 0) +
    (checks.has_station ? 5 : 0) +
    (checks.has_recommended_menus ? 5 : 0);

  return {
    score: score,  // 0-115 (115점 만점)
    percentage: score / 115,
    level: score >= 90 ? 'HIGH' : score >= 60 ? 'MEDIUM' : 'LOW',
    checks: checks
  };
}
```

### 7단계: 데이터 정렬 및 우선순위 설정
분석 효율성을 위해 데이터를 정렬합니다.

**정렬 기준**:
```javascript
function sortCollectedData(data) {
  return data.sort((a, b) => {
    // 1차: 현재 키워드 있는 것 우선 (성능 비교 가능)
    const aHasCurrent = !!a.current_keywords;
    const bHasCurrent = !!b.current_keywords;
    if (aHasCurrent !== bHasCurrent) {
      return bHasCurrent - aHasCurrent;
    }

    // 2차: 데이터 완성도 높은 것 우선
    const aCompleteness = a.metadata.completeness.score;
    const bCompleteness = b.metadata.completeness.score;
    if (aCompleteness !== bCompleteness) {
      return bCompleteness - aCompleteness;
    }

    // 3차: 리뷰 많은 것 우선
    return b.metadata.review_count - a.metadata.review_count;
  });
}
```

### 8단계: 결과 저장
수집/정렬된 데이터를 JSON 파일로 저장합니다.

**저장 구조**:
```javascript
async function saveL1Results(data) {
  // 1. 전체 수집 데이터
  await saveJSON('data/output/l1/data_collected_l1.json', {
    generated_at: new Date().toISOString(),
    total_places: data.length,
    summary: {
      with_current_keywords: data.filter(p => p.current_keywords).length,
      with_manual_input: data.filter(p => Object.keys(p.manual).length > 0).length,
      avg_completeness: average(data.map(p => p.metadata.completeness.score))
    },
    places: data
  });

  // 2. 키워드 요소 목록
  await saveJSON('data/output/l1/keyword_elements_l1.json', {
    generated_at: new Date().toISOString(),
    elements: data.map(p => ({
      place_id: p.place_id,
      name: p.name,
      core: p.core_elements,
      region: p.region_elements,
      menu: p.menu_elements,
      attribute: p.attribute_elements,
      current: p.current_keywords
    }))
  });

  // 3. 현재 키워드 분석
  const placesWithCurrent = data.filter(p => p.current_keywords);
  await saveJSON('data/output/l1/current_keywords_l1.json', {
    generated_at: new Date().toISOString(),
    total_count: placesWithCurrent.length,
    keywords: placesWithCurrent.map(p => ({
      place_id: p.place_id,
      name: p.name,
      current_primary: p.current_keywords.primary,
      current_secondary: p.current_keywords.secondary,
      performance: p.current_keywords.performance
    }))
  });

  logger.info('L1 결과 저장 완료');
}
```

## 출력 데이터

### 1. data_collected_l1.json
```json
{
  "generated_at": "2025-10-22T10:00:00Z",
  "total_places": 15,
  "summary": {
    "with_current_keywords": 12,
    "with_manual_input": 10,
    "avg_completeness": 85.5
  },
  "places": [
    {
      "place_id": "1234567890",
      "name": "히도 강남점",
      "category": "닭갈비전문점",
      "address": {
        "full": "서울특별시 강남구 역삼동 123-45",
        "si": "서울",
        "gu": "강남",
        "dong": "역삼",
        "station": "강남역"
      },
      "current_keywords": {
        "primary": ["강남 닭갈비", "히도 강남점"],
        "secondary": ["강남 맛집"],
        "performance": {
          "avg_monthly_searches": 5000,
          "avg_click_rate": 0.15
        }
      },
      "core_elements": {...},
      "region_elements": {...},
      "menu_elements": {...},
      "attribute_elements": {...},
      "metadata": {
        "completeness": {
          "score": 95,
          "percentage": 0.826,
          "level": "HIGH"
        }
      }
    }
  ]
}
```

### 2. keyword_elements_l1.json
```json
{
  "generated_at": "2025-10-22T10:00:00Z",
  "elements": [
    {
      "place_id": "1234567890",
      "name": "히도 강남점",
      "core": {
        "category": "닭갈비",
        "brand": "히도",
        "manual_targets": ["닭갈비", "강남맛집"]
      },
      "region": {
        "gu": "강남",
        "station": "강남역",
        "combinations": ["강남", "강남역", "강남 역삼"]
      },
      "menu": {
        "all_menus": ["철판닭갈비", "치즈닭갈비"],
        "recommended": ["철판닭갈비"],
        "price_range": {"avg": 13000}
      },
      "attribute": {
        "facilities": ["parking", "privateRoom"],
        "amenities_text": ["주차 가능", "룸 있음"]
      },
      "current": {
        "primary": ["강남 닭갈비", "히도 강남점"]
      }
    }
  ]
}
```

### 3. current_keywords_l1.json
```json
{
  "generated_at": "2025-10-22T10:00:00Z",
  "total_count": 12,
  "keywords": [
    {
      "place_id": "1234567890",
      "name": "히도 강남점",
      "current_primary": ["강남 닭갈비", "히도 강남점"],
      "current_secondary": ["강남 맛집"],
      "performance": {
        "avg_monthly_searches": 5000,
        "avg_click_rate": 0.15,
        "conversion_rate": 0.05
      }
    }
  ]
}
```

## 검증 기준

### 필수 체크리스트
- ✅ 크롤러 JSON이 1개 이상 로드되었는가?
- ✅ 주소 파싱 성공률이 90% 이상인가?
- ✅ 모든 매장의 카테고리가 추출되었는가?
- ✅ 지역 정보(최소 구)가 파싱되었는가?
- ✅ 키워드 요소가 체계적으로 분류되었는가?

### 권장 체크리스트
- ✅ 현재 키워드 데이터가 포함되었는가?
- ✅ 수동 입력 데이터가 포함되었는가?
- ✅ 평균 데이터 완성도가 70% 이상인가?
- ✅ 메뉴 정보가 3개 이상 수집되었는가?

### 통과 기준
- 전체 매장 수: 1개 이상
- 데이터 로딩 성공률: 95% 이상
- 주소 파싱 성공률: 90% 이상
- 평균 완성도: 70점 이상 (115점 만점)

## 실행 방법

### CLI
```bash
# L1만 실행
node src/main.js l1 --brand=히도

# 입력 경로 지정
node src/main.js l1 \
  --input-dir=data/input/places-advanced \
  --current-keywords=data/input/current_keywords.json \
  --manual-notes=data/input/manual_notes.json

# 디버그 모드
node src/main.js l1 --brand=히도 --verbose
```

### GUI
1. "L1 시작" 버튼 클릭
2. 데이터 소스 자동 스캔
3. 수집 진행 상황 실시간 확인
4. 완성도 리포트 확인
5. "L2로 진행" 버튼 활성화

## 로그 예시

```
[INFO] L1 데이터 수집 시작
[INFO] 데이터 소스 스캔...
[INFO]   - 크롤러 JSON: 15개 발견
[INFO]   - 현재 키워드: 있음 (12개 매장)
[INFO]   - 수동 메모: 있음 (10개 매장)
[INFO] 데이터 로딩 시작...
[INFO] 크롤러 데이터 로드: 15/15 성공
[INFO] 현재 키워드 로드: 12개 매장
[INFO] 수동 메모 로드: 10개 매장
[INFO] 데이터 통합 중...
[INFO] 주소 파싱: 15/15 성공 (100%)
[INFO] 키워드 요소 분류 완료
[INFO] 데이터 완성도 평가:
  - HIGH: 10개 (66.7%)
  - MEDIUM: 4개 (26.7%)
  - LOW: 1개 (6.7%)
  - 평균: 85.5점
[INFO] 데이터 정렬 완료
[INFO] 결과 저장: data/output/l1/
[INFO] L1 완료 (소요 시간: 5.2초)
[INFO] 다음 단계: L2 분석 및 목표키워드 설정
```

## 오류 코드

| 코드 | 설명 | 조치 |
|------|------|------|
| E_L1_001 | 크롤러 JSON 없음 | 크롤러 실행 후 재시도 |
| E_L1_002 | JSON 파싱 실패 | 파일 형식 확인 |
| E_L1_003 | 필수 필드 누락 | 크롤러 설정 확인 |
| E_L1_004 | 주소 파싱 실패 | 주소 형식 확인 또는 수동 보정 |
| E_L1_005 | 데이터 완성도 낮음 | 추가 데이터 수집 권장 |

## 다음 단계

L1에서 수집/정렬된 데이터는 L2로 전달되어 다음 작업이 수행됩니다:

1. AI 기반 키워드 확장
2. **네이버 월간 검색량 조회**
3. 지역/속성별 키워드 조합
4. **목표키워드 설정 (단기/장기, 메인/서브)**

📄 [L2 — 분석 및 목표키워드 설정](l2.md)

## 참고 사항

### 현재 키워드 수집의 중요성
현재 사용 중인 대표키워드를 수집하는 이유:
1. **성능 비교**: 새 키워드 vs 현재 키워드 효과 비교
2. **개선 방향**: 유지/제거/추가 결정의 근거
3. **트렌드 파악**: 검색량 변화 추적
4. **ROI 계산**: 키워드 변경 효과 측정

### 데이터 품질 향상 팁
1. 크롤러 실행 전 네이버플레이스 정보 최신화
2. 수동 메모에 비즈니스 목표 명확히 기재
3. 현재 키워드 성능 데이터 정기 업데이트
4. 경쟁사 키워드도 주기적 수집

### 성능
- 매장당 처리 시간: ~0.3초
- 15개 매장 기준: ~5초
- 메모리 사용량: ~50MB
