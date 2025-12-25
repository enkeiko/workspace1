const fs = require('fs');

const filePath = 'src/modules/crawler/PlaceCrawlerV04.js';
let content = fs.readFileSync(filePath, 'utf8');

const scrollCode = `
        // 스크롤해서 더 많은 리뷰 로드 (최대 3번 스크롤)
        logger.info(\`Scrolling to load more reviews for \${placeId}...\`);
        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
          });
          await new Promise(r => setTimeout(r, 1500));
        }
`;

// "await new Promise(r => setTimeout(r, 1000));" 뒤에 스크롤 코드 삽입
// 방문자 리뷰 섹션의 대기 코드 찾기
const searchPattern = /(\s+await new Promise\(r => setTimeout\(r, 1000\)\);)\s+(const reviewApolloState)/;
const replacement = `$1${scrollCode}$2`;

content = content.replace(searchPattern, replacement);

fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ 스크롤 코드 추가 완료!');
