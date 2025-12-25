/**
 * KeywordClassifier - 키워드 5가지 자동 분류
 * V2.1: 가이드북 v1.1 기반 core/location/menu/attribute/sentiment
 */

import { logger } from '../../utils/logger.js';

export class KeywordClassifier {
  constructor() {
    // Core 키워드 패턴 (업종/서비스)
    this.corePatterns = [
      // 음식점 업종
      '한식', '중식', '일식', '양식', '분식', '카페', '베이커리', '디저트',
      '치킨', '피자', '햄버거', '파스타', '스테이크', '초밥', '라멘',
      '맛집', '식당', '전문점', '뷔페', '바', '펜', '레스토랑',

      // 서비스업
      '헤어', '네일', '피부관리', '마사지', '스파', '요가', '필라테스',
      '병원', '약국', '안과', '치과', '한의원',
      '편의점', '마트', '슈퍼', '베이커리', '정육점',

      // 특징
      '24시간', '배달', '포장', '예약', '단체', '룸', '프라이빗', '오픈키친'
    ];

    // Attribute 패턴 (속성/분위기)
    this.attributePatterns = {
      atmosphere: ['분위기', '인테리어', '깔끔', '모던', '아늑', '감성', '힙한', '트렌디', '클래식', '빈티지', '럭셔리'],
      service: ['친절', '빠른', '신속', '정성', '푸짐', '깔끔', '위생', '서비스'],
      price: ['가성비', '합리적', '저렴', '가격', '비싼', '고급', '프리미엄'],
      quality: ['맛있는', '신선', '정통', '수제', '직접', '특제', '시그니처', '인기'],
      convenience: ['넓은', '주차', '단체석', '룸', '테라스', '야외', '포장', '배달', '예약']
    };

    // Sentiment 패턴 (감성)
    this.sentimentPatterns = {
      positive: ['맛있', '좋', '최고', '추천', '만족', '훌륭', '완벽', '감동', '다시', '재방문'],
      negative: ['별로', '실망', '아쉬', '불친절', '맛없', '비추', '후회']
    };

    // 불용어 (키워드에서 제외)
    this.stopWords = new Set([
      '이', '그', '저', '것', '수', '등', '및', '에', '를', '을', '이', '가',
      '은', '는', '의', '으로', '로', '에서', '있다', '없다', '하다', '되다',
      '있는', '없는', '한', '등등', '기타', 'the', 'a', 'an', 'and', 'or'
    ]);
  }

  /**
   * 전체 키워드 분류
   * @param {Object} placeData - 크롤링된 매장 데이터
   * @param {Object} addressParsed - AddressParser 결과
   * @returns {Object} 5가지 카테고리별 키워드
   */
  classify(placeData, addressParsed) {
    try {
      const result = {
        core: [],
        location: [],
        menu: [],
        attribute: [],
        sentiment: [],
        // 상세 분류
        _details: {
          attributeBreakdown: {
            atmosphere: [],
            service: [],
            price: [],
            quality: [],
            convenience: []
          },
          sentimentBreakdown: {
            positive: [],
            negative: []
          }
        }
      };

      // 1. Core 키워드 추출
      result.core = this._extractCoreKeywords(placeData);

      // 2. Location 키워드 (AddressParser 출력 활용)
      result.location = addressParsed?.locationKeywords || [];

      // 3. Menu 키워드 추출
      result.menu = this._extractMenuKeywords(placeData);

      // 4. Attribute 키워드 추출
      const attrResult = this._extractAttributeKeywords(placeData);
      result.attribute = attrResult.keywords;
      result._details.attributeBreakdown = attrResult.breakdown;

      // 5. Sentiment 키워드 추출
      const sentResult = this._extractSentimentKeywords(placeData);
      result.sentiment = sentResult.keywords;
      result._details.sentimentBreakdown = sentResult.breakdown;

      // 중복 제거 및 정렬 (빈도순)
      Object.keys(result).forEach(key => {
        if (Array.isArray(result[key])) {
          result[key] = this._deduplicateAndSort(result[key]);
        }
      });

      logger.debug(`Keywords classified: core(${result.core.length}), location(${result.location.length}), menu(${result.menu.length}), attribute(${result.attribute.length}), sentiment(${result.sentiment.length})`);
      return result;

    } catch (error) {
      logger.error('Keyword classification error:', error);
      return this._emptyResult();
    }
  }

  /**
   * Core 키워드 추출 (업종/서비스)
   * @private
   */
  _extractCoreKeywords(placeData) {
    const keywords = [];
    const sources = [
      placeData.basic?.category || '',
      placeData.basic?.name || '',
      placeData.basic?.description || ''
    ];

    const text = sources.join(' ');

    // 패턴 매칭
    this.corePatterns.forEach(pattern => {
      if (text.includes(pattern)) {
        keywords.push(pattern);
      }
    });

    // 카테고리 분해
    const category = placeData.basic?.category || '';
    if (category) {
      // "음식점 > 한식 > 고기/구이" → ["음식점", "한식", "고기", "구이"]
      const parts = category.split(/[>\/,]/).map(p => p.trim()).filter(p => p);
      keywords.push(...parts);
    }

    // 태그 추가
    if (placeData.basic?.tags) {
      keywords.push(...placeData.basic.tags);
    }

    return keywords;
  }

