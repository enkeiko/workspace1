# 네이버 플레이스 데이터 구조 설계 v2.0

## 📋 데이터 구조 개요

```javascript
{
  // 메타 정보
  "placeId": "1716926393",
  "crawledAt": "2025-12-05T01:00:00.000Z",
  "_version": "2.0",

  // === 기초정보 ===
  "basicInfo": {
    "name": "라이브볼",
    "category": "다이어트,샐러드",
    "categoryHierarchy": "||음식점||샐러드||다이어트전문",  // NEW: naver-place-crawler 참고
    "categoryCodes": ["220036", "220047", "220170", "230734"],
    "seoKeywords": ["샐러드", "포케", "다이어트", "점메추", "밸런스"],  // NEW: ROOT_QUERY.informationTab.keywordList

    "contact": {
      "address": {
        "road": "서울 강남구 테헤란로 147 지하 1층 3호 라이브볼",
        "jibun": "서울 강남구 역삼동 642-16",
        "detail": ""
      },
      "phone": "0507-1384-0621",
      "virtualPhone": "0507-1384-0621",  // 가상번호
      "homepage": "",
      "sns": {  // NEW: 수집 필요
        "instagram": "",
        "facebook": "",
        "blog": "",
        "youtube": ""
      }
    },

    "location": {
      "coordinate": {
        "x": "127.035701",
        "y": "37.5008535"
      },
      "directions": {
        "parking": "성지하이츠2 지하주차장이용",
        "publicTransit": "",
        "walking": "",
        "car": "",
        "additionalInfo": "역삼역 4번 출구에서 5시방향 유턴, 100m 이내"
      },
      "nearbyPlaces": []  // NEW: 수집 필요 - 주변 명소
    },

    "placeUrl": "https://m.place.naver.com/restaurant/1716926393/home",

    "menus": [
      {
        "name": "멕시칸쉬림프포케",
        "price": "14900",
        "description": "멕시칸부리또볼을 포케와 조화해 라이브볼만의 멕시칸포케입니다.",
        "images": [],
        "isRecommended": false
      }
    ],

    "businessHours": {  // IMPROVED: 더 구조화된 영업시간
      "regular": [
        {
          "day": "월",
          "hours": "09:30-19:30",
          "breakTime": "14:00-15:00"
        }
      ],
      "holiday": "토,일",
      "lastOrder": null,
      "status": "영업 중",
      "statusDescription": "19:30에 영업 종료"
    },

    "description": "",  // 소개
    "microReviews": ["푸짐한 양으로 든든하게 즐기는 포케"],

    "facilities": [
      "포장", "배달", "무선 인터넷", "예약",
      "남/녀 화장실 구분", "간편결제", "주차"
    ],

    "parking": {  // NEW: 주차 정보 분리
      "available": true,
      "type": "건물 지하주차장",
      "fee": "최초 60분 6,000원, 추가 60분당 6,000원, 최대 35,000원",
      "description": "성지하이츠2 지하주차장이용"
    },

    "payments": ["제로페이", "간편결제"],

    "relatedLinks": [  // 관련링크
      {
        "name": "다이닝코드",
        "url": "https://diningcode.com/profile.php?rid=kyGW8k1TTTs9",
        "type": "diningcode"
      }
    ]
  },

  // === 부가정보 1: 리뷰 및 평가 ===
  "reviewData": {
    "aiBriefing": {
      "summary": "",
      "recommendations": [
        {
          "number": 1,
          "text": "음식이 맛있어요",
          "author": "",
          "date": ""
        }
      ],
      "disclaimer": "본 정보는 AI가 자동 생성한 내용입니다."
    },

    "keywords": {
      "visitor": {  // 방문자 투표 키워드
        "totalVotes": 411,
        "reviewCount": 104,
        "userCount": 82,
        "items": [
          {
            "code": "food_good",
            "name": "음식이 맛있어요",
            "count": 96,
            "iconUrl": "https://...",
            "iconCode": "face_savoring_food"
          }
        ]
      },
      "themes": [  // 테마 키워드 (AI 분석)
        {
          "code": "taste",
          "label": "맛",
          "count": 61
        }
      ],
      "menus": [  // 메뉴 언급 키워드
        {
          "label": "샐러드",
          "count": 18
        }
      ],
      "aggregated": []  // NEW: naver-place-crawler 스타일 집계 키워드
    },

    "visitorReviews": {
      "stats": {
        "total": 106,
        "avgRating": 4.38,
        "withPhoto": 75,
        "withContent": 88
      },
      "items": [
        {
          "id": "",
          "author": "",
          "rating": 5,
          "content": "",
          "images": [],
          "visitDate": "",
          "createdAt": "",
          "votedKeywords": []
        }
      ]
    },

    "blogReviews": {
      "total": 37,
      "items": [
        {
          "id": "",
          "title": "",
          "author": "",
          "url": "",
          "thumbnail": "",
          "excerpt": "",
          "date": ""
        }
      ]
    },

    "nearbyAttractions": []  // NEW: 주변 명소 목록
  },

  // === 부가정보 2: 네이버 서비스 및 플랫폼 정보 ===
  "platformData": {
    "naverServices": {  // NEW: 네이버 서비스 사용 여부
      "booking": {
        "enabled": false,
        "businessId": null,
        "url": null
      },
      "smartCall": {
        "enabled": true,
        "description": "전화를 대신 받고 응대까지 해드려요!"
      },
      "smartOrder": {
        "enabled": false,
        "hasTableOrder": false,
        "hasPickup": false,
        "hasDelivery": false
      },
      "placePlus": {
        "enabled": false
      },
      "naverPay": {
        "enabled": false
      }
    },

    "internalData": {  // NEW: 네이버 내부 데이터
      "gdid": {
        "raw": "N4:1716926393",
        "type": "N4",
        "placeId": "1716926393",
        "isValid": true
      },
      "categoryClassification": "TYPE_B",  // NEW: A=서비스업, B=음식점 (naver-place-crawler 참고)
      "siteId": "sp_157b2d2a80f7a1",
      "rcode": "09680101",  // 행정구역코드
      "isGoodStore": false,
      "isKtis": null
    },

    "images": [
      {
        "id": "",
        "url": "",
        "thumbnail": "",
        "category": "menu",  // menu, interior, exterior, food, etc
        "uploader": "owner",  // owner, visitor
        "uploadDate": ""
      }
    ]
  },

  // === 경쟁자 목록 ===
  "competitors": {
    "naver": [
      {
        "placeId": "",
        "name": "",
        "category": "",
        "distance": "",
        "rating": 0,
        "reviewCount": 0
      }
    ],
    "diningcode": [
      {
        "restaurantId": "",
        "name": "",
        "distance": "",
        "rating": 0
      }
    ],
    "similar": []  // NEW: 유사 업체 (네이버 추천)
  },

  // === 기타 수집 정보 ===
  "additional": {
    "notices": [],  // 소식/공지사항
    "placeNotices": [],  // 매장 공지
    "detailedIntro": "",  // 상세 소개
    "promotions": [],  // NEW: 프로모션 정보
    "events": [],  // NEW: 이벤트 정보
    "awards": [],  // NEW: 수상 내역 (미슐랭 등)
    "certifications": []  // NEW: 인증 (HACCP 등)
  },

  // 크롤링 메타데이터
  "_metadata": {
    "version": "2.0",
    "crawlDuration": 0,
    "dataCompleteness": 0.95,
    "errors": [],
    "sources": {
      "apolloState": true,
      "graphql": true,
      "dom": true
    }
  }
}
```

