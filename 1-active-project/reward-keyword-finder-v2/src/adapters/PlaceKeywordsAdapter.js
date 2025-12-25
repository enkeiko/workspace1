/**
 * PlaceKeywordsAdapter - place-keywords-maker-v2 데이터 연동
 *
 * place-keywords-maker-v2의 크롤링 데이터를 읽어 5분류 키워드셋으로 변환
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// place-keywords-maker-v2 경로
const PKM_PATH = path.resolve(__dirname, '../../../place-keywords-maker-v2');

export class PlaceKeywordsAdapter {
  constructor() {
    this.dataPath = path.join(PKM_PATH, 'data');
    console.log(`[PlaceKeywordsAdapter] PKM_PATH: ${PKM_PATH}`);
    console.log(`[PlaceKeywordsAdapter] dataPath: ${this.dataPath}`);
    console.log(`[PlaceKeywordsAdapter] dataPath exists: ${fs.existsSync(this.dataPath)}`);
  }

  /**
   * Place ID로 키워드셋 조회
   * @param {string} placeId - 네이버 Place ID
   * @returns {Object|null} - 5분류 키워드셋
   */
  async getKeywordSet(placeId) {
    const crawlData = await this._loadCrawlData(placeId);
    if (!crawlData) return null;

    return {
      placeId,
      name: crawlData.basic?.name || '',
      CORE: this._extractCore(crawlData),
      LOCATION: this._extractLocation(crawlData),
      MENU: this._extractMenu(crawlData),
      ATTRIBUTE: this._extractAttribute(crawlData),
      SENTIMENT: this._extractSentiment(crawlData)
    };
  }

  /**
   * 크롤링 데이터 로드
   * @private
   */
  async _loadCrawlData(placeId) {
    console.log(`[PlaceKeywordsAdapter] _loadCrawlData called with placeId: ${placeId}`);

    // 검색할 경로들
    const searchPaths = [
      path.join(this.dataPath, `${placeId}.json`),
      path.join(this.dataPath, `place-${placeId}.json`),
      path.join(this.dataPath, 'output', 'l1', `${placeId}.json`),
      path.join(this.dataPath, 'output', 'l1', `place-${placeId}.json`),
      path.join(this.dataPath, 'output', `${placeId}.json`),
      path.join(this.dataPath, 'crawl_results', `${placeId}.json`),
    ];

    for (const searchPath of searchPaths) {
      console.log(`[PlaceKeywordsAdapter] Checking: ${searchPath}`);
      if (fs.existsSync(searchPath)) {
        console.log(`[PlaceKeywordsAdapter] Found at: ${searchPath}`);
        return JSON.parse(fs.readFileSync(searchPath, 'utf-8'));
      }
    }

    console.log(`[PlaceKeywordsAdapter] Not found in any location`);
    return null;
  }

  /**
   * CORE 키워드 추출 (업종)
   * @private
   */
  _extractCore(data) {
    const core = new Set();

    // 카테고리
    if (data.basic?.category) {
      core.add(data.basic.category);
    }

    // SEO 키워드
    if (data.basic?.seoKeywords) {
      data.basic.seoKeywords.forEach(k => core.add(k));
    }

    // 대표 키워드
    if (data.representativeKeywords) {
      data.representativeKeywords.forEach(k => core.add(k));
    }

    return Array.from(core).map(text => ({ text, source: 'pkm' }));
  }

  /**
   * LOCATION 키워드 추출 (지역)
   * @private
   */
  _extractLocation(data) {
    const location = new Set();

    // 주소에서 지역명 추출
    const addr = data.basic?.address;
    if (addr) {
      // 도로명 주소 파싱
      const road = addr.road || addr.roadAddress || '';
      const parts = road.split(' ').slice(0, 3);  // 시/구/동

      parts.forEach(p => {
        if (p && !p.match(/^\d/)) {
          location.add(p);
        }
      });

      // "역" 이름 추출 (예: 강남역)
      const stationMatch = road.match(/(\S+역)/);
      if (stationMatch) {
        location.add(stationMatch[1]);
      }
    }

    // 지번 주소
    if (addr?.jibun) {
      const jibunParts = addr.jibun.split(' ').slice(0, 3);
      jibunParts.forEach(p => {
        if (p && !p.match(/^\d/)) {
          location.add(p);
        }
      });
    }

    return Array.from(location).map(text => ({ text, source: 'address' }));
  }

  /**
   * MENU 키워드 추출
   * @private
   */
  _extractMenu(data) {
    const menu = new Set();

    // 메뉴 목록
    if (data.menus && Array.isArray(data.menus)) {
      data.menus.forEach(m => {
        const name = m.name || m;
        if (typeof name === 'string' && name.length <= 10) {
          menu.add(name);
        }
      });
    }

    // 대표 메뉴
    if (data.representativeMenus) {
      data.representativeMenus.forEach(m => {
        const name = m.name || m;
        if (typeof name === 'string') {
          menu.add(name);
        }
      });
    }

    return Array.from(menu).slice(0, 20).map(text => ({ text, source: 'menu' }));
  }

  /**
   * ATTRIBUTE 키워드 추출 (속성)
   * @private
   */
  _extractAttribute(data) {
    const attr = new Set();

    // 시설/편의 정보
    if (data.facilities) {
      data.facilities.forEach(f => attr.add(f));
    }

    // 투표된 키워드
    if (data.votedKeywords) {
      data.votedKeywords.forEach(k => attr.add(k.keyword || k));
    }

    // 기본 속성
    const defaultAttrs = ['맛집', '인기', '추천', '분위기좋은', '가성비'];
    defaultAttrs.forEach(a => attr.add(a));

    return Array.from(attr).map(text => ({ text, source: 'attribute' }));
  }

  /**
   * SENTIMENT 키워드 추출 (감성)
   * @private
   */
  _extractSentiment(data) {
    const sentiment = new Set();

    // 리뷰에서 감성 키워드 추출
    if (data.blogReviews || data.visitorReviews) {
      const reviews = [...(data.blogReviews || []), ...(data.visitorReviews || [])];

      const sentimentKeywords = [
        '분위기', '친절', '깔끔', '넓은', '조용한',
        '데이트', '모임', '회식', '가족', '혼밥'
      ];

      reviews.forEach(r => {
        const text = r.content || r.body || '';
        sentimentKeywords.forEach(kw => {
          if (text.includes(kw)) {
            sentiment.add(kw);
          }
        });
      });
    }

    // 기본 감성 키워드
    const defaultSentiments = ['데이트', '회식', '모임', '분위기좋은', '가족'];
    defaultSentiments.forEach(s => sentiment.add(s));

    return Array.from(sentiment).map(text => ({ text, source: 'sentiment' }));
  }

  /**
   * 모든 저장된 Place ID 목록
   */
  getAvailablePlaceIds() {
    const ids = new Set();

    const searchDirs = [
      this.dataPath,
      path.join(this.dataPath, 'output', 'l1'),
      path.join(this.dataPath, 'output'),
      path.join(this.dataPath, 'crawl_results'),
    ];

    for (const dir of searchDirs) {
      if (fs.existsSync(dir)) {
        fs.readdirSync(dir)
          .filter(f => f.endsWith('.json'))
          .forEach(f => {
            // place-1234.json 또는 1234.json 형식 처리
            const name = f.replace('.json', '').replace('place-', '');
            if (/^\d+$/.test(name)) {
              ids.add(name);
            }
          });
      }
    }

    return Array.from(ids);
  }
}
