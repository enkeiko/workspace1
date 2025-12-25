/**
 * PlaceCrawler v0.4 크롤링 테스트
 */

import { PlaceCrawlerV04 } from './src/modules/crawler/PlaceCrawlerV04.js';

const placeId = '1575722042';

async function testCrawl() {
  console.log('PlaceCrawler v0.4 Test\n');
  console.log('='.repeat(50));

  const crawler = new PlaceCrawlerV04({
    headless: true,
    timeout: 45000,
    enableGraphQL: false, // GraphQL 직접 호출 비활성화 (네트워크 캡처 사용)
  });

  try {
    await crawler.initialize();
    console.log('Crawler initialized\n');

    console.log(`Crawling place: ${placeId}`);
    const startTime = Date.now();

    const result = await crawler.crawlPlace(placeId);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\nCrawling completed in ${duration}s`);
    console.log(`GraphQL responses captured: ${result._graphqlResponseCount}\n`);

    // 결과 출력
    console.log('='.repeat(50));
    console.log('RESULT SUMMARY\n');

    console.log('Basic Info:');
    console.log(`  Name: ${result.basic.name || 'N/A'}`);
    console.log(`  Category: ${result.basic.category || 'N/A'}`);
    console.log(`  Address: ${result.basic.address?.road || 'N/A'}`);
    console.log(`  Phone: ${result.basic.phone || 'N/A'}`);
    console.log(`  Opening Hours: ${result.basic.openingHours || 'N/A'}`);

    console.log('\nMenus:');
    console.log(`  Count: ${result.menus.length}`);
    if (result.menus.length > 0) {
      result.menus.slice(0, 3).forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.name} - ${m.price ? m.price.toLocaleString() + '원' : '가격 미정'}`);
      });
    }

    console.log('\nReviews:');
    console.log(`  Total: ${result.reviews.stats.total || 0}`);
    console.log(`  Visitor: ${result.reviews.stats.visitor || 0}`);
    console.log(`  Blog: ${result.reviews.stats.blog || 0}`);
    console.log(`  Average: ${result.reviews.stats.average || 0}`);
    console.log(`  Blog Reviews (1500+ chars): ${result.reviews.blogReviews.length}`);

    console.log('\nRanking Data:');
    console.log(`  Category Codes: ${result.ranking.categoryCodeList.length > 0 ? result.ranking.categoryCodeList.join(', ') : 'N/A'}`);
    console.log(`  GDID: ${result.ranking.gdid.raw || 'N/A'} (valid: ${result.ranking.gdid.isValid})`);
    console.log(`  Voted Keywords: ${result.ranking.votedKeywords.length}`);
    if (result.ranking.votedKeywords.length > 0) {
      result.ranking.votedKeywords.slice(0, 5).forEach((k, i) => {
        console.log(`    ${i + 1}. ${k.name} (${k.count})`);
      });
    }
    console.log(`  Visit Categories: ${result.ranking.visitCategories.length}`);

    console.log('\nOrder Options:');
    console.log(`  Table Order: ${result.orderOptions.isTableOrder}`);
    console.log(`  Pickup: ${result.orderOptions.pickup}`);
    console.log(`  Delivery: ${result.orderOptions.delivery}`);
    console.log(`  Booking ID: ${result.orderOptions.bookingBusinessId || 'N/A'}`);

    console.log('\nOperation Time:');
    console.log(`  Break Time: ${result.operationTime.breakTime.length > 0 ? JSON.stringify(result.operationTime.breakTime) : 'N/A'}`);
    console.log(`  Last Order: ${result.operationTime.lastOrder || 'N/A'}`);
    console.log(`  Holiday: ${result.operationTime.holiday || 'N/A'}`);

    console.log('\nImages: ' + result.images.length);
    console.log('Facilities: ' + result.facilities.length);
    console.log('Payments: ' + result.payments.length);

    console.log('\n' + '='.repeat(50));
    console.log(`\nCompleteness: ${result.completeness}%`);
    console.log(`Version: ${result._version}`);

    // JSON 파일로 저장
    const fs = await import('fs');
    const outputPath = `./data/output/v04-test-${placeId}.json`;
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`\nFull result saved to: ${outputPath}`);

  } catch (error) {
    console.error('\nError:', error.message);
    console.error(error.stack);
  } finally {
    await crawler.close();
    console.log('\nCrawler closed');
  }
}

testCrawl();
