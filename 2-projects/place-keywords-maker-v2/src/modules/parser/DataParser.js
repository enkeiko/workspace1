/**
 * DataParser - 크롤링된 데이터 파싱 및 정규화
 * V2.1: 115점 만점 완성도 평가 시스템
 */

import { logger } from '../../utils/logger.js';

export class DataParser {
  constructor(config = {}) {
    this.config = {
      minReviewLength: config.minReviewLength || 10,
      maxKeywordsPerCategory: config.maxKeywordsPerCategory || 5,
      // V2.1: 115점 만점 완성도 평가 기준
      completenessWeights: config.completenessWeights || {
        basicInfo: 20,      // 기본 정보
        menu: 20,           // 메뉴
        reviews: 25,        // 리뷰
        images: 15,         // 이미지
        facilities: 10,     // 편의시설
        keywords: 15,       // 키워드
        manualData: 10      // 수동 데이터
      },
    };
  }

  /**
   * 매장 데이터 파싱
   * @param {Object} rawData - 크롤링된 원본 데이터
   * @returns {Object} 파싱된 데이터
   */
  parse(rawData) {
    try {
      return {
        id: rawData.id,
        basicInfo: this._parseBasicInfo(rawData),
        menu: this._parseMenu(rawData.menu),
        photos: this._parsePhotos(rawData.photos),
        reviews: this._parseReviews(rawData.reviews),
        hours: this._parseHours(rawData.hours),
        description: rawData.description || '',
      };
    } catch (error) {
      logger.error('Failed to parse data:', error);
      throw error;
    }
  }

  /**
   * 기본 정보 파싱
   * @private
   */
  _parseBasicInfo(rawData) {
    return {
      name: this._sanitize(rawData.name),
      category: this._sanitize(rawData.category),
      address: this._sanitize(rawData.address),
      phone: this._sanitize(rawData.phone),
    };
  }

  /**
   * 메뉴 데이터 파싱
   * @private
   */
  _parseMenu(menuData) {
    if (!menuData || !Array.isArray(menuData)) {
      return [];
    }

    return menuData.map(item => ({
      name: this._sanitize(item.name),
      price: this._parsePrice(item.price),
      description: this._sanitize(item.description),
    }));
  }

  /**
   * 사진 데이터 파싱
   * @private
   */
  _parsePhotos(photosData) {
    if (!photosData || !Array.isArray(photosData)) {
      return [];
    }

    return photosData.map(photo => ({
      url: photo.url,
      category: photo.category || 'general',
    }));
  }

  /**
   * 리뷰 데이터 파싱
   * @private
   */
  _parseReviews(reviewsData) {
    if (!reviewsData || !Array.isArray(reviewsData)) {
      return [];
    }

    return reviewsData
      .filter(review => review.text && review.text.length >= this.config.minReviewLength)
      .map(review => ({
        text: this._sanitize(review.text),
        rating: review.rating || 0,
        date: review.date || new Date().toISOString(),
      }));
  }

  /**
   * 영업 시간 파싱
   * @private
   */
  _parseHours(hoursData) {
    if (!hoursData) {
      return null;
    }

    return {
      weekday: hoursData.weekday || '',
      weekend: hoursData.weekend || '',
      holiday: hoursData.holiday || '',
    };
  }

  /**
   * 가격 문자열 파싱
   * @private
   */
  _parsePrice(priceStr) {
    if (!priceStr) return null;

    const cleaned = priceStr.replace(/[^0-9]/g, '');
    return cleaned ? parseInt(cleaned, 10) : null;
  }

  /**
   * 문자열 정리 (HTML 태그, 특수문자 제거)
   * @private
   */
  _sanitize(str) {
    if (!str) return '';

    return str
      .replace(/<[^>]*>/g, '') // HTML 태그 제거
      .replace(/\s+/g, ' ')     // 연속 공백 제거
      .trim();
  }

