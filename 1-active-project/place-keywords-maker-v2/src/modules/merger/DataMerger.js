/**
 * DataMerger - Apollo State + GraphQL 데이터 병합
 * v0.4: 다중 소스 데이터 통합
 */

import { logger } from '../../utils/logger.js';

export class DataMerger {
  constructor(config = {}) {
    this.config = {
      priorityGraphQL: config.priorityGraphQL || ['votedKeywords', 'visitPurposes'],
      priorityApollo: config.priorityApollo || ['basic', 'menus', 'images'],
    };
  }

  /**
   * Apollo State와 GraphQL 데이터 병합
   * @param {Object} apolloData - Apollo State에서 추출한 데이터
   * @param {Object} graphqlData - GraphQL에서 추출한 데이터
   * @param {Object} rankingData - 랭킹 피처 데이터
   * @returns {Object} 병합된 데이터
   */
  merge(apolloData, graphqlData = {}, rankingData = {}) {
    logger.debug('Merging data from multiple sources');

    const merged = {
      // 기본 정보 (Apollo 우선)
      placeId: apolloData.placeId,
      crawledAt: apolloData.crawledAt || new Date().toISOString(),

      // 기존 필드 유지 (Apollo)
      basic: apolloData.basic || {},
      menus: apolloData.menus || [],
      images: apolloData.images || [],
      facilities: apolloData.facilities || [],
      payments: apolloData.payments || [],

      // 리뷰 데이터 병합
      reviews: this._mergeReviews(apolloData.reviews, graphqlData.reviewStats),

      // 랭킹 피처 (신규)
      ranking: {
        categoryCodeList: rankingData.categoryCodeList || [],
        gdid: rankingData.gdid || null,
        votedKeywords: this._selectPriority(
          graphqlData.votedKeywords,
          rankingData.votedKeywords,
          'votedKeywords'
        ),
        visitCategories: this._selectPriority(
          graphqlData.visitPurposes,
          rankingData.visitCategories,
          'visitCategories'
        ),
      },

      // 리뷰 통계 (신규)
      reviewStats: {
        visitor: rankingData.visitorReviewStats || {},
        blogCafe: rankingData.blogCafeReviewCount || 0,
      },

      // 주문 옵션 (신규)
      orderOptions: rankingData.orderOptions || {
        isTableOrder: false,
        pickup: false,
        delivery: false,
        bookingBusinessId: null,
        options: [],
      },

      // 운영 시간 상세 (신규)
      operationTime: rankingData.operationTime || {
        breakTime: [],
        lastOrder: null,
        holiday: null,
      },
    };

    // 완성도 계산
    merged.completeness = this._calculateCompleteness(merged);

    logger.info(`Data merged successfully. Completeness: ${merged.completeness}%`);
    return merged;
  }

  /**
   * 리뷰 데이터 병합
   * @private
   */
  _mergeReviews(apolloReviews = {}, graphqlStats = null) {
    const merged = {
      stats: apolloReviews.stats || { total: 0, visitor: 0, blog: 0, average: 0 },
      blogReviews: apolloReviews.blogReviews || [],
      summary: apolloReviews.summary || { keywords: [], positive: [], negative: [] },
    };

    // GraphQL 통계로 보강
    if (graphqlStats) {
      merged.stats = {
        total: graphqlStats.total || merged.stats.total,
        visitor: graphqlStats.visitor || merged.stats.visitor,
        blog: graphqlStats.blog || merged.stats.blog,
        average: graphqlStats.average || merged.stats.average,
        distribution: graphqlStats.distribution || [],
      };
    }

    return merged;
  }

  /**
   * 우선순위에 따른 데이터 선택
   * @private
   */
  _selectPriority(primary, secondary, fieldName) {
    // Primary (보통 GraphQL)가 있으면 우선
    if (primary && Array.isArray(primary) && primary.length > 0) {
      logger.debug(`Using primary source for ${fieldName}: ${primary.length} items`);
      return primary;
    }

    // Secondary (보통 Apollo)로 fallback
    if (secondary && Array.isArray(secondary) && secondary.length > 0) {
      logger.debug(`Using secondary source for ${fieldName}: ${secondary.length} items`);
      return secondary;
    }

    return [];
  }

  /**
   * 데이터 완성도 계산
   * @private
   */
  _calculateCompleteness(data) {
    const weights = {
      basic: 15,
      menus: 10,
      images: 10,
      reviews: 15,
      ranking: 20,
      reviewStats: 10,
      orderOptions: 10,
      operationTime: 10,
    };

    let score = 0;

    // 기본 정보
    if (data.basic?.name && data.basic?.category && data.basic?.address) {
      score += weights.basic;
    }

    // 메뉴
    if (data.menus && data.menus.length > 0) {
      score += weights.menus;
    }

    // 이미지
    if (data.images && data.images.length >= 5) {
      score += weights.images;
    }

    // 리뷰
    if (data.reviews?.stats?.total > 10) {
      score += weights.reviews;
    }

    // 랭킹 피처
    const rankingComplete =
      (data.ranking?.categoryCodeList?.length > 0 ? 5 : 0) +
      (data.ranking?.gdid?.isValid ? 5 : 0) +
      (data.ranking?.votedKeywords?.length > 0 ? 5 : 0) +
      (data.ranking?.visitCategories?.length > 0 ? 5 : 0);
    score += rankingComplete;

    // 리뷰 통계
    if (data.reviewStats?.visitor?.total > 0) {
      score += weights.reviewStats;
    }

    // 주문 옵션
    const orderOptionsSet = data.orderOptions?.isTableOrder ||
                           data.orderOptions?.pickup ||
                           data.orderOptions?.bookingBusinessId;
    if (orderOptionsSet) {
      score += weights.orderOptions;
    }

    // 운영 시간
    if (data.operationTime?.breakTime?.length > 0 || data.operationTime?.lastOrder) {
      score += weights.operationTime;
    }

    return Math.min(score, 100);
  }

  /**
   * 데이터 검증
   * @param {Object} data - 검증할 데이터
   * @returns {Object} 검증 결과
   */
  validate(data) {
    const errors = [];
    const warnings = [];

    // 필수 필드 검증
    if (!data.placeId) {
      errors.push('Missing required field: placeId');
    }

    if (!data.basic?.name) {
      errors.push('Missing required field: basic.name');
    }

    // 경고
    if (!data.ranking?.gdid?.isValid) {
      warnings.push('Invalid or missing gdid');
    }

    if (data.ranking?.votedKeywords?.length === 0) {
      warnings.push('No votedKeywords found');
    }

    if (data.menus?.length === 0) {
      warnings.push('No menus found');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
