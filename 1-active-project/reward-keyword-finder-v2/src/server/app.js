/**
 * Reward Keyword Finder V2 - API Server
 *
 * 네이버 플레이스 5위 이내 키워드 탐색 서버
 */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import keywordRoutes from './routes/keyword.js';
import validateRoutes from './routes/validate.js';
import crawlRoutes from './routes/crawl.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3200;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// CORS (개발용)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE');
  next();
});

// Routes
app.use('/api/keyword', keywordRoutes);
app.use('/api/validate', validateRoutes);
app.use('/api/crawl', crawlRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'reward-keyword-finder-v2',
    timestamp: new Date().toISOString()
  });
});

// GUI 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║  Reward Keyword Finder V2                  ║
║  서버가 시작되었습니다                       ║
║  http://localhost:${PORT}                     ║
╚════════════════════════════════════════════╝
  `);
});
