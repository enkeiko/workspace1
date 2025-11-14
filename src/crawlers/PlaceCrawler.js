/**
 * PlaceCrawler.js
 * 네이버 플레이스 데이터 수집 크롤러
 *
 * L1 파이프라인 구현
 * - 동적 페이지 렌더링 (Puppeteer)
 * - Circuit Breaker 패턴
 * - Exponential Backoff 재시도
 * - Rate Limiting
 * - Graceful Degradation
 */

const puppeteer = require('puppeteer');
const { EventEmitter } = require('events');
const {
  normalizeAddress,
  normalizeMenu,
  normalizeReview
} = require('../utils/normalizers');

class PlaceCrawler extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = {
      // 크롤링 설정
      headless: options.headless !== false, // 기본: headless 모드
      timeout: options.timeout || 30000,     // 30초 타임아웃

      // 수집 레벨
      defaultLevel: options.defaultLevel || 'STANDARD',

      // 재시도 설정
      maxRetries: options.maxRetries || 3,
      baseDelay: options.baseDelay || 2000,  // 2초
      maxDelay: options.maxDelay || 30000,   // 30초

      // Rate Limiting
      maxConcurrent: options.maxConcurrent || 5,
      requestsPerMinute: options.requestsPerMinute || 30,

      // Circuit Breaker 설정
      failureThreshold: options.failureThreshold || 5,
      successThreshold: options.successThreshold || 2,
      breakerTimeout: options.breakerTimeout || 60000, // 60초

