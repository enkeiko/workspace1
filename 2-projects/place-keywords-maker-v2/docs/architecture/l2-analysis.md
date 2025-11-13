# L2 — 분석 및 목표키워드 설정

## 목적

L1에서 수집/정렬된 데이터를 AI와 마케터가 협업하여 심층 분석하고, **네이버 월간 검색량을 조회**하여, **목표키워드**(단기/장기, 메인/서브, 확장 방향)를 전략적으로 설정합니다.

## 핵심 원칙

1. **AI + 마케터 협업**: AI 자동 분석 + 마케터 전문 판단
2. **실제 검색량 기반**: 네이버 검색 광고 API로 정확한 월간 검색량 조회
3. **체계적 조합**: 지역/속성/메뉴를 분리하고 다시 조합하여 모든 가능성 탐색
4. **전략적 분류**: 단기/장기, 메인/서브 명확히 구분하여 실행 계획 수립

## 입력 데이터

### 1. data_collected_l1.json
**위치**: `data/output/l1/data_collected_l1.json`

```json
{
  "places": [
    {
      "place_id": "1234567890",
      "name": "히도 강남점",
      "core_elements": {...},
      "region_elements": {...},
      "menu_elements": {...},
      "attribute_elements": {...},
      "current_keywords": {...}
    }
  ]
}
```

### 2. keyword_elements_l1.json
**위치**: `data/output/l1/keyword_elements_l1.json`

키워드 추출 가능한 모든 요소 목록

## 처리 단계

### 1단계: 키워드 조합 매트릭스 생성
지역, 속성, 메뉴를 각각 분리한 후 체계적으로 조합합니다.

**분리 로직**:
```javascript
function decomposeElements(place) {
  return {
    // 지역 분리
    regions: [
      place.region_elements.gu,              // "강남"
      place.region_elements.station,         // "강남역"
      place.region_elements.dong,            // "역삼"
      `${place.region_elements.gu}역`,      // "강남역"
      `${place.region_elements.station} 인근` // "강남역 인근"
    ].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i),  // 중복 제거

    // 카테고리 (Core)
    categories: [
      place.core_elements.category,          // "닭갈비"
      `${place.core_elements.category}집`,   // "닭갈비집"
      `${place.core_elements.category}맛집`, // "닭갈비맛집"
      `${place.core_elements.category}전문점` // "닭갈비전문점"
    ],

    // 메뉴 분리
    menus: [
      ...place.menu_elements.all_menus,      // ["철판닭갈비", "치즈닭갈비"]
      ...place.menu_elements.representative  // 대표 메뉴
    ].filter((v, i, arr) => arr.indexOf(v) === i),

    // 속성 분리
    attributes: [
      ...place.attribute_elements.amenities_text,  // ["주차 가능", "룸 있음"]
      ...deriveAttributeKeywords(place.attribute_elements.facilities)
    ],

    // 수동 타겟
    manual_targets: place.core_elements.manual_targets || []
  };
}

function deriveAttributeKeywords(facilities) {
  const mapping = {
    'parking': ['주차 가능', '주차'],
    'privateRoom': ['룸 있는', '프라이빗룸', '룸'],
    'reservation': ['예약 가능', '예약'],
    'group_seating': ['회식', '단체석', '모임']
  };

  const keywords = [];
  for (const facility of facilities) {
    if (mapping[facility]) {
      keywords.push(...mapping[facility]);
    }
  }
  return keywords;
}
```

