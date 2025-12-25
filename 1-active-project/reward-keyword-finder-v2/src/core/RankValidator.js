/**
 * 순위 검증기 - 병렬 처리 기반 빠른 순위 검증
 *
 * p-queue로 동시성 제어, 캐싱으로 중복 검증 방지
 */
import PQueue from 'p-queue';
import got from 'got';
import * as cheerio from 'cheerio';
import { CacheManager } from './CacheManager.js';

export class RankValidator {
  constructor(options = {}) {
    this.concurrency = options.concurrency || 10;
    this.maxRank = options.maxRank || 5;  // 5위 이내만
    this.maxPages = options.maxPages || 2;  // 최대 2페이지 (30위)
    this.resultsPerPage = 15;

    this.queue = new PQueue({
      concurrency: this.concurrency,
      interval: 1000,
      intervalCap: 20  // 초당 최대 20요청
    });

    this.cache = new CacheManager({ ttl: 3600 });
    this.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/537.36';

    // 이벤트 핸들러
    this.onResult = null;
    this.onProgress = null;
  }

  /**
   * 배치 검증 - 여러 키워드 병렬 처리
   */
  async validateBatch(keywords, placeId, options = {}) {
    const { earlyStopCount = 0 } = options;
    const results = [];
    const winners = [];
    let processed = 0;
    const total = keywords.length;

    for (const item of keywords) {
      const keyword = typeof item === 'string' ? item : item.keyword;
      const tier = typeof item === 'string' ? 'T1' : item.tier;

      this.queue.add(async () => {
        // 조기 종료 체크
        if (earlyStopCount > 0 && winners.length >= earlyStopCount) {
          return;
        }

        // 캐시 확인
        const cached = this.cache.get(keyword, placeId);
        if (cached) {
          processed++;
          if (cached.rank && cached.rank <= this.maxRank) {
            winners.push({ keyword, tier, ...cached, fromCache: true });
          }
          this._emitProgress(processed, total);
          return;
        }

        // 실제 검증
        const result = await this._validateSingle(keyword, placeId);
        processed++;

        this.cache.set(keyword, placeId, result);
        results.push({ keyword, tier, ...result });

        if (result.rank && result.rank <= this.maxRank) {
          winners.push({ keyword, tier, ...result });
        }

        this._emitProgress(processed, total);
        this._emitResult({ keyword, tier, ...result });
      });
    }

    await this.queue.onIdle();

    return {
      total: keywords.length,
      processed,
      winners: winners.sort((a, b) => (a.rank || 999) - (b.rank || 999)),
      all: results
    };
  }

  /**
   * 단일 키워드 검증
   * @private
   */
  async _validateSingle(keyword, placeId) {
    try {
      for (let page = 1; page <= this.maxPages; page++) {
        const start = (page - 1) * this.resultsPerPage + 1;
        const url = `https://m.place.naver.com/restaurant/list?query=${encodeURIComponent(keyword)}&start=${start}`;

        const response = await got(url, {
          headers: {
            'User-Agent': this.userAgent,
            'Accept-Language': 'ko-KR,ko;q=0.9'
          },
          timeout: { request: 10000 }
        });

        // Apollo State 추출
        const $ = cheerio.load(response.body);
        const scriptContent = $('script').filter((i, el) => {
          return $(el).html()?.includes('__APOLLO_STATE__');
        }).html();

        if (!scriptContent) continue;

        const match = scriptContent.match(/window\.__APOLLO_STATE__\s*=\s*({.+?});/s);
        if (!match) continue;

        const apolloState = JSON.parse(match[1]);
        const rank = this._findRankInState(apolloState, placeId, page);

        if (rank) {
          return { rank, page, foundAt: new Date().toISOString() };
        }
      }

      return { rank: null, notFound: true };
    } catch (error) {
      return { rank: null, error: error.message };
    }
  }

  /**
   * Apollo State에서 순위 찾기
   * @private
   */
  _findRankInState(apolloState, placeId, page) {
    const rootQuery = apolloState.ROOT_QUERY;
    if (!rootQuery) return null;

    const listKey = Object.keys(rootQuery).find(k => k.startsWith('restaurantList('));
    if (!listKey) return null;

    const items = rootQuery[listKey]?.items || [];

    for (let i = 0; i < items.length; i++) {
      const ref = items[i]?.__ref;
      if (!ref) continue;

      const place = apolloState[ref];
      if (place?.id === placeId) {
        return (page - 1) * this.resultsPerPage + i + 1;
      }
    }

    return null;
  }

  _emitProgress(current, total) {
    if (this.onProgress) {
      this.onProgress({ current, total, percent: Math.round((current / total) * 100) });
    }
  }

  _emitResult(result) {
    if (this.onResult) {
      this.onResult(result);
    }
  }

  clearCache() {
    this.cache.clear();
  }
}
