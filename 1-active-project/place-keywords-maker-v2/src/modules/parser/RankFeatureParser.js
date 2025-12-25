/**
 * RankFeatureParser - 랭킹 피처 파싱
 * v0.4: 네이버 플레이스 랭킹 관련 데이터 추출
 */

import { logger } from '../../utils/logger.js';
import { GdidParser } from './GdidParser.js';

export class RankFeatureParser {
  constructor() {
    this.gdidParser = new GdidParser();
  }

  /**
   * Apollo State에서 랭킹 피처 추출
   * @param {Object} apolloState - Apollo State 객체
   * @param {string} placeId - Place ID
   * @returns {Object} 랭킹 피처
   */
  extractRankingFeatures(apolloState, placeId) {
    // PC 버전에서는 PlaceDetailBase: 키 사용
    const placeKey = `PlaceDetailBase:${placeId}`;
    const placeData = apolloState[placeKey] || apolloState[`Place:${placeId}`] || {};

    return {
      // 카테고리 코드
      categoryCodeList: this._extractCategoryCodes(placeData, apolloState),

      // gdid 파싱
      gdid: this._extractGdid(placeData),

      // 방문자 리뷰 통계
      visitorReviewStats: this._extractVisitorReviewStats(apolloState, placeId),

      // 블로그/카페 리뷰 수
      blogCafeReviewCount: this._extractBlogCafeCount(placeData, apolloState),

      // 주문 옵션
      orderOptions: this._extractOrderOptions(placeData),

      // 운영 시간 상세
      operationTime: this._extractOperationTime(apolloState, placeId),
    };
  }

  /**
   * 카테고리 코드 추출
   * @private
   */
  _extractCategoryCodes(placeData, apolloState) {
    // 직접 필드에서 추출
    if (placeData.categoryCodeList && Array.isArray(placeData.categoryCodeList)) {
      return placeData.categoryCodeList;
    }

    // categoryCodes 필드
    if (placeData.categoryCodes && Array.isArray(placeData.categoryCodes)) {
      return placeData.categoryCodes;
    }

    // category에서 코드 추출 시도
    const codes = [];
    if (placeData.category) {
      // 카테고리 문자열에서 코드 패턴 찾기
      const codeMatch = placeData.category.match(/\(([A-Z0-9]+)\)/g);
      if (codeMatch) {
        codeMatch.forEach(m => codes.push(m.replace(/[()]/g, '')));
      }
    }

    // Apollo State에서 Category 키 탐색
    Object.keys(apolloState).forEach(key => {
      if (key.startsWith('Category:')) {
        const cat = apolloState[key];
        if (cat.code && !codes.includes(cat.code)) {
          codes.push(cat.code);
        }
      }
    });

    return codes;
  }

  /**
   * gdid 추출 및 파싱
   * @private
   */
  _extractGdid(placeData) {
    const gdid = placeData.gdid || placeData.globalDocId || null;

    if (!gdid) {
      return {
        raw: null,
        type: null,
        placeId: null,
        isValid: false,
      };
    }

    const parsed = this.gdidParser.parse(gdid);
    return {
      raw: gdid,
      ...parsed,
    };
  }

  /**
   * 방문자 리뷰 통계 추출
   * @private
   */
  _extractVisitorReviewStats(apolloState, placeId) {
    const stats = {
      total: 0,
      withPhoto: 0,
      withContent: 0,
      averageScore: 0,
      scoreDistribution: {},
    };

    // VisitorReviewStat 키 탐색
    Object.keys(apolloState).forEach(key => {
      if (key.includes('VisitorReviewStat') || key.includes('visitorReviewStats')) {
        const data = apolloState[key];

        if (data.totalCount !== undefined) stats.total = data.totalCount;
        if (data.photoReviewCount !== undefined) stats.withPhoto = data.photoReviewCount;
        if (data.contentReviewCount !== undefined) stats.withContent = data.contentReviewCount;
        if (data.averageScore !== undefined) stats.averageScore = data.averageScore;

        // 점수 분포
        if (data.scoreDistribution) {
          data.scoreDistribution.forEach(item => {
            stats.scoreDistribution[item.score] = item.count;
          });
        }
      }
    });

    // 대안: ReviewSummary에서 추출
    const summaryKey = Object.keys(apolloState).find(k =>
      k.includes('ReviewSummary') && !k.includes('Blog')
    );

    if (summaryKey) {
      const summary = apolloState[summaryKey];
      if (summary.count && !stats.total) stats.total = summary.count;
      if (summary.rating && !stats.averageScore) stats.averageScore = summary.rating;
    }

    return stats;
  }

