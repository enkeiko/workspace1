/**
 * development.js
 * 개발 환경 설정
 */

const defaultConfig = require('./default');

module.exports = {
  ...defaultConfig,

  crawler: {
    ...defaultConfig.crawler,
    headless: false,  // 개발 시 브라우저 보기
    maxRetries: 2,
    maxPoolSize: 5
  },

  rateLimiter: {
    ...defaultConfig.rateLimiter,
    maxConcurrent: 3,
    requestsPerMinute: 10  // 개발 시 낮은 요청률
  },

  logging: {
    ...defaultConfig.logging,
    level: 'debug',
    prettyPrint: true
  },

  monitoring: {
    ...defaultConfig.monitoring,
    metricsInterval: 120000  // 2분마다 (개발 시 덜 빈번하게)
  }
};
