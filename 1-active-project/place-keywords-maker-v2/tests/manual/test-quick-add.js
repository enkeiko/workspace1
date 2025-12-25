/**
 * Quick Add API 테스트
 */

async function testQuickAdd() {
  const testPlaceId = '1716926393'; // 라이브볼

  console.log('🧪 Quick Add API 테스트 시작...');
  console.log(`테스트 Place ID: ${testPlaceId}`);

  try {
    const response = await fetch('http://localhost:3000/api/quick-add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: testPlaceId,
      }),
    });

    const result = await response.json();

    console.log('\n📬 응답 결과:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ API 호출 성공!');
      console.log(`처리 중인 매장 수: ${result.placeIds?.length || 0}`);

      // 5초 후 매장 목록 확인
      console.log('\n⏳ 5초 후 매장 목록 확인...');
      await new Promise(resolve => setTimeout(resolve, 5000));

      const storesResponse = await fetch('http://localhost:3000/api/stores');
      const stores = await storesResponse.json();

      console.log('\n📋 현재 등록된 매장:');
      stores.forEach(store => {
        console.log(`  - ${store.name} (${store.place_id})`);
      });

      // 통계 확인
      const statsResponse = await fetch('http://localhost:3000/api/stats');
      const stats = await statsResponse.json();

      console.log('\n📊 통계:');
      console.log(`  총 매장: ${stats.totalStores}`);
      console.log(`  활성 매장: ${stats.activeStores}`);
      console.log(`  총 크롤링: ${stats.totalCrawls}`);
      console.log(`  성공률: ${stats.totalCrawls > 0 ? Math.round((stats.successfulCrawls / stats.totalCrawls) * 100) : 0}%`);

    } else {
      console.log('\n❌ API 호출 실패:');
      console.log(result.error);
    }

  } catch (error) {
    console.error('\n💥 오류 발생:', error.message);
  }
}

// 여러 개 테스트
async function testMultipleAdd() {
  console.log('\n\n🧪 여러 매장 동시 추가 테스트...');

  const testInput = `
1716926393
2023037465
1409613427
  `.trim();

  console.log('테스트 입력:');
  console.log(testInput);

  try {
    const response = await fetch('http://localhost:3000/api/quick-add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: testInput,
      }),
    });

    const result = await response.json();

    console.log('\n📬 응답 결과:');
    console.log(JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('\n✅ 여러 매장 추가 시작!');
      console.log(`처리할 매장 수: ${result.placeIds?.length || 0}`);
      if (result.errors && result.errors.length > 0) {
        console.log('⚠️ 오류:');
        result.errors.forEach(err => console.log(`  - ${err}`));
      }
    }

  } catch (error) {
    console.error('\n💥 오류 발생:', error.message);
  }
}

// 실행
(async () => {
  console.log('='.repeat(60));
  console.log('  Place Keywords Maker V2 - Quick Add 테스트');
  console.log('='.repeat(60));

  await testQuickAdd();

  console.log('\n' + '='.repeat(60));
  console.log('테스트 완료!');
  console.log('='.repeat(60));
})();
