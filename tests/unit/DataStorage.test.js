/**
 * DataStorage.test.js
 * DataStorage 클래스 단위 테스트
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const DataStorage = require('../../src/utils/DataStorage');

describe('DataStorage', () => {
  let storage;
  let tempDir;

  beforeEach(async () => {
    // 임시 디렉토리 생성
    tempDir = path.join(os.tmpdir(), `l1-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    storage = new DataStorage({ basePath: tempDir });
    await storage.initialize();
  });

  afterEach(async () => {
    // 임시 디렉토리 정리
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup temp dir:', error.message);
    }
  });

  describe('constructor', () => {
    it('should create DataStorage with default options', () => {
      const ds = new DataStorage();
      expect(ds.config.basePath).toBe('./data/output/l1');
      expect(ds.config.prettyPrint).toBe(true);
    });

    it('should create DataStorage with custom options', () => {
      const ds = new DataStorage({ basePath: '/custom/path', prettyPrint: false });
      expect(ds.config.basePath).toBe('/custom/path');
      expect(ds.config.prettyPrint).toBe(false);
    });

    it('should set up directory paths', () => {
      expect(storage.paths.places).toContain('places');
      expect(storage.paths.batch).toContain('batch');
      expect(storage.paths.summary).toContain('summary');
      expect(storage.paths.metadata).toContain('metadata');
    });
  });

  describe('initialize', () => {
    it('should create all required directories', async () => {
      // Already initialized in beforeEach
      const placesDirExists = await fs.access(storage.paths.places).then(() => true).catch(() => false);
      const batchDirExists = await fs.access(storage.paths.batch).then(() => true).catch(() => false);
      const summaryDirExists = await fs.access(storage.paths.summary).then(() => true).catch(() => false);
      const metadataDirExists = await fs.access(storage.paths.metadata).then(() => true).catch(() => false);

      expect(placesDirExists).toBe(true);
      expect(batchDirExists).toBe(true);
      expect(summaryDirExists).toBe(true);
      expect(metadataDirExists).toBe(true);
    });
  });

  describe('savePlaceData', () => {
    const validPlaceData = {
      version: '2.0.0',
      collected_at: '2024-01-15T10:30:00Z',
      place: {
        id: 'test123',
        name: '테스트 식당',
        category: '한식'
      }
    };

    it('should save place data to file', async () => {
      const filePath = await storage.savePlaceData(validPlaceData);

      expect(filePath).toContain('test123.json');

      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    it('should save data with pretty print by default', async () => {
      const filePath = await storage.savePlaceData(validPlaceData);
      const content = await fs.readFile(filePath, 'utf-8');

      // Pretty print는 줄바꿈과 들여쓰기 포함
      expect(content).toContain('\n');
      expect(content).toContain('  ');
    });

    it('should save data without pretty print when disabled', async () => {
      const ds = new DataStorage({ basePath: tempDir, prettyPrint: false });
      await ds.initialize();

      const filePath = await ds.savePlaceData(validPlaceData);
      const content = await fs.readFile(filePath, 'utf-8');

      // Pretty print 없으면 한 줄
      expect(content.split('\n').length).toBe(1);
    });

    it('should throw error if place ID is missing', async () => {
      const invalidData = { version: '2.0.0' };

      await expect(storage.savePlaceData(invalidData)).rejects.toThrow('Place ID is required');
    });

    it('should handle circular references safely', async () => {
      const circularData = {
        place: { id: 'circular123', name: '순환 참조 테스트' }
      };
      circularData.self = circularData; // 순환 참조

      const filePath = await storage.savePlaceData(circularData);
      const content = await fs.readFile(filePath, 'utf-8');

      expect(content).toContain('[Circular]');
    });
  });

  describe('loadPlaceData', () => {
    it('should load saved place data', async () => {
      const originalData = {
        place: { id: 'load123', name: '로드 테스트' },
        version: '2.0.0'
      };

      await storage.savePlaceData(originalData);
      const loadedData = await storage.loadPlaceData('load123');

      expect(loadedData.place.id).toBe('load123');
      expect(loadedData.place.name).toBe('로드 테스트');
      expect(loadedData.version).toBe('2.0.0');
    });

    it('should return null if file does not exist', async () => {
      const result = await storage.loadPlaceData('nonexistent');
      expect(result).toBe(null);
    });
  });

  describe('saveBatchData', () => {
    it('should save batch data with generated ID', async () => {
      const batchData = [
        { place: { id: 'batch1', name: '배치1' } },
        { place: { id: 'batch2', name: '배치2' } }
      ];

      const filePath = await storage.saveBatchData(batchData);

      expect(filePath).toContain('batch_');
      expect(filePath).toContain('.json');

      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.count).toBe(2);
      expect(parsed.places).toHaveLength(2);
      expect(parsed.batch_id).toBeTruthy();
      expect(parsed.created_at).toBeTruthy();
    });

    it('should save batch data with custom ID', async () => {
      const batchData = [
        { place: { id: 'batch1', name: '배치1' } }
      ];

      const filePath = await storage.saveBatchData(batchData, 'custom-batch-123');

      expect(filePath).toContain('custom-batch-123.json');

      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.batch_id).toBe('custom-batch-123');
    });
  });

  describe('saveSummary', () => {
    it('should save summary data', async () => {
      const summary = {
        total_places: 100,
        successful: 95,
        failed: 5
      };

      const filePath = await storage.saveSummary(summary);

      expect(filePath).toContain('collection_summary_');
      expect(filePath).toContain('.json');

      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.total_places).toBe(100);
      expect(parsed.successful).toBe(95);
      expect(parsed.failed).toBe(5);
      expect(parsed.last_updated).toBeTruthy();
    });

    it('should merge with existing summary', async () => {
      // 첫 번째 저장
      await storage.saveSummary({ total_places: 50 });

      // 두 번째 저장 (병합되어야 함)
      await storage.saveSummary({ successful: 45 });

      // 같은 날짜의 파일 읽기
      const date = new Date().toISOString().split('T')[0];
      const filePath = path.join(storage.paths.summary, `collection_summary_${date}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.total_places).toBe(50);
      expect(parsed.successful).toBe(45);
    });
  });

  describe('saveSchemaVersion', () => {
    it('should save schema version', async () => {
      const filePath = await storage.saveSchemaVersion('2.0.0');

      expect(filePath).toContain('schema_version.json');

      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.version).toBe('2.0.0');
      expect(parsed.updated_at).toBeTruthy();
      expect(parsed.description).toBe('L1 Pipeline Data Schema Version');
    });
  });

  describe('saveFieldMapping', () => {
    it('should save field mapping', async () => {
      const mapping = {
        'place.name': 'string',
        'place.category': 'string',
        'place.rating': 'number'
      };

      const filePath = await storage.saveFieldMapping(mapping);

      expect(filePath).toContain('field_mapping.json');

      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed['place.name']).toBe('string');
      expect(parsed['place.category']).toBe('string');
      expect(parsed['place.rating']).toBe('number');
    });
  });

  describe('edge cases', () => {
    it('should handle empty batch data', async () => {
      const filePath = await storage.saveBatchData([]);

      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.count).toBe(0);
      expect(parsed.places).toHaveLength(0);
    });

    it('should handle special characters in place ID', async () => {
      const data = {
        place: { id: 'test-123_abc', name: '특수문자 테스트' }
      };

      const filePath = await storage.savePlaceData(data);
      expect(filePath).toContain('test-123_abc.json');

      const loaded = await storage.loadPlaceData('test-123_abc');
      expect(loaded.place.name).toBe('특수문자 테스트');
    });
  });
});
