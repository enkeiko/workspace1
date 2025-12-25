/**
 * 다이닝코드 경쟁업체 수집 테스트
 */

import puppeteer from 'puppeteer';
import { CompetitorCollector } from './src/modules/crawler/CompetitorCollector.js';
import fs from 'fs';

const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
};

async function testDiningcodeCollection() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1200, height: 800 },
  });

  try {
    const page = await browser.newPage();
    const collector = new CompetitorCollector(page);

    const diningcodeUrl = 'https://www.diningcode.com/profile.php?rid=kyGW8k1TTTs9';

    logger.info(`Testing Diningcode competitor collection...`);
    logger.info(`URL: ${diningcodeUrl}`);

    const competitors = await collector.collectDiningcodeCompetitors(diningcodeUrl, 10);

    logger.info(`\n=== 수집 결과 ===`);
    logger.info(`총 ${competitors.length}개 경쟁업체 수집`);

    competitors.forEach((comp, idx) => {
      logger.info(`\n${idx + 1}. ${comp.name}`);
      logger.info(`   RID: ${comp.rid}`);
      logger.info(`   Distance: ${comp.distance}`);
      logger.info(`   URL: ${comp.url}`);
      logger.info(`   Source: ${comp.source}`);
    });

    // JSON으로 저장
    const output = { competitors };
    fs.writeFileSync('test-diningcode-result.json', JSON.stringify(output, null, 2), 'utf8');
    logger.info('\nResult saved to: test-diningcode-result.json');

    logger.info('\n브라우저를 30초간 열어둡니다.');
    await new Promise(r => setTimeout(r, 30000));

  } catch (error) {
    logger.error(`Error: ${error.message}`);
    logger.error(error.stack);
  } finally {
    await browser.close();
  }
}

testDiningcodeCollection();
