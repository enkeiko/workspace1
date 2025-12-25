# 05. 내부 API 명세 (API_REFERENCE)

> **문서 버전**: 1.0.0
> **최종 수정**: 2025-12-16

---

## 1. 모듈 구조

```
src/
├── core/
│   ├── KeywordCollector.js    # 키워드 수집 (연동)
│   ├── KeywordCombinator.js   # 키워드 조합 생성
│   └── RankValidator.js       # 순위 검증
│
├── parser/
│   ├── UrlParser.js           # URL → MID 변환
│   └── AddressParser.js       # 주소 → 지역 키워드
│
├── integration/
│   └── PlaceKeywordsAdapter.js # place-keywords-maker-v2 연동
│
├── output/
│   ├── TxtExporter.js         # TXT 출력
│   └── JsonExporter.js        # JSON 출력
│
└── utils/
    ├── HttpClient.js          # HTTP 요청
    ├── Logger.js              # 로깅
    └── Config.js              # 설정 관리
```

---

## 2. Core 모듈

### 2.1 KeywordCollector

키워드 수집 및 5분류 체계 적용

```javascript
const KeywordCollector = require('./core/KeywordCollector');

const collector = new KeywordCollector(options);
```

#### Constructor Options

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `adapter` | Object | PlaceKeywordsAdapter | 데이터 어댑터 |
| `enableCache` | boolean | true | 캐시 사용 여부 |
| `cacheTTL` | number | 86400000 | 캐시 유효시간 (ms) |

#### Methods

##### `collect(mid)`

MID로 5분류 키워드 수집

```javascript
const keywordSet = await collector.collect('1421207239');

// 반환값
{
  mid: '1421207239',
  CORE: [{ value: '미용실', priority: 1, source: 'category' }, ...],
  LOCATION: [{ value: '연산역', priority: 1, source: 'address' }, ...],
  MENU: [{ value: '히피펌', priority: 1, source: 'menus' }, ...],
  ATTRIBUTE: [{ value: '주차가능', priority: 1, source: 'facilities' }, ...],
  SENTIMENT: [{ value: '친절한', priority: 1, source: 'votedKeywords' }, ...],
  source: 'auto',
  createdAt: '2025-12-16T10:00:00Z'
}
```

##### `collectFromUrl(url)`

URL에서 MID 추출 후 키워드 수집

```javascript
const keywordSet = await collector.collectFromUrl(
  'https://m.place.naver.com/hairshop/1421207239/home'
);
```

##### `merge(autoKeywords, manualKeywords)`

자동 수집 키워드와 수동 입력 키워드 병합

```javascript
const merged = collector.merge(autoKeywords, {
  CORE: ['커스텀업종'],
  LOCATION: ['커스텀지역']
});
```

---

### 2.2 KeywordCombinator

5분류 키워드를 조합하여 검증용 키워드 생성

```javascript
const KeywordCombinator = require('./core/KeywordCombinator');

const combinator = new KeywordCombinator(options);
```

#### Constructor Options

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `minLength` | number | 6 | 최소 글자수 |
| `maxLength` | number | 15 | 최대 글자수 |
| `maxCombinations` | number | 150 | 최대 조합 수 |
| `topN` | number | 5 | 분류별 상위 N개 사용 |
| `tiers` | string[] | ['T1','T2','T3'] | 활성화할 Tier |

#### Methods

##### `generate(keywordSet)`

KeywordSet으로 조합 생성

```javascript
const combinations = combinator.generate(keywordSet);

// 반환값
[
  {
    keyword: '연산역 미용실',
    tier: 'T1',
    pattern: 'LOC+CORE',
    components: { location: '연산역', core: '미용실' },
    length: 6
  },
  {
    keyword: '부산 연산역 히피펌',
    tier: 'T1',
    pattern: 'LOC+MENU',
    components: { location: '부산 연산역', menu: '히피펌' },
    length: 9
  },
  // ...
]
```

##### `generateTier1(keywordSet)`

Tier 1 조합만 생성 (LOCATION + CORE, LOCATION + MENU)

```javascript
const tier1 = combinator.generateTier1(keywordSet);
```

##### `generateTier2(keywordSet)`

Tier 2 조합만 생성 (LOCATION + ATTRIBUTE + CORE)

```javascript
const tier2 = combinator.generateTier2(keywordSet);
```

##### `generateTier3(keywordSet)`

Tier 3 조합만 생성 (LOCATION + SENTIMENT + CORE)

```javascript
const tier3 = combinator.generateTier3(keywordSet);
```

##### `filter(combinations)`

필터링 적용 (글자수, 중복 제거)

```javascript
const filtered = combinator.filter(combinations);
```

---

### 2.3 RankValidator

네이버 검색 결과에서 순위 검증

```javascript
const RankValidator = require('./core/RankValidator');

const validator = new RankValidator(options);
```

