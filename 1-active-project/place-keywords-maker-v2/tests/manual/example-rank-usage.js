/**
 * 키워드 순위 조회 기능 사용 예제
 *
 * 이 파일은 SearchRankCrawler API 사용법을 보여주는 예제입니다.
 *
 * 사전 준비:
 * 1. GUI 서버 시작: npm run gui
 * 2. 다른 터미널에서 이 스크립트 실행: node tests/manual/example-rank-usage.js
 */

const API_BASE = 'http://localhost:3000';

// ========================================
// 예제 1: 단일 키워드 순위 조회
// ========================================

async function example1_singleKeyword() {
  console.log('\n📌 예제 1: 단일 키워드 순위 조회\n');

  const keyword = '강남 맛집';
  const placeId = '1768171911';  // 여기에 실제 Place ID 입력

  console.log(`키워드: "${keyword}"`);
  console.log(`Place ID: ${placeId}`);
  console.log('조회 중...\n');

  try {
    const response = await fetch(`${API_BASE}/api/rank/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, placeId }),
    });

    const data = await response.json();

    if (data.success) {
      if (data.result) {
        console.log('✅ 검출 성공!');
        console.log(`   순위: ${data.result.rank}위`);
        console.log(`   매장명: ${data.result.placeName}`);
        console.log(`   카테고리: ${data.result.category}`);
        console.log(`   평점: ${data.result.rating} ⭐ (리뷰 ${data.result.reviewCount}개)`);
        console.log(`   페이지: ${data.result.page}페이지\n`);
      } else {
        console.log('⚠️  순위권 밖 (150위 이내 미검출)\n');
      }
    } else {
      console.log(`❌ 실패: ${data.error}\n`);
    }
  } catch (error) {
    console.log(`❌ 오류: ${error.message}\n`);
  }
}

// ========================================
// 예제 2: 여러 키워드 배치 조회
// ========================================

async function example2_batchKeywords() {
  console.log('\n📌 예제 2: 여러 키워드 배치 조회\n');

  const keywords = [
    '강남 맛집',
    '역삼 맛집',
    '강남역 맛집',
    '역삼동 음식점',
    '강남 한식',
  ];
  const placeId = '1768171911';  // 여기에 실제 Place ID 입력

  console.log(`키워드: ${keywords.join(', ')}`);
  console.log(`Place ID: ${placeId}`);
  console.log(`총 ${keywords.length}개 키워드`);
  console.log('배치 조회 시작...\n');

  try {
    const response = await fetch(`${API_BASE}/api/rank/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keywords,
        placeId,
        concurrency: 2,  // 동시 2개씩 처리
      }),
    });

    const data = await response.json();

    if (data.success) {
      console.log(`✅ ${data.message}`);
      console.log(`\n💡 실시간 로그 탭에서 진행 상황을 확인하세요.`);
      console.log(`💡 완료 후 data/output/batch-rank-${placeId}-*.json 파일을 확인하세요.\n`);
    } else {
      console.log(`❌ 실패: ${data.error}\n`);
    }
  } catch (error) {
    console.log(`❌ 오류: ${error.message}\n`);
  }
}

// ========================================
// 예제 3: 순위 변화 비교
// ========================================

