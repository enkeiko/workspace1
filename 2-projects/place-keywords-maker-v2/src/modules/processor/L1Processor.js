/**
 * L1Processor - L1 파이프라인 처리 (데이터 수집 및 완성도 평가)
 */

import { PlaceCrawler } from '../crawler/PlaceCrawler.js';
import { DataParser } from '../parser/DataParser.js';
import { logger } from '../../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

export class L1Processor {
  constructor(config = {}) {
    this.config = config;
    this.crawler = new PlaceCrawler(config.crawler);
    this.parser = new DataParser(config.parser);
    this.outputDir = config.outputDir || './data/output/l1';
  }

  /**
   * 단일 매장 처리
   * @param {string} placeId - 네이버 플레이스 ID
   * @returns {Promise<Object>} 처리 결과
   */
  async processPlace(placeId) {
    logger.info(`Processing place: ${placeId}`);

    try {
      // 1. 크롤링
      const rawData = await this.crawler.crawlPlace(placeId);

      // 2. 파싱
      const parsedData = this.parser.parse(rawData);

      // 3. 완성도 계산
      const completeness = this.parser.calculateCompleteness(parsedData);

      const result = {
        placeId,
        data: parsedData,
        completeness,
        processedAt: new Date().toISOString(),
      };

      // 4. 결과 저장
      await this.saveResult(placeId, result);

      logger.info(`Place ${placeId} processed. Completeness: ${completeness}%`);
      return result;

    } catch (error) {
      logger.error(`Failed to process place ${placeId}:`, error);
      throw error;
    }
  }

  /**
   * 배치 처리
   * @param {string[]} placeIds - 매장 ID 배열
   * @returns {Promise<Object>} 배치 처리 결과
   */
  async processBatch(placeIds) {
    logger.info(`Starting batch processing for ${placeIds.length} places`);

    const results = {
      total: placeIds.length,
      successful: 0,
      failed: 0,
      places: [],
    };

    for (let i = 0; i < placeIds.length; i++) {
      const placeId = placeIds[i];

      try {
        const result = await this.processPlace(placeId);
        results.places.push({ success: true, ...result });
        results.successful++;
      } catch (error) {
        results.places.push({
          success: false,
          placeId,
          error: error.message,
        });
        results.failed++;
      }

      // 진행률 로깅
      const progress = ((i + 1) / placeIds.length * 100).toFixed(1);
      logger.info(`Progress: ${progress}% (${i + 1}/${placeIds.length})`);
    }

    logger.info(`Batch processing completed. Success: ${results.successful}, Failed: ${results.failed}`);
    return results;
  }

  /**
   * 결과 저장
   * @private
   */
  async saveResult(placeId, result) {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });

      const filename = `place-${placeId}.json`;
      const filepath = path.join(this.outputDir, filename);

      await fs.writeFile(
        filepath,
        JSON.stringify(result, null, 2),
        'utf-8'
      );

      logger.debug(`Result saved to ${filepath}`);
    } catch (error) {
      logger.error(`Failed to save result for ${placeId}:`, error);
      throw error;
    }
  }

  /**
   * 초기화
   */
  async initialize() {
    await this.crawler.initialize();
  }

  /**
   * 리소스 정리
   */
  async cleanup() {
    await this.crawler.close();
  }
}
