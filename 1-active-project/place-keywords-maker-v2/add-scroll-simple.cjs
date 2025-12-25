const fs = require('fs');

const filePath = 'src/modules/crawler/PlaceCrawlerV04.js';
let content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');

// 1113번째 줄 (인덱스 1112) 뒤에 스크롤 코드 삽입
const scrollLines = [
  '',
  '        // 스크롤해서 더 많은 리뷰 로드 (최대 3번 스크롤)',
  '        logger.info(`Scrolling to load more reviews for ${placeId}...`);',
  '        for (let i = 0; i < 3; i++) {',
  '          await page.evaluate(() => {',
  '            window.scrollTo(0, document.body.scrollHeight);',
  '          });',
  '          await new Promise(r => setTimeout(r, 1500));',
  '        }'
];

// 1113번째 줄 뒤에 삽입
lines.splice(1113, 0, ...scrollLines);

fs.writeFileSync(filePath, lines.join('\n'), 'utf8');

console.log('Scroll code added successfully!');
