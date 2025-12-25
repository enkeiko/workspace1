import puppeteer from 'puppeteer';

const placeId = '1716926393'; // 라이브볼

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    console.log(`\n🔍 Inspecting Apollo State for Place ID: ${placeId}`);
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

    const apolloAnalysis = await page.evaluate(() => {
      const state = window.__APOLLO_STATE__ || {};
      const allKeys = Object.keys(state);

      // Search for keywordList variations
      const keywordRelatedKeys = allKeys.filter(k =>
        k.toLowerCase().includes('keyword')
      );

      // Check exact matches
      const exactMatches = {
        'keywordList': allKeys.includes('keywordList'),
        'KeywordList': allKeys.includes('KeywordList'),
        'keyword_list': allKeys.includes('keyword_list'),
      };

      // Get all keys that include "KeywordList" (current logic)
      const currentLogicMatches = allKeys.filter(k =>
        k.includes('KeywordList') || k.includes('RepresentativeKeyword') || k.includes('PlaceKeyword')
      );

      // Get sample data for keyword-related keys
      const keywordDataSamples = {};
      keywordRelatedKeys.slice(0, 5).forEach(key => {
        keywordDataSamples[key] = state[key];
      });

      return {
        totalKeys: allKeys.length,
        allKeys: allKeys, // ALL keys in Apollo State
        keywordRelatedKeys: keywordRelatedKeys,
        exactMatches: exactMatches,
        currentLogicMatches: currentLogicMatches,
        keywordDataSamples: keywordDataSamples,
        allKeywordKeys: keywordRelatedKeys, // All keys containing 'keyword'
      };
    });

    console.log('\n📊 Apollo State Analysis Results:');
    console.log('='.repeat(70));
    console.log(`\n총 키 개수: ${apolloAnalysis.totalKeys}`);

    console.log('\n📋 ALL Apollo State Keys:');
    console.log('='.repeat(70));
    apolloAnalysis.allKeys.forEach((key, idx) => {
      console.log(`  ${idx + 1}. ${key}`);
    });

    console.log('\n\n🔍 Exact Key Match Results:');
    console.log(`  "keywordList" (lowercase k): ${apolloAnalysis.exactMatches.keywordList ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log(`  "KeywordList" (uppercase K): ${apolloAnalysis.exactMatches.KeywordList ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log(`  "keyword_list" (snake_case): ${apolloAnalysis.exactMatches.keyword_list ? '✅ EXISTS' : '❌ NOT FOUND'}`);

    console.log(`\n🔑 Keyword-related Keys Found: ${apolloAnalysis.keywordRelatedKeys.length}개`);
    if (apolloAnalysis.allKeywordKeys.length > 0) {
      console.log('\nAll Keyword-related Keys:');
      apolloAnalysis.allKeywordKeys.forEach((key, idx) => {
        console.log(`  ${idx + 1}. ${key}`);
      });
    }

    console.log(`\n⚙️  Current Logic Matches: ${apolloAnalysis.currentLogicMatches.length}개`);
    if (apolloAnalysis.currentLogicMatches.length > 0) {
      console.log('Keys found by current extraction logic (includes "KeywordList", "RepresentativeKeyword", "PlaceKeyword"):');
      apolloAnalysis.currentLogicMatches.forEach((key, idx) => {
        console.log(`  ${idx + 1}. ${key}`);
      });
    }

    if (Object.keys(apolloAnalysis.keywordDataSamples).length > 0) {
      console.log('\n📝 Sample Data Structure (first 5 keyword-related keys):');
      console.log('='.repeat(70));
      Object.entries(apolloAnalysis.keywordDataSamples).forEach(([key, data]) => {
        console.log(`\n🔹 Key: ${key}`);
        console.log(JSON.stringify(data, null, 2).substring(0, 500));
        if (JSON.stringify(data).length > 500) {
          console.log('  ... (truncated)');
        }
      });
    }

    console.log('\n✅ Analysis Complete!');

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await browser.close();
  }
})();