## 🆕 신규 추가 필드 (기존 대비)

### 1. 기초정보
- ✅ `basicInfo.categoryHierarchy` - 카테고리 계층 구조
- ✅ `basicInfo.contact.sns` - SNS 링크 (Instagram, Facebook, Blog, YouTube)
- ✅ `basicInfo.location.nearbyPlaces` - 주변 명소
- ✅ `basicInfo.businessHours` - 구조화된 영업시간
- ✅ `basicInfo.parking` - 상세 주차 정보

### 2. 부가정보 1
- ✅ `reviewData.keywords.aggregated` - 집계 키워드 (naver-place-crawler 방식)
- ✅ `reviewData.nearbyAttractions` - 주변 명소 목록

### 3. 부가정보 2
- ✅ `platformData.naverServices` - 네이버 서비스 사용 여부 전체
  - booking (예약)
  - smartCall (스마트콜)
  - smartOrder (주문)
  - placePlus
  - naverPay
- ✅ `platformData.internalData.categoryClassification` - TYPE_A/B 분류
- ✅ `platformData.images` - 이미지 상세 정보

### 4. 기타
- ✅ `additional.promotions` - 프로모션
- ✅ `additional.events` - 이벤트
- ✅ `additional.awards` - 수상 내역
- ✅ `additional.certifications` - 인증

## 📊 데이터 소스 매핑

| 필드 | 데이터 소스 | 우선순위 |
|-----|-----------|---------|
| seoKeywords | ROOT_QUERY.informationTab.keywordList | 1 |
| categoryHierarchy | naver-place-crawler category DB | 2 |
| sns links | ROOT_QUERY.placeDetail.homepages + DOM | 3 |
| naverServices | ROOT_QUERY.placeDetail.businessTools | 1 |
| nearbyPlaces | ROOT_QUERY.subwayStations + busStations | 2 |
| categoryClassification | 카테고리 기반 알고리즘 | 3 |

## 🎯 구현 우선순위

### Phase 1 (즉시)
1. ✅ SEO 키워드 수집 (완료)
2. SNS 링크 수집
3. 네이버 서비스 사용 여부 수집

### Phase 2 (단기)
1. 카테고리 계층 구조 매핑
2. 주변 명소 수집
3. 상세 주차 정보 파싱

### Phase 3 (중기)
1. 프로모션/이벤트 수집
2. 수상 내역 수집
3. 인증 정보 수집

## 💾 데이터베이스 스키마

```sql
-- 기존 stores 테이블 확장
ALTER TABLE stores ADD COLUMN category_hierarchy TEXT;
ALTER TABLE stores ADD COLUMN sns_instagram VARCHAR(255);
ALTER TABLE stores ADD COLUMN sns_facebook VARCHAR(255);
ALTER TABLE stores ADD COLUMN sns_blog VARCHAR(255);
ALTER TABLE stores ADD COLUMN has_naver_booking BOOLEAN DEFAULT FALSE;
ALTER TABLE stores ADD COLUMN has_smart_call BOOLEAN DEFAULT FALSE;
ALTER TABLE stores ADD COLUMN category_type VARCHAR(10); -- TYPE_A or TYPE_B

-- 크롤링 히스토리 테이블 (변경사항 추적)
CREATE TABLE IF NOT EXISTS crawl_history_detail (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  place_id TEXT NOT NULL,
  crawl_date TEXT NOT NULL,
  field_name TEXT NOT NULL,  -- 변경된 필드명
  old_value TEXT,
  new_value TEXT,
  FOREIGN KEY (place_id) REFERENCES stores(place_id)
);
```
