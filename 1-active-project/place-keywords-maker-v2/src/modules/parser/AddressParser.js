/**
 * AddressParser - 주소 정밀 파싱 (시/구/동/역/상권/건물)
 * V2.1: 가이드북 v1.1 Location 키워드 체계 적용
 */

import { logger } from '../../utils/logger.js';

export class AddressParser {
  constructor() {
    // 서울 주요 역 패턴
    this.stationPatterns = [
      '강남역', '신촌역', '홍대입구역', '이태원역', '명동역',
      '압구정역', '청담역', '강남구청역', '역삼역', '선릉역',
      '삼성역', '잠실역', '건대입구역', '왕십리역', '동대문역사문화공원역',
      '시청역', '종각역', '을지로입구역', '충무로역', '동대문역',
      '신림역', '서울대입구역', '사당역', '교대역', '서초역',
      '구로디지털단지역', '신도림역', '여의도역', '합정역', '상수역'
    ];

    // 주요 상권 패턴
    this.areaPatterns = [
      '강남', '홍대', '신촌', '이태원', '명동',
      '압구정', '청담', '역삼', '선릉', '삼성',
      '잠실', '건대', '성수', '망원', '연남',
      '경리단길', '가로수길', '신사동', '논현동', '청담동',
      '한남동', '이촌동', '여의도', '여의나루', '당산',
      '합정', '상수', '마포', '공덕', '대학로',
      '혜화', '신림', '서울대입구', '사당', '교대'
    ];

    // 시/구 정규식
    this.cityPattern = /^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)([시도]|특별시|광역시|특별자치시|특별자치도)?/;
    this.districtPattern = /([\w가-힣]+)(구|군|시)/;
    this.dongPattern = /([\w가-힣]+?)(동|읍|면|가)/;
    this.buildingPattern = /([\w가-힣\s]+?)(빌딩|타워|오피스텔|아파트|상가|몰|플라자|프라자|스퀘어|센터)/i;
  }

  /**
   * 전체 주소 파싱 (통합)
   * @param {Object} addressData - { road, jibun, detail }
   * @returns {Object} 파싱된 주소 정보
   */
  parse(addressData) {
    if (!addressData || (!addressData.road && !addressData.jibun)) {
      logger.warn('Invalid address data');
      return this._emptyResult();
    }

    const fullAddress = addressData.road || addressData.jibun || '';
    const detail = addressData.detail || '';

    try {
      const result = {
        original: {
          road: addressData.road || '',
          jibun: addressData.jibun || '',
          detail: detail
        },
        parsed: {
          city: this._extractCity(fullAddress),
          district: this._extractDistrict(fullAddress),
          dong: this._extractDong(fullAddress),
          station: this._extractNearbyStation(fullAddress, detail),
          area: this._extractCommercialArea(fullAddress, detail),
          building: this._extractBuilding(fullAddress, detail)
        },
        // 키워드 생성 (location 키워드용)
        locationKeywords: []
      };

      // location 키워드 생성
      result.locationKeywords = this._generateLocationKeywords(result.parsed);

      logger.debug(`Address parsed: ${fullAddress} → ${result.locationKeywords.join(', ')}`);
      return result;

    } catch (error) {
      logger.error('Address parsing error:', error);
      return this._emptyResult();
    }
  }

  /**
   * 시/도 추출
   * @private
   */
  _extractCity(address) {
    const match = address.match(this.cityPattern);
    if (!match) return '';

    const city = match[1];
    const suffix = match[2] || '';

    // 표준화
    if (city === '서울') return '서울특별시';
    if (['부산', '대구', '인천', '광주', '대전', '울산'].includes(city)) return `${city}광역시`;
    if (city === '세종') return '세종특별자치시';

    return city + suffix;
  }

  /**
   * 구/군 추출
   * @private
   */
  _extractDistrict(address) {
    // 시/도 이후 부분에서 추출
    const cityMatch = address.match(this.cityPattern);
    const afterCity = cityMatch ? address.substring(cityMatch[0].length).trim() : address;

    const match = afterCity.match(this.districtPattern);
    return match ? match[0] : '';
  }

  /**
   * 동/읍/면 추출
   * @private
   */
  _extractDong(address) {
    // 구 이후 부분에서 추출
    const districtMatch = address.match(this.districtPattern);
    const afterDistrict = districtMatch
      ? address.substring(address.indexOf(districtMatch[0]) + districtMatch[0].length).trim()
      : address;

    const match = afterDistrict.match(this.dongPattern);
    return match ? match[0] : '';
  }

  /**
   * 인근 역 추출
   * @private
   */
  _extractNearbyStation(address, detail) {
    const fullText = `${address} ${detail}`;

    for (const station of this.stationPatterns) {
      if (fullText.includes(station)) {
        return station;
      }
    }

    // 패턴에 없는 역 찾기
    const match = fullText.match(/([\w가-힣]+역)/);
    return match ? match[1] : '';
  }

  /**
   * 상권 추출
   * @private
   */
  _extractCommercialArea(address, detail) {
    const fullText = `${address} ${detail}`;

    for (const area of this.areaPatterns) {
      if (fullText.includes(area)) {
        return area;
      }
    }

    return '';
  }

  /**
   * 건물명 추출
   * @private
   */
  _extractBuilding(address, detail) {
    const fullText = `${address} ${detail}`;

    const match = fullText.match(this.buildingPattern);
    return match ? match[0].trim() : '';
  }

  /**
   * Location 키워드 생성
   * @private
   */
  _generateLocationKeywords(parsed) {
    const keywords = [];

    // 우선순위: 상권 > 역 > 동 > 구 > 시
    if (parsed.area) {
      keywords.push(parsed.area);
    }

    if (parsed.station) {
      keywords.push(parsed.station);
      // "역" 제거한 버전도 추가
      const stationWithoutSuffix = parsed.station.replace('역', '');
      if (stationWithoutSuffix !== parsed.station) {
        keywords.push(stationWithoutSuffix);
      }
    }

    if (parsed.dong) {
      keywords.push(parsed.dong);
      // "동" 제거한 버전도 추가
      const dongWithoutSuffix = parsed.dong.replace(/(동|읍|면|가)$/, '');
      if (dongWithoutSuffix !== parsed.dong) {
        keywords.push(dongWithoutSuffix);
      }
    }

    if (parsed.district) {
      keywords.push(parsed.district);
    }

    // 건물명은 별도 처리 (일반적으로 키워드로 사용 안 함)
    // if (parsed.building) {
    //   keywords.push(parsed.building);
    // }

    // 중복 제거
    return [...new Set(keywords)];
  }

  /**
   * 빈 결과 반환
   * @private
   */
  _emptyResult() {
    return {
      original: { road: '', jibun: '', detail: '' },
      parsed: {
        city: '',
        district: '',
        dong: '',
        station: '',
        area: '',
        building: ''
      },
      locationKeywords: []
    };
  }

  /**
   * 두 주소의 유사도 계산 (0~1)
   * @param {Object} addr1
   * @param {Object} addr2
   * @returns {number} 유사도
   */
  calculateSimilarity(addr1, addr2) {
    if (!addr1 || !addr2) return 0;

    const keys = ['city', 'district', 'dong', 'station', 'area'];
    let matches = 0;
    let total = 0;

    keys.forEach(key => {
      if (addr1.parsed[key] || addr2.parsed[key]) {
        total++;
        if (addr1.parsed[key] === addr2.parsed[key]) {
          matches++;
        }
      }
    });

    return total > 0 ? matches / total : 0;
  }

  /**
   * 주소 정규화 (비교용)
   * @param {string} address
   * @returns {string}
   */
  normalize(address) {
    return address
      .replace(/\s+/g, ' ')
      .replace(/[^\w가-힣\s]/g, '')
      .trim()
      .toLowerCase();
  }
}
