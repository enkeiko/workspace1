/**
 * L1 Processor - Data Collection & Organization
 * Collects data, parses address, validates fields, extracts keyword elements
 */

import fs from 'fs';
import path from 'path';
import { getPlaceData, loadPlaceIdsFromFile } from '../crawler/place-scraper.js';
import { scrapeBatch } from '../crawler/batch-scraper.js';
import configManager from '../services/config-manager.js';
import logger, { logProgress } from '../lib/logger.js';
import { validatePlaceOrThrow, checkDataCompleteness } from '../lib/validators.js';
import { createError } from '../lib/errors.js';

/**
 * Parse address into components (si/gu/dong/station)
 * @param {string} address - Full address string
 * @returns {Object} Parsed address components
 */
function parseAddress(address) {
  if (!address) {
    return { si: null, gu: null, dong: null, station: null };
  }

  const parts = address.split(' ').filter(p => p.trim());
  const result = { si: null, gu: null, dong: null, station: null };

  // Extract si (city/province)
  if (parts.length > 0) {
    result.si = parts[0];
  }

  // Extract gu (district)
  if (parts.length > 1 && (parts[1].endsWith('구') || parts[1].endsWith('군'))) {
    result.gu = parts[1];
  }

  // Extract dong (neighborhood)
  for (const part of parts) {
    if (part.endsWith('동') || part.endsWith('읍') || part.endsWith('면')) {
      result.dong = part;
      break;
    }
  }

  // Station extraction would require additional logic or external data
  // For now, leave as null (can be added from manual_notes)

  return result;
}

/**
 * Extract keyword elements from place data
 * @param {Object} place - Place data
 * @param {Object} currentKeywords - Current keywords (optional)
 * @param {Object} manualNotes - Manual notes (optional)
 * @returns {Object} Keyword elements
 */
function extractKeywordElements(place, currentKeywords = null, manualNotes = null) {
  const addressParts = parseAddress(place.roadAddress || place.address);

  return {
    core_elements: {
      category: place.category || '',
      brand_name: place.name || ''
    },

    region_elements: {
      si: addressParts.si,
      gu: addressParts.gu,
      dong: addressParts.dong,
      station: manualNotes?.station || null
    },

    menu_elements: {
      all_menus: place.menus ? place.menus.map(m => m.name).filter(Boolean) : [],
      recommended: place.menus ? place.menus.filter(m => m.recommend).map(m => m.name).filter(Boolean) : [],
      representative: manualNotes?.representative_menu || []
    },

    attribute_elements: {
      facilities: place.facilities?.conveniences || [],
      specialties: manualNotes?.special_notes ? [manualNotes.special_notes] : []
    },

    current_keywords: currentKeywords || null,

    business_context: {
      target_keywords: manualNotes?.target_keywords || [],
      goals: manualNotes?.business_goals || null
    }
  };
}

/**
 * Load optional input files
 * @returns {Object} Loaded data
 */
function loadOptionalInputs() {
  const config = configManager.getAll();
  const result = {
    currentKeywords: {},
    manualNotes: {}
  };

  // Load current keywords
  const currentKeywordsPath = configManager.getAbsolutePath(config.paths.current_keywords);
  if (fs.existsSync(currentKeywordsPath)) {
    try {
      const content = fs.readFileSync(currentKeywordsPath, 'utf-8');
      result.currentKeywords = JSON.parse(content);
      logger.info(`Loaded current keywords: ${Object.keys(result.currentKeywords).length} places`);
    } catch (error) {
      logger.warn('Failed to load current_keywords.json', { error: error.message });
    }
  }

  // Load manual notes
  const manualNotesPath = configManager.getAbsolutePath(config.paths.manual_notes);
  if (fs.existsSync(manualNotesPath)) {
    try {
      const content = fs.readFileSync(manualNotesPath, 'utf-8');
      result.manualNotes = JSON.parse(content);
      logger.info(`Loaded manual notes: ${Object.keys(result.manualNotes).length} places`);
    } catch (error) {
      logger.warn('Failed to load manual_notes.json', { error: error.message });
    }
  }

  return result;
}

/**
 * Write L1 output files
 * @param {Object} results - L1 processing results
 */
function writeL1Outputs(results) {
  const config = configManager.getAll();
  const outputDir = configManager.getAbsolutePath(path.join(config.paths.data.output, 'l1'));

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write data_collected_l1.json
  const dataCollectedPath = path.join(outputDir, 'data_collected_l1.json');
  fs.writeFileSync(dataCollectedPath, JSON.stringify(results.dataCollected, null, 2), 'utf-8');
  logger.info(`Wrote data_collected_l1.json: ${Object.keys(results.dataCollected).length} places`);

  // Write keyword_elements_l1.json
  const keywordElementsPath = path.join(outputDir, 'keyword_elements_l1.json');
  fs.writeFileSync(keywordElementsPath, JSON.stringify(results.keywordElements, null, 2), 'utf-8');
  logger.info(`Wrote keyword_elements_l1.json: ${Object.keys(results.keywordElements).length} places`);

  // Write errors if any
  if (results.errors.length > 0) {
    const errorsPath = path.join(outputDir, 'l1_errors.json');
    fs.writeFileSync(errorsPath, JSON.stringify(results.errors, null, 2), 'utf-8');
    logger.info(`Wrote l1_errors.json: ${results.errors.length} errors`);
  }
}

