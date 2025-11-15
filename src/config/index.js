/**
 * index.js
 * 설정 로더 - 환경에 따라 적절한 설정 반환
 */

const path = require('path');

/**
 * 환경에 맞는 설정 로드
 * @returns {object} 설정 객체
 */
function loadConfig() {
  const env = process.env.NODE_ENV || 'development';

  let config;
  switch (env) {
    case 'production':
      config = require('./production');
      break;
    case 'test':
      config = require('./test');
      break;
    case 'development':
    default:
      config = require('./development');
      break;
  }

  // 셀렉터 파일 로드 (있는 경우)
  try {
    const selectorsPath = path.join(__dirname, '../selectors/naver-place.json');
    const selectors = require(selectorsPath);
    config.selectors = selectors;
  } catch (error) {
    console.warn('[Config] Selectors file not found, using defaults');
    config.selectors = null;
  }

  return config;
}

module.exports = loadConfig();
