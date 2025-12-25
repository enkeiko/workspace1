/**
 * 키워드 조합기 - Tier 기반 키워드 조합 생성
 *
 * 5분류 체계: CORE, LOCATION, MENU, ATTRIBUTE, SENTIMENT
 * 조합 우선순위: T1 > T2 > T3
 */

export class KeywordCombinator {
  constructor(options = {}) {
    this.minLength = options.minLength || 6;
    this.maxLength = options.maxLength || 15;
    this.maxResults = options.maxResults || 500;
  }

  /**
   * 키워드셋으로부터 조합 생성
   * @param {Object} keywordSet - { CORE, LOCATION, MENU, ATTRIBUTE, SENTIMENT }
   * @returns {Array} - Tier별 정렬된 키워드 조합
   */
  generate(keywordSet) {
    const { CORE = [], LOCATION = [], MENU = [], ATTRIBUTE = [], SENTIMENT = [] } = keywordSet;

    const results = [];

    // T1: LOCATION + CORE (필수)
    this._combine(LOCATION, CORE, 'T1', results);

    // T2: LOCATION + ATTRIBUTE + CORE
    for (const loc of LOCATION) {
      for (const attr of ATTRIBUTE) {
        for (const core of CORE) {
          this._addIfValid(`${loc} ${attr} ${core}`, 'T2', results);
        }
      }
    }

    // T2: LOCATION + MENU
    this._combine(LOCATION, MENU, 'T2', results);

    // T3: LOCATION + SENTIMENT + CORE
    for (const loc of LOCATION) {
      for (const sent of SENTIMENT) {
        for (const core of CORE) {
          this._addIfValid(`${loc} ${sent} ${core}`, 'T3', results);
        }
      }
    }

    // T3: ATTRIBUTE + CORE (위치 없음)
    this._combine(ATTRIBUTE, CORE, 'T3', results);

    // 중복 제거 및 정렬
    return this._dedupAndSort(results);
  }

  /**
   * 두 배열 조합
   * @private
   */
  _combine(arr1, arr2, tier, results) {
    for (const a of arr1) {
      for (const b of arr2) {
        this._addIfValid(`${a} ${b}`, tier, results);
      }
    }
  }

  /**
   * 유효성 검사 후 추가
   * @private
   */
  _addIfValid(keyword, tier, results) {
    const trimmed = keyword.trim().replace(/\s+/g, ' ');
    const len = trimmed.replace(/\s/g, '').length;

    if (len >= this.minLength && len <= this.maxLength) {
      results.push({ keyword: trimmed, tier });
    }
  }

  /**
   * 중복 제거 및 Tier 정렬
   * @private
   */
  _dedupAndSort(results) {
    const seen = new Map();

    for (const item of results) {
      const key = item.keyword.toLowerCase();
      // 더 높은 Tier 우선 유지
      if (!seen.has(key) || this._tierPriority(item.tier) < this._tierPriority(seen.get(key).tier)) {
        seen.set(key, item);
      }
    }

    return Array.from(seen.values())
      .sort((a, b) => this._tierPriority(a.tier) - this._tierPriority(b.tier))
      .slice(0, this.maxResults);
  }

  _tierPriority(tier) {
    return { T1: 1, T2: 2, T3: 3 }[tier] || 99;
  }
}
