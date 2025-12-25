# 네이버 플레이스 데이터 명세서

> **프로젝트**: Place Keywords Maker V2
> **작성일**: 2025-11-21
> **크롤러 버전**: V0.4
> **목적**: 네이버 플레이스에서 수집해야 할 전체 데이터 필드 정의

---

## 1. 데이터 구조 개요

```json
{
  "placeId": "string",
  "crawledAt": "string (ISO 8601)",

  "basic": { /* 기본 정보 */ },
  "menus": [ /* 메뉴 목록 */ ],
  "images": [ /* 이미지 목록 */ ],
  "facilities": [ /* 편의시설 */ ],
  "payments": [ /* 결제수단 */ ],

  "categoryCodeList": [ /* 카테고리 코드 */ ],
  "gdid": { /* Global Document ID */ },
  "votedKeywords": [ /* 사용자 투표 키워드 */ ],
  "visitCategories": [ /* 방문 목적 */ ],

  "visitorReviewStats": { /* 방문자 리뷰 통계 */ },
  "visitorReviewItems": [ /* 방문자 리뷰 상세 */ ],
  "blogReviews": [ /* 블로그 리뷰 */ ],
  "reviewThemes": [ /* 리뷰 테마 분석 */ ],
  "reviewMenus": [ /* 리뷰 메뉴 언급 */ ],

  "orderOptions": { /* 주문 옵션 */ },
  "operationTime": { /* 운영 시간 */ },

  "_version": "string",
  "_graphqlResponseCount": "number"
}
```

---

## 2. 전체 데이터 필드 명세

### 2.1 메타데이터

| 필드명 | 타입 | 상태 | 데이터 소스 | 우선순위 | 설명 |
|--------|------|------|-------------|----------|------|
| `placeId` | string | ✅ | 입력 파라미터 | **CRITICAL** | 네이버 플레이스 고유 ID |
| `crawledAt` | string | ✅ | 크롤링 시점 | **CRITICAL** | 수집 일시 (ISO 8601) |
| `_version` | string | ✅ | 코드 버전 | IMPORTANT | 크롤러 버전 (예: "0.4") |
| `_graphqlResponseCount` | number | ✅ | GraphQL 호출 | NICE-TO-HAVE | GraphQL API 호출 횟수 |

---

### 2.2 기본 정보 (`basic`)

| 필드명 | 타입 | 상태 | 데이터 소스 | 우선순위 | 설명 |
|--------|------|------|-------------|----------|------|
| `id` | string | ✅ | Apollo State | **CRITICAL** | 플레이스 ID |
| `name` | string | ✅ | Apollo State → DOM | **CRITICAL** | 업체명 (예: "태장식당 병점 직영점") |
| `category` | string | ✅ | Apollo State → DOM | **CRITICAL** | 카테고리 (예: "돼지고기구이") |
| `address.road` | string | ✅ | Apollo State | **CRITICAL** | 도로명 주소 |
| `address.jibun` | string | ✅ | Apollo State | IMPORTANT | 지번 주소 |
| `address.detail` | string | ⚠️ 빈값 | Apollo State | NICE-TO-HAVE | 상세 주소 (층수, 호수) |
| `phone` | string | ⚠️ 빈값 | Apollo State | **CRITICAL** | 전화번호 |
| `description` | string | ⚠️ 빈값 | Apollo State | IMPORTANT | 소개문 |
| `openingHours` | string | ⚠️ 빈값 | Apollo State | IMPORTANT | 영업시간 |
| `homepage` | string | ⚠️ 빈값 | Apollo State | NICE-TO-HAVE | 홈페이지 URL |

**현재 수집 예시**:
```json
{
  "id": "1575722042",
  "name": "태장식당 병점 직영점",
  "category": "돼지고기구이",
  "address": {
    "road": "경기 화성시 효행로 1032 1층",
    "jibun": "경기 화성시 진안동 877-2",
    "detail": ""
  },
  "phone": "",
  "description": "",
  "openingHours": "",
  "homepage": ""
}
```

---

### 2.3 메뉴 정보 (`menus[]`)

