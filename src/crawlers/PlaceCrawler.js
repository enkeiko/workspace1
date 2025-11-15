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
const fs = require('fs').promises;  // C-5: Docker 환경 체크용
const {
  normalizeAddress,
  normalizeMenu,
  normalizeReview
} = require('../utils/normalizers');
const { runQualityChecks } = require('../utils/validators');
const RateLimiter = require('../utils/RateLimiter');
const DataStorage = require('../utils/DataStorage');
const SELECTORS = require('../selectors/naver-place.json');  // C-1

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

      // 가격 범위 설정 (C-6)
      priceOptions: {
        maxPrice: options.maxPrice || 100000000,  // 기본: 1억원
        minPrice: options.minPrice !== undefined ? options.minPrice : 0
      },

      ...options
    };

    this.browser = null;

    // H-1: 페이지 풀 (메모리 누수 방지)
    this.pagePool = [];
    this.maxPoolSize = options.maxPoolSize || 10;

    this.stats = {
      totalRequests: 0,
      successCount: 0,
      failureCount: 0,
      startTime: null,
      pagePoolHits: 0,    // 풀에서 재사용
      pagePoolMisses: 0   // 새로 생성
    };

    // Circuit Breaker 상태
    this.circuitBreaker = {
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      lastFailureTime: null,
      halfOpenTestInProgress: false  // C-7: Race Condition 방지
    };

    // RateLimiter 통합 (C-3)
    this.rateLimiter = new RateLimiter({
      maxConcurrent: this.config.maxConcurrent,
      requestsPerMinute: this.config.requestsPerMinute,
      requestsPerHour: options.requestsPerHour || 1000
    });

    // DataStorage 통합 (C-3)
    this.storage = new DataStorage({
      basePath: options.storagePath || './data/output/l1',
      prettyPrint: options.prettyPrint !== false
    });

    // 자동 저장 설정
    this.config.autoSave = options.autoSave !== false;  // 기본: true
    this.config.autoValidate = options.autoValidate !== false;  // 기본: true

    // RateLimiter 이벤트 전달
    this.rateLimiter.on('taskQueued', (data) => this.emit('taskQueued', data));
    this.rateLimiter.on('taskStarted', (data) => this.emit('taskStarted', data));
    this.rateLimiter.on('taskCompleted', (data) => this.emit('taskCompleted', data));
    this.rateLimiter.on('rateLimited', (data) => this.emit('rateLimited', data));
  }

  /**
   * Docker 환경 체크 (C-5)
   * @private
   * @returns {Promise<boolean>} Docker 환경 여부
   */
  async _isRunningInDocker() {
    try {
      // /.dockerenv 파일 존재 여부 확인
      await fs.access('/.dockerenv');
      return true;
    } catch {
      // /proc/self/cgroup에서 docker 문자열 확인 (fallback)
      try {
        const cgroup = await fs.readFile('/proc/self/cgroup', 'utf-8');
        return cgroup.includes('docker');
      } catch {
        return false;
      }
    }
  }

  /**
   * 초기화: Puppeteer 브라우저 실행
   */
  async initialize() {
    if (this.browser) {
      return;
    }

    try {
      // DataStorage 초기화 (C-3)
      await this.storage.initialize();

      // Docker 환경 체크 (C-5)
      const isDocker = await this._isRunningInDocker();

      // 기본 브라우저 인자
      const args = [
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ];

      // Docker 환경에서만 --no-sandbox 사용 (C-5)
      if (isDocker) {
        console.warn('[PlaceCrawler] Running in Docker - using --no-sandbox (security risk)');
        args.push('--no-sandbox', '--disable-setuid-sandbox');
      } else {
        console.log('[PlaceCrawler] Running in native environment - sandbox enabled');
      }

      this.browser = await puppeteer.launch({
        headless: this.config.headless,
        args
      });

      this.stats.startTime = Date.now();
      this.emit('initialized', {
        browser: this.browser,
        isDocker,
        sandboxDisabled: isDocker
      });

      console.log('[PlaceCrawler] Initialized successfully');
    } catch (error) {
      console.error('[PlaceCrawler] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * 페이지 풀에서 페이지 가져오기 (H-1)
   * @private
   */
  async _getPage() {
    if (this.pagePool.length > 0) {
      this.stats.pagePoolHits++;
      return this.pagePool.pop();
    }

    this.stats.pagePoolMisses++;
    return await this.browser.newPage();
  }

  /**
   * 페이지 풀에 페이지 반환 (H-1)
   * @private
   */
  async _releasePage(page) {
    try {
      // 페이지 초기화
      await page.goto('about:blank');

      // 스토리지 정리
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // 쿠키 삭제
      const cookies = await page.cookies();
      if (cookies.length > 0) {
        await page.deleteCookie(...cookies);
      }

      // 풀에 공간이 있으면 재사용, 없으면 닫기
      if (this.pagePool.length < this.maxPoolSize) {
        this.pagePool.push(page);
      } else {
        await page.close();
      }
    } catch (error) {
      // 정리 실패 시 페이지 닫기 (메모리 누수 방지)
      try {
        await page.close();
      } catch (closeError) {
        console.warn('[PlaceCrawler] Failed to close page:', closeError.message);
      }
    }
  }

  /**
   * 종료: 리소스 정리
   */
  async shutdown() {
    // 페이지 풀의 모든 페이지 닫기 (H-1)
    while (this.pagePool.length > 0) {
      const page = this.pagePool.pop();
      try {
        await page.close();
      } catch (error) {
        console.warn('[PlaceCrawler] Error closing pooled page:', error.message);
      }
    }

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
    const priority = options.priority || 'MEDIUM';
    const autoSave = options.autoSave !== undefined ? options.autoSave : this.config.autoSave;
    const autoValidate = options.autoValidate !== undefined ? options.autoValidate : this.config.autoValidate;

    // RateLimiter를 통해 실행 (C-3)
    return this.rateLimiter.add(async () => {
      // Circuit Breaker 체크 (C-7: Race Condition 수정)
      if (this.circuitBreaker.state === 'OPEN') {
        const timeSinceLastFailure = Date.now() - this.circuitBreaker.lastFailureTime;

        if (timeSinceLastFailure < this.config.breakerTimeout) {
          throw new Error('Circuit Breaker is OPEN - crawling suspended');
        }

        // Atomic 상태 전환 (첫 번째 요청만 성공)
        if (this.circuitBreaker.state === 'OPEN') {
          this.circuitBreaker.state = 'HALF_OPEN';
          this.circuitBreaker.halfOpenTestInProgress = true;
          this.emit('circuitBreakerStateChanged', { state: 'HALF_OPEN' });
        }
      }

      // HALF_OPEN에서는 테스트 요청만 허용 (C-7)
      if (this.circuitBreaker.state === 'HALF_OPEN' && this.circuitBreaker.halfOpenTestInProgress) {
        throw new Error('Circuit Breaker test in progress - please wait');
      }

      this.stats.totalRequests++;

      try {
        // 데이터 수집
        const data = await this._crawlWithRetry(placeId, level);

        // 데이터 검증 (C-3)
        if (autoValidate) {
          const validation = runQualityChecks(data);

          this.emit('dataValidated', {
            placeId,
            validation: validation.summary,
            passed: validation.passed
          });

          if (!validation.shouldSave) {
            const error = new Error(
              `Data validation failed: ${validation.summary.critical} critical errors`
            );
            error.validation = validation;
            throw error;
          }

          // 검증 이슈가 있으면 경고
          if (validation.issues.warnings.length > 0) {
            console.warn(
              `[PlaceCrawler] ${placeId}: ${validation.issues.warnings.length} validation warnings`,
              validation.issues.warnings
            );
          }
        }

        // 자동 저장 (C-3)
        if (autoSave) {
          const savedPath = await this.storage.savePlaceData(data);
          this.emit('dataSaved', { placeId, path: savedPath });
        }

        this._onSuccess();
        return data;

      } catch (error) {
        this._onFailure(error);
        throw error;
      }
    }, { priority, id: placeId });
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

    // H-1: 페이지 풀에서 페이지 가져오기
    const page = await this._getPage();
    const startTime = Date.now();

    try {
      // L-2: 랜덤 User-Agent 설정 (봇 탐지 회피)
      await page.setUserAgent(this._getRandomUserAgent());

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
      // H-1: 페이지 풀에 반환
      await this._releasePage(page);
    }
  }

  /**
   * 페이지 로딩 대기 (동적 콘텐츠)
   * @private
   */
  async _waitForPageLoad(page) {
    try {
      // 주요 셀렉터 대기 (C-1: 외부 파일 사용)
      await page.waitForSelector(SELECTORS.selectors.loading.placeholder, { timeout: 10000 });

      // 페이지 완전 로드 대기
      await page.waitForFunction(() => document.readyState === 'complete');

      // M-1: 네트워크 유휴 상태 감지 (하드코딩된 1초 대기 제거)
      await page.waitForFunction(() => {
        // 최근 완료된 네트워크 요청 확인
        const resources = performance.getEntriesByType('resource');
        const placeRequests = resources.filter(r =>
          r.name.includes('place.naver.com') ||
          r.name.includes('map.naver.com')
        );

        // 모든 관련 요청이 완료되었는지 확인
        return placeRequests.length === 0 ||
               placeRequests.every(r => r.responseEnd > 0);
      }, { timeout: 5000 }).catch(() => {
        // 타임아웃되어도 계속 진행 (최대 5초만 대기)
        console.warn('[PlaceCrawler] Network idle timeout - continuing anyway');
      });

    } catch (error) {
      console.warn('[PlaceCrawler] Timeout waiting for selectors:', error.message);
    }
  }

  /**
   * 데이터 수집 (수집 레벨에 따라)
   * @private
   */
  async _collectData(page, placeId, level) {
    const selectors = SELECTORS.selectors;  // C-1: 외부 셀렉터 사용

    const data = {
      id: placeId,
      name: null,
      category: null,
      address: null,
      contact: {},
      rating: null,
      reviewCount: null
    };

    // H-2: BASIC 필드 배치 추출 (성능 최적화)
    const basicFields = await this._extractAllFields(page, {
      name: selectors.place.name,
      category: selectors.place.category,
      phone: selectors.place.phone
    });

    data.name = basicFields.name || 'Unknown';
    data.category = basicFields.category;
    data.contact.phone = basicFields.phone;
    data.address = await this._extractAddress(page);

    // STANDARD 이상: 추가 필드
    if (level === 'STANDARD' || level === 'COMPLETE') {
      // H-2: STANDARD 필드 배치 추출
      const standardFields = await this._extractAllFields(page, {
        businessHours: selectors.place.businessHours
      });

      data.rating = await this._extractRating(page);
      data.reviewCount = await this._extractReviewCount(page);
      data.menus = await this._extractMenus(page);
      data.businessHours = standardFields.businessHours;
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
   * H-2: 여러 필드 배치 추출 (성능 최적화)
   * @private
   */
  async _extractAllFields(page, selectors) {
    return await page.evaluate((sels) => {
      const result = {};
      for (const [key, selector] of Object.entries(sels)) {
        try {
          const el = document.querySelector(selector);
          result[key] = el ? el.textContent.trim() : null;
        } catch (error) {
          result[key] = null;
        }
      }
      return result;
    }, selectors);
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
    const rawAddress = await this._extractText(page, SELECTORS.selectors.place.address);  // C-1

    if (!rawAddress) return null;

    return normalizeAddress(rawAddress);
  }

  /**
   * 평점 추출
   * @private
   */
  async _extractRating(page) {
    const ratingText = await this._extractText(page, SELECTORS.selectors.place.rating);  // C-1
    if (!ratingText) return null;

    const rating = parseFloat(ratingText);
    return (rating >= 0 && rating <= 5) ? rating : null;
  }

  /**
   * 리뷰 수 추출
   * @private
   */
  async _extractReviewCount(page) {
    const countText = await this._extractText(page, SELECTORS.selectors.place.reviewCount);  // C-1
    if (!countText) return null;

    const count = parseInt(countText.replace(/[^0-9]/g, ''), 10);
    return isNaN(count) ? null : count;
  }

  /**
   * 메뉴 추출 (C-6: 가격 옵션 적용)
   * @private
   */
  async _extractMenus(page) {
    const selectors = SELECTORS.selectors.menu;  // C-1
    try {
      const menus = await page.$$eval(selectors.container, (elements, menuNameSel, menuPriceSel) => {
        return elements.map(el => ({
          name: el.querySelector(menuNameSel)?.textContent.trim() || '',
          price: el.querySelector(menuPriceSel)?.textContent.trim() || ''
        }));
      }, selectors.name, selectors.price);

      // priceOptions 전달 (C-6)
      return menus.map(menu => normalizeMenu(menu, this.config.priceOptions)).filter(Boolean);

    } catch (error) {
      return [];
    }
  }

  /**
   * 이미지 URL 추출
   * @private
   */
  async _extractImages(page) {
    const selectors = SELECTORS.selectors.image;  // C-1
    try {
      return await page.$$eval(selectors.thumbnail, imgs => {
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
    const selectors = SELECTORS.selectors.review;  // C-1
    try {
      // TODO: 리뷰 페이지네이션 처리
      const rawReviews = await page.$$eval(selectors.container, (elements, reviewSelectors) => {
        return elements.slice(0, 100).map(el => ({
          author: el.querySelector(reviewSelectors.author)?.textContent.trim() || 'Anonymous',
          rating: el.querySelector(reviewSelectors.rating)?.textContent.trim() || '',
          content: el.querySelector(reviewSelectors.content)?.textContent.trim() || '',
          date: el.querySelector(reviewSelectors.date)?.textContent.trim() || '',
          images: Array.from(el.querySelectorAll(reviewSelectors.image)).map(img => img.src),
          isVerified: el.querySelector(reviewSelectors.verifiedBadge) !== null
        }));
      }, {
        author: selectors.author,
        rating: selectors.rating,
        content: selectors.content,
        date: selectors.date,
        image: selectors.image,
        verifiedBadge: selectors.verifiedBadge
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
   * L-2: 랜덤 User-Agent 생성 (봇 탐지 회피)
   * @private
   * @returns {string} 랜덤 User-Agent 문자열
   */
  _getRandomUserAgent() {
    const userAgents = [
      // Chrome on Windows
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',

      // Chrome on macOS
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',

      // Safari on macOS
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',

      // Firefox on Windows
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',

      // Edge on Windows
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
    ];

    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  /**
   * 성공 처리
   * @private
   */
  _onSuccess() {
    this.stats.successCount++;

    if (this.circuitBreaker.state === 'HALF_OPEN') {
      this.circuitBreaker.halfOpenTestInProgress = false;  // C-7: 테스트 완료
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
  async getStats() {
    const uptime = this.stats.startTime ? Date.now() - this.stats.startTime : 0;
    const successRate = this.stats.totalRequests > 0
      ? (this.stats.successCount / this.stats.totalRequests * 100).toFixed(2)
      : 0;

    return {
      crawler: {
        ...this.stats,
        uptime,
        successRate: `${successRate}%`,
        circuitBreakerState: this.circuitBreaker.state,
        // H-1: 페이지 풀 통계
        pagePool: {
          size: this.pagePool.length,
          maxSize: this.maxPoolSize,
          hits: this.stats.pagePoolHits,
          misses: this.stats.pagePoolMisses,
          hitRate: this.stats.pagePoolHits + this.stats.pagePoolMisses > 0
            ? ((this.stats.pagePoolHits / (this.stats.pagePoolHits + this.stats.pagePoolMisses)) * 100).toFixed(2) + '%'
            : '0%'
        }
      },
      rateLimiter: this.rateLimiter.getStatus(),
      storage: await this.storage.getStorageStats()
    };
  }
}

module.exports = PlaceCrawler;
