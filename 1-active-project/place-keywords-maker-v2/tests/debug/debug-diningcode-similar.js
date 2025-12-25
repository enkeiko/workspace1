/**
 * 다이닝코드 "비슷한 맛집" 섹션 디버깅
 */

import puppeteer from 'puppeteer';

const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
};

async function debugDiningcodeSimilar() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1200, height: 800 },
  });

  try {
    const page = await browser.newPage();

    // 라이브볼의 다이닝코드 URL
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

    // "비슷한 맛집" 섹션 찾기
    const result = await page.evaluate(() => {
      const info = {
        found: false,
        sections: [],
        allH2H3: [],
        similarLinks: [],
      };

      // 모든 h2, h3 제목 찾기
      const headers = document.querySelectorAll('h2, h3, h4, div[class*="title"], div[class*="heading"]');
      headers.forEach(header => {
        const text = header.textContent.trim();
        info.allH2H3.push({
          tag: header.tagName,
          text: text.substring(0, 100),
          className: header.className,
        });

        // "비슷한" 또는 "추천" 포함하는 섹션 찾기
        if (text.includes('비슷한') || text.includes('추천') || text.includes('주변') ||
            text.includes('similar') || text.includes('recommend')) {
          info.found = true;

          // 해당 섹션의 부모 찾기
          const section = header.closest('section, div[class*="section"], div[class*="box"]') ||
                         header.parentElement;

          // 섹션 내 모든 링크 찾기
          const links = section.querySelectorAll('a[href*="diningcode.com/profile"]');

          info.sections.push({
            headerText: text,
            linkCount: links.length,
          });

          // 링크 정보 추출
          links.forEach((link, idx) => {
            if (idx < 5) { // 최대 5개만
              const href = link.href;
              const match = href.match(/rid=([^&]+)/);

              const nameEl = link.querySelector('[class*="name"], [class*="title"], span, div');
              const name = nameEl ? nameEl.textContent.trim() : link.textContent.trim().substring(0, 50);

              info.similarLinks.push({
                rid: match ? match[1] : '',
                name: name,
                url: href,
              });
            }
          });
        }
      });

      // 비슷한 맛집 섹션을 못 찾았으면 모든 프로필 링크 확인
      if (!info.found) {
        const allProfileLinks = document.querySelectorAll('a[href*="diningcode.com/profile"]');
        info.sections.push({
          headerText: '(전체 프로필 링크)',
          linkCount: allProfileLinks.length,
        });
      }

      return info;
    });

    logger.info('\n=== 다이닝코드 "비슷한 맛집" 분석 결과 ===');
    logger.info(`Found similar section: ${result.found}`);
    logger.info(`\n모든 제목 (h2/h3):`);
    result.allH2H3.forEach((h, idx) => {
      logger.info(`  ${idx + 1}. [${h.tag}] ${h.text}`);
    });

    logger.info(`\n발견된 섹션:`);
    result.sections.forEach((sec, idx) => {
      logger.info(`  ${idx + 1}. "${sec.headerText}" - ${sec.linkCount}개 링크`);
    });

    if (result.similarLinks.length > 0) {
      logger.info(`\n비슷한 맛집 링크:`);
      result.similarLinks.forEach((link, idx) => {
        logger.info(`  ${idx + 1}. ${link.name} (RID: ${link.rid})`);
      });
    } else {
      logger.info('\n비슷한 맛집 링크를 찾지 못했습니다.');
    }

    await page.screenshot({ path: 'debug-diningcode-similar.png', fullPage: true });
    logger.info('\nScreenshot saved: debug-diningcode-similar.png');

    logger.info('\n브라우저를 60초간 열어둡니다. 수동으로 확인하세요.');
    await new Promise(r => setTimeout(r, 60000));

  } catch (error) {
    logger.error(`Error: ${error.message}`);
    logger.error(error.stack);
  } finally {
    await browser.close();
  }
}

debugDiningcodeSimilar();