| 필드명 | 타입 | 상태 | 데이터 소스 | 우선순위 | 설명 |
|--------|------|------|-------------|----------|------|
| `name` | string | ✅ | Apollo State (Menu:) | **CRITICAL** | 메뉴명 |
| `price` | string | ✅ | Apollo State | **CRITICAL** | 가격 (숫자 문자열, 예: "11000") |
| `description` | string | ✅ | Apollo State | IMPORTANT | 메뉴 설명 |
| `images[]` | string[] | ✅ | Apollo State | IMPORTANT | 메뉴 이미지 URL 배열 |
| `recommend` | boolean | ✅ | Apollo State | NICE-TO-HAVE | 추천 메뉴 여부 |

**현재 수집 상태**: ✅ 정상 (10개 수집)

**수집 예시**:
```json
{
  "name": "냉삼(180g)",
  "price": "11000",
  "description": "⭐️태장식당의 간판⭐️ 프리미엄 선별육 냉동 삼겹살",
  "images": ["https://ldb-phinf.pstatic.net/..."],
  "recommend": true
}
```

---

### 2.4 이미지 데이터 (`images[]`)

| 필드명 | 타입 | 상태 | 데이터 소스 | 우선순위 | 설명 |
|--------|------|------|-------------|----------|------|
| `id` | string | ❌ | Apollo State (Image:/Photo:) | IMPORTANT | 이미지 ID |
| `url` | string | ❌ | Apollo State | **CRITICAL** | 이미지 URL (원본) |
| `thumbnail` | string | ❌ | Apollo State | NICE-TO-HAVE | 썸네일 URL |
| `category` | string | ❌ | 자동 분류 | IMPORTANT | 카테고리 (menu/interior/food/exterior/etc) |
| `description` | string | ❌ | Apollo State | NICE-TO-HAVE | 이미지 설명 |

**현재 상태**: ❌ **빈 배열** (미수집)

---

### 2.5 편의시설 및 결제수단

#### 2.5.1 편의시설 (`facilities[]`)

| 필드명 | 타입 | 상태 | 데이터 소스 | 우선순위 | 설명 |
|--------|------|------|-------------|----------|------|
| `name` | string | ✅ | Apollo State | IMPORTANT | 편의시설명 (예: "주차", "WiFi") |
| `available` | boolean | ✅ | Apollo State | IMPORTANT | 이용 가능 여부 |

**현재 상태**: ✅ **정상 수집** (6개)

**수집 예시**:
```json
[
  { "name": "단체 이용 가능", "available": true },
  { "name": "무선 인터넷", "available": true },
  { "name": "주차", "available": true }
]
```

#### 2.5.2 결제수단 (`payments[]`)

| 타입 | 상태 | 데이터 소스 | 우선순위 | 설명 |
|------|------|-------------|----------|------|
| string[] | ✅ | Apollo State | IMPORTANT | 결제수단 목록 |

**현재 상태**: ✅ **정상 수집** (3개)

**수집 예시**:
```json
["지역화폐 (카드형)", "지역화폐 (모바일형)", "소비쿠폰(신용·체크카드)"]
```

---

### 2.6 카테고리 및 분류 데이터

#### 2.6.1 카테고리 코드 (`categoryCodeList[]`)

| 타입 | 상태 | 데이터 소스 | 우선순위 | 설명 |
|------|------|-------------|----------|------|
| string[] | ✅ | Apollo State (PlaceDetailBase) | IMPORTANT | 업종 분류 코드 |

**현재 상태**: ✅ **정상 수집** (7개)

**수집 예시**:
```json
["220036", "220037", "220075", "220765", "221458", "1004760", "1006737"]
```

#### 2.6.2 GDID (`gdid`)

| 필드명 | 타입 | 상태 | 데이터 소스 | 우선순위 | 설명 |
|--------|------|------|-------------|----------|------|
| `raw` | string | ❌ null | Apollo State | IMPORTANT | 원본 GDID (예: "N1:1575722042") |
| `type` | string | ❌ null | 파싱 | IMPORTANT | GDID 타입 (N1/N2/N3) |
| `placeId` | string | ❌ null | 파싱 | IMPORTANT | 추출된 Place ID |
| `isValid` | boolean | ❌ false | 검증 | IMPORTANT | GDID 유효성 여부 |

