/**
 * Configuration Manager
 * 설정 관리자: local.config.yml + environment variables
 */

import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createError } from '../lib/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env
dotenv.config();

/**
 * Load YAML configuration file
 * @param {string} configPath - Path to config file
 * @returns {Object} Configuration object
 */
function loadYamlConfig(configPath) {
  try {
    const fileContents = fs.readFileSync(configPath, 'utf8');
    return yaml.load(fileContents);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw createError('E_SYS_001', { configPath });
    }
    throw error;
  }
}

/**
 * Configuration Manager Class
 */
class ConfigManager {
  constructor() {
    this.config = null;
    this.loaded = false;
  }

  /**
   * Load configuration from local.config.yml and environment variables
   * @param {string} configPath - Path to config file (default: ./local.config.yml)
   */
  load(configPath = null) {
    if (this.loaded) {
      return this.config;
    }

    // Determine config path
    const configFile = configPath || path.join(process.cwd(), 'local.config.yml');

    // Load YAML config
    const yamlConfig = loadYamlConfig(configFile);

    // Merge with environment variables (env vars take precedence)
    this.config = {
      paths: {
        data: {
          input: yamlConfig.paths?.data?.input || './data/input',
          output: yamlConfig.paths?.data?.output || './data/output',
          logs: yamlConfig.paths?.data?.logs || './data/logs'
        },
        places_advanced: yamlConfig.paths?.places_advanced || './data/input/places-advanced',
        current_keywords: yamlConfig.paths?.current_keywords || './data/input/current_keywords.json',
        manual_notes: yamlConfig.paths?.manual_notes || './data/input/manual_notes.json'
      },

      crawler: {
        user_agent: yamlConfig.crawler?.user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        bot_detection_wait: yamlConfig.crawler?.bot_detection_wait || 30000,
        max_retries: yamlConfig.crawler?.max_retries || 3,
        timeout: yamlConfig.crawler?.timeout || 30000,
        headless: yamlConfig.crawler?.headless !== false
      },

      ai: {
        mock_mode: process.env.AI_MOCK_MODE === 'true' || yamlConfig.ai?.mock_mode !== false,
        provider: process.env.AI_PROVIDER || yamlConfig.ai?.provider || 'openai',
        model: process.env.AI_MODEL || yamlConfig.ai?.model || 'gpt-4',
        api_key: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || '',
        max_tokens: parseInt(yamlConfig.ai?.max_tokens || '1000'),
        temperature: parseFloat(yamlConfig.ai?.temperature || '0.7')
      },

      naver: {
        mock_mode: process.env.NAVER_MOCK_MODE === 'true' || yamlConfig.naver?.mock_mode !== false,
        rate_limit: parseInt(yamlConfig.naver?.rate_limit || '10'),
        client_id: process.env.NAVER_CLIENT_ID || '',
        client_secret: process.env.NAVER_CLIENT_SECRET || '',
        search_api: {
          base_url: yamlConfig.naver?.search_api?.base_url || 'https://openapi.naver.com/v1/search'
        }
      },

      logging: {
        level: process.env.LOG_LEVEL || yamlConfig.logging?.level || 'info',
        file: {
          enabled: yamlConfig.logging?.file?.enabled !== false,
          max_size: yamlConfig.logging?.file?.max_size || '10m',
          max_files: parseInt(yamlConfig.logging?.file?.max_files || '14'),
          rotation: yamlConfig.logging?.file?.rotation || 'daily'
        },
        console: {
          enabled: yamlConfig.logging?.console?.enabled !== false,
          colorize: yamlConfig.logging?.console?.colorize !== false
        }
      },

      gui: {
        port: parseInt(process.env.GUI_PORT || yamlConfig.gui?.port || '3000'),
        host: process.env.GUI_HOST || yamlConfig.gui?.host || 'localhost',
        sse: {
          keepalive_interval: parseInt(yamlConfig.gui?.sse?.keepalive_interval || '30000')
        }
      },

      performance: {
        max_concurrent_crawls: parseInt(yamlConfig.performance?.max_concurrent_crawls || '5'),
        memory_limit_mb: parseInt(yamlConfig.performance?.memory_limit_mb || '2048'),
        batch_size: parseInt(yamlConfig.performance?.batch_size || '10')
      }
    };

    this.loaded = true;
    return this.config;
  }

  /**
   * Get configuration value by path
   * @param {string} keyPath - Dot-separated key path (e.g., 'ai.mock_mode')
   * @param {*} defaultValue - Default value if key not found
   * @returns {*} Configuration value
   */
  get(keyPath, defaultValue = null) {
    if (!this.loaded) {
      this.load();
    }

    const keys = keyPath.split('.');
    let value = this.config;

    for (const key of keys) {
      if (value === null || value === undefined || !Object.prototype.hasOwnProperty.call(value, key)) {
        return defaultValue;
      }
      value = value[key];
    }

    return value;
  }

  /**
   * Get all configuration
   * @returns {Object} Complete configuration object
   */
  getAll() {
    if (!this.loaded) {
      this.load();
    }
    return this.config;
  }

  /**
   * Check if Mock mode is enabled for AI
   * @returns {boolean} True if Mock mode enabled
   */
  isAiMockMode() {
    return this.get('ai.mock_mode', true);
  }

  /**
   * Check if Mock mode is enabled for Naver API
   * @returns {boolean} True if Mock mode enabled
   */
  isNaverMockMode() {
    return this.get('naver.mock_mode', true);
  }

  /**
   * Get absolute path from relative path
   * @param {string} relativePath - Relative path from config
   * @returns {string} Absolute path
   */
  getAbsolutePath(relativePath) {
    if (path.isAbsolute(relativePath)) {
      return relativePath;
    }
    return path.join(process.cwd(), relativePath);
  }

  /**
   * Validate required configuration
   * @throws {Error} If required config is missing
   */
  validate() {
    if (!this.loaded) {
      this.load();
    }

    const errors = [];

    // If not in mock mode, check API keys
    if (!this.isAiMockMode()) {
      const provider = this.get('ai.provider');
      if (provider === 'openai' && !process.env.OPENAI_API_KEY) {
        errors.push('OPENAI_API_KEY is required when ai.mock_mode is false');
      }
      if (provider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
        errors.push('ANTHROPIC_API_KEY is required when ai.mock_mode is false');
      }
    }

    if (!this.isNaverMockMode()) {
      if (!this.get('naver.client_id')) {
        errors.push('NAVER_CLIENT_ID is required when naver.mock_mode is false');
      }
      if (!this.get('naver.client_secret')) {
        errors.push('NAVER_CLIENT_SECRET is required when naver.mock_mode is false');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }

    return true;
  }
}

// Singleton instance
const configManager = new ConfigManager();

export default configManager;
export { ConfigManager };
