/**
 * L3 Processor - Final Keyword Strategy Generation
 * Scores, selects, and prioritizes keywords from L2 candidates
 */

import fs from 'fs';
import path from 'path';
import configManager from '../services/config-manager.js';
import logger from '../lib/logger.js';
import { createError } from '../lib/errors.js';

/**
 * Calculate composite score for a keyword
 * Combines search volume, competition, and AI relevance
 * @param {Object} candidate - Keyword candidate from L2
 * @returns {number} Score (0-100)
 */
function calculateKeywordScore(candidate) {
  const { search_volume, competition, relevance_score } = candidate;

  // Normalize search volume (0-100 scale)
  // Assume max volume is 10,000
  const volumeScore = Math.min((search_volume / 10000) * 100, 100);

  // Competition score (invert - lower competition is better)
  let competitionScore;
  if (competition === 'low') {
    competitionScore = 100;
  } else if (competition === 'medium') {
    competitionScore = 60;
  } else if (competition === 'high') {
    competitionScore = 30;
  } else {
    competitionScore = 50; // unknown
  }

  // AI relevance score (0-100 or null)
  const aiScore = relevance_score || 50; // Default to neutral if AI didn't score

  // Weighted composite score
  // Volume: 40%, Competition: 30%, AI Relevance: 30%
  const compositeScore = (
    (volumeScore * 0.40) +
    (competitionScore * 0.30) +
    (aiScore * 0.30)
  );

  return Math.round(compositeScore * 100) / 100; // Round to 2 decimals
}

/**
 * Score all keyword candidates
 * @param {Array<Object>} candidates - L2 keyword candidates
 * @returns {Array<Object>} Candidates with scores
 */
function scoreKeywords(candidates) {
  return candidates.map(candidate => ({
    ...candidate,
    composite_score: calculateKeywordScore(candidate)
  }));
}

/**
 * Select final keywords by priority
 * @param {Array<Object>} scoredCandidates - Scored candidates
 * @param {number} primaryCount - Number of primary keywords
 * @param {number} secondaryCount - Number of secondary keywords
 * @returns {Object} Selected keywords
 */
function selectFinalKeywords(scoredCandidates, primaryCount = 5, secondaryCount = 10) {
  // Sort by composite score (descending)
  const sorted = [...scoredCandidates].sort((a, b) => b.composite_score - a.composite_score);

  // Select primary keywords (top N)
  const primary = sorted.slice(0, primaryCount).map(kw => ({
    keyword: kw.keyword,
    type: kw.type,
    search_volume: kw.search_volume,
    competition: kw.competition,
    composite_score: kw.composite_score,
    rationale: kw.rationale || generateRationale(kw, 'primary')
  }));

  // Select secondary keywords (next M)
  const secondary = sorted.slice(primaryCount, primaryCount + secondaryCount).map(kw => ({
    keyword: kw.keyword,
    type: kw.type,
    search_volume: kw.search_volume,
    competition: kw.competition,
    composite_score: kw.composite_score,
    rationale: kw.rationale || generateRationale(kw, 'secondary')
  }));

  return { primary, secondary };
}

/**
 * Generate rationale for keyword selection
 * @param {Object} keyword - Keyword data
 * @param {string} tier - 'primary' or 'secondary'
 * @returns {string} Rationale text
 */
function generateRationale(keyword, tier) {
  const parts = [];

  // Search volume rationale
  if (keyword.search_volume >= 5000) {
    parts.push('높은 검색량');
  } else if (keyword.search_volume >= 1000) {
    parts.push('중간 검색량');
  } else {
    parts.push('타겟 검색량');
  }

  // Competition rationale
  if (keyword.competition === 'low') {
    parts.push('낮은 경쟁도로 상위 노출 유리');
  } else if (keyword.competition === 'medium') {
    parts.push('적정 경쟁도');
  } else {
    parts.push('높은 경쟁도지만 전략적 가치');
  }

  // Type rationale
  if (keyword.type === 'short_term') {
    parts.push('단기 효과 기대');
  } else {
    parts.push('장기 안정적 유입');
  }

  // Tier rationale
  if (tier === 'primary') {
    parts.push('핵심 키워드로 우선 최적화 권장');
  } else {
    parts.push('보조 키워드로 추가 노출 확보');
  }

  return parts.join(', ');
}

/**
 * Determine strategy focus based on keyword distribution
 * @param {Array<Object>} primaryKeywords - Primary keywords
 * @param {Array<Object>} secondaryKeywords - Secondary keywords
 * @returns {string} Focus type: 'short_term', 'long_term', or 'balanced'
 */
function determineStrategyFocus(primaryKeywords, secondaryKeywords) {
  const allKeywords = [...primaryKeywords, ...secondaryKeywords];

  const shortTermCount = allKeywords.filter(kw => kw.type === 'short_term').length;
  const longTermCount = allKeywords.filter(kw => kw.type === 'long_term').length;

  if (shortTermCount > longTermCount * 1.5) {
    return 'short_term';
  } else if (longTermCount > shortTermCount * 1.5) {
    return 'long_term';
  } else {
    return 'balanced';
  }
}

