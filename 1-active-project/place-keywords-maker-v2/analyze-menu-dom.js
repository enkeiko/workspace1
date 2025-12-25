/**
 * 메뉴 페이지 DOM 구조 분석
 */

import puppeteer from 'puppeteer';
import fs from 'fs';

const placeId = '1575722042';

async function analyzeMenuDOM() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const menuUrl = `https://pcmap.place.naver.com/restaurant/${placeId}/menu/list`;
  console.log(`Loading: ${menuUrl}\n`);

  await page.goto(menuUrl, {
    waitUntil: 'networkidle0',
    timeout: 30000,
  });

  await new Promise(r => setTimeout(r, 2000));

  // DOM 구조 분석
  const menuData = await page.evaluate(() => {
    const result = {
      selectors: {},
      menus: [],
      html: '',
    };

    // 다양한 선택자로 메뉴 아이템 찾기
    const selectorVariants = [
      '.menu_item',
      '[class*="MenuItem"]',
      '.list_item',
      '[class*="ListItem"]',
      '[class*="menu"]',
      'li[class*="item"]',
      'div[class*="item"]',
    ];

    for (const selector of selectorVariants) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        result.selectors[selector] = elements.length;

        // 첫 번째 요소의 HTML 저장
        if (!result.html && elements[0]) {
          result.html = elements[0].outerHTML.slice(0, 500);
        }
      }
    }

    // class 속성에 "menu"가 포함된 모든 요소 찾기
    const allElements = document.querySelectorAll('*');
    const menuRelatedClasses = new Set();

    allElements.forEach(el => {
      const classList = el.className;
      if (typeof classList === 'string' && classList.toLowerCase().includes('menu')) {
        classList.split(' ').forEach(cls => {
          if (cls.toLowerCase().includes('menu')) {
            menuRelatedClasses.add(cls);
          }
        });
      }
    });

    result.menuRelatedClasses = Array.from(menuRelatedClasses);

    // 텍스트 내용에서 가격 패턴 찾기
    const pricePattern = /\d{1,3}(,\d{3})*원/g;
    const bodyText = document.body.textContent || '';
    const prices = bodyText.match(pricePattern);
    result.priceCount = prices ? prices.length : 0;
    result.samplePrices = prices ? prices.slice(0, 5) : [];

    return result;
  });

  console.log('='.repeat(60));
  console.log('DOM Structure Analysis\n');

  console.log('Selectors that matched:');
  Object.entries(menuData.selectors).forEach(([selector, count]) => {
    console.log(`  ${selector}: ${count} elements`);
  });

  console.log('\nMenu-related classes found:');
  menuData.menuRelatedClasses.forEach(cls => {
    console.log(`  .${cls}`);
  });

  console.log(`\nPrice patterns found: ${menuData.priceCount}`);
  console.log('Sample prices:', menuData.samplePrices.join(', '));

  console.log('\nSample HTML:');
  console.log(menuData.html);

  // 스크린샷 저장
  await page.screenshot({
    path: './data/output/menu-page-screenshot.png',
    fullPage: true
  });
  console.log('\nScreenshot saved to ./data/output/menu-page-screenshot.png');

  // 전체 HTML 저장
  const fullHTML = await page.content();
  fs.writeFileSync('./data/output/menu-page.html', fullHTML, 'utf-8');
  console.log('HTML saved to ./data/output/menu-page.html');

  await browser.close();
  console.log('\nDone!');
}

analyzeMenuDOM().catch(console.error);
