const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * 🔄 네이버 플레이스 배치 수집 시스템
 *
 * 여러 플레이스를 자동으로 수집하고 데이터를 정리합니다.
 */

class NaverPlaceScraper {
  constructor(options = {}) {
    this.headless = options.headless !== false; // 기본값: true
    this.delay = options.delay || 3000; // 요청 간 대기 시간 (ms)
    this.outputDir = options.outputDir || './places';
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  async init() {
    console.log('🚀 브라우저 초기화 중...\n');

    this.browser = await chromium.launch({
      headless: this.headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox'
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

    // 네이버 메인 방문 (쿠키 설정)
    console.log('📝 네이버 접속 중...');
    await this.page.goto('https://www.naver.com', { waitUntil: 'domcontentloaded' });
    await this.page.waitForTimeout(2000);
    console.log('✅ 초기화 완료\n');

    // 출력 폴더 생성
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async fetchPlace(placeId) {
    console.log(`\n📍 플레이스 수집 중: ${placeId}`);

    const url = `https://m.place.naver.com/restaurant/${placeId}/home`;

    try {
      await this.page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 60000
      });

      await this.page.waitForTimeout(3000);

      const html = await this.page.content();

      // 차단 확인
      if (html.includes('서비스 이용이 제한되었습니다')) {
        console.log('⚠️  봇 탐지됨. 수동 개입이 필요합니다.');
        console.log('브라우저에서 새로고침 버튼을 클릭해주세요...');
        await this.page.waitForTimeout(30000); // 30초 대기

        const newHtml = await this.page.content();
        return newHtml;
      }

      console.log('✅ 수집 완료');
      return html;

    } catch (error) {
      console.error(`❌ 오류: ${error.message}`);
      return null;
    }
  }

  parseHTML(html, placeId) {
    const match = html.match(/window\.__APOLLO_STATE__\s*=\s*({.+?});/s);

    if (!match) {
      console.log('⚠️  APOLLO_STATE를 찾을 수 없습니다.');
      return null;
    }

    try {
      const apolloState = JSON.parse(match[1]);
      const placeKey = `PlaceDetailBase:${placeId}`;
      const placeDetail = apolloState[placeKey];

      if (!placeDetail) {
        console.log('⚠️  플레이스 정보를 찾을 수 없습니다.');
        return null;
      }

      // 메뉴 수집
      const menus = [];
      Object.keys(apolloState).forEach(key => {
        if (key.startsWith(`Menu:${placeId}_`)) {
          const menu = apolloState[key];
          menus.push({
            name: menu.name,
            price: menu.price ? `${Number(menu.price).toLocaleString()}원` : null,
            description: menu.description || null,
            recommend: menu.recommend || false
          });
        }
      });

      return {
        id: placeDetail.id,
        name: placeDetail.name,
        category: placeDetail.category,
        roadAddress: placeDetail.roadAddress,
        address: placeDetail.address,
        phone: placeDetail.phone || '정보 없음',
        rating: placeDetail.visitorReviewsScore || 0,
        reviewCount: placeDetail.visitorReviewsTotal || 0,
        conveniences: placeDetail.conveniences || [],
        paymentInfo: placeDetail.paymentInfo || [],
        microReviews: placeDetail.microReviews || [],
        menus: menus,
        parkingInfo: placeDetail.road || null,
        url: `https://map.naver.com/p/entry/place/${placeId}`,
        collectedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ 파싱 오류: ${error.message}`);
      return null;
    }
  }

  async scrapePlace(placeId) {
    const html = await this.fetchPlace(placeId);

    if (!html) {
      return null;
    }

    const data = this.parseHTML(html, placeId);

    if (data) {
      // 개별 파일 저장
      const filename = path.join(this.outputDir, `place-${placeId}.json`);
      fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`💾 저장: ${filename}`);

      // 요약 출력
      console.log(`   📌 ${data.name} (${data.category})`);
      console.log(`   📍 ${data.roadAddress}`);
      console.log(`   ⭐ ${data.rating} (리뷰 ${data.reviewCount}개)`);
    }

    return data;
  }

  async scrapePlaces(placeIds) {
    console.log(`\n🎯 총 ${placeIds.length}개 플레이스 수집 시작\n`);
    console.log('=' .repeat(60));

    const results = [];

    for (let i = 0; i < placeIds.length; i++) {
      const placeId = placeIds[i];
      console.log(`\n[${i + 1}/${placeIds.length}] 처리 중...`);

      const data = await this.scrapePlace(placeId);
      results.push(data);

      // 마지막이 아니면 대기
      if (i < placeIds.length - 1) {
        console.log(`\n⏱️  ${this.delay / 1000}초 대기 중...`);
        await this.page.waitForTimeout(this.delay);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ 수집 완료!\n');

    // 전체 결과 저장
    const allDataFile = path.join(this.outputDir, 'all-places.json');
    fs.writeFileSync(
      allDataFile,
      JSON.stringify({
        totalCount: results.length,
        collectedAt: new Date().toISOString(),
        places: results
      }, null, 2),
      'utf-8'
    );

    console.log(`📦 전체 데이터 저장: ${allDataFile}\n`);

    // 통계 출력
    const successful = results.filter(r => r !== null).length;
    const failed = results.length - successful;

    console.log('📊 통계:');
    console.log(`   ✅ 성공: ${successful}개`);
    console.log(`   ❌ 실패: ${failed}개`);
    console.log(`   📁 저장 위치: ${this.outputDir}\n`);

    return results;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔚 브라우저 종료');
    }
  }
}

// CLI 실행
async function main() {
  // 명령줄 인자로 플레이스 ID 받기
  const args = process.argv.slice(2);

  let placeIds = [];

  // 파일에서 읽기
  if (args[0] === '--file' && args[1]) {
    const fileContent = fs.readFileSync(args[1], 'utf-8');
    placeIds = fileContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));

    console.log(`📄 파일에서 ${placeIds.length}개 ID 로드: ${args[1]}\n`);
  }
  // 직접 입력
  else if (args.length > 0) {
    placeIds = args;
  }
  // 기본 예제
  else {
    placeIds = ['1768171911']; // 히도
    console.log('💡 예제 모드: 1개 플레이스만 수집합니다.\n');
    console.log('사용법:');
    console.log('  node batch-scraper.js <place_id1> <place_id2> ...');
    console.log('  node batch-scraper.js --file place-ids.txt\n');
  }

  const scraper = new NaverPlaceScraper({
    headless: false, // 브라우저 창 표시 (봇 탐지 우회)
    delay: 5000,     // 5초 대기
    outputDir: './places'
  });

  try {
    await scraper.init();
    await scraper.scrapePlaces(placeIds);
  } catch (error) {
    console.error('\n❌ 치명적 오류:', error);
  } finally {
    await scraper.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = { NaverPlaceScraper };
