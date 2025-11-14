# L1 파이프라인 구현 기능 명세서 (Product Requirements Document)

**문서 유형**: 구현 상세 기능 명세 (Feature Specification)
**작성자**: Product Manager
**작성일**: 2025-11-14
**버전**: 1.0
**대상 독자**: 개발자, QA, DevOps

---

## 📋 Executive Summary

L1 파이프라인은 네이버 플레이스 매장 데이터를 **안정적이고 완전하게** 수집하여, L2/L3 파이프라인이 사용할 수 있는 **표준화된 형식**으로 저장하는 핵심 모듈입니다.

### 핵심 목표
- ✅ **데이터 완전성**: 95% 이상의 필드 수집률
- ✅ **시스템 안정성**: 99% 이상 성공률 (재시도 포함)
- ✅ **처리 속도**: 단일 매장 평균 30초 이내
- ✅ **확장성**: 1,000개 매장 동시 처리 가능

---

## 🎯 1. 크롤링 기능 및 안정성

### 1.1 크롤링 엔진

#### 기능 요구사항 (Functional Requirements)

| 기능 ID | 기능명 | 설명 | 우선순위 |
|---------|--------|------|----------|
| **CR-001** | 동적 페이지 렌더링 | Puppeteer로 JS 렌더링 대기 | 🔴 Critical |
| **CR-002** | 다중 소스 크롤링 | 네이버 플레이스 + 블로그 + 리뷰 페이지 | 🔴 Critical |
| **CR-003** | 증분 크롤링 | 변경된 데이터만 재수집 | 🟡 Medium |
| **CR-004** | 스케줄링 크롤링 | Cron 기반 자동 실행 | 🟢 Low |

#### CR-001: 동적 페이지 렌더링 상세

**배경**: 네이버 플레이스는 JavaScript로 동적 로딩되므로 단순 HTTP 요청으로는 데이터 수집 불가

**구현 요구사항**:
```javascript
// 필수: 렌더링 대기 조건
await page.waitForSelector('.place_section', { timeout: 30000 });
await page.waitForFunction(() => document.readyState === 'complete');

// 필수: 스크롤을 통한 Lazy Loading 처리
await autoScroll(page); // 리뷰, 메뉴, 이미지 로딩 유도

// 선택: 네트워크 idle 대기 (성능과 trade-off)
await page.waitForNetworkIdle({ timeout: 5000 });
```

**성공 기준**:
- [ ] 리뷰 100개 이상 매장에서 전체 리뷰 수 수집
- [ ] 메뉴 20개 이상 매장에서 전체 메뉴 수집
- [ ] 이미지 lazy loading 항목 95% 이상 로드

#### CR-002: 다중 소스 크롤링 상세

**데이터 소스 우선순위**:
1. **네이버 플레이스 상세 페이지** (Primary) - 기본 정보
2. **네이버 블로그 검색** (Secondary) - 외부 언급 분석
3. **리뷰 페이지** (Tertiary) - 고객 키워드 추출

**소스별 수집 전략**:
```yaml
sources:
  naver_place:
    url_pattern: "https://m.place.naver.com/place/{place_id}"
    priority: 1
    timeout: 30s
    retry: 3

  naver_blog:
    url_pattern: "https://search.naver.com/search.naver?where=blog&query={place_name}"
    priority: 2
    timeout: 15s
    retry: 2
    max_results: 50  # 상위 50개 블로그만

  review_page:
    url_pattern: "https://m.place.naver.com/place/{place_id}/review"
    priority: 3
    timeout: 20s
    retry: 2
    pagination: true  # 리뷰 페이지네이션 처리
```

### 1.2 안정성 및 복원력 (Resilience)

#### 기능 요구사항

| 기능 ID | 기능명 | 설명 | 우선순위 |
|---------|--------|------|----------|
| **RS-001** | Circuit Breaker | 연속 실패 시 자동 중단 | 🔴 Critical |
| **RS-002** | Exponential Backoff | 지수 백오프 재시도 | 🔴 Critical |
| **RS-003** | Rate Limiting | API 호출 제한 준수 | 🔴 Critical |
| **RS-004** | IP Rotation | IP 차단 회피 (선택) | 🟡 Medium |
| **RS-005** | Session Management | 쿠키/세션 유지 관리 | 🟡 Medium |
| **RS-006** | Graceful Degradation | 부분 실패 시 가용 데이터 저장 | 🔴 Critical |

#### RS-001: Circuit Breaker 패턴 상세

**목적**: 네이버 서버 장애 시 무한 재시도로 인한 리소스 낭비 방지

**구현 스펙**:
```javascript
const circuitBreaker = {
  // 상태: CLOSED (정상) → OPEN (차단) → HALF_OPEN (테스트)
  state: 'CLOSED',

  // 임계값 설정
  failureThreshold: 5,        // 연속 5회 실패 시 OPEN
  successThreshold: 2,        // 연속 2회 성공 시 CLOSED
  timeout: 60000,             // OPEN 후 60초 후 HALF_OPEN

  // 모니터링
  consecutiveFailures: 0,
  consecutiveSuccesses: 0,
  lastFailureTime: null,

  // 액션
  onOpen: () => {
    logger.error('Circuit Breaker OPEN - 크롤링 중단');
    notifyAdmin('L1 크롤링 중단됨 - 네이버 서버 확인 필요');
  },

  onHalfOpen: () => {
    logger.info('Circuit Breaker HALF_OPEN - 테스트 재시작');
  },

  onClose: () => {
    logger.info('Circuit Breaker CLOSED - 정상 복구');
  }
};
```

**성공 기준**:
- [ ] 네이버 서버 장애 시 5회 실패 후 자동 중단
- [ ] 60초 후 자동으로 재시도 시작
- [ ] 관리자에게 Slack/Email 알림 발송

#### RS-002: Exponential Backoff 재시도 전략

**배경**: 네트워크 일시 장애 또는 Rate Limit 초과 시 효과적인 재시도

**구현 스펙**:
```javascript
const retryConfig = {
  maxRetries: 3,              // 최대 3회 재시도
  baseDelay: 2000,            // 초기 대기 2초
  maxDelay: 30000,            // 최대 대기 30초
  multiplier: 2,              // 지수: 2배씩 증가

  // 재시도 스케줄: 2s → 4s → 8s
  getDelay: (attemptNumber) => {
    const delay = baseDelay * Math.pow(multiplier, attemptNumber - 1);
    return Math.min(delay, maxDelay);
  },

  // 재시도 조건 (특정 에러만 재시도)
  retryableErrors: [
    'TIMEOUT',
    'ECONNRESET',
    'ENOTFOUND',
    'ERR_NETWORK',
    'HTTP_429',  // Too Many Requests
    'HTTP_503'   // Service Unavailable
  ],

  // 재시도 불가 조건 (즉시 실패)
  nonRetryableErrors: [
    'HTTP_404',  // 매장이 삭제됨
    'HTTP_403',  // 접근 금지 (영구 차단)
    'INVALID_PLACE_ID'
  ]
};
```

**Jitter 추가** (동시 요청 분산):
```javascript
const delayWithJitter = (delay) => {
  const jitter = Math.random() * 1000; // 0-1초 랜덤
  return delay + jitter;
};
```

#### RS-003: Rate Limiting 상세

**배경**: 네이버 서버 부하 방지 및 IP 차단 회피

**구현 요구사항**:
```javascript
const rateLimiter = {
  // Leaky Bucket 알고리즘
  maxConcurrent: 5,           // 동시 최대 5개 크롤링
  requestsPerMinute: 30,      // 분당 30회 요청
  requestsPerHour: 1000,      // 시간당 1,000회

  // 배치 처리
  batchSize: 10,              // 10개씩 묶어서 처리
  batchInterval: 60000,       // 배치 간 60초 대기

  // 우선순위 큐
  queue: [],
  priorities: {
    HIGH: 1,    // 수동 요청 (즉시 처리)
    MEDIUM: 2,  // 증분 업데이트
    LOW: 3      // 전체 재수집
  }
};
```

**성공 기준**:
- [ ] 분당 요청 수 30회 이하 유지
- [ ] IP 차단 발생률 0.1% 미만
- [ ] 우선순위 높은 요청 30초 이내 처리

#### RS-006: Graceful Degradation (우아한 성능 저하)

**배경**: 일부 필드 수집 실패해도 가용한 데이터는 저장

**구현 전략**:
```javascript
const dataCollectionStrategy = {
  // 필수 필드 (하나라도 실패 시 전체 실패)
  required: [
    'id',
    'name',
    'category',
    'address'
  ],

  // 중요 필드 (실패 시 경고, 계속 진행)
  important: [
    'phone',
    'businessHours',
    'rating',
    'menus'
  ],

  // 선택 필드 (실패해도 무시)
  optional: [
    'images',
    'blogReviews',
    'visitorReviews.details'
  ],

  // 부분 성공 처리
  onPartialSuccess: (collectedData, failedFields) => {
    logger.warn(`부분 수집 성공: ${failedFields.length}개 필드 실패`, {
      place_id: collectedData.id,
      failed: failedFields
    });

    // 완성도 점수 계산 (실패한 필드 반영)
    collectedData.completeness_score = calculateCompleteness(
      collectedData,
      failedFields
    );

    // 재시도 큐에 추가 (나중에 재시도)
    retryQueue.add({
      place_id: collectedData.id,
      fields: failedFields,
      priority: 'LOW'
    });

    return collectedData;
  }
};
```

---

## 🗂️ 2. 정보 수집 범위 및 우선순위

### 2.1 데이터 수집 레벨 정의

**목적**: 사용 사례에 따라 수집 깊이 조절 (성능 vs 완전성 trade-off)

#### 수집 레벨 3단계

