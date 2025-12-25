/**
 * SearchRankCrawler 테스트 스크립트
 *
 * Usage: node test-search-rank.js [placeId] [keyword]
 * Example: node test-search-rank.js 1575722042 "화성 맛집"
 */

import { SearchRankCrawler } from './src/modules/crawler/SearchRankCrawler.js';
import { logger } from './src/utils/logger.js';
import fs from 'fs';
import path from 'path';

const placeId = process.argv[2] || '1575722042';  // 기본값: 태장식당
const keyword = process.argv[3] || '화성 맛집';

async function testSingleRank() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing SearchRankCrawler - Single Keyword`);
  console.log(`${'='.repeat(60)}\n`);
  console.log(`Place ID: ${placeId}`);
  console.log(`Keyword: ${keyword}\n`);

  const crawler = new SearchRankCrawler({
    headless: false,  // 브라우저 표시 (디버깅용)
    maxPages: 10      // 최대 10페이지 탐색 (150개 결과)
  });

  try {
    await crawler.initialize();
    console.log('Crawler initialized\n');

    const result = await crawler.findRank(keyword, placeId);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`RESULTS`);
    console.log(`${'='.repeat(60)}\n`);

    if (result) {
      console.log(`✅ Place found!`);
      console.log(`\n  Rank: ${result.rank}`);
      console.log(`  Page: ${result.page}`);
      console.log(`  Total Results: ${result.totalResults || 'N/A'}`);
      console.log(`\n  Place Name: ${result.placeName}`);
      console.log(`  Category: ${result.category}`);
      console.log(`  Rating: ${result.rating || 'N/A'}`);
      console.log(`  Review Count: ${result.reviewCount || 'N/A'}`);
      console.log(`\n  Found At: ${result.foundAt}`);

      // 결과 저장
      const outputPath = path.join(process.cwd(), 'data', 'output', `rank-${placeId}-${Date.now()}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
      console.log(`\n  Output saved to: ${outputPath}`);
    } else {
      console.log(`❌ Place not found in top ${crawler.config.maxPages * crawler.config.resultsPerPage} results`);
    }

    console.log(`\n${'='.repeat(60)}\n`);

  } catch (error) {
    console.error(`\n❌ Test failed:`, error.message);
    console.error(error.stack);
  } finally {
    await crawler.close();
    console.log('Crawler closed\n');
  }
}

async function testBatchRank() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing SearchRankCrawler - Batch Keywords`);
  console.log(`${'='.repeat(60)}\n`);
  console.log(`Place ID: ${placeId}\n`);

  const keywords = [
    '화성 맛집',
    '병점 냉삼',
    '태장식당',
    '진안동 고깃집'
  ];

  console.log(`Keywords: ${keywords.join(', ')}\n`);

  const crawler = new SearchRankCrawler({
    headless: false,
    maxPages: 10      // 최대 10페이지 탐색 (150개 결과)
  });

  try {
    await crawler.initialize();
    console.log('Crawler initialized\n');

    const results = await crawler.findRankBatch(keywords, placeId);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`BATCH RESULTS`);
    console.log(`${'='.repeat(60)}\n`);

    results.forEach((result, index) => {
      console.log(`${index + 1}. Keyword: "${result.keyword}"`);

      if (result.success) {
        if (result.rank) {
          console.log(`   ✅ Rank: ${result.rank} (Page ${result.page})`);
          console.log(`      Place: ${result.placeName}`);
          console.log(`      Total Results: ${result.totalResults || 'N/A'}`);
        } else {
          console.log(`   ❌ Not found in top results`);
        }
      } else {
        console.log(`   ❌ Error: ${result.error}`);
      }
      console.log('');
    });

    // 통계
    const successful = results.filter(r => r.success && r.rank).length;
    const notFound = results.filter(r => r.success && !r.rank).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Summary:`);
    console.log(`  Found: ${successful}/${keywords.length}`);
    console.log(`  Not Found: ${notFound}/${keywords.length}`);
    console.log(`  Failed: ${failed}/${keywords.length}`);

    // 결과 저장
    const outputPath = path.join(process.cwd(), 'data', 'output', `batch-rank-${placeId}-${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`\n  Output saved to: ${outputPath}`);

    console.log(`\n${'='.repeat(60)}\n`);

  } catch (error) {
    console.error(`\n❌ Test failed:`, error.message);
    console.error(error.stack);
  } finally {
    await crawler.close();
    console.log('Crawler closed\n');
  }
}

// Main
(async () => {
  const testMode = process.argv[4] || 'single';  // single 또는 batch

  if (testMode === 'batch') {
    await testBatchRank();
  } else {
    await testSingleRank();
  }

  process.exit(0);
})();
