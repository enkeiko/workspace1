/**
 * SearchRankCrawler API 테스트
 *
 * GUI 서버를 통해 순위 조회 API를 테스트합니다.
 *
 * 사용법:
 * 1. 먼저 GUI 서버 시작: npm run gui
 * 2. 다른 터미널에서 이 스크립트 실행: node tests/manual/test-rank-api.js
 */

const API_BASE = 'http://localhost:3000';

/**
 * 단일 키워드 순위 조회 테스트
 */
async function testSingleRankSearch() {
  console.log('\n=== 단일 키워드 순위 조회 테스트 ===\n');

  const testCases = [
    {
      keyword: '강남 맛집',
      placeId: '1768171911',
      description: '강남 맛집에서 특정 플레이스 검색'
    },
    {
      keyword: '역삼동 카페',
      placeId: '1265317185',
      description: '역삼동 카페에서 특정 플레이스 검색'
    }
  ];

  for (const testCase of testCases) {
    console.log(`📝 ${testCase.description}`);
    console.log(`   키워드: "${testCase.keyword}"`);
    console.log(`   Place ID: ${testCase.placeId}`);

    try {
      const response = await fetch(`${API_BASE}/api/rank/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword: testCase.keyword,
          placeId: testCase.placeId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.result) {
          console.log(`✅ 성공! ${data.result.rank}위 검출`);
          console.log(`   매장명: ${data.result.placeName}`);
          console.log(`   카테고리: ${data.result.category}`);
          console.log(`   평점: ${data.result.rating} (리뷰 ${data.result.reviewCount}개)`);
          console.log(`   페이지: ${data.result.page}페이지`);
        } else {
          console.log(`⚠️  순위권 밖 (150위 이내 미검출)`);
        }
      } else {
        console.log(`❌ 실패: ${data.error}`);
      }
    } catch (error) {
      console.log(`❌ 오류: ${error.message}`);
    }

    console.log('');
  }
}

/**
 * 배치 키워드 순위 조회 테스트
 */
async function testBatchRankSearch() {
  console.log('\n=== 배치 키워드 순위 조회 테스트 ===\n');

  const keywords = [
    '강남 맛집',
    '역삼 맛집',
    '강남역 맛집',
    '역삼동 음식점',
    '강남 한식',
  ];

  const placeId = '1768171911';  // 테스트할 Place ID

  console.log(`📝 ${keywords.length}개 키워드 배치 조회`);
  console.log(`   키워드: ${keywords.join(', ')}`);
  console.log(`   Place ID: ${placeId}`);
  console.log(`   동시 처리: 2개씩\n`);

  try {
    const response = await fetch(`${API_BASE}/api/rank/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keywords,
        placeId,
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
 * 메인 테스트 실행
 */
async function main() {
  console.log('🚀 SearchRankCrawler API 테스트 시작');
  console.log('⏰ 서버 연결 확인 중...\n');

  // 서버 연결 확인
  try {
    const response = await fetch(`${API_BASE}/api/stats`);
    const data = await response.json();
    console.log(`✅ 서버 연결 성공 (매장 ${data.totalStores || 0}개 등록됨)\n`);
  } catch (error) {
    console.log(`❌ 서버 연결 실패: ${error.message}`);
    console.log(`\n💡 먼저 GUI 서버를 시작하세요: npm run gui\n`);
    process.exit(1);
  }

  // 테스트 실행
  await testSingleRankSearch();

  // 배치 테스트는 선택적으로 실행 (시간이 오래 걸림)
  console.log('🤔 배치 테스트를 실행하시겠습니까? (y/N): ');
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('', async (answer) => {
    if (answer.toLowerCase() === 'y') {
      await testBatchRankSearch();
    } else {
      console.log('\n배치 테스트를 건너뜁니다.');
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
