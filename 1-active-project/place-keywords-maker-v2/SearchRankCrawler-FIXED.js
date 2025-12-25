/**
 * SearchRankCrawler - CORRECTED VERSION
 *
 * This file shows the corrected implementation with proper Apollo State parsing.
 * Compare this with the original SearchRankCrawler.js to see the fixes.
 *
 * Key Changes:
 * 1. _parseSearchResults: Now looks in ROOT_QUERY for restaurantList()
 * 2. Field names: visitorReviewScore, visitorReviewCount (not visitorReviewsScore/Total)
 * 3. Proper reference resolution from Apollo State
 */

import puppeteer from 'puppeteer';
import { CircuitBreaker } from '../../utils/CircuitBreaker.js';
import { exponentialBackoff } from '../../utils/retry.js';
import { logger } from '../../utils/logger.js';

export class SearchRankCrawler {
  constructor(config = {}) {
    this.config = {
      timeout: config.timeout || 30000,
      headless: config.headless !== false,
      maxPages: config.maxPages || 10,
      resultsPerPage: config.resultsPerPage || 15,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 2000,
      userAgent: config.userAgent || 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
    };

    this.browser = null;
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000,
    });
  }

  /**
   * 브라우저 초기화
   */
  async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: this.config.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
        ],
      });
      logger.info('SearchRankCrawler initialized');
    } catch (error) {
      logger.error('Failed to initialize SearchRankCrawler:', error);
      throw error;
    }
  }

  /**
   * 키워드 검색 결과에서 특정 매장의 순위 찾기
   * @param {string} keyword - 검색 키워드
   * @param {string} targetPlaceId - 찾을 매장 ID
   * @returns {Promise<Object|null>} 순위 정보 또는 null (순위권 밖)
   */
  async findRank(keyword, targetPlaceId) {
    return this.circuitBreaker.execute(async () => {
      return exponentialBackoff(
        async () => this._findRankInternal(keyword, targetPlaceId),
        this.config.retryAttempts,
        this.config.retryDelay
      );
    });
  }

  /**
   * 내부 순위 검색 로직
   * @private
   */
  async _findRankInternal(keyword, targetPlaceId) {
    const page = await this.browser.newPage();

    try {
      // Set mobile viewport
      await page.setViewport({
        width: 375,
        height: 812,
        isMobile: true,
        hasTouch: true
      });

      await page.setUserAgent(this.config.userAgent);
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      });

      logger.info(`Searching rank for placeId ${targetPlaceId} with keyword "${keyword}"`);

      for (let pageNum = 1; pageNum <= this.config.maxPages; pageNum++) {
        // 1. 검색 결과 페이지 접속
        const start = (pageNum - 1) * this.config.resultsPerPage + 1;
        const url = `https://m.place.naver.com/restaurant/list?query=${encodeURIComponent(keyword)}&start=${start}`;

        await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: this.config.timeout,
        });

        // Wait for Apollo State to be populated (important!)
        await page.waitForTimeout(2000);

        // 2. Apollo State 추출
        const apolloState = await page.evaluate(() => {
          return window.__APOLLO_STATE__ || {};
        });

        // Debug: Log Apollo State keys
        logger.debug(`Apollo State keys: ${Object.keys(apolloState).join(', ')}`);

        // 3. 검색 결과 파싱
        const searchResults = this._parseSearchResults(apolloState);

        if (searchResults.length === 0) {
          logger.warn(`No search results found on page ${pageNum}`);
          break;
        }

        logger.debug(`Page ${pageNum}: Found ${searchResults.length} results`);
        logger.debug(`Search results: ${searchResults.map(r => `${r.name}(${r.placeId})`).join(', ')}`);

        // 4. 타겟 매장 찾기
        const localIndex = searchResults.findIndex(item => item.placeId === targetPlaceId);

        if (localIndex !== -1) {
          const globalRank = (pageNum - 1) * searchResults.length + localIndex + 1;

          const result = {
            keyword,
            placeId: targetPlaceId,
            rank: globalRank,
            page: pageNum,
            totalResults: this._getTotalResults(apolloState),
            placeName: searchResults[localIndex].name,
            category: searchResults[localIndex].category,
            rating: searchResults[localIndex].rating,
            reviewCount: searchResults[localIndex].reviewCount,
            foundAt: new Date().toISOString()
          };

          logger.info(`Found placeId ${targetPlaceId} at rank ${globalRank}`);
          return result;
        }

        logger.debug(`placeId ${targetPlaceId} not found on page ${pageNum}, continuing...`);
      }

      logger.info(`placeId ${targetPlaceId} not found within top ${this.config.maxPages * this.config.resultsPerPage} results`);
      return null;

    } catch (error) {
      logger.error(`Failed to find rank for ${targetPlaceId}:`, error);
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * Apollo State에서 검색 결과 파싱
   *
   * FIXED VERSION:
   * - Looks in ROOT_QUERY for restaurantList() query
   * - Resolves __ref references properly
   * - Uses correct field names
   *
   * @private
   */
  _parseSearchResults(apolloState) {
    const results = [];

    // FIXED: Get ROOT_QUERY first
    const rootQuery = apolloState.ROOT_QUERY;
    if (!rootQuery) {
      logger.warn('ROOT_QUERY not found in Apollo State');
      return results;
    }

    // FIXED: Find restaurantList query (not SearchResult or Query keys)
    const restaurantListKey = Object.keys(rootQuery).find(key =>
      key.startsWith('restaurantList(')
    );

    if (!restaurantListKey) {
      logger.warn('restaurantList query not found in ROOT_QUERY');
      logger.debug(`Available ROOT_QUERY keys: ${Object.keys(rootQuery).join(', ')}`);
      return results;
    }

    logger.debug(`Found restaurantList key: ${restaurantListKey}`);

    const restaurantListData = rootQuery[restaurantListKey];
    const items = restaurantListData.items || [];

    if (items.length === 0) {
      logger.warn('restaurantList has no items');
      return results;
    }

    // FIXED: Properly resolve references
    items.forEach((itemRef, index) => {
      const refKey = itemRef.__ref;

      if (!refKey) {
        logger.debug(`Item ${index} has no __ref`);
        return;
      }

      const placeData = apolloState[refKey];

      if (!placeData) {
        logger.debug(`Could not resolve reference: ${refKey}`);
        return;
      }

      // FIXED: Use correct field names
      results.push({
        placeId: placeData.id,
        name: placeData.name || '',
        category: placeData.category || '',
        // FIXED: visitorReviewScore (not visitorReviewsScore)
        rating: placeData.visitorReviewScore || 0,
        // FIXED: visitorReviewCount (not visitorReviewsTotal)
        reviewCount: parseInt(placeData.visitorReviewCount || '0'),
        address: placeData.roadAddress || placeData.address || '',
        localRank: index + 1,
        // Additional useful fields
        distance: placeData.distance,
        priceCategory: placeData.priceCategory,
        newOpening: placeData.newOpening,
        businessHoursStatus: placeData.newBusinessHours?.status
      });
    });

    logger.debug(`Parsed ${results.length} places from Apollo State`);

    return results;
  }

  /**
   * 총 검색 결과 수 추출
   *
   * FIXED VERSION:
   * - Looks in ROOT_QUERY for restaurantList() query
   *
   * @private
   */
  _getTotalResults(apolloState) {
    const rootQuery = apolloState.ROOT_QUERY;
    if (!rootQuery) {
      logger.debug('ROOT_QUERY not found for total results');
      return null;
    }

    // FIXED: Find restaurantList query
    const restaurantListKey = Object.keys(rootQuery).find(key =>
      key.startsWith('restaurantList(')
    );

    if (!restaurantListKey) {
      logger.debug('restaurantList query not found for total results');
      return null;
    }

    const restaurantListData = rootQuery[restaurantListKey];
    return restaurantListData.total || null;
  }

  /**
   * 배치 순위 조회 (여러 키워드)
   * @param {string[]} keywords - 검색 키워드 배열
   * @param {string} targetPlaceId - 찾을 매장 ID
   * @param {number} concurrency - 동시 처리 수 (기본값: 3)
   * @returns {Promise<Array>} 순위 결과 배열
   */
  async findRankBatch(keywords, targetPlaceId, concurrency = 3) {
    logger.info(`Starting batch rank search for ${keywords.length} keywords`);

    const results = [];

    for (let i = 0; i < keywords.length; i += concurrency) {
      const batch = keywords.slice(i, i + concurrency);

      const promises = batch.map(keyword =>
        this.findRank(keyword, targetPlaceId)
          .then(result => ({ success: true, keyword, ...result }))
          .catch(error => ({ success: false, keyword, error: error.message }))
      );

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);

      // Rate limiting: 배치 간 대기
      if (i + concurrency < keywords.length) {
        logger.debug(`Batch ${Math.floor(i / concurrency) + 1} completed, waiting 2s...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const successful = results.filter(r => r.success && r.rank).length;
    const notFound = results.filter(r => r.success && !r.rank).length;
    const failed = results.filter(r => !r.success).length;

    logger.info(`Batch rank search completed: ${successful} found, ${notFound} not found, ${failed} failed`);

    return results;
  }

  /**
   * 리소스 정리
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      logger.info('SearchRankCrawler closed');
    }
  }
}
