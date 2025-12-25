# 02. 키워드 조합 원칙 (KEYWORD_RULES)

> **문서 버전**: 1.0.0
> **최종 수정**: 2025-12-16

---

## 1. 5분류 키워드 체계

### 1.1 분류 정의

| 분류 | 코드 | 설명 | 예시 |
|------|------|------|------|
| **업종** | CORE | 업종/서비스 키워드 | 미용실, 헤어샵, 카페, 한식 |
| **지역** | LOCATION | 지역/위치 키워드 | 강남역, 역삼동, 홍대, 서울 |
| **메뉴** | MENU | 메뉴/상품 키워드 | 히피펌, C컬펌, 아메리카노 |
| **속성** | ATTRIBUTE | 속성/분위기 키워드 | 주차가능, 예약, 분위기좋은 |
| **감성** | SENTIMENT | 감성/평가 키워드 | 친절한, 맛있는, 재방문 |

### 1.2 분류별 수집 소스

```
┌─────────────┬───────────────────────────────────────────────────┐
│ 분류        │ 데이터 소스                                        │
├─────────────┼───────────────────────────────────────────────────┤
│ CORE        │ • category (기본 카테고리)                         │
│             │ • seoKeywords (업주 설정 SEO 키워드)               │
│             │ • representativeKeywords                          │
├─────────────┼───────────────────────────────────────────────────┤
│ LOCATION    │ • address → AddressParser                         │
│             │   - 상권명 (홍대, 강남, 신촌)                      │
│             │   - 역명 (강남역, 홍대입구역)                      │
│             │   - 동명 (역삼동, 서교동)                          │
│             │   - 구명 (강남구, 마포구)                          │
│             │   - 시명 (서울, 부산)                              │
├─────────────┼───────────────────────────────────────────────────┤
│ MENU        │ • menus (메뉴 리스트)                              │
│             │   - 추천메뉴 우선                                  │
│             │   - 인기메뉴 (주문수 기준)                         │
├─────────────┼───────────────────────────────────────────────────┤
│ ATTRIBUTE   │ • facilities (시설 정보)                           │
│             │   - 주차, WiFi, 포장, 배달 등                      │
│             │ • description (업체 소개)                          │
│             │ • businessHours (영업시간 특성)                    │
├─────────────┼───────────────────────────────────────────────────┤
│ SENTIMENT   │ • votedKeywords (사용자 투표 키워드)               │
│             │ • blogReviews (블로그 리뷰 분석)                   │
│             │ • reviewSummary (리뷰 요약)                        │
└─────────────┴───────────────────────────────────────────────────┘
```

---

## 2. 조합 원칙

### 2.1 원칙 1: 검색 의도 기반 조합

**사용자 검색 패턴 분석:**
```
검색 패턴                    | 빈도  | 의도
─────────────────────────────┼───────┼────────────────
지역 + 업종                  | 60%   | 가장 일반적
지역 + 메뉴                  | 20%   | 특정 서비스 탐색
지역 + 속성 + 업종           | 15%   | 조건부 탐색
지역 + 감성 + 업종           | 5%    | 경험 중심 탐색
```

**조합 순서 규칙:**
```
✅ 올바른 순서: LOCATION이 항상 앞
   "강남역 미용실"
   "홍대 히피펌"
   "신촌 주차가능 카페"

❌ 잘못된 순서: LOCATION이 뒤
   "미용실 강남역"
   "히피펌 홍대"
```

### 2.2 원칙 2: 글자수 제한

```
┌─────────────┬────────────────┬─────────────────────────────────┐
│ 글자수      │ 판정           │ 예시                             │
├─────────────┼────────────────┼─────────────────────────────────┤
│ < 6자       │ 너무 짧음      │ "강남 카페" (5자)                │
│             │ → 경쟁 과다    │ 순위 확보 어려움                 │
├─────────────┼────────────────┼─────────────────────────────────┤
│ 6~15자      │ ✅ 적정        │ "강남역 브런치 카페" (10자)      │
│             │ → 권장 범위    │ 적정 경쟁, 의도 명확             │
├─────────────┼────────────────┼─────────────────────────────────┤
│ > 15자      │ 너무 김        │ "강남역 주차가능 브런치 맛집"    │
│             │ → 검색량 희박  │ (17자) 자동 제외                 │
└─────────────┴────────────────┴─────────────────────────────────┘
```

**구현:**
```javascript
const MIN_LENGTH = 6;
const MAX_LENGTH = 15;

function isValidLength(keyword) {
  const length = keyword.replace(/\s/g, '').length; // 공백 제외
  return length >= MIN_LENGTH && length <= MAX_LENGTH;
}
```

### 2.3 원칙 3: 조합 우선순위 (Tier 시스템)