**조합 매트릭스 생성**:
```javascript
function generateKeywordMatrix(decomposed) {
  const matrix = [];

  // === 1. 지역 + 카테고리 ===
  for (const region of decomposed.regions) {
    for (const category of decomposed.categories) {
      matrix.push({
        keyword: `${region} ${category}`,
        type: 'REGION_CATEGORY',
        components: { region, category },
        priority_hint: 'high'  // 기본 조합이므로 높은 우선순위
      });
    }
  }

  // === 2. 지역 + 메뉴 ===
  for (const region of decomposed.regions) {
    for (const menu of decomposed.menus) {
      matrix.push({
        keyword: `${region} ${menu}`,
        type: 'REGION_MENU',
        components: { region, menu },
        priority_hint: 'medium'
      });
    }
  }

  // === 3. 지역 + 속성 ===
  for (const region of decomposed.regions) {
    for (const attr of decomposed.attributes) {
      // "강남 주차 가능" 또는 "강남 회식"
      matrix.push({
        keyword: `${region} ${attr}`,
        type: 'REGION_ATTRIBUTE',
        components: { region, attribute: attr },
        priority_hint: 'medium'
      });

      // "주차 가능한 강남 맛집" 형태
      matrix.push({
        keyword: `${attr} ${region} 맛집`,
        type: 'ATTRIBUTE_REGION_PLACE',
        components: { region, attribute: attr },
        priority_hint: 'low'
      });
    }
  }

  // === 4. 지역 + 속성 + 카테고리 ===
  for (const region of decomposed.regions) {
    for (const attr of decomposed.attributes) {
      for (const category of decomposed.categories.slice(0, 2)) {  // 상위 2개만
        matrix.push({
          keyword: `${region} ${attr} ${category}`,
          type: 'REGION_ATTRIBUTE_CATEGORY',
          components: { region, attribute: attr, category },
          priority_hint: 'low'
        });
      }
    }
  }

  // === 5. 카테고리 + 속성 ===
  for (const category of decomposed.categories) {
    for (const attr of decomposed.attributes) {
      matrix.push({
        keyword: `${attr} ${category}`,
        type: 'ATTRIBUTE_CATEGORY',
        components: { attribute: attr, category },
        priority_hint: 'medium'
      });
    }
  }

  // === 6. 메뉴 단독 ===
  for (const menu of decomposed.menus) {
    matrix.push({
      keyword: menu,
      type: 'MENU_ONLY',
      components: { menu },
      priority_hint: 'medium'
    });
  }

  // === 7. 수동 타겟 키워드 ===
  for (const target of decomposed.manual_targets) {
    matrix.push({
      keyword: target,
      type: 'MANUAL_TARGET',
      components: { manual: target },
      priority_hint: 'high'
    });
  }

  // 중복 제거
  const unique = matrix.filter((item, index, self) =>
    index === self.findIndex(t => t.keyword === item.keyword)
  );

  logger.info(`키워드 조합 매트릭스 생성: ${unique.length}개`);
  return unique;
}
```

**생성 예시**:
```
조합된 키워드 (일부):
1. 강남 닭갈비 (REGION_CATEGORY)
2. 강남역 닭갈비집 (REGION_CATEGORY)
3. 강남 철판닭갈비 (REGION_MENU)
4. 강남 주차 가능 (REGION_ATTRIBUTE)
5. 강남 회식 장소 (REGION_ATTRIBUTE)
6. 강남 룸 있는 닭갈비 (REGION_ATTRIBUTE_CATEGORY)
7. 주차 가능한 강남 맛집 (ATTRIBUTE_REGION_PLACE)
8. 철판닭갈비 (MENU_ONLY)
...
총 125개 키워드 생성
```

### 2단계: 네이버 월간 검색량 조회 ⭐⭐
생성된 모든 키워드의 실제 월간 검색량을 네이버 API로 조회합니다.

