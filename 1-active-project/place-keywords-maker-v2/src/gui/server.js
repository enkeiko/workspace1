/**
 * GUI 웹 서버 - 매장 관리 및 크롤링 시스템
 */

import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import dotenv from 'dotenv';
import { StoreDatabase } from '../database/StoreDatabase.js';
import { PlaceCrawlerV04 } from '../modules/crawler/PlaceCrawlerV04.js';
import { QuickInfoCollector } from '../modules/crawler/QuickInfoCollector.js';
import { PlaceIdParser } from '../modules/parser/PlaceIdParser.js';
import { SearchRankCrawler } from '../modules/crawler/SearchRankCrawler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.GUI_PORT || 3000;

class GUIServer {
  constructor() {
    this.clients = new Set();
    this.server = null;
    this.isProcessing = false;
    this.shouldStop = false;  // 중단 플래그
    this.db = new StoreDatabase();
    this.crawler = null;
    this.rankCrawler = null;  // SearchRankCrawler 인스턴스
  }

  /**
   * 서버 시작
   */
  async start() {
    // DB 초기화
    this.db.initialize();

    // 크롤러 초기화
    this.crawler = new PlaceCrawlerV04({
      headless: true,
      userDataDir: path.join(__dirname, '../../data/cache/puppeteer-profile'),
    });

    this.server = http.createServer(async (req, res) => {
      await this.handleRequest(req, res);
    });

    this.server.listen(PORT, () => {
      console.log(`\n🚀 GUI Server started at http://localhost:${PORT}`);
      console.log(`📊 Open your browser to view the dashboard\n`);
    });
  }

