// 콘솔 인코딩 설정 (한글 깨짐 방지)
if (process.platform === 'win32') {
  process.stdout.setDefaultEncoding('utf8');
  process.stderr.setDefaultEncoding('utf8');
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { config } from './config';
import { initializeDatabase } from './database';
import { startScheduler } from './cron/scheduler';
import apiRouter from './routes/api';
import adminRouter from './routes/admin';

const app = express();

// ===========================
// 미들웨어 설정
// ===========================

// 보안 헤더
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}));

// CORS
app.use(cors({
  origin: config.nodeEnv === 'production'
    ? ['https://yourdomain.com']
    : [`http://localhost:${config.port}`, `http://127.0.0.1:${config.port}`],
  credentials: true
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: { success: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' }
});
app.use('/api', limiter);

// Body Parser
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Cookie Parser
app.use(cookieParser());

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, '../public')));

// ===========================
// 라우트 설정
// ===========================

// API 라우트
app.use('/api', apiRouter);

// 관리자 API 라우트
app.use('/api/admin', adminRouter);

// 출력 파일 다운로드
app.get('/output/:filename', (req, res) => {
  const { filename } = req.params;
  const allowedFiles = ['kakao_output.txt', 'web_output.html', 'web_output.md'];
  
  if (!allowedFiles.includes(filename)) {
    return res.status(404).send('파일을 찾을 수 없습니다.');
  }
  
  res.sendFile(path.join(config.outputDir, filename));
});

// SPA 라우팅 (모든 기타 경로는 index.html로)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// ===========================
// 에러 핸들링
// ===========================

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ 서버 오류:', err);
  res.status(500).json({
    success: false,
    error: config.nodeEnv === 'production'
      ? '서버 오류가 발생했습니다.'
      : err.message
  });
});

// ===========================
// 서버 시작
// ===========================

async function startServer() {
  try {
    // 데이터베이스 초기화
    console.log('📦 데이터베이스 초기화 중...');
    initializeDatabase();
    
    // 스케줄러 시작
    console.log('⏰ 스케줄러 시작 중...');
    startScheduler();
    
    // 서버 시작
    app.listen(config.port, () => {
      console.log('');
      console.log('═══════════════════════════════════════════');
      console.log('  🚀 한국 뉴스 커뮤니티 서버가 시작되었습니다!');
      console.log('═══════════════════════════════════════════');
      console.log(`  📍 로컬: http://localhost:${config.port}`);
      console.log(`  🌍 환경: ${config.nodeEnv}`);
      console.log(`  📅 업데이트: ${config.updateTimes.join(', ')}`);
      console.log('═══════════════════════════════════════════');
      console.log('');
    });
  } catch (error) {
    console.error('❌ 서버 시작 실패:', error);
    process.exit(1);
  }
}

// 프로세스 종료 처리
process.on('SIGINT', () => {
  console.log('\n👋 서버를 종료합니다...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 서버를 종료합니다...');
  process.exit(0);
});

startServer();

