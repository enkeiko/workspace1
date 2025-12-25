#!/usr/bin/env python3
import sys

# 파일 읽기
with open('src/modules/crawler/PlaceCrawlerV04.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 1113번째 줄 뒤에 스크롤 코드 삽입
scroll_code = '''
        // 스크롤해서 더 많은 리뷰 로드 (최대 3번 스크롤)
        logger.info(`Scrolling to load more reviews for ${placeId}...`);
        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
          });
          await new Promise(r => setTimeout(r, 1500));
        }
'''

# 1113번째 줄 (인덱스 1112) 뒤에 삽입
lines.insert(1113, scroll_code)

# 파일 쓰기
with open('src/modules/crawler/PlaceCrawlerV04.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)

 print("Scroll code added!")