async function example3_compareRanks() {
  console.log('\n📌 예제 3: 순위 변화 비교 (2주 간격 가정)\n');

  const keyword = '강남 맛집';
  const placeId = '1768171911';

  // 이전 순위 (가정: 2주 전 데이터)
  const previousRank = 15;

  console.log(`키워드: "${keyword}"`);
  console.log(`이전 순위: ${previousRank}위 (2주 전)`);
  console.log('현재 순위 조회 중...\n');

  try {
    const response = await fetch(`${API_BASE}/api/rank/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword, placeId }),
    });

    const data = await response.json();

    if (data.success && data.result) {
      const currentRank = data.result.rank;
      const change = previousRank - currentRank;

      console.log(`현재 순위: ${currentRank}위\n`);

      if (change > 0) {
        console.log(`📈 순위 상승! ${Math.abs(change)}위 UP ⬆️`);
        console.log(`   ${previousRank}위 → ${currentRank}위\n`);
      } else if (change < 0) {
        console.log(`📉 순위 하락... ${Math.abs(change)}위 DOWN ⬇️`);
        console.log(`   ${previousRank}위 → ${currentRank}위\n`);
      } else {
        console.log(`➡️  순위 유지 (변동 없음)\n`);
      }
    } else {
      console.log(`현재 순위: 순위권 밖\n`);
      console.log(`📉 순위 하락... 150위 밖으로 떨어짐\n`);
    }
  } catch (error) {
    console.log(`❌ 오류: ${error.message}\n`);
  }
}

// ========================================
// 예제 4: 여러 매장 비교
// ========================================

async function example4_compareStores() {
  console.log('\n📌 예제 4: 여러 매장 순위 비교\n');

  const keyword = '강남 맛집';
  const stores = [
    { name: '우리 매장', placeId: '1768171911' },
    { name: '경쟁 매장 A', placeId: '1265317185' },
    { name: '경쟁 매장 B', placeId: '1716926393' },
  ];

  console.log(`키워드: "${keyword}"`);
  console.log(`비교 매장: ${stores.map(s => s.name).join(', ')}\n`);

  const results = [];

  for (const store of stores) {
    console.log(`🔍 ${store.name} 순위 조회 중...`);

    try {
      const response = await fetch(`${API_BASE}/api/rank/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, placeId: store.placeId }),
      });

      const data = await response.json();

      if (data.success && data.result) {
        results.push({
          name: store.name,
          rank: data.result.rank,
          rating: data.result.rating,
          reviewCount: data.result.reviewCount,
        });
        console.log(`   ✅ ${data.result.rank}위`);
      } else {
        results.push({
          name: store.name,
          rank: null,
          rating: null,
          reviewCount: null,
        });
        console.log(`   ⚠️  순위권 밖`);
      }

      // Rate limiting: 요청 간 2초 대기
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.log(`   ❌ 오류: ${error.message}`);
    }
  }

  // 결과 정렬 (순위 오름차순)
  results.sort((a, b) => {
    if (a.rank === null) return 1;
    if (b.rank === null) return -1;
    return a.rank - b.rank;
  });

  console.log('\n📊 순위 비교 결과:\n');
  console.log('순위 | 매장명       | 평점  | 리뷰 수');
  console.log('-----|-------------|-------|--------');
  results.forEach(r => {
    const rank = r.rank ? `${r.rank}위`.padEnd(4) : '150위+';
    const name = r.name.padEnd(12);
    const rating = r.rating ? r.rating.toFixed(1) : '-    ';
    const reviews = r.reviewCount || '-';
    console.log(`${rank} | ${name} | ${rating} | ${reviews}`);
  });
  console.log('');
}

// ========================================
// 메인 실행
// ========================================

async function main() {
  console.log('🚀 키워드 순위 조회 기능 사용 예제');
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

  // 예제 선택
  const examples = [
    { name: '단일 키워드 순위 조회', fn: example1_singleKeyword },
    { name: '여러 키워드 배치 조회', fn: example2_batchKeywords },
    { name: '순위 변화 비교', fn: example3_compareRanks },
    { name: '여러 매장 순위 비교', fn: example4_compareStores },
  ];

  console.log('실행할 예제를 선택하세요:\n');
  examples.forEach((ex, i) => {
    console.log(`${i + 1}. ${ex.name}`);
  });
  console.log('0. 모두 실행');
  console.log('');

  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('선택 (0-4): ', async (answer) => {
    const choice = parseInt(answer);

    if (choice === 0) {
      // 모두 실행
      for (const ex of examples) {
        await ex.fn();
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } else if (choice >= 1 && choice <= examples.length) {
      await examples[choice - 1].fn();
    } else {
      console.log('\n잘못된 선택입니다.\n');
    }

    console.log('✅ 예제 완료!\n');
    rl.close();
    process.exit(0);
  });
}

// 스크립트 실행
main().catch(error => {
  console.error('예제 실행 중 오류:', error);
  process.exit(1);
});