**현재 상태**: ❌ **미수집**

#### 2.6.3 투표 키워드 (`votedKeywords[]`)

| 필드명 | 타입 | 상태 | 데이터 소스 | 우선순위 | 설명 |
|--------|------|------|-------------|----------|------|
| `name` | string | ❌ | Apollo State / GraphQL API | IMPORTANT | 키워드명 (예: "맛있어요") |
| `count` | number | ❌ | Apollo State / GraphQL API | IMPORTANT | 투표 수 |
| `iconUrl` | string | ❌ | Apollo State / GraphQL API | NICE-TO-HAVE | 키워드 아이콘 URL |
| `code` | string | ❌ | Apollo State / GraphQL API | NICE-TO-HAVE | 키워드 코드 |

**현재 상태**: ❌ **빈 배열** (미수집)

#### 2.6.4 방문 목적 (`visitCategories[]`)

| 필드명 | 타입 | 상태 | 데이터 소스 | 우선순위 | 설명 |
|--------|------|------|-------------|----------|------|
| `name` | string | ❌ | Apollo State | NICE-TO-HAVE | 방문 목적 (예: "데이트", "회식") |
| `count` | number | ❌ | Apollo State | NICE-TO-HAVE | 언급 수 |

**현재 상태**: ❌ **빈 배열** (미수집)

---

### 2.7 리뷰 데이터

#### 2.7.1 방문자 리뷰 통계 (`visitorReviewStats`)

| 필드명 | 타입 | 상태 | 데이터 소스 | 우선순위 | 설명 |
|--------|------|------|-------------|----------|------|
| `total` | number | ❌ 0 | VisitorReviewStatsResult | **CRITICAL** | 전체 방문자 리뷰 수 |
| `withPhoto` | number | ❌ 0 | Apollo State | IMPORTANT | 사진 포함 리뷰 수 |
| `withContent` | number | ❌ 0 | Apollo State | IMPORTANT | 텍스트 포함 리뷰 수 |
| `averageScore` | number | ❌ 0 | Apollo State | **CRITICAL** | 평균 평점 (0~5) |
| `imageReviewCount` | number | ❌ 0 | Apollo State | IMPORTANT | 이미지 리뷰 수 |

**현재 상태**: ❌ **모든 값이 0** (미수집)

#### 2.7.2 방문자 리뷰 상세 (`visitorReviewItems[]`)

| 필드명 | 타입 | 상태 | 데이터 소스 | 우선순위 | 설명 |
|--------|------|------|-------------|----------|------|
| `id` | string | ❌ | Apollo State (VisitorReviews) | IMPORTANT | 리뷰 ID |
| `body` | string | ❌ | Apollo State | **CRITICAL** | 리뷰 본문 |
| `author.nickname` | string | ❌ | Apollo State | IMPORTANT | 작성자 닉네임 |
| `author.imageUrl` | string | ❌ | Apollo State | NICE-TO-HAVE | 프로필 이미지 URL |
| `visitCount` | number | ❌ | Apollo State | IMPORTANT | 방문 횟수 |
| `visited` | string | ❌ | Apollo State | IMPORTANT | 방문 일자 |
| `created` | string | ❌ | Apollo State | IMPORTANT | 작성 일자 |
| `mediaCount` | number | ❌ | Apollo State | IMPORTANT | 첨부 미디어 수 |
| `hasReply` | boolean | ❌ | Apollo State | NICE-TO-HAVE | 사장님 답글 여부 |

**현재 상태**: ❌ **빈 배열** (미수집)

#### 2.7.3 블로그 리뷰 (`blogReviews[]`)

| 필드명 | 타입 | 상태 | 데이터 소스 | 우선순위 | 설명 |
|--------|------|------|-------------|----------|------|
| `id` | string | ❌ | Apollo State (BlogReview:) | IMPORTANT | 리뷰 ID |
| `title` | string | ❌ | Apollo State | IMPORTANT | 블로그 제목 |
| `content` | string | ❌ | Apollo State | **CRITICAL** | 리뷰 본문 (1500자 이상 권장) |
| `author` | string | ❌ | Apollo State | IMPORTANT | 블로거명 |
| `date` | string | ❌ | Apollo State | IMPORTANT | 작성일 |
| `url` | string | ❌ | Apollo State | IMPORTANT | 블로그 URL |
| `hashtags[]` | string[] | ❌ | 본문 파싱 | NICE-TO-HAVE | 해시태그 배열 |