      ...options
    };

    this.browser = null;
    this.stats = {
      totalRequests: 0,
      successCount: 0,
      failureCount: 0,
      startTime: null
    };

    // Circuit Breaker 상태
    this.circuitBreaker = {
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastFailureTime: null
    };

    // Rate Limiter 큐
    this.queue = {
      pending: [],
      inProgress: new Set(),
      maxConcurrent: this.config.maxConcurrent
    };
  }

  /**
   * 초기화: Puppeteer 브라우저 실행
   */
  async initialize() {
    if (this.browser) {
      return;
    }

    try {
      this.browser = await puppeteer.launch({
        headless: this.config.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      });

      this.stats.startTime = Date.now();
      this.emit('initialized', { browser: this.browser });

      console.log('[PlaceCrawler] Initialized successfully');
    } catch (error) {
      console.error('[PlaceCrawler] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * 종료: 리소스 정리
   */
  async shutdown() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.emit('shutdown');
      console.log('[PlaceCrawler] Shutdown completed');
    }
  }

  /**
   * 단일 매장 데이터 수집 (메인 진입점)
   * @param {string} placeId - 네이버 플레이스 ID
   * @param {object} options - 수집 옵션
   * @returns {object} 수집된 데이터
   */
  async crawlPlace(placeId, options = {}) {
    const level = options.level || this.config.defaultLevel;

    // Circuit Breaker 체크
    if (this.circuitBreaker.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.circuitBreaker.lastFailureTime;

      if (timeSinceLastFailure < this.config.breakerTimeout) {
        throw new Error('Circuit Breaker is OPEN - crawling suspended');
      }

      // Timeout 경과 -> HALF_OPEN으로 전환
      this.circuitBreaker.state = 'HALF_OPEN';
      this.emit('circuitBreakerStateChanged', { state: 'HALF_OPEN' });
    }

    this.stats.totalRequests++;

    try {
      const data = await this._crawlWithRetry(placeId, level);

      this._onSuccess();
      return data;

    } catch (error) {
      this._onFailure(error);
      throw error;
    }
  }

  /**
   * 재시도 로직을 포함한 크롤링
   * @private
   */
  async _crawlWithRetry(placeId, level, attemptNumber = 1) {
    try {
      return await this._executeCrawl(placeId, level, attemptNumber);

    } catch (error) {
      // 재시도 가능한 에러인지 확인
      if (!this._isRetryableError(error) || attemptNumber >= this.config.maxRetries) {
        throw error;
      }

      // Exponential Backoff 계산
      const delay = this._calculateBackoffDelay(attemptNumber);

      console.log(`[PlaceCrawler] Retry ${attemptNumber}/${this.config.maxRetries} after ${delay}ms`);
      this.emit('retrying', { placeId, attemptNumber, delay, error: error.message });

      await this._sleep(delay);

      // 재시도
      return await this._crawlWithRetry(placeId, level, attemptNumber + 1);
    }
  }

  /**
   * 실제 크롤링 실행
   * @private
   */
  async _executeCrawl(placeId, level, attemptNumber) {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser.newPage();
    const startTime = Date.now();

    try {
      // User-Agent 설정 (봇 탐지 회피)
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // 네이버 플레이스 URL
      const url = `https://m.place.naver.com/place/${placeId}`;

      console.log(`[PlaceCrawler] Crawling ${placeId} (level: ${level}, attempt: ${attemptNumber})`);

      // 페이지 이동
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: this.config.timeout
      });

      // 동적 콘텐츠 로딩 대기
      await this._waitForPageLoad(page);

      // 수집 레벨에 따른 데이터 수집
      const placeData = await this._collectData(page, placeId, level);

      const duration = Date.now() - startTime;

      // 메타데이터 추가
      const result = {
        version: '2.0.0',
        collected_at: new Date().toISOString(),
        collection_level: level,
        collector_version: '1.0.0',
        place: placeData,
        metadata: {
          completeness: this._calculateCompleteness(placeData, level),
          collection_stats: {
            attempts: attemptNumber,
            duration_ms: duration,
            sources: {
              naver_place: 'SUCCESS'
            }
          }
        }
      };

      this.emit('placeCollected', { placeId, level, duration });

      return result;

    } catch (error) {
      console.error(`[PlaceCrawler] Error crawling ${placeId}:`, error.message);
      throw error;

    } finally {
      await page.close();
    }
  }

  /**
   * 페이지 로딩 대기 (동적 콘텐츠)
   * @private
   */
  async _waitForPageLoad(page) {
    try {
      // 주요 셀렉터 대기
      await page.waitForSelector('.place_section', { timeout: 10000 });

      // 페이지 완전 로드 대기
      await page.waitForFunction(() => document.readyState === 'complete');

      // 추가 대기 (Lazy Loading)
      await this._sleep(1000);

    } catch (error) {
      console.warn('[PlaceCrawler] Timeout waiting for selectors:', error.message);
    }
  }

  /**
   * 데이터 수집 (수집 레벨에 따라)
   * @private
   */
  async _collectData(page, placeId, level) {
    const data = {
      id: placeId,
      name: null,
      category: null,
      address: null,
      contact: {},
      rating: null,
      reviewCount: null
    };

    // BASIC: 필수 필드만
    data.name = await this._extractText(page, '.place_section_name') || 'Unknown';
    data.category = await this._extractText(page, '.category');
    data.address = await this._extractAddress(page);
    data.contact.phone = await this._extractText(page, '.phone');

    // STANDARD 이상: 추가 필드
    if (level === 'STANDARD' || level === 'COMPLETE') {
      data.rating = await this._extractRating(page);
      data.reviewCount = await this._extractReviewCount(page);
      data.menus = await this._extractMenus(page);
      data.businessHours = await this._extractText(page, '.business_hours');
      data.images = await this._extractImages(page);
    }

    // COMPLETE: 모든 필드 + 리뷰
    if (level === 'COMPLETE') {
      data.visitorReviews = await this._extractReviews(page);
      // TODO: 블로그 리뷰는 별도 페이지 크롤링 필요
    }

    return data;
  }

  /**
   * 텍스트 추출 헬퍼
   * @private
   */
  async _extractText(page, selector) {
    try {
      const element = await page.$(selector);
      if (!element) return null;

      return await page.evaluate(el => el.textContent.trim(), element);
    } catch (error) {
      return null;
    }
  }

  /**
   * 주소 추출 및 정규화
   * @private
   */
  async _extractAddress(page) {
    const rawAddress = await this._extractText(page, '.address');

    if (!rawAddress) return null;

    return normalizeAddress(rawAddress);
  }

  /**
   * 평점 추출
   * @private
   */
  async _extractRating(page) {
    const ratingText = await this._extractText(page, '.rating');
    if (!ratingText) return null;

    const rating = parseFloat(ratingText);
    return (rating >= 0 && rating <= 5) ? rating : null;
  }

  /**
   * 리뷰 수 추출
   * @private
   */
  async _extractReviewCount(page) {
    const countText = await this._extractText(page, '.review_count');
    if (!countText) return null;

    const count = parseInt(countText.replace(/[^0-9]/g, ''), 10);
    return isNaN(count) ? null : count;
  }

  /**
   * 메뉴 추출
   * @private
   */
  async _extractMenus(page) {
    try {
      const menus = await page.$$eval('.menu_item', elements => {
        return elements.map(el => ({
          name: el.querySelector('.menu_name')?.textContent.trim() || '',
          price: el.querySelector('.menu_price')?.textContent.trim() || ''
        }));
      });

      return menus.map(menu => normalizeMenu(menu)).filter(Boolean);

    } catch (error) {
      return [];
    }
  }

  /**
   * 이미지 URL 추출
   * @private
   */
  async _extractImages(page) {
    try {
      return await page.$$eval('.image_item img', imgs => {
        return imgs.map(img => img.src).filter(src => src && src.startsWith('http'));
      });
    } catch (error) {
      return [];
    }
  }

  /**
   * 리뷰 추출
   * @private
   */
  async _extractReviews(page) {
    try {
      // TODO: 리뷰 페이지네이션 처리
      const rawReviews = await page.$$eval('.review_item', elements => {
        return elements.slice(0, 100).map(el => ({
          author: el.querySelector('.author')?.textContent.trim() || 'Anonymous',
          rating: el.querySelector('.rating')?.textContent.trim() || '',
          content: el.querySelector('.content')?.textContent.trim() || '',
          date: el.querySelector('.date')?.textContent.trim() || '',
          images: Array.from(el.querySelectorAll('.review_img')).map(img => img.src),
          isVerified: el.querySelector('.verified_badge') !== null
        }));
      });

      return rawReviews.map(review => normalizeReview(review)).filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  /**
   * 완성도 점수 계산
   * @private
   */
  _calculateCompleteness(data, level) {
    let score = 0;
    let maxScore = 100;

    // 필수 필드 (40점)
    if (data.id) score += 10;
    if (data.name) score += 10;
    if (data.category) score += 10;
    if (data.address?.raw) score += 10;

    // 중요 필드 (40점)
    if (data.contact?.phone) score += 10;
    if (data.rating) score += 10;
    if (data.menus && data.menus.length > 0) score += 10;
    if (data.businessHours) score += 10;

    // 선택 필드 (20점)
    if (data.images && data.images.length > 0) score += 10;
    if (data.visitorReviews && data.visitorReviews.length > 0) score += 10;

    // 등급 계산
    let grade;
    if (score >= 90) grade = 'A+';
    else if (score >= 75) grade = 'A';
    else if (score >= 60) grade = 'B';
    else if (score >= 40) grade = 'C';
    else grade = 'D';

    return {
      score,
      grade,
      missing_fields: this._getMissingFields(data)
    };
  }

  /**
   * 누락된 필드 목록
   * @private
   */
  _getMissingFields(data) {
    const missing = [];

    if (!data.contact?.phone) missing.push('contact.phone');
    if (!data.rating) missing.push('rating');
    if (!data.menus || data.menus.length === 0) missing.push('menus');
    if (!data.businessHours) missing.push('businessHours');
    if (!data.images || data.images.length === 0) missing.push('images');

    return missing;
  }

  /**
   * Exponential Backoff 지연 시간 계산
   * @private
   */
  _calculateBackoffDelay(attemptNumber) {
    const delay = this.config.baseDelay * Math.pow(2, attemptNumber - 1);
    const jitter = Math.random() * 1000; // 0-1초 랜덤

    return Math.min(delay + jitter, this.config.maxDelay);
  }

  /**
   * 재시도 가능한 에러인지 확인
   * @private
   */
  _isRetryableError(error) {
    const retryableErrors = [
      'TIMEOUT',
      'ECONNRESET',
      'ENOTFOUND',
      'ERR_NETWORK',
      'TimeoutError'
    ];

    return retryableErrors.some(errType =>
      error.name === errType || error.message.includes(errType)
    );
  }

  /**
   * 성공 처리
   * @private
   */
  _onSuccess() {
    this.stats.successCount++;

    if (this.circuitBreaker.state === 'HALF_OPEN') {
      this.circuitBreaker.consecutiveSuccesses++;

      if (this.circuitBreaker.consecutiveSuccesses >= this.config.successThreshold) {
        this.circuitBreaker.state = 'CLOSED';
        this.circuitBreaker.consecutiveFailures = 0;
        this.circuitBreaker.consecutiveSuccesses = 0;

        this.emit('circuitBreakerStateChanged', { state: 'CLOSED' });
        console.log('[CircuitBreaker] State changed to CLOSED');
      }
    }
  }

  /**
   * 실패 처리
   * @private
   */
  _onFailure(error) {
    this.stats.failureCount++;
    this.circuitBreaker.consecutiveFailures++;
    this.circuitBreaker.consecutiveSuccesses = 0;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.consecutiveFailures >= this.config.failureThreshold) {
      this.circuitBreaker.state = 'OPEN';

      this.emit('circuitBreakerStateChanged', { state: 'OPEN', error: error.message });
      console.error('[CircuitBreaker] State changed to OPEN - crawling suspended');
    }
  }

  /**
   * Sleep 유틸리티
   * @private
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 통계 조회
   */
  getStats() {
    const uptime = this.stats.startTime ? Date.now() - this.stats.startTime : 0;
    const successRate = this.stats.totalRequests > 0
      ? (this.stats.successCount / this.stats.totalRequests * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      uptime,
      successRate: `${successRate}%`,
      circuitBreakerState: this.circuitBreaker.state
    };
  }
}

module.exports = PlaceCrawler;