/**
 * Generate strategy recommendations
 * @param {Object} selection - Selected keywords
 * @param {Object} l2Data - L2 input data
 * @returns {Object} Strategy recommendations
 */
function generateStrategyRecommendations(selection, l2Data) {
  const { primary, secondary } = selection;
  const focus = determineStrategyFocus(primary, secondary);

  // Calculate average metrics
  const allSelected = [...primary, ...secondary];
  const avgVolume = Math.round(
    allSelected.reduce((sum, kw) => sum + kw.search_volume, 0) / allSelected.length
  );
  const avgScore = Math.round(
    allSelected.reduce((sum, kw) => sum + kw.composite_score, 0) / allSelected.length * 100
  ) / 100;

  // Determine approach
  let approach;
  if (focus === 'short_term') {
    approach = '단기 성과 중심: 검색량이 높은 키워드로 빠른 유입 확대';
  } else if (focus === 'long_term') {
    approach = '장기 안정성 중심: 경쟁이 낮은 롱테일 키워드로 지속 가능한 노출';
  } else {
    approach = '균형 전략: 단기 성과와 장기 안정성을 모두 고려한 키워드 조합';
  }

  // Expected impact
  let expectedImpact;
  if (avgScore >= 70) {
    expectedImpact = '높음: 선정된 키워드 적용 시 검색 노출 및 유입 크게 개선 예상';
  } else if (avgScore >= 50) {
    expectedImpact = '중간: 점진적인 검색 노출 개선 및 유입 증가 예상';
  } else {
    expectedImpact = '보통: 키워드 최적화를 통한 일부 개선 예상, 추가 분석 권장';
  }

  return {
    focus,
    approach,
    expected_impact: expectedImpact,
    metrics: {
      avg_search_volume: avgVolume,
      avg_composite_score: avgScore,
      total_keywords: allSelected.length
    }
  };
}

/**
 * Generate Naver Place application guide
 * @param {Object} selection - Selected keywords
 * @param {Object} strategy - Strategy recommendations
 * @returns {Object} Application guide
 */
function generateApplicationGuide(selection, strategy) {
  const { primary, secondary } = selection;

  return {
    overview: '네이버 플레이스에 키워드를 적용하여 검색 노출을 최적화하는 단계별 가이드입니다.',

    steps: [
      {
        step: 1,
        title: '네이버 플레이스 관리자 접속',
        description: 'https://m.place.naver.com/my/place 접속 후 로그인',
        action: '업체 선택'
      },
      {
        step: 2,
        title: '업체 정보 수정',
        description: '업체명, 카테고리, 소개 영역에 핵심 키워드 자연스럽게 포함',
        action: `Primary 키워드 활용: ${primary.slice(0, 3).map(k => k.keyword).join(', ')}`,
        tips: [
          '업체명은 변경 불가하므로 소개 문구에 키워드 배치',
          '과도한 키워드 반복은 스팸으로 간주될 수 있으니 자연스럽게 작성'
        ]
      },
      {
        step: 3,
        title: '메뉴 및 상품 정보 최적화',
        description: '메뉴명, 메뉴 설명에 지역+메뉴 키워드 포함',
        action: `Secondary 키워드 활용: ${secondary.slice(0, 3).map(k => k.keyword).join(', ')}`,
        tips: [
          '대표 메뉴에 키워드 집중 배치',
          '가격, 설명란을 적극 활용'
        ]
      },
      {
        step: 4,
        title: '사진 및 게시글 업로드',
        description: '게시글 제목과 본문에 키워드 자연스럽게 포함',
        action: '주 1-2회 정기적으로 게시글 업로드 (키워드 활용)',
        tips: [
          '사진 설명란에도 키워드 포함',
          '이벤트, 신메뉴 소식에 키워드 활용'
        ]
      },
      {
        step: 5,
        title: '리뷰 답글에 키워드 활용',
        description: '고객 리뷰에 답글 작성 시 키워드 자연스럽게 포함',
        action: '긍정적 리뷰에 감사 인사와 함께 키워드 언급',
        tips: [
          '예: "강남역 닭갈비 맛집으로 찾아주셔서 감사합니다"',
          '부정적 리뷰에도 정중하게 대응하며 개선 의지 표현'
        ]
      },
      {
        step: 6,
        title: '효과 모니터링',
        description: '2-4주 후 네이버 플레이스 통계에서 검색 유입 확인',
        action: '검색 키워드 유입 분석 및 추가 최적화',
        tips: [
          '유입이 높은 키워드는 더 강조',
          '유입이 낮은 키워드는 교체 검토'
        ]
      }
    ],

    primary_keywords: primary.map(kw => ({
      keyword: kw.keyword,
      usage: '업체 소개, 메뉴명, 게시글 제목에 우선 사용',
      frequency: '주 2-3회 노출'
    })),

    secondary_keywords: secondary.map(kw => ({
      keyword: kw.keyword,
      usage: '메뉴 설명, 게시글 본문, 리뷰 답글에 사용',
      frequency: '주 1-2회 노출'
    })),

    warnings: [
      '키워드 스터핑(과도한 반복)은 네이버 검색 품질 정책 위반',
      '허위 정보나 과장된 표현은 신고 및 제재 대상',
      '업체와 무관한 키워드 사용 금지',
      '경쟁사 브랜드명 무단 사용 금지'
    ],

    expected_timeline: {
      '1-2주': '초기 키워드 인덱싱 시작',
      '2-4주': '검색 노출 증가 시작',
      '1-2개월': '유입 안정화 및 효과 측정',
      '3개월+': '장기 전략 평가 및 키워드 조정'
    }
  };
}