  /**
   * 데이터 완성도 계산 (V2.1: 115점 만점)
   * @param {Object} placeData - 크롤링된 매장 데이터 (PlaceCrawler 출력)
   * @param {Object} keywords - KeywordClassifier 출력
   * @param {Object} manualData - 수동 입력 데이터 (선택)
   * @returns {Object} 완성도 평가 결과
   */
  calculateCompleteness(placeData, keywords = null, manualData = null) {
    const weights = this.config.completenessWeights;
    const scores = {};

    // 1. 기본 정보 (20점)
    scores.basicInfo = this._scoreBasicInfo(placeData, weights.basicInfo);

    // 2. 메뉴 (20점)
    scores.menu = this._scoreMenu(placeData, weights.menu);

    // 3. 리뷰 (25점)
    scores.reviews = this._scoreReviews(placeData, weights.reviews);

    // 4. 이미지 (15점)
    scores.images = this._scoreImages(placeData, weights.images);

    // 5. 편의시설 (10점)
    scores.facilities = this._scoreFacilities(placeData, weights.facilities);

    // 6. 키워드 (15점)
    scores.keywords = keywords ? this._scoreKeywords(keywords, weights.keywords) : 0;

    // 7. 수동 데이터 (10점)
    scores.manualData = manualData ? this._scoreManualData(manualData, weights.manualData) : 0;

    // 총점 계산
    const totalScore = Object.values(scores).reduce((sum, s) => sum + s, 0);

    // 등급 분류
    let grade = 'LOW';
    if (totalScore >= 90) grade = 'HIGH';
    else if (totalScore >= 60) grade = 'MEDIUM';

    return {
      totalScore: Math.round(totalScore * 10) / 10,
      maxScore: 115,
      grade,
      breakdown: scores,
      // 상세 분석
      details: {
        basicInfo: this._getBasicInfoDetails(placeData),
        menu: this._getMenuDetails(placeData),
        reviews: this._getReviewDetails(placeData),
        images: this._getImageDetails(placeData),
        facilities: this._getFacilitiesDetails(placeData),
        keywords: keywords ? this._getKeywordDetails(keywords) : null,
        manualData: manualData ? this._getManualDataDetails(manualData) : null
      }
    };
  }

  /**
   * 기본 정보 점수 (20점)
   * ID, 이름, 카테고리, 주소, 전화번호, 소개문(1200자+)
   * @private
   */
  _scoreBasicInfo(placeData, maxScore) {
    let score = 0;
    const basic = placeData.basic || {};

    // ID (2점)
    if (basic.id || placeData.placeId) score += maxScore * 0.1;

    // 이름 (3점)
    if (basic.name) score += maxScore * 0.15;

    // 카테고리 (3점)
    if (basic.category) score += maxScore * 0.15;

    // 주소 (4점)
    if (basic.address?.road || basic.address?.jibun) score += maxScore * 0.2;

    // 전화번호 (3점)
    if (basic.phone) score += maxScore * 0.15;

    // 소개문 1200자+ (5점)
    const descLength = (basic.description || '').length;
    if (descLength >= 1200) {
      score += maxScore * 0.25;
    } else if (descLength >= 600) {
      score += maxScore * 0.15;
    } else if (descLength >= 200) {
      score += maxScore * 0.1;
    }

    return Math.min(score, maxScore);
  }

  /**
   * 메뉴 점수 (20점)
   * 10개 이상 + 가격 정보 80% + 이미지 50% + 추천 메뉴
   * @private
   */
  _scoreMenu(placeData, maxScore) {
    let score = 0;
    const menus = placeData.menus || [];

    if (menus.length === 0) return 0;

    // 메뉴 개수 10개 이상 (8점)
    if (menus.length >= 10) {
      score += maxScore * 0.4;
    } else {
      score += maxScore * 0.4 * (menus.length / 10);
    }

    // 가격 정보 80% (6점)
    const withPrice = menus.filter(m => m.price !== null && m.price > 0).length;
    const priceRatio = menus.length > 0 ? withPrice / menus.length : 0;
    if (priceRatio >= 0.8) {
      score += maxScore * 0.3;
    } else {
      score += maxScore * 0.3 * (priceRatio / 0.8);
    }

    // 이미지 50% (4점)
    const withImage = menus.filter(m => m.image).length;
    const imageRatio = menus.length > 0 ? withImage / menus.length : 0;
    if (imageRatio >= 0.5) {
      score += maxScore * 0.2;
    } else {
      score += maxScore * 0.2 * (imageRatio / 0.5);
    }

    // 추천 메뉴 존재 (2점)
    const hasRecommended = menus.some(m => m.isRecommended || m.isPopular);
    if (hasRecommended) {
      score += maxScore * 0.1;
    }

    return Math.min(score, maxScore);
  }

