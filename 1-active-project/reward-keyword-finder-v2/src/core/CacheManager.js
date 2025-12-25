/**
 * 캐시 관리자 - 순위 검증 결과 캐싱
 */
import NodeCache from 'node-cache';

export class CacheManager {
  constructor(options = {}) {
    this.cache = new NodeCache({
      stdTTL: options.ttl || 3600,      // 기본 1시간
      checkperiod: options.check || 600  // 10분마다 정리
    });
  }

  getKey(keyword, placeId) {
    return `${keyword}:${placeId}`;
  }

  get(keyword, placeId) {
    return this.cache.get(this.getKey(keyword, placeId));
  }

  set(keyword, placeId, data) {
    this.cache.set(this.getKey(keyword, placeId), {
      ...data,
      cachedAt: Date.now()
    });
  }

  has(keyword, placeId) {
    return this.cache.has(this.getKey(keyword, placeId));
  }

  clear() {
    this.cache.flushAll();
  }

  stats() {
    return this.cache.getStats();
  }
}
