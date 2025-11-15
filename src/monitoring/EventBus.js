/**
 * EventBus.js
 * 중앙 이벤트 버스 - 모든 시스템 이벤트 관리
 *
 * Architecture 개선 A-2: 이벤트 기반 모니터링 강화
 */

const EventEmitter = require('events');

class EventBus extends EventEmitter {
  constructor() {
    super();

    // 이벤트 통계
    this.stats = {
      totalEvents: 0,
      eventCounts: {},
      lastEventTime: null,
      startTime: Date.now()
    };

    // 이벤트 히스토리 (최근 100개)
    this.eventHistory = [];
    this.maxHistorySize = 100;

    // 에러 이벤트 수집
    this.errors = [];
    this.maxErrors = 50;

    // 경고 이벤트 수집
    this.warnings = [];
    this.maxWarnings = 50;
  }

  /**
   * 이벤트 발생 (오버라이드)
   * @param {string} event - 이벤트명
   * @param {any} data - 이벤트 데이터
   */
  emit(event, data = {}) {
    // 통계 업데이트
    this.stats.totalEvents++;
    this.stats.eventCounts[event] = (this.stats.eventCounts[event] || 0) + 1;
    this.stats.lastEventTime = Date.now();

    // 이벤트 히스토리 저장
    const eventRecord = {
      event,
      data,
      timestamp: new Date().toISOString(),
      timestampMs: Date.now()
    };

    this.eventHistory.push(eventRecord);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // 에러 수집
    if (event.includes('Error') || event.includes('Failed') || event === 'error') {
      this.errors.push(eventRecord);
      if (this.errors.length > this.maxErrors) {
        this.errors.shift();
      }
    }

    // 경고 수집
    if (event.includes('Warning') || event.includes('Alert')) {
      this.warnings.push(eventRecord);
      if (this.warnings.length > this.maxWarnings) {
        this.warnings.shift();
      }
    }

    // 로깅 (선택적)
    if (process.env.LOG_EVENTS === 'true' || process.env.NODE_ENV === 'development') {
      this._logEvent(event, data);
    }

    // 부모 클래스의 emit 호출
    return super.emit(event, data);
  }

  /**
   * 이벤트 로깅
   * @private
   */
  _logEvent(event, data) {
    const timestamp = new Date().toISOString();
    const severity = this._getEventSeverity(event);

    const logData = {
      timestamp,
      event,
      severity,
      data: this._sanitizeData(data)
    };

    switch (severity) {
      case 'ERROR':
        console.error('[EventBus]', JSON.stringify(logData));
        break;
      case 'WARN':
        console.warn('[EventBus]', JSON.stringify(logData));
        break;
      case 'INFO':
      default:
        console.log('[EventBus]', JSON.stringify(logData));
        break;
    }
  }

  /**
   * 이벤트 심각도 판단
   * @private
   */
  _getEventSeverity(event) {
    if (event.includes('Error') || event.includes('Failed') || event === 'error') {
      return 'ERROR';
    }
    if (event.includes('Warning') || event.includes('Alert')) {
      return 'WARN';
    }
    return 'INFO';
  }

  /**
   * 데이터 정제 (민감한 정보 제거)
   * @private
   */
  _sanitizeData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };

    // 순환 참조 방지
    const seen = new WeakSet();
    const cleanCircular = (obj) => {
      if (obj && typeof obj === 'object') {
        if (seen.has(obj)) {
          return '[Circular]';
        }
        seen.add(obj);

        const cleaned = Array.isArray(obj) ? [] : {};
        for (const key in obj) {
          // 민감한 필드 마스킹
          if (key.match(/password|token|secret|key|credential/i)) {
            cleaned[key] = '***REDACTED***';
          } else {
            cleaned[key] = cleanCircular(obj[key]);
          }
        }
        return cleaned;
      }
      return obj;
    };

    return cleanCircular(sanitized);
  }

  /**
   * 통계 조회
   */
  getStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime,
      eventsPerMinute: this._calculateEventsPerMinute(),
      topEvents: this._getTopEvents(5)
    };
  }

  /**
   * 분당 이벤트 수 계산
   * @private
   */
  _calculateEventsPerMinute() {
    const uptimeMinutes = (Date.now() - this.stats.startTime) / 60000;
    return uptimeMinutes > 0 ? Math.round(this.stats.totalEvents / uptimeMinutes) : 0;
  }

  /**
   * 상위 N개 이벤트 조회
   * @private
   */
  _getTopEvents(n = 5) {
    return Object.entries(this.stats.eventCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([event, count]) => ({ event, count }));
  }

  /**
   * 최근 이벤트 조회
   */
  getRecentEvents(limit = 10) {
    return this.eventHistory.slice(-limit);
  }

  /**
   * 최근 에러 조회
   */
  getRecentErrors(limit = 10) {
    return this.errors.slice(-limit);
  }

  /**
   * 최근 경고 조회
   */
  getRecentWarnings(limit = 10) {
    return this.warnings.slice(-limit);
  }

  /**
   * 특정 이벤트 필터링
   */
  getEventsByName(eventName, limit = 10) {
    return this.eventHistory
      .filter(e => e.event === eventName)
      .slice(-limit);
  }

  /**
   * 시간 범위로 이벤트 필터링
   */
  getEventsByTimeRange(startTime, endTime) {
    return this.eventHistory.filter(e =>
      e.timestampMs >= startTime && e.timestampMs <= endTime
    );
  }

  /**
   * 통계 초기화
   */
  resetStats() {
    this.stats = {
      totalEvents: 0,
      eventCounts: {},
      lastEventTime: null,
      startTime: Date.now()
    };
  }

  /**
   * 이벤트 히스토리 초기화
   */
  clearHistory() {
    this.eventHistory = [];
    this.errors = [];
    this.warnings = [];
  }

  /**
   * 전체 초기화
   */
  reset() {
    this.resetStats();
    this.clearHistory();
    this.removeAllListeners();
  }
}

// 싱글톤 인스턴스 생성
const eventBus = new EventBus();

module.exports = eventBus;
