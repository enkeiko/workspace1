/**
 * 📊 L1 데이터 수집 및 정렬 모듈
 *
 * L1 문서에 정의된 데이터 수집, 파싱, 정렬 기능을 구현합니다.
 */

const fs = require('fs');
const path = require('path');

class L1Processor {
  constructor(logger, options = {}) {
    this.logger = logger;
    this.inputDir = options.inputDir || './places-advanced';
    this.outputDir = options.outputDir || './data/output/l1';
    this.currentKeywordsFile = options.currentKeywordsFile || './data/input/current_keywords.json';
    this.manualNotesFile = options.manualNotesFile || './data/input/manual_notes.json';
    this.competitorsFile = options.competitorsFile || './data/input/competitors.json';
  }

  /**
   * 1단계: 데이터 소스 스캔 및 목록화
   */
  async scanDataSources() {
    this.logger.info('L1 데이터 소스 스캔 시작');

    const sources = {
      crawler: {
        path: this.inputDir,
        files: [],
        count: 0
      },
      current_keywords: {
        path: this.currentKeywordsFile,
        exists: false,
        count: 0
      },
      manual_notes: {
        path: this.manualNotesFile,
        exists: false,
        count: 0
      },
      competitors: {
        path: this.competitorsFile,
        exists: false,
        count: 0
      }
    };

    // 크롤러 JSON 스캔
    if (fs.existsSync(this.inputDir)) {
      const files = fs.readdirSync(this.inputDir);
      sources.crawler.files = files.filter(f => f.endsWith('-FULL.json'));
      sources.crawler.count = sources.crawler.files.length;
    }

    // 현재 키워드 확인
    sources.current_keywords.exists = fs.existsSync(this.currentKeywordsFile);

    // 수동 메모 확인
    sources.manual_notes.exists = fs.existsSync(this.manualNotesFile);

    // 경쟁사 정보 확인
    sources.competitors.exists = fs.existsSync(this.competitorsFile);

    // 검증
    if (sources.crawler.count === 0) {
      throw new Error('E_L1_001: 크롤러 JSON이 없습니다. 크롤러를 실행해주세요.');
    }

    this.logger.info(`데이터 소스 스캔 완료:`, {
      crawler_files: sources.crawler.count,
      current_keywords: sources.current_keywords.exists ? '있음' : '없음',
      manual_notes: sources.manual_notes.exists ? '있음' : '없음',
      competitors: sources.competitors.exists ? '있음' : '없음'
    });

    if (!sources.current_keywords.exists) {
      this.logger.warn('현재 키워드 파일이 없습니다. 성능 비교가 제한됩니다.');
    }

    return sources;
  }

  /**
   * 2단계: 데이터 로딩 및 1차 파싱
   */
  async loadAllData(sources) {
    this.logger.info('데이터 로딩 시작');

    const rawData = {
      places: [],
      current_keywords: {},
      manual_notes: {},
      competitors: []
    };

    // 1. 크롤러 JSON 로딩
    let successCount = 0;
    for (let i = 0; i < sources.crawler.files.length; i++) {
      const file = sources.crawler.files[i];
      const filePath = path.join(this.inputDir, file);

      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(content);

        // 기본 검증
        if (json.id && json.name && json.category) {
          rawData.places.push(json);
          successCount++;
        } else {
          this.logger.warn(`필수 필드 누락: ${file}`);
        }
      } catch (error) {
        this.logger.error(`JSON 파싱 실패: ${file}`, { error: error.message });
      }

      this.logger.progress(i + 1, sources.crawler.files.length, `크롤러 데이터 로딩 중`);
    }

    this.logger.info(`크롤러 데이터 로드 완료: ${successCount}/${sources.crawler.files.length}`);

