/**
 * RateLimiter.js
 * Rate Limiting 구현 (Leaky Bucket 알고리즘)
 *
 * L1_FEATURE_SPEC.md 명세 기반 구현 (RS-003)
 * - Leaky Bucket 알고리즘
 * - 우선순위 큐
 * - 동시 실행 제한
 */

const { EventEmitter } = require('events');

class RateLimiter extends EventEmitter {
  constructor(options = {}) {
    super();

    this.config = {
      maxConcurrent: options.maxConcurrent || 5,          // 동시 최대 5개
      requestsPerMinute: options.requestsPerMinute || 30, // 분당 30회
      requestsPerHour: options.requestsPerHour || 1000,   // 시간당 1,000회
      ...options
    };

    // 실행 중인 작업
    this.inProgress = new Set();

    // 대기 큐 (우선순위별)
    this.queues = {
      HIGH: [],
      MEDIUM: [],
      LOW: []
    };

    // 요청 이력 (Rate Limiting 계산용)
    this.requestHistory = {
      minute: [],
      hour: []
    };

    // 통계
    this.stats = {
      totalRequests: 0,
      completed: 0,
      failed: 0,
      rateLimited: 0
    };
  }

  /**
   * 작업 추가
   * @param {Function} fn - 실행할 비동기 함수
   * @param {object} options - 옵션 (priority, id)
   * @returns {Promise} 작업 결과
   */
  async add(fn, options = {}) {
    const priority = options.priority || 'MEDIUM';
    const taskId = options.id || `task-${Date.now()}-${Math.random()}`;

    this.stats.totalRequests++;

    return new Promise((resolve, reject) => {
      const task = {
        id: taskId,
        fn,
        priority,
        createdAt: Date.now(),
        resolve,
        reject
      };

      // 큐에 추가
      this.queues[priority].push(task);

      this.emit('taskQueued', {
        taskId,
        priority,
        queueSize: this.getQueueSize()
      });

      // 즉시 실행 시도
      this._processQueue();
    });
  }

  /**
   * 큐 처리
   * @private
   */
  async _processQueue() {
    // 동시 실행 제한 확인
    if (this.inProgress.size >= this.config.maxConcurrent) {
      return;
    }

    // Rate Limit 확인
    if (!this._checkRateLimit()) {
      this.stats.rateLimited++;
      this.emit('rateLimited', {
        current: this.inProgress.size,
        queued: this.getQueueSize(),
        minute: this.requestHistory.minute.length,
        hour: this.requestHistory.hour.length
      });

      // 1초 후 재시도
      setTimeout(() => this._processQueue(), 1000);
      return;
    }

    // 우선순위 순서로 다음 작업 가져오기
    const task = this._getNextTask();

    if (!task) return;

    // 작업 실행
    this._executeTask(task);

    // 더 실행할 수 있으면 계속
    if (this.inProgress.size < this.config.maxConcurrent) {
      setImmediate(() => this._processQueue());
    }
  }

  /**
   * 다음 작업 가져오기 (우선순위 큐)
   * @private
   * @returns {object|null} 작업
   */
  _getNextTask() {
    // 우선순위: HIGH → MEDIUM → LOW
    const priorities = ['HIGH', 'MEDIUM', 'LOW'];

    for (const priority of priorities) {
      if (this.queues[priority].length > 0) {
        return this.queues[priority].shift();
      }
    }

    return null;
  }

  /**
   * 작업 실행
   * @private
   */
  async _executeTask(task) {
    this.inProgress.add(task.id);

    // 요청 이력에 추가
    const now = Date.now();
    this.requestHistory.minute.push(now);
    this.requestHistory.hour.push(now);

    // 이력 정리 (오래된 것 제거)
    this._cleanupHistory();

    this.emit('taskStarted', {
      taskId: task.id,
      priority: task.priority,
      inProgress: this.inProgress.size,
      queued: this.getQueueSize()
    });

    const startTime = Date.now();

    try {
      const result = await task.fn();

      this.stats.completed++;

      this.emit('taskCompleted', {
        taskId: task.id,
        duration: Date.now() - startTime
      });

      task.resolve(result);

    } catch (error) {
      this.stats.failed++;

      this.emit('taskFailed', {
        taskId: task.id,
        error: error.message,
        duration: Date.now() - startTime
      });

      task.reject(error);

    } finally {
      this.inProgress.delete(task.id);

      // 다음 작업 처리
      setImmediate(() => this._processQueue());
    }
  }

  /**
   * Rate Limit 확인
   * @private
   * @returns {boolean} 실행 가능 여부
   */
  _checkRateLimit() {
    const now = Date.now();

    // 분당 요청 수 확인
    const minuteAgo = now - 60 * 1000;
    const recentMinute = this.requestHistory.minute.filter(t => t > minuteAgo);

    if (recentMinute.length >= this.config.requestsPerMinute) {
      return false;
    }

    // 시간당 요청 수 확인
    const hourAgo = now - 60 * 60 * 1000;
    const recentHour = this.requestHistory.hour.filter(t => t > hourAgo);

    if (recentHour.length >= this.config.requestsPerHour) {
      return false;
    }

    return true;
  }

  /**
   * 요청 이력 정리 (오래된 것 제거)
   * @private
   */
  _cleanupHistory() {
    const now = Date.now();
    const minuteAgo = now - 60 * 1000;
    const hourAgo = now - 60 * 60 * 1000;

    this.requestHistory.minute = this.requestHistory.minute.filter(t => t > minuteAgo);
    this.requestHistory.hour = this.requestHistory.hour.filter(t => t > hourAgo);
  }

  /**
   * 큐 크기 조회
   * @returns {number} 대기 중인 작업 수
   */
  getQueueSize() {
    return this.queues.HIGH.length +
           this.queues.MEDIUM.length +
           this.queues.LOW.length;
  }

  /**
   * 상태 조회
   * @returns {object} 현재 상태
   */
  getStatus() {
    return {
      inProgress: this.inProgress.size,
      queued: {
        total: this.getQueueSize(),
        high: this.queues.HIGH.length,
        medium: this.queues.MEDIUM.length,
        low: this.queues.LOW.length
      },
      rateLimit: {
        minute: {
          current: this.requestHistory.minute.length,
          limit: this.config.requestsPerMinute
        },
        hour: {
          current: this.requestHistory.hour.length,
          limit: this.config.requestsPerHour
        }
      },
      stats: { ...this.stats }
    };
  }

  /**
   * 모든 작업 완료 대기
   * @returns {Promise} 모든 작업 완료 시 resolve
   */
  async waitForAll() {
    return new Promise((resolve) => {
      const check = () => {
        if (this.inProgress.size === 0 && this.getQueueSize() === 0) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  /**
   * 큐 초기화
   */
  clear() {
    this.queues.HIGH = [];
    this.queues.MEDIUM = [];
    this.queues.LOW = [];

    this.emit('queueCleared');
  }
}

module.exports = RateLimiter;
