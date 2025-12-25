# 순위 조회 개선 방안 조사

작성일: 2025-12-10

## 📋 목차
1. [300위까지 확장 방법](#1-300위까지-확장-방법)
2. [네이버 공식 API 조사](#2-네이버-공식-api-조사)
3. [대안 크롤링 방법](#3-대안-크롤링-방법)
4. [권장 사항](#4-권장-사항)

---

## 1. 300위까지 확장 방법

### ✅ 현재 구현 (150위)
```javascript
// SearchRankCrawler 기본 설정
{
  maxPages: 10,           // 10페이지
  resultsPerPage: 15      // 페이지당 15개
}
// → 총 150개 (15 × 10 = 150위)
```

### ✅ 300위로 확장 (매우 간단!)

#### 방법 1: 서버 초기화 시 설정 변경
```javascript
// src/gui/server.js
this.rankCrawler = new SearchRankCrawler({
  headless: true,
  maxPages: 20,  // ← 10에서 20으로 변경
});
// → 총 300개 (15 × 20 = 300위)
```

#### 방법 2: API 요청 시 동적 설정
```javascript
// 클라이언트에서 maxPages 지정 가능하도록 수정
POST /api/rank/search
{
  "keyword": "강남 맛집",
  "placeId": "1768171911",
  "maxPages": 20  // ← 동적으로 지정
}
```

### 📊 페이지 수별 검색 범위

| maxPages | 검색 범위 | 예상 소요 시간 | 네트워크 부하 |
|----------|-----------|---------------|--------------|
| 10 | 150위 | 약 5초 | 낮음 ⭐ |
| 20 | 300위 | 약 10초 | 중간 ⭐⭐ |
| 30 | 450위 | 약 15초 | 높음 ⭐⭐⭐ |
| 40 | 600위 | 약 20초 | 매우 높음 ⭐⭐⭐⭐ |

### ⚠️ 주의사항
- **페이지 수 증가 = 시간 증가**: 선형적으로 증가
- **Rate Limiting 위험**: 너무 많은 페이지는 IP 차단 위험
- **실제 검색 결과**: 네이버가 제공하는 페이지 수에 제한 있을 수 있음

### 💡 권장: 동적 maxPages 설정
```javascript
// 사용자가 필요에 따라 선택
const maxPages = urgent ? 10 : 20;  // 급할 때는 10, 여유 있을 때는 20
```

---

## 2. 네이버 공식 API 조사

### 🔍 네이버 검색 API

#### 현재 상황
네이버는 **플레이스 검색 순위 조회 API를 공식적으로 제공하지 않습니다.**

#### 사용 가능한 API들

**1. 네이버 검색 API (블로그/뉴스/지역)**
- **URL**: https://developers.naver.com/docs/serviceapi/search/local/local.md
- **기능**: 지역 검색 (업체명, 주소 검색)
- **한계**:
  - ❌ **순위 정보 없음** (검색 결과만 제공)
  - ❌ 플레이스 검색과 결과 다름
  - ❌ 상세 정보 부족

**예제 요청**:
```bash
curl "https://openapi.naver.com/v1/search/local.json?query=강남역맛집&display=5" \
  -H "X-Naver-Client-Id: {CLIENT_ID}" \
  -H "X-Naver-Client-Secret: {CLIENT_SECRET}"
```

**예제 응답**:
```json
{
  "items": [
    {
      "title": "맛집이름",
      "link": "https://...",
      "category": "음식점>한식",
      "address": "서울특별시 강남구...",
      "roadAddress": "서울특별시 강남구...",
      "mapx": "127...",
      "mapy": "37..."
    }
  ]
}
```

**문제점**:
- 순위 정보 없음 (단순 검색 결과 반환)
- 플레이스 ID 없음
- 실제 네이버 플레이스 앱 검색 결과와 다름

**2. 네이버 플레이스 API**
- ❌ **존재하지 않음** - 공식 API 없음
- 네이버는 플레이스 데이터를 비공개

### 결론: 공식 API 사용 불가
**네이버 플레이스 순위 조회는 크롤링 외에는 방법이 없습니다.**

---

## 3. 대안 크롤링 방법

### 현재 방법: Puppeteer (헤드리스 브라우저)
```javascript
// 장점
✅ 완전한 페이지 렌더링
✅ JavaScript 실행 가능
✅ Apollo State 접근 가능

// 단점
❌ 느림 (브라우저 실행)
❌ 메모리 사용 많음
❌ 서버 리소스 많이 사용
```

### 대안 1: Playwright (Puppeteer 대체)

**장점**:
- Puppeteer보다 빠름
- 더 안정적
- 더 나은 에러 핸들링

**단점**:
- 본질적으로 동일한 방식 (브라우저 실행)
- 속도 차이 미미

**결론**: ⚠️ 큰 개선 없음

### 대안 2: HTTP 요청 + HTML 파싱

#### axios + cheerio 방식
```javascript
// 개념
const response = await axios.get(url);
const $ = cheerio.load(response.data);
// HTML에서 필요한 데이터 추출
```

**장점**:
- ✅ **매우 빠름** (브라우저 실행 없음)
- ✅ 메모리 효율적
- ✅ 서버 리소스 절약

**단점**:
- ❌ **JavaScript 실행 불가**
- ❌ **Apollo State 접근 불가** (클라이언트 렌더링)
- ❌ 네이버 플레이스는 SPA (React) → HTML에 데이터 없음

**결론**: ❌ **네이버 플레이스에는 사용 불가**

### 대안 3: 네이버 모바일 웹 + GraphQL 직접 호출

#### 개념
네이버 플레이스 모바일 웹이 사용하는 **GraphQL API를 직접 호출**

```javascript
// 네이버가 내부적으로 사용하는 GraphQL API
POST https://m.place.naver.com/graphql
Headers:
  - x-wtm-graphql: ...
  - Referer: https://m.place.naver.com/...

Body:
{
  "operationName": "restaurantList",
  "variables": {
    "query": "강남 맛집",
    "start": 1,
    "display": 15
  }
}
```

**장점**:
- ✅ **매우 빠름** (HTTP 요청만)
- ✅ JSON 응답 → 파싱 쉬움
- ✅ 브라우저 불필요

**단점**:
- ❌ **비공개 API** (언제든 변경 가능)
- ❌ **인증 필요** (쿠키, 토큰 등)
- ❌ **차단 위험** (User-Agent, Rate Limiting)
- ❌ **법적 리스크** (네이버 이용 약관 위반 가능)

**결론**: ⚠️ **위험성 높음, 유지보수 어려움**

### 대안 4: Selenium (대안 브라우저 자동화)

**장점**:
- Puppeteer와 동일한 기능

**단점**:
- Node.js에서는 Puppeteer가 더 나음
- Python에서나 선호됨

**결론**: ⚠️ 개선 없음

### 대안 5: 프록시 + 분산 크롤링

#### 개념
여러 IP에서 동시 크롤링

```javascript
// 프록시 리스트
const proxies = [
  'http://proxy1:8080',
  'http://proxy2:8080',
  'http://proxy3:8080',
];

// 각 프록시에서 동시 크롤링
```

**장점**:
- ✅ IP 차단 우회
- ✅ Rate Limiting 우회
- ✅ 빠른 배치 처리

**단점**:
- ❌ 프록시 비용
- ❌ 복잡도 증가
- ❌ 여전히 느림 (Puppeteer 사용)

**결론**: 💰 **비용 vs 효과 고려 필요**

---

## 4. 권장 사항

### 🎯 최적 해결책: 현재 방법 + 설정 개선

#### 추천 1: maxPages를 유연하게 설정
```javascript
// 사용자가 선택 가능하도록
const rankOptions = {
  quick: { maxPages: 10, description: '150위까지 (빠름)' },
  normal: { maxPages: 20, description: '300위까지 (권장)' },
  deep: { maxPages: 30, description: '450위까지 (느림)' },
};
```

#### 추천 2: 점진적 검색 (Progressive Search)
```javascript
// 아이디어: 순위권에 있을 것 같으면 조기 종료
async findRankProgressive(keyword, placeId) {
  // 1단계: 처음 5페이지 검색 (1-75위)
  let result = await searchPages(1, 5);
  if (result) return result;

  // 2단계: 다음 5페이지 검색 (76-150위)
  result = await searchPages(6, 10);
  if (result) return result;

  // 3단계: 필요시 추가 검색 (151-300위)
  if (needDeepSearch) {
    result = await searchPages(11, 20);
  }

  return result;
}
```

#### 추천 3: 캐싱 + 스케줄링
```javascript
// 자주 조회하는 키워드는 캐싱
const cache = new Map();

// 매시간마다 자동 업데이트
setInterval(() => {
  updatePopularKeywordRanks();
}, 60 * 60 * 1000);
```

### 📊 비교표

| 방법 | 속도 | 안정성 | 비용 | 유지보수 | 추천도 |
|------|------|--------|------|----------|--------|
| **현재 (Puppeteer)** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 무료 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Playwright | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 무료 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| axios + cheerio | ⭐⭐⭐⭐⭐ | ⭐ | 무료 | ⭐⭐ | ❌ (불가능) |
| GraphQL 직접 호출 | ⭐⭐⭐⭐⭐ | ⭐⭐ | 무료 | ⭐ | ⚠️ (위험) |
| 프록시 + 분산 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 💰💰 | ⭐⭐⭐ | ⭐⭐⭐ (비용) |

### ✅ 최종 권장사항

1. **단기 (지금 바로 가능)**:
   - `maxPages: 20`으로 변경 → 300위까지 확장
   - 사용자가 선택 가능하도록 옵션 제공

2. **중기 (1-2주 내)**:
   - 점진적 검색 구현
   - 자주 조회하는 키워드 캐싱
   - 배치 스케줄링

3. **장기 (필요시)**:
   - Playwright로 마이그레이션 (약간 더 빠름)
   - 프록시 도입 (대량 조회 시)

---

## 5. 구현 예제: 300위까지 확장

### 방법 1: 간단 설정 변경
```javascript
// src/gui/server.js - 기본값을 20으로 변경
this.rankCrawler = new SearchRankCrawler({
  headless: true,
  maxPages: 20,  // ← 변경
});
```

### 방법 2: API에서 동적 설정
```javascript
// src/gui/server.js - handleRankSearch 수정
async handleRankSearch(body, res) {
  const { keyword, placeId, maxPages = 10 } = body;  // ← maxPages 추가

  if (!this.rankCrawler) {
    this.rankCrawler = new SearchRankCrawler({
      headless: true,
      maxPages: maxPages,  // ← 동적 설정
    });
    await this.rankCrawler.initialize();
  }

  // ... 나머지 코드
}
```

### 방법 3: 옵션 선택 UI
```javascript
// 클라이언트 요청
{
  "keyword": "강남 맛집",
  "placeId": "1768171911",
  "searchDepth": "deep"  // quick | normal | deep
}

// 서버에서 매핑
const depthMap = {
  quick: 10,   // 150위
  normal: 20,  // 300위
  deep: 30     // 450위
};
```

---

## 6. 성능 테스트 결과 (예상)

### 단일 키워드 조회

| maxPages | 검색 범위 | 평균 소요 시간 | 메모리 사용 |
|----------|-----------|---------------|------------|
| 10 | 150위 | 5초 | 200MB |
| 20 | 300위 | 10초 | 250MB |
| 30 | 450위 | 15초 | 300MB |
| 40 | 600위 | 20초 | 350MB |

### 배치 키워드 조회 (10개 키워드, concurrency=2)

| maxPages | 검색 범위 | 평균 소요 시간 | 총 메모리 |
|----------|-----------|---------------|----------|
| 10 | 150위 | 25초 | 400MB |
| 20 | 300위 | 50초 | 500MB |
| 30 | 450위 | 75초 | 600MB |

---

## 7. 결론

### ✅ 300위까지 확장: **매우 쉬움**
- 단순히 `maxPages: 20`으로 설정 변경
- 코드 수정 최소화
- 안정성 유지

### ❌ 더 쉬운 크롤링 방법: **없음**
- 네이버 플레이스는 SPA (React 기반)
- 공식 API 없음
- Puppeteer가 현재 최선
- GraphQL 직접 호출은 위험성 높음

### 💡 개선 방향
1. **지금**: `maxPages` 확장 (10 → 20)
2. **다음**: 점진적 검색, 캐싱
3. **나중**: Playwright 마이그레이션 (선택)

---

**작성자**: Claude
**작성일**: 2025-12-10
**상태**: ✅ 조사 완료
