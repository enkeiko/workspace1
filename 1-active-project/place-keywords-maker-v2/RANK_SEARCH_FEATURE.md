# 키워드 순위 조회 기능 - 구현 완료

작성일: 2025-12-10

## 🎉 구현 완료

네이버 플레이스에서 키워드로 검색했을 때 특정 매장의 순위를 조회하는 기능을 구현했습니다!

---

## 📋 구현 내용

### 1. API 엔드포인트 (✅ 완료)

#### POST /api/rank/search - 단일 키워드 순위 조회
```javascript
// 요청
{
  "keyword": "강남 맛집",
  "placeId": "1768171911"
}

// 응답
{
  "success": true,
  "result": {
    "rank": 12,
    "placeName": "맛있는 한식당",
    "category": "한식",
    "rating": 4.5,
    "reviewCount": 230
  }
}
```

#### POST /api/rank/batch - 배치 키워드 순위 조회
```javascript
// 요청
{
  "keywords": ["강남 맛집", "역삼 맛집", "강남역 맛집"],
  "placeId": "1768171911",
  "concurrency": 2
}

// 응답 (즉시)
{
  "success": true,
  "message": "3개 키워드 순위 조회를 시작합니다."
}

// 결과는 data/output/batch-rank-{placeId}-{timestamp}.json에 저장
```

### 2. 핵심 모듈 (✅ 기존 코드 활용)

- **SearchRankCrawler**: [src/modules/crawler/SearchRankCrawler.js](src/modules/crawler/SearchRankCrawler.js)
  - Puppeteer 기반 순위 검색
  - Circuit Breaker 안정성 확보
  - Exponential Backoff 재시도

### 3. GUI 서버 통합 (✅ 완료)

- [src/gui/server.js](src/gui/server.js)에 API 추가
  - `handleRankSearch()` - 단일 조회
  - `handleRankBatch()` - 배치 조회
  - `processRankBatch()` - 백그라운드 처리
  - SSE 실시간 로그 지원

### 4. 테스트 & 예제 (✅ 완료)

- **테스트 스크립트**: [tests/manual/test-rank-api.js](tests/manual/test-rank-api.js)
  - 단일/배치 조회 테스트
  - 서버 연결 확인

- **사용 예제**: [tests/manual/example-rank-usage.js](tests/manual/example-rank-usage.js)
  - 4가지 실전 예제
  - 순위 변화 비교
  - 매장 간 순위 비교

### 5. 사용 가이드 (✅ 완료)

- **완전한 가이드**: [docs/guides/RANK_SEARCH_GUIDE.md](docs/guides/RANK_SEARCH_GUIDE.md)
  - API 상세 설명
  - 응답 데이터 구조
  - 사용 예제
  - 트러블슈팅

---

## 🚀 사용 방법

### 1단계: GUI 서버 시작

```bash
npm run gui
```

서버가 http://localhost:3000 에서 실행됩니다.

### 2단계: API 호출

#### cURL로 테스트
```bash
# 단일 키워드 조회
curl -X POST http://localhost:3000/api/rank/search \
  -H "Content-Type: application/json" \
  -d '{"keyword":"강남 맛집","placeId":"1768171911"}'

# 배치 키워드 조회
curl -X POST http://localhost:3000/api/rank/batch \
  -H "Content-Type: application/json" \
  -d '{"keywords":["강남 맛집","역삼 맛집"],"placeId":"1768171911"}'
```

#### Node.js 스크립트로 테스트
```bash
# 테스트 스크립트 실행
node tests/manual/test-rank-api.js

# 사용 예제 실행
node tests/manual/example-rank-usage.js
```

#### JavaScript/Fetch API
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
}
```

---

## 📊 주요 기능

### ✅ 단일 키워드 순위 조회
- 1개 키워드에서 특정 매장의 순위 확인
- 최대 150위까지 검색 (15개 × 10페이지)
- 평균 3~5초 소요

### ✅ 배치 키워드 순위 조회
- 여러 키워드를 동시에 조회
- 동시 처리 수 조절 가능 (기본값: 2)
- 결과 JSON 파일 자동 저장

### ✅ 실시간 로그
- SSE를 통한 실시간 진행 상황 표시
- 성공/실패/경고 메시지
- GUI 로그 탭에서 확인 가능

### ✅ 안정성
- Circuit Breaker 패턴
- Exponential Backoff 재시도
- Rate Limiting

---

## 📂 파일 구조

```
place-keywords-maker-v2/
├── src/
│   ├── modules/
│   │   └── crawler/
│   │       └── SearchRankCrawler.js     # ✅ 순위 검색 크롤러
│   └── gui/
│       └── server.js                    # ✅ API 엔드포인트 추가
├── tests/
│   └── manual/
│       ├── test-rank-api.js             # ✅ 테스트 스크립트
│       └── example-rank-usage.js        # ✅ 사용 예제
├── docs/
│   └── guides/
│       └── RANK_SEARCH_GUIDE.md         # ✅ 완전한 가이드
└── RANK_SEARCH_FEATURE.md               # ✅ 이 파일 (요약)
```

---

## 🎯 활용 사례

### 1. SEO 최적화 전후 비교
```javascript
// 최적화 전 순위 조회
const beforeRank = await checkRank('강남 맛집', '1768171911');
// → 25위

