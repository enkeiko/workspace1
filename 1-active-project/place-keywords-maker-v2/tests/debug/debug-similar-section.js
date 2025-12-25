/**
 * "이 장소와 비슷한 맛집" 섹션 디버깅 스크립트
 */

import puppeteer from 'puppeteer';
import { CompetitorCollector } from './src/modules/crawler/CompetitorCollector.js';

const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
};

async function debugSimilarSection(placeId) {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 400, height: 800 },
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36'
    );

    logger.info('=== 네이버 플레이스 "이 장소와 비슷한 맛집" 테스트 ===');

    const collector = new CompetitorCollector(page);
    const competitors = await collector.collectNaverCompetitors(placeId, 10);

    logger.info(`\n✅ 수집된 경쟁업체: ${competitors.length}개\n`);

    competitors.forEach((comp, idx) => {
      logger.info(`${idx + 1}. ${comp.name}`);
      logger.info(`   - PlaceID: ${comp.placeId}`);
      logger.info(`   - Category: ${comp.category}`);
      logger.info(`   - Rating: ${comp.rating || 'N/A'}`);
      logger.info(`   - Reviews: ${comp.reviewCount || 'N/A'}`);
      logger.info(`   - Distance: ${comp.distance || 'N/A'}`);
      logger.info(`   - URL: ${comp.url}`);
      logger.info('');
    });

    // 결과 저장
    const fs = await import('fs');
    fs.writeFileSync(
      'debug-similar-section-result.json',
      JSON.stringify({ competitors }, null, 2),
      'utf-8'
    );
    logger.info('결과 저장: debug-similar-section-result.json');

    logger.info('\n브라우저를 60초간 열어둡니다. 수동으로 확인하세요.');
    await new Promise(r => setTimeout(r, 60000));

  } catch (error) {
    logger.error(`Error: ${error.message}`);
    logger.error(error.stack);
  } finally {
    await browser.close();
  }
}

// 실행
const placeId = process.argv[2] || '1716926393';
debugSimilarSection(placeId);