**API 연동**:
```javascript
// src/naver-api/search-volume.js
class NaverSearchVolumeAPI {
  constructor(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.apiUrl = 'https://api.naver.com/keywordstool';
    this.cache = new Map();  // 24시간 캐싱
  }

  async getMonthlyVolume(keywords) {
    // 배치 처리 (최대 100개씩)
    const batches = chunkArray(keywords, 100);
    const results = [];

    for (const batch of batches) {
      // 캐시 확인
      const uncached = batch.filter(k => !this.cache.has(k));

      if (uncached.length > 0) {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'X-Naver-Client-Id': this.clientId,
            'X-Naver-Client-Secret': this.clientSecret,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            keywords: uncached,
            period: 'monthly'  // 월간 검색량
          })
        });

        if (!response.ok) {
          throw new Error(`네이버 API 오류: ${response.status}`);
        }

        const data = await response.json();

        // 캐시 저장
        for (const item of data.results) {
          this.cache.set(item.keyword, {
            monthly_volume: item.monthlyPcQcCnt + item.monthlyMobileQcCnt,
            pc_volume: item.monthlyPcQcCnt,
            mobile_volume: item.monthlyMobileQcCnt,
            competition: item.compIdx,  // 경쟁 강도
            trend: this.analyzeTrend(item.monthlyTrend),
            cached_at: Date.now()
          });
        }

        // Rate limiting (분당 60회)
        await sleep(1000);
      }

      // 결과 수집
      for (const keyword of batch) {
        results.push({
          keyword,
          ...this.cache.get(keyword)
        });
      }
    }

    return results;
  }

  analyzeTrend(monthlyTrend) {
    // 최근 3개월 트렌드 분석
    const recent = monthlyTrend.slice(-3);
    const avg = recent.reduce((sum, v) => sum + v, 0) / recent.length;
    const prev = monthlyTrend.slice(-6, -3);
    const prevAvg = prev.reduce((sum, v) => sum + v, 0) / prev.length;

    if (avg > prevAvg * 1.2) return 'RISING';
    if (avg < prevAvg * 0.8) return 'FALLING';
    return 'STABLE';
  }
}
```

**조회 프로세스**:
```javascript
async function fetchSearchVolumes(matrix) {
  const api = new NaverSearchVolumeAPI(
    process.env.NAVER_CLIENT_ID,
    process.env.NAVER_CLIENT_SECRET
  );

  logger.info(`네이버 검색량 조회 시작: ${matrix.length}개 키워드`);

  const keywords = matrix.map(item => item.keyword);
  const volumes = await api.getMonthlyVolume(keywords);

  // 매트릭스에 검색량 병합
  for (const item of matrix) {
    const volumeData = volumes.find(v => v.keyword === item.keyword);

    if (volumeData) {
      item.monthly_volume = volumeData.monthly_volume;
      item.pc_volume = volumeData.pc_volume;
      item.mobile_volume = volumeData.mobile_volume;
      item.competition = volumeData.competition;
      item.trend = volumeData.trend;
    } else {
      item.monthly_volume = 0;
      item.trend = 'UNKNOWN';
    }
  }

  logger.info(`검색량 조회 완료:
    - 매칭 성공: ${matrix.filter(m => m.monthly_volume > 0).length}개
    - 검색량 없음: ${matrix.filter(m => m.monthly_volume === 0).length}개
  `);

  return matrix;
}
```

### 3단계: AI 분석 — 키워드 관련성 평가
AI로 각 키워드와 매장의 관련성을 평가합니다.

**AI 프롬프트**:
```javascript
async function analyzeRelevance(place, matrix) {
  const prompt = `
당신은 네이버 플레이스 SEO 전문가입니다.

[매장 정보]
- 이름: ${place.name}
- 카테고리: ${place.category}
- 위치: ${place.address.gu} ${place.address.dong}
- 대표 메뉴: ${place.menu_elements.representative.join(', ')}
- 주요 속성: ${place.attribute_elements.amenities_text.join(', ')}
- 비즈니스 목표: ${place.manual.business_goals}

[평가할 키워드 목록]
${matrix.map((m, i) => `${i+1}. ${m.keyword} (검색량: ${m.monthly_volume})`).join('\n')}

[평가 기준]
각 키워드를 다음 기준으로 0.0~1.0 점수를 부여하세요:
- 1.0: 매장의 핵심 정체성과 완벽 일치
- 0.8: 대표 메뉴/속성과 직접 연관
- 0.6: 매장 특성과 관련 있음
- 0.4: 간접적 연관
- 0.2: 약한 연관
- 0.0: 무관

[출력 형식]
JSON 배열로 반환:
[
  {"keyword": "강남 닭갈비", "relevance": 0.95, "reason": "핵심 지역+카테고리"},
  {"keyword": "강남 회식 장소", "relevance": 0.85, "reason": "룸 보유+비즈니스 목표 일치"},
  ...
]
`;

  const response = await callAI(prompt);
  return JSON.parse(response);
}
```

