/**
 * Single Place Test Script
 * Tests L1 pipeline with a real Naver Place ID
 *
 * Usage: node test-single-place.js [placeId]
 * Example: node test-single-place.js 1768171911
 */

import { L1Processor } from './src/modules/processor/L1Processor.js';
import { logger } from './src/utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testSinglePlace(placeId) {
  logger.info(`=== Testing Place ID: ${placeId} ===`);

  const processor = new L1Processor({
    crawler: {
      headless: false, // Show browser for debugging
      timeout: 60000,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH || process.env.EDGE_PATH
    },
    outputDir: path.join(__dirname, 'data', 'output', 'l1'),
    inputDir: path.join(__dirname, 'data', 'input')
  });

  try {
    // Initialize crawler
    logger.info('Initializing crawler...');
    await processor.initialize();

    // Process place
    logger.info('Starting L1 pipeline...');
    const result = await processor.processPlace(placeId);

    // Log results
    logger.info('=== RESULTS ===');
    logger.info(`Place: ${result.crawledData?.basic?.name || 'Unknown'}`);
    logger.info(`Category: ${result.crawledData?.basic?.category || 'Unknown'}`);
    logger.info(`Completeness: ${result.completeness.totalScore}/${result.completeness.maxScore} (${result.completeness.grade})`);
    logger.info(`\nBreakdown:`);
    Object.entries(result.completeness.breakdown).forEach(([key, value]) => {
      logger.info(`  - ${key}: ${value}`);
    });

    logger.info(`\nKeywords:`);
    logger.info(`  - Core: ${result.parsed?.keywords?.core?.slice(0, 5).join(', ') || 'None'}`);
    logger.info(`  - Location: ${result.parsed?.keywords?.location?.slice(0, 5).join(', ') || 'None'}`);
    logger.info(`  - Menu: ${result.parsed?.keywords?.menu?.slice(0, 5).join(', ') || 'None'}`);

    logger.info(`\nOutput saved to: data/output/l1/place-${placeId}.json`);

    // Cleanup
    await processor.cleanup();

    logger.info('\n✅ Test completed successfully!');
    process.exit(0);

  } catch (error) {
    logger.error('❌ Test failed:', error);
    logger.error('Stack:', error.stack);

    await processor.cleanup();
    process.exit(1);
  }
}

// Main
const placeId = process.argv[2];

if (!placeId) {
  console.error('Usage: node test-single-place.js [placeId]');
  console.error('Example: node test-single-place.js 1768171911');
  console.error('\nKnown working Place IDs:');
  console.error('  - 1768171911 (from V1 test data)');
  console.error('  - 1265317185 (from V1 test data)');
  process.exit(1);
}

testSinglePlace(placeId);
