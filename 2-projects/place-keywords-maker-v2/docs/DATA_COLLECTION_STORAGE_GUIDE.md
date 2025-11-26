# 업체정보 수집/저장 최적화 가이드
**작성일**: 2025-11-14
**버전**: 2.1.0
**목적**: L1 데이터 수집 및 저장의 정교함과 사용성 극대화

---

## 📋 목차
1. [개요](#1-개요)
2. [데이터 수집 최적화](#2-데이터-수집-최적화)
3. [데이터 저장 전략](#3-데이터-저장-전략)
4. [캐싱 및 성능 최적화](#4-캐싱-및-성능-최적화)
5. [데이터 검증 및 무결성](#5-데이터-검증-및-무결성)
6. [에러 처리 및 복구](#6-에러-처리-및-복구)
7. [실시간 모니터링](#7-실시간-모니터링)

---

## 1. 개요

### 1.1 현재 문제점
- ⚠️ 데이터 중복 수집 (재크롤링 시)
- ⚠️ 캐시 미사용으로 인한 비효율
- ⚠️ 부분 실패 시 롤백 부재
- ⚠️ 데이터 검증 로직 미약
- ⚠️ 저장 포맷 최적화 부족

### 1.2 개선 목표
✅ **수집 효율성**: 변경된 데이터만 업데이트
✅ **저장 최적화**: 계층적 구조 + 압축 + 인덱싱
✅ **캐싱 전략**: 메모리/파일 2단계 캐시
✅ **데이터 무결성**: 스키마 검증 + 트랜잭션
✅ **성능**: 배치 처리 + 병렬화

---

## 2. 데이터 수집 최적화

### 2.1 증분 업데이트 (Incremental Update)
**목적**: 변경된 데이터만 재수집하여 크롤링 비용 절감

#### 구현: 변경 감지 시스템
```javascript
/**
 * 파일: src/modules/collector/IncrementalCollector.js
 * 증분 업데이트 수집기
 */
export class IncrementalCollector {
  constructor(config = {}) {
    this.config = config;
    this.hashCache = new Map(); // placeId → dataHash
    this.lastCrawled = new Map(); // placeId → timestamp
  }

  /**
   * 재수집 필요 여부 판단
   * @param {string} placeId
   * @returns {Promise<boolean>}
   */
  async needsRecrawl(placeId) {
    const lastTime = this.lastCrawled.get(placeId);

    // 1. 첫 수집
    if (!lastTime) return true;

    // 2. 시간 기반 갱신 (24시간)
    const hoursSinceLastCrawl = (Date.now() - lastTime) / (1000 * 60 * 60);
    if (hoursSinceLastCrawl >= 24) return true;

    // 3. 우선순위 매장 (6시간)
    if (this.isPriorityPlace(placeId) && hoursSinceLastCrawl >= 6) {
      return true;
    }

    return false;
  }

  /**
   * 데이터 해시 생성
   * @param {Object} data
   * @returns {string} SHA-256 해시
   */
  async generateHash(data) {
    const crypto = await import('crypto');
    const jsonStr = JSON.stringify(this._normalizeForHash(data));
    return crypto.createHash('sha256').update(jsonStr).digest('hex');
  }

  /**
   * 해시 비교용 데이터 정규화
   * (타임스탬프 제외, 순서 정렬)
   */
  _normalizeForHash(data) {
    const normalized = { ...data };

    // 타임스탬프 필드 제거
    delete normalized.crawledAt;
    delete normalized.processedAt;
    delete normalized.timestamp;

    // 배열 정렬 (순서 무관하게)
    if (normalized.menus) {
      normalized.menus = normalized.menus.sort((a, b) =>
        (a.id || a.name).localeCompare(b.id || b.name)
      );
    }

    return normalized;
  }

  /**
   * 변경 감지
   * @param {string} placeId
   * @param {Object} newData
   * @returns {Object} { changed: boolean, diff: Object }
   */
  async detectChanges(placeId, newData) {
    const oldHash = this.hashCache.get(placeId);
    const newHash = await this.generateHash(newData);

    if (!oldHash || oldHash !== newHash) {
      this.hashCache.set(placeId, newHash);
      this.lastCrawled.set(placeId, Date.now());

      return {
        changed: true,
        diff: this._calculateDiff(placeId, newData)
      };
    }

    return { changed: false, diff: null };
  }

  /**
   * 차이점 계산 (디버깅용)
   */
  _calculateDiff(placeId, newData) {
    // TODO: 상세 diff 계산 (deep-diff 라이브러리 활용)
    return {
      placeId,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 우선순위 매장 판별
   */
  isPriorityPlace(placeId) {
    // 현재 키워드 보유 매장은 우선순위
    const priorityList = this.config.priorityPlaces || [];
    return priorityList.includes(placeId);
  }
}
```

#### 사용 예시
```javascript
// L1Processor에서 활용
async process(placeIds) {
  const collector = new IncrementalCollector(this.config);
  const placesToCrawl = [];

  for (const placeId of placeIds) {
    if (await collector.needsRecrawl(placeId)) {
      placesToCrawl.push(placeId);
    } else {
      logger.info(`Skipping ${placeId} (no changes)`);
    }
  }

  logger.info(`Crawling ${placesToCrawl.length}/${placeIds.length} places`);
  const rawData = await this.crawler.crawlBatch(placesToCrawl);
}
```

### 2.2 배치 처리 최적화
**목적**: 대량 데이터 수집 시 성능 향상

#### 병렬 크롤링 (동시 실행)
```javascript
/**
 * 파일: src/modules/crawler/PlaceCrawler.js
 * 병렬 배치 크롤링 추가
 */
export class PlaceCrawler {
  /**
   * 병렬 배치 크롤링
   * @param {string[]} placeIds
   * @param {number} concurrency - 동시 실행 수 (기본: 3)
   * @returns {Promise<Object[]>}
   */
  async crawlBatchParallel(placeIds, concurrency = 3) {
    const results = [];
    const chunks = this._chunkArray(placeIds, concurrency);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      logger.info(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} places)`);

      // 동시 실행
      const chunkResults = await Promise.allSettled(
        chunk.map(placeId => this.crawlPlace(placeId))
      );

      // 결과 정리
      chunkResults.forEach((result, idx) => {
        const placeId = chunk[idx];

        if (result.status === 'fulfilled') {
          results.push({ success: true, placeId, data: result.value });
        } else {
          results.push({ success: false, placeId, error: result.reason.message });
        }
      });

      // 청크 간 딜레이 (네이버 부하 방지)
      if (i < chunks.length - 1) {
        await this._delay(2000);
      }
    }

    return results;
  }

  /**
   * 배열 청크 분할
   */
  _chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * 딜레이
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 2.3 우선순위 큐
**목적**: 중요 매장 우선 처리

```javascript
/**
 * 파일: src/modules/collector/PriorityQueue.js
 * 우선순위 기반 수집 큐
 */
export class PriorityQueue {
  constructor() {
    this.queue = [];
  }

  /**
   * 항목 추가
   * @param {string} placeId
   * @param {number} priority - 낮을수록 우선 (1 = 최우선)
   */
  enqueue(placeId, priority = 10) {
    this.queue.push({ placeId, priority });
    this.queue.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 항목 꺼내기
   */
  dequeue() {
    return this.queue.shift()?.placeId;
  }

  /**
   * 대량 추가 (자동 우선순위 계산)
   * @param {string[]} placeIds
   * @param {Object} metadata - { currentKeywords, completeness }
   */
  enqueueBatch(placeIds, metadata = {}) {
    placeIds.forEach(placeId => {
      const priority = this._calculatePriority(placeId, metadata);
      this.enqueue(placeId, priority);
    });
  }

  /**
   * 우선순위 계산
   */
  _calculatePriority(placeId, metadata) {
    let priority = 10; // 기본값

    // 1. 현재 키워드 보유 → 최우선
    if (metadata.currentKeywords?.[placeId]?.length > 0) {
      priority = 1;
    }

    // 2. 완성도 높음 → 우선
    else if (metadata.completeness?.[placeId]?.score >= 90) {
      priority = 3;
    }

    // 3. 완성도 중간 → 보통
    else if (metadata.completeness?.[placeId]?.score >= 60) {
      priority = 5;
    }

    // 4. 완성도 낮음 → 후순위
    else {
      priority = 10;
    }

    return priority;
  }

  /**
   * 큐 크기
   */
  size() {
    return this.queue.length;
  }

  /**
   * 큐 비우기
   */
  clear() {
    this.queue = [];
  }
}
```

---

## 3. 데이터 저장 전략

### 3.1 계층적 파일 구조
**목적**: 데이터 조회 및 관리 효율화

#### 디렉토리 구조
```
data/
├── l1-output/
│   ├── places/                    # 개별 매장 데이터
│   │   ├── 2025/                  # 연도별 분류
│   │   │   ├── 01/                # 월별 분류
│   │   │   │   ├── 1768171911.json
│   │   │   │   ├── 1265317185.json
│   │   │   │   └── ...
│   │   │   └── 02/
│   │   └── index.json             # 매장 인덱스
│   │
│   ├── summaries/                 # 요약 데이터
│   │   ├── data_collected_l1.json
│   │   ├── keyword_elements_l1.json
│   │   └── current_keywords_l1.json
│   │
│   ├── metadata/                  # 메타데이터
│   │   ├── hashes.json            # 데이터 해시 캐시
│   │   ├── timestamps.json        # 최종 크롤링 시간
│   │   └── stats.json             # 통계
│   │
│   └── archive/                   # 아카이브 (7일 이상)
│       └── 2025-01-07/
│           └── places/
└── cache/                         # 임시 캐시
    └── puppeteer-profile/
```

#### 구현: 저장 매니저
```javascript
/**
 * 파일: src/modules/storage/StorageManager.js
 * 계층적 저장 관리자
 */
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../../utils/logger.js';

export class StorageManager {
  constructor(config = {}) {
    this.baseDir = config.baseDir || './data/l1-output';
    this.placesDir = path.join(this.baseDir, 'places');
    this.summariesDir = path.join(this.baseDir, 'summaries');
    this.metadataDir = path.join(this.baseDir, 'metadata');
    this.archiveDir = path.join(this.baseDir, 'archive');
  }

  /**
   * 초기화
   */
  async initialize() {
    await fs.mkdir(this.placesDir, { recursive: true });
    await fs.mkdir(this.summariesDir, { recursive: true });
    await fs.mkdir(this.metadataDir, { recursive: true });
    await fs.mkdir(this.archiveDir, { recursive: true });

    logger.info('Storage initialized');
  }

  /**
   * 매장 데이터 저장 (날짜별 분류)
   * @param {string} placeId
   * @param {Object} data
   */
  async savePlace(placeId, data) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const yearDir = path.join(this.placesDir, String(year));
    const monthDir = path.join(yearDir, month);

    await fs.mkdir(monthDir, { recursive: true });

    const filepath = path.join(monthDir, `${placeId}.json`);
    await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');

    logger.debug(`Saved place ${placeId} to ${filepath}`);

    // 인덱스 업데이트
    await this._updateIndex(placeId, filepath);
  }

  /**
   * 매장 데이터 로드
   * @param {string} placeId
   * @returns {Promise<Object|null>}
   */
  async loadPlace(placeId) {
    const filepath = await this._getPlaceFilepath(placeId);

    if (!filepath) {
      logger.warn(`Place ${placeId} not found`);
      return null;
    }

    try {
      const content = await fs.readFile(filepath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.error(`Failed to load place ${placeId}:`, error);
      return null;
    }
  }

  /**
   * 요약 데이터 저장
   * @param {string} filename
   * @param {Object} data
   */
  async saveSummary(filename, data) {
    const filepath = path.join(this.summariesDir, filename);
    await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
    logger.debug(`Saved summary to ${filepath}`);
  }

  /**
   * 메타데이터 저장
   * @param {string} filename
   * @param {Object} data
   */
  async saveMetadata(filename, data) {
    const filepath = path.join(this.metadataDir, filename);
    await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * 메타데이터 로드
   * @param {string} filename
   * @returns {Promise<Object>}
   */
  async loadMetadata(filename) {
    const filepath = path.join(this.metadataDir, filename);

    try {
      const content = await fs.readFile(filepath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return {};
    }
  }

  /**
   * 인덱스 업데이트
   * @private
   */
  async _updateIndex(placeId, filepath) {
    const indexPath = path.join(this.placesDir, 'index.json');
    let index = {};

    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      index = JSON.parse(content);
    } catch (error) {
      // 인덱스 파일 없으면 생성
    }

    index[placeId] = {
      filepath,
      updatedAt: new Date().toISOString()
    };

    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }

  /**
   * 매장 파일 경로 조회
   * @private
   */
  async _getPlaceFilepath(placeId) {
    const indexPath = path.join(this.placesDir, 'index.json');

    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      const index = JSON.parse(content);
      return index[placeId]?.filepath || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 오래된 데이터 아카이브 (7일 이상)
   */
  async archiveOldData(daysThreshold = 7) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    const indexPath = path.join(this.placesDir, 'index.json');
    const content = await fs.readFile(indexPath, 'utf-8');
    const index = JSON.parse(content);

    const archived = [];

    for (const [placeId, info] of Object.entries(index)) {
      const updatedAt = new Date(info.updatedAt);

      if (updatedAt < thresholdDate) {
        // 아카이브로 이동
        const archivePath = path.join(
          this.archiveDir,
          updatedAt.toISOString().split('T')[0],
          'places',
          `${placeId}.json`
        );

        await fs.mkdir(path.dirname(archivePath), { recursive: true });
        await fs.rename(info.filepath, archivePath);

        archived.push(placeId);
        delete index[placeId];
      }
    }

    // 인덱스 업데이트
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');

    logger.info(`Archived ${archived.length} old places`);
    return archived;
  }
}
```

### 3.2 데이터 압축
**목적**: 디스크 공간 절약 (JSON → gzip)

```javascript
/**
 * 파일: src/modules/storage/CompressionManager.js
 * 데이터 압축 관리자
 */
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export class CompressionManager {
  /**
   * JSON 압축 저장
   * @param {string} filepath
   * @param {Object} data
   */
  async saveCompressed(filepath, data) {
    const jsonStr = JSON.stringify(data, null, 2);
    const compressed = await gzip(jsonStr);

    await fs.writeFile(filepath + '.gz', compressed);
    logger.debug(`Saved compressed to ${filepath}.gz`);
  }

  /**
   * 압축 해제 로드
   * @param {string} filepath
   * @returns {Promise<Object>}
   */
  async loadCompressed(filepath) {
    const compressed = await fs.readFile(filepath + '.gz');
    const decompressed = await gunzip(compressed);
    return JSON.parse(decompressed.toString());
  }

  /**
   * 압축률 계산
   * @param {Object} data
   * @returns {Promise<number>} 압축률 (0~1)
   */
  async getCompressionRatio(data) {
    const jsonStr = JSON.stringify(data);
    const originalSize = Buffer.byteLength(jsonStr);
    const compressed = await gzip(jsonStr);
    const compressedSize = compressed.length;

    return compressedSize / originalSize;
  }
}
```

---

## 4. 캐싱 및 성능 최적화

### 4.1 2단계 캐싱 전략
**목적**: 메모리 캐시 (빠름) + 파일 캐시 (영구)

```javascript
/**
 * 파일: src/modules/cache/CacheManager.js
 * 2단계 캐시 관리자
 */
export class CacheManager {
  constructor(config = {}) {
    this.memoryCache = new Map(); // L1 캐시 (메모리)
    this.fileCacheDir = config.cacheDir || './data/cache';
    this.maxMemorySize = config.maxMemorySize || 100; // 100개 항목
    this.ttl = config.ttl || 3600000; // 1시간
  }

  /**
   * 캐시 조회
   * @param {string} key
   * @returns {Promise<Object|null>}
   */
  async get(key) {
    // L1: 메모리 캐시
    if (this.memoryCache.has(key)) {
      const cached = this.memoryCache.get(key);

      // TTL 확인
      if (Date.now() - cached.timestamp < this.ttl) {
        logger.debug(`Memory cache HIT: ${key}`);
        return cached.data;
      } else {
        this.memoryCache.delete(key);
      }
    }

    // L2: 파일 캐시
    const fileData = await this._loadFromFile(key);
    if (fileData) {
      logger.debug(`File cache HIT: ${key}`);

      // 메모리에도 저장
      this._setMemory(key, fileData);
      return fileData;
    }

    logger.debug(`Cache MISS: ${key}`);
    return null;
  }

  /**
   * 캐시 저장
   * @param {string} key
   * @param {Object} data
   */
  async set(key, data) {
    // L1: 메모리
    this._setMemory(key, data);

    // L2: 파일
    await this._saveToFile(key, data);
  }

  /**
   * 메모리 캐시 저장
   * @private
   */
  _setMemory(key, data) {
    // LRU: 오래된 항목 제거
    if (this.memoryCache.size >= this.maxMemorySize) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }

    this.memoryCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 파일 캐시 로드
   * @private
   */
  async _loadFromFile(key) {
    const filepath = this._getCacheFilepath(key);

    try {
      const content = await fs.readFile(filepath, 'utf-8');
      const cached = JSON.parse(content);

      // TTL 확인
      if (Date.now() - cached.timestamp < this.ttl) {
        return cached.data;
      } else {
        await fs.unlink(filepath); // 만료된 파일 삭제
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * 파일 캐시 저장
   * @private
   */
  async _saveToFile(key, data) {
    await fs.mkdir(this.fileCacheDir, { recursive: true });

    const filepath = this._getCacheFilepath(key);
    const cached = {
      data,
      timestamp: Date.now()
    };

    await fs.writeFile(filepath, JSON.stringify(cached), 'utf-8');
  }

  /**
   * 캐시 파일 경로
   * @private
   */
  _getCacheFilepath(key) {
    const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.fileCacheDir, `${safeKey}.json`);
  }

  /**
   * 캐시 전체 삭제
   */
  async clear() {
    this.memoryCache.clear();

    try {
      const files = await fs.readdir(this.fileCacheDir);
      for (const file of files) {
        await fs.unlink(path.join(this.fileCacheDir, file));
      }
    } catch (error) {
      // 디렉토리 없으면 무시
    }

    logger.info('Cache cleared');
  }

  /**
   * 만료된 캐시 정리
   */
  async cleanup() {
    try {
      const files = await fs.readdir(this.fileCacheDir);
      let cleaned = 0;

      for (const file of files) {
        const filepath = path.join(this.fileCacheDir, file);
        const content = await fs.readFile(filepath, 'utf-8');
        const cached = JSON.parse(content);

        if (Date.now() - cached.timestamp >= this.ttl) {
          await fs.unlink(filepath);
          cleaned++;
        }
      }

      logger.info(`Cleaned ${cleaned} expired cache files`);
    } catch (error) {
      logger.error('Cache cleanup failed:', error);
    }
  }
}
```

### 4.2 캐시 활용 예시
```javascript
// L1Processor에서 캐시 사용
import { CacheManager } from '../cache/CacheManager.js';

export class L1Processor {
  constructor(config) {
    // ...
    this.cache = new CacheManager({
      cacheDir: './data/cache/l1',
      maxMemorySize: 100,
      ttl: 3600000 // 1시간
    });
  }

  async processPlace(placeId) {
    // 1. 캐시 확인
    const cached = await this.cache.get(placeId);
    if (cached) {
      logger.info(`Using cached data for ${placeId}`);
      return cached;
    }

    // 2. 크롤링
    const rawData = await this.crawler.crawlPlace(placeId);
    const parsedData = this.parser.parse(rawData);

    // 3. 캐시 저장
    await this.cache.set(placeId, parsedData);

    return parsedData;
  }
}
```

---

## 5. 데이터 검증 및 무결성

### 5.1 스키마 검증
**목적**: 데이터 형식 보장

```javascript
/**
 * 파일: src/modules/validation/SchemaValidator.js
 * 데이터 스키마 검증기
 */
import Ajv from 'ajv';

export class SchemaValidator {
  constructor() {
    this.ajv = new Ajv({ allErrors: true });
    this.schemas = this._defineSchemas();
  }

  /**
   * 스키마 정의
   * @private
   */
  _defineSchemas() {
    return {
      // 매장 데이터 스키마
      place: {
        type: 'object',
        required: ['placeId', 'basic', 'crawledAt'],
        properties: {
          placeId: { type: 'string', pattern: '^[0-9]+$' },
          basic: {
            type: 'object',
            required: ['id', 'name', 'category', 'address'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string', minLength: 1 },
              category: { type: 'string', minLength: 1 },
              address: { type: 'string', minLength: 5 },
              phone: { type: 'string' },
              rating: { type: 'number', minimum: 0, maximum: 5 }
            }
          },
          menus: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                price: { type: ['number', 'null'] },
                description: { type: 'string' }
              }
            }
          },
          completeness: {
            type: 'object',
            required: ['score', 'grade'],
            properties: {
              score: { type: 'number', minimum: 0, maximum: 115 },
              grade: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] }
            }
          },
          crawledAt: { type: 'string', format: 'date-time' }
        }
      }
    };
  }

  /**
   * 데이터 검증
   * @param {Object} data
   * @param {string} schemaName - 'place' | 'menu' | ...
   * @returns {Object} { valid: boolean, errors: Array }
   */
  validate(data, schemaName = 'place') {
    const schema = this.schemas[schemaName];
    if (!schema) {
      throw new Error(`Schema '${schemaName}' not found`);
    }

    const validate = this.ajv.compile(schema);
    const valid = validate(data);

    return {
      valid,
      errors: validate.errors || []
    };
  }

  /**
   * 검증 또는 에러 발생
   * @throws {Error}
   */
  validateOrThrow(data, schemaName = 'place') {
    const result = this.validate(data, schemaName);

    if (!result.valid) {
      const errorMessages = result.errors.map(err =>
        `${err.instancePath} ${err.message}`
      ).join('; ');

      throw new Error(`Schema validation failed: ${errorMessages}`);
    }

    return true;
  }
}
```

### 5.2 데이터 무결성 체크
```javascript
/**
 * 파일: src/modules/validation/IntegrityChecker.js
 * 데이터 무결성 검사기
 */
export class IntegrityChecker {
  /**
   * 중복 체크
   * @param {Array} items
   * @param {string} keyField
   * @returns {Array} 중복 항목
   */
  findDuplicates(items, keyField = 'id') {
    const seen = new Set();
    const duplicates = [];

    items.forEach(item => {
      const key = item[keyField];
      if (seen.has(key)) {
        duplicates.push(key);
      } else {
        seen.add(key);
      }
    });

    return duplicates;
  }

  /**
   * 필수 필드 확인
   * @param {Object} data
   * @param {string[]} requiredFields
   * @returns {string[]} 누락된 필드
   */
  checkRequiredFields(data, requiredFields) {
    const missing = [];

    requiredFields.forEach(field => {
      if (!data.hasOwnProperty(field) || data[field] === null || data[field] === undefined) {
        missing.push(field);
      }
    });

    return missing;
  }

  /**
   * 데이터 일관성 검증
   * @param {Object} placeData
   * @returns {Object} { valid: boolean, issues: Array }
   */
  checkConsistency(placeData) {
    const issues = [];

    // 1. 메뉴 가격 일관성
    if (placeData.menus) {
      const invalidPrices = placeData.menus.filter(m =>
        m.price !== null && (m.price < 0 || m.price > 1000000)
      );

      if (invalidPrices.length > 0) {
        issues.push(`Invalid menu prices: ${invalidPrices.length} items`);
      }
    }

    // 2. 평점 범위
    if (placeData.basic?.rating !== null) {
      if (placeData.basic.rating < 0 || placeData.basic.rating > 5) {
        issues.push('Rating out of range (0-5)');
      }
    }

    // 3. 완성도 점수
    if (placeData.completeness) {
      if (placeData.completeness.score < 0 || placeData.completeness.score > 115) {
        issues.push('Completeness score out of range (0-115)');
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * 참조 무결성 검증 (외래키)
   * @param {Object} data
   * @param {Object} references - { keywords: [...], notes: {...} }
   * @returns {boolean}
   */
  checkReferences(data, references) {
    const issues = [];

    // currentKeywords 참조 확인
    if (data.currentKeywords && data.currentKeywords.length > 0) {
      if (!references.keywords || !references.keywords[data.placeId]) {
        issues.push('currentKeywords reference not found');
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}
```

---

## 6. 에러 처리 및 복구

### 6.1 트랜잭션 패턴
**목적**: 부분 실패 시 롤백

```javascript
/**
 * 파일: src/modules/storage/TransactionManager.js
 * 트랜잭션 관리자
 */
export class TransactionManager {
  constructor(storageManager) {
    this.storage = storageManager;
    this.transactions = new Map(); // txId → { backups, operations }
  }

  /**
   * 트랜잭션 시작
   * @returns {string} txId
   */
  begin() {
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    this.transactions.set(txId, {
      backups: new Map(),
      operations: []
    });

    logger.info(`Transaction started: ${txId}`);
    return txId;
  }

  /**
   * 데이터 저장 (트랜잭션 내)
   * @param {string} txId
   * @param {string} placeId
   * @param {Object} data
   */
  async save(txId, placeId, data) {
    const tx = this.transactions.get(txId);
    if (!tx) throw new Error(`Transaction ${txId} not found`);

    // 기존 데이터 백업
    const existing = await this.storage.loadPlace(placeId);
    if (existing) {
      tx.backups.set(placeId, existing);
    }

    // 새 데이터 저장
    await this.storage.savePlace(placeId, data);

    tx.operations.push({ type: 'save', placeId });
  }

  /**
   * 트랜잭션 커밋
   * @param {string} txId
   */
  commit(txId) {
    const tx = this.transactions.get(txId);
    if (!tx) throw new Error(`Transaction ${txId} not found`);

    // 백업 삭제
    tx.backups.clear();
    this.transactions.delete(txId);

    logger.info(`Transaction committed: ${txId}`);
  }

  /**
   * 트랜잭션 롤백
   * @param {string} txId
   */
  async rollback(txId) {
    const tx = this.transactions.get(txId);
    if (!tx) throw new Error(`Transaction ${txId} not found`);

    logger.warn(`Rolling back transaction: ${txId}`);

    // 백업 복원
    for (const [placeId, backup] of tx.backups.entries()) {
      await this.storage.savePlace(placeId, backup);
    }

    this.transactions.delete(txId);
    logger.info(`Transaction rolled back: ${txId}`);
  }
}
```

#### 사용 예시
```javascript
// L1Processor에서 트랜잭션 활용
async process(placeIds) {
  const txManager = new TransactionManager(this.storage);
  const txId = txManager.begin();

  try {
    for (const placeId of placeIds) {
      const data = await this.processPlace(placeId);
      await txManager.save(txId, placeId, data);
    }

    txManager.commit(txId);
    logger.info('All places saved successfully');

  } catch (error) {
    await txManager.rollback(txId);
    logger.error('Transaction failed, rolled back:', error);
    throw error;
  }
}
```

---

## 7. 실시간 모니터링

### 7.1 수집 진행 상황 추적
```javascript
/**
 * 파일: src/modules/monitoring/ProgressTracker.js
 * 진행 상황 추적기
 */
export class ProgressTracker {
  constructor(total = 0) {
    this.total = total;
    this.current = 0;
    this.successful = 0;
    this.failed = 0;
    this.startTime = Date.now();
    this.estimates = [];
  }

  /**
   * 진행 업데이트
   * @param {boolean} success
   */
  update(success = true) {
    this.current++;

    if (success) {
      this.successful++;
    } else {
      this.failed++;
    }

    // 예상 시간 계산
    const elapsed = Date.now() - this.startTime;
    const avgTime = elapsed / this.current;
    const remaining = this.total - this.current;
    const eta = avgTime * remaining;

    this.estimates.push({ current: this.current, eta });

    return this.getStatus();
  }

  /**
   * 현재 상태 조회
   * @returns {Object}
   */
  getStatus() {
    const elapsed = Date.now() - this.startTime;
    const progress = (this.current / this.total) * 100;
    const eta = this.estimates[this.estimates.length - 1]?.eta || 0;

    return {
      total: this.total,
      current: this.current,
      successful: this.successful,
      failed: this.failed,
      progress: progress.toFixed(1),
      elapsed: this._formatDuration(elapsed),
      eta: this._formatDuration(eta),
      speed: this._calculateSpeed()
    };
  }

  /**
   * 속도 계산 (items/sec)
   */
  _calculateSpeed() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    return (this.current / elapsed).toFixed(2);
  }

  /**
   * 시간 포맷팅
   */
  _formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}
```

### 7.2 SSE 실시간 업데이트
```javascript
// L1Processor에서 ProgressTracker 활용
async process(placeIds, sseEmitter = null) {
  const tracker = new ProgressTracker(placeIds.length);

  for (const placeId of placeIds) {
    try {
      const result = await this.processPlace(placeId);
      tracker.update(true);

      // SSE로 진행 상황 전송
      if (sseEmitter) {
        sseEmitter.emit('progress', {
          type: 'success',
          placeId,
          ...tracker.getStatus()
        });
      }

    } catch (error) {
      tracker.update(false);

      if (sseEmitter) {
        sseEmitter.emit('progress', {
          type: 'error',
          placeId,
          error: error.message,
          ...tracker.getStatus()
        });
      }
    }
  }

  const finalStatus = tracker.getStatus();
  logger.info('Processing complete:', finalStatus);

  return finalStatus;
}
```

---

## 8. 구현 체크리스트

### Phase 1: 수집 최적화
- [ ] IncrementalCollector 구현
- [ ] PlaceCrawler.crawlBatchParallel() 추가
- [ ] PriorityQueue 구현
- [ ] 테스트 작성

### Phase 2: 저장 최적화
- [ ] StorageManager 구현 (계층적 구조)
- [ ] CompressionManager 구현
- [ ] 디렉토리 구조 생성
- [ ] 아카이브 자동화

### Phase 3: 캐싱
- [ ] CacheManager 구현 (2단계)
- [ ] L1Processor에 캐시 통합
- [ ] 캐시 정리 스케줄러
- [ ] 성능 테스트

### Phase 4: 검증 및 무결성
- [ ] SchemaValidator 구현
- [ ] IntegrityChecker 구현
- [ ] L1Processor에 검증 추가
- [ ] 검증 테스트

### Phase 5: 트랜잭션 및 모니터링
- [ ] TransactionManager 구현
- [ ] ProgressTracker 구현
- [ ] SSE 연동
- [ ] E2E 테스트

---

**문서 작성**: 2025-11-14
**다음 업데이트**: Phase 1 완료 후
