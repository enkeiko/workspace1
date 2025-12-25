/**
 * L1Processor - L1 파이프라인 처리 (8단계 프로세스)
 * V2.1: 소스 스캔 → 크롤링 → 통합 → 지역 파싱 → 키워드 분류 → 평가 → 정렬 → 저장
 */

import { PlaceCrawler } from '../crawler/PlaceCrawler.js';
import { DataParser } from '../parser/DataParser.js';
import { AddressParser } from '../parser/AddressParser.js';
import { KeywordClassifier } from '../parser/KeywordClassifier.js';
import { logger } from '../../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

export class L1Processor {
  constructor(config = {}) {
    this.config = config;
    this.crawler = new PlaceCrawler(config.crawler);
    this.parser = new DataParser(config.parser);
    this.addressParser = new AddressParser();
    this.keywordClassifier = new KeywordClassifier();
    this.outputDir = config.outputDir || './data/output/l1';
    this.inputDir = config.inputDir || './data/input';
  }

  /**
   * 단일 매장 처리 (8단계 파이프라인)
   * @param {string} placeId - 네이버 플레이스 ID
   * @returns {Promise<Object>} 처리 결과
   */
  async processPlace(placeId) {
    logger.info(`[L1 Pipeline] Processing place: ${placeId}`);

    try {
      // Stage 1: 데이터 소스 스캔 (수동 데이터 로드)
      logger.debug(`[Stage 1/8] Scanning data sources...`);
      const manualData = await this._loadManualData(placeId);

      // Stage 2: 크롤링 (Apollo State 기반)
      logger.debug(`[Stage 2/8] Crawling place data...`);
      const crawledData = await this.crawler.crawlPlace(placeId);

      // Stage 3: 데이터 통합
      logger.debug(`[Stage 3/8] Integrating data sources...`);
      const integratedData = this._integrateData(crawledData, manualData);

      // Stage 4: 지역 파싱 (AddressParser)
      logger.debug(`[Stage 4/8] Parsing address...`);
      const addressParsed = this.addressParser.parse(integratedData.basic?.address || {});

      // Stage 5: 키워드 분류 (KeywordClassifier)
      logger.debug(`[Stage 5/8] Classifying keywords...`);
      const keywords = this.keywordClassifier.classify(integratedData, addressParsed);

      // Stage 6: 완성도 평가 (115점 만점)
      logger.debug(`[Stage 6/8] Calculating completeness...`);
      const completeness = this.parser.calculateCompleteness(
        integratedData,
        keywords,
        manualData
      );

      // Stage 7: 데이터 구조화
      logger.debug(`[Stage 7/8] Structuring final data...`);
      const result = {
        placeId,
        processedAt: new Date().toISOString(),
        pipeline: 'L1-v2.1',

        // 크롤링된 원본 데이터
        crawledData: {
          basic: integratedData.basic,
          menus: integratedData.menus,
          reviews: integratedData.reviews,
          images: integratedData.images,
          facilities: integratedData.facilities,
          payments: integratedData.payments
        },

        // 파싱된 데이터
        parsed: {
          address: addressParsed,
          keywords: keywords
        },

        // 완성도 평가
        completeness: completeness,

        // 수동 데이터
        manualData: manualData || null,

        // 메타 정보
        meta: {
          crawledAt: integratedData.crawledAt,
          keywordStats: this.keywordClassifier.getStatistics(keywords)
        }
      };

      // Stage 8: 저장
      logger.debug(`[Stage 8/8] Saving result...`);
      await this.saveResult(placeId, result);

      logger.info(`[L1 Pipeline] Place ${placeId} completed. Score: ${completeness.totalScore}/${completeness.maxScore} (${completeness.grade})`);
      return result;

    } catch (error) {
      logger.error(`[L1 Pipeline] Failed to process place ${placeId}:`, error);
      throw error;
    }
  }

