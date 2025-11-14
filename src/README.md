# L1 Pipeline - Naver Place Crawler

L1_FEATURE_SPEC.md 명세를 바탕으로 구현한 네이버 플레이스 데이터 크롤러입니다.

## 구현된 기능

### ✅ 핵심 기능

1. **동적 페이지 렌더링** (CR-001)
   - Puppeteer 기반 JavaScript 렌더링
   - 페이지 로딩 대기
   - User-Agent 설정

2. **Circuit Breaker 패턴** (RS-001)
   - 3가지 상태: CLOSED → OPEN → HALF_OPEN
   - 연속 5회 실패 시 OPEN
   - 60초 후 HALF_OPEN 전환
   - 연속 2회 성공 시 CLOSED 복귀

3. **Exponential Backoff 재시도** (RS-002)
   - 최대 3회 재시도
   - 초기 지연: 2초
   - 지수 증가: 2배씩 (2s → 4s → 8s)
   - Jitter 추가 (0-1초 랜덤)

4. **Graceful Degradation** (RS-006)
   - 부분 실패 시 수집 가능한 데이터 저장
   - 완성도 점수 계산
   - 누락 필드 추적

5. **수집 레벨**
   - BASIC: 필수 필드만 (~10초)
   - STANDARD: 필수 + 중요 필드 (~30초)
   - COMPLETE: 모든 필드 + 리뷰 (~60초)

6. **Rate Limiting** (RS-003)
   - Leaky Bucket 알고리즘
   - 우선순위 큐 (HIGH/MEDIUM/LOW)
   - 분당 30회, 시간당 1,000회 제한
   - 동시 실행 최대 5개

7. **데이터 정규화** (normalizers.js)
   - 주소 정규화: 시/도, 구/군, 동/읍/면 추출
   - 메뉴 정규화: 가격 추출, 카테고리 분류, 키워드 추출
   - 리뷰 정규화: 텍스트 정리, 키워드 추출
   - 연락처/영업시간 정규화

8. **데이터 검증** (validators.js)
   - 필수 필드 검증
   - 데이터 타입 검증 (Semantic Versioning, ISO 8601 등)
   - 비즈니스 규칙 검증 (완성도 일치성, 가격 합리성, 위치 좌표)
   - 품질 체크 (CRITICAL/HIGH/WARNING 단계)

9. **데이터 저장** (DataStorage.js)
   - 개별 매장 JSON 파일 저장/로드
   - 배치 데이터 저장
   - 수집 요약 및 메타데이터 저장
   - 저장소 통계 및 정리 기능

### 🚧 TODO (향후 구현 예정)

- [ ] **Rate Limiter와 PlaceCrawler 통합**
- [ ] **DataStorage와 PlaceCrawler 통합**
- [ ] **Validator와 PlaceCrawler 통합**
- [ ] **모니터링 및 로깅 강화**
- [ ] **단위 테스트**
- [ ] **통합 테스트**

## 설치

```bash
npm install
```

## 사용법

### 기본 사용

```javascript
const PlaceCrawler = require('./src/crawlers/PlaceCrawler');

const crawler = new PlaceCrawler({
  headless: true,
  timeout: 30000,
  maxRetries: 3
});

// 초기화
await crawler.initialize();

// 매장 크롤링
const data = await crawler.crawlPlace('1234567890', { level: 'STANDARD' });

console.log(data);

// 종료
await crawler.shutdown();
```

### 예시 실행

```bash
npm run example
```

## 구조

```
src/
├── crawlers/
│   └── PlaceCrawler.js      # 메인 크롤러 클래스
├── utils/
│   ├── normalizers.js        # 데이터 정규화 (25+ 함수)
│   ├── validators.js         # 데이터 검증 (8 검증 함수)
│   ├── RateLimiter.js        # Rate Limiting (Leaky Bucket)
│   └── DataStorage.js        # JSON 파일 저장
└── config/                   # 설정 파일 (TODO)
    └── default.js

examples/
└── basic-usage.js            # 기본 사용 예시
```

## API

### PlaceCrawler 클래스

#### Constructor

```javascript
new PlaceCrawler(options)
```

**옵션:**
- `headless` (boolean): Headless 모드 (기본: true)
- `timeout` (number): 페이지 타임아웃 (기본: 30000ms)
- `maxRetries` (number): 최대 재시도 횟수 (기본: 3)
- `baseDelay` (number): 재시도 초기 지연 (기본: 2000ms)
- `failureThreshold` (number): Circuit Breaker 실패 임계값 (기본: 5)
- `successThreshold` (number): Circuit Breaker 성공 임계값 (기본: 2)

#### 메서드

- `initialize()`: 브라우저 초기화
- `shutdown()`: 브라우저 종료
- `crawlPlace(placeId, options)`: 매장 데이터 수집
- `getStats()`: 통계 조회

#### 이벤트

- `initialized`: 초기화 완료
- `shutdown`: 종료 완료
- `placeCollected`: 데이터 수집 성공
- `retrying`: 재시도 시도
- `circuitBreakerStateChanged`: Circuit Breaker 상태 변경

## 출력 형식

```json
{
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
      "normalized": { ... }
    },
    "contact": {
      "phone": "02-1234-5678"
    },
    "rating": 4.5,
    "reviewCount": 1234,
    "menus": [ ... ],
    "businessHours": "...",
    "images": [ ... ]
  },
  "metadata": {
    "completeness": {
      "score": 87.5,
      "grade": "A",
      "missing_fields": []
    },
    "collection_stats": {
      "attempts": 1,
      "duration_ms": 28340,
      "sources": {
        "naver_place": "SUCCESS"
      }
    }
  }
}
```

## 참고 문서

- [L1_FEATURE_SPEC.md](../docs/L1_FEATURE_SPEC.md): 전체 기능 명세
- [L1_CRITICAL_REVIEW.md](../docs/L1_CRITICAL_REVIEW.md): 비판적 검토

## 라이센스

MIT