#### Constructor Options

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `naturalThreshold` | number | 5 | 자연유입 기준 순위 |
| `exactThreshold` | number | 10 | 정확매칭 기준 순위 |
| `requestDelay` | number | 1500 | 요청 간격 (ms) |
| `maxRetries` | number | 3 | 최대 재시도 횟수 |
| `timeout` | number | 10000 | 요청 타임아웃 (ms) |
| `userAgent` | string | - | User-Agent 헤더 |

#### Methods

##### `validate(keyword, mid)`

단일 키워드 순위 검증

```javascript
const result = await validator.validate('연산역 미용실', '1421207239');

// 반환값
{
  keyword: '연산역 미용실',
  mid: '1421207239',
  rank: 2,
  page: 1,
  matchType: 'natural',  // 'natural' | 'exact' | 'none'
  searchUrl: 'https://search.naver.com/search.naver?query=...',
  validatedAt: '2025-12-16T10:30:00Z',
  responseTime: 1234
}
```

##### `validateBatch(combinations, mid, options)`

다중 키워드 순위 검증 (배치)

```javascript
const results = await validator.validateBatch(combinations, '1421207239', {
  onProgress: (current, total, result) => {
    console.log(`[${current}/${total}] ${result.keyword}: ${result.rank || 'N/A'}`);
  },
  onError: (keyword, error) => {
    console.error(`[Error] ${keyword}: ${error.message}`);
  }
});

// 반환값
{
  results: [...],
  stats: {
    total: 100,
    validated: 98,
    natural: 15,
    exact: 8,
    none: 75,
    failed: 2
  },
  duration: 180000
}
```

##### `classifyRank(rank)`

순위로 매칭 타입 분류

```javascript
validator.classifyRank(3);   // 'natural'
validator.classifyRank(7);   // 'exact'
validator.classifyRank(15);  // 'none'
validator.classifyRank(null); // 'none'
```

---

## 3. Parser 모듈

### 3.1 UrlParser

URL에서 MID 추출

```javascript
const UrlParser = require('./parser/UrlParser');

const parser = new UrlParser();
```

#### Methods

##### `parse(url)`

URL 파싱하여 MID 추출

```javascript
// 모바일 플레이스 URL
parser.parse('https://m.place.naver.com/hairshop/1421207239/home');
// → { mid: '1421207239', type: 'place' }

// 지도 URL
parser.parse('https://map.naver.com/p/entry/place/1421207239');
// → { mid: '1421207239', type: 'map' }

// 단축 URL
parser.parse('https://naver.me/xAbCdEfG');
// → { mid: null, type: 'short', needsRedirect: true }
```

##### `extractMid(url)`

MID만 추출

```javascript
const mid = parser.extractMid('https://m.place.naver.com/hairshop/1421207239/home');
// → '1421207239'
```

##### `isValidMid(mid)`

MID 유효성 검증

```javascript
parser.isValidMid('1421207239');  // true
parser.isValidMid('abc');          // false
parser.isValidMid('123');          // false (너무 짧음)
```

##### `resolveShortUrl(shortUrl)`

단축 URL 리다이렉트 추적

```javascript
const resolved = await parser.resolveShortUrl('https://naver.me/xAbCdEfG');
// → 'https://m.place.naver.com/hairshop/1421207239/home'
```

---

### 3.2 AddressParser

주소에서 지역 키워드 추출

```javascript
const AddressParser = require('./parser/AddressParser');

const parser = new AddressParser();
```

#### Methods

##### `parse(address)`

주소 파싱

```javascript
const result = parser.parse('부산 연제구 연산동 123-45');

// 반환값
{
  city: '부산',
  district: '연제구',
  dong: '연산동',
  station: '연산역',      // 인근 역 자동 탐지
  commercialArea: null
}
```

##### `toLocationKeywords(addressInfo)`

파싱 결과를 LOCATION 키워드 배열로 변환

```javascript
const keywords = parser.toLocationKeywords({
  city: '부산',
  district: '연제구',
  dong: '연산동',
  station: '연산역'
});

// 반환값
[
  { value: '연산역', priority: 1, source: 'address' },
  { value: '연산', priority: 2, source: 'address' },
  { value: '연산동', priority: 3, source: 'address' },
  { value: '부산 연산', priority: 4, source: 'address' },
  { value: '부산', priority: 5, source: 'address' }
]
```

---

## 4. Output 모듈

### 4.1 TxtExporter

TXT 파일 출력

```javascript
const TxtExporter = require('./output/TxtExporter');

const exporter = new TxtExporter(options);
```

#### Constructor Options

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `outputDir` | string | './결과' | 출력 디렉토리 |
| `encoding` | string | 'utf-8-bom' | 파일 인코딩 |
| `includeHeader` | boolean | true | 헤더 포함 여부 |

