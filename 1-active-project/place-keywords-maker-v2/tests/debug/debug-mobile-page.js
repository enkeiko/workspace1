/**
 * 모바일 페이지 __NEXT_DATA__ 디버깅
 */

import puppeteer from 'puppeteer';
import fs from 'fs';

const placeId = '1575722042';

async function debugMobilePage() {
  const browser = await puppeteer.launch({
    headless: false, // UI 보면서 확인
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/537.36');

  const mobileUrl = `https://m.place.naver.com/restaurant/${placeId}/home`;
  console.log(`Loading: ${mobileUrl}\n`);

  await page.goto(mobileUrl, {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  await new Promise(r => setTimeout(r, 3000));

  // __APOLLO_STATE__ 추출
  const result = await page.evaluate(() => {
    const data = {
      hasNextData: !!window.__NEXT_DATA__,
      hasApolloState: !!window.__APOLLO_STATE__,
      apolloStateKeys: window.__APOLLO_STATE__ ? Object.keys(window.__APOLLO_STATE__).slice(0, 20) : [],
    };

    // __APOLLO_STATE__ 구조 분석
    if (window.__APOLLO_STATE__) {
      const state = window.__APOLLO_STATE__;

      // ROOT_QUERY 확인
      if (state.ROOT_QUERY) {
        data.rootQueryKeys = Object.keys(state.ROOT_QUERY).slice(0, 30);
      }

      // Place 엔티티 찾기
      const placeKeys = Object.keys(state).filter(k => k.startsWith('Place:'));
      data.placeKeys = placeKeys;

      // 첫 번째 Place 엔티티 필드
      if (placeKeys.length > 0) {
        const firstPlace = state[placeKeys[0]];
        data.placeFields = Object.keys(firstPlace);
      }

      // visitorReviews 관련 키 찾기
      const reviewKeys = Object.keys(state.ROOT_QUERY || {}).filter(k =>
        k.includes('visitor') || k.includes('review') || k.includes('Review')
      );
      data.reviewRelatedKeys = reviewKeys;
    }

    return data;
  });

  console.log('='.repeat(60));
  console.log('Mobile Page Analysis\n');
  console.log(`Has __NEXT_DATA__: ${result.hasNextData}`);
  console.log(`Has __APOLLO_STATE__: ${result.hasApolloState}`);
  console.log(`\n__APOLLO_STATE__ keys (first 20): ${result.apolloStateKeys.join(', ')}`);

  if (result.rootQueryKeys) {
    console.log(`\nROOT_QUERY keys (first 30):`);
    result.rootQueryKeys.forEach(key => console.log(`  - ${key}`));
  }

  if (result.placeKeys) {
    console.log(`\nPlace entities found: ${result.placeKeys.length}`);
    result.placeKeys.forEach(key => console.log(`  - ${key}`));
  }

  if (result.placeFields) {
    console.log(`\nPlace entity fields (${result.placeFields.length} total):`);
    result.placeFields.forEach(field => console.log(`  - ${field}`));
  }

  if (result.reviewRelatedKeys) {
    console.log(`\nReview-related keys in ROOT_QUERY:`);
    result.reviewRelatedKeys.forEach(key => console.log(`  - ${key}`));
  }

  // 전체 __APOLLO_STATE__ 저장
  const fullApolloState = await page.evaluate(() => {
    return window.__APOLLO_STATE__;
  });

  if (fullApolloState) {
    fs.writeFileSync(
      './data/output/mobile-apollo-state.json',
      JSON.stringify(fullApolloState, null, 2),
      'utf-8'
    );
    console.log('\nFull __APOLLO_STATE__ saved to mobile-apollo-state.json');
  }

  // 스크린샷
  await page.screenshot({
    path: './data/output/mobile-page-screenshot.png',
    fullPage: true,
  });
  console.log('Screenshot saved');

  console.log('\nWaiting 10 seconds before closing...');
  await new Promise(r => setTimeout(r, 10000));
  await browser.close();
}

debugMobilePage().catch(console.error);
