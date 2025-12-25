const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const Logger = require('./logger');
const L1Processor = require('./l1-processor');

/**
 * 🖥️ GUI용 백엔드 서버
 *
 * 웹 인터페이스와 Playwright를 연결합니다.
 */

const PORT = 3000;
let browser = null;
let context = null;
let page = null;

// 로거 초기화
const logger = new Logger({
  logLevel: 'debug',
  logFile: './logs/gui-server.log',
  maxLogs: 5000
});

// SSE 연결 관리
const sseConnections = [];

// 브라우저 초기화
async function initBrowser() {
  if (browser) return;

  console.log('🚀 브라우저 초기화 중...');

  browser = await chromium.launch({
    headless: false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox'
    ]
  });

  context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul'
  });

  page = await context.newPage();

  // 봇 탐지 우회
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
    window.chrome = { runtime: {} };
  });

  // 네이버 메인 방문
  console.log('📝 네이버 접속 중...');
  await page.goto('https://www.naver.com', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  console.log('✅ 브라우저 초기화 완료\n');
}

// HTML 가져오기
async function fetchPlace(placeId) {
  const url = `https://m.place.naver.com/restaurant/${placeId}/home`;

  try {
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    await page.waitForTimeout(3000);

    const html = await page.content();

    // 차단 확인
    if (html.includes('서비스 이용이 제한되었습니다')) {
      throw new Error('봇 탐지됨. 브라우저에서 새로고침해주세요.');
    }

    return html;

  } catch (error) {
    throw new Error(`페이지 로드 실패: ${error.message}`);
  }
}

// HTML 파싱
function parseHTML(html, placeId) {
  const match = html.match(/window\.__APOLLO_STATE__\s*=\s*({.+?});/s);

  if (!match) {
    throw new Error('APOLLO_STATE를 찾을 수 없습니다.');
  }

  try {
    const apolloState = JSON.parse(match[1]);
    const placeKey = `PlaceDetailBase:${placeId}`;
    const placeDetail = apolloState[placeKey];

    if (!placeDetail) {
      throw new Error('플레이스 정보를 찾을 수 없습니다.');
    }

    // 메뉴 수집
    const menus = [];
    Object.keys(apolloState).forEach(key => {
      if (key.startsWith(`Menu:${placeId}_`)) {
        const menu = apolloState[key];
        menus.push({
          name: menu.name,
          price: menu.price ? `${Number(menu.price).toLocaleString()}원` : null,
          description: menu.description || null,
          recommend: menu.recommend || false
        });
      }
    });

    return {
      id: placeDetail.id,
      name: placeDetail.name,
      category: placeDetail.category,
      roadAddress: placeDetail.roadAddress,
      address: placeDetail.address,
      phone: placeDetail.phone || '정보 없음',
      rating: placeDetail.visitorReviewsScore || 0,
      reviewCount: placeDetail.visitorReviewsTotal || 0,
      conveniences: placeDetail.conveniences || [],
      paymentInfo: placeDetail.paymentInfo || [],
      microReviews: placeDetail.microReviews || [],
      menus: menus,
      parkingInfo: placeDetail.road || null,
      url: `https://map.naver.com/p/entry/place/${placeId}`,
      collectedAt: new Date().toISOString()
    };

  } catch (error) {
    throw new Error(`파싱 실패: ${error.message}`);
  }
}

// 플레이스 수집
async function scrapePlaceById(placeId) {
  console.log(`\n📍 플레이스 수집: ${placeId}`);

  // 브라우저 초기화 (처음 한 번만)
  await initBrowser();

  const html = await fetchPlace(placeId);
  const data = parseHTML(html, placeId);

  // 파일 저장
  const outputDir = './places';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = path.join(outputDir, `place-${placeId}.json`);
  fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf-8');

  console.log(`✅ 수집 완료: ${data.name}`);
  console.log(`💾 저장: ${filename}\n`);

  return { data, filename };
}

