/**
 * Naver Search API Client
 * Mock mode: hash-based pseudo-random search volumes
 * Real mode: Actual Naver Search API calls
 */

import crypto from 'crypto';
import configManager from './config-manager.js';
import logger from '../lib/logger.js';
import { createError } from '../lib/errors.js';

/**
 * Generate pseudo-random search volume based on keyword hash
 * @param {string} keyword - Keyword to generate volume for
 * @returns {number} Search volume (100-10000)
 */
function generateMockSearchVolume(keyword) {
  const hash = crypto.createHash('md5').update(keyword).digest('hex');
  const hashInt = parseInt(hash.substring(0, 8), 16);
  return Math.floor((hashInt % 9900) + 100); // Range: 100-10000
}

/**
 * Generate pseudo-random competition level based on keyword hash
 * @param {string} keyword - Keyword to generate competition for
 * @returns {number} Competition level (0.1-0.9)
 */
function generateMockCompetition(keyword) {
  const hash = crypto.createHash('sha256').update(keyword).digest('hex');
  const hashInt = parseInt(hash.substring(0, 8), 16);
  return ((hashInt % 80) + 10) / 100; // Range: 0.1-0.9
}

/**
 * Naver API Client Class
 */
class NaverApiClient {
  constructor() {
    this.config = configManager.getAll();
    this.mockMode = configManager.isNaverMockMode();
    this.rateLimit = this.config.naver.rate_limit || 10; // requests per second
    this.lastRequestTime = 0;
  }

  /**
   * Rate limiting delay
   * @private
   */
  async _rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 1000 / this.rateLimit; // milliseconds

    if (timeSinceLastRequest < minInterval) {
      const delay = minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Get search volume for keyword (Mock mode)
   * @param {string} keyword - Keyword to query
   * @returns {Promise<Object>} Search volume data
   */
  async getSearchVolumeMock(keyword) {
    await this._rateLimit();

    const searchVolume = generateMockSearchVolume(keyword);
    const competition = generateMockCompetition(keyword);

    logger.debug(`Mock Naver API: ${keyword} → volume=${searchVolume}, competition=${competition}`);

    return {
      keyword,
      search_volume: searchVolume,
      competition,
      mock: true
    };
  }

  /**
   * Get search volume for keyword (Real mode)
   * @param {string} keyword - Keyword to query
   * @returns {Promise<Object>} Search volume data
   */
  async getSearchVolumeReal(keyword) {
    await this._rateLimit();

    const { client_id, client_secret, search_api } = this.config.naver;

    if (!client_id || !client_secret) {
      throw createError('E_NAVER_001', { keyword });
    }

    try {
      // Note: Naver Search API doesn't provide search volume directly
      // This is a placeholder - actual implementation would use Naver Search Ads API
      const url = `${search_api.base_url}/blog?query=${encodeURIComponent(keyword)}&display=1`;

      const response = await fetch(url, {
        headers: {
          'X-Naver-Client-Id': client_id,
          'X-Naver-Client-Secret': client_secret
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw createError('E_NAVER_002', { keyword, status: response.status });
        }
        throw createError('E_NAVER_001', { keyword, status: response.status });
      }

      const data = await response.json();

      // Estimate search volume based on blog result count (placeholder logic)
      const estimatedVolume = Math.min(data.total || 100, 10000);
      const competition = Math.min((data.total || 100) / 10000, 0.9);

      logger.debug(`Real Naver API: ${keyword} → volume=${estimatedVolume}, competition=${competition}`);

      return {
        keyword,
        search_volume: estimatedVolume,
        competition,
        mock: false
      };

    } catch (error) {
      if (error.code && error.code.startsWith('E_NAVER')) {
        throw error;
      }
      logger.error('Naver API request failed:', error);
      throw createError('E_NAVER_001', { keyword, originalError: error.message });
    }
  }

  /**
   * Get search volume for keyword
   * @param {string} keyword - Keyword to query
   * @returns {Promise<Object>} Search volume data
   */
  async getSearchVolume(keyword) {
    if (this.mockMode) {
      return this.getSearchVolumeMock(keyword);
    } else {
      return this.getSearchVolumeReal(keyword);
    }
  }

  /**
   * Get search volumes for multiple keywords (batch)
   * @param {string[]} keywords - Keywords to query
   * @returns {Promise<Object[]>} Array of search volume data
   */
  async getSearchVolumes(keywords) {
    const results = [];

    for (const keyword of keywords) {
      try {
        const volume = await this.getSearchVolume(keyword);
        results.push(volume);
      } catch (error) {
        logger.error(`Failed to get search volume for keyword: ${keyword}`, error);
        results.push({
          keyword,
          search_volume: 0,
          competition: 0,
          error: error.message,
          mock: this.mockMode
        });
      }
    }

    return results;
  }
}

// Singleton instance
const naverClient = new NaverApiClient();

/**
 * Get search volume for a keyword
 * @param {string} keyword - Keyword to query
 * @returns {Promise<Object>} Search volume data
 */
export async function getSearchVolume(keyword) {
  const result = await naverClient.getSearchVolume(keyword);
  return {
    monthlySearchVolume: result.search_volume,
    competition: result.competition > 0.7 ? 'high' : result.competition > 0.4 ? 'medium' : 'low',
    trend: 'stable' // placeholder
  };
}

/**
 * Get search volumes for multiple keywords
 * @param {string[]} keywords - Keywords to query
 * @returns {Promise<Object[]>} Array of search volume data
 */
export async function getSearchVolumes(keywords) {
  return naverClient.getSearchVolumes(keywords);
}

export default naverClient;
