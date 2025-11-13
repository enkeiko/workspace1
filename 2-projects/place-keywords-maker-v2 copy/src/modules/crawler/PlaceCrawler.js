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
   * 내부 크롤링 로직
   * @private
   */
  async _crawlPlaceInternal(placeId) {
    const page = await this.browser.newPage();

    try {
      await page.setUserAgent(this.config.userAgent);

      const url = `https://pcmap.place.naver.com/place/${placeId}`;
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: this.config.timeout,
      });

      // 데이터 추출
      const placeData = await page.evaluate(() => {
        // TODO: 실제 선택자로 교체 필요
        return {
          id: window.location.pathname.split('/').pop(),
          name: document.querySelector('.place_name')?.textContent || '',
          category: document.querySelector('.category')?.textContent || '',
          address: document.querySelector('.address')?.textContent || '',
          phone: document.querySelector('.phone')?.textContent || '',
          // 추가 필드들...
        };
      });

      logger.info(`Successfully crawled place: ${placeId}`);
      return placeData;

    } catch (error) {
      logger.error(`Failed to crawl place ${placeId}:`, error);
      throw error;
    } finally {
      await page.close();
    }
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
