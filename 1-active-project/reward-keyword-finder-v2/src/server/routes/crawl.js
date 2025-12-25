/**
 * 크롤링 API 라우트 - 간단한 기초 데이터 크롤링
 */
import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import got from 'got';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// place-keywords-maker-v2 경로 (데이터 저장용)
const PKM_PATH = path.resolve(__dirname, '../../../../place-keywords-maker-v2');
const OUTPUT_PATH = path.join(PKM_PATH, 'data', 'output', 'l1');

console.log(`[crawl] PKM_PATH: ${PKM_PATH}`);
console.log(`[crawl] OUTPUT_PATH: ${OUTPUT_PATH}`);
console.log(`[crawl] OUTPUT_PATH exists: ${fs.existsSync(OUTPUT_PATH)}`);

/**
 * 간단한 기초 데이터 크롤링 (Puppeteer 없이)
 */
async function crawlBasicData(placeId, sendEvent) {
  const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/537.36';

  try {
    // 1. 모바일 플레이스 페이지 접근
    const url = `https://m.place.naver.com/restaurant/${placeId}/home`;
    sendEvent('status', { message: `페이지 접근 중: ${url}` });

    const response = await got(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept-Language': 'ko-KR,ko;q=0.9'
      },
      timeout: { request: 15000 }
    });

    sendEvent('status', { message: '페이지 로드 완료, 데이터 파싱 중...' });

    // 2. Apollo State 추출
    const $ = cheerio.load(response.body);
    const scriptContent = $('script').filter((i, el) => {
      return $(el).html()?.includes('__APOLLO_STATE__');
    }).html();

    if (!scriptContent) {
      throw new Error('Apollo State를 찾을 수 없습니다');
    }

    // 중괄호 매칭으로 JSON 추출 (정규식보다 정확함)
    const startIdx = scriptContent.indexOf('window.__APOLLO_STATE__');
    if (startIdx === -1) {
      throw new Error('Apollo State 시작점을 찾을 수 없습니다');
    }

    const jsonStart = scriptContent.indexOf('{', startIdx);
    if (jsonStart === -1) {
      throw new Error('Apollo State JSON 시작점을 찾을 수 없습니다');
    }

    // 중괄호 depth 추적으로 JSON 끝 찾기
    let depth = 0;
    let jsonEnd = -1;
    for (let i = jsonStart; i < scriptContent.length; i++) {
      if (scriptContent[i] === '{') depth++;
      if (scriptContent[i] === '}') depth--;
      if (depth === 0) {
        jsonEnd = i;
        break;
      }
    }

    if (jsonEnd === -1) {
      throw new Error('Apollo State JSON 끝을 찾을 수 없습니다');
    }

    const jsonStr = scriptContent.substring(jsonStart, jsonEnd + 1);
    console.log('[crawl] JSON extracted, length:', jsonStr.length);

    const apolloState = JSON.parse(jsonStr);
    sendEvent('status', { message: 'Apollo State 추출 완료' });

    // 3. Place 데이터 찾기
    const allKeys = Object.keys(apolloState);
    console.log('[crawl] Total keys:', allKeys.length);
    console.log('[crawl] Keys with Base:', allKeys.filter(k => k.includes('Base')));

    // placeId로 직접 키 찾기 (가장 확실한 방법)
    let placeKey = allKeys.find(k => k.includes(placeId) && k.includes('Base'));

    // 없으면 일반적인 Base 키 찾기
    if (!placeKey) {
      placeKey = allKeys.find(k =>
        k.startsWith('PlaceDetailBase:') ||
        k.startsWith('RestaurantBase:') ||
        k.startsWith('RestaurantDetailBase:') ||
        k.startsWith('PlaceBase:') ||
        k.startsWith('CafeDetailBase:')
      );
    }

    console.log('[crawl] Found placeKey:', placeKey);

    if (!placeKey) {
      throw new Error(`Place 데이터를 찾을 수 없습니다. Keys: ${allKeys.slice(0, 10).join(', ')}`);
    }

    const placeData = apolloState[placeKey];
    console.log('[crawl] placeData:', JSON.stringify(placeData).slice(0, 500));
    sendEvent('status', { message: `매장 발견: ${placeData.name}` });

    // 4. 기초 데이터 구성
    const result = {
      placeId,
      crawledAt: new Date().toISOString(),
      basic: {
        name: placeData.name || '',
        category: placeData.category || '',
        address: {
          road: placeData.roadAddress || placeData.road || placeData.address || '',
          jibun: placeData.address || placeData.jibunAddress || ''
        },
        phone: placeData.phone || placeData.tel || '',
        seoKeywords: extractSeoKeywords(apolloState, placeId),
        conveniences: placeData.conveniences || [],
        categoryCodeList: placeData.categoryCodeList || []
      },
      menus: extractMenus(apolloState),
      facilities: placeData.conveniences || extractFacilities(apolloState),
      votedKeywords: extractVotedKeywords(apolloState),
      representativeKeywords: extractRepresentativeKeywords(placeData),
      microReviews: placeData.microReviews || []
    };

    sendEvent('status', { message: '데이터 구성 완료' });

    return result;

  } catch (error) {
    console.error('[crawl] crawlBasicData error:', error);
    throw error;
  }
}

