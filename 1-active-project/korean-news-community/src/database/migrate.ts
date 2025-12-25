// Database Migration Script
import { initializeDatabase, closeDatabase } from './index';

console.log('🔄 데이터베이스 마이그레이션 시작...');

try {
  initializeDatabase();
  console.log('✅ 마이그레이션 완료!');
} catch (error) {
  console.error('❌ 마이그레이션 실패:', error);
  process.exit(1);
} finally {
  closeDatabase();
}