  /**
   * 리뷰 점수 (25점)
   * 총 100개 이상 + 텍스트 리뷰 50개 + 블로그 리뷰 5개(1500자+) + 영수증 인증 10개
   * @private
   */
  _scoreReviews(placeData, maxScore) {
    let score = 0;
    const reviews = placeData.reviews || {};
    const stats = reviews.stats || {};
    const blogReviews = reviews.blogReviews || [];

    // 총 리뷰 100개 이상 (10점)
    const totalCount = stats.total || 0;
    if (totalCount >= 100) {
      score += maxScore * 0.4;
    } else {
      score += maxScore * 0.4 * (totalCount / 100);
    }

    // 텍스트 리뷰 50개 (6점)
    const visitorCount = stats.visitor || 0;
    if (visitorCount >= 50) {
      score += maxScore * 0.24;
    } else {
      score += maxScore * 0.24 * (visitorCount / 50);
    }

    // 블로그 리뷰 5개(1500자+) (6점)
    const longBlogReviews = blogReviews.filter(r => r.wordCount >= 1500).length;
    if (longBlogReviews >= 5) {
      score += maxScore * 0.24;
    } else {
      score += maxScore * 0.24 * (longBlogReviews / 5);
    }

    // 영수증 인증 10개 (3점) - 현재 데이터 없으면 0점
    // TODO: 영수증 인증 데이터 추가 시 구현
    // const receiptCount = stats.receipt || 0;
    // if (receiptCount >= 10) {
    //   score += maxScore * 0.12;
    // }

    return Math.min(score, maxScore);
  }

  /**
   * 이미지 점수 (15점)
   * 20개 이상 + 고해상도(1200×800) + 5가지 카테고리 분류
   * @private
   */
  _scoreImages(placeData, maxScore) {
    let score = 0;
    const images = placeData.images || [];

    if (images.length === 0) return 0;

    // 이미지 20개 이상 (7점)
    if (images.length >= 20) {
      score += maxScore * 0.47;
    } else {
      score += maxScore * 0.47 * (images.length / 20);
    }

    // 고해상도(1200×800) 이미지 비율 (5점)
    const highResCount = images.filter(img =>
      img.width >= 1200 && img.height >= 800
    ).length;
    const highResRatio = images.length > 0 ? highResCount / images.length : 0;
    score += maxScore * 0.33 * highResRatio;

    // 5가지 카테고리 분류 (3점)
    const categories = new Set(images.map(img => img.category).filter(Boolean));
    const categoryCount = categories.size;
    if (categoryCount >= 5) {
      score += maxScore * 0.2;
    } else {
      score += maxScore * 0.2 * (categoryCount / 5);
    }

    return Math.min(score, maxScore);
  }

  /**
   * 편의시설 점수 (10점)
   * 편의시설 5개 + 결제수단 3개 + 주차 정보
   * @private
   */
  _scoreFacilities(placeData, maxScore) {
    let score = 0;
    const facilities = placeData.facilities || [];
    const payments = placeData.payments || [];

    // 편의시설 5개 (5점)
    const facilityCount = facilities.filter(f => f.available !== false).length;
    if (facilityCount >= 5) {
      score += maxScore * 0.5;
    } else {
      score += maxScore * 0.5 * (facilityCount / 5);
    }

    // 결제수단 3개 (3점)
    if (payments.length >= 3) {
      score += maxScore * 0.3;
    } else {
      score += maxScore * 0.3 * (payments.length / 3);
    }

    // 주차 정보 (2점)
    const hasParking = facilities.some(f =>
      f.name && (f.name.includes('주차') || f.name.includes('parking'))
    );
    if (hasParking) {
      score += maxScore * 0.2;
    }

    return Math.min(score, maxScore);
  }