  /**
   * Menu 키워드 추출
   * @private
   */
  _extractMenuKeywords(placeData) {
    const keywords = [];

    if (!placeData.menus || placeData.menus.length === 0) {
      return keywords;
    }

    // 추천 메뉴 우선
    const recommendedMenus = placeData.menus.filter(m => m.isRecommended);
    const popularMenus = placeData.menus.filter(m => m.isPopular);
    const regularMenus = placeData.menus.filter(m => !m.isRecommended && !m.isPopular);

    // 메뉴명 추출 (최대 20개)
    const prioritizedMenus = [
      ...recommendedMenus.slice(0, 5),
      ...popularMenus.slice(0, 5),
      ...regularMenus.slice(0, 10)
    ];

    prioritizedMenus.forEach(menu => {
      if (menu.name) {
        // 메뉴명 정제 (괄호, 특수문자 제거)
        const cleaned = menu.name
          .replace(/\([^)]*\)/g, '')
          .replace(/[^\w가-힣\s]/g, '')
          .trim();

        if (cleaned && cleaned.length >= 2) {
          keywords.push(cleaned);
        }

        // 메뉴 설명에서 추출
        if (menu.description) {
          const descKeywords = this._extractKeywordsFromText(menu.description, 3);
          keywords.push(...descKeywords);
        }
      }
    });

    return keywords;
  }

  /**
   * Attribute 키워드 추출 (속성/분위기)
   * @private
   */
  _extractAttributeKeywords(placeData) {
    const breakdown = {
      atmosphere: [],
      service: [],
      price: [],
      quality: [],
      convenience: []
    };

    const sources = [
      placeData.basic?.description || '',
      ...((placeData.reviews?.summary?.positive || []).slice(0, 10)),
      ...((placeData.reviews?.summary?.keywords || []).slice(0, 10))
    ];

    const text = sources.join(' ');

    // 각 카테고리별 패턴 매칭
    Object.keys(this.attributePatterns).forEach(category => {
      this.attributePatterns[category].forEach(pattern => {
        if (text.includes(pattern)) {
          breakdown[category].push(pattern);
        }
      });
    });

    // 편의시설 → convenience
    if (placeData.facilities) {
      placeData.facilities.forEach(f => {
        if (f.available && f.name) {
          breakdown.convenience.push(f.name);
        }
      });
    }

    // 전체 키워드로 통합
    const allKeywords = Object.values(breakdown).flat();

    return {
      keywords: allKeywords,
      breakdown
    };
  }

  /**
   * Sentiment 키워드 추출 (감성)
   * @private
   */
  _extractSentimentKeywords(placeData) {
    const breakdown = {
      positive: [],
      negative: []
    };

    // 리뷰 요약에서 추출
    if (placeData.reviews?.summary) {
      const summary = placeData.reviews.summary;

      // 긍정 키워드
      if (summary.positive) {
        breakdown.positive.push(...summary.positive);
      }

      // 부정 키워드
      if (summary.negative) {
        breakdown.negative.push(...summary.negative);
      }
    }

    // 블로그 리뷰에서 추출 (상위 5개)
    if (placeData.reviews?.blogReviews) {
      placeData.reviews.blogReviews.slice(0, 5).forEach(review => {
        const content = review.content || '';

        // 긍정 패턴 매칭
        this.sentimentPatterns.positive.forEach(pattern => {
          if (content.includes(pattern)) {
            breakdown.positive.push(pattern);
          }
        });

        // 부정 패턴 매칭
        this.sentimentPatterns.negative.forEach(pattern => {
          if (content.includes(pattern)) {
            breakdown.negative.push(pattern);
          }
        });
      });
    }

    // 전체 키워드로 통합
    const allKeywords = [...breakdown.positive, ...breakdown.negative];

    return {
      keywords: allKeywords,
      breakdown
    };
  }

  /**
   * 텍스트에서 키워드 추출 (간단한 형태소 분석 대체)
   * @private
   */
  _extractKeywordsFromText(text, maxCount = 5) {
    if (!text) return [];

    // 공백/특수문자 기준 분리
    const words = text
      .replace(/[^\w가-힣\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 2)
      .filter(w => !this.stopWords.has(w));

    // 빈도 계산
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    // 빈도순 정렬
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxCount)
      .map(([word]) => word);
  }

  /**
   * 중복 제거 및 빈도순 정렬
   * @private
   */
  _deduplicateAndSort(keywords) {
    if (!keywords || keywords.length === 0) return [];

    // 빈도 계산
    const frequency = {};
    keywords.forEach(kw => {
      const normalized = String(kw).trim().toLowerCase();
      frequency[normalized] = (frequency[normalized] || 0) + 1;
    });

    // 빈도순 정렬 후 원본 형태로 복원
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .map(([kw]) => kw);
  }

  /**
   * 빈 결과 반환
   * @private
   */
  _emptyResult() {
    return {
      core: [],
      location: [],
      menu: [],
      attribute: [],
      sentiment: [],
      _details: {
        attributeBreakdown: {
          atmosphere: [],
          service: [],
          price: [],
          quality: [],
          convenience: []
        },
        sentimentBreakdown: {
          positive: [],
          negative: []
        }
      }
    };
  }

  /**
   * 키워드 통계 생성
   * @param {Object} classified - classify() 결과
   * @returns {Object} 통계
   */
  getStatistics(classified) {
    return {
      total: Object.values(classified)
        .filter(v => Array.isArray(v))
        .reduce((sum, arr) => sum + arr.length, 0),
      byCategory: {
        core: classified.core?.length || 0,
        location: classified.location?.length || 0,
        menu: classified.menu?.length || 0,
        attribute: classified.attribute?.length || 0,
        sentiment: classified.sentiment?.length || 0
      },
      attributeDetail: classified._details?.attributeBreakdown
        ? Object.entries(classified._details.attributeBreakdown).reduce((acc, [k, v]) => {
            acc[k] = v.length;
            return acc;
          }, {})
        : {},
      sentimentDetail: classified._details?.sentimentBreakdown
        ? {
            positive: classified._details.sentimentBreakdown.positive.length,
            negative: classified._details.sentimentBreakdown.negative.length
          }
        : { positive: 0, negative: 0 }
    };
  }
}
