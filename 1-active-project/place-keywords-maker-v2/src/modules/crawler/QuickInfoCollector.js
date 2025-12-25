/**
 * 빠른 정보 수집기 - Place ID로부터 기본 정보만 빠르게 수집
 */

import puppeteer from 'puppeteer';

export class QuickInfoCollector {
  constructor(options = {}) {
    this.headless = options.headless !== false;
    this.userDataDir = options.userDataDir || null;
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    const launchOptions = {
      headless: this.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    };

    if (this.userDataDir) {
      launchOptions.userDataDir = this.userDataDir;
    }

    this.browser = await puppeteer.launch(launchOptions);
    this.page = await this.browser.newPage();

    await this.page.setViewport({ width: 1920, height: 1080 });
    await this.page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
  }

  /**
   * Place ID로부터 기본 정보 수집
   */
  async collect(placeId) {
    const url = `https://pcmap.place.naver.com/restaurant/${placeId}/home`;

    try {
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // 잠시 대기 (페이지 렌더링)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const info = await this.page.evaluate(() => {
        const result = {
          name: null,
          category: null,
          address: null,
          phone: null,
        };

        // 매장명 - 여러 가능한 셀렉터 시도
        const nameSelectors = [
          '.Fc1rA',
          '.GHAhO',
          'span.Fc1rA',
          '[class*="place_name"]',
          'h1',
          'h2'
        ];

        for (const selector of nameSelectors) {
          const el = document.querySelector(selector);
          if (el && el.textContent.trim()) {
            result.name = el.textContent.trim();
            break;
          }
        }

        // 카테고리
        const categorySelectors = [
          '.DJJvD',
          '.lnJFt',
          'span.DJJvD',
          '[class*="category"]'
        ];

        for (const selector of categorySelectors) {
          const el = document.querySelector(selector);
          if (el && el.textContent.trim()) {
            result.category = el.textContent.trim();
            break;
          }
        }

        // 주소
        const addressSelectors = [
          '.LDgIH',
          '.jO09N',
          'span.LDgIH',
          '[class*="address"]'
        ];

        for (const selector of addressSelectors) {
          const el = document.querySelector(selector);
          if (el && el.textContent.trim()) {
            result.address = el.textContent.trim();
            break;
          }
        }

        // 전화번호
        const phoneSelectors = [
          '.xlx7Q',
          '.mpKxN',
          'span.xlx7Q',
          '[class*="phone"]',
          '[class*="tel"]'
        ];

        for (const selector of phoneSelectors) {
          const el = document.querySelector(selector);
          if (el && el.textContent.trim()) {
            result.phone = el.textContent.trim();
            break;
          }
        }

        return result;
      });

      return {
        placeId,
        ...info,
      };
    } catch (error) {
      console.error(`[QuickInfoCollector] Error collecting ${placeId}:`, error.message);
      return {
        placeId,
        name: null,
        category: null,
        address: null,
        phone: null,
      };
    }
  }

  async cleanup() {
    if (this.page) {
      await this.page.close();
    }
    if (this.browser) {
      await this.browser.close();
    }
  }
}
