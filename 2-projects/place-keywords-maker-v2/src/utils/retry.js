/**
 * Retry utilities with exponential backoff
 */

import { logger } from './logger.js';

/**
 * Exponential backoff 재시도 로직
 * @param {Function} fn - 실행할 비동기 함수
 * @param {number} maxAttempts - 최대 재시도 횟수
 * @param {number} baseDelay - 기본 지연 시간 (ms)
 * @returns {Promise<*>} 함수 실행 결과
 */
export async function exponentialBackoff(fn, maxAttempts = 3, baseDelay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) {
        logger.error(`All ${maxAttempts} attempts failed:`, error);
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      logger.warn(`Attempt ${attempt} failed. Retrying in ${delay}ms...`, error.message);

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Sleep helper
 * @param {number} ms - 밀리초
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 선형 재시도 (exponential이 아닌 고정 간격)
 * @param {Function} fn - 실행할 비동기 함수
 * @param {number} maxAttempts - 최대 재시도 횟수
 * @param {number} delay - 지연 시간 (ms)
 * @returns {Promise<*>} 함수 실행 결과
 */
export async function linearRetry(fn, maxAttempts = 3, delay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) {
        throw error;
      }

      logger.warn(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw lastError;
}