```
┌────────────────────────────────────────────────────────────────┐
│ Tier 1 (필수 생성) - 검색량 높음                                │
├────────────────────────────────────────────────────────────────┤
│ 패턴                        │ 예시                              │
│ LOCATION + CORE             │ "강남역 미용실"                   │
│ LOCATION + MENU (인기)      │ "홍대 히피펌"                     │
│ LOCATION(상세) + CORE       │ "역삼동 헤어샵"                   │
├────────────────────────────────────────────────────────────────┤
│ 생성 우선순위: 1                                                │
│ 예상 생성 수: LOCATION × CORE + LOCATION × MENU(상위 N개)       │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ Tier 2 (권장 생성) - 검색량 중간                                │
├────────────────────────────────────────────────────────────────┤
│ 패턴                        │ 예시                              │
│ LOCATION + ATTRIBUTE + CORE │ "신촌 예약가능 미용실"            │
│ LOCATION + MENU (일반)      │ "강남 레이어드컷"                 │
│ LOCATION(광역) + CORE       │ "서울 미용실"                     │
├────────────────────────────────────────────────────────────────┤
│ 생성 우선순위: 2                                                │
│ 예상 생성 수: 제한적 (상위 조합만)                               │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ Tier 3 (선택 생성) - 검색량 낮음 (롱테일)                       │
├────────────────────────────────────────────────────────────────┤
│ 패턴                        │ 예시                              │
│ LOCATION + SENTIMENT + CORE │ "홍대 친절한 헤어샵"              │
│ LOCATION + MENU + ATTRIBUTE │ "강남역 히피펌 예약"              │
│ 3개 이상 조합               │ "역삼 주차가능 남자 미용실"       │
├────────────────────────────────────────────────────────────────┤
│ 생성 우선순위: 3                                                │
│ 예상 생성 수: 선택적                                            │
└────────────────────────────────────────────────────────────────┘
```

### 2.4 원칙 4: 중복 및 유사 키워드 처리

**중복 제거 규칙:**
```
1. 완전 중복
   "강남역 미용실" = "강남역 미용실"
   → 1개만 유지

2. 순서 중복
   "미용실 강남역" ≈ "강남역 미용실"
   → LOCATION 앞 버전만 유지

3. 유사 중복
   "강남역 미용실" vs "강남역 미용"
   → 둘 다 유지 (검색 결과 다름)

4. 공백 차이
   "강남역미용실" vs "강남역 미용실"
   → 공백 있는 버전만 유지 (가독성)
```

**동의어 처리:**
```
동의어 그룹: ["미용실", "헤어샵", "헤어", "미용"]

처리 방식:
- 각 동의어별로 별도 조합 생성
- "강남역 미용실", "강남역 헤어샵", "강남역 헤어" 모두 생성
- 검색 결과가 다르므로 각각 유지
```

### 2.5 원칙 5: 업종별 조합 패턴

```
┌──────────┬─────────────────────────────────────────────────────┐
│ 업종     │ 권장 조합 패턴                                       │
├──────────┼─────────────────────────────────────────────────────┤
│ 미용실   │ 지역 + 시술명 (히피펌, C컬펌, 매직, 염색)            │
│          │ 지역 + 대상 (남자, 여자, 키즈, 남성전문)             │
│          │ 지역 + 특성 (1인샵, 예약제, 새벽)                    │
│          │ 지역 + 스타일 (레이어드컷, 허쉬컷, 태슬컷)           │
├──────────┼─────────────────────────────────────────────────────┤
│ 음식점   │ 지역 + 음식종류 (파스타, 스테이크, 초밥)             │
│          │ 지역 + 상황 (데이트, 회식, 혼밥, 가족모임)           │
│          │ 지역 + 분위기 (분위기좋은, 뷰맛집, 고급)             │
│          │ 지역 + 가격대 (가성비, 저렴한)                       │
├──────────┼─────────────────────────────────────────────────────┤
│ 카페     │ 지역 + 특성 (대형, 루프탑, 애견동반, 노키즈존)       │
│          │ 지역 + 메뉴 (디저트, 브런치, 베이커리)               │
│          │ 지역 + 용도 (스터디, 작업하기좋은, 모임)             │
│          │ 지역 + 분위기 (힙한, 감성, 빈티지)                   │
├──────────┼─────────────────────────────────────────────────────┤
│ 병원     │ 지역 + 진료과목 (피부과, 정형외과, 내과)             │
│          │ 지역 + 시술명 (보톡스, 필러, 레이저)                 │
│          │ 지역 + 특성 (야간진료, 일요일진료, 24시간)           │
├──────────┼─────────────────────────────────────────────────────┤
│ 숙박     │ 지역 + 유형 (호텔, 모텔, 펜션, 게스트하우스)         │
│          │ 지역 + 특성 (오션뷰, 수영장, 스파)                   │
│          │ 지역 + 용도 (커플, 가족, 워케이션)                   │
└──────────┴─────────────────────────────────────────────────────┘
```

---

## 3. 조합 생성 알고리즘

### 3.1 생성 플로우

