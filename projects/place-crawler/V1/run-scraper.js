const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { parseUltimate } = require('./ultimate-scraper.js');

/**
 * 🚀 안정적인 크롤러 실행기
 *
 * 브라우저 재시작, 오류 복구 등을 자동으로 처리합니다.
 */

class StableScraper {
  constructor(options = {}) {
    this.headless = options.headless !== false;
    this.outputDir = options.outputDir || './places-advanced';
    this.browser = null;
    this.context = null;
    this.page = null;
    this.retryCount = options.retryCount || 3;
  }

  async init() {
    try {
      console.log('🚀 브라우저 초기화 중...');

      // 기존 브라우저가 있으면 닫기
      if (this.browser) {
        await this.browser.close().catch(() => {});
      }

      this.browser = await chromium.launch({
        headless: this.headless,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          '--disable-dev-shm-usage'
        ]
      });

      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        locale: 'ko-KR',
        timezoneId: 'Asia/Seoul'
      });

      this.page = await this.context.newPage();

      // 봇 탐지 우회
      await this.page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
        window.chrome = { runtime: {} };
      });

      // 네이버 메인 방문
      console.log('📝 네이버 접속 중...');
      await this.page.goto('https://www.naver.com', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      await this.page.waitForTimeout(2000);

      console.log('✅ 초기화 완료\n');

      // 출력 폴더 생성
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true });
      }

      return true;
    } catch (error) {
      console.error('❌ 초기화 실패:', error.message);
      return false;
    }
  }

  async fetchPlace(placeId, retryAttempt = 0) {
    console.log(`\n📍 플레이스 ${placeId} 수집 중... (시도 ${retryAttempt + 1}/${this.retryCount})`);

    try {
      const url = `https://m.place.naver.com/restaurant/${placeId}/home`;

      await this.page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 60000
      });

      await this.page.waitForTimeout(3000);

      const html = await this.page.content();

      // 차단 확인
      if (html.includes('서비스 이용이 제한되었습니다')) {
        console.log('⚠️  봇 탐지됨. 30초 대기 후 재시도...');
        await this.page.waitForTimeout(30000);

        // 재시도
        if (retryAttempt < this.retryCount - 1) {
          return await this.fetchPlace(placeId, retryAttempt + 1);
        } else {
          throw new Error('봇 탐지 - 수동 개입 필요');
        }
      }

      console.log('✅ 페이지 로드 완료');
      return html;

    } catch (error) {
      if (error.message.includes('has been closed') || error.message.includes('Target closed')) {
        console.log('⚠️  브라우저가 닫혔습니다. 재시작 중...');

        // 브라우저 재시작
        const restarted = await this.init();

        if (restarted && retryAttempt < this.retryCount - 1) {
          console.log('🔄 재시도 중...');
          await this.page.waitForTimeout(2000);
          return await this.fetchPlace(placeId, retryAttempt + 1);
        }
      }

      throw error;
    }
  }

  parseApolloState(html) {
    const match = html.match(/window\.__APOLLO_STATE__\s*=\s*({.+?});/s);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  async scrapePlace(placeId) {
    console.log('\n' + '='.repeat(70));
    console.log(`🎯 플레이스 ${placeId} 완전 수집 시작`);
    console.log('='.repeat(70));

    try {
      // HTML 가져오기
      const html = await this.fetchPlace(placeId);

      // Apollo State 추출
      const apolloState = this.parseApolloState(html);

      if (!apolloState) {
        throw new Error('APOLLO_STATE를 찾을 수 없습니다.');
      }

      // 파일 저장
      const apolloFile = path.join(this.outputDir, `place-${placeId}-apollo.json`);
      fs.writeFileSync(apolloFile, JSON.stringify(apolloState, null, 2), 'utf-8');
      console.log(`💾 Apollo State 저장: ${apolloFile}`);

      const htmlFile = path.join(this.outputDir, `place-${placeId}.html`);
      fs.writeFileSync(htmlFile, html, 'utf-8');
      console.log(`💾 HTML 저장: ${htmlFile}`);

      // 완벽 파싱
      console.log('\n🔥 완벽 파싱 시작...');
      const fullData = parseUltimate(apolloFile, placeId);

      console.log('\n✅ 수집 완료!\n');
      this.printSummary(fullData);

      return fullData;

    } catch (error) {
      console.error(`\n❌ 오류 발생: ${error.message}`);
      throw error;
    }
  }

  printSummary(data) {
    console.log('=== 📋 수집 요약 ===\n');
    console.log(`📌 이름: ${data.name}`);
    console.log(`🏷️  카테고리: ${data.category}`);
    console.log(`📍 주소: ${data.roadAddress}`);
    console.log(`📞 전화: ${data.phone}`);
    console.log(`⭐ 평점: ${data.reviewStats.score} (리뷰 ${data.reviewStats.total}개)`);
    console.log(`🍴 메뉴: ${data.menus.length}개 (추천 ${data.menuSummary.recommended}개)`);

    if (data.menuSummary.priceRange) {
      console.log(`💰 가격대: ${data.menuSummary.priceRange.min.toLocaleString()}원 ~ ${data.menuSummary.priceRange.max.toLocaleString()}원`);
    }

    console.log(`💬 블로그 리뷰: ${data.blogReviews.length}개`);
    console.log(`📸 이미지: ${data.images.all.length}개`);
    console.log(`\n🔗 ${data.url}\n`);
  }

  async close() {
    if (this.browser) {
      try {
        await this.browser.close();
        console.log('🔚 브라우저 종료');
      } catch (e) {
        // 이미 닫혔을 수 있음
      }
    }
  }
}

// CLI 실행
async function main() {
  const placeId = process.argv[2];

  if (!placeId) {
    console.log('\n사용법: node run-scraper.js <플레이스ID>\n');
    console.log('예시: node run-scraper.js 1768171911\n');
    process.exit(1);
  }

  const scraper = new StableScraper({
    headless: false,
    outputDir: './places-advanced',
    retryCount: 3
  });

  try {
    await scraper.init();
    const data = await scraper.scrapePlace(placeId);

    console.log('✨ 모든 수집 완료!');
    console.log(`📁 결과: places-advanced/place-${placeId}-FULL.json\n`);

  } catch (error) {
    console.error('\n💥 최종 실패:', error.message);
    console.error('\n해결 방법:');
    console.log('1. 인터넷 연결 확인');
    console.log('2. 플레이스 ID 확인 (https://map.naver.com/p/entry/place/[ID])');
    console.log('3. 잠시 후 다시 시도');
    console.log('4. 브라우저 창이 열리면 수동으로 새로고침\n');
  } finally {
    await scraper.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = { StableScraper };
