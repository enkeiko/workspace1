/**
 * PlaceCrawler v0.4 자동 테스트
 *
 * 테스트 실행: node tests/unit/PlaceCrawlerV04.test.js
 */

import { PlaceCrawlerV04 } from '../../src/modules/crawler/PlaceCrawlerV04.js';
import { GdidParser } from '../../src/modules/parser/GdidParser.js';
import { RankFeatureParser } from '../../src/modules/parser/RankFeatureParser.js';
import { DataMerger } from '../../src/modules/merger/DataMerger.js';
import { logger } from '../../src/utils/logger.js';

// 테스트용 샘플 Place ID (실제 테스트 시 유효한 ID로 교체 필요)
const TEST_PLACE_IDS = [
  '1100305155',  // 음식점 예시
  '37574607',    // 카페 예시
  '1946113775',  // 복합매장 예시
];

/**
 * 테스트 결과 객체
 */
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
};

/**
 * 테스트 유틸리티
 */
function assert(condition, message) {
  if (condition) {
    testResults.passed++;
    console.log(`  ✅ ${message}`);
  } else {
    testResults.failed++;
    testResults.errors.push(message);
    console.log(`  ❌ ${message}`);
  }
}

/**
 * Unit Test: GdidParser
 */
async function testGdidParser() {
  console.log('\n📦 Testing GdidParser...');

  const parser = new GdidParser();

  // TC01: N1 타입 파싱
  const n1Result = parser.parse('N1:12345678');
  assert(n1Result.type === 'N1', 'N1 type parsing');
  assert(n1Result.placeId === '12345678', 'N1 placeId extraction');
  assert(n1Result.isValid === true, 'N1 validation');

  // TC02: N2 타입 파싱
  const n2Result = parser.parse('N2:87654321');
  assert(n2Result.type === 'N2', 'N2 type parsing');
  assert(n2Result.isValid === true, 'N2 validation');

  // TC03: N3 타입 파싱
  const n3Result = parser.parse('N3:11223344');
  assert(n3Result.type === 'N3', 'N3 type parsing');

  // TC04: 잘못된 형식
  const invalidResult = parser.parse('invalid');
  assert(invalidResult.isValid === false, 'Invalid gdid handling');

  // TC05: null 입력
  const nullResult = parser.parse(null);
  assert(nullResult.isValid === false, 'Null input handling');

  // TC06: gdid 생성
  const generated = parser.generate('12345', 'N1');
  assert(generated === 'N1:12345', 'Gdid generation');
}

/**
 * Unit Test: RankFeatureParser
 */
async function testRankFeatureParser() {
  console.log('\n📦 Testing RankFeatureParser...');

  const parser = new RankFeatureParser();

  // Mock Apollo State
  const mockApolloState = {
    'Place:12345': {
      name: 'Test Restaurant',
      category: 'Korean',
      categoryCodeList: ['FD001', 'FD002'],
      gdid: 'N1:12345',
      isTableOrder: true,
      pickup: true,
      bookingBusinessId: 'booking123',
    },
    'BusinessHours:12345': {
      breakTime: '15:00~17:00',
      lastOrder: '21:00',
    },
    'VisitorReviewStat:12345': {
      totalCount: 100,
      photoReviewCount: 50,
      averageScore: 4.5,
    },
  };

  // TC01: 랭킹 피처 추출
  const features = parser.extractRankingFeatures(mockApolloState, '12345');

  assert(features.categoryCodeList.length === 2, 'Category codes extraction');
  assert(features.gdid.type === 'N1', 'Gdid extraction');
  assert(features.orderOptions.isTableOrder === true, 'Table order extraction');
  assert(features.orderOptions.pickup === true, 'Pickup extraction');
  assert(features.orderOptions.bookingBusinessId === 'booking123', 'Booking ID extraction');
  assert(features.visitorReviewStats.total === 100, 'Visitor review stats extraction');
  assert(features.operationTime.lastOrder === '21:00', 'Last order extraction');

  // TC02: 브레이크타임 파싱
  assert(features.operationTime.breakTime.length > 0, 'Break time parsing');
  if (features.operationTime.breakTime.length > 0) {
    assert(features.operationTime.breakTime[0].start === '15:00', 'Break time start');
    assert(features.operationTime.breakTime[0].end === '17:00', 'Break time end');
  }
}

/**
 * Unit Test: DataMerger
 */
