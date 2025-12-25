/**
 * 관련링크 섹션 디버깅 스크립트
 * 네이버 플레이스 페이지에서 "관련링크" 섹션의 HTML 구조 파악
 */

import puppeteer from 'puppeteer';

const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
};

async function debugRelatedLinks(placeId) {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 400, height: 800 },
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36'
    );

    const url = `https://m.place.naver.com/restaurant/${placeId}/home`;
    logger.info(`Opening: ${url}`);

    await page.goto(url, {
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

    await new Promise(r => setTimeout(r, 2000));

    // 관련링크 섹션 찾기
    const relatedLinksData = await page.evaluate(() => {
      const result = {
        found: false,
        sectionHtml: '',
        links: [],
        debugInfo: [],
      };

      // 방법 1: "관련링크", "관련 링크" 텍스트로 찾기
      const allText = Array.from(document.querySelectorAll('*'));
      const relatedLinkHeading = allText.find(el => {
        const text = el.textContent.trim();
        return text === '관련링크' || text === '관련 링크' || text.includes('관련링크');
      });

      if (relatedLinkHeading) {
        result.found = true;
        result.debugInfo.push(`Found heading: ${relatedLinkHeading.tagName}.${relatedLinkHeading.className}`);

        // 섹션 찾기
        const section = relatedLinkHeading.closest('section, div[class*="section"], div[class*="container"]') ||
                       relatedLinkHeading.parentElement;

        if (section) {
          result.sectionHtml = section.outerHTML.substring(0, 2000); // 처음 2000자만

          // 링크 추출
          const linkElements = section.querySelectorAll('a[href]');
          linkElements.forEach(link => {
            const href = link.href;
            const text = link.textContent.trim();
            const className = link.className;

            result.links.push({
              href: href,
              text: text,
              className: className,
              outerHTML: link.outerHTML.substring(0, 500),
            });
          });
        }
      } else {
        result.debugInfo.push('관련링크 섹션을 찾을 수 없습니다');

        // 모든 외부 링크 찾기
        const externalLinks = document.querySelectorAll('a[href*="http"]');
        result.debugInfo.push(`전체 외부 링크 수: ${externalLinks.length}`);

        // 다이닝코드, 망고플레이트, 캐치테이블 같은 외부 플랫폼 찾기
        const platformLinks = [];
        externalLinks.forEach((link) => {
          const href = link.href.toLowerCase();
          if (href.includes('diningcode') || href.includes('mangoplate') ||
              href.includes('catchtable') || href.includes('yogiyo') ||
              href.includes('coupang') || href.includes('baemin')) {
            platformLinks.push({
              href: link.href,
              text: link.textContent.trim(),
              className: link.className,
              platform: href.includes('diningcode') ? 'diningcode' :
                       href.includes('mangoplate') ? 'mangoplate' :
                       href.includes('catchtable') ? 'catchtable' : 'other',
            });
          }
        });

        result.debugInfo.push(`외부 플랫폼 링크 수: ${platformLinks.length}`);
        result.links.push(...platformLinks);

        // 플랫폼 링크가 없으면 처음 20개 링크 출력
        if (platformLinks.length === 0) {
          externalLinks.forEach((link, idx) => {
            if (idx < 20) {
              result.links.push({
                href: link.href,
                text: link.textContent.trim(),
                className: link.className,
              });
            }
          });
        }
      }

      return result;
    });

    logger.info('=== 관련링크 디버깅 결과 ===');
    logger.info(`Found: ${relatedLinksData.found}`);
    logger.info(`Debug Info: ${JSON.stringify(relatedLinksData.debugInfo, null, 2)}`);
    logger.info(`Links found: ${relatedLinksData.links.length}`);

    relatedLinksData.links.forEach((link, idx) => {
      logger.info(`\nLink ${idx + 1}:`);
      logger.info(`  Text: ${link.text}`);
      logger.info(`  Href: ${link.href}`);
      logger.info(`  Class: ${link.className}`);
    });

    if (relatedLinksData.sectionHtml) {
      logger.info('\n=== Section HTML (first 2000 chars) ===');
      logger.info(relatedLinksData.sectionHtml);
    }

    // 스크린샷 저장
    await page.screenshot({ path: 'debug-related-links.png', fullPage: true });
    logger.info('\nScreenshot saved: debug-related-links.png');

    // 브라우저를 열어둠 (수동 확인용)
    logger.info('\n브라우저를 열어둡니다. 수동으로 확인 후 터미널에서 Ctrl+C로 종료하세요.');
    await new Promise(r => setTimeout(r, 300000)); // 5분 대기

  } catch (error) {
    logger.error('Error:', error);
  } finally {
    await browser.close();
  }
}

// 실행
const placeId = process.argv[2] || '1716926393';
debugRelatedLinks(placeId);
