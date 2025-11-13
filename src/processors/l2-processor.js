/**
 * L2 Processor - AI-based Keyword Analysis
 * Generates keyword candidates from L1 data using keyword matrix and AI analysis
 */

import fs from 'fs';
import path from 'path';
import configManager from '../services/config-manager.js';
import logger from '../lib/logger.js';
import { analyzeKeywords } from '../services/ai-api.js';
import { getSearchVolume } from '../services/naver-api.js';
import { createError } from '../lib/errors.js';

/**
 * Generate keyword matrix by combining elements
 * @param {Object} keywordElements - Keyword elements from L1
 * @returns {Array<string>} Array of keyword combinations
 */
function generateKeywordMatrix(keywordElements) {
  const matrix = [];

  const { core_elements, region_elements, menu_elements, attribute_elements } = keywordElements;

  // Extract arrays from elements
  const regions = [
    region_elements.station,
    region_elements.dong,
    region_elements.gu,
    region_elements.si
  ].filter(Boolean);

  const categories = [core_elements.category].filter(Boolean);
  const menus = menu_elements.all_menus || [];
  const recommended = menu_elements.recommended || [];
  const attributes = [
    ...(attribute_elements.facilities || []),
    ...(attribute_elements.specialties || [])
  ];

  // Strategy 1: Region + Category
  regions.forEach(region => {
    categories.forEach(category => {
      matrix.push(`${region} ${category}`);
    });
  });

  // Strategy 2: Region + Category + Menu
  regions.forEach(region => {
    categories.forEach(category => {
      recommended.slice(0, 3).forEach(menu => {
        matrix.push(`${region} ${category} ${menu}`);
      });
    });
  });

  // Strategy 3: Category + Menu (short-tail)
  categories.forEach(category => {
    recommended.slice(0, 5).forEach(menu => {
      matrix.push(`${category} ${menu}`);
    });
  });

  // Strategy 4: Region + Menu
  regions.slice(0, 2).forEach(region => {
    recommended.slice(0, 3).forEach(menu => {
      matrix.push(`${region} ${menu}`);
    });
  });

  // Strategy 5: Brand name + Category
  if (core_elements.brand_name) {
    categories.forEach(category => {
      matrix.push(`${core_elements.brand_name} ${category}`);
    });
  }

  // Strategy 6: Attributes + Category
  attributes.slice(0, 3).forEach(attr => {
    categories.forEach(category => {
      const cleanAttr = attr.replace(/가능$/, '').trim();
      if (cleanAttr.length > 1) {
        matrix.push(`${cleanAttr} ${category}`);
      }
    });
  });

  // Deduplicate and normalize
  const uniqueKeywords = [...new Set(matrix)]
    .map(k => k.trim().replace(/\s+/g, ' '))
    .filter(k => k.length >= 3 && k.length <= 50);

  logger.info(`Generated keyword matrix: ${uniqueKeywords.length} unique combinations`);

  return uniqueKeywords;
}

/**
 * Load industry-specific prompt template
 * @param {string} category - Place category
 * @returns {string} Prompt template content
 */
function loadIndustryPrompt(category) {
  const config = configManager.getAll();

  // Map category to prompt file
  const categoryMap = {
    '닭갈비': 'restaurant',
    '한식': 'restaurant',
    '중식': 'restaurant',
    '일식': 'restaurant',
    '양식': 'restaurant',
    '카페': 'cafe',
    '디저트': 'cafe',
    '베이커리': 'cafe',
    '병원': 'medical',
    '의원': 'medical',
    '치과': 'medical',
    '약국': 'medical',
    '미용실': 'beauty',
    '네일샵': 'beauty',
    '피부과': 'beauty'
  };

  const promptType = categoryMap[category] || 'restaurant';
  const promptPath = configManager.getAbsolutePath(
    path.join('src/lib/prompts', `${promptType}.txt`)
  );

  try {
    if (fs.existsSync(promptPath)) {
      const content = fs.readFileSync(promptPath, 'utf-8');
      logger.info(`Loaded industry prompt: ${promptType}`);
      return content;
    }
  } catch (error) {
    logger.warn(`Failed to load prompt ${promptType}, using default`, { error: error.message });
  }

  // Default prompt
  return `You are a Naver Place SEO expert specializing in keyword analysis.
Analyze the provided place data and keyword candidates to recommend optimal keywords for Naver search exposure.

Focus on:
1. High search volume keywords with moderate competition
2. Location-specific keywords (region + category)
3. Menu-based keywords for food businesses
4. Long-tail keywords for niche targeting
5. Seasonal and trending keywords

Provide relevance scores (0-100) and rationale for each recommended keyword.`;
}

/**
 * Classify keyword type based on characteristics
 * @param {string} keyword - Keyword to classify
 * @param {Object} keywordElements - Original keyword elements
 * @returns {Object} Classification info
 */
