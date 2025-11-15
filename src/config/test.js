/**
 * test.js
 * 테스트 환경 설정
 */

const defaultConfig = require('./default');

module.exports = {
  ...defaultConfig,

  crawler: {
    ...defaultConfig.crawler,
    headless: true,
    timeout: 10000,  // 테스트 시 더 짧은 타임아웃
    maxRetries: 1,
    maxPoolSize: 2
  },

  rateLimiter: {
    ...defaultConfig.rateLimiter,
    maxConcurrent: 2,
    requestsPerMinute: 100,  // 테스트 시 제한 완화
    requestsPerHour: 1000
  },

  storage: {
    ...defaultConfig.storage,
    basePath: './data/test',  // 테스트 데이터 분리
    prettyPrint: false
  },

  logging: {
    ...defaultConfig.logging,
    level: 'error',  // 테스트 시 에러만 로깅
    prettyPrint: false,

    file: {
      ...defaultConfig.logging.file,
      enabled: false  // 테스트 시 파일 로깅 비활성화
    }
  },

  monitoring: {
    ...defaultConfig.monitoring,
    enabled: false  // 테스트 시 모니터링 비활성화
  }
};