**AI 분석 결과 적용**:
```javascript
async function applyAIAnalysis(matrix, place) {
  const aiResults = await analyzeRelevance(place, matrix);

  for (const item of matrix) {
    const aiData = aiResults.find(r => r.keyword === item.keyword);

    if (aiData) {
      item.relevance_score = aiData.relevance;
      item.relevance_reason = aiData.reason;
    } else {
      // 폴백: 기본 점수
      item.relevance_score = 0.5;
    }
  }

  return matrix;
}
```

### 4단계: 마케터 검토 UI
마케터가 AI 분석 결과를 검토하고 수정합니다.

**GUI 인터페이스**:
```
┌──────────────────────────────────────────────────────────┐
│ L2: 키워드 분석 및 목표 설정                              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ 매장: 히도 강남점                                        │
│ 총 키워드: 125개 (검색량 있음: 87개)                     │
│                                                          │
│ ┌─ 키워드 매트릭스 (상위 20개) ───────────────────┐    │
│ │ 키워드           │ 월간 │ 트렌드│ 관련성│ 목표설정│   │
│ ├──────────────────┼──────┼───────┼───────┼─────────┤   │
│ │ 강남 닭갈비       │15000│ 🔺   │ 0.95 │[단기메인]│   │
│ │ 강남역 철판닭갈비 │ 8000│ 🔺   │ 0.92 │[단기메인]│   │
│ │ 강남 회식 장소   │ 3500│ ➡️   │ 0.88 │[단기서브]│   │
│ │ 치즈닭갈비       │12000│ 🔺   │ 0.85 │[장기메인]│   │
│ │ 강남 데이트 코스 │ 4200│ ➡️   │ 0.80 │[장기서브]│   │
│ │ 가성비 닭갈비    │ 2800│ 🔺   │ 0.75 │[확장]   │   │
│ └──────────────────────────────────────────────────┘     │
│                                                          │
│ [🔽 전체 보기] [📊 차트 보기] [💾 저장]               │
│                                                          │
│ 목표 설정 가이드:                                        │
│ • 단기 메인: 3개월 내 집중 공략 (상위 3-5개)            │
│ • 단기 서브: 3개월 내 보조 (롱테일)                     │
│ • 장기 메인: 6개월~1년 육성 (잠재력 높음)               │
│ • 장기 서브: 장기 롱테일                                │
│ • 확장: 신규 진입 분야                                  │
│                                                          │
│ [일괄 자동설정] [수동 조정] [L3로 진행]                 │
└──────────────────────────────────────────────────────────┘
```

### 5단계: 목표키워드 분류 및 설정
마케터 검토를 바탕으로 키워드를 전략적으로 분류합니다.

**자동 분류 로직**:
```javascript
function autoClassifyTargetKeywords(matrix, place) {
  // 점수 계산: 검색량 + 관련성 + 트렌드
  for (const item of matrix) {
    item.composite_score =
      normalizeVolume(item.monthly_volume) * 0.5 +
      item.relevance_score * 0.3 +
      (item.trend === 'RISING' ? 0.2 : item.trend === 'STABLE' ? 0.1 : 0);
  }

  // 정렬
  matrix.sort((a, b) => b.composite_score - a.composite_score);

  // 자동 분류
  const classified = {
    short_term: {
      main: [],
      sub: []
    },
    long_term: {
      main: [],
      sub: []
    },
    expansion: []
  };

  for (const item of matrix) {
    // 단기 메인: 고검색량 + 고관련성 + 트렌드 상승
    if (
      item.monthly_volume >= 5000 &&
      item.relevance_score >= 0.8 &&
      classified.short_term.main.length < 5
    ) {
      classified.short_term.main.push(item);
      item.target_category = 'short_term_main';
      item.priority = 1.0;
    }
    // 단기 서브: 중간 검색량 + 중간 관련성
    else if (
      item.monthly_volume >= 1000 &&
      item.relevance_score >= 0.6 &&
      classified.short_term.sub.length < 10
    ) {
      classified.short_term.sub.push(item);
      item.target_category = 'short_term_sub';
      item.priority = 0.9;
    }
    // 장기 메인: 트렌드 상승 + 고관련성 (검색량 무관)
    else if (
      item.trend === 'RISING' &&
      item.relevance_score >= 0.75 &&
      classified.long_term.main.length < 5
    ) {
      classified.long_term.main.push(item);
      item.target_category = 'long_term_main';
      item.priority = 0.8;
    }
    // 장기 서브
    else if (
      item.relevance_score >= 0.5 &&
      classified.long_term.sub.length < 10
    ) {
      classified.long_term.sub.push(item);
      item.target_category = 'long_term_sub';
      item.priority = 0.7;
    }
    // 확장: 낮은 검색량이지만 트렌드 상승
    else if (
      item.trend === 'RISING' &&
      item.monthly_volume < 1000 &&
      classified.expansion.length < 5
    ) {
      classified.expansion.push(item);
      item.target_category = 'expansion';
      item.priority = 0.6;
    }
  }

  return classified;
}
```