#### Methods

##### `export(jobResult)`

작업 결과를 TXT 파일로 저장

```javascript
const files = await exporter.export(jobResult);

// 반환값
{
  natural: './결과/1421207239 자연유입 추출결과.txt',
  exact: './결과/1421207239 정확매칭 추출결과.txt'
}
```

##### `exportNatural(results, mid)`

자연유입 결과만 저장

```javascript
const filePath = await exporter.exportNatural(naturalResults, '1421207239');
```

##### `exportExact(results, mid)`

정확매칭 결과만 저장

```javascript
const filePath = await exporter.exportExact(exactResults, '1421207239');
```

---

### 4.2 JsonExporter

JSON 파일 출력

```javascript
const JsonExporter = require('./output/JsonExporter');

const exporter = new JsonExporter(options);
```

#### Methods

##### `export(jobResult)`

작업 결과를 JSON 파일로 저장

```javascript
const filePath = await exporter.export(jobResult);
// → './결과/1421207239_result.json'
```

---

## 5. Utils 모듈

### 5.1 HttpClient

HTTP 요청 유틸리티

```javascript
const HttpClient = require('./utils/HttpClient');

const client = new HttpClient(options);
```

#### Constructor Options

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `timeout` | number | 10000 | 요청 타임아웃 |
| `retries` | number | 3 | 재시도 횟수 |
| `retryDelay` | number | 1000 | 재시도 간격 |
| `userAgent` | string | - | User-Agent |

#### Methods

##### `get(url, options)`

GET 요청

```javascript
const response = await client.get('https://search.naver.com/search.naver', {
  params: { query: '강남역 미용실' }
});
```

##### `getWithRetry(url, options)`

재시도 로직 포함 GET 요청

```javascript
const response = await client.getWithRetry(url, {
  maxRetries: 3,
  retryDelay: 1000
});
```

---

### 5.2 Logger

로깅 유틸리티

```javascript
const Logger = require('./utils/Logger');

const logger = new Logger(options);
```

#### Methods

```javascript
logger.info('작업 시작', { mid: '1421207239' });
logger.warn('캐시 데이터 없음', { mid: '1421207239' });
logger.error('검증 실패', { keyword: '강남역 미용실', error: err });
logger.debug('HTTP 응답', { status: 200, time: 1234 });
```

---

### 5.3 Config

설정 관리

```javascript
const Config = require('./utils/Config');

const config = new Config('./config/config.json');
```

#### Methods

```javascript
// 전체 설정 로드
const settings = config.load();

// 특정 설정 조회
const maxLength = config.get('keyword.maxLength');
const delay = config.get('validation.requestDelay', 1500); // 기본값 지정

// 설정 업데이트
config.set('keyword.maxLength', 20);
config.save();
```

---

## 6. 전체 사용 예시

```javascript
const KeywordCollector = require('./core/KeywordCollector');
const KeywordCombinator = require('./core/KeywordCombinator');
const RankValidator = require('./core/RankValidator');
const TxtExporter = require('./output/TxtExporter');
const Logger = require('./utils/Logger');

async function main(midOrUrl) {
  const logger = new Logger();

  try {
    // Step 1: 키워드 수집
    logger.info('키워드 수집 시작');
    const collector = new KeywordCollector();
    const keywordSet = await collector.collectFromUrl(midOrUrl);
    logger.info(`키워드 수집 완료: ${keywordSet.mid}`);

    // Step 2: 조합 생성
    logger.info('조합 생성 시작');
    const combinator = new KeywordCombinator({ maxCombinations: 100 });
    const combinations = combinator.generate(keywordSet);
    logger.info(`조합 생성 완료: ${combinations.length}개`);

    // Step 3: 순위 검증
    logger.info('순위 검증 시작');
    const validator = new RankValidator();
    const { results, stats } = await validator.validateBatch(
      combinations,
      keywordSet.mid,
      {
        onProgress: (current, total) => {
          process.stdout.write(`\r검증 중: ${current}/${total}`);
        }
      }
    );
    console.log('');
    logger.info(`순위 검증 완료: 자연유입 ${stats.natural}개, 정확매칭 ${stats.exact}개`);

    // Step 4: 결과 저장
    logger.info('결과 저장 시작');
    const exporter = new TxtExporter();
    const files = await exporter.export({
      mid: keywordSet.mid,
      results,
      stats
    });
    logger.info(`결과 저장 완료: ${files.natural}, ${files.exact}`);

    return { success: true, files, stats };

  } catch (error) {
    logger.error('처리 실패', { error: error.message });
    throw error;
  }
}

// 실행
main('https://m.place.naver.com/hairshop/1421207239/home')
  .then(result => console.log('완료:', result))
  .catch(err => console.error('오류:', err));
```

---

*문서 작성: 2025-12-16*
