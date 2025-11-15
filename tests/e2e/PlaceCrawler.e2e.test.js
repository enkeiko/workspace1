/**
 * PlaceCrawler.e2e.test.js
 * PlaceCrawler 엔드투엔드 테스트
 *
 * 실제 네이버 플레이스를 크롤링하는 통합 테스트
 * 네트워크 의존성이 있어 선택적으로 실행 권장
 *
 * 실행 방법:
 * npm run test:e2e
 * 또는
 * RUN_E2E=true npm test -- tests/e2e
 */

const PlaceCrawler = require('../../src/crawlers/PlaceCrawler');
const DataStorage = require('../../src/utils/DataStorage');
const { runQualityChecks } = require('../../src/utils/validators');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// E2E 테스트는 환경 변수로 제어
const shouldRunE2E = process.env.RUN_E2E === 'true' || process.env.CI === 'true';

// E2E 테스트 건너뛰기 조건
const describeE2E = shouldRunE2E ? describe : describe.skip;

describeE2E('PlaceCrawler E2E Tests', () => {
  let crawler;
  let storage;
  let tempDir;

  // 테스트용 알려진 네이버 플레이스 ID
  // 실제 테스트 시 유효한 Place ID로 교체 필요
  const TEST_PLACE_IDS = [
    // 유명한 장소들 (예시 - 실제 ID로 교체 필요)
    // '1234567890',  // 테스트 장소 1
    // '0987654321',  // 테스트 장소 2
  ];

  // E2E 테스트는 시간이 오래 걸림
  jest.setTimeout(120000); // 2분

  beforeAll(async () => {
    // 임시 디렉토리 생성
    tempDir = path.join(os.tmpdir(), `l1-e2e-test-${Date.now()}`);

    // Storage 초기화
    storage = new DataStorage({ basePath: tempDir });
    await storage.initialize();

    // Crawler 초기화
    crawler = new PlaceCrawler({
      headless: true,
      timeout: 60000,
      maxRetries: 2,
      baseDelay: 2000,
      maxDelay: 10000,
      maxPoolSize: 3,

      circuitBreaker: {
        failureThreshold: 3,
        successThreshold: 1,
        breakerTimeout: 30000
      }
    });

    await crawler.initialize();
    console.log('[E2E] Crawler initialized');
  });

  afterAll(async () => {
    // Crawler 종료
    if (crawler) {
      await crawler.close();
      console.log('[E2E] Crawler closed');
    }

    // 임시 디렉토리 정리
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      console.log('[E2E] Temp directory cleaned');
    } catch (error) {
      console.warn('[E2E] Failed to cleanup:', error.message);
    }
  });

  describe('Basic Crawling', () => {
    // 실제 Place ID가 설정되어 있는 경우만 테스트 실행
    const hasTestPlaces = TEST_PLACE_IDS.length > 0;

    (hasTestPlaces ? it : it.skip)('should crawl a real place with BASIC level', async () => {
      const placeId = TEST_PLACE_IDS[0];

      const result = await crawler.crawlPlace(placeId, {
        level: 'BASIC',
        priority: 'HIGH'
      });

      // 기본 구조 검증
      expect(result).toBeDefined();
      expect(result.version).toBe('2.0.0');
      expect(result.collection_level).toBe('BASIC');
      expect(result.place).toBeDefined();
      expect(result.place.id).toBe(placeId);
      expect(result.collected_at).toBeDefined();

      // 필수 필드 검증
      expect(result.place.name).toBeTruthy();
      expect(typeof result.place.name).toBe('string');

      // 메타데이터 검증
      expect(result.metadata).toBeDefined();
      expect(result.metadata.completeness).toBeDefined();
      expect(result.metadata.completeness.score).toBeGreaterThan(0);

      console.log('[E2E] Basic crawl result:', {
        placeId: result.place.id,
        name: result.place.name,
        completeness: result.metadata.completeness.score
      });
    });

    (hasTestPlaces ? it : it.skip)('should crawl with STANDARD level', async () => {
      const placeId = TEST_PLACE_IDS[0];

      const result = await crawler.crawlPlace(placeId, {
        level: 'STANDARD',
        priority: 'MEDIUM'
      });

      expect(result.collection_level).toBe('STANDARD');

      // STANDARD 레벨은 더 많은 정보 포함
      expect(result.place.category).toBeDefined();

      if (result.place.rating) {
        expect(result.place.rating).toBeGreaterThanOrEqual(0);
        expect(result.place.rating).toBeLessThanOrEqual(5);
      }

      console.log('[E2E] Standard crawl result:', {
        name: result.place.name,
        category: result.place.category,
        rating: result.place.rating,
        completeness: result.metadata.completeness.score
      });
    });
  });

  describe('Data Validation', () => {
    const hasTestPlaces = TEST_PLACE_IDS.length > 0;

    (hasTestPlaces ? it : it.skip)('should produce data that passes quality checks', async () => {
      const placeId = TEST_PLACE_IDS[0];

      const result = await crawler.crawlPlace(placeId, {
        level: 'STANDARD'
      });

      // Quality checks 실행
      const validation = runQualityChecks(result);

      expect(validation).toBeDefined();
      expect(validation.summary).toBeDefined();

      // Critical 에러가 없어야 함
      expect(validation.summary.critical).toBe(0);

      // 저장 가능해야 함
      expect(validation.shouldSave).toBe(true);

      console.log('[E2E] Validation result:', {
        critical: validation.summary.critical,
        high: validation.summary.high,
        medium: validation.summary.medium,
        shouldSave: validation.shouldSave
      });
    });
  });

  describe('Storage Integration', () => {
    const hasTestPlaces = TEST_PLACE_IDS.length > 0;

    (hasTestPlaces ? it : it.skip)('should save crawled data successfully', async () => {
      const placeId = TEST_PLACE_IDS[0];

      const result = await crawler.crawlPlace(placeId, {
        level: 'BASIC'
      });

      // 데이터 저장
      const filePath = await storage.savePlaceData(result);

      expect(filePath).toBeTruthy();
      expect(filePath).toContain(`${placeId}.json`);

      // 파일 존재 확인
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // 저장된 데이터 로드
      const loaded = await storage.loadPlaceData(placeId);
      expect(loaded).toBeDefined();
      expect(loaded.place.id).toBe(placeId);
      expect(loaded.place.name).toBe(result.place.name);

      console.log('[E2E] Data saved and loaded successfully');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid place ID gracefully', async () => {
      const invalidPlaceId = 'invalid-place-id-12345';

      await expect(
        crawler.crawlPlace(invalidPlaceId, {
          level: 'BASIC',
          priority: 'LOW'
        })
      ).rejects.toThrow();

      // Circuit Breaker가 여전히 CLOSED 상태여야 함 (한 번의 실패로 열리지 않음)
      expect(crawler.circuitBreaker.state).toBe('CLOSED');
    });

    it('should respect maxRetries setting', async () => {
      const invalidPlaceId = 'definitely-invalid-999999';

      const startTime = Date.now();

      await expect(
        crawler.crawlPlace(invalidPlaceId, {
          level: 'BASIC'
        })
      ).rejects.toThrow();

      const duration = Date.now() - startTime;

      // maxRetries=2이므로 최소 2번의 재시도가 발생
      // baseDelay=2000이므로 최소 4초는 걸려야 함 (2초 + 4초)
      expect(duration).toBeGreaterThan(4000);

      console.log('[E2E] Retry duration:', duration, 'ms');
    });
  });

  describe('Statistics', () => {
    it('should track crawling statistics', () => {
      const stats = crawler.getStats();

      expect(stats).toBeDefined();
      expect(typeof stats.totalRequests).toBe('number');
      expect(typeof stats.successCount).toBe('number');
      expect(typeof stats.failureCount).toBe('number');

      // Page pool 통계
      expect(typeof stats.pagePoolHits).toBe('number');
      expect(typeof stats.pagePoolMisses).toBe('number');

      console.log('[E2E] Crawler stats:', stats);
    });
  });

  describe('Circuit Breaker', () => {
    it('should maintain circuit breaker state', () => {
      const { circuitBreaker } = crawler;

      expect(circuitBreaker).toBeDefined();
      expect(circuitBreaker.state).toBeDefined();
      expect(['CLOSED', 'OPEN', 'HALF_OPEN']).toContain(circuitBreaker.state);

      expect(typeof circuitBreaker.consecutiveFailures).toBe('number');
      expect(typeof circuitBreaker.consecutiveSuccesses).toBe('number');

      console.log('[E2E] Circuit Breaker state:', circuitBreaker.state);
    });
  });
});

// 환경 변수가 설정되지 않은 경우 메시지 출력
if (!shouldRunE2E) {
  console.log('\n⚠️  E2E 테스트를 건너뜁니다.');
  console.log('E2E 테스트 실행: RUN_E2E=true npm test -- tests/e2e\n');
}
