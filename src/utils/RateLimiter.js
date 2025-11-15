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

    // 요청 이력 (Ring Buffer - C-4: 메모리 누수 방지)
    this.requestHistory = {
      minute: new Array(this.config.requestsPerMinute).fill(0),
      hour: new Array(this.config.requestsPerHour).fill(0),
      minuteIndex: 0,
      hourIndex: 0
    };

    // H-4: Weighted Fair Queuing (Priority Starvation 방지)
    this.priorityWeights = {
      HIGH: 5,    // 50% 확률
      MEDIUM: 3,  // 30% 확률
      LOW: 2      // 20% 확률
    };

    this.priorityCounters = {
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
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
   * 다음 작업 가져오기 (H-4: Weighted Fair Queuing)
   * @private
   * @returns {object|null} 작업
   */
  _getNextTask() {
    // H-4: Weighted Fair Queuing - Priority Starvation 방지
    const totalWeight = Object.values(this.priorityWeights).reduce((a, b) => a + b, 0);
    const totalExecuted = this.priorityCounters.HIGH + this.priorityCounters.MEDIUM + this.priorityCounters.LOW;

    // 각 우선순위의 실행 비율 계산하여 가장 부족한 것부터 실행
    for (const [priority, weight] of Object.entries(this.priorityWeights)) {
      const queue = this.queues[priority];
      if (queue.length === 0) continue;

      const expectedRatio = weight / totalWeight;
      const actualRatio = totalExecuted > 0 ? this.priorityCounters[priority] / totalExecuted : 0;

      // 예상보다 적게 실행되었으면 우선 실행
      if (actualRatio < expectedRatio) {
        this.priorityCounters[priority]++;
        return queue.shift();
      }
    }

    // Fallback: 일반 우선순위 순서 (모든 비율이 적절할 때)
    for (const priority of ['HIGH', 'MEDIUM', 'LOW']) {
      if (this.queues[priority].length > 0) {
        this.priorityCounters[priority]++;
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

    // 요청 이력에 추가 (Ring Buffer - C-4)
    const now = Date.now();

    // Minute ring buffer
    this.requestHistory.minute[this.requestHistory.minuteIndex] = now;
    this.requestHistory.minuteIndex =
      (this.requestHistory.minuteIndex + 1) % this.requestHistory.minute.length;

    // Hour ring buffer
    this.requestHistory.hour[this.requestHistory.hourIndex] = now;
    this.requestHistory.hourIndex =
      (this.requestHistory.hourIndex + 1) % this.requestHistory.hour.length;

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
   * Rate Limit 확인 (Ring Buffer 기반 - C-4)
   * @private
   * @returns {boolean} 실행 가능 여부
   */
  _checkRateLimit() {
    const now = Date.now();
    const minuteAgo = now - 60 * 1000;
    const hourAgo = now - 60 * 60 * 1000;

    // Ring Buffer에서 유효한 타임스탬프만 카운트 (C-4)
    // 0은 초기값이므로 제외하고, 시간 범위 내의 것만 카운트
    const recentMinute = this.requestHistory.minute.filter(
      t => t > 0 && t > minuteAgo
    );

    if (recentMinute.length >= this.config.requestsPerMinute) {
      return false;
    }

    const recentHour = this.requestHistory.hour.filter(
      t => t > 0 && t > hourAgo
    );

    if (recentHour.length >= this.config.requestsPerHour) {
      return false;
    }

    return true;
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

    // H-4: Priority counters 리셋
    this.priorityCounters.HIGH = 0;
    this.priorityCounters.MEDIUM = 0;
    this.priorityCounters.LOW = 0;

    this.emit('queueCleared');
  }
}

module.exports = RateLimiter;
