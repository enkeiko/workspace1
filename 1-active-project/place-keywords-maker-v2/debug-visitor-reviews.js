/**
 * 방문자 리뷰 데이터 추출 테스트
 */

import puppeteer from 'puppeteer';
import fs from 'fs';

const placeId = '1575722042';

async function extractVisitorReviews() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/537.36');

  // 방문자 리뷰 페이지로 이동
  const reviewUrl = `https://m.place.naver.com/restaurant/${placeId}/review/visitor`;
  console.log(`Loading: ${reviewUrl}\n`);

  await page.goto(reviewUrl, {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  await new Promise(r => setTimeout(r, 3000));

  // Apollo State 추출
  const apolloState = await page.evaluate(() => {
    return window.__APOLLO_STATE__ || null;
  });

  if (!apolloState) {
    console.log('No Apollo State found');
    await browser.close();
    return;
  }

  // VisitorReview: 키 찾기
  const reviewKeys = Object.keys(apolloState).filter(k =>
    k.startsWith('VisitorReview:') ||
    k.startsWith('VisitorReviewItem:') ||
    k.startsWith('Review:')
  );

  console.log(`\nFound ${reviewKeys.length} review keys:`);
  reviewKeys.slice(0, 10).forEach(key => console.log(`  - ${key}`));

  // 첫 번째 리뷰 샘플 출력
  if (reviewKeys.length > 0) {
    const firstReview = apolloState[reviewKeys[0]];
    console.log(`\nFirst review sample:`);
    console.log(JSON.stringify(firstReview, null, 2));
  }

  // ROOT_QUERY에서 visitorReviews 쿼리 찾기
  const rootQuery = apolloState.ROOT_QUERY || {};
  const visitorReviewQuery = Object.keys(rootQuery).find(k => k.includes('visitorReviews'));

  if (visitorReviewQuery) {
    console.log(`\nFound visitorReviews query: ${visitorReviewQuery}`);
    console.log(JSON.stringify(rootQuery[visitorReviewQuery], null, 2));
  }

  // 전체 Apollo State 저장
  fs.writeFileSync(
    './data/output/visitor-reviews-apollo-state.json',
    JSON.stringify(apolloState, null, 2),
    'utf-8'
  );
  console.log('\nFull Apollo State saved to visitor-reviews-apollo-state.json');

  // 스크린샷
  await page.screenshot({
    path: './data/output/visitor-reviews-screenshot.png',
    fullPage: true,
  });
  console.log('Screenshot saved');

  console.log('\nWaiting 10 seconds before closing...');
  await new Promise(r => setTimeout(r, 10000));
  await browser.close();
}

extractVisitorReviews().catch(console.error);