  /**
   * 키워드 점수 (15점)
   * 5가지 키워드 요소(core/location/menu/attribute/sentiment)
   * @private
   */
  _scoreKeywords(keywords, maxScore) {
    let score = 0;

    const categories = ['core', 'location', 'menu', 'attribute', 'sentiment'];
    const scorePerCategory = maxScore / categories.length; // 3점씩

    categories.forEach(category => {
      const keywordList = keywords[category] || [];
      if (keywordList.length > 0) {
        // 최소 3개 이상이면 만점
        if (keywordList.length >= 3) {
          score += scorePerCategory;
        } else {
          score += scorePerCategory * (keywordList.length / 3);
        }
      }
    });

    return Math.min(score, maxScore);
  }

  /**
   * 수동 데이터 점수 (10점)
   * 현재 키워드 보유 + 수동 메모
   * @private
   */
  _scoreManualData(manualData, maxScore) {
    let score = 0;

    // 현재 키워드 보유 (6점)
    if (manualData.currentKeywords && manualData.currentKeywords.length > 0) {
      score += maxScore * 0.6;
    }

    // 수동 메모 (4점)
    if (manualData.notes && manualData.notes.trim().length >= 50) {
      score += maxScore * 0.4;
    } else if (manualData.notes && manualData.notes.trim().length > 0) {
      score += maxScore * 0.2;
    }

    return Math.min(score, maxScore);
  }

  // 상세 정보 getter 메서드들
  _getBasicInfoDetails(placeData) {
    const basic = placeData.basic || {};
    return {
      hasId: !!(basic.id || placeData.placeId),
      hasName: !!basic.name,
      hasCategory: !!basic.category,
      hasAddress: !!(basic.address?.road || basic.address?.jibun),
      hasPhone: !!basic.phone,
      descriptionLength: (basic.description || '').length
    };
  }

  _getMenuDetails(placeData) {
    const menus = placeData.menus || [];
    return {
      count: menus.length,
      withPrice: menus.filter(m => m.price).length,
      withImage: menus.filter(m => m.image).length,
      recommendedCount: menus.filter(m => m.isRecommended).length
    };
  }

  _getReviewDetails(placeData) {
    const reviews = placeData.reviews || {};
    const stats = reviews.stats || {};
    const blogReviews = reviews.blogReviews || [];

    return {
      total: stats.total || 0,
      visitor: stats.visitor || 0,
      blog: stats.blog || 0,
      longBlogReviews: blogReviews.filter(r => r.wordCount >= 1500).length
    };
  }

  _getImageDetails(placeData) {
    const images = placeData.images || [];
    const categories = new Set(images.map(img => img.category).filter(Boolean));

    return {
      count: images.length,
      highResCount: images.filter(img => img.width >= 1200 && img.height >= 800).length,
      categories: Array.from(categories)
    };
  }

  _getFacilitiesDetails(placeData) {
    const facilities = placeData.facilities || [];
    const payments = placeData.payments || [];

    return {
      facilityCount: facilities.filter(f => f.available !== false).length,
      paymentCount: payments.length,
      hasParking: facilities.some(f => f.name && (f.name.includes('주차') || f.name.includes('parking')))
    };
  }

  _getKeywordDetails(keywords) {
    return {
      core: keywords.core?.length || 0,
      location: keywords.location?.length || 0,
      menu: keywords.menu?.length || 0,
      attribute: keywords.attribute?.length || 0,
      sentiment: keywords.sentiment?.length || 0
    };
  }

  _getManualDataDetails(manualData) {
    return {
      hasCurrentKeywords: !!(manualData.currentKeywords && manualData.currentKeywords.length > 0),
      notesLength: (manualData.notes || '').length
    };
  }
}