```
입력: 5분류 키워드 세트
      {
        CORE: [...],
        LOCATION: [...],
        MENU: [...],
        ATTRIBUTE: [...],
        SENTIMENT: [...]
      }

Step 1: LOCATION 우선순위 정렬
        상권 > 역 > 동 > 구 > 시

Step 2: Tier 1 조합 생성
        FOR each loc IN LOCATION:
          FOR each core IN CORE:
            ADD (loc + " " + core)
          FOR each menu IN MENU[:TOP_N]:
            ADD (loc + " " + menu)

Step 3: Tier 2 조합 생성
        FOR each loc IN LOCATION:
          FOR each attr IN ATTRIBUTE[:TOP_N]:
            FOR each core IN CORE[:TOP_N]:
              ADD (loc + " " + attr + " " + core)

Step 4: Tier 3 조합 생성 (선택적)
        FOR each loc IN LOCATION:
          FOR each sent IN SENTIMENT[:TOP_N]:
            FOR each core IN CORE[:TOP_N]:
              ADD (loc + " " + sent + " " + core)

Step 5: 필터링
        FILTER by length (6 <= len <= 15)
        REMOVE duplicates
        REMOVE similar (유사도 > 0.9)

Step 6: 정렬
        SORT by Tier (T1 > T2 > T3)
        WITHIN Tier, sort by keyword priority

출력: 검증용 키워드 리스트 (50~150개)
```

### 3.2 구현 예시 (JavaScript)

```javascript
class KeywordCombinator {
  constructor(options = {}) {
    this.minLength = options.minLength || 6;
    this.maxLength = options.maxLength || 15;
    this.maxCombinations = options.maxCombinations || 150;
    this.topN = options.topN || 5; // 각 분류별 상위 N개만 사용
  }

  generate(keywordSet) {
    const combinations = [];
    const { CORE, LOCATION, MENU, ATTRIBUTE, SENTIMENT } = keywordSet;

    // Tier 1: LOCATION + CORE
    for (const loc of LOCATION) {
      for (const core of CORE) {
        this.addIfValid(combinations, `${loc} ${core}`, 'T1', 'LOC+CORE');
      }
      // Tier 1: LOCATION + MENU (상위)
      for (const menu of MENU.slice(0, this.topN)) {
        this.addIfValid(combinations, `${loc} ${menu}`, 'T1', 'LOC+MENU');
      }
    }

    // Tier 2: LOCATION + ATTRIBUTE + CORE
    for (const loc of LOCATION.slice(0, this.topN)) {
      for (const attr of ATTRIBUTE.slice(0, this.topN)) {
        for (const core of CORE.slice(0, 2)) {
          this.addIfValid(combinations, `${loc} ${attr} ${core}`, 'T2', 'LOC+ATTR+CORE');
        }
      }
    }

    // Tier 3: LOCATION + SENTIMENT + CORE
    for (const loc of LOCATION.slice(0, 3)) {
      for (const sent of SENTIMENT.slice(0, 3)) {
        for (const core of CORE.slice(0, 2)) {
          this.addIfValid(combinations, `${loc} ${sent} ${core}`, 'T3', 'LOC+SENT+CORE');
        }
      }
    }

    // 중복 제거 및 정렬
    const unique = this.removeDuplicates(combinations);
    const sorted = this.sortByPriority(unique);

    return sorted.slice(0, this.maxCombinations);
  }

  addIfValid(list, keyword, tier, pattern) {
    const length = keyword.replace(/\s/g, '').length;
    if (length >= this.minLength && length <= this.maxLength) {
      list.push({ keyword, tier, pattern });
    }
  }

  removeDuplicates(list) {
    const seen = new Set();
    return list.filter(item => {
      const normalized = item.keyword.toLowerCase().replace(/\s+/g, ' ').trim();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  }

  sortByPriority(list) {
    const tierOrder = { 'T1': 1, 'T2': 2, 'T3': 3 };
    return list.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);
  }
}
```

---

## 4. 품질 검증

### 4.1 조합 품질 체크리스트

```
□ LOCATION이 앞에 위치하는가?
□ 글자수가 6~15자 범위인가?
□ 중복 키워드가 제거되었는가?
□ 의미 있는 조합인가? (무의미한 조합 제외)
□ 업종에 맞는 패턴인가?
□ Tier별 적절한 비율인가? (T1 60%, T2 30%, T3 10%)
```

### 4.2 예상 조합 수 계산

```
입력 예시:
- LOCATION: 4개 (연산역, 연산동, 연산, 부산)
- CORE: 3개 (미용실, 헤어샵, 헤어)
- MENU: 5개 (C컬펌, 히피펌, 볼륨매직, 레이어드컷, 염색)
- ATTRIBUTE: 3개 (예약가능, 주차, 1인샵)
- SENTIMENT: 2개 (친절한, 재방문)

예상 조합 수:
- Tier 1: 4×3 + 4×3 = 24개
- Tier 2: 3×3×2 = 18개
- Tier 3: 3×2×2 = 12개
- 총계: 54개 (필터링 전)
- 필터링 후: ~45개
```

---

*문서 작성: 2025-12-16*
