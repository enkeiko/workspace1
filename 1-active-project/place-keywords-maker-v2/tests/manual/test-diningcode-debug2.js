/**
 * 다이닝코드 경쟁업체 수집 디버그 v2
 */

import puppeteer from 'puppeteer';

const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
};

async function debugDiningcode() {
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
      timeout: 20000,
    });

    await new Promise(r => setTimeout(r, 1500));

    // 스크롤
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
        }, 50);
      });
    });

    await new Promise(r => setTimeout(r, 1000));

    const result = await page.evaluate(() => {
      const debugInfo = {
        sectionFound: false,
        sectionText: '',
        linkCount: 0,
        links: [],
      };

      // "비슷한 맛집" 섹션 찾기 - 공백 정규화
      const sections = Array.from(document.querySelectorAll('h2, h3, div, section'));
      let similarSection = null;

      for (const section of sections) {
        const text = (section.textContent || '').trim().replace(/\s+/g, ' ');
        if (text.includes('비슷한 맛집') && !text.includes('근처')) {
          similarSection = section.closest('section, div[class*="section"]') || section.parentElement;
          debugInfo.sectionFound = true;
          debugInfo.sectionText = text.substring(0, 100);
          break;
        }
      }

      if (!similarSection) {
        debugInfo.error = 'Section not found';
        return debugInfo;
      }

      // 비슷한 맛집 섹션에서 링크 찾기
      let allLinks = [];
      if (similarSection) {
        allLinks = similarSection.querySelectorAll('a[href*="diningcode.com/profile"]');
        debugInfo.linkCount = allLinks.length;
      } else {
        allLinks = document.querySelectorAll('a.similar_rest_card, a[href*="diningcode.com/profile"]');
        debugInfo.linkCount = allLinks.length;
        debugInfo.fallback = true;
      }

      allLinks.forEach((link, idx) => {
        if (idx < 5) {
          const href = link.href;
          const match = href.match(/rid=([^&]+)/);

          // 업체명
          const textContent = link.textContent.trim();
          const lines = textContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          const name = lines.find(l => !l.includes('현 식당') && !l.includes('거리')) || lines[0] || '';

          // 거리
          const fullText = link.textContent;
          const distMatch = fullText.match(/현 식당에서 (\d+(?:\.\d+)?(?:km|m))/);
          const distance = distMatch ? distMatch[1] : '';

          debugInfo.links.push({
            rid: match ? match[1] : '',
            name: name.substring(0, 50),
            distance: distance,
            href: href,
          });
        }
      });

      return debugInfo;
    });

    logger.info('\n=== 디버그 결과 ===');
    logger.info(`Section Found: ${result.sectionFound}`);
    logger.info(`Section Text: ${result.sectionText}`);
    logger.info(`Link Count: ${result.linkCount}`);
    logger.info(`Fallback: ${result.fallback || false}`);

    if (result.links && result.links.length > 0) {
      logger.info('\n처음 5개 링크:');
      result.links.forEach((link, idx) => {
        logger.info(`  ${idx + 1}. ${link.name}`);
        logger.info(`     RID: ${link.rid}`);
        logger.info(`     Distance: ${link.distance}`);
      });
    } else {
      logger.info('\n링크를 찾지 못했습니다.');
      if (result.error) {
        logger.error(`Error: ${result.error}`);
      }
    }

    await page.screenshot({ path: 'test-diningcode-debug2.png', fullPage: true });
    logger.info('\nScreenshot saved');

    logger.info('\n브라우저를 30초간 열어둡니다.');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    logger.error(`Error: ${error.message}`);
    logger.error(error.stack);
  } finally {
    await browser.close();
  }
}

debugDiningcode();