**마케터 수동 조정**:
```javascript
function allowManualAdjustment(classified, marketerInput) {
  // 마케터가 GUI에서 조정한 내용 반영
  for (const adjustment of marketerInput) {
    const item = findKeyword(classified, adjustment.keyword);

    if (item) {
      // 기존 분류에서 제거
      removeFromCategory(classified, item);

      // 새 분류로 이동
      item.target_category = adjustment.new_category;
      item.priority = getCategoryPriority(adjustment.new_category);
      item.manual_override = true;

      addToCategory(classified, item, adjustment.new_category);
    }
  }

  return classified;
}
```

### 6단계: 현재 키워드와 비교 분석
L1에서 수집한 현재 키워드와 비교합니다.

**비교 로직**:
```javascript
function compareWithCurrentKeywords(classified, currentKeywords) {
  if (!currentKeywords) {
    return { comparison: null, insights: ['현재 키워드 없음'] };
  }

  const newPrimary = [
    ...classified.short_term.main,
    ...classified.long_term.main
  ].map(k => k.keyword);

  const currentPrimary = currentKeywords.primary_keywords;

  const comparison = {
    keep: currentPrimary.filter(k => newPrimary.includes(k)),
    remove: currentPrimary.filter(k => !newPrimary.includes(k)),
    add: newPrimary.filter(k => !currentPrimary.includes(k))
  };

  const insights = [];

  // 유지
  for (const keyword of comparison.keep) {
    insights.push(`✅ "${keyword}" 유지 - 지속적으로 효과적`);
  }

  // 제거
  for (const keyword of comparison.remove) {
    const reason = analyzeRemovalReason(keyword, classified);
    insights.push(`❌ "${keyword}" 제거 권장 - ${reason}`);
  }

  // 추가
  for (const keyword of comparison.add) {
    const item = classified.short_term.main.find(k => k.keyword === keyword) ||
                 classified.long_term.main.find(k => k.keyword === keyword);
    insights.push(`✨ "${keyword}" 신규 추가 - 검색량 ${item.monthly_volume}, 트렌드 ${item.trend}`);
  }

  return { comparison, insights };
}
```

### 7단계: 분석 리포트 생성
마케터용 분석 리포트를 생성합니다.

**리포트 구조**:
```markdown
# L2 분석 리포트

## 매장 정보
- **이름**: 히도 강남점
- **분석일**: 2025-10-22
- **총 키워드 조합**: 125개
- **검색량 있음**: 87개 (69.6%)

## 키워드 분류

### 단기 메인 (3개월 집중)
| 순위 | 키워드 | 월간 검색량 | 트렌드 | 관련성 | 전략 |
|------|--------|-------------|--------|--------|------|
| 1 | 강남 닭갈비 | 15,000 | 🔺 | 0.95 | 블로그 10개, 메타태그 최우선 |
| 2 | 강남역 철판닭갈비 | 8,000 | 🔺 | 0.92 | 시그니처 메뉴 강조 |
| 3 | 강남 회식 장소 | 3,500 | ➡️ | 0.88 | 회식 시즌 이벤트 |

### 장기 메인 (6개월 육성)
| 순위 | 키워드 | 월간 검색량 | 트렌드 | 관련성 | 전략 |
|------|--------|-------------|--------|--------|------|
| 1 | 치즈닭갈비 맛집 | 12,000 | 🔺 | 0.85 | 6개월 콘텐츠 육성 |
| 2 | 강남 데이트 코스 | 4,200 | ➡️ | 0.80 | 분위기 사진 강화 |

## 현재 키워드와 비교
- ✅ "강남 닭갈비" 유지
- ❌ "히도 강남점" 제거 권장 - 검색량 낮음 (200)
- ✨ "강남역 철판닭갈비" 신규 추가 - 검색량 8,000, 트렌드 상승

## AI 인사이트
- "강남 회식 장소"는 비즈니스 목표(회식 고객 확대)와 완벽 일치
- 트렌드 상승 키워드 15개 발견 - 선제 투자 권장
- 현재 키워드 대비 예상 트래픽 증가: +35%

## 다음 액션
1. 단기 메인 3개 키워드 중심 블로그 작성
2. 시그니처 메뉴 "철판닭갈비" 사진 보강
3. 회식 시즌(11-12월) 대비 이벤트 기획
```