| 레벨 | 명칭 | 수집 범위 | 소요 시간 | 사용 사례 |
|------|------|----------|----------|----------|
| **L1-BASIC** | 기본 | 필수 필드만 | ~10초 | 빠른 스캔, 대량 수집 |
| **L1-STANDARD** | 표준 | 필수 + 중요 필드 | ~30초 | 일반적인 분석 |
| **L1-COMPLETE** | 완전 | 모든 필드 + 블로그 | ~60초 | 심층 분석, 신규 매장 |

#### L1-BASIC (기본) 상세

**수집 필드**:
```json
{
  "id": "1234567890",
  "name": "히도 강남점",
  "category": "닭갈비전문점",
  "address": "서울특별시 강남구 역삼동 123-45",
  "phone": "02-1234-5678",
  "rating": 4.5,
  "reviewCount": 1234
}
```

**예상 성능**: 10개 매장 2분 이내

**사용 사례**:
- 초기 매장 목록 스캔
- 경쟁사 분석 (대량 수집)
- 완성도 사전 평가

#### L1-STANDARD (표준) 상세 - **기본값**

**수집 필드**:
```json
{
  // BASIC 필드 +
  "menus": [...],
  "businessHours": "...",
  "attributes": {...},
  "images": [...],
  "location": {
    "lat": 37.123,
    "lng": 127.456
  },
  "visitorReviewCount": 1234,
  "blogReviewCount": 567
}
```

**예상 성능**: 10개 매장 5분 이내

**사용 사례**:
- 일반적인 L1→L2→L3 파이프라인
- 정기 업데이트
- 대부분의 고객 요청

#### L1-COMPLETE (완전) 상세

**수집 필드**:
```json
{
  // STANDARD 필드 +
  "visitorReviews": [
    {
      "author": "홍길동",
      "rating": 5,
      "content": "맛있어요!",
      "date": "2025-11-10",
      "images": [...]
    }
    // ... 최대 100개
  ],
  "blogReviews": [
    {
      "title": "강남 맛집 추천",
      "url": "...",
      "summary": "...",
      "date": "2025-11-08"
    }
    // ... 최대 50개
  ],
  "competitorAnalysis": {
    "nearbyPlaces": [...],  // 반경 500m 내 동일 업종
    "priceComparison": {...}
  }
}
```

**예상 성능**: 10개 매장 10분 이내

**사용 사례**:
- 신규 고객 첫 분석
- VIP 고객 심층 분석
- 월간 종합 리포트

### 2.2 필드 우선순위 매트릭스

| 필드 | 필수 여부 | Guidebook 연결 | L2 의존도 | L3 의존도 | 수집 난이도 |
|------|----------|----------------|-----------|-----------|------------|
| **id** | ✅ Required | - | High | High | Easy |
| **name** | ✅ Required | B-1 상호명 | High | High | Easy |
| **category** | ✅ Required | B-2 카테고리 | High | High | Easy |
| **address** | ✅ Required | B-3 NAP | High | Medium | Easy |
| **phone** | ⚠️ Important | B-3 NAP | Low | Low | Easy |
| **menus** | ⚠️ Important | C-Sys-1 매핑 | High | High | Medium |
| **rating** | ⚠️ Important | A-1.3 신뢰도 | Medium | Low | Easy |
| **attributes** | ⚠️ Important | C-1 구성요소 | High | Medium | Medium |
| **visitorReviews** | ☑️ Optional | C-Sys-1 자연어 | High | Low | Hard |
| **blogReviews** | ☑️ Optional | E-1 외부 콘텐츠 | Medium | Low | Hard |
| **images** | ☑️ Optional | D-3 시각콘텐츠 | Low | Medium | Easy |

**수집 난이도 기준**:
- **Easy**: 페이지 초기 로드 시 바로 수집 가능
- **Medium**: 클릭/스크롤 등 추가 인터랙션 필요
- **Hard**: 여러 페이지 탐색 또는 외부 API 호출 필요

---

## 📊 3. 데이터 목록화 및 정규화

### 3.1 데이터 정규화 규칙

#### 주소 정규화

**문제**: 네이버 플레이스에서 주소 형식이 일관되지 않음
```
예시 1: "서울특별시 강남구 역삼동 123-45"
예시 2: "서울 강남구 역삼동 123-45"
예시 3: "서울특별시 강남구 테헤란로 123 (역삼동)"
```

**정규화 스펙**:
```javascript
const normalizeAddress = (rawAddress) => {
  return {
    // 행정구역 정규화
    si: extractSi(rawAddress),           // "서울특별시"
    gu: extractGu(rawAddress),           // "강남구"
    dong: extractDong(rawAddress),       // "역삼동"

    // 도로명 주소 분리
    roadAddress: extractRoadAddress(rawAddress),

    // 지번 주소 분리
    jibunAddress: extractJibunAddress(rawAddress),

    // 건물명
    building: extractBuilding(rawAddress),

    // 원본 보존
    raw: rawAddress,

    // 정규화 신뢰도 (0-1)
    confidence: calculateConfidence(rawAddress)
  };
};
```

**헬퍼 함수 구현 예시**:
```javascript
// 시/도 추출 함수
const extractSi = (address) => {
  const siPattern = /(서울특별시|서울|부산광역시|부산|대구광역시|대구|인천광역시|인천|광주광역시|광주|대전광역시|대전|울산광역시|울산|세종특별자치시|세종|경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주특별자치도)/;
  const match = address.match(siPattern);

  if (!match) return null;

  // "서울" -> "서울특별시"로 정규화
  const siMap = {
    '서울': '서울특별시',
    '부산': '부산광역시',
    '대구': '대구광역시',
    '인천': '인천광역시',
    '광주': '광주광역시',
    '대전': '대전광역시',
    '울산': '울산광역시',
    '세종': '세종특별자치시'
  };

  return siMap[match[1]] || match[1];
};

// 구 추출 함수
const extractGu = (address) => {
  const guPattern = /([가-힣]+구(?=\s|$|[동로]))/;
  const match = address.match(guPattern);
  return match ? match[1] : null;
};

// 동 추출 함수
const extractDong = (address) => {
  // 동, 읍, 면 패턴 매칭
  const dongPattern = /([가-힣0-9]+(?:동|읍|면))(?:\s|$|\()/;
  const match = address.match(dongPattern);
  return match ? match[1] : null;
};

// 도로명 주소 추출 함수
const extractRoadAddress = (address) => {
  // "테헤란로 123" 또는 "테헤란로 123-45" 패턴
  const roadPattern = /([가-힣]+(?:로|길))\s*(\d+(?:-\d+)?)/;
  const match = address.match(roadPattern);

  if (!match) return null;

  return {
    roadName: match[1],      // "테헤란로"
    buildingNumber: match[2] // "123" or "123-45"
  };
};

// 지번 주소 추출 함수
const extractJibunAddress = (address) => {
  // "역삼동 123-45" 패턴
  const jibunPattern = /([가-힣0-9]+(?:동|읍|면))\s*(\d+(?:-\d+)?)/;
  const match = address.match(jibunPattern);

  if (!match) return null;

  return {
    dong: match[1],          // "역삼동"
    lotNumber: match[2]      // "123-45"
  };
};

// 건물명 추출 함수
const extractBuilding = (address) => {
  // 괄호 안의 건물명 추출: "(역삼빌딩)"
  const buildingPattern = /\(([^)]+)\)/;
  const match = address.match(buildingPattern);
  return match ? match[1] : null;
};

// 정규화 신뢰도 계산 함수
const calculateConfidence = (address) => {
  let score = 0;
  let maxScore = 6;

  // 각 필수 요소가 있으면 점수 추가
  if (extractSi(address)) score += 1;
  if (extractGu(address)) score += 1;
  if (extractDong(address)) score += 1;
  if (extractRoadAddress(address)) score += 1.5;
  if (extractJibunAddress(address)) score += 1.5;

  return Math.min(score / maxScore, 1.0);
};
```

**지역 키워드 추출**:
```javascript
const extractRegionKeywords = (address) => {
  return {
    primary: [address.gu, address.station],      // ["강남", "강남역"]
    secondary: [address.dong],                    // ["역삼"]
    tertiary: [`${address.gu} ${address.dong}`]  // ["강남 역삼"]
  };
};
```

#### 메뉴 정규화

**문제**: 메뉴명, 가격 형식 불일치
```
예시 1: "철판닭갈비 - 12,000원"
예시 2: "철판닭갈비(1인) 12000"
예시 3: "철판닭갈비 (2인분) - ₩24,000"
```

**정규화 스펙**:
```javascript
const normalizeMenu = (rawMenu) => {
  return {
    // 메뉴명 정제
    name: cleanMenuName(rawMenu.name),  // "철판닭갈비"

    // 가격 숫자 변환
    price: extractPrice(rawMenu.price), // 12000 (숫자)
    priceFormatted: formatPrice(12000), // "12,000원"

    // 인분 정보 추출
    servingSize: extractServing(rawMenu.name), // 1 or 2

    // 메뉴 분류 (AI 또는 룰 기반)
    category: classifyMenu(rawMenu.name), // "메인 요리", "사이드", "음료"

    // 키워드 추출
    keywords: extractMenuKeywords(rawMenu.name), // ["닭갈비", "철판"]

    // 메타 정보
    isRecommended: rawMenu.isRecommended || false,
    description: rawMenu.description || null
  };
};
```

