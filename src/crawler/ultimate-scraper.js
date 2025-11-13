/**
 * Ultimate Scraper - Playwright-based Naver Place crawler
 * Bot detection evasion: 30s wait, auto-retry
 * Apollo State parsing for comprehensive data extraction
 */

import { chromium } from 'playwright';
import configManager from '../services/config-manager.js';
import logger from '../lib/logger.js';
import { createError } from '../lib/errors.js';

/**
 * Parse Apollo State from HTML
 * @param {string} html - HTML content
 * @returns {Object} Parsed Apollo State
 */
function parseApolloState(html) {
  try {
    const apolloMatch = html.match(/window\.__APOLLO_STATE__\s*=\s*({.+?});/s);
    if (!apolloMatch) {
      throw new Error('Apollo State not found in HTML');
    }
    return JSON.parse(apolloMatch[1]);
  } catch (error) {
    logger.error('Failed to parse Apollo State', { error: error.message });
    throw createError('E_L1_004', { reason: error.message });
  }
}

/**
 * Extract menus from Apollo State
 * @param {Object} state - Apollo State object
 * @param {string} placeId - Place ID
 * @returns {Array} Menu items
 */
function extractMenus(state, placeId) {
  const menus = [];

  for (const key of Object.keys(state)) {
    if (key.startsWith(`Menu:${placeId}_`)) {
      const menu = state[key];
      menus.push({
        name: menu.name || '',
        price: menu.price || null,
        priceFormatted: menu.priceFormatted || null,
        description: menu.description || '',
        recommend: menu.recommend || false,
        images: menu.images || []
      });
    }
  }

  return menus;
}

/**
 * Extract blog reviews from Apollo State
 * @param {Object} state - Apollo State object
 * @returns {Array} Blog reviews
 */
function extractBlogReviews(state) {
  const reviews = [];

  for (const key of Object.keys(state)) {
    if (key.startsWith('BlogReview:')) {
      const review = state[key];
      reviews.push({
        id: review.id || key,
        title: review.title || '',
        contents: review.contents || '',
        author: review.author || '',
        date: review.date || '',
        url: review.url || '',
        images: review.images || [],
        tags: review.tags || [],
        rank: review.rank || null
      });
    }
  }

  return reviews;
}

/**
 * Categorize images by type
 * @param {Object} state - Apollo State object
 * @returns {Object} Categorized images
 */
function categorizeImages(state) {
  const images = {
    menu: [],
    interior: [],
    food: [],
    all: []
  };

  for (const key of Object.keys(state)) {
    if (key.startsWith('Image:')) {
      const image = state[key];
      const imageData = {
        url: image.url || image.imageUrl || '',
        description: image.description || '',
        category: image.category || 'unknown'
      };

      images.all.push(imageData);

      if (image.category === 'MENU') {
        images.menu.push(imageData);
      } else if (image.category === 'INTERIOR') {
        images.interior.push(imageData);
      } else if (image.category === 'FOOD') {
        images.food.push(imageData);
      }
    }
  }

  return images;
}

/**
 * Parse place data from Apollo State
 * @param {Object} state - Apollo State object
 * @param {string} placeId - Place ID
 * @returns {Object} Place data
 */
function parsePlaceData(state, placeId) {
  const placeKey = `PlaceDetailBase:${placeId}`;
  const placeData = state[placeKey];

  if (!placeData) {
    throw createError('E_L1_004', {
      placeId,
      reason: `PlaceDetailBase:${placeId} not found in Apollo State`
    });
  }

  const menus = extractMenus(state, placeId);
  const blogReviews = extractBlogReviews(state);
  const images = categorizeImages(state);

  return {
    id: placeId,
    name: placeData.name || '',
    category: placeData.category || '',
    roadAddress: placeData.roadAddress || '',
    address: placeData.address || '',
    phone: placeData.phone || null,
    virtualPhone: placeData.virtualPhone || null,
    talktalkUrl: placeData.talktalkUrl || null,
    coordinate: {
      lat: placeData.coordinate?.lat || 0,
      lng: placeData.coordinate?.lng || 0
    },
    menus,
    reviewStats: {
      total: placeData.visitorReviewsTotal || 0,
      textTotal: placeData.visitorReviewsTextReviewTotal || 0,
      score: placeData.visitorReviewsScore || 0,
      microReviews: placeData.microReviews || []
    },
    blogReviews,
    images,
    facilities: {
      conveniences: placeData.conveniences || [],
      paymentInfo: placeData.paymentInfo || [],
      parkingInfo: placeData.parkingInfo || null
    },
    visitorReviewsCount: placeData.visitorReviewsCount || 0,
    blogReviewCount: blogReviews.length,
    rating: placeData.visitorReviewsScore || 0,
    businessHours: placeData.businessHours || null,
    url: `https://m.place.naver.com/place/${placeId}/home`,
    collectedAt: new Date().toISOString()
  };
}

/**
 * Scrape single place data
 * @param {string} placeId - Naver Place ID
 * @param {Object} options - Scraper options
 * @returns {Promise<Object>} Place data
 */
export async function scrapePlaceData(placeId, options = {}) {
  const config = configManager.getAll();
  const {
    maxRetries = config.crawler.max_retries,
    botDetectionWait = config.crawler.bot_detection_wait,
    timeout = config.crawler.timeout
  } = options;

  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let browser = null;

    try {
      logger.info(`Scraping place ${placeId} (attempt ${attempt}/${maxRetries})`);

      // Launch browser
      browser = await chromium.launch({
        headless: config.crawler.headless,
        timeout
      });

      const context = await browser.newContext({
        userAgent: config.crawler.user_agent,
        viewport: { width: 1280, height: 720 }
      });

      const page = await context.newPage();

      // Set additional headers to avoid bot detection
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
      });

      // Navigate to place page
      const url = `https://m.place.naver.com/place/${placeId}/home`;
      logger.debug(`Navigating to ${url}`);

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout
      });

      // Wait for app root to load
      await page.waitForSelector('#app-root', { timeout: 10000 });

      // Small delay to ensure JS execution
      await page.waitForTimeout(2000);

      // Check for bot detection
      const pageContent = await page.content();
      if (pageContent.includes('자동입력 방지') || pageContent.includes('captcha')) {
        logger.warn(`Bot detection triggered for place ${placeId}, waiting ${botDetectionWait}ms`);
        await browser.close();

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, botDetectionWait));
          continue;
        } else {
          throw createError('E_L1_003', { placeId, attempts: maxRetries });
        }
      }

      // Extract HTML
      const html = await page.content();

      // Close browser
      await browser.close();
      browser = null;

      // Parse Apollo State
      const apolloState = parseApolloState(html);
      const placeData = parsePlaceData(apolloState, placeId);

      logger.info(`✓ Successfully scraped place ${placeId}`);

      return placeData;

    } catch (error) {
      lastError = error;

      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          // Ignore close errors
        }
      }

      if (error.code && error.code.startsWith('E_L1')) {
        // Application error, don't retry
        throw error;
      }

      logger.error(`Attempt ${attempt} failed for place ${placeId}`, {
        error: error.message
      });

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        logger.info(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries failed
  logger.error(`All ${maxRetries} attempts failed for place ${placeId}`);
  throw lastError || createError('E_L1_001', { placeId });
}

export default {
  scrapePlaceData
};
