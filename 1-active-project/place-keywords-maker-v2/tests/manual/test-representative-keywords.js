/**
 * 대표 키워드 수집 테스트
 */

import { PlaceCrawlerV04 } from './src/modules/crawler/PlaceCrawlerV04.js';
import fs from 'fs/promises';
import path from 'path';

async function testKeywords() {
  const testPlaceId = '1716926393'; // 라이브볼

  console.log('🧪 대표 키워드 수집 테스트...');
  console.log(`Place ID: ${testPlaceId}\n`);

  const crawler = new PlaceCrawlerV04({
    headless: true,
  });

  try {
    await crawler.initialize();
    console.log('✅ 크롤러 초기화 완료\n');

    const result = await crawler.crawlPlace(testPlaceId);

    console.log('📊 크롤링 결과:');
    console.log(`매장명: ${result.basic?.name}`);
    console.log(`카테고리: ${result.basic?.category}`);
    console.log(`주소: ${result.basic?.address?.road}`);
    console.log(`URL: ${result.basic?.url}\n`);

    // 대표 키워드
    const representativeKeywords = result.reviews?.summary?.keywords || [];
    console.log(`\n🏷️  대표 키워드 (${representativeKeywords.length}개):`);
    if (representativeKeywords.length > 0) {
      representativeKeywords.forEach((kw, idx) => {
        console.log(`  ${idx + 1}. ${kw.name} (${kw.count || 0}회)${kw.code ? ` [${kw.code}]` : ''}`);
      });
    } else {
      console.log('  ❌ 대표 키워드 없음');
    }

    // 개별 리뷰 키워드 (참고)
    const visitorReviews = result.visitorReviewItems || [];
    const reviewKeywordMap = new Map();
    visitorReviews.forEach(review => {
      if (review.votedKeywords) {
        review.votedKeywords.forEach(kw => {
          const key = kw.code || kw.name;
          if (reviewKeywordMap.has(key)) {
            reviewKeywordMap.get(key).count++;
          } else {
            reviewKeywordMap.set(key, { ...kw, count: 1 });
          }
        });
      }
    });
    const aggregatedReviewKeywords = Array.from(reviewKeywordMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    console.log(`\n💬 개별 리뷰 키워드 (상위 10개):`);
    if (aggregatedReviewKeywords.length > 0) {
      aggregatedReviewKeywords.forEach((kw, idx) => {
        console.log(`  ${idx + 1}. ${kw.name} (${kw.count}회)`);
      });
    } else {
      console.log('  ❌ 개별 리뷰 키워드 없음');
    }

    // 결과 저장
    const outputPath = path.join(process.cwd(), 'test-keywords-result.json');
    await fs.writeFile(
      outputPath,
      JSON.stringify({
        placeId: testPlaceId,
        name: result.basic?.name,
        url: result.basic?.url,
        representativeKeywords,
        aggregatedReviewKeywords,
        fullData: result,
      }, null, 2),
      'utf-8'
    );
    console.log(`\n💾 결과 저장: ${outputPath}`);

  } catch (error) {
    console.error('\n❌ 오류:', error.message);
    console.error(error.stack);
  } finally {
    await crawler.close();
    console.log('\n✅ 크롤러 종료');
  }
}

testKeywords();
