/**
 * normalizers.js
 * 데이터 정규화 함수들
 *
 * L1_FEATURE_SPEC.md 명세 기반 구현
 * - 주소 정규화
 * - 메뉴 정규화
 * - 리뷰 정규화
 */

// ============================================
// 주소 정규화 함수들
// ============================================

/**
 * 시/도 추출 함수
 * @param {string} address - 원본 주소
 * @returns {string|null} 정규화된 시/도
 */
function extractSi(address) {
  if (!address) return null;

  const siPattern = /(서울특별시|서울|부산광역시|부산|대구광역시|대구|인천광역시|인천|광주광역시|광주|대전광역시|대전|울산광역시|울산|세종특별자치시|세종|경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주특별자치도)/;
  const match = address.match(siPattern);

  if (!match) return null;

  // "서울" -> "서울특별시"로 정규화
  const siMap = {
    '서울': '서울특별시',
    '부산': '부산광역시',
    '대구': '대구광역시',
    '인천': '인천광역시',
    '광주': '광주광역시',
    '대전': '대전광역시',
    '울산': '울산광역시',
    '세종': '세종특별자치시'
  };

  return siMap[match[1]] || match[1];
}

/**
 * 구/군 추출 함수
 * @param {string} address - 원본 주소
 * @returns {string|null} 구/군
 */
function extractGu(address) {
  if (!address) return null;

  const guPattern = /([가-힣]+구(?=\s|$|[동로]))/;
  const match = address.match(guPattern);
  return match ? match[1] : null;
}

/**
 * 동/읍/면 추출 함수
 * @param {string} address - 원본 주소
 * @returns {string|null} 동/읍/면
 */
function extractDong(address) {
  if (!address) return null;

  // 동, 읍, 면 패턴 매칭
  const dongPattern = /([가-힣0-9]+(?:동|읍|면))(?:\s|$|\()/;
  const match = address.match(dongPattern);
  return match ? match[1] : null;
}

/**
 * 도로명 주소 추출 함수
 * @param {string} address - 원본 주소
 * @returns {object|null} 도로명 주소 정보
 */
function extractRoadAddress(address) {
  if (!address) return null;

  // "테헤란로 123" 또는 "테헤란로 123-45" 패턴
  const roadPattern = /([가-힣]+(?:로|길))\s*(\d+(?:-\d+)?)/;
  const match = address.match(roadPattern);

  if (!match) return null;

  return {
    roadName: match[1],      // "테헤란로"
    buildingNumber: match[2] // "123" or "123-45"
  };
}

/**
 * 지번 주소 추출 함수
 * @param {string} address - 원본 주소
 * @returns {object|null} 지번 주소 정보
 */
function extractJibunAddress(address) {
  if (!address) return null;

  // "역삼동 123-45" 패턴
  const jibunPattern = /([가-힣0-9]+(?:동|읍|면))\s*(\d+(?:-\d+)?)/;
  const match = address.match(jibunPattern);

  if (!match) return null;

  return {
    dong: match[1],          // "역삼동"
    lotNumber: match[2]      // "123-45"
  };
}

/**
 * 건물명 추출 함수
 * @param {string} address - 원본 주소
 * @returns {string|null} 건물명
 */
function extractBuilding(address) {
  if (!address) return null;

  // 괄호 안의 건물명 추출: "(역삼빌딩)"
  const buildingPattern = /\(([^)]+)\)/;
  const match = address.match(buildingPattern);
  return match ? match[1] : null;
}

/**
 * 정규화 신뢰도 계산 함수
 * @param {string} address - 원본 주소
 * @returns {number} 신뢰도 (0-1)
 */
function calculateConfidence(address) {
  if (!address) return 0;

  let score = 0;
  let maxScore = 6;

  // 각 필수 요소가 있으면 점수 추가
  if (extractSi(address)) score += 1;
  if (extractGu(address)) score += 1;
  if (extractDong(address)) score += 1;
  if (extractRoadAddress(address)) score += 1.5;
  if (extractJibunAddress(address)) score += 1.5;

  return Math.min(score / maxScore, 1.0);
}

/**
 * 주소 정규화 (메인 함수)
 * @param {string} rawAddress - 원본 주소
 * @returns {object} 정규화된 주소 객체
 */
