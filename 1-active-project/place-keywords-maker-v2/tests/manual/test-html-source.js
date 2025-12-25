/**
 * HTML 소스에서 KeywordList 찾기 테스트
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';

async function testHTMLSource() {
  const placeId = '1716926393';
  const url = `https://pcmap.place.naver.com/restaurant/${placeId}/home`;  // PC 버전

  console.log('🔍 HTML 소스에서 KeywordList 검색 (PC 버전)...');
  console.log(`URL: ${url}\n`);

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });  // PC 화면 크기

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const htmlContent = await page.content();

    //  HTML 저장
    await fs.writeFile('test-html-source.html', htmlContent, 'utf-8');
    console.log('✅ HTML 소스 저장: test-html-source.html\n');

    // KeywordList 검색
    console.log('🔍 "KeywordList" 검색 중...');
    const keywordListIndex = htmlContent.indexOf('KeywordList');

    if (keywordListIndex !== -1) {
      console.log(`✅ "KeywordList" 발견 (위치: ${keywordListIndex})\n`);

      // 주변 500자 출력
      const start = Math.max(0, keywordListIndex - 200);
      const end = Math.min(htmlContent.length, keywordListIndex + 1000);
      const snippet = htmlContent.substring(start, end);

      console.log('📄 주변 내용:');
      console.log('=' .repeat(80));
      console.log(snippet);
      console.log('='.repeat(80));
    } else {
      console.log('❌ "KeywordList" 못 찾음');

      // 다른 키워드 패턴 검색
      const patterns = [
        'keyword',
        'voted',
        'representative',
        'summary',
        '"keywords"',
      ];

      console.log('\n🔍 다른 키워드 패턴 검색:');
      patterns.forEach(pattern => {
        const count = (htmlContent.match(new RegExp(pattern, 'gi')) || []).length;
        console.log(`  "${pattern}": ${count}회`);
      });
    }

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    await browser.close();
  }
}

testHTMLSource();