**현재 상태**: ❌ **빈 배열** (미수집)

#### 2.7.4 리뷰 테마 분석 (`reviewThemes[]`)

| 필드명 | 타입 | 상태 | 데이터 소스 | 우선순위 | 설명 |
|--------|------|------|-------------|----------|------|
| `code` | string | ✅ | VisitorReviewStatsResult.analysis.themes | IMPORTANT | 테마 코드 (예: "taste", "service") |
| `label` | string | ✅ | Apollo State | IMPORTANT | 테마명 (예: "맛", "서비스") |
| `count` | number | ✅ | Apollo State | IMPORTANT | 언급 횟수 |

**현재 상태**: ✅ **정상 수집** (14개)

**수집 예시**:
```json
[
  { "code": "taste", "label": "맛", "count": 625 },
  { "code": "total", "label": "만족도", "count": 464 },
  { "code": "service", "label": "서비스", "count": 280 }
]
```

#### 2.7.5 리뷰 메뉴 분석 (`reviewMenus[]`)

| 필드명 | 타입 | 상태 | 데이터 소스 | 우선순위 | 설명 |
|--------|------|------|-------------|----------|------|
| `label` | string | ✅ | VisitorReviewStatsResult.analysis.menus | IMPORTANT | 메뉴명 (예: "고기", "볶음밥") |
| `count` | number | ✅ | Apollo State | IMPORTANT | 리뷰에서 언급된 횟수 |

**현재 상태**: ✅ **정상 수집** (40개)

**수집 예시**:
```json
[
  { "label": "고기", "count": 219 },
  { "label": "볶음밥", "count": 59 },
  { "label": "계란찜", "count": 29 }
]
```

---

### 2.8 주문 옵션 (`orderOptions`)

| 필드명 | 타입 | 상태 | 데이터 소스 | 우선순위 | 설명 |
|--------|------|------|-------------|----------|------|
| `isTableOrder` | boolean | ✅ false | Apollo State | NICE-TO-HAVE | 테이블 주문 가능 여부 |
| `pickup` | boolean | ✅ false | Apollo State | IMPORTANT | 포장 가능 여부 |
| `delivery` | boolean | ✅ false | Apollo State | IMPORTANT | 배달 가능 여부 |
| `bookingBusinessId` | string/null | ✅ null | Apollo State | NICE-TO-HAVE | 예약 비즈니스 ID |
| `options[]` | array | ✅ [] | Apollo State | NICE-TO-HAVE | 주문 옵션 목록 |

**현재 상태**: ✅ **구조만 준비됨** (모두 false/null)

---

### 2.9 운영 시간 (`operationTime`)

| 필드명 | 타입 | 상태 | 데이터 소스 | 우선순위 | 설명 |
|--------|------|------|-------------|----------|------|
| `breakTime[]` | array | ✅ [] | Apollo State (businessHoursInfo) | NICE-TO-HAVE | 브레이크타임 [{start, end}] |
| `lastOrder` | string/null | ✅ null | Apollo State | NICE-TO-HAVE | 라스트오더 시간 |
| `holiday` | string/null | ✅ null | Apollo State | IMPORTANT | 휴무일 정보 |

**현재 상태**: ✅ **구조만 준비됨** (모두 빈 배열/null)

---

## 3. 데이터 소스별 분류

### 3.1 Apollo State (window.__APOLLO_STATE__)

**접근 방법**: 모바일 페이지 (`https://m.place.naver.com/restaurant/{placeId}/home`)

**주요 엔티티 키 패턴**:
```javascript
{
  "PlaceDetailBase:{placeId}": { /* 기본 정보 */ },
  "Menu:{placeId}_{menuId}": { /* 메뉴 */ },
  "VisitorReviewStatsResult:{placeId}": { /* 리뷰 통계 */ },
  "Image:{imageId}": { /* 이미지 */ },
  "Photo:{photoId}": { /* 사진 */ },
  "BlogReview:{reviewId}": { /* 블로그 리뷰 */ },
  "ROOT_QUERY": { /* GraphQL 쿼리 결과 */ }
}
```

