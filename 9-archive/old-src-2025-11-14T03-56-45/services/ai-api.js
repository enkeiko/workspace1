/**
 * AI API Client
 * Mock mode: Deterministic keyword generation
 * Real mode: OpenAI/Anthropic API calls
 */

import crypto from 'crypto';
import configManager from './config-manager.js';
import logger from '../lib/logger.js';
import { createError } from '../lib/errors.js';

/**
 * Generate deterministic keywords based on input hash (Mock mode)
 * @param {Object} input - Keyword matrix and place data
 * @returns {Array} Generated keywords with scores
 */
function generateMockKeywords(input) {
  const { keyword_matrix, place_info } = input;

  if (!keyword_matrix || keyword_matrix.length === 0) {
    throw createError('E_L2_004', { reason: 'Empty keyword matrix' });
  }

  // Select top 15 keywords deterministically
  const selectedCount = Math.min(15, keyword_matrix.length);
  const keywords = [];

  for (let i = 0; i < selectedCount; i++) {
    const keyword = keyword_matrix[i];
    const hash = crypto.createHash('md5').update(keyword + i).digest('hex');
    const hashInt = parseInt(hash.substring(0, 8), 16);

    const type = (hashInt % 2 === 0) ? 'short_term' : 'long_term';
    const classification = (i < 10) ? 'main' : 'sub';
    const relevance_score = 0.5 + (hashInt % 50) / 100; // 0.5-1.0

    keywords.push({
      keyword,
      type,
      classification,
      relevance_score: parseFloat(relevance_score.toFixed(2)),
      rationale: `Mock rationale for ${keyword}: ${type} strategy, ${classification} keyword`
    });
  }

  return keywords;
}

/**
 * AI API Client Class
 */
class AiApiClient {
  constructor() {
    this.config = configManager.getAll();
    this.mockMode = configManager.isAiMockMode();
    this.provider = this.config.ai.provider;
    this.model = this.config.ai.model;
    this.apiKey = this.config.ai.api_key;
  }

  /**
   * Analyze keywords using Mock AI
   * @param {Object} input - Analysis input
   * @returns {Promise<Array>} Keyword candidates
   */
  async analyzeMock(input) {
    logger.debug('Mock AI analysis started');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const keywords = generateMockKeywords(input);

    logger.debug(`Mock AI generated ${keywords.length} keywords`);

    return keywords;
  }

  /**
   * Analyze keywords using OpenAI
   * @param {Object} input - Analysis input
   * @param {string} prompt - Analysis prompt
   * @returns {Promise<Array>} Keyword candidates
   */
  async analyzeOpenAI(input, prompt) {
    if (!this.apiKey) {
      throw createError('E_L2_001', { provider: 'OpenAI', reason: 'Missing API key' });
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a Naver Place SEO expert. Analyze keywords and return JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: this.config.ai.max_tokens,
          temperature: this.config.ai.temperature
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw createError('E_L2_002', { provider: 'OpenAI', status: response.status });
        }
        throw createError('E_L2_001', { provider: 'OpenAI', status: response.status });
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw createError('E_L2_003', { provider: 'OpenAI', reason: 'Empty response' });
      }

      // Parse JSON response
      const keywords = JSON.parse(content);

      logger.debug(`OpenAI generated ${keywords.length} keywords`);

      return keywords;

    } catch (error) {
      if (error.code && error.code.startsWith('E_L2')) {
        throw error;
      }
      logger.error('OpenAI API request failed:', error);
      throw createError('E_L2_003', { provider: 'OpenAI', originalError: error.message });
    }
  }

  /**
   * Analyze keywords using Anthropic Claude
   * @param {Object} input - Analysis input
   * @param {string} prompt - Analysis prompt
   * @returns {Promise<Array>} Keyword candidates
   */
  async analyzeAnthropic(input, prompt) {
    if (!this.apiKey) {
      throw createError('E_L2_001', { provider: 'Anthropic', reason: 'Missing API key' });
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model || 'claude-3-sonnet-20240229',
          max_tokens: this.config.ai.max_tokens,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw createError('E_L2_002', { provider: 'Anthropic', status: response.status });
        }
        throw createError('E_L2_001', { provider: 'Anthropic', status: response.status });
      }

      const data = await response.json();
      const content = data.content[0]?.text;

      if (!content) {
        throw createError('E_L2_003', { provider: 'Anthropic', reason: 'Empty response' });
      }

      // Parse JSON response
      const keywords = JSON.parse(content);

      logger.debug(`Anthropic generated ${keywords.length} keywords`);

      return keywords;

    } catch (error) {
      if (error.code && error.code.startsWith('E_L2')) {
        throw error;
      }
      logger.error('Anthropic API request failed:', error);
      throw createError('E_L2_003', { provider: 'Anthropic', originalError: error.message });
    }
  }

  /**
   * Analyze keywords
   * @param {Object} input - Analysis input (keyword_matrix, place_info)
   * @param {string} prompt - Analysis prompt (optional in mock mode)
   * @returns {Promise<Array>} Keyword candidates
   */
  async analyze(input, prompt = '') {
    if (this.mockMode) {
      return this.analyzeMock(input);
    }

    if (this.provider === 'openai') {
      return this.analyzeOpenAI(input, prompt);
    } else if (this.provider === 'anthropic') {
      return this.analyzeAnthropic(input, prompt);
    } else {
      throw new Error(`Unknown AI provider: ${this.provider}`);
    }
  }
}

// Singleton instance
const aiClient = new AiApiClient();

/**
 * Analyze keywords with AI
 * @param {Array<Object>} candidates - Keyword candidates
 * @param {Object} context - Analysis context
 * @returns {Promise<Object>} Analysis results
 */
export async function analyzeKeywords(candidates, context = {}) {
  const { placeData, keywordElements, industryPrompt } = context;

  // Build prompt
  const prompt = `
${industryPrompt}

## Place Information
- Name: ${placeData.name}
- Category: ${placeData.category}
- Location: ${placeData.address}
- Menus: ${(placeData.menus || []).map(m => m.name).join(', ')}

## Keyword Candidates (${candidates.length} total)
${candidates.slice(0, 50).map((c, i) => `${i + 1}. ${c.keyword} (search: ${c.search_volume}, comp: ${c.competition})`).join('\n')}

## Task
Analyze the above keyword candidates and select the top 15-20 most effective keywords for Naver Place SEO.
For each selected keyword, provide:
1. relevance_score (0-100): How relevant is this keyword to the place
2. rationale: Brief explanation (1 sentence)

Return results as JSON array:
[
  {
    "keyword": "keyword text",
    "relevance_score": 85,
    "rationale": "explanation"
  }
]
`;

  const input = {
    keyword_matrix: candidates.map(c => c.keyword),
    place_info: placeData
  };

  const aiResults = await aiClient.analyze(input, prompt);

  return { keywords: aiResults };
}

export default aiClient;
