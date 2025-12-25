/**
 * Place ID 파서 - 네이버 URL에서 Place ID 추출
 */

export class PlaceIdParser {
  /**
   * 네이버 플레이스 URL 또는 Place ID에서 Place ID 추출
   * @param {string} input - URL 또는 Place ID
   * @returns {string|null} Place ID 또는 null
   */
  static extract(input) {
    if (!input) return null;

    const trimmed = input.trim();

    // 이미 숫자만 있는 경우 (Place ID)
    if (/^\d+$/.test(trimmed)) {
      return trimmed;
    }

    // URL에서 추출 - 다양한 네이버 플레이스 URL 형식 지원
    // 예: https://pcmap.place.naver.com/restaurant/1716926393/home
    // 예: https://m.place.naver.com/restaurant/1716926393/home
    // 예: https://map.naver.com/p/entry/place/1716926393
    // 예: https://map.naver.com/v5/entry/place/1716926393
    // 예: https://map.naver.com/v5/#/place/1716926393
    // 예: https://m.map.naver.com/search2/place.naver?query=...&id=1716926393
    const patterns = [
      /place\.naver\.com\/restaurant\/(\d+)/,
      /place\.naver\.com\/place\/(\d+)/,
      /pcmap\.place\.naver\.com\/restaurant\/(\d+)/,
      /m\.place\.naver\.com\/restaurant\/(\d+)/,
      /m\.place\.naver\.com\/place\/(\d+)/,
      /map\.naver\.com\/p\/entry\/place\/(\d+)/,
      /map\.naver\.com\/v5\/entry\/place\/(\d+)/,
      /map\.naver\.com\/v5\/#\/place\/(\d+)/,
      /map\.naver\.com\/[^/]*\/place\/(\d+)/,
      /m\.map\.naver\.com\/.*[?&]id=(\d+)/,
      /place\.naver\.com\/.*[?&]id=(\d+)/,
      /\/place\/(\d+)/,  // 상대 경로 지원
    ];

    for (const pattern of patterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * 유효한 Place ID인지 검증
   * @param {string} placeId
   * @returns {boolean}
   */
  static isValid(placeId) {
    return placeId && /^\d+$/.test(placeId) && placeId.length > 5;
  }
}