// 로그 리스너 추가 (SSE로 실시간 전송)
logger.addListener((log) => {
  const data = JSON.stringify(log);
  sseConnections.forEach(res => {
    try {
      res.write(`data: ${data}\n\n`);
    } catch (error) {
      // 연결이 끊긴 경우 무시
    }
  });
});

// HTTP 서버
const server = http.createServer(async (req, res) => {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 라우팅
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // GUI HTML 제공
  if (url.pathname === '/') {
    const html = fs.readFileSync('./gui-app.html', 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // 플레이스 수집 API
  if (url.pathname.startsWith('/scrape/')) {
    const placeId = url.pathname.split('/')[2];

    if (!placeId || !/^\d+$/.test(placeId)) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: false,
        error: '유효하지 않은 플레이스 ID입니다.'
      }));
      return;
    }

    try {
      const result = await scrapePlaceById(placeId);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        ...result
      }));

    } catch (error) {
      logger.error(`플레이스 수집 오류: ${error.message}`);

      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: false,
        error: error.message
      }));
    }

    return;
  }

  // L1 데이터 수집 API
  if (url.pathname === '/l1/process') {
    try {
      logger.info('L1 프로세스 시작 요청 받음');

      const processor = new L1Processor(logger, {
        inputDir: './places-advanced',
        outputDir: './data/output/l1'
      });

      const result = await processor.process();

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(result));

    } catch (error) {
      logger.error(`L1 처리 오류: ${error.message}`);

      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: false,
        error: error.message
      }));
    }

    return;
  }

  // 로그 스트리밍 API (SSE)
  if (url.pathname === '/logs/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // 연결 추가
    sseConnections.push(res);
    logger.info(`로그 스트리밍 연결 추가 (총 ${sseConnections.length}개)`);

    // 기존 로그 전송
    const existingLogs = logger.getAllLogs();
    existingLogs.forEach(log => {
      res.write(`data: ${JSON.stringify(log)}\n\n`);
    });

    // 연결 종료 처리
    req.on('close', () => {
      const index = sseConnections.indexOf(res);
      if (index !== -1) {
        sseConnections.splice(index, 1);
        logger.info(`로그 스트리밍 연결 종료 (총 ${sseConnections.length}개)`);
      }
    });

    return;
  }

  // 로그 조회 API
  if (url.pathname === '/logs/all') {
    const logs = logger.getAllLogs();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ logs }));
    return;
  }

  // 로그 지우기 API
  if (url.pathname === '/logs/clear' && req.method === 'POST') {
    logger.clear();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // L1 결과 조회 API
  if (url.pathname === '/l1/results') {
    try {
      const resultsDir = './data/output/l1';
      const mainFile = path.join(resultsDir, 'data_collected_l1.json');

      if (fs.existsSync(mainFile)) {
        const content = fs.readFileSync(mainFile, 'utf-8');
        const data = JSON.parse(content);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          data
        }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: false,
          error: 'L1 결과 파일이 없습니다.'
        }));
      }
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: false,
        error: error.message
      }));
    }

    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('404 Not Found');
});

// 서버 시작
server.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🖥️  네이버 플레이스 수집기 GUI 서버');
  console.log('='.repeat(60));
  console.log(`\n🌐 서버 주소: http://localhost:${PORT}`);
  console.log('\n💡 사용 방법:');
  console.log('   1. 브라우저에서 위 주소를 열어주세요');
  console.log('   2. 플레이스 ID를 입력하세요');
  console.log('   3. 수집 버튼을 클릭하세요');
  console.log('\n⚠️  서버를 종료하려면 Ctrl+C를 누르세요\n');
});

// 종료 처리
process.on('SIGINT', async () => {
  console.log('\n\n🔚 서버 종료 중...');

  if (browser) {
    await browser.close();
    console.log('✅ 브라우저 종료');
  }

  process.exit(0);
});
