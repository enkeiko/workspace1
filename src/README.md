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

### 🚧 TODO (향후 구현 예정)

- [ ] **Rate Limiting** (RS-003)
- [ ] **데이터 정규화 함수들** (normalizeAddress, extractPrice 등)
- [ ] **배치 처리**
- [ ] **데이터 저장 (JSON 파일)**
- [ ] **모니터링 및 로깅**
- [ ] **단위 테스트**

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
├── utils/                    # 유틸리티 함수 (TODO)
│   ├── normalizers.js        # 데이터 정규화
│   └── validators.js         # 데이터 검증
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
