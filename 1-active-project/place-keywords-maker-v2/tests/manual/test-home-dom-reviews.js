import puppeteer from 'puppeteer';

const placeId = '1716926393'; // 라이브볼

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    const mobileUrl = `https://m.place.naver.com/restaurant/${placeId}/home`;
    console.log(`📍 Visiting: ${mobileUrl}`);

    await page.goto(mobileUrl, {
      waitUntil: 'networkidle2',
      timeout: 25000,
    });

    await new Promise(r => setTimeout(r, 2000));

    // 홈 페이지 끝까지 스크롤
    console.log('📜 Scrolling to load all content...');
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

    // DOM에서 리뷰 미리보기 추출
    const reviewsFromDOM = await page.evaluate(() => {
      const reviews = [];

      // 다양한 선택자 시도
      const selectors = [
        'div[class*="review"]',
        'div[class*="Review"]',
        'article[class*="review"]',
        'li[class*="review"]',
        '[data-reviewid]',
        '[class*="VisitorReview"]',
        '[class*="visitorReview"]',
      ];

      const foundElements = new Set();

      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        console.log(`Selector "${selector}": found ${elements.length} elements`);
        elements.forEach(el => foundElements.add(el));
      });

      console.log(`Total unique review elements: ${foundElements.size}`);

      // 각 요소에서 텍스트 추출
      foundElements.forEach((el, idx) => {
        const text = el.textContent?.trim();
        if (text && text.length > 20) {
          reviews.push({
            index: idx,
            className: el.className,
            text: text.substring(0, 200),
            html: el.outerHTML.substring(0, 500),
          });
        }
      });

      return reviews;
    });

    console.log(`\n📝 Found ${reviewsFromDOM.length} potential review elements from DOM`);

    if (reviewsFromDOM.length > 0) {
      reviewsFromDOM.slice(0, 5).forEach((review, idx) => {
        console.log(`\n--- Review ${idx + 1} ---`);
        console.log('Class:', review.className);
        console.log('Text:', review.text);
        console.log('---');
      });
    }

    // 특정 리뷰 섹션 찾기
    const reviewSection = await page.evaluate(() => {
      // "방문자리뷰" 텍스트가 있는 섹션 찾기
      const headings = Array.from(document.querySelectorAll('h2, h3, div, span'));
      const reviewHeading = headings.find(h =>
        h.textContent.includes('방문자') ||
        h.textContent.includes('리뷰')
      );

      if (reviewHeading) {
        return {
          found: true,
          text: reviewHeading.textContent,
          nextSibling: reviewHeading.nextElementSibling?.outerHTML?.substring(0, 500),
        };
      }

      return { found: false };
    });

    console.log('\n🔍 Review Section:', reviewSection);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // await browser.close();
  }
})();
