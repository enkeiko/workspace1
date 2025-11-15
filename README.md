# L1 Pipeline - 네이버 플레이스 데이터 수집 시스템

네이버 플레이스 정보를 안정적이고 효율적으로 수집하는 프로덕션급 크롤링 파이프라인

## 📊 프로젝트 상태

- **안정성**: 95/100 (프로덕션 배포 가능)
- **테스트 커버리지**: 90.69% (Utils 모듈)
- **총 테스트**: 179개 모두 통과 ✅

## 🎯 주요 기능

### 1. 안정적인 크롤링
- **Circuit Breaker 패턴**: 연속 실패 시 자동 차단 및 복구
- **Exponential Backoff**: 지능적인 재시도 전략
- **Page Pool**: 브라우저 페이지 재사용으로 메모리 효율성
- **Rate Limiting**: 요청률 제어 및 동시성 관리

### 2. 데이터 품질 보장
- **표준화된 검증**: L1_FEATURE_SPEC.md 명세 준수
- **한국 좌표 검증**: 본토 + 제주 분리 검증
- **완성도 점수**: 수집 데이터 품질 자동 평가

### 3. 고성능 처리
- **배치 필드 추출**: 네트워크 왕복 최소화
- **Weighted Fair Queuing**: 우선순위별 공정한 작업 분배
- **네트워크 유휴 감지**: 동적 대기 시간 최적화

### 4. 프로덕션 준비
- **중앙 설정 관리**: 환경별 설정 (development/production/test)
- **이벤트 버스**: 실시간 모니터링 및 로깅
- **에러 표준화**: 체계적인 에러 처리 및 추적

## 🏗️ 아키텍처

```
src/
├── config/              # 중앙 설정 관리
│   ├── default.js       # 기본 설정
│   ├── development.js   # 개발 환경
│   ├── production.js    # 프로덕션 환경
│   └── test.js          # 테스트 환경
├── crawlers/
│   └── PlaceCrawler.js  # 메인 크롤러
├── utils/
│   ├── RateLimiter.js   # 레이트 리미터
│   ├── DataStorage.js   # 데이터 저장
│   ├── validators.js    # 데이터 검증
│   └── normalizers.js   # 데이터 정규화
├── errors/
│   └── index.js         # 표준 에러 클래스
├── monitoring/
│   └── EventBus.js      # 중앙 이벤트 버스
└── selectors/
    └── naver-place.json # CSS 셀렉터 (외부화)
```

## 🚀 빠른 시작

### 설치

```bash
npm install
```

### 기본 사용법

```javascript
const PlaceCrawler = require('./src/crawlers/PlaceCrawler');
const config = require('./src/config');

// 크롤러 초기화
const crawler = new PlaceCrawler(config.crawler);
await crawler.initialize();

// 단일 매장 크롤링
const data = await crawler.crawlPlace('PLACE_ID', {
  level: 'STANDARD',  // BASIC, STANDARD, DETAILED
  priority: 'HIGH',   // HIGH, MEDIUM, LOW
  autoSave: true
});

// 종료
await crawler.close();
```

### 환경 설정

```bash
# 개발 모드
NODE_ENV=development npm start

# 프로덕션 모드
NODE_ENV=production npm start

# 이벤트 로깅 활성화
LOG_EVENTS=true npm start
```

## 📈 테스트

```bash
# 전체 테스트 실행
npm test

# 커버리지 포함
npm test -- --coverage

# 특정 파일만 테스트
npm test -- tests/unit/DataStorage.test.js

# Watch 모드
npm test -- --watch
```

### 테스트 커버리지

| 모듈 | Statements | Branch | Functions | Lines |
|------|-----------|--------|-----------|-------|
| **normalizers.js** | 98.28% | 96.68% | 96.66% | 98.56% |
| **validators.js** | 92.73% | 88.00% | 100.00% | 94.87% |
| **RateLimiter.js** | 92.70% | 92.50% | 94.73% | 93.33% |
| **DataStorage.js** | 71.42% | 76.92% | 58.82% | 72.16% |

## 🔧 설정

### 크롤러 설정

```javascript
{
  headless: true,
  timeout: 30000,
  maxRetries: 3,
  maxPoolSize: 10,
  circuitBreaker: {
    failureThreshold: 5,
    successThreshold: 2,
    breakerTimeout: 60000
  }
}
```

### Rate Limiter 설정

```javascript
{
  maxConcurrent: 5,
  requestsPerMinute: 30,
  requestsPerHour: 1000,
  priorityWeights: {
    HIGH: 5,    // 50%
    MEDIUM: 3,  // 30%
    LOW: 2      // 20%
  }
}
```

## 📊 모니터링

### 이벤트 버스 사용

```javascript
const eventBus = require('./src/monitoring/EventBus');

// 이벤트 리스닝
eventBus.on('crawlCompleted', (data) => {
  console.log('크롤링 완료:', data);
});

// 통계 조회
const stats = eventBus.getStats();
console.log('총 이벤트:', stats.totalEvents);
console.log('분당 이벤트:', stats.eventsPerMinute);

// 최근 에러 조회
const errors = eventBus.getRecentErrors(10);
```

### 주요 이벤트

- `crawlStarted` - 크롤링 시작
- `crawlCompleted` - 크롤링 완료
- `crawlFailed` - 크롤링 실패
- `circuitBreakerStateChanged` - Circuit Breaker 상태 변경
- `rateLimitExceeded` - Rate Limit 초과
- `validationFailed` - 데이터 검증 실패

## 🔍 데이터 출력 형식

L1 파이프라인은 [L1_FEATURE_SPEC.md](docs/L1_FEATURE_SPEC.md) 명세를 따릅니다:

```json
{
  "version": "2.0.0",
  "collected_at": "2024-01-15T10:30:00Z",
  "collection_level": "STANDARD",
  "place": {
    "id": "1234567890",
    "name": "맛있는 식당",
    "category": "한식",
    "address": {
      "raw": "서울특별시 강남구 역삼동 123-45",
      "location": { "lat": 37.5, "lng": 127.0 }
    },
    "rating": 4.5,
    "reviewCount": 100
  },
  "metadata": {
    "completeness": { "score": 85, "grade": "A" }
  }
}
```

## 📝 QA 검수

전체 QA 보고서: [docs/QA_REVIEW_REPORT.md](docs/QA_REVIEW_REPORT.md)

### 완료된 이슈

- ✅ **Critical** (7/7): 모든 치명적 이슈 해결
- ✅ **High Priority** (5/5): 모든 높은 우선순위 이슈 해결
- ✅ **Medium Priority** (3/3): 모든 중간 우선순위 이슈 해결
- ⚠️ **Low Priority** (2/3): L-1 (구조화된 로깅) 보류

## 🚧 향후 계획

- [ ] PlaceCrawler E2E 테스트
- [ ] 통합 테스트 작성
- [ ] Winston/Pino 로깅 통합 (L-1)
- [ ] CI/CD 파이프라인 구축
- [ ] 성능 벤치마크

## 📄 라이센스

MIT

## 👥 기여

풀 리퀘스트 환영합니다!

## 📚 관련 문서

- [L1 Feature Spec](docs/L1_FEATURE_SPEC.md)
- [QA Review Report](docs/QA_REVIEW_REPORT.md)
- [Critical Review](docs/L1_CRITICAL_REVIEW.md)
