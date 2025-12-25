# 🚨 에러 코드 정의

> **표준화된 에러 관리 시스템**

---

## 📌 에러 코드 형식

**형식**: `E_{MODULE}_{NUMBER}: 설명`

- `E_`: 에러 접두사
- `{MODULE}`: 모듈명 (L1, L2, L3, CRAWLER 등)
- `{NUMBER}`: 3자리 숫자 (001부터 시작)

**예시**: `E_L1_001: 크롤러 JSON이 없습니다`

---

## 🔧 Place_Keywords_maker 에러 코드

### L1 - 데이터 수집 및 정렬

| 코드 | 설명 | 심각도 | 복구 가능 |
|------|------|--------|----------|
| `E_L1_001` | 크롤러 JSON이 없습니다 | High | ✅ 재크롤링 |
| `E_L1_002` | JSON 파싱 실패 | High | ✅ 재크롤링 |
| `E_L1_003` | 필수 필드 누락 | Medium | ⚠️ 부분 처리 |
| `E_L1_004` | 주소 파싱 실패 | Low | ✅ 수동 입력 |
| `E_L1_005` | 완성도 평가 실패 | Low | ✅ 기본값 사용 |
| `E_L1_006` | 현재 키워드 파일 오류 | Low | ✅ 스킵 가능 |
| `E_L1_007` | 수동 메모 파일 오류 | Low | ✅ 스킵 가능 |
| `E_L1_008` | 데이터 저장 실패 | High | ❌ 치명적 |

#### 사용 예시

```javascript
// E_L1_001
if (!fs.existsSync(jsonFilePath)) {
  throw new Error('E_L1_001: 크롤러 JSON이 없습니다');
}

// E_L1_002
try {
  const data = JSON.parse(jsonContent);
} catch (error) {
  throw new Error(`E_L1_002: JSON 파싱 실패 - ${error.message}`);
}

// E_L1_003
if (!placeData.name || !placeData.category) {
  throw new Error('E_L1_003: 필수 필드 누락 - name 또는 category');
}
```

### L2 - AI 분석 및 목표키워드 설정

| 코드 | 설명 | 심각도 | 복구 가능 |
|------|------|--------|----------|
| `E_L2_001` | 네이버 API 호출 실패 | High | ✅ 재시도 |
| `E_L2_002` | AI API 호출 실패 | High | ✅ 재시도 |
| `E_L2_003` | 검색량 데이터 없음 | Medium | ✅ 더미 데이터 |
| `E_L2_004` | AI 응답 파싱 실패 | High | ✅ 재시도 |
| `E_L2_005` | L1 출력 파일 없음 | High | ❌ L1 먼저 실행 |
| `E_L2_006` | API 키 미설정 | High | ❌ 설정 필요 |
| `E_L2_007` | 키워드 분석 실패 | Medium | ✅ 기본 로직 |
| `E_L2_008` | 결과 저장 실패 | High | ❌ 치명적 |

#### 사용 예시

```javascript
// E_L2_001
try {
  const result = await naverAPI.searchKeyword(keyword);
} catch (error) {
  throw new Error(`E_L2_001: 네이버 API 호출 실패 - ${error.message}`);
}

// E_L2_006
if (!process.env.OPENAI_API_KEY) {
  throw new Error('E_L2_006: API 키 미설정 - OPENAI_API_KEY');
}
```

### L3 - 최종 키워드 조합

| 코드 | 설명 | 심각도 | 복구 가능 |
|------|------|--------|----------|
| `E_L3_001` | 목표키워드가 없습니다 | High | ❌ L2 먼저 실행 |
| `E_L3_002` | 점수 계산 실패 | Medium | ✅ 기본 점수 |
| `E_L3_003` | L2 출력 파일 없음 | High | ❌ L2 먼저 실행 |
| `E_L3_004` | 순위 결정 실패 | Medium | ✅ 랜덤 순서 |
| `E_L3_005` | SEO 전략 생성 실패 | Low | ✅ 스킵 가능 |
| `E_L3_006` | 결과 저장 실패 | High | ❌ 치명적 |

#### 사용 예시

```javascript
// E_L3_001
if (!targetKeywords || targetKeywords.length === 0) {
  throw new Error('E_L3_001: 목표키워드가 없습니다');
}

// E_L3_003
if (!fs.existsSync(l2OutputPath)) {
  throw new Error('E_L3_003: L2 출력 파일 없음 - L2를 먼저 실행하세요');
}
```

---

## 🕷️ Place_Crawler 에러 코드

### CRAWLER - 크롤링

