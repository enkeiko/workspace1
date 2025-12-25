# Place_Crawler

> **네이버 플레이스 크롤러 (V1)**

---

## 📌 프로젝트 개요

네이버 플레이스의 상세 정보를 Playwright 기반으로 크롤링하는 도구입니다.

**실제 코드 위치**: `../../Place_Crawler/`

---

## 🏗️ 아키텍처

### Apollo State 파싱 방식

```
[Playwright 브라우저]
    ↓
[네이버 플레이스 모바일 접속]
    ↓
[window.__APOLLO_STATE__ 추출]
    ↓
[JSON 파싱 및 구조화]
    ↓
[FULL.json 저장]
```

---

## 🛠️ 기술 스택

- **런타임**: Node.js
- **브라우저 자동화**: Playwright
- **브라우저**: Chromium
- **출력 형식**: JSON

---

## 🚀 실행 방법

### 설치

```bash
cd ../../Place_Crawler/V1
npm install playwright
npx playwright install chromium
```

### 단일 크롤링

```bash
cd ../../Place_Crawler/V1
node ultimate-scraper.js {placeId}

# 예시
node ultimate-scraper.js 1768171911
```

### 배치 크롤링

```bash
cd ../../Place_Crawler/V1
node batch-scraper.js
```

---

## 📂 파일 구조

```
Place_Crawler/
├── V1/
│   ├── ultimate-scraper.js   # 단일 크롤러
│   ├── batch-scraper.js      # 배치 크롤러
│   ├── places-advanced/      # 출력 JSON
│   │   └── place-{id}-FULL.json
│   └── logs/                 # 로그
│
└── Doc/                      # 문서
```

---

## 🔍 주요 기능

### 수집 데이터

#### 기본 정보
- ID, 이름, 카테고리
- 주소 (도로명, 지번)
- 전화번호, 가상전화번호
- 좌표 (위도, 경도)

#### 메뉴 정보
- 메뉴명, 가격, 이미지
- 대표 메뉴 표시
- 메뉴 설명

#### 리뷰 정보
- 방문자 리뷰 통계
- 블로그 리뷰 통계
- 리뷰 내용 (샘플)

#### 이미지
- 대표 이미지
- 메뉴 이미지
- 내부 사진

#### 기타
- 영업 시간
- 편의 시설
- 키워드 태그

---

## ⚙️ 설정

### 크롤링 옵션

```javascript
{
  headless: true,        // 헤드리스 모드
  delay: 5000,          // 크롤링 간격 (ms)
  timeout: 60000,       // 타임아웃 (ms)
  retryCount: 3         // 재시도 횟수
}
```

### 봇 탐지 대응

- **자동 대기**: 봇 탐지 시 30초 자동 대기
- **수동 모드**: `headless: false` 옵션으로 브라우저 표시

```bash
# 헤드리스 모드 끄기
node ultimate-scraper.js 1768171911 --headless=false
```

---

## 📊 출력 형식

### FULL.json 구조

```json
{
  "id": "1768171911",
  "name": "히도강남점",
  "category": "닭갈비",
  "address": "서울 강남구 ...",
  "roadAddress": "서울 강남구 ...",
  "phone": "02-1234-5678",
  "coordinate": {
    "lat": 37.1234,
    "lng": 127.5678
  },
  "menus": [
    {
      "name": "철판닭갈비",
      "price": "13000",
      "image": "https://...",
      "isRepresentative": true
    }
  ],
  "visitorReviews": {
    "total": 245,
    "rating": 4.5
  },
  "blogReviews": {
    "total": 89
  },
  "images": [...],
  "businessHours": [...],
  "facilities": [...]
}
```

---

## 🚨 에러 코드

| 코드 | 설명 | 복구 가능 |
|------|------|----------|
| `E_CRAWLER_001` | 브라우저 초기화 실패 | ✅ 재시도 |
| `E_CRAWLER_002` | 페이지 접속 실패 | ✅ 재시도 |
| `E_CRAWLER_003` | Apollo State 없음 | ⚠️ 봇 탐지 |
| `E_CRAWLER_004` | 봇 탐지됨 | ✅ 30초 대기 |
| `E_CRAWLER_005` | 플레이스 ID 없음 | ❌ 필수 입력 |
| `E_CRAWLER_006` | 타임아웃 | ✅ 재시도 |
| `E_CRAWLER_007` | JSON 저장 실패 | ❌ 치명적 |
| `E_CRAWLER_008` | Playwright 미설치 | ❌ 설치 필요 |

