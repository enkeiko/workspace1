import cron from 'node-cron';
import { collectAllNews } from '../collectors';
import { generateAllOutputs } from '../formatters';
import { UpdateLogRepository } from '../database';
import { config } from '../config';

// 스케줄러 시작
export function startScheduler(): void {
  console.log('⏰ 뉴스 수집 스케줄러 설정 중...');
  
  // 하루 4회 업데이트: 07:00, 12:00, 18:00, 23:00 (KST)
  // 서버가 UTC 기준이면 -9시간 조정 필요
  // 아래는 KST 기준
  
  // 07:00 업데이트
  cron.schedule('0 7 * * *', async () => {
    await runScheduledUpdate('07:00');
  }, {
    timezone: 'Asia/Seoul'
  });
  
  // 12:00 업데이트
  cron.schedule('0 12 * * *', async () => {
    await runScheduledUpdate('12:00');
  }, {
    timezone: 'Asia/Seoul'
  });
  
  // 18:00 업데이트
  cron.schedule('0 18 * * *', async () => {
    await runScheduledUpdate('18:00');
  }, {
    timezone: 'Asia/Seoul'
  });
  
  // 23:00 업데이트
  cron.schedule('0 23 * * *', async () => {
    await runScheduledUpdate('23:00');
  }, {
    timezone: 'Asia/Seoul'
  });
  
  console.log('✅ 스케줄러 설정 완료');
  console.log(`   - 업데이트 시간 (KST): ${config.updateTimes.join(', ')}`);
}

// 스케줄된 업데이트 실행
async function runScheduledUpdate(updateTime: string): Promise<void> {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log(`⏰ [${updateTime}] 스케줄된 뉴스 수집 시작`);
  console.log('═══════════════════════════════════════════');
  
  const startTime = Date.now();
  
  try {
    // 1. 뉴스 수집
    console.log('📡 뉴스 수집 중...');
    const stats = await collectAllNews();
    
    // 2. 출력 파일 생성
    console.log('📄 출력 파일 생성 중...');
    const outputResult = await generateAllOutputs(6); // 최근 6시간
    
    // 3. 로그 기록
    UpdateLogRepository.insert({
      update_time: updateTime,
      articles_collected: stats.total,
      articles_ai_vibe: stats.aiVibe,
      articles_local_biz: stats.localBiz,
      status: stats.errors.length > 0 ? 'partial' : 'success',
      error_message: stats.errors.length > 0 ? stats.errors.slice(0, 5).join('; ') : undefined
    });
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('');
    console.log('───────────────────────────────────────────');
    console.log(`✅ [${updateTime}] 업데이트 완료 (${elapsed}초)`);
    console.log(`   📊 수집: AI·바이브 ${stats.aiVibe}개, 자영업 ${stats.localBiz}개`);
    console.log(`   📄 출력: ${outputResult.files.join(', ')}`);
    if (stats.errors.length > 0) {
      console.log(`   ⚠️ 오류: ${stats.errors.length}개`);
    }
    console.log('───────────────────────────────────────────');
    console.log('');
    
  } catch (error: any) {
    console.error(`❌ [${updateTime}] 업데이트 실패:`, error.message);
    
    // 실패 로그 기록
    UpdateLogRepository.insert({
      update_time: updateTime,
      articles_collected: 0,
      articles_ai_vibe: 0,
      articles_local_biz: 0,
      status: 'failed',
      error_message: error.message
    });
  }
}

// 수동 실행 함수
export async function runManualUpdate(): Promise<{
  success: boolean;
  stats?: {
    total: number;
    aiVibe: number;
    localBiz: number;
    errors: string[];
  };
  error?: string;
}> {
  const updateTime = new Date().toTimeString().slice(0, 5);
  
  console.log(`🔄 수동 업데이트 시작 (${updateTime})`);
  
  try {
    // 뉴스 수집
    const stats = await collectAllNews();
    
    // 출력 파일 생성
    await generateAllOutputs(6);
    
    // 로그 기록
    UpdateLogRepository.insert({
      update_time: updateTime,
      articles_collected: stats.total,
      articles_ai_vibe: stats.aiVibe,
      articles_local_biz: stats.localBiz,
      status: stats.errors.length > 0 ? 'partial' : 'success',
      error_message: stats.errors.length > 0 ? stats.errors.slice(0, 5).join('; ') : undefined
    });
    
    return { success: true, stats };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 다음 업데이트 시간 계산
export function getNextUpdateTime(): { time: string; remaining: string } {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;
  
  const updateMinutes = [7 * 60, 12 * 60, 18 * 60, 23 * 60]; // 07:00, 12:00, 18:00, 23:00
  
  let nextUpdate = updateMinutes[0] + 24 * 60; // 다음날 07:00
  
  for (const time of updateMinutes) {
    if (time > currentTime) {
      nextUpdate = time;
      break;
    }
  }
  
  const remainingMinutes = nextUpdate - currentTime;
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  
  const nextHour = Math.floor(nextUpdate / 60) % 24;
  const nextMinute = nextUpdate % 60;
  
  return {
    time: `${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`,
    remaining: `${hours}시간 ${minutes}분`
  };
}

