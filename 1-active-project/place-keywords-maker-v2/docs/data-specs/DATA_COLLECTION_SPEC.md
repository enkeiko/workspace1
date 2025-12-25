# 네이버 플레이스 크롤러 v0.4 - 데이터 수집 항목 명세서

> **최종 업데이트**: 2025-11-28
> **버전**: 0.4
> **구현 파일**: `src/modules/crawler/PlaceCrawlerV04.js`

## 📋 목차

1. [기본 정보](#1-기본-정보-basic)
2. [메뉴](#2-메뉴-menus)
3. [리뷰 데이터](#3-리뷰-데이터-reviews)
4. [방문자 리뷰](#4-방문자-리뷰-visitorreviewitems)
5. [이미지](#5-이미지-images)
6. [편의시설 및 결제](#6-편의시설-및-결제)
7. [카테고리 및 랭킹](#7-카테고리-및-랭킹)
8. [영업 정보](#8-영업-정보)
9. [추가 정보](#9-추가-정보-2025-11-27-신규)
10. [AI 브리핑](#10-ai-브리핑-2025-11-27-신규)
11. [외부 플랫폼 연동](#11-외부-플랫폼-연동-2025-11-27-신규)
12. [경쟁업체 정보](#12-경쟁업체-정보-2025-11-28-신규)
13. [메타 정보](#13-메타-정보)

---

## 1. 기본 정보 (basic)

플레이스의 핵심 정보를 수집합니다.

```json
{
  "basic": {
    "id": "1716926393",
    "name": "라이브볼",
    "category": "다이어트,샐러드",
    "address": {
      "road": "서울 강남구 테헤란로 147 지하 1층 3호 라이브볼",
      "jibun": "서울 강남구 역삼동 642-16",
      "detail": ""
    },
    "phone": "0507-1384-0621",
    "description": "",
    "openingHours": "",
    "homepage": "",
    "tags": [],
    "url": "https://m.place.naver.com/restaurant/1716926393/home"
  }
}
```

### 필드 설명

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `id` | String | 플레이스 고유 ID | "1716926393" |
| `name` | String | 업체명 | "라이브볼" |
| `category` | String | 카테고리 (쉼표 구분) | "다이어트,샐러드" |
| `address.road` | String | 도로명 주소 | "서울 강남구 테헤란로 147..." |
| `address.jibun` | String | 지번 주소 | "서울 강남구 역삼동 642-16" |
| `address.detail` | String | 상세 주소 | "" |
| `phone` | String | 전화번호 | "0507-1384-0621" |
| `description` | String | 업체 설명 | "" |
| `openingHours` | String | 영업시간 | "매일 10:00 - 20:00" |
| `homepage` | String | 홈페이지 URL | "" |
| `tags` | Array | 태그 목록 | [] |
| `url` | String | 플레이스 페이지 URL | "https://m.place.naver.com/..." |

---

## 2. 메뉴 (menus)

플레이스의 메뉴 정보를 수집합니다.

```json
{
  "menus": [
    {
      "name": "멕시칸쉬림프포케",
      "price": "14900",
      "description": "멕시칸부리또볼을 포케와 조화해 라이브볼만의 멕시칸포케입니다.",
      "images": [],
      "recommend": false
    }
  ]
}
```

### 필드 설명

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `name` | String | 메뉴명 | "멕시칸쉬림프포케" |
| `price` | String | 가격 (원 단위) | "14900" |
| `description` | String | 메뉴 설명 | "멕시칸부리또볼을 포케와..." |
| `images` | Array | 메뉴 이미지 URL 배열 | [] |
| `recommend` | Boolean | 추천 메뉴 여부 | false |

---

## 3. 리뷰 데이터 (reviews)

리뷰 통계 및 블로그 리뷰를 수집합니다.

```json
{
  "reviews": {
    "stats": {
      "total": 0,
      "visitor": 0,
      "blog": 0,
      "average": 0
    },
    "blogReviews": [
      {
        "title": "역삼역 맛집 라이브볼 역삼점 다이어트 샐러드 추천",
        "content": "",
        "author": "",
        "date": "2025.04.23.",
        "url": "https://m.blog.naver.com/context/223844007683",
        "wordCount": 0
      }
    ],
    "summary": {
      "keywords": [],
      "positive": [],
      "negative": []
    }
  }
}
```

### 필드 설명

#### stats (리뷰 통계)
| 필드 | 타입 | 설명 |
|------|------|------|
| `total` | Number | 전체 리뷰 수 |
| `visitor` | Number | 방문자 리뷰 수 |
| `blog` | Number | 블로그 리뷰 수 |
| `average` | Number | 평균 평점 |

#### blogReviews (블로그 리뷰 목록)
| 필드 | 타입 | 설명 |
|------|------|------|
| `title` | String | 리뷰 제목 |
| `content` | String | 리뷰 본문 |
| `author` | String | 작성자 |
| `date` | String | 작성일 |
| `url` | String | 리뷰 URL |
| `wordCount` | Number | 단어 수 |

---

## 4. 방문자 리뷰 (visitorReviewItems)

방문자가 작성한 상세 리뷰 데이터를 수집합니다.

```json
{
  "visitorReviewItems": [
    {
      "id": "6923d2411dbbd3991c330252",
      "body": "5일중ㅇ 4일은 여기 와서 점심 먹어요.\n샐러드 웜볼. 포케. 파스타...",
      "author": {
        "nickname": "kna****",
        "imageUrl": ""
      },
      "visitCount": 1,
      "viewCount": 66,
      "visited": "11.24.월",
      "created": "11.24.월",
      "mediaCount": 1,
      "thumbnail": "https://pup-review-phinf.pstatic.net/...",
      "hasReply": true,
      "originType": "영수증",
      "votedKeywords": [
        {
          "code": "food_good",
          "name": "음식이 맛있어요",
          "iconUrl": "https://ssl.pstatic.net/static/pup/emoji/..."
        }
      ],
      "visitCategories": [
        {
          "code": "v_no_reservation",
          "name": "",
          "keywords": ["예약 없이 이용"]
        }
      ]
    }
  ]
}
```

### 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | String | 리뷰 고유 ID |
| `body` | String | 리뷰 본문 |
| `author.nickname` | String | 작성자 닉네임 |
| `author.imageUrl` | String | 작성자 프로필 이미지 |
| `visitCount` | Number | 방문 횟수 |
| `viewCount` | Number | 조회수 |
| `visited` | String | 방문일 |
| `created` | String | 작성일 |
| `mediaCount` | Number | 첨부 미디어 수 |
| `thumbnail` | String | 썸네일 이미지 URL |
| `hasReply` | Boolean | 사장님 댓글 여부 |
| `originType` | String | 인증 타입 (영수증, 방문인증 등) |
| `votedKeywords` | Array | 투표된 키워드 목록 |
| `visitCategories` | Array | 방문 카테고리 |

---

## 5. 이미지 (images)

플레이스 관련 이미지를 수집합니다.

```json
{
  "images": [
    {
      "url": "https://ldb-phinf.pstatic.net/...",
      "type": "interior",
      "uploadedBy": "owner"
    }
  ]
}
```

### 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| `url` | String | 이미지 URL |
| `type` | String | 이미지 타입 (menu, interior, exterior 등) |
| `uploadedBy` | String | 업로드자 (owner, visitor) |

---

## 6. 편의시설 및 결제

### facilities (편의시설)

```json
{
  "facilities": [
    {
      "name": "포장",
      "available": true
    },
    {
      "name": "배달",
      "available": true
    },
    {
      "name": "주차",
      "available": true
    }
  ]
}
```

### payments (결제수단)

```json
{
  "payments": [
    "소비쿠폰(신용·체크카드)",
    "제로페이",
    "간편결제"
  ]
}
```

---

## 7. 카테고리 및 랭킹

### categories (카테고리 - 코드 + 명칭)

**2025-11-27 신규**: 카테고리 코드와 함께 명칭도 수집합니다.

```json
{
  "categories": [
    {
      "code": "220036",
      "name": "다이어트"
    },
    {
      "code": "220047",
      "name": "샐러드"
    }
  ]
}
```

### ranking (랭킹 정보)

```json
{
  "ranking": {
    "categoryCodeList": ["220036", "220047", "220170"],
    "gdid": {
      "raw": null,
      "type": null,
      "placeId": null,
      "isValid": false
    },
    "votedKeywords": [],
    "visitCategories": []
  }
}
```

### reviewThemes (리뷰 테마)

```json
{
  "reviewThemes": [
    {
      "code": "taste",
      "label": "맛",
      "count": 61
    },
    {
      "code": "total",
      "label": "만족도",
      "count": 40
    }
  ]
}
```

### reviewMenus (리뷰에서 언급된 메뉴)

```json
{
  "reviewMenus": [
    {
      "label": "샐러드",
      "count": 18
    },
    {
      "label": "연어",
      "count": 5
    }
  ]
}
```

---

## 8. 영업 정보

### orderOptions (주문 옵션)

```json
{
  "orderOptions": {
    "isTableOrder": false,
    "pickup": false,
    "delivery": false,
    "bookingBusinessId": null,
    "options": []
  }
}
```

### operationTime (운영 시간)

```json
{
  "operationTime": {
    "breakTime": [],
    "lastOrder": null,
    "holiday": null
  }
}
```

---

## 9. 추가 정보 (2025-11-27 신규)

플레이스 페이지에서 추가로 수집 가능한 정보입니다.

### directions (찾아오시는 길)

```json
{
  "directions": {
    "parking": "",
    "publicTransit": "",
    "walking": "",
    "car": "",
    "additionalInfo": ""
  }
}
```

### notices (소식/공지)

```json
{
  "notices": []
}
```

### detailedIntro (상세 소개글)

```json
{
  "detailedIntro": ""
}
```

### placeNotices (플레이스 공지사항)

```json
{
  "placeNotices": []
}
```

---

## 10. AI 브리핑 (2025-11-27 신규)

네이버 플레이스의 AI가 생성한 브리핑 정보를 수집합니다.

```json
{
  "aiBriefing": {
    "summary": "라이브볼은 포케와 샐러드볼, 웜볼 등 건강한 메뉴를 다양하게 제공하는 곳입니다.",
    "disclaimer": "실질 단계로 정확하지 않을 수 있어요",
    "recommendations": [
      {
        "number": "1",
        "text": "라이브볼은 포케와 샐러드볼, 웜볼 등 건강한 메뉴를 다양하게 제공하는 곳입니다.",
        "author": "",
        "date": ""
      },
      {
        "number": "2",
        "text": "멕시칸 쉬림프 포케부터 수비드 비프스테이크 라이스볼까지 취향에 따라 선택할 수 있으며...",
        "author": "",
        "date": ""
      },
      {
        "number": "3",
        "text": "깔끔한 매장과 친절한 직원들 덕분에 기분 좋은 식사를 즐길 수 있습니다.",
        "author": "",
        "date": ""
      }
    ],
    "externalLinks": [
      {
        "type": "diningcode",
        "url": "https://diningcode.com/profile.php?rid=kyGW8k1TTTs9",
        "text": "다이닝코드에서 보기"
      }
    ]
  }
}
```

### 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| `summary` | String | AI 브리핑 전체 요약 |
| `disclaimer` | String | 면책 문구 |
| `recommendations[]` | Array | AI가 추천하는 주요 특징 목록 |
| `recommendations[].number` | String | 추천 항목 번호 |
| `recommendations[].text` | String | 추천 내용 |
| `recommendations[].author` | String | 출처 리뷰 작성자 |
| `recommendations[].date` | String | 출처 리뷰 날짜 |
| `externalLinks[]` | Array | 관련 외부 링크 목록 |
| `externalLinks[].type` | String | 링크 타입 (diningcode, mangoplate 등) |
| `externalLinks[].url` | String | 외부 링크 URL |
| `externalLinks[].text` | String | 링크 텍스트 |

---

## 11. 외부 플랫폼 연동 (2025-11-27 신규)

네이버 플레이스의 "관련링크"를 통해 연결된 외부 플랫폼의 데이터를 수집합니다.

### 지원 플랫폼

- ✅ **다이닝코드** (Diningcode)
- 🔄 **망고플레이트** (Mangoplate) - 준비 중
- 🔄 **캐치테이블** (Catchtable) - 준비 중

### externalData (외부 플랫폼 데이터)

#### 다이닝코드 (diningcode)

```json
{
  "externalData": {
    "diningcode": {
      "name": "라이브볼",
      "rating": 64,
      "reviewCount": 0,
      "priceRange": "14,900원",
      "tags": [
        "다이어트식단, 혼밥",
        "1위샐러드",
        "2위샐러드파스타",
        "3위스프"
      ],
      "operatingHours": "영업시간: 10:00 - 20:00",
      "summary": "DININGCODE 스킵네비게이션"
    }
  }
}
```

### 필드 설명

| 필드 | 타입 | 설명 | 예시 |
|------|------|------|------|
| `name` | String | 업체명 | "라이브볼" |
| `rating` | Number | 평점 (100점 만점) | 64 |
| `reviewCount` | Number | 리뷰 수 | 0 |
| `priceRange` | String | 가격대 | "14,900원" |
| `tags` | Array | 태그 목록 | ["다이어트식단, 혼밥"] |
| `operatingHours` | String | 영업시간 | "영업시간: 10:00 - 20:00" |
| `summary` | String | 요약 정보 | "" |

### 크로스 플랫폼 비교 가능 데이터

네이버 플레이스와 외부 플랫폼 간 비교 가능한 항목:

| 항목 | 네이버 플레이스 | 다이닝코드 |
|------|----------------|-----------|
| 업체명 | `basic.name` | `externalData.diningcode.name` |
| 평점 | `reviews.stats.average` | `externalData.diningcode.rating` |
| 리뷰 수 | `reviews.stats.total` | `externalData.diningcode.reviewCount` |
| 가격대 | `menus[].price` | `externalData.diningcode.priceRange` |
| 영업시간 | `basic.openingHours` | `externalData.diningcode.operatingHours` |

---

## 12. 경쟁업체 정보 (2025-11-28 신규)

주변 경쟁업체 및 유사 맛집 정보를 수집합니다.

### 데이터 구조

```json
{
  "competitors": {
    "naver": [
      {
        "placeId": "2023037465",
        "name": "그린보이즈",
        "category": "",
        "rating": "",
        "reviewCount": "",
        "distance": "240m",
        "url": "https://m.place.naver.com/place/2023037465",
        "source": "naver_similar"
      },
      {
        "placeId": "1112303711",
        "name": "프로티너 역삼역점",
        "category": "",
        "rating": "",
        "reviewCount": "",
        "distance": "120m",
        "url": "https://m.place.naver.com/place/1112303711",
        "source": "naver_similar"
      }
    ],
    "diningcode": [
      {
        "rid": "R123456",
        "name": "경쟁업체명",
        "category": "한식",
        "rating": "4.5",
        "distance": "250m",
        "url": "https://www.diningcode.com/profile.dc?rid=R123456",
        "source": "diningcode_similar"
      }
    ]
  }
}
```

### 필드 설명

#### 네이버 플레이스 경쟁업체 (naver)

| 필드 | 타입 | 설명 |
|------|------|------|
| `placeId` | String | 경쟁업체 플레이스 ID |
| `name` | String | 업체명 (네이버페이/예약/톡톡/쿠폰 등 프로모션 텍스트 제거됨) |
| `category` | String | 카테고리 정보 |
| `rating` | String | 평점 |
| `reviewCount` | String | 리뷰 수 |
| `distance` | String | 현재 플레이스로부터 거리 (예: "300m", "1.2km") |
| `url` | String | 경쟁업체 플레이스 URL |
| `source` | String | 데이터 출처 ("naver_similar") |

#### 다이닝코드 경쟁업체 (diningcode)

| 필드 | 타입 | 설명 |
|------|------|------|
| `rid` | String | 다이닝코드 업체 ID |
| `name` | String | 업체명 |
| `category` | String | 카테고리 |
| `rating` | String | 평점 |
| `distance` | String | 거리 |
| `url` | String | 다이닝코드 프로필 URL |
| `source` | String | 데이터 출처 ("diningcode_similar") |

### 수집 방법

#### 네이버 플레이스
- `/home` 페이지 하단의 "이 장소와 비슷한 맛집" 섹션에서 수집
- 광고 2개를 제외하고 최대 10개의 경쟁업체 정보 추출
- 페이지 끝까지 스크롤하여 섹션 로드 후 파싱
- 업체명에서 카테고리, 주소 등 불필요한 텍스트 자동 제거

#### 다이닝코드
- 네이버 플레이스 페이지의 외부 링크에서 다이닝코드 URL 추출
- 다이닝코드 페이지의 "비슷한 맛집" 섹션 크롤링 (예: "라이브볼과 비슷한 맛집")
- 최대 10개의 유사 업체 정보 추출
- 업체명에서 연속 공백 제거 및 정규화
- 거리 정보는 "현 식당에서 XXXm" 형식에서 추출

### 구현 파일
- `src/modules/crawler/CompetitorCollector.js`

### 활용 방안
```javascript
// 경쟁업체 분석
const competitorCount = data.competitors.naver.length + data.competitors.diningcode.length;
const nearbyCompetitors = data.competitors.naver.filter(c => c.distance && parseFloat(c.distance) < 500);

console.log(`Total competitors: ${competitorCount}`);
console.log(`Competitors within 500m: ${nearbyCompetitors.length}`);
```

---

## 13. 메타 정보

크롤링 메타데이터입니다.

```json
{
  "placeId": "1716926393",
  "crawledAt": "2025-11-28T01:29:51.421Z",
  "_version": "0.4",
  "_graphqlResponseCount": 0
}
```

### 필드 설명

| 필드 | 타입 | 설명 |
|------|------|------|
| `placeId` | String | 플레이스 ID |
| `crawledAt` | String | 크롤링 시각 (ISO 8601) |
| `_version` | String | 크롤러 버전 |
| `_graphqlResponseCount` | Number | GraphQL 응답 수 (Apollo State) |

---

## 🔄 데이터 수집 프로세스

### 1. 기본 정보 수집
- `/home` 페이지 방문
- DOM 파싱으로 기본 정보 추출
- Apollo State가 있으면 추가 정보 보강

### 2. 리뷰 수집
- `/review/visitor` 페이지 방문 → 방문자 리뷰 수집
- `/review/ugc` 페이지 방문 → 블로그 리뷰 수집
- DOM 및 Apollo State 병합

### 3. AI 브리핑 및 외부 링크 수집
- `/home` 페이지 끝까지 스크롤
- AI 브리핑 섹션 파싱
- 관련링크에서 외부 플랫폼 링크 추출

### 4. 외부 플랫폼 크롤링
- 다이닝코드 링크 발견 시 해당 페이지 방문
- 평점, 리뷰 수, 태그 등 수집
- 추가 플랫폼 확장 가능

### 5. 경쟁업체 정보 수집 (2025-11-28 신규)
- `/around` 페이지 방문하여 주변 비슷한 맛집 수집
- 다이닝코드 연동된 경우 해당 페이지의 유사 맛집 수집
- 각 플랫폼당 최대 10개 경쟁업체 정보 추출

---

## 📊 데이터 활용 예시

### 1. SEO 키워드 분석
```javascript
const keywords = [
  ...data.reviewThemes.map(t => t.label),
  ...data.reviewMenus.map(m => m.label),
  ...data.aiBriefing.recommendations.map(r => r.text)
];
```

### 2. 경쟁사 비교
```javascript
const comparison = {
  naver: {
    rating: data.reviews.stats.average,
    reviewCount: data.reviews.stats.total
  },
  diningcode: {
    rating: data.externalData.diningcode.rating,
    reviewCount: data.externalData.diningcode.reviewCount
  }
};
```

### 3. 트렌드 분석
```javascript
const trends = {
  keywords: data.ranking.votedKeywords,
  themes: data.reviewThemes,
  menus: data.reviewMenus
};
```

---

## 🚀 향후 확장 계획

### 1단계 (완료 ✅)
- [x] 기본 정보 수집
- [x] 메뉴, 리뷰, 이미지 수집
- [x] 카테고리 코드 + 명칭 수집
- [x] AI 브리핑 수집
- [x] 다이닝코드 연동
- [x] 경쟁업체 정보 수집

### 2단계 (진행 중 🔄)
- [ ] 망고플레이트 크롤러 구현
- [ ] 캐치테이블 크롤러 구현
- [ ] 외부 플랫폼 데이터 비교 분석 모듈
- [ ] 경쟁업체 상세 정보 수집 (평점, 리뷰 수 등)

### 3단계 (예정 📋)
- [ ] 시계열 데이터 수집 (리뷰 추세)
- [ ] 경쟁사 심층 분석 및 비교
- [ ] 키워드 트렌드 분석

---

## 📝 사용 예시

### 단일 플레이스 크롤링

```javascript
import PlaceCrawlerV04 from './src/modules/crawler/PlaceCrawlerV04.js';

const crawler = new PlaceCrawlerV04();
await crawler.init();

const data = await crawler.crawl('1716926393');
console.log(data);

await crawler.close();
```

### 출력 파일
```
data/output/l1/place-1716926393.json
```

---

## 🔍 데이터 품질

### 수집 성공률
- 기본 정보: ~100%
- 메뉴: ~90%
- 방문자 리뷰: ~95%
- 블로그 리뷰: ~80%
- AI 브리핑: ~60% (플레이스에 따라 다름)
- 외부 링크: ~30% (다이닝코드 등 연동된 경우만)
- 경쟁업체 (네이버): ~95% (주변 맛집이 있는 경우)
- 경쟁업체 (다이닝코드): ~30% (다이닝코드 연동된 경우만)

### 데이터 신뢰도
- 네이버 플레이스 공식 데이터: ⭐⭐⭐⭐⭐
- AI 브리핑: ⭐⭐⭐⭐ (AI 생성, 참고용)
- 외부 플랫폼: ⭐⭐⭐⭐ (각 플랫폼의 크롤링 품질에 따름)

---

## 📞 문의

프로젝트 이슈: [GitHub Issues](https://github.com/yourusername/place-keywords-maker-v2/issues)

**Last Updated**: 2025-11-28
**Version**: 0.4