## 출력 데이터

### 1. analyzed_keywords_l2.json
```json
{
  "place_id": "1234567890",
  "generated_at": "2025-10-22T10:30:00Z",
  "total_keywords": 125,
  "with_volume": 87,
  "keywords": [
    {
      "keyword": "강남 닭갈비",
      "type": "REGION_CATEGORY",
      "monthly_volume": 15000,
      "trend": "RISING",
      "relevance_score": 0.95,
      "composite_score": 0.92,
      "target_category": "short_term_main",
      "priority": 1.0
    }
  ]
}
```

### 2. target_keywords_l2.json
```json
{
  "place_id": "1234567890",
  "generated_at": "2025-10-22T10:30:00Z",
  "short_term": {
    "main": [
      {"keyword": "강남 닭갈비", "volume": 15000, "priority": 1.0},
      {"keyword": "강남역 철판닭갈비", "volume": 8000, "priority": 0.98}
    ],
    "sub": [...]
  },
  "long_term": {
    "main": [...],
    "sub": [...]
  },
  "expansion": [...]
}
```

### 3. keyword_matrix_l2.csv
```csv
keyword,type,monthly_volume,pc_volume,mobile_volume,trend,competition,relevance_score,target_category,priority
강남 닭갈비,REGION_CATEGORY,15000,5000,10000,RISING,HIGH,0.95,short_term_main,1.0
강남역 철판닭갈비,REGION_MENU,8000,2500,5500,RISING,MEDIUM,0.92,short_term_main,0.98
...
```

### 4. analysis_report_l2.md
마크다운 형식의 분석 리포트 (위 참고)

## 검증 기준

- ✅ 네이버 검색량 조회 성공률 80% 이상
- ✅ 단기 메인 키워드 3-5개 선정
- ✅ 전체 키워드의 70% 이상이 목표 분류됨
- ✅ 현재 키워드와 비교 분석 완료
- ✅ 마케터 검토 완료

## 실행 방법

```bash
# L2 실행
node src/main.js l2 --brand=히도 --naver-api-key=YOUR_KEY

# GUI 모드
npm run gui
# → L2 탭에서 진행
```

## 로그 예시

```
[INFO] L2 분석 시작: place_id=1234567890
[INFO] 키워드 조합 매트릭스 생성: 125개
[INFO] 네이버 검색량 조회 시작...
[INFO] 네이버 API 호출: 배치 1/2
[INFO] 네이버 API 호출: 배치 2/2
[INFO] 검색량 조회 완료: 87개 성공
[INFO] AI 관련성 분석 시작...
[INFO] AI 분석 완료 (소요: 25초)
[INFO] 자동 분류 완료:
  - 단기 메인: 5개
  - 단기 서브: 10개
  - 장기 메인: 5개
  - 장기 서브: 8개
  - 확장: 3개
[INFO] 마케터 검토 대기 중...
[INFO] 마케터 검토 완료 (수정: 3건)
[INFO] 결과 저장: data/output/l2/
[INFO] L2 완료 (총 소요: 3분 15초)
```

## 다음 단계

📄 [L3 — 최종 대표키워드 조합](l3.md)

---

**소요 시간**: ~3분 (AI 분석 30초 + 네이버 API 2분 + 마케터 검토 별도)
**비용**: ~$0.10 (AI API)
