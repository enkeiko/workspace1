async function checkStores() {
  try {
    const response = await fetch('http://localhost:3000/api/stores');
    const stores = await response.json();

    console.log(`\n📋 등록된 매장: ${stores.length}개\n`);

    stores.forEach(s => {
      console.log(`✅ ${s.name}`);
      console.log(`   - Place ID: ${s.place_id}`);
      console.log(`   - 카테고리: ${s.category || 'N/A'}`);
      console.log(`   - 주소: ${s.address || 'N/A'}`);
      console.log(`   - 전화: ${s.phone || 'N/A'}`);
      console.log(`   - 상태: ${s.status}`);
      console.log(`   - 등록일: ${s.created_at}`);
      console.log('');
    });

    // 통계
    const statsResp = await fetch('http://localhost:3000/api/stats');
    const stats = await statsResp.json();
    console.log('📊 통계:');
    console.log(`   총 매장: ${stats.totalStores}`);
    console.log(`   활성 매장: ${stats.activeStores}`);
    console.log(`   총 크롤링: ${stats.totalCrawls}`);
    console.log(`   성공: ${stats.successfulCrawls} / 실패: ${stats.failedCrawls}`);
    console.log(`   성공률: ${stats.totalCrawls > 0 ? Math.round((stats.successfulCrawls / stats.totalCrawls) * 100) : 0}%\n`);

  } catch (error) {
    console.error('오류:', error.message);
  }
}

checkStores();