function classifyKeyword(keyword, keywordElements) {
  const wordCount = keyword.split(' ').length;
  const hasRegion = keywordElements.region_elements.si ||
                    keywordElements.region_elements.gu ||
                    keywordElements.region_elements.station;
  const hasMenu = keywordElements.menu_elements.all_menus.some(menu =>
    keyword.includes(menu)
  );

  // Determine type
  let type = 'long_term'; // default
  if (wordCount <= 2) {
    type = 'short_term'; // Short, broad keywords
  } else if (wordCount >= 3) {
    type = 'long_term'; // Specific, long-tail keywords
  }

  // Determine classification
  let classification = 'sub'; // default
  if (keyword.includes(keywordElements.core_elements.category)) {
    classification = 'main';
  }
  if (keyword.includes(keywordElements.core_elements.brand_name)) {
    classification = 'main';
  }

  return { type, classification };
}

/**
 * Fetch search volumes for keyword candidates
 * @param {Array<string>} keywords - Keywords to analyze
 * @returns {Promise<Object>} Map of keyword to search volume data
 */
async function fetchSearchVolumes(keywords) {
  const searchData = {};
  const config = configManager.getAll();
  const rateLimit = config.naver?.rate_limit || 10; // requests per second
  const delayMs = 1000 / rateLimit;

  logger.info(`Fetching search volumes for ${keywords.length} keywords (rate: ${rateLimit}/s)`);

  for (let i = 0; i < keywords.length; i++) {
    const keyword = keywords[i];

    try {
      const volume = await getSearchVolume(keyword);
      searchData[keyword] = {
        monthly_avg: volume.monthlySearchVolume || 0,
        competition: volume.competition || 'low',
        trend: volume.trend || 'stable'
      };

      // Rate limiting
      if (i < keywords.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

      if ((i + 1) % 50 === 0) {
        logger.info(`Progress: ${i + 1}/${keywords.length} keywords processed`);
      }

    } catch (error) {
      logger.warn(`Failed to get search volume for "${keyword}"`, { error: error.message });
      searchData[keyword] = {
        monthly_avg: 0,
        competition: 'unknown',
        trend: 'unknown'
      };
    }
  }

  logger.info('Search volume fetching completed');
  return searchData;
}

/**
 * Generate keyword candidates with metadata
 * @param {Array<string>} matrix - Keyword matrix
 * @param {Object} searchData - Search volume data
 * @param {Object} keywordElements - Original elements
 * @returns {Array<Object>} Keyword candidates
 */
function generateCandidates(matrix, searchData, keywordElements) {
  const candidates = matrix.map(keyword => {
    const { type, classification } = classifyKeyword(keyword, keywordElements);
    const volumeData = searchData[keyword] || { monthly_avg: 0, competition: 'unknown', trend: 'unknown' };

    return {
      keyword,
      type,
      classification,
      search_volume: volumeData.monthly_avg,
      competition: volumeData.competition,
      trend: volumeData.trend,
      relevance_score: null, // Will be filled by AI
      rationale: null // Will be filled by AI
    };
  });

  logger.info(`Generated ${candidates.length} keyword candidates`);
  return candidates;
}

/**
 * Compare with current keywords and calculate improvements
 * @param {Array<Object>} newCandidates - New keyword candidates
 * @param {Object} currentKeywords - Current keywords from L1
 * @returns {Object} Comparison analysis
 */
function compareWithCurrentKeywords(newCandidates, currentKeywords) {
  if (!currentKeywords) {
    return {
      has_comparison: false,
      message: 'No current keywords to compare'
    };
  }

  const allCurrent = [
    ...(currentKeywords.primary_keywords || []),
    ...(currentKeywords.secondary_keywords || [])
  ];

  const newKeywords = newCandidates.map(c => c.keyword);
  const overlap = allCurrent.filter(k => newKeywords.includes(k));
  const newOnly = newKeywords.filter(k => !allCurrent.includes(k));

  // Calculate average search volume improvement
  const currentAvgVolume = currentKeywords.performance?.avg_monthly_searches || 0;
  const newAvgVolume = newCandidates.reduce((sum, c) => sum + c.search_volume, 0) / newCandidates.length;
  const volumeImprovement = ((newAvgVolume - currentAvgVolume) / currentAvgVolume * 100).toFixed(1);

  return {
    has_comparison: true,
    current_keyword_count: allCurrent.length,
    new_candidate_count: newCandidates.length,
    overlap_count: overlap.length,
    new_keywords_count: newOnly.length,
    current_avg_volume: currentAvgVolume,
    new_avg_volume: Math.round(newAvgVolume),
    volume_improvement_percent: parseFloat(volumeImprovement),
    recommendation: volumeImprovement > 0
      ? 'New keywords show potential for increased search exposure'
      : 'Consider refining keyword strategy to improve search volume'
  };
}

/**
 * Write L2 output files
 * @param {Object} results - L2 processing results
 */
function writeL2Outputs(results) {
  const config = configManager.getAll();
  const outputDir = configManager.getAbsolutePath(path.join(config.paths.data.output, 'l2'));

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write target_keywords_l2.json
  const outputPath = path.join(outputDir, 'target_keywords_l2.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  logger.info(`Wrote target_keywords_l2.json: ${results.candidates?.length || 0} candidates`);
}

/**
 * Process L2 for a place
 * @param {string} placeId - Place ID
 * @param {Object} l1Data - L1 data collected
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} L2 results
 */
export async function processL2ForPlace(placeId, l1Data, options = {}) {
  const { useAI = true } = options;

  logger.info(`Starting L2 processing for place ${placeId}`);

  const keywordElements = l1Data.keyword_elements?.[placeId];
  const currentKeywords = l1Data.data_collected?.[placeId]?.current_keywords;

  if (!keywordElements) {
    throw createError('E_L2_004', { placeId });
  }

  // Step 1: Generate keyword matrix
  const matrix = generateKeywordMatrix(keywordElements);

  if (matrix.length === 0) {
    throw createError('E_L2_004', { placeId, reason: 'Empty keyword matrix' });
  }

  // Step 2: Fetch search volumes
  const searchData = await fetchSearchVolumes(matrix);

  // Step 3: Generate candidates
  const candidates = generateCandidates(matrix, searchData, keywordElements);

  // Step 4: AI analysis (if enabled)
  let aiAnalysisUsed = false;
  if (useAI && !configManager.isAiMockMode()) {
    try {
      const category = keywordElements.core_elements.category;
      const industryPrompt = loadIndustryPrompt(category);

      const aiResult = await analyzeKeywords(candidates, {
        placeData: l1Data.data_collected[placeId].place,
        keywordElements,
        industryPrompt
      });

      // Merge AI scores back into candidates
      aiResult.keywords.forEach(aiKw => {
        const candidate = candidates.find(c => c.keyword === aiKw.keyword);
        if (candidate) {
          candidate.relevance_score = aiKw.relevance_score;
          candidate.rationale = aiKw.rationale;
        }
      });

      aiAnalysisUsed = true;
      logger.info('AI analysis completed successfully');

    } catch (error) {
      logger.warn('AI analysis failed, continuing without AI scores', { error: error.message });
    }
  } else {
    logger.info('AI analysis skipped (mock mode or disabled)');
  }

  // Step 5: Compare with current keywords
  const comparison = compareWithCurrentKeywords(candidates, currentKeywords);

  // Step 6: Build L2 result
  const result = {
    place_id: placeId,
    timestamp: new Date().toISOString(),
    matrix_size: matrix.length,
    candidates,
    ai_analysis_used: aiAnalysisUsed,
    comparison,
    metadata: {
      category: keywordElements.core_elements.category,
      region: keywordElements.region_elements.gu || keywordElements.region_elements.si,
      total_candidates: candidates.length,
      avg_search_volume: Math.round(
        candidates.reduce((sum, c) => sum + c.search_volume, 0) / candidates.length
      )
    }
  };

  logger.info(`L2 processing completed for place ${placeId}: ${candidates.length} candidates generated`);

  return result;
}

/**
 * Process L2 from L1 output file
 * @param {string} inputPath - Path to L1 output file or directory
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} L2 results
 */
export async function processL2(inputPath, options = {}) {
  logger.info('Starting L2 processing');

  // Load L1 data
  let l1Data;

  // Check if inputPath is a directory or file
  const stats = fs.statSync(inputPath);

  if (stats.isDirectory()) {
    // Load from directory
    const dataCollectedPath = path.join(inputPath, 'data_collected_l1.json');
    const keywordElementsPath = path.join(inputPath, 'keyword_elements_l1.json');

    if (!fs.existsSync(dataCollectedPath) || !fs.existsSync(keywordElementsPath)) {
      throw createError('E_L2_004', { reason: 'L1 output files not found in directory' });
    }

    l1Data = {
      data_collected: JSON.parse(fs.readFileSync(dataCollectedPath, 'utf-8')),
      keyword_elements: JSON.parse(fs.readFileSync(keywordElementsPath, 'utf-8'))
    };

  } else {
    // Load from single file
    const content = fs.readFileSync(inputPath, 'utf-8');
    l1Data = JSON.parse(content);
  }

  const placeIds = Object.keys(l1Data.keyword_elements || {});

  if (placeIds.length === 0) {
    throw createError('E_L2_004', { reason: 'No places found in L1 data' });
  }

  logger.info(`Processing L2 for ${placeIds.length} place(s)`);

  const results = {};
  const errors = [];

  // Process each place
  for (const placeId of placeIds) {
    try {
      const result = await processL2ForPlace(placeId, l1Data, options);
      results[placeId] = result;
    } catch (error) {
      logger.error(`Failed to process L2 for place ${placeId}`, { error: error.message });
      errors.push({
        code: error.code || 'E_L2_004',
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
  writeL2Outputs(finalResults);

  logger.info(`L2 processing completed: ${finalResults.statistics.successful}/${finalResults.statistics.total_places} successful`);

  return finalResults;
}

export default {
  processL2,
  processL2ForPlace,
  generateKeywordMatrix,
  loadIndustryPrompt
};