/**
 * Process L1 for multiple places
 * @param {string[]} placeIds - Array of place IDs
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Processing results
 */
export async function processL1(placeIds, options = {}) {
  const {
    forceRefresh = false,
    useBatchScraping = true
  } = options;

  logger.info(`Starting L1 processing for ${placeIds.length} places`);

  const results = {
    dataCollected: {},
    keywordElements: {},
    errors: [],
    statistics: {
      total: placeIds.length,
      successful: 0,
      failed: 0,
      startTime: Date.now()
    }
  };

  // Load optional inputs
  const { currentKeywords, manualNotes } = loadOptionalInputs();

  // Batch scraping if enabled and multiple places
  if (useBatchScraping && placeIds.length > 1) {
    logger.info('Using batch scraping mode');

    const batchResults = await scrapeBatch(placeIds, {
      onProgress: (current, total, placeId, error) => {
        if (error) {
          results.statistics.failed++;
        } else {
          results.statistics.successful++;
        }
      }
    });

    // Process successful scrapes
    for (const { placeId, data: place } of batchResults.successful) {
      try {
        // Validate place data
        validatePlaceOrThrow(place);

        // Check data completeness
        const completeness = checkDataCompleteness(place);

        // Build L1 data collected
        results.dataCollected[placeId] = {
          place,
          current_keywords: currentKeywords[placeId] || null,
          manual_notes: manualNotes[placeId] || null,
          metadata: {
            has_current_keywords: !!currentKeywords[placeId],
            has_manual_notes: !!manualNotes[placeId],
            review_count: place.reviewStats?.total || 0,
            photo_count: place.images?.all?.length || 0,
            menu_count: place.menus?.length || 0,
            completeness: completeness.completeness,
            missing_fields: completeness.missing
          }
        };

        // Extract keyword elements
        results.keywordElements[placeId] = extractKeywordElements(
          place,
          currentKeywords[placeId],
          manualNotes[placeId]
        );

        logger.info(`✓ Processed place ${placeId} (completeness: ${completeness.completeness}%)`);

      } catch (error) {
        logger.error(`Failed to process place ${placeId}`, { error: error.message });
        results.errors.push({
          code: error.code || 'E_L1_002',
          placeId,
          message: error.message,
          timestamp: new Date().toISOString()
        });
        results.statistics.failed++;
      }
    }

    // Add failed scrapes to errors
    for (const { placeId, error, code } of batchResults.failed) {
      results.errors.push({
        code: code || 'E_L1_001',
        placeId,
        message: error,
        timestamp: new Date().toISOString()
      });
    }

  } else {
    // Sequential processing for single place or when batch disabled
    logger.info('Using sequential processing mode');

    for (let i = 0; i < placeIds.length; i++) {
      const placeId = placeIds[i];

      try {
        logProgress(i + 1, placeIds.length, `Processing place ${placeId}`);

        // Get place data (from cache or scrape)
        const place = await getPlaceData(placeId, { forceRefresh });

        // Validate place data
        validatePlaceOrThrow(place);

        // Check data completeness
        const completeness = checkDataCompleteness(place);

        // Build L1 data collected
        results.dataCollected[placeId] = {
          place,
          current_keywords: currentKeywords[placeId] || null,
          manual_notes: manualNotes[placeId] || null,
          metadata: {
            has_current_keywords: !!currentKeywords[placeId],
            has_manual_notes: !!manualNotes[placeId],
            review_count: place.reviewStats?.total || 0,
            photo_count: place.images?.all?.length || 0,
            menu_count: place.menus?.length || 0,
            completeness: completeness.completeness,
            missing_fields: completeness.missing
          }
        };

        // Extract keyword elements
        results.keywordElements[placeId] = extractKeywordElements(
          place,
          currentKeywords[placeId],
          manualNotes[placeId]
        );

        results.statistics.successful++;
        logger.info(`✓ Processed place ${placeId} (completeness: ${completeness.completeness}%)`);

      } catch (error) {
        logger.error(`Failed to process place ${placeId}`, { error: error.message });
        results.errors.push({
          code: error.code || 'E_L1_001',
          placeId,
          message: error.message,
          timestamp: new Date().toISOString()
        });
        results.statistics.failed++;
      }
    }
  }

  results.statistics.endTime = Date.now();
  results.statistics.duration = results.statistics.endTime - results.statistics.startTime;
  results.statistics.successRate = ((results.statistics.successful / results.statistics.total) * 100).toFixed(2);

  // Write outputs
  writeL1Outputs(results);

  logger.info(`L1 processing completed: ${results.statistics.successful}/${results.statistics.total} successful (${results.statistics.successRate}%)`);
  logger.info(`Duration: ${(results.statistics.duration / 1000).toFixed(2)}s`);

  return results;
}

/**
 * Process L1 from place IDs file
 * @param {string} inputFile - Path to place IDs file
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Processing results
 */
export async function processL1FromFile(inputFile, options = {}) {
  const placeIds = loadPlaceIdsFromFile(inputFile);
  return processL1(placeIds, options);
}

export default {
  processL1,
  processL1FromFile,
  parseAddress,
  extractKeywordElements
};
