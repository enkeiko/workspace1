/**
 * PlaceCrawler - 네이버 플레이스 데이터 크롤러
 * V2: 에러 핸들링, Circuit Breaker, Exponential Backoff 개선
 */

import puppeteer from 'puppeteer';
import path from 'path';
import { CircuitBreaker } from '../../utils/CircuitBreaker.js';
import { exponentialBackoff } from '../../utils/retry.js';
import { logger } from '../../utils/logger.js';

export class PlaceCrawler {
  constructor(config = {}) {
    this.config = {
      timeout: config.timeout || 30000,
      headless: config.headless !== false,
      userAgent: config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 2000,
      headlessNew: config.headlessNew === true || process.env.PPTR_HEADLESS_NEW === '1',
      executablePath: config.executablePath || process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH || process.env.EDGE_PATH || '',
      userDataDir: config.userDataDir || path.join(process.cwd(), 'data', 'cache', 'puppeteer-profile')
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
      const launchOptions = {
        headless: this.config.headlessNew ? 'new' : (this.config.headless !== false),
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
        ],
        userDataDir: this.config.userDataDir,
      };
      if (this.config.executablePath) {
        launchOptions.executablePath = this.config.executablePath;
      }
      this.browser = await puppeteer.launch(launchOptions);
      logger.info('Crawler initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize crawler:', error);
      logger.error('Hint: 지정된 Chrome/Edge 실행 파일 경로를 설정하세요. 예) PUPPETEER_EXECUTABLE_PATH=C:\\\Program Files\\\Google\\\Chrome\\\Application\\\chrome.exe');
      logger.error('또는: "npx puppeteer browsers install chrome" 로 브라우저를 설치하세요.');
      throw error;
    }
  }

  /**
   * 단일 매장 데이터 크롤링
   * @param {string} placeId - 네이버 플레이스 ID
   * @returns {Promise<Object>} 크롤링된 매장 데이터
   */
  async crawlPlace(placeId) {
    return this.circuitBreaker.execute(async () => {
      return exponentialBackoff(
        async () => this._crawlPlaceInternal(placeId),
        this.config.retryAttempts,
        this.config.retryDelay
      );
    });
  }

  /**
   * 내부 크롤링 로직 - Apollo State 기반 완전 파싱
   * @private
   */
  async _crawlPlaceInternal(placeId) {
    const page = await this.browser.newPage();

    try {
      await page.setUserAgent(this.config.userAgent);

      // 모바일 URL 사용 (Apollo State 접근 용이)
      const url = `https://m.place.naver.com/restaurant/${placeId}/home`;
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: this.config.timeout,
      });

      // Apollo State 및 페이지 데이터 추출
      const rawData = await page.evaluate(() => {
        const apolloState = window.__APOLLO_STATE__ || {};

        return {
          apolloState,
          // 기본 정보 (fallback용)
          basic: {
            id: window.location.pathname.split('/')[2],
            name: document.querySelector('[class*="Odyssey"]')?.textContent ||
                  document.querySelector('h1')?.textContent || '',
            category: document.querySelector('[class*="category"]')?.textContent || '',
            address: document.querySelector('[class*="address"]')?.textContent || '',
            phone: document.querySelector('[class*="phone"]')?.textContent || '',
            description: document.querySelector('[class*="description"]')?.textContent || ''
          }
        };
      });

      // Apollo State 기반 데이터 파싱
      const placeData = {
        placeId,
        crawledAt: new Date().toISOString(),

        // 기본 정보
        basic: this._extractBasicInfo(rawData.apolloState, placeId, rawData.basic),

        // 메뉴 정보 (최대 50개)
        menus: this._extractMenusFromApollo(rawData.apolloState, placeId),

        // 리뷰 정보
        reviews: {
          stats: this._extractReviewStats(rawData.apolloState, placeId),
          blogReviews: this._extractBlogReviewsFromApollo(rawData.apolloState, placeId),
          summary: this._extractReviewSummary(rawData.apolloState, placeId)
        },

        // 이미지 정보 (자동 분류)
        images: this._extractAndClassifyImages(rawData.apolloState, placeId),

        // 편의시설 및 결제수단
        facilities: this._extractFacilities(rawData.apolloState, placeId),
        payments: this._extractPayments(rawData.apolloState, placeId),

        // 원본 Apollo State (디버깅용)
        _rawApolloState: rawData.apolloState
      };

      logger.info(`Successfully crawled place: ${placeId} (Apollo State keys: ${Object.keys(rawData.apolloState).length})`);
      return placeData;

    } catch (error) {
      logger.error(`Failed to crawl place ${placeId}:`, error);
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * Apollo State에서 기본 정보 추출
   * @private
   */
  _extractBasicInfo(apolloState, placeId, fallback) {
    const placeKey = `Place:${placeId}`;
    const placeData = apolloState[placeKey] || {};

    return {
      id: placeId,
      name: placeData.name || fallback.name,
      category: placeData.category || placeData.categoryName || fallback.category,
      address: {
        road: placeData.roadAddress || placeData.address || fallback.address,
        jibun: placeData.jibunAddress || '',
        detail: placeData.addressDetail || ''
      },
      phone: placeData.phone || placeData.phoneNumber || fallback.phone,
      description: placeData.description || placeData.intro || fallback.description,
      openingHours: placeData.businessHours || placeData.openingHours || '',
      homepage: placeData.homepage || placeData.homepageUrl || '',
      tags: placeData.tags || []
    };
  }

  /**
   * Apollo State에서 메뉴 추출 (최대 50개, 추천 메뉴 우선)
   * @private
   */
  _extractMenusFromApollo(apolloState, placeId) {
    const menus = [];

    // Apollo State에서 Menu 관련 키 탐색
    Object.keys(apolloState).forEach(key => {
      if (key.startsWith('Menu:') || key.startsWith('MenuItem:')) {
        const menuData = apolloState[key];

        menus.push({
          id: menuData.id || key.split(':')[1],
          name: menuData.name || menuData.menuName || '',
          price: this._parsePrice(menuData.price || menuData.priceTagText),
          description: menuData.description || menuData.menuDescription || '',
          image: menuData.imageUrl || menuData.image?.url || null,
          isRecommended: menuData.isRecommended || menuData.isSignature || false,
          isPopular: menuData.isPopular || false
        });
      }
    });

    // 추천 메뉴 → 인기 메뉴 → 일반 메뉴 순으로 정렬
    return menus
      .sort((a, b) => {
        if (a.isRecommended !== b.isRecommended) return b.isRecommended ? 1 : -1;
        if (a.isPopular !== b.isPopular) return b.isPopular ? 1 : -1;
        return 0;
      })
      .slice(0, 50);
  }

  /**
   * Apollo State에서 리뷰 통계 추출
   * @private
   */
  _extractReviewStats(apolloState, placeId) {
    const reviewKey = Object.keys(apolloState).find(k =>
      k.startsWith('Review') || k.includes('reviewSummary')
    );

    if (!reviewKey) return { total: 0, visitor: 0, blog: 0 };

    const reviewData = apolloState[reviewKey];

    return {
      total: reviewData.totalCount || reviewData.count || 0,
      visitor: reviewData.visitorReviewCount || 0,
      blog: reviewData.blogReviewCount || 0,
      average: reviewData.averageScore || reviewData.rating || 0
    };
  }

  /**
   * Apollo State에서 블로그 리뷰 추출 (1500자 이상, 최대 10개)
   * @private
   */
  _extractBlogReviewsFromApollo(apolloState, placeId) {
    const blogReviews = [];

    Object.keys(apolloState).forEach(key => {
      if (key.startsWith('BlogReview:') || key.includes('blogReview')) {
        const review = apolloState[key];
        const content = review.content || review.description || '';

        // 1500자 이상 블로그 리뷰만 수집
        if (content.length >= 1500) {
          blogReviews.push({
            id: review.id || key.split(':')[1],
            title: review.title || '',
            content: content,
            author: review.author || review.bloggerName || '',
            date: review.date || review.createdAt || '',
            url: review.url || review.blogUrl || '',
            wordCount: content.length
          });
        }
      }
    });

    return blogReviews.slice(0, 10);
  }

  /**
   * Apollo State에서 리뷰 요약 추출
   * @private
   */
  _extractReviewSummary(apolloState, placeId) {
    const summaryKey = Object.keys(apolloState).find(k =>
      k.includes('reviewSummary') || k.includes('ReviewSummary')
    );

    if (!summaryKey) return { keywords: [], positive: [], negative: [] };

    const summary = apolloState[summaryKey];

    return {
      keywords: summary.keywords || [],
      positive: summary.positiveKeywords || [],
      negative: summary.negativeKeywords || []
    };
  }

  /**
   * Apollo State에서 이미지 추출 및 자동 분류
   * @private
   */
  _extractAndClassifyImages(apolloState, placeId) {
    const images = [];

    Object.keys(apolloState).forEach(key => {
      if (key.startsWith('Image:') || key.startsWith('Photo:')) {
        const img = apolloState[key];

        images.push({
          id: img.id || key.split(':')[1],
          url: img.url || img.imageUrl || '',
          thumbnail: img.thumbnail || img.thumbnailUrl || '',
          width: img.width || 0,
          height: img.height || 0,
          category: this._classifyImage(img),
          uploadedBy: img.author || img.uploader || '',
          uploadedAt: img.date || img.createdAt || ''
        });
      }
    });

    return images;
  }

  /**
   * 이미지 자동 분류 (exterior/interior/menu/atmosphere/etc)
   * @private
   */
  _classifyImage(imageData) {
    const tags = (imageData.tags || []).map(t => t.toLowerCase());
    const description = (imageData.description || '').toLowerCase();

    if (tags.includes('exterior') || description.includes('외관') || description.includes('간판')) {
      return 'exterior';
    }
    if (tags.includes('interior') || description.includes('내부') || description.includes('인테리어')) {
      return 'interior';
    }
    if (tags.includes('menu') || tags.includes('food') || description.includes('메뉴') || description.includes('음식')) {
      return 'menu';
    }
    if (tags.includes('atmosphere') || description.includes('분위기')) {
      return 'atmosphere';
    }

    return 'etc';
  }

  /**
   * Apollo State에서 편의시설 추출
   * @private
   */
  _extractFacilities(apolloState, placeId) {
    const facilityKey = Object.keys(apolloState).find(k =>
      k.includes('facility') || k.includes('Facility') || k.includes('amenity')
    );

    if (!facilityKey) return [];

    const facilityData = apolloState[facilityKey];
    const facilities = facilityData.list || facilityData.items || [];

    return facilities.map(f => ({
      name: f.name || f.label || '',
      available: f.available !== false,
      description: f.description || ''
    }));
  }

  /**
   * Apollo State에서 결제수단 추출
   * @private
   */
  _extractPayments(apolloState, placeId) {
    const paymentKey = Object.keys(apolloState).find(k =>
      k.includes('payment') || k.includes('Payment')
    );

    if (!paymentKey) return [];

    const paymentData = apolloState[paymentKey];
    const payments = paymentData.list || paymentData.items || [];

    return payments.map(p => p.name || p.label || p);
  }

  /**
   * 가격 문자열 파싱
   * @private
   */
  _parsePrice(priceStr) {
    if (!priceStr) return null;

    const match = String(priceStr).match(/[\d,]+/);
    if (!match) return null;

    return parseInt(match[0].replace(/,/g, ''), 10);
  }

  /**
   * 배치 크롤링
   * @param {string[]} placeIds - 매장 ID 배열
   * @returns {Promise<Object[]>} 크롤링된 데이터 배열
   */
  async crawlBatch(placeIds) {
    const results = [];

    for (const placeId of placeIds) {
      try {
        const data = await this.crawlPlace(placeId);
        results.push({ success: true, placeId, data });
      } catch (error) {
        results.push({ success: false, placeId, error: error.message });
      }
    }

    return results;
  }

  /**
   * 리소스 정리
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      logger.info('Crawler closed');
    }
  }
}