**메뉴 헬퍼 함수 구현 예시**:
```javascript
// 메뉴명 정제 함수
const cleanMenuName = (menuName) => {
  if (!menuName) return '';

  return menuName
    .replace(/\([^)]*\)/g, '')          // 괄호 및 내용 제거: "(1인)" -> ""
    .replace(/[−\-–—]/g, '')            // 하이픈, 대시 제거
    .replace(/\s+/g, ' ')               // 다중 공백을 하나로
    .trim();                            // 앞뒤 공백 제거
};

// 가격 추출 함수
const extractPrice = (priceString) => {
  if (!priceString) return null;
  if (typeof priceString === 'number') return priceString;

  // 숫자만 추출: "12,000원" -> "12000" -> 12000
  const numericString = priceString.toString()
    .replace(/[^0-9]/g, '');  // 숫자가 아닌 모든 문자 제거

  const price = parseInt(numericString, 10);

  // 유효성 검증
  if (isNaN(price) || price < 0 || price > 10000000) {
    return null;  // 비정상적인 가격
  }

  return price;
};

// 가격 포맷팅 함수
const formatPrice = (price) => {
  if (price === null || price === undefined) return '';

  // 천 단위 콤마 추가
  return price.toLocaleString('ko-KR') + '원';
};

// 인분 정보 추출 함수
const extractServing = (menuName) => {
  if (!menuName) return 1;  // 기본값 1인분

  // "1인", "2인분", "3인용" 등 패턴 매칭
  const servingPattern = /(\d+)(?:인|인분|인용)/;
  const match = menuName.match(servingPattern);

  if (match) {
    const serving = parseInt(match[1], 10);
    return (serving > 0 && serving <= 10) ? serving : 1;  // 1-10 범위 검증
  }

  return 1;  // 기본값
};

// 메뉴 분류 함수 (룰 기반)
const classifyMenu = (menuName) => {
  if (!menuName) return '기타';

  const categories = {
    '메인 요리': ['갈비', '삼겹살', '스테이크', '파스타', '피자', '돈까스', '치킨', '찜', '탕', '전골', '국밥'],
    '사이드': ['샐러드', '감자튀김', '떡볶이', '튀김', '만두', '김치', '나물'],
    '음료': ['커피', '주스', '차', '에이드', '스무디', '맥주', '소주', '와인', '음료', '콜라', '사이다'],
    '디저트': ['케이크', '아이스크림', '빙수', '과일', '젤라또', '마카롱', '쿠키']
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => menuName.includes(keyword))) {
      return category;
    }
  }

  return '메인 요리';  // 기본값
};

// 메뉴 키워드 추출 함수
const extractMenuKeywords = (menuName) => {
  if (!menuName) return [];

  const keywords = [];

  // 조리 방법 키워드
  const cookingMethods = ['구이', '튀김', '찜', '볶음', '조림', '전골', '탕', '국', '철판', '숯불'];
  cookingMethods.forEach(method => {
    if (menuName.includes(method)) {
      keywords.push(method);
    }
  });

  // 재료 키워드
  const ingredients = ['돼지', '소', '닭', '해물', '야채', '치즈', '마늘', '고추', '된장', '김치'];
  ingredients.forEach(ingredient => {
    if (menuName.includes(ingredient)) {
      keywords.push(ingredient);
    }
  });

  // 특수 키워드
  if (menuName.includes('매운')) keywords.push('매운맛');
  if (menuName.includes('순한')) keywords.push('순한맛');
  if (menuName.includes('특')) keywords.push('특선');

  return [...new Set(keywords)];  // 중복 제거
};
```

#### 리뷰 정규화

**목적**: L2 AI 분석을 위한 텍스트 전처리

**정규화 스펙**:
```javascript
const normalizeReview = (rawReview) => {
  return {
    // 기본 정보
    author: anonymizeAuthor(rawReview.author),  // 개인정보 익명화
    rating: parseFloat(rawReview.rating),
    date: parseDate(rawReview.date),            // ISO 8601 형식

    // 텍스트 정제
    content: {
      raw: rawReview.content,
      cleaned: cleanText(rawReview.content),    // HTML 태그, 특수문자 제거
      normalized: normalizeText(rawReview.content), // 맞춤법 수정, 띄어쓰기
      length: rawReview.content.length
    },

    // 감성 분석 준비
    sentences: splitSentences(rawReview.content), // 문장 분리
    keywords: extractReviewKeywords(rawReview.content),

    // 메타 정보
    hasImage: rawReview.images && rawReview.images.length > 0,
    imageCount: rawReview.images?.length || 0,
    isVerified: rawReview.isVerified || false   // 영수증 인증 리뷰
  };
};
```

### 3.2 데이터 분류 체계

#### 매장 분류 (업종별)

**목적**: 업종에 따라 중요 필드 및 분석 전략 변경

**분류 체계**:
```javascript
const placeCategories = {
  // 음식점
  FOOD_RESTAURANT: {
    keywords: ['레스토랑', '맛집', '전문점'],
    importantFields: ['menus', 'visitorReviews', 'rating'],
    l2Strategy: 'menu_focused',  // 메뉴 중심 분석
    avgCompleteness: 85
  },

  // 카페
  FOOD_CAFE: {
    keywords: ['카페', '커피', '디저트'],
    importantFields: ['menus', 'images', 'attributes.wifi'],
    l2Strategy: 'atmosphere_focused',  // 분위기 중심
    avgCompleteness: 80
  },

  // 소매점
  RETAIL: {
    keywords: ['스토어', '샵', '매장'],
    importantFields: ['images', 'businessHours', 'attributes.parking'],
    l2Strategy: 'product_focused',  // 제품 사진 중심
    avgCompleteness: 70
  },

  // 서비스업
  SERVICE: {
    keywords: ['학원', '병원', '클리닉', '헤어샵'],
    importantFields: ['rating', 'visitorReviews', 'businessHours'],
    l2Strategy: 'review_focused',  // 리뷰 중심
    avgCompleteness: 75
  }
};
```

#### 데이터 품질 분류

**완성도 등급**:
```javascript
const completenessGrades = {
  EXCELLENT: {
    range: [90, 100],
    label: 'A+',
    description: '모든 필드 완비, L2 분석 최적',
    action: 'PROCEED_TO_L2'
  },

  GOOD: {
    range: [75, 89],
    label: 'A',
    description: '주요 필드 완비, 일부 선택 필드 누락',
    action: 'PROCEED_TO_L2'
  },

  FAIR: {
    range: [60, 74],
    label: 'B',
    description: '기본 필드 완비, 중요 필드 일부 누락',
    action: 'PROCEED_WITH_WARNING'
  },

  POOR: {
    range: [40, 59],
    label: 'C',
    description: '필수 필드만 수집됨, L2 분석 제한적',
    action: 'RETRY_RECOMMENDED'
  },

  CRITICAL: {
    range: [0, 39],
    label: 'D',
    description: '필수 필드 누락, L2 진행 불가',
    action: 'RETRY_REQUIRED'
  }
};
```

---

## 💾 4. 정보 저장 및 모듈 연동

### 4.1 저장 형식 및 구조

#### 출력 파일 구조

```
data/output/l1/
├── places/
│   ├── 1234567890.json          # 개별 매장 상세 데이터
│   ├── 1234567891.json
│   └── ...
│
├── batch/
│   ├── batch_20251114_001.json  # 배치 수집 결과 (100개씩)
│   └── batch_20251114_002.json
│
├── summary/
│   └── collection_summary_20251114.json  # 수집 통계
│
└── metadata/
    ├── schema_version.json       # 데이터 스키마 버전
    └── field_mapping.json        # 필드 매핑 정보
```