**수집 가능 데이터**:

| 카테고리 | 수집 상태 | 비고 |
|----------|-----------|------|
| ✅ 기본 정보 | 부분 수집 | phone, description, openingHours 빈값 |
| ✅ 메뉴 | 정상 | 10개 수집 |
| ✅ 편의시설 | 정상 | 6개 수집 |
| ✅ 결제수단 | 정상 | 3개 수집 |
| ✅ 카테고리 코드 | 정상 | 7개 수집 |
| ✅ 리뷰 테마 | 정상 | 14개 수집 |
| ✅ 리뷰 메뉴 | 정상 | 40개 수집 |
| ❌ 이미지 | 미수집 | Image:/Photo: 키 파싱 필요 |
| ❌ 블로그 리뷰 | 미수집 | BlogReview: 키 파싱 필요 |
| ❌ 방문자 리뷰 상세 | 미수집 | VisitorReviews 파싱 필요 |
| ❌ GDID | 미수집 | PlaceDetailBase.gdid 필드 확인 필요 |
| ❌ 투표 키워드 | 미수집 | votedVisitorKeywords 파싱 필요 |

### 3.2 GraphQL API (보조 수집)

**엔드포인트**: `https://pcmap-api.place.naver.com/graphql`

**수집 대상**:
- `votedKeywords` (사용자 투표 키워드) - Apollo State에서 수집 실패 시 대체
- 상세 리뷰 통계

**현재 상태**: ❌ **작동 안 함** (`_graphqlResponseCount: 0`)

### 3.3 DOM Scraping (백업)

**사용 시나리오**: Apollo State에서 데이터를 찾지 못한 경우 백업

**수집 가능 필드**:
- `name` (페이지 제목)
- `category`
- `address`
- `phone`
- `openingHours`

**현재 상태**: ⚠️ **백업 로직으로만 작동**

---

## 4. 현재 문제점 요약

### 4.1 치명적 문제 (CRITICAL)

| 문제 | 영향 | 우선순위 |
|------|------|----------|
| ❌ 방문자 리뷰 통계 모두 0 | SEO 분석 불가 | 1순위 |
| ❌ 이미지 미수집 | 시각 콘텐츠 분석 불가 | 1순위 |
| ❌ 블로그 리뷰 미수집 | 감성 키워드 추출 불가 | 1순위 |
| ❌ 방문자 리뷰 상세 미수집 | 리뷰 내용 분석 불가 | 1순위 |

### 4.2 중요 문제 (IMPORTANT)

| 문제 | 영향 | 우선순위 |
|------|------|----------|
| ⚠️ 전화번호 빈값 | NAP 정보 불완전 | 2순위 |
| ⚠️ 소개문 빈값 | 콘텐츠 전략 불가 | 2순위 |
| ⚠️ 영업시간 빈값 | 기본 정보 부족 | 2순위 |
| ❌ GDID 미수집 | 랭킹 분석 불가 | 2순위 |
| ❌ 투표 키워드 미수집 | SEO 키워드 부족 | 2순위 |

### 4.3 부차적 문제 (NICE-TO-HAVE)

| 문제 | 영향 | 우선순위 |
|------|------|----------|
| ⚠️ 홈페이지 빈값 | 외부 링크 부족 | 3순위 |
| ⚠️ 상세 주소 빈값 | 주소 정밀도 부족 | 3순위 |

---

## 5. 데이터 수집 체크리스트

### ✅ 정상 수집 중
- [x] placeId, crawledAt, _version
- [x] basic.id, name, category, address (도로명/지번)
- [x] menus (10개, 가격/설명/이미지/추천 여부 포함)
- [x] facilities (6개)
- [x] payments (3개)
- [x] categoryCodeList (7개)
- [x] reviewThemes (14개)
- [x] reviewMenus (40개)
- [x] orderOptions, operationTime (구조만)

### ⚠️ 부분 수집 (빈 문자열/배열)
- [ ] basic.phone
- [ ] basic.description
- [ ] basic.openingHours
- [ ] basic.homepage

