/**
 * 300위까지 순위 조회 테스트
 *
 * 이 스크립트는 확장된 300위 검색 기능을 테스트합니다.
 *
 * 사용법:
 * 1. GUI 서버 시작: npm run gui
 * 2. 다른 터미널에서 실행: node tests/manual/test-rank-300.js
 */

const API_BASE = 'http://localhost:3000';

/**
 * 다양한 maxPages 설정으로 테스트
 */
async function testDifferentSearchDepths() {
  console.log('\n=== 다양한 검색 깊이 테스트 ===\n');

  const testCases = [
    { maxPages: 10, description: '150위까지 (빠름)' },
    { maxPages: 20, description: '300위까지 (권장)' },
    { maxPages: 30, description: '450위까지 (느림)' },
  ];

  const keyword = '강남 맛집';
  const placeId = '1768171911';  // 여기에 실제 Place ID 입력

  for (const testCase of testCases) {
    console.log(`\n📝 테스트: ${testCase.description}`);
    console.log(`   maxPages: ${testCase.maxPages} (최대 ${testCase.maxPages * 15}위)`);
    console.log(`   키워드: "${keyword}"`);
    console.log(`   Place ID: ${placeId}\n`);

    const startTime = Date.now();

    try {
      const response = await fetch(`${API_BASE}/api/rank/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword,
          placeId,
          maxPages: testCase.maxPages,
        }),
      });

      const data = await response.json();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      if (data.success) {
        if (data.result) {
          console.log(`✅ 성공! ${data.result.rank}위 검출`);
          console.log(`   매장명: ${data.result.placeName}`);
          console.log(`   소요 시간: ${elapsed}초`);
        } else {
          console.log(`⚠️  순위권 밖 (${testCase.maxPages * 15}위 이내 미검출)`);
          console.log(`   소요 시간: ${elapsed}초`);
        }
      } else {
        console.log(`❌ 실패: ${data.error}`);
      }
    } catch (error) {
      console.log(`❌ 오류: ${error.message}`);
    }

    // 다음 테스트 전 3초 대기
    if (testCases.indexOf(testCase) < testCases.length - 1) {
      console.log('\n⏳ 3초 대기 중...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

/**
 * 배치 검색 with maxPages
 */
async function testBatchWith300() {
  console.log('\n=== 배치 키워드 조회 (300위) ===\n');

  const keywords = [
    '강남 맛집',
    '역삼 맛집',
    '강남역 맛집',
  ];

  const placeId = '1768171911';
  const maxPages = 20;  // 300위

  console.log(`📝 ${keywords.length}개 키워드 배치 조회`);
  console.log(`   키워드: ${keywords.join(', ')}`);
  console.log(`   Place ID: ${placeId}`);
  console.log(`   maxPages: ${maxPages} (최대 ${maxPages * 15}위)\n`);

  try {
    const response = await fetch(`${API_BASE}/api/rank/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keywords,
        placeId,
        maxPages: maxPages,
        concurrency: 2,
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ 배치 조회 시작됨`);
      console.log(`   ${data.message}`);
      console.log(`\n💡 결과는 실시간 로그 탭에서 확인하거나`);
      console.log(`   data/output/batch-rank-${placeId}-*.json 파일을 확인하세요.\n`);
    } else {
      console.log(`❌ 실패: ${data.error}`);
    }
  } catch (error) {
    console.log(`❌ 오류: ${error.message}`);
  }
}

/**
 * 검색 깊이별 성능 비교
 */
async function performanceComparison() {
  console.log('\n=== 검색 깊이별 성능 비교 ===\n');

  const depths = [
    { pages: 5, rank: 75 },
    { pages: 10, rank: 150 },
    { pages: 20, rank: 300 },
    { pages: 30, rank: 450 },
  ];

  const keyword = '강남 맛집';
  const placeId = '1768171911';

  console.log('검색 깊이 | 최대 순위 | 예상 시간 | 실제 시간');
  console.log('---------|----------|----------|----------');

  for (const depth of depths) {
    const expectedTime = (depth.pages * 0.5).toFixed(1);
    const startTime = Date.now();

    try {
      const response = await fetch(`${API_BASE}/api/rank/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword,
          placeId,
          maxPages: depth.pages,
        }),
      });

      await response.json();
      const actualTime = ((Date.now() - startTime) / 1000).toFixed(1);

      console.log(`${depth.pages}페이지   | ${depth.rank}위    | ${expectedTime}초      | ${actualTime}초`);

    } catch (error) {
      console.log(`${depth.pages}페이지   | ${depth.rank}위    | ${expectedTime}초      | 오류`);
    }

    // 다음 테스트 전 3초 대기
    if (depths.indexOf(depth) < depths.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log('');
}

/**
 * 메인 실행
 */
async function main() {
  console.log('🚀 300위 확장 기능 테스트 시작');
  console.log('======================================\n');

  // 서버 연결 확인
  try {
    const response = await fetch(`${API_BASE}/api/stats`);
    await response.json();
    console.log('✅ 서버 연결 성공\n');
  } catch (error) {
    console.log(`❌ 서버 연결 실패: ${error.message}`);
    console.log(`\n💡 먼저 GUI 서버를 시작하세요: npm run gui\n`);
    process.exit(1);
  }

  // 테스트 선택
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('실행할 테스트를 선택하세요:\n');
  console.log('1. 다양한 검색 깊이 테스트 (10, 20, 30페이지)');
  console.log('2. 배치 키워드 조회 (300위)');
  console.log('3. 성능 비교 (5, 10, 20, 30페이지)');
  console.log('0. 모두 실행');
  console.log('');

  rl.question('선택 (0-3): ', async (answer) => {
    const choice = parseInt(answer);

    try {
      if (choice === 0) {
        await testDifferentSearchDepths();
        await new Promise(resolve => setTimeout(resolve, 5000));
        await testBatchWith300();
        await new Promise(resolve => setTimeout(resolve, 5000));
        await performanceComparison();
      } else if (choice === 1) {
        await testDifferentSearchDepths();
      } else if (choice === 2) {
        await testBatchWith300();
      } else if (choice === 3) {
        await performanceComparison();
      } else {
        console.log('\n잘못된 선택입니다.\n');
      }
    } catch (error) {
      console.error('테스트 실행 중 오류:', error);
    }

    console.log('\n✅ 테스트 완료!\n');
    rl.close();
    process.exit(0);
  });
}

// 스크립트 실행
main().catch(error => {
  console.error('테스트 실행 중 오류:', error);
  process.exit(1);
});