#### 개별 매장 JSON 스키마

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "version": "2.0.0",
  "collected_at": "2025-11-14T10:30:00Z",
  "collection_level": "STANDARD",
  "collector_version": "1.0.0",

  "place": {
    "id": "1234567890",
    "name": "히도 강남점",
    "category": "닭갈비전문점",

    "address": {
      "raw": "서울특별시 강남구 역삼동 123-45",
      "normalized": {
        "si": "서울특별시",
        "gu": "강남구",
        "dong": "역삼동",
        "roadAddress": "테헤란로 123",
        "jibunAddress": "역삼동 123-45"
      },
      "location": {
        "lat": 37.501234,
        "lng": 127.039876
      }
    },

    "contact": {
      "phone": "02-1234-5678",
      "website": null
    },

    "menus": [...],
    "attributes": {...},
    "reviews": {...},
    "images": [...]
  },

  "metadata": {
    "completeness": {
      "score": 87.5,
      "grade": "A",
      "missing_fields": ["website", "businessHours.holiday"]
    },

    "collection_stats": {
      "attempts": 1,
      "duration_ms": 28340,
      "sources": {
        "naver_place": "SUCCESS",
        "naver_blog": "SUCCESS",
        "review_page": "PARTIAL"
      }
    },

    "quality_flags": {
      "has_duplicate_menus": false,
      "has_invalid_address": false,
      "has_low_quality_images": false
    }
  }
}
```

#### JSON Schema Validation Rules

**완전한 JSON Schema 정의**:
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/l1-place-data.schema.json",
  "title": "L1 Place Data Schema",
  "description": "네이버 플레이스 L1 파이프라인 출력 데이터 스키마",
  "type": "object",
  "required": ["version", "collected_at", "collection_level", "collector_version", "place", "metadata"],

  "properties": {
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "스키마 버전 (Semantic Versioning)",
      "examples": ["2.0.0"]
    },

    "collected_at": {
      "type": "string",
      "format": "date-time",
      "description": "수집 시각 (ISO 8601 형식)"
    },

    "collection_level": {
      "type": "string",
      "enum": ["BASIC", "STANDARD", "COMPLETE"],
      "description": "수집 레벨"
    },

    "collector_version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "크롤러 버전"
    },

    "place": {
      "type": "object",
      "required": ["id", "name", "category", "address"],
      "properties": {
        "id": {
          "type": "string",
          "pattern": "^\\d{10,15}$",
          "description": "네이버 플레이스 ID (10-15자리 숫자)"
        },

        "name": {
          "type": "string",
          "minLength": 1,
          "maxLength": 100,
          "description": "매장명"
        },

        "category": {
          "type": "string",
          "minLength": 1,
          "maxLength": 50,
          "description": "업종 카테고리"
        },

        "address": {
          "type": "object",
          "required": ["raw"],
          "properties": {
            "raw": {
              "type": "string",
              "minLength": 1,
              "description": "원본 주소"
            },
            "normalized": {
              "type": "object",
              "properties": {
                "si": {
                  "type": ["string", "null"],
                  "description": "시/도"
                },
                "gu": {
                  "type": ["string", "null"],
                  "description": "구/군"
                },
                "dong": {
                  "type": ["string", "null"],
                  "description": "동/읍/면"
                },
                "roadAddress": {
                  "type": ["string", "null"],
                  "description": "도로명 주소"
                },
                "jibunAddress": {
                  "type": ["string", "null"],
                  "description": "지번 주소"
                }
              }
            },
            "location": {
              "type": "object",
              "required": ["lat", "lng"],
              "properties": {
                "lat": {
                  "type": "number",
                  "minimum": 33.0,
                  "maximum": 43.0,
                  "description": "위도 (한국 범위 33-43)"
                },
                "lng": {
                  "type": "number",
                  "minimum": 124.0,
                  "maximum": 132.0,
                  "description": "경도 (한국 범위 124-132)"
                }
              }
            }
          }
        },

        "contact": {
          "type": "object",
          "properties": {
            "phone": {
              "type": ["string", "null"],
              "pattern": "^(\\d{2,3}-\\d{3,4}-\\d{4})?$",
              "description": "전화번호 (02-1234-5678 형식)"
            },
            "website": {
              "type": ["string", "null"],
              "format": "uri",
              "description": "웹사이트 URL"
            }
          }
        },

        "menus": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["name", "price"],
            "properties": {
              "name": {
                "type": "string",
                "minLength": 1,
                "maxLength": 100
              },
              "price": {
                "type": "integer",
                "minimum": 0,
                "maximum": 10000000,
                "description": "가격 (0-10,000,000원)"
              },
              "servingSize": {
                "type": "integer",
                "minimum": 1,
                "maximum": 10,
                "description": "인분 (1-10)"
              },
              "category": {
                "type": "string",
                "enum": ["메인 요리", "사이드", "음료", "디저트", "기타"]
              }
            }
          }
        },

        "rating": {
          "type": ["number", "null"],
          "minimum": 0,
          "maximum": 5,
          "description": "평점 (0-5점)"
        },

        "reviewCount": {
          "type": ["integer", "null"],
          "minimum": 0,
          "description": "리뷰 수"
        }
      }
    },

    "metadata": {
      "type": "object",
      "required": ["completeness", "collection_stats"],
      "properties": {
        "completeness": {
          "type": "object",
          "required": ["score", "grade"],
          "properties": {
            "score": {
              "type": "number",
              "minimum": 0,
              "maximum": 100,
              "description": "완성도 점수 (0-100)"
            },
            "grade": {
              "type": "string",
              "enum": ["A+", "A", "B", "C", "D"],
              "description": "완성도 등급"
            },
            "missing_fields": {
              "type": "array",
              "items": {
                "type": "string"
              },
              "description": "누락된 필드 목록"
            }
          }
        },

        "collection_stats": {
          "type": "object",
          "required": ["attempts", "duration_ms"],
          "properties": {
            "attempts": {
              "type": "integer",
              "minimum": 1,
              "description": "수집 시도 횟수"
            },
            "duration_ms": {
              "type": "integer",
              "minimum": 0,
              "description": "수집 소요 시간 (밀리초)"
            },
            "sources": {
              "type": "object",
              "properties": {
                "naver_place": {
                  "type": "string",
                  "enum": ["SUCCESS", "PARTIAL", "FAILED"]
                },
                "naver_blog": {
                  "type": "string",
                  "enum": ["SUCCESS", "PARTIAL", "FAILED"]
                },
                "review_page": {
                  "type": "string",
                  "enum": ["SUCCESS", "PARTIAL", "FAILED"]
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**Validation 구현 예시 (AJV 라이브러리)**:
```javascript
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

// AJV 인스턴스 생성
const ajv = new Ajv({
  allErrors: true,           // 모든 에러 수집
  verbose: true,             // 상세한 에러 메시지
  strict: true,              // 엄격한 검증
  validateFormats: true      // format 검증 활성화
});

// 날짜/URI 등 표준 포맷 추가
addFormats(ajv);

// 스키마 로드
const schema = require('./l1-place-data.schema.json');
const validate = ajv.compile(schema);

// 데이터 검증 함수
const validateL1Data = (data) => {
  const valid = validate(data);

  if (!valid) {
    return {
      valid: false,
      errors: validate.errors.map(err => ({
        field: err.instancePath || err.schemaPath,
        message: err.message,
        params: err.params,
        data: err.data
      }))
    };
  }

  return { valid: true, errors: [] };
};

// 사용 예시
const placeData = {
  version: "2.0.0",
  collected_at: "2025-11-14T10:30:00Z",
  collection_level: "STANDARD",
  collector_version: "1.0.0",
  place: {
    id: "1234567890",
    name: "히도 강남점",
    category: "닭갈비전문점",
    address: {
      raw: "서울특별시 강남구 역삼동 123-45"
    }
  },
  metadata: {
    completeness: {
      score: 87.5,
      grade: "A"
    },
    collection_stats: {
      attempts: 1,
      duration_ms: 28340
    }
  }
};

const result = validateL1Data(placeData);
if (!result.valid) {
  console.error('Validation failed:', result.errors);
  // 에러 처리 로직
}
```

**비즈니스 규칙 추가 검증**:
```javascript
const validateBusinessRules = (data) => {
  const errors = [];

  // 규칙 1: 완성도 점수와 등급 일치 확인
  const score = data.metadata.completeness.score;
  const grade = data.metadata.completeness.grade;

  const gradeMap = {
    'A+': [90, 100],
    'A': [75, 89],
    'B': [60, 74],
    'C': [40, 59],
    'D': [0, 39]
  };

  const [min, max] = gradeMap[grade] || [0, 0];
  if (score < min || score > max) {
    errors.push({
      field: 'metadata.completeness',
      message: `Grade ${grade} does not match score ${score}`,
      expected: `Score should be between ${min} and ${max}`
    });
  }

  // 규칙 2: 메뉴 가격 합리성 검증 (평균 가격)
  if (data.place.menus && data.place.menus.length > 0) {
    const avgPrice = data.place.menus.reduce((sum, m) => sum + m.price, 0) / data.place.menus.length;

    if (avgPrice < 1000) {
      errors.push({
        field: 'place.menus',
        message: `Average menu price ${avgPrice}원 seems too low`,
        severity: 'WARNING'
      });
    }

    if (avgPrice > 100000) {
      errors.push({
        field: 'place.menus',
        message: `Average menu price ${avgPrice}원 seems too high`,
        severity: 'WARNING'
      });
    }
  }

  // 규칙 3: 위치 좌표 유효성 (한국 내부인지)
  if (data.place.address?.location) {
    const { lat, lng } = data.place.address.location;

    // 대한민국 영역 밖인지 확인
    if (lat < 33 || lat > 43 || lng < 124 || lng > 132) {
      errors.push({
        field: 'place.address.location',
        message: `Location (${lat}, ${lng}) is outside of South Korea`,
        severity: 'ERROR'
      });
    }
  }

  // 규칙 4: 수집 시간 검증 (미래 시각이 아닌지)
  const collectedAt = new Date(data.collected_at);
  const now = new Date();

  if (collectedAt > now) {
    errors.push({
      field: 'collected_at',
      message: `Collection time ${data.collected_at} is in the future`,
      severity: 'ERROR'
    });
  }

  // 규칙 5: 수집 레벨과 데이터 완성도 일치
  const level = data.collection_level;
  const expectedScores = {
    'BASIC': [50, 70],
    'STANDARD': [70, 90],
    'COMPLETE': [85, 100]
  };

  const [minScore, maxScore] = expectedScores[level] || [0, 100];
  if (score < minScore || score > maxScore) {
    errors.push({
      field: 'collection_level',
      message: `Collection level ${level} should have score between ${minScore}-${maxScore}, got ${score}`,
      severity: 'WARNING'
    });
  }

  return {
    valid: errors.filter(e => e.severity === 'ERROR').length === 0,
    errors,
    warnings: errors.filter(e => e.severity === 'WARNING')
  };
};
```

### 4.2 모듈 간 데이터 계약 (Data Contract)

#### L1 → L2 인터페이스

**목적**: L2가 L1 출력을 안정적으로 소비할 수 있도록 계약 정의

**계약 스펙**:
```yaml
# data-contract-l1-l2.yml
contract_version: "1.0.0"
provider: "L1 Pipeline"
consumer: "L2 Analysis Pipeline"

guarantees:
  # L1이 보장하는 사항
  - field: "place.id"
    type: "string"
    required: true
    format: "10-digit number"

  - field: "place.name"
    type: "string"
    required: true
    max_length: 100

  - field: "place.menus"
    type: "array"
    required: false
    min_items: 0
    item_schema:
      name: "string"
      price: "integer"

  - field: "metadata.completeness.score"
    type: "number"
    required: true
    range: [0, 100]

expectations:
  # L2가 L1에 기대하는 사항
  - "completeness.score >= 60"  # 최소 60점 이상
  - "place.category != null"    # 카테고리 필수
  - "place.menus.length > 0 OR place.address != null"  # 메뉴 또는 주소 중 하나

validation:
  # 계약 검증 도구
  tool: "ajv"  # JSON Schema Validator
  on_violation: "WARN_AND_PROCEED"  # 경고 후 진행 (엄격하지 않음)
