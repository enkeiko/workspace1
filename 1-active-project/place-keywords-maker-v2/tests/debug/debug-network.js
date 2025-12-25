/**
 * 네이버 플레이스 네트워크 요청 모니터링
 */

import puppeteer from 'puppeteer';

const placeId = '1575722042';

async function debugNetwork() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // 네트워크 요청 모니터링
  const graphqlResponses = [];

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('graphql') || url.includes('api')) {
      try {
        const text = await response.text();
        if (text.length > 100 && text.includes(placeId)) {
          graphqlResponses.push({
            url: url.slice(0, 100),
            length: text.length,
            preview: text.slice(0, 300),
          });
        }
      } catch (e) {}
    }
  });

  // place URL (PC 버전 redirect될 수 있음)
  const url = `https://map.naver.com/p/entry/place/${placeId}`;
  console.log(`Loading: ${url}\n`);

  await page.goto(url, {
    waitUntil: 'networkidle0',  // 더 엄격한 대기
    timeout: 45000,
  });

  // 최종 URL 확인
  const finalUrl = page.url();
  console.log(`Final URL: ${finalUrl}`);

  // 페이지 제목 확인
  const title = await page.title();
  console.log(`Page title: ${title}\n`);

  // GraphQL 응답 확인
  console.log(`=== GraphQL Responses (${graphqlResponses.length}) ===`);
  graphqlResponses.slice(0, 5).forEach((r, i) => {
    console.log(`\n[${i + 1}] ${r.url}`);
    console.log(`Length: ${r.length}`);
    console.log(`Preview: ${r.preview}`);
  });

  // 페이지에서 데이터 추출 시도
  const pageData = await page.evaluate((pid) => {
    // 여러 전역 변수 확인
    const sources = {};

    if (window.__APOLLO_STATE__) {
      sources.apolloState = Object.keys(window.__APOLLO_STATE__).length;
    }

    if (window.__NEXT_DATA__) {
      sources.nextData = Object.keys(window.__NEXT_DATA__).length;
    }

    // place.naver.com에서 사용하는 다른 전역 변수 확인
    for (const key in window) {
      if (key.startsWith('__') && window[key] && typeof window[key] === 'object') {
        const size = Object.keys(window[key]).length;
        if (size > 5) {
          sources[key] = size;
        }
      }
    }

    // document에서 script type="application/json" 찾기
    const jsonScripts = document.querySelectorAll('script[type="application/json"]');
    if (jsonScripts.length > 0) {
      sources.jsonScripts = jsonScripts.length;
    }

    // DOM에서 기본 정보 추출
    const placeInfo = {
      name: document.querySelector('h1, [class*="name"]')?.textContent?.trim() || '',
      category: document.querySelector('[class*="category"]')?.textContent?.trim() || '',
      address: document.querySelector('[class*="address"]')?.textContent?.trim() || '',
    };

    return { sources, placeInfo };
  }, placeId);

  console.log('\n\n=== Page Data Sources ===');
  console.log(JSON.stringify(pageData.sources, null, 2));

  console.log('\n=== Place Info from DOM ===');
  console.log(JSON.stringify(pageData.placeInfo, null, 2));

  // 스크린샷 저장
  await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
  console.log('\nScreenshot saved to debug-screenshot.png');

  await browser.close();
  console.log('\nDone!');
}

debugNetwork().catch(console.error);
