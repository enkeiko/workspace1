/**
 * Error Code System
 * 에러 코드 체계: E_{MODULE}_{NUMBER}
 * Bilingual error messages (Korean/English)
 */

/**
 * Error codes definition
 * 에러 코드 정의
 */
export const ErrorCodes = {
  // L1 - Data Collection Errors
  E_L1_001: {
    code: 'E_L1_001',
    message_ko: '크롤러 JSON 파일을 찾을 수 없습니다.',
    message_en: 'Crawler JSON file not found.',
    recoveryGuide_ko: '1. 크롤링을 먼저 실행하세요\n2. data/input/places-advanced/ 폴더 확인',
    recoveryGuide_en: '1. Run crawling first\n2. Check data/input/places-advanced/ folder'
  },

  E_L1_002: {
    code: 'E_L1_002',
    message_ko: '필수 필드가 누락되었습니다.',
    message_en: 'Missing required fields.',
    recoveryGuide_ko: '1. Place ID, name, category 필드 확인\n2. 크롤링 데이터 재수집',
    recoveryGuide_en: '1. Check Place ID, name, category fields\n2. Re-crawl the data'
  },

  E_L1_003: {
    code: 'E_L1_003',
    message_ko: '네이버 봇 감지로 크롤링이 차단되었습니다.',
    message_en: 'Crawling blocked by Naver bot detection.',
    recoveryGuide_ko: '1. 30초 대기 후 자동 재시도됩니다\n2. 최대 3회 재시도 후 실패 시 수동으로 다시 시도하세요',
    recoveryGuide_en: '1. Auto-retry after 30 seconds wait\n2. Max 3 retries, then try manually'
  },

  E_L1_004: {
    code: 'E_L1_004',
    message_ko: 'Apollo State 파싱에 실패했습니다.',
    message_en: 'Failed to parse Apollo State.',
    recoveryGuide_ko: '1. HTML 구조가 변경되었는지 확인\n2. Playwright 버전 업데이트 확인',
    recoveryGuide_en: '1. Check if HTML structure changed\n2. Check Playwright version updates'
  },

  // L2 - AI Analysis Errors
  E_L2_001: {
    code: 'E_L2_001',
    message_ko: 'AI API 인증에 실패했습니다.',
    message_en: 'AI API authentication failed.',
    recoveryGuide_ko: '1. .env 파일의 API 키 확인\n2. API 키가 유효한지 확인\n3. Mock 모드로 테스트',
    recoveryGuide_en: '1. Check API key in .env file\n2. Verify API key is valid\n3. Test with Mock mode'
  },

  E_L2_002: {
    code: 'E_L2_002',
    message_ko: 'API 요청 제한을 초과했습니다.',
    message_en: 'API rate limit exceeded.',
    recoveryGuide_ko: '1. 1분 대기 후 재시도\n2. API 키의 할당량 확인\n3. Mock 모드로 테스트 진행',
    recoveryGuide_en: '1. Wait 1 minute and retry\n2. Check API key quota\n3. Proceed with Mock mode'
  },

  E_L2_003: {
    code: 'E_L2_003',
    message_ko: 'AI API 응답 파싱에 실패했습니다.',
    message_en: 'Failed to parse AI API response.',
    recoveryGuide_ko: '1. API 응답 형식 확인\n2. 프롬프트 템플릿 검증\n3. Mock 모드로 테스트',
    recoveryGuide_en: '1. Check API response format\n2. Verify prompt template\n3. Test with Mock mode'
  },

  E_L2_004: {
    code: 'E_L2_004',
    message_ko: '키워드 매트릭스 생성에 실패했습니다.',
    message_en: 'Failed to generate keyword matrix.',
    recoveryGuide_ko: '1. L1 출력 데이터 확인\n2. 필수 요소(지역, 메뉴) 누락 여부 확인',
    recoveryGuide_en: '1. Check L1 output data\n2. Verify required elements (region, menu) exist'
  },

  // L3 - Strategy Generation Errors
  E_L3_001: {
    code: 'E_L3_001',
    message_ko: '키워드 후보가 부족합니다.',
    message_en: 'Insufficient keyword candidates.',
    recoveryGuide_ko: '1. L2 분석 재실행\n2. 키워드 후보 생성 기준 완화',
    recoveryGuide_en: '1. Re-run L2 analysis\n2. Relax candidate generation criteria'
  },

  E_L3_002: {
    code: 'E_L3_002',
    message_ko: '키워드 점수 계산에 실패했습니다.',
    message_en: 'Keyword scoring failed.',
    recoveryGuide_ko: '1. 검색량 데이터 확인\n2. 경쟁도 데이터 확인',
    recoveryGuide_en: '1. Check search volume data\n2. Check competition data'
  },

  // Naver API Errors
  E_NAVER_001: {
    code: 'E_NAVER_001',
    message_ko: '네이버 검색 API 인증에 실패했습니다.',
    message_en: 'Naver Search API authentication failed.',
    recoveryGuide_ko: '1. .env 파일의 NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 확인\n2. Mock 모드로 전환',
    recoveryGuide_en: '1. Check NAVER_CLIENT_ID, NAVER_CLIENT_SECRET in .env\n2. Switch to Mock mode'
  },

  E_NAVER_002: {
    code: 'E_NAVER_002',
    message_ko: '네이버 API 속도 제한을 초과했습니다.',
    message_en: 'Naver API rate limit exceeded.',
    recoveryGuide_ko: '1. 10초 대기 후 재시도\n2. 배치 크기 감소',
    recoveryGuide_en: '1. Wait 10 seconds and retry\n2. Reduce batch size'
  },

  // System Errors
  E_SYS_001: {
    code: 'E_SYS_001',
    message_ko: '설정 파일을 로드할 수 없습니다.',
    message_en: 'Cannot load configuration file.',
    recoveryGuide_ko: '1. local.config.yml 파일 존재 확인\n2. YAML 형식 검증',
    recoveryGuide_en: '1. Check local.config.yml exists\n2. Validate YAML format'
  },

  E_SYS_002: {
    code: 'E_SYS_002',
    message_ko: '파일 쓰기에 실패했습니다.',
    message_en: 'File write operation failed.',
    recoveryGuide_ko: '1. 디스크 공간 확인\n2. 파일 권한 확인',
    recoveryGuide_en: '1. Check disk space\n2. Check file permissions'
  },

  E_SYS_003: {
    code: 'E_SYS_003',
    message_ko: '파일 읽기에 실패했습니다.',
    message_en: 'File read operation failed.',
    recoveryGuide_ko: '1. 파일 경로 확인\n2. 파일 권한 확인',
    recoveryGuide_en: '1. Check file path\n2. Check file permissions'
  },

  E_SYS_004: {
    code: 'E_SYS_004',
    message_ko: '메모리 부족 오류입니다.',
    message_en: 'Out of memory error.',
    recoveryGuide_ko: '1. 배치 크기 감소\n2. 병렬 처리 수 감소',
    recoveryGuide_en: '1. Reduce batch size\n2. Reduce parallel processing count'
  }
};