| 코드 | 설명 | 심각도 | 복구 가능 |
|------|------|--------|----------|
| `E_CRAWLER_001` | 브라우저 초기화 실패 | High | ✅ 재시도 |
| `E_CRAWLER_002` | 페이지 접속 실패 | High | ✅ 재시도 |
| `E_CRAWLER_003` | Apollo State 없음 | High | ⚠️ 봇 탐지 |
| `E_CRAWLER_004` | 봇 탐지됨 | High | ✅ 30초 대기 |
| `E_CRAWLER_005` | 플레이스 ID 없음 | High | ❌ 필수 입력 |
| `E_CRAWLER_006` | 타임아웃 | Medium | ✅ 재시도 |
| `E_CRAWLER_007` | JSON 저장 실패 | High | ❌ 치명적 |
| `E_CRAWLER_008` | Playwright 미설치 | High | ❌ 설치 필요 |

#### 사용 예시

```javascript
// E_CRAWLER_003
const match = html.match(/window\.__APOLLO_STATE__\s*=\s*({.+?});/s);
if (!match) {
  throw new Error('E_CRAWLER_003: Apollo State 없음');
}

// E_CRAWLER_004
if (html.includes('서비스 이용이 제한되었습니다')) {
  logger.warn('⚠️  봇 탐지됨. 30초 대기 중...');
  throw new Error('E_CRAWLER_004: 봇 탐지됨');
}

// E_CRAWLER_008
try {
  const { chromium } = require('playwright');
} catch (error) {
  throw new Error('E_CRAWLER_008: Playwright 미설치 - npm install playwright');
}
```

---

## 🔧 공통 에러 코드

### CONFIG - 설정

| 코드 | 설명 | 심각도 | 복구 가능 |
|------|------|--------|----------|
| `E_CONFIG_001` | API 키 미설정 | High | ❌ 설정 필요 |
| `E_CONFIG_002` | local.config.yml 없음 | Medium | ✅ 기본값 사용 |
| `E_CONFIG_003` | 잘못된 설정 형식 | High | ❌ 수정 필요 |
| `E_CONFIG_004` | 프로젝트 경로 없음 | High | ❌ 설정 필요 |

### FILE - 파일 시스템

| 코드 | 설명 | 심각도 | 복구 가능 |
|------|------|--------|----------|
| `E_FILE_001` | 파일 읽기 실패 | High | ⚠️ 권한 확인 |
| `E_FILE_002` | 파일 쓰기 실패 | High | ⚠️ 권한 확인 |
| `E_FILE_003` | 디렉토리 생성 실패 | High | ⚠️ 권한 확인 |
| `E_FILE_004` | 파일 삭제 실패 | Medium | ✅ 수동 삭제 |

### NETWORK - 네트워크

| 코드 | 설명 | 심각도 | 복구 가능 |
|------|------|--------|----------|
| `E_NETWORK_001` | 네트워크 타임아웃 | Medium | ✅ 재시도 |
| `E_NETWORK_002` | 연결 거부 | High | ⚠️ 서버 확인 |
| `E_NETWORK_003` | DNS 오류 | High | ⚠️ 네트워크 확인 |

### DATA - 데이터 검증

| 코드 | 설명 | 심각도 | 복구 가능 |
|------|------|--------|----------|
| `E_DATA_001` | 필수 필드 누락 | High | ❌ 데이터 수정 |
| `E_DATA_002` | 잘못된 데이터 형식 | High | ❌ 데이터 수정 |
| `E_DATA_003` | 데이터 범위 초과 | Medium | ✅ 제한 적용 |
| `E_DATA_004` | 중복 데이터 | Low | ✅ 스킵 가능 |

---

## 🔄 에러 처리 패턴

### 패턴 1: 재시도 가능한 에러

```javascript
async function fetchWithRetry(url, maxRetries = 3) {
  const logger = require('./logger');

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fetch(url);
    } catch (error) {
      logger.warn(`⚠️  API 호출 실패 (${i + 1}/${maxRetries})`, {
        error: error.message
      });

      if (i === maxRetries - 1) {
        throw new Error(`E_NETWORK_001: 네트워크 타임아웃 (${maxRetries}회 재시도 실패)`);
      }

      // 지수 백오프
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
}
```

### 패턴 2: 대체 방법 사용

```javascript
async function getKeywordVolume(keyword) {
  const logger = require('./logger');

  try {
    // 네이버 API 시도
    return await naverAPI.searchVolume(keyword);
  } catch (error) {
    logger.warn('⚠️  네이버 API 실패. 더미 데이터 사용', {
      keyword,
      error: error.message
    });

    // 대체: 더미 데이터 반환
    return {
      keyword,
      volume: 0,
      source: 'dummy'
    };
  }
}
```

