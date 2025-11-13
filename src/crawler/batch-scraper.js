/**
 * Batch Scraper - Multiple stores with progress indicators
 * Parallel processing with configurable concurrency
 */

import { scrapePlaceData } from './ultimate-scraper.js';
import configManager from '../services/config-manager.js';
import logger, { logProgress } from '../lib/logger.js';

/**
 * Scrape multiple places in batch with progress tracking
 * @param {string[]} placeIds - Array of place IDs
 * @param {Object} options - Batch options
 * @returns {Promise<Object>} Batch results
 */
export async function scrapeBatch(placeIds, options = {}) {
  const config = configManager.getAll();
  const {
    maxConcurrent = config.performance.max_concurrent_crawls,
    onProgress = null
  } = options;

  logger.info(`Starting batch scrape for ${placeIds.length} places (max concurrent: ${maxConcurrent})`);

  const results = {
    successful: [],
    failed: [],
    total: placeIds.length,
    startTime: Date.now()
  };

  // Process in batches to respect concurrency limit
  for (let i = 0; i < placeIds.length; i += maxConcurrent) {
    const batch = placeIds.slice(i, Math.min(i + maxConcurrent, placeIds.length));

    logger.info(`Processing batch ${Math.floor(i / maxConcurrent) + 1}: ${batch.length} places`);

    const batchPromises = batch.map(async (placeId) => {
      try {
        const placeData = await scrapePlaceData(placeId);
        results.successful.push({
          placeId,
          data: placeData
        });

        // Progress callback
        const current = results.successful.length + results.failed.length;
        logProgress(current, results.total, `Scraped place ${placeId}`);

        if (onProgress) {
          onProgress(current, results.total, placeId, null);
        }

        return { success: true, placeId, data: placeData };

      } catch (error) {
        logger.error(`Failed to scrape place ${placeId}`, {
          error: error.message,
          code: error.code
        });

        results.failed.push({
          placeId,
          error: error.message,
          code: error.code || 'E_UNKNOWN'
        });

        // Progress callback
        const current = results.successful.length + results.failed.length;
        logProgress(current, results.total, `Failed place ${placeId}`);

        if (onProgress) {
          onProgress(current, results.total, placeId, error);
        }

        return { success: false, placeId, error };
      }
    });

    // Wait for current batch to complete
    await Promise.allSettled(batchPromises);

    // Small delay between batches
    if (i + maxConcurrent < placeIds.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  results.endTime = Date.now();
  results.duration = results.endTime - results.startTime;
  results.successRate = ((results.successful.length / results.total) * 100).toFixed(2);

  logger.info(`Batch scrape completed: ${results.successful.length}/${results.total} successful (${results.successRate}%)`);
  logger.info(`Duration: ${(results.duration / 1000).toFixed(2)}s`);

  return results;
}

/**
 * Scrape places from array with detailed progress
 * @param {string[]} placeIds - Place IDs to scrape
 * @param {Function} progressCallback - Progress callback function
 * @returns {Promise<Object>} Results object
 */
export async function scrapeWithProgress(placeIds, progressCallback) {
  return scrapeBatch(placeIds, {
    onProgress: progressCallback
  });
}

export default {
  scrapeBatch,
  scrapeWithProgress
};
