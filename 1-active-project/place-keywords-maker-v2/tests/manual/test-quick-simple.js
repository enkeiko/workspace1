/**
 * 간단한 Quick Add 테스트
 */

async function testQuick() {
  const testPlaceId = '1716926393'; // 라이브볼

  console.log('🧪 Quick Add 테스트...');

  try {
    const response = await fetch('http://localhost:3000/api/quick-add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: testPlaceId }),
    });

    const result = await response.json();
    console.log('응답:', JSON.stringify(result, null, 2));

    // SSE 이벤트 수신
    console.log('\n📡 SSE 이벤트 수신 중...');
    const eventSource = new EventSource('http://localhost:3000/events');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE]', data.type, ':', data.message);

        if (data.type === 'complete' || data.type === 'error') {
          console.log('\n✅ 처리 완료!');
          eventSource.close();

          // 매장 확인
          checkStores();
        }
      } catch (e) {
        console.log('[SSE] Raw:', event.data);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ SSE 오류:', error);
      eventSource.close();
    };

  } catch (error) {
    console.error('💥 오류:', error.message);
  }
}

async function checkStores() {
  try {
    const response = await fetch('http://localhost:3000/api/stores');
    const stores = await response.json();

    console.log('\n📋 등록된 매장:', stores.length);
    stores.forEach(s => {
      console.log(`  - ${s.name} (${s.place_id})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('매장 조회 오류:', error.message);
    process.exit(1);
  }
}

// Node.js에서 fetch와 EventSource 사용하기 위한 polyfill 필요
// 대신 더 간단한 방법으로 테스트
async function simpleTest() {
  console.log('🧪 Quick Add 간단 테스트...');

  const response = await fetch('http://localhost:3000/api/quick-add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: '1716926393' }),
  });

  const result = await response.json();
  console.log('응답:', result);

  console.log('\n⏳ 20초 대기 후 매장 확인...');
  await new Promise(resolve => setTimeout(resolve, 20000));

  const storesResp = await fetch('http://localhost:3000/api/stores');
  const stores = await storesResp.json();

  console.log('\n📋 등록된 매장:', stores.length);
  stores.forEach(s => {
    console.log(`  - ${s.name} (${s.place_id})`);
  });
}

simpleTest().catch(console.error);
