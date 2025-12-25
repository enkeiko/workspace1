/**
 * 전체 경쟁업체 수집 테스트 (네이버 + 다이닝코드)
 */

import puppeteer from 'puppeteer';
import { CompetitorCollector } from './src/modules/crawler/CompetitorCollector.js';
import fs from 'fs';

const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
};

async function testAllCompetitors() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1200, height: 800 },
  });

  try {
    const page = await browser.newPage();
    const collector = new CompetitorCollector(page);

    const placeId = '1716926393';
    const diningcodeUrl = 'https://www.diningcode.com/profile.php?rid=kyGW8k1TTTs9';

    logger.info(`Testing all competitor collection...`);
    logger.info(`Place ID: ${placeId}`);
    logger.info(`Diningcode URL: ${diningcodeUrl}`);

    const result = await collector.collectAll(placeId, diningcodeUrl, {
      limit: 10
    });

    logger.info(`\n=== 수집 결과 ===`);
    logger.info(`네이버 플레이스: ${result.naver.length}개`);
    logger.info(`다이닝코드: ${result.diningcode.length}개`);
    logger.info(`총 ${result.naver.length + result.diningcode.length}개 경쟁업체`);

    logger.info(`\n=== 네이버 플레이스 경쟁업체 ===`);
    result.naver.forEach((comp, idx) => {
      logger.info(`${idx + 1}. ${comp.name}`);
      logger.info(`   Place ID: ${comp.placeId}`);
      logger.info(`   Distance: ${comp.distance}`);
      logger.info(`   Source: ${comp.source}`);
    });

    logger.info(`\n=== 다이닝코드 경쟁업체 ===`);
    result.diningcode.forEach((comp, idx) => {
      logger.info(`${idx + 1}. ${comp.name}`);
      logger.info(`   RID: ${comp.rid}`);
      logger.info(`   Distance: ${comp.distance}`);
      logger.info(`   Source: ${comp.source}`);
    });

    // JSON으로 저장
    const output = {
      placeId,
      competitors: result
    };
    fs.writeFileSync('test-all-competitors-result.json', JSON.stringify(output, null, 2), 'utf8');
    logger.info('\nResult saved to: test-all-competitors-result.json');

    logger.info('\n브라우저를 30초간 열어둡니다.');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    logger.error(`Error: ${error.message}`);
    logger.error(error.stack);
  } finally {
    await browser.close();
  }
}

testAllCompetitors();
