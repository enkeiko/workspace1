# L1 크롤링 강화 가이드 - V2.1 실행문서
**작성일**: 2025-11-14
**버전**: 2.1.0
**기반**: 42ment Naver Place SEO Guidebook v1.1
**목적**: L1 데이터 수집 단계의 정교함과 사용성 극대화

---

## 📋 목차
1. [개요](#1-개요)
2. [가이드북 기반 데이터 수집 전략](#2-가이드북-기반-데이터-수집-전략)
3. [PlaceCrawler 강화 방안](#3-placecrawler-강화-방안)
4. [DataParser 강화 방안](#4-dataparser-강화-방안)
5. [L1Processor 8단계 완전 구현](#5-l1processor-8단계-완전-구현)
6. [데이터 스키마 (가이드북 통합)](#6-데이터-스키마-가이드북-통합)
7. [구현 우선순위](#7-구현-우선순위)
8. [테스트 전략](#8-테스트-전략)

---

## 1. 개요

### 1.1 현재 상태 (V2.0)
- ✅ 기본 크롤링 구조 (Puppeteer + Circuit Breaker)
- ✅ 모듈화 아키텍처
- ⚠️ 실제 선택자 미구현 (TODO 상태)
- ⚠️ Apollo State 파싱 미구현
- ⚠️ 가이드북 SEO 전략 미반영

### 1.2 목표 (V2.1)
**핵심 목표**: 가이드북의 **Relevance·Popularity·Trust 프레임워크**를 L1 데이터 수집에 완전 통합

#### 데이터 수집 강화
- ✅ NAP (Name, Address, Phone) 완전 수집 및 검증
- ✅ Apollo State 전체 파싱
- ✅ 블로그 리뷰 전문 (1500자+) + 해시태그 추출
- ✅ 이미지 자동 분류 (menu|interior|food|exterior)
- ✅ 메뉴 정보 완전 수집 (최대 50개, 가격·설명·이미지·추천 여부)
- ✅ 지역 정보 정밀 파싱 (시/구/동/역/상권)

#### 키워드 요소 자동 분류
```
core       → 카테고리, 브랜드
location   → 시·구·동·역·상권 조합 (예: "강남역 맛집", "역삼동 카페")
menu       → 메뉴명, 가격대 (예: "아메리카노 5000원대")
attribute  → 편의시설, 결제수단 (예: "24시간", "주차가능", "WiFi")
sentiment  → 감성 키워드 (예: "분위기좋은", "데이트하기좋은") ← 리뷰 분석
```

#### 완성도 평가 강화
- **115점 만점 스코어링** (가이드북 기준)
- **등급 분류**: HIGH (90+) / MEDIUM (60-89) / LOW (60 미만)

---

## 2. 가이드북 기반 데이터 수집 전략

### 2.1 Relevance (적합도) - 기본 정보 완성
**목적**: 업종·카테고리·메뉴 정확성 확보

#### 수집 항목
```javascript
{
  // B-2 카테고리 전략
  category: {
    primary: "카페",           // 기본 카테고리 (네이버 공식)
    sub: "커피전문점",         // 서브 카테고리
    tags: ["브런치카페", "디저트카페"]
  },

  // B-3 NAP 관리 (Name, Address, Phone)
  nap: {
    name: "카페 이름",
    address: "서울특별시 강남구 역삼동 123-45",
    phone: "02-1234-5678",
    businessHours: {
      weekday: "10:00 - 22:00",
      weekend: "11:00 - 23:00",
      holiday: "휴무"
    }
  },

  // D-1 소개문 (1200~2000자)
  intro: {
    text: "...",
    length: 1500,
    keywords: ["대표키워드1", "대표키워드2"]  // 1~2회 자연 삽입
  }
}
```

### 2.2 Popularity (인기도) - 상호작용 데이터
**목적**: 클릭·리뷰·소식 빈도 파악

#### 수집 항목
```javascript
{
  // E-2 리뷰 전략
  reviews: {
    stats: {
      total: 1234,
      textReviewCount: 567,
      visitReviewCount: 89,     // 영수증 인증 리뷰
      averageRating: 4.5
    },

    // 블로그 리뷰 전문 (최대 10개, 1500자+)
    blogReviews: [
      {
        author: "블로거명",
        date: "2025-01-10",
        content: "1500자 이상 전문...",
        url: "https://blog.naver.com/...",
        hashtags: ["#맛집", "#데이트", "#분위기좋은"],
        hasReceipt: true  // 영수증 인증 여부
      }
    ],

    // 짧은 리뷰 요약 (3개)
    summary: [
      "커피가 정말 맛있어요",
      "분위기 좋고 조용해요",
      "주차가 편리합니다"
    ]
  },

  // D-2 소식 (News/Post)
  posts: {
    count: 24,  // 월 2회 × 12개월
    recentPosts: [
      {
        title: "신메뉴 출시",
        date: "2025-01-05",
        content: "...",
        images: ["..."]
      }
    ]
  }
}
```

### 2.3 Trust (신뢰도) - 품질 지표
**목적**: 사진 품질·답글 SLA·정보 정확성

#### 수집 항목
```javascript
{
  // D-3 시각콘텐츠
  images: {
    total: 45,
    categorized: {
      menu: 15,        // 메뉴 사진
      interior: 10,    // 내부 인테리어
      food: 12,        // 음식 완성 컷
      exterior: 5,     // 외관
      service: 3       // 서비스 컷
    },
    highQuality: 40,  // 고해상도 이미지 수
    images: [
      {
        url: "https://...",
        description: "아메리카노",
        category: "menu",
        isHighQuality: true,
        width: 1920,
        height: 1080
      }
    ]
  },

  // 응답성 (답글 SLA)
  responsiveness: {
    replyRate: 0.85,        // 답글 비율
    avgReplyTime: "24시간",  // 평균 답글 시간
    recentReplies: [...]
  },

  // 정보 정합성
  consistency: {
    napMatches: true,  // NAP 일치 여부
    menuPriceAccurate: true,
    hoursAccurate: true
  }
}
```

---

## 3. PlaceCrawler 강화 방안

### 3.1 Apollo State 완전 파싱
**현재 문제**: `page.evaluate()`에서 TODO 선택자만 존재
**개선 방안**: V1의 Apollo State 파싱 로직 통합

#### 구현 코드 (src/modules/crawler/PlaceCrawler.js)
```javascript
async _crawlPlaceInternal(placeId) {
  const page = await this.browser.newPage();

  try {
    await page.setUserAgent(this.config.userAgent);

    // 1. 페이지 접속
    const url = `https://m.place.naver.com/restaurant/${placeId}/home`;
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: this.config.timeout,
    });

    // 2. Apollo State 추출
    const apolloState = await page.evaluate(() => {
      return window.__APOLLO_STATE__ || {};
    });

    // 3. Place 기본 정보 추출
    const placeKey = `Place:${placeId}`;
    const placeData = apolloState[placeKey] || {};

    // 4. 메뉴 데이터 추출 (최대 50개)
    const menus = this._extractMenusFromApollo(apolloState, placeId);

    // 5. 블로그 리뷰 전문 추출 (1500자+, 최대 10개)
    const blogReviews = this._extractBlogReviewsFromApollo(apolloState, placeId);

    // 6. 이미지 자동 분류
    const images = this._extractAndClassifyImages(apolloState, placeId);

    // 7. 리뷰 통계
    const reviewStats = this._extractReviewStats(apolloState, placeId);

    // 8. 편의시설, 결제수단
    const facilities = this._extractFacilities(apolloState, placeId);
    const payments = this._extractPayments(apolloState, placeId);

    return {
      placeId,
      apolloState,  // 원본 저장 (디버깅용)
      basic: {
        id: placeData.id || placeId,
        name: placeData.name || '',
        category: placeData.category || '',
        subCategory: placeData.subCategory || '',
        address: placeData.roadAddress || placeData.address || '',
        phone: placeData.phone || '',
        rating: placeData.visitorReviewsScore || 0,
        businessHours: placeData.businessHours || null,
        description: placeData.description || ''
      },
      menus,
      reviews: {
        stats: reviewStats,
        blogReviews,
        summary: this._extractReviewSummary(apolloState, placeId)
      },
      images,
      facilities,
      payments,
      parking: placeData.parkingInfo || null,
      crawledAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error(`Failed to crawl place ${placeId}:`, error);
    throw error;
  } finally {
    await page.close();
  }
}
```

### 3.2 메뉴 추출 로직
```javascript
/**
 * Apollo State에서 메뉴 데이터 추출
 * @param {Object} apolloState - window.__APOLLO_STATE__
 * @param {string} placeId
 * @returns {Array} 메뉴 배열 (최대 50개)
 */
_extractMenusFromApollo(apolloState, placeId) {
  const menus = [];

  // Apollo State에서 Menu 관련 키 검색
  Object.keys(apolloState).forEach(key => {
    if (key.startsWith('Menu:') && key.includes(placeId)) {
      const menuData = apolloState[key];

      menus.push({
        id: menuData.id,
        name: menuData.name || '',
        price: this._parsePrice(menuData.price),
        priceRange: menuData.priceRange || null,
        description: menuData.description || '',
        image: menuData.imageUrl || null,
        isRecommended: menuData.isRecommended || false,
        tags: menuData.tags || []
      });
    }
  });

  // 최대 50개 제한 + 추천 메뉴 우선
  return menus
    .sort((a, b) => (b.isRecommended ? 1 : 0) - (a.isRecommended ? 1 : 0))
    .slice(0, 50);
}
```

### 3.3 블로그 리뷰 전문 추출
```javascript
/**
 * 블로그 리뷰 전문 추출 (1500자+, 최대 10개)
 * @param {Object} apolloState
 * @param {string} placeId
 * @returns {Array} 블로그 리뷰 배열
 */
_extractBlogReviewsFromApollo(apolloState, placeId) {
  const blogReviews = [];

  Object.keys(apolloState).forEach(key => {
    if (key.startsWith('BlogReview:')) {
      const review = apolloState[key];

      // 1500자 이상만 수집
      if (review.content && review.content.length >= 1500) {
        blogReviews.push({
          id: review.id,
          author: review.author || '',
          date: review.createdAt || review.date || '',
          content: review.content,
          url: review.url || '',
          hashtags: this._extractHashtags(review.content),
          hasReceipt: review.hasReceiptImage || false,
          images: review.images || []
        });
      }
    }
  });

  // 최신순 정렬, 최대 10개
  return blogReviews
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);
}

/**
 * 해시태그 추출
 * @param {string} text
 * @returns {Array<string>} 해시태그 배열
 */
_extractHashtags(text) {
  const hashtagRegex = /#[가-힣a-zA-Z0-9_]+/g;
  const matches = text.match(hashtagRegex) || [];
  return [...new Set(matches)]; // 중복 제거
}
```

### 3.4 이미지 자동 분류
```javascript
/**
 * 이미지 추출 및 자동 분류
 * @param {Object} apolloState
 * @param {string} placeId
 * @returns {Object} 분류된 이미지
 */
_extractAndClassifyImages(apolloState, placeId) {
  const images = [];

  Object.keys(apolloState).forEach(key => {
    if (key.startsWith('Image:') || key.startsWith('Photo:')) {
      const img = apolloState[key];

      images.push({
        url: img.url || img.imageUrl || '',
        description: img.caption || img.description || '',
        category: this._classifyImageCategory(img),
        width: img.width || null,
        height: img.height || null,
        isHighQuality: (img.width >= 1200 && img.height >= 800)
      });
    }
  });

  // 카테고리별 집계
  const categorized = {
    menu: images.filter(i => i.category === 'menu'),
    interior: images.filter(i => i.category === 'interior'),
    food: images.filter(i => i.category === 'food'),
    exterior: images.filter(i => i.category === 'exterior'),
    service: images.filter(i => i.category === 'service')
  };

  return {
    total: images.length,
    highQuality: images.filter(i => i.isHighQuality).length,
    categorized: {
      menu: categorized.menu.length,
      interior: categorized.interior.length,
      food: categorized.food.length,
      exterior: categorized.exterior.length,
      service: categorized.service.length
    },
    images
  };
}

/**
 * 이미지 카테고리 자동 분류
 * @param {Object} img - 이미지 객체
 * @returns {string} 카테고리 (menu|interior|food|exterior|service)
 */
_classifyImageCategory(img) {
  const desc = (img.caption || img.description || '').toLowerCase();
  const tags = (img.tags || []).join(' ').toLowerCase();
  const text = `${desc} ${tags}`;

  // 키워드 기반 분류
  if (/(메뉴|가격|판|price|menu)/i.test(text)) return 'menu';
  if (/(인테리어|내부|좌석|테이블|interior)/i.test(text)) return 'interior';
  if (/(음식|요리|디저트|커피|food|dish)/i.test(text)) return 'food';
  if (/(외관|입구|건물|간판|exterior)/i.test(text)) return 'exterior';
  if (/(서비스|직원|포장|service)/i.test(text)) return 'service';

  return 'food'; // 기본값
}
```

### 3.5 편의시설 및 결제수단 추출
```javascript
/**
 * 편의시설 추출
 */
_extractFacilities(apolloState, placeId) {
  const placeKey = `Place:${placeId}`;
  const placeData = apolloState[placeKey] || {};

  const facilities = placeData.facilities || placeData.amenities || [];

  return facilities.map(f => ({
    name: f.name || f,
    icon: f.icon || null,
    available: f.available !== false
  }));
}

/**
 * 결제수단 추출
 */
_extractPayments(apolloState, placeId) {
  const placeKey = `Place:${placeId}`;
  const placeData = apolloState[placeKey] || {};

  return placeData.paymentMethods || placeData.payments || [];
}
```

---

## 4. DataParser 강화 방안

### 4.1 지역 정보 파싱 (AddressParser 통합)
**목적**: 주소에서 시/구/동/역/상권 정밀 추출

#### 구현 (src/modules/parser/AddressParser.js - 신규 생성)
```javascript
/**
 * AddressParser - 주소 파싱 및 지역 정보 추출
 */
export class AddressParser {
  constructor() {
    this.patterns = {
      city: /^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/,
      district: /(.*?)(시|군|구)/,
      dong: /(.*?)(동|읍|면|리)/,
      station: /(.*?)역/,
      building: /(.*?)(빌딩|타워|몰|플라자|스퀘어)/
    };
  }

  /**
   * 주소 파싱
   * @param {string} address - 전체 주소
   * @returns {Object} 파싱된 지역 정보
   */
  parse(address) {
    if (!address) return null;

    const normalized = this._normalizeAddress(address);

    return {
      raw: address,
      normalized,
      city: this._extractCity(address),
      district: this._extractDistrict(address),
      dong: this._extractDong(address),
      station: this._extractStation(address),
      building: this._extractBuilding(address),

      // 키워드 조합용 정규화
      normalized: {
        city: this._normalizeRegion(this._extractCity(address)),
        district: this._normalizeRegion(this._extractDistrict(address)),
        dong: this._normalizeRegion(this._extractDong(address))
      }
    };
  }

  /**
   * 주소 정규화 (특수문자 제거, 공백 정리)
   */
  _normalizeAddress(address) {
    return address
      .replace(/\s+/g, ' ')
      .replace(/[()]/g, '')
      .trim();
  }

  /**
   * 시/도 추출
   */
  _extractCity(address) {
    const match = address.match(this.patterns.city);
    return match ? match[0] : null;
  }

  /**
   * 구/군 추출
   */
  _extractDistrict(address) {
    const parts = address.split(' ');
    for (const part of parts) {
      if (part.endsWith('구') || part.endsWith('군')) {
        return part;
      }
    }
    return null;
  }

  /**
   * 동/읍/면 추출
   */
  _extractDong(address) {
    const parts = address.split(' ');
    for (const part of parts) {
      if (part.endsWith('동') || part.endsWith('읍') || part.endsWith('면')) {
        return part;
      }
    }
    return null;
  }

  /**
   * 역 추출 (주소 + 괄호 내 정보)
   */
  _extractStation(address) {
    const stationMatch = address.match(/([가-힣]+)역/);
    return stationMatch ? stationMatch[1] + '역' : null;
  }

  /**
   * 건물명 추출
   */
  _extractBuilding(address) {
    const buildingMatch = address.match(this.patterns.building);
    return buildingMatch ? buildingMatch[0] : null;
  }

  /**
   * 지역명 정규화 (예: "강남구" → "강남")
   */
  _normalizeRegion(region) {
    if (!region) return null;

    return region
      .replace(/(특별시|광역시|특별자치시|특별자치도|도)$/g, '')
      .replace(/(시|군|구|동|읍|면|리)$/g, '');
  }
}
```

### 4.2 키워드 요소 5가지 자동 분류
**목적**: SEO 키워드 구성 요소 자동 추출

#### 구현 (src/modules/parser/KeywordClassifier.js - 신규 생성)
```javascript
/**
 * KeywordClassifier - 키워드 5가지 카테고리 자동 분류
 * 가이드북 C-3 구조 기반
 */
export class KeywordClassifier {
  constructor() {
    this.addressParser = new AddressParser();
  }

  /**
   * 키워드 요소 분류
   * @param {Object} placeData - 파싱된 매장 데이터
   * @returns {Object} 5가지 카테고리 키워드
   */
  classify(placeData) {
    return {
      core: this._extractCore(placeData),
      location: this._extractLocation(placeData),
      menu: this._extractMenu(placeData),
      attribute: this._extractAttribute(placeData),
      sentiment: this._extractSentiment(placeData)
    };
  }

  /**
   * 1. Core (핵심 요소)
   */
  _extractCore(placeData) {
    const keywords = [];

    if (placeData.basic?.category) {
      keywords.push(placeData.basic.category);
    }

    if (placeData.basic?.subCategory) {
      keywords.push(placeData.basic.subCategory);
    }

    // 브랜드명 (체인점 감지)
    if (placeData.basic?.name) {
      const brandKeywords = this._detectBrand(placeData.basic.name);
      keywords.push(...brandKeywords);
    }

    return [...new Set(keywords)]; // 중복 제거
  }

  /**
   * 2. Location (지역 요소)
   */
  _extractLocation(placeData) {
    const keywords = [];
    const location = this.addressParser.parse(placeData.basic?.address || '');

    if (!location) return keywords;

    const { city, district, dong, station, normalized } = location;

    // 조합 키워드 생성
    if (normalized.city && normalized.district) {
      keywords.push(`${normalized.city} ${normalized.district}`);
    }

    if (normalized.district && normalized.dong) {
      keywords.push(`${normalized.district} ${normalized.dong}`);
      keywords.push(`${normalized.dong}`);
    }

    if (station) {
      keywords.push(station);
      keywords.push(`${station} 맛집`);

      // 카테고리 조합
      if (placeData.basic?.category) {
        keywords.push(`${station} ${placeData.basic.category}`);
      }
    }

    if (normalized.dong && placeData.basic?.category) {
      keywords.push(`${normalized.dong} ${placeData.basic.category}`);
    }

    return [...new Set(keywords)];
  }

  /**
   * 3. Menu (메뉴 요소)
   */
  _extractMenu(placeData) {
    const keywords = [];

    if (placeData.menus && placeData.menus.length > 0) {
      // 메뉴명
      placeData.menus.forEach(menu => {
        if (menu.name) {
          keywords.push(menu.name);
        }

        // 가격대 (5000원 단위)
        if (menu.price) {
          const priceRange = Math.floor(menu.price / 5000) * 5000;
          keywords.push(`${priceRange}원대`);
        }
      });

      // 평균 가격대
      const avgPrice = placeData.menus.reduce((sum, m) => sum + (m.price || 0), 0) / placeData.menus.length;
      if (avgPrice > 0) {
        keywords.push(`평균 ${Math.floor(avgPrice / 1000)}천원대`);
      }
    }

    return [...new Set(keywords)];
  }

  /**
   * 4. Attribute (속성 요소)
   */
  _extractAttribute(placeData) {
    const keywords = [];

    // 편의시설
    if (placeData.facilities) {
      placeData.facilities.forEach(facility => {
        if (facility.available) {
          keywords.push(facility.name);
        }
      });
    }

    // 결제수단
    if (placeData.payments && placeData.payments.length > 0) {
      placeData.payments.forEach(payment => {
        keywords.push(payment);
      });
    }

    // 주차
    if (placeData.parking) {
      keywords.push('주차가능');
    }

    // 영업시간 특징
    if (placeData.basic?.businessHours) {
      const hours = placeData.basic.businessHours;
      if (hours.weekday && hours.weekday.includes('00:00') || hours.weekday.includes('24시간')) {
        keywords.push('24시간');
      }
    }

    return [...new Set(keywords)];
  }

  /**
   * 5. Sentiment (감성 요소) - 리뷰 분석
   */
  _extractSentiment(placeData) {
    const keywords = [];

    // 블로그 리뷰 해시태그 분석
    if (placeData.reviews?.blogReviews) {
      placeData.reviews.blogReviews.forEach(review => {
        if (review.hashtags) {
          review.hashtags.forEach(tag => {
            // 감성 키워드 필터링
            if (this._isSentimentKeyword(tag)) {
              keywords.push(tag.replace('#', ''));
            }
          });
        }
      });
    }

    // 짧은 리뷰에서 감성 키워드 추출
    if (placeData.reviews?.summary) {
      placeData.reviews.summary.forEach(text => {
        const sentiments = this._extractSentimentFromText(text);
        keywords.push(...sentiments);
      });
    }

    return [...new Set(keywords)];
  }

  /**
   * 감성 키워드 판별
   */
  _isSentimentKeyword(tag) {
    const sentimentPatterns = [
      /분위기/,
      /데이트/,
      /감성/,
      /아늑/,
      /조용/,
      /힐링/,
      /프리미엄/,
      /고급/,
      /가성비/,
      /친절/
    ];

    return sentimentPatterns.some(pattern => pattern.test(tag));
  }

  /**
   * 텍스트에서 감성 키워드 추출
   */
  _extractSentimentFromText(text) {
    const sentiments = [];
    const patterns = {
      '분위기좋은': /분위기\s*(좋|최고|훌륭)/,
      '데이트하기좋은': /데이트\s*(하기\s*좋|추천)/,
      '조용한': /조용/,
      '가성비좋은': /가성비|가격\s*대비/,
      '친절한': /친절/
    };

    Object.entries(patterns).forEach(([keyword, pattern]) => {
      if (pattern.test(text)) {
        sentiments.push(keyword);
      }
    });

    return sentiments;
  }

  /**
   * 브랜드 감지 (체인점 여부)
   */
  _detectBrand(name) {
    const brands = [];

    // 일반적인 체인점 패턴
    const chainPatterns = [
      /스타벅스/,
      /투썸플레이스/,
      /할리스/,
      /이디야/,
      /빽다방/,
      /메가커피/
    ];

    chainPatterns.forEach(pattern => {
      if (pattern.test(name)) {
        brands.push(name.match(pattern)[0]);
      }
    });

    // 지점명 제거한 브랜드명
    const cleanName = name.replace(/(본점|직영점|\d+호점|[가-힣]+점)$/g, '').trim();
    if (cleanName !== name && cleanName.length > 2) {
      brands.push(cleanName);
    }

    return brands;
  }
}
```

### 4.3 완성도 평가 강화 (115점 만점)
**목적**: 가이드북 기준의 정밀한 완성도 평가

#### 구현 (src/modules/parser/DataParser.js 수정)
```javascript
/**
 * 데이터 완성도 계산 (115점 만점)
 * @param {Object} parsedData - 파싱된 데이터
 * @returns {Object} 완성도 평가 결과
 */
calculateCompleteness(parsedData) {
  const breakdown = {
    basic: this._scoreBasicInfo(parsedData),       // 20점
    menus: this._scoreMenus(parsedData),           // 20점
    reviews: this._scoreReviews(parsedData),       // 25점
    images: this._scoreImages(parsedData),         // 15점
    facilities: this._scoreFacilities(parsedData), // 10점
    keywords: this._scoreKeywords(parsedData),     // 15점
    manual: this._scoreManual(parsedData)          // 10점
  };

  const total = Object.values(breakdown).reduce((sum, score) => sum + score, 0);
  const grade = this._getGrade(total);

  return {
    score: total,
    grade,
    breakdown,
    timestamp: new Date().toISOString()
  };
}

/**
 * 기본 정보 점수 (20점)
 */
_scoreBasicInfo(data) {
  let score = 0;

  if (data.basic?.id) score += 3;
  if (data.basic?.name) score += 4;
  if (data.basic?.category) score += 4;
  if (data.basic?.address) score += 4;
  if (data.basic?.phone) score += 3;
  if (data.basic?.description && data.basic.description.length >= 1200) score += 2;

  return Math.min(score, 20);
}

/**
 * 메뉴 점수 (20점)
 */
_scoreMenus(data) {
  if (!data.menus || data.menus.length === 0) return 0;

  const count = data.menus.length;
  const withPrice = data.menus.filter(m => m.price > 0).length;
  const withImage = data.menus.filter(m => m.image).length;
  const recommended = data.menus.filter(m => m.isRecommended).length;

  let score = 0;

  // 개수 (10점)
  if (count >= 10) score += 10;
  else score += count;

  // 가격 정보 (4점)
  if (withPrice >= count * 0.8) score += 4;
  else score += (withPrice / count) * 4;

  // 이미지 (4점)
  if (withImage >= count * 0.5) score += 4;
  else score += (withImage / count) * 4;

  // 추천 메뉴 (2점)
  if (recommended > 0) score += 2;

  return Math.min(score, 20);
}

/**
 * 리뷰 점수 (25점)
 */
_scoreReviews(data) {
  let score = 0;

  if (!data.reviews) return 0;

  const stats = data.reviews.stats || {};
  const blogCount = data.reviews.blogReviews?.length || 0;

  // 총 리뷰 수 (10점)
  if (stats.total >= 100) score += 10;
  else score += (stats.total / 100) * 10;

  // 텍스트 리뷰 (5점)
  if (stats.textReviewCount >= 50) score += 5;
  else score += (stats.textReviewCount / 50) * 5;

  // 블로그 리뷰 전문 (7점)
  if (blogCount >= 5) score += 7;
  else score += (blogCount / 5) * 7;

  // 영수증 인증 리뷰 (3점)
  if (stats.visitReviewCount >= 10) score += 3;
  else score += (stats.visitReviewCount / 10) * 3;

  return Math.min(score, 25);
}

/**
 * 이미지 점수 (15점)
 */
_scoreImages(data) {
  let score = 0;

  if (!data.images) return 0;

  const total = data.images.total || 0;
  const highQuality = data.images.highQuality || 0;
  const categorized = data.images.categorized || {};

  // 이미지 수 (7점)
  if (total >= 20) score += 7;
  else score += (total / 20) * 7;

  // 고해상도 비율 (3점)
  if (total > 0) {
    const hqRatio = highQuality / total;
    score += hqRatio * 3;
  }

  // 카테고리 다양성 (5점)
  const categories = Object.values(categorized).filter(c => c > 0).length;
  score += (categories / 5) * 5;

  return Math.min(score, 15);
}

/**
 * 편의시설 점수 (10점)
 */
_scoreFacilities(data) {
  let score = 0;

  const facilityCount = data.facilities?.length || 0;
  const paymentCount = data.payments?.length || 0;
  const hasParking = !!data.parking;

  // 편의시설 개수 (5점)
  if (facilityCount >= 5) score += 5;
  else score += facilityCount;

  // 결제수단 (3점)
  if (paymentCount >= 3) score += 3;
  else score += paymentCount;

  // 주차 정보 (2점)
  if (hasParking) score += 2;

  return Math.min(score, 10);
}

/**
 * 키워드 요소 점수 (15점)
 */
_scoreKeywords(data) {
  if (!data.keywordElements) return 0;

  let score = 0;

  const { core, location, menu, attribute, sentiment } = data.keywordElements;

  if (core && core.length > 0) score += 3;
  if (location && location.length >= 3) score += 4;
  if (menu && menu.length >= 5) score += 3;
  if (attribute && attribute.length >= 3) score += 3;
  if (sentiment && sentiment.length >= 2) score += 2;

  return Math.min(score, 15);
}

/**
 * 수동 입력 데이터 점수 (10점)
 */
_scoreManual(data) {
  let score = 0;

  if (data.currentKeywords && data.currentKeywords.length > 0) score += 5;
  if (data.manualNotes) score += 5;

  return score;
}

/**
 * 등급 산정
 */
_getGrade(score) {
  if (score >= 90) return 'HIGH';
  if (score >= 60) return 'MEDIUM';
  return 'LOW';
}
```

---

## 5. L1Processor 8단계 완전 구현

### 5.1 8단계 프로세스 (가이드북 통합)
**파일**: src/modules/processor/L1Processor.js

```javascript
/**
 * L1Processor - 8단계 데이터 수집 파이프라인
 * 가이드북 v1.1 기반 강화
 */
import { PlaceCrawler } from '../crawler/PlaceCrawler.js';
import { DataParser } from '../parser/DataParser.js';
import { AddressParser } from '../parser/AddressParser.js';
import { KeywordClassifier } from '../parser/KeywordClassifier.js';
import { logger } from '../../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

export class L1Processor {
  constructor(config = {}) {
    this.config = config;
    this.crawler = new PlaceCrawler(config.crawler);
    this.parser = new DataParser(config.parser);
    this.addressParser = new AddressParser();
    this.keywordClassifier = new KeywordClassifier();
    this.outputDir = config.outputDir || './data/l1-output';
  }

  /**
   * 전체 L1 파이프라인 실행 (8단계)
   * @param {string[]} placeIds - Place ID 배열
   * @returns {Promise<Object>} 최종 결과
   */
  async process(placeIds) {
    logger.info('=== L1 Pipeline Started ===');

    try {
      // Step 1: 데이터 소스 스캔
      logger.info('Step 1/8: Scanning data sources...');
      const sources = await this.scanSources();

      // Step 2: 데이터 로딩 (크롤링)
      logger.info('Step 2/8: Crawling places...');
      await this.crawler.initialize();
      const rawData = await this.crawler.crawlBatch(placeIds);

      // Step 3: 데이터 통합
      logger.info('Step 3/8: Integrating data...');
      const integrated = this.integrateData(rawData, sources);

      // Step 4: 지역 정보 파싱
      logger.info('Step 4/8: Parsing location data...');
      const withLocation = this.parseLocation(integrated);

      // Step 5: 키워드 요소 분류
      logger.info('Step 5/8: Classifying keywords...');
      const withKeywords = this.classifyKeywords(withLocation);

      // Step 6: 완성도 평가
      logger.info('Step 6/8: Evaluating completeness...');
      const evaluated = this.evaluateCompleteness(withKeywords);

      // Step 7: 우선순위 정렬
      logger.info('Step 7/8: Sorting by priority...');
      const sorted = this.sortByPriority(evaluated);

      // Step 8: 결과 저장
      logger.info('Step 8/8: Saving results...');
      await this.saveResults(sorted);

      logger.info('=== L1 Pipeline Completed ===');
      return sorted;

    } catch (error) {
      logger.error('L1 Pipeline failed:', error);
      throw error;
    } finally {
      await this.crawler.close();
    }
  }

  /**
   * Step 1: 데이터 소스 스캔
   */
  async scanSources() {
    const sources = {
      currentKeywords: {},
      manualNotes: {}
    };

    try {
      // current_keywords.json 로드
      const keywordsPath = path.join(this.config.inputDir || './data/input', 'current_keywords.json');
      const keywordsData = await fs.readFile(keywordsPath, 'utf-8');
      sources.currentKeywords = JSON.parse(keywordsData);
    } catch (error) {
      logger.warn('No current_keywords.json found');
    }

    try {
      // manual_notes.json 로드
      const notesPath = path.join(this.config.inputDir || './data/input', 'manual_notes.json');
      const notesData = await fs.readFile(notesPath, 'utf-8');
      sources.manualNotes = JSON.parse(notesData);
    } catch (error) {
      logger.warn('No manual_notes.json found');
    }

    return sources;
  }

  /**
   * Step 3: 데이터 통합
   */
  integrateData(crawledData, sources) {
    return crawledData.map(item => {
      if (!item.success) return item;

      const placeId = item.placeId;

      return {
        ...item,
        data: {
          ...item.data,
          currentKeywords: sources.currentKeywords[placeId] || [],
          manualNotes: sources.manualNotes[placeId] || null
        }
      };
    });
  }

  /**
   * Step 4: 지역 정보 파싱
   */
  parseLocation(data) {
    return data.map(item => {
      if (!item.success) return item;

      const location = this.addressParser.parse(item.data.basic?.address || '');

      return {
        ...item,
        data: {
          ...item.data,
          location
        }
      };
    });
  }

  /**
   * Step 5: 키워드 요소 분류
   */
  classifyKeywords(data) {
    return data.map(item => {
      if (!item.success) return item;

      const keywordElements = this.keywordClassifier.classify(item.data);

      return {
        ...item,
        data: {
          ...item.data,
          keywordElements
        }
      };
    });
  }

  /**
   * Step 6: 완성도 평가
   */
  evaluateCompleteness(data) {
    return data.map(item => {
      if (!item.success) return item;

      const completeness = this.parser.calculateCompleteness(item.data);

      return {
        ...item,
        data: {
          ...item.data,
          completeness
        }
      };
    });
  }

  /**
   * Step 7: 우선순위 정렬
   */
  sortByPriority(data) {
    // 성공한 항목만 정렬
    const successful = data.filter(item => item.success);
    const failed = data.filter(item => !item.success);

    successful.sort((a, b) => {
      // 1. 현재 키워드 보유 여부
      const aHasKeywords = a.data.currentKeywords?.length > 0 ? 1 : 0;
      const bHasKeywords = b.data.currentKeywords?.length > 0 ? 1 : 0;
      if (aHasKeywords !== bHasKeywords) return bHasKeywords - aHasKeywords;

      // 2. 완성도 높은 순
      const aScore = a.data.completeness?.score || 0;
      const bScore = b.data.completeness?.score || 0;
      if (aScore !== bScore) return bScore - aScore;

      // 3. 리뷰 많은 순
      const aReviews = a.data.reviews?.stats?.total || 0;
      const bReviews = b.data.reviews?.stats?.total || 0;
      return bReviews - aReviews;
    });

    return {
      total: data.length,
      successful: successful.length,
      failed: failed.length,
      places: [...successful, ...failed]
    };
  }

  /**
   * Step 8: 결과 저장
   */
  async saveResults(results) {
    await fs.mkdir(this.outputDir, { recursive: true });

    // 1. 전체 데이터
    await fs.writeFile(
      path.join(this.outputDir, 'data_collected_l1.json'),
      JSON.stringify(results, null, 2),
      'utf-8'
    );

    // 2. 키워드 요소만 추출
    const keywordElements = results.places
      .filter(p => p.success)
      .map(p => ({
        placeId: p.placeId,
        name: p.data.basic?.name,
        keywords: p.data.keywordElements
      }));

    await fs.writeFile(
      path.join(this.outputDir, 'keyword_elements_l1.json'),
      JSON.stringify(keywordElements, null, 2),
      'utf-8'
    );

    // 3. 현재 키워드 분석
    const keywordAnalysis = results.places
      .filter(p => p.success && p.data.currentKeywords?.length > 0)
      .map(p => ({
        placeId: p.placeId,
        name: p.data.basic?.name,
        currentKeywords: p.data.currentKeywords,
        completeness: p.data.completeness
      }));

    await fs.writeFile(
      path.join(this.outputDir, 'current_keywords_l1.json'),
      JSON.stringify(keywordAnalysis, null, 2),
      'utf-8'
    );

    logger.info(`Results saved to ${this.outputDir}`);
  }
}
```

---

## 6. 데이터 스키마 (가이드북 통합)

### 6.1 최종 출력 스키마
```json
{
  "placeId": "1768171911",

  "basic": {
    "id": "1768171911",
    "name": "카페 이름",
    "category": "카페",
    "subCategory": "커피전문점",
    "address": "서울특별시 강남구 역삼동 123-45",
    "phone": "02-1234-5678",
    "rating": 4.5,
    "businessHours": {
      "weekday": "10:00 - 22:00",
      "weekend": "11:00 - 23:00",
      "holiday": "휴무"
    },
    "description": "1200~2000자 소개문..."
  },

  "location": {
    "raw": "서울특별시 강남구 역삼동 123-45 (강남역 2번출구 앞)",
    "city": "서울특별시",
    "district": "강남구",
    "dong": "역삼동",
    "station": "강남역",
    "building": null,
    "normalized": {
      "city": "서울",
      "district": "강남",
      "dong": "역삼"
    }
  },

  "menus": [
    {
      "id": "menu_001",
      "name": "아메리카노",
      "price": 4500,
      "priceRange": null,
      "description": "신선한 원두로 만든 아메리카노",
      "image": "https://...",
      "isRecommended": true,
      "tags": ["시그니처", "베스트"]
    }
  ],

  "reviews": {
    "stats": {
      "total": 1234,
      "textReviewCount": 567,
      "visitReviewCount": 89,
      "averageRating": 4.5
    },
    "blogReviews": [
      {
        "id": "review_001",
        "author": "블로거명",
        "date": "2025-01-10",
        "content": "1500자 이상 전문...",
        "url": "https://blog.naver.com/...",
        "hashtags": ["#맛집", "#데이트", "#분위기좋은"],
        "hasReceipt": true,
        "images": ["..."]
      }
    ],
    "summary": [
      "커피가 정말 맛있어요",
      "분위기 좋고 조용해요",
      "주차가 편리합니다"
    ]
  },

  "images": {
    "total": 45,
    "highQuality": 40,
    "categorized": {
      "menu": 15,
      "interior": 10,
      "food": 12,
      "exterior": 5,
      "service": 3
    },
    "images": [
      {
        "url": "https://...",
        "description": "아메리카노",
        "category": "menu",
        "width": 1920,
        "height": 1080,
        "isHighQuality": true
      }
    ]
  },

  "facilities": [
    {
      "name": "WiFi",
      "icon": null,
      "available": true
    },
    {
      "name": "주차",
      "icon": null,
      "available": true
    }
  ],

  "payments": ["카드", "네이버페이", "제로페이"],

  "parking": "주차 가능 (5대)",

  "keywordElements": {
    "core": ["카페", "커피전문점"],
    "location": [
      "서울 강남",
      "강남 역삼",
      "역삼",
      "강남역",
      "강남역 맛집",
      "강남역 카페",
      "역삼 카페"
    ],
    "menu": [
      "아메리카노",
      "라떼",
      "5000원대",
      "평균 5천원대"
    ],
    "attribute": [
      "WiFi",
      "주차가능",
      "카드",
      "네이버페이"
    ],
    "sentiment": [
      "분위기좋은",
      "데이트하기좋은",
      "조용한",
      "친절한"
    ]
  },

  "completeness": {
    "score": 92,
    "grade": "HIGH",
    "breakdown": {
      "basic": 20,
      "menus": 18,
      "reviews": 23,
      "images": 14,
      "facilities": 9,
      "keywords": 0,
      "manual": 0
    },
    "timestamp": "2025-01-14T08:30:15.123Z"
  },

  "currentKeywords": [],
  "manualNotes": null,

  "crawledAt": "2025-01-14T08:30:15.123Z"
}
```

---

## 7. 구현 우선순위

### Phase 1: 핵심 크롤링 강화 (Week 1)
**목표**: Apollo State 파싱 완성

- [ ] PlaceCrawler._crawlPlaceInternal() 완전 구현
- [ ] Apollo State 파싱 로직 통합 (V1)
- [ ] 메뉴 추출 (_extractMenusFromApollo)
- [ ] 블로그 리뷰 전문 추출 (_extractBlogReviewsFromApollo)
- [ ] 이미지 자동 분류 (_extractAndClassifyImages)
- [ ] 통합 테스트 작성

**완료 기준**:
```bash
npm test -- PlaceCrawler.test.js  # 모든 테스트 통과
node test-crawl.js 1768171911     # 실제 크롤링 성공
```

### Phase 2: 파서 강화 (Week 2)
**목표**: 지역 파싱 및 키워드 분류

- [ ] AddressParser 구현 및 테스트
- [ ] KeywordClassifier 구현 및 테스트
- [ ] DataParser 완성도 평가 로직 업데이트 (115점)
- [ ] 통합 테스트

**완료 기준**:
```javascript
// 출력 예시
{
  location: { city: "서울", district: "강남구", ... },
  keywordElements: {
    core: [...],
    location: [...],
    menu: [...],
    attribute: [...],
    sentiment: [...]
  },
  completeness: { score: 92, grade: "HIGH", ... }
}
```

### Phase 3: L1 파이프라인 완성 (Week 3)
**목표**: 8단계 프로세스 완전 구현

- [ ] L1Processor 8단계 모두 구현
- [ ] 데이터 통합 로직
- [ ] 우선순위 정렬
- [ ] 결과 저장 (3개 JSON 파일)
- [ ] E2E 테스트

**완료 기준**:
```bash
npm run l1  # 전체 파이프라인 성공
ls data/l1-output/  # 3개 파일 생성 확인
```

### Phase 4: GUI 연동 (Week 4)
**목표**: 실시간 GUI에서 L1 파이프라인 실행

- [ ] GUI Server API 업데이트
- [ ] SSE 이벤트 연동
- [ ] L1 결과 탭 업데이트
- [ ] 통계 대시보드 구현

---

## 8. 테스트 전략

### 8.1 단위 테스트
```javascript
// tests/unit/PlaceCrawler.test.js
describe('PlaceCrawler - Apollo State', () => {
  test('should extract menus from Apollo State', () => {
    const apolloState = mockApolloState;
    const menus = crawler._extractMenusFromApollo(apolloState, '1768171911');

    expect(menus.length).toBeGreaterThan(0);
    expect(menus[0]).toHaveProperty('name');
    expect(menus[0]).toHaveProperty('price');
  });

  test('should extract blog reviews (1500+ chars)', () => {
    const reviews = crawler._extractBlogReviewsFromApollo(apolloState, '1768171911');

    expect(reviews.length).toBeLessThanOrEqual(10);
    expect(reviews[0].content.length).toBeGreaterThanOrEqual(1500);
    expect(reviews[0].hashtags).toBeInstanceOf(Array);
  });
});

// tests/unit/AddressParser.test.js
describe('AddressParser', () => {
  const parser = new AddressParser();

  test('should parse full address', () => {
    const result = parser.parse('서울특별시 강남구 역삼동 123-45 (강남역 2번출구)');

    expect(result.city).toBe('서울특별시');
    expect(result.district).toBe('강남구');
    expect(result.dong).toBe('역삼동');
    expect(result.station).toBe('강남역');
  });
});

// tests/unit/KeywordClassifier.test.js
describe('KeywordClassifier', () => {
  const classifier = new KeywordClassifier();

  test('should classify 5 keyword categories', () => {
    const result = classifier.classify(mockPlaceData);

    expect(result).toHaveProperty('core');
    expect(result).toHaveProperty('location');
    expect(result).toHaveProperty('menu');
    expect(result).toHaveProperty('attribute');
    expect(result).toHaveProperty('sentiment');

    expect(result.location.length).toBeGreaterThan(0);
  });
});
```

### 8.2 통합 테스트
```javascript
// tests/integration/l1-pipeline.test.js
describe('L1 Pipeline E2E', () => {
  test('should complete full 8-step process', async () => {
    const processor = new L1Processor(config);
    const result = await processor.process(['1768171911']);

    expect(result.successful).toBe(1);
    expect(result.places[0].data).toHaveProperty('location');
    expect(result.places[0].data).toHaveProperty('keywordElements');
    expect(result.places[0].data).toHaveProperty('completeness');
    expect(result.places[0].data.completeness.score).toBeGreaterThan(0);
  });
});
```

### 8.3 Mock 데이터
```javascript
// tests/mocks/apollo-state.mock.js
export const mockApolloState = {
  "Place:1768171911": {
    id: "1768171911",
    name: "테스트 카페",
    category: "카페",
    roadAddress: "서울특별시 강남구 역삼동 123-45",
    phone: "02-1234-5678",
    // ...
  },
  "Menu:menu_001": {
    id: "menu_001",
    name: "아메리카노",
    price: "4,500원",
    description: "신선한 원두",
    imageUrl: "https://...",
    isRecommended: true
  },
  "BlogReview:review_001": {
    id: "review_001",
    author: "블로거",
    content: "1500자 이상의 리뷰 내용...".repeat(100),
    createdAt: "2025-01-10",
    url: "https://blog.naver.com/...",
    hasReceiptImage: true
  }
  // ...
};
```

---

## 9. 실행 체크리스트

### 개발자용 체크리스트
```markdown
## Phase 1: 핵심 크롤링
- [ ] PlaceCrawler._crawlPlaceInternal() 선택자 업데이트
- [ ] _extractMenusFromApollo() 구현
- [ ] _extractBlogReviewsFromApollo() 구현
- [ ] _extractAndClassifyImages() 구현
- [ ] _extractFacilities() 구현
- [ ] _extractPayments() 구현
- [ ] 단위 테스트 작성 (PlaceCrawler.test.js)
- [ ] 실제 크롤링 테스트 (node test-crawl.js)

## Phase 2: 파서 강화
- [ ] AddressParser.js 생성 및 구현
- [ ] KeywordClassifier.js 생성 및 구현
- [ ] DataParser.calculateCompleteness() 업데이트 (115점)
- [ ] 단위 테스트 작성 (AddressParser.test.js, KeywordClassifier.test.js)

## Phase 3: L1 파이프라인
- [ ] L1Processor.scanSources() 구현
- [ ] L1Processor.integrateData() 구현
- [ ] L1Processor.parseLocation() 구현
- [ ] L1Processor.classifyKeywords() 구현
- [ ] L1Processor.evaluateCompleteness() 구현
- [ ] L1Processor.sortByPriority() 구현
- [ ] L1Processor.saveResults() 구현 (3개 JSON)
- [ ] 통합 테스트 작성 (l1-pipeline.test.js)

## Phase 4: GUI 연동
- [ ] GUI Server API 업데이트
- [ ] SSE 이벤트 연동
- [ ] L1 결과 탭 데이터 바인딩
- [ ] 통계 대시보드 구현
```

---

## 10. 문서 참조

### 가이드북 참조 매핑
| 가이드북 섹션 | 구현 위치 |
|-------------|----------|
| **A-1. 3대 축 구조** | DataParser.calculateCompleteness() |
| **B-3. NAP 관리** | PlaceCrawler (basic 정보) |
| **C-3. 키워드 자동화 구조** | KeywordClassifier |
| **D-1. 소개문** | PlaceCrawler (description) |
| **D-2. 소식** | PlaceCrawler (posts) |
| **D-3. 시각콘텐츠** | PlaceCrawler._extractAndClassifyImages() |
| **E-2. 리뷰 전략** | PlaceCrawler._extractBlogReviewsFromApollo() |

### V1 기능 통합
- Apollo State 파싱 → PlaceCrawler._crawlPlaceInternal()
- 블로그 리뷰 수집 → _extractBlogReviewsFromApollo()
- 이미지 분류 → _extractAndClassifyImages()
- 8단계 프로세스 → L1Processor.process()

---

## 11. 다음 단계 (L2/L3)

### L2: AI 분석 (가이드북 기반)
```javascript
// 입력: L1 결과
{
  keywordElements: { core, location, menu, attribute, sentiment },
  completeness: { score: 92, grade: "HIGH" }
}

// AI 분석 (Claude API)
- tone/time/meta 자동 추출
- 소개문 생성 (1200~2000자)
- 소식 주제 추천
- 블로그 가이드 생성

// 출력: L2 결과
{
  intro: { text: "...", keywords: [...] },
  newsTopics: [...],
  blogGuide: { ... }
}
```

### L3: 최종 전략
```javascript
// 입력: L1 + L2
// 출력: SEO 전략 보고서
{
  relevance: { category, keywords, content },
  popularity: { reviewStrategy, postingPlan },
  trust: { imageStrategy, replyGuidelines }
}
```

---

**문서 작성**: 2025-11-14
**작성자**: Claude (42ment Project)
**버전**: 2.1.0
**다음 업데이트**: Phase 1 완료 후
