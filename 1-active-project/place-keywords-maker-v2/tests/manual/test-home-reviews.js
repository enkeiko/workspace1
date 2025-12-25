import puppeteer from 'puppeteer';

const placeId = '1716926393'; // 라이브볼

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    const mobileUrl = `https://m.place.naver.com/restaurant/${placeId}/home`;
    console.log(`📍 Visiting: ${mobileUrl}`);

    await page.goto(mobileUrl, {
      waitUntil: 'networkidle2',
      timeout: 25000,
    });

    await new Promise(r => setTimeout(r, 2000));

    // 홈 페이지 끝까지 스크롤
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 50);
      });
    });

    await new Promise(r => setTimeout(r, 1000));

    // Apollo State 추출
    const apolloState = await page.evaluate(() => {
      return window.__APOLLO_STATE__ || null;
    });

    if (!apolloState) {
      console.log('❌ No Apollo State found');
      return;
    }

    console.log('\n📊 Apollo State Keys:');
    const allKeys = Object.keys(apolloState);
    console.log(`Total keys: ${allKeys.length}`);

    // VisitorReview 관련 키 찾기
    const reviewKeys = allKeys.filter(k =>
      k.includes('VisitorReview') ||
      k.includes('Review') ||
      k.includes('review')
    );

    console.log('\n🔍 Review-related keys:');
    reviewKeys.forEach(key => {
      console.log(`  - ${key}`);
    });

    // VisitorReview:로 시작하는 키 상세 분석
    const visitorReviewKeys = allKeys.filter(k => k.startsWith('VisitorReview:'));

    console.log(`\n📝 Found ${visitorReviewKeys.length} VisitorReview entries`);

    if (visitorReviewKeys.length > 0) {
      console.log('\n샘플 리뷰 데이터:');
      visitorReviewKeys.slice(0, 3).forEach((key, idx) => {
        const review = apolloState[key];
        console.log(`\n--- Review ${idx + 1} (${key}) ---`);
        console.log('ID:', review.id || review.reviewId);
        console.log('Body:', (review.body || '').substring(0, 100) + '...');
        console.log('Author:', review.author);
        console.log('Created:', review.created);
        console.log('Visit Count:', review.visitCount);
        console.log('Keywords:', review.votedKeywords);
      });
    }

    // VisitorReviewStatsResult 확인
    const reviewStatsKey = `VisitorReviewStatsResult:${placeId}`;
    if (apolloState[reviewStatsKey]) {
      console.log('\n📊 VisitorReviewStatsResult found:');
      const stats = apolloState[reviewStatsKey];
      console.log('Total reviews:', stats.review?.totalCount);
      console.log('Avg rating:', stats.review?.avgRating);
      console.log('Has themes:', !!stats.analysis?.themes);
      console.log('Has menus:', !!stats.analysis?.menus);
      console.log('Voted keywords count:', stats.votedVisitorKeywords?.length);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // await browser.close();
  }
})();