/**
 * Write L3 output files
 * @param {Object} results - L3 processing results
 */
function writeL3Outputs(results) {
  const config = configManager.getAll();
  const outputDir = configManager.getAbsolutePath(path.join(config.paths.data.output, 'l3'));

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write keyword_strategy.json
  const outputPath = path.join(outputDir, 'keyword_strategy.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  logger.info(`Wrote keyword_strategy.json`);
}

/**
 * Process L3 for a place
 * @param {string} placeId - Place ID
 * @param {Object} l2Result - L2 result for place
 * @returns {Object} L3 result
 */
export function processL3ForPlace(placeId, l2Result) {
  logger.info(`Starting L3 processing for place ${placeId}`);

  const { candidates } = l2Result;

  if (!candidates || candidates.length === 0) {
    throw createError('E_L3_001', { placeId, reason: 'No candidates from L2' });
  }

  // Minimum candidate threshold
  if (candidates.length < 10) {
    logger.warn(`Place ${placeId} has only ${candidates.length} candidates, below recommended 10+`);
  }

  try {
    // Step 1: Score all keywords
    const scoredCandidates = scoreKeywords(candidates);

    // Step 2: Select final keywords
    const selection = selectFinalKeywords(scoredCandidates, 5, 10);

    // Step 3: Generate strategy
    const strategy = generateStrategyRecommendations(selection, l2Result);

    // Step 4: Generate application guide
    const applicationGuide = generateApplicationGuide(selection, strategy);

    const result = {
      place_id: placeId,
      timestamp: new Date().toISOString(),

      primary_keywords: selection.primary,
      secondary_keywords: selection.secondary,

      strategy,
      application_guide: applicationGuide,

      metadata: {
        total_candidates_analyzed: candidates.length,
        primary_count: selection.primary.length,
        secondary_count: selection.secondary.length,
        avg_primary_score: Math.round(
          selection.primary.reduce((sum, k) => sum + k.composite_score, 0) / selection.primary.length * 100
        ) / 100,
        avg_secondary_score: Math.round(
          selection.secondary.reduce((sum, k) => sum + k.composite_score, 0) / selection.secondary.length * 100
        ) / 100
      }
    };

    logger.info(`L3 processing completed for place ${placeId}: ${selection.primary.length} primary + ${selection.secondary.length} secondary keywords selected`);

    return result;

  } catch (error) {
    if (error.code && error.code.startsWith('E_L3')) {
      throw error;
    }
    logger.error(`L3 scoring failed for place ${placeId}`, { error: error.message });
    throw createError('E_L3_002', { placeId, originalError: error.message });
  }
}

/**
 * Process L3 from L2 output file
 * @param {string} inputPath - Path to L2 output file
 * @param {Object} options - Processing options
 * @returns {Object} L3 results
 */
export async function processL3(inputPath, options = {}) {
  logger.info('Starting L3 processing');

  // Load L2 data
  const l2Data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

  const placeIds = Object.keys(l2Data.places || {});

  if (placeIds.length === 0) {
    throw createError('E_L3_001', { reason: 'No places found in L2 data' });
  }

  logger.info(`Processing L3 for ${placeIds.length} place(s)`);

  const results = {};
  const errors = [];

  // Process each place
  for (const placeId of placeIds) {
    try {
      const result = processL3ForPlace(placeId, l2Data.places[placeId]);
      results[placeId] = result;
    } catch (error) {
      logger.error(`Failed to process L3 for place ${placeId}`, { error: error.message });
      errors.push({
        code: error.code || 'E_L3_002',
        placeId,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  const finalResults = {
    timestamp: new Date().toISOString(),
    places: results,
    statistics: {
      total_places: placeIds.length,
      successful: Object.keys(results).length,
      failed: errors.length
    },
    errors
  };

  // Write outputs
  writeL3Outputs(finalResults);

  logger.info(`L3 processing completed: ${finalResults.statistics.successful}/${finalResults.statistics.total_places} successful`);

  return finalResults;
}

export default {
  processL3,
  processL3ForPlace,
  calculateKeywordScore,
  selectFinalKeywords
};
