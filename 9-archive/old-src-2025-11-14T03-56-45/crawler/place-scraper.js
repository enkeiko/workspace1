/**
 * Place Scraper - High-level scraping interface
 * Wrapper around ultimate-scraper with additional utilities
 */

import { scrapePlaceData } from './ultimate-scraper.js';
import { scrapeBatch } from './batch-scraper.js';
import fs from 'fs';
import path from 'path';
import configManager from '../services/config-manager.js';
import logger from '../lib/logger.js';
import { createError } from '../lib/errors.js';

/**
 * Load place data from file (for testing/offline mode)
 * @param {string} placeId - Place ID
 * @returns {Object} Place data
 */
export function loadPlaceDataFromFile(placeId) {
  const config = configManager.getAll();
  const placesDir = configManager.getAbsolutePath(config.paths.places_advanced);
  const filePath = path.join(placesDir, `place-${placeId}-FULL.json`);

  try {
    if (!fs.existsSync(filePath)) {
      throw createError('E_L1_001', { placeId, filePath });
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const placeData = JSON.parse(fileContent);

    logger.debug(`Loaded place ${placeId} from file`);
    return placeData;

  } catch (error) {
    if (error.code && error.code.startsWith('E_L1')) {
      throw error;
    }
    throw createError('E_SYS_003', { placeId, filePath, originalError: error.message });
  }
}

/**
 * Save place data to file
 * @param {string} placeId - Place ID
 * @param {Object} placeData - Place data
 */
export function savePlaceDataToFile(placeId, placeData) {
  const config = configManager.getAll();
  const placesDir = configManager.getAbsolutePath(config.paths.places_advanced);

  // Ensure directory exists
  if (!fs.existsSync(placesDir)) {
    fs.mkdirSync(placesDir, { recursive: true });
  }

  const filePath = path.join(placesDir, `place-${placeId}-FULL.json`);

  try {
    fs.writeFileSync(filePath, JSON.stringify(placeData, null, 2), 'utf-8');
    logger.debug(`Saved place ${placeId} to file`);
  } catch (error) {
    throw createError('E_SYS_002', { placeId, filePath, originalError: error.message });
  }
}

/**
 * Scrape and save place data
 * @param {string} placeId - Place ID
 * @param {Object} options - Scraper options
 * @returns {Promise<Object>} Place data
 */
export async function scrapeAndSave(placeId, options = {}) {
  const placeData = await scrapePlaceData(placeId, options);
  savePlaceDataToFile(placeId, placeData);
  return placeData;
}

/**
 * Get place data (from file or scrape)
 * @param {string} placeId - Place ID
 * @param {Object} options - Options
 * @returns {Promise<Object>} Place data
 */
export async function getPlaceData(placeId, options = {}) {
  const { forceRefresh = false, saveToFile = true } = options;

  // Try to load from file first if not forcing refresh
  if (!forceRefresh) {
    try {
      return loadPlaceDataFromFile(placeId);
    } catch (error) {
      logger.debug(`Place ${placeId} not found in cache, scraping...`);
    }
  }

  // Scrape fresh data
  const placeData = await scrapePlaceData(placeId);

  // Save to file if requested
  if (saveToFile) {
    savePlaceDataToFile(placeId, placeData);
  }

  return placeData;
}

/**
 * Load place IDs from file
 * @param {string} filePath - Path to place IDs file (one ID per line)
 * @returns {string[]} Array of place IDs
 */
export function loadPlaceIdsFromFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw createError('E_SYS_003', { filePath, reason: 'File not found' });
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const placeIds = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#')); // Filter empty lines and comments

    logger.info(`Loaded ${placeIds.length} place IDs from ${filePath}`);
    return placeIds;

  } catch (error) {
    if (error.code && error.code.startsWith('E_')) {
      throw error;
    }
    throw createError('E_SYS_003', { filePath, originalError: error.message });
  }
}

export default {
  scrapePlaceData,
  scrapeBatch,
  loadPlaceDataFromFile,
  savePlaceDataToFile,
  scrapeAndSave,
  getPlaceData,
  loadPlaceIdsFromFile
};
