/**
 * Data Validation Utilities
 * Place, Menu, and required field checks
 */

import { createError } from './errors.js';
import logger from './logger.js';

/**
 * Validate Place data
 * @param {Object} place - Place object to validate
 * @returns {Object} Validation result { valid: boolean, missing: string[], errors: string[] }
 */
export function validatePlace(place) {
  const result = {
    valid: true,
    missing: [],
    errors: []
  };

  // Required fields
  const requiredFields = ['id', 'name', 'category'];

  for (const field of requiredFields) {
    if (!place[field] || (typeof place[field] === 'string' && place[field].trim() === '')) {
      result.valid = false;
      result.missing.push(field);
    }
  }

  // Type validations
  if (place.id && typeof place.id !== 'string') {
    result.valid = false;
    result.errors.push('id must be a string');
  }

  if (place.coordinate) {
    if (typeof place.coordinate.lat !== 'number' || typeof place.coordinate.lng !== 'number') {
      result.valid = false;
      result.errors.push('coordinate.lat and coordinate.lng must be numbers');
    }
  }

  if (place.menus && !Array.isArray(place.menus)) {
    result.valid = false;
    result.errors.push('menus must be an array');
  }

  if (place.reviewStats) {
    if (place.reviewStats.total !== undefined && typeof place.reviewStats.total !== 'number') {
      result.valid = false;
      result.errors.push('reviewStats.total must be a number');
    }
    if (place.reviewStats.score !== undefined && typeof place.reviewStats.score !== 'number') {
      result.valid = false;
      result.errors.push('reviewStats.score must be a number');
    }
  }

  return result;
}

/**
 * Validate Menu data
 * @param {Object} menu - Menu object to validate
 * @returns {Object} Validation result
 */
export function validateMenu(menu) {
  const result = {
    valid: true,
    missing: [],
    errors: []
  };

  // Required field
  if (!menu.name || menu.name.trim() === '') {
    result.valid = false;
    result.missing.push('name');
  }

  // Type validations
  if (menu.price !== null && menu.price !== undefined) {
    if (typeof menu.price !== 'number') {
      result.valid = false;
      result.errors.push('price must be a number or null');
    }
  }

  if (menu.recommend !== undefined && typeof menu.recommend !== 'boolean') {
    result.valid = false;
    result.errors.push('recommend must be a boolean');
  }

  if (menu.images && !Array.isArray(menu.images)) {
    result.valid = false;
    result.errors.push('images must be an array');
  }

  return result;
}

/**
 * Validate Place and throw error if invalid
 * @param {Object} place - Place object to validate
 * @throws {ApplicationError} If validation fails
 */
export function validatePlaceOrThrow(place) {
  const validation = validatePlace(place);

  if (!validation.valid) {
    logger.error('Place validation failed', {
      placeId: place.id,
      missing: validation.missing,
      errors: validation.errors
    });

    throw createError('E_L1_002', {
      placeId: place.id,
      missing: validation.missing,
      errors: validation.errors
    });
  }

  return true;
}

/**
 * Validate all menus in a place
 * @param {Object[]} menus - Array of menu objects
 * @returns {Object} Validation result with details for each menu
 */
export function validateMenus(menus) {
  if (!Array.isArray(menus)) {
    return {
      valid: false,
      errors: ['menus must be an array']
    };
  }

  const results = menus.map((menu, index) => ({
    index,
    menu: menu.name || `Menu ${index}`,
    ...validateMenu(menu)
  }));

  const allValid = results.every(r => r.valid);

  return {
    valid: allValid,
    results,
    invalidCount: results.filter(r => !r.valid).length
  };
}

/**
 * Validate L1 output structure
 * @param {Object} l1Output - L1 output object
 * @returns {Object} Validation result
 */
export function validateL1Output(l1Output) {
  const result = {
    valid: true,
    errors: []
  };

  if (!l1Output || typeof l1Output !== 'object') {
    result.valid = false;
    result.errors.push('L1 output must be an object');
    return result;
  }

  // Check if it has place IDs as keys
  const placeIds = Object.keys(l1Output);
  if (placeIds.length === 0) {
    result.valid = false;
    result.errors.push('L1 output must contain at least one place');
  }

  // Validate each place entry
  for (const placeId of placeIds) {
    const entry = l1Output[placeId];

    if (!entry.place) {
      result.valid = false;
      result.errors.push(`Place ${placeId}: missing place data`);
    } else {
      const placeValidation = validatePlace(entry.place);
      if (!placeValidation.valid) {
        result.valid = false;
        result.errors.push(`Place ${placeId}: ${placeValidation.errors.join(', ')}`);
      }
    }

    if (!entry.metadata) {
      result.valid = false;
      result.errors.push(`Place ${placeId}: missing metadata`);
    }
  }

  return result;
}

/**
 * Validate keyword element structure
 * @param {Object} elements - Keyword elements object
 * @returns {Object} Validation result
 */
export function validateKeywordElements(elements) {
  const result = {
    valid: true,
    errors: []
  };

  if (!elements || typeof elements !== 'object') {
    result.valid = false;
    result.errors.push('Keyword elements must be an object');
    return result;
  }

  // Check required sections
  const requiredSections = ['core_elements', 'region_elements', 'menu_elements'];

  for (const section of requiredSections) {
    if (!elements[section]) {
      result.valid = false;
      result.errors.push(`Missing required section: ${section}`);
    }
  }

  // Validate core_elements
  if (elements.core_elements) {
    if (!elements.core_elements.category || !elements.core_elements.brand_name) {
      result.valid = false;
      result.errors.push('core_elements must have category and brand_name');
    }
  }

  // Validate menu_elements
  if (elements.menu_elements) {
    if (!Array.isArray(elements.menu_elements.all_menus)) {
      result.valid = false;
      result.errors.push('menu_elements.all_menus must be an array');
    }
  }

  return result;
}

/**
 * Check data completeness (basic validation without scoring)
 * @param {Object} place - Place object
 * @returns {Object} Completeness check result
 */
export function checkDataCompleteness(place) {
  const checks = {
    has_id: !!place.id,
    has_name: !!place.name,
    has_category: !!place.category,
    has_address: !!(place.roadAddress || place.address),
    has_phone: !!place.phone,
    has_menus: place.menus && place.menus.length > 0,
    has_reviews: place.reviewStats && place.reviewStats.total > 0,
    has_images: place.images && place.images.all && place.images.all.length > 0
  };

  const totalChecks = Object.keys(checks).length;
  const passedChecks = Object.values(checks).filter(Boolean).length;
  const completeness = (passedChecks / totalChecks) * 100;

  return {
    checks,
    completeness: Math.round(completeness),
    missing: Object.keys(checks).filter(key => !checks[key])
  };
}

export default {
  validatePlace,
  validateMenu,
  validatePlaceOrThrow,
  validateMenus,
  validateL1Output,
  validateKeywordElements,
  checkDataCompleteness
};