/**
 * Custom error class with error code
 * 에러 코드를 포함한 커스텀 에러 클래스
 */
export class ApplicationError extends Error {
  constructor(errorCode, context = {}) {
    const errorDef = ErrorCodes[errorCode];

    if (!errorDef) {
      super(`Unknown error code: ${errorCode}`);
      this.code = 'E_UNKNOWN';
      this.message_ko = '알 수 없는 오류입니다.';
      this.message_en = 'Unknown error occurred.';
      this.recoveryGuide_ko = '개발자에게 문의하세요.';
      this.recoveryGuide_en = 'Contact developer.';
    } else {
      super(errorDef.message_en);
      this.code = errorDef.code;
      this.message_ko = errorDef.message_ko;
      this.message_en = errorDef.message_en;
      this.recoveryGuide_ko = errorDef.recoveryGuide_ko;
      this.recoveryGuide_en = errorDef.recoveryGuide_en;
    }

    this.context = context;
    this.timestamp = new Date().toISOString();
    this.name = 'ApplicationError';
  }

  /**
   * Get formatted error object
   * @returns {Object} Error object with all details
   */
  toJSON() {
    return {
      code: this.code,
      message_ko: this.message_ko,
      message_en: this.message_en,
      recoveryGuide_ko: this.recoveryGuide_ko,
      recoveryGuide_en: this.recoveryGuide_en,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }

  /**
   * Get user-friendly error message (Korean)
   * @returns {string} Korean error message
   */
  getMessageKo() {
    return `[${this.code}] ${this.message_ko}\n\n복구 방법:\n${this.recoveryGuide_ko}`;
  }

  /**
   * Get user-friendly error message (English)
   * @returns {string} English error message
   */
  getMessageEn() {
    return `[${this.code}] ${this.message_en}\n\nRecovery Guide:\n${this.recoveryGuide_en}`;
  }
}

/**
 * Create error with context
 * @param {string} errorCode - Error code (e.g., 'E_L1_001')
 * @param {Object} context - Additional context
 * @returns {ApplicationError} Error instance
 */
export function createError(errorCode, context = {}) {
  return new ApplicationError(errorCode, context);
}

/**
 * Check if error is ApplicationError
 * @param {Error} error - Error to check
 * @returns {boolean} True if ApplicationError
 */
export function isApplicationError(error) {
  return error instanceof ApplicationError;
}

export default {
  ErrorCodes,
  ApplicationError,
  createError,
  isApplicationError
};
