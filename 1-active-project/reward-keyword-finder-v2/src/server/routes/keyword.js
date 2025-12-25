/**
 * 키워드 관련 API 라우트
 */
import { Router } from 'express';
import { KeywordCombinator } from '../../core/KeywordCombinator.js';
import { PlaceKeywordsAdapter } from '../../adapters/PlaceKeywordsAdapter.js';

const router = Router();
const combinator = new KeywordCombinator();
const adapter = new PlaceKeywordsAdapter();

/**
 * GET /api/keyword/:placeId
 * Place ID로 키워드셋 조회
 */
router.get('/:placeId', async (req, res) => {
  try {
    const { placeId } = req.params;
    console.log(`[keyword] GET /:placeId - placeId: ${placeId}`);

    const keywordSet = await adapter.getKeywordSet(placeId);
    console.log(`[keyword] getKeywordSet result:`, keywordSet ? 'found' : 'null');

    if (!keywordSet) {
      console.log(`[keyword] Place not found: ${placeId}`);
      const availableIds = adapter.getAvailablePlaceIds();
      return res.status(404).json({
        error: 'Place not found',
        placeId,
        message: '해당 Place ID의 크롤링 데이터가 없습니다. place-keywords-maker-v2에서 먼저 크롤링하거나, 아래 ID를 사용하세요.',
        availablePlaceIds: availableIds.slice(0, 10)
      });
    }

    console.log(`[keyword] Returning keywordSet for ${placeId}`);
    res.json(keywordSet);
  } catch (error) {
    console.error(`[keyword] Error:`, error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

/**
 * POST /api/keyword/combine
 * 키워드 조합 생성
 */
router.post('/combine', async (req, res) => {
  try {
    const { placeId, keywordSet, options } = req.body;

    let set = keywordSet;

    // placeId만 제공된 경우 자동 조회
    if (placeId && !keywordSet) {
      set = await adapter.getKeywordSet(placeId);
      if (!set) {
        return res.status(404).json({ error: 'Place not found' });
      }
    }

    // 키워드셋을 텍스트 배열로 변환
    const normalized = {
      CORE: (set.CORE || []).map(k => k.text || k),
      LOCATION: (set.LOCATION || []).map(k => k.text || k),
      MENU: (set.MENU || []).map(k => k.text || k),
      ATTRIBUTE: (set.ATTRIBUTE || []).map(k => k.text || k),
      SENTIMENT: (set.SENTIMENT || []).map(k => k.text || k)
    };

    const comb = new KeywordCombinator(options || {});
    const combinations = comb.generate(normalized);

    res.json({
      placeId: placeId || set.placeId,
      total: combinations.length,
      byTier: {
        T1: combinations.filter(c => c.tier === 'T1').length,
        T2: combinations.filter(c => c.tier === 'T2').length,
        T3: combinations.filter(c => c.tier === 'T3').length
      },
      keywords: combinations
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/keyword/custom
 * 사용자 정의 키워드 추가
 */
router.post('/custom', async (req, res) => {
  try {
    const { placeId, category, keywords } = req.body;

    // 기존 키워드셋 로드
    let keywordSet = await adapter.getKeywordSet(placeId);
    if (!keywordSet) {
      keywordSet = { placeId, CORE: [], LOCATION: [], MENU: [], ATTRIBUTE: [], SENTIMENT: [] };
    }

    // 카테고리에 키워드 추가
    const validCategories = ['CORE', 'LOCATION', 'MENU', 'ATTRIBUTE', 'SENTIMENT'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const newKeywords = keywords.map(k => ({ text: k, source: 'custom' }));
    keywordSet[category] = [...keywordSet[category], ...newKeywords];

    res.json(keywordSet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/keyword/available
 * 사용 가능한 Place ID 목록
 */
router.get('/', async (req, res) => {
  try {
    const ids = adapter.getAvailablePlaceIds();
    res.json({ total: ids.length, placeIds: ids });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
