/**
 * Direct test for PlaceCrawlerV04
 */

import { PlaceCrawlerV04 } from './src/modules/crawler/PlaceCrawlerV04.js';
import fs from 'fs';
import path from 'path';

const placeId = process.argv[2] || '1575722042';

async function testCrawler() {
  console.log(`\n=== Testing PlaceCrawlerV04 with Place ID: ${placeId} ===\n`);

  const crawler = new PlaceCrawlerV04({
    headless: false,
    timeout: 60000,
  });

  try {
    await crawler.initialize();
    console.log('✅ Crawler initialized\n');

    const result = await crawler.crawlPlace(placeId);

    console.log('\n=== RESULTS ===\n');
    console.log(`Place Name: ${result.basic?.name || 'N/A'}`);
    console.log(`Category: ${result.basic?.category || 'N/A'}`);
    console.log(`\nData Collection:`);
    console.log(`  - Menus: ${result.menus?.length || 0}`);
    console.log(`  - Facilities: ${result.facilities?.length || 0}`);
    console.log(`  - Payments: ${result.payments?.length || 0}`);
    console.log(`  - Review Themes: ${result.reviewThemes?.length || 0}`);
    console.log(`  - Review Menus: ${result.reviewMenus?.length || 0}`);
    console.log(`  - Visitor Review Items: ${result.visitorReviewItems?.length || 0}`);
    console.log(`  - Category Codes: ${result.categoryCodeList?.length || 0}`);
    console.log(`  - Voted Keywords: ${result.votedKeywords?.length || 0}`);

    console.log(`\n  - Visitor Review Stats:`);
    console.log(`      Total: ${result.visitorReviewStats?.total || 0}`);
    console.log(`      With Photo: ${result.visitorReviewStats?.withPhoto || 0}`);
    console.log(`      Image Reviews: ${result.visitorReviewStats?.imageReviewCount || 0}`);

    // 첫 번째 리뷰 샘플 출력
    if (result.visitorReviewItems && result.visitorReviewItems.length > 0) {
      console.log(`\n  - First Review Sample:`);
      const firstReview = result.visitorReviewItems[0];
      console.log(`      ID: ${firstReview.id}`);
      console.log(`      Body: ${firstReview.body?.substring(0, 100)}...`);
      console.log(`      Visited: ${firstReview.visited}`);
      console.log(`      Origin: ${firstReview.originType}`);
      console.log(`      Keywords: ${firstReview.votedKeywords?.map(k => k.name).join(', ') || 'None'}`);
    }

    // 파일 저장
    const outputPath = path.join(process.cwd(), 'data', 'output', `v04-test-${placeId}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`\n✅ Output saved to: ${outputPath}\n`);

    await crawler.close();
    console.log('✅ Test completed successfully!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    await crawler.close();
    process.exit(1);
  }
}

testCrawler();
