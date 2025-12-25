/**
 * 다이닝코드 "비슷한 맛집" HTML 구조 상세 분석
 */

import puppeteer from 'puppeteer';

const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
};

async function debugDiningcodeHTML() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1200, height: 800 },
  });

  try {
    const page = await browser.newPage();

    const diningcodeUrl = 'https://www.diningcode.com/profile.php?rid=kyGW8k1TTTs9';

    logger.info(`Opening: ${diningcodeUrl}`);

    await page.goto(diningcodeUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    await new Promise(r => setTimeout(r, 3000));

    // 페이지 끝까지 스크롤
    logger.info('Scrolling to bottom...');
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
        }, 100);
      });
    });

    await new Promise(r => setTimeout(r, 3000));

    // HTML 구조 상세 분석
    const result = await page.evaluate(() => {
      const info = {
        similarSection: null,
        competitorCards: [],
        allAnchors: [],
        cardStructure: [],
      };

      // "비슷한 맛집" 섹션 찾기
      const headers = document.querySelectorAll('h2, h3, div[class*="title"], div[class*="heading"]');
      let similarSection = null;

      for (const header of headers) {
        const text = header.textContent.trim().replace(/\s+/g, ' '); // 모든 공백을 하나의 스페이스로
        if (text.includes('비슷한 맛집') && !text.includes('근처')) {
          similarSection = header.closest('section, div[class*="section"], div[class*="box"]') ||
                          header.parentElement;
          info.similarSection = {
            headerText: text.substring(0, 100),
            sectionHTML: similarSection ? similarSection.outerHTML.substring(0, 500) : 'NOT FOUND',
            sectionClass: similarSection ? similarSection.className : '',
          };
          break;
        }
      }

      if (!similarSection) {
        return info;
      }

      // 섹션 내 모든 앵커 태그 찾기
      const anchors = similarSection.querySelectorAll('a');
      anchors.forEach((a, idx) => {
        if (idx < 15) {
          info.allAnchors.push({
            href: a.href,
            text: a.textContent.trim().substring(0, 50),
            className: a.className,
            hasOnclick: a.onclick ? 'YES' : 'NO',
          });
        }
      });

      // 경쟁업체로 보이는 카드/아이템 찾기
      // 다양한 셀렉터 시도
      const selectors = [
        'div[class*="item"]',
        'div[class*="card"]',
        'div[class*="restaurant"]',
        'div[class*="place"]',
        'li',
        'article',
      ];

      for (const selector of selectors) {
        const elements = similarSection.querySelectorAll(selector);
        if (elements.length > 0) {
          info.cardStructure.push({
            selector: selector,
            count: elements.length,
            firstElementHTML: elements[0] ? elements[0].outerHTML.substring(0, 300) : '',
            firstElementClass: elements[0] ? elements[0].className : '',
          });

          // 첫 3개 요소 상세 분석
          elements.forEach((el, idx) => {
            if (idx < 3) {
              const name = el.textContent.trim().split('\n')[0].trim();

              // rid 추출 시도
              let rid = '';

              // 1. href에서 찾기
              const link = el.querySelector('a');
              if (link && link.href) {
                const match = link.href.match(/rid=([^&]+)/);
                if (match) rid = match[1];
              }

              // 2. onclick에서 찾기
              if (!rid && el.onclick) {
                const onclickStr = el.onclick.toString();
                const match = onclickStr.match(/rid=([^&'"]+)/);
                if (match) rid = match[1];
              }

              // 3. data 속성에서 찾기
              if (!rid) {
                rid = el.getAttribute('data-rid') ||
                      el.getAttribute('data-id') ||
                      el.getAttribute('data-restaurant-id') || '';
              }

              // 4. 부모의 링크에서 찾기
              if (!rid) {
                const parentLink = el.closest('a');
                if (parentLink && parentLink.href) {
                  const match = parentLink.href.match(/rid=([^&]+)/);
                  if (match) rid = match[1];
                }
              }

              info.competitorCards.push({
                selector: selector,
                index: idx,
                name: name.substring(0, 50),
                rid: rid,
                className: el.className,
                hasLink: !!link,
                linkHref: link ? link.href : '',
                hasOnclick: el.onclick ? 'YES' : 'NO',
                innerHTML: el.innerHTML.substring(0, 200),
              });
            }
          });
        }
      }

      return info;
    });

    logger.info('\n=== 다이닝코드 HTML 구조 분석 ===');

    if (result.similarSection) {
      logger.info('\n비슷한 맛집 섹션:');
      logger.info(`  Header: ${result.similarSection.headerText}`);
      logger.info(`  Section Class: ${result.similarSection.sectionClass}`);
    }

    logger.info(`\n섹션 내 앵커 태그 (${result.allAnchors.length}개):`);
    result.allAnchors.forEach((a, idx) => {
      logger.info(`  ${idx + 1}. ${a.text}`);
      logger.info(`     href: ${a.href}`);
      logger.info(`     class: ${a.className}`);
    });

    logger.info('\n발견된 카드 구조:');
    result.cardStructure.forEach((struct, idx) => {
      logger.info(`  ${idx + 1}. Selector: ${struct.selector}`);
      logger.info(`     Count: ${struct.count}`);
      logger.info(`     Class: ${struct.firstElementClass}`);
    });

    logger.info('\n경쟁업체 카드 상세:');
    result.competitorCards.forEach((card, idx) => {
      logger.info(`  ${idx + 1}. ${card.name}`);
      logger.info(`     RID: ${card.rid || 'NOT FOUND'}`);
      logger.info(`     Selector: ${card.selector}`);
      logger.info(`     Has Link: ${card.hasLink}, Has Onclick: ${card.hasOnclick}`);
      if (card.linkHref) {
        logger.info(`     Link: ${card.linkHref}`);
      }
    });

    await page.screenshot({ path: 'debug-diningcode-html.png', fullPage: true });
    logger.info('\nScreenshot saved: debug-diningcode-html.png');

    logger.info('\n브라우저를 60초간 열어둡니다. 수동으로 확인하세요.');
    await new Promise(r => setTimeout(r, 60000));

  } catch (error) {
    logger.error(`Error: ${error.message}`);
    logger.error(error.stack);
  } finally {
    await browser.close();
  }
}

debugDiningcodeHTML();
