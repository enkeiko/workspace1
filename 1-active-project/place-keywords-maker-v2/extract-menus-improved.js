/**
 * 개선된 메뉴 추출 테스트
 */

import puppeteer from 'puppeteer';
import fs from 'fs';

const placeId = '1575722042';

async function extractMenus() {
  const browser = await puppeteer.launch({
    headless: false, // 디버깅을 위해 UI 표시
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  const menuUrl = `https://pcmap.place.naver.com/restaurant/${placeId}/menu/list`;
  console.log(`Loading: ${menuUrl}\n`);

  await page.goto(menuUrl, {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  // 페이지가 완전히 로드될 때까지 대기
  await new Promise(r => setTimeout(r, 3000));

  // 스크롤하여 모든 메뉴 로드
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  await new Promise(r => setTimeout(r, 2000));

  // 메뉴 추출
  const menus = await page.evaluate(() => {
    const results = [];

    // 다양한 선택자 시도
    const selectors = [
      // 일반적인 리스트 아이템
      'li',
      'div[class*="item"]',
      'div[class*="Item"]',
      'div[class*="menu"]',
      'div[class*="Menu"]',
      // 특정 구조
      'ul > li',
      'ol > li',
      '[role="list"] > *',
      '[role="listitem"]',
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);

      elements.forEach(el => {
        const text = el.textContent || '';
        const priceMatch = text.match(/(\d{1,3}(?:,\d{3})*)\s*원/);

        if (priceMatch) {
          // 가격이 있는 요소 발견
          // 메뉴 이름 추출 (가격 이전 텍스트)
          const fullText = text.replace(/\s+/g, ' ').trim();
          const priceStr = priceMatch[0];
          const nameAndPrice = fullText.split(priceStr)[0].trim();

          if (nameAndPrice && nameAndPrice.length < 100) {
            // 메뉴 이름이 너무 길면 잘못된 것
            results.push({
              name: nameAndPrice,
              price: priceMatch[1],
              selector: selector,
              element: el.className,
            });
          }
        }
      });

      if (results.length > 0) {
        break; // 메뉴를 찾았으면 중단
      }
    }

    // 중복 제거
    const unique = [];
    const seen = new Set();
    results.forEach(item => {
      const key = `${item.name}-${item.price}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    });

    return unique;
  });

  console.log(`\nExtracted ${menus.length} menus:\n`);
  menus.forEach((m, i) => {
    console.log(`${i + 1}. ${m.name} - ${m.price}원`);
    console.log(`   (selector: ${m.selector}, class: ${m.element})`);
  });

  // 결과 저장
  fs.writeFileSync(
    './data/output/extracted-menus.json',
    JSON.stringify(menus, null, 2),
    'utf-8'
  );
  console.log('\nSaved to extracted-menus.json');

  // 스크린샷
  await page.screenshot({
    path: './data/output/menu-extraction-screenshot.png',
    fullPage: true
  });
  console.log('Screenshot saved');

  await new Promise(r => setTimeout(r, 10000)); // 10초 대기 후 종료
  await browser.close();
}

extractMenus().catch(console.error);
