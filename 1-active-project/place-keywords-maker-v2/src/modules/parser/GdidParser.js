/**
 * GdidParser - 글로벌 문서 ID (gdid) 파싱
 * v0.4: N1/N2/N3 타입별 파싱 지원
 */

import { logger } from '../../utils/logger.js';

export class GdidParser {
  constructor() {
    // N2 타입 매핑 캐시 (필요시 외부 소스에서 로드)
    this.n2MappingCache = new Map();
  }

  /**
   * gdid 파싱
   * @param {string} gdid - 글로벌 문서 ID (예: "N1:12345678")
   * @returns {Object} 파싱 결과
   */
  parse(gdid) {
    if (!gdid || typeof gdid !== 'string') {
      return {
        type: null,
        rawId: null,
        placeId: null,
        isValid: false,
      };
    }

    const parts = gdid.split(':');
    if (parts.length !== 2) {
      logger.warn(`Invalid gdid format: ${gdid}`);
      return {
        type: null,
        rawId: gdid,
        placeId: null,
        isValid: false,
      };
    }

    const [type, id] = parts;
    const placeId = this._resolvePlaceId(type, id);

    return {
      type,              // 'N1' | 'N2' | 'N3'
      rawId: id,         // 원본 ID
      placeId,           // 해석된 Place ID
      isValid: !!placeId,
    };
  }

  /**
   * 타입별 Place ID 해석
   * @private
   */
  _resolvePlaceId(type, id) {
    switch (type) {
      case 'N1':
        // N1: 네이버 플레이스 기본 ID
        return id;

      case 'N2':
        // N2: 블로그/UGC 기반 - 별도 매핑 필요
        return this._lookupN2(id);

      case 'N3':
        // N3: 통합 검색 결과 - 크로스 참조 필요
        return this._crossRefN3(id);

      default:
        logger.warn(`Unknown gdid type: ${type}`);
        return null;
    }
  }

  /**
   * N2 타입 매핑 조회
   * @private
   */
  _lookupN2(id) {
    // 캐시 확인
    if (this.n2MappingCache.has(id)) {
      return this.n2MappingCache.get(id);
    }

    // N2 ID는 일반적으로 직접 사용 가능
    // 필요시 외부 API 호출로 매핑 가능
    logger.debug(`N2 ID ${id} - using direct mapping`);
    return id;
  }

  /**
   * N3 타입 크로스 참조
   * @private
   */
  _crossRefN3(id) {
    // N3는 통합 검색 결과 ID
    // 대부분 직접 Place ID로 사용 가능
    logger.debug(`N3 ID ${id} - using cross reference`);
    return id;
  }

  /**
   * gdid 생성 (역파싱)
   * @param {string} placeId - Place ID
   * @param {string} type - 타입 (기본값: 'N1')
   * @returns {string} gdid
   */
  generate(placeId, type = 'N1') {
    return `${type}:${placeId}`;
  }

  /**
   * gdid 유효성 검증
   * @param {string} gdid - 검증할 gdid
   * @returns {boolean} 유효 여부
   */
  isValid(gdid) {
    const result = this.parse(gdid);
    return result.isValid;
  }

  /**
   * N2 매핑 캐시 설정
   * @param {Map|Object} mapping - N2 ID to Place ID 매핑
   */
  setN2Mapping(mapping) {
    if (mapping instanceof Map) {
      this.n2MappingCache = new Map(mapping);
    } else if (typeof mapping === 'object') {
      this.n2MappingCache = new Map(Object.entries(mapping));
    }
    logger.info(`N2 mapping cache updated: ${this.n2MappingCache.size} entries`);
  }
}