async function testDataMerger() {
  console.log('\n📦 Testing DataMerger...');

  const merger = new DataMerger();

  // Mock 데이터
  const apolloData = {
    placeId: '12345',
    basic: { name: 'Test Place', category: 'Restaurant', address: { road: '123 Main St' } },
    menus: [{ name: 'Menu 1', price: 10000 }],
    reviews: { stats: { total: 50 } },
    images: [],
    facilities: [],
    payments: [],
  };

  const graphqlData = {
    votedKeywords: [{ name: 'Delicious', count: 100 }],
    visitPurposes: [{ name: 'Date', count: 50 }],
    reviewStats: { total: 100, visitor: 80, blog: 20 },
  };

  const rankingData = {
    categoryCodeList: ['FD001'],
    gdid: { raw: 'N1:12345', type: 'N1', placeId: '12345', isValid: true },
    visitorReviewStats: { total: 100 },
    blogCafeReviewCount: 20,
    orderOptions: { isTableOrder: true, pickup: false },
    operationTime: { breakTime: [], lastOrder: '21:00' },
  };

  // TC01: 데이터 병합
  const merged = merger.merge(apolloData, graphqlData, rankingData);

  assert(merged.placeId === '12345', 'PlaceId preservation');
  assert(merged.basic.name === 'Test Place', 'Basic info preservation');
  assert(merged.ranking.votedKeywords.length === 1, 'VotedKeywords merge (GraphQL priority)');
  assert(merged.ranking.categoryCodeList.length === 1, 'Category codes merge');
  assert(merged.reviewStats.visitor.total === 100, 'Review stats merge');
  assert(merged.orderOptions.isTableOrder === true, 'Order options merge');
  assert(merged.completeness > 0, 'Completeness calculation');

  // TC02: 검증
  const validation = merger.validate(merged);
  assert(validation.isValid === true, 'Validation pass');

  // TC03: 빈 데이터 처리
  const emptyMerged = merger.merge({ placeId: 'empty' }, {}, {});
  const emptyValidation = merger.validate(emptyMerged);
  assert(emptyValidation.isValid === false, 'Empty data validation fail');
}

/**
 * Integration Test: PlaceCrawler v0.4
 */
async function testPlaceCrawlerIntegration() {
  console.log('\n📦 Testing PlaceCrawler v0.4 Integration...');

  const crawler = new PlaceCrawlerV04({
    headless: true,
    enableGraphQL: true,
    timeout: 30000,
  });

  try {
    await crawler.initialize();
    assert(true, 'Crawler initialization');

    // 실제 크롤링 테스트 (첫 번째 Place ID만)
    if (TEST_PLACE_IDS.length > 0) {
      const placeId = TEST_PLACE_IDS[0];
      console.log(`\n  🔍 Crawling ${placeId}...`);

      try {
        const result = await crawler.crawlPlace(placeId);

        // 기본 검증
        assert(result.placeId === placeId, `PlaceId match for ${placeId}`);
        assert(result._version === '0.4', 'Version v0.4');
        assert(typeof result.completeness === 'number', 'Completeness calculated');

        // 신규 필드 검증
        assert(result.ranking !== undefined, 'Ranking data present');
        assert(result.reviewStats !== undefined, 'Review stats present');
        assert(result.orderOptions !== undefined, 'Order options present');
        assert(result.operationTime !== undefined, 'Operation time present');

        // 상세 검증
        console.log(`\n  📊 Result Summary:`);
        console.log(`     - Name: ${result.basic?.name || 'N/A'}`);
        console.log(`     - Completeness: ${result.completeness}%`);
        console.log(`     - VotedKeywords: ${result.ranking?.votedKeywords?.length || 0}`);
        console.log(`     - CategoryCodes: ${result.ranking?.categoryCodeList?.length || 0}`);
        console.log(`     - Gdid: ${result.ranking?.gdid?.raw || 'N/A'}`);
        console.log(`     - TableOrder: ${result.orderOptions?.isTableOrder}`);
        console.log(`     - LastOrder: ${result.operationTime?.lastOrder || 'N/A'}`);

      } catch (error) {
        testResults.failed++;
        testResults.errors.push(`Crawling ${placeId}: ${error.message}`);
        console.log(`  ❌ Crawling ${placeId}: ${error.message}`);
      }
    }

  } catch (error) {
    testResults.failed++;
    testResults.errors.push(`Crawler init: ${error.message}`);
    console.log(`  ❌ Crawler initialization: ${error.message}`);
  } finally {
    await crawler.close();
  }
}

/**
 * 메인 테스트 실행
 */
async function runTests() {
  console.log('🚀 PlaceCrawler v0.4 Automated Tests\n');
  console.log('=' .repeat(50));

  const startTime = Date.now();

  try {
    // Unit Tests
    await testGdidParser();
    await testRankFeatureParser();
    await testDataMerger();

    // Integration Test (실제 크롤링)
    // await testPlaceCrawlerIntegration();

  } catch (error) {
    console.error('\n❌ Test execution error:', error);
    testResults.errors.push(`Execution: ${error.message}`);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // 결과 요약
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Test Results Summary\n');
  console.log(`  Passed: ${testResults.passed}`);
  console.log(`  Failed: ${testResults.failed}`);
  console.log(`  Duration: ${duration}s`);

  if (testResults.errors.length > 0) {
    console.log('\n  ❌ Errors:');
    testResults.errors.forEach(err => {
      console.log(`     - ${err}`);
    });
  }

  console.log('\n' + '=' .repeat(50));

  // 종료 코드
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// 실행
runTests();