### ❌ 미수집 (최우선 구현 필요)
- [ ] visitorReviewStats (total, averageScore, imageReviewCount 등)
- [ ] visitorReviewItems[]
- [ ] blogReviews[]
- [ ] images[]
- [ ] gdid
- [ ] votedKeywords[]
- [ ] visitCategories[]

---

## 6. 참고 자료

### 관련 문서
- [README.md](../README.md) - 프로젝트 개요
- [L1_CRAWLING_ENHANCEMENT_GUIDE.md](./L1_CRAWLING_ENHANCEMENT_GUIDE.md) - L1 크롤링 가이드
- [DATA_COLLECTION_STORAGE_GUIDE.md](./DATA_COLLECTION_STORAGE_GUIDE.md) - 데이터 수집/저장 가이드
- [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) - 구현 로드맵

### 주요 파일
- [PlaceCrawlerV04.js](../src/modules/crawler/PlaceCrawlerV04.js) - 메인 크롤러
- [v04-test-1575722042.json](../data/output/v04-test-1575722042.json) - 출력 예시

---

## 부록: 전체 JSON 스키마 예시

```json
{
  "placeId": "1575722042",
  "crawledAt": "2025-11-20T06:34:40.204Z",

  "basic": {
    "id": "1575722042",
    "name": "태장식당 병점 직영점",
    "category": "돼지고기구이",
    "address": {
      "road": "경기 화성시 효행로 1032 1층",
      "jibun": "경기 화성시 진안동 877-2",
      "detail": ""
    },
    "phone": "031-234-5678",
    "description": "소개문...",
    "openingHours": "매일 11:00 - 22:00",
    "homepage": "https://..."
  },

  "menus": [
    {
      "name": "냉삼(180g)",
      "price": "11000",
      "description": "프리미엄 선별육 냉동 삼겹살",
      "images": ["https://..."],
      "recommend": true
    }
  ],

  "images": [
    {
      "id": "img_001",
      "url": "https://...",
      "thumbnail": "https://...",
      "category": "menu",
      "description": "냉삼"
    }
  ],

  "facilities": [
    { "name": "주차", "available": true },
    { "name": "WiFi", "available": true }
  ],

  "payments": ["카드", "현금", "지역화폐"],

  "categoryCodeList": ["220036", "220037"],

  "gdid": {
    "raw": "N1:1575722042",
    "type": "N1",
    "placeId": "1575722042",
    "isValid": true
  },

  "votedKeywords": [
    { "name": "맛있어요", "count": 150, "iconUrl": "https://...", "code": "keyword_001" }
  ],

  "visitCategories": [
    { "name": "가족 모임", "count": 50 }
  ],

  "visitorReviewStats": {
    "total": 567,
    "withPhoto": 300,
    "withContent": 400,
    "averageScore": 4.5,
    "imageReviewCount": 300
  },

  "visitorReviewItems": [
    {
      "id": "vr_001",
      "body": "정말 맛있어요!",
      "author": {
        "nickname": "사용자123",
        "imageUrl": "https://..."
      },
      "visitCount": 5,
      "visited": "2025-01-10",
      "created": "2025-01-11",
      "mediaCount": 3,
      "hasReply": true
    }
  ],

  "blogReviews": [
    {
      "id": "blog_001",
      "title": "태장식당 후기",
      "content": "1500자 이상의 리뷰...",
      "author": "블로거명",
      "date": "2025-01-10",
      "url": "https://blog.naver.com/...",
      "hashtags": ["#맛집", "#데이트"]
    }
  ],

  "reviewThemes": [
    { "code": "taste", "label": "맛", "count": 625 },
    { "code": "service", "label": "서비스", "count": 280 }
  ],

  "reviewMenus": [
    { "label": "고기", "count": 219 },
    { "label": "볶음밥", "count": 59 }
  ],

  "orderOptions": {
    "isTableOrder": false,
    "pickup": true,
    "delivery": false,
    "bookingBusinessId": null,
    "options": ["포장"]
  },

  "operationTime": {
    "breakTime": [
      { "start": "15:00", "end": "17:00" }
    ],
    "lastOrder": "21:30",
    "holiday": "월요일"
  },

  "_version": "0.4",
  "_graphqlResponseCount": 0
}
```