```

**검증 코드 예시**:
```javascript
const validateL1Output = (data) => {
  const errors = [];

  // 필수 필드 검증
  if (!data.place?.id) errors.push('Missing place.id');
  if (!data.metadata?.completeness?.score) errors.push('Missing completeness score');

  // 비즈니스 룰 검증
  if (data.metadata.completeness.score < 60) {
    errors.push('Completeness score below threshold (60)');
  }

  // 데이터 무결성 검증
  if (data.place.menus) {
    data.place.menus.forEach((menu, idx) => {
      if (!menu.name) errors.push(`Menu ${idx}: missing name`);
      if (menu.price && menu.price < 0) errors.push(`Menu ${idx}: negative price`);
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
};
```

### 4.3 버전 관리 및 마이그레이션

#### 스키마 버전 관리

**배경**: L1 출력 형식이 변경되면 L2/L3이 깨질 수 있음

**버전 관리 전략**:
```javascript
const schemaVersions = {
  "1.0.0": {
    released: "2025-10-01",
    breaking_changes: false,
    description: "초기 릴리스"
  },

  "2.0.0": {
    released: "2025-11-14",
    breaking_changes: true,
    description: "address 구조 변경 (문자열 → 객체)",
    migration_guide: "docs/migrations/v1-to-v2.md",
    deprecated_fields: ["address_string"],
    new_fields: ["address.normalized"]
  }
};
```

**마이그레이션 도구**:
```javascript
// migrate-l1-v1-to-v2.js
const migrateV1ToV2 = (v1Data) => {
  return {
    ...v1Data,

    // 버전 업데이트
    version: "2.0.0",

    // address 구조 변경
    place: {
      ...v1Data.place,
      address: {
        raw: v1Data.place.address,  // 기존 문자열
        normalized: normalizeAddress(v1Data.place.address)
      }
    },

    // 메타데이터 추가
    metadata: {
      ...v1Data.metadata,
      migrated_from: "1.0.0",
      migrated_at: new Date().toISOString()
    }
  };
};
```

---

## 🔄 5. 수동 크롤링 고려 기능

### 5.1 수동 입력 및 오버라이드

#### 기능 배경

**문제 상황**:
- 자동 크롤링이 특정 필드를 잘못 수집 (예: 영업시간 오류)
- 크롤링 불가능한 정보가 있음 (예: 사장님만 아는 특별 메뉴)
- 전략적으로 특정 키워드를 강조하고 싶음

**해결**: Manual Override 기능

#### MO-001: 수동 입력 UI

**요구사항**:
```javascript
// data/input/manual_overrides.json
{
  "1234567890": {
    "override_mode": "PARTIAL",  // FULL (전체 대체) / PARTIAL (일부만)
    "updated_at": "2025-11-14T15:00:00Z",
    "updated_by": "user@example.com",

    "overrides": {
      // 필드별 오버라이드
      "menus": [
        {
          "name": "런치 세트 (점심 특선)",  // 크롤링에 없는 메뉴
          "price": 9000,
          "manual": true
        }
      ],

      "businessHours": "월-금: 11:00-22:00, 토-일: 12:00-23:00",

      "target_keywords": [
        "강남 회식 장소",  // 전략적 키워드 추가
        "직장인 맛집"
      ]
    },

    "notes": "런치 세트는 웹사이트에만 공지됨, 크롤링 불가"
  }
}
```

#### MO-002: 수동 데이터 병합 로직

**병합 전략**:
```javascript
const mergeStrategy = {
  // 배열 필드 병합 방식
  menus: 'APPEND',        // 크롤링 데이터 + 수동 데이터
  images: 'APPEND',

  // 단일 값 필드 병합
  businessHours: 'OVERRIDE',  // 수동 데이터가 크롤링 데이터 대체
  phone: 'OVERRIDE',

  // 특수 필드
  target_keywords: 'MERGE_UNIQUE'  // 중복 제거 후 병합
};

const mergeManualData = (crawledData, manualData) => {
  const merged = { ...crawledData };

  for (const [field, value] of Object.entries(manualData.overrides)) {
    const strategy = mergeStrategy[field];

    switch (strategy) {
      case 'APPEND':
        merged[field] = [
          ...(crawledData[field] || []),
          ...value.map(item => ({ ...item, source: 'MANUAL' }))
        ];
        break;

      case 'OVERRIDE':
        merged[field] = value;
        merged[`${field}_source`] = 'MANUAL';
        break;

      case 'MERGE_UNIQUE':
        merged[field] = [...new Set([
          ...(crawledData[field] || []),
          ...value
        ])];
        break;
    }
  }

  // 병합 메타데이터 추가
  merged.metadata.manual_override = {
    applied: true,
    fields: Object.keys(manualData.overrides),
    updated_by: manualData.updated_by,
    updated_at: manualData.updated_at
  };

  return merged;
};
```

### 5.2 증분 업데이트 (Incremental Update)

#### 목적

**배경**: 1,000개 매장을 매번 전체 재수집하면 비효율적

**해결**: 변경된 매장만 재수집

#### IU-001: 변경 감지 전략

**구현 방식**:
```javascript
const changeDetectionStrategy = {
  // 방법 1: 타임스탬프 비교
  timestamp_based: {
    enabled: true,
    check_field: 'last_modified',
    source: 'naver_place_api',  // 네이버 API에서 제공한다면
    threshold: '24h'  // 24시간 이내 변경 시 재수집
  },

  // 방법 2: 체크섬 비교 (권장)
  checksum_based: {
    enabled: true,
    algorithm: 'md5',
    fields_to_hash: [
      'name',
      'category',
      'menus',
      'businessHours',
      'rating'
    ],
    storage: 'data/metadata/checksums.json'
  },

  // 방법 3: 강제 재수집 조건
  force_recollect_if: [
    'completeness_score < 70',
    'last_collected > 30 days ago',
    'manual_override_exists'
  ]
};
```

**변경 감지 워크플로우**:
```javascript
const detectChanges = async (placeId) => {
  // 1. 기존 데이터 로드
  const previousData = await loadPreviousData(placeId);
  if (!previousData) return { changed: true, reason: 'NEW_PLACE' };

  // 2. 현재 체크섬 계산 (간단한 메타데이터만 크롤링)
  const currentChecksum = await calculateQuickChecksum(placeId);
  const previousChecksum = previousData.metadata.checksum;

  // 3. 비교
  if (currentChecksum !== previousChecksum) {
    return {
      changed: true,
      reason: 'CONTENT_CHANGED',
      details: identifyChangedFields(previousData, currentChecksum)
    };
  }

  // 4. 강제 재수집 조건 체크
  if (shouldForceRecollect(previousData)) {
    return {
      changed: true,
      reason: 'FORCE_RECOLLECT',
      details: getForceRecollectReason(previousData)
    };
  }

  return { changed: false };
};
```

#### IU-002: 부분 업데이트

**시나리오**: 메뉴만 변경되었을 때 전체 재수집할 필요 없음

**구현**:
```javascript
const partialUpdate = {
  // 변경된 섹션만 재수집
  sections: {
    BASIC_INFO: ['name', 'category', 'address', 'phone'],
    MENUS: ['menus'],
    REVIEWS: ['visitorReviews', 'blogReviews'],
    MEDIA: ['images'],
    ATTRIBUTES: ['attributes', 'businessHours']
  },

  // 섹션별 업데이트 함수
  updateSection: async (placeId, sectionName) => {
    const existingData = await loadExistingData(placeId);
    const sectionFields = partialUpdate.sections[sectionName];

    // 해당 섹션만 크롤링
    const updatedSection = await crawlSection(placeId, sectionFields);

    // 기존 데이터와 병합
    const mergedData = {
      ...existingData,
      place: {
        ...existingData.place,
        ...updatedSection
      },
      metadata: {
        ...existingData.metadata,
        partial_update: {
          section: sectionName,
          updated_at: new Date().toISOString(),
          fields: sectionFields
        }
      }
    };

    return mergedData;
  }
};
```

### 5.3 데이터 검증 및 품질 보증

#### QA-001: 자동 품질 검증

**목적**: 크롤링 후 데이터 이상 자동 탐지

**검증 규칙**:
```javascript
const qualityChecks = [
  // 1. 필수 필드 검증
  {
    name: 'required_fields',
    check: (data) => {
      const required = ['id', 'name', 'category', 'address'];
      return required.every(field => data.place[field]);
    },
    severity: 'CRITICAL',
    message: '필수 필드 누락'
  },

  // 2. 데이터 타입 검증
  {
    name: 'data_types',
    check: (data) => {
      return (
        typeof data.place.rating === 'number' &&
        data.place.rating >= 0 &&
        data.place.rating <= 5
      );
    },
    severity: 'HIGH',
    message: '평점이 0-5 범위를 벗어남'
  },

  // 3. 비즈니스 로직 검증
  {
    name: 'menu_price_validation',
    check: (data) => {
      if (!data.place.menus) return true;
      return data.place.menus.every(menu =>
        menu.price >= 0 && menu.price < 1000000  // 100만원 미만
      );
    },
    severity: 'MEDIUM',
    message: '메뉴 가격이 비정상적 (음수 또는 과도하게 높음)'
  },

  // 4. 중복 데이터 검증
  {
    name: 'duplicate_menus',
    check: (data) => {
      if (!data.place.menus) return true;
      const menuNames = data.place.menus.map(m => m.name);
      return menuNames.length === new Set(menuNames).size;
    },
    severity: 'LOW',
    message: '중복된 메뉴명 발견',
    auto_fix: (data) => {
      // 자동 수정: 중복 제거
      const uniqueMenus = [];
      const seen = new Set();
      for (const menu of data.place.menus) {
        if (!seen.has(menu.name)) {
          uniqueMenus.push(menu);
          seen.add(menu.name);
        }
      }
      data.place.menus = uniqueMenus;
      return data;
    }
  },

  // 5. 이상치 검증
  {
    name: 'outlier_detection',
    check: (data) => {
      // 예: 리뷰 1만개 이상은 이상치로 플래그
      return (data.place.visitorReviewCount || 0) < 10000;
    },
    severity: 'LOW',
    message: '리뷰 수가 비정상적으로 많음 (검증 필요)',
    auto_fix: null  // 자동 수정 불가, 수동 검토 필요
  }
];

const runQualityChecks = (data) => {
  const results = {
    passed: [],
    warnings: [],
    errors: [],
    critical: []
  };

  for (const check of qualityChecks) {
    const passed = check.check(data);

    if (!passed) {
      const issue = {
        check: check.name,
        severity: check.severity,
        message: check.message
      };

      // 자동 수정 시도
      if (check.auto_fix) {
        data = check.auto_fix(data);
        issue.auto_fixed = true;
      }

      // 심각도별 분류
      switch (check.severity) {
        case 'CRITICAL':
          results.critical.push(issue);
          break;
        case 'HIGH':
          results.errors.push(issue);
          break;
        case 'MEDIUM':
        case 'LOW':
          results.warnings.push(issue);
          break;
      }
    } else {
      results.passed.push(check.name);
    }
  }

  // Critical 이슈가 있으면 데이터 저장 거부
  data.metadata.quality_check = {
    passed: results.critical.length === 0,
    summary: {
      passed: results.passed.length,
      warnings: results.warnings.length,
      errors: results.errors.length,
      critical: results.critical.length
    },
    issues: [...results.warnings, ...results.errors, ...results.critical]
  };

  return {
    data,
    shouldSave: results.critical.length === 0
  };
};
```

---

## 📈 6. 성능 및 모니터링

### 6.1 성능 지표 (SLA)

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| **처리 속도** | 단일 매장 30초 이하 | `collection_stats.duration_ms` |
| **성공률** | 99% 이상 (재시도 포함) | `success_count / total_count` |
| **완성도** | 평균 85점 이상 | `avg(completeness.score)` |
| **데이터 신선도** | 90% 매장 7일 이내 업데이트 | `updated_within_7days / total` |
| **시스템 가용성** | 99.9% uptime | 모니터링 도구 |

### 6.2 모니터링 대시보드

**실시간 모니터링 항목**:
```javascript
const monitoringMetrics = {
  // 처리량
  throughput: {
    current_rate: '3 places/min',
    target_rate: '2 places/min',
    status: 'HEALTHY'
  },

  // 에러율
  error_rate: {
    last_hour: '0.5%',
    threshold: '1%',
    status: 'HEALTHY'
  },

  // Circuit Breaker 상태
  circuit_breaker: {
    state: 'CLOSED',
    consecutive_failures: 0,
    last_failure: null
  },

  // 큐 상태
  queue: {
    pending: 47,
    in_progress: 5,
    completed: 1234,
    failed: 3
  },

  // 리소스 사용량
  resources: {
    memory_mb: 512,
    cpu_percent: 35,
    browser_instances: 5
  }
};
```

### 6.3 알림 (Alerting)

**알림 조건**:
```yaml
alerts:
  - name: "High Error Rate"
    condition: "error_rate > 5%"
    duration: "10m"
    severity: "CRITICAL"
    channels: ["slack", "email"]

  - name: "Circuit Breaker Open"
    condition: "circuit_breaker.state == 'OPEN'"
    duration: "immediate"
    severity: "CRITICAL"
    channels: ["slack", "pagerduty"]

  - name: "Low Completeness Score"
    condition: "avg_completeness < 70"
    duration: "1h"
    severity: "WARNING"
    channels: ["slack"]

  - name: "Queue Backlog"
    condition: "queue.pending > 1000"
    duration: "30m"
    severity: "WARNING"
    channels: ["slack"]
```

---

## 🚀 7. 추가 제안 기능 (Enhancement Proposals)

### EP-001: AI 기반 데이터 보강 (Data Enrichment)

**배경**: 크롤링만으로는 얻을 수 없는 인사이트 추가

**제안 기능**:
```javascript
const aiEnrichment = {
  // 1. 이미지 분석
  image_analysis: {
    enabled: true,
    provider: 'OpenAI Vision API',
    tasks: [
      'menu_item_detection',     // 메뉴 사진에서 요리 인식
      'atmosphere_classification', // 분위기 분류 (캐주얼/고급/아늑)
      'crowd_level_estimation'    // 사진 속 붐비는 정도
    ],
    output: {
      detected_dishes: ['닭갈비', '치즈', '야채'],
      atmosphere: 'casual',
      estimated_crowd: 'medium'
    }
  },

  // 2. 리뷰 감성 분석
  review_sentiment: {
    enabled: true,
    provider: 'Claude API',
    analyze: [
      'overall_sentiment',  // 긍정/부정/중립
      'aspect_sentiment',   // 음식/서비스/분위기별 감성
      'key_phrases'         // 자주 언급되는 표현
    ]
  },

  // 3. 카테고리 세분화
  category_refinement: {
    enabled: true,
    method: 'rule_based_ml',
    example: {
      original: '닭갈비전문점',
      refined: {
        primary: '한식당',
        secondary: '닭갈비',
        cuisine_type: '한식',
        dining_style: 'casual_dining',
        price_range: 'moderate'
      }
    }
  }
};
```

### EP-002: 경쟁사 분석 자동화

**배경**: 키워드 전략 수립 시 경쟁사 정보 필수

**제안 기능**:
```javascript
const competitorAnalysis = {
  // 인근 경쟁 매장 자동 수집
  auto_discover: {
    enabled: true,
    criteria: {
      radius_meters: 500,
      same_category: true,
      min_rating: 3.0
    },
    max_competitors: 10
  },

  // 경쟁사 비교 메트릭
  comparison_metrics: [
    'rating_difference',       // 평점 차이
    'review_count_ratio',      // 리뷰 수 비율
    'menu_price_comparison',   // 가격대 비교
    'keyword_overlap',         // 공통 키워드
    'unique_selling_points'    // 차별화 포인트
  ],

  output_format: {
    competitors: [
      {
        id: '9876543210',
        name: '경쟁사 A',
        distance_meters: 350,
        rating_gap: -0.3,  // 우리보다 0.3점 낮음
        price_gap_percent: 15,  // 15% 더 비쌈
        common_keywords: ['강남', '닭갈비'],
        their_unique: ['무한리필', '24시간'],
        our_unique: ['철판', '치즈']
      }
    ]
  }
};
```

### EP-003: 크롤링 스케줄 최적화

**배경**: 모든 매장을 같은 주기로 업데이트할 필요 없음

**제안 기능**:
```javascript
const smartScheduling = {
  // 매장별 맞춤 업데이트 주기
  adaptive_schedule: {
    high_priority: {
      criteria: [
        'vip_customer',
        'completeness_score < 70',
        'recent_manual_override'
      ],
      frequency: 'daily'
    },

    medium_priority: {
      criteria: [
        'active_campaign',
        'high_review_velocity'  // 리뷰가 빠르게 증가
      ],
      frequency: 'weekly'
    },

    low_priority: {
      criteria: [
        'stable_data',  // 3개월간 변화 없음
        'low_traffic'
      ],
      frequency: 'monthly'
    }
  },

  // 트래픽 기반 스케줄링
  off_peak_scheduling: {
    enabled: true,
    preferred_hours: [2, 3, 4, 5],  // 새벽 2-5시
    avoid_hours: [12, 13, 18, 19]   // 점심/저녁 시간대
  }
};
```

### EP-004: 데이터 품질 자동 개선

**배경**: 수집 직후 자동으로 데이터 보정

**제안 기능**:
```javascript
const autoFix = {
  // 1. 주소 보정
  address_correction: {
    enabled: true,
    methods: [
      'geocoding_validation',  // 좌표로 역검증
      'postal_code_lookup',    // 우편번호 API 조회
      'fuzzy_matching'         // 유사 주소 찾기
    ]
  },

  // 2. 전화번호 정규화
  phone_normalization: {
    enabled: true,
    format: '02-1234-5678',  // 통일된 형식
    validate: true,           // 유효성 검증
    add_country_code: false
  },

  // 3. 메뉴 중복 제거
  menu_deduplication: {
    enabled: true,
    similarity_threshold: 0.9,  // 90% 유사 시 중복
    method: 'levenshtein_distance'
  },

  // 4. 이미지 URL 검증
  image_url_validation: {
    enabled: true,
    check_accessibility: true,  // 실제 접근 가능한지 확인
    remove_broken: true,
    download_and_cache: false   // 로컬 저장 (선택)
  }
};
```

### EP-005: 배치 처리 최적화

**배경**: 1,000개 매장 처리 시 병목 해소

**제안 기능**:
```javascript
const batchOptimization = {
  // 병렬 처리
  parallel_processing: {
    enabled: true,
    max_workers: 10,           // 최대 10개 동시 크롤링
    worker_type: 'thread',     // 'thread' or 'process'
    load_balancing: 'round_robin'
  },

  // 우선순위 큐
  priority_queue: {
    enabled: true,
    algorithm: 'weighted_fair_queuing',
    weights: {
      HIGH: 3,    // 고우선순위는 3배 자주 처리
      MEDIUM: 2,
      LOW: 1
    }
  },

  // 캐싱
  caching: {
    enabled: true,
    strategy: 'redis',  // 'redis' or 'memory'
    ttl_seconds: 3600,  // 1시간 캐시
    cache_keys: [
      'naver_place_html',
      'geocoding_results'
    ]
  },

  // 체크포인트
  checkpoint: {
    enabled: true,
    interval: 100,  // 100개마다 진행 상황 저장
    resume_on_failure: true
  }
};
```

---

## ✅ 8. 완성도 기준 및 검수

### 8.1 기능 완성도 체크리스트

#### Phase 1: 기본 기능 (MVP) - 필수

- [ ] **CR-001**: Puppeteer 동적 페이지 렌더링
- [ ] **CR-002**: 네이버 플레이스 기본 정보 수집
- [ ] **RS-001**: Circuit Breaker 패턴 적용
- [ ] **RS-002**: Exponential Backoff 재시도
- [ ] **RS-003**: Rate Limiting (분당 30회)
- [ ] **RS-006**: Graceful Degradation (부분 실패 처리)
- [ ] **데이터 정규화**: 주소, 메뉴, 리뷰 정규화
- [ ] **저장 형식**: JSON 스키마 v2.0.0 준수
- [ ] **L2 연동**: Data Contract 검증 통과
- [ ] **품질 검증**: 자동 품질 체크 5개 항목

**완성 기준**: 위 10개 항목 100% 완료

#### Phase 2: 고급 기능 - 권장

- [ ] **CR-003**: 증분 크롤링 (변경 감지)
- [ ] **RS-004**: IP Rotation (선택)
- [ ] **RS-005**: Session Management
- [ ] **MO-001**: 수동 입력 UI
- [ ] **MO-002**: 수동 데이터 병합
- [ ] **IU-001**: 변경 감지 전략 (체크섬)
- [ ] **IU-002**: 부분 업데이트 (섹션별)
- [ ] **모니터링**: 실시간 대시보드
- [ ] **알림**: Slack/Email 알림 설정

**완성 기준**: 위 9개 항목 중 70% 이상 완료

#### Phase 3: 추가 제안 기능 - 선택

- [ ] **EP-001**: AI 이미지 분석
- [ ] **EP-002**: 경쟁사 분석 자동화
- [ ] **EP-003**: 스케줄 최적화
- [ ] **EP-004**: 데이터 품질 자동 개선
- [ ] **EP-005**: 배치 처리 최적화

**완성 기준**: 비즈니스 요구에 따라 선택 구현

### 8.2 테스트 계획

#### 단위 테스트

```javascript
describe('L1 Pipeline - Unit Tests', () => {
  describe('Data Normalization', () => {
    it('should normalize Korean address correctly', () => {
      const input = '서울특별시 강남구 역삼동 123-45';
      const result = normalizeAddress(input);
      expect(result.si).toBe('서울특별시');
      expect(result.gu).toBe('강남구');
      expect(result.dong).toBe('역삼동');
    });

    it('should extract price from various formats', () => {
      expect(extractPrice('12,000원')).toBe(12000);
      expect(extractPrice('₩24000')).toBe(24000);
      expect(extractPrice('12000')).toBe(12000);
    });
  });

  describe('Quality Checks', () => {
    it('should detect missing required fields', () => {
      const data = { place: { name: '테스트' } };
      const result = runQualityChecks(data);
      expect(result.shouldSave).toBe(false);
      expect(result.data.metadata.quality_check.critical.length).toBeGreaterThan(0);
    });
  });
});
```

#### 통합 테스트

```javascript
describe('L1 Pipeline - Integration Tests', () => {
  it('should collect data end-to-end', async () => {
    const placeId = '1234567890';
    const result = await runL1Pipeline(placeId, { level: 'STANDARD' });

    expect(result.place.id).toBe(placeId);
    expect(result.metadata.completeness.score).toBeGreaterThan(60);
    expect(result.place.menus.length).toBeGreaterThan(0);
  }, 60000);  // 60초 타임아웃

  it('should handle network failures gracefully', async () => {
    // 네트워크 실패 시뮬레이션
    mockNetworkFailure();

    const result = await runL1Pipeline('test-place', { level: 'BASIC' });

    // Circuit Breaker가 작동해야 함
    expect(circuitBreaker.state).toBe('OPEN');
  });
});
```

#### Edge Case 테스트 시나리오

**목적**: 예외 상황 및 경계 조건에서의 시스템 동작 검증

```javascript
describe('L1 Pipeline - Edge Cases', () => {

  describe('주소 정규화 Edge Cases', () => {
    it('should handle malformed address', () => {
      // 비정상적인 주소 형식
      const testCases = [
        '',                                    // 빈 문자열
        '   ',                                 // 공백만
        '???',                                 // 특수문자만
        '1234',                                // 숫자만
        'abc def',                             // 영문만 (한국 주소 아님)
        '서울',                                // 시만 있고 상세 주소 없음
        '강남구 역삼동',                       // 시 누락
        '서울특별시 강남구 역삼동 ()',        // 빈 괄호
      ];

      testCases.forEach(address => {
        const result = normalizeAddress(address);

        // 빈 주소는 null 또는 빈 객체 반환
        if (!address.trim()) {
          expect(result).toBeNull();
        } else {
          // 신뢰도가 낮아야 함
          expect(result.confidence).toBeLessThan(0.5);
          // raw는 항상 보존
          expect(result.raw).toBe(address);
        }
      });
    });

    it('should handle addresses with special characters', () => {
      const address = '서울특별시 강남구 테헤란로 123 (역삼빌딩/3층)';
      const result = normalizeAddress(address);

      expect(result.si).toBe('서울특별시');
      expect(result.gu).toBe('강남구');
      expect(result.roadAddress).toContain('테헤란로');
      expect(result.building).toBeTruthy();  // 건물명 추출 성공
    });

    it('should handle old-style jibun addresses', () => {
      const address = '경기도 성남시 분당구 서현동 256-1';
      const result = normalizeAddress(address);

      expect(result.si).toBe('경기도');
      expect(result.dong).toBe('서현동');
      expect(result.jibunAddress).toBeTruthy();
      expect(result.roadAddress).toBeFalsy();  // 지번 주소는 도로명 없음
    });

    it('should handle addresses outside South Korea', () => {
      const address = '東京都 渋谷区';  // 일본 주소
      const result = normalizeAddress(address);

      expect(result.confidence).toBe(0);  // 한국 주소 패턴 매칭 실패
      expect(result.si).toBeNull();
    });
  });

  describe('메뉴 가격 추출 Edge Cases', () => {
    it('should handle extreme prices', () => {
      const testCases = [
        { input: '0원', expected: 0 },                    // 무료
        { input: '10,000,000원', expected: null },         // 1천만원 (비정상)
        { input: '-5000원', expected: null },              // 음수 (비정상)
        { input: '시가', expected: null },                 // 가격 미정
        { input: '100', expected: 100 },                   // 100원 (매우 저렴)
        { input: '999,999원', expected: 999999 },          // 최대 정상 가격
      ];

      testCases.forEach(({ input, expected }) => {
        const result = extractPrice(input);
        expect(result).toBe(expected);
      });
    });

    it('should handle non-numeric price strings', () => {
      const testCases = [
        '가격문의',
        'N/A',
        'TBD',
        '무료제공',
        '별도문의',
        '',
        null,
        undefined
      ];

      testCases.forEach(input => {
        const result = extractPrice(input);
        expect(result).toBeNull();
      });
    });

    it('should handle mixed currency symbols', () => {
      expect(extractPrice('₩12,000원')).toBe(12000);      // 원화 기호 + 원
      expect(extractPrice('$10')).toBe(10);                 // 달러 (숫자만 추출)
      expect(extractPrice('12,000엔')).toBe(12000);         // 다른 통화 (숫자만 추출)
    });
  });

  describe('메뉴명 정제 Edge Cases', () => {
    it('should handle nested parentheses', () => {
      const input = '철판닭갈비 ((매운맛)(2인))';
      const result = cleanMenuName(input);

      expect(result).not.toContain('(');
      expect(result).not.toContain(')');
      expect(result.trim().length).toBeGreaterThan(0);
    });

    it('should handle multiple dashes and spaces', () => {
      const input = '철판  -  닭갈비   -  -  특선';
      const result = cleanMenuName(input);

      expect(result).toBe('철판 닭갈비 특선');  // 정규화된 공백
    });

    it('should handle emoji in menu names', () => {
      const input = '🔥매운 닭갈비🔥 (인기메뉴)';
      const result = cleanMenuName(input);

      // 이모지는 유지하되 괄호는 제거
      expect(result).toContain('매운 닭갈비');
    });
  });

  describe('Circuit Breaker Edge Cases', () => {
    it('should transition states correctly under rapid failures', async () => {
      // 연속 5회 실패 시뮬레이션
      for (let i = 0; i < 5; i++) {
        await runL1Pipeline('invalid-id', { level: 'BASIC' });
      }

      expect(circuitBreaker.state).toBe('OPEN');
      expect(circuitBreaker.consecutiveFailures).toBe(5);
    });

    it('should recover after timeout period', async () => {
      // Circuit Breaker OPEN 상태로 만들기
      circuitBreaker.state = 'OPEN';
      circuitBreaker.lastFailureTime = Date.now() - 61000;  // 61초 전

      // 다음 요청은 HALF_OPEN으로 전환
      await runL1Pipeline('valid-id', { level: 'BASIC' });

      expect(circuitBreaker.state).toBe('HALF_OPEN');
    });

    it('should close after consecutive successes in HALF_OPEN', async () => {
      circuitBreaker.state = 'HALF_OPEN';

      // 연속 2회 성공
      await runL1Pipeline('valid-id-1', { level: 'BASIC' });
      await runL1Pipeline('valid-id-2', { level: 'BASIC' });

      expect(circuitBreaker.state).toBe('CLOSED');
      expect(circuitBreaker.consecutiveSuccesses).toBe(2);
    });
  });

  describe('Rate Limiting Edge Cases', () => {
    it('should queue requests when limit is reached', async () => {
      const requests = [];

      // 동시에 10개 요청 (제한: 5개)
      for (let i = 0; i < 10; i++) {
        requests.push(runL1Pipeline(`place-${i}`, { level: 'BASIC' }));
      }

      // 5개는 즉시 처리, 5개는 대기열에
      expect(rateLimiter.queue.pending).toBe(5);
      expect(rateLimiter.queue.in_progress).toBe(5);

      await Promise.all(requests);

      // 모두 완료 후 대기열 비어있음
      expect(rateLimiter.queue.pending).toBe(0);
    });

    it('should respect priority queue ordering', async () => {
      const results = [];

      // 우선순위 다른 요청들 추가
      await rateLimiter.add('low-priority', { priority: 'LOW' });
      await rateLimiter.add('high-priority', { priority: 'HIGH' });
      await rateLimiter.add('medium-priority', { priority: 'MEDIUM' });

      // HIGH → MEDIUM → LOW 순서로 처리되어야 함
      const order = rateLimiter.queue.map(item => item.priority);
      expect(order).toEqual(['HIGH', 'MEDIUM', 'LOW']);
    });
  });

  describe('Data Validation Edge Cases', () => {
    it('should reject data with missing required fields', () => {
      const invalidData = {
        version: "2.0.0",
        collected_at: "2025-11-14T10:30:00Z",
        // collection_level 누락
        collector_version: "1.0.0",
        place: {
          id: "1234567890"
          // name, category, address 누락
        },
        metadata: {}
      };

      const result = validateL1Data(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field.includes('place.name'))).toBe(true);
    });

    it('should validate coordinate boundaries', () => {
      const testCases = [
        { lat: 50, lng: 127, valid: false },    // 위도 범위 초과 (북한)
        { lat: 30, lng: 127, valid: false },    // 위도 범위 미달 (일본 남쪽)
        { lat: 37, lng: 120, valid: false },    // 경도 범위 미달 (중국)
        { lat: 37, lng: 135, valid: false },    // 경도 범위 초과 (일본)
        { lat: 37.5, lng: 127, valid: true },   // 정상 (서울)
      ];

      testCases.forEach(({ lat, lng, valid }) => {
        const data = createTestData({ lat, lng });
        const result = validateBusinessRules(data);

        if (valid) {
          expect(result.errors.filter(e => e.field === 'place.address.location').length).toBe(0);
        } else {
          expect(result.errors.some(e => e.field === 'place.address.location')).toBe(true);
        }
      });
    });

    it('should validate completeness score and grade consistency', () => {
      const inconsistentData = {
        ...validPlaceData,
        metadata: {
          completeness: {
            score: 95,      // A+ 범위 (90-100)
            grade: 'B'      // 불일치!
          },
          collection_stats: { attempts: 1, duration_ms: 1000 }
        }
      };

      const result = validateBusinessRules(inconsistentData);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'metadata.completeness')).toBe(true);
    });
  });

  describe('Graceful Degradation Edge Cases', () => {
    it('should save partial data when optional fields fail', async () => {
      // 이미지 로딩 실패 시뮬레이션
      mockImageLoadingFailure();

      const result = await runL1Pipeline('test-place', { level: 'COMPLETE' });

      // 필수 필드는 있어야 함
      expect(result.place.id).toBeTruthy();
      expect(result.place.name).toBeTruthy();

      // 이미지는 없거나 빈 배열
      expect(result.place.images || []).toEqual([]);

      // 완성도 점수가 낮아야 함
      expect(result.metadata.completeness.score).toBeLessThan(80);

      // 재시도 큐에 추가되었는지 확인
      expect(retryQueue.has(result.place.id)).toBe(true);
    });

    it('should fail completely when required fields missing', async () => {
      // 매장 ID 조회 실패 시뮬레이션
      mockPlaceIdFailure();

      const result = await runL1Pipeline('invalid-place', { level: 'STANDARD' });

      expect(result).toBeNull();  // 완전 실패
      expect(circuitBreaker.consecutiveFailures).toBeGreaterThan(0);
    });
  });

  describe('UTF-8 및 특수 문자 처리', () => {
    it('should handle special Korean characters', () => {
      const names = [
        '히도™ 강남점',                         // 상표 기호
        '맛있는집®',                           // 등록 상표
        '우리집 (1號점)',                      // 한자 숫자
        'café & bistro',                      // 악센트 문자
        '🍕피자스테이션🍕',                    // 이모지
      ];

      names.forEach(name => {
        const data = createTestData({ name });
        const result = validateL1Data(data);

        // 유효한 UTF-8 문자는 모두 허용
        expect(result.valid).toBe(true);
        expect(data.place.name).toBe(name);
      });
    });

    it('should handle very long strings', () => {
      const longName = 'A'.repeat(200);  // 100자 제한 초과

      const data = createTestData({ name: longName });
      const result = validateL1Data(data);

      // 스키마 검증 실패
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field.includes('name'))).toBe(true);
    });
  });

  describe('동시성 및 경쟁 조건', () => {
    it('should handle concurrent updates to same place', async () => {
      const placeId = 'concurrent-test-place';

      // 동일한 매장을 동시에 3번 수집
      const promises = [
        runL1Pipeline(placeId, { level: 'BASIC' }),
        runL1Pipeline(placeId, { level: 'STANDARD' }),
        runL1Pipeline(placeId, { level: 'COMPLETE' })
      ];

      const results = await Promise.all(promises);

      // 마지막 업데이트가 저장되어야 함
      const savedData = await loadPlaceData(placeId);
      expect(results.some(r => r.collection_level === savedData.collection_level)).toBe(true);
    });

    it('should handle race condition in Circuit Breaker', async () => {
      // 동시에 여러 실패 발생
      const failures = Array(10).fill(0).map(() =>
        runL1Pipeline('invalid-id', { level: 'BASIC' }).catch(() => {})
      );

      await Promise.all(failures);

      // Circuit Breaker는 정확히 한 번만 OPEN되어야 함
      expect(circuitBreaker.state).toBe('OPEN');
      expect(circuitBreaker.consecutiveFailures).toBeGreaterThanOrEqual(5);
    });
  });

  describe('타임아웃 및 지연 처리', () => {
    it('should timeout after 30 seconds', async () => {
      // 느린 페이지 시뮬레이션
      mockSlowPageLoad(35000);  // 35초

      const startTime = Date.now();
      const result = await runL1Pipeline('slow-place', { level: 'STANDARD' });
      const duration = Date.now() - startTime;

      // 30초 타임아웃 적용
      expect(duration).toBeLessThan(32000);  // 2초 여유
      expect(result).toBeNull();  // 타임아웃으로 실패
    });

    it('should retry with exponential backoff', async () => {
      const retryTimestamps = [];

      mockRetryTracking(retryTimestamps);
      await runL1Pipeline('retry-test', { level: 'BASIC' });

      // 재시도 간격: 2초, 4초, 8초
      expect(retryTimestamps.length).toBe(3);
      expect(retryTimestamps[1] - retryTimestamps[0]).toBeGreaterThanOrEqual(2000);
      expect(retryTimestamps[2] - retryTimestamps[1]).toBeGreaterThanOrEqual(4000);
    });
  });
});

