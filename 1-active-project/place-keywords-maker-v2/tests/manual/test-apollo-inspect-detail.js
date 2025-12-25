import puppeteer from 'puppeteer';
import fs from 'fs';

const placeId = '1716926393'; // 라이브볼

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    console.log(`\n🔍 Inspecting Apollo State Detail for Place ID: ${placeId}`);
    console.log('='.repeat(70));

    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    const mobileUrl = `https://m.place.naver.com/restaurant/${placeId}/home`;
    console.log(`🌐 Loading: ${mobileUrl}`);

    await page.goto(mobileUrl, {
      waitUntil: 'networkidle2',
      timeout: 25000,
    });

    console.log('✅ Page loaded, waiting for Apollo State...');
    await new Promise(r => setTimeout(r, 1000));

    const detailData = await page.evaluate((pid) => {
      const state = window.__APOLLO_STATE__ || {};

      const placeDetailKey = `PlaceDetailBase:${pid}`;
      const reviewStatsKey = `VisitorReviewStatsResult:${pid}`;

      return {
        placeDetailExists: !!state[placeDetailKey],
        placeDetail: state[placeDetailKey] || null,
        reviewStatsExists: !!state[reviewStatsKey],
        reviewStats: state[reviewStatsKey] || null,
        rootQuery: state.ROOT_QUERY || null,
      };
    }, placeId);

    console.log('\n📊 Key Existence Check:');
    console.log(`  PlaceDetailBase:${placeId} → ${detailData.placeDetailExists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log(`  VisitorReviewStatsResult:${placeId} → ${detailData.reviewStatsExists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log(`  ROOT_QUERY → ${detailData.rootQuery ? '✅ EXISTS' : '❌ NOT FOUND'}`);

    console.log('\n\n📝 PlaceDetailBase Data:');
    console.log('='.repeat(70));
    console.log(JSON.stringify(detailData.placeDetail, null, 2));

    console.log('\n\n📝 VisitorReviewStatsResult Data:');
    console.log('='.repeat(70));
    console.log(JSON.stringify(detailData.reviewStats, null, 2));

    console.log('\n\n📝 ROOT_QUERY Data (searching for keyword-related queries):');
    console.log('='.repeat(70));
    if (detailData.rootQuery) {
      const keywordQueries = Object.keys(detailData.rootQuery).filter(k =>
        k.toLowerCase().includes('keyword')
      );

      if (keywordQueries.length > 0) {
        console.log(`Found ${keywordQueries.length} keyword-related queries:`);
        keywordQueries.forEach(q => {
          console.log(`\n🔹 ${q}:`);
          console.log(JSON.stringify(detailData.rootQuery[q], null, 2).substring(0, 1000));
        });
      } else {
        console.log('❌ No keyword-related queries found in ROOT_QUERY');
        console.log('\nAll ROOT_QUERY keys:');
        Object.keys(detailData.rootQuery).slice(0, 20).forEach(k => {
          console.log(`  - ${k}`);
        });
      }
    }

    // Save full Apollo State to file for analysis
    const fullState = await page.evaluate(() => {
      return window.__APOLLO_STATE__;
    });

    fs.writeFileSync(
      'apollo-state-full.json',
      JSON.stringify(fullState, null, 2)
    );
    console.log('\n💾 Full Apollo State saved to: apollo-state-full.json');

    console.log('\n✅ Analysis Complete!');

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await browser.close();
  }
})();
