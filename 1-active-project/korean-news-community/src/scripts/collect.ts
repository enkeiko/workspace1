// 수동 수집 스크립트
// 실행: npm run collect

// 콘솔 인코딩 설정 (한글 깨짐 방지)
if (process.platform === 'win32') {
  process.stdout.setDefaultEncoding('utf8');
  process.stderr.setDefaultEncoding('utf8');
}

import { initializeDatabase, closeDatabase } from '../database';
import { collectAllNews } from '../collectors';
import { generateAllOutputs } from '../formatters';

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  🚀 수동 뉴스 수집 시작');
  console.log('═══════════════════════════════════════════');
  console.log('');
  
  const startTime = Date.now();
  
  try {
    // 데이터베이스 초기화
    console.log('📦 데이터베이스 초기화...');
    initializeDatabase();
    
    // 뉴스 수집
    console.log('📡 뉴스 수집 중...');
    const stats = await collectAllNews();
    
    // 출력 파일 생성
    console.log('📄 출력 파일 생성 중...');
    const outputResult = await generateAllOutputs(24); // 최근 24시간
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('');
    console.log('═══════════════════════════════════════════');
    console.log(`  ✅ 수집 완료! (${elapsed}초)`);
    console.log('═══════════════════════════════════════════');
    console.log(`  📊 총 수집: ${stats.total}개`);
    console.log(`     - 🔵 AI·바이브코딩: ${stats.aiVibe}개`);
    console.log(`     - 🟢 자영업·플레이스: ${stats.localBiz}개`);
    console.log(`     - ⏭️ 중복 제외: ${stats.duplicates}개`);
    console.log('');
    console.log(`  📄 출력 파일:`);
    outputResult.files.forEach(file => {
      console.log(`     - ${file}`);
    });
    
    if (stats.errors.length > 0) {
      console.log('');
      console.log(`  ⚠️ 오류 (${stats.errors.length}개):`);
      stats.errors.slice(0, 5).forEach(error => {
        console.log(`     - ${error}`);
      });
    }
    
    console.log('═══════════════════════════════════════════');
    console.log('');
    
  } catch (error: any) {
    console.error('');
    console.error('═══════════════════════════════════════════');
    console.error(`  ❌ 수집 실패: ${error.message}`);
    console.error('═══════════════════════════════════════════');
    console.error('');
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

main();

