/**
 * GUI 웹 서버
 * 실시간 진행 상황 모니터링
 */

import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { L1Processor } from '../modules/processor/L1Processor.js';
import yaml from 'js-yaml';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

class GUIServer {
  constructor() {
    this.clients = new Set();
    this.server = null;
    this.isProcessing = false;
  }

  /**
   * 설정 로드
   */
  async loadConfig() {
    const configPath = path.join(__dirname, '../config/default.yml');
    const configFile = await fs.readFile(configPath, 'utf-8');
    return yaml.load(configFile);
  }

  /**
   * 서버 시작
   */
  async start() {
    this.server = http.createServer(async (req, res) => {
      if (req.url === '/') {
        await this.serveHTML(res);
      } else if (req.url === '/events') {
        this.handleSSE(req, res);
      } else if (req.url === '/api/status') {
        this.handleStatus(req, res);
      } else if (req.url === '/api/process' && req.method === 'POST') {
        await this.handleProcess(req, res);
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    this.server.listen(PORT, () => {
      console.log(`\n🚀 GUI Server started at http://localhost:${PORT}`);
      console.log(`📊 Open your browser to view the dashboard\n`);
    });
  }

  /**
   * HTML 페이지 서빙
   */
  async serveHTML(res) {
    try {
      const htmlPath = path.join(__dirname, 'app.html');
      const html = await fs.readFile(htmlPath, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (error) {
      res.writeHead(500);
      res.end('Error loading page');
    }
  }

  /**
   * SSE (Server-Sent Events) 처리
   */
  handleSSE(req, res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    this.clients.add(res);

    req.on('close', () => {
      this.clients.delete(res);
    });

    // 초기 연결 메시지
    res.write('data: {"type":"connected","message":"Connected to server"}\n\n');
  }

  /**
   * 상태 API
   */
  handleStatus(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'running',
      isProcessing: this.isProcessing,
      timestamp: new Date().toISOString(),
    }));
  }

  /**
   * L1 처리 API
   */
  async handleProcess(req, res) {
    // 이미 처리 중이면 거부
    if (this.isProcessing) {
      res.writeHead(409, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: '이미 처리가 진행 중입니다.',
      }));
      return;
    }

    try {
      // POST body 읽기
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const { placeIds } = JSON.parse(body);

          if (!placeIds || !Array.isArray(placeIds) || placeIds.length === 0) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: '유효한 Place ID가 없습니다.',
            }));
            return;
          }

          // 즉시 응답
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: `${placeIds.length}개 매장 처리를 시작합니다.`,
          }));

          // 백그라운드에서 처리
          this.processPlaceIds(placeIds);

        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: '잘못된 요청입니다.',
          }));
        }
      });

    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: error.message,
      }));
    }
  }

  /**
   * Place ID 배치 처리
   */
  async processPlaceIds(placeIds) {
    this.isProcessing = true;

    this.broadcast({
      type: 'start',
      message: `${placeIds.length}개 매장 크롤링 시작`,
      total: placeIds.length,
    });

    try {
      // 설정 로드
      const config = await this.loadConfig();

      // L1 Processor 초기화
      const processor = new L1Processor({
        crawler: config.crawler,
        parser: config.parser,
        outputDir: config.pipeline.l1.outputDir,
      });

      await processor.initialize();

      // 각 Place ID 처리
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < placeIds.length; i++) {
        const placeId = placeIds[i];

        this.broadcast({
          type: 'progress',
          message: `${placeId} 처리 중...`,
          current: i + 1,
          total: placeIds.length,
          placeId,
        });

        try {
          const result = await processor.processPlace(placeId);

          if (result.success) {
            successCount++;
            this.broadcast({
              type: 'success',
              message: `✅ ${placeId} 완료 (완성도: ${result.completeness}%)`,
              placeId,
              completeness: result.completeness,
              current: i + 1,
              total: placeIds.length,
            });
          } else {
            failCount++;
            this.broadcast({
              type: 'error',
              message: `❌ ${placeId} 실패: ${result.error}`,
              placeId,
              error: result.error,
              current: i + 1,
              total: placeIds.length,
            });
          }
        } catch (error) {
          failCount++;
          this.broadcast({
            type: 'error',
            message: `❌ ${placeId} 에러: ${error.message}`,
            placeId,
            error: error.message,
            current: i + 1,
            total: placeIds.length,
          });
        }
      }

      await processor.cleanup();

      // 완료 알림
      this.broadcast({
        type: 'complete',
        message: `🎉 전체 처리 완료 (성공: ${successCount}, 실패: ${failCount})`,
        successCount,
        failCount,
        total: placeIds.length,
      });

    } catch (error) {
      this.broadcast({
        type: 'error',
        message: `❌ 처리 중 에러: ${error.message}`,
        error: error.message,
      });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 모든 클라이언트에게 이벤트 브로드캐스트
   */
  broadcast(event) {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    this.clients.forEach(client => {
      client.write(data);
    });
  }

  /**
   * 서버 종료
   */
  close() {
    if (this.server) {
      this.server.close();
      console.log('GUI Server closed');
    }
  }
}

// 단독 실행
const isMainModule = import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isMainModule || process.argv[1].includes('server.js')) {
  const server = new GUIServer();
  server.start();
}

export { GUIServer };