  /**
   * HTTP 요청 라우팅
   */
  async handleRequest(req, res) {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;
    const method = req.method;

    // CORS 헤더
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      // 정적 파일
      if (pathname === '/') {
        await this.serveHTML(res);
      }
      // SSE
      else if (pathname === '/events') {
        this.handleSSE(req, res);
      }
      // API 라우트
      else if (pathname.startsWith('/api/')) {
        await this.handleAPI(pathname, method, req, res);
      }
      else {
        res.writeHead(404);
        res.end('Not Found');
      }
    } catch (error) {
      console.error('Request error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
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
   * API 라우팅
   */
  async handleAPI(pathname, method, req, res) {
    // GET /api/stats - 통계
    if (pathname === '/api/stats' && method === 'GET') {
      const stats = this.db.getOverallStats();
      this.sendJSON(res, stats);
    }
    // GET /api/stores - 매장 목록
    else if (pathname === '/api/stores' && method === 'GET') {
      const stores = this.db.getStoresWithLatestCrawl();
      this.sendJSON(res, stores);
    }
    // POST /api/stores - 매장 추가
    else if (pathname === '/api/stores' && method === 'POST') {
      const body = await this.readBody(req);
      try {
        const id = this.db.addStore(body);
        this.sendJSON(res, { success: true, id });
      } catch (error) {
        this.sendJSON(res, { success: false, error: error.message }, 400);
      }
    }
    // GET /api/stores/:placeId - 매장 상세
    else if (pathname.match(/^\/api\/stores\/[^\/]+$/) && method === 'GET') {
      const placeId = pathname.split('/').pop();
      const store = this.db.getStore(placeId);
      if (store) {
        this.sendJSON(res, store);
      } else {
        this.sendJSON(res, { success: false, error: 'Store not found' }, 404);
      }
    }
    // DELETE /api/stores/:placeId - 매장 삭제
    else if (pathname.match(/^\/api\/stores\/[^\/]+$/) && method === 'DELETE') {
      const placeId = pathname.split('/').pop();
      const result = this.db.deleteStore(placeId);
      this.sendJSON(res, { success: true, changes: result.changes });
    }
    // GET /api/stores/:placeId/summary - 매장 요약
    else if (pathname.match(/^\/api\/stores\/[^\/]+\/summary$/) && method === 'GET') {
      const placeId = pathname.split('/')[3];
      const summary = this.db.getLatestSummary(placeId);
      this.sendJSON(res, summary || {});
    }
    // GET /api/stores/:placeId/history - 매장 크롤링 이력
    else if (pathname.match(/^\/api\/stores\/[^\/]+\/history$/) && method === 'GET') {
      const placeId = pathname.split('/')[3];
      const history = this.db.getCrawlHistory(placeId);
      this.sendJSON(res, history);
    }
    // GET /api/history - 전체 크롤링 이력
    else if (pathname === '/api/history' && method === 'GET') {
      const history = this.db.db.prepare(`
        SELECT ch.*, s.name as store_name
        FROM crawl_history ch
        JOIN stores s ON ch.store_id = s.id
        ORDER BY ch.started_at DESC
        LIMIT 50
      `).all();
      this.sendJSON(res, history);
    }
    // POST /api/crawl - 크롤링 시작
    else if (pathname === '/api/crawl' && method === 'POST') {
      const body = await this.readBody(req);
      await this.handleCrawl(body, res);
    }
    // POST /api/crawl/stop - 크롤링 중단
    else if (pathname === '/api/crawl/stop' && method === 'POST') {
      await this.handleStop(res);
    }
    // POST /api/quick-add - URL/Place ID로 빠른 추가
    else if (pathname === '/api/quick-add' && method === 'POST') {
      const body = await this.readBody(req);
      await this.handleQuickAdd(body, res);
    }
    // POST /api/rank/search - 키워드 순위 조회 (단일)
    else if (pathname === '/api/rank/search' && method === 'POST') {
      const body = await this.readBody(req);
      await this.handleRankSearch(body, res);
    }
    // POST /api/rank/batch - 키워드 순위 배치 조회
    else if (pathname === '/api/rank/batch' && method === 'POST') {
      const body = await this.readBody(req);
      await this.handleRankBatch(body, res);
    }
    // POST /api/rank/keywords/add - 추적할 키워드 추가
    else if (pathname === '/api/rank/keywords/add' && method === 'POST') {
      const body = await this.readBody(req);
      await this.handleAddKeyword(body, res);
    }
    // GET /api/rank/keywords/:placeId - 추적 중인 키워드 목록
    else if (pathname.match(/^\/api\/rank\/keywords\/[^\/]+$/) && method === 'GET') {
      const placeId = pathname.split('/').pop();
      const keywords = this.db.getTrackedKeywordsByPlaceId(placeId);
      this.sendJSON(res, { success: true, keywords });
    }
    // DELETE /api/rank/keywords/:keywordId - 키워드 삭제
    else if (pathname.match(/^\/api\/rank\/keywords\/[^\/]+$/) && method === 'DELETE') {
      const keywordId = pathname.split('/').pop();
      this.db.deleteTrackedKeyword(keywordId);
      this.sendJSON(res, { success: true });
    }
    // GET /api/rank/history/:keywordId - 키워드 순위 이력
    else if (pathname.match(/^\/api\/rank\/history\/[^\/]+$/) && method === 'GET') {
      const keywordId = pathname.split('/').pop();
      const history = this.db.getRankHistory(keywordId, 100);
      const stats = this.db.getRankStats(keywordId);
      this.sendJSON(res, { success: true, history, stats });
    }
    // GET /api/rank/latest/:placeId - 최신 순위 조회
    else if (pathname.match(/^\/api\/rank\/latest\/[^\/]+$/) && method === 'GET') {
      const placeId = pathname.split('/').pop();
      const ranks = this.db.getLatestRanks(placeId);
      this.sendJSON(res, { success: true, ranks });
    }
    // POST /api/rank/check-all - 모든 키워드 순위 재조회
    else if (pathname === '/api/rank/check-all' && method === 'POST') {
      const body = await this.readBody(req);
      await this.handleCheckAllRanks(body, res);
    }
    // GET /api/stores/:placeId/data - 매장 크롤링 데이터 조회
    else if (pathname.match(/^\/api\/stores\/[^\/]+\/data$/) && method === 'GET') {
      const placeId = pathname.split('/')[3];
      try {
        const filePath = path.join(__dirname, `../../data/output/l1/${placeId}.json`);
        const data = await fs.readFile(filePath, 'utf-8');
        this.sendJSON(res, JSON.parse(data));
      } catch (error) {
        this.sendJSON(res, { success: false, error: 'Data not found' }, 404);
      }
    }
    else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Not Found' }));
    }
  }

  /**
   * 크롤링 처리
   */
  async handleCrawl(body, res) {
    if (this.isProcessing) {
      this.sendJSON(res, {
        success: false,
        error: '이미 처리가 진행 중입니다.',
      }, 409);
      return;
    }

    const { placeIds } = body;

    if (!placeIds || !Array.isArray(placeIds) || placeIds.length === 0) {
      this.sendJSON(res, {
        success: false,
        error: '유효한 Place ID가 없습니다.',
      }, 400);
      return;
    }

    // 즉시 응답
    this.sendJSON(res, {
      success: true,
      message: `${placeIds.length}개 매장 처리를 시작합니다.`,
    });

    // 백그라운드에서 처리
    this.processPlaceIds(placeIds);
  }

  /**
   * 크롤링 중단 처리
   */
  async handleStop(res) {
    if (!this.isProcessing) {
      this.sendJSON(res, {
        success: false,
        error: '진행 중인 작업이 없습니다.',
      }, 400);
      return;
    }

    this.shouldStop = true;
    this.sendJSON(res, {
      success: true,
      message: '크롤링 중단 요청이 접수되었습니다.',
    });

    this.broadcast({
      type: 'info',
      message: '⚠️ 사용자가 크롤링 중단을 요청했습니다. 현재 작업 완료 후 중단됩니다...',
    });
  }

  /**
   * Place ID 배치 처리
   */
  async processPlaceIds(placeIds) {
    this.isProcessing = true;
    this.shouldStop = false;  // 중단 플래그 초기화

    this.broadcast({
      type: 'start',
      message: `${placeIds.length}개 매장 크롤링 시작`,
      total: placeIds.length,
    });

    try {
      await this.crawler.initialize();

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < placeIds.length; i++) {
        // 중단 요청 확인
        if (this.shouldStop) {
          this.broadcast({
            type: 'info',
            message: `⛔ 크롤링이 중단되었습니다. (완료: ${successCount}, 실패: ${failCount}, 남은 작업: ${placeIds.length - i})`,
          });
          break;
        }

        const placeId = placeIds[i];
        const store = this.db.getStore(placeId);

        if (!store) {
          this.broadcast({
            type: 'error',
            message: `❌ ${placeId}: 매장을 찾을 수 없습니다`,
            placeId,
            current: i + 1,
            total: placeIds.length,
          });
          failCount++;
          continue;
        }

        this.broadcast({
          type: 'progress',
          message: `${store.name} (${placeId}) 처리 중...`,
          current: i + 1,
          total: placeIds.length,
          placeId,
        });

        // 크롤링 이력 시작
        const crawlId = this.db.addCrawlHistory({
          placeId,
          status: 'processing',
          startedAt: new Date().toISOString(),
        });

        try {
          const result = await this.crawler.crawlPlace(placeId);

          // JSON 저장
          const outputDir = path.join(__dirname, '../../data/output/l1');
          await fs.mkdir(outputDir, { recursive: true });
          const filePath = path.join(outputDir, `${placeId}.json`);
          await fs.writeFile(filePath, JSON.stringify(result, null, 2), 'utf-8');

          // 크롤링 이력 업데이트
          this.db.updateCrawlHistory(crawlId, {
            status: 'success',
            dataFilePath: filePath,
            completedAt: new Date().toISOString(),
          });

          // 요약 데이터 저장
          this.db.addCrawlSummary({
            crawlId,
            storeId: store.id,
            rating: result.basic?.rating || null,
            reviewCount: result.reviews?.stats?.totalReviews || result.reviews?.stats?.totalCount || 0,
            visitorReviewCount: result.reviews?.stats?.visitorReviews || result.visitorReviewItems?.length || 0,
            blogReviewCount: result.reviews?.blogReviews?.length || 0,
            menuCount: result.menus?.length || 0,
            naverCompetitorCount: result.competitors?.naver?.length || 0,
            diningcodeCompetitorCount: result.competitors?.diningcode?.length || 0,
            keywordCount: result.ranking?.votedKeywords?.length || 0,
            hasDiningcode: result.aiBriefing?.externalLinks?.some(l => l.type === 'diningcode') ? 1 : 0,
            hasCatchtable: result.aiBriefing?.externalLinks?.some(l => l.type === 'catchtable') ? 1 : 0,
          });

          successCount++;
          this.broadcast({
            type: 'success',
            message: `✅ ${result.basic?.name || store.name} 완료`,
            placeId,
            current: i + 1,
            total: placeIds.length,
          });

        } catch (error) {
          // 크롤링 이력 업데이트 (실패)
          this.db.updateCrawlHistory(crawlId, {
            status: 'failed',
            errorMessage: error.message,
            completedAt: new Date().toISOString(),
          });

          failCount++;
          this.broadcast({
            type: 'error',
            message: `❌ ${store.name} 실패: ${error.message}`,
            placeId,
            error: error.message,
            current: i + 1,
            total: placeIds.length,
          });
        }
      }

      await this.crawler.cleanup();

      // 완료 알림
      if (this.shouldStop) {
        this.broadcast({
          type: 'complete',
          message: `⛔ 크롤링 중단됨 (완료: ${successCount}, 실패: ${failCount})`,
          successCount,
          failCount,
          total: placeIds.length,
          stopped: true,
        });
      } else {
        this.broadcast({
          type: 'complete',
          message: `🎉 전체 처리 완료 (성공: ${successCount}, 실패: ${failCount})`,
          successCount,
          failCount,
          total: placeIds.length,
        });
      }

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
      try {
        client.write(data);
      } catch (error) {
        console.error('Failed to write to client:', error);
        this.clients.delete(client);
      }
    });
  }

  /**
   * JSON 응답
   */
  sendJSON(res, data, status = 200) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  /**
   * 빠른 추가 처리 - URL 또는 Place ID로 매장 정보 수집 후 추가 및 크롤링
   */
  async handleQuickAdd(body, res) {
    const { input } = body;

    if (!input) {
      this.sendJSON(res, {
        success: false,
        error: '네이버 플레이스 URL 또는 Place ID를 입력하세요.',
      }, 400);
      return;
    }

    // 여러 개 입력 지원 (줄바꿈, 쉼표, 공백으로 구분)
    const inputs = input
      .split(/[\n,\s]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (inputs.length === 0) {
      this.sendJSON(res, {
        success: false,
        error: '유효한 입력이 없습니다.',
      }, 400);
      return;
    }

    // Place ID 추출
    const placeIds = [];
    const errors = [];

    for (const inp of inputs) {
      const placeId = PlaceIdParser.extract(inp);
      if (placeId && PlaceIdParser.isValid(placeId)) {
        placeIds.push(placeId);
      } else {
        errors.push(`유효하지 않음: ${inp}`);
      }
    }

    if (placeIds.length === 0) {
      this.sendJSON(res, {
        success: false,
        error: '유효한 Place ID가 없습니다.',
        errors,
      }, 400);
      return;
    }

    // 즉시 응답
    this.sendJSON(res, {
      success: true,
      message: `${placeIds.length}개 매장 추가 및 크롤링을 시작합니다.`,
      placeIds,
      errors,
    });

    // 백그라운드에서 처리
    this.processQuickAdd(placeIds);
  }

  /**
   * 빠른 추가 백그라운드 처리
   */
  async processQuickAdd(placeIds) {
    console.log('[processQuickAdd] 시작, placeIds:', placeIds);

    // 별도의 크롤러 인스턴스 생성
    const quickCrawler = new PlaceCrawlerV04({
      headless: true,
      userDataDir: path.join(__dirname, '../../data/cache/puppeteer-profile'),
    });

    try {
      console.log('[processQuickAdd] 크롤러 초기화 중...');
      await quickCrawler.initialize();
      console.log('[processQuickAdd] 크롤러 초기화 완료');

      for (const placeId of placeIds) {
        console.log('[processQuickAdd] 처리 중:', placeId);

        // 이미 존재하는지 확인
        const existing = this.db.getStore(placeId);
        if (existing) {
          console.log('[processQuickAdd] 이미 존재:', placeId);
          this.broadcast({
            type: 'info',
            message: `ℹ️ ${placeId}: 이미 등록된 매장입니다`,
          });
          continue;
        }

        try {
          // 전체 크롤링으로 기본 정보 수집
          console.log('[processQuickAdd] 크롤링 시작:', placeId);
          this.broadcast({
            type: 'info',
            message: `🔍 ${placeId}: 정보 수집 중...`,
          });

          const result = await quickCrawler.crawlPlace(placeId);
          console.log('[processQuickAdd] 크롤링 완료:', placeId, result.basic?.name);

          if (!result.basic?.name) {
            this.broadcast({
              type: 'error',
              message: `❌ ${placeId}: 매장 정보를 가져올 수 없습니다`,
            });
            continue;
          }

          // DB에 추가
          this.db.addStore({
            placeId: result.placeId,
            name: result.basic.name,
            category: result.basic.category,
            address: result.basic.address?.road || result.basic.address?.jibun || null,
            phone: result.basic.phone,
          });

          // JSON 저장
          const outputDir = path.join(__dirname, '../../data/output/l1');
          await fs.mkdir(outputDir, { recursive: true });
          const filePath = path.join(outputDir, `${placeId}.json`);
          await fs.writeFile(filePath, JSON.stringify(result, null, 2), 'utf-8');

          // 크롤링 이력 추가
          const store = this.db.getStore(placeId);
          const crawlId = this.db.addCrawlHistory({
            placeId,
            status: 'success',
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          });

          // 요약 데이터 저장
          this.db.addCrawlSummary({
            crawlId,
            storeId: store.id,
            rating: result.basic?.rating || null,
            reviewCount: result.reviews?.stats?.totalReviews || result.reviews?.stats?.totalCount || 0,
            visitorReviewCount: result.reviews?.stats?.visitorReviews || result.visitorReviewItems?.length || 0,
            blogReviewCount: result.reviews?.blogReviews?.length || 0,
            menuCount: result.menus?.length || 0,
            naverCompetitorCount: result.competitors?.naver?.length || 0,
            diningcodeCompetitorCount: result.competitors?.diningcode?.length || 0,
            keywordCount: result.ranking?.votedKeywords?.length || 0,
            hasDiningcode: result.aiBriefing?.externalLinks?.some(l => l.type === 'diningcode') ? 1 : 0,
            hasCatchtable: result.aiBriefing?.externalLinks?.some(l => l.type === 'catchtable') ? 1 : 0,
          });

          this.broadcast({
            type: 'store_added',
            message: `✅ ${result.basic.name} 추가 및 크롤링 완료`,
            placeId: result.placeId,
          });

        } catch (error) {
          console.error('[processQuickAdd] 크롤링 오류:', placeId, error);
          this.broadcast({
            type: 'error',
            message: `❌ ${placeId}: ${error.message}`,
          });
        }
      }

      console.log('[processQuickAdd] 모든 처리 완료');
      this.broadcast({
        type: 'complete',
        message: `🎉 ${placeIds.length}개 매장 처리 완료`,
      });

    } catch (error) {
      console.error('[processQuickAdd] 전체 오류:', error);
      this.broadcast({
        type: 'error',
        message: `❌ 빠른 추가 중 오류: ${error.message}`,
      });
    } finally {
      console.log('[processQuickAdd] 크롤러 정리 중...');
      // 크롤러 정리
      await quickCrawler.close();
      console.log('[processQuickAdd] 완료');
    }
  }

  /**
   * 단일 키워드 순위 조회
   */
  async handleRankSearch(body, res) {
    const { keyword, placeId, maxPages } = body;

    if (!keyword || !placeId) {
      this.sendJSON(res, {
        success: false,
        error: '키워드와 Place ID를 모두 입력하세요.',
      }, 400);
      return;
    }

    // maxPages 검증 및 기본값 설정
    const searchDepth = maxPages || 20;  // 기본값: 20페이지 (300위)

    if (searchDepth < 1 || searchDepth > 40) {
      this.sendJSON(res, {
        success: false,
        error: 'maxPages는 1~40 사이여야 합니다.',
      }, 400);
      return;
    }

    const maxRank = searchDepth * 15;

    try {
      // SearchRankCrawler 초기화 (필요시)
      if (!this.rankCrawler) {
        this.rankCrawler = new SearchRankCrawler({
          headless: true,
          maxPages: searchDepth,
        });
        await this.rankCrawler.initialize();
      } else {
        // 기존 인스턴스가 있으면 maxPages 업데이트
        this.rankCrawler.config.maxPages = searchDepth;
      }

      this.broadcast({
        type: 'info',
        message: `🔍 "${keyword}"에서 ${placeId} 순위 검색 중... (최대 ${maxRank}위)`,
      });

      const result = await this.rankCrawler.findRank(keyword, placeId);

      if (result) {
        this.broadcast({
          type: 'success',
          message: `✅ "${keyword}": ${result.placeName} - ${result.rank}위`,
        });

        this.sendJSON(res, {
          success: true,
          result,
        });
      } else {
        this.broadcast({
          type: 'warning',
          message: `⚠️ "${keyword}": 순위권 밖 (${maxRank}위 이내 미검출)`,
        });

        this.sendJSON(res, {
          success: true,
          result: null,
          message: `순위권 밖입니다 (${maxRank}위 이내 미검출)`,
          maxRank,
        });
      }

    } catch (error) {
      this.broadcast({
        type: 'error',
        message: `❌ 순위 조회 실패: ${error.message}`,
      });

      this.sendJSON(res, {
        success: false,
        error: error.message,
      }, 500);
    }
  }

  /**
   * 배치 키워드 순위 조회
   */
  async handleRankBatch(body, res) {
    const { keywords, placeId, concurrency = 2, maxPages } = body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      this.sendJSON(res, {
        success: false,
        error: '키워드 목록을 입력하세요.',
      }, 400);
      return;
    }

    if (!placeId) {
      this.sendJSON(res, {
        success: false,
        error: 'Place ID를 입력하세요.',
      }, 400);
      return;
    }

    // maxPages 검증 및 기본값 설정
    const searchDepth = maxPages || 20;  // 기본값: 20페이지 (300위)

    if (searchDepth < 1 || searchDepth > 40) {
      this.sendJSON(res, {
        success: false,
        error: 'maxPages는 1~40 사이여야 합니다.',
      }, 400);
      return;
    }

    const maxRank = searchDepth * 15;

    // 즉시 응답
    this.sendJSON(res, {
      success: true,
      message: `${keywords.length}개 키워드 순위 조회를 시작합니다 (최대 ${maxRank}위).`,
      keywords,
      placeId,
      maxRank,
    });

    // 백그라운드에서 처리
    this.processRankBatch(keywords, placeId, concurrency, searchDepth);
  }

  /**
   * 배치 순위 조회 백그라운드 처리
   */
  async processRankBatch(keywords, placeId, concurrency = 2, maxPages = 20) {
    const maxRank = maxPages * 15;

    this.broadcast({
      type: 'start',
      message: `🔍 ${keywords.length}개 키워드 순위 조회 시작 (최대 ${maxRank}위)`,
      total: keywords.length,
      maxRank,
    });

    try {
      // SearchRankCrawler 초기화 (필요시)
      if (!this.rankCrawler) {
        this.rankCrawler = new SearchRankCrawler({
          headless: true,
          maxPages: maxPages,
        });
        await this.rankCrawler.initialize();
      } else {
        // 기존 인스턴스가 있으면 maxPages 업데이트
        this.rankCrawler.config.maxPages = maxPages;
      }

      const results = await this.rankCrawler.findRankBatch(keywords, placeId, concurrency);

      // 결과 요약
      const successful = results.filter(r => r.success && r.rank).length;
      const notFound = results.filter(r => r.success && !r.rank).length;
      const failed = results.filter(r => !r.success).length;

      // 결과 저장 (JSON 파일)
      const timestamp = Date.now();
      const outputDir = path.join(__dirname, '../../data/output');
      await fs.mkdir(outputDir, { recursive: true });
      const filePath = path.join(outputDir, `batch-rank-${placeId}-${timestamp}.json`);
      await fs.writeFile(filePath, JSON.stringify({
        placeId,
        keywords,
        timestamp: new Date().toISOString(),
        results,
        summary: {
          total: keywords.length,
          found: successful,
          notFound,
          failed,
        }
      }, null, 2), 'utf-8');

      this.broadcast({
        type: 'complete',
        message: `🎉 순위 조회 완료: ${successful}개 검출, ${notFound}개 순위권 밖, ${failed}개 실패`,
        results,
        filePath,
      });

    } catch (error) {
      this.broadcast({
        type: 'error',
        message: `❌ 배치 순위 조회 실패: ${error.message}`,
      });
    }
  }

  /**
   * 키워드 추가 핸들러
   */
  async handleAddKeyword(body, res) {
    const { placeId, keywords } = body;

    if (!placeId || !keywords) {
      this.sendJSON(res, {
        success: false,
        error: 'Place ID와 키워드를 입력하세요.',
      }, 400);
      return;
    }

    // 키워드 배열로 변환 (쉼표 구분 문자열 또는 배열)
    const keywordList = Array.isArray(keywords)
      ? keywords
      : keywords.split(',').map(k => k.trim()).filter(k => k.length > 0);

    if (keywordList.length === 0) {
      this.sendJSON(res, {
        success: false,
        error: '유효한 키워드를 입력하세요.',
      }, 400);
      return;
    }

    try {
      // 매장 정보 조회 또는 생성
      let store = this.db.getStore(placeId);
      let storeId;

      if (!store) {
        // 매장이 없으면 생성
        storeId = this.db.addStore({
          placeId,
          name: `매장 ${placeId}`,
          status: 'active',
        });
      } else {
        storeId = store.id;
      }

      // 키워드들 추가
      const addedKeywords = [];
      for (const keyword of keywordList) {
        try {
          this.db.addTrackedKeyword(storeId, placeId, keyword);
          addedKeywords.push(keyword);
        } catch (error) {
          // 이미 존재하는 키워드는 무시
          console.log(`[RANK] Keyword already exists: ${keyword}`);
        }
      }

      this.sendJSON(res, {
        success: true,
        message: `${addedKeywords.length}개 키워드 추가 완료`,
        keywords: addedKeywords,
      });

    } catch (error) {
      this.sendJSON(res, {
        success: false,
        error: error.message,
      }, 500);
    }
  }

  /**
   * 모든 추적 키워드 순위 재조회
   */
  async handleCheckAllRanks(body, res) {
    const { placeId, maxPages = 20 } = body;

    if (!placeId) {
      this.sendJSON(res, {
        success: false,
        error: 'Place ID를 입력하세요.',
      }, 400);
      return;
    }

    try {
      // 추적 중인 키워드 조회
      const trackedKeywords = this.db.getTrackedKeywordsByPlaceId(placeId);

      if (trackedKeywords.length === 0) {
        this.sendJSON(res, {
          success: false,
          error: '추적 중인 키워드가 없습니다.',
        }, 404);
        return;
      }

      // 즉시 응답
      this.sendJSON(res, {
        success: true,
        message: `${trackedKeywords.length}개 키워드 순위 조회를 시작합니다.`,
        keywords: trackedKeywords.map(k => k.keyword),
      });

      // 백그라운드에서 처리
      this.processCheckAllRanks(placeId, trackedKeywords, maxPages);

    } catch (error) {
      this.sendJSON(res, {
        success: false,
        error: error.message,
      }, 500);
    }
  }

  /**
   * 모든 키워드 순위 조회 백그라운드 처리
   */
  async processCheckAllRanks(placeId, trackedKeywords, maxPages = 20) {
    const maxRank = maxPages * 15;

    this.broadcast({
      type: 'start',
      message: `🔄 ${trackedKeywords.length}개 추적 키워드 순위 재조회 시작 (최대 ${maxRank}위)`,
      total: trackedKeywords.length,
    });

    try {
      // SearchRankCrawler 초기화
      if (!this.rankCrawler) {
        this.rankCrawler = new SearchRankCrawler({
          headless: true,
          maxPages: maxPages,
        });
        await this.rankCrawler.initialize();
      } else {
        this.rankCrawler.config.maxPages = maxPages;
      }

      const keywords = trackedKeywords.map(k => k.keyword);
      let successCount = 0;
      let failCount = 0;

      // 각 키워드 순위 조회
      for (let i = 0; i < keywords.length; i++) {
        const keyword = keywords[i];
        const keywordData = trackedKeywords[i];

        this.broadcast({
          type: 'progress',
          message: `⏳ (${i + 1}/${keywords.length}) "${keyword}" 순위 조회 중...`,
          current: i + 1,
          total: keywords.length,
        });

        try {
          const result = await this.rankCrawler.findRank(keyword, placeId);

          if (result.success) {
            // 데이터베이스에 순위 이력 저장
            this.db.addRankHistory({
              keywordId: keywordData.id,
              storeId: keywordData.store_id,
              placeId: placeId,
              keyword: keyword,
              rank: result.rank,
              page: result.page,
              positionInPage: result.positionInPage,
              placeName: result.placeName,
              category: result.category,
              rating: result.rating,
              reviewCount: result.reviewCount,
              maxPages: maxPages,
              maxRank: maxRank,
            });

            const rankText = result.rank ? `${result.rank}위` : '순위권 밖';
            this.broadcast({
              type: 'info',
              message: `✅ "${keyword}": ${rankText}`,
            });
            successCount++;
          } else {
            this.broadcast({
              type: 'warning',
              message: `⚠️ "${keyword}": 조회 실패`,
            });
            failCount++;
          }

          // Rate limiting: 요청 간 2초 대기
          if (i < keywords.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

        } catch (error) {
          this.broadcast({
            type: 'error',
            message: `❌ "${keyword}": ${error.message}`,
          });
          failCount++;
        }
      }

      this.broadcast({
        type: 'complete',
        message: `🎉 순위 재조회 완료: 성공 ${successCount}개, 실패 ${failCount}개`,
      });

    } catch (error) {
      this.broadcast({
        type: 'error',
        message: `❌ 순위 재조회 실패: ${error.message}`,
      });
    }
  }

  /**
   * Request body 읽기
   */
  async readBody(req) {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(new Error('Invalid JSON'));
        }
      });
      req.on('error', reject);
    });
  }

  /**
   * 서버 종료
   */
  async close() {
    if (this.rankCrawler) {
      await this.rankCrawler.close();
    }
    if (this.db) {
      this.db.close();
    }
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

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    server.close();
    process.exit(0);
  });
}

export { GUIServer };