  /**
   * 블로그/카페 리뷰 수 추출
   * @private
   */
  _extractBlogCafeCount(placeData, apolloState) {
    // 직접 필드
    if (placeData.blogCafeReviewCount !== undefined) {
      return placeData.blogCafeReviewCount;
    }

    // blogReviewCount 필드
    if (placeData.blogReviewCount !== undefined) {
      return placeData.blogReviewCount;
    }

    // Apollo State에서 탐색
    let count = 0;
    Object.keys(apolloState).forEach(key => {
      if (key.includes('BlogReviewSummary') || key.includes('UgcReviewSummary')) {
        const data = apolloState[key];
        if (data.count) count = data.count;
        if (data.totalCount) count = data.totalCount;
      }
    });

    return count;
  }

  /**
   * 주문 옵션 추출
   * @private
   */
  _extractOrderOptions(placeData) {
    return {
      isTableOrder: placeData.isTableOrder || placeData.tableOrder || false,
      pickup: placeData.pickup || placeData.isPickup || false,
      delivery: placeData.delivery || placeData.isDelivery || false,
      bookingBusinessId: placeData.bookingBusinessId || placeData.reservationId || null,
      options: this._parseOptions(placeData.options || placeData.orderOptions),
    };
  }

  /**
   * options 필드 파싱
   * @private
   */
  _parseOptions(options) {
    if (!options) return [];

    if (Array.isArray(options)) {
      return options.map(opt => ({
        type: opt.type || opt.name || '',
        available: opt.available !== false,
        url: opt.url || opt.link || null,
      }));
    }

    // 객체 형태인 경우
    if (typeof options === 'object') {
      return Object.entries(options).map(([key, value]) => ({
        type: key,
        available: !!value,
        url: typeof value === 'string' ? value : null,
      }));
    }

    return [];
  }

  /**
   * 운영 시간 상세 추출 (breakTime, lastOrder)
   * @private
   */
  _extractOperationTime(apolloState, placeId) {
    const result = {
      breakTime: [],
      lastOrder: null,
      holiday: null,
    };

    // BusinessHours 키 탐색
    Object.keys(apolloState).forEach(key => {
      if (key.includes('BusinessHours') || key.includes('OperatingHours')) {
        const data = apolloState[key];

        // 브레이크타임
        if (data.breakTime) {
          result.breakTime = this._parseBreakTime(data.breakTime);
        }

        // 라스트오더
        if (data.lastOrder) {
          result.lastOrder = data.lastOrder;
        }

        // 휴무일
        if (data.holiday || data.offDays) {
          result.holiday = data.holiday || data.offDays;
        }
      }
    });

    // Place 데이터에서 직접 추출 시도
    const placeKey = `Place:${placeId}`;
    const placeData = apolloState[placeKey] || {};

    if (placeData.breakTime && !result.breakTime.length) {
      result.breakTime = this._parseBreakTime(placeData.breakTime);
    }

    if (placeData.lastOrder && !result.lastOrder) {
      result.lastOrder = placeData.lastOrder;
    }

    return result;
  }

  /**
   * 브레이크타임 파싱
   * @private
   */
  _parseBreakTime(breakTime) {
    if (!breakTime) return [];

    // 문자열인 경우
    if (typeof breakTime === 'string') {
      // "15:00~17:00" 형태 파싱
      const match = breakTime.match(/(\d{1,2}:\d{2})[~-](\d{1,2}:\d{2})/);
      if (match) {
        return [{
          start: match[1],
          end: match[2],
        }];
      }
      return [{ raw: breakTime }];
    }

    // 배열인 경우
    if (Array.isArray(breakTime)) {
      return breakTime.map(bt => {
        if (typeof bt === 'string') {
          const match = bt.match(/(\d{1,2}:\d{2})[~-](\d{1,2}:\d{2})/);
          if (match) {
            return { start: match[1], end: match[2] };
          }
          return { raw: bt };
        }
        return {
          start: bt.start || bt.startTime || '',
          end: bt.end || bt.endTime || '',
        };
      });
    }

    // 객체인 경우
    if (typeof breakTime === 'object') {
      return [{
        start: breakTime.start || breakTime.startTime || '',
        end: breakTime.end || breakTime.endTime || '',
      }];
    }

    return [];
  }

  /**
   * 투표된 키워드와 방문 목적 병합
   * @param {Object} apolloData - Apollo State 추출 데이터
   * @param {Object} graphqlData - GraphQL 추출 데이터
   * @returns {Object} 병합된 키워드 데이터
   */
  mergeKeywordData(apolloData, graphqlData) {
    const merged = {
      votedKeywords: [],
      visitCategories: [],
    };

    // GraphQL 데이터 우선 (더 정확)
    if (graphqlData?.votedKeywords?.length) {
      merged.votedKeywords = graphqlData.votedKeywords;
    } else if (apolloData?.votedKeywords?.length) {
      merged.votedKeywords = apolloData.votedKeywords;
    }

    if (graphqlData?.visitPurposes?.length) {
      merged.visitCategories = graphqlData.visitPurposes;
    } else if (apolloData?.visitCategories?.length) {
      merged.visitCategories = apolloData.visitCategories;
    }

    return merged;
  }
}
