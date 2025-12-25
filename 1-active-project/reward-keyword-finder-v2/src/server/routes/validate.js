/**
 * 순위 검증 API 라우트
 */
import { Router } from 'express';
import { RankValidator } from '../../core/RankValidator.js';
import { KeywordCombinator } from '../../core/KeywordCombinator.js';
import { PlaceKeywordsAdapter } from '../../adapters/PlaceKeywordsAdapter.js';

const router = Router();

// 전역 Validator 인스턴스 (동시성 제어)
const validator = new RankValidator({ concurrency: 10 });

/**
 * POST /api/validate
 * 키워드 순위 검증
 */
router.post('/', async (req, res) => {
  try {
    const { placeId, keywords, options = {} } = req.body;

    if (!placeId) {
      return res.status(400).json({ error: 'placeId is required' });
    }

    if (!keywords || keywords.length === 0) {
      return res.status(400).json({ error: 'keywords array is required' });
    }

    const result = await validator.validateBatch(keywords, placeId, options);

    res.json({
      placeId,
      ...result,
      cacheStats: validator.cache.stats()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/validate/auto
 * 자동 키워드 수집 + 조합 + 검증 (원스톱)
 */
router.post('/auto', async (req, res) => {
  try {
    const { placeId, maxKeywords = 200, earlyStopCount = 30 } = req.body;

    if (!placeId) {
      return res.status(400).json({ error: 'placeId is required' });
    }

    // 1. 키워드셋 조회
    const adapter = new PlaceKeywordsAdapter();
    const keywordSet = await adapter.getKeywordSet(placeId);

    if (!keywordSet) {
      return res.status(404).json({ error: 'Place not found in database' });
    }

    // 2. 조합 생성
    const combinator = new KeywordCombinator({ maxResults: maxKeywords });
    const normalized = {
      CORE: (keywordSet.CORE || []).map(k => k.text || k),
      LOCATION: (keywordSet.LOCATION || []).map(k => k.text || k),
      MENU: (keywordSet.MENU || []).map(k => k.text || k),
      ATTRIBUTE: (keywordSet.ATTRIBUTE || []).map(k => k.text || k),
      SENTIMENT: (keywordSet.SENTIMENT || []).map(k => k.text || k)
    };

    const combinations = combinator.generate(normalized);

    // 3. 순위 검증
    const result = await validator.validateBatch(combinations, placeId, { earlyStopCount });

    res.json({
      placeId,
      name: keywordSet.name,
      keywordSetSummary: {
        CORE: keywordSet.CORE.length,
        LOCATION: keywordSet.LOCATION.length,
        MENU: keywordSet.MENU.length,
        ATTRIBUTE: keywordSet.ATTRIBUTE.length,
        SENTIMENT: keywordSet.SENTIMENT.length
      },
      combinationsGenerated: combinations.length,
      ...result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/validate/stream/:placeId
 * SSE 스트리밍 검증 (실시간 결과)
 */
router.get('/stream/:placeId', async (req, res) => {
  const { placeId } = req.params;
  const { keywords: keywordsParam } = req.query;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    let keywords;

    if (keywordsParam) {
      keywords = JSON.parse(keywordsParam);
    } else {
      // 자동 생성
      const adapter = new PlaceKeywordsAdapter();
      const keywordSet = await adapter.getKeywordSet(placeId);

      if (!keywordSet) {
        res.write(`data: ${JSON.stringify({ error: 'Place not found' })}\n\n`);
        res.end();
        return;
      }

      const combinator = new KeywordCombinator({ maxResults: 100 });
      const normalized = {
        CORE: (keywordSet.CORE || []).map(k => k.text || k),
        LOCATION: (keywordSet.LOCATION || []).map(k => k.text || k),
        MENU: (keywordSet.MENU || []).map(k => k.text || k),
        ATTRIBUTE: (keywordSet.ATTRIBUTE || []).map(k => k.text || k),
        SENTIMENT: (keywordSet.SENTIMENT || []).map(k => k.text || k)
      };
      keywords = combinator.generate(normalized);
    }

    res.write(`data: ${JSON.stringify({ type: 'start', total: keywords.length })}\n\n`);

    // 스트리밍용 Validator
    const streamValidator = new RankValidator({ concurrency: 5 });

    streamValidator.onProgress = (progress) => {
      res.write(`data: ${JSON.stringify({ type: 'progress', ...progress })}\n\n`);
    };

    streamValidator.onResult = (result) => {
      if (result.rank && result.rank <= 5) {
        res.write(`data: ${JSON.stringify({ type: 'winner', ...result })}\n\n`);
      }
    };

    const result = await streamValidator.validateBatch(keywords, placeId);

    res.write(`data: ${JSON.stringify({ type: 'complete', ...result })}\n\n`);
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
});

/**
 * DELETE /api/validate/cache
 * 캐시 초기화
 */
router.delete('/cache', (req, res) => {
  validator.clearCache();
  res.json({ success: true, message: 'Cache cleared' });
});

export default router;
