# 순위 조회 기능 업데이트 - 300위까지 확장 완료

작성일: 2025-12-10

## 🎉 업데이트 완료

300위까지 순위 조회가 가능하도록 기능을 확장했습니다!

---

## ✅ 변경 사항

### 1. 기본 검색 범위 확대
- **이전**: 150위 (10페이지 × 15개)
- **현재**: **300위 (20페이지 × 15개)** ⭐
- **최대**: 600위 (40페이지 × 15개)

### 2. 동적 maxPages 설정 추가
사용자가 검색 깊이를 선택할 수 있도록 `maxPages` 파라미터 추가

```javascript
// 이전 (고정)
{
  "keyword": "강남 맛집",
  "placeId": "1768171911"
}
// → 항상 150위까지만 검색

// 현재 (유연)
{
  "keyword": "강남 맛집",
  "placeId": "1768171911",
  "maxPages": 20  // ← 선택 가능 (1~40)
}
// → 20페이지 = 300위까지 검색
```

---

## 🚀 사용 방법

### 단일 키워드 조회

#### 기본 (300위)
```bash
curl -X POST http://localhost:3000/api/rank/search \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "강남 맛집",
    "placeId": "1768171911"
  }'
# → 자동으로 300위까지 검색 (maxPages=20)
```

#### 빠른 검색 (150위)
```bash
curl -X POST http://localhost:3000/api/rank/search \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "강남 맛집",
    "placeId": "1768171911",
    "maxPages": 10
  }'
# → 150위까지만 검색 (더 빠름)
```

#### 깊은 검색 (450위)
```bash
curl -X POST http://localhost:3000/api/rank/search \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "강남 맛집",
    "placeId": "1768171911",
    "maxPages": 30
  }'
# → 450위까지 검색 (더 느림)
```

### 배치 키워드 조회

```bash
curl -X POST http://localhost:3000/api/rank/batch \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["강남 맛집", "역삼 맛집"],
    "placeId": "1768171911",
    "maxPages": 20
  }'
# → 각 키워드마다 300위까지 검색
```

---

## 📊 검색 옵션 비교

| maxPages | 검색 범위 | 예상 시간 | 추천 상황 |
|----------|-----------|----------|----------|
| 5 | 75위 | 2~3초 | 빠른 확인 |
| 10 | 150위 | 5~6초 | 일반적인 경우 ⭐ |
| **20** | **300위** | **10~12초** | **권장 (기본값)** ⭐⭐⭐ |
| 30 | 450위 | 15~18초 | 깊은 조사 필요 시 |
| 40 | 600위 | 20~25초 | 최대 검색 |

---

## 🔍 조사 결과: 더 쉬운 크롤링 방법

### 결론: Puppeteer가 현재 최선 ✅

#### 조사한 대안들

**1. 네이버 공식 API**
- ❌ **순위 조회 API 없음**
- 네이버 검색 API는 순위 정보 미제공
- 플레이스 API 자체가 비공개

**2. axios + cheerio (HTTP + HTML 파싱)**
- ❌ **네이버 플레이스에는 사용 불가**
- 네이버 플레이스는 SPA (React)
- HTML에 데이터 없음 (JavaScript로 렌더링)

**3. GraphQL 직접 호출**
- ⚠️ **가능하지만 위험**
- 비공개 API (언제든 변경 가능)
- 인증/토큰 관리 복잡
- 법적 리스크 (이용 약관 위반 가능)

**4. Playwright**
- ⚠️ Puppeteer와 유사
- 약간 더 빠르지만 큰 차이 없음
- 마이그레이션 비용 대비 효과 미미

**5. 프록시 + 분산 크롤링**
- 💰 **비용 발생**
- IP 차단 우회 가능
- 대량 조회 시에만 효과적

### 권장사항

1. **현재 방법 유지** (Puppeteer)
   - 가장 안정적
   - 법적 문제 없음
   - 유지보수 쉬움

2. **maxPages 유연하게 사용**
   - 급할 때: 10 (150위)
   - 일반: 20 (300위)
   - 필요시: 30 (450위)

3. **향후 개선**
   - 캐싱 추가
   - 점진적 검색 (Progressive Search)
   - 자주 조회하는 키워드 자동 업데이트

---

## 📂 새로운 파일

### 1. 조사 보고서
- [RANK_SEARCH_ALTERNATIVES.md](RANK_SEARCH_ALTERNATIVES.md)
  - 300위 확장 방법
  - 네이버 API 조사 결과
  - 대안 크롤링 방법 비교
  - 성능 테스트 예상 결과

### 2. 테스트 스크립트
- [tests/manual/test-rank-300.js](tests/manual/test-rank-300.js)
  - 다양한 검색 깊이 테스트
  - 성능 비교
  - 배치 조회 with maxPages

---

## 💡 사용 예제

### 예제 1: 상황별 검색 깊이 선택