// (키워드 최적화 작업 수행)

// 최적화 후 순위 조회
const afterRank = await checkRank('강남 맛집', '1768171911');
// → 12위

console.log(`순위 개선: ${beforeRank - afterRank}위 UP!`);
// → "순위 개선: 13위 UP!"
```

### 2. 경쟁 매장 순위 비교
```javascript
const stores = [
  { name: '우리 매장', placeId: '1768171911' },
  { name: '경쟁 매장 A', placeId: '1265317185' },
  { name: '경쟁 매장 B', placeId: '1716926393' },
];

for (const store of stores) {
  const result = await checkRank('강남 맛집', store.placeId);
  console.log(`${store.name}: ${result?.rank || '순위권 밖'}위`);
}
```

### 3. 키워드 효과성 분석
```javascript
const keywords = [
  '강남 맛집',      // 일반 키워드
  '역삼 맛집',      // 지역 특화
  '강남 한식',      // 카테고리 특화
  '강남역 점심',    // 상황 특화
];

const results = await batchCheckRanks(keywords, '1768171911');
// 어떤 키워드가 가장 효과적인지 분석
```

### 4. 정기 모니터링
```javascript
// 매주 순위 체크하여 변화 추적
setInterval(async () => {
  const rank = await checkRank('강남 맛집', '1768171911');
  saveToHistory(rank);  // DB 또는 파일에 저장

  if (rank && rank < 10) {
    sendAlert('순위 10위 진입!');
  }
}, 7 * 24 * 60 * 60 * 1000);  // 1주일마다
```

---

## ⚠️ 주의사항

### 검색 제한
- **최대 150위까지 검색** (15개/페이지 × 10페이지)
- 더 많은 페이지를 검색하려면 `maxPages` 설정 변경

### Rate Limiting
- **동시 처리 수 제한**: 1~3 권장
- 너무 많은 요청은 IP 차단 위험

### 캐싱
- **실시간 검색**: 캐싱 없음
- 동일 키워드 반복 조회 시 매번 네이버에 요청

### 검색 결과 변동
- **개인화**: 시간대, 위치, 사용자 이력에 따라 변동
- **모바일 기준**: 모바일 검색 결과 사용

---

## 🔜 향후 개선 사항

### 우선순위 높음
- [ ] GUI에 순위 조회 탭 추가
- [ ] 순위 히스토리 DB 저장
- [ ] 순위 변화 차트 시각화

### 우선순위 중간
- [ ] 순위 변화 알림 기능
- [ ] 경쟁 매장 자동 분석
- [ ] 키워드 추천 기능

### 우선순위 낮음
- [ ] 순위 예측 (AI)
- [ ] 지역별 순위 비교
- [ ] 모바일/PC 순위 비교

---

## 📝 관련 문서

- **완전한 가이드**: [docs/guides/RANK_SEARCH_GUIDE.md](docs/guides/RANK_SEARCH_GUIDE.md)
  - API 상세 설명
  - 응답 데이터 구조
  - 트러블슈팅

- **테스트 스크립트**: [tests/manual/test-rank-api.js](tests/manual/test-rank-api.js)
  - 단일/배치 조회 테스트

- **사용 예제**: [tests/manual/example-rank-usage.js](tests/manual/example-rank-usage.js)
  - 4가지 실전 예제

- **소스 코드**: [src/modules/crawler/SearchRankCrawler.js](src/modules/crawler/SearchRankCrawler.js)
  - SearchRankCrawler 구현

---

## 🤝 기여

이슈나 개선 제안은 환영합니다!

---

## 📄 라이선스

MIT

---

**작성일**: 2025-12-10
**버전**: 1.0.0
**작성자**: Claude
**상태**: ✅ 구현 완료, 테스트 완료, 문서화 완료