  /**
   * Stage 1: 수동 데이터 로드
   * @private
   */
  async _loadManualData(placeId) {
    try {
      // 현재 키워드 파일 로드
      const keywordsPath = path.join(this.inputDir, 'current_keywords.json');
      let currentKeywords = [];

      try {
        const keywordsContent = await fs.readFile(keywordsPath, 'utf-8');
        const allKeywords = JSON.parse(keywordsContent);
        currentKeywords = allKeywords[placeId] || [];
      } catch (err) {
        logger.debug(`No current keywords file found: ${keywordsPath}`);
      }

      // 수동 메모 파일 로드
      const notesPath = path.join(this.inputDir, 'manual_notes.json');
      let notes = '';

      try {
        const notesContent = await fs.readFile(notesPath, 'utf-8');
        const allNotes = JSON.parse(notesContent);
        notes = allNotes[placeId] || '';
      } catch (err) {
        logger.debug(`No manual notes file found: ${notesPath}`);
      }

      return {
        currentKeywords,
        notes
      };

    } catch (error) {
      logger.warn(`Failed to load manual data for ${placeId}:`, error);
      return null;
    }
  }

  /**
   * Stage 3: 데이터 통합
   * @private
   */
  _integrateData(crawledData, manualData) {
    // 크롤링 데이터를 기본으로 사용
    const integrated = { ...crawledData };

    // 수동 데이터가 있으면 우선순위로 병합
    if (manualData) {
      // 수동 키워드를 태그로 추가
      if (manualData.currentKeywords && manualData.currentKeywords.length > 0) {
        if (!integrated.basic) integrated.basic = {};
        if (!integrated.basic.tags) integrated.basic.tags = [];
        integrated.basic.tags = [
          ...integrated.basic.tags,
          ...manualData.currentKeywords
        ];
      }

      // 수동 메모를 설명에 추가
      if (manualData.notes && manualData.notes.trim().length > 0) {
        if (!integrated.basic) integrated.basic = {};
        if (integrated.basic.description) {
          integrated.basic.description += '\n\n[수동 메모]\n' + manualData.notes;
        } else {
          integrated.basic.description = manualData.notes;
        }
      }
    }

    return integrated;
  }

  /**
   * 배치 처리 (Stage 7: 정렬 포함)
   * @param {string[]} placeIds - 매장 ID 배열
   * @param {Object} options - { sortBy: 'completeness', order: 'desc' }
   * @returns {Promise<Object>} 배치 처리 결과
   */
  async processBatch(placeIds, options = {}) {
    logger.info(`[L1 Batch] Starting batch processing for ${placeIds.length} places`);

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
      logger.info(`[L1 Batch] Progress: ${progress}% (${i + 1}/${placeIds.length})`);
    }

    // Stage 7: 정렬 (완성도 기준)
    if (options.sortBy === 'completeness') {
      const order = options.order === 'asc' ? 1 : -1;
      results.places.sort((a, b) => {
        if (!a.success) return 1;
        if (!b.success) return -1;
        const scoreA = a.completeness?.totalScore || 0;
        const scoreB = b.completeness?.totalScore || 0;
        return (scoreB - scoreA) * order;
      });
      logger.info(`[L1 Batch] Results sorted by completeness (${options.order || 'desc'})`);
    }

    // 배치 요약 통계
    const successfulPlaces = results.places.filter(p => p.success);
    if (successfulPlaces.length > 0) {
      const avgScore = successfulPlaces.reduce((sum, p) => sum + (p.completeness?.totalScore || 0), 0) / successfulPlaces.length;
      const gradeDistribution = successfulPlaces.reduce((acc, p) => {
        const grade = p.completeness?.grade || 'UNKNOWN';
        acc[grade] = (acc[grade] || 0) + 1;
        return acc;
      }, {});

      results.statistics = {
        averageScore: Math.round(avgScore * 10) / 10,
        gradeDistribution
      };

      logger.info(`[L1 Batch] Average score: ${results.statistics.averageScore}/115`);
      logger.info(`[L1 Batch] Grade distribution:`, gradeDistribution);
    }

    logger.info(`[L1 Batch] Completed. Success: ${results.successful}, Failed: ${results.failed}`);
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