function normalizeAddress(rawAddress) {
  if (!rawAddress || !rawAddress.trim()) {
    return null;
  }

  const roadAddr = extractRoadAddress(rawAddress);
  const jibunAddr = extractJibunAddress(rawAddress);

  return {
    // 행정구역 정규화
    si: extractSi(rawAddress),
    gu: extractGu(rawAddress),
    dong: extractDong(rawAddress),

    // 도로명 주소 분리
    roadAddress: roadAddr ? `${roadAddr.roadName} ${roadAddr.buildingNumber}` : null,

    // 지번 주소 분리
    jibunAddress: jibunAddr ? `${jibunAddr.dong} ${jibunAddr.lotNumber}` : null,

    // 건물명
    building: extractBuilding(rawAddress),

    // 원본 보존
    raw: rawAddress,

    // 정규화 신뢰도 (0-1)
    confidence: calculateConfidence(rawAddress)
  };
}

/**
 * 지역 키워드 추출
 * @param {object} normalizedAddress - 정규화된 주소
 * @returns {object} 키워드 객체
 */
function extractRegionKeywords(normalizedAddress) {
  if (!normalizedAddress) {
    return { primary: [], secondary: [], tertiary: [] };
  }

  const { gu, dong } = normalizedAddress;

  return {
    primary: [gu].filter(Boolean),
    secondary: [dong].filter(Boolean),
    tertiary: gu && dong ? [`${gu} ${dong}`] : []
  };
}

// ============================================
// 메뉴 정규화 함수들
// ============================================

/**
 * 메뉴명 정제 함수
 * @param {string} menuName - 원본 메뉴명
 * @returns {string} 정제된 메뉴명
 */
function cleanMenuName(menuName) {
  if (!menuName) return '';

  return menuName
    .replace(/\([^)]*\)/g, '')          // 괄호 및 내용 제거: "(1인)" -> ""
    .replace(/[−\-–—]/g, '')            // 하이픈, 대시 제거
    .replace(/\s+/g, ' ')               // 다중 공백을 하나로
    .trim();                            // 앞뒤 공백 제거
}

/**
 * 가격 추출 함수 (C-6: 상한선 설정 가능)
 * @param {string|number} priceString - 가격 문자열
 * @param {object} options - 옵션 { maxPrice, minPrice }
 * @returns {number|null} 숫자 가격
 */
function extractPrice(priceString, options = {}) {
  const maxPrice = options.maxPrice || 100000000;  // 기본: 1억원
  const minPrice = options.minPrice !== undefined ? options.minPrice : 0;

  if (!priceString) return null;

  // 숫자 타입이면 범위 검증만
  if (typeof priceString === 'number') {
    if (priceString >= minPrice && priceString <= maxPrice) {
      return priceString;
    }
    console.warn(`[normalizers] Price ${priceString} out of range [${minPrice}, ${maxPrice}]`);
    return null;
  }

  // 숫자만 추출: "12,000원" -> "12000" -> 12000
  const numericString = priceString.toString()
    .replace(/[^0-9]/g, '');  // 숫자가 아닌 모든 문자 제거

  if (!numericString) return null;

  const price = parseInt(numericString, 10);

  // 유효성 검증
  if (isNaN(price) || price < minPrice || price > maxPrice) {
    if (!isNaN(price)) {
      console.warn(`[normalizers] Price ${price} out of range [${minPrice}, ${maxPrice}]`);
    }
    return null;
  }

  return price;
}

/**
 * 가격 포맷팅 함수
 * @param {number} price - 숫자 가격
 * @returns {string} 포맷된 가격 문자열
 */
function formatPrice(price) {
  if (price === null || price === undefined) return '';

  // 천 단위 콤마 추가
  return price.toLocaleString('ko-KR') + '원';
}

/**
 * 인분 정보 추출 함수
 * @param {string} menuName - 메뉴명
 * @returns {number} 인분 수 (1-10)
 */