// SEO 키워드 추출
function extractSeoKeywords(apolloState, placeId) {
  const keywords = [];

  Object.keys(apolloState).forEach(key => {
    const data = apolloState[key];
    if (data?.seoKeywords && Array.isArray(data.seoKeywords)) {
      keywords.push(...data.seoKeywords);
    }
    if (data?.keywords && Array.isArray(data.keywords)) {
      keywords.push(...data.keywords);
    }
  });

  return [...new Set(keywords)];
}

// 메뉴 추출
function extractMenus(apolloState) {
  const menus = [];

  Object.keys(apolloState).forEach(key => {
    if (key.startsWith('Menu:') || key.includes('menu')) {
      const data = apolloState[key];
      if (data?.name) {
        menus.push({
          name: data.name,
          price: data.price || null
        });
      }
    }
  });

  return menus.slice(0, 30);
}

// 시설 정보 추출
function extractFacilities(apolloState) {
  const facilities = [];

  Object.keys(apolloState).forEach(key => {
    const data = apolloState[key];
    if (data?.facilityInfo && Array.isArray(data.facilityInfo)) {
      data.facilityInfo.forEach(f => {
        if (f.name) facilities.push(f.name);
      });
    }
    if (data?.convenience && Array.isArray(data.convenience)) {
      facilities.push(...data.convenience);
    }
  });

  return [...new Set(facilities)];
}

// 투표 키워드 추출
function extractVotedKeywords(apolloState) {
  const keywords = [];

  Object.keys(apolloState).forEach(key => {
    const data = apolloState[key];
    if (data?.keywords && Array.isArray(data.keywords)) {
      data.keywords.forEach(k => {
        if (typeof k === 'object' && k.keyword) {
          keywords.push({ keyword: k.keyword, count: k.count || 0 });
        } else if (typeof k === 'string') {
          keywords.push({ keyword: k, count: 0 });
        }
      });
    }
  });

  return keywords;
}

// 대표 키워드 추출
function extractRepresentativeKeywords(placeData) {
  const keywords = [];

  if (placeData.category) {
    keywords.push(placeData.category);
  }
  if (placeData.categories && Array.isArray(placeData.categories)) {
    keywords.push(...placeData.categories);
  }

  return [...new Set(keywords)];
}

/**
 * POST /api/crawl/:placeId
 * 새로운 Place ID 크롤링
 */
router.post('/:placeId', async (req, res) => {
  const { placeId } = req.params;
  console.log(`[crawl] POST /:placeId - placeId: ${placeId}`);

  // SSE 스트리밍 응답
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (type, data) => {
    const eventData = JSON.stringify({ type, ...data });
    console.log(`[crawl] SSE event: ${eventData}`);
    res.write(`data: ${eventData}\n\n`);
  };

  try {
    sendEvent('status', { message: '크롤링 시작...' });

    // 간단한 크롤링 실행
    const result = await crawlBasicData(placeId, sendEvent);

    if (!result) {
      sendEvent('error', { message: '크롤링 결과 없음' });
      res.end();
      return;
    }

    // 결과 저장
    const outputFile = path.join(OUTPUT_PATH, `${placeId}.json`);
    console.log(`[crawl] Saving to: ${outputFile}`);

    // 디렉토리 확인
    if (!fs.existsSync(OUTPUT_PATH)) {
      console.log(`[crawl] Creating directory: ${OUTPUT_PATH}`);
      fs.mkdirSync(OUTPUT_PATH, { recursive: true });
    }

    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`[crawl] Saved successfully`);

    sendEvent('complete', {
      message: '크롤링 완료!',
      placeId,
      name: result.basic?.name || '',
      category: result.basic?.category || '',
      savedTo: outputFile
    });

    res.end();
  } catch (error) {
    console.error('[crawl] Error:', error);
    sendEvent('error', { message: error.message, stack: error.stack });
    res.end();
  }
});

/**
 * GET /api/crawl/status
 * 크롤러 상태 확인
 */
router.get('/status', async (req, res) => {
  res.json({
    pkmPath: PKM_PATH,
    outputPath: OUTPUT_PATH,
    pkmExists: fs.existsSync(PKM_PATH),
    outputExists: fs.existsSync(OUTPUT_PATH)
  });
});

export default router;