// 테스트 헬퍼 함수
const createTestData = (overrides = {}) => {
  return {
    version: "2.0.0",
    collected_at: "2025-11-14T10:30:00Z",
    collection_level: "STANDARD",
    collector_version: "1.0.0",
    place: {
      id: "1234567890",
      name: "테스트 매장",
      category: "테스트",
      address: {
        raw: "서울특별시 강남구 역삼동 123-45"
      },
      ...overrides
    },
    metadata: {
      completeness: { score: 80, grade: "A" },
      collection_stats: { attempts: 1, duration_ms: 10000 }
    }
  };
};
```

---

## 📊 9. 성공 측정 지표 (Success Metrics)

### 9.1 정량적 지표

| 지표 | 현재 (예상) | 목표 | 측정 주기 |
|------|-------------|------|----------|
| **평균 처리 시간** | 45초 | 30초 | 실시간 |
| **성공률** | 95% | 99% | 일일 |
| **평균 완성도** | 78점 | 85점 | 주간 |
| **재시도율** | 15% | 10% | 일일 |
| **Critical 에러** | 2% | <0.5% | 일일 |
| **시스템 가용성** | 99.5% | 99.9% | 월간 |

### 9.2 정성적 지표

- **L2 파이프라인 만족도**: L2 개발자가 L1 출력 데이터로 분석 가능한지 (설문 5점 척도)
- **데이터 신뢰성**: 수동 검증 시 오류 발견율 (목표: <5%)
- **운영 편의성**: 수동 개입 필요 빈도 (목표: 월 1회 미만)

---

## 📝 10. 개발 우선순위 및 로드맵

### 10.1 Sprint 1 (2주) - MVP

**목표**: 기본 크롤링 기능 완성

- [ ] Puppeteer 크롤러 구현 (CR-001, CR-002)
- [ ] Circuit Breaker + Exponential Backoff (RS-001, RS-002)
- [ ] 데이터 정규화 (주소, 메뉴, 리뷰)
- [ ] JSON 저장 및 L2 인터페이스
- [ ] 기본 품질 검증 5개

### 10.2 Sprint 2 (2주) - 안정성 강화

**목표**: 프로덕션 레벨 안정성

- [ ] Rate Limiting (RS-003)
- [ ] Graceful Degradation (RS-006)
- [ ] 모니터링 대시보드
- [ ] 알림 시스템 (Slack)
- [ ] 단위 테스트 70% 커버리지

### 10.3 Sprint 3 (2주) - 고급 기능

**목표**: 운영 효율성 향상

- [ ] 증분 크롤링 (CR-003, IU-001)
- [ ] 수동 입력 기능 (MO-001, MO-002)
- [ ] 부분 업데이트 (IU-002)
- [ ] 배치 처리 최적화 (EP-005)

### 10.4 Sprint 4 (1주) - 추가 기능

**목표**: AI 기반 고도화 (선택)

- [ ] AI 이미지 분석 (EP-001)
- [ ] 경쟁사 분석 (EP-002)
- [ ] 스마트 스케줄링 (EP-003)

---

## 🤝 11. 이해관계자 및 승인

### 개발팀
- [ ] 백엔드 개발자 리뷰
- [ ] 프론트엔드 개발자 리뷰 (수동 입력 UI)
- [ ] DevOps 리뷰 (모니터링/배포)

### QA팀
- [ ] 테스트 계획 승인
- [ ] 품질 기준 합의

### 제품팀
- [ ] 기능 우선순위 승인
- [ ] 성공 지표 합의
- [ ] 로드맵 승인

---

**문서 버전**: 1.0
**최종 업데이트**: 2025-11-14
**다음 리뷰**: Sprint 1 완료 후 (2주 후)
**승인 대기**: Product Owner, Tech Lead