    // 2. 현재 키워드 로딩
    if (sources.current_keywords.exists) {
      try {
        const content = fs.readFileSync(this.currentKeywordsFile, 'utf-8');
        rawData.current_keywords = JSON.parse(content);
        this.logger.info(`현재 키워드 로드: ${Object.keys(rawData.current_keywords).length}개 매장`);
      } catch (error) {
        this.logger.error('현재 키워드 로딩 실패', { error: error.message });
      }
    }

    // 3. 수동 메모 로딩
    if (sources.manual_notes.exists) {
      try {
        const content = fs.readFileSync(this.manualNotesFile, 'utf-8');
        rawData.manual_notes = JSON.parse(content);
        this.logger.info(`수동 메모 로드: ${Object.keys(rawData.manual_notes).length}개 매장`);
      } catch (error) {
        this.logger.error('수동 메모 로딩 실패', { error: error.message });
      }
    }

    // 4. 경쟁사 정보 로딩
    if (sources.competitors.exists) {
      try {
        const content = fs.readFileSync(this.competitorsFile, 'utf-8');
        const compData = JSON.parse(content);
        rawData.competitors = compData.competitors || [];
        this.logger.info(`경쟁사 정보 로드: ${rawData.competitors.length}개`);
      } catch (error) {
        this.logger.error('경쟁사 정보 로딩 실패', { error: error.message });
      }
    }

