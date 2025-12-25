/**
 * 경쟁업체 섹션 디버깅 스크립트
 * 네이버 플레이스 및 다이닝코드의 경쟁업체/유사 맛집 정보 파악
 */

import puppeteer from 'puppeteer';

const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
};

async function debugCompetitors(placeId) {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 400, height: 800 },
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36'
    );

    // 1. 네이버 플레이스 주변 비슷한 맛집
    logger.info('=== 1. 네이버 플레이스 주변 비슷한 맛집 ===');
    const naverUrl = `https://m.place.naver.com/restaurant/${placeId}/around`;
    logger.info(`Opening: ${naverUrl}`);

    await page.goto(naverUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    await new Promise(r => setTimeout(r, 2000));

    // 스크롤하여 모든 항목 로드
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

    await new Promise(r => setTimeout(r, 2000));

    const naverCompetitors = await page.evaluate((currentPlaceId) => {
      const competitors = [];

      // 모든 링크 중 플레이스 링크 찾기
      const allLinks = document.querySelectorAll('a[href*="/restaurant/"], a[href*="/place/"]');

      allLinks.forEach(link => {
        const href = link.href;
        const match = href.match(/\/(?:restaurant|place)\/(\d+)/);

        if (match && match[1] !== currentPlaceId) {
          // 링크의 부모 컨테이너에서 정보 추출
          const container = link.closest('article, li, div[class*="item"], div[class*="card"]') || link;

          // 업체명 - 여러 패턴 시도
          let name = '';
          const nameEl = container.querySelector('[class*="name"], [class*="title"], h2, h3, h4, strong');
          if (nameEl) {
            name = nameEl.textContent.trim();
          } else {
            // 링크 자체에서 텍스트 추출
            const textContent = link.textContent.trim();
            if (textContent && textContent.length > 0 && textContent.length < 50) {
              name = textContent.split('\n')[0].trim();
            }
          }

          if (name && name.length > 0 && name.length < 50) {
            // 카테고리
            let category = '';
            const categoryEl = container.querySelector('[class*="category"], [class*="type"], [class*="tag"]');
            if (categoryEl) category = categoryEl.textContent.trim();

            // 평점
            let rating = '';
            const ratingEl = container.querySelector('[class*="rating"], [class*="score"], [class*="star"]');
            if (ratingEl) rating = ratingEl.textContent.trim();

            // 리뷰 수
            let reviewCount = '';
            const reviewEl = container.querySelector('[class*="review"]');
            if (reviewEl) reviewCount = reviewEl.textContent.trim();

            // 거리
            let distance = '';
            const distanceEl = container.querySelector('[class*="distance"], [class*="meter"], [class*="km"]');
            if (distanceEl) distance = distanceEl.textContent.trim();

            competitors.push({
              placeId: match[1],
              name: name,
              category: category,
              rating: rating,
              reviewCount: reviewCount,
              distance: distance,
              url: href,
              source: 'naver_around'
            });
          }
        }
      });

      // 중복 제거 (같은 placeId)
      const unique = [];
      const seen = new Set();
      competitors.forEach(comp => {
        if (!seen.has(comp.placeId)) {
          seen.add(comp.placeId);
          unique.push(comp);
        }
      });

      return unique;
    }, placeId);

    logger.info(`Found ${naverCompetitors.length} competitors from Naver Place`);
    naverCompetitors.slice(0, 5).forEach((comp, idx) => {
      logger.info(`  ${idx + 1}. ${comp.name} (ID: ${comp.placeId})`);
      logger.info(`     Category: ${comp.category}`);
      logger.info(`     Rating: ${comp.rating}, Reviews: ${comp.reviewCount}`);
    });

    await page.screenshot({ path: 'debug-naver-competitors.png', fullPage: true });
    logger.info('Screenshot saved: debug-naver-competitors.png');

    // 2. 다이닝코드 유사 맛집
    logger.info('\n=== 2. 다이닝코드 유사 맛집 ===');

    // 먼저 네이버에서 다이닝코드 링크 찾기
    await page.goto(`https://m.place.naver.com/restaurant/${placeId}/home`, {
      waitUntil: 'networkidle2',
      timeout: 20000,
    });

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

    await new Promise(r => setTimeout(r, 2000));

    const diningcodeUrl = await page.evaluate(() => {
      const link = document.querySelector('a[href*="diningcode.com"]');
      return link ? link.href : null;
    });

    if (diningcodeUrl) {
      logger.info(`Found Diningcode URL: ${diningcodeUrl}`);

      await page.goto(diningcodeUrl, {
        waitUntil: 'networkidle2',
        timeout: 20000,
      });

      await new Promise(r => setTimeout(r, 2000));

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

      await new Promise(r => setTimeout(r, 2000));

      const diningcodeCompetitors = await page.evaluate(() => {
        const competitors = [];

        // 비슷한 맛집 섹션 찾기
        const sections = document.querySelectorAll('section, div[class*="similar"], div[class*="related"], div[class*="recommend"]');

        sections.forEach(section => {
          const sectionText = section.textContent;
          if (sectionText.includes('비슷한') || sectionText.includes('추천') || sectionText.includes('주변')) {
            // 이 섹션 내의 모든 링크
            const links = section.querySelectorAll('a[href*="diningcode.com/profile"]');

            links.forEach(link => {
              const nameEl = link.querySelector('[class*="name"], [class*="title"], h3, h4');
              const categoryEl = link.querySelector('[class*="category"], [class*="type"]');
              const ratingEl = link.querySelector('[class*="rating"], [class*="score"]');

              if (nameEl) {
                const href = link.href;
                const match = href.match(/rid=([^&]+)/);

                competitors.push({
                  rid: match ? match[1] : '',
                  name: nameEl.textContent.trim(),
                  category: categoryEl ? categoryEl.textContent.trim() : '',
                  rating: ratingEl ? ratingEl.textContent.trim() : '',
                  url: href,
                  source: 'diningcode_similar'
                });
              }
            });
          }
        });

        // 섹션을 못 찾았으면 전체에서 검색
        if (competitors.length === 0) {
          const allLinks = document.querySelectorAll('a[href*="diningcode.com/profile"]');
          allLinks.forEach((link, idx) => {
            if (idx < 10 && idx > 0) { // 첫 번째는 현재 업체이므로 스킵, 최대 9개
              const nameEl = link.querySelector('[class*="name"], [class*="title"], h3, h4, span, div');
              if (nameEl) {
                const href = link.href;
                const match = href.match(/rid=([^&]+)/);

                competitors.push({
                  rid: match ? match[1] : '',
                  name: nameEl.textContent.trim(),
                  url: href,
                  source: 'diningcode_general'
                });
              }
            }
          });
        }

        return competitors;
      });

      logger.info(`Found ${diningcodeCompetitors.length} competitors from Diningcode`);
      diningcodeCompetitors.slice(0, 5).forEach((comp, idx) => {
        logger.info(`  ${idx + 1}. ${comp.name} (RID: ${comp.rid})`);
        logger.info(`     Category: ${comp.category}`);
        logger.info(`     Rating: ${comp.rating}`);
      });

      await page.screenshot({ path: 'debug-diningcode-competitors.png', fullPage: true });
      logger.info('Screenshot saved: debug-diningcode-competitors.png');

      // 결과 저장
      const allCompetitors = {
        naver: naverCompetitors.slice(0, 10),
        diningcode: diningcodeCompetitors.slice(0, 10)
      };

      const fs = await import('fs');
      fs.writeFileSync(
        'debug-competitors-result.json',
        JSON.stringify(allCompetitors, null, 2),
        'utf-8'
      );
      logger.info('\nResults saved to: debug-competitors-result.json');

    } else {
      logger.info('No Diningcode link found');
    }

    logger.info('\n브라우저를 60초간 열어둡니다. 수동으로 확인하세요.');
    await new Promise(r => setTimeout(r, 60000));

  } catch (error) {
    logger.error('Error:', error);
  } finally {
    await browser.close();
  }
}

// 실행
const placeId = process.argv[2] || '1716926393';
debugCompetitors(placeId);
