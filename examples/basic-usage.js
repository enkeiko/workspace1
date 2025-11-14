/**
 * PlaceCrawler 기본 사용 예시
 */

const PlaceCrawler = require('../src/crawlers/PlaceCrawler');

async function main() {
  const crawler = new PlaceCrawler({
    headless: true,
    timeout: 30000,
    maxRetries: 3
  });

  // 이벤트 리스너
  crawler.on('initialized', () => {
    console.log('✅ Crawler initialized');
  });

  crawler.on('placeCollected', ({ placeId, level, duration }) => {
    console.log(`✅ Place ${placeId} collected (${level}) in ${duration}ms`);
  });

  crawler.on('retrying', ({ placeId, attemptNumber, delay }) => {
    console.log(`🔄 Retrying ${placeId} (attempt ${attemptNumber}) after ${delay}ms`);
  });

  crawler.on('circuitBreakerStateChanged', ({ state }) => {
    console.log(`⚡ Circuit Breaker state: ${state}`);
  });

  try {
    // 초기화
    await crawler.initialize();

    // 단일 매장 크롤링 (테스트용 가상 ID)
    const placeId = '1234567890';

    console.log(`\n🚀 Starting to crawl place: ${placeId}\n`);

    // BASIC 레벨 수집
    const basicData = await crawler.crawlPlace(placeId, { level: 'BASIC' });
    console.log('\n📊 BASIC Data:', JSON.stringify(basicData, null, 2));

    // STANDARD 레벨 수집
    // const standardData = await crawler.crawlPlace(placeId, { level: 'STANDARD' });
    // console.log('\n📊 STANDARD Data:', JSON.stringify(standardData, null, 2));

    // 통계 확인
    console.log('\n📈 Statistics:', crawler.getStats());

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // 종료
    await crawler.shutdown();
  }
}

// 실행
main().catch(console.error);