function extractServing(menuName) {
  if (!menuName) return 1;  // 기본값 1인분

  // "1인", "2인분", "3인용" 등 패턴 매칭
  const servingPattern = /(\d+)(?:인|인분|인용)/;
  const match = menuName.match(servingPattern);

  if (match) {
    const serving = parseInt(match[1], 10);
    return (serving > 0 && serving <= 10) ? serving : 1;  // 1-10 범위 검증
  }

  return 1;  // 기본값
}

/**
 * 메뉴 분류 함수 (룰 기반)
 * @param {string} menuName - 메뉴명
 * @returns {string} 카테고리
 */
function classifyMenu(menuName) {
  if (!menuName) return '기타';

  // M-2: 우선순위 기반 가중치 스코어링 (키워드 충돌 해결)
  const categoryPatterns = [
    {
      category: '메인 요리',
      weight: 3,
      keywords: ['갈비', '삼겹살', '스테이크', '파스타', '피자', '돈까스', '치킨', '찜', '탕', '전골', '국밥']
    },
    {
      category: '사이드',
      weight: 2,
      keywords: ['샐러드', '감자튀김', '떡볶이', '튀김', '만두', '김치', '나물']
    },
    {
      category: '음료',
      weight: 2,
      keywords: ['커피', '주스', '차', '에이드', '스무디', '맥주', '소주', '와인', '음료', '콜라', '사이다']
    },
    {
      category: '디저트',
      weight: 1,
      keywords: ['케이크', '아이스크림', '빙수', '과일', '젤라또', '마카롱', '쿠키']
    }
  ];

  const scores = {};

  // 각 카테고리별 점수 계산
  for (const pattern of categoryPatterns) {
    let score = 0;
    for (const keyword of pattern.keywords) {
      if (menuName.includes(keyword)) {
        score += pattern.weight;
      }
    }
    if (score > 0) {
      scores[pattern.category] = score;
    }
  }

  // 매칭된 카테고리가 없으면 기본값
  if (Object.keys(scores).length === 0) {
    return '메인 요리';
  }

  // 가장 높은 점수의 카테고리 반환
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * 메뉴 키워드 추출 함수
 * @param {string} menuName - 메뉴명
 * @returns {string[]} 키워드 배열
 */
function extractMenuKeywords(menuName) {
  if (!menuName) return [];

  const keywords = [];

  // 조리 방법 키워드
  const cookingMethods = ['구이', '튀김', '찜', '볶음', '조림', '전골', '탕', '국', '철판', '숯불'];
  cookingMethods.forEach(method => {
    if (menuName.includes(method)) {
      keywords.push(method);
    }
  });

  // 재료 키워드
  const ingredients = ['돼지', '소', '닭', '해물', '야채', '치즈', '마늘', '고추', '된장', '김치'];
  ingredients.forEach(ingredient => {
    if (menuName.includes(ingredient)) {
      keywords.push(ingredient);
    }
  });

  // 특수 키워드
  if (menuName.includes('매운')) keywords.push('매운맛');
  if (menuName.includes('순한')) keywords.push('순한맛');
  if (menuName.includes('특')) keywords.push('특선');

  return [...new Set(keywords)];  // 중복 제거
}

/**
 * 메뉴 정규화 (메인 함수) (C-6: 가격 옵션 추가)
 * @param {object} rawMenu - 원본 메뉴
 * @param {object} options - 옵션 { maxPrice, minPrice }
 * @returns {object} 정규화된 메뉴
 */
function normalizeMenu(rawMenu, options = {}) {
  if (!rawMenu) return null;

  const price = extractPrice(rawMenu.price, options);

  return {
    // 메뉴명 정제
    name: cleanMenuName(rawMenu.name),

    // 가격 숫자 변환
    price: price,
    priceFormatted: price !== null ? formatPrice(price) : rawMenu.price || '',

    // 인분 정보 추출
    servingSize: extractServing(rawMenu.name),

    // 메뉴 분류 (AI 또는 룰 기반)
    category: classifyMenu(rawMenu.name),

    // 키워드 추출
    keywords: extractMenuKeywords(rawMenu.name),

    // 메타 정보
    isRecommended: rawMenu.isRecommended || false,
    description: rawMenu.description || null
  };
}

// ============================================
// 리뷰 정규화 함수들
// ============================================

/**
 * 작성자 익명화
 * @param {string} author - 작성자명
 * @returns {string} 익명화된 작성자명
 */
function anonymizeAuthor(author) {
  if (!author || author.length <= 1) return 'Anonymous';

  // 첫 글자만 남기고 나머지는 *로 대체
  return author[0] + '*'.repeat(author.length - 1);
}

/**
 * 날짜 파싱 (ISO 8601 형식)
 * @param {string} dateString - 날짜 문자열
 * @returns {string} ISO 8601 형식 날짜
 */
function parseDate(dateString) {
  if (!dateString) return null;

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;

    return date.toISOString();
  } catch (error) {
    return null;
  }
}

