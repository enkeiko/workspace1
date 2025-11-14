/**
 * DataStorage.js
 * L1 파이프라인 데이터 저장
 *
 * L1_FEATURE_SPEC.md 명세 기반 구현
 * - 개별 매장 JSON 파일 저장
 * - 배치 저장
 * - 메타데이터 저장
 */

const fs = require('fs').promises;
const path = require('path');

class DataStorage {
  constructor(options = {}) {
    this.config = {
      basePath: options.basePath || './data/output/l1',
      prettyPrint: options.prettyPrint !== false, // 기본: pretty print
      ...options
    };

    // 디렉토리 구조
    this.paths = {
      places: path.join(this.config.basePath, 'places'),
      batch: path.join(this.config.basePath, 'batch'),
      summary: path.join(this.config.basePath, 'summary'),
      metadata: path.join(this.config.basePath, 'metadata')
    };
  }

  /**
   * 초기화: 디렉토리 생성
   */
  async initialize() {
    for (const dirPath of Object.values(this.paths)) {
      await fs.mkdir(dirPath, { recursive: true });
    }

    console.log('[DataStorage] Initialized at', this.config.basePath);
  }

  /**
   * 개별 매장 데이터 저장
   * @param {object} data - L1 출력 데이터
   * @returns {string} 저장된 파일 경로
   */
  async savePlaceData(data) {
    if (!data.place?.id) {
      throw new Error('Place ID is required');
    }

    const placeId = data.place.id;
    const fileName = `${placeId}.json`;
    const filePath = path.join(this.paths.places, fileName);

    // JSON 저장
    const content = this.config.prettyPrint
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);

    await fs.writeFile(filePath, content, 'utf-8');

    console.log(`[DataStorage] Saved place data: ${fileName}`);

    return filePath;
  }

  /**
   * 개별 매장 데이터 로드
   * @param {string} placeId - 매장 ID
   * @returns {object|null} L1 출력 데이터
   */
  async loadPlaceData(placeId) {
    const filePath = path.join(this.paths.places, `${placeId}.json`);

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null; // 파일 없음
      }
      throw error;
    }
  }

  /**
   * 배치 데이터 저장
   * @param {object[]} dataArray - L1 출력 데이터 배열
   * @param {string} batchId - 배치 ID (기본: 타임스탬프)
   * @returns {string} 저장된 파일 경로
   */
  async saveBatchData(dataArray, batchId = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const id = batchId || `batch_${timestamp}_${Date.now()}`;
    const fileName = `${id}.json`;
    const filePath = path.join(this.paths.batch, fileName);

    const batchData = {
      batch_id: id,
      created_at: new Date().toISOString(),
      count: dataArray.length,
      places: dataArray
    };

    const content = this.config.prettyPrint
      ? JSON.stringify(batchData, null, 2)
      : JSON.stringify(batchData);

    await fs.writeFile(filePath, content, 'utf-8');

    console.log(`[DataStorage] Saved batch data: ${fileName} (${dataArray.length} places)`);

    return filePath;
  }

  /**
   * 수집 요약 저장
   * @param {object} summary - 수집 요약 정보
   * @returns {string} 저장된 파일 경로
   */
  async saveSummary(summary) {
    const date = new Date().toISOString().split('T')[0];
    const fileName = `collection_summary_${date}.json`;
    const filePath = path.join(this.paths.summary, fileName);

    // 기존 요약이 있으면 로드
    let existingSummary = {};
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      existingSummary = JSON.parse(content);
    } catch (error) {
      // 파일 없으면 새로 생성
    }

    // 요약 병합
    const mergedSummary = {
      ...existingSummary,
      last_updated: new Date().toISOString(),
      ...summary
    };

    const content = this.config.prettyPrint
      ? JSON.stringify(mergedSummary, null, 2)
      : JSON.stringify(mergedSummary);

    await fs.writeFile(filePath, content, 'utf-8');

    console.log(`[DataStorage] Saved summary: ${fileName}`);

    return filePath;
  }

  /**
   * 스키마 버전 저장
   * @param {string} version - 스키마 버전
   * @returns {string} 저장된 파일 경로
   */
  async saveSchemaVersion(version) {
    const fileName = 'schema_version.json';
    const filePath = path.join(this.paths.metadata, fileName);

    const versionData = {
      version,
      updated_at: new Date().toISOString(),
      description: 'L1 Pipeline Data Schema Version'
    };

    const content = this.config.prettyPrint
      ? JSON.stringify(versionData, null, 2)
      : JSON.stringify(versionData);

    await fs.writeFile(filePath, content, 'utf-8');

    return filePath;
  }

  /**
   * 필드 매핑 정보 저장
   * @param {object} mapping - 필드 매핑 정보
   * @returns {string} 저장된 파일 경로
   */
  async saveFieldMapping(mapping) {
    const fileName = 'field_mapping.json';
    const filePath = path.join(this.paths.metadata, fileName);

    const content = this.config.prettyPrint
      ? JSON.stringify(mapping, null, 2)
      : JSON.stringify(mapping);

    await fs.writeFile(filePath, content, 'utf-8');

    return filePath;
  }

  /**
   * 모든 매장 데이터 목록 조회
   * @returns {string[]} 매장 ID 목록
   */
  async listPlaces() {
    try {
      const files = await fs.readdir(this.paths.places);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
    } catch (error) {
      return [];
    }
  }

  /**
   * 저장소 통계 조회
   * @returns {object} 통계 정보
   */
  async getStorageStats() {
    const placeCount = (await this.listPlaces()).length;

    let batchCount = 0;
    try {
      const batchFiles = await fs.readdir(this.paths.batch);
      batchCount = batchFiles.filter(f => f.endsWith('.json')).length;
    } catch (error) {
      // 디렉토리 없음
    }

    return {
      places: {
        count: placeCount,
        path: this.paths.places
      },
      batches: {
        count: batchCount,
        path: this.paths.batch
      },
      basePath: this.config.basePath
    };
  }

  /**
   * 저장소 정리 (오래된 파일 삭제)
   * @param {number} daysOld - 삭제할 파일 나이 (일)
   * @returns {number} 삭제된 파일 수
   */
  async cleanup(daysOld = 30) {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    // 배치 파일 정리
    try {
      const batchFiles = await fs.readdir(this.paths.batch);

      for (const file of batchFiles) {
        const filePath = path.join(this.paths.batch, file);
        const stats = await fs.stat(filePath);

        if (stats.mtimeMs < cutoffTime) {
          await fs.unlink(filePath);
          deletedCount++;
          console.log(`[DataStorage] Deleted old batch file: ${file}`);
        }
      }
    } catch (error) {
      console.error('[DataStorage] Cleanup error:', error.message);
    }

    return deletedCount;
  }
}

module.exports = DataStorage;
