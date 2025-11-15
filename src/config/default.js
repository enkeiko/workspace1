/**
 * default.js
 * L1 Pipeline 중앙 설정 파일
 *
 * Architecture 개선 A-1: 분산된 설정을 중앙화
 */

module.exports = {
  // 크롤러 설정
  crawler: {
    headless: true,
    timeout: 30000,              // 30초
    maxRetries: 3,
    baseDelay: 2000,             // 2초
    maxDelay: 30000,             // 30초
    maxPoolSize: 10,             // 페이지 풀 최대 크기

    // Circuit Breaker 설정
    circuitBreaker: {
      failureThreshold: 5,       // 5번 실패 시 OPEN
      successThreshold: 2,       // HALF_OPEN에서 2번 성공 시 CLOSED
      breakerTimeout: 60000      // 1분 후 HALF_OPEN 시도
    },

    // 수집 레벨 기본값
    defaultLevel: 'STANDARD',
    autoSave: true,
    autoValidate: true
  },

  // Rate Limiter 설정
  rateLimiter: {
    maxConcurrent: 5,
    requestsPerMinute: 30,
    requestsPerHour: 1000,
    requestsPerDay: 10000,

    // Weighted Fair Queuing 가중치
    priorityWeights: {
      HIGH: 5,      // 50%
      MEDIUM: 3,    // 30%
      LOW: 2        // 20%
    }
  },

  // Storage 설정
  storage: {
    basePath: './data/output/l1',
    prettyPrint: true,

    // 디렉토리 구조
    directories: {
      places: 'places',
      batch: 'batch',
      summary: 'summary',
      metadata: 'metadata'
    }
  },

  // Validation 설정
  validation: {
    // 한국 좌표 범위
    locationBounds: {
      mainland: {
        lat: { min: 33.1, max: 38.6 },
        lng: { min: 125.0, max: 131.9 }
      },
      jeju: {
        lat: { min: 33.1, max: 33.6 },
        lng: { min: 126.1, max: 126.9 }
      }
    },

    // 가격 범위
    priceRange: {
      min: 0,
      max: 100000000  // 1억원
    },

    // 평점 범위
    ratingRange: {
      min: 0.0,
      max: 5.0
    }
  },

  // 셀렉터 설정 (외부 파일에서 로드)
  selectors: null,  // runtime에 로드됨

  // 로깅 설정
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: process.env.NODE_ENV !== 'production',

    // 파일 로깅
    file: {
      enabled: true,
      path: './logs',
      maxFiles: 10,
      maxSize: '10m'
    }
  },

  // 모니터링 설정
  monitoring: {
    enabled: true,
    metricsInterval: 60000,  // 1분마다 메트릭 수집

    // 이벤트 로깅
    logEvents: true,

    // 알림 임계값
    alerts: {
      circuitBreakerOpen: true,
      highFailureRate: 0.2,  // 20% 실패율
      queueBacklog: 100      // 큐에 100개 이상 대기
    }
  },

  // 환경별 설정 오버라이드
  environment: process.env.NODE_ENV || 'development'
};