/**
 * 텍스트 정제 (HTML 태그, 특수문자 제거)
 * @param {string} text - 원본 텍스트
 * @returns {string} 정제된 텍스트
 */
function cleanText(text) {
  if (!text) return '';

  return text
    .replace(/<[^>]*>/g, '')           // HTML 태그 제거
    .replace(/&nbsp;/g, ' ')           // &nbsp; -> 공백
    .replace(/&lt;/g, '<')             // HTML 엔티티 복원
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')              // 다중 공백 정리
    .trim();
}

/**
 * 텍스트 정규화 (맞춤법 수정은 생략, 띄어쓰기만 정리)
 * @param {string} text - 원본 텍스트
 * @returns {string} 정규화된 텍스트
 */
function normalizeText(text) {
  if (!text) return '';

  // TODO: 맞춤법 수정 (외부 API 필요)
  // 현재는 띄어쓰기만 정리
  return cleanText(text);
}

/**
 * 문장 분리
 * @param {string} text - 텍스트
 * @returns {string[]} 문장 배열
 */
function splitSentences(text) {
  if (!text) return [];

  // 한국어 문장 종결 기호: . ! ?
  return text
    .split(/[.!?]\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * 리뷰 키워드 추출 (간단한 버전)
 * @param {string} content - 리뷰 내용
 * @returns {string[]} 키워드 배열
 */
function extractReviewKeywords(content) {
  if (!content) return [];

  const keywords = [];

  // 긍정 키워드
  const positiveWords = ['맛있', '좋', '친절', '깨끗', '분위기', '추천'];
  positiveWords.forEach(word => {
    if (content.includes(word)) keywords.push(word);
  });

  // 부정 키워드
  const negativeWords = ['맛없', '별로', '불친절', '더럽', '비싸'];
  negativeWords.forEach(word => {
    if (content.includes(word)) keywords.push(word);
  });

  return [...new Set(keywords)];
}

/**
 * 리뷰 정규화 (메인 함수)
 * @param {object} rawReview - 원본 리뷰
 * @returns {object} 정규화된 리뷰
 */
function normalizeReview(rawReview) {
  if (!rawReview) return null;

  return {
    // 기본 정보
    author: anonymizeAuthor(rawReview.author),
    rating: parseFloat(rawReview.rating) || null,
    date: parseDate(rawReview.date),

    // 텍스트 정제
    content: {
      raw: rawReview.content,
      cleaned: cleanText(rawReview.content),
      normalized: normalizeText(rawReview.content),
      length: rawReview.content ? rawReview.content.length : 0
    },

    // 감성 분석 준비
    sentences: splitSentences(rawReview.content),
    keywords: extractReviewKeywords(rawReview.content),

    // 메타 정보
    hasImage: rawReview.images && rawReview.images.length > 0,
    imageCount: rawReview.images?.length || 0,
    isVerified: rawReview.isVerified || false
  };
}

// ============================================
// 내보내기
// ============================================

module.exports = {
  // 주소 정규화
  normalizeAddress,
  extractSi,
  extractGu,
  extractDong,
  extractRoadAddress,
  extractJibunAddress,
  extractBuilding,
  calculateConfidence,
  extractRegionKeywords,

  // 메뉴 정규화
  normalizeMenu,
  cleanMenuName,
  extractPrice,
  formatPrice,
  extractServing,
  classifyMenu,
  extractMenuKeywords,

  // 리뷰 정규화
  normalizeReview,
  anonymizeAuthor,
  parseDate,
  cleanText,
  normalizeText,
  splitSentences,
  extractReviewKeywords
};
