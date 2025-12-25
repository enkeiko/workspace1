/**
 * Single Place Test Script
 * Tests PlaceCrawlerV04 with a real Naver Place ID
 *
 * Usage: node test-single-place.js [placeId]
 * Example: node test-single-place.js 1716926393
 */

import { PlaceCrawlerV04 } from './src/modules/crawler/PlaceCrawlerV04.js';
import { logger } from './src/utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testSinglePlace(placeId) {
  const crawler = new PlaceCrawlerV04({
    headless: true,
    timeout: 30000,
  });

  try {
    logger.info(`Starting crawl for place ID: ${placeId}`);
    await crawler.initialize();

    const result = await crawler.crawlPlace(placeId);

    // 결과를 파일로 저장
    const outputDir = path.join(__dirname, 'data', 'output', 'l1');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `place-${placeId}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');

    logger.info(`✅ Crawl completed successfully!`);
    logger.info(`📁 Result saved to: ${outputPath}`);

    // 주요 정보 출력
    console.log('\n=== 기본 정보 ===');
    console.log(`이름: ${result.basic.name}`);
    console.log(`카테고리: ${result.basic.category}`);
    console.log(`주소: ${result.basic.address.road}`);
    console.log(`전화번호: ${result.basic.phone}`);
    console.log(`설명: ${result.basic.description.substring(0, 100)}...`);

    console.log('\n=== 메뉴 ===');
    console.log(`메뉴 수: ${result.menus.length}개`);
    result.menus.slice(0, 5).forEach(menu => {
      const price = menu.price ? menu.price : '가격 미표시';
      console.log(`- ${menu.name}: ${price}`);
    });

    console.log('\n=== 추가 정보 (신규 2025-11-27) ===');
    console.log(`찾아오시는 길 - 주차: ${result.directions.parking || '정보 없음'}`);
    console.log(`찾아오시는 길 - 대중교통: ${result.directions.publicTransit || '정보 없음'}`);
    console.log(`찾아오시는 길 - 추가정보: ${result.directions.additionalInfo || '정보 없음'}`);
    console.log(`소식/공지: ${result.notices.length}개`);
    if (result.notices.length > 0) {
      result.notices.forEach((notice, idx) => {
        console.log(`  ${idx + 1}. ${notice.title} (${notice.date})`);
      });
    }
    console.log(`상세 소개글 길이: ${result.detailedIntro.length}자`);
    if (result.detailedIntro.length > 0) {
      console.log(`상세 소개글: ${result.detailedIntro.substring(0, 200)}...`);
    }

    console.log('\n=== 리뷰 통계 ===');
    console.log(`방문자 리뷰: ${result.reviewStats.visitor.total}개`);
    console.log(`블로그/카페 리뷰: ${result.reviewStats.blogCafe}개`);

    console.log('\n=== 이미지 ===');
    console.log(`이미지 수: ${result.images.length}개`);

    console.log('\n=== 투표된 키워드 ===');
    result.ranking.votedKeywords.slice(0, 10).forEach(kw => {
      console.log(`- ${kw.name}: ${kw.count}표`);
    });

    console.log('\n=== 편의시설 ===');
    console.log(`편의시설: ${result.facilities.length}개`);
    result.facilities.forEach(f => {
      console.log(`- ${f.name}`);
    });

    console.log('\n=== 결제수단 ===');
    console.log(`결제수단: ${result.payments.length}개`);
    console.log(`- ${result.payments.join(', ')}`);

  } catch (error) {
    logger.error('Crawl failed:', error);
    console.error(error);
    process.exit(1);
  } finally {
    await crawler.close();
  }
}

const placeId = process.argv[2] || '1716926393';
testSinglePlace(placeId);