자세한 내용: `../../rules/@ERROR_CODES.md`

---

## ⚠️ 주의사항

### 크롤링 정책

- **최소 간격**: 5초 이상
- **권장 간격**: 10초
- **봇 탐지 시**: 30초 대기 후 재시도

### 법적 고려사항

- robots.txt 확인
- 이용약관 준수
- 과도한 요청 자제
- 개인정보 보호

---

## 🔗 연동 프로젝트

### Place_Keywords_maker

이 크롤러의 출력 JSON을 입력으로 사용합니다.

**연동 방법:**

```bash
# 1. 크롤링 실행
cd ../../Place_Crawler/V1
node ultimate-scraper.js 1768171911

# 2. JSON 복사 (수동)
cp places-advanced/place-1768171911-FULL.json \
   ../../Place_Keywords_maker/data/input/places-advanced/

# 3. L1 실행
cd ../../Place_Keywords_maker
node src/main.js l1
```

**또는 자동 통합:**

```bash
# Place_Keywords_maker에서 직접 크롤링
cd ../../Place_Keywords_maker
node src/main.js l1 1768171911
```

---

## 📈 성능 지표

### 처리 속도
- **단일 크롤링**: 약 3-8초/개
  - 네트워크: 1-2초
  - 페이지 로드: 2-3초
  - 파싱: 1초
  - 대기 시간: 5초 (권장)

- **배치 크롤링**: 약 8-10초/개
  - 크롤링: 3초
  - 대기: 5초
  - 저장: 1초

### 메모리 사용
- 기본: ~50MB
- 브라우저 실행 시: ~150MB
- 대량 크롤링 시: ~200MB

---

## 🐛 문제 해결

### E_CRAWLER_004: 봇 탐지됨

**증상**: "서비스 이용이 제한되었습니다"

**해결**:
1. 자동 30초 대기 (코드에 구현됨)
2. 헤드리스 모드 끄기:
```bash
node ultimate-scraper.js 1768171911 --headless=false
```
3. 크롤링 간격 증가:
```bash
node batch-scraper.js --delay=10000
```

### E_CRAWLER_008: Playwright 미설치

**증상**: `Cannot find module 'playwright'`

**해결**:
```bash
npm install playwright
npx playwright install chromium
```

### E_CRAWLER_003: Apollo State 없음

**원인**: 페이지 구조 변경 또는 접근 제한

**해결**:
1. URL 확인: `https://m.place.naver.com/restaurant/{placeId}/home`
2. 수동으로 브라우저에서 접속 테스트
3. HTML 구조 변경 여부 확인

---

## 📚 문서

### 프로젝트 문서
- **이 문서**: `projects/place-crawler/README.md`
- **크롤러 스펙**: `../../Place_Crawler/Doc/`

### 워크스페이스 문서
- **AI 가이드**: `../../CLAUDE.md`
- **아키텍처**: `../../rules/@ARCHITECTURE.md`
- **에러 코드**: `../../rules/@ERROR_CODES.md`

---

## 📝 개발 이력

| 날짜 | 버전 | 변경 사항 |
|------|------|----------|
| 2025-10-21 | V1.0 | Apollo State 파싱 크롤러 |
| 2025-10-23 | V1.1 | 봇 탐지 우회, 배치 크롤링 추가 |

---

## 🤝 기여

### 규칙 준수
- `../../rules/@CONVENTIONS.md` 따르기
- `../../rules/@ERROR_CODES.md` 참조
- 크롤링 정책 준수

### 새 기능 추가
1. `../../backlog/ideas/` 에 아이디어 작성
2. AI와 Q&A로 요구사항 명확화
3. 실제 구현

---

**버전**: V1.1
**실제 코드**: `../../Place_Crawler/`
**업데이트**: 2025-10-28
