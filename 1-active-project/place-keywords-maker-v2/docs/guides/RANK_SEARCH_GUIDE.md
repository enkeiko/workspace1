# 키워드 순위 조회 기능 가이드

네이버 플레이스에서 특정 키워드로 검색했을 때 매장의 순위를 조회하는 기능입니다.

## 📋 목차

1. [기능 개요](#기능-개요)
2. [API 사용법](#api-사용법)
3. [GUI 사용법](#gui-사용법)
4. [응답 데이터 구조](#응답-데이터-구조)
5. [예제](#예제)
6. [주의사항](#주의사항)

---

## 기능 개요

### 주요 기능
- **단일 키워드 순위 조회**: 1개 키워드에서 특정 매장의 순위 확인
- **배치 키워드 순위 조회**: 여러 키워드에서 동시에 순위 확인
- **순위 범위**: 최대 150위까지 검색 (15개 × 10페이지)
- **실시간 로그**: GUI에서 실시간 진행 상황 확인

### 활용 사례
- SEO 키워드 최적화 전후 순위 변화 추적
- 경쟁 매장과 순위 비교
- 지역 키워드별 노출 순위 분석
- 키워드 효과성 측정

---

## API 사용법

### 1. 단일 키워드 순위 조회

**엔드포인트**: `POST /api/rank/search`

#### 요청
```json
{
  "keyword": "강남 맛집",
  "placeId": "1768171911"
}
```

#### 파라미터
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| keyword | string | ✅ | 검색 키워드 |
| placeId | string | ✅ | 네이버 플레이스 ID |

#### 응답 (순위 검출된 경우)
```json
{
  "success": true,
  "result": {
    "keyword": "강남 맛집",
    "placeId": "1768171911",
    "rank": 12,
    "page": 1,
    "totalResults": 1234,
    "placeName": "맛있는 한식당",
    "category": "한식",
    "rating": 4.5,
    "reviewCount": 230,
    "foundAt": "2025-12-10T12:34:56.789Z"
  }
}
```

#### 응답 (순위권 밖인 경우)
```json
{
  "success": true,
  "result": null,
  "message": "순위권 밖입니다 (150위 이내 미검출)"
}
```

#### 예제 (cURL)
```bash
curl -X POST http://localhost:3000/api/rank/search \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "강남 맛집",
    "placeId": "1768171911"
  }'
```

#### 예제 (JavaScript)
```javascript
const response = await fetch('http://localhost:3000/api/rank/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keyword: '강남 맛집',
    placeId: '1768171911',
  }),
});

const data = await response.json();

if (data.success && data.result) {
  console.log(`순위: ${data.result.rank}위`);
  console.log(`매장명: ${data.result.placeName}`);
} else {
  console.log('순위권 밖');
}
```

---

### 2. 배치 키워드 순위 조회

**엔드포인트**: `POST /api/rank/batch`

#### 요청
```json
{
  "keywords": [
    "강남 맛집",
    "역삼 맛집",
    "강남역 맛집",
    "역삼동 음식점"
  ],
  "placeId": "1768171911",
  "concurrency": 2
}
```

#### 파라미터
| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| keywords | string[] | ✅ | 검색 키워드 배열 |
| placeId | string | ✅ | 네이버 플레이스 ID |
| concurrency | number | ❌ | 동시 처리 수 (기본값: 2, 권장: 1-3) |

#### 응답 (즉시)
```json
{
  "success": true,
  "message": "4개 키워드 순위 조회를 시작합니다.",
  "keywords": ["강남 맛집", "역삼 맛집", "강남역 맛집", "역삼동 음식점"],
  "placeId": "1768171911"
}
```

#### 완료 후 SSE 이벤트
```json
{
  "type": "complete",
  "message": "🎉 순위 조회 완료: 3개 검출, 1개 순위권 밖, 0개 실패",
  "results": [...],
  "filePath": "data/output/batch-rank-1768171911-1733806496789.json"
}
```

#### 결과 파일 구조
```json
{
  "placeId": "1768171911",
  "keywords": ["강남 맛집", "역삼 맛집", "강남역 맛집", "역삼동 음식점"],
  "timestamp": "2025-12-10T12:34:56.789Z",
  "results": [
    {
      "success": true,
      "keyword": "강남 맛집",
      "rank": 12,
      "placeName": "맛있는 한식당",
      "category": "한식",
      "rating": 4.5,
      "reviewCount": 230
    },
    {
      "success": true,
      "keyword": "역삼 맛집",
      "rank": null
    }
  ],
  "summary": {
    "total": 4,
    "found": 3,
    "notFound": 1,
    "failed": 0
  }
}
```

#### 예제 (cURL)
```bash
curl -X POST http://localhost:3000/api/rank/batch \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["강남 맛집", "역삼 맛집"],
    "placeId": "1768171911",
    "concurrency": 2
  }'
```

---

## GUI 사용법

### (현재 미구현 - 추후 추가 예정)

GUI에 순위 조회 탭을 추가하려면 다음 작업이 필요합니다:

1. `src/gui/app.html`에 새 탭 추가
2. 순위 조회 폼 구현 (키워드 입력, Place ID 선택)
3. 실시간 결과 표시
4. 배치 조회 결과 테이블

---

## 응답 데이터 구조

### RankResult 객체

| 필드 | 타입 | 설명 |
|------|------|------|
| keyword | string | 검색 키워드 |
| placeId | string | 플레이스 ID |
| rank | number \| null | 순위 (1~150, null이면 순위권 밖) |
| page | number | 검색 결과 페이지 번호 (1~10) |
| totalResults | number \| null | 총 검색 결과 수 |
| placeName | string | 매장명 |
| category | string | 카테고리 |
| rating | number | 평점 (0.0~5.0) |
| reviewCount | number | 리뷰 개수 |
| foundAt | string | 검색 시각 (ISO 8601) |

---

## 예제

### 예제 1: 단일 키워드 순위 확인

```javascript
// Node.js 스크립트
import fetch from 'node-fetch';

async function checkRank(keyword, placeId) {
  const response = await fetch('http://localhost:3000/api/rank/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword, placeId }),
  });

  const data = await response.json();

  if (data.success) {
    if (data.result) {
      console.log(`✅ "${keyword}": ${data.result.rank}위`);
      return data.result.rank;
    } else {
      console.log(`⚠️ "${keyword}": 순위권 밖`);
      return null;
    }
  } else {
    console.error(`❌ 오류: ${data.error}`);
    return null;
  }
}

// 사용
await checkRank('강남 맛집', '1768171911');
```

### 예제 2: 여러 키워드 순위 배치 조회

```javascript
async function batchCheckRanks(keywords, placeId) {
  const response = await fetch('http://localhost:3000/api/rank/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keywords, placeId, concurrency: 2 }),
  });

  const data = await response.json();

  if (data.success) {
    console.log(`✅ ${data.message}`);
    console.log(`💡 결과 파일: data/output/batch-rank-${placeId}-*.json`);
    return true;
  } else {
    console.error(`❌ 오류: ${data.error}`);
    return false;
  }
}

// 사용
const keywords = ['강남 맛집', '역삼 맛집', '강남역 맛집'];
await batchCheckRanks(keywords, '1768171911');
```

### 예제 3: 순위 변화 추적

```javascript
// 1주일 간격으로 순위 변화 추적
async function trackRankings(keyword, placeId) {
  const history = [];

  // 초기 순위 조회
  const initialRank = await checkRank(keyword, placeId);
  history.push({
    date: new Date().toISOString(),
    rank: initialRank,
  });

  // 매주 순위 조회 (예시)
  setInterval(async () => {
    const currentRank = await checkRank(keyword, placeId);
    history.push({
      date: new Date().toISOString(),
      rank: currentRank,
    });

    // 순위 변화 분석
    if (currentRank && initialRank) {
      const change = initialRank - currentRank;
      if (change > 0) {
        console.log(`📈 순위 상승: ${Math.abs(change)}위 UP`);
      } else if (change < 0) {
        console.log(`📉 순위 하락: ${Math.abs(change)}위 DOWN`);
      } else {
        console.log(`➡️ 순위 유지`);
      }
    }

    // 히스토리 저장
    await fs.writeFile(
      `rank-history-${placeId}.json`,
      JSON.stringify(history, null, 2)
    );
  }, 7 * 24 * 60 * 60 * 1000); // 1주일
}
```

---

## 주의사항

### 1. 검색 제한
- **최대 150위까지 검색**: 15개/페이지 × 10페이지
- 150위 밖의 매장은 검출 불가
- 더 많은 페이지를 검색하려면 `maxPages` 설정 변경 필요

### 2. Rate Limiting
- **동시 처리 수 제한**: 배치 조회 시 `concurrency`는 1~3 권장
- 너무 많은 동시 요청은 네이버에서 차단될 수 있음
- 배치 간 2초 대기 시간 자동 적용

### 3. 캐싱 없음
- 순위 조회는 **실시간**으로 수행
- 동일한 키워드를 반복 조회하면 매번 네이버에 요청
- 빈번한 조회 시 IP 차단 가능성 있음

### 4. 검색 결과 변동
- 네이버 검색 결과는 시간대, 위치, 사용자 이력에 따라 변동
- 모바일 기준 검색 결과 사용
- PC와 모바일 검색 결과가 다를 수 있음

### 5. 에러 처리
- 네트워크 오류: Circuit Breaker로 자동 처리
- Puppeteer 오류: 자동 재시도 (최대 3회)
- 파싱 오류: 로그에 기록, 계속 진행

### 6. 성능
- **단일 조회**: 약 3~5초 소요
- **배치 조회 (10개 키워드, concurrency=2)**: 약 15~30초 소요
- 페이지 수가 많을수록 시간 증가

---

## 트러블슈팅

### 문제 1: "순위권 밖" 결과가 너무 많음
- **원인**: 검색 범위가 150위로 제한됨
- **해결**:
  - 더 구체적인 키워드 사용
  - 지역명 포함 키워드 사용
  - `maxPages` 설정 증가 (SearchRankCrawler 생성 시)

### 문제 2: 요청이 차단됨
- **원인**: 너무 많은 요청으로 IP 차단
- **해결**:
  - `concurrency` 값 줄이기 (1~2로 설정)
  - 요청 간 대기 시간 증가
  - VPN 사용 또는 IP 변경

### 문제 3: 순위가 일치하지 않음
- **원인**: 네이버 검색 결과의 개인화
- **해결**:
  - 시크릿 모드에서 직접 검색하여 비교
  - 모바일 기준 검색 결과 확인
  - 위치 기반 검색 결과 차이 고려

### 문제 4: Puppeteer 오류
- **원인**: 브라우저 초기화 실패
- **해결**:
  - Chrome/Chromium 설치 확인
  - `headless: false`로 설정하여 디버깅
  - 로그 확인 후 이슈 리포트

---

## 다음 단계

1. **GUI 통합**: 웹 인터페이스에서 쉽게 순위 조회
2. **순위 히스토리 저장**: DB에 순위 변화 기록
3. **알림 기능**: 순위 변화 시 알림
4. **차트 시각화**: 순위 변화 그래프
5. **경쟁 분석**: 경쟁 매장과 순위 비교

---

## 참고 링크

- [SearchRankCrawler 소스 코드](../../src/modules/crawler/SearchRankCrawler.js)
- [GUI 서버 API](../../src/gui/server.js)
- [테스트 스크립트](../../tests/manual/test-rank-api.js)
- [GUI 사용 가이드](./GUI_사용가이드.md)

---

**작성일**: 2025-12-10
**버전**: 1.0.0
**작성자**: Claude
