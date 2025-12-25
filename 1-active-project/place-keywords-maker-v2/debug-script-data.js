/**
 * 네이버 플레이스 script 태그 데이터 분석
 */

import puppeteer from 'puppeteer';

const placeId = '1575722042';

async function debugScriptData() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  // 모바일 URL 사용
  const url = `https://m.place.naver.com/restaurant/${placeId}/home`;
  console.log(`Loading: ${url}\n`);

  await page.goto(url, {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  // 페이지의 모든 전역 변수 확인
  const globalVars = await page.evaluate(() => {
    const vars = [];
    for (const key in window) {
      if (window.hasOwnProperty(key) && key.startsWith('__')) {
        vars.push(key);
      }
    }
    return vars;
  });

  console.log('=== Global Variables (starting with __) ===');
  console.log(globalVars.join(', '));

  // script 태그 내용 분석
  const scripts = await page.evaluate(() => {
    const results = [];
    const scripts = document.querySelectorAll('script');

    scripts.forEach((script, idx) => {
      const content = script.textContent || '';
      if (content.length > 100) {
        // 데이터 관련 키워드 확인
        const hasApollo = content.includes('APOLLO');
        const hasInitial = content.includes('__INITIAL');
        const hasProps = content.includes('props');
        const hasPlace = content.includes('Place');

        if (hasApollo || hasInitial || hasProps || hasPlace) {
          results.push({
            index: idx,
            length: content.length,
            preview: content.slice(0, 200),
            hasApollo,
            hasInitial,
            hasProps,
            hasPlace,
          });
        }
      }
    });

    return results;
  });

  console.log('\n\n=== Relevant Script Tags ===');
  scripts.forEach(s => {
    console.log(`\n[Script ${s.index}] (${s.length} chars)`);
    console.log(`Apollo: ${s.hasApollo}, Initial: ${s.hasInitial}, Props: ${s.hasProps}, Place: ${s.hasPlace}`);
    console.log(`Preview: ${s.preview}...`);
  });

  // 페이지 HTML에서 데이터 패턴 찾기
  const htmlPatterns = await page.evaluate(() => {
    const html = document.documentElement.outerHTML;
    const patterns = [];

    // window.__ 패턴 찾기
    const windowMatch = html.match(/window\.(__\w+)\s*=/g);
    if (windowMatch) {
      patterns.push(...windowMatch.slice(0, 10));
    }

    // JSON 객체 시작 패턴 찾기
    const jsonMatch = html.match(/"placeId"\s*:\s*"\d+"/g);
    if (jsonMatch) {
      patterns.push(`Found placeId patterns: ${jsonMatch.length}`);
    }

    return patterns;
  });

  console.log('\n\n=== HTML Data Patterns ===');
  htmlPatterns.forEach(p => console.log(p));

  // 네트워크 요청에서 graphql 응답 확인을 위해 직접 fetch
  console.log('\n\n=== Trying GraphQL API directly ===');
  try {
    const graphqlData = await page.evaluate(async (pid) => {
      const response = await fetch('https://pcmap-api.place.naver.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operationName: 'getVisitorReviewsPhotos',
          variables: { businessId: pid, size: 10 },
          query: `query getVisitorReviewsPhotos($businessId: String!, $size: Int!) {
            visitorReviews(input: {businessId: $businessId, size: $size}) {
              items {
                id
                rating
                body
              }
            }
          }`
        }),
      });
      return await response.text();
    }, placeId);
    console.log('GraphQL response:', graphqlData.slice(0, 500));
  } catch (e) {
    console.log('GraphQL error:', e.message);
  }

  await browser.close();
  console.log('\n\nDone!');
}

debugScriptData().catch(console.error);
