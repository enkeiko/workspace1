/**
 * production.js
 * 프로덕션 환경 설정
 */

const defaultConfig = require('./default');

module.exports = {
  ...defaultConfig,

  crawler: {
    ...defaultConfig.crawler,
    headless: true,
    maxPoolSize: 20,  // 프로덕션에서는 더 큰 풀

    circuitBreaker: {
      ...defaultConfig.crawler.circuitBreaker,
      breakerTimeout: 120000  // 2분
    }
  },

  rateLimiter: {
    ...defaultConfig.rateLimiter,
    maxConcurrent: 10,  // 프로덕션에서는 더 높은 동시성
    requestsPerMinute: 60,
    requestsPerHour: 3000
  },

  storage: {
    ...defaultConfig.storage,
    prettyPrint: false  // 프로덕션에서는 압축 저장
  },

  logging: {
    ...defaultConfig.logging,
    level: 'warn',
    prettyPrint: false,

    file: {
      ...defaultConfig.logging.file,
      maxFiles: 30,
      maxSize: '50m'
    }
  },

  monitoring: {
    ...defaultConfig.monitoring,
    enabled: true,
    metricsInterval: 30000  // 30초마다
  }
};