    return rawData;
  }

  /**
   * 3단계: 데이터 통합 및 구조화
   */
  consolidateData(rawData) {
    this.logger.info('데이터 통합 시작');

    const consolidated = [];

    for (const place of rawData.places) {
      const placeId = place.id;

      const unified = {
        // 기본 정보
        place_id: placeId,
        name: place.name,
        category: place.category,
        address: {
          full: place.address,
          road: place.roadAddress
        },

        // 현재 키워드 (중요!)
        current_keywords: rawData.current_keywords[placeId] || null,

        // 수동 입력 정보
        manual: rawData.manual_notes[placeId] || {},

        // 메뉴 정보
        menus: place.menus || [],

        // 속성 정보
        attributes: place.attributes || {},

        // 리뷰 통계
        stats: {
          visitor_reviews: place.visitorReviewsCount || 0,
          blog_reviews: place.blogReviewCount || 0,
          rating: place.rating || 0
        },

        // 연락처
        contact: {
          phone: place.phone,
          hours: place.businessHours
        },

        // 원본 데이터 보존
        _raw: {
          crawler: place,
          current_keywords: rawData.current_keywords[placeId],
          manual: rawData.manual_notes[placeId]
        }
      };

      consolidated.push(unified);
    }

    this.logger.info(`데이터 통합 완료: ${consolidated.length}개 매장`);
    return consolidated;
  }

  /**
   * 4단계: 지역 정보 파싱 및 정규화
   */
  parseAddress(address) {
    if (!address) {
      return { si: null, gu: null, dong: null, station: null };
    }

    const regex = /^([가-힣]+특별시|[가-힣]+광역시|[가-힣]+시)?\s?([가-힣]+구|[가-힣]+군)?\s?([가-힣]+동|[가-힣]+읍|[가-힣]+면)?/;
    const match = address.match(regex);

    if (!match) {
      return { si: null, gu: null, dong: null, station: null };
    }

    // 정규화
    const si = this.normalizeRegion(match[1]);
    const gu = this.normalizeRegion(match[2]);
    const dong = this.normalizeRegion(match[3]);

    // 역 정보 추출
    const station = this.extractStation(address);

    return { si, gu, dong, station };
  }

  normalizeRegion(region) {
    if (!region) return null;

    return region
      .replace('특별시', '')
      .replace('광역시', '')
      .replace('구', '')
      .replace('군', '')
      .replace('동', '')
      .replace('읍', '')
      .replace('면', '')
      .trim();
  }

  extractStation(text) {
    if (!text) return null;

    const stationRegex = /([가-힣]+)역/;
    const match = text.match(stationRegex);

    if (match) {
      return match[1] + '역';
    }

    return null;
  }

  /**
   * 5단계: 키워드 추출 요소 분류
   */
  classifyKeywordElements(place) {
    return {
      // 핵심 요소
      core_elements: {
        category: this.extractCoreCategory(place.category),
        subcategory: this.extractSubCategory(place.category),
        brand: this.extractBrandName(place.name),
        manual_targets: place.manual.target_keywords || []
      },

      // 지역 요소
      region_elements: {
        si: place.address.si,
        gu: place.address.gu,
        dong: place.address.dong,
        station: place.address.station,
        combinations: [
          place.address.gu,
          place.address.station,
          place.address.gu && place.address.dong ? `${place.address.gu} ${place.address.dong}` : null,
          place.address.station ? `${place.address.station} 인근` : null
        ].filter(Boolean)
      },

      // 메뉴 요소
      menu_elements: {
        all_menus: place.menus.map(m => m.name),
        recommended: place.menus.filter(m => m.recommend).map(m => m.name),
        representative: place.manual.representative_menu || [],
        price_range: this.calculatePriceRange(place.menus)
      },

      // 속성 요소
      attribute_elements: {
        facilities: Object.keys(place.attributes).filter(key => place.attributes[key] === true),
        amenities_text: this.convertAttributesToText(place.attributes)
      },

      // 현재 키워드
      current_keywords: place.current_keywords ? {
        primary: place.current_keywords.primary_keywords,
        secondary: place.current_keywords.secondary_keywords,
        performance: place.current_keywords.performance,
        notes: place.current_keywords.notes
      } : null,

      // 비즈니스 정보
      business_context: {
        goals: place.manual.business_goals,
        special_notes: place.manual.special_notes,
        brand_story: place.manual.brand_story
      },

      // 메타 정보
      metadata: {
        review_count: place.stats.visitor_reviews,
        rating: place.stats.rating,
        has_manual_input: Object.keys(place.manual).length > 0,
        has_current_keywords: !!place.current_keywords,
        completeness: null  // 다음 단계에서 계산
      }
    };
  }

  extractCoreCategory(category) {
    if (!category) return null;
    return category.replace(/전문점|맛집|레스토랑|카페/g, '').trim();
  }

  extractSubCategory(category) {
    if (!category) return null;
    const match = category.match(/(전문점|맛집|레스토랑|카페)/);
    return match ? match[1] : null;
  }

  extractBrandName(name) {
    if (!name) return null;
    // "히도 강남점" -> "히도"
    const match = name.match(/^([가-힣a-zA-Z0-9]+)/);
    return match ? match[1] : name;
  }

  calculatePriceRange(menus) {
    if (!menus || menus.length === 0) {
      return { min: 0, max: 0, avg: 0 };
    }

    const prices = menus
      .map(m => m.price)
      .filter(p => p && typeof p === 'string')
      .map(p => parseInt(p.replace(/[^0-9]/g, '')))
      .filter(p => !isNaN(p) && p > 0);

    if (prices.length === 0) {
      return { min: 0, max: 0, avg: 0 };
    }

    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    };
  }

  convertAttributesToText(attributes) {
    const textMap = {
      parking: '주차 가능',
      reservation: '예약 가능',
      delivery: '배달 가능',
      wifi: 'WiFi 제공',
      privateRoom: '룸 있음'
    };

    return Object.keys(attributes)
      .filter(key => attributes[key] === true)
      .map(key => textMap[key] || key);
  }

  /**
   * 6단계: 데이터 완성도 평가
   */
  assessDataCompleteness(elements) {
    const checks = {
      has_category: !!elements.core_elements.category,
      has_region: !!elements.region_elements.gu,
      has_menus: elements.menu_elements.all_menus.length > 0,
      has_current_keywords: !!elements.current_keywords,
      has_manual_targets: elements.core_elements.manual_targets.length > 0,
      has_attributes: elements.attribute_elements.facilities.length > 0,
      has_business_goals: !!elements.business_context.goals,
      has_station: !!elements.region_elements.station,
      has_recommended_menus: elements.menu_elements.recommended.length > 0
    };

    const score =
      (checks.has_category ? 20 : 0) +
      (checks.has_region ? 20 : 0) +
      (checks.has_menus ? 20 : 0) +
      (checks.has_current_keywords ? 15 : 0) +
      (checks.has_manual_targets ? 15 : 0) +
      (checks.has_attributes ? 10 : 0) +
      (checks.has_business_goals ? 5 : 0) +
      (checks.has_station ? 5 : 0) +
      (checks.has_recommended_menus ? 5 : 0);

    return {
      score: score,
      percentage: score / 115,
      level: score >= 90 ? 'HIGH' : score >= 60 ? 'MEDIUM' : 'LOW',
      checks: checks
    };
  }

  /**
   * 7단계: 데이터 정렬 및 우선순위 설정
   */
  sortCollectedData(data) {
    this.logger.info('데이터 정렬 중');

    return data.sort((a, b) => {
      // 1차: 현재 키워드 있는 것 우선
      const aHasCurrent = !!a.current_keywords;
      const bHasCurrent = !!b.current_keywords;
      if (aHasCurrent !== bHasCurrent) {
        return bHasCurrent - aHasCurrent;
      }

      // 2차: 데이터 완성도 높은 것 우선
      const aCompleteness = a.metadata.completeness.score;
      const bCompleteness = b.metadata.completeness.score;
      if (aCompleteness !== bCompleteness) {
        return bCompleteness - aCompleteness;
      }

      // 3차: 리뷰 많은 것 우선
      return b.metadata.review_count - a.metadata.review_count;
    });
  }

  /**
   * 8단계: 결과 저장
   */
  async saveL1Results(data) {
    this.logger.info('L1 결과 저장 시작');

    // 출력 디렉토리 생성
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // 1. 전체 수집 데이터
    const mainOutput = {
      generated_at: new Date().toISOString(),
      total_places: data.length,
      summary: {
        with_current_keywords: data.filter(p => p.current_keywords).length,
        with_manual_input: data.filter(p => Object.keys(p.manual).length > 0).length,
        avg_completeness: data.reduce((sum, p) => sum + p.metadata.completeness.score, 0) / data.length
      },
      places: data
    };

    const mainFile = path.join(this.outputDir, 'data_collected_l1.json');
    fs.writeFileSync(mainFile, JSON.stringify(mainOutput, null, 2), 'utf-8');
    this.logger.info(`저장: ${mainFile}`);

    // 2. 키워드 요소 목록
    const elementsOutput = {
      generated_at: new Date().toISOString(),
      elements: data.map(p => ({
        place_id: p.place_id,
        name: p.name,
        core: p.core_elements,
        region: p.region_elements,
        menu: p.menu_elements,
        attribute: p.attribute_elements,
        current: p.current_keywords
      }))
    };

    const elementsFile = path.join(this.outputDir, 'keyword_elements_l1.json');
    fs.writeFileSync(elementsFile, JSON.stringify(elementsOutput, null, 2), 'utf-8');
    this.logger.info(`저장: ${elementsFile}`);

    // 3. 현재 키워드 분석
    const placesWithCurrent = data.filter(p => p.current_keywords);
    const keywordsOutput = {
      generated_at: new Date().toISOString(),
      total_count: placesWithCurrent.length,
      keywords: placesWithCurrent.map(p => ({
        place_id: p.place_id,
        name: p.name,
        current_primary: p.current_keywords.primary,
        current_secondary: p.current_keywords.secondary,
        performance: p.current_keywords.performance
      }))
    };

    const keywordsFile = path.join(this.outputDir, 'current_keywords_l1.json');
    fs.writeFileSync(keywordsFile, JSON.stringify(keywordsOutput, null, 2), 'utf-8');
    this.logger.info(`저장: ${keywordsFile}`);

    this.logger.info('L1 결과 저장 완료');

    return {
      mainFile,
      elementsFile,
      keywordsFile
    };
  }

  /**
   * L1 전체 프로세스 실행
   */
  async process() {
    const startTime = Date.now();

    try {
      this.logger.info('='.repeat(60));
      this.logger.info('L1 데이터 수집 및 정렬 시작');
      this.logger.info('='.repeat(60));

      // 1. 데이터 소스 스캔
      const sources = await this.scanDataSources();

      // 2. 데이터 로딩
      const rawData = await this.loadAllData(sources);

      // 3. 데이터 통합
      let consolidated = this.consolidateData(rawData);

      // 4. 주소 파싱
      this.logger.info('주소 파싱 시작');
      let parseSuccessCount = 0;
      for (let i = 0; i < consolidated.length; i++) {
        const place = consolidated[i];
        const parsed = this.parseAddress(place.address.full);
        place.address = { ...place.address, ...parsed };

        if (parsed.gu) {
          parseSuccessCount++;
        }

        this.logger.progress(i + 1, consolidated.length, '주소 파싱 중');
      }

      const parseRate = Math.round((parseSuccessCount / consolidated.length) * 100);
      this.logger.info(`주소 파싱 완료: ${parseSuccessCount}/${consolidated.length} (${parseRate}%)`);

      if (parseRate < 90) {
        this.logger.warn('주소 파싱 성공률이 90% 미만입니다.');
      }

      // 5. 키워드 요소 분류 및 6. 완성도 평가
      this.logger.info('키워드 요소 분류 및 완성도 평가 시작');
      for (let i = 0; i < consolidated.length; i++) {
        const place = consolidated[i];
        const elements = this.classifyKeywordElements(place);
        const completeness = this.assessDataCompleteness(elements);

        // 결과 병합
        Object.assign(place, elements);
        place.metadata.completeness = completeness;

        this.logger.progress(i + 1, consolidated.length, '키워드 요소 분류 중');
      }

      // 완성도 통계
      const completenessStats = {
        HIGH: consolidated.filter(p => p.metadata.completeness.level === 'HIGH').length,
        MEDIUM: consolidated.filter(p => p.metadata.completeness.level === 'MEDIUM').length,
        LOW: consolidated.filter(p => p.metadata.completeness.level === 'LOW').length
      };

      const avgCompleteness = consolidated.reduce((sum, p) => sum + p.metadata.completeness.score, 0) / consolidated.length;

      this.logger.info('데이터 완성도 평가:', {
        HIGH: `${completenessStats.HIGH}개 (${Math.round(completenessStats.HIGH / consolidated.length * 100)}%)`,
        MEDIUM: `${completenessStats.MEDIUM}개 (${Math.round(completenessStats.MEDIUM / consolidated.length * 100)}%)`,
        LOW: `${completenessStats.LOW}개 (${Math.round(completenessStats.LOW / consolidated.length * 100)}%)`,
        평균: `${avgCompleteness.toFixed(1)}점`
      });

      // 7. 데이터 정렬
      consolidated = this.sortCollectedData(consolidated);

      // 8. 결과 저장
      const files = await this.saveL1Results(consolidated);

      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

      this.logger.info('='.repeat(60));
      this.logger.info(`L1 완료 (소요 시간: ${elapsedTime}초)`);
      this.logger.info('다음 단계: L2 분석 및 목표키워드 설정');
      this.logger.info('='.repeat(60));

      return {
        success: true,
        data: consolidated,
        files,
        summary: {
          total: consolidated.length,
          with_current_keywords: consolidated.filter(p => p.current_keywords).length,
          avg_completeness: avgCompleteness,
          completeness_stats: completenessStats,
          elapsed_time: elapsedTime
        }
      };

    } catch (error) {
      this.logger.error('L1 처리 중 오류 발생', { error: error.message, stack: error.stack });
      throw error;
    }
  }
}

module.exports = L1Processor;