### 패턴 3: 부분 처리 계속

```javascript
async function processPlaces(placeIds) {
  const logger = require('./logger');
  const results = [];
  const errors = [];

  for (const placeId of placeIds) {
    try {
      const result = await processPlace(placeId);
      results.push(result);
    } catch (error) {
      logger.error(`❌ 플레이스 처리 실패: ${placeId}`, {
        error: error.message
      });
      errors.push({ placeId, error: error.message });

      // 계속 처리
      continue;
    }
  }

  logger.info(`✅ 처리 완료: ${results.length}/${placeIds.length}`);

  if (errors.length > 0) {
    logger.warn(`⚠️  실패: ${errors.length}개`, { errors });
  }

  return { results, errors };
}
```

### 패턴 4: 치명적 에러 전파

```javascript
async function runPipeline() {
  const logger = require('./logger');

  try {
    // L1 실행
    const l1Result = await runL1();

    // L2 실행
    const l2Result = await runL2(l1Result);

    // L3 실행
    const l3Result = await runL3(l2Result);

    return l3Result;

  } catch (error) {
    // 치명적 에러는 즉시 중단
    logger.error('❌ 파이프라인 실패', {
      error: error.message,
      stack: error.stack
    });

    // 에러 전파 (상위에서 처리)
    throw error;
  }
}
```

---

## 📊 에러 로깅 형식

### 표준 형식

```javascript
logger.error('❌ {작업명} 실패', {
  // 컨텍스트 정보
  placeId: '1768171911',
  keyword: '강남 맛집',

  // 에러 정보
  error: error.message,
  errorCode: 'E_L2_001',

  // 추가 정보 (선택)
  retryCount: 3,
  elapsed: '5.2s'
});
```

### 예시

```javascript
// L1 에러
logger.error('❌ 데이터 수집 실패', {
  placeId: '1768171911',
  file: 'place-1768171911-FULL.json',
  error: 'E_L1_002: JSON 파싱 실패',
  reason: 'Unexpected token at position 123'
});

// L2 에러
logger.error('❌ 키워드 분석 실패', {
  placeId: '1768171911',
  keyword: '강남 닭갈비',
  error: 'E_L2_001: 네이버 API 호출 실패',
  statusCode: 500,
  retryCount: 3
});

// Crawler 에러
logger.error('❌ 크롤링 실패', {
  placeId: '1768171911',
  url: 'https://m.place.naver.com/restaurant/1768171911',
  error: 'E_CRAWLER_004: 봇 탐지됨',
  action: '30초 대기 후 재시도'
});
```

---

## 🔍 에러 디버깅 가이드

### 에러 코드별 해결 방법

#### E_L1_001: 크롤러 JSON이 없습니다

**원인**:
- `data/input/places-advanced/` 폴더에 JSON 파일 없음

**해결**:
1. V1 크롤러로 재크롤링
```bash
node src/main.js l1 1768171911
```

2. 또는 기존 파일 복사
```bash
xcopy "..\Place_Crawler\V1\places-advanced\*.json" ".\data\input\places-advanced\" /Y
```

#### E_L2_001: 네이버 API 호출 실패

**원인**:
- API 키 미설정
- API 호출 제한 초과
- 네트워크 오류

**해결**:
1. API 키 확인
```javascript
console.log(process.env.NAVER_CLIENT_ID); // undefined면 미설정
```

2. 재시도 (지수 백오프)
```javascript
await retryWithBackoff(() => naverAPI.call(keyword), 3);
```

3. 더미 데이터 사용
```javascript
const dummyData = { volume: 0, source: 'dummy' };
```

#### E_CRAWLER_004: 봇 탐지됨

**원인**:
- 네이버 봇 탐지 시스템 작동

**해결**:
1. 자동 30초 대기 (코드에 구현됨)
2. `--headless=false` 옵션 사용
```bash
node src/main.js l1 1768171911 --headless=false
```

3. 크롤링 간격 증가
```bash
node src/main.js l1 --delay=10000
```

---

## 📚 참고 자료

- `rules/@ARCHITECTURE.md` - 시스템 아키텍처
- `rules/@CONVENTIONS.md` - 코딩 컨벤션
- `CLAUDE.md` - AI 작업 가이드

---

**버전**: 1.0.0
**업데이트**: 2025-10-28
**작성자**: AI (Claude)
