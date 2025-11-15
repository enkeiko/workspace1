/**
 * errors/index.js
 * 표준화된 에러 클래스 정의 (H-3)
 *
 * 목적:
 * - 일관된 에러 처리
 * - 에러 코드 표준화
 * - 디버깅 용이성 향상
 */

/**
 * L1 파이프라인 기본 에러 클래스
 */
class L1Error extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * 크롤러 관련 에러
 */
class CrawlerError extends L1Error {
  constructor(message, code, details = {}) {
    super(message, code, details);
  }
}

/**
 * 데이터 검증 에러
 */
class ValidationError extends L1Error {
  constructor(message, field, details = {}) {
    super(message, ERROR_CODES.VALIDATION_FAILED, { field, ...details });
    this.field = field;
  }
}

/**
 * 스토리지 관련 에러
 */
class StorageError extends L1Error {
  constructor(message, code, details = {}) {
    super(message, code, details);
  }
}

/**
 * Rate Limiter 관련 에러
 */
class RateLimitError extends L1Error {
  constructor(message, details = {}) {
    super(message, ERROR_CODES.RATE_LIMIT_EXCEEDED, details);
  }
}

/**
 * Circuit Breaker 관련 에러
 */
class CircuitBreakerError extends L1Error {
  constructor(message, details = {}) {
    super(message, ERROR_CODES.CIRCUIT_BREAKER_OPEN, details);
  }
}

/**
 * 표준 에러 코드 정의
 */
const ERROR_CODES = {
  // 크롤러 에러 (E1xxx)
  BROWSER_INIT_FAILED: 'E1001',
  PAGE_LOAD_TIMEOUT: 'E1002',
  SELECTOR_NOT_FOUND: 'E1003',
  CRAWL_FAILED: 'E1004',
  CIRCUIT_BREAKER_OPEN: 'E1005',
  PAGE_POOL_EXHAUSTED: 'E1006',

  // 검증 에러 (E2xxx)
  VALIDATION_FAILED: 'E2001',
  REQUIRED_FIELD_MISSING: 'E2002',
  INVALID_DATA_TYPE: 'E2003',
  INVALID_DATA_RANGE: 'E2004',

  // 스토리지 에러 (E3xxx)
  STORAGE_WRITE_FAILED: 'E3001',
  STORAGE_READ_FAILED: 'E3002',
  STORAGE_LOCK_FAILED: 'E3003',
  INVALID_FILE_PATH: 'E3004',

  // Rate Limiter 에러 (E4xxx)
  RATE_LIMIT_EXCEEDED: 'E4001',
  QUEUE_FULL: 'E4002',

  // 네트워크 에러 (E5xxx)
  NETWORK_ERROR: 'E5001',
  CONNECTION_TIMEOUT: 'E5002',
  HTTP_ERROR: 'E5003'
};

/**
 * 에러 심각도 레벨
 */
const ERROR_SEVERITY = {
  CRITICAL: 'CRITICAL',  // 즉시 처리 필요, 시스템 중단
  HIGH: 'HIGH',          // 조속히 처리 필요, 기능 제한
  MEDIUM: 'MEDIUM',      // 처리 필요, 일부 기능 저하
  LOW: 'LOW',            // 모니터링 필요
  WARNING: 'WARNING'     // 주의 필요, 정상 동작
};

/**
 * 에러 코드별 심각도 매핑
 */
const ERROR_SEVERITY_MAP = {
  [ERROR_CODES.BROWSER_INIT_FAILED]: ERROR_SEVERITY.CRITICAL,
  [ERROR_CODES.CIRCUIT_BREAKER_OPEN]: ERROR_SEVERITY.HIGH,
  [ERROR_CODES.PAGE_LOAD_TIMEOUT]: ERROR_SEVERITY.MEDIUM,
  [ERROR_CODES.SELECTOR_NOT_FOUND]: ERROR_SEVERITY.LOW,
  [ERROR_CODES.VALIDATION_FAILED]: ERROR_SEVERITY.MEDIUM,
  [ERROR_CODES.STORAGE_WRITE_FAILED]: ERROR_SEVERITY.HIGH,
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: ERROR_SEVERITY.LOW
};

/**
 * 에러 심각도 조회 헬퍼
 */
function getErrorSeverity(errorCode) {
  return ERROR_SEVERITY_MAP[errorCode] || ERROR_SEVERITY.MEDIUM;
}

/**
 * 에러 생성 헬퍼
 */
function createError(type, message, code, details) {
  switch (type) {
    case 'crawler':
      return new CrawlerError(message, code, details);
    case 'validation':
      return new ValidationError(message, details.field, details);
    case 'storage':
      return new StorageError(message, code, details);
    case 'rateLimit':
      return new RateLimitError(message, details);
    case 'circuitBreaker':
      return new CircuitBreakerError(message, details);
    default:
      return new L1Error(message, code, details);
  }
}

module.exports = {
  // 에러 클래스
  L1Error,
  CrawlerError,
  ValidationError,
  StorageError,
  RateLimitError,
  CircuitBreakerError,

  // 에러 코드
  ERROR_CODES,

  // 심각도
  ERROR_SEVERITY,
  ERROR_SEVERITY_MAP,
  getErrorSeverity,

  // 헬퍼
  createError
};
