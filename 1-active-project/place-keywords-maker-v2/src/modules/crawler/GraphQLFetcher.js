/**
 * GraphQLFetcher - 네이버 플레이스 GraphQL API 호출 모듈
 * v0.4: votedKeywords 등 상세 데이터 수집용
 */

import { logger } from '../../utils/logger.js';

export class GraphQLFetcher {
  constructor(config = {}) {
    this.config = {
      endpoint: config.endpoint || 'https://pcmap-api.place.naver.com/graphql',
      timeout: config.timeout || 10000,
      retryAttempts: config.retryAttempts || 2,
      retryDelay: config.retryDelay || 1000,
    };

    this.headers = {
      'Content-Type': 'application/json',
      'Referer': 'https://m.place.naver.com',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };
  }

  /**
   * votedKeywords 수집
   * @param {string} placeId - 플레이스 ID
   * @returns {Promise<Array>} votedKeywords 배열
   */
  async fetchVotedKeywords(placeId) {
    const query = `
      query getVisitorReviewStats($input: VisitorReviewStatsInput!) {
        visitorReviewStats(input: $input) {
          id
          name
          votedKeywords {
            keyword
            count
            iconUrl
          }
          visitPurposes {
            name
            count
          }
        }
      }
    `;

    const variables = {
      input: {
        businessId: placeId,
        businessType: 'restaurant',
      },
    };

    try {
      const result = await this._executeQuery(query, variables);
      const stats = result?.data?.visitorReviewStats;

      if (!stats) {
        logger.warn(`No votedKeywords found for place: ${placeId}`);
        return { votedKeywords: [], visitPurposes: [] };
      }

      return {
        votedKeywords: (stats.votedKeywords || []).map(kw => ({
          name: kw.keyword,
          count: kw.count,
          iconUrl: kw.iconUrl || null,
        })),
        visitPurposes: (stats.visitPurposes || []).map(vp => ({
          name: vp.name,
          count: vp.count,
        })),
      };
    } catch (error) {
      logger.error(`Failed to fetch votedKeywords for ${placeId}:`, error.message);
      return { votedKeywords: [], visitPurposes: [] };
    }
  }

  /**
   * 전체 리뷰 통계 수집
   * @param {string} placeId - 플레이스 ID
   * @returns {Promise<Object>} 리뷰 통계
   */
  async fetchReviewStats(placeId) {
    const query = `
      query getReviewStatistics($input: ReviewStatisticsInput!) {
        reviewStatistics(input: $input) {
          totalCount
          visitorReviewCount
          blogReviewCount
          averageScore
          scoreDistribution {
            score
            count
          }
        }
      }
    `;

    const variables = {
      input: {
        businessId: placeId,
      },
    };

    try {
      const result = await this._executeQuery(query, variables);
      const stats = result?.data?.reviewStatistics;

      if (!stats) {
        return null;
      }

      return {
        total: stats.totalCount || 0,
        visitor: stats.visitorReviewCount || 0,
        blog: stats.blogReviewCount || 0,
        average: stats.averageScore || 0,
        distribution: stats.scoreDistribution || [],
      };
    } catch (error) {
      logger.error(`Failed to fetch review stats for ${placeId}:`, error.message);
      return null;
    }
  }

  /**
   * GraphQL 쿼리 실행
   * @private
   */
  async _executeQuery(query, variables) {
    let lastError = null;

    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(this.config.endpoint, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({ query, variables }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.errors) {
          throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
        }

        return result;
      } catch (error) {
        lastError = error;
        logger.warn(`GraphQL attempt ${attempt}/${this.config.retryAttempts} failed:`, error.message);

        if (attempt < this.config.retryAttempts) {
          await this._sleep(this.config.retryDelay * attempt);
        }
      }
    }

    throw lastError;
  }

  /**
   * 지연 함수
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
