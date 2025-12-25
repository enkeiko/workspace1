/**
 * GraphQL 응답 구조 분석
 */

import puppeteer from 'puppeteer';
import fs from 'fs';

const placeId = '1575722042';

async function analyzeGraphQL() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const graphqlResponses = [];
  const responsePromises = [];

  page.on('response', (response) => {
    const url = response.url();
    if (url.includes('graphql')) {
      const promise = response.text().then(text => {
        if (text.length > 100) {
          try {
            graphqlResponses.push(JSON.parse(text));
          } catch (e) {}
        }
      }).catch(() => {});
      responsePromises.push(promise);
    }
  });

  const url = `https://map.naver.com/p/entry/place/${placeId}`;
  console.log(`Loading: ${url}\n`);

  await page.goto(url, {
    waitUntil: 'networkidle0',
    timeout: 45000,
  });

  await Promise.all(responsePromises);
  await new Promise(r => setTimeout(r, 1000));

  console.log(`Captured ${graphqlResponses.length} GraphQL responses\n`);

  // 응답 구조 분석
  graphqlResponses.forEach((response, idx) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Response ${idx + 1} (${JSON.stringify(response).length} bytes)`);
    console.log('='.repeat(60));

    if (Array.isArray(response)) {
      response.forEach((item, itemIdx) => {
        if (item.data) {
          const dataKeys = Object.keys(item.data);
          console.log(`\n[Item ${itemIdx + 1}] data keys: ${dataKeys.join(', ')}`);

          dataKeys.forEach(key => {
            const value = item.data[key];
            if (value && typeof value === 'object') {
              const fields = Object.keys(value);
              console.log(`  ${key}: ${fields.length} fields`);

              // 중요 필드 출력
              if (value.name) console.log(`    name: ${value.name}`);
              if (value.category) console.log(`    category: ${value.category}`);
              if (value.roadAddress) console.log(`    roadAddress: ${value.roadAddress}`);
              if (value.virtualPhone) console.log(`    virtualPhone: ${value.virtualPhone}`);
              if (value.phone) console.log(`    phone: ${value.phone}`);
              if (value.total) console.log(`    total: ${value.total}`);
              if (value.totalCount) console.log(`    totalCount: ${value.totalCount}`);
              if (value.items && Array.isArray(value.items)) {
                console.log(`    items: ${value.items.length} items`);
              }
            }
          });
        }
      });
    }
  });

  // 첫 번째 응답 저장 (상세 분석용)
  if (graphqlResponses.length > 0) {
    const largestResponse = graphqlResponses.reduce((a, b) =>
      JSON.stringify(a).length > JSON.stringify(b).length ? a : b
    );
    fs.writeFileSync(
      './data/output/graphql-response-sample.json',
      JSON.stringify(largestResponse, null, 2),
      'utf-8'
    );
    console.log('\n\nLargest response saved to ./data/output/graphql-response-sample.json');
  }

  await browser.close();
  console.log('\nDone!');
}

analyzeGraphQL().catch(console.error);
