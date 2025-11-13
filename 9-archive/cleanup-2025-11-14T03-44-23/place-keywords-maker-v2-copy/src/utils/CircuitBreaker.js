/**
 * CircuitBreaker - 장애 전파 방지 패턴
 * 연속된 실패 시 요청을 차단하여 시스템 보호
 */

export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 60 seconds
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.nextAttempt = Date.now();
  }

  /**
   * 함수를 Circuit Breaker로 감싸서 실행
   * @param {Function} fn - 실행할 함수
   * @returns {Promise<*>} 함수 실행 결과
   */
  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN - request blocked');
      }
      // 타임아웃 후 HALF_OPEN으로 전환
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure();
      throw error;
    }
  }

  /**
   * 성공 시 처리
   * @private
   */
  _onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  /**
   * 실패 시 처리
   * @private
   */
  _onFailure() {
    this.failureCount++;

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }

  /**
   * Circuit Breaker 상태 리셋
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.nextAttempt = Date.now();
  }

  /**
   * 현재 상태 조회
   * @returns {Object} 상태 정보
   */
  getStatus() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      nextAttempt: new Date(this.nextAttempt).toISOString(),
    };
  }
}
