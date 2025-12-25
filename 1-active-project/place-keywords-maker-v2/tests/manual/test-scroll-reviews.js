import { PlaceCrawlerV04 } from './src/modules/crawler/PlaceCrawlerV04.js';

const placeId = '1716926393'; // 라이브볼

(async () => {
  const crawler = new PlaceCrawlerV04({ headless: false });

  try {
    console.log(`\n🚀 Starting crawl for Place ID: ${placeId}`);
    console.log('='.repeat(60));

    await crawler.initialize();

    const result = await crawler.crawlPlace(placeId);

    console.log('\n📊 Crawl Results:');
    console.log('='.repeat(60));
    console.log(`매장명: ${result.basic.name}`);
    console.log(`카테고리: ${result.basic.category}`);
    console.log(`\n📝 방문자 리뷰: ${result.visitorReviewItems.length}개 수집`);

    if (result.visitorReviewItems.length > 0) {
      console.log('\n--- 리뷰 샘플 (처음 3개) ---');
      result.visitorReviewItems.slice(0, 3).forEach((review, idx) => {
        console.log(`\n${idx + 1}. ${review.author.nickname || '익명'} (방문: ${review.visitCount}회)`);
        console.log(`   ${review.body.substring(0, 100)}${review.body.length > 100 ? '...' : ''}`);
        if (review.votedKeywords && review.votedKeywords.length > 0) {
          console.log(`   키워드: ${review.votedKeywords.map(k => k.name).join(', ')}`);
        }
      });
    }

    console.log(`\n🏷️  개별 키워드: ${result.ranking.votedKeywords.length}개`);
    console.log(`⭐ 대표 키워드: ${result.ranking.representativeKeywords.length}개`);
    console.log(`🍽️  메뉴: ${result.menus.length}개`);

    console.log('\n✅ 크롤링 완료!');

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await crawler.close();
  }
})();