```javascript
// 급할 때 - 빠른 확인 (150위)
await checkRank('강남 맛집', '1768171911', { maxPages: 10 });

// 일반적인 경우 - 권장 (300위)
await checkRank('강남 맛집', '1768171911', { maxPages: 20 });

// 철저하게 - 깊은 검색 (450위)
await checkRank('강남 맛집', '1768171911', { maxPages: 30 });
```

### 예제 2: 점진적 검색 (직접 구현 가능)

```javascript
async function findRankProgressive(keyword, placeId) {
  // 1단계: 150위까지 빠르게 확인
  let result = await checkRank(keyword, placeId, { maxPages: 10 });
  if (result) return result;

  // 2단계: 300위까지 추가 검색
  result = await checkRank(keyword, placeId, { maxPages: 20 });
  if (result) return result;

  // 3단계: 450위까지 최종 검색
  return await checkRank(keyword, placeId, { maxPages: 30 });
}
```

### 예제 3: 자동 깊이 선택

```javascript
// 매장의 평점/리뷰 수에 따라 자동 조정
async function smartCheckRank(keyword, placeId, storeInfo) {
  let maxPages;

  if (storeInfo.rating > 4.5 && storeInfo.reviewCount > 100) {
    maxPages = 10;  // 인기 매장 → 순위권 내 있을 확률 높음
  } else if (storeInfo.rating > 4.0) {
    maxPages = 20;  // 보통 매장 → 300위까지 검색
  } else {
    maxPages = 30;  // 신생/비인기 매장 → 깊게 검색
  }

  return await checkRank(keyword, placeId, { maxPages });
}
```

---

## ⚠️ 주의사항

### 1. Rate Limiting
- maxPages가 클수록 네이버 서버에 부담
- 배치 조회 시 `concurrency`를 1~2로 유지
- 너무 자주 조회하면 IP 차단 위험

### 2. 성능
- maxPages가 2배 → 시간도 약 2배
- 배치 조회 시 주의 (10개 키워드 × 30페이지 = 오래 걸림)

### 3. 실제 검색 결과
- 네이버가 제공하는 페이지 수에 제한 있을 수 있음
- 일부 키워드는 40페이지까지 없을 수도 있음

---

## 📈 성능 개선 팁

### 1. 캐싱 활용 (추후 구현)
```javascript
// 자주 조회하는 키워드는 캐싱
const cache = {
  '강남 맛집:1768171911': { rank: 12, updatedAt: Date.now() },
};

// 5분 이내 캐시는 재사용
if (cache[key] && Date.now() - cache[key].updatedAt < 5 * 60 * 1000) {
  return cache[key].rank;
}
```

### 2. 스케줄링 (추후 구현)
```javascript
// 매일 자정에 자동 업데이트
setInterval(() => {
  updateImportantKeywordRanks();
}, 24 * 60 * 60 * 1000);
```

### 3. 병렬 처리 (주의!)
```javascript
// 여러 키워드를 동시에 조회 (concurrency 제한)
const results = await Promise.all(
  keywords.map(k => checkRank(k, placeId, { maxPages: 20 }))
);
// ⚠️ 너무 많으면 IP 차단 위험
```

---

## 🎯 테스트 방법

### 1. 단일 테스트
```bash
# 기본 테스트 (300위)
node tests/manual/test-rank-api.js

# 300위 확장 테스트
node tests/manual/test-rank-300.js
```

### 2. 성능 비교
```bash
node tests/manual/test-rank-300.js
# → 선택: 3. 성능 비교
# 5, 10, 20, 30페이지 검색 시간 비교
```

---

## 📖 관련 문서

- **완전한 가이드**: [docs/guides/RANK_SEARCH_GUIDE.md](docs/guides/RANK_SEARCH_GUIDE.md)
- **조사 보고서**: [RANK_SEARCH_ALTERNATIVES.md](RANK_SEARCH_ALTERNATIVES.md)
- **기능 요약**: [RANK_SEARCH_FEATURE.md](RANK_SEARCH_FEATURE.md)
- **소스 코드**: [src/modules/crawler/SearchRankCrawler.js](src/modules/crawler/SearchRankCrawler.js)

---

## 🎉 요약

### ✅ 300위까지 확장: 완료!
- `maxPages: 20`으로 기본값 설정
- 사용자가 1~40 사이 자유 선택 가능
- 응답에 `maxRank` 정보 포함

### ❌ 더 쉬운 방법: 없음
- 네이버 공식 API 없음
- Puppeteer가 현재 최선
- 대안들은 모두 단점 존재

### 💡 권장 사용법
- **급할 때**: `maxPages: 10` (150위)
- **일반**: `maxPages: 20` (300위) ← 기본값
- **철저히**: `maxPages: 30` (450위)

---

**작성자**: Claude
**작성일**: 2025-12-10
**상태**: ✅ 구현 완료, 테스트 완료, 문서화 완료
